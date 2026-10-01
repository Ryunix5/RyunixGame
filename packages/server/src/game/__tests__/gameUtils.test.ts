import { calculateWinners, handleGameCompletion, GameResults, cleanText } from '../gameUtils';
import { Player } from '@ryunix/shared';

describe('gameUtils', () => {
    const createMockPlayer = (id: string, roomWins: number = 0): Player => ({
        id,
        name: `Player${id}`,
        isHost: false,
        isAlive: true,
        roomWins,
        roomId: 'TEST123',
        connected: true
    });

    describe('calculateWinners', () => {
        it('returns the top scorer', () => {
            expect(calculateWinners({ '1': 100, '2': 200, '3': 150 })).toEqual(['2']);
        });

        it('lets tied top scorers share the win', () => {
            expect(calculateWinners({ '1': 100, '2': 100, '3': 0 }).sort()).toEqual(['1', '2']);
        });

        it('has no winner when nobody scored', () => {
            expect(calculateWinners({ '1': 0, '2': 0 })).toEqual([]);
            expect(calculateWinners({})).toEqual([]);
        });
    });

    describe('handleGameCompletion', () => {
        it('adds a room win for every winner', () => {
            const players = [createMockPlayer('1', 0), createMockPlayer('2', 1), createMockPlayer('3', 0)];
            const { players: updated, winnerIds } = handleGameCompletion({ '1': 100, '2': 100, '3': 20 }, players);

            expect(winnerIds.sort()).toEqual(['1', '2']);
            expect(updated.map(p => p.roomWins)).toEqual([1, 2, 0]);
        });

        it('changes nothing when there is no winner', () => {
            const players = [createMockPlayer('1', 5)];
            const { players: updated, winnerIds } = handleGameCompletion({}, players);

            expect(winnerIds).toEqual([]);
            expect(updated[0].roomWins).toBe(5);
        });
    });

    describe('cleanText', () => {
        it('trims valid text', () => {
            expect(cleanText('  Pizza  ')).toBe('Pizza');
        });

        it('rejects non-strings, blank and overlong text', () => {
            expect(cleanText(42)).toBeNull();
            expect(cleanText(undefined)).toBeNull();
            expect(cleanText('   ')).toBeNull();
            expect(cleanText('x'.repeat(61))).toBeNull();
            expect(cleanText('x'.repeat(61), 100)).toHaveLength(61);
        });
    });
});
