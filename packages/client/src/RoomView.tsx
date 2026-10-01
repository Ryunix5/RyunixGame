import React from 'react';
import { useSocket } from './SocketContext';
import { useAudio } from './AudioContext';
import { RoomStatus, SocketEvents, GAME_CATALOG, getGameInfo } from '@ryunix/shared';
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
import { PackageSelector } from './components/PackageSelector';
import { HowToPlay } from './components/HowToPlay';
import { useToast } from './components/Toast';
import { inviteLinkFor } from './invite';

export const RoomView: React.FC = () => {
    const { room, socket, leaveRoom: socketLeaveRoom, playerId } = useSocket();
    const { playSound } = useAudio();
    const [selectedPackageId, setSelectedPackageId] = React.useState<string>('everyday');
    const { showToast } = useToast();
    const [showRules, setShowRules] = React.useState(false);

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

    const leaveRoom = () => socketLeaveRoom();

    // Default to 'split-steal' if nothing selected yet, but prefer room state
    const selectedGame = room?.selectedGameId || 'split-steal';

    if (!room) return null;

    const isHost = playerId === room.hostId;

    const handleSelectGame = (gameId: string) => {
        if (!isHost || !socket) return;
        socket.emit(SocketEvents.SELECT_GAME, { roomId: room.id, gameId });
    };

    const selectedInfo = getGameInfo(selectedGame);
    const playerCount = room.players.length;
    const playerRange = (min: number, max: number) => {
        const cappedMax = Math.min(max, room.maxPlayers);
        return min === cappedMax ? `${min}` : `${min}-${cappedMax}`;
    };
    // Mirrors the server's check so the host sees why they can't start yet
    const startBlockedReason = !selectedInfo ? 'Pick a game'
        : playerCount < selectedInfo.minPlayers ? `Needs at least ${selectedInfo.minPlayers} players (${playerCount} here)`
        : playerCount > selectedInfo.maxPlayers ? `Allows at most ${selectedInfo.maxPlayers} players`
        : null;

    const startGame = () => {
        if (!socket || !isHost || startBlockedReason) return;
        const packageId = selectedInfo?.contentKind ? selectedPackageId : undefined;
        socket.emit(SocketEvents.START_GAME, { roomId: room.id, gameId: selectedGame, packageId });
    };

    // Phones get the native share sheet (straight into a group chat); elsewhere copy the link
    const shareInvite = async () => {
        const url = inviteLinkFor(room.id);
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Ryunix Games', text: `Join my lobby (${room.id})`, url });
                return;
            } catch (err) {
                if ((err as DOMException)?.name === 'AbortError') return; // They closed the share sheet
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            showToast('Invite link copied. Paste it in your group chat!', 'success');
        } catch {
            showToast(`Share this link: ${url}`, 'info', 8000);
        }
    };

    const handleKick = (playerId: string) => {
        if (!isHost || !socket) return;
        if (confirm('Are you sure you want to kick this player?')) {
            socket.emit(SocketEvents.KICK_PLAYER, { roomId: room.id, targetId: playerId });
        }
    };

    const renderLobby = () => (
        <div className="w-full max-w-screen-2xl mx-auto p-4 md:p-8 ani-fade-in flex flex-col gap-8 md:gap-12">
            {/* RPG Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-6 md:mb-8 lg:p-6 lg:bg-[#151515] lg:border-4 lg:border-white lg:shadow-[8px_8px_0_0_#00e5ff] lg:rounded-none border-b-4 border-slate-800">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-4xl font-pixel tracking-tight text-white mb-4 uppercase neon-text-cyan break-words">
                        LOBBY_TERMINAL
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[#ff007f] text-sm font-pixel uppercase">&gt; ROOM_ID:</span>
                        <span className="font-sans font-bold text-2xl text-white bg-black px-2 border-2 border-slate-700">
                            {room.id}
                        </span>
                        <Button size="sm" onClick={shareInvite} className="pixel-btn px-3 text-lg">
                            INVITE
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4">
                    <Button size="lg" className="pixel-btn px-4 md:px-6 text-lg md:text-xl bg-red-900 border-red-500" onClick={leaveRoom}>
                        EXIT_LOBBY
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full mx-auto">
                {/* Game Selection Pane */}
                <div className="lg:w-2/3 space-y-8 lg:pixel-box lg:p-8">
                    <div className="flex flex-wrap gap-2 justify-between items-end border-b-4 border-slate-800 pb-4">
                        <h2 className="text-lg md:text-2xl font-pixel text-[#00e5ff] uppercase tracking-widest">
                            &gt; SELECT_QUEST
                        </h2>
                        {!isHost && (
                            <span className="text-xl text-[#ff007f] font-sans font-bold animate-pulse uppercase">
                                WAITING_FOR_HOST...
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {GAME_CATALOG.map(game => (
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
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className={`font-pixel text-base md:text-lg ${selectedGame === game.id ? 'text-[#00e5ff]' : 'text-slate-400'}`}>
                                        {game.name}
                                    </h3>
                                    <span className="text-lg font-sans font-bold bg-white text-black px-2 whitespace-nowrap">
                                        {playerRange(game.minPlayers, game.maxPlayers)}P
                                    </span>
                                </div>
                                <p className="text-lg font-sans text-slate-300 font-bold">{game.description}</p>
                                
                                {selectedGame === game.id && (
                                    <div className="absolute top-0 left-0 w-2 h-full bg-[#ff007f]" />
                                )}
                            </div>
                        ))}
                    </div>

                    {selectedInfo && <HowToPlay game={selectedInfo} />}

                    {/* Package Selection */}
                    {isHost && selectedInfo?.contentKind && (
                        <div className="w-full mt-8 p-4 border-4 border-slate-800 bg-black">
                            <PackageSelector
                                kind={selectedInfo.contentKind}
                                selectedPackageId={selectedPackageId}
                                onSelectionChange={setSelectedPackageId}
                            />
                        </div>
                    )}

                    {isHost && (
                        <div className="flex flex-col items-stretch md:items-end gap-2 pt-8">
                            <Button
                                size="lg"
                                onClick={startGame}
                                disabled={!!startBlockedReason}
                                className="pixel-btn px-12 h-16 text-2xl w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                START_ADVENTURE
                            </Button>
                            {startBlockedReason && (
                                <span className="text-lg font-sans text-[#ff007f] text-center md:text-right">{startBlockedReason}</span>
                            )}
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
                            myId={playerId ?? undefined}
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
                className="w-full max-w-screen-2xl mx-auto p-4 lg:p-12 lg:pixel-box lg:shadow-[12px_12px_0_0_#ff007f] min-h-[80vh] flex flex-col"
            >
                <div className="flex flex-wrap gap-4 justify-between items-center mb-8 pb-4 border-b-4 border-slate-800">
                    <div className="flex items-center gap-4">
                        <span className="w-4 h-4 bg-[#00e5ff] animate-ping" />
                        <span className="text-sm md:text-xl font-pixel text-[#00e5ff] uppercase tracking-widest">&gt; COMBAT_ENGAGED</span>
                    </div>
                    <div className="flex gap-2">
                        {getGameInfo(room.gameState?.type || '') && (
                            <Button onClick={() => setShowRules(v => !v)} className="pixel-btn text-xl px-4" aria-expanded={showRules}>
                                {showRules ? 'HIDE_RULES' : 'RULES'}
                            </Button>
                        )}
                        <Button onClick={leaveRoom} className="pixel-btn bg-red-900 border-red-500 text-xl px-6">
                            FLEE_BATTLE
                        </Button>
                    </div>
                </div>

                {showRules && getGameInfo(room.gameState?.type || '') && (
                    <HowToPlay game={getGameInfo(room.gameState!.type)!} className="mb-6" />
                )}

                {room.gameState?.type === 'split-steal' && <SplitStealGameComponent gameState={room.gameState} />}
                {room.gameState?.type === 'the-last-word' && <TheLastWordGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'deceiving-cards' && <BlindShapesGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'prisoners-letter' && <PrisonersLetterGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'unknown-to-one' && <UnknownToOneGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'mind-reader' && <MindReaderGame gameState={room.gameState as any} />}
                {room.gameState?.type === 'matching-minds' && <MatchingMindsGame gameState={room.gameState as any} />}

                {!getGameInfo(room.gameState?.type || '') && (
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
