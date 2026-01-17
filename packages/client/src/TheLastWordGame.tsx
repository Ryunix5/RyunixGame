import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { useAudio } from './AudioContext';
import { SocketEvents } from '@ryunix/shared';

// Mirrors backend state
interface TheLastWordState {
    type: 'the-last-word';
    lives: { [playerId: string]: number };
    currentTopic: string;
    answers: Array<{ playerId: string; text: string; timestamp: number }>;
    challenge: {
        active: boolean;
        challengerId?: string;
        targetId?: string;
        answerText?: string;
        votes: { [playerId: string]: 'valid' | 'invalid' };
    } | null;
    round: number;
    phase: 'SETUP' | 'THINKING' | 'REVIEW';
    pendingAnswers: Array<{ playerId: string; text: string; timestamp: number }>;
    timerEndTime?: number;
    winner?: string;
}

export const TheLastWordGame = ({ gameState }: { gameState: TheLastWordState }) => {
    const { room, socket } = useSocket();
    const { playSound } = useAudio();
    const [myAnswer, setMyAnswer] = useState('');
    const [topicInput, setTopicInput] = useState('');
    const myId = socket?.id;
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const isHost = room?.players[0]?.id === myId;
    const isAlive = gameState.lives[myId || ''] > 0;
    const myLives = gameState.lives[myId || ''] || 0;

    // Track previous lives to detect changes
    const prevLivesRef = React.useRef<number>(myLives);

    React.useEffect(() => {
        // Detect life loss
        if (prevLivesRef.current > myLives && myLives >= 0) {
            playSound('lifeLost');
        }
        prevLivesRef.current = myLives;
    }, [myLives, playSound]);

    // Detect victory
    const hasPlayedVictoryRef = React.useRef(false);
    React.useEffect(() => {
        if (gameState.winner && !hasPlayedVictoryRef.current) {
            hasPlayedVictoryRef.current = true;
            playSound('victory');
        }
    }, [gameState.winner, playSound]);

    // Auto-scroll to bottom on new messages
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [gameState.answers]);

    if (!room || !myId) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && myAnswer.trim()) {
            submitAnswer();
        }
    };

    const submitAnswer = () => {
        if (!myAnswer.trim() || !isAlive || gameState.challenge?.active) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'submit_answer', text: myAnswer.trim() }
        });
        setMyAnswer('');
    };

    const setTopic = () => {
        if (!isHost || !topicInput.trim()) return;
        playSound('roundStart');
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'set_topic', topic: topicInput.trim() }
        });
        setTopicInput('');
    };

    const challengeAnswer = (answerText: string) => {
        // Anyone can challenge to pause? Or Host only? 
        // User request was "Room leader... controls". Maybe challenge is still global?
        // Let's keep challenge global to pause, but Host resolves.
        if (!isAlive && !isHost) return; // Dead players can't challenge
        if (gameState.challenge?.active) return;

        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'challenge', answerText }
        });
    };

    const judgeChallenge = (verdict: 'valid' | 'invalid') => {
        if (!isHost || !gameState.challenge?.active) return;
        socket?.emit(SocketEvents.GAME_ACTION, {
            roomId: room.id,
            action: { type: 'judge_challenge', verdict }
        });
    };

    const manualDeduct = (targetId: string) => {
        if (!isHost) return;
        if (confirm(`Deduct 1 Life from ${room.players.find(p => p.id === targetId)?.name}?`)) {
            socket?.emit(SocketEvents.GAME_ACTION, {
                roomId: room.id,
                action: { type: 'deduct_life', targetId }
            });
        }
    };

    // PHASE: THINKING (Timer)
    // We can use this variable for conditional rendering if needed, 
    // but the main rendering handles it via gameState.phase
    // const timeLeft = Math.max(0, Math.ceil(((gameState.timerEndTime || 0) - Date.now()) / 1000));

    return (
        <div className="flex flex-col items-center w-full bg-gray-900 p-6 rounded-xl border border-gray-700 h-[600px]">
            {/* Header */}
            <div className="w-full flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                <div className="flex flex-col gap-2 flex-1">
                    <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Topic</h2>
                    <span className="text-3xl font-black text-cyan-400">{gameState.currentTopic}</span>

                    {/* Host - New Topic Input */}
                    {isHost && gameState.phase !== 'THINKING' && (
                        <div className="flex gap-2 mt-2">
                            <input
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                placeholder="Set new topic..."
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-400"
                            />
                            <button
                                onClick={setTopic}
                                disabled={!topicInput.trim()}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                {gameState.phase === 'REVIEW' ? 'NEXT ROUND (5s Timer)' : 'SET TOPIC (5s Timer)'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-500 font-bold uppercase">Lives</span>
                    <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full ${i < myLives ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-gray-800'}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full flex gap-4 overflow-hidden relative">

                {/* Players List / Lives */}
                <div className="w-48 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-gray-700">
                    <h3 className="text-xs text-gray-500 font-bold uppercase">Players</h3>
                    {room.players.map(p => {
                        return (
                            <div key={p.id} className={`p-2 rounded flex justify-between items-center group relative ${p.id === myId ? 'bg-gray-800 border border-gray-600' : 'bg-transparent'}`}>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold truncate w-24 ${gameState.lives[p.id] > 0 ? 'text-gray-300' : 'text-gray-600 line-through'}`}>{p.name}</span>
                                </div>
                                <span className="font-mono text-red-500 font-bold">{gameState.lives[p.id]}</span>

                                {/* Host Manual Deduct Button */}
                                {
                                    isHost && gameState.lives[p.id] > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); manualDeduct(p.id); }}
                                            className="absolute right-8 text-red-500 hover:text-white bg-red-900/50 hover:bg-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Deduct Life">
                                            -
                                        </button>
                                    )
                                }
                            </div>
                        );
                    })}
                </div>

                {/* Game Feed (Chat Style) */}
                <div className="flex-1 flex flex-col relative">
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2 relative h-full">
                        {gameState.answers.length === 0 && gameState.phase !== 'THINKING' && (
                            <div className="text-center text-gray-600 italic mt-10">Waiting for topic...</div>
                        )}

                        {/* Show submission status during THINKING phase */}
                        {gameState.phase === 'THINKING' && (
                            <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 text-center">
                                <p className="text-cyan-400 text-sm font-bold mb-2">
                                    ⏳ Collecting Answers...
                                </p>
                                <p className="text-gray-400 text-xs">
                                    {gameState.pendingAnswers?.length || 0} / {Object.values(gameState.lives).filter(l => l > 0).length} players submitted
                                </p>
                            </div>
                        )}

                        {/* Show answers only during REVIEW phase */}
                        {gameState.phase === 'REVIEW' && gameState.answers.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                                <div className="bg-gray-800 p-2 px-3 rounded-lg rounded-tl-none border border-gray-700 hover:border-gray-500 transition-colors group relative max-w-[80%]">
                                    <span className="text-xs text-cyan-500 font-bold block mb-0.5">
                                        {room.players.find(p => p.id === a.playerId)?.name || 'Unknown'}
                                    </span>
                                    <span className="text-white text-lg break-words">{a.text}</span>

                                    {/* Challenge Button - Only in REVIEW phase */}
                                    {!gameState.challenge && isAlive && myId !== a.playerId && (
                                        <button
                                            onClick={() => challengeAnswer(a.text)}
                                            className="absolute -right-2 -top-2 bg-red-600 hover:bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            Challenge
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Challenge Modal / Overlay (Host Judge) */}
                    {gameState.challenge && gameState.challenge.active && (
                        <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
                            <h3 className="text-2xl font-bold text-red-500 mb-2 uppercase tracking-widest animate-pulse">Challenge!</h3>
                            <div className="bg-black/40 p-4 rounded-lg border border-red-500/30 mb-6">
                                <p className="text-gray-400 text-sm mb-1">
                                    {room.players.find(p => p.id === gameState.challenge!.challengerId)?.name} challenged
                                </p>
                                <p className="text-3xl font-black text-white">"{gameState.challenge.answerText}"</p>
                            </div>

                            {isHost ? (
                                <div className="flex flex-col gap-2">
                                    <p className="text-yellow-400 text-sm font-bold uppercase mb-2">Host Decision Required</p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => judgeChallenge('valid')}
                                            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded font-bold transition-all text-white shadow-lg border border-green-500">
                                            VALID (Punish Challenger)
                                        </button>
                                        <button
                                            onClick={() => judgeChallenge('invalid')}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded font-bold transition-all text-white shadow-lg border border-red-500">
                                            INVALID (Punish Answerer)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-yellow-500 font-bold animate-pulse">
                                    Waiting for Host Judgment...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={myAnswer}
                            onChange={(e) => setMyAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={gameState.phase === 'THINKING' ? (isAlive ? "QUICK! TYPE A WORD!" : "Dead...") : "Wait for round..."}
                            disabled={!isAlive || gameState.phase !== 'THINKING'}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded p-3 text-white focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                        />
                        <button
                            onClick={submitAnswer}
                            disabled={!isAlive || gameState.phase !== 'THINKING'}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 rounded disabled:opacity-50 transition-colors">
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
