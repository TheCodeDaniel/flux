// tests/utils/config.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { loadConfig } from '../../utils/config.js';

describe('Config Utils', () => {
    const testDir = path.join(process.cwd(), '.test-workspace');
    const fluxYmlPath = path.join(testDir, 'flux-mobile.yml');

    beforeEach(async () => {
        await fs.ensureDir(testDir);
        process.chdir(testDir);
    });

    afterEach(async () => {
        process.chdir(path.join(testDir, '..'));
        await fs.remove(testDir);
    });

    test('should load valid flux-mobile.yml configuration', async () => {
        const mockConfig = {
            flutter: {
                enabled: true,
                export_method: 'app-store'
            },
            playstore: {
                service_account_json: './keys/playstore.json',
                package_name: 'com.example.app',
                default_track: 'internal'
            }
        };

        await fs.writeFile(fluxYmlPath, JSON.stringify(mockConfig));

        const config = loadConfig();
        expect(config).toEqual(mockConfig);
    });

    test('should throw error when flux-mobile.yml is missing', () => {
        expect(() => loadConfig()).toThrow();
    });

    test('should handle malformed flux-mobile.yml', async () => {
        await fs.writeFile(fluxYmlPath, 'invalid yaml content {{{');

        expect(() => loadConfig()).toThrow();
    });
});
