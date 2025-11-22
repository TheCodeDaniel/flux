import { execSync } from "child_process";
import { existsSync } from "fs";
import { logger } from "../utils/logger.js";
import { loadConfig, getFramework } from "../utils/config.js";

function checkCommand(cmd, label = cmd) {
    try {
        const version = execSync(`${cmd} --version`, { stdio: "pipe" })
            .toString()
            .trim();
        logger.success(`${label} detected (${version})`);
        return true;
    } catch {
        logger.error(`${label} not found`);
        return false;
    }
}

function checkGradle() {
    if (existsSync("./gradlew") || existsSync("./android/gradlew")) {
        logger.success("Gradle wrapper detected (./gradlew)");
        return true;
    }
    // Fallback to global gradle
    return checkCommand("gradle", "Gradle");
}

function checkXcodeTools() {
    try {
        execSync("xcode-select -p", { stdio: "pipe" });
        logger.success("Xcode Command Line Tools detected");
        return true;
    } catch {
        logger.error("Xcode Command Line Tools not found");
        logger.info("Install with: xcode-select --install");
        return false;
    }
}

function checkITMSTransporter() {
    try {
        execSync("xcrun iTMSTransporter -h", { stdio: "pipe" });
        logger.success("iTMSTransporter detected (for iOS deployment)");
        return true;
    } catch {
        logger.error("iTMSTransporter not found");
        logger.info("Install Xcode Command Line Tools: xcode-select --install");
        return false;
    }
}

function checkAltool() {
    try {
        execSync("xcrun altool -h", { stdio: "pipe" });
        logger.success("altool detected (legacy iOS upload tool)");
        return true;
    } catch {
        logger.warn("altool not found (optional - altool is deprecated)");
        return true; // Non-critical since altool is deprecated
    }
}

export function doctorCommand() {
    logger.info("🩺 Running environment checks...");
    const config = loadConfig();
    const framework = getFramework(config);

    logger.info(`Detected framework: ${framework}`);

    const baseChecks = [checkCommand("node"), checkCommand("npm"), checkCommand("java")];
    let frameworkChecks = [];

    if (framework === "flutter") {
        frameworkChecks = [checkCommand("flutter"), checkGradle()];
    } else if (framework === "react-native") {
        frameworkChecks = [
            checkCommand("npx", "React Native CLI (via npx)"),
            checkGradle()
        ];
    } else {
        logger.warn("Unknown framework — skipping framework-specific checks.");
    }

    // iOS-specific checks (only on macOS)
    let iosChecks = [];
    if (process.platform === 'darwin') {
        logger.info("\n📱 Checking iOS tools (macOS detected)...");
        iosChecks = [
            checkXcodeTools(),
            checkITMSTransporter(),
            checkAltool()
        ];
    } else {
        logger.info("\n📱 Skipping iOS checks (macOS required)");
    }

    const allGood = [...baseChecks, ...frameworkChecks, ...iosChecks].every(Boolean);
    if (allGood) {
        logger.success("\n✅ All systems operational");
    } else {
        logger.warn("\n⚠️  Some tools are missing. Please install the required dependencies.");
    }
}
