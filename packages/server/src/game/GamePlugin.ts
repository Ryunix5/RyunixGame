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

    setup(players: Player[], config: any, ctx: GameContext): GameState;

    // Returns updated state, or null if invalid action.
    // Actions scheduled via ctx.schedule arrive here too, with senderId === SYSTEM_SENDER.
    handleAction(state: GameState, senderId: string, action: any, ctx: GameContext): GameState | null;

    // Called when a player leaves mid-game for good (left, kicked, or reconnect grace expired).
    // Remove them from the state so the game doesn't wait on them forever.
    onPlayerLeave?(state: GameState, playerId: string, ctx: GameContext): GameState;

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

// Sender id used for actions the game scheduled for itself (timers, auto-advance).
// Players can never have this id, so games can use it to reject actions only the game may trigger.
export const SYSTEM_SENDER = 'system';

// Per-room services a game gets from the engine. Game plugins are shared singletons, so they
// must never keep per-room data on `this`; anything per-room goes in state or through here.
export interface GameContext {
    hostId: string;
    // Dispatch `action` back into handleAction after `delayMs`. Pending actions are dropped
    // automatically if the game ends, the lobby is reset, or the room closes.
    schedule(delayMs: number, action: any): void;
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
