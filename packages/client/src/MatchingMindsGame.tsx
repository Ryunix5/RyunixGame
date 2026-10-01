import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents, MatchingMindsState, INPUT_LIMITS } from '@ryunix/shared';

export const MatchingMindsGame = ({ gameState }: { gameState: MatchingMindsState }) => {
    const { room, socket, playerId } = useSocket();
    const [myWord, setMyWord] = useState('');
    const myId = playerId;

    if (!room || !myId) return null;

    const hasSubmitted = !!gameState.submissions[myId];

    const submitWord = () => {
        if (!myWord.trim() || hasSubmitted) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: {
                type: 'submit_word',
                word: myWord.trim()
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
            <div className="flex flex-col items-center w-full bg-black p-8 border-2 border-slate-800 min-h-[500px]">
                <div className="text-center mb-8">
                    <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-2">Round {gameState.currentRound}</h2>
                    <p className="text-gray-400 text-lg">
                        {gameState.currentRound === 1 
                            ? 'Enter any word to start syncing minds!' 
                            : 'Try to match what the others said!'}
                    </p>
                </div>

                <div className="w-full max-w-md mb-6">
                    <div className="flex gap-2">
                        <input
                            maxLength={INPUT_LIMITS.MATCHING_WORD}
                            type="text"
                            value={myWord}
                            onChange={(e) => setMyWord(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your association..."
                            disabled={hasSubmitted}
                            className="flex-1 min-w-0 bg-[#111] border-2 border-slate-600 p-4 text-white text-lg focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                            autoFocus
                        />
                        <button
                            onClick={submitWord}
                            disabled={!myWord.trim() || hasSubmitted}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 md:px-8 shrink-0 disabled:opacity-50 transition-colors"
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
            <div className="flex flex-col items-center w-full bg-black p-8 border-2 border-slate-800 min-h-[500px]">
                <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Round {gameState.currentRound} Results</h2>

                <div className="w-full max-w-2xl mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        {currentRound.submissions.map((sub, i) => (
                            <div
                                key={i}
                                className="bg-[#111] p-4 border-2 border-slate-800 animate-in slide-in-from-bottom fade-in"
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
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 transition-colors"
                >
                    Next Round →
                </button>
            </div>
        );
    }

    // RESULTS Phase
    if (gameState.phase === 'RESULTS') {
        return (
            <div className="flex flex-col items-center w-full bg-black p-8 border-2 border-slate-800 min-h-[500px]">
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

            </div>
        );
    }

    return null;
};
