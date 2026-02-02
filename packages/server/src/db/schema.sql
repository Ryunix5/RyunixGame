-- Ryunix Games Database Schema
-- SQLite database for persisting game rooms, players, and sessions

-- Sessions table: Tracks player sessions for reconnection
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,              -- Session token (UUID)
    player_id TEXT NOT NULL,          -- Player identifier
    player_name TEXT NOT NULL,        -- Player display name
    socket_id TEXT,                   -- Current socket ID (null if disconnected)
    room_id TEXT,                     -- Current room (null if not in room)
    created_at INTEGER NOT NULL,      -- Unix timestamp (ms)
    last_seen INTEGER NOT NULL,       -- Unix timestamp (ms)
    expires_at INTEGER NOT NULL       -- Unix timestamp (ms)
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Rooms table: Persist room state
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,              -- Room code (6-char alphanumeric)
    host_id TEXT NOT NULL,            -- Host player ID
    status TEXT NOT NULL,             -- 'LOBBY' | 'GAME' | 'RESULTS'
    max_players INTEGER NOT NULL DEFAULT 8,
    selected_game_id TEXT,            -- Selected game type
    created_at INTEGER NOT NULL,      -- Unix timestamp (ms)
    updated_at INTEGER NOT NULL,      -- Unix timestamp (ms)
    game_state TEXT                   -- JSON serialized game state
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);

-- Players table: Track players in rooms
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,              -- Composite: {room_id}:{player_id}
    room_id TEXT NOT NULL,            -- Foreign key to rooms
    player_id TEXT NOT NULL,          -- Player identifier
    player_name TEXT NOT NULL,        -- Player display name
    socket_id TEXT,                   -- Current socket ID
    is_host INTEGER NOT NULL DEFAULT 0, -- Boolean: 1 = host, 0 = not host
    is_alive INTEGER NOT NULL DEFAULT 1, -- Boolean for game state
    score INTEGER NOT NULL DEFAULT 0,
    room_wins INTEGER NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL,       -- Unix timestamp (ms)
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);

-- Statistics table: Aggregate player statistics (optional, for future)
CREATE TABLE IF NOT EXISTS player_stats (
    player_id TEXT PRIMARY KEY,
    total_games_played INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,     -- Unix timestamp (ms)
    last_seen INTEGER NOT NULL       -- Unix timestamp (ms)
);
