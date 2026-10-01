import React from 'react';
import { useSocket } from './SocketContext';
import { getGameInfo } from '@ryunix/shared';
import { Button } from './components/ui/Button';

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
        <div className="flex flex-col gap-6 w-full max-w-2xl px-4 ani-fade-in items-center">
            <div className="text-center p-6 md:p-8 bg-black border-4 border-white shadow-[8px_8px_0_0_#ff007f] w-full mb-4 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-pixel text-white uppercase neon-text-cyan mb-4">GAME_OVER</h2>
                <p className="font-sans text-xl text-slate-400 uppercase tracking-widest">
                    {gameName ? `${gameName} // Final Results` : 'Final Results'}
                </p>
            </div>

            <div className="w-full flex flex-col gap-3">
                {sortedPlayers.map(p => {
                    const score = results[p.id] || 0;
                    const isWinner = score > 0 && score === topScore;
                    const place = sortedPlayers.findIndex(o => (results[o.id] || 0) === score) + 1; // Tied players share a place

                    return (
                        <div key={p.id} className={`flex items-center justify-between p-4 border-4 ${isWinner
                            ? 'bg-black border-yellow-400 shadow-[4px_4px_0_0_#facc15]'
                            : 'bg-[#0a0a0a] border-slate-800'
                            }`}>
                            <div className="flex items-center gap-4 min-w-0">
                                <span className={`font-pixel text-lg w-10 text-center ${place === 1 ? 'text-yellow-400' :
                                    place === 2 ? 'text-slate-300' :
                                        place === 3 ? 'text-amber-600' : 'text-slate-600'
                                    }`}>#{place}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-sans font-bold text-2xl text-white truncate">{p.name}</span>
                                    {isWinner && <span className="font-pixel text-xs text-yellow-400 uppercase">Winner</span>}
                                    <span className="font-sans text-lg text-slate-500 uppercase">
                                        {p.roomWins} {p.roomWins === 1 ? 'win' : 'wins'} this session
                                    </span>
                                </div>
                            </div>
                            <span className={`font-pixel text-lg md:text-2xl ${score > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                {score > 0 ? '+' : ''}{score}
                            </span>
                        </div>
                    );
                })}
            </div>

            {isHost ? (
                <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-8 w-full sm:w-auto">
                    <Button size="lg" onClick={resetLobby} className="pixel-btn px-8 h-14 text-xl">
                        PLAY_AGAIN
                    </Button>
                    <Button size="lg" onClick={leaveRoom} className="pixel-btn px-6 h-14 text-xl bg-red-900 border-red-500">
                        EXIT_ROOM
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 mt-4 md:mt-8">
                    <p className="font-sans text-xl text-[#ff007f] uppercase animate-pulse">Waiting for the host...</p>
                    <Button size="lg" onClick={leaveRoom} className="pixel-btn px-6 h-14 text-xl bg-red-900 border-red-500">
                        EXIT_ROOM
                    </Button>
                </div>
            )}
        </div>
    );
};
