import { ROOM_CONFIG, GAME_TIMING, VALIDATION } from '../constants';

describe('Constants', () => {
    describe('ROOM_CONFIG', () => {
        it('should have valid room configuration values', () => {
            expect(ROOM_CONFIG.MAX_PLAYERS).toBe(8);
            expect(ROOM_CONFIG.ROOM_CODE_LENGTH).toBe(6);
            expect(ROOM_CONFIG.MAX_NAME_LENGTH).toBeGreaterThan(0);
            expect(ROOM_CONFIG.MIN_NAME_LENGTH).toBe(1);
        });
    });

    describe('GAME_TIMING', () => {
        it('should have positive timing values', () => {
            expect(GAME_TIMING.SPLIT_STEAL_REVEAL_DELAY).toBeGreaterThan(0);
            expect(GAME_TIMING.ROOM_LIST_POLL_INTERVAL).toBeGreaterThan(0);
            expect(GAME_TIMING.THINKING_PHASE_DURATION).toBeGreaterThan(0);
        });
    });

    describe('VALIDATION', () => {
        it('should validate correct player names', () => {
            expect(VALIDATION.NAME_PATTERN.test('Player1')).toBe(true);
            expect(VALIDATION.NAME_PATTERN.test('John Doe')).toBe(true);
            expect(VALIDATION.NAME_PATTERN.test('Test_User')).toBe(true);
        });

        it('should reject invalid player names', () => {
            expect(VALIDATION.NAME_PATTERN.test('Player@123')).toBe(false);
            expect(VALIDATION.NAME_PATTERN.test('Test<script>')).toBe(false);
        });

        it('should validate room codes', () => {
            expect(VALIDATION.ROOM_CODE_PATTERN.test('ABC123')).toBe(true);
            expect(VALIDATION.ROOM_CODE_PATTERN.test('XYZT99')).toBe(true);
        });

        it('should reject invalid room codes', () => {
            expect(VALIDATION.ROOM_CODE_PATTERN.test('abc123')).toBe(false); // lowercase
            expect(VALIDATION.ROOM_CODE_PATTERN.test('ABC12')).toBe(false);  // too short
            expect(VALIDATION.ROOM_CODE_PATTERN.test('ABC1234')).toBe(false); // too long
        });
    });
});
