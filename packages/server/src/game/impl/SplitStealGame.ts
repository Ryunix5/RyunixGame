import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

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

    setup(players: Player[], config?: any): SplitStealState {
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

    handleAction(state: SplitStealState, senderId: string, action: any, dispatch?: (s: any) => void): SplitStealState | null {
        if (action.type === 'next_round') {
            // Only allow if in REVEAL phase
            if (state.phase !== 'REVEAL') return null;
            // Should verify host? The generic handleAction doesn't explicitly pass host info easily without looking up room, 
            // but for now we assume client UI restricts it or we iterate. 
            // Ideally we'd check if senderId is host. 
            // Use resolveRound to move to next.
            this.resolveRound(state);
            return state;
        }

        if (action.type !== 'decision') return null;
        if (state.phase !== 'DECISION') return null; // Can't decide during reveal
        if (state.decisions[senderId]) return null; // Already decided

        // Validate sender is in a pair (Spectators can't decide)
        const isPaired = state.pairings.some(pair => pair.includes(senderId));
        if (!isPaired) return null;

        state.decisions[senderId] = action.value; // 'split' or 'steal'

        // Check if all active participants have decided
        const activeParticipantIds = new Set<string>();
        state.pairings.forEach(pair => {
            activeParticipantIds.add(pair[0]);
            activeParticipantIds.add(pair[1]);
        });

        let allDecided = true;
        for (const pid of activeParticipantIds) {
            if (!state.decisions[pid]) {
                allDecided = false;
                break;
            }
        }

        if (allDecided) {
            // Instead of auto-resolving, go to REVEAL phase
            state.phase = 'REVEAL';
        }

        return state;
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
            // Re-pair ONLY the active players
            const currentActiveIds = new Set<string>();
            state.pairings.forEach(p => { currentActiveIds.add(p[0]); currentActiveIds.add(p[1]); });

            state.pairings = this.createPairings(Array.from(currentActiveIds));
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
                finalScores[p.id] = -50;
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
