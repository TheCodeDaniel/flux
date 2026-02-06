// utils/ipa-parser.js
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { logger } from "./logger.js";

/**
 * Extract version information from IPA file
 * Uses unzip and PlistBuddy (macOS built-in tools)
 */
export async function extractIPAMetadata(ipaPath) {
    const tmpDir = path.join(process.cwd(), ".flux-mobile", "tmp");
    await fs.ensureDir(tmpDir);

    try {
        // Extract Info.plist from IPA
        // IPA structure: Payload/AppName.app/Info.plist
        logger.info("Extracting metadata from IPA...");

        // Unzip only the Info.plist (faster than full extraction)
        const unzipCmd = `unzip -q "${ipaPath}" "Payload/*.app/Info.plist" -d "${tmpDir}"`;
        execSync(unzipCmd);

        // Find the Info.plist file
        const payloadDir = path.join(tmpDir, "Payload");
        const appDirs = fs.readdirSync(payloadDir).filter(f => f.endsWith('.app'));

        if (appDirs.length === 0) {
            throw new Error("Could not find .app directory in IPA");
        }

        const infoPlistPath = path.join(payloadDir, appDirs[0], "Info.plist");

        // Extract version information using PlistBuddy (macOS tool)
        const versionString = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${infoPlistPath}"`)
            .toString()
            .trim();

        const buildNumber = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "${infoPlistPath}"`)
            .toString()
            .trim();

        const bundleId = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${infoPlistPath}"`)
            .toString()
            .trim();

        let displayName;
        try {
            displayName = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "${infoPlistPath}"`)
                .toString()
                .trim();
        } catch {
            displayName = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleName" "${infoPlistPath}"`)
                .toString()
                .trim();
        }

        logger.info(`📱 App: ${displayName}`);
        logger.info(`📦 Version: ${versionString} (${buildNumber})`);
        logger.info(`🆔 Bundle ID: ${bundleId}`);

        return {
            versionString,
            buildNumber,
            bundleId,
            displayName
        };

    } catch (err) {
        logger.error("Failed to extract IPA metadata: " + err.message);
        throw new Error("Could not read version information from IPA file");
    } finally {
        // Cleanup temp directory
        await fs.remove(tmpDir);
    }
}

/**
 * Format release notes for App Store Connect API
 * Accepts string or object with locale keys
 */
export function formatReleaseNotes(notesInput) {
    if (!notesInput) {
        return [{ locale: "en-US", text: "Bug fixes and improvements" }];
    }

    // String input - default to en-US
    if (typeof notesInput === "string") {
        return [{ locale: "en-US", text: notesInput }];
    }

    // Object input - map locales
    // e.g., { "en-US": "English notes", "es-ES": "Spanish notes" }
    if (typeof notesInput === "object") {
        return Object.entries(notesInput).map(([locale, text]) => ({
            locale,
            text: String(text)
        }));
    }

    return [{ locale: "en-US", text: "Bug fixes and improvements" }];
}
