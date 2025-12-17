// utils/export-compliance.js
import fs from 'fs-extra';
import path from 'path';
import plist from 'plist';
import chalk from 'chalk';
import { logger } from './logger.js';

/**
 * Ensure Info.plist has export compliance key to avoid App Store Connect errors
 *
 * This adds ITSAppUsesNonExemptEncryption = false if missing
 * Most apps don't use non-exempt encryption, so false is the safe default
 *
 * @param {string} projectDir - Root project directory
 * @returns {Promise<boolean>} - Returns true if key was added, false if already exists
 */
export async function ensureExportCompliance(projectDir) {
    const infoPlistPath = path.join(projectDir, 'ios', 'Runner', 'Info.plist');

    // Check if Info.plist exists
    if (!await fs.pathExists(infoPlistPath)) {
        logger.warn('⚠️  Info.plist not found at ios/Runner/Info.plist');
        logger.info('Skipping export compliance check');
        return false;
    }

    try {
        // Read and parse Info.plist
        const plistContent = await fs.readFile(infoPlistPath, 'utf8');
        const parsed = plist.parse(plistContent);

        // Check if export compliance key exists
        if (parsed.hasOwnProperty('ITSAppUsesNonExemptEncryption')) {
            logger.info(`✅ Export compliance already configured (ITSAppUsesNonExemptEncryption = ${parsed.ITSAppUsesNonExemptEncryption})`);
            return false;
        }

        // Key doesn't exist - add it
        console.log('');
        logger.warn('⚠️  Export compliance key missing in Info.plist');
        logger.info('Adding ITSAppUsesNonExemptEncryption = false');
        logger.info('ℹ️  This prevents "Missing Export Compliance" errors in App Store Connect');
        logger.info('ℹ️  If your app uses encryption, set this to true in ios/Runner/Info.plist');
        console.log('');

        // Add the key
        parsed.ITSAppUsesNonExemptEncryption = false;

        // Build plist XML
        const newPlistContent = plist.build(parsed);

        // Write back to file
        await fs.writeFile(infoPlistPath, newPlistContent, 'utf8');

        logger.info('✅ Export compliance key added to Info.plist');
        console.log('');

        return true;
    } catch (error) {
        logger.error('Failed to process Info.plist:', error.message);
        logger.info('You may need to manually add ITSAppUsesNonExemptEncryption to ios/Runner/Info.plist');
        return false;
    }
}
