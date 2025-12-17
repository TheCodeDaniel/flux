// utils/appstore-api.js
import fs from "fs-extra";
import jwt from "jsonwebtoken";
import https from "https";
import { logger } from "./logger.js";

const API_BASE_URL = "https://api.appstoreconnect.apple.com/v1";

/**
 * Generate JWT token for App Store Connect API authentication
 */
export function generateToken(apiKeyId, issuerId, privateKeyPath) {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    const token = jwt.sign({}, privateKey, {
        algorithm: "ES256",
        expiresIn: "20m", // Apple recommends 20 minutes max
        issuer: issuerId,
        header: {
            alg: "ES256",
            kid: apiKeyId,
            typ: "JWT"
        }
    });

    return token;
}

/**
 * Make authenticated request to App Store Connect API
 */
async function makeRequest(token, method, endpoint, body = null) {
    const url = new URL(endpoint, API_BASE_URL);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        };

        const req = https.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data || "{}"));
                    } catch (e) {
                        resolve({});
                    }
                } else {
                    try {
                        const error = JSON.parse(data);
                        const errorDetail = error.errors?.[0]?.detail || `API Error: ${res.statusCode}`;
                        const errorTitle = error.errors?.[0]?.title || '';
                        const errorCode = error.errors?.[0]?.code || '';

                        // Build detailed error message
                        let fullError = `${errorDetail}`;
                        if (errorTitle) fullError += ` (${errorTitle})`;
                        if (errorCode) fullError += ` [${errorCode}]`;

                        // Log full response for debugging
                        if (process.env.FLUX_DEBUG) {
                            console.error('Full API Error Response:', JSON.stringify(error, null, 2));
                        }

                        reject(new Error(fullError));
                    } catch (e) {
                        reject(new Error(`API Error: ${res.statusCode} - ${data}`));
                    }
                }
            });
        });

        req.on("error", reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Get app ID by bundle identifier
 */
export async function getAppId(token, bundleId) {
    const endpoint = `/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`;
    const response = await makeRequest(token, "GET", endpoint);

    if (!response.data || response.data.length === 0) {
        throw new Error(`App not found with bundle ID: ${bundleId}`);
    }

    return response.data[0].id;
}

/**
 * Check if a version already exists in App Store Connect
 * Prevents wasting build time on version conflicts
 *
 * @param {string} token - JWT token
 * @param {string} appId - App ID
 * @param {string} versionString - Version to check (e.g., "1.2.3")
 * @returns {Promise<{exists: boolean, state?: string}>}
 */
export async function checkVersionExists(token, appId, versionString) {
    const endpoint = `/apps/${appId}/appStoreVersions?filter[versionString]=${versionString}`;

    try {
        const response = await makeRequest(token, "GET", endpoint);

        if (response.data && response.data.length > 0) {
            const existing = response.data[0];
            const state = existing.attributes.appStoreState;

            return {
                exists: true,
                state: state,
                versionId: existing.id
            };
        }

        return { exists: false };
    } catch (error) {
        // If API call fails, log warning but don't block deployment
        logger.warn(`Could not check version: ${error.message}`);
        return { exists: false };
    }
}

/**
 * Get the latest build for a given app and wait for it to finish processing
 * This can take 5-15 minutes as Apple validates and processes the build
 */
export async function getLatestBuild(token, appId) {
    console.log('');
    logger.info("⏳ Waiting for Apple to process your build...");
    logger.info("ℹ️  This usually takes 5-15 minutes. The build is being validated and prepared.");
    console.log('');

    await sleep(15000); // 15 seconds initial wait

    const endpoint = `/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1`;

    // Poll every 10 seconds for up to 30 minutes (same as Fastlane)
    const pollIntervalMs = 10000; // 10 seconds
    const timeoutMinutes = 30;
    const maxAttempts = (timeoutMinutes * 60 * 1000) / pollIntervalMs; // 180 attempts

    let lastMinuteLogged = -1;

    for (let i = 0; i < maxAttempts; i++) {
        const response = await makeRequest(token, "GET", endpoint);

        if (response.data && response.data.length > 0) {
            const build = response.data[0];
            const processingState = build.attributes.processingState;
            const version = build.attributes.version;
            const buildNumber = build.attributes.buildNumber;

            // Calculate elapsed time
            const elapsedSeconds = Math.floor((i * pollIntervalMs) / 1000);
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);

            // Check if build is ready
            if (processingState === "VALID") {
                console.log('');
                logger.info(`✅ Build ${version} (${buildNumber}) processed successfully!`);
                logger.info(`   Processing took ${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''}`);
                console.log('');
                return build.id;
            }

            if (processingState === "INVALID") {
                console.log('');
                logger.error(`❌ Build ${version} (${buildNumber}) is invalid!`);
                logger.error("   Apple rejected the build during processing.");
                logger.info("   Check App Store Connect for details: https://appstoreconnect.apple.com");
                throw new Error(`Build is invalid. Check App Store Connect for details.`);
            }

            if (processingState === "PROCESSING") {
                // Show progress update every minute (every 6 polls at 10s interval)
                if (elapsedMinutes > lastMinuteLogged) {
                    lastMinuteLogged = elapsedMinutes;
                    logger.info(`⏳ Still processing... (${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''} elapsed)`);

                    // Helpful reminder at 10 minutes
                    if (elapsedMinutes === 10) {
                        logger.info("   This is taking a while but is normal. Average processing time is 5-15 minutes.");
                    }
                }

                await sleep(pollIntervalMs);
                continue;
            }

            // Unknown state
            logger.warn(`Unknown processing state: ${processingState}`);
            await sleep(pollIntervalMs);
            continue;
        }

        // Build not found yet
        if (i === 0) {
            logger.info("⏳ Waiting for build to appear in App Store Connect...");
        }

        await sleep(pollIntervalMs);
    }

    // Timeout reached
    console.log('');
    logger.error(`❌ Timeout: Build processing exceeded ${timeoutMinutes} minutes.`);
    logger.info("   The build may still be processing. Check App Store Connect:");
    logger.info("   https://appstoreconnect.apple.com");
    throw new Error(`Build processing timeout after ${timeoutMinutes} minutes. Check App Store Connect.`);
}

/**
 * Submit build to TestFlight (Beta App Review)
 */
export async function submitToTestFlight(token, buildId) {
    const endpoint = "/betaAppReviewSubmissions";
    const body = {
        data: {
            type: "betaAppReviewSubmissions",
            relationships: {
                build: {
                    data: {
                        type: "builds",
                        id: buildId
                    }
                }
            }
        }
    };

    const response = await makeRequest(token, "POST", endpoint, body);
    return response.data;
}

/**
 * Get or create an App Store version for production submission
 * Returns { versionId, isNew }
 */
export async function getOrCreateAppStoreVersion(token, appId, versionString) {
    // Check if version already exists (in editable states)
    const endpoint = `/apps/${appId}/appStoreVersions?filter[versionString]=${versionString}&filter[appStoreState]=PREPARE_FOR_SUBMISSION,WAITING_FOR_REVIEW,IN_REVIEW,DEVELOPER_REJECTED`;
    const response = await makeRequest(token, "GET", endpoint);

    if (response.data && response.data.length > 0) {
        logger.info(`Found existing App Store version: ${versionString} (${response.data[0].attributes.appStoreState})`);
        return {
            versionId: response.data[0].id,
            isNew: false
        };
    }

    // Create new version
    logger.info(`Creating new App Store version: ${versionString}`);
    const createEndpoint = "/appStoreVersions";
    const body = {
        data: {
            type: "appStoreVersions",
            attributes: {
                platform: "IOS",
                versionString: versionString
            },
            relationships: {
                app: {
                    data: {
                        type: "apps",
                        id: appId
                    }
                }
            }
        }
    };

    const createResponse = await makeRequest(token, "POST", createEndpoint, body);
    return {
        versionId: createResponse.data.id,
        isNew: true
    };
}

/**
 * Assign build to App Store version
 */
export async function assignBuildToVersion(token, versionId, buildId) {
    const endpoint = `/appStoreVersions/${versionId}/relationships/build`;
    const body = {
        data: {
            type: "builds",
            id: buildId
        }
    };

    await makeRequest(token, "PATCH", endpoint, body);
}

/**
 * Set release notes (What's New) for an App Store version
 * releaseNotes format: [{ locale: "en-US", text: "Release notes" }]
 */
export async function setReleaseNotes(token, versionId, releaseNotes) {
    // Get existing localizations
    const getEndpoint = `/appStoreVersions/${versionId}/appStoreVersionLocalizations`;
    const existingLocalizations = await makeRequest(token, "GET", getEndpoint);

    for (const note of releaseNotes) {
        // Check if localization exists
        const existing = existingLocalizations.data?.find(
            loc => loc.attributes.locale === note.locale
        );

        if (existing) {
            // Update existing localization
            const updateEndpoint = `/appStoreVersionLocalizations/${existing.id}`;
            const body = {
                data: {
                    type: "appStoreVersionLocalizations",
                    id: existing.id,
                    attributes: {
                        whatsNew: note.text
                    }
                }
            };
            await makeRequest(token, "PATCH", updateEndpoint, body);
            logger.info(`Updated release notes for locale: ${note.locale}`);
        } else {
            // Create new localization
            const createEndpoint = "/appStoreVersionLocalizations";
            const body = {
                data: {
                    type: "appStoreVersionLocalizations",
                    attributes: {
                        locale: note.locale,
                        whatsNew: note.text
                    },
                    relationships: {
                        appStoreVersion: {
                            data: {
                                type: "appStoreVersions",
                                id: versionId
                            }
                        }
                    }
                }
            };
            await makeRequest(token, "POST", createEndpoint, body);
            logger.info(`Created release notes for locale: ${note.locale}`);
        }
    }
}

/**
 * Submit App Store version for review
 */
export async function submitForReview(token, versionId) {
    const endpoint = "/appStoreVersionSubmissions";
    const body = {
        data: {
            type: "appStoreVersionSubmissions",
            relationships: {
                appStoreVersion: {
                    data: {
                        type: "appStoreVersions",
                        id: versionId
                    }
                }
            }
        }
    };

    const response = await makeRequest(token, "POST", endpoint, body);
    return response.data;
}

/**
 * Add beta testers to build (optional - for internal testing)
 */
export async function addBetaGroups(token, buildId, groupNames = ["Internal Testers"]) {
    // This is optional - users can configure beta groups manually
    // Implementation omitted for now as it's not critical
    logger.info("Note: Beta groups must be configured manually in App Store Connect");
}

// Helper function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
