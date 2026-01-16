import React, { useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents } from '@ryunix/shared';
import { ChatComponent } from './ChatComponent';

interface PrisonersLetterState {
    type: 'prisoners-letter';
    round: number;
    phase: 'WRITING' | 'VOTING' | 'REVEAL';
    messages: { [playerId: string]: string };
    currentReaderId?: string;
    currentMessage?: string;
    votes: { [voterId: string]: string };
    scores: { [playerId: string]: number };
    readyPlayers: string[];
    winnerIds?: string[];
}

export const PrisonersLetterGame: React.FC<{ gameState: PrisonersLetterState }> = ({ gameState }) => {
    const { socket, room } = useSocket();
    const [inputMessage, setInputMessage] = useState('');
    const myId = socket?.id;

    useEffect(() => {
        // Pre-fill existing message if editing
        if (myId && gameState.messages[myId] && gameState.phase === 'WRITING') {
            setInputMessage(gameState.messages[myId]);
        }
    }, [gameState.phase]); // Only update on phase change to avoid overwriting typing

    if (!room || !myId) return null;

    const isReady = gameState.readyPlayers.includes(myId);

    const submitMessage = () => {
        if (!inputMessage.trim()) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'submit_message', message: inputMessage }
        });
    };

    const vote = (targetId: string) => {
        if (gameState.phase !== 'VOTING') return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'vote', targetId }
        });
    };

    const nextRound = () => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'next_round' }
        });
    };

    return (
        <div className="flex flex-col items-center w-full bg-gray-900 p-8 rounded-xl border border-gray-700 min-h-[600px] text-gray-200">
            <header className="mb-8 text-center">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-2">
                    THE PRISONERS' LETTER
                </h2>
                <div className="flex gap-4 justify-center text-sm font-mono">
                    <span className="text-gray-400">ROUND {gameState.round}</span>
                    <span className={`${gameState.phase === 'WRITING' ? 'text-yellow-400' : 'text-gray-600'}`}>WRITING</span>
                    <span className={`${gameState.phase === 'VOTING' ? 'text-blue-400' : 'text-gray-600'}`}>VOTING</span>
                    <span className={`${gameState.phase === 'REVEAL' ? 'text-green-400' : 'text-gray-600'}`}>REVEAL</span>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
                {/* LEFT: Game Action Area */}
                <div className="flex-1 bg-gray-800 p-6 rounded-xl border border-gray-600 flex flex-col items-center justify-center min-h-[400px]">

                    {/* WRITING PHASE */}
                    {gameState.phase === 'WRITING' && (
                        <div className="w-full max-w-md text-center">
                            <h3 className="text-xl font-bold mb-4 text-yellow-400">Write your secret message</h3>
                            <p className="text-xs text-gray-400 mb-4">Max 10 words. Try to sound like someone else (or yourself)!</p>

                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-4 text-white mb-4 focus:border-yellow-400 outline-none"
                                rows={3}
                                placeholder="I have hidden the gold under the..."
                            />

                            <button
                                onClick={submitMessage}
                                disabled={isReady}
                                className={`px-8 py-3 rounded font-bold uppercase w-full transition-all ${isReady ? 'bg-green-600 text-white cursor-default' : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                                    }`}>
                                {isReady ? 'Locked In' : 'Submit Letter'}
                            </button>
                            <p className="mt-4 text-sm text-gray-500">
                                {gameState.readyPlayers.length} / {room.players.length} Ready
                            </p>
                        </div>
                    )}

                    {/* VOTING PHASE */}
                    {gameState.phase === 'VOTING' && (
                        <div className="w-full text-center">
                            <h3 className="text-xl font-bold mb-6 text-blue-400">Who wrote this?</h3>

                            <div className="bg-white text-black font-serif text-2xl p-8 rounded shadow-lg transform rotate-1 mb-8 relative">
                                <span className="absolute -top-3 -left-3 text-4xl">❝</span>
                                {gameState.currentMessage}
                                <span className="absolute -bottom-3 -right-3 text-4xl">❞</span>
                            </div>

                            {gameState.currentReaderId === myId ? (
                                <p className="text-yellow-400 font-bold italic">This is your message! Stay poker faced.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {room.players.filter(p => p.id !== myId).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => vote(p.id)}
                                            disabled={!!gameState.votes[myId]}
                                            className={`p-4 rounded border-2 transition-all ${gameState.votes[myId] === p.id
                                                ? 'bg-blue-600 border-blue-400 text-white'
                                                : 'bg-gray-700 border-gray-600 hover:border-blue-400'
                                                }`}>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* REVEAL PHASE */}
                    {gameState.phase === 'REVEAL' && (
                        <div className="w-full text-center animate-in fade-in zoom-in duration-500">
                            <h3 className="text-2xl font-bold mb-2">The Author was...</h3>

                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-6">
                                {room.players.find(p => p.id === gameState.currentReaderId)?.name}
                            </div>

                            <div className="bg-gray-900 p-4 rounded border border-gray-700 mb-6">
                                <p className="text-gray-400 text-sm mb-2">The Message:</p>
                                <p className="font-serif text-lg italic">"{gameState.currentMessage}"</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                                <div className="bg-green-900/30 p-3 rounded">
                                    <span className="block text-green-400 font-bold">Correct Guesses (+1)</span>
                                    {room.players.filter(p => gameState.votes[p.id] === gameState.currentReaderId).map(p => p.name).join(', ') || 'None'}
                                </div>
                                <div className="bg-red-900/30 p-3 rounded">
                                    <span className="block text-red-400 font-bold">Wrong Guesses</span>
                                    {room.players.filter(p => gameState.votes[p.id] && gameState.votes[p.id] !== gameState.currentReaderId).map(p => p.name).join(', ') || 'None'}
                                </div>
                            </div>

                            {/* Calculation for Writer Bonus */}
                            {(() => {
                                const correctCount = Object.values(gameState.votes).filter(v => v === gameState.currentReaderId).length;
                                if (correctCount === 0) {
                                    return <div className="mb-6 text-yellow-400 font-bold">🏆 PERFECT DECEPTION! Writer gets +3 points!</div>
                                }
                                return null;
                            })()}

                            {!gameState.winnerIds ? (
                                <button
                                    onClick={nextRound}
                                    disabled={gameState.readyPlayers.includes(myId)}
                                    className={`px-8 py-3 rounded font-bold uppercase transition-all ${gameState.readyPlayers.includes(myId) ? 'bg-gray-600' : 'bg-cyan-600 hover:bg-cyan-500'
                                        }`}>
                                    {gameState.readyPlayers.includes(myId) ? 'Waiting...' : 'Next Round'}
                                </button>
                            ) : (
                                <div className="p-6 bg-yellow-900/30 border border-yellow-500 rounded-xl">
                                    <h3 className="text-3xl font-black text-yellow-400 mb-2">WINNER!</h3>
                                    <p className="text-white text-xl">
                                        {gameState.winnerIds.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT: Scoreboard */}
                <div className="w-full md:w-64 bg-gray-800 p-4 rounded-xl border border-gray-700 h-fit">
                    <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-4 border-b border-gray-700 pb-2">Scoreboard (Goal: 10)</h3>
                    <div className="space-y-3">
                        {room.players.slice().sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0)).map(p => (
                            <div key={p.id} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs">{p.name.slice(0, 2)}</div>
                                    <span className={p.id === myId ? 'text-cyan-400 font-bold' : 'text-gray-300'}>{p.name}</span>
                                </div>
                                <span className="font-mono font-bold text-xl">{gameState.scores[p.id] || 0}</span>
                            </div>
                        ))}
                    </div>

                    {/* Chat Area: Stacked below scoreboard in this column if we want, or separate. 
                       The current column is w-full md:w-64. Chat fits there. 
                    */}
                    <div className="mt-4 h-64 border-t border-gray-700 pt-4">
                        <ChatComponent />
                    </div>
                </div>
            </div>
        </div>
    );
};
