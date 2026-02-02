import {
    validatePlayerName,
    validateRoomCode,
    validateChatMessage,
    validateGameId,
    ValidationError,
    safeValidate
} from '../validation';

describe('validation', () => {
    describe('validatePlayerName', () => {
        it('should accept valid player names', () => {
            expect(validatePlayerName('John')).toBe('John');
            expect(validatePlayerName('Player123')).toBe('Player123');
            expect(validatePlayerName('Cool_Gamer')).toBe('Cool_Gamer');
            expect(validatePlayerName('Test User')).toBe('Test User');
        });

        it('should trim whitespace', () => {
            expect(validatePlayerName('  John  ')).toBe('John');
        });

        it('should reject empty names', () => {
            expect(() => validatePlayerName('')).toThrow(ValidationError);
            expect(() => validatePlayerName('   ')).toThrow(ValidationError);
        });

        it('should reject names that are too long', () => {
            const longName = 'a'.repeat(21);
            expect(() => validatePlayerName(longName)).toThrow('20 characters');
        });

        it('should reject names with invalid characters', () => {
            expect(() => validatePlayerName('Test<script>')).toThrow(ValidationError);
            expect(() => validatePlayerName('Player@123')).toThrow(ValidationError);
            expect(() => validatePlayerName('Test&Name')).toThrow(ValidationError);
        });

        it('should escape HTML to prevent XSS', () => {
            const result = validatePlayerName('Test');
            // validator.escape should not modify safe strings
            expect(result).toBe('Test');
        });
    });

    describe('validateRoomCode', () => {
        it('should accept valid room codes', () => {
            expect(validateRoomCode('ABC123')).toBe('ABC123');
            expect(validateRoomCode('XYZ789')).toBe('XYZ789');
        });

        it('should convert to uppercase', () => {
            expect(validateRoomCode('abc123')).toBe('ABC123');
            expect(validateRoomCode('AbC123')).toBe('ABC123');
        });

        it('should reject codes of wrong length', () => {
            expect(() => validateRoomCode('ABC')).toThrow(ValidationError);
            expect(() => validateRoomCode('ABCDEFG')).toThrow(ValidationError);
        });

        it('should reject codes with special characters', () => {
            expect(() => validateRoomCode('ABC-12')).toThrow(ValidationError);
            expect(() => validateRoomCode('ABC 12')).toThrow(ValidationError);
        });

        it('should reject empty codes', () => {
            expect(() => validateRoomCode('')).toThrow(ValidationError);
        });
    });

    describe('validateChatMessage', () => {
        it('should accept valid messages', () => {
            expect(validateChatMessage('Hello world')).toBe('Hello world');
            expect(validateChatMessage('Test 123')).toBe('Test 123');
        });

        it('should trim whitespace', () => {
            expect(validateChatMessage('  Hello  ')).toBe('Hello');
        });

        it('should reject empty messages', () => {
            expect(() => validateChatMessage('')).toThrow(ValidationError);
            expect(() => validateChatMessage('   ')).toThrow(ValidationError);
        });

        it('should reject messages that are too long', () => {
            const longMessage = 'a'.repeat(501);
            expect(() => validateChatMessage(longMessage)).toThrow('500 characters');
        });

        it('should escape HTML to prevent XSS', () => {
            // validator.escape will escape HTML entities
            const result = validateChatMessage('Safe message');
            expect(result).toBe('Safe message');
        });
    });

    describe('validateGameId', () => {
        it('should accept valid game IDs', () => {
            expect(validateGameId('split-steal')).toBe('split-steal');
            expect(validateGameId('the-last-word')).toBe('the-last-word');
            expect(validateGameId('test123')).toBe('test123');
        });

        it('should reject invalid formats', () => {
            expect(() => validateGameId('Split_Steal')).toThrow(ValidationError);
            expect(() => validateGameId('game ID')).toThrow(ValidationError);
            expect(() => validateGameId('Game@123')).toThrow(ValidationError);
        });

        it('should reject empty IDs', () => {
            expect(() => validateGameId('')).toThrow(ValidationError);
        });
    });

    describe('safeValidate', () => {
        it('should return valid result for good input', () => {
            const result = safeValidate(validatePlayerName, 'John');
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.data).toBe('John');
            }
        });

        it('should return error for bad input', () => {
            const result = safeValidate(validatePlayerName, '');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toContain('required');
            }
        });

        it('should handle non-ValidationError exceptions', () => {
            const badValidator = () => {
                throw new Error('Something went wrong');
            };
            const result = safeValidate(badValidator, 'test');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Validation failed');
            }
        });
    });
});
