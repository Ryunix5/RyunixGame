import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents } from '@ryunix/shared';
import { ChatComponent, ChatComponentHandle } from './ChatComponent';

interface UnknownToOneState {
    type: 'unknown-to-one';
    round: number;
    phase: 'SETUP' | 'DEBATE' | 'DECISION' | 'VOTING' | 'BONUS_GUESS' | 'REVEAL';
    secretWord?: string;
    blackenedId?: string;
    // votes: { [voterId: string]: string }; // Hidden from client mostly until reveal? or public? Usually public debate.
    // Actually we shoud show who voted who? Or just counts?
    // Actually we shoud show who voted who? Or just counts?
    // Let's show who voted who for openness.
    votes: { [voterId: string]: string };
    scores: { [playerId: string]: number };
    turnOrder: string[];
    currentTurnIndex: number;
    playerWords: { [playerId: string]: string };
    decisionVotes?: { [playerId: string]: 'vote_now' | 'another_round' };
    winnerIds?: string[];
    blackenedGuess?: string;
    blackenedCaught?: boolean;
}

export const UnknownToOneGame: React.FC<{ gameState: UnknownToOneState }> = ({ gameState }) => {
    const { socket, room } = useSocket();
    const myId = socket?.id;
    const [wordInput, setWordInput] = useState('');
    const [guessInput, setGuessInput] = useState('');
    const [turnWordInput, setTurnWordInput] = useState('');
    const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
    const chatRef = useRef<ChatComponentHandle>(null);

    // Clear chat when round resets (entering SETUP phase)
    useEffect(() => {
        if (gameState.phase === 'SETUP') {
            chatRef.current?.clearMessages();
        }
    }, [gameState.phase]);

    if (!room || !myId) return null;

    const isHost = room.hostId === myId;
    const amIBlackened = gameState.blackenedId === myId;

    const setWord = () => {
        if (!wordInput.trim()) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'set_word', word: wordInput }
        });
    };

    const sayWord = () => {
        if (!turnWordInput.trim()) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'say_word', word: turnWordInput }
        });
        setTurnWordInput('');
    };

    const confirmVote = () => {
        if (!selectedVoteId) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'vote', targetId: selectedVoteId }
        });
        setSelectedVoteId(null);
    };

    const submitGuess = () => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'submit_guess', guess: guessInput }
        });
    };

    const skipGuess = () => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'skip_guess' }
        });
    }

    const nextRound = () => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'next_round' }
        });
    };

    return (
        <div className="flex flex-col items-center w-full bg-gray-950 p-8 rounded-xl border border-gray-800 min-h-[600px] text-gray-200 shadow-2xl">
            <header className="mb-8 text-center">
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">
                    UNKNOWN TO ONE
                </h2>
                <div className="flex gap-4 justify-center text-sm font-mono uppercase tracking-widest text-gray-500">
                    <span>Round {gameState.round}</span>
                    <span className="text-white font-bold">{gameState.phase.replace('_', ' ')}</span>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-12 w-full max-w-6xl">

                {/* LEFT: Main Area */}
                <div className="flex-1 flex flex-col items-center">

                    {/* SETUP PHASE */}
                    {gameState.phase === 'SETUP' && (
                        <div className="text-center max-w-md w-full animate-in fade-in slide-in-from-bottom-4">
                            {isHost ? (
                                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700">
                                    <h3 className="text-xl font-bold mb-4 text-purple-400">You are the Leader</h3>
                                    <p className="mb-6 text-gray-400">Set the secret word everybody (except one) will know.</p>
                                    <input
                                        value={wordInput}
                                        onChange={e => setWordInput(e.target.value)}
                                        placeholder="e.g. Pineapple"
                                        className="w-full bg-black border border-gray-600 rounded p-4 text-center text-xl mb-6 focus:border-purple-500 outline-none transition-colors"
                                    />
                                    <button
                                        onClick={setWord}
                                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded font-bold uppercase tracking-wider transition-all mb-4">
                                        Start Debate
                                    </button>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-gray-700 flex-1" />
                                        <span className="text-xs text-gray-500 font-bold uppercase">OR</span>
                                        <div className="h-px bg-gray-700 flex-1" />
                                    </div>

                                    <button
                                        onClick={() => socket?.emit(SocketEvents.GAME_ACTION, {
                                            roomId: room.id,
                                            action: { type: 'random_word' }
                                        })}
                                        className="w-full py-3 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700 text-cyan-400 rounded font-bold uppercase tracking-wider transition-all text-sm">
                                        🎲 Pick Random Secret
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 bg-gray-900 rounded-2xl border border-gray-800">
                                    <p className="text-xl text-gray-400 animate-pulse">Waiting for Leader to set the word...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DEBATE PHASE (Turns) */}
                    {gameState.phase === 'DEBATE' && (
                        <div className="w-full max-w-4xl animate-in fade-in flex flex-col items-center">
                            <div className="mb-8 text-center">
                                {amIBlackened ? (
                                    <div className="p-6 bg-red-950/30 border border-red-900 rounded-2xl">
                                        <h3 className="text-2xl font-black text-red-500 mb-2">YOU ARE BLACKENED</h3>
                                        <p className="text-gray-400">You don't know the word! Guess it or say something vague to blend in.</p>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-purple-950/30 border border-purple-900 rounded-2xl">
                                        <h3 className="text-lg font-bold text-gray-400 mb-2">THE SECRET WORD IS</h3>
                                        <p className="text-4xl font-black text-purple-400 tracking-tight">"{gameState.secretWord}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full mb-8">
                                <h4 className="text-center text-gray-400 uppercase tracking-widest font-bold mb-4">Turn Order</h4>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {gameState.turnOrder?.map((playerId, i) => {
                                        const p = room.players.find(p => p.id === playerId);
                                        const isCurrent = i === gameState.currentTurnIndex;
                                        const hasPlayed = i < gameState.currentTurnIndex;
                                        
                                        return (
                                            <div 
                                                key={playerId} 
                                                className={`px-4 py-2 rounded border transition-all ${
                                                    isCurrent ? 'bg-purple-600/20 border-purple-500 scale-110 text-white font-bold' :
                                                    hasPlayed ? 'bg-gray-800 border-gray-700 text-gray-500' :
                                                    'bg-gray-900 border-gray-800 text-gray-400'
                                                }`}
                                            >
                                                {p?.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Player Action Area */}
                            {gameState.turnOrder?.[gameState.currentTurnIndex] === myId ? (
                                <div className="w-full max-w-md bg-purple-900/10 p-6 rounded-xl border border-purple-500/50 mb-8 text-center">
                                    <h3 className="text-xl font-bold text-purple-400 mb-4 animate-pulse">Your Turn!</h3>
                                    <p className="text-gray-400 mb-4">Say a word that proves you know the secret.</p>
                                    <div className="flex gap-2">
                                        <input
                                            value={turnWordInput}
                                            onChange={e => setTurnWordInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && sayWord()}
                                            placeholder="Type a word..."
                                            className="flex-1 bg-black border border-gray-600 rounded p-3 text-center text-white focus:border-purple-500 outline-none"
                                        />
                                        <button 
                                            onClick={sayWord}
                                            disabled={!turnWordInput.trim()}
                                            className="px-6 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded font-bold transition-colors"
                                        >
                                            SAY
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-md bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 text-center">
                                    <p className="text-gray-400">
                                        Waiting for <span className="text-white font-bold">{room.players.find(p => p.id === gameState.turnOrder?.[gameState.currentTurnIndex])?.name}</span> to say a word...
                                    </p>
                                </div>
                            )}

                            {/* Spoken Words */}
                            <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
                                {room.players.map(p => (
                                    <div key={p.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col pt-3">
                                        <span className="text-xs text-gray-500 font-bold mb-2">{p.name}</span>
                                        {gameState.playerWords?.[p.id] ? (
                                            <span className="text-lg font-bold text-white uppercase italic">"{gameState.playerWords[p.id]}"</span>
                                        ) : (
                                            <span className="text-gray-700 italic">...</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DECISION PHASE */}
                    {gameState.phase === 'DECISION' && (
                        <div className="w-full max-w-2xl animate-in fade-in flex flex-col items-center">
                            <div className="mb-8 text-center">
                                <h3 className="text-3xl font-black text-white mb-2 uppercase">Decide the Next Step</h3>
                                <p className="text-gray-400">Do you want to vote out the blackened now, or go for another round of debate?</p>
                            </div>
                            
                            <div className="flex gap-6 w-full max-w-md">
                                <button 
                                    onClick={() => socket?.emit(SocketEvents.GAME_ACTION, { roomId: room.id, action: { type: 'decision_vote', choice: 'vote_now' } })}
                                    disabled={!!gameState.decisionVotes?.[myId || '']}
                                    className={`flex-1 py-6 rounded-xl font-bold uppercase transition-all border-2 ${
                                        gameState.decisionVotes?.[myId || ''] === 'vote_now' 
                                            ? 'bg-red-900/50 border-red-500 text-white'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-600 text-gray-300'
                                    }`}
                                >
                                    Vote Now
                                    <div className="text-xs text-gray-500 mt-2">
                                        {Object.values(gameState.decisionVotes || {}).filter(v => v === 'vote_now').length} Votes
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => socket?.emit(SocketEvents.GAME_ACTION, { roomId: room.id, action: { type: 'decision_vote', choice: 'another_round' } })}
                                    disabled={!!gameState.decisionVotes?.[myId || '']}
                                    className={`flex-1 py-6 rounded-xl font-bold uppercase transition-all border-2 ${
                                        gameState.decisionVotes?.[myId || ''] === 'another_round' 
                                            ? 'bg-blue-900/50 border-blue-500 text-white'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-600 text-gray-300'
                                    }`}
                                >
                                    Another Round
                                    <div className="text-xs text-gray-500 mt-2">
                                        {Object.values(gameState.decisionVotes || {}).filter(v => v === 'another_round').length} Votes
                                    </div>
                                </button>
                            </div>
                            
                            <p className="text-center mt-8 text-gray-500 text-sm">
                                {Object.keys(gameState.decisionVotes || {}).length} / {room.players.length} Voted
                            </p>
                        </div>
                    )}

                    {/* VOTING PHASE */}
                    {gameState.phase === 'VOTING' && (
                        <div className="w-full max-w-2xl animate-in fade-in">
                            <div className="mb-12 text-center">
                                {amIBlackened ? (
                                    <div className="p-8 bg-red-950/30 border border-red-900 rounded-2xl">
                                        <h3 className="text-3xl font-black text-red-500 mb-2">YOU ARE BLACKENED</h3>
                                        <p className="text-gray-400">You don't know the word! Blend in. Figure it out.</p>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-purple-950/30 border border-purple-900 rounded-2xl">
                                        <h3 className="text-xl font-bold text-gray-400 mb-2">THE SECRET WORD IS</h3>
                                        <p className="text-5xl font-black text-purple-400 tracking-tight">"{gameState.secretWord}"</p>
                                    </div>
                                )}
                            </div>

                            <h4 className="text-center text-gray-500 uppercase tracking-widest font-bold mb-6">Vote the Outsider</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {room.players.map(p => {
                                    const votesForMe = Object.values(gameState.votes).filter(id => id === p.id).length;
                                    const iVotedFor = gameState.votes[myId || ''];
                                    const isSelected = selectedVoteId === p.id;
                                    const isAlreadyVoted = !!iVotedFor;

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => !isAlreadyVoted && setSelectedVoteId(p.id)}
                                            disabled={isAlreadyVoted}
                                            className={`relative p-6 rounded-xl border-2 transition-all flex flex-col items-center ${
                                                iVotedFor === p.id ? 'bg-red-900/40 border-red-500' :
                                                isSelected ? 'bg-purple-900/40 border-purple-500' :
                                                'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800'
                                            }`}>
                                            <span className={`font-bold text-lg mb-1 ${p.id === myId ? 'text-gray-500' : 'text-white'}`}>
                                                {p.name} {p.id === myId && '(YOU)'}
                                            </span>
                                            {votesForMe > 0 && (
                                                <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold">
                                                    {votesForMe}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {!gameState.votes[myId || ''] && (
                                <div className="mt-8 text-center bg-gray-900 p-6 rounded-xl border border-gray-800">
                                    {selectedVoteId ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <p className="text-gray-300">
                                                Vote for <span className="font-bold text-white text-xl mx-2">{room.players.find(p => p.id === selectedVoteId)?.name}</span>?
                                            </p>
                                            <button 
                                                onClick={confirmVote} 
                                                className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded font-bold uppercase transition block"
                                            >
                                                Confirm Vote
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">Select a player above to cast your vote.</p>
                                    )}
                                </div>
                            )}

                            <p className="text-center mt-6 text-gray-500 text-sm">
                                {Object.keys(gameState.votes).length} / {room.players.length} Voted
                            </p>
                        </div>
                    )}

                    {/* BONUS GUESS PHASE */}
                    {gameState.phase === 'BONUS_GUESS' && (
                        <div className="w-full max-w-md text-center animate-in fade-in">
                            <h3 className="text-3xl font-black text-white mb-8">BLACKENED CAUGHT!</h3>

                            <div className="p-8 bg-gray-900 rounded-2xl border border-gray-700 mb-8">
                                <p className="text-gray-400 mb-2">The Blackened was:</p>
                                <p className="text-2xl font-bold text-red-400 mb-6">
                                    {room.players.find(p => p.id === gameState.blackenedId)?.name}
                                </p>

                                {amIBlackened ? (
                                    <div className="space-y-4">
                                        <p className="text-yellow-400 font-bold">Last Chance! Guess the word for +1 Point.</p>
                                        <input
                                            value={guessInput}
                                            onChange={e => setGuessInput(e.target.value)}
                                            className="w-full bg-black border border-gray-600 rounded p-3 text-center text-white"
                                            placeholder="What was the word?"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={submitGuess} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded font-bold">GUESS</button>
                                            <button onClick={skipGuess} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-bold">GIVE UP</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="italic text-gray-500">Waiting for Blackened to guess...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REVEAL PHASE */}
                    {gameState.phase === 'REVEAL' && (
                        <div className="w-full max-w-xl text-center animate-in zoom-in duration-300">
                            <h3 className="text-4xl font-black text-white mb-8">ROUND RESULTS</h3>

                            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 mb-8">
                                <div className="mb-6">
                                    <span className="text-gray-500 uppercase text-xs font-bold tracking-widest">Secret Word</span>
                                    <div className="text-3xl font-bold text-white mt-1">{gameState.secretWord}</div>
                                </div>
                                <div className="mb-6">
                                    <span className="text-gray-500 uppercase text-xs font-bold tracking-widest">The Blackened</span>
                                    <div className="text-3xl font-bold text-red-500 mt-1">
                                        {room.players.find(p => p.id === gameState.blackenedId)?.name}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border-2 mb-4 ${!gameState.blackenedCaught ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
                                    {!gameState.blackenedCaught ? (
                                        <>
                                            <h4 className="text-2xl font-black text-red-500 mb-1">BLACKENED SURVIVED!</h4>
                                            <p className="text-gray-300">+4 Points to Blackened. Innocents lose.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="text-2xl font-black text-green-500 mb-1">BLACKENED CAUGHT!</h4>
                                            <p className="text-gray-300">Blackened pays 1 point to everyone.</p>
                                            {gameState.blackenedGuess && (
                                                <div className="mt-4 pt-4 border-t border-gray-700">
                                                    <p className="text-sm text-gray-400">Blackened Guess: <span className="text-white font-bold">"{gameState.blackenedGuess}"</span></p>
                                                    {gameState.blackenedGuess.toLowerCase() === gameState.secretWord?.toLowerCase() ? (
                                                        <p className="text-green-400 font-bold text-sm">Correct! (+1 Point)</p>
                                                    ) : (
                                                        <p className="text-red-400 font-bold text-sm">Incorrect.</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {!gameState.winnerIds ? (
                                <button onClick={nextRound} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                                    NEXT ROUND
                                </button>
                            ) : (
                                <div className="p-8 bg-yellow-900/30 border border-yellow-500 rounded-2xl">
                                    <h3 className="text-3xl font-black text-yellow-400 mb-2">GAME OVER</h3>
                                    <p className="text-white text-xl">
                                        Winner: {gameState.winnerIds.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* RIGHT: Scoreboard */}
                <div className="w-full lg:w-72 bg-gray-900 p-6 rounded-2xl border border-gray-800 h-fit">
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-6 pb-2 border-b border-gray-800">
                        Scores (Goal: 10)
                    </h3>
                    <div className="space-y-4">
                        {room.players.slice().sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0)).map(p => (
                            <div key={p.id} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="items-center justify-center font-bold text-xs text-gray-500 hidden group-hover:flex">
                                        #{room.players.indexOf(p) + 1}
                                    </div>
                                    <span className={`font-bold ${p.id === myId ? 'text-white' : 'text-gray-400'}`}>
                                        {p.name}
                                    </span>
                                </div>
                                <span className={`font-mono text-xl font-bold ${(gameState.scores[p.id] || 0) >= 10 ? 'text-yellow-400' : 'text-purple-400'
                                    }`}>
                                    {gameState.scores[p.id] || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                {/* Chat Area */}
                <div className="w-full lg:w-72 mt-6 lg:mt-0">
                    <ChatComponent height="h-[500px]" />
                </div>

            </div>
        </div>
    );
};
