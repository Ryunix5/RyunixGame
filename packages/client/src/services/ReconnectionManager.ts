/**
 * ReconnectionManager
 * Handles session tokens and automatic reconnection logic
 */

const SESSION_TOKEN_KEY = 'ryunix_session_token';
const ROOM_STATE_KEY = 'ryunix_room_state';

export interface RoomState {
    roomId: string;
    playerId: string;
    playerName: string;
    lastUpdated: number;
}

export class ReconnectionManager {
    private sessionToken: string | null = null;
    private roomState: RoomState | null = null;

    constructor() {
        this.init();
    }

    /**
     * Initialize manager - load from localStorage
     */
    private init(): void {
        try {
            this.sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
            const roomStateStr = localStorage.getItem(ROOM_STATE_KEY);

            if (roomStateStr) {
                this.roomState = JSON.parse(roomStateStr);

                // Clear if older than 24 hours
                if (this.roomState && Date.now() - this.roomState.lastUpdated > 24 * 60 * 60 * 1000) {
                    this.clearRoomState();
                }
            }
        } catch (error) {
            console.error('Failed to load session from localStorage:', error);
            this.clearAll();
        }
    }

    /**
     * Get or create session token
     */
    getSessionToken(): string {
        if (!this.sessionToken) {
            this.sessionToken = this.generateSessionToken();
            this.saveSessionToken();
        }
        return this.sessionToken;
    }

    /**
     * Generate a new session token
     */
    private generateSessionToken(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `sess_${timestamp}_${random}`;
    }

    /**
     * Save session token to localStorage
     */
    private saveSessionToken(): void {
        try {
            if (this.sessionToken) {
                localStorage.setItem(SESSION_TOKEN_KEY, this.sessionToken);
            }
        } catch (error) {
            console.error('Failed to save session token:', error);
        }
    }

    /**
     * Save room state for reconnection
     */
    saveRoomState(roomId: string, playerId: string, playerName: string): void {
        this.roomState = {
            roomId,
            playerId,
            playerName,
            lastUpdated: Date.now()
        };

        try {
            localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(this.roomState));
        } catch (error) {
            console.error('Failed to save room state:', error);
        }
    }

    /**
     * Get saved room state
     */
    getRoomState(): RoomState | null {
        return this.roomState;
    }

    /**
     * Clear room state (e.g., on leaving room)
     */
    clearRoomState(): void {
        this.roomState = null;
        try {
            localStorage.removeItem(ROOM_STATE_KEY);
        } catch (error) {
            console.error('Failed to clear room state:', error);
        }
    }

    /**
     * Clear all stored data
     */
    clearAll(): void {
        this.sessionToken = null;
        this.roomState = null;
        try {
            localStorage.removeItem(SESSION_TOKEN_KEY);
            localStorage.removeItem(ROOM_STATE_KEY);
        } catch (error) {
            console.error('Failed to clear all data:', error);
        }
    }

    /**
     * Check if we should attempt reconnection
     */
    shouldReconnect(): boolean {
        return this.roomState !== null && this.sessionToken !== null;
    }

    /**
     * Update room state timestamp
     */
    updateTimestamp(): void {
        if (this.roomState) {
            this.roomState.lastUpdated = Date.now();
            try {
                localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(this.roomState));
            } catch (error) {
                console.error('Failed to update timestamp:', error);
            }
        }
    }
}

// Export singleton instance
export const reconnectionManager = new ReconnectionManager();
