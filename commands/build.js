import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { performance } from "perf_hooks";
import { loadConfig, getFramework } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Handles building for Flutter and React Native projects.
 * Supports flavors, dart-define, env-files, and multiple build modes.
 */
export async function buildCommand(opts = { releaseType: "apk", outputDir: "./dist" }) {
    const config = loadConfig();
    const framework = getFramework(config);
    const start = performance.now();

    logger.info(`🚀 Starting build for ${framework.toUpperCase()} (${opts.releaseType})...`);

    const outDir = path.resolve(process.cwd(), opts.outputDir);
    await fs.ensureDir(outDir);

    try {
        if (framework === "flutter") {
            await buildFlutter(opts, outDir);
        } else if (framework === "react-native") {
            await buildReactNative(opts, outDir);
        } else {
            throw new Error("Unsupported framework. Only Flutter and React Native are supported.");
        }

        const end = performance.now();
        const duration = ((end - start) / 1000).toFixed(1);
        logger.success(`✅ Build completed in ${duration}s`);
        logger.info(`📦 Artifacts saved in ${chalk.cyan(outDir)}`);
    } catch (err) {
        logger.error("❌ Build failed: " + err.message);
        process.exit(1);
    }
}

async function buildFlutter(opts, outDir) {
    const type = opts.releaseType === "aab" ? "appbundle" : "apk";
    const mode = opts.mode || "release";
    const flavor = opts.flavor ? `--flavor ${opts.flavor}` : "";
    const envFile = opts.envFile ? `--dart-define-from-file=${opts.envFile}` : "";

    // handle multiple --define values
    const defines = Array.isArray(opts.define)
        ? opts.define.map(d => `--dart-define=${d}`).join(" ")
        : opts.define
            ? `--dart-define=${opts.define}`
            : "";

    const verbose = opts.verbose ? "--verbose" : "";

    const buildCmd = `flutter build ${type} --${mode} ${flavor} ${envFile} ${defines} ${verbose}`.trim();
    logger.info(`🛠  Running: ${chalk.yellow(buildCmd)}`);
    execSync(buildCmd, { stdio: "inherit" });

    // Determine output folder
    let builtDir;
    if (opts.releaseType === "aab") {
        const baseDir = "./build/app/outputs/bundle";
        if (opts.flavor) {
            builtDir = path.join(baseDir, `${opts.flavor}${capitalize(mode)}`);
        } else {
            builtDir = path.join(baseDir, mode);
        }
        if (!fs.existsSync(builtDir)) {
            builtDir = baseDir; // fallback
            logger.warn(`⚠️  Using fallback directory: ${builtDir}`);
        }
    } else {
        // APK always goes to flutter-apk folder
        builtDir = "./build/app/outputs/flutter-apk";
        if (!fs.existsSync(builtDir)) {
            throw new Error(`Expected APK output directory not found: ${builtDir}`);
        }
    }

    // Find first file ending with .aab or .apk
    const files = fs.readdirSync(builtDir).filter(f => f.endsWith(`.${opts.releaseType}`));
    if (files.length === 0) throw new Error(`No .${opts.releaseType} files found in ${builtDir}`);

    // Copy to dist
    const sourceFile = path.join(builtDir, files[0]);
    const destFile = path.join(outDir, files[0]);
    await fs.copy(sourceFile, destFile);

    logger.success(`✅ Flutter ${opts.releaseType.toUpperCase()} copied to ${outDir}`);
}

// helper
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}




async function buildReactNative(opts, outDir) {
    const task = opts.releaseType === "aab" ? "bundleRelease" : "assembleRelease";
    const gradleCmd =
        process.platform === "win32"
            ? `cd android && gradlew.bat ${task}`
            : `cd android && ./gradlew ${task}`;

    logger.info(`🛠  Running: ${chalk.yellow(gradleCmd)}`);
    execSync(gradleCmd, { stdio: "inherit" });

    const builtDir =
        opts.releaseType === "aab"
            ? "./android/app/build/outputs/bundle/release"
            : "./android/app/build/outputs/apk/release";

    const ext = opts.releaseType;
    const files = fs.readdirSync(builtDir).filter(f => f.endsWith(`.${ext}`));
    if (files.length === 0) throw new Error(`No .${ext} files found in ${builtDir}`);

    const sourceFile = path.join(builtDir, files[0]);
    const destFile = path.join(outDir, files[0]);
    await fs.copy(sourceFile, destFile);

    logger.success(`✅ React Native ${ext.toUpperCase()} copied to ${outDir}`);
}
