import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { SocketEvents, RoomStatus } from '@ryunix/shared';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

import { RoomManager } from './RoomManager';
import { GameRegistry } from './game/GameRegistry';
import { ContentManager } from './services/ContentManager';

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

app.use(express.json());

// Serve static frontend files
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
    console.log('Serving static files from:', clientDist);
    app.use(express.static(clientDist));

    // Handle SPA routing (return index.html for non-API requests)
    // using a regex to avoid path-to-regexp "Missing parameter name" error with "*"
    app.get(/^(?!\/api|\/socket.io).+/, (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
} else {
    console.log('Client build not found at:', clientDist);
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

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // DEBUG: Trace all events
    socket.onAny((eventName, ...args) => {
        console.log(`[Server RAW] Received event: ${eventName}`, args);
    });

    socket.on(SocketEvents.CREATE_ROOM, (data: { hostName: string }) => {
        const room = roomManager.createRoom(socket.id, data.hostName, socket.id);
        socket.join(room.id);
        socket.emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`Room created: ${room.id} by ${data.hostName}`);
    });

    socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string, playerName: string }) => {
        const room = roomManager.joinRoom(data.roomId, socket.id, data.playerName, socket.id);
        if (room) {
            socket.join(room.id);
            io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
            console.log(`${data.playerName} joined room ${room.id}`);
        } else {
            socket.emit(SocketEvents.ERROR, { message: 'Failed to join room' });
        }
    });

    socket.on(SocketEvents.LEAVE_ROOM, () => {
        // Find room where this socket is
        // Since we don't pass roomId in LEAVE_ROOM event usually (context knows), 
        // or we have to iterate. RoomManager.onDisconnect logic is similar but for leaving.
        const updatedRoom = roomManager.onDisconnect(socket.id);
        if (updatedRoom) {
            io.to(updatedRoom.id).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
            console.log(`Socket ${socket.id} left room ${updatedRoom.id}`);
            socket.leave(updatedRoom.id);
        }
    });

    socket.on(SocketEvents.SELECT_GAME, (data: { roomId: string, gameId: string }) => {
        const room = roomManager.getRoom(data.roomId);
        if (!room) return;
        if (room.hostId !== socket.id) return; // Only host can select

        room.selectedGameId = data.gameId;
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
    });

    socket.on(SocketEvents.START_GAME, (data: { roomId: string, gameId: string }) => {
        console.log(`[Server] Received START_GAME. Room: ${data.roomId}, Game: ${data.gameId}`);
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
            const packs = contentManager.getContent(data.gameId);
            if (packs && packs.length > 0) {
                // Use the first pack found. In future, allow lobby to select pack.
                gameConfig = packs[0].data;
                console.log(`[Server] Loaded content pack: ${packs[0].packName} for ${data.gameId}`);
            }
        } catch (err) {
            console.error('[Server] Failed to load content:', err);
        }

        // Initialize game
        room.status = RoomStatus.GAME;
        room.gameState = game.setup(room.players, gameConfig);
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
        console.log('[Server] Game started. Room updated broadcAst.');
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

        const newState = game.handleAction(room.gameState, socket.id, data.action);
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

                            // Persist scores
                            Object.entries(results).forEach(([pid, score]) => {
                                const p = roomRef.players.find(player => player.id === pid);
                                if (p) p.score += score;
                            });

                            io.to(roomRef.id).emit(SocketEvents.ROOM_UPDATED, roomRef);
                        }
                    }
                }, 4000); // 4 Seconds Delay
            }

            if (game.isComplete(newState)) {
                const results = game.resolve(newState, room.players);
                room.status = RoomStatus.RESULTS;
                room.gameState = { ...room.gameState, results };

                // Persist scores
                Object.entries(results).forEach(([pid, score]) => {
                    const p = room.players.find(player => player.id === pid);
                    if (p) p.score += score;
                });

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
        const room = roomManager.getRoom(data.roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const chatMessage = {
            id: Date.now().toString(),
            senderId: player.id,
            senderName: player.name,
            content: data.message,
            timestamp: Date.now()
        };

        io.to(room.id).emit(SocketEvents.CHAT_MESSAGE, chatMessage);
    });

    socket.on('voice_signal', (data: { to: string, signal: any }) => {
        io.to(data.to).emit('voice_signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const updatedRoom = roomManager.onDisconnect(socket.id);
        if (updatedRoom) {
            io.to(updatedRoom.id).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
