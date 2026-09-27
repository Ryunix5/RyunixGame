import { Room, RoomStatus, Player } from '@ryunix/shared';
import { randomBytes, randomUUID } from 'crypto';
import { ROOM_CONFIG } from './constants';

/**
 * In-memory source of truth for sessions and rooms.
 *
 * A session maps a secret token (kept by the client) to a stable player id. Players are
 * identified by that id everywhere, so a page refresh or a dropped connection resumes the
 * same player instead of creating a new one.
 */
export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private sessions: Map<string, string> = new Map(); // sessionToken -> playerId
    private sessionByPlayer: Map<string, string> = new Map(); // playerId -> sessionToken
    private graceTimers: Map<string, NodeJS.Timeout> = new Map(); // playerId -> pending removal

    /** Returns the player id for a known token, or issues a new session. */
    resolveSession(sessionToken: unknown): { sessionToken: string; playerId: string } {
        if (typeof sessionToken === 'string') {
            const playerId = this.sessions.get(sessionToken);
            if (playerId) return { sessionToken, playerId };
        }
        const fresh = { sessionToken: randomBytes(24).toString('base64url'), playerId: randomUUID() };
        this.sessions.set(fresh.sessionToken, fresh.playerId);
        this.sessionByPlayer.set(fresh.playerId, fresh.sessionToken);
        return fresh;
    }

    /**
     * Forgets a player's session so the map doesn't grow forever. Only call this once the player has
     * no open connection and no seat in a room; if they come back they simply get a new identity.
     */
    releaseSession(playerId: string) {
        if (this.findRoomByPlayer(playerId)) return;
        const token = this.sessionByPlayer.get(playerId);
        if (token) this.sessions.delete(token);
        this.sessionByPlayer.delete(playerId);
    }

    get sessionCount(): number {
        return this.sessions.size;
    }

    createRoom(hostId: string, hostName: string): Room {
        this.leaveCurrentRoom(hostId);

        let roomId: string;
        do {
            roomId = randomUUID().replace(/-/g, '').slice(0, ROOM_CONFIG.ROOM_CODE_LENGTH).toUpperCase();
        } while (this.rooms.has(roomId));

        const newRoom: Room = {
            id: roomId,
            hostId: hostId,
            players: [this.createPlayer(hostId, hostName, roomId, true)],
            status: RoomStatus.LOBBY,
            maxPlayers: ROOM_CONFIG.MAX_PLAYERS
        };

        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    joinRoom(roomId: string, playerId: string, playerName: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        // Already in this room (e.g. joined from a second tab): treat as a resume
        const existing = room.players.find(p => p.id === playerId);
        if (existing) {
            this.markConnected(playerId);
            return room;
        }

        if (room.status !== RoomStatus.LOBBY && room.status !== RoomStatus.MENU) return null;
        if (room.players.length >= room.maxPlayers) return null;

        this.leaveCurrentRoom(playerId);
        room.players.push(this.createPlayer(playerId, playerName, roomId, false));
        return room;
    }

    /** Removes a player immediately. Returns the room if it still exists afterwards. */
    leaveRoom(roomId: string, playerId: string): Room | null {
        this.cancelGrace(playerId);
        const room = this.rooms.get(roomId);
        if (!room) return null;

        room.players = room.players.filter(p => p.id !== playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return null;
        }

        if (room.hostId === playerId) {
            // Prefer someone who is actually online to take over
            const newHost = room.players.find(p => p.connected) ?? room.players[0];
            room.hostId = newHost.id;
            newHost.isHost = true;
        }
        return room;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    findRoomByPlayer(playerId: string): Room | undefined {
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.id === playerId)) return room;
        }
        return undefined;
    }

    getAvailableRooms(): Room[] {
        return Array.from(this.rooms.values()).filter(r =>
            r.status === RoomStatus.LOBBY || r.status === RoomStatus.MENU
        );
    }

    /** Marks a returning player as online and cancels their pending removal. */
    markConnected(playerId: string): Room | undefined {
        this.cancelGrace(playerId);
        const room = this.findRoomByPlayer(playerId);
        const player = room?.players.find(p => p.id === playerId);
        if (player) player.connected = true;
        return room;
    }

    /**
     * Marks a player offline and schedules their removal after `graceMs`.
     * `onExpire` is called with the updated room (or null if it was deleted) if they don't return.
     */
    markDisconnected(playerId: string, graceMs: number, onExpire: (room: Room | null, roomId: string) => void): Room | undefined {
        const room = this.findRoomByPlayer(playerId);
        const player = room?.players.find(p => p.id === playerId);
        if (!room || !player) return undefined;

        player.connected = false;
        this.cancelGrace(playerId);
        const roomId = room.id;
        this.graceTimers.set(playerId, setTimeout(() => {
            this.graceTimers.delete(playerId);
            onExpire(this.leaveRoom(roomId, playerId), roomId);
        }, graceMs));
        return room;
    }

    private leaveCurrentRoom(playerId: string) {
        const current = this.findRoomByPlayer(playerId);
        if (current) this.leaveRoom(current.id, playerId);
    }

    private cancelGrace(playerId: string) {
        const timer = this.graceTimers.get(playerId);
        if (timer) {
            clearTimeout(timer);
            this.graceTimers.delete(playerId);
        }
    }

    private createPlayer(id: string, name: string, roomId: string, isHost: boolean): Player {
        return { id, name, isHost, isAlive: true, score: 0, roomWins: 0, roomId, connected: true };
    }
}
