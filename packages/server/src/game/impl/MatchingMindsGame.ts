import { GamePlugin, GameState } from '../GamePlugin';
import { Player, MatchingMindsState, MatchingMindsRound } from '@ryunix/shared';
import { logger } from '../../utils/logger';

/**
 * Matching Minds Game
 * Players submit word associations trying to converge on the same word
 */
export class MatchingMindsGame implements GamePlugin {
    id = 'matching-minds';
    name = 'Matching Minds';
    minPlayers = 2;
    maxPlayers = 8;

    setup(players: Player[], config?: any, emitState?: (state: GameState) => void): GameState {
        logger.info('Setting up Matching Minds', { playerCount: players.length });

        const state: MatchingMindsState & GameState = {
            type: 'matching-minds',
            phase: 'SUBMITTING',
            currentRound: 1,
            maxRounds: 15,
            rounds: [],
            submissions: {},
            hasConverged: false
        };

        return state;
    }

    handleAction(state: GameState, senderId: string, action: any, dispatch?: (state: GameState) => void): GameState | null {
        const mmState = state as unknown as (MatchingMindsState & GameState);

        if (action.type === 'submit_word') {
            return this.handleSubmitWord(mmState, senderId, action.word, action.playerName, action.playerCount);
        } else if (action.type === 'next_round') {
            return this.handleNextRound(mmState);
        }

        return null;
    }

    private handleSubmitWord(state: MatchingMindsState & GameState, playerId: string, word: string, playerName: string, playerCount: number): GameState | null {
        if (state.phase !== 'SUBMITTING') {
            logger.warn('Invalid submission phase', { playerId, phase: state.phase });
            return null;
        }

        // Validate and sanitize word
        const sanitizedWord = word.trim().toLowerCase();
        if (!sanitizedWord || sanitizedWord.length > 50) {
            logger.warn('Invalid word submission', { playerId, word });
            return null;
        }

        // Store submission
        state.submissions[playerId] = { word: sanitizedWord, playerName: playerName || playerId };
        logger.info('Word submitted', { playerId, word: sanitizedWord, total: Object.keys(state.submissions).length, playerCount });

        // Check if all players have submitted
        if (Object.keys(state.submissions).length === playerCount) {
            logger.info('All players submitted - revealing results');
            this.revealRound(state);
        }

        return state;
    }

    private revealRound(state: MatchingMindsState & GameState): void {
        // Count word occurrences
        const wordCounts: Record<string, number> = {};
        const playerSubmissions: Array<{ playerId: string; playerName: string; word: string }> = [];

        Object.entries(state.submissions).forEach(([playerId, sub]) => {
            wordCounts[sub.word] = (wordCounts[sub.word] || 0) + 1;
            playerSubmissions.push({ playerId, playerName: sub.playerName, word: sub.word });
        });

        // Find most common word
        let mostCommonWord = '';
        let matchCount = 0;
        Object.entries(wordCounts).forEach(([word, count]) => {
            if (count > matchCount) {
                mostCommonWord = word;
                matchCount = count;
            }
        });

        // Check for convergence (all players submitted same word)
        const totalSubmissions = Object.keys(state.submissions).length;
        if (matchCount === totalSubmissions) {
            state.hasConverged = true;
            state.convergenceWord = mostCommonWord;
            state.phase = 'RESULTS';
            logger.info('Convergence achieved!', { word: mostCommonWord, round: state.currentRound });
        } else {
            state.phase = 'REVEALING';
            logger.info('No convergence', { mostCommon: mostCommonWord, matchCount, total: totalSubmissions });
        }

        // Save round results
        const round: MatchingMindsRound = {
            roundNumber: state.currentRound,
            submissions: playerSubmissions,
            mostCommonWord,
            matchCount
        };
        state.rounds.push(round);
    }

    private handleNextRound(state: MatchingMindsState & GameState): GameState | null {
        if (state.phase !== 'REVEALING') {
            return null;
        }

        // Advance to next round
        state.currentRound++;
        state.phase = 'SUBMITTING';
        state.submissions = {};

        logger.info('Starting next round', { round: state.currentRound });
        return state;
    }

    isComplete(state: GameState): boolean {
        const mmState = state as unknown as MatchingMindsState;
        return mmState.hasConverged || mmState.currentRound > mmState.maxRounds;
    }

    resolve(state: GameState, players: Player[]): { [playerId: string]: number } {
        const mmState = state as unknown as MatchingMindsState;
        const scores: { [playerId: string]: number } = {};

        if (!mmState.hasConverged) {
            // Partial scores for not converging
            players.forEach(p => { scores[p.id] = 10; });
            return scores;
        }

        // Calculate scores based on convergence speed
        const basePoints = 100;
        const roundPenalty = 5;
        const convergenceBonus = Math.max(20, basePoints - (mmState.currentRound * roundPenalty));

        players.forEach(player => {
            scores[player.id] = convergenceBonus;
        });

        // Bonus points for matching majority in earlier rounds
        mmState.rounds.forEach((round, index) => {
            const roundBonus = Math.max(0, 10 - index);
            round.submissions.forEach(sub => {
                if (sub.word === round.mostCommonWord && round.matchCount >= 2) {
                    scores[sub.playerId] = (scores[sub.playerId] || 0) + roundBonus;
                }
            });
        });

        return scores;
    }
}
