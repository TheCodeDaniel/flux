import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { logger } from "./logger.js";

export function loadConfig() {
    const configPath = path.join(process.cwd(), "flux-mobile.yml");
    if (!fs.existsSync(configPath)) {
        throw new Error(`flux-mobile.yml not found in ${process.cwd()}. Make sure you are in the project root directory, or run \`fluxm init\` first.`);
    }

    try {
        const file = fs.readFileSync(configPath, "utf8");
        const config = yaml.load(file);
        return config;
    } catch (e) {
        throw new Error("Error parsing flux-mobile.yml: " + e.message);
    }
}

export function getFramework(config) {
    // Use explicit value if set, otherwise auto-detect
    if (config.platform) return config.platform;

    if (fs.existsSync(path.join(process.cwd(), "pubspec.yaml"))) return "flutter";
    if (fs.existsSync(path.join(process.cwd(), "package.json"))) return "react-native";
    return "unknown";
}
