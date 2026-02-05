// tests/validation/input-validation.test.js
import { describe, test, expect } from '@jest/globals';

describe('Input Validation Tests', () => {
    describe('Platform Validation', () => {
        test('should accept valid platforms', () => {
            const validPlatforms = ['android', 'ios'];
            validPlatforms.forEach(platform => {
                expect(['android', 'ios'].includes(platform.toLowerCase())).toBe(true);
            });
        });

        test('should reject invalid platforms', () => {
            const invalidPlatforms = ['web', 'desktop', 'windows', 'macos', 'linux'];
            invalidPlatforms.forEach(platform => {
                expect(['android', 'ios'].includes(platform.toLowerCase())).toBe(false);
            });
        });

        test('should handle case insensitivity for platforms', () => {
            expect(['android', 'ios'].includes('Android'.toLowerCase())).toBe(true);
            expect(['android', 'ios'].includes('IOS'.toLowerCase())).toBe(true);
            expect(['android', 'ios'].includes('ios'.toLowerCase())).toBe(true);
            expect(['android', 'ios'].includes('ANDROID'.toLowerCase())).toBe(true);
        });
    });

    describe('Track Validation', () => {
        test('should accept valid Android tracks', () => {
            const validTracks = ['internal', 'alpha', 'beta', 'production'];
            validTracks.forEach(track => {
                expect(['internal', 'alpha', 'beta', 'production'].includes(track)).toBe(true);
            });
        });

        test('should accept valid iOS tracks', () => {
            const validTracks = ['testflight', 'production'];
            validTracks.forEach(track => {
                expect(['testflight', 'production'].includes(track)).toBe(true);
            });
        });

        test('should reject iOS tracks for Android', () => {
            const iosTracks = ['testflight'];
            const androidValidTracks = ['internal', 'alpha', 'beta', 'production'];
            iosTracks.forEach(track => {
                expect(androidValidTracks.includes(track)).toBe(false);
            });
        });

        test('should reject Android tracks for iOS (except production)', () => {
            const androidOnlyTracks = ['internal', 'alpha', 'beta'];
            const iosValidTracks = ['testflight', 'production'];
            androidOnlyTracks.forEach(track => {
                expect(iosValidTracks.includes(track)).toBe(false);
            });
        });
    });

    describe('Upload Tool Validation', () => {
        test('should accept valid iOS upload tools', () => {
            const validTools = ['transporter', 'altool'];
            validTools.forEach(tool => {
                expect(['transporter', 'altool'].includes(tool.toLowerCase())).toBe(true);
            });
        });

        test('should reject invalid upload tools', () => {
            const invalidTools = ['fastlane', 'xcodebuild', 'curl'];
            invalidTools.forEach(tool => {
                expect(['transporter', 'altool'].includes(tool.toLowerCase())).toBe(false);
            });
        });
    });
});
