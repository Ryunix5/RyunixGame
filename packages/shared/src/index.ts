export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    isAlive: boolean;
    score: number;
    roomId?: string;
    socketId: string;
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
    SEND_MESSAGE = 'send_message',
    GAME_ACTION = 'game_action',
    START_GAME = 'start_game',
    LIST_ROOMS = 'list_rooms',
    RESET_LOBBY = 'reset_lobby',
    SEND_CHAT = 'send_chat',
    SELECT_GAME = 'select_game',

    // Server -> Client
    ROOM_UPDATED = 'room_updated',
    ERROR = 'error',
    GAME_STATE = 'game_state',
    CHAT_MESSAGE = 'chat_message',
    ROOM_LIST = 'room_list'
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
