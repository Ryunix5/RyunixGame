import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SocketEvents, RoomStatus, Room, SessionInfo } from '@ryunix/shared';
import { SERVER_CONFIG, ROOM_CONFIG } from './constants';
import { logger } from './utils/logger';
import { validatePlayerName, validateRoomCode, validateChatMessage, ValidationError } from './utils/validation';
import { handleGameCompletion } from './game/gameUtils';
import { apiLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration - allow development origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
// Always allow localhost:3000 and localhost:5173 in development
if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
}
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : SERVER_CONFIG.PORT;

import { RoomManager } from './RoomManager';
import { GameRegistry } from './game/GameRegistry';
import { ContentManager } from './services/ContentManager';
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
const contentManager = new ContentManager();

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use(express.json());

// Serve static frontend files
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
    logger.info('Serving static files from:', { path: clientDist });
    app.use(express.static(clientDist));

    // Handle SPA routing (return index.html for non-API requests)
    // using a regex to avoid path-to-regexp "Missing parameter name" error with "*"
    app.get(/^(?!\/api|\/socket.io).+/, (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
} else {
    logger.warn('Client build not found', { path: clientDist });
}

app.get('/api/content/:gameType', (req, res) => {
    try {
        const content = contentManager.getContent(req.params.gameType);
        res.json(content);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/content', (req, res) => {
    try {
        const { gameType, packName, data } = req.body;
        contentManager.saveContent(gameType, packName, data);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

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

// Removes a player from whatever room they are in right now and tells everyone left behind.
function removeFromCurrentRoom(playerId: string) {
    const current = roomManager.findRoomByPlayer(playerId);
    if (!current) return;
    io.in(playerId).socketsLeave(current.id);
    const updated = roomManager.leaveRoom(current.id, playerId);
    if (updated) broadcastRoom(updated);
    logger.info('Player left room', { playerId, roomId: current.id });
}

io.on('connection', (socket) => {
    // Resume the client's identity if it sent a token we know, otherwise start a new one
    const session = roomManager.resolveSession(socket.handshake.auth?.sessionToken);
    const playerId = session.playerId;
    socket.join(playerId);
    socket.emit(SocketEvents.SESSION, session satisfies SessionInfo);
    logger.info('Client connected', { socketId: socket.id, playerId });

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

    socket.on(SocketEvents.CREATE_ROOM, (data: { hostName: string }) => {
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

    socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string, playerName: string }) => {
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

    socket.on(SocketEvents.LEAVE_ROOM, () => {
        removeFromCurrentRoom(playerId);
    });

    socket.on(SocketEvents.KICK_PLAYER, (data: { roomId: string, targetId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room || room.hostId !== playerId || data.targetId === playerId) return;
        if (!room.players.some(p => p.id === data.targetId)) return;

        io.to(data.targetId).emit(SocketEvents.KICKED);
        removeFromCurrentRoom(data.targetId);
        logger.info('Player kicked', { roomId: room.id, targetId: data.targetId });
    });

    // Get available content packages
    socket.on('getAvailablePackages', (callback) => {
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
            console.error('[getAvailablePackages] Error:', error);
            callback([]);
        }
    });

    socket.on(SocketEvents.SELECT_GAME, (data: { roomId: string, gameId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room) return;
        if (room.hostId !== playerId) return; // Only host can select

        room.selectedGameId = data.gameId;
        broadcastRoom(room);
    });

    socket.on(SocketEvents.START_GAME, (data: { roomId: string, gameId: string, packageId?: string }) => {
        console.log(`[Server] Received START_GAME. Room: ${data.roomId}, Game: ${data.gameId}, Package: ${data.packageId}`);
        const room = getMyRoom(data.roomId);
        if (!room) {
            console.log('[Server] Room not found');
            return;
        }
        if (room.hostId !== playerId) {
            console.log(`[Server] Unauthorized start attempt. Host: ${room.hostId}, Player: ${playerId}`);
            return;
        }

        const game = gameRegistry.get(data.gameId);
        if (!game) {
            console.log(`[Server] Game not found in registry: ${data.gameId}`);
            // List available games for debug
            // console.log('Available games:', gameRegistry.getAllIds()); // valid if method exists
            return;
        }



        console.log('[Server] Initializing game...');

        // Fetch content config
        let gameConfig = {};
        try {
            // Only try to load content if the manager is ready
            if (contentManager) {
                console.log(`[Server] Fetching content for ${data.gameId}...`);
                const packs = contentManager.getContent(data.gameId);
                if (packs && packs.length > 0) {
                    gameConfig = packs[0].data;
                    console.log(`[Server] Loaded content pack: ${packs[0].packName} for ${data.gameId}`);
                } else {
                    console.log(`[Server] No content packs found for ${data.gameId}, using defaults.`);
                }
            }
        } catch (err) {
            console.error('[Server] Failed to load content (non-fatal):', err);
        }

        try {
            // Initialize game
            room.status = RoomStatus.GAME;
            // Callback for games to trigger updates (e.g. timers)
            const emitState = (newState: any) => {
                if (room.status === RoomStatus.GAME) {
                    room.gameState = newState;
                    broadcastRoom(room);
                }
            };

            const config = data.packageId ? { packageId: data.packageId } : {};
            console.log(`[Server] Setting up game with config:`, config);
            room.gameState = game.setup(room.players, config, emitState);
            broadcastRoom(room);
            console.log(`[Server] Game ${data.gameId} started successfully for Room ${room.id}.`);
        } catch (err) {
            console.error(`[Server] CRITICAL: Failed to setup game ${data.gameId}:`, err);
            socket.emit(SocketEvents.ERROR, { message: 'Failed to start game due to server error.' });
        }
    });

    socket.on(SocketEvents.GAME_ACTION, (data: { roomId: string, action: any }) => {
        console.log(`[Server] Received GAME_ACTION for room ${data.roomId}`, data.action);
        const room = getMyRoom(data.roomId);
        if (!room) {
            console.log('[Server] Room not found');
            return;
        }
        if (!room.gameState) {
            console.log('[Server] Room has no gameState');
            return;
        }

        console.log(`[Server] Game Type: ${room.gameState.type}`);
        const game = gameRegistry.get(room.gameState.type);
        if (!game) {
            console.log(`[Server] Game instance not found for type: ${room.gameState.type}`);
            return;
        }

        const emitState = (newState: any) => {
            if (room.status === RoomStatus.GAME) {
                room.gameState = newState;
                broadcastRoom(room);
            }
        };

        const newState = game.handleAction(room.gameState, playerId, data.action, emitState);
        if (newState) {
            room.gameState = newState;
            broadcastRoom(room);

            // AUTO-ADVANCE: If Split/Steal enters REVEAL phase
            if (newState.type === 'split-steal' && (newState as any).phase === 'REVEAL') {
                console.log(`[Server] Split/Steal entered REVEAL phase. Scheduling next round in 4s...`);
                setTimeout(() => {
                    const roomRef = roomManager.getRoom(data.roomId);
                    if (!roomRef || !roomRef.gameState) return;

                    // Verify we are still in REVEAL (avoid race conditions if multiple triggers)
                    if ((roomRef.gameState as any).phase !== 'REVEAL') return;

                    console.log(`[Server] Auto-advancing round for ${data.roomId}`);
                    const nextState = game.handleAction(roomRef.gameState, 'system', { type: 'next_round' });

                    if (nextState) {
                        roomRef.gameState = nextState;
                        broadcastRoom(roomRef);

                        // Check completion again after auto-advance
                        if (game.isComplete(nextState)) {
                            const results = game.resolve(nextState, roomRef.players);
                            roomRef.status = RoomStatus.RESULTS;
                            roomRef.gameState = { ...roomRef.gameState, results };

                            // Handle game completion and winner calculation
                            const { players: updatedPlayers, winnerId } = handleGameCompletion(results, roomRef.players);
                            roomRef.players = updatedPlayers;

                            broadcastRoom(roomRef);
                        }
                    }
                }, 4000); // 4 Seconds Delay
            }

            if (game.isComplete(newState)) {
                const results = game.resolve(newState, room.players);
                room.status = RoomStatus.RESULTS;
                room.gameState = { ...room.gameState, results };

                // Handle game completion and winner calculation
                const { players: updatedPlayers, winnerId } = handleGameCompletion(results, room.players);
                room.players = updatedPlayers;

                logger.info('Game completed', { roomId: room.id, winnerId });

                broadcastRoom(room);
            }
        }
    });

    socket.on(SocketEvents.LIST_ROOMS, () => {
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

    socket.on(SocketEvents.RESET_LOBBY, (data: { roomId: string }) => {
        const room = getMyRoom(data.roomId);
        if (!room || room.hostId !== playerId) return; // Only host can reset

        room.status = RoomStatus.LOBBY;
        room.gameState = undefined;
        broadcastRoom(room);
    });

    socket.on(SocketEvents.SEND_CHAT, (data: { roomId: string, message: string }) => {
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

    socket.on('voice_signal', (data: { to: string, signal: any }) => {
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
        if (io.sockets.adapter.rooms.get(playerId)?.size) return;

        const room = roomManager.markDisconnected(playerId, ROOM_CONFIG.RECONNECT_GRACE_MS, (updated, roomId) => {
            if (updated) broadcastRoom(updated);
            logger.info('Player removed after reconnect grace period', { playerId, roomId });
        });
        if (room) broadcastRoom(room);
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
