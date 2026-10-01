import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
        // Same origin by default (Vite proxies /socket.io in dev); VITE_SERVER_URL for a separately hosted server
        const serverUrl = import.meta.env.VITE_SERVER_URL || '/';

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
        let knownPlayerId: string | null = null;
        newSocket.on(SocketEvents.SESSION, (session: SessionInfo) => {
            reconnectionManager.saveSessionToken(session.sessionToken);
            // A different identity means the server no longer knows us (it restarted, or we were
            // gone past the reconnect grace period), so the room on screen no longer exists.
            if (knownPlayerId && knownPlayerId !== session.playerId && inRoomRef.current) {
                setRoom(null);
                showToast('That room has ended (the server restarted or you were away too long). Create or join a new one.', 'warning', 8000);
            }
            knownPlayerId = session.playerId;
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
            setRoom(null);
            showToast('You were removed from the room by the host.', 'warning');
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Stable identities: components put these in effect dependencies (Home polls listRooms), and a
    // new function every render made that effect re-fire on every room list reply, in a loop.
    const createRoom = useCallback((hostName: string) => {
        socket?.emit(SocketEvents.CREATE_ROOM, { hostName });
    }, [socket]);

    const joinRoom = useCallback((roomId: string, playerName: string) => {
        socket?.emit(SocketEvents.JOIN_ROOM, { roomId, playerName });
    }, [socket]);

    const listRooms = useCallback(() => {
        socket?.emit(SocketEvents.LIST_ROOMS);
    }, [socket]);

    const roomId = room?.id;
    const resetLobby = useCallback(() => {
        if (socket && roomId) socket.emit(SocketEvents.RESET_LOBBY, { roomId });
    }, [socket, roomId]);

    const leaveRoom = useCallback(() => {
        setRoom(null);
        socket?.emit(SocketEvents.LEAVE_ROOM);
    }, [socket]);

    const sendChat = useCallback((message: string) => {
        if (socket && roomId) socket.emit(SocketEvents.SEND_CHAT, { roomId, message });
    }, [socket, roomId]);

    return (
        <SocketContext.Provider value={{ socket, playerId, isConnected, connectionStatus, reconnectAttempts, createRoom, joinRoom, leaveRoom, resetLobby, listRooms, sendChat, room, availableRooms, error }}>
            {children}
        </SocketContext.Provider>
    );
};
