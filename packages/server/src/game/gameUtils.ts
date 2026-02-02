import { Player } from '@ryunix/shared';

/**
 * Game utility functions
 * Shared logic used across multiple games
 */

export interface GameResults {
    [playerId: string]: number;
}

/**
 * Calculates the winner from game results
 * @param results - Object mapping player IDs to scores
 * @returns Winner's player ID, or null if no clear winner
 */
export function calculateWinner(results: GameResults): string | null {
    let maxScore = -Infinity;
    let winnerId: string | null = null;

    Object.entries(results).forEach(([playerId, score]) => {
        if (score > maxScore) {
            maxScore = score;
            winnerId = playerId;
        }
    });

    return winnerId;
}

/**
 * Updates the roomWins count for the winning player
 * @param players - Array of all players in the room
 * @param winnerId - ID of the winning player
 * @returns Updated players array
 */
export function updatePlayerWins(players: Player[], winnerId: string | null): Player[] {
    if (!winnerId) return players;

    const winner = players.find(p => p.id === winnerId);
    if (winner) {
        winner.roomWins++;
    }

    return players;
}

/**
 * Handles game completion logic
 * Calculates winner and updates player stats
 * @param results - Game results mapping
 * @param players - Array of players
 * @returns Object with updated players and winner ID
 */
export function handleGameCompletion(
    results: GameResults,
    players: Player[]
): { players: Player[]; winnerId: string | null } {
    const winnerId = calculateWinner(results);
    const updatedPlayers = updatePlayerWins(players, winnerId);

    return { players: updatedPlayers, winnerId };
}
