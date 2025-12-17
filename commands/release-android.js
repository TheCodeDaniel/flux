import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import readline from "readline";
import { loadConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { google } from "googleapis";
import { extractVersionFromPubspec } from "../utils/version-utils.js";
import { checkVersionExistsPlayStore } from "../utils/playstore-api.js";

/**
 * Release Android app to Google Play Store
 *
 * This command:
 * 1. Builds AAB using flutter build appbundle
 * 2. Parses build output to get AAB path
 * 3. Prompts user to confirm deployment
 * 4. Uploads to Play Store and assigns to track
 *
 * @param {Object} opts - Command options
 * @param {string} opts.track - Play Store track (internal|alpha|beta|production)
 * @param {string} [opts.flavor] - Build flavor
 * @param {string} [opts.notes] - Release notes
 * @param {string} [opts.envFile] - Path to .env file
 * @param {string[]} [opts.define] - Additional --dart-define values
 * @param {boolean} [opts.verbose] - Verbose build output
 */
export async function releaseAndroidCommand(opts = {}) {
    const spinner = ora();

    try {
        // Load configuration
        const config = loadConfig();
        const playstoreConfig = config?.playstore || {};

        // Validate required config
        if (!playstoreConfig.service_account_json) {
            logger.error("Missing 'playstore.service_account_json' in flux-mobile.yml");
            process.exit(1);
        }

        if (!playstoreConfig.package_name) {
            logger.error("Missing 'playstore.package_name' in flux-mobile.yml");
            process.exit(1);
        }

        const serviceAccountPath = path.resolve(process.cwd(), playstoreConfig.service_account_json);
        if (!fs.existsSync(serviceAccountPath)) {
            logger.error(`Service account file not found: ${serviceAccountPath}`);
            process.exit(1);
        }

        // Check version before building (fail fast on conflicts)
        logger.info('Checking if version already exists in Google Play Console...');
        const versionInfo = await extractVersionFromPubspec(process.cwd());
        logger.info(`Current version: ${versionInfo.full}`);

        // Set up Google Play API authentication
        const checkAuth = new google.auth.GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });

        const versionCheck = await checkVersionExistsPlayStore(
            checkAuth,
            playstoreConfig.package_name,
            versionInfo.buildNumber
        );

        if (versionCheck.exists) {
            console.log('');
            logger.error(`❌ Version code ${versionInfo.buildNumber} already exists in Google Play Console!`);
            logger.error(`   Found in track: ${versionCheck.track}`);
            logger.error(`   Status: ${versionCheck.status}`);
            console.log('');
            logger.info('Please update your version in:');
            logger.info(`  • pubspec.yaml (currently: ${versionInfo.full})`);
            logger.info(`  • Version code must be higher than ${versionInfo.buildNumber}`);
            logger.info(`  • Example: ${versionInfo.versionString}+${parseInt(versionInfo.buildNumber) + 1}`);
            console.log('');
            logger.info('Note: Google Play requires version codes to always increment');
            logger.info('      You cannot reuse a version code, even if it was removed');
            console.log('');
            process.exit(1);
        }

        logger.info(`✅ Version code ${versionInfo.buildNumber} is available`);
        console.log('');

        // Step 1: Build AAB
        const buildMessage = opts.obfuscate
            ? "Building Android AAB (release mode with obfuscation)..."
            : "Building Android AAB (release mode)...";
        spinner.start(chalk.blue(buildMessage));

        // Build command arguments
        const buildArgs = ["build", "appbundle", "--release"];

        // Add obfuscation if requested
        if (opts.obfuscate) {
            buildArgs.push("--obfuscate", "--split-debug-info=build/app/outputs/symbols");
        }

        // Add flavor if specified
        if (opts.flavor) {
            buildArgs.push("--flavor", opts.flavor);
        }

        // Add environment file
        if (opts.envFile) {
            const envPath = path.resolve(process.cwd(), opts.envFile);
            if (!fs.existsSync(envPath)) {
                spinner.fail(chalk.red(`Environment file not found: ${envPath}`));
                process.exit(1);
            }
            buildArgs.push(`--dart-define-from-file=${envPath}`);
        }

        // Add custom defines
        if (opts.define && opts.define.length > 0) {
            opts.define.forEach(def => {
                buildArgs.push(`--dart-define=${def}`);
            });
        }

        // Execute build with spawn (keeps spinner animated)
        const buildOutput = await runFlutterBuild(buildArgs, spinner, opts.verbose);

        if (!buildOutput) {
            spinner.fail(chalk.red("Build failed!"));
            process.exit(1);
        }

        // Step 2: Parse build output to extract AAB path
        let aabPath = null;

        // Flutter outputs the build path in format:
        // "Built build/app/outputs/bundle/release/app-release.aab"
        // OR with flavor: "Built build/app/outputs/bundle/productionRelease/app-production-release.aab"
        const buildPathRegex = /Built\s+(build\/app\/outputs\/bundle\/.*?\.aab)/;
        const match = buildOutput?.match(buildPathRegex);

        if (match && match[1]) {
            aabPath = path.resolve(process.cwd(), match[1]);
        } else {
            // Fallback: Try common paths
            const possiblePaths = [
                opts.flavor
                    ? `build/app/outputs/bundle/${opts.flavor}Release/app-${opts.flavor}-release.aab`
                    : "build/app/outputs/bundle/release/app-release.aab"
            ];

            for (const p of possiblePaths) {
                const fullPath = path.resolve(process.cwd(), p);
                if (fs.existsSync(fullPath)) {
                    aabPath = fullPath;
                    break;
                }
            }
        }

        if (!aabPath || !fs.existsSync(aabPath)) {
            spinner.fail(chalk.red("AAB file not found after build!"));
            logger.error("Could not locate the built AAB file.");
            process.exit(1);
        }

        spinner.succeed(chalk.green(`Build completed successfully!`));
        console.log(chalk.gray(`  Build path: ${aabPath}`));
        console.log();

        // Step 3: Prompt user to deploy (unless --skip-confirm is set)
        if (opts.skipConfirm) {
            logger.info('⏭️  Skipping confirmation (--skip-confirm flag set)');
            console.log();
        } else {
            const shouldDeploy = await promptDeploy(opts.track);

            if (!shouldDeploy) {
                console.log(chalk.yellow("⏸️  Deployment cancelled."));
                console.log(chalk.gray(`  AAB ready at: ${aabPath}`));
                process.exit(0);
            }
        }

        // Step 4: Deploy to Play Store
        spinner.start(chalk.blue(`Deploying to Google Play Store (${opts.track} track)...`));

        // Authenticate with Google Play API
        const auth = new google.auth.GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });

        const androidPublisher = google.androidpublisher({
            version: "v3",
            auth,
        });

        const packageName = playstoreConfig.package_name;

        // Create an edit
        const editRes = await androidPublisher.edits.insert({
            packageName,
        });

        const editId = editRes.data.id;

        try {
            // Upload AAB
            spinner.text = chalk.blue("Uploading AAB...");

            const uploadRes = await androidPublisher.edits.bundles.upload({
                packageName,
                editId,
                media: {
                    mimeType: "application/octet-stream",
                    body: fs.createReadStream(aabPath),
                },
            });

            const versionCode = uploadRes.data.versionCode;

            // Update track
            spinner.text = chalk.blue(`Assigning to ${opts.track} track...`);

            const releaseNotes = formatReleaseNotes(opts.notes);

            await androidPublisher.edits.tracks.update({
                packageName,
                editId,
                track: opts.track,
                requestBody: {
                    track: opts.track,
                    releases: [
                        {
                            versionCodes: [versionCode.toString()],
                            status: "completed",
                            releaseNotes: releaseNotes,
                        },
                    ],
                },
            });

            // Commit the edit
            spinner.text = chalk.blue("Committing changes...");

            await androidPublisher.edits.commit({
                packageName,
                editId,
            });

            spinner.succeed(chalk.green(`✅ Deployed successfully to ${opts.track} track!`));

            // Log deployment
            await logDeployment({
                platform: "android",
                track: opts.track,
                artifact: aabPath,
                versionCode,
                notes: opts.notes || "No release notes provided",
                timestamp: new Date().toISOString(),
            });

            console.log(chalk.gray(`📝 Deployment logged at .flux-mobile/deployments.json`));

        } catch (error) {
            // If deployment fails, delete the edit
            try {
                await androidPublisher.edits.delete({
                    packageName,
                    editId,
                });
            } catch (deleteError) {
                // Ignore delete errors
            }

            spinner.fail(chalk.red("Deployment failed!"));
            console.error(error.message);
            process.exit(1);
        }

    } catch (error) {
        spinner.fail(chalk.red("Release failed!"));
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Prompt user to confirm deployment
 */
async function promptDeploy(track) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(
            chalk.cyan(`📤 Deploy to Play Store (${track} track)? (Y/n): `),
            (answer) => {
                rl.close();
                const normalized = answer.trim().toLowerCase();
                // Default to 'yes' if user just presses Enter
                resolve(normalized === "" || normalized === "y" || normalized === "yes");
            }
        );
    });
}

/**
 * Format release notes for Google Play API
 */
function formatReleaseNotes(notesInput) {
    if (!notesInput) {
        return [{ language: "en-US", text: "Bug fixes and improvements" }];
    }

    if (typeof notesInput === "string") {
        return [{ language: "en-US", text: notesInput }];
    }

    if (typeof notesInput === "object") {
        return Object.entries(notesInput).map(([lang, text]) => ({
            language: lang,
            text: String(text),
        }));
    }

    return [{ language: "en-US", text: "Bug fixes and improvements" }];
}

/**
 * Run Flutter build with animated spinner
 */
function runFlutterBuild(args, spinner, verbose) {
    return new Promise((resolve, reject) => {
        const flutter = spawn("flutter", args, {
            cwd: process.cwd(),
        });

        let stdout = "";
        let stderr = "";

        flutter.stdout.on("data", (data) => {
            const output = data.toString();
            stdout += output;
            if (verbose) {
                // In verbose mode, stop spinner and show output
                spinner.stop();
                process.stdout.write(output);
            }
        });

        flutter.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        flutter.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                if (stderr) {
                    console.error(stderr);
                }
                resolve(null);
            }
        });

        flutter.on("error", (error) => {
            console.error(error.message);
            resolve(null);
        });
    });
}

/**
 * Log deployment to .flux-mobile/deployments.json
 */
async function logDeployment(data) {
    const logDir = path.join(process.cwd(), ".flux-mobile");
    await fs.ensureDir(logDir);

    const logFile = path.join(logDir, "deployments.json");

    let logs = [];
    if (await fs.pathExists(logFile)) {
        const content = await fs.readFile(logFile, "utf8");
        try {
            logs = JSON.parse(content);
        } catch {
            logs = [];
        }
    }

    logs.push(data);

    await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
}
