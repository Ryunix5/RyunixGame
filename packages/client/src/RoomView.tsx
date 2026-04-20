import React from 'react';
import { useSocket } from './SocketContext';
import { useAudio } from './AudioContext';
import { RoomStatus, SocketEvents } from '@ryunix/shared';
import { SplitStealGameComponent } from './SplitStealGame';
import { TheLastWordGame } from './TheLastWordGame';
import { BlindShapesGame } from './BlindShapesGame';
import { PrisonersLetterGame } from './PrisonersLetterGame';
import { UnknownToOneGame } from './UnknownToOneGame';
import { MindReaderGame } from './MindReaderGame';
import { MatchingMindsGame } from './MatchingMindsGame';
import { ResultsView } from './ResultsView';
import { Leaderboard } from './Leaderboard';
import { Button } from './components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from './VoiceContext';
import { PackageSelector } from './components/PackageSelector';

const GAMES = [
    { id: 'split-steal', name: 'Split or Steal', desc: 'Trust and betrayal.', players: '2' },
    { id: 'mind-reader', name: 'Mind Reader', desc: 'Guess the secret word.', players: '2' },
    { id: 'matching-minds', name: 'Matching Minds', desc: 'Sync your thinking!', players: '2-8' },
    { id: 'the-last-word', name: 'The Last Word', desc: 'Word chain game.', players: '2-10' },
    { id: 'deceiving-cards', name: 'Deceiving Cards', desc: 'Find the odd one out.', players: '3-8' },
    { id: 'prisoners-letter', name: 'Prisoners\' Letter', desc: 'Collaborative writing.', players: '2-6' },
    { id: 'unknown-to-one', name: 'Unknown to One', desc: 'Social deduction.', players: '3-8' }
];

const VoiceControls: React.FC = () => {
    const { joined, joinVoice, leaveVoice, isMuted, toggleMute } = useVoice();

    if (!joined) {
        return (
            <Button size="lg" className="pixel-btn px-6 text-xl" onClick={joinVoice}>
                &gt; JOIN VOICE_CHAT
            </Button>
        );
    }

    return (
        <div className="flex gap-4">
            <Button size="lg" className="pixel-btn px-6 text-xl" onClick={toggleMute}>
                {isMuted ? 'UNMUTE_MIC' : 'MUTE_MIC'}
            </Button>
            <Button size="lg" className="pixel-btn px-6 text-xl bg-red-900 border-red-500" onClick={leaveVoice}>
                DISCONNECT_VOICE
            </Button>
        </div>
    );
};

export const RoomView: React.FC = () => {
    const { room, socket, leaveRoom: socketLeaveRoom } = useSocket();
    const { playSound } = useAudio();
    const { leaveVoice, joined } = useVoice();
    const [selectedPackageId, setSelectedPackageId] = React.useState<string>('general');

    // Play victory sound when game finishes
    const prevStatusRef = React.useRef<RoomStatus>();
    React.useEffect(() => {
        if (room && prevStatusRef.current === RoomStatus.GAME && room.status === RoomStatus.RESULTS) {
            playSound('victory');
        }
        if (room) {
            prevStatusRef.current = room.status;
        }
    }, [room?.status, playSound]);

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
        console.log('[Client] Start Game clicked');
        if (!socket) {
            console.error('[Client] Socket not connected');
            alert('Error: Not connected to server');
            return;
        }
        if (!isHost) {
            console.error('[Client] Not host');
            return;
        }
        console.log(`[Client] Emitting START_GAME. Room: ${room.id}, Game: ${selectedGame}, Package: ${selectedPackageId}`);
        socket.emit(SocketEvents.START_GAME, { roomId: room.id, gameId: selectedGame, packageId: selectedPackageId });
    };

    const handleKick = (playerId: string) => {
        if (!isHost || !socket) return;
        if (confirm('Are you sure you want to kick this player?')) {
            socket.emit(SocketEvents.KICK_PLAYER, { roomId: room.id, targetId: playerId });
        }
    };

    const renderLobby = () => (
        <div className="w-full max-w-screen-2xl mx-auto p-8 ani-fade-in flex flex-col gap-12">
            {/* RPG Header */}
            <div className="flex justify-between items-end pb-6 mb-8 lg:p-6 lg:bg-[#151515] lg:border-4 lg:border-white lg:shadow-[8px_8px_0_0_#00e5ff] lg:rounded-none border-b-4 border-slate-800">
                <div>
                    <h1 className="text-4xl font-pixel tracking-tight text-white mb-4 uppercase neon-text-cyan">
                        LOBBY_TERMINAL
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[#ff007f] text-sm font-pixel uppercase">&gt; ROOM_ID:</span>
                        <span className="font-sans font-bold text-2xl text-white bg-black px-2 border-2 border-slate-700">
                            {room.id}
                        </span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <VoiceControls />
                    <Button size="lg" className="pixel-btn px-6 text-xl bg-red-900 border-red-500" onClick={leaveRoom}>
                        EXIT_LOBBY
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 w-full mx-auto">
                {/* Game Selection Pane */}
                <div className="lg:w-2/3 space-y-8 lg:pixel-box lg:p-8">
                    <div className="flex justify-between items-end border-b-4 border-slate-800 pb-4">
                        <h2 className="text-2xl font-pixel text-[#00e5ff] uppercase tracking-widest">
                            &gt; SELECT_QUEST
                        </h2>
                        {!isHost && (
                            <span className="text-xl text-[#ff007f] font-sans font-bold animate-pulse uppercase">
                                WAITING_FOR_HOST...
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {GAMES.map(game => (
                            <div
                                key={game.id}
                                onClick={() => isHost && handleSelectGame(game.id)}
                                className={`
                                    p-4 border-4 transition-all duration-75 relative
                                    ${selectedGame === game.id
                                        ? 'border-white bg-black shadow-[4px_4px_0_0_#ff007f]'
                                        : 'border-slate-800 bg-[#0a0a0a] hover:border-slate-500'}
                                    ${isHost ? 'cursor-pointer hover:bg-black' : 'cursor-default opacity-80'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-pixel text-lg ${selectedGame === game.id ? 'text-[#00e5ff]' : 'text-slate-400'}`}>
                                        {game.name}
                                    </h3>
                                    <span className="text-lg font-sans font-bold bg-white text-black px-2">
                                        {game.players}P
                                    </span>
                                </div>
                                <p className="text-lg font-sans text-slate-300 font-bold">{game.desc}</p>
                                
                                {selectedGame === game.id && (
                                    <div className="absolute top-0 left-0 w-2 h-full bg-[#ff007f]" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Package Selection */}
                    {isHost && selectedGame !== 'matching-minds' && (
                        <div className="w-full mt-8 p-4 border-4 border-slate-800 bg-black">
                            <PackageSelector
                                selectedPackageId={selectedPackageId}
                                onSelectionChange={setSelectedPackageId}
                            />
                        </div>
                    )}

                    {isHost && (
                        <div className="flex justify-end pt-8">
                            <Button size="lg" onClick={startGame} className="pixel-btn px-12 h-16 text-2xl w-full md:w-auto">
                                START_ADVENTURE
                            </Button>
                        </div>
                    )}
                </div>

                {/* Player List Pane */}
                <div className="lg:w-1/3 lg:pixel-box-blue lg:p-6 h-fit">
                    <h2 className="text-xl font-pixel text-[#ff007f] uppercase tracking-widest mb-6 flex justify-between border-b-4 border-slate-800 pb-2">
                        <span>&gt; THE_PARTY</span>
                        <span className="text-white">{room.players.length}/{room.maxPlayers}</span>
                    </h2>
                    <div className="min-h-[300px] bg-black border-4 border-slate-800 p-2">
                        <Leaderboard 
                            players={room.players} 
                            maxHeight="h-full" 
                            myId={socket?.id}
                            isHost={isHost}
                            onKick={handleKick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderGame = () => (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-screen-2xl mx-auto lg:p-12 lg:pixel-box lg:shadow-[12px_12px_0_0_#ff007f] min-h-[80vh] flex flex-col"
            >
                <div className="flex justify-between items-center mb-8 pb-4 border-b-4 border-slate-800">
                    <div className="flex items-center gap-4">
                        <span className="w-4 h-4 bg-[#00e5ff] animate-ping" />
                        <span className="text-xl font-pixel text-[#00e5ff] uppercase tracking-widest">&gt; COMBAT_ENGAGED</span>
                    </div>
                    <Button onClick={leaveRoom} className="pixel-btn bg-red-900 border-red-500 text-xl px-6">
                        FLEE_BATTLE
                    </Button>
                </div>

                {room.gameState?.type === 'split-steal' && <SplitStealGameComponent gameState={room.gameState} />}
                {room.gameState?.type === 'the-last-word' && <TheLastWordGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'deceiving-cards' && <BlindShapesGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'prisoners-letter' && <PrisonersLetterGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'unknown-to-one' && <UnknownToOneGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'mind-reader' && <MindReaderGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'matching-minds' && <MatchingMindsGame gameState={room.gameState as any} />}

                {![
                    'split-steal', 'the-last-word', 'deceiving-cards',
                    'prisoners-letter', 'unknown-to-one', 'mind-reader', 'matching-minds'
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
        <div className="min-h-screen flex items-center justify-center bg-transparent mt-12 lg:p-12 w-full relative z-10">
            {room.status === RoomStatus.LOBBY && renderLobby()}
            {room.status === RoomStatus.GAME && renderGame()}
            {room.status === RoomStatus.RESULTS && <ResultsView />}
        </div>
    );
};
