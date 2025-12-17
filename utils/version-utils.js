// utils/version-utils.js
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { logger } from './logger.js';

/**
 * Extract version and build number from pubspec.yaml
 *
 * Flutter format: version: 1.2.3+45
 * Where 1.2.3 is versionString and 45 is buildNumber
 *
 * @param {string} projectDir - Root project directory
 * @returns {Promise<{versionString: string, buildNumber: string, full: string}>}
 */
export async function extractVersionFromPubspec(projectDir) {
    const pubspecPath = path.join(projectDir, 'pubspec.yaml');

    if (!await fs.pathExists(pubspecPath)) {
        throw new Error('pubspec.yaml not found. Are you in a Flutter project?');
    }

    try {
        const pubspecContent = await fs.readFile(pubspecPath, 'utf8');
        const pubspec = YAML.parse(pubspecContent);

        if (!pubspec.version) {
            throw new Error('No version found in pubspec.yaml. Please add a version field.');
        }

        const versionFull = pubspec.version.toString();

        // Parse version format: "1.2.3+45" or just "1.2.3"
        const match = versionFull.match(/^(\d+\.\d+\.\d+)(?:\+(\d+))?$/);

        if (!match) {
            throw new Error(`Invalid version format in pubspec.yaml: "${versionFull}". Expected format: "1.2.3+45"`);
        }

        const versionString = match[1]; // e.g., "1.2.3"
        const buildNumber = match[2] || '1'; // e.g., "45" or default to "1"

        return {
            versionString,
            buildNumber,
            full: versionFull
        };
    } catch (error) {
        if (error.message.includes('version')) {
            throw error; // Re-throw version-specific errors
        }
        throw new Error(`Failed to parse pubspec.yaml: ${error.message}`);
    }
}

/**
 * Increment patch version for suggestion
 * Takes "1.2.3" and returns "1.2.4"
 *
 * @param {string} versionString - Version string (e.g., "1.2.3")
 * @returns {string} - Incremented version (e.g., "1.2.4")
 */
export function incrementVersion(versionString) {
    const parts = versionString.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);
    return `${major}.${minor}.${patch + 1}`;
}

/**
 * Parse iOS version from Info.plist (alternative method)
 *
 * @param {string} projectDir - Root project directory
 * @returns {Promise<{versionString: string, buildNumber: string}>}
 */
export async function extractVersionFromInfoPlist(projectDir) {
    const plist = await import('plist');
    const infoPlistPath = path.join(projectDir, 'ios', 'Runner', 'Info.plist');

    if (!await fs.pathExists(infoPlistPath)) {
        throw new Error('ios/Runner/Info.plist not found');
    }

    try {
        const plistContent = await fs.readFile(infoPlistPath, 'utf8');
        const parsed = plist.parse(plistContent);

        const versionString = parsed.CFBundleShortVersionString; // e.g., "1.2.3"
        const buildNumber = parsed.CFBundleVersion; // e.g., "45"

        if (!versionString || !buildNumber) {
            throw new Error('CFBundleShortVersionString or CFBundleVersion missing from Info.plist');
        }

        return {
            versionString,
            buildNumber
        };
    } catch (error) {
        throw new Error(`Failed to parse Info.plist: ${error.message}`);
    }
}
