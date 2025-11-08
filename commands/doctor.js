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

    const allGood = [...baseChecks, ...frameworkChecks].every(Boolean);
    if (allGood) {
        logger.success("All systems operational ✅");
    } else {
        logger.warn("Some tools are missing. Please install the required dependencies.");
    }
}
