import { Player } from '@ryunix/shared';
import { GameContext, GamePlugin, GameState } from '../GamePlugin';
import { packageLoader } from '../../services/PackageLoader';
import { cleanText } from '../gameUtils';

interface UnknownToOneState extends GameState {
    round: number;
    phase: 'SETUP' | 'DEBATE' | 'DECISION' | 'VOTING' | 'BONUS_GUESS' | 'REVEAL';
    secretWord?: string;
    blackenedId?: string;
    votes: { [voterId: string]: string }; // voterId -> suspicionId
    scores: { [playerId: string]: number };
    turnOrder: string[];
    currentTurnIndex: number;
    playerWords: { [playerId: string]: string };
    decisionVotes?: { [playerId: string]: 'vote_now' | 'another_round' };
    readyPlayers: string[];
    winnerIds?: string[];
    blackenedGuess?: string; // What the blackened guess
    blackenedCaught?: boolean; // Result of voting
}

export class UnknownToOneGame implements GamePlugin {
    id = 'unknown-to-one';
    name = "Unknown to One";
    minPlayers = 3;
    maxPlayers = 10;

    setup(players: Player[], config?: any): UnknownToOneState {
        const scores: { [id: string]: number } = {};
        const initialPoints = players.length / 2;
        players.forEach(p => scores[p.id] = initialPoints);

        // Load from specific package if provided
        const packageId = config?.packageId;
        const words = packageId
            ? packageLoader.getTopicsFromPackage(packageId)
            : packageLoader.getAllTopics();

        return {
            type: 'unknown-to-one',
            round: 1,
            phase: 'SETUP',
            scores,
            turnOrder: [],
            currentTurnIndex: 0,
            playerWords: {},
            decisionVotes: {},
            readyPlayers: [],
            votes: {},
            winnerIds: undefined,
            availableWords: words
        } as UnknownToOneState;
    }

    getPlayerView(state: UnknownToOneState, viewerId: string): UnknownToOneState {
        const isBlackened = viewerId === state.blackenedId;
        const blackenedRevealed = state.phase === 'BONUS_GUESS' || state.phase === 'REVEAL';
        return {
            ...state,
            // Only the blackened player knows their role until they are caught or the round ends
            blackenedId: isBlackened || blackenedRevealed ? state.blackenedId : undefined,
            // The blackened player never sees the word until the reveal
            secretWord: isBlackened && state.phase !== 'REVEAL' ? undefined : state.secretWord,
        };
    }

    handleAction(state: UnknownToOneState, senderId: string, action: any, ctx: GameContext): UnknownToOneState | null {
        if (state.winnerIds) return null;

        if (state.phase === 'SETUP') {
            if (senderId !== ctx.hostId) return null; // The host picks the word
            const word = cleanText(action.word);
            if (action.type === 'set_word' && word) {
                state.secretWord = word;
                // The host typed the word, so they can't be the one who doesn't know it
                const everyone = Object.keys(state.scores);
                const candidates = everyone.filter(id => id !== senderId);
                this.startRound(state, everyone, candidates.length > 0 ? candidates : everyone);
                return state;
            }

            if (action.type === 'random_word') {
                const words = (state as any).availableWords || [];
                if (words.length > 0) {
                    const randomWord = words[Math.floor(Math.random() * words.length)];
                    state.secretWord = randomWord;
                    this.startRound(state, Object.keys(state.scores));
                    return state;
                }
            }
        }

        if (state.phase === 'DEBATE') {
            const word = cleanText(action.word);
            if (action.type === 'say_word' && word) {
                if (senderId !== state.turnOrder[state.currentTurnIndex]) return null;
                state.playerWords[senderId] = word;
                state.currentTurnIndex++;
                return state;
            }

            if (action.type === 'ready') {
                if (state.currentTurnIndex < state.turnOrder.length) return null;
                if (!state.readyPlayers.includes(senderId)) {
                    state.readyPlayers.push(senderId);
                }
                this.advanceIfEveryoneDone(state);
                return state;
            }
        }

        if (state.phase === 'DECISION') {
            if (action.type === 'decision_vote' && (action.choice === 'vote_now' || action.choice === 'another_round')) {
                if (!state.decisionVotes) state.decisionVotes = {};
                if (state.decisionVotes[senderId]) return null; // Already voted
                state.decisionVotes[senderId] = action.choice;
                this.advanceIfEveryoneDone(state);
                return state;
            }
        }

        if (state.phase === 'VOTING') {
            if (action.type === 'vote') {
                const targetId = action.targetId;
                if (state.votes[senderId]) return null; // Already voted
                if (!(targetId in state.scores)) return null; // Must vote for someone in the game
                state.votes[senderId] = targetId;
                this.advanceIfEveryoneDone(state);
                return state;
            }
        }

        if (state.phase === 'BONUS_GUESS') {
            // Only blackened can act
            if (senderId !== state.blackenedId) return null;

            if (action.type === 'submit_guess') {
                const guess = cleanText(action.guess);
                if (!guess) return null;
                state.blackenedGuess = guess;
                this.resolveBonus(state);
                return state;
            }
            if (action.type === 'skip_guess') {
                this.resolveBonus(state);
                return state;
            }
        }

        if (state.phase === 'REVEAL') {
            if (action.type === 'next_round') {
                if (senderId !== ctx.hostId) return null; // Otherwise anyone could cut the reveal short
                state.round++;
                state.phase = 'SETUP';
                state.secretWord = undefined;
                state.blackenedId = undefined;
                state.votes = {};
                state.turnOrder = [];
                state.currentTurnIndex = 0;
                state.playerWords = {};
                state.decisionVotes = {};
                state.readyPlayers = [];
                state.blackenedGuess = undefined;
                state.blackenedCaught = undefined;
                return state;
            }
        }

        return state;
    }

    onPlayerLeave(state: UnknownToOneState, playerId: string): UnknownToOneState {
        delete state.scores[playerId];
        delete state.playerWords[playerId];
        delete state.votes[playerId];
        if (state.decisionVotes) delete state.decisionVotes[playerId];
        state.readyPlayers = state.readyPlayers.filter(id => id !== playerId);

        const turnIdx = state.turnOrder.indexOf(playerId);
        if (turnIdx !== -1) {
            state.turnOrder.splice(turnIdx, 1);
            if (turnIdx < state.currentTurnIndex) state.currentTurnIndex--;
        }

        const roundInProgress = state.phase !== 'SETUP' && state.phase !== 'REVEAL';
        if (playerId === state.blackenedId && roundInProgress) {
            // Nothing left to deduce: void the round and reveal the word
            state.phase = 'REVEAL';
        } else {
            this.advanceIfEveryoneDone(state);
        }
        return state;
    }

    // Moves to the next phase once every remaining player has done what the current phase needs.
    private advanceIfEveryoneDone(state: UnknownToOneState) {
        const totalPlayers = Object.keys(state.scores).length;

        if (state.phase === 'DEBATE') {
            if (state.currentTurnIndex < state.turnOrder.length) return;
            if (state.readyPlayers.length < totalPlayers) return;
            state.phase = 'DECISION';
            state.decisionVotes = {};
            state.readyPlayers = [];
        } else if (state.phase === 'DECISION') {
            const choices = Object.values(state.decisionVotes || {});
            if (choices.length < totalPlayers) return;
            const voteNow = choices.filter(c => c === 'vote_now').length;
            if (choices.length - voteNow > voteNow) {
                state.phase = 'DEBATE';
                state.currentTurnIndex = 0;
                state.playerWords = {};
            } else {
                state.phase = 'VOTING';
            }
            state.decisionVotes = {};
        } else if (state.phase === 'VOTING') {
            if (Object.keys(state.votes).length < totalPlayers) return;
            this.resolveVoting(state);
        }
    }

    private startRound(state: UnknownToOneState, playerIds: string[], blackenedCandidates: string[] = playerIds) {
        // Assign Blackened
        const idx = Math.floor(Math.random() * blackenedCandidates.length);
        state.blackenedId = blackenedCandidates[idx];
        state.phase = 'DEBATE';
        
        // Randomize turn order
        state.turnOrder = [...playerIds].sort(() => Math.random() - 0.5);
        state.currentTurnIndex = 0;
        state.playerWords = {};
        state.readyPlayers = [];
    }

    private resolveVoting(state: UnknownToOneState) {
        // Count votes
        const voteCounts: { [id: string]: number } = {};
        Object.values(state.votes).forEach(target => {
            voteCounts[target] = (voteCounts[target] || 0) + 1;
        });

        // Who got most votes?
        let maxVotes = 0;
        let votedOutId: string | null = null;

        Object.entries(voteCounts).forEach(([id, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                votedOutId = id;
            } else if (count === maxVotes) {
                votedOutId = null; // Tie? Tie means nobody voted out? Or both? Usually Tie = Nobody dies.
            }
        });

        const blackenedId = state.blackenedId!;
        const caught = votedOutId === blackenedId;
        state.blackenedCaught = caught;

        if (caught) {
            // Blackened caught!
            // "if the blackened loses and gets voted out, he must gave a point to everyone"
            // "blackened can guess the word after the round is done" -> BONUS_GUESS phase
            state.phase = 'BONUS_GUESS';
        } else {
            // Blackened survives
            // "everyone immediately lose, and i give 4 points to the blackened"
            const players = Object.keys(state.scores);
            state.scores[blackenedId] += 4;
            // Others lose nothing (implied by "lose" the round)

            // Go to Reveal
            state.phase = 'REVEAL';
            this.checkWin(state);
        }
    }

    private resolveBonus(state: UnknownToOneState) {
        // Blackened is caught, trying to redeem
        const blackenedId = state.blackenedId!;
        const players = Object.keys(state.scores);
        const others = players.filter(id => id !== blackenedId);

        // First apply the penalty for being caught: "gave a point to everyone"
        others.forEach(pid => {
            state.scores[pid] += 1;
            state.scores[blackenedId] -= 1;
        });

        // Now check guess
        if (state.blackenedGuess && state.secretWord &&
            state.blackenedGuess.toLowerCase().trim() === state.secretWord.toLowerCase().trim()) {
            // "if he guesses it right, he gains a point"
            state.scores[blackenedId] += 1;
        }

        state.phase = 'REVEAL';
        this.checkWin(state);
    }

    private checkWin(state: UnknownToOneState) {
        const winners = Object.keys(state.scores).filter(id => state.scores[id] >= 10);
        if (winners.length > 0) {
            state.winnerIds = winners;
        }
    }

    isComplete(state: UnknownToOneState): boolean {
        return !!state.winnerIds;
    }

    resolve(state: UnknownToOneState, players: Player[]): { [playerId: string]: number } {
        // Normalize 10 default points win-condition to 100 scale
        const normalizedScores: { [id: string]: number } = {};
        Object.keys(state.scores).forEach(id => {
            normalizedScores[id] = Math.min(state.scores[id] * 10, 100);
        });
        return normalizedScores;
    }
}
