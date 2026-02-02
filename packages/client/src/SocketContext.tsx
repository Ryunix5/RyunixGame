import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, Room, ReconnectData } from '@ryunix/shared';
import { RoomSummary } from '@ryunix/shared';
import { reconnectionManager } from './services/ReconnectionManager';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
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

    useEffect(() => {
        const serverUrl = import.meta.env.PROD ? '/' : 'http://localhost:3001';

        const newSocket = io(serverUrl, {
            auth: {
                sessionToken: reconnectionManager.getSessionToken()
            },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[SocketContext] Connected to server');
            setIsConnected(true);
            setConnectionStatus('connected');
            setReconnectAttempts(0);

            // Attempt to reconnect to previous room if available
            const roomState = reconnectionManager.getRoomState();
            if (roomState) {
                console.log('[SocketContext] Attempting to reconnect to room:', roomState.roomId);
                const reconnectData: ReconnectData = {
                    sessionToken: reconnectionManager.getSessionToken(),
                    roomId: roomState.roomId,
                    playerId: roomState.playerId
                };
                newSocket.emit(SocketEvents.RECONNECT, reconnectData);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('[SocketContext] Disconnected from server');
            setIsConnected(false);
            setConnectionStatus('disconnected');
        });

        newSocket.on('reconnect_attempt', (attempt: number) => {
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

            // Save room state for reconnection
            if (updatedRoom && newSocket.id) {
                const player = updatedRoom.players.find(p => p.socketId === newSocket.id);
                if (player) {
                    reconnectionManager.saveRoomState(updatedRoom.id, player.id, player.name);
                }
            }
        });

        newSocket.on(SocketEvents.ROOM_LIST, (rooms: RoomSummary[]) => {
            setAvailableRooms(rooms);
        });

        newSocket.on(SocketEvents.ERROR, (err: { message: string }) => {
            setError(err.message);

            // Clear room state if reconnection failed
            if (err.message.includes('reconnect')) {
                reconnectionManager.clearRoomState();
            }
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
            // Clear room state from reconnection manager
            reconnectionManager.clearRoomState();
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
        <SocketContext.Provider value={{ socket, isConnected, connectionStatus, createRoom, joinRoom, leaveRoom, resetLobby, listRooms, sendChat, room, availableRooms, error }}>
            {children}
        </SocketContext.Provider>
    );
};
