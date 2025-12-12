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
        const buildPathRegex = /Built.*?(?:IPA|\.ipa).*?(?:to|at)\s+(.+\.ipa)/i;
        const match = buildOutput.match(buildPathRegex);

        if (match && match[1]) {
            ipaPath = path.resolve(process.cwd(), match[1].trim());
        }

        // If regex failed, search for any .ipa file in build/ios/ipa/
        if (!ipaPath || !fs.existsSync(ipaPath)) {
            const ipaDir = path.resolve(process.cwd(), "build/ios/ipa");

            if (fs.existsSync(ipaDir)) {
                const files = fs.readdirSync(ipaDir);
                const ipaFile = files.find(f => f.endsWith('.ipa'));

                if (ipaFile) {
                    ipaPath = path.join(ipaDir, ipaFile);
                }
            }
        }

        if (!ipaPath || !fs.existsSync(ipaPath)) {
            spinner.fail(chalk.red("IPA file not found after build!"));
            logger.error("Could not locate the built IPA file.");
            logger.info("Expected location: build/ios/ipa/*.ipa");

            // Show what we actually have
            const ipaDir = path.resolve(process.cwd(), "build/ios/ipa");
            if (fs.existsSync(ipaDir)) {
                const files = fs.readdirSync(ipaDir);
                logger.info(`Files found in build/ios/ipa/: ${files.join(', ')}`);
            }

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

        // Both tools look for .p8 in specific directories
        // Copy .p8 to ~/.appstoreconnect/private_keys/ temporarily
        // IMPORTANT: altool requires the file to be named AuthKey_<api_key_id>.p8
        const os = await import('os');
        const tempKeyDir = path.join(os.homedir(), '.appstoreconnect', 'private_keys');
        const tempKeyPath = path.join(tempKeyDir, `AuthKey_${apiKeyId}.p8`);

        // Create directory if it doesn't exist
        fs.ensureDirSync(tempKeyDir);

        // Verify source file exists
        if (!fs.existsSync(apiKeyPath)) {
            spinner.fail(chalk.red("API key file not found!"));
            logger.error(`Could not find .p8 file at: ${apiKeyPath}`);
            process.exit(1);
        }

        // Copy .p8 file to temp location
        try {
            fs.copyFileSync(apiKeyPath, tempKeyPath);

            // Verify copy succeeded
            if (!fs.existsSync(tempKeyPath)) {
                throw new Error(`Failed to copy key to ${tempKeyPath}`);
            }

            if (opts.verbose) {
                logger.info(`Copied API key to: ${tempKeyPath}`);
            }
        } catch (err) {
            spinner.fail(chalk.red("Failed to copy API key!"));
            logger.error(err.message);
            process.exit(1);
        }

        const uploadCmd = uploadTool === 'transporter'
            ? `xcrun iTMSTransporter -m upload -f "${ipaPath}" -k "${tempKeyPath}" -apiKey "${apiKeyId}" -apiIssuer "${issuerId}" -t Aspera`
            : `xcrun altool --upload-app --type ios --file "${ipaPath}" --apiKey "${apiKeyId}" --apiIssuer "${issuerId}"`;

        try {
            execSync(uploadCmd, { stdio: opts.verbose ? "inherit" : "pipe" });

            // Clean up temp key file after successful upload
            if (fs.existsSync(tempKeyPath)) {
                fs.unlinkSync(tempKeyPath);
            }

            spinner.succeed(chalk.green("✅ IPA uploaded successfully to App Store Connect!"));
            console.log();
        } catch (error) {
            spinner.fail(chalk.red("Upload failed!"));
            console.error(error.message);

            // Clean up temp key file on error
            if (fs.existsSync(tempKeyPath)) {
                fs.unlinkSync(tempKeyPath);
            }

            process.exit(1);
        }

        // Step 4b: Process build and assign to track
        // Wrap API calls in separate try/catch to provide better error messages
        try {
            spinner.start(chalk.blue("Processing build and assigning to track..."));

            // Generate API token
            const token = generateToken(apiKeyId, issuerId, apiKeyPath);

            // Get app and build IDs
            spinner.text = chalk.blue("Finding app and build...");

            const appId = await getAppId(token, bundleId);
            if (!appId) {
                throw new Error(`App not found in App Store Connect with bundle ID: ${bundleId}`);
            }

            // Wait for the build to process (Apple needs time even after upload completes)
            spinner.text = chalk.blue("Waiting for build to process (15 seconds)...");
            await sleep(15000);

            const buildId = await getLatestBuild(token, appId);
            if (!buildId) {
                throw new Error("Build not found. It may still be processing. Check App Store Connect and try again in a few minutes.");
            }

            // Deploy based on track
            if (opts.track === 'testflight') {
                // Submit to TestFlight
                spinner.text = chalk.blue("Submitting to TestFlight...");
                await submitToTestFlight(token, buildId);

                spinner.succeed(chalk.green(`✅ Build assigned to TestFlight successfully!`));
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

                spinner.succeed(chalk.green(`✅ Build submitted for App Store review successfully!`));
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

        } catch (apiError) {
            spinner.fail(chalk.red(`Failed to ${opts.track === 'testflight' ? 'submit to TestFlight' : 'submit to App Store'}!`));
            console.log();
            logger.error("Upload succeeded, but failed to process via App Store Connect API:");
            logger.error(apiError.message);
            console.log();
            logger.info(chalk.yellow("⚠️  Your IPA was uploaded successfully to App Store Connect."));

            if (opts.track === 'testflight') {
                logger.info(chalk.yellow("⚠️  You can manually assign it to TestFlight in App Store Connect."));
                logger.info(chalk.yellow("⚠️  Visit: https://appstoreconnect.apple.com/apps → Your App → TestFlight"));
                console.log();
                logger.info("Common issues for TestFlight submissions:");
                logger.info("  1. Export Compliance: Add ITSAppUsesNonExemptEncryption to ios/Runner/Info.plist");
                logger.info("  2. Build Processing: Build may still be processing. Wait 5-10 minutes and try again");
                logger.info("  3. Another Build in Review: Only one build can be in Beta Review at a time");
                logger.info("  4. Beta Contract: Ensure you've signed the beta testing agreement in App Store Connect");
                logger.info("  5. Beta Information: Fill out Test Information (description, email) in TestFlight settings");
                logger.info("  6. API Permissions: Ensure your API key has 'App Manager' or 'Admin' role");
            } else {
                logger.info(chalk.yellow("⚠️  You can manually submit it for App Store review in App Store Connect."));
                logger.info(chalk.yellow("⚠️  Visit: https://appstoreconnect.apple.com/apps → Your App → App Store"));
                console.log();
                logger.info("Common issues for App Store (production) submissions:");
                logger.info("  1. App Information: Complete app description, keywords, categories");
                logger.info("  2. Screenshots: Upload all required screenshots for all device sizes");
                logger.info("  3. Privacy Policy: Add privacy policy URL if required");
                logger.info("  4. App Review Information: Fill out contact info and demo account (if needed)");
                logger.info("  5. Export Compliance: Add ITSAppUsesNonExemptEncryption to ios/Runner/Info.plist");
                logger.info("  6. Content Rights: Ensure you have rights to all content in your app");
                logger.info("  7. Version Information: Ensure version number and copyright are correct");
                logger.info("  8. API Permissions: Ensure your API key has 'App Manager' or 'Admin' role");
            }

            logger.info("");
            logger.info("For detailed error, run with FLUX_DEBUG=1 environment variable");
            process.exit(1);
        }

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
