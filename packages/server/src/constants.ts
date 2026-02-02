/**
 * Application-wide constants
 * Centralizes all magic numbers and configuration values
 */

// Room Configuration
export const ROOM_CONFIG = {
    /** Maximum number of players allowed in a room */
    MAX_PLAYERS: 8,
    /** Length of generated room codes */
    ROOM_CODE_LENGTH: 6,
    /** Maximum length for player names */
    MAX_NAME_LENGTH: 20,
    /** Minimum length for player names */
    MIN_NAME_LENGTH: 1,
} as const;

// Game Timing
export const GAME_TIMING = {
    /** Delay before auto-advancing to next round in Split/Steal (ms) */
    SPLIT_STEAL_REVEAL_DELAY: 4000,
    /** Room list polling interval (ms) */
    ROOM_LIST_POLL_INTERVAL: 5000,
    /** Thinking phase duration for The Last Word (ms) */
    THINKING_PHASE_DURATION: 30000,
} as const;

// Server Configuration
export const SERVER_CONFIG = {
    /** Server port */
    PORT: 3001,
    /** Default CORS origin for development */
    DEFAULT_CORS_ORIGIN: 'http://localhost:5173',
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
    /** Maximum length for chat messages */
    MAX_MESSAGE_LENGTH: 500,
    /** Maximum number of messages to keep in memory per room */
    MAX_MESSAGES_PER_ROOM: 100,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
    /** Maximum API requests per window */
    API_MAX_REQUESTS: 100,
    /** Rate limit window duration (ms) */
    API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    /** Maximum socket connections per IP per window */
    SOCKET_MAX_CONNECTIONS: 10,
    /** Socket connection window duration (ms) */
    SOCKET_WINDOW_MS: 60 * 1000, // 1 minute
} as const;

// Database Configuration
export const DB_CONFIG = {
    /** Database file path */
    DB_PATH: './content.db',
    /** Checkpoint interval for WAL mode (ms) */
    CHECKPOINT_INTERVAL: 30000,
} as const;

// Validation Patterns
export const VALIDATION = {
    /** Allowed characters in player names (alphanumeric, spaces, basic punctuation) */
    NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,
    /** Room code pattern (6 uppercase alphanumeric characters) */
    ROOM_CODE_PATTERN: /^[A-Z0-9]{6}$/,
} as const;
