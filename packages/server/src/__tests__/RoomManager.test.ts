import { RoomManager } from '../RoomManager';

describe('RoomManager', () => {
    let rm: RoomManager;

    beforeEach(() => {
        jest.useFakeTimers();
        rm = new RoomManager();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('resolveSession', () => {
        it('issues a new session for unknown or missing tokens', () => {
            const a = rm.resolveSession(undefined);
            const b = rm.resolveSession('made-up-token');
            expect(a.playerId).not.toBe(b.playerId);
            expect(b.sessionToken).not.toBe('made-up-token');
        });

        it('returns the same player for a known token', () => {
            const first = rm.resolveSession(undefined);
            expect(rm.resolveSession(first.sessionToken)).toEqual(first);
        });

        it('forgets released sessions, but never one whose player still has a seat', () => {
            const lobbyOnly = rm.resolveSession(undefined);
            const seated = rm.resolveSession(undefined);
            rm.createRoom(seated.playerId, 'Seated');

            rm.releaseSession(lobbyOnly.playerId);
            rm.releaseSession(seated.playerId);

            expect(rm.sessionCount).toBe(1);
            expect(rm.resolveSession(lobbyOnly.sessionToken).playerId).not.toBe(lobbyOnly.playerId);
            expect(rm.resolveSession(seated.sessionToken).playerId).toBe(seated.playerId);
        });
    });

    it('keeps a disconnected player seated during the grace period and restores them', () => {
        const room = rm.createRoom('host', 'Host');
        rm.joinRoom(room.id, 'p2', 'Two');
        const onExpire = jest.fn();

        rm.markDisconnected('p2', 60_000, onExpire);
        expect(room.players.find(p => p.id === 'p2')?.connected).toBe(false);

        jest.advanceTimersByTime(30_000);
        expect(rm.markConnected('p2')).toBe(room);
        expect(room.players.find(p => p.id === 'p2')?.connected).toBe(true);

        jest.advanceTimersByTime(60_000);
        expect(onExpire).not.toHaveBeenCalled();
        expect(room.players).toHaveLength(2);
    });

    it('removes the player once the grace period expires', () => {
        const room = rm.createRoom('host', 'Host');
        rm.joinRoom(room.id, 'p2', 'Two');
        const onExpire = jest.fn();

        rm.markDisconnected('p2', 60_000, onExpire);
        jest.advanceTimersByTime(60_000);

        expect(onExpire).toHaveBeenCalledWith(room, room.id);
        expect(room.players.map(p => p.id)).toEqual(['host']);
    });

    it('keeps host rights across a reconnect, and hands them to an online player if the host never returns', () => {
        const room = rm.createRoom('host', 'Host');
        rm.joinRoom(room.id, 'p2', 'Two');
        rm.joinRoom(room.id, 'p3', 'Three');

        rm.markDisconnected('host', 1000, () => {});
        expect(room.hostId).toBe('host');

        rm.markDisconnected('p2', 5000, () => {});
        jest.advanceTimersByTime(1000);
        expect(room.hostId).toBe('p3'); // p2 is offline too, so skip them
        expect(room.players.find(p => p.id === 'p3')?.isHost).toBe(true);
    });

    it('deletes the room when the last player times out', () => {
        const room = rm.createRoom('host', 'Host');
        const onExpire = jest.fn();
        rm.markDisconnected('host', 1000, onExpire);
        jest.advanceTimersByTime(1000);

        expect(onExpire).toHaveBeenCalledWith(null, room.id);
        expect(rm.getRoom(room.id)).toBeUndefined();
    });

    it('lets a player back into a room that is mid-game', () => {
        const room = rm.createRoom('host', 'Host');
        rm.joinRoom(room.id, 'p2', 'Two');
        room.status = 'GAME' as any;

        expect(rm.joinRoom(room.id, 'p2', 'Two')).toBe(room);
        expect(rm.joinRoom(room.id, 'stranger', 'Nope')).toBeNull();
    });

    it('moves a player out of their old room when they join another', () => {
        const first = rm.createRoom('a', 'A');
        rm.joinRoom(first.id, 'b', 'B');
        const second = rm.createRoom('c', 'C');

        rm.joinRoom(second.id, 'b', 'B');
        expect(first.players.map(p => p.id)).toEqual(['a']);
        expect(rm.findRoomByPlayer('b')).toBe(second);
    });
});
