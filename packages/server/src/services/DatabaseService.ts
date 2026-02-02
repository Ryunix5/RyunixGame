import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DB_CONFIG } from '../constants';
import { logger } from '../utils/logger';
import { Room, Player, RoomStatus } from '@ryunix/shared';

/**
 * Database Service
 * Handles all SQLite database operations for persistence
 */

export interface Session {
    id: string;
    player_id: string;
    player_name: string;
    socket_id: string | null;
    room_id: string | null;
    created_at: number;
    last_seen: number;
    expires_at: number;
}

export class DatabaseService {
    private db: Database.Database;

    constructor(dbPath: string = DB_CONFIG.DB_PATH) {
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir) && dir !== '.') {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL'); // Better concurrency
        this.initialize();
    }

    /**
     * Initialize database schema
     */
    private initialize(): void {
        try {
            // Inline schema to avoid file deployment issues
            const schema = `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, player_name TEXT NOT NULL, socket_id TEXT, room_id TEXT, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON sessions(player_id); CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON sessions(room_id); CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at); CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, host_id TEXT NOT NULL, status TEXT NOT NULL, max_players INTEGER NOT NULL DEFAULT 8, selected_game_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, game_state TEXT); CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status); CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at); CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, player_id TEXT NOT NULL, player_name TEXT NOT NULL, socket_id TEXT, is_host INTEGER NOT NULL DEFAULT 0, is_alive INTEGER NOT NULL DEFAULT 1, score INTEGER NOT NULL DEFAULT 0, room_wins INTEGER NOT NULL DEFAULT 0, joined_at INTEGER NOT NULL, FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE); CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id); CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id); CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id); CREATE TABLE IF NOT EXISTS player_stats (player_id TEXT PRIMARY KEY, total_games_played INTEGER NOT NULL DEFAULT 0, total_wins INTEGER NOT NULL DEFAULT 0, total_score INTEGER NOT NULL DEFAULT 0, first_seen INTEGER NOT NULL, last_seen INTEGER NOT  NULL);`;

            // Execute schema (create tables if not exist)
            this.db.exec(schema);

            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize database', error);
            throw error;
        }
    }

    // ==================== SESSIONS ====================

    /**
     * Create a new session
     */
    createSession(playerId: string, playerName: string, socketId: string): Session {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

        const stmt = this.db.prepare(`
            INSERT INTO sessions (id, player_id, player_name, socket_id, room_id, created_at, last_seen, expires_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
        `);

        stmt.run(sessionId, playerId, playerName, socketId, now, now, expiresAt);

        return {
            id: sessionId,
            player_id: playerId,
            player_name: playerName,
            socket_id: socketId,
            room_id: null,
            created_at: now,
            last_seen: now,
            expires_at: expiresAt
        };
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): Session | null {
        const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
        return stmt.get(sessionId) as Session | null;
    }

    /**
     * Update session socket and last seen
     */
    updateSession(sessionId: string, socketId: string, roomId?: string): void {
        const stmt = this.db.prepare(`
            UPDATE sessions 
            SET socket_id = ?, last_seen = ?, room_id = COALESCE(?, room_id)
            WHERE id = ?
        `);
        stmt.run(socketId, Date.now(), roomId || null, sessionId);
    }

    /**
     * Clear session socket on disconnect
     */
    clearSessionSocket(socketId: string): void {
        const stmt = this.db.prepare('UPDATE sessions SET socket_id = NULL WHERE socket_id = ?');
        stmt.run(socketId);
    }

    /**
     * Delete expired sessions
     */
    cleanupExpiredSessions(): number {
        const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?');
        const result = stmt.run(Date.now());
        return result.changes;
    }

    // ==================== ROOMS ====================

    /**
     * Save room to database
     */
    saveRoom(room: Room): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO rooms (id, host_id, status, max_players, selected_game_id, created_at, updated_at, game_state)
            VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM rooms WHERE id = ?), ?), ?, ?)
        `);

        const now = Date.now();
        stmt.run(
            room.id,
            room.hostId,
            room.status,
            room.maxPlayers,
            room.selectedGameId || null,
            room.id, // For COALESCE check
            now,     // Default created_at if new
            now,     // updated_at
            room.gameState ? JSON.stringify(room.gameState) : null
        );

        // Save players
        this.savePlayers(room.id, room.players);
    }

    /**
     * Get room from database
     */
    getRoom(roomId: string): Room | null {
        const roomStmt = this.db.prepare('SELECT * FROM rooms WHERE id = ?');
        const roomRow: any = roomStmt.get(roomId);

        if (!roomRow) return null;

        const playersStmt = this.db.prepare('SELECT * FROM players WHERE room_id = ?');
        const playerRows: any[] = playersStmt.all(roomId);

        const players: Player[] = playerRows.map(row => ({
            id: row.player_id,
            name: row.player_name,
            socketId: row.socket_id,
            isHost: Boolean(row.is_host),
            isAlive: Boolean(row.is_alive),
            score: row.score,
            roomWins: row.room_wins,
            roomId: row.room_id
        }));

        return {
            id: roomRow.id,
            hostId: roomRow.host_id,
            players,
            status: roomRow.status as RoomStatus,
            maxPlayers: roomRow.max_players,
            selectedGameId: roomRow.selected_game_id,
            gameState: roomRow.game_state ? JSON.parse(roomRow.game_state) : undefined
        };
    }

    /**
     * Get all active rooms
     */
    getActiveRooms(): Room[] {
        const roomStmt = this.db.prepare("SELECT id FROM rooms WHERE status IN ('LOBBY', 'MENU')");
        const roomIds = roomStmt.all().map((row: any) => row.id);

        return roomIds.map(id => this.getRoom(id)).filter(room => room !== null) as Room[];
    }

    /**
     * Delete room from database
     */
    deleteRoom(roomId: string): void {
        const stmt = this.db.prepare('DELETE FROM rooms WHERE id = ?');
        stmt.run(roomId);
        // Players are cascade deleted
    }

    // ==================== PLAYERS ====================

    /**
     * Save players for a room
     */
    private savePlayers(roomId: string, players: Player[]): void {
        // Clear existing players for this room
        const deleteStmt = this.db.prepare('DELETE FROM players WHERE room_id = ?');
        deleteStmt.run(roomId);

        // Insert current players
        const insertStmt = this.db.prepare(`
            INSERT INTO players (id, room_id, player_id, player_name, socket_id, is_host, is_alive, score, room_wins, joined_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = Date.now();
        for (const player of players) {
            insertStmt.run(
                `${roomId}:${player.id}`,
                roomId,
                player.id,
                player.name,
                player.socketId,
                player.isHost ? 1 : 0,
                player.isAlive ? 1 : 0,
                player.score,
                player.roomWins,
                now
            );
        }
    }

    /**
     * Update player socket ID
     */
    updatePlayerSocket(roomId: string, playerId: string, socketId: string): void {
        const stmt = this.db.prepare('UPDATE players SET socket_id = ? WHERE room_id = ? AND player_id = ?');
        stmt.run(socketId, roomId, playerId);
    }

    /**
     * Get room ID by player ID (for reconnection)
     */
    getRoomByPlayerId(playerId: string): string | null {
        const stmt = this.db.prepare('SELECT room_id FROM players WHERE player_id = ? LIMIT 1');
        const result: any = stmt.get(playerId);
        return result ? result.room_id : null;
    }

    // ==================== UTILITY ====================

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
        logger.info('Database connection closed');
    }

    /**
     * Run checkpoint (for WAL mode)
     */
    checkpoint(): void {
        this.db.pragma('wal_checkpoint(TRUNCATE)');
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();
