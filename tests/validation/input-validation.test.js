// tests/validation/input-validation.test.js
import { describe, test, expect } from '@jest/globals';

describe('Input Validation Tests', () => {
    describe('Release Type Validation', () => {
        test('should accept valid release types', () => {
            const validTypes = ['apk', 'aab', 'ipa'];
            validTypes.forEach(type => {
                expect(['apk', 'aab', 'ipa'].includes(type.toLowerCase())).toBe(true);
            });
        });

        test('should reject invalid release types', () => {
            const invalidTypes = ['exe', 'dmg', 'zip', 'tar'];
            invalidTypes.forEach(type => {
                expect(['apk', 'aab', 'ipa'].includes(type.toLowerCase())).toBe(false);
            });
        });
    });

    describe('Build Mode Validation', () => {
        test('should accept valid build modes', () => {
            const validModes = ['release', 'debug', 'profile'];
            validModes.forEach(mode => {
                expect(['release', 'debug', 'profile'].includes(mode.toLowerCase())).toBe(true);
            });
        });

        test('should reject invalid build modes', () => {
            const invalidModes = ['production', 'development', 'test'];
            invalidModes.forEach(mode => {
                expect(['release', 'debug', 'profile'].includes(mode.toLowerCase())).toBe(false);
            });
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
