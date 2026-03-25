import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents, MatchingMindsState } from '@ryunix/shared';

export const MatchingMindsGame = ({ gameState }: { gameState: MatchingMindsState }) => {
    const { room, socket } = useSocket();
    const [myWord, setMyWord] = useState('');
    const myId = socket?.id;

    if (!room || !myId) return null;

    const hasSubmitted = !!gameState.submissions[myId];

    const submitWord = () => {
        if (!myWord.trim() || hasSubmitted) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: {
                type: 'submit_word',
                word: myWord.trim(),
                playerCount: room.players.length
            }
        });
        setMyWord('');
    };

    const nextRound = () => {
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'next_round' }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && myWord.trim()) {
            submitWord();
        }
    };

    // SUBMITTING Phase
    if (gameState.phase === 'SUBMITTING') {
        return (
            <div className="flex flex-col items-center w-full bg-gray-900 p-8 rounded-xl border border-gray-700 min-h-[500px]">
                <div className="text-center mb-8">
                    <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-2">Round {gameState.currentRound}</h2>
                    <p className="text-gray-400 mb-4">What comes to mind when you think of...</p>
                    <h1 className="text-5xl font-black text-cyan-400 animate-pulse">{gameState.promptWord}</h1>
                </div>

                <div className="w-full max-w-md mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={myWord}
                            onChange={(e) => setMyWord(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your association..."
                            disabled={hasSubmitted}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white text-lg focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                            autoFocus
                        />
                        <button
                            onClick={submitWord}
                            disabled={!myWord.trim() || hasSubmitted}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {hasSubmitted ? '✓ Submitted' : 'Submit'}
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Players Ready</p>
                    <div className="flex gap-2">
                        {room.players.map(p => (
                            <div
                                key={p.id}
                                className={`w-3 h-3 rounded-full ${gameState.submissions[p.id] ? 'bg-green-500' : 'bg-gray-700'}`}
                                title={p.name}
                            />
                        ))}
                    </div>
                    <p className="text-gray-400 mt-2 text-sm">
                        {Object.keys(gameState.submissions).length} / {room.players.length}
                    </p>
                </div>
            </div>
        );
    }

    // REVEALING Phase
    if (gameState.phase === 'REVEALING') {
        const currentRound = gameState.rounds[gameState.rounds.length - 1];

        return (
            <div className="flex flex-col items-center w-full bg-gray-900 p-8 rounded-xl border border-gray-700 min-h-[500px]">
                <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Round {gameState.currentRound} Results</h2>

                <div className="w-full max-w-2xl mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        {currentRound.submissions.map((sub, i) => (
                            <div
                                key={i}
                                className="bg-gray-800 p-4 rounded-lg border border-gray-700 animate-in slide-in-from-bottom fade-in"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <p className="text-xs text-cyan-500 mb-1">{sub.playerName}</p>
                                <p className="text-xl font-bold text-white">{sub.word}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center mb-6">
                    <p className="text-yellow-500 text-lg font-bold mb-2">
                        🤔 Not matched yet! Think alike...
                    </p>
                    {currentRound.mostCommonWord && currentRound.matchCount >= 2 && (
                        <p className="text-gray-400 text-sm">
                            {currentRound.matchCount} players said "{currentRound.mostCommonWord}"
                        </p>
                    )}
                </div>

                <button
                    onClick={nextRound}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-lg transition-colors"
                >
                    Next Round →
                </button>
            </div>
        );
    }

    // RESULTS Phase
    if (gameState.phase === 'RESULTS') {
        return (
            <div className="flex flex-col items-center w-full bg-gray-900 p-8 rounded-xl border border-gray-700 min-h-[500px]">
                {gameState.hasConverged ? (
                    <>
                        <h1 className="text-4xl font-black text-green-500 mb-4 animate-bounce">
                            🎉 MINDS MATCHED! 🎉
                        </h1>
                        <p className="text-gray-400 mb-2">Everyone said:</p>
                        <p className="text-5xl font-black text-cyan-400 mb-4">"{gameState.convergenceWord}"</p>
                        <p className="text-xl text-gray-500 mb-8">
                            Converged in {gameState.currentRound} round{gameState.currentRound !== 1 ? 's' : ''}
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-black text-yellow-500 mb-4">
                            😅 No Convergence
                        </h1>
                        <p className="text-gray-400 mb-8">
                            Reached maximum {gameState.maxRounds} rounds without matching!
                        </p>
                    </>
                )}

                <div className="w-full max-w-md">
                    <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-3">Final Scores</h3>
                    <div className="flex flex-col gap-2">
                        {room.players
                            .sort((a, b) => b.score - a.score)
                            .map((p, i) => (
                                <div
                                    key={p.id}
                                    className={`flex justify-between items-center p-3 rounded-lg ${i === 0 ? 'bg-yellow-900/30 border border-yellow-500' :
                                        i === 1 ? 'bg-gray-800/50 border border-gray-600' :
                                            i === 2 ? 'bg-orange-900/30 border border-orange-700' :
                                                'bg-gray-800/30 border border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}
                                        </span>
                                        <span className="text-white font-bold">{p.name}</span>
                                    </div>
                                    <span className="text-cyan-400 font-mono font-bold">{p.score} pts</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
