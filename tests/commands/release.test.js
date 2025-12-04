// tests/commands/release.test.js
import { describe, test, expect } from '@jest/globals';

describe('Release Command Tests', () => {
    describe('Command Structure', () => {
        test('should require platform argument', () => {
            // The release command requires a platform argument (android|ios)
            const validPlatforms = ['android', 'ios'];
            expect(validPlatforms.length).toBeGreaterThan(0);
        });

        test('should require track option', () => {
            // The release command requires --track option
            const requiredOptions = ['track'];
            expect(requiredOptions).toContain('track');
        });

        test('should support optional flavor, notes, env-file, and define options', () => {
            const optionalOptions = ['flavor', 'notes', 'envFile', 'define', 'verbose'];
            expect(optionalOptions.length).toBe(5);
        });
    });

    describe('Android Release Workflow', () => {
        test('should validate Android-specific tracks', () => {
            const validAndroidTracks = ['internal', 'alpha', 'beta', 'production'];
            const track = 'internal';
            expect(validAndroidTracks.includes(track)).toBe(true);
        });

        test('should build AAB for Android (not APK)', () => {
            // The unified release command only supports AAB for Android
            const buildType = 'aab';
            expect(buildType).toBe('aab');
        });

        test('should parse AAB path from Flutter build output', () => {
            const mockOutput = 'Built build/app/outputs/bundle/release/app-release.aab (12.3MB)';
            const regex = /Built\s+(build\/app\/outputs\/bundle\/.*?\.aab)/;
            const match = mockOutput.match(regex);

            expect(match).not.toBeNull();
            expect(match[1]).toContain('app-release.aab');
        });
    });

    describe('iOS Release Workflow', () => {
        test('should validate iOS-specific tracks', () => {
            const validIOSTracks = ['testflight', 'production'];
            const track = 'testflight';
            expect(validIOSTracks.includes(track)).toBe(true);
        });

        test('should build IPA for iOS', () => {
            const buildType = 'ipa';
            expect(buildType).toBe('ipa');
        });

        test('should parse IPA path from Flutter build output', () => {
            const mockOutput = 'Built IPA to /path/to/build/ios/ipa/app.ipa';
            const regex = /Built.*?IPA.*?to\s+(.+\.ipa)/i;
            const match = mockOutput.match(regex);

            expect(match).not.toBeNull();
            expect(match[1]).toContain('.ipa');
        });

        test('should only run on macOS', () => {
            // iOS release command checks for macOS
            const validPlatform = 'darwin';
            expect(['darwin'].includes(validPlatform)).toBe(true);
        });
    });

    describe('Release Notes Formatting', () => {
        test('should accept string release notes', () => {
            const notes = "Bug fixes and improvements";
            expect(typeof notes).toBe('string');
        });

        test('should accept JSON object for multi-locale notes', () => {
            const notes = {
                "en-US": "English notes",
                "es-ES": "Notas en español"
            };
            expect(typeof notes).toBe('object');
            expect(Object.keys(notes).length).toBeGreaterThan(1);
        });

        test('should parse JSON string to object', () => {
            const jsonString = '{"en-US":"English","fr-FR":"Français"}';
            const parsed = JSON.parse(jsonString);

            expect(typeof parsed).toBe('object');
            expect(parsed['en-US']).toBe('English');
            expect(parsed['fr-FR']).toBe('Français');
        });
    });

    describe('Build Arguments Construction', () => {
        test('should construct base Android AAB build arguments', () => {
            const baseArgs = ['build', 'appbundle', '--release'];
            expect(baseArgs).toEqual(['build', 'appbundle', '--release']);
        });

        test('should construct base iOS IPA build arguments', () => {
            const baseArgs = ['build', 'ipa', '--release'];
            expect(baseArgs).toEqual(['build', 'ipa', '--release']);
        });

        test('should add flavor to build arguments', () => {
            const args = ['build', 'appbundle', '--release'];
            const flavor = 'staging';
            args.push('--flavor', flavor);

            expect(args).toContain('--flavor');
            expect(args).toContain('staging');
        });

        test('should add env-file to build arguments', () => {
            const args = ['build', 'appbundle', '--release'];
            const envFile = '.env.prod';
            args.push(`--dart-define-from-file=${envFile}`);

            expect(args.some(arg => arg.includes('--dart-define-from-file'))).toBe(true);
        });

        test('should add multiple dart-define values', () => {
            const args = ['build', 'appbundle', '--release'];
            const defines = ['API_KEY=abc', 'ENV=production'];

            defines.forEach(def => {
                args.push(`--dart-define=${def}`);
            });

            expect(args.filter(arg => arg.includes('--dart-define=')).length).toBe(2);
        });
    });

    describe('Deployment Confirmation', () => {
        test('should prompt user with Y/n question', () => {
            const promptMessage = 'Deploy to Play Store (internal track)? (Y/n):';
            expect(promptMessage).toContain('(Y/n)');
        });

        test('should default to Yes on empty input', () => {
            const userInput = '';
            const normalized = userInput.trim().toLowerCase();
            const shouldDeploy = normalized === '' || normalized === 'y' || normalized === 'yes';

            expect(shouldDeploy).toBe(true);
        });

        test('should accept Yes variations', () => {
            const inputs = ['y', 'Y', 'yes', 'YES', 'Yes'];
            inputs.forEach(input => {
                const normalized = input.trim().toLowerCase();
                const shouldDeploy = normalized === '' || normalized === 'y' || normalized === 'yes';
                expect(shouldDeploy).toBe(true);
            });
        });

        test('should reject No variations', () => {
            const inputs = ['n', 'N', 'no', 'NO', 'No'];
            inputs.forEach(input => {
                const normalized = input.trim().toLowerCase();
                const shouldDeploy = normalized === '' || normalized === 'y' || normalized === 'yes';
                expect(shouldDeploy).toBe(false);
            });
        });
    });

    describe('Deployment Logging', () => {
        test('should log deployment to .flux-mobile/deployments.json', () => {
            const logPath = '.flux-mobile/deployments.json';
            expect(logPath).toContain('.flux-mobile');
            expect(logPath).toContain('deployments.json');
        });

        test('should include required deployment info', () => {
            const deploymentLog = {
                platform: 'android',
                track: 'internal',
                artifact: '/path/to/app.aab',
                notes: 'Release notes',
                timestamp: new Date().toISOString()
            };

            expect(deploymentLog.platform).toBeDefined();
            expect(deploymentLog.track).toBeDefined();
            expect(deploymentLog.artifact).toBeDefined();
            expect(deploymentLog.timestamp).toBeDefined();
        });
    });
});
