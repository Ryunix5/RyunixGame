import { Room, RoomStatus, Player } from '@ryunix/shared';
import { GameRunner } from '../GameRunner';
import { GameRegistry } from '../GameRegistry';
import { SYSTEM_SENDER } from '../GamePlugin';
import { GAME_TIMING } from '../../constants';
import { SplitStealGame } from '../impl/SplitStealGame';
import { TheLastWordGame } from '../impl/TheLastWordGame';
import { UnknownToOneGame } from '../impl/UnknownToOneGame';
import { PrisonersLetterGame } from '../impl/PrisonersLetterGame';
import { MatchingMindsGame } from '../impl/MatchingMindsGame';
import { BlindShapesGame } from '../impl/BlindShapesGame';
import { MindReaderGame } from '../impl/MindReaderGame';

const makeRoom = (...ids: string[]): Room => ({
    id: 'ROOM01',
    hostId: ids[0],
    status: RoomStatus.LOBBY,
    maxPlayers: 8,
    players: ids.map((id, i): Player => ({
        id, name: id.toUpperCase(), isHost: i === 0, isAlive: true, score: 0, roomWins: 0, roomId: 'ROOM01', connected: true
    }))
});

// Mirrors what the server does when a player is removed from a room mid-game
const removePlayer = (runner: GameRunner, room: Room, id: string) => {
    room.players = room.players.filter(p => p.id !== id);
    runner.playerLeft(room, id);
};

describe('GameRunner', () => {
    let registry: GameRegistry;
    let onChange: jest.Mock;
    let runner: GameRunner;

    beforeEach(() => {
        jest.useFakeTimers();
        registry = new GameRegistry();
        [new SplitStealGame(), new TheLastWordGame(), new UnknownToOneGame(), new PrisonersLetterGame(),
            new MatchingMindsGame(), new BlindShapesGame(), new MindReaderGame()].forEach(g => registry.register(g));
        onChange = jest.fn();
        runner = new GameRunner(registry, onChange);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('start', () => {
        it('rejects unknown games and too few players', () => {
            const room = makeRoom('a');
            expect(runner.start(room, 'nope', {})).toBe('Unknown game');
            expect(runner.start(room, 'split-steal', {})).toMatch(/at least 2/);
            expect(room.status).toBe(RoomStatus.LOBBY);
        });

        it('puts the room into GAME and broadcasts', () => {
            const room = makeRoom('a', 'b');
            expect(runner.start(room, 'split-steal', {})).toBeNull();
            expect(room.status).toBe(RoomStatus.GAME);
            expect(room.gameState.type).toBe('split-steal');
            expect(onChange).toHaveBeenCalledWith(room);
        });
    });

    describe('Split/Steal auto-advance', () => {
        it('advances to the next round after the reveal delay', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'split-steal', {});
            runner.handleAction(room, 'a', { type: 'decision', value: 'split' });
            runner.handleAction(room, 'b', { type: 'decision', value: 'steal' });
            expect(room.gameState.phase).toBe('REVEAL');

            jest.advanceTimersByTime(GAME_TIMING.SPLIT_STEAL_REVEAL_DELAY);
            expect(room.gameState.phase).toBe('DECISION');
            expect(room.gameState.round).toBe(2);
            expect(room.gameState.trustPoints).toEqual({ a: 1, b: 5 });
        });

        it('does not let a player skip the reveal', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'split-steal', {});
            runner.handleAction(room, 'a', { type: 'decision', value: 'split' });
            runner.handleAction(room, 'b', { type: 'decision', value: 'split' });
            runner.handleAction(room, 'a', { type: 'next_round' });
            expect(room.gameState.phase).toBe('REVEAL');
        });

        it('reaches the results screen after the last round', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'split-steal', {});
            for (let round = 0; round < 4; round++) {
                runner.handleAction(room, 'a', { type: 'decision', value: 'steal' });
                runner.handleAction(room, 'b', { type: 'decision', value: 'split' });
                jest.advanceTimersByTime(GAME_TIMING.SPLIT_STEAL_REVEAL_DELAY);
            }
            expect(room.status).toBe(RoomStatus.RESULTS);
            expect(room.gameState.results).toEqual({ a: 100, b: 0 });
            expect(room.players.find(p => p.id === 'a')?.roomWins).toBe(1);
        });

        it('drops pending timers when the game is stopped', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'split-steal', {});
            runner.handleAction(room, 'a', { type: 'decision', value: 'split' });
            runner.handleAction(room, 'b', { type: 'decision', value: 'split' });

            runner.stop(room.id);
            jest.advanceTimersByTime(GAME_TIMING.SPLIT_STEAL_REVEAL_DELAY);
            expect(room.gameState.phase).toBe('REVEAL');
        });

        it('lets the spectator step in when a player leaves mid-decision', () => {
            const room = makeRoom('a', 'b', 'c', 'd', 'e');
            runner.start(room, 'split-steal', {});
            const state = room.gameState;
            state.pairings = [['a', 'b'], ['c', 'd']];
            state.spectatorId = 'e';

            runner.handleAction(room, 'a', { type: 'decision', value: 'split' });
            removePlayer(runner, room, 'b');

            expect(state.pairings).toEqual([['c', 'd'], ['a', 'e']]);
            expect(state.spectatorId).toBeUndefined();
            expect(state.decisions.a).toBeUndefined(); // New opponent, so a decides again
        });

        it('reveals once the only undecided player leaves', () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'split-steal', {});
            room.gameState.pairings = [['a', 'b'], ['c', 'd']];
            ['a', 'b', 'c'].forEach(id => runner.handleAction(room, id, { type: 'decision', value: 'split' }));

            removePlayer(runner, room, 'd');
            expect(room.gameState.phase).toBe('REVEAL');
            expect(room.gameState.spectatorId).toBe('c');
        });
    });

    describe('The Last Word thinking timer', () => {
        it('takes a life from players who did not answer in time', () => {
            const room = makeRoom('a', 'b', 'c');
            runner.start(room, 'the-last-word', {});
            runner.handleAction(room, 'a', { type: 'set_topic', topic: 'Fruits' });
            runner.handleAction(room, 'a', { type: 'submit_answer', text: 'Apple' });

            jest.advanceTimersByTime(GAME_TIMING.THINKING_PHASE_DURATION);
            expect(room.gameState.phase).toBe('REVIEW');
            expect(room.gameState.lives).toEqual({ a: 3, b: 2, c: 2 });
        });

        it('ignores a timer left over from an earlier topic', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'the-last-word', {});
            runner.handleAction(room, 'a', { type: 'set_topic', topic: 'Fruits' });
            runner.handleAction(room, 'a', { type: 'submit_answer', text: 'Apple' });
            runner.handleAction(room, 'b', { type: 'submit_answer', text: 'Pear' });
            expect(room.gameState.phase).toBe('REVIEW');

            jest.advanceTimersByTime(2000);
            runner.handleAction(room, 'a', { type: 'set_topic', topic: 'Colors' });
            jest.advanceTimersByTime(GAME_TIMING.THINKING_PHASE_DURATION - 2000); // first timer fires
            expect(room.gameState.phase).toBe('THINKING');
            expect(room.gameState.lives).toEqual({ a: 3, b: 3 });

            jest.advanceTimersByTime(2000); // second timer fires
            expect(room.gameState.phase).toBe('REVIEW');
            expect(room.gameState.lives).toEqual({ a: 2, b: 2 });
        });

        it('rejects answers that are too long', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'the-last-word', {});
            runner.handleAction(room, 'a', { type: 'set_topic', topic: 'Fruits' });
            runner.handleAction(room, 'b', { type: 'submit_answer', text: 'x'.repeat(5000) });
            expect(room.gameState.pendingAnswers).toHaveLength(0);
        });

        it('only lets the host set topics or deduct lives', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'the-last-word', {});
            runner.handleAction(room, 'b', { type: 'set_topic', topic: 'Fruits' });
            expect(room.gameState.phase).toBe('SETUP');
            runner.handleAction(room, 'b', { type: 'deduct_life', targetId: 'a' });
            expect(room.gameState.lives.a).toBe(3);
        });

        it('cannot be triggered by a player pretending to be the system', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'the-last-word', {});
            runner.handleAction(room, 'a', { type: 'set_topic', topic: 'Fruits' });
            runner.handleAction(room, 'b', { type: 'thinking_timeout', round: room.gameState.round });
            expect(room.gameState.phase).toBe('THINKING');
            expect(SYSTEM_SENDER).not.toBe('b');
        });
    });

    describe('players leaving mid-game', () => {
        it('ends the game when too few players remain', () => {
            const room = makeRoom('a', 'b', 'c');
            runner.start(room, 'unknown-to-one', {});
            removePlayer(runner, room, 'c');
            expect(room.status).toBe(RoomStatus.RESULTS);
            expect(Object.keys(room.gameState.results).sort()).toEqual(['a', 'b']);
        });

        it('Unknown to One: voids the round if the blackened player leaves', () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'unknown-to-one', {});
            runner.handleAction(room, 'a', { type: 'set_word', word: 'Pizza' });
            const blackened = room.gameState.blackenedId;

            removePlayer(runner, room, blackened);
            expect(room.gameState.phase).toBe('REVEAL');
        });

        it('Unknown to One: finishes voting when the last voter leaves', () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'unknown-to-one', {});
            runner.handleAction(room, 'a', { type: 'set_word', word: 'Pizza' });
            const state = room.gameState;
            const blackened = state.blackenedId;
            const innocents = ['a', 'b', 'c', 'd'].filter(id => id !== blackened);
            state.phase = 'VOTING';

            // Everyone but one innocent votes for the blackened player
            [blackened, innocents[0], innocents[1]].forEach(id =>
                runner.handleAction(room, id, { type: 'vote', targetId: id === blackened ? innocents[0] : blackened }));
            expect(state.phase).toBe('VOTING');

            removePlayer(runner, room, innocents[2]);
            expect(state.phase).toBe('BONUS_GUESS');
        });

        it('Unknown to One: skips to the next speaker when the current one leaves', () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'unknown-to-one', {});
            runner.handleAction(room, 'a', { type: 'set_word', word: 'Pizza' });
            const state = room.gameState;
            const [first, second] = state.turnOrder;
            const leaver = first === state.blackenedId ? second : first;
            const speakerBefore = state.turnOrder[state.currentTurnIndex];

            removePlayer(runner, room, leaver);
            if (speakerBefore === leaver) {
                expect(state.turnOrder[state.currentTurnIndex]).not.toBe(leaver);
            }
            expect(state.turnOrder).not.toContain(leaver);
        });

        it("Prisoners' Letter: reads another letter if the author leaves mid-vote", () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'prisoners-letter', {});
            ['a', 'b', 'c', 'd'].forEach(id => runner.handleAction(room, id, { type: 'submit_message', message: `from ${id}` }));
            const author = room.gameState.currentReaderId;

            removePlayer(runner, room, author);
            expect(room.gameState.phase).toBe('VOTING');
            expect(room.gameState.currentReaderId).not.toBe(author);
            expect(room.gameState.currentMessage).not.toBe(`from ${author}`);
        });

        it("Prisoners' Letter: starts reading once the last writer leaves", () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'prisoners-letter', {});
            ['a', 'b', 'c'].forEach(id => runner.handleAction(room, id, { type: 'submit_message', message: `from ${id}` }));
            removePlayer(runner, room, 'd');
            expect(room.gameState.phase).toBe('VOTING');
        });

        it('Matching Minds: reveals once the last player to submit leaves', () => {
            const room = makeRoom('a', 'b', 'c');
            runner.start(room, 'matching-minds', {});
            runner.handleAction(room, 'a', { type: 'submit_word', word: 'sea' });
            runner.handleAction(room, 'b', { type: 'submit_word', word: 'ocean' });
            removePlayer(runner, room, 'c');
            expect(room.gameState.phase).toBe('REVEALING');
            expect(room.gameState.rounds[0].submissions).toHaveLength(2);
        });

        it('Matching Minds: ignores client-supplied player counts and names', () => {
            const room = makeRoom('a', 'b', 'c');
            runner.start(room, 'matching-minds', {});
            runner.handleAction(room, 'a', { type: 'submit_word', word: 'sea', playerCount: 1, playerName: 'Fake' });
            expect(room.gameState.phase).toBe('SUBMITTING');
            expect(room.gameState.submissions.a.playerName).toBe('A');
        });

        it('Deceiving Cards: resolves the round once the last guesser leaves', () => {
            const room = makeRoom('a', 'b', 'c', 'd');
            runner.start(room, 'deceiving-cards', {});
            const state = room.gameState;
            ['a', 'b', 'c'].forEach(id => runner.handleAction(room, id, { type: 'guess', suit: state.suits[id] }));

            removePlayer(runner, room, 'd');
            expect(state.round).toBe(2);
            expect(state.eliminated).toEqual([]);
        });

        it('Mind Reader: ends when no pairs are left', () => {
            const room = makeRoom('a', 'b', 'c');
            runner.start(room, 'mind-reader', {});
            runner.handleAction(room, 'a', { type: 'start_game' });
            const pairedIds: string[] = room.gameState.pairings[0];

            removePlayer(runner, room, pairedIds[0]);
            expect(room.status).toBe(RoomStatus.RESULTS);
        });

        it('Mind Reader: only the host can run setup', () => {
            const room = makeRoom('a', 'b');
            runner.start(room, 'mind-reader', {});
            runner.handleAction(room, 'b', { type: 'start_game' });
            expect(room.gameState.phase).toBe('SETUP');
        });
    });
});
