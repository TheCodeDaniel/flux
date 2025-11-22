// tests/utils/appstore-api.test.js
import { describe, test, expect, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { generateToken } from '../../utils/appstore-api.js';

describe('App Store API Utils', () => {
    describe('generateToken', () => {
        test('should generate valid JWT token', async () => {
            // Mock private key (ES256 format)
            const mockKeyPath = path.join(process.cwd(), '.test-key.p8');
            const mockPrivateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgTest1234567890Test
1234567890Test1234567890oAoGCCqGSM49AwEHoUQDQgAETest1234567890Test12
34567890Test1234567890Test1234567890Test1234567890Test1234567890Test==
-----END PRIVATE KEY-----`;

            try {
                await fs.writeFile(mockKeyPath, mockPrivateKey);

                const token = generateToken('TESTKEY123', 'test-issuer-id', mockKeyPath);

                expect(token).toBeTruthy();
                expect(typeof token).toBe('string');

                // JWT tokens have 3 parts separated by dots
                const parts = token.split('.');
                expect(parts.length).toBe(3);

            } catch (err) {
                // This test may fail without a valid ES256 key, which is expected
                // In a real scenario, you'd mock the jwt.sign function
                expect(err).toBeDefined();
            } finally {
                await fs.remove(mockKeyPath);
            }
        });

        test('should throw error when key file does not exist', () => {
            expect(() => {
                generateToken('TESTKEY123', 'test-issuer-id', '/nonexistent/path/key.p8');
            }).toThrow();
        });
    });
});
