import fs from "fs";
import { logger } from "../utils/logger.js";
import { loadConfig, getFramework } from "../utils/config.js";

export function cleanCommand() {
    const config = loadConfig();
    const framework = getFramework(config);

    logger.info(`🧹 Cleaning build artifacts for ${framework}...`);

    const dirsToRemove =
        framework === "flutter"
            ? ["./build", "./android/app/build", "./ios/build"]
            : ["./android/app/build", "./ios/build", "./node_modules/.cache", "./build"];

    dirsToRemove.forEach((dir) => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            logger.success(`Removed ${dir}`);
        }
    });

    logger.success("Cleanup complete!");
}
