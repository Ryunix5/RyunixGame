import { Room, RoomStatus } from '@ryunix/shared';
import { GameContext, GamePlugin, SYSTEM_SENDER } from './GamePlugin';
import { GameRegistry } from './GameRegistry';
import { handleGameCompletion } from './gameUtils';
import { logger } from '../utils/logger';

interface RunningGame {
    timers: Set<NodeJS.Timeout>;
}

/**
 * Drives game plugins for every room. It is the only place that changes a room's gameState, so
 * player actions, scheduled actions, and players leaving all get the same completion handling and
 * broadcast. It also owns each room's timers so they can't fire into a game that has already ended.
 */
export class GameRunner {
    private running: Map<string, RunningGame> = new Map(); // roomId -> running game

    constructor(
        private registry: GameRegistry,
        private onRoomChanged: (room: Room) => void
    ) {}

    /** Starts a game. Returns an error message for the host, or null on success. */
    start(room: Room, gameId: string, config: any): string | null {
        const game = this.registry.get(gameId);
        if (!game) return 'Unknown game';
        if (room.players.length < game.minPlayers) return `${game.name} needs at least ${game.minPlayers} players`;
        if (room.players.length > game.maxPlayers) return `${game.name} allows at most ${game.maxPlayers} players`;

        this.stop(room.id);
        const run: RunningGame = { timers: new Set() };
        this.running.set(room.id, run);

        room.status = RoomStatus.GAME;
        room.gameState = game.setup(room.players, config, this.contextFor(room, run));
        this.afterChange(room, game);
        logger.info('Game started', { roomId: room.id, gameId });
        return null;
    }

    handleAction(room: Room, senderId: string, action: any) {
        const game = this.currentGame(room);
        const run = this.running.get(room.id);
        if (!game || !run) return;

        const newState = game.handleAction(room.gameState, senderId, action, this.contextFor(room, run));
        if (!newState) return;
        room.gameState = newState;
        this.afterChange(room, game);
    }

    /** Call after a player has been removed from room.players while a game may be running. */
    playerLeft(room: Room, playerId: string) {
        const game = this.currentGame(room);
        const run = this.running.get(room.id);
        if (!game || !run) return;

        if (game.onPlayerLeave) {
            room.gameState = game.onPlayerLeave(room.gameState, playerId, this.contextFor(room, run));
        }
        // Too few players left for the game to make sense: end it with the scores so far
        this.afterChange(room, game, room.players.length < game.minPlayers);
    }

    /** Stops the room's game (if any) and cancels its pending timers. Safe to call repeatedly. */
    stop(roomId: string) {
        const run = this.running.get(roomId);
        if (!run) return;
        run.timers.forEach(clearTimeout);
        this.running.delete(roomId);
    }

    private currentGame(room: Room): GamePlugin | undefined {
        if (room.status !== RoomStatus.GAME || !room.gameState) return undefined;
        return this.registry.get(room.gameState.type);
    }

    private afterChange(room: Room, game: GamePlugin, forceEnd = false) {
        if (room.status !== RoomStatus.GAME) return;
        if (forceEnd || game.isComplete(room.gameState)) {
            const results = game.resolve(room.gameState, room.players);
            room.status = RoomStatus.RESULTS;
            room.gameState = { ...room.gameState, results };

            const { players, winnerId } = handleGameCompletion(results, room.players);
            room.players = players;
            this.stop(room.id);
            logger.info('Game completed', { roomId: room.id, winnerId });
        }
        this.onRoomChanged(room);
    }

    private contextFor(room: Room, run: RunningGame): GameContext {
        return {
            get hostId() { return room.hostId; },
            schedule: (delayMs, action) => {
                const timer = setTimeout(() => {
                    run.timers.delete(timer);
                    // The game this timer belonged to may have ended or been replaced
                    if (this.running.get(room.id) !== run) return;
                    try {
                        this.handleAction(room, SYSTEM_SENDER, action);
                    } catch (err) {
                        logger.error('Scheduled game action failed', { roomId: room.id, action: action?.type, err });
                    }
                }, delayMs);
                run.timers.add(timer);
            }
        };
    }
}
