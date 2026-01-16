import React from 'react';
import { Player } from '@ryunix/shared';

interface LeaderboardProps {
    players: Player[];
    scores?: { [playerId: string]: number };
    maxHeight?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players, scores, maxHeight = 'max-h-64' }) => {
    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = scores ? (scores[a.id] || 0) : a.score;
        const scoreB = scores ? (scores[b.id] || 0) : b.score;
        return scoreB - scoreA;
    });

    return (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 w-full">
            <h3 className="text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider border-b border-gray-700 pb-2 flex justify-between">
                <span>Leaderboard</span>
                <span>PTS</span>
            </h3>
            <div className={`flex flex-col gap-1 overflow-y-auto ${maxHeight} custom-scrollbar`}>
                {sortedPlayers.map((p, index) => {
                    const score = scores ? (scores[p.id] || 0) : p.score;

                    return (
                        <div key={p.id} className={`flex items-center justify-between p-2 rounded ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'hover:bg-gray-700/50'
                            }`}>
                            <div className="flex items-center gap-2">
                                <span className={`font-mono text-sm w-4 text-center ${index === 0 ? 'text-yellow-400 font-bold' :
                                    index === 1 ? 'text-gray-400' :
                                        index === 2 ? 'text-amber-700' : 'text-gray-600'
                                    }`}>{index + 1}</span>
                                <span className="font-medium text-gray-200 text-sm truncate max-w-[120px]" title={p.name}>
                                    {p.name}
                                </span>
                            </div>
                            <span className={`font-mono font-bold ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-500'
                                }`}>
                                {score}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
