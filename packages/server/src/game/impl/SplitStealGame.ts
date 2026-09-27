import { Player } from '@ryunix/shared';
import { GameContext, GamePlugin, GameState, maskRecord, SYSTEM_SENDER } from '../GamePlugin';
import { GAME_TIMING } from '../../constants';

interface SplitStealState extends GameState {
    round: number;
    trustPoints: { [playerId: string]: number };
    pairings: Array<[string, string]>; // Array of player ID pairs
    decisions: { [playerId: string]: 'split' | 'steal' };
    history: Array<any>; // For results
    spectatorId?: string;
    phase: 'DECISION' | 'REVEAL';
}

export class SplitStealGame implements GamePlugin {
    id = 'split-steal';
    name = 'Split or Steal';
    minPlayers = 2;
    maxPlayers = 8;
    readonly MAX_ROUNDS = 4;

    setup(players: Player[]): SplitStealState {
        const trustPoints: { [playerId: string]: number } = {};

        // Handle Odd Number of Players
        let activePlayers = [...players];
        let spectatorId: string | undefined;

        if (activePlayers.length % 2 !== 0) {
            // Remove the last player (Last to join assumed to be at end of array)
            const spectator = activePlayers.pop();
            if (spectator) {
                spectatorId = spectator.id;
                // Give them base points or 0? 3 is standard starting.
                trustPoints[spectator.id] = 3;
            }
        }

        activePlayers.forEach(p => trustPoints[p.id] = 3);

        return {
            type: 'split-steal',
            round: 1,
            trustPoints,
            pairings: this.createPairings(activePlayers.map(p => p.id)),
            decisions: {},
            history: [],
            spectatorId,
            phase: 'DECISION'
        };
    }

    getPlayerView(state: SplitStealState, viewerId: string): SplitStealState {
        if (state.phase !== 'DECISION') return state;
        return { ...state, decisions: maskRecord(state.decisions, viewerId) as SplitStealState['decisions'] };
    }

    handleAction(state: SplitStealState, senderId: string, action: any, ctx: GameContext): SplitStealState | null {
        if (action.type === 'next_round') {
            // Only the game's own reveal timer advances the round, so nobody can cut the reveal short
            if (senderId !== SYSTEM_SENDER || state.phase !== 'REVEAL') return null;
            this.resolveRound(state);
            return state;
        }

        if (action.type !== 'decision') return null;
        if (action.value !== 'split' && action.value !== 'steal') return null;
        if (state.phase !== 'DECISION') return null; // Can't decide during reveal
        if (state.decisions[senderId]) return null; // Already decided

        // Validate sender is in a pair (Spectators can't decide)
        const isPaired = state.pairings.some(pair => pair.includes(senderId));
        if (!isPaired) return null;

        state.decisions[senderId] = action.value;
        this.revealIfAllDecided(state, ctx);
        return state;
    }

    onPlayerLeave(state: SplitStealState, playerId: string, ctx: GameContext): SplitStealState {
        delete state.trustPoints[playerId];
        delete state.decisions[playerId];
        if (state.spectatorId === playerId) state.spectatorId = undefined;

        const pair = state.pairings.find(p => p.includes(playerId));
        if (pair) {
            state.pairings = state.pairings.filter(p => p !== pair);
            const partner = pair[0] === playerId ? pair[1] : pair[0];
            delete state.decisions[partner]; // Their choice was against someone who's gone

            if (state.phase === 'DECISION' && state.spectatorId) {
                // The spectator steps in so the partner still gets to play this round
                state.pairings.push([partner, state.spectatorId]);
                state.spectatorId = undefined;
            } else if (!state.spectatorId) {
                state.spectatorId = partner;
            }
        }

        if (state.pairings.length === 0) {
            state.round = this.MAX_ROUNDS + 1; // Nobody left to pair up: end the game
        } else if (state.phase === 'DECISION') {
            this.revealIfAllDecided(state, ctx);
        }
        return state;
    }

    private revealIfAllDecided(state: SplitStealState, ctx: GameContext) {
        const allDecided = state.pairings.every(([p1, p2]) => state.decisions[p1] && state.decisions[p2]);
        if (allDecided) {
            state.phase = 'REVEAL';
            ctx.schedule(GAME_TIMING.SPLIT_STEAL_REVEAL_DELAY, { type: 'next_round' });
        }
    }

    private resolveRound(state: SplitStealState) {
        // ... (Log resolving) ...
        // Process each pair
        state.pairings.forEach(pair => {
            const p1 = pair[0];
            const p2 = pair[1];
            const d1 = state.decisions[p1];
            const d2 = state.decisions[p2];

            let change1 = 0;
            let change2 = 0;

            if (d1 === 'split' && d2 === 'split') {
                change1 = 1;
                change2 = 1;
            } else if (d1 === 'steal' && d2 === 'split') {
                change1 = 2;
                change2 = -2;
            } else if (d1 === 'split' && d2 === 'steal') {
                change1 = -2;
                change2 = 2;
            } else { // steal/steal
                change1 = -1;
                change2 = -1;
            }

            state.trustPoints[p1] += change1;
            state.trustPoints[p2] += change2;

            state.history.push({
                round: state.round,
                p1, p2, d1, d2, change1, change2
            });
        });

        state.round++;
        state.decisions = {};
        state.phase = 'DECISION'; // Back to decision

        if (state.round <= this.MAX_ROUNDS) {
            // Re-pair everyone still in the game. The spectator only sits out while the count is odd.
            let ids = Object.keys(state.trustPoints);
            if (ids.length % 2 !== 0) {
                if (!state.spectatorId || !ids.includes(state.spectatorId)) state.spectatorId = ids[ids.length - 1];
                ids = ids.filter(id => id !== state.spectatorId);
            } else {
                state.spectatorId = undefined;
            }
            state.pairings = this.createPairings(ids);
        }
    }

    isComplete(state: SplitStealState): boolean {
        return state.round > this.MAX_ROUNDS;
    }

    resolve(state: SplitStealState, players: Player[]): { [playerId: string]: number } {
        const finalScores: { [playerId: string]: number } = {};

        // Find max trust
        let maxTrust = -Infinity;
        Object.values(state.trustPoints).forEach(v => {
            if (v > maxTrust) maxTrust = v;
        });

        players.forEach(p => {
            // Spectator handled? 
            if (state.spectatorId === p.id) {
                finalScores[p.id] = 0; // Spectator neither wins nor loses points
                return;
            }

            const trust = state.trustPoints[p.id];

            if (trust === maxTrust) {
                finalScores[p.id] = 100;
            } else {
                finalScores[p.id] = 0;
            }
        });

        return finalScores;
    }

    private createPairings(playerIds: string[]): Array<[string, string]> {
        // Randomize
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        const pairs: Array<[string, string]> = [];

        while (shuffled.length >= 2) {
            pairs.push([shuffled.pop()!, shuffled.pop()!]);
        }

        // Remainder logic shouldn't happen if we passed valid even list.
        // But if it does (defensive):
        return pairs;
    }
}
