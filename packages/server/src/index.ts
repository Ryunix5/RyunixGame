import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SocketEvents, RoomStatus, Room, SessionInfo } from '@ryunix/shared';
import { SERVER_CONFIG, ROOM_CONFIG, SOCKET_RATE_LIMITS, SocketRateCategory, MAX_SOCKET_PAYLOAD_BYTES } from './constants';
import { RateLimiter } from './utils/rateLimit';
import { logger } from './utils/logger';
import { validatePlayerName, validateRoomCode, validateChatMessage, ValidationError } from './utils/validation';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// The client is normally served from this same server (and proxied by Vite in dev), so no CORS is
// needed. Set CORS_ORIGIN (comma-separated) only if the client is hosted on a different origin.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) ?? [];
const io = new Server(httpServer, {
    maxHttpBufferSize: MAX_SOCKET_PAYLOAD_BYTES,
    ...(allowedOrigins.length > 0 ? { cors: { origin: allowedOrigins, methods: ['GET', 'POST'] } } : {})
});

// Which rate-limit bucket each client event draws from
const EVENT_RATE_CATEGORY: Record<string, SocketRateCategory> = {
    [SocketEvents.CREATE_ROOM]: 'lobby',
    [SocketEvents.JOIN_ROOM]: 'lobby',
    [SocketEvents.LEAVE_ROOM]: 'lobby',
    [SocketEvents.KICK_PLAYER]: 'lobby',
    [SocketEvents.SELECT_GAME]: 'lobby',
    [SocketEvents.START_GAME]: 'lobby',
    [SocketEvents.RESET_LOBBY]: 'lobby',
    [SocketEvents.LIST_ROOMS]: 'lobby',
    getAvailablePackages: 'lobby',
    [SocketEvents.GAME_ACTION]: 'game',
    [SocketEvents.SEND_CHAT]: 'chat',
    voice_signal: 'voice',
};

const PORT = process.env.PORT ? parseInt(process.env.PORT) : SERVER_CONFIG.PORT;

import { RoomManager } from './RoomManager';
import { GameRegistry } from './game/GameRegistry';
import { GameRunner } from './game/GameRunner';
import { packageLoader } from './services/PackageLoader';

// Game Implementations
import { SplitStealGame } from './game/impl/SplitStealGame';
import { TheLastWordGame } from './game/impl/TheLastWordGame';
import { BlindShapesGame } from './game/impl/BlindShapesGame';
import { PrisonersLetterGame } from './game/impl/PrisonersLetterGame';
import { UnknownToOneGame } from './game/impl/UnknownToOneGame';
import { MindReaderGame } from './game/impl/MindReaderGame';
import { MatchingMindsGame } from './game/impl/MatchingMindsGame';

const roomManager = new RoomManager();
const gameRegistry = new GameRegistry();
const gameRunner = new GameRunner(gameRegistry, room => broadcastRoom(room));

// Serve static frontend files
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
    logger.info('Serving static files from:', { path: clientDist });
    app.use(express.static(clientDist));

    // Handle SPA routing (return index.html for everything except socket.io)
    // using a regex to avoid path-to-regexp "Missing parameter name" error with "*"
    app.get(/^(?!\/socket.io).+/, (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
} else {
    logger.warn('Client build not found', { path: clientDist });
}

// Register Games
gameRegistry.register(new SplitStealGame());
gameRegistry.register(new TheLastWordGame());
gameRegistry.register(new BlindShapesGame());
gameRegistry.register(new PrisonersLetterGame());
gameRegistry.register(new UnknownToOneGame());
gameRegistry.register(new MindReaderGame());
gameRegistry.register(new MatchingMindsGame());

// Builds the copy of a room that a single player is allowed to see. While a game is running,
// games with hidden information (secret words, pending choices, roles) redact other players' data.
function roomViewFor(room: Room, viewerId: string): Room {
    if (room.status !== RoomStatus.GAME || !room.gameState) return room;
    const game = gameRegistry.get(room.gameState.type);
    if (!game?.getPlayerView) return room;
    return { ...room, gameState: game.getPlayerView(room.gameState, viewerId, { hostId: room.hostId }) };
}

// Sends each player in the room their own view. Never emit a raw room to the whole socket.io room.
// Every socket joins a socket.io room named after its player id, so this reaches all of a player's tabs.
function broadcastRoom(room: Room) {
    for (const player of room.players) {
        io.to(player.id).emit(SocketEvents.ROOM_UPDATED, roomViewFor(room, player.id));
    }
}

function isOnline(playerId: string): boolean {
    return (io.sockets.adapter.rooms.get(playerId)?.size ?? 0) > 0;
}

// Removes a player from whatever room they are in right now and tells everyone left behind.
function removeFromCurrentRoom(playerId: string) {
    const current = roomManager.findRoomByPlayer(playerId);
    if (!current) return;
    io.in(playerId).socketsLeave(current.id);
    const updated = roomManager.leaveRoom(current.id, playerId);
    afterPlayerRemoved(updated, current.id, playerId);
    logger.info('Player left room', { playerId, roomId: current.id });
}

// Lets a running game drop the player (so it doesn't wait on them), then tells everyone.
function afterPlayerRemoved(room: Room | null, roomId: string, playerId: string) {
    if (!room) {
        gameRunner.stop(roomId);
        return;
    }
    if (room.status === RoomStatus.GAME) {
        gameRunner.playerLeft(room, playerId); // broadcasts
    } else {
        broadcastRoom(room);
    }
}

io.on('connection', (socket) => {
    // Resume the client's identity if it sent a token we know, otherwise start a new one
    const session = roomManager.resolveSession(socket.handshake.auth?.sessionToken);
    const playerId = session.playerId;
    socket.join(playerId);
    socket.emit(SocketEvents.SESSION, session satisfies SessionInfo);
    logger.info('Client connected', { socketId: socket.id, playerId });

    const limiter = new RateLimiter(SOCKET_RATE_LIMITS);
    let lastSlowDownNotice = 0;
    // Drops events beyond this socket's rate limit. Chat gets a visible notice (at most every few
    // seconds); everything else is dropped silently since normal play never gets near the limits.
    const withinRateLimit = (event: string): boolean => {
        const category = EVENT_RATE_CATEGORY[event] ?? 'lobby';
        if (limiter.allow(category)) return true;
        const now = Date.now();
        if (category === 'chat' && now - lastSlowDownNotice > 3000) {
            lastSlowDownNotice = now;
            socket.emit(SocketEvents.ERROR, { message: "You're sending messages too fast" });
        }
        return false;
    };

    // Registers a handler that can't take the server down: rate limited, non-object payloads become
    // {} and exceptions are logged instead of crashing the process (one bad message used to kill it).
    const on = (event: string, handler: (data: any) => void) => {
        socket.on(event, (data: unknown) => {
            if (!withinRateLimit(event)) return;
            try {
                handler(data && typeof data === 'object' ? data : {});
            } catch (err) {
                logger.error('Socket handler failed', { event, playerId, err });
            }
        });
    };

    // Only lets a player act on the room they are actually in
    const getMyRoom = (roomId: string): Room | undefined => {
        const room = roomManager.getRoom(roomId);
        return room?.players.some(p => p.id === playerId) ? room : undefined;
    };

    // Returning player: put them straight back into their room
    const existingRoom = roomManager.markConnected(playerId);
    if (existingRoom) {
        socket.join(existingRoom.id);
        socket.emit(SocketEvents.RECONNECTED, roomViewFor(existingRoom, playerId));
        broadcastRoom(existingRoom);
        logger.info('Player reconnected', { playerId, roomId: existingRoom.id });
    }

    // DEBUG: Trace all events
    socket.onAny((eventName, ...args) => {
        logger.debug('Event received', { event: eventName, socketId: socket.id });
    });

    on(SocketEvents.CREATE_ROOM, (data: { hostName: string }) => {
        try {
            const validName = validatePlayerName(data.hostName);
            removeFromCurrentRoom(playerId);
            const room = roomManager.createRoom(playerId, validName);
            io.in(playerId).socketsJoin(room.id);
            broadcastRoom(room);

            logger.info('Room created', { roomId: room.id, hostName: validName });
        } catch (error) {
            if (error instanceof ValidationError) {
                socket.emit(SocketEvents.ERROR, { message: error.message });
            } else {
                logger.error('Failed to create room', error);
                socket.emit(SocketEvents.ERROR, { message: 'Failed to create room' });
            }
        }
    });

    on(SocketEvents.JOIN_ROOM, (data: { roomId: string, playerName: string }) => {
        try {
            const validName = validatePlayerName(data.playerName);
            const validRoomId = validateRoomCode(data.roomId);

            const current = roomManager.findRoomByPlayer(playerId);
            if (current && current.id !== validRoomId) removeFromCurrentRoom(playerId);

            const room = roomManager.joinRoom(validRoomId, playerId, validName);
            if (room) {
                io.in(playerId).socketsJoin(room.id);
                broadcastRoom(room);

                logger.info('Player joined room', { roomId: room.id, playerName: validName });
            } else {
                socket.emit(SocketEvents.ERROR, { message: 'Room not found or is full' });
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                socket.emit(SocketEvents.ERROR, { message: error.message });
            } else {
                logger.error('Failed to join room', error);
                socket.emit(SocketEvents.ERROR, { message: 'Failed to join room' });
            }
        }
    });

    on(SocketEvents.LEAVE_ROOM, () => {
        removeFromCurrentRoom(playerId);
    });

    on(SocketEvents.KICK_PLAYER, (data: { roomId: string, targetId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room || room.hostId !== playerId || data.targetId === playerId) return;
        if (!room.players.some(p => p.id === data.targetId)) return;

        io.to(data.targetId).emit(SocketEvents.KICKED);
        removeFromCurrentRoom(data.targetId);
        logger.info('Player kicked', { roomId: room.id, targetId: data.targetId });
    });

    // Get available content packages
    socket.on('getAvailablePackages', (callback: unknown) => {
        if (typeof callback !== 'function' || !withinRateLimit('getAvailablePackages')) return;
        try {
            const packages = packageLoader.loadPackages();
            const summary = packages.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                difficulty: p.difficulty || 'medium',
                topicCount: p.topics?.length || 0
            }));
            callback(summary);
        } catch (error) {
            logger.error('Failed to load packages', error);
            callback([]);
        }
    });

    on(SocketEvents.SELECT_GAME, (data: { roomId: string, gameId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room) return;
        if (room.hostId !== playerId) return; // Only host can select

        room.selectedGameId = data.gameId;
        broadcastRoom(room);
    });

    on(SocketEvents.START_GAME, (data: { roomId: string, gameId: string, packageId?: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room || room.hostId !== playerId) return;

        try {
            const config = data.packageId ? { packageId: data.packageId } : {};
            const error = gameRunner.start(room, data.gameId, config);
            if (error) socket.emit(SocketEvents.ERROR, { message: error });
        } catch (err) {
            logger.error('Failed to start game', { roomId: room.id, gameId: data.gameId, err });
            room.status = RoomStatus.LOBBY;
            room.gameState = undefined;
            gameRunner.stop(room.id);
            broadcastRoom(room);
            socket.emit(SocketEvents.ERROR, { message: 'Failed to start game due to server error.' });
        }
    });

    on(SocketEvents.GAME_ACTION, (data: { roomId: string, action: any }) => {
        const room = getMyRoom(data.roomId);
        if (!room || !data.action || typeof data.action !== 'object') return;
        try {
            gameRunner.handleAction(room, playerId, data.action);
        } catch (err) {
            logger.error('Game action failed', { roomId: room.id, action: data.action?.type, err });
        }
    });

    on(SocketEvents.LIST_ROOMS, () => {
        const rooms = roomManager.getAvailableRooms();
        const summaries = rooms.map(r => ({
            id: r.id,
            hostName: r.players.find(p => p.id === r.hostId)?.name || 'Unknown',
            playerCount: r.players.length,
            maxPlayers: r.maxPlayers,
            status: r.status
        }));
        socket.emit(SocketEvents.ROOM_LIST, summaries);
    });

    on(SocketEvents.RESET_LOBBY, (data: { roomId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room || room.hostId !== playerId) return; // Only host can reset

        gameRunner.stop(room.id);
        room.status = RoomStatus.LOBBY;
        room.gameState = undefined;
        broadcastRoom(room);
    });

    on(SocketEvents.SEND_CHAT, (data: { roomId: string, message: string }) => {
        try {
            const room = getMyRoom(data.roomId);
            if (!room) return;

            const player = room.players.find(p => p.id === playerId);
            if (!player) return;

            // Validate and sanitize message
            const validMessage = validateChatMessage(data.message);

            const chatMessage = {
                id: Date.now().toString(),
                senderId: player.id,
                senderName: player.name,
                content: validMessage,
                timestamp: Date.now()
            };

            io.to(room.id).emit(SocketEvents.CHAT_MESSAGE, chatMessage);
        } catch (error) {
            if (error instanceof ValidationError) {
                socket.emit(SocketEvents.ERROR, { message: error.message });
            }
        }
    });

    on('voice_signal', (data: { to: string, signal: any }) => {
        // Only relay signalling between players in the same room
        const room = roomManager.findRoomByPlayer(playerId);
        if (!room || !room.players.some(p => p.id === data.to)) return;
        io.to(data.to).emit('voice_signal', {
            from: playerId,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id, playerId });

        // Another tab for the same player is still connected
        if (isOnline(playerId)) return;

        const room = roomManager.markDisconnected(playerId, ROOM_CONFIG.RECONNECT_GRACE_MS, (updated, roomId) => {
            try {
                afterPlayerRemoved(updated, roomId, playerId);
            } catch (err) {
                logger.error('Failed to remove player after grace period', { playerId, roomId, err });
            }
            if (!isOnline(playerId)) roomManager.releaseSession(playerId);
            logger.info('Player removed after reconnect grace period', { playerId, roomId });
        });
        if (room) broadcastRoom(room);
        else roomManager.releaseSession(playerId); // Not in a room: nothing to come back to
    });
});

httpServer.listen(PORT, () => {
    logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server gracefully');
    httpServer.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, closing server gracefully');
    httpServer.close(() => {
        process.exit(0);
    });
});
