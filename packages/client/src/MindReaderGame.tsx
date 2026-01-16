import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents } from '@ryunix/shared';
import { ChatComponent } from './ChatComponent';

interface MindReaderState {
    type: 'mind-reader';
    phase: 'SETUP' | 'PLAYING' | 'GAME_OVER';
    setupMode: 'AUTO' | 'MANUAL';
    words: { [playerId: string]: string };
    pairings: string[][];
    scores: { [playerId: string]: number };
    guesses: { [guesserId: string]: string[] };
    winnerIds?: string[];
}

export const MindReaderGame: React.FC<{ gameState: MindReaderState }> = ({ gameState }) => {
    const { socket, room } = useSocket();
    const myId = socket?.id;
    const [guessInput, setGuessInput] = useState('');

    // For manual setup
    const [manualWords, setManualWords] = useState<{ [id: string]: string }>({});

    if (!room || !myId) return null;
    const isHost = room.hostId === myId;

    const setMode = (mode: 'AUTO' | 'MANUAL') => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'set_mode', mode }
        });
    };

    const assignWord = (targetId: string, word: string) => {
        setManualWords(prev => ({ ...prev, [targetId]: word }));
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'assign_word', targetId, word }
        });
    };

    const startGame = () => {
        // DEBUG: Alert to confirm click
        alert('Start Game Button Clicked! Check Server Terminal.');
        console.log('[MindReader Client] Start Game button clicked');

        if (!socket) {
            console.error('[MindReader Client] Socket is null');
            alert('Error: Socket is disconnected');
            return;
        }
        if (!room) {
            console.error('[MindReader Client] Room is null');
            alert('Error: Room is null');
            return;
        }

        socket.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'start_game' }
        });
        console.log('[MindReader Client] Emitted start_game action');
    };

    const submitGuess = () => {
        if (!guessInput.trim()) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'submit_guess', guess: guessInput }
        });
        setGuessInput('');
    };

    return (
        <div className="flex flex-col items-center w-full bg-slate-950 p-8 rounded-xl border border-slate-800 min-h-[600px] text-slate-200 shadow-2xl">
            <header className="mb-8 text-center">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-500 mb-2">
                    MIND READER
                </h2>
                <div className="flex gap-4 justify-center text-sm font-mono uppercase tracking-widest text-slate-500">
                    <span className="text-white font-bold">{gameState.phase}</span>
                    {gameState.phase === 'SETUP' && <span>Mode: {gameState.setupMode}</span>}
                </div>
            </header>

            <div className="w-full max-w-5xl">
                {gameState.phase === 'SETUP' && (
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 animate-in fade-in">
                        {isHost ? (
                            <div className="space-y-6">
                                <div className="flex justify-center gap-4 mb-8">
                                    <button
                                        onClick={() => setMode('AUTO')}
                                        className={`px-6 py-3 rounded-lg font-bold border-2 transition-all ${gameState.setupMode === 'AUTO' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                                    >
                                        AUTO (Random Words)
                                    </button>
                                    <button
                                        onClick={() => setMode('MANUAL')}
                                        className={`px-6 py-3 rounded-lg font-bold border-2 transition-all ${gameState.setupMode === 'MANUAL' ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                                    >
                                        MANUAL (Host Sets)
                                    </button>
                                </div>

                                {gameState.setupMode === 'MANUAL' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {room.players.map(p => (
                                            <div key={p.id} className="flex items-center gap-4 bg-slate-800 p-4 rounded-lg">
                                                <span className="font-bold w-1/3 truncate">{p.name}</span>
                                                <input
                                                    type="text"
                                                    value={manualWords[p.id] || gameState.words[p.id] || ''}
                                                    onChange={e => assignWord(p.id, e.target.value)}
                                                    placeholder="Assign Secret Word"
                                                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-pink-500 outline-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={startGame}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-xl font-black text-xl hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-900/50"
                                >
                                    START GAME
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-2xl text-slate-400 animate-pulse">Host is configuring the game...</p>
                            </div>
                        )}
                    </div>
                )}

                {gameState.phase === 'PLAYING' && (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Main Game Area */}
                        <div className="flex-1 space-y-6">
                            {/* Pairing Info */}
                            {gameState.pairings.find(p => p.includes(myId || '')) ? (
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 text-center">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Your Mission</h3>

                                    <div className="flex items-center justify-center gap-8 mb-8">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-indigo-900/50 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">🧠</div>
                                            <p className="font-bold text-indigo-400">YOU</p>
                                            <p className="text-2xl font-black text-white bg-slate-800 px-4 py-2 rounded mt-2 border border-slate-600">
                                                {gameState.words[myId || ''] || '???'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Your Secret Word</p>
                                        </div>

                                        <div className="text-slate-600 font-black text-2xl">VS</div>

                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-pink-900/50 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">🕵️</div>
                                            <p className="font-bold text-pink-400">
                                                {(() => {
                                                    const pair = gameState.pairings.find(p => p.includes(myId));
                                                    const oppId = pair?.find(id => id !== myId);
                                                    return room.players.find(p => p.id === oppId)?.name || 'Unknown';
                                                })()}
                                            </p>
                                            <div className="text-2xl font-black text-transparent bg-slate-800 px-4 py-2 rounded mt-2 border border-slate-600 animate-pulse">
                                                ?????
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Guess Their Word</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <h4 className="font-bold mb-2">Make a Guess</h4>
                                        <div className="flex gap-2">
                                            <input
                                                value={guessInput}
                                                onChange={e => setGuessInput(e.target.value)}
                                                placeholder="Is it... ?"
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 focus:border-indigo-500 outline-none"
                                            />
                                            <button
                                                onClick={submitGuess}
                                                className="bg-indigo-600 hover:bg-indigo-500 px-6 rounded font-bold"
                                            >
                                                GUESS
                                            </button>
                                        </div>
                                        <div className="mt-4 text-left text-sm text-slate-400 max-h-32 overflow-y-auto">
                                            <p className="font-bold text-xs uppercase text-slate-600 mb-1">Your Guesses:</p>
                                            {(gameState.guesses[myId || ''] || []).map((g, i) => (
                                                <div key={i} className="border-b border-slate-800 py-1">{g}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-12 text-center bg-slate-900 rounded-2xl border border-yellow-700/50">
                                    <h3 className="text-2xl font-bold text-yellow-500 mb-2">Odd One Out</h3>
                                    <p className="text-slate-400">You are sitting this round out. Watch and learn!</p>
                                </div>
                            )}
                        </div>

                        {/* Chat */}
                        <div className="w-full lg:w-80">
                            <ChatComponent height="h-[600px]" />
                        </div>
                    </div>
                )}

                {gameState.phase === 'GAME_OVER' && (
                    <div className="text-center bg-slate-900 p-8 rounded-2xl border border-indigo-500/50 animate-in zoom-in">
                        <h3 className="text-5xl font-black text-white mb-6">GAME OVER</h3>
                        <div className="text-2xl mb-8">
                            Winner: <span className="text-pink-400 font-bold">
                                {gameState.winnerIds?.map(id => room.players.find(p => p.id === id)?.name).join(', ')}
                            </span>
                        </div>
                        <button
                            onClick={() => window.location.reload()} // Temporary reload to reset usually
                            className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-full font-bold"
                        >
                            Back to Lobby
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
