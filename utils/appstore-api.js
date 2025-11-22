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
                        reject(new Error(error.errors?.[0]?.detail || `API Error: ${res.statusCode}`));
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
 * Get the latest build for a given app
 */
export async function getLatestBuild(token, appId) {
    // Wait a bit for the build to be processed after upload
    logger.info("Waiting for build to be processed by App Store Connect...");
    await sleep(10000); // 10 seconds initial wait

    const endpoint = `/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1`;

    // Retry logic as build processing takes time
    for (let i = 0; i < 12; i++) { // Max 2 minutes (12 * 10s)
        const response = await makeRequest(token, "GET", endpoint);

        if (response.data && response.data.length > 0) {
            const build = response.data[0];
            logger.info(`Found build: ${build.attributes.version} (${build.attributes.processingState})`);

            // Check if build is ready
            if (build.attributes.processingState === "PROCESSING") {
                logger.info(`Build still processing... (attempt ${i + 1}/12)`);
                await sleep(10000); // Wait 10 seconds
                continue;
            }

            if (build.attributes.processingState === "VALID") {
                return build.id;
            }

            if (build.attributes.processingState === "INVALID") {
                throw new Error(`Build is invalid. Check App Store Connect for details.`);
            }
        }

        if (i < 11) {
            logger.info(`Build not found yet... (attempt ${i + 1}/12)`);
            await sleep(10000);
        }
    }

    throw new Error("Build not found or took too long to process. Check App Store Connect.");
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
