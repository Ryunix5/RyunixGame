import React from 'react';
import { GameInfo } from '@ryunix/shared';

export const HowToPlay: React.FC<{ game: GameInfo; className?: string }> = ({ game, className = '' }) => (
    <div className={`border-4 border-slate-800 bg-black p-4 ${className}`}>
        <h3 className="font-pixel text-sm md:text-base text-[#ff007f] uppercase tracking-widest mb-3">
            &gt; HOW_TO_PLAY: <span className="text-white">{game.name}</span>
        </h3>
        <ol className="list-decimal pl-6 space-y-2 font-sans text-lg text-slate-300">
            {game.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
            ))}
        </ol>
    </div>
);
