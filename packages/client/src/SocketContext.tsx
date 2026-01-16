import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, Room } from '@ryunix/shared';

import { RoomSummary } from '@ryunix/shared';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
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
    const [room, setRoom] = useState<Room | null>(null);
    const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Auto-detects URL. In dev (Vite), it needs explicit URL if ports differ.
        // In prod (served by same node server), it defaults to window.location.
        const serverUrl = import.meta.env.PROD ? '/' : 'http://localhost:3001';
        console.log('[Socket] Connecting to:', serverUrl || 'window.location.origin');

        const newSocket = io(serverUrl);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to server');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from server');
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
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const createRoom = (hostName: string) => {
        if (socket) {
            socket.emit(SocketEvents.CREATE_ROOM, { hostName });
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
        <SocketContext.Provider value={{ socket, isConnected, createRoom, joinRoom, leaveRoom, resetLobby, listRooms, sendChat, room, availableRooms, error }}>
            {children}
        </SocketContext.Provider>
    );
};
