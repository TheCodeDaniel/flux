import { execSync } from "child_process";
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

export function doctorCommand() {
    logger.info("🩺 Running environment checks...");
    const config = loadConfig();
    const framework = getFramework(config);

    logger.info(`Detected framework: ${framework}`);

    const baseChecks = [checkCommand("node"), checkCommand("npm"), checkCommand("java")];
    let frameworkChecks = [];

    if (framework === "flutter") {
        frameworkChecks = [checkCommand("flutter"), checkCommand("gradle")];
    } else if (framework === "react-native") {
        frameworkChecks = [
            checkCommand("npx", "React Native CLI (via npx)"),
            checkCommand("gradle"),
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
