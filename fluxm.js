#!/usr/bin/env node
import { Command } from 'commander';
import { doctorCommand } from "./commands/doctor.js";
import { cleanCommand } from "./commands/clean.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { releaseAndroidCommand } from "./commands/release-android.js";
import { releaseIOSCommand } from "./commands/release-ios.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { logger } from "./utils/logger.js";


const program = new Command();

program
    .name('fluxm')
    .description('Flux Mobile CLI - Local CI/CD for mobile apps 📱🚀')
    .version('0.4.0-beta.4');

program
    .command('init')
    .description('Create flux-mobile.yml and (for Flutter) register it in pubspec.yaml')
    .option('-f, --force', 'overwrite existing flux-mobile.yml (a backup will be saved)', false)
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
    .command("upgrade")
    .description("Upgrade Flux Mobile CLI to the latest version")
    .action(upgradeCommand);




program
    .command("release")
    .description("Build and release mobile app to App Store or Google Play Store")
    .argument("<platform>", "Platform to release (android|ios)")
    .requiredOption("--track <name>", "Release track (Android: internal|alpha|beta|production, iOS: testflight|production)")
    .option("--flavor <name>", "Build flavor")
    .option("--notes <text>", "Release notes (string or JSON object)")
    .option("--env-file <path>", "Path to .env file for --dart-define-from-file")
    .option("--define <value...>", "Extra --dart-define values")
    .option("--obfuscate", "Obfuscate Dart code for increased security", false)
    .option("--verbose", "Enable verbose build output", false)
    .option("--skip-confirm", "Skip confirmation prompts (for CI/CD)", false)
    .action(async (platform, opts) => {
        // Validate platform
        const normalizedPlatform = platform.toLowerCase();
        if (normalizedPlatform !== "android" && normalizedPlatform !== "ios") {
            logger.error(`Invalid platform: "${platform}". Only "android" and "ios" are supported.`);
            process.exit(1);
        }

        // Validate track based on platform
        const normalizedTrack = opts.track.toLowerCase();
        if (normalizedPlatform === "android") {
            const validTracks = ['internal', 'alpha', 'beta', 'production'];
            if (!validTracks.includes(normalizedTrack)) {
                logger.error(`Invalid Android track: "${opts.track}". Only "internal", "alpha", "beta", and "production" are supported.`);
                process.exit(1);
            }
        } else if (normalizedPlatform === "ios") {
            const validTracks = ['testflight', 'production'];
            if (!validTracks.includes(normalizedTrack)) {
                logger.error(`Invalid iOS track: "${opts.track}". Only "testflight" and "production" are supported.`);
                process.exit(1);
            }
        }

        // Call appropriate release command
        if (normalizedPlatform === "android") {
            await releaseAndroidCommand({
                track: normalizedTrack,
                flavor: opts.flavor,
                notes: parseNotesOption(opts.notes),
                envFile: opts.envFile,
                define: opts.define,
                obfuscate: opts.obfuscate,
                verbose: opts.verbose,
                skipConfirm: opts.skipConfirm,
            });
        } else if (normalizedPlatform === "ios") {
            await releaseIOSCommand({
                track: normalizedTrack,
                flavor: opts.flavor,
                notes: parseNotesOption(opts.notes),
                envFile: opts.envFile,
                define: opts.define,
                obfuscate: opts.obfuscate,
                verbose: opts.verbose,
                skipConfirm: opts.skipConfirm,
            });
        }
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
