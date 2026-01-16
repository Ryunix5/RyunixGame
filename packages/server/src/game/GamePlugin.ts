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

    setup(players: Player[], config?: any): GameState;

    // Returns updated state, or null if invalid action
    handleAction(state: GameState, senderId: string, action: any): GameState | null;

    // Check if game is complete
    isComplete(state: GameState): boolean;

    // Calculate points/results
    resolve(state: GameState, players: Player[]): { [playerId: string]: number };
}
