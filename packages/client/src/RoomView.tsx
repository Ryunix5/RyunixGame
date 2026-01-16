import React from 'react';
import { useSocket } from './SocketContext';
import { RoomStatus, SocketEvents } from '@ryunix/shared';
import { SplitStealGameComponent } from './SplitStealGame';
import { TheLastWordGame } from './TheLastWordGame';
import { BlindShapesGame } from './BlindShapesGame';
import { PrisonersLetterGame } from './PrisonersLetterGame';
import { UnknownToOneGame } from './UnknownToOneGame';
import { MindReaderGame } from './MindReaderGame';
import { ResultsView } from './ResultsView';
import { Leaderboard } from './Leaderboard';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from './VoiceContext';

const GAMES = [
    { id: 'split-steal', name: 'Split or Steal', desc: 'Trust and betrayal.', players: '2' },
    { id: 'mind-reader', name: 'Mind Reader', desc: 'Guess the secret word.', players: '2' },
    { id: 'the-last-word', name: 'The Last Word', desc: 'Word chain game.', players: '2-10' },
    { id: 'deceiving-cards', name: 'Deceiving Cards', desc: 'Find the odd one out.', players: '3-8' },
    { id: 'prisoners-letter', name: 'Prisoners\' Letter', desc: 'Collaborative writing.', players: '2-6' },
    { id: 'unknown-to-one', name: 'Unknown to One', desc: 'Social deduction.', players: '3-8' }
];

const VoiceControls: React.FC = () => {
    const { joined, joinVoice, leaveVoice, isMuted, toggleMute } = useVoice();

    if (!joined) {
        return (
            <Button size="sm" variant="secondary" onClick={joinVoice}>
                🎤 JOIN VOICE
            </Button>
        );
    }

    return (
        <div className="flex gap-2">
            <Button size="sm" variant={isMuted ? 'danger' : 'primary'} onClick={toggleMute}>
                {isMuted ? '🔇 UNMUTE' : '🎙️ MUTE'}
            </Button>
            <Button size="sm" variant="danger" onClick={leaveVoice}>
                LEAVE VOICE
            </Button>
        </div>
    );
};

export const RoomView: React.FC = () => {
    const { room, socket, leaveRoom: socketLeaveRoom } = useSocket();
    const { leaveVoice, joined } = useVoice();

    const leaveRoom = () => {
        if (joined) leaveVoice();
        socketLeaveRoom();
    };

    // Default to 'split-steal' if nothing selected yet, but prefer room state
    const selectedGame = room?.selectedGameId || 'split-steal';

    if (!room) return null;

    const isHost = socket?.id === room.hostId || room.players.find(p => p.id === socket?.id)?.isHost;

    const handleSelectGame = (gameId: string) => {
        if (!isHost || !socket) return;
        socket.emit(SocketEvents.SELECT_GAME, { roomId: room.id, gameId });
    };

    const startGame = () => {
        if (!socket || !isHost) return;
        socket.emit(SocketEvents.START_GAME, { roomId: room.id, gameId: selectedGame });
    };

    const renderLobby = () => (
        <div className="w-full max-w-5xl p-8 ani-fade-in flex flex-col gap-12">
            {/* Minimalist Header */}
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        RYUNIX GAME
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs uppercase tracking-widest font-bold">Room ID</span>
                        <span className="font-mono text-xl text-slate-300">
                            {room.id}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <VoiceControls />
                    <Button variant="danger" size="sm" onClick={leaveRoom}>
                        LEAVE
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Game Selection */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex justify-between items-end">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            Select Game
                        </h2>
                        {!isHost && (
                            <span className="text-xs text-slate-400 font-mono animate-pulse">
                                HOST IS CHOOSING...
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {GAMES.map(game => (
                            <Card
                                key={game.id}
                                hover={isHost}
                                onClick={() => handleSelectGame(game.id)}
                                className={`
                                    ${selectedGame === game.id
                                        ? 'border-slate-100 bg-slate-800 ring-1 ring-slate-100'
                                        : 'border-slate-800 opacity-60 bg-slate-900'}
                                    ${isHost ? 'hover:opacity-100' : 'cursor-default'}
                                    transition-all duration-200
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold ${selectedGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                                        {game.name}
                                    </h3>
                                    <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                        {game.players}P
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">{game.desc}</p>
                            </Card>
                        ))}
                    </div>

                    {isHost && (
                        <div className="flex justify-end pt-4">
                            <Button size="lg" onClick={startGame} className="px-12">
                                START GAME
                            </Button>
                        </div>
                    )}
                </div>

                {/* Player List */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between">
                        <span>Players</span>
                        <span>{room.players.length}/{room.maxPlayers}</span>
                    </h2>
                    <Card className="min-h-[300px] border-slate-800 bg-slate-900">
                        <Leaderboard players={room.players} maxHeight="h-full" />
                    </Card>

                </div>
            </div>
        </div>
    );

    const renderGame = () => (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-7xl mx-auto p-4"
            >
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">In Game</span>
                    </div>
                    <button onClick={leaveRoom} className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider">
                        Exit
                    </button>
                </div>

                {room.gameState?.type === 'split-steal' && <SplitStealGameComponent gameState={room.gameState} />}
                {room.gameState?.type === 'the-last-word' && <TheLastWordGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'deceiving-cards' && <BlindShapesGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'prisoners-letter' && <PrisonersLetterGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'unknown-to-one' && <UnknownToOneGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'mind-reader' && <MindReaderGame gameState={room.gameState as any} />}

                {![
                    'split-steal', 'the-last-word', 'deceiving-cards',
                    'prisoners-letter', 'unknown-to-one', 'mind-reader'
                ].includes(room.gameState?.type || '') && (
                        <div className="text-center p-12 border border-red-900 bg-red-900/10 rounded">
                            <h2 className="text-xl font-bold text-red-500 mb-2">ERROR</h2>
                            <p className="text-red-400">Unknown game type: {room.gameState?.type}</p>
                        </div>
                    )}
            </motion.div>
        </AnimatePresence>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            {room.status === RoomStatus.LOBBY && renderLobby()}
            {room.status === RoomStatus.GAME && renderGame()}
            {room.status === RoomStatus.RESULTS && <ResultsView />}
        </div>
    );
};
