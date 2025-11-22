// commands/deploy-ios.js
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import ora from "ora";
import readline from "readline";
import { loadConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";


/**
 * Deploy IPA to App Store Connect (TestFlight or Production)
 * opts:
 *  - artifact: path to .ipa (optional: auto-detect from ./dist)
 *  - track: testflight|production
 *  - notes: release notes string
 *  - apiKeyPath: override path to .p8 API key
 *  - apiKeyId: override API Key ID
 *  - issuerId: override Issuer ID
 *  - uploadTool: transporter|altool (optional: will prompt if not provided)
 */
export async function deployIOSCommand(opts = {}) {
    const spinner = ora().start();

    try {
        // Check macOS requirement
        if (process.platform !== 'darwin') {
            spinner.fail(chalk.red("iOS deployment requires macOS."));
            logger.info(`Current platform: ${process.platform}`);
            process.exit(1);
        }

        const config = loadConfig();
        const appStoreCfg = config.appstore || {};

        // Get API credentials from config or opts
        const apiKeyPath = opts.apiKeyPath || appStoreCfg.api_key_path;
        const apiKeyId = opts.apiKeyId || appStoreCfg.api_key_id;
        const issuerId = opts.issuerId || appStoreCfg.issuer_id;
        const bundleId = appStoreCfg.bundle_id;

        // Validate required credentials
        if (!apiKeyPath) {
            spinner.fail(chalk.red("Missing App Store Connect API key path in flux.yml (appstore.api_key_path)."));
            process.exit(1);
        }
        if (!apiKeyId) {
            spinner.fail(chalk.red("Missing API Key ID in flux.yml (appstore.api_key_id)."));
            process.exit(1);
        }
        if (!issuerId) {
            spinner.fail(chalk.red("Missing Issuer ID in flux.yml (appstore.issuer_id)."));
            process.exit(1);
        }
        if (!bundleId) {
            spinner.fail(chalk.red("Missing Bundle ID in flux.yml (appstore.bundle_id)."));
            process.exit(1);
        }

        const absKeyPath = path.resolve(process.cwd(), apiKeyPath);
        if (!(await fs.pathExists(absKeyPath))) {
            spinner.fail(chalk.red(`API key file not found at ${absKeyPath}`));
            process.exit(1);
        }

        // Determine artifact (auto-detect if not provided)
        const artifactPath = opts.artifact
            ? path.resolve(process.cwd(), opts.artifact)
            : await findArtifact();

        if (!artifactPath) {
            spinner.fail(chalk.red("No IPA found. Specify --artifact or run `flux build --release-type ipa` first."));
            process.exit(1);
        }

        if (!(await fs.pathExists(artifactPath))) {
            spinner.fail(chalk.red(`Artifact not found: ${artifactPath}`));
            process.exit(1);
        }

        // Validate artifact is .ipa
        const ext = path.extname(artifactPath).toLowerCase();
        if (ext !== '.ipa') {
            spinner.fail(chalk.red(`Invalid artifact for iOS: "${artifactPath}". Must be .ipa file.`));
            process.exit(1);
        }

        spinner.succeed(chalk.green("Inputs validated. Preparing upload..."));

        const track = opts.track || appStoreCfg.default_track || "testflight";

        // Validate track
        const validTracks = ['testflight', 'production'];
        if (!validTracks.includes(track.toLowerCase())) {
            spinner.fail(chalk.red(`Invalid track: "${track}". Only "testflight" and "production" are supported.`));
            process.exit(1);
        }

        // Determine upload tool (interactive prompt if not specified)
        let uploadTool = opts.uploadTool || appStoreCfg.upload_tool;

        if (!uploadTool) {
            uploadTool = await promptUploadTool();
        }

        // Validate upload tool
        const validTools = ['transporter', 'altool'];
        if (!validTools.includes(uploadTool.toLowerCase())) {
            spinner.fail(chalk.red(`Invalid upload tool: "${uploadTool}". Only "transporter" and "altool" are supported.`));
            process.exit(1);
        }

        // Upload IPA using selected tool
        spinner.start(`Uploading ${path.basename(artifactPath)} to App Store Connect using ${uploadTool}...`);

        try {
            let uploadCmd;

            if (uploadTool.toLowerCase() === 'transporter') {
                // Using iTMSTransporter (newer, faster, recommended)
                uploadCmd = `xcrun iTMSTransporter -m upload -f "${artifactPath}" -apiKey "${apiKeyId}" -apiIssuer "${issuerId}" -t Aspera`;
                logger.info(`🛠  Running: ${chalk.yellow('xcrun iTMSTransporter (Transporter CLI)')}`);
            } else {
                // Using xcrun altool (legacy but still works)
                uploadCmd = `xcrun altool --upload-app --type ios --file "${artifactPath}" --apiKey "${apiKeyId}" --apiIssuer "${issuerId}"`;
                logger.info(`🛠  Running: ${chalk.yellow('xcrun altool (legacy)')}`);
                logger.warn(chalk.yellow("Note: altool is deprecated by Apple. Consider using --upload-tool transporter"));
            }

            execSync(uploadCmd, { stdio: "inherit" });

            spinner.succeed(chalk.green("Upload complete."));
        } catch (err) {
            spinner.fail(chalk.red("Upload failed."));
            logger.error(`${uploadTool} failed. Make sure Xcode Command Line Tools are installed.`);
            if (uploadTool.toLowerCase() === 'transporter') {
                logger.info("You can try using --upload-tool altool as a fallback.");
            } else {
                logger.info("You can try using --upload-tool transporter (newer tool).");
            }
            throw err;
        }

        // Note: Unlike Google Play API, Apple doesn't provide programmatic release management
        // for TestFlight/App Store via CLI. You must use App Store Connect web UI or Fastlane.

        if (track.toLowerCase() === 'testflight') {
            logger.info(chalk.cyan("\n📱 Next steps for TestFlight:"));
            logger.info("1. Go to App Store Connect (https://appstoreconnect.apple.com)");
            logger.info("2. Navigate to your app → TestFlight");
            logger.info("3. The uploaded build will appear in 'Builds' after processing");
            logger.info("4. Add the build to a TestFlight group and submit for review if needed");
        } else {
            logger.info(chalk.cyan("\n🚀 Next steps for Production:"));
            logger.info("1. Go to App Store Connect (https://appstoreconnect.apple.com)");
            logger.info("2. Navigate to your app → App Store");
            logger.info("3. Create a new version or update existing one");
            logger.info("4. Select the uploaded build and submit for App Review");
        }

        logger.success("\n✅ Upload finished successfully.");
        logger.info(`Track: ${track}`);
        logger.info(`Bundle ID: ${bundleId}`);
        logger.info(`Artifact: ${artifactPath}`);

        // Log deployment
        logDeployment({
            bundleId,
            track,
            success: true,
            message: `Successfully uploaded IPA to App Store Connect (${track})`,
        });

    } catch (err) {
        spinner.fail(chalk.red("Deploy failed: " + (err.message || err)));
        logDeployment({
            bundleId: "unknown",
            track: opts.track || "testflight",
            success: false,
            message: err.message || "Unknown error during deployment",
        });
        process.exit(1);
    }
}

/* ----------------- helpers ----------------- */

async function promptUploadTool() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log(chalk.cyan("\n📤 Select upload tool:"));
        console.log(chalk.white("  1) Transporter (recommended - faster, newer)"));
        console.log(chalk.white("  2) altool (legacy - deprecated by Apple)"));
        console.log();

        rl.question(chalk.yellow("Enter your choice (1 or 2): "), (answer) => {
            rl.close();

            const choice = answer.trim();

            if (choice === '1' || choice.toLowerCase() === 'transporter') {
                console.log(chalk.green("✓ Selected: Transporter\n"));
                resolve('transporter');
            } else if (choice === '2' || choice.toLowerCase() === 'altool') {
                console.log(chalk.green("✓ Selected: altool\n"));
                resolve('altool');
            } else {
                console.log(chalk.yellow("Invalid choice, defaulting to Transporter\n"));
                resolve('transporter');
            }
        });
    });
}

async function findArtifact() {
    const projectDir = process.cwd();

    const candidatePaths = [
        // Flutter iOS builds
        "build/ios/ipa/app.ipa",
        "build/ios/ipa/*.ipa",

        // Generic dist fallback
        "dist/*.ipa",
    ];

    // Check specific paths first
    for (const rel of candidatePaths) {
        if (rel.includes('*')) {
            // Handle glob patterns
            const dir = path.dirname(path.join(projectDir, rel));
            if (await fs.pathExists(dir)) {
                const files = await fs.readdir(dir);
                const ipa = files.find(f => f.endsWith('.ipa'));
                if (ipa) return path.join(dir, ipa);
            }
        } else {
            const full = path.join(projectDir, rel);
            if (await fs.pathExists(full)) return full;
        }
    }

    // Check dist folder for any .ipa
    const dist = path.join(projectDir, "dist");
    if (await fs.pathExists(dist)) {
        const files = await fs.readdir(dist);
        const ipa = files.find(f => f.endsWith(".ipa"));
        if (ipa) return path.join(dist, ipa);
    }

    // Check build/ios/ipa folder
    const iosIpaDir = path.join(projectDir, "build/ios/ipa");
    if (await fs.pathExists(iosIpaDir)) {
        const files = await fs.readdir(iosIpaDir);
        const ipa = files.find(f => f.endsWith(".ipa"));
        if (ipa) return path.join(iosIpaDir, ipa);
    }

    return null;
}

// Will be used for log tracking
function logDeployment({ bundleId, track, success, message }) {
    try {
        const logDir = path.join(process.cwd(), ".flux");
        const logFile = path.join(logDir, "deployments.json");

        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

        let logs = [];
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
        }

        logs.push({
            platform: 'ios',
            bundleId,
            track,
            success,
            message,
            timestamp: new Date().toISOString(),
        });

        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        logger.info(`📝 Deployment logged at .flux/deployments.json`);
    } catch (error) {
        logger.warn("⚠️  Failed to log deployment: " + error.message);
    }
}
