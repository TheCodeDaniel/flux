// tests/commands/init.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { initCommand } from '../../commands/init.js';

describe('Init Command', () => {
    const testDir = path.join(process.cwd(), '.test-init-workspace');

    beforeEach(async () => {
        await fs.ensureDir(testDir);
        process.chdir(testDir);
    });

    afterEach(async () => {
        process.chdir(path.join(testDir, '..'));
        await fs.remove(testDir);
    });

    test('should create flux.yml in current directory', async () => {
        await initCommand(testDir, { force: false });

        const fluxYmlPath = path.join(testDir, 'flux.yml');
        const exists = await fs.pathExists(fluxYmlPath);

        expect(exists).toBe(true);
    });

    test('should detect Flutter project and update pubspec.yaml', async () => {
        // Create mock pubspec.yaml
        const mockPubspec = `name: test_app
description: A test Flutter app
version: 1.0.0+1

environment:
  sdk: ">=2.17.0 <3.0.0"

dependencies:
  flutter:
    sdk: flutter
`;
        await fs.writeFile(path.join(testDir, 'pubspec.yaml'), mockPubspec);

        await initCommand(testDir, { force: false });

        const updatedPubspec = await fs.readFile(path.join(testDir, 'pubspec.yaml'), 'utf8');

        // Should contain flux.yml reference
        expect(updatedPubspec).toContain('assets:');
        expect(updatedPubspec).toContain('- flux.yml');
    });

    test('should create backup when force flag is used on existing flux.yml', async () => {
        const existingConfig = { test: 'config' };
        await fs.writeFile(path.join(testDir, 'flux.yml'), JSON.stringify(existingConfig));

        await initCommand(testDir, { force: true });

        // Should create backup file
        const backupFiles = (await fs.readdir(testDir)).filter(f => f.startsWith('flux.yml.backup'));
        expect(backupFiles.length).toBeGreaterThan(0);
    });

    test('should not overwrite existing flux.yml without force flag', async () => {
        const existingConfig = { test: 'existing-config' };
        await fs.writeFile(path.join(testDir, 'flux.yml'), JSON.stringify(existingConfig));

        // Should throw or skip without force flag
        await expect(async () => {
            await initCommand(testDir, { force: false });
        }).rejects.toThrow();
    });
});
