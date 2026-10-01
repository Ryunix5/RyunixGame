import { INPUT_LIMITS } from '@ryunix/shared';

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
    /** How long a disconnected player keeps their seat before being removed (ms) */
    RECONNECT_GRACE_MS: 60 * 1000,
} as const;

// Game Timing
export const GAME_TIMING = {
    /** Delay before auto-advancing to next round in Split/Steal (ms) */
    SPLIT_STEAL_REVEAL_DELAY: 4000,
    /** Room list polling interval (ms) */
    ROOM_LIST_POLL_INTERVAL: 5000,
    /** Thinking phase duration for The Last Word (ms) */
    THINKING_PHASE_DURATION: 5000,
} as const;

// Server Configuration
export const SERVER_CONFIG = {
    /** Server port */
    PORT: 3001,
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
    /** Maximum length for chat messages */
    MAX_MESSAGE_LENGTH: INPUT_LIMITS.CHAT,
    /** Maximum number of messages to keep in memory per room */
    MAX_MESSAGES_PER_ROOM: 100,
} as const;

// Per-connection socket rate limits: `capacity` is the burst size, `refillPerSecond` the sustained rate
export const SOCKET_RATE_LIMITS = {
    chat: { capacity: 5, refillPerSecond: 1 },
    game: { capacity: 20, refillPerSecond: 10 },
    lobby: { capacity: 10, refillPerSecond: 2 },
    roomList: { capacity: 5, refillPerSecond: 1 }, // Separate so list polling can never starve joins
    voice: { capacity: 100, refillPerSecond: 50 }, // WebRTC signalling sends bursts of ICE candidates
} as const;

export type SocketRateCategory = keyof typeof SOCKET_RATE_LIMITS;

// Game Input
export const GAME_INPUT = {
    /** Longest free-text value a game accepts (words, answers, guesses) */
    MAX_TEXT_LENGTH: INPUT_LIMITS.GAME_TEXT,
    /** Longest letter in The Prisoners' Letter */
    MAX_LETTER_LENGTH: INPUT_LIMITS.LETTER,
} as const;

/** Largest socket message a client may send (bytes); everything legitimate is tiny */
export const MAX_SOCKET_PAYLOAD_BYTES = 16 * 1024;

// Validation Patterns
export const VALIDATION = {
    /** Allowed characters in player names (alphanumeric, spaces, basic punctuation) */
    NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,
    /** Room code pattern (6 uppercase alphanumeric characters) */
    ROOM_CODE_PATTERN: /^[A-Z0-9]{6}$/,
} as const;
