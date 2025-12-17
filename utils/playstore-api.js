// utils/playstore-api.js
import { google } from 'googleapis';
import { logger } from './logger.js';

/**
 * Check if a version code already exists in Google Play Console
 * Checks all tracks (internal, alpha, beta, production) for conflicts
 *
 * @param {object} auth - Google Auth object
 * @param {string} packageName - Android package name
 * @param {string} versionCode - Version code to check (e.g., "45")
 * @returns {Promise<{exists: boolean, track?: string, status?: string}>}
 */
export async function checkVersionExistsPlayStore(auth, packageName, versionCode) {
    try {
        const androidPublisher = google.androidpublisher({
            version: 'v3',
            auth,
        });

        // Get all tracks
        const tracksRes = await androidPublisher.edits.insert({ packageName })
            .then(editRes => {
                const editId = editRes.data.id;
                return androidPublisher.edits.tracks.list({
                    packageName,
                    editId,
                }).finally(() => {
                    // Clean up the edit
                    androidPublisher.edits.delete({
                        packageName,
                        editId,
                    }).catch(() => {}); // Ignore cleanup errors
                });
            });

        const tracks = tracksRes.data.tracks || [];

        // Check each track for the version code
        for (const track of tracks) {
            if (track.releases) {
                for (const release of track.releases) {
                    const versionCodes = release.versionCodes || [];

                    if (versionCodes.includes(versionCode.toString())) {
                        return {
                            exists: true,
                            track: track.track,
                            status: release.status,
                        };
                    }
                }
            }
        }

        return { exists: false };
    } catch (error) {
        // If API call fails, log warning but don't block deployment
        logger.warn(`Could not check version: ${error.message}`);
        return { exists: false };
    }
}
