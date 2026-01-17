import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

interface TheLastWordState extends GameState {
    lives: { [playerId: string]: number };
    currentTopic: string;
    answers: Array<{ playerId: string; text: string; timestamp: number }>;
    challenge: {
        active: boolean;
        challengerId?: string;
        targetId?: string; // Who gave the answer
        answerText?: string;
        votes: { [playerId: string]: 'valid' | 'invalid' }; // Votes from others
        startTime?: number;
    } | null;
    round: number;
    phase: 'SETUP' | 'THINKING' | 'REVIEW'; // NEW PHASES
    pendingAnswers: Array<{ playerId: string; text: string; timestamp: number }>; // Hidden answers
    timerEndTime?: number;
    winner?: string;
}

export class TheLastWordGame implements GamePlugin {
    id = 'the-last-word';
    name = 'The Last Word';
    minPlayers = 2; // Needs at least 2 to challenge
    maxPlayers = 16;

    private topics = [
        "Fruits", "Countries", "Movies from the 90s", "Programming Languages",
        "Pizza Toppings", "Superheroes", "Board Games", "Capital Cities",
        "Brands of Cars", "Animals that lay eggs", "Things that are red",
        "Musical Instruments", "Sports", "Video Game Consoles"
    ];

    private emitState?: (state: TheLastWordState) => void;

    setup(players: Player[], config?: any, emitState?: (state: any) => void): TheLastWordState {
        this.emitState = emitState;
        const lives: { [id: string]: number } = {};
        players.forEach(p => lives[p.id] = 3); // 3 Lives

        return {
            type: 'the-last-word',
            lives,
            currentTopic: "Waiting for Host...",
            answers: [],
            challenge: null,
            round: 1,
            phase: 'SETUP', // SETUP -> THINKING -> REVIEW
            pendingAnswers: []
        } as TheLastWordState;
    }

    handleAction(state: TheLastWordState, senderId: string, action: any, dispatch?: (s: any) => void): TheLastWordState | null {
        if (state.winner) return null;

        // ACTION: SET_TOPIC (Host Only - enforced by UI, assumed valid here)
        if (action.type === 'set_topic') {
            state.currentTopic = action.topic || "Unknown Topic";
            state.answers = []; // Reset answers on new topic
            state.round++;
            state.challenge = null;
            state.phase = 'THINKING'; // Enable input for players

            // Set 5-second timer - deduct life from players who don't answer
            state.timerEndTime = Date.now() + 5000;
            const answeredPlayers = new Set<string>();

            setTimeout(() => {
                // If already in REVIEW (all players submitted early), don't clear answers
                if (state.phase === 'REVIEW') {
                    return;
                }

                // Reveal pending answers when timer expires
                state.answers = [...state.pendingAnswers];
                state.pendingAnswers = [];

                // Collect who answered
                const answeredPlayers = new Set<string>();
                state.answers.forEach(a => answeredPlayers.add(a.playerId));

                // Deduct life from non-responders
                Object.keys(state.lives).forEach(pid => {
                    if (state.lives[pid] > 0 && !answeredPlayers.has(pid)) {
                        state.lives[pid]--;
                    }
                });

                state.phase = 'REVIEW';
                delete state.timerEndTime;
                if (dispatch) dispatch(state);
            }, 5000);

            return state;
        }

        // Allow Host actions even if eliminated
        if (state.lives[senderId] <= 0 &&
            action.type !== 'set_topic' &&
            action.type !== 'deduct_life' &&
            action.type !== 'judge_challenge') {
            return null;
        }


        // ACTION: SUBMIT_ANSWER
        if (action.type === 'submit_answer') {
            if (state.challenge?.active) return null;
            if (!action.text) return null;
            if (state.phase !== 'THINKING') return null; // Only during active round

            // Add to pending (hidden) answers
            state.pendingAnswers.push({
                playerId: senderId,
                text: action.text,
                timestamp: Date.now()
            });

            // Check if all alive players have submitted
            const alivePlayers = Object.entries(state.lives)
                .filter(([_, lives]) => lives > 0)
                .map(([id]) => id);

            const submittedPlayers = new Set(state.pendingAnswers.map(a => a.playerId));

            // If all alive players submitted, reveal answers
            if (alivePlayers.every(id => submittedPlayers.has(id))) {
                state.answers = [...state.pendingAnswers];
                state.pendingAnswers = [];
                state.phase = 'REVIEW';
                delete state.timerEndTime;
            }

            return state;
        }

        // ACTION: CHALLENGE (Pauses game, waits for Host)
        if (action.type === 'challenge') {
            if (state.challenge?.active) return null;
            const targetAnswer = state.answers.find(a => a.text === action.answerText);
            if (!targetAnswer) return null;

            state.challenge = {
                active: true,
                challengerId: senderId,
                targetId: targetAnswer.playerId,
                answerText: action.answerText,
                votes: {},
                startTime: Date.now()
            };
            return state;
        }

        // ACTION: JUDGE_CHALLENGE (Host Only)
        if (action.type === 'judge_challenge') {
            if (!state.challenge?.active) return null;

            const verdict = action.verdict; // 'valid' | 'invalid'

            if (verdict === 'valid') {
                // Challenge Failed -> Challenger loses life (Answer was Valid)
                if (state.lives[state.challenge.challengerId!] > 0) {
                    state.lives[state.challenge.challengerId!]--;
                }
            } else {
                // Challenge Succeeded -> Target loses life (Answer was Invalid)
                if (state.lives[state.challenge.targetId!] > 0) {
                    state.lives[state.challenge.targetId!]--;
                }
            }

            state.challenge = null;
            return state;
        }

        // ACTION: MANUAL_DEDUCT (Host Only)
        if (action.type === 'deduct_life') {
            const targetId = action.targetId;
            if (state.lives[targetId] > 0) {
                state.lives[targetId]--;
            }
            return state;
        }

        return state;
    }

    private resolveChallenge(state: TheLastWordState) {
        // Deprecated
    }

    private getRandomTopic(): string {
        // Deprecated
        return "";
    }

    private endThinkingPhase(state: TheLastWordState, dispatch?: (s: any) => void) {
        // Move pending answers to main answers
        state.answers = [...state.pendingAnswers];
        state.pendingAnswers = [];
        state.phase = 'REVIEW';
        delete state.timerEndTime;

        // Emit updated state
        if (dispatch) {
            dispatch(state);
        }
    }

    isComplete(state: TheLastWordState): boolean {
        // Winner if only 1 player has lives > 0
        const alive = Object.entries(state.lives).filter(([_, lives]) => lives > 0);
        if (alive.length <= 1) {
            if (alive.length === 1) state.winner = alive[0][0];
            return true;
        }
        return false;
    }

    resolve(state: TheLastWordState, players: Player[]): { [playerId: string]: number } {
        // Assign scores based on lives? Or just winner 100, others 0?
        // Let's give points per life remaining.
        const scores: { [id: string]: number } = {};
        players.forEach(p => {
            const lives = state.lives[p.id] || 0;
            if (lives > 0) scores[p.id] = lives * 10;
            if (state.winner === p.id) scores[p.id] += 50; // Bonus for winning
        });
        return scores;
    }
}
