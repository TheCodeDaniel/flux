import os from "os";
import { loadConfig, getFramework } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export function infoCommand() {
  const config = loadConfig();
  const framework = getFramework(config);

  logger.info("📄 Project & System Information");
  console.log(`
🧩 Framework: ${framework}
📦 App Name: ${config.app_name || "Unknown"}
📱 Android Keystore: ${config.android?.keystore_path || "Not set"}
🗂  Project Directory: ${process.cwd()}
💻 OS: ${os.type()} ${os.release()}
🧠 CPU: ${os.cpus()[0].model}
💾 RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
  `);
}
