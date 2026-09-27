import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, Room, SessionInfo } from '@ryunix/shared';
import { RoomSummary } from '@ryunix/shared';
import { reconnectionManager } from './services/ReconnectionManager';
import { useToast } from './components/Toast';

interface SocketContextType {
    socket: Socket | null;
    playerId: string | null; // Stable identity; use this (not socket.id) to find yourself in room.players
    isConnected: boolean;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
    reconnectAttempts: number;
    createRoom: (hostName: string, gameId?: string) => void;
    joinRoom: (roomId: string, playerName: string) => void;
    leaveRoom: () => void;
    resetLobby: () => void;
    listRooms: () => void;
    sendChat: (message: string) => void;
    room: Room | null;
    availableRooms: RoomSummary[];
    error: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
    const [room, setRoom] = useState<Room | null>(null);
    const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const { showToast } = useToast();
    // The socket listeners are registered once, so they read the current room through a ref
    const inRoomRef = useRef(false);
    useEffect(() => { inRoomRef.current = room !== null; }, [room]);

    useEffect(() => {
        const serverUrl = import.meta.env.PROD ? '/' : 'http://localhost:3001';

        const newSocket = io(serverUrl, {
            // A function so every reconnect sends the latest token the server gave us
            auth: (cb) => cb({ sessionToken: reconnectionManager.getSessionToken() }),
            // Keep retrying: the server holds our seat for a while after a drop
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[SocketContext] Connected to server');
            setIsConnected(true);
            setConnectionStatus('connected');
            setReconnectAttempts(0);
        });

        // The server resumes our room automatically when it recognises the token
        newSocket.on(SocketEvents.SESSION, (session: SessionInfo) => {
            reconnectionManager.saveSessionToken(session.sessionToken);
            setPlayerId(session.playerId);
        });

        newSocket.on('disconnect', () => {
            console.log('[SocketContext] Disconnected from server');
            setIsConnected(false);
            setConnectionStatus('disconnected');
        });

        // Reconnect events live on the manager, not the socket
        newSocket.io.on('reconnect_attempt', (attempt: number) => {
            console.log('[SocketContext] Reconnection attempt:', attempt);
            setConnectionStatus('reconnecting');
            setReconnectAttempts(attempt);
        });

        newSocket.on(SocketEvents.RECONNECTED, (updatedRoom: Room) => {
            console.log('[SocketContext] Successfully reconnected to room:', updatedRoom.id);
            setRoom(updatedRoom);
            setConnectionStatus('connected');
            setError(null);
        });

        newSocket.on(SocketEvents.ROOM_UPDATED, (updatedRoom: Room) => {
            setRoom(updatedRoom);
            setError(null);
        });

        newSocket.on(SocketEvents.ROOM_LIST, (rooms: RoomSummary[]) => {
            setAvailableRooms(rooms);
        });

        newSocket.on(SocketEvents.ERROR, (err: { message: string }) => {
            setError(err.message);
            // The home screen shows errors inline; inside a room they'd otherwise go unseen
            if (inRoomRef.current) showToast(err.message, 'error');
        });

        newSocket.on(SocketEvents.KICKED, () => {
            alert('You have been kicked by the host.');
            setRoom(null);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const createRoom = (hostName: string) => {
        if (socket) {
            socket.emit(SocketEvents.CREATE_ROOM, { hostName });
        } else {
            console.error('[SocketContext] Socket not available!');
        }
    };

    const joinRoom = (roomId: string, playerName: string) => {
        if (socket) {
            socket.emit(SocketEvents.JOIN_ROOM, { roomId, playerName });
        }
    };

    const resetLobby = () => {
        if (socket && room) {
            socket.emit(SocketEvents.RESET_LOBBY, { roomId: room.id });
        }
    };

    const leaveRoom = () => {
        setRoom(null);
        if (socket) {
            socket.emit(SocketEvents.LEAVE_ROOM);
            // Also refresh list if we leave to menu
            listRooms();
        }
    }

    const listRooms = () => {
        if (socket) {
            socket.emit(SocketEvents.LIST_ROOMS);
        }
    }

    const sendChat = (message: string) => {
        if (socket && room) {
            socket.emit(SocketEvents.SEND_CHAT, { roomId: room.id, message });
        }
    }

    return (
        <SocketContext.Provider value={{ socket, playerId, isConnected, connectionStatus, reconnectAttempts, createRoom, joinRoom, leaveRoom, resetLobby, listRooms, sendChat, room, availableRooms, error }}>
            {children}
        </SocketContext.Provider>
    );
};
