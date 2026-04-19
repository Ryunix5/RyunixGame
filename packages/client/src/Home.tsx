import React, { useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { Button } from './components/ui/Button';

export const Home: React.FC = () => {
    const { createRoom, joinRoom, listRooms, availableRooms, error } = useSocket();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [mode, setMode] = useState<'menu' | 'join' | 'create'>('menu');

    // Load saved name from localStorage on mount
    useEffect(() => {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            setName(savedName);
        }
    }, []);

    useEffect(() => {
        if (mode === 'join') {
            listRooms();
            const interval = setInterval(listRooms, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [mode, listRooms]);

    const handleNameChange = (newName: string) => {
        setName(newName);
        localStorage.setItem('playerName', newName);
    };

    const handleCreate = () => {
        if (!name.trim()) {
            return;
        }
        createRoom(name);
    };

    const handleJoin = (id?: string) => {
        const targetId = id || roomId;
        if (!name || !targetId) return;
        joinRoom(targetId.toUpperCase(), name);
    };

    return (
        <div className="flex flex-col items-center gap-12 w-full max-w-2xl p-8 md:p-12 relative">
            <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-6xl font-pixel text-white tracking-tight uppercase leading-relaxed neon-text-pink">
                    RYUNIX<br />
                    <span className="text-[#00e5ff] neon-text-cyan block mt-4 text-3xl md:text-5xl">GAMES</span>
                </h1>
                <p className="text-slate-400 font-sans text-xl uppercase tracking-widest bg-black/50 inline-block px-4 py-2 border-2 border-slate-800">
                    INSERT COIN // v0.1.0
                </p>
            </div>

            {error && (
                <div className="bg-red-900/50 text-red-500 p-4 font-sans text-xl border-4 border-red-500 w-full animate-pulse shadow-[4px_4px_0_0_rgba(255,0,0,1)] text-center">
                    {error}
                </div>
            )}

            <div className="w-full max-w-md lg:pixel-box lg:p-8 space-y-4">
                {mode === 'menu' && (
                    <div className="flex flex-col gap-6 w-full ani-fade-in">
                        <Button
                            size="lg"
                            className="w-full text-xl h-16 pixel-btn"
                            onClick={() => setMode('create')}>
                            CREATE ROOM
                        </Button>
                        <Button
                            size="lg"
                            className="w-full text-xl h-16 pixel-btn"
                            onClick={() => setMode('join')}>
                            JOIN ROOM
                        </Button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="flex flex-col gap-6 w-full ani-fade-in">
                        <div className="space-y-2">
                            <label className="text-lg font-pixel text-[#00e5ff] uppercase tracking-widest block mb-2">&gt; YOUR NAME</label>
                            <input
                                type="text"
                                placeholder="ENTER NAME_"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full p-4 bg-black border-4 border-white focus:border-[#ff007f] rounded-none text-white placeholder-slate-700 focus:outline-none font-sans font-bold text-2xl transition-colors text-center uppercase"
                            />
                        </div>

                        <Button
                            size="lg"
                            onClick={handleCreate}
                            disabled={!name}
                            className="w-full h-16 text-xl pixel-btn">
                            START GAME
                        </Button>
                        <button onClick={() => setMode('menu')} className="text-lg font-sans text-slate-400 hover:text-white uppercase font-bold tracking-widest">
                            <span className="text-[#ff007f] mr-2">{"<"}</span> BACK
                        </button>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="flex flex-col gap-6 w-full ani-fade-in">
                        <div className="space-y-2">
                            <label className="text-lg font-pixel text-[#00e5ff] uppercase tracking-widest block mb-2">&gt; YOUR NAME</label>
                            <input
                                type="text"
                                placeholder="ENTER NAME_"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full p-4 bg-black border-4 border-white focus:border-[#ff007f] rounded-none text-white placeholder-slate-700 focus:outline-none font-sans font-bold text-2xl transition-colors text-center uppercase"
                            />
                        </div>

                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar lg:border-t lg:border-b lg:border-slate-800 lg:py-4">
                            <label className="text-lg font-pixel text-[#00e5ff] uppercase tracking-widest block mb-2">&gt; ACTIVE PARTIES</label>
                            {availableRooms.length === 0 ? (
                                <div className="text-slate-500 font-sans text-xl text-center p-8 border-4 border-slate-800 border-dashed rounded-none bg-black/50">NO LOBBIES FOUND.</div>
                            ) : (
                                availableRooms.map(r => (
                                    <div key={r.id}
                                        onClick={() => { setRoomId(r.id); if (name) joinRoom(r.id, name); }}
                                        className="p-4 bg-black hover:bg-[#111] border-4 border-slate-800 hover:border-white rounded-none cursor-pointer group transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-pixel text-[#00e5ff] text-xl">LOBBY_{r.id}</span>
                                            <span className="text-lg font-sans bg-white text-black px-2 py-1 font-bold group-hover:bg-[#ff007f] group-hover:text-white transition-colors">{r.playerCount}/{r.maxPlayers} PLR</span>
                                        </div>
                                        <div className="text-lg text-slate-400 uppercase font-sans">HOST: {r.hostName}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t-4 border-slate-800"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-500 text-lg font-pixel uppercase">OR INPUT CODE</span>
                            <div className="flex-grow border-t-4 border-slate-800"></div>
                        </div>

                        <div className="flex gap-4 flex-col md:flex-row">
                            <input
                                type="text"
                                placeholder="CODE_"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="flex-1 p-4 bg-black border-4 border-white focus:border-[#00e5ff] rounded-none text-white text-center focus:outline-none font-pixel uppercase text-xl"
                            />
                            <Button
                                onClick={() => handleJoin()}
                                disabled={!name || !roomId}
                                className="px-8 text-xl h-16 w-full md:w-auto pixel-btn">
                                ENTER
                            </Button>
                        </div>

                        <button onClick={() => setMode('menu')} className="text-lg font-sans text-slate-400 hover:text-white uppercase font-bold tracking-widest text-center w-full mt-4">
                            <span className="text-[#ff007f] mr-2">{"<"}</span> BACK
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
