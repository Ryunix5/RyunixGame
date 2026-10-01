import { Player } from '@ryunix/shared';
import { GAME_INPUT } from '../constants';

/**
 * Game utility functions
 * Shared logic used across multiple games
 */

export interface GameResults {
    [playerId: string]: number;
}

/**
 * Everyone with the top score wins (ties share the win). Nobody wins if the top score is 0 or
 * less, e.g. a cooperative game the group failed.
 */
export function calculateWinners(results: GameResults): string[] {
    const scores = Object.values(results);
    if (scores.length === 0) return [];
    const top = Math.max(...scores);
    if (top <= 0) return [];
    return Object.keys(results).filter(id => results[id] === top);
}

/**
 * Records a finished game: each winner's roomWins goes up by one.
 */
export function handleGameCompletion(
    results: GameResults,
    players: Player[]
): { players: Player[]; winnerIds: string[] } {
    const winnerIds = calculateWinners(results);
    players.forEach(p => {
        if (winnerIds.includes(p.id)) p.roomWins++;
    });
    return { players, winnerIds };
}

/**
 * Validates free text a player typed into a game (a word, answer, guess...).
 * Returns it trimmed, or null if it isn't a non-empty string within `maxLength`.
 * Everything accepted here gets broadcast to the whole room, hence the cap.
 */
export function cleanText(value: unknown, maxLength: number = GAME_INPUT.MAX_TEXT_LENGTH): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > maxLength) return null;
    return trimmed;
}
