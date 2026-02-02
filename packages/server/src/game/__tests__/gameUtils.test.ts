import { calculateWinner, updatePlayerWins, handleGameCompletion, GameResults } from '../gameUtils';
import { Player } from '@ryunix/shared';

describe('gameUtils', () => {
    const createMockPlayer = (id: string, roomWins: number = 0): Player => ({
        id,
        name: `Player${id}`,
        isHost: false,
        isAlive: true,
        score: 0,
        roomWins,
        roomId: 'TEST123',
        socketId: `socket-${id}`
    });

    describe('calculateWinner', () => {
        it('should return the player with the highest score', () => {
            const results: GameResults = {
                'player1': 100,
                'player2': 200,
                'player3': 150
            };

            const winnerId = calculateWinner(results);
            expect(winnerId).toBe('player2');
        });

        it('should return null for empty results', () => {
            const results: GameResults = {};
            const winnerId = calculateWinner(results);
            expect(winnerId).toBeNull();
        });

        it('should handle negative scores', () => {
            const results: GameResults = {
                'player1': -10,
                'player2': -5,
                'player3': -20
            };

            const winnerId = calculateWinner(results);
            expect(winnerId).toBe('player2'); // -5 is highest
        });

        it('should handle tied scores (returns first found)', () => {
            const results: GameResults = {
                'player1': 100,
                'player2': 100
            };

            const winnerId = calculateWinner(results);
            // Should return one of them (implementation detail)
            expect(['player1', 'player2']).toContain(winnerId);
        });
    });

    describe('updatePlayerWins', () => {
        it('should increment roomWins for the winner', () => {
            const players = [
                createMockPlayer('1', 0),
                createMockPlayer('2', 1),
                createMockPlayer('3', 0)
            ];

            const updated = updatePlayerWins(players, '2');
            const winner = updated.find(p => p.id === '2');

            expect(winner?.roomWins).toBe(2);
        });

        it('should not modify players if winnerId is null', () => {
            const players = [createMockPlayer('1', 5)];
            const updated = updatePlayerWins(players, null);

            expect(updated[0].roomWins).toBe(5);
        });

        it('should not crash if winner not found', () => {
            const players = [createMockPlayer('1')];
            const updated = updatePlayerWins(players, 'nonexistent');

            expect(updated).toEqual(players);
        });
    });

    describe('handleGameCompletion', () => {
        it('should calculate winner and update player stats', () => {
            const results: GameResults = {
                '1': 150,
                '2': 200,
                '3': 100
            };

            const players = [
                createMockPlayer('1', 0),
                createMockPlayer('2', 1),
                createMockPlayer('3', 0)
            ];

            const { players: updated, winnerId } = handleGameCompletion(results, players);

            expect(winnerId).toBe('2');
            expect(updated.find(p => p.id === '2')?.roomWins).toBe(2);
        });

        it('should handle games with no clear winner', () => {
            const results: GameResults = {};
            const players = [createMockPlayer('1')];

            const { players: updated, winnerId } = handleGameCompletion(results, players);

            expect(winnerId).toBeNull();
            expect(updated[0].roomWins).toBe(0);
        });
    });
});
