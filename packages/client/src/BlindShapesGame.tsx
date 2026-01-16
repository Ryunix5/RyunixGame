import React from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents } from '@ryunix/shared';
import { ChatComponent } from './ChatComponent';

type Suit = '♠️' | '♥️' | '♦️' | '♣️';

interface BlindShapesState {
    type: 'deceiving-cards';
    round: number;
    suits: { [playerId: string]: Suit };
    guesses: { [playerId: string]: Suit };
    eliminated: string[];
    winnerIds?: string[];
}

export const BlindShapesGame: React.FC<{ gameState: BlindShapesState }> = ({ gameState }) => {
    const { socket, room } = useSocket();
    const myId = socket?.id;

    if (!room || !myId) return null;

    const mySuit = gameState.suits[myId];
    console.log("My hidden suit", mySuit);

    const isEliminated = gameState.eliminated.includes(myId);
    const hasGuessed = !!gameState.guesses[myId];

    // Show my suit ONLY if game over
    const showMySuit = !!gameState.winnerIds;

    const handleGuess = (suit: Suit) => {
        if (hasGuessed || isEliminated) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'guess', suit }
        });
    };

    return (
        <div className="flex flex-col items-center w-full bg-gray-900 p-8 rounded-xl border border-gray-700 min-h-[600px]">
            <header className="mb-8 text-center">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                    DECEIVING CARDS
                </h2>
                <div className="inline-block px-4 py-1 bg-gray-800 rounded-full border border-gray-600 text-cyan-400 font-mono font-bold">
                    ROUND {gameState.round}
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">

                {/* Game Area */}
                <div className="flex-1 flex flex-col items-center">

                    {/* Instruction Banner */}
                    {!isEliminated && !gameState.winnerIds && (
                        <div className="mb-8 text-center animate-pulse">
                            {hasGuessed ? (
                                <span className="text-green-400 text-xl font-bold">Waiting for other players...</span>
                            ) : (
                                <span className="text-yellow-400 text-xl font-bold">Guess YOUR shape!</span>
                            )}
                        </div>
                    )}

                    {/* Players Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full mb-12">
                        {room.players.map(p => {
                            const isMe = p.id === myId;
                            const isDead = gameState.eliminated.includes(p.id);
                            const suit = gameState.suits[p.id];
                            const playerHasGuessed = !!gameState.guesses[p.id];

                            return (
                                <div key={p.id} className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all ${isDead ? 'border-red-900 bg-red-900/10 grayscale opacity-60' :
                                    playerHasGuessed ? 'border-green-500 bg-green-900/20' :
                                        'border-gray-700 bg-gray-800/50'
                                    }`}>
                                    {isDead && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <span className="text-red-500 font-black text-4xl transform -rotate-12 border-4 border-red-500 p-2 rounded opacity-50">OUT</span>
                                        </div>
                                    )}

                                    {!isDead && (
                                        <div className="absolute top-2 right-2">
                                            {playerHasGuessed ? (
                                                <span className="text-green-500 text-xs font-bold">✓ READY</span>
                                            ) : (
                                                <span className="text-gray-500 text-xs font-bold">THINKING</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="w-16 h-16 rounded-full bg-gray-700 mb-3 flex items-center justify-center text-xl font-bold border border-gray-600">
                                        {p.name.slice(0, 2).toUpperCase()}
                                    </div>

                                    <h3 className={`font-bold mb-2 ${isMe ? 'text-cyan-400' : 'text-gray-200'}`}>
                                        {p.name} {isMe && '(YOU)'}
                                    </h3>

                                    {/* CARD DISPLAY */}
                                    <div className={`w-20 h-28 bg-white rounded flex items-center justify-center text-6xl shadow-lg ${isDead ? 'opacity-50' : ''}`}>
                                        {isMe && !showMySuit ? (
                                            <span className="text-3xl text-gray-300">?</span>
                                        ) : (
                                            <span className={suit === '♥️' || suit === '♦️' ? 'text-red-600' : 'text-black'}>
                                                {suit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls (My Turn) */}
                    {!isEliminated && !gameState.winnerIds && (
                        <div className={`flex flex-col items-center transition-all duration-500 ${hasGuessed ? 'opacity-50 pointer-events-none blur-sm' : ''}`}>
                            <div className="flex gap-4">
                                {['♠️', '♥️', '♦️', '♣️'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleGuess(s as Suit)}
                                        className="w-24 h-32 bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-white rounded-xl flex items-center justify-center text-5xl transition-all hover:scale-110 shadow-lg">
                                        <span className={s === '♥️' || s === '♦️' ? 'text-red-500' : 'text-gray-200'}>
                                            {s}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameState.winnerIds && (
                        <div className="mt-8 p-6 bg-green-900/30 border border-green-500 rounded-xl text-center w-full">
                            <h3 className="text-3xl font-black text-green-400 mb-2">GAME OVER</h3>
                            <p className="text-white">Survivors: {gameState.winnerIds.map(id => room.players.find(p => p.id === id)?.name).join(', ')}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar / Chat */}
                <div className="w-full lg:w-80 h-full">
                    <ChatComponent height="h-full min-h-[500px]" />
                </div>

            </div>
        </div>
    );
};
