import React from 'react';
import { useSocket } from './SocketContext';
import { getGameInfo } from '@ryunix/shared';

export const ResultsView: React.FC = () => {
    const { room, leaveRoom, resetLobby, playerId } = useSocket();

    if (!room || !room.gameState || !room.gameState.results) return null;

    const isHost = playerId === room.hostId;

    const results = room.gameState.results; // { [playerId: string]: number }
    const sortedPlayers = [...room.players].sort((a, b) => {
        const scoreA = results[a.id] || 0;
        const scoreB = results[b.id] || 0;
        return scoreB - scoreA;
    });
    // Ties at the top all count as winners
    const topScore = Math.max(0, ...sortedPlayers.map(p => results[p.id] || 0));
    const gameName = getGameInfo(room.gameState.type)?.name;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl ani-fade-in items-center">
            <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 w-full mb-8">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">GAME OVER</h2>
                <p className="text-gray-400">{gameName ? `${gameName} · Final Results` : 'Final Results'}</p>
            </div>

            <div className="w-full flex flex-col gap-3">
                {sortedPlayers.map(p => {
                    const score = results[p.id] || 0;
                    const isWinner = score > 0 && score === topScore;
                    const isLoser = score < 0;
                    const place = sortedPlayers.findIndex(o => (results[o.id] || 0) === score) + 1; // Tied players share a place

                    return (
                        <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isWinner ? 'bg-yellow-500/10 border-yellow-500/50 scale-105 shadow-yellow-500/20 shadow-lg' :
                            isLoser ? 'bg-red-500/5 border-red-500/20 opacity-80' :
                                'bg-gray-800 border-gray-700'
                            }`}>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold text-xl w-8 text-center ${place === 1 ? 'text-yellow-400' :
                                    place === 2 ? 'text-gray-400' :
                                        place === 3 ? 'text-amber-600' : 'text-gray-600'
                                    }`}>#{place}</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">{p.name}</span>
                                    {isWinner && <span className="text-xs text-yellow-500 uppercase font-bold tracking-wider">Winner</span>}
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                                        {p.roomWins} {p.roomWins === 1 ? 'win' : 'wins'} this session
                                    </span>
                                </div>
                            </div>
                            <span className={`text-2xl font-black ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {score > 0 ? '+' : ''}{score}
                            </span>
                        </div>
                    );
                })}
            </div>

            {isHost ? (
                <div className="flex gap-4 mt-8">
                    <button
                        onClick={resetLobby}
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded font-bold transition-all text-white shadow-lg shadow-cyan-500/20">
                        Play Again (Lobby)
                    </button>
                    <button
                        onClick={leaveRoom}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold transition-all border border-gray-600 hover:border-gray-500 text-sm">
                        Exit Room
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <p className="text-gray-500 italic animate-pulse">Waiting for host...</p>
                    <button
                        onClick={leaveRoom}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold transition-all border border-gray-600 hover:border-gray-500 text-sm">
                        Exit Room
                    </button>
                </div>
            )}
        </div>
    );
};
