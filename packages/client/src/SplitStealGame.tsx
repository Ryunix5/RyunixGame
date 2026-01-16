import React from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents } from '@ryunix/shared';
import { Leaderboard } from './Leaderboard';
import { ChatComponent } from './ChatComponent';

// Types mirror the server logic states
// We can import them if we move game definition to shared, 
// but for now we infer from context or define usage types.

export const SplitStealGameComponent: React.FC<{ gameState: any }> = ({ gameState }) => {
    const { socket, room } = useSocket();
    const myId = socket?.id;
    const { round, trustPoints, pairings, decisions, history } = gameState;

    // Find my pair
    const myPair = myId ? pairings.find((p: string[]) => p.includes(myId)) : undefined;
    const opponentId = myPair ? myPair.find((id: string) => id !== myId) : null;
    const opponent = room?.players.find(p => p.id === opponentId);

    // Check if I decided
    const myDecision = decisions[myId || ''];
    const opponentDecision = decisions[opponentId || ''];

    const sendDecision = (value: 'split' | 'steal') => {
        if (!socket || !room) return;
        socket.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'decision', value }
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full">
            {/* Main Game Area */}
            <div className="flex-1 flex flex-col items-center bg-gray-900 p-8 rounded-xl border border-gray-700">
                <header className="flex justify-between w-full mb-8 border-b border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-gray-200">SPLIT OR STEAL <span className="text-cyan-400">ROUND {round}</span></h2>
                    <div className="text-xl font-mono">
                        TRUST: <span className="text-green-400">{trustPoints[myId || '']}</span>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full flex-1 min-h-[400px]">
                    {myPair ? (
                        <>
                            {/* MY CARD */}
                            <div className="flex flex-col items-center">
                                <div className={`
                                    w-48 h-64 rounded-xl border-4 flex items-center justify-center relative transition-all duration-500 transform
                                    ${gameState.phase === 'REVEAL' && myDecision === 'split' ? 'border-blue-500 bg-blue-900/20' : ''}
                                    ${gameState.phase === 'REVEAL' && myDecision === 'steal' ? 'border-red-500 bg-red-900/20' : ''}
                                    ${gameState.phase === 'DECISION' && myDecision ? 'border-slate-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}
                                `}>
                                    {gameState.phase === 'REVEAL' ? (
                                        <div className="text-center">
                                            <div className="text-6xl mb-4">{myDecision === 'split' ? '🤝' : '⚔️'}</div>
                                            <h3 className={`text-2xl font-black uppercase tracking-widest ${myDecision === 'split' ? 'text-blue-400' : 'text-red-400'}`}>
                                                {myDecision}
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-4xl mb-4 text-slate-600">🫵</div>
                                            {myDecision ? (
                                                <span className="text-slate-400 font-bold uppercase tracking-widest">LOCKED IN</span>
                                            ) : (
                                                <span className="text-slate-600 font-mono text-sm uppercase">Make Choice</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <h3 className="mt-4 font-bold text-slate-300">YOU</h3>
                            </div>

                            {/* VS BADGE */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-4xl font-black text-slate-700">VS</div>
                                {gameState.phase === 'REVEAL' && (
                                    <div className="mt-8 flex flex-col items-center ani-fade-in">
                                        <div className="w-6 h-6 border-b-2 border-r-2 border-slate-500 rounded-full animate-spin mb-2"></div>
                                        <span className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                                            Next Round...
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* OPPONENT CARD */}
                            <div className="flex flex-col items-center">
                                <div className={`
                                    w-48 h-64 rounded-xl border-4 flex items-center justify-center relative transition-all duration-500 transform
                                    ${gameState.phase === 'REVEAL' && opponentDecision === 'split' ? 'border-blue-500 bg-blue-900/20' : ''}
                                    ${gameState.phase === 'REVEAL' && opponentDecision === 'steal' ? 'border-red-500 bg-red-900/20' : ''}
                                    ${gameState.phase === 'DECISION' && opponentDecision ? 'border-slate-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}
                                `}>
                                    {gameState.phase === 'REVEAL' ? (
                                        <div className="text-center">
                                            <div className="text-6xl mb-4">{opponentDecision === 'split' ? '🤝' : '⚔️'}</div>
                                            <h3 className={`text-2xl font-black uppercase tracking-widest ${opponentDecision === 'split' ? 'text-blue-400' : 'text-red-400'}`}>
                                                {opponentDecision}
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-4xl mb-4 text-slate-600">👤</div>
                                            {opponentDecision ? (
                                                <span className="text-yellow-500 font-bold uppercase tracking-widest animate-pulse">READY</span>
                                            ) : (
                                                <span className="text-slate-600 font-mono text-sm uppercase">Thinking...</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <h3 className="mt-4 font-bold text-slate-300">{opponent?.name || 'Unknown'}</h3>
                            </div>
                        </>
                    ) : (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-8 rounded-xl text-center">
                            <h3 className="text-xl font-bold text-yellow-500 mb-2">SITTING OUT</h3>
                            <p className="text-yellow-200/60">Odd number of players. You are spectating this round.</p>
                        </div>
                    )}
                </div>

                {gameState.phase === 'DECISION' && myPair && (
                    <div className="mt-8 flex gap-8">
                        <button
                            onClick={() => sendDecision('split')}
                            disabled={!!myDecision}
                            className={`
                                group relative px-8 py-6 rounded-xl transition-all w-52 border-2
                                ${myDecision === 'split' ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-400 ring-offset-4 ring-offset-slate-900' : 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-800'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}>
                            <span className={`block text-3xl font-black mb-1 ${myDecision === 'split' ? 'text-white' : 'text-blue-500 group-hover:text-blue-400'}`}>SPLIT</span>
                            <span className="text-xs text-slate-400 uppercase tracking-widest">Cooperate</span>
                        </button>

                        <button
                            onClick={() => sendDecision('steal')}
                            disabled={!!myDecision}
                            className={`
                                group relative px-8 py-6 rounded-xl transition-all w-52 border-2
                                ${myDecision === 'steal' ? 'bg-red-600 border-red-400 ring-2 ring-red-400 ring-offset-4 ring-offset-slate-900' : 'bg-slate-800 border-slate-700 hover:border-red-500 hover:bg-slate-800'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}>
                            <span className={`block text-3xl font-black mb-1 ${myDecision === 'steal' ? 'text-white' : 'text-red-500 group-hover:text-red-400'}`}>STEAL</span>
                            <span className="text-xs text-slate-400 uppercase tracking-widest">Betray</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
                <Leaderboard players={room!.players} scores={trustPoints} />

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex-1 overflow-y-auto min-h-[200px]">
                    <h3 className="text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider border-b border-gray-700 pb-2">Round History</h3>
                    <div className="space-y-2 text-sm">
                        {history.slice().reverse().map((h: any, i: number) => {
                            const isMeP1 = h.p1 === myId;
                            const isMeP2 = h.p2 === myId;
                            if (!isMeP1 && !isMeP2) return null;
                            const myMove = isMeP1 ? h.d1 : h.d2;
                            const oppMove = isMeP1 ? h.d2 : h.d1;
                            const oppName = room?.players.find(p => p.id === (isMeP1 ? h.p2 : h.p1))?.name;

                            return (
                                <div key={i} className="flex justify-between border-b border-gray-700/50 pb-1 last:border-0">
                                    <span className="text-gray-300">vs {oppName}</span>
                                    <div className="flex gap-2">
                                        <span className={`font-bold ${myMove === 'split' ? 'text-blue-400' : 'text-red-400'}`}>{myMove?.toUpperCase().slice(0, 1)}</span>
                                        <span className="text-gray-600">/</span>
                                        <span className={`font-bold ${oppMove === 'split' ? 'text-blue-400' : 'text-red-400'}`}>{oppMove?.toUpperCase().slice(0, 1)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {history.length === 0 && <span className="text-gray-500 italic text-xs">No history yet.</span>}
                    </div>
                </div>

                <div className="h-64">
                    <ChatComponent />
                </div>
            </div>
        </div>
    );
};
