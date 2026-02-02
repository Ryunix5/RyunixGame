import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { SocketEvents, RoomStatus } from '@ryunix/shared';
import { SERVER_CONFIG } from './constants';
import { logger } from './utils/logger';
import { validatePlayerName, validateRoomCode, validateChatMessage, ValidationError } from './utils/validation';
import { handleGameCompletion } from './game/gameUtils';
import { databaseService } from './services/DatabaseService';
import { apiLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration - use environment variable in production
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
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

// Cleanup expired sessions on startup and periodically
databaseService.cleanupExpiredSessions();
setInterval(() => {
    const cleaned = databaseService.cleanupExpiredSessions();
    if (cleaned > 0) {
        logger.info('Cleaned up expired sessions', { count: cleaned });
    }
}, 60 * 60 * 1000); // Every hour

io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // DEBUG: Trace all events
    socket.onAny((eventName, ...args) => {
        logger.debug('Event received', { event: eventName, socketId: socket.id });
    });

    socket.on(SocketEvents.CREATE_ROOM, (data: { hostName: string }) => {
        try {
            const validName = validatePlayerName(data.hostName);
            const room = roomManager.createRoom(socket.id, validName, socket.id);
            socket.join(room.id);
            socket.emit(SocketEvents.ROOM_UPDATED, room);

            // Persist room to database
            databaseService.saveRoom(room);

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

    // Handle reconnection
    socket.on(SocketEvents.RECONNECT, (data: { sessionToken: string, roomId?: string, playerId?: string }) => {
        try {
            logger.info('Reconnection attempt', { sessionToken: data.sessionToken, roomId: data.roomId, playerId: data.playerId });

            // Validate session token
            const session = databaseService.getSession(data.sessionToken);
            if (!session) {
                logger.warn('Invalid session token', { sessionToken: data.sessionToken });
                socket.emit(SocketEvents.ERROR, { message: 'Invalid or expired session' });
                return;
            }

            // Find room by player ID if not provided
            let roomId = data.roomId;
            if (!roomId && session.player_id) {
                roomId = databaseService.getRoomByPlayerId(session.player_id) || undefined;
            }

            if (!roomId) {
                logger.info('No active room found for session', { sessionToken: data.sessionToken });
                socket.emit(SocketEvents.ERROR, { message: 'No active room found' });
                return;
            }

            // Load room from database
            const room = databaseService.getRoom(roomId);
            if (!room) {
                logger.warn('Room not found', { roomId });
                socket.emit(SocketEvents.ERROR, { message: 'Room no longer exists' });
                return;
            }

            // Find player in room
            const existingPlayer = room.players.find(p => p.id === session.player_id);
            if (!existingPlayer) {
                logger.warn('Player not in room', { playerId: session.player_id, roomId });
                socket.emit(SocketEvents.ERROR, { message: 'Player not found in room' });
                return;
            }

            // Update player's socket ID
            existingPlayer.socketId = socket.id;
            databaseService.updatePlayerSocket(roomId, session.player_id, socket.id);
            databaseService.updateSession(data.sessionToken, socket.id, roomId);

            // Rejoin socket room
            socket.join(roomId);

            // Notify player of successful reconnection
            socket.emit(SocketEvents.RECONNECTED, room);

            // Notify other players in room
            io.to(roomId).emit(SocketEvents.ROOM_UPDATED, room);

            logger.info('Player reconnected successfully', { playerId: session.player_id, roomId, playerName: session.player_name });
        } catch (error) {
            logger.error('Reconnection failed', error);
            socket.emit(SocketEvents.ERROR, { message: 'Reconnection failed' });
        }
    });

    socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string, playerName: string }) => {
        try {
            const validName = validatePlayerName(data.playerName);
            const validRoomId = validateRoomCode(data.roomId);

            const room = roomManager.joinRoom(validRoomId, socket.id, validName, socket.id);
            if (room) {
                socket.join(room.id);
                io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);

                // Persist updated room to database
                databaseService.saveRoom(room);

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
        const updatedRoom = roomManager.onDisconnect(socket.id);
        if (updatedRoom) {
            io.to(updatedRoom.id).emit(SocketEvents.ROOM_UPDATED, updatedRoom);

            // Update database
            if (updatedRoom.players.length > 0) {
                databaseService.saveRoom(updatedRoom);
            } else {
                // Room is empty, delete it
                databaseService.deleteRoom(updatedRoom.id);
            }

            logger.info('Player left room', { socketId: socket.id, roomId: updatedRoom.id });
            socket.leave(updatedRoom.id);
        }
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
        const room = roomManager.getRoom(data.roomId);
        if (!room) return;
        if (room.hostId !== socket.id) return; // Only host can select

        room.selectedGameId = data.gameId;
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
    });

    socket.on(SocketEvents.START_GAME, (data: { roomId: string, gameId: string, packageId?: string }) => {
        console.log(`[Server] Received START_GAME. Room: ${data.roomId}, Game: ${data.gameId}, Package: ${data.packageId}`);
        const room = roomManager.getRoom(data.roomId);
        if (!room) {
            console.log('[Server] Room not found');
            return;
        }
        if (room.hostId !== socket.id) {
            console.log(`[Server] Unauthorized start attempt. Host: ${room.hostId}, Socket: ${socket.id}`);
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
                    io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
                }
            };

            const config = data.packageId ? { packageId: data.packageId } : {};
            console.log(`[Server] Setting up game with config:`, config);
            room.gameState = game.setup(room.players, config, emitState);
            io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
            console.log(`[Server] Game ${data.gameId} started successfully for Room ${room.id}.`);
        } catch (err) {
            console.error(`[Server] CRITICAL: Failed to setup game ${data.gameId}:`, err);
            socket.emit(SocketEvents.ERROR, { message: 'Failed to start game due to server error.' });
        }
    });

    socket.on(SocketEvents.GAME_ACTION, (data: { roomId: string, action: any }) => {
        console.log(`[Server] Received GAME_ACTION for room ${data.roomId}`, data.action);
        const room = roomManager.getRoom(data.roomId);
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
                io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
            }
        };

        const newState = game.handleAction(room.gameState, socket.id, data.action, emitState);
        if (newState) {
            room.gameState = newState;
            io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);

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
                        io.to(roomRef.id).emit(SocketEvents.ROOM_UPDATED, roomRef);

                        // Check completion again after auto-advance
                        if (game.isComplete(nextState)) {
                            const results = game.resolve(nextState, roomRef.players);
                            roomRef.status = RoomStatus.RESULTS;
                            roomRef.gameState = { ...roomRef.gameState, results };

                            // Handle game completion and winner calculation
                            const { players: updatedPlayers, winnerId } = handleGameCompletion(results, roomRef.players);
                            roomRef.players = updatedPlayers;

                            io.to(roomRef.id).emit(SocketEvents.ROOM_UPDATED, roomRef);
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

                io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
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
        const room = roomManager.getRoom(data.roomId);
        if (!room || room.hostId !== socket.id) return; // Only host can reset

        room.status = RoomStatus.LOBBY;
        room.gameState = undefined;
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
    });

    socket.on(SocketEvents.SEND_CHAT, (data: { roomId: string, message: string }) => {
        try {
            const room = roomManager.getRoom(data.roomId);
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
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
        io.to(data.to).emit('voice_signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id });

        // Clear session socket
        databaseService.clearSessionSocket(socket.id);

        const updatedRoom = roomManager.onDisconnect(socket.id);
        if (updatedRoom) {
            io.to(updatedRoom.id).emit(SocketEvents.ROOM_UPDATED, updatedRoom);

            // Update or delete room in database
            if (updatedRoom.players.length > 0) {
                databaseService.saveRoom(updatedRoom);
            } else {
                databaseService.deleteRoom(updatedRoom.id);
            }
        }
    });
});

httpServer.listen(PORT, () => {
    logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server gracefully');
    httpServer.close(() => {
        databaseService.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, closing server gracefully');
    httpServer.close(() => {
        databaseService.close();
        process.exit(0);
    });
});
