import { Player } from '@ryunix/shared';
import { GamePlugin, GameState } from '../GamePlugin';

interface PrisonersLetterState extends GameState {
    round: number;
    phase: 'WRITING' | 'READING' | 'VOTING' | 'REVEAL';
    messages: { [playerId: string]: string }; // Stored messages
    readyPlayers: string[]; // IDs of players who confirmed/submitted
    currentReaderId?: string; // The author of the current message
    currentMessage?: string; // The message being read (snapshot to avoid cheating/changing mid-vote)
    votes: { [voterId: string]: string }; // voterId -> authorId (guess)
    winnerIds?: string[];
    scores: { [playerId: string]: number };
}

export class PrisonersLetterGame implements GamePlugin {
    id = 'prisoners-letter';
    name = "The Prisoners' Letter";
    minPlayers = 3;
    maxPlayers = 10;

    setup(players: Player[], config?: any): PrisonersLetterState {
        const scores: { [id: string]: number } = {};
        players.forEach(p => scores[p.id] = 0);

        return {
            type: 'prisoners-letter',
            round: 1,
            phase: 'WRITING',
            messages: {},
            readyPlayers: [],
            votes: {},
            scores,
            winnerIds: undefined
        };
    }

    handleAction(state: PrisonersLetterState, senderId: string, action: any, dispatch?: (s: any) => void): PrisonersLetterState | null {
        if (state.winnerIds) return null;

        if (state.phase === 'WRITING') {
            if (action.type === 'submit_message') {
                const msg = action.message;
                if (!msg || typeof msg !== 'string') return null;
                // Validate max 10 words
                if (msg.split(' ').length > 10) return null;

                state.messages[senderId] = msg;
                if (!state.readyPlayers.includes(senderId)) {
                    state.readyPlayers.push(senderId);
                }

                this.checkPhaseAdvance(state);
                return state;
            }
        }

        if (state.phase === 'VOTING') {
            if (action.type === 'vote') {
                const targetId = action.targetId; // Who I think wrote it
                if (state.readyPlayers.includes(senderId)) return null; // Already voted? no, using readyPlayers for sync

                // Allow vote change? Or lock? Let's Lock.
                if (state.votes[senderId]) return null;

                // Cannot vote for self? Rules don't say, but logically makes sense or allows bluffing? 
                // "Players vote on who they think wrote which message" -> implies guessing others.
                // Usually in these games you can't vote for yourself.
                if (targetId === senderId) return null;

                state.votes[senderId] = targetId;

                this.checkPhaseAdvance(state);
                return state;
            }
        }

        if (state.phase === 'REVEAL') {
            if (action.type === 'next_round') {
                // Check if host? Or wait for everyone? 
                // Simpler: Wait for host or first player to trigger next.
                // Let's use readyPlayers again to track "seen results".
                if (!state.readyPlayers.includes(senderId)) {
                    state.readyPlayers.push(senderId);
                }
                this.checkPhaseAdvance(state);
                return state;
            }
        }

        return state;
    }

    private checkPhaseAdvance(state: PrisonersLetterState) {
        const activeIds = Object.keys(state.scores); // All players

        if (state.phase === 'WRITING') {
            // Check if all submitted
            if (activeIds.every(id => state.readyPlayers.includes(id))) {
                // Advance to READING/VOTING
                this.startRound(state);
            }
        } else if (state.phase === 'VOTING') {
            // Check if all (except maybe reader?) voted.
            // Reader shouldn't vote? "Players vote". Usually reader sits out.
            const voters = activeIds.filter(id => id !== state.currentReaderId);
            const voteCount = Object.keys(state.votes).length;

            if (voteCount >= voters.length) {
                this.resolveRound(state);
            }
        } else if (state.phase === 'REVEAL') {
            // Wait for everyone to click next, or just host?
            // Let's just require > 50% or just Host.
            // Let's rely on Host (first player in list usually).
            // Actually, let's just wait for 1 person (Host) to keep it fast.
            // Or better: Everyone must click "Ready"
            if (activeIds.every(id => state.readyPlayers.includes(id))) {
                state.phase = 'WRITING';
                state.readyPlayers = [];
                state.votes = {};
                state.currentMessage = undefined;
                state.currentReaderId = undefined;

                // Clean up message of the person who was just read?
                // "when a message is done, the players get the option to change... or keep"
                // Implies old one is kept by default.
                // BUT the one just read is compromised.
                // So we should delete it? Or let them keep it (stupid strategy)?
                // Let's delete it to force new one.
                // Actually, "messages are shuffled and read out loud". 
                // If we only read ONE, then only ONE is compromised.
                // User said: "we won't go through all ... process of elimiation".
                // So we read ONE.
                // So the READER's message must be cleared.
                // But wait, the previous code didn't know who the reader would be until now.
                // We know state.currentReaderId from the round that just finished.
                // wait, I cleared it above. I need to clear message BEFORE clearing readerId.
                // Ref Logic:
            }
        }
    }

    private startRound(state: PrisonersLetterState) {
        // Pick a random player who has a message
        const candidates = Object.keys(state.messages);
        if (candidates.length === 0) return; // Should not happen

        // Try to pick someone who hasn't been read recently? 
        // For simplicity: Random.
        const readerId = candidates[Math.floor(Math.random() * candidates.length)];

        state.currentReaderId = readerId;
        state.currentMessage = state.messages[readerId];

        state.phase = 'VOTING';
        state.readyPlayers = []; // Reset ready checks
    }

    private resolveRound(state: PrisonersLetterState) {
        state.phase = 'REVEAL';
        state.readyPlayers = []; // Reset for Next Round Ack

        const reader = state.currentReaderId!;
        const voters = Object.keys(state.votes);
        let readerCaught = false;

        voters.forEach(vid => {
            if (state.votes[vid] === reader) {
                // Correct guess
                state.scores[vid] = (state.scores[vid] || 0) + 1;
                readerCaught = true;
            }
        });

        if (!readerCaught) {
            // Writer unnoticed
            state.scores[reader] = (state.scores[reader] || 0) + 3;
        }

        // Check Win
        const winners = Object.keys(state.scores).filter(id => state.scores[id] >= 10);
        if (winners.length > 0) {
            state.winnerIds = winners;
        }

        // Remove the read message so they MUST write a new one
        if (state.messages[reader]) {
            delete state.messages[reader];
        }
    }

    isComplete(state: PrisonersLetterState): boolean {
        return !!state.winnerIds;
    }

    resolve(state: PrisonersLetterState, players: Player[]): { [playerId: string]: number } {
        return state.scores;
    }
}
