import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

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

        const words = config?.words && Array.isArray(config.words) ? config.words : DEFAULT_WORDS;

        return {
            type: 'mind-reader',
            phase: 'SETUP',
            setupMode: 'AUTO',
            words: {}, // Assigned in startRound
            pairings: [],
            scores,
            guesses: {},
            // Store available words in state or accessible somehow? 
            // Better to store them in game state so startRound can access them.
            availableWords: words
        } as MindReaderState;
    }

    handleAction(state: MindReaderState, senderId: string, action: any, dispatch?: (s: any) => void): MindReaderState | null {
        console.log(`[MindReader] handleAction. Phase: ${state.phase}, Action: ${action.type}, Sender: ${senderId}`);

        // Clone state (optional but safer) or modify direct if performance needed. 
        // Following GamePlugin patterns usually implies treating state as mutable or returning new ref.
        const newState = state; // Direct mutation for simplicity unless deep clone needed.

        if (newState.phase === 'SETUP') {
            console.log('[MindReader] In SETUP phase');
            if (action.type === 'set_mode') {
                newState.setupMode = action.mode;
                return newState;
            }

            if (action.type === 'assign_word') {
                if (newState.setupMode === 'MANUAL') {
                    newState.words[action.targetId] = action.word;
                    return newState;
                }
            }

            if (action.type === 'start_game') {
                console.log('[MindReader] Action is start_game. Starting round...');
                const playerIds = Object.keys(newState.scores);
                console.log('[MindReader] Player IDs:', playerIds);
                return this.startRound(newState, playerIds);
            }
        }

        if (newState.phase === 'PLAYING') {
            if (action.type === 'submit_guess') {
                return this.handleGuess(newState, senderId, action.guess);
            }
        }

        return null;
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
        return state.scores;
    }
}
