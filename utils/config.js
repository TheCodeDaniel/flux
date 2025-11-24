import fs from "fs";
import yaml from "js-yaml";
import { logger } from "./logger.js";

export function loadConfig() {
    const configPath = "./flux-mobile.yml";
    if (!fs.existsSync(configPath)) {
        logger.error("flux-mobile.yml not found. Please run `flux init` first.");
        process.exit(1);
    }

    try {
        const file = fs.readFileSync(configPath, "utf8");
        const config = yaml.load(file);
        return config;
    } catch (e) {
        logger.error("Error parsing flux-mobile.yml: " + e.message);
        process.exit(1);
    }
}

export function getFramework(config) {
    // Use explicit value if set, otherwise auto-detect
    if (config.platform) return config.platform;

    if (fs.existsSync("pubspec.yaml")) return "flutter";
    if (fs.existsSync("package.json")) return "react-native";
    return "unknown";
}
