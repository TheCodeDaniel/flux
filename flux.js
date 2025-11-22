#!/usr/bin/env node
import { Command } from 'commander';
import { doctorCommand } from "./commands/doctor.js";
import { cleanCommand } from "./commands/clean.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";
import { deployAndroidCommand } from "./commands/deploy-android.js";
import { deployIOSCommand } from "./commands/deploy-ios.js";
import { logger } from "./utils/logger.js";


const program = new Command();

program
    .name('flux')
    .description('Local CI/CD CLI for mobile apps 📱🚀')
    .version('0.0.1');

program
    .command('init')
    .description('Create flux.yml and (for Flutter) register it in pubspec.yaml')
    .option('-f, --force', 'overwrite existing flux.yml (backups will be created)', false)
    .action(async (opts) => {
        try {
            await initCommand(process.cwd(), { force: !!opts.force });
            process.exit(0);
        } catch (err) {
            process.exit(1);
        }
    });

program
    .command("doctor")
    .description("Check your system environment")
    .action(doctorCommand);

program
    .command("clean")
    .description("Clean build artifacts")
    .action(cleanCommand);

program
    .command("info")
    .description("Show project and system info")
    .action(infoCommand);


program
    .command("build")
    .description("Build Flutter or React Native project (APK, AAB, or IPA)")
    .requiredOption("--release-type <type>", "Build type: apk, aab, or ipa (required)")
    .option("--output-dir <path>", "Output directory for build artifacts", "./dist")
    .option("--flavor <name>", "Flutter flavor name")
    .option("--mode <mode>", "Build mode: release, debug, profile", "release")
    .option("--env-file <path>", "Path to .env file for --dart-define-from-file")
    .option("--define <value...>", "Extra --dart-define values")
    .option("--verbose", "Enable verbose build output", false)
    .action(async (opts) => {
        // Validate release type
        const validTypes = ['apk', 'aab', 'ipa'];
        if (!validTypes.includes(opts.releaseType.toLowerCase())) {
            logger.error(`Invalid release type: "${opts.releaseType}". Only "apk", "aab", and "ipa" are supported.`);
            process.exit(1);
        }

        // Check macOS requirement for iOS builds
        if (opts.releaseType.toLowerCase() === 'ipa' && process.platform !== 'darwin') {
            logger.error('Building IPA files requires macOS.');
            logger.info(`Current platform: ${process.platform}`);
            process.exit(1);
        }

        // Validate mode
        const validModes = ['release', 'debug', 'profile'];
        if (!validModes.includes(opts.mode.toLowerCase())) {
            logger.error(`Invalid build mode: "${opts.mode}". Only "release", "debug", and "profile" are supported.`);
            process.exit(1);
        }

        await buildCommand({
            releaseType: opts.releaseType.toLowerCase(),
            outputDir: opts.outputDir,
            flavor: opts.flavor,
            mode: opts.mode.toLowerCase(),
            envFile: opts.envFile,
            define: opts.define,
            verbose: opts.verbose,
        });
    });


program
    .command("deploy-android")
    .description("Upload APK/AAB to Google Play Store")
    .option("--artifact <path>", "Path to .apk or .aab file (default: auto-detect from ./dist)")
    .option("--track <name>", "Google Play track (internal|alpha|beta|production)", "internal")
    .option("--notes <text>", "Release notes (string or JSON object)")
    .option("--key <path>", "Override path to Google Play service account JSON")
    .option("--dry-run", "Validate without committing", false)
    .action(async (opts) => {
        // Validate artifact extension if provided
        if (opts.artifact) {
            const validExtensions = ['.apk', '.aab'];
            const artifactExt = opts.artifact.toLowerCase().slice(opts.artifact.lastIndexOf('.'));

            if (!validExtensions.includes(artifactExt)) {
                logger.error(`Invalid artifact for Android: "${opts.artifact}". Must be .apk or .aab file.`);
                process.exit(1);
            }
        }

        await deployAndroidCommand({
            artifact: opts.artifact,
            track: opts.track,
            notes: parseNotesOption(opts.notes),
            key: opts.key,
            dryRun: opts.dryRun,
        });
    });

program
    .command("deploy-ios")
    .description("Upload IPA to App Store Connect (TestFlight or Production)")
    .option("--artifact <path>", "Path to .ipa file (default: auto-detect from ./dist)")
    .option("--track <name>", "App Store track (testflight|production)", "testflight")
    .option("--notes <text>", "Release notes (for manual entry in App Store Connect)")
    .option("--api-key-path <path>", "Override path to .p8 API key file")
    .option("--api-key-id <id>", "Override API Key ID")
    .option("--issuer-id <id>", "Override Issuer ID")
    .option("--upload-tool <tool>", "Upload tool to use (transporter|altool)")
    .action(async (opts) => {
        // Check macOS requirement
        if (process.platform !== 'darwin') {
            logger.error('Deploying to iOS requires macOS.');
            logger.info(`Current platform: ${process.platform}`);
            process.exit(1);
        }

        // Validate artifact extension if provided
        if (opts.artifact) {
            const artifactExt = opts.artifact.toLowerCase().slice(opts.artifact.lastIndexOf('.'));

            if (artifactExt !== '.ipa') {
                logger.error(`Invalid artifact for iOS: "${opts.artifact}". Must be .ipa file.`);
                process.exit(1);
            }
        }

        // Validate track
        const validTracks = ['testflight', 'production'];
        if (!validTracks.includes(opts.track.toLowerCase())) {
            logger.error(`Invalid track: "${opts.track}". Only "testflight" and "production" are supported.`);
            process.exit(1);
        }

        // Validate upload tool if provided
        if (opts.uploadTool) {
            const validTools = ['transporter', 'altool'];
            if (!validTools.includes(opts.uploadTool.toLowerCase())) {
                logger.error(`Invalid upload tool: "${opts.uploadTool}". Only "transporter" and "altool" are supported.`);
                process.exit(1);
            }
        }

        await deployIOSCommand({
            artifact: opts.artifact,
            track: opts.track.toLowerCase(),
            notes: opts.notes,
            apiKeyPath: opts.apiKeyPath,
            apiKeyId: opts.apiKeyId,
            issuerId: opts.issuerId,
            uploadTool: opts.uploadTool?.toLowerCase(),
        });
    });

function parseNotesOption(notes) {
    if (!notes) return null;
    // if user passed JSON-like string, try parse
    try {
        return JSON.parse(notes);
    } catch {
        return notes; // plain string
    }
}

program.parse(process.argv);
