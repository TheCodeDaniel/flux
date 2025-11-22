// tests/utils/ipa-parser.test.js
import { describe, test, expect } from '@jest/globals';
import { formatReleaseNotes } from '../../utils/ipa-parser.js';

describe('IPA Parser Utils', () => {
    describe('formatReleaseNotes', () => {
        test('should format string input to default locale', () => {
            const notes = "Bug fixes and improvements";
            const result = formatReleaseNotes(notes);

            expect(result).toEqual([
                { locale: "en-US", text: "Bug fixes and improvements" }
            ]);
        });

        test('should format object input with multiple locales', () => {
            const notes = {
                "en-US": "English release notes",
                "es-ES": "Notas de la versión en español",
                "fr-FR": "Notes de version en français"
            };
            const result = formatReleaseNotes(notes);

            expect(result).toEqual([
                { locale: "en-US", text: "English release notes" },
                { locale: "es-ES", text: "Notas de la versión en español" },
                { locale: "fr-FR", text: "Notes de version en français" }
            ]);
        });

        test('should return default notes when input is null', () => {
            const result = formatReleaseNotes(null);

            expect(result).toEqual([
                { locale: "en-US", text: "Bug fixes and improvements" }
            ]);
        });

        test('should return default notes when input is undefined', () => {
            const result = formatReleaseNotes(undefined);

            expect(result).toEqual([
                { locale: "en-US", text: "Bug fixes and improvements" }
            ]);
        });

        test('should convert non-string values to strings', () => {
            const notes = {
                "en-US": 123,
                "es-ES": true
            };
            const result = formatReleaseNotes(notes);

            expect(result).toEqual([
                { locale: "en-US", text: "123" },
                { locale: "es-ES", text: "true" }
            ]);
        });
    });
});
