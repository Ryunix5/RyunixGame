export interface Player {
    id: string; // Stable across reconnects; never a socket id

    name: string;
    isHost: boolean;
    isAlive: boolean;
    roomWins: number; // Games won in this room (shown on the lobby scoreboard)
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

// ==================== GAME CATALOG ====================
// Single source of truth for what the lobby shows. Each server GamePlugin must use the same id and
// player limits (a server test checks this).

export interface GameInfo {
    id: string;
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    usesContentPacks: boolean; // Whether the host's content pack choice affects this game
    howToPlay: string[]; // Short rule steps shown in the lobby and in-game
}

export const GAME_CATALOG: readonly GameInfo[] = [
    { id: 'split-steal', name: 'Split or Steal', description: 'Pair up and secretly choose: share the points or take them all.', minPlayers: 2, maxPlayers: 8, usesContentPacks: false,
        howToPlay: ["Everyone starts with 3 trust points. Each round you are paired with someone (with an odd count, one player sits out).", "Talk it over, then secretly choose SPLIT or STEAL.", "Both split: +1 each. One steals: the stealer gets +2 and the other loses 2. Both steal: -1 each.", "After 4 rounds, the most trust points wins."] },
    { id: 'unknown-to-one', name: 'Unknown to One', description: 'Everyone knows the secret word except one player. Find them.', minPlayers: 3, maxPlayers: 10, usesContentPacks: true,
        howToPlay: ["The host picks a secret word (or a random one). Everyone sees it except one player: the Blackened.", "Take turns saying one word that hints at the secret. The Blackened has to bluff.", "Then decide together: another round of hints, or vote now.", "Vote for who you think the Blackened is. If you catch them, they pay 1 point to every other player but get one guess at the word for +1. If they escape, they get +4.", "First to 10 points wins."] },
    { id: 'the-last-word', name: 'The Last Word', description: 'Name something in the topic before time runs out. Last one standing wins.', minPlayers: 2, maxPlayers: 16, usesContentPacks: true,
        howToPlay: ["The host sets a topic, like \"Fruits\". Everyone has 5 seconds to type something that fits.", "No answer in time and you lose a life. Everyone starts with 3.", "Think an answer doesn't fit? Challenge it and the host decides. A wrong challenge costs the challenger a life; a right one costs the answerer.", "Last player with lives left wins."] },
    { id: 'prisoners-letter', name: "The Prisoners' Letter", description: 'Write an anonymous note, then guess who wrote the one read out.', minPlayers: 3, maxPlayers: 10, usesContentPacks: false,
        howToPlay: ["Everyone secretly writes a short note (10 words max).", "One note is read out anonymously. Everyone else votes on who wrote it.", "Each correct guess is +1. If nobody picks the author, the author gets +3, so write like someone else!", "First to 10 points wins."] },
    { id: 'deceiving-cards', name: 'Deceiving Cards', description: "You see everyone's card but your own. Guess yours to survive.", minPlayers: 3, maxPlayers: 10, usesContentPacks: false,
        howToPlay: ["Everyone gets a card suit (♠ ♥ ♦ ♣). You can see everyone's card except your own.", "Each round, everyone guesses their own suit. Guess wrong and you are out; guess right and you get a new card.", "Your only clues are what the others tell you out loud, and they might be lying.", "The last two players standing win."] },
    { id: 'mind-reader', name: 'Mind Reader', description: "Guess your partner's secret word.", minPlayers: 2, maxPlayers: 10, usesContentPacks: true,
        howToPlay: ["You're paired up and each get a secret word. You can see yours but not your partner's.", "Ask each other questions and drop hints out loud, without saying your word.", "The first player to type their partner's word wins."] },
    { id: 'matching-minds', name: 'Matching Minds', description: 'Everyone says a word each round until you all say the same one.', minPlayers: 2, maxPlayers: 8, usesContentPacks: false,
        howToPlay: ["Everyone types a word at the same time, then all the words are revealed.", "Next round, everyone tries to say the same word, using the last round's words as the link.", "You win together when everyone says the same word. You have 15 rounds."] },
];

export function getGameInfo(id: string): GameInfo | undefined {
    return GAME_CATALOG.find(g => g.id === id);
}
