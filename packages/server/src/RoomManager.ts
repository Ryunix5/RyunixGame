import { Room, RoomStatus, Player, SocketEvents } from '@ryunix/shared';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    createRoom(hostId: string, hostName: string, hostSocketId: string): Room {
        const roomId = uuidv4().slice(0, 6).toUpperCase(); // Short ID for easier joining
        const host: Player = {
            id: hostId,
            name: hostName,
            isHost: true,
            isAlive: true,
            score: 0,
            roomWins: 0,
            roomId: roomId,
            socketId: hostSocketId
        };

        const newRoom: Room = {
            id: roomId,
            hostId: hostId,
            players: [host],
            status: RoomStatus.LOBBY,
            maxPlayers: 8
        };

        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    joinRoom(roomId: string, playerId: string, playerName: string, socketId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (room.status !== RoomStatus.LOBBY && room.status !== RoomStatus.MENU) {
            // Allow re-connect? For now, strict join.
            return null;
        }

        if (room.players.length >= room.maxPlayers) {
            return null;
        }

        const newPlayer: Player = {
            id: playerId,
            name: playerName,
            isHost: false,
            isAlive: true,
            score: 0,
            roomWins: 0,
            roomId: roomId,
            socketId: socketId
        };

        room.players.push(newPlayer);
        return room;
    }

    leaveRoom(roomId: string, playerId: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.players = room.players.filter(p => p.id !== playerId);

        // If empty, delete room
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
        } else {
            // If host left, assign new host? or close room?
            // For simplicity, if host leaves, room closes or simplest logic.
            // Let's keep it simple: if host leaves, assign to next.
            if (room.hostId === playerId) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
            }
        }
        return true;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    getAvailableRooms(): Room[] {
        return Array.from(this.rooms.values()).filter(r =>
            r.status === RoomStatus.LOBBY || r.status === RoomStatus.MENU
        );
    }

    onDisconnect(socketId: string): Room | null {
        // Find room where this socket is a player
        for (const room of this.rooms.values()) {
            const playerIndex = room.players.findIndex(p => p.socketId === socketId);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                this.leaveRoom(room.id, player.id);
                return this.rooms.get(room.id) || null; // Return updated room or null if deleted
            }
        }
        return null;
    }
}
