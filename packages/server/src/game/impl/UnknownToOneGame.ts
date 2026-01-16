import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

interface UnknownToOneState extends GameState {
    round: number;
    phase: 'SETUP' | 'DEBATE' | 'VOTING' | 'BONUS_GUESS' | 'REVEAL';
    secretWord?: string;
    blackenedId?: string;
    votes: { [voterId: string]: string }; // voterId -> suspicionId
    scores: { [playerId: string]: number };
    winnerIds?: string[];
    blackenedGuess?: string; // What the blackened guess
    blackenedCaught?: boolean; // Result of voting
}

export class UnknownToOneGame implements GamePlugin {
    id = 'unknown-to-one';
    name = "Unknown to One";
    minPlayers = 3;
    maxPlayers = 10;

    setup(players: Player[]): UnknownToOneState {
        const scores: { [id: string]: number } = {};
        // "everyone starts with amount of points equal to number count divided by 2"
        const initialPoints = players.length / 2;
        players.forEach(p => scores[p.id] = initialPoints);

        return {
            type: 'unknown-to-one', // This string literal will match the client check
            round: 1,
            phase: 'SETUP',
            scores,
            votes: {},
            winnerIds: undefined
        };
    }

    handleAction(state: UnknownToOneState, senderId: string, action: any): UnknownToOneState | null {
        if (state.winnerIds) return null;

        if (state.phase === 'SETUP') {
            // Only host can set word? Or random leader?
            // "everyone will be informed a specific thing (set by the room leader)"
            // Assuming Host is Room Leader.
            if (action.type === 'set_word' && action.word) {
                state.secretWord = action.word;
                this.startRound(state, Object.keys(state.scores));
                return state;
            }
        }

        if (state.phase === 'VOTING') {
            if (action.type === 'vote') {
                const targetId = action.targetId;
                if (state.votes[senderId]) return null; // Already voted
                state.votes[senderId] = targetId;

                // Check if all voted
                const voterCount = Object.keys(state.votes).length;
                const totalPlayers = Object.keys(state.scores).length;
                if (voterCount >= totalPlayers) {
                    this.resolveVoting(state);
                }
                return state;
            }
        }

        if (state.phase === 'BONUS_GUESS') {
            // Only blackened can act
            if (senderId !== state.blackenedId) return null;

            if (action.type === 'submit_guess') {
                state.blackenedGuess = action.guess;
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
                // Anyone can trigger next round for now, or require host.
                state.round++;
                state.phase = 'SETUP';
                state.secretWord = undefined;
                state.blackenedId = undefined;
                state.votes = {};
                state.blackenedGuess = undefined;
                state.blackenedCaught = undefined;
                return state;
            }
        }

        return state;
    }

    private startRound(state: UnknownToOneState, playerIds: string[]) {
        // Assign Blackened
        const idx = Math.floor(Math.random() * playerIds.length);
        state.blackenedId = playerIds[idx];
        state.phase = 'DEBATE';
        // Move to Voting manually? Or timer? 
        // User: "non-stop debate... no pauses" 
        // We probably need a button to "Start Voting".
        // For simplicity, let's just let them vote whenever in Debate phase, effectively merging Debate/Voting 
        // OR add a "Start Voting" button for Host.
        // Let's make 'set_word' go straight to VOTING in frontend terms? No, they need to see prompt first.
        // Actually, let's add a "End Debate / Vote" action.
        state.phase = 'VOTING'; // Simplifying: The UI shows the info, and voting is open immediately? 
        // "non-stop debate" implies they talk WHILST voting or until they decide to vote?
        // Let's assume voting is enabled immediately.
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
        return state.scores;
    }
}
