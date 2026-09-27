export interface Player {
    id: string; // Stable across reconnects; never a socket id

    name: string;
    isHost: boolean;
    isAlive: boolean;
    score: number; // Temporary game score (resets each game)
    roomWins: number; // Persistent wins in this room session
    roomId?: string;
    connected: boolean; // False while the player is inside the reconnect grace period
}

export enum RoomStatus {
    MENU = 'MENU',
    LOBBY = 'LOBBY',
    GAME = 'GAME',
    RESULTS = 'RESULTS'
}

export interface Room {
    id: string;
    hostId: string;
    players: Player[];
    status: RoomStatus;
    maxPlayers: number;
    gameState?: any;
    selectedGameId?: string; // Syncs lobby selection
}

export enum SocketEvents {
    // Client -> Server
    JOIN_ROOM = 'join_room',
    CREATE_ROOM = 'create_room',
    LEAVE_ROOM = 'leave_room',
    KICK_PLAYER = 'kick_player',
    SEND_MESSAGE = 'send_message',
    GAME_ACTION = 'game_action',
    START_GAME = 'start_game',
    LIST_ROOMS = 'list_rooms',
    RESET_LOBBY = 'reset_lobby',
    SEND_CHAT = 'send_chat',
    SELECT_GAME = 'select_game',

    // Server -> Client
    ROOM_UPDATED = 'room_updated',
    KICKED = 'kicked',
    ERROR = 'error',
    GAME_STATE = 'game_state',
    CHAT_MESSAGE = 'chat_message',
    ROOM_LIST = 'room_list',
    RECONNECTED = 'reconnected', // Sent when a returning session is put back into its room
    SESSION = 'session' // Sent on every connect with the session this socket belongs to
}

// The token is a secret the client keeps to resume its identity; playerId is public.
export interface SessionInfo {
    sessionToken: string;
    playerId: string;
}

// ==================== MATCHING MINDS GAME ====================

export interface MatchingMindsState {
    phase: 'SUBMITTING' | 'REVEALING' | 'RESULTS';
    currentRound: number;
    maxRounds: number;
    rounds: MatchingMindsRound[];
    submissions: Record<string, { word: string; playerName: string }>;
    hasConverged: boolean;
    convergenceWord?: string;
    playerNames: Record<string, string>; // Players still in the game, id -> name
}

export interface MatchingMindsRound {
    roundNumber: number;
    submissions: Array<{ playerId: string; playerName: string; word: string }>;
    matchCount: number;
    mostCommonWord?: string;
}

export interface RoomSummary {
    id: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    status: RoomStatus;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
}

// Longest text a player may type, enforced by the server and mirrored by client inputs
export const INPUT_LIMITS = {
    GAME_TEXT: 60, // Words, answers, guesses, topics
    LETTER: 200, // The Prisoners' Letter
    MATCHING_WORD: 50, // Matching Minds
    CHAT: 500,
} as const;
