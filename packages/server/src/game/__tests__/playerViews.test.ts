import { Player } from '@ryunix/shared';
import { HIDDEN } from '../GamePlugin';
import { SplitStealGame } from '../impl/SplitStealGame';
import { UnknownToOneGame } from '../impl/UnknownToOneGame';
import { MindReaderGame } from '../impl/MindReaderGame';
import { BlindShapesGame } from '../impl/BlindShapesGame';
import { PrisonersLetterGame } from '../impl/PrisonersLetterGame';
import { TheLastWordGame } from '../impl/TheLastWordGame';
import { MatchingMindsGame } from '../impl/MatchingMindsGame';

const makePlayers = (...ids: string[]): Player[] => ids.map((id, i) => ({
    id,
    name: `Player ${id}`,
    isHost: i === 0,
    isAlive: true,
    roomWins: 0,
    roomId: 'ROOM',
    connected: true
}));

const ctx = { hostId: 'a', schedule: jest.fn() };

describe('getPlayerView', () => {
    it('Split/Steal hides opponent decisions until reveal', () => {
        const game = new SplitStealGame();
        const state = game.setup(makePlayers('a', 'b'));
        game.handleAction(state, 'a', { type: 'decision', value: 'steal' }, ctx);

        const viewB = game.getPlayerView(state, 'b');
        expect(viewB.decisions).toEqual({ a: HIDDEN });
        expect(game.getPlayerView(state, 'a').decisions).toEqual({ a: 'steal' });
        expect(state.decisions.a).toBe('steal'); // real state untouched

        game.handleAction(state, 'b', { type: 'decision', value: 'split' }, ctx);
        expect(state.phase).toBe('REVEAL');
        expect(game.getPlayerView(state, 'b').decisions).toEqual({ a: 'steal', b: 'split' });
    });

    it('Unknown to One hides the word from the blackened and the role from everyone else', () => {
        const game = new UnknownToOneGame();
        const state = game.setup(makePlayers('a', 'b', 'c'));
        game.handleAction(state, 'a', { type: 'set_word', word: 'Pizza' }, ctx);
        const blackened = state.blackenedId!;
        const other = ['a', 'b', 'c'].find(id => id !== blackened)!;

        const blackView = game.getPlayerView(state, blackened);
        expect(blackView.secretWord).toBeUndefined();
        expect(blackView.blackenedId).toBe(blackened);

        const otherView = game.getPlayerView(state, other);
        expect(otherView.secretWord).toBe('Pizza');
        expect(otherView.blackenedId).toBeUndefined();

        // Once caught, everyone learns who it was but the blackened still has to guess the word
        state.phase = 'BONUS_GUESS';
        expect(game.getPlayerView(state, other).blackenedId).toBe(blackened);
        expect(game.getPlayerView(state, blackened).secretWord).toBeUndefined();

        state.phase = 'REVEAL';
        expect(game.getPlayerView(state, blackened).secretWord).toBe('Pizza');
    });

    it('Mind Reader only shows a player their own word', () => {
        const game = new MindReaderGame();
        const state = game.setup(makePlayers('a', 'b'));
        game.handleAction(state, 'a', { type: 'start_game' }, ctx);

        expect(Object.keys(game.getPlayerView(state, 'b', ctx).words)).toEqual(['b']);
        expect(Object.keys(game.getPlayerView(state, 'a', ctx).words)).toEqual(['a']);
    });

    it('Mind Reader lets the host see words during manual setup', () => {
        const game = new MindReaderGame();
        const state = game.setup(makePlayers('a', 'b'));
        game.handleAction(state, 'a', { type: 'set_mode', mode: 'MANUAL' }, ctx);
        game.handleAction(state, 'a', { type: 'assign_word', targetId: 'b', word: 'Moon' }, ctx);

        expect(game.getPlayerView(state, 'a', ctx).words).toEqual({ b: 'Moon' });
        expect(game.getPlayerView(state, 'b', ctx).words).toEqual({ b: 'Moon' });
    });

    it('Deceiving Cards hides your own suit and others\' guesses', () => {
        const game = new BlindShapesGame();
        const state = game.setup(makePlayers('a', 'b', 'c'));
        game.handleAction(state, 'b', { type: 'guess', suit: '♠️' });

        const view = game.getPlayerView(state, 'a');
        expect(view.suits.a).toBe(HIDDEN);
        expect(view.suits.b).toBe(state.suits.b);
        expect(view.guesses).toEqual({ b: HIDDEN });
        expect(state.suits.a).not.toBe(HIDDEN);
    });

    it('Prisoners\' Letter keeps the author anonymous until the reveal', () => {
        const game = new PrisonersLetterGame();
        const state = game.setup(makePlayers('a', 'b', 'c'));
        game.handleAction(state, 'a', { type: 'submit_message', message: 'from a' });
        game.handleAction(state, 'b', { type: 'submit_message', message: 'from b' });
        expect(game.getPlayerView(state, 'c').messages).toEqual({});
        game.handleAction(state, 'c', { type: 'submit_message', message: 'from c' });
        expect(state.phase).toBe('VOTING');

        const author = state.currentReaderId!;
        const reader = ['a', 'b', 'c'].find(id => id !== author)!;
        const view = game.getPlayerView(state, reader);
        expect(view.currentReaderId).toBeUndefined();
        expect(view.currentMessage).toBe(state.currentMessage);
        expect(Object.keys(view.messages)).toEqual([reader]);
        expect(game.getPlayerView(state, author).currentReaderId).toBe(author);
    });

    it('The Last Word hides pending answers while players are thinking', () => {
        jest.useFakeTimers();
        const game = new TheLastWordGame();
        const state = game.setup(makePlayers('a', 'b', 'c'));
        game.handleAction(state, 'a', { type: 'set_topic', topic: 'Fruits' }, ctx);
        game.handleAction(state, 'b', { type: 'submit_answer', text: 'Mango' }, ctx);

        const view = game.getPlayerView(state, 'c');
        expect(view.pendingAnswers).toHaveLength(1);
        expect(view.pendingAnswers[0].text).toBe(HIDDEN);
        expect(game.getPlayerView(state, 'b').pendingAnswers[0].text).toBe('Mango');
        jest.useRealTimers();
    });

    it('Matching Minds hides words until everyone has submitted', () => {
        const game = new MatchingMindsGame();
        const state = game.setup(makePlayers('a', 'b'));
        game.handleAction(state, 'a', { type: 'submit_word', word: 'ocean', playerName: 'A', playerCount: 2 });

        expect(game.getPlayerView(state, 'b').submissions.a.word).toBe(HIDDEN);
        expect(game.getPlayerView(state, 'a').submissions.a.word).toBe('ocean');

        game.handleAction(state, 'b', { type: 'submit_word', word: 'sea', playerName: 'B', playerCount: 2 });
        expect(game.getPlayerView(state, 'b').submissions.a.word).toBe('ocean');
    });
});
