#!/usr/bin/env node
import { Command } from 'commander';
import { doctorCommand } from "./commands/doctor.js";
import { cleanCommand } from "./commands/clean.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";
import { deployCommand } from "./commands/deploy.js";


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
    .option("--release-type <type>", "Build type: apk or aab", "apk")
    .option("--output-dir <path>", "Output directory for build artifacts", "./dist")
    .action(async (opts) => { await buildCommand(opts); });


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
