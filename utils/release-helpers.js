import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";
import readline from "readline";
import chalk from "chalk";
import { logger } from "./logger.js";

/**
 * Run Flutter build with animated spinner
 */
export function runFlutterBuild(args, spinner, verbose) {
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
export async function promptDeploy(track, storeName) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(
            chalk.cyan(`\uD83D\uDCE4 Deploy to ${storeName} (${track} track)? (Y/n): `),
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
 * Log deployment to .flux-mobile/deployments.json
 * Warns and backs up corrupted log files instead of silently resetting.
 */
export async function logDeployment(data) {
    const logDir = path.join(process.cwd(), ".flux-mobile");
    await fs.ensureDir(logDir);

    const logFile = path.join(logDir, "deployments.json");

    let logs = [];
    if (await fs.pathExists(logFile)) {
        const content = await fs.readFile(logFile, "utf8");
        try {
            logs = JSON.parse(content);
        } catch {
            logger.warn("deployments.json is corrupted. Backing up and starting fresh.");
            const backupFile = path.join(logDir, `deployments.json.corrupted.${Date.now()}`);
            await fs.copyFile(logFile, backupFile);
            logs = [];
        }
    }

    logs.push(data);

    await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
}
