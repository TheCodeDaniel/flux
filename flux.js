#!/usr/bin/env node
import { Command } from 'commander';
import { doctorCommand } from "./commands/doctor.js";
import { cleanCommand } from "./commands/clean.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";


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

program.parse(process.argv);
