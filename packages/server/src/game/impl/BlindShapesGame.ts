import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

type Suit = '♠️' | '♥️' | '♦️' | '♣️';

interface BlindShapesState extends GameState {
    round: number;
    suits: { [playerId: string]: Suit };
    guesses: { [playerId: string]: Suit }; // Store guesses for the current round
    eliminated: string[]; // IDs
    winnerIds?: string[]; // Last 2 standing
    history: string[]; // Log of events
}

export class BlindShapesGame implements GamePlugin {
    id = 'deceiving-cards';
    name = 'Deceiving Cards';
    minPlayers = 3;
    maxPlayers = 10;

    private readonly SUITS: Suit[] = ['♠️', '♥️', '♦️', '♣️'];

    setup(players: Player[], config?: any): BlindShapesState {
        const suits: { [id: string]: Suit } = {};
        players.forEach(p => {
            suits[p.id] = this.getRandomSuit();
        });

        return {
            type: 'deceiving-cards',
            round: 1,
            suits,
            guesses: {},
            eliminated: [],
            history: []
        };
    }

    handleAction(state: BlindShapesState, senderId: string, action: any, dispatch?: (s: any) => void): BlindShapesState | null {
        if (state.winnerIds) return null;
        if (state.eliminated.includes(senderId)) return null;

        // ACTION: GUESS
        if (action.type === 'guess') {
            if (state.guesses[senderId]) return null; // Already guessed this round

            state.guesses[senderId] = action.suit;

            // Check if all active players have guessed
            const activePlayers = Object.keys(state.suits).filter(id => !state.eliminated.includes(id));
            const allGuessed = activePlayers.every(id => state.guesses[id]);

            if (allGuessed) {
                this.resolveRound(state);
            }
            return state;
        }

        return state;
    }

    private resolveRound(state: BlindShapesState) {
        state.history.push(`Round ${state.round} Complete`);

        const activePlayers = Object.keys(state.suits).filter(id => !state.eliminated.includes(id));

        activePlayers.forEach(pid => {
            const guess = state.guesses[pid];
            const actual = state.suits[pid];

            if (guess === actual) {
                // Correct
                // Assign NEW suit
                state.suits[pid] = this.getRandomSuit();
            } else {
                // Wrong -> Eliminated
                state.eliminated.push(pid);
                state.history.push(`Player ${pid} eliminated (Guessed ${guess}, was ${actual})`);
            }
        });

        // Clear guesses for next round
        state.guesses = {};
        state.round++;

        this.checkWin(state);
    }

    private checkWin(state: BlindShapesState): boolean {
        const aliveCount = Object.keys(state.suits).length - state.eliminated.length;
        if (aliveCount <= 2) {
            // Winners are the ones NOT eliminated
            const allIds = Object.keys(state.suits);
            state.winnerIds = allIds.filter(id => !state.eliminated.includes(id));
            if (state.winnerIds.length === 0) {
                // Fallback if everyone dies
                state.winnerIds = [];
            }
            return true;
        }
        return false;
    }

    private getRandomSuit(): Suit {
        return this.SUITS[Math.floor(Math.random() * this.SUITS.length)];
    }

    isComplete(state: BlindShapesState): boolean {
        return !!state.winnerIds;
    }

    resolve(state: BlindShapesState, players: Player[]): { [playerId: string]: number } {
        const scores: { [id: string]: number } = {};
        players.forEach(p => {
            if (state.winnerIds?.includes(p.id)) {
                scores[p.id] = 100;
            } else {
                scores[p.id] = -50;
            }
        });
        return scores;
    }
}
