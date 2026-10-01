import { Player, getGameInfo } from '@ryunix/shared';
import { GameContext, GamePlugin, GameState, PlayerViewContext } from '../GamePlugin';
import { packageLoader } from '../../services/PackageLoader';
import { cleanText } from '../gameUtils';

interface MindReaderState extends GameState {
    phase: 'SETUP' | 'PLAYING' | 'GAME_OVER';
    setupMode: 'AUTO' | 'MANUAL';
    words: { [playerId: string]: string };
    pairings: string[][]; // Array of [p1Id, p2Id]
    scores: { [playerId: string]: number };
    guesses: { [guesserId: string]: string[] };
    winnerIds?: string[];
}

const DEFAULT_WORDS = [
    'Apple', 'Banana', 'Carrot', 'Dog', 'Elephant', 'Ferrari', 'Guitar', 'House',
    'Ice Cream', 'Jungle', 'Kangaroo', 'Lemon', 'Moon', 'Ninja', 'Octopus',
    'Pizza', 'Queen', 'Robot', 'Sun', 'Tiger', 'Umbrella', 'Violin', 'Watermelon',
    'Xylophone', 'Yacht', 'Zebra'
];

export class MindReaderGame implements GamePlugin {
    id = 'mind-reader';
    name = "Mind Reader";
    minPlayers = 2;
    maxPlayers = 10;

    setup(players: Player[], config?: any): MindReaderState {
        const scores: { [id: string]: number } = {};
        players.forEach(p => scores[p.id] = 0);

        // Load from specific package if provided
        const packageId = config?.packageId;
        const words = packageLoader.getWords(getGameInfo(this.id)!.contentKind!, packageId);

        const finalWords = words.length > 0 ? words : DEFAULT_WORDS;

        return {
            type: 'mind-reader',
            phase: 'SETUP',
            setupMode: 'AUTO',
            words: {},
            pairings: [],
            scores,
            guesses: {},
            availableWords: finalWords
        } as MindReaderState;
    }

    getPlayerView(state: MindReaderState, viewerId: string, ctx: PlayerViewContext): MindReaderState {
        if (state.phase === 'GAME_OVER') return state;
        // During manual setup the host is assigning words, so they need to see them all
        if (state.phase === 'SETUP' && viewerId === ctx.hostId) return state;
        const words = state.words[viewerId] !== undefined ? { [viewerId]: state.words[viewerId] } : {};
        return { ...state, words };
    }

    handleAction(state: MindReaderState, senderId: string, action: any, ctx: GameContext): MindReaderState | null {
        if (state.phase === 'SETUP') {
            if (senderId !== ctx.hostId) return null; // The host runs setup

            if (action.type === 'set_mode' && (action.mode === 'AUTO' || action.mode === 'MANUAL')) {
                state.setupMode = action.mode;
                return state;
            }

            if (action.type === 'assign_word') {
                const word = cleanText(action.word);
                if (state.setupMode === 'MANUAL' && action.targetId in state.scores && word) {
                    state.words[action.targetId] = word;
                    return state;
                }
            }

            if (action.type === 'start_game') {
                return this.startRound(state, Object.keys(state.scores));
            }
        }

        if (state.phase === 'PLAYING') {
            const guess = cleanText(action.guess);
            if (action.type === 'submit_guess' && guess) {
                return this.handleGuess(state, senderId, guess);
            }
        }

        return null;
    }

    onPlayerLeave(state: MindReaderState, playerId: string): MindReaderState {
        delete state.scores[playerId];
        delete state.words[playerId];
        delete state.guesses[playerId];
        // Their partner is left without anyone to read; they sit out
        state.pairings = state.pairings.filter(p => !p.includes(playerId));
        if (state.phase === 'PLAYING' && state.pairings.length === 0) {
            state.phase = 'GAME_OVER';
            state.winnerIds = [];
        }
        return state;
    }

    private startRound(state: MindReaderState, playerIds: string[]): MindReaderState {
        // 1. Pair players
        state.pairings = [];
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

        while (shuffled.length >= 2) {
            const p1 = shuffled.pop()!;
            const p2 = shuffled.pop()!;
            state.pairings.push([p1, p2]);
        }

        // 2. Assign Words
        const wordList = (state as any).availableWords || DEFAULT_WORDS;
        if (state.setupMode === 'AUTO') {
            state.pairings.forEach(pair => {
                const w1 = wordList[Math.floor(Math.random() * wordList.length)];
                const w2 = wordList[Math.floor(Math.random() * wordList.length)];
                state.words[pair[0]] = w1;
                state.words[pair[1]] = w2;
            });
        }
        if (state.setupMode === 'MANUAL') {
            state.pairings.forEach(pair => {
                if (!state.words[pair[0]]) state.words[pair[0]] = "Mystery";
                if (!state.words[pair[1]]) state.words[pair[1]] = "Mystery";
            });
        }

        state.phase = 'PLAYING';
        return state;
    }

    private handleGuess(state: MindReaderState, guesserId: string, guess: string): MindReaderState | null {
        // Find opponent
        const pair = state.pairings.find(p => p.includes(guesserId));
        if (!pair) return null;

        const opponentId = pair.find(id => id !== guesserId);
        if (!opponentId) return null;

        const targetWord = state.words[opponentId];
        if (!targetWord) return null;

        // Record guess
        if (!state.guesses[guesserId]) state.guesses[guesserId] = [];
        state.guesses[guesserId].push(guess);

        // Check Match
        if (guess.trim().toLowerCase() === targetWord.toLowerCase()) {
            state.scores[guesserId] = (state.scores[guesserId] || 0) + 1;
            state.winnerIds = [guesserId]; // Basic win condition
            state.phase = 'GAME_OVER';
        }

        return state;
    }

    isComplete(state: MindReaderState): boolean {
        return !!state.winnerIds;
    }

    resolve(state: MindReaderState, players: Player[]): { [playerId: string]: number } {
        const finalScores: { [id: string]: number } = {};
        Object.keys(state.scores).forEach(id => {
            finalScores[id] = Math.min(state.scores[id] * 100, 100);
        });
        return finalScores;
    }
}
