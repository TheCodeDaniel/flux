import { spawn } from "child_process";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import readline from "readline";
import { loadConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { generateToken, getAppId, getLatestBuild, submitToTestFlight, getOrCreateAppStoreVersion, assignBuildToVersion, setReleaseNotes, submitForReview } from "../utils/appstore-api.js";
import { extractIPAMetadata, formatReleaseNotes } from "../utils/ipa-parser.js";

/**
 * Release iOS app to App Store Connect
 *
 * This command:
 * 1. Builds IPA using flutter build ipa
 * 2. Parses build output to get IPA path
 * 3. Prompts user to confirm deployment
 * 4. Uploads to App Store Connect and assigns to track
 *
 * @param {Object} opts - Command options
 * @param {string} opts.track - App Store track (testflight|production)
 * @param {string} [opts.flavor] - Build flavor
 * @param {string} [opts.notes] - Release notes
 * @param {string} [opts.envFile] - Path to .env file
 * @param {string[]} [opts.define] - Additional --dart-define values
 * @param {boolean} [opts.verbose] - Verbose build output
 */
export async function releaseIOSCommand(opts = {}) {
    const spinner = ora();

    try {
        // Check macOS requirement
        if (process.platform !== 'darwin') {
            logger.error('iOS deployment requires macOS.');
            logger.info(`Current platform: ${process.platform}`);
            process.exit(1);
        }

        // Load configuration
        const config = loadConfig();
        const appstoreConfig = config?.appstore || {};

        // Validate required config
        if (!appstoreConfig.api_key_path) {
            logger.error("Missing 'appstore.api_key_path' in flux-mobile.yml");
            process.exit(1);
        }

        if (!appstoreConfig.api_key_id) {
            logger.error("Missing 'appstore.api_key_id' in flux-mobile.yml");
            process.exit(1);
        }

        if (!appstoreConfig.issuer_id) {
            logger.error("Missing 'appstore.issuer_id' in flux-mobile.yml");
            process.exit(1);
        }

        if (!appstoreConfig.bundle_id) {
            logger.error("Missing 'appstore.bundle_id' in flux-mobile.yml");
            process.exit(1);
        }

        const apiKeyPath = path.resolve(process.cwd(), appstoreConfig.api_key_path);
        if (!fs.existsSync(apiKeyPath)) {
            logger.error(`API key file not found: ${apiKeyPath}`);
            process.exit(1);
        }

        // Step 1: Build IPA
        const buildMessage = opts.obfuscate
            ? "Building iOS IPA (release mode with obfuscation)..."
            : "Building iOS IPA (release mode)...";
        spinner.start(chalk.blue(buildMessage));

        // Build command arguments
        const buildArgs = ["build", "ipa", "--release"];

        // Add obfuscation if requested
        if (opts.obfuscate) {
            buildArgs.push("--obfuscate", "--split-debug-info=build/ios/symbols");
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

        // Step 2: Parse build output to extract IPA path
        let ipaPath = null;

        // Flutter outputs the build path in format:
        // "Built IPA to /path/to/build/ios/ipa/app.ipa"
        const buildPathRegex = /Built.*?IPA.*?to\s+(.+\.ipa)/i;
        const match = buildOutput.match(buildPathRegex);

        if (match && match[1]) {
            ipaPath = path.resolve(process.cwd(), match[1].trim());
        } else {
            // Fallback: Try common paths
            const possiblePaths = [
                opts.flavor
                    ? `build/ios/ipa/${opts.flavor}/app.ipa`
                    : "build/ios/ipa/app.ipa"
            ];

            for (const p of possiblePaths) {
                const fullPath = path.resolve(process.cwd(), p);
                if (fs.existsSync(fullPath)) {
                    ipaPath = fullPath;
                    break;
                }
            }
        }

        if (!ipaPath || !fs.existsSync(ipaPath)) {
            spinner.fail(chalk.red("IPA file not found after build!"));
            logger.error("Could not locate the built IPA file.");
            process.exit(1);
        }

        spinner.succeed(chalk.green(`Build completed successfully!`));
        console.log(chalk.gray(`  Build path: ${ipaPath}`));
        console.log();

        // Step 3: Prompt user to deploy
        const shouldDeploy = await promptDeploy(opts.track);

        if (!shouldDeploy) {
            console.log(chalk.yellow("⏸️  Deployment cancelled."));
            console.log(chalk.gray(`  IPA ready at: ${ipaPath}`));
            process.exit(0);
        }

        // Step 4: Deploy to App Store Connect
        spinner.start(chalk.blue(`Deploying to App Store Connect (${opts.track} track)...`));

        const apiKeyId = appstoreConfig.api_key_id;
        const issuerId = appstoreConfig.issuer_id;
        const bundleId = appstoreConfig.bundle_id;

        // Get upload tool from config or default to transporter
        const uploadTool = appstoreConfig.upload_tool || 'transporter';

        // Step 4a: Upload IPA using Transporter or altool
        spinner.text = chalk.blue("Uploading IPA to App Store Connect...");

        const uploadCmd = uploadTool === 'transporter'
            ? `xcrun iTMSTransporter -m upload -f "${ipaPath}" -apiKey "${apiKeyId}" -apiIssuer "${issuerId}" -t Aspera`
            : `xcrun altool --upload-app --type ios --file "${ipaPath}" --apiKey "${apiKeyId}" --apiIssuer "${issuerId}"`;

        try {
            execSync(uploadCmd, { stdio: opts.verbose ? "inherit" : "pipe" });
        } catch (error) {
            spinner.fail(chalk.red("Upload failed!"));
            console.error(error.message);
            process.exit(1);
        }

        // Step 4b: Generate API token
        const token = generateToken(apiKeyId, issuerId, apiKeyPath);

        // Step 4c: Get app and build IDs
        spinner.text = chalk.blue("Finding app and build...");

        const appId = await getAppId(token, bundleId);
        if (!appId) {
            spinner.fail(chalk.red("App not found in App Store Connect!"));
            logger.error(`No app found with bundle ID: ${bundleId}`);
            process.exit(1);
        }

        // Wait a bit for the build to process
        spinner.text = chalk.blue("Waiting for build to process...");
        await sleep(5000);

        const buildId = await getLatestBuild(token, appId);
        if (!buildId) {
            spinner.fail(chalk.red("Build not found!"));
            logger.error("Could not find the uploaded build. It may still be processing.");
            logger.info("Try running the deploy command again in a few minutes.");
            process.exit(1);
        }

        // Step 4d: Deploy based on track
        if (opts.track === 'testflight') {
            // Submit to TestFlight
            spinner.text = chalk.blue("Submitting to TestFlight...");
            await submitToTestFlight(token, buildId);

            spinner.succeed(chalk.green(`✅ Deployed successfully to TestFlight!`));
        } else {
            // Production workflow
            spinner.text = chalk.blue("Processing production submission...");

            // Extract version info from IPA
            const ipaMetadata = await extractIPAMetadata(ipaPath);

            // Get or create App Store version
            const versionInfo = await getOrCreateAppStoreVersion(
                token,
                appId,
                ipaMetadata.versionString
            );

            // Assign build to version
            await assignBuildToVersion(token, versionInfo.versionId, buildId);

            // Set release notes if provided
            if (opts.notes) {
                const formattedNotes = formatReleaseNotes(opts.notes);
                await setReleaseNotes(token, versionInfo.versionId, formattedNotes);
            }

            // Submit for review
            spinner.text = chalk.blue("Submitting for App Store review...");
            await submitForReview(token, versionInfo.versionId);

            spinner.succeed(chalk.green(`✅ Deployed successfully and submitted for App Store review!`));
        }

        // Log deployment
        await logDeployment({
            platform: "ios",
            track: opts.track,
            artifact: ipaPath,
            notes: opts.notes || "No release notes provided",
            timestamp: new Date().toISOString(),
        });

        console.log(chalk.gray(`📝 Deployment logged at .flux-mobile/deployments.json`));

    } catch (error) {
        spinner.fail(chalk.red("Release failed!"));
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Run Flutter build with animated spinner
 */
function runFlutterBuild(args, spinner, verbose) {
    return new Promise((resolve) => {
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
 * Prompt user to confirm deployment
 */
async function promptDeploy(track) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(
            chalk.cyan(`📤 Deploy to App Store Connect (${track} track)? (Y/n): `),
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
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
