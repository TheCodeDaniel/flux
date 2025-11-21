#!/usr/bin/env node
import { Command } from 'commander';
import { doctorCommand } from "./commands/doctor.js";
import { cleanCommand } from "./commands/clean.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";
import { deployCommand } from "./commands/deploy.js";
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
    .description("Build Flutter or React Native project (APK or AAB)")
    .requiredOption("--release-type <type>", "Build type: apk or aab (required)")
    .option("--output-dir <path>", "Output directory for build artifacts", "./dist")
    .option("--flavor <name>", "Flutter flavor name")
    .option("--mode <mode>", "Build mode: release, debug, profile", "release")
    .option("--env-file <path>", "Path to .env file for --dart-define-from-file")
    .option("--define <value...>", "Extra --dart-define values")
    .option("--verbose", "Enable verbose build output", false)
    .action(async (opts) => {
        // Validate release type
        const validTypes = ['apk', 'aab'];
        if (!validTypes.includes(opts.releaseType.toLowerCase())) {
            logger.error(`Invalid release type: "${opts.releaseType}". Only "apk" and "aab" are supported.`);
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
    .command("deploy")
    .description("Upload APK/AAB to Google Play")
    .option("--artifact <path>", "Path to .apk or .aab (default: ./dist/*)")
    .option("--track <name>", "Play track to release to (internal|alpha|beta|production)", "internal")
    .option("--notes <text>", "Release notes (string or JSON object)")
    .option("--key <path>", "Override path to service account JSON")
    .option("--dry-run", "Validate without committing", false)
    .action(async (opts) => {
        await deployCommand({
            artifact: opts.artifact,
            track: opts.track,
            notes: parseNotesOption(opts.notes),
            key: opts.key,
            dryRun: opts.dryRun,
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
