// commands/deploy.js
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { google } from "googleapis";
import xml2js from "xml2js";
import ora from "ora";
import { loadConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";


/**
 * High-level deploy command
 * opts:
 *  - artifact: path to .apk or .aab (optional; will try ./dist)
 *  - track: internal|alpha|beta|production
 *  - notes: release notes string
 *  - key: override path to service account json
 *  - dryRun: boolean (if true, won't commit edit)
 */
export async function deployCommand(opts = {}) {
    const spinner = ora().start();
    try {
        const config = loadConfig();
        const playCfg = config.playstore || {};
        const serviceAccountPath = opts.key || playCfg.service_account_json;
        if (!serviceAccountPath) {
            spinner.fail(chalk.red("Missing Play Store service account path in flux.yml (playstore.service_account_json)."));
            process.exit(1);
        }

        const absKeyPath = path.resolve(process.cwd(), serviceAccountPath);
        if (!(await fs.pathExists(absKeyPath))) {
            spinner.fail(chalk.red(`Service account JSON not found at ${absKeyPath}`));
            process.exit(1);
        }

        // Determine artifact
        const artifactPath = opts.artifact ? path.resolve(process.cwd(), opts.artifact) : await findArtifact();
        if (!artifactPath) {
            spinner.fail(chalk.red("No artifact found to upload. Build first with `flux build`."));
            process.exit(1);
        }
        if (!(await fs.pathExists(artifactPath))) {
            spinner.fail(chalk.red(`Artifact not found at ${artifactPath}`));
            process.exit(1);
        }

        // Determine package name
        const packageName = config.playstore?.package_name || config.android?.package_name || (await detectPackageName());
        if (!packageName) {
            spinner.fail(chalk.red("Could not detect Android package name. Set playstore.package_name in flux.yml or ensure AndroidManifest exists."));
            process.exit(1);
        }

        spinner.succeed(chalk.green("Inputs validated. Preparing upload..."));

        // Authenticate to Google using service account key
        spinner.start("Authenticating with Google Play...");
        const auth = new google.auth.GoogleAuth({
            keyFile: absKeyPath,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });

        const authClient = await auth.getClient();
        const androidpublisher = google.androidpublisher({ version: "v3", auth: authClient });
        spinner.succeed(chalk.green("Authenticated."));

        // Create an edit
        spinner.start("Creating edit...");
        const insertResponse = await androidpublisher.edits.insert({
            packageName,
            requestBody: {},
        });
        const editId = insertResponse.data.id;
        spinner.succeed(chalk.green(`Created edit ${editId}`));

        // Upload artifact
        const ext = path.extname(artifactPath).toLowerCase();
        spinner.start(`Uploading ${path.basename(artifactPath)}...`);
        let uploadResult;
        if (ext === ".aab") {
            // upload bundle
            uploadResult = await androidpublisher.edits.bundles.upload({
                packageName,
                editId,
                media: {
                    mimeType: "application/octet-stream",
                    body: fs.createReadStream(artifactPath),
                },
            });
        } else if (ext === ".apk") {
            // upload apk
            uploadResult = await androidpublisher.edits.apks.upload({
                packageName,
                editId,
                media: {
                    mimeType: "application/vnd.android.package-archive",
                    body: fs.createReadStream(artifactPath),
                },
            });
        } else {
            spinner.fail(chalk.red("Unsupported artifact type. Provide .apk or .aab"));
            process.exit(1);
        }
        spinner.succeed(chalk.green("Upload complete."));

        // Determine version code returned by upload
        const versionCodes = uploadResult.data.versionCode ? [String(uploadResult.data.versionCode)] : (uploadResult.data.versionCodes || []);
        logger.info(`Uploaded artifact version codes: ${versionCodes.join(", ")}`);

        // Prepare release object
        const track = opts.track || "internal";
        const notes = formatReleaseNotes(opts.notes || "Release via Flux CLI");

        const release = {
            name: `Release ${new Date().toISOString()}`,
            status: "completed",
            versionCodes: versionCodes.map(Number),
            releaseNotes: notes,
        };

        spinner.start(`Assigning to track "${track}"...`);
        await androidpublisher.edits.tracks.update({
            packageName,
            editId,
            track,
            requestBody: {
                track,
                releases: [release],
            },
        });
        spinner.succeed(chalk.green(`Assigned release to ${track}.`));

        // If dry run, don't commit
        if (opts.dryRun) {
            spinner.info(chalk.yellow("Dry run complete. Not committing edit."));
            return;
        }

        // Commit edit
        spinner.start("Committing edit...");
        await androidpublisher.edits.commit({
            packageName,
            editId,
        });
        spinner.succeed(chalk.green("Edit committed. Release should be visible in Play Console soon."));

        logger.success("✅ Deploy finished successfully.");
        logger.info(`Track: ${track}`);
        logger.info(`Package: ${packageName}`);
        logger.info(`Artifact: ${artifactPath}`);
    } catch (err) {
        spinner.fail(chalk.red("Deploy failed: " + (err.message || err)));
        // helpful error detail if available
        if (err.errors) console.error(err.errors);
        process.exit(1);
    }
}

/* ----------------- helpers ----------------- */

function formatReleaseNotes(notesInput) {
    // Accept either string or object { "en-US": "..." }.
    if (!notesInput) return [{ language: "en-US", text: "Release via Flux CLI" }];

    if (typeof notesInput === "string") {
        return [{ language: "en-US", text: notesInput }];
    }

    if (typeof notesInput === "object") {
        // transform to array of {language, text}
        return Object.entries(notesInput).map(([lang, txt]) => ({ language: lang, text: String(txt) }));
    }

    return [{ language: "en-US", text: "Release via Flux CLI" }];
}

async function findArtifact() {
    const projectDir = process.cwd();

    const candidatePaths = [
        // Flutter
        "build/app/outputs/bundle/release/app-release.aab",
        "build/app/outputs/flutter-apk/app-release.apk",

        // React Native
        "android/app/build/outputs/bundle/release/app-release.aab",
        "android/app/build/outputs/apk/release/app-release.apk",

        // Generic dist fallback
        "dist/app-release.aab",
        "dist/app-release.apk",
    ];

    for (const rel of candidatePaths) {
        const full = path.join(projectDir, rel);
        if (await fs.pathExists(full)) return full;
    }

    // Check dist folder for any aab/apk if none of the above matched
    const dist = path.join(projectDir, "dist");
    if (await fs.pathExists(dist)) {
        const files = await fs.readdir(dist);
        const aab = files.find(f => f.endsWith(".aab"));
        const apk = files.find(f => f.endsWith(".apk"));
        if (aab) return path.join(dist, aab);
        if (apk) return path.join(dist, apk);
    }

    return null;
}


async function detectPackageName() {
    // Try android/app/src/main/AndroidManifest.xml
    const manifestPaths = [
        path.join(process.cwd(), "android", "app", "src", "main", "AndroidManifest.xml"),
        path.join(process.cwd(), "android", "app", "src", "main", "java", "AndroidManifest.xml"),
    ];

    for (const p of manifestPaths) {
        if (await fs.pathExists(p)) {
            const xml = await fs.readFile(p, "utf8");
            try {
                const parsed = await xml2js.parseStringPromise(xml);
                // package attribute is on manifest element
                if (parsed.manifest && parsed.manifest.$ && parsed.manifest.$.package) {
                    return parsed.manifest.$.package;
                }
            } catch (e) {
                // ignore
            }
        }
    }

    // Try app/build.gradle for applicationId
    const buildGradle = getBuildGradlePath();
    if (await fs.pathExists(buildGradle)) {
        const g = await fs.readFile(buildGradle, "utf8");
        const match = g.match(/applicationId\s+["']([^"']+)["']/);
        if (match) return match[1];
    }

    // Try pubspec.yaml (for flutter projects with package name) — typical pubspec doesn't have package id, so skip

    return null;
}

function getBuildGradlePath() {
    const gradleGroovy = path.join(process.cwd(), "android", "app", "build.gradle");
    const gradleKts = path.join(process.cwd(), "android", "app", "build.gradle.kts");

    if (fs.existsSync(gradleGroovy)) {
        return gradleGroovy;
    } else if (fs.existsSync(gradleKts)) {
        return gradleKts;
    } else {
        throw new Error("No build.gradle or build.gradle.kts file found in android/app/");
    }
}