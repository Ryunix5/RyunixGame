import { Player } from '@ryunix/shared';

export interface GameState {
    type: string;
    // Dynamic state properties
    [key: string]: any;
}

export interface GamePlugin {
    id: string;
    name: string;
    minPlayers: number;
    maxPlayers: number;

    setup(players: Player[], config?: any, emitState?: (state: GameState) => void): GameState;

    // Returns updated state, or null if invalid action
    handleAction(state: GameState, senderId: string, action: any, dispatch?: (state: GameState) => void): GameState | null;

    // Check if game is complete
    isComplete(state: GameState): boolean;

    // Calculate points/results
    resolve(state: GameState, players: Player[]): { [playerId: string]: number };

    // Returns the slice of state a given player is allowed to see. Must not mutate `state`.
    // Games without hidden information can omit this and the full state is sent.
    getPlayerView?(state: GameState, viewerId: string, ctx: PlayerViewContext): GameState;
}

export interface PlayerViewContext {
    hostId: string;
}

// Placeholder for values a player knows exist but may not see (e.g. "opponent has decided").
export const HIDDEN = 'hidden';

// Keeps the keys of a record but replaces every value not owned by `viewerId` with HIDDEN.
export function maskRecord<T>(record: { [id: string]: T } | undefined, viewerId: string): { [id: string]: T | typeof HIDDEN } {
    const masked: { [id: string]: T | typeof HIDDEN } = {};
    for (const [id, value] of Object.entries(record || {})) {
        masked[id] = id === viewerId ? value : HIDDEN;
    }
    return masked;
}
