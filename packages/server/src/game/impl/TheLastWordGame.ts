import { Player } from '@ryunix/shared';
import { GameContext, GamePlugin, GameState, HIDDEN, SYSTEM_SENDER } from '../GamePlugin';
import { GAME_TIMING } from '../../constants';
import { packageLoader } from '../../services/PackageLoader';

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
    selectedPackages: string[]; // Package IDs to use
}

export class TheLastWordGame implements GamePlugin {
    id = 'the-last-word';
    name = 'The Last Word';
    minPlayers = 2; // Needs at least 2 to challenge
    maxPlayers = 16;

    private getRandomTopic(state: TheLastWordState): string {
        // Get package ID from state or use all topics as fallback
        const packageId = (state as any).packageId;
        const topics = packageId
            ? packageLoader.getTopicsFromPackage(packageId)
            : packageLoader.getAllTopics();

        // Fallback to basic topics if no packages loaded
        if (topics.length === 0) {
            const fallback = ["Fruits", "Countries", "Sports", "Movies", "Colors"];
            return fallback[Math.floor(Math.random() * fallback.length)];
        }

        return topics[Math.floor(Math.random() * topics.length)]
            ;
    }

    setup(players: Player[], config?: any): TheLastWordState {
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
            pendingAnswers: [],
            selectedPackages: ['general', 'pop-culture', 'geography', 'food'], // All by default
            packageId: config?.packageId
        } as TheLastWordState;
    }

    getPlayerView(state: TheLastWordState, viewerId: string): TheLastWordState {
        // Keep answers secret while players are still thinking; the count stays visible
        return {
            ...state,
            pendingAnswers: state.pendingAnswers.map(a => a.playerId === viewerId ? a : { ...a, text: HIDDEN }),
        };
    }

    handleAction(state: TheLastWordState, senderId: string, action: any, ctx: GameContext): TheLastWordState | null {
        if (state.winner) return null;

        const hostOnly = ['set_topic', 'judge_challenge', 'deduct_life'];
        if (hostOnly.includes(action.type) && senderId !== ctx.hostId) return null;

        // ACTION: SET_TOPIC
        if (action.type === 'set_topic') {
            if (state.phase === 'THINKING') return null;
            state.currentTopic = action.topic || this.getRandomTopic(state);
            state.answers = []; // Reset answers on new topic
            state.round++;
            state.challenge = null;
            state.phase = 'THINKING'; // Enable input for players

            // Anyone who hasn't answered when the timer runs out loses a life
            state.timerEndTime = Date.now() + GAME_TIMING.THINKING_PHASE_DURATION;
            ctx.schedule(GAME_TIMING.THINKING_PHASE_DURATION, { type: 'thinking_timeout', round: state.round });
            return state;
        }

        if (action.type === 'thinking_timeout') {
            // Ignore timers from an earlier round or ones that finished early because everyone answered
            if (senderId !== SYSTEM_SENDER || state.phase !== 'THINKING' || action.round !== state.round) return null;

            const answered = new Set(state.pendingAnswers.map(a => a.playerId));
            Object.keys(state.lives).forEach(pid => {
                if (state.lives[pid] > 0 && !answered.has(pid)) {
                    state.lives[pid]--;
                }
            });
            this.endThinkingPhase(state);
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
            if (!action.text || typeof action.text !== 'string') return null;
            if (state.phase !== 'THINKING') return null; // Only during active round
            if (state.pendingAnswers.some(a => a.playerId === senderId)) return null; // One answer each

            // Add to pending (hidden) answers
            state.pendingAnswers.push({
                playerId: senderId,
                text: action.text,
                timestamp: Date.now()
            });

            this.endThinkingIfAllAnswered(state);
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

    onPlayerLeave(state: TheLastWordState, playerId: string): TheLastWordState {
        delete state.lives[playerId];
        state.pendingAnswers = state.pendingAnswers.filter(a => a.playerId !== playerId);
        if (state.challenge && (state.challenge.challengerId === playerId || state.challenge.targetId === playerId)) {
            state.challenge = null;
        }
        if (state.phase === 'THINKING') this.endThinkingIfAllAnswered(state);
        return state;
    }

    private endThinkingIfAllAnswered(state: TheLastWordState) {
        const answered = new Set(state.pendingAnswers.map(a => a.playerId));
        const alive = Object.keys(state.lives).filter(id => state.lives[id] > 0);
        if (alive.every(id => answered.has(id))) this.endThinkingPhase(state);
    }

    private endThinkingPhase(state: TheLastWordState) {
        state.answers = [...state.pendingAnswers];
        state.pendingAnswers = [];
        state.phase = 'REVIEW';
        delete state.timerEndTime;
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
            if (state.winner === p.id) scores[p.id] = (scores[p.id] || 0) + 70; // 30 (from lives) + 70 = 100 max
        });
        return scores;
    }
}




