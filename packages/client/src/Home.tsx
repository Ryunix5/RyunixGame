import React, { useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { Button } from './components/ui/Button';
import { ContentEditor } from './ContentEditor';
import { AnimatedBackground } from './components/AnimatedBackground';

export const Home: React.FC = () => {
    const { createRoom, joinRoom, listRooms, availableRooms, error } = useSocket();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [mode, setMode] = useState<'menu' | 'join' | 'create' | 'editor'>('menu');

    useEffect(() => {
        if (mode === 'join') {
            listRooms();
            const interval = setInterval(listRooms, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [mode, listRooms]);

    const handleCreate = () => {
        if (!name) return;
        createRoom(name);
    };

    const handleJoin = (id?: string) => {
        const targetId = id || roomId;
        if (!name || !targetId) return;
        joinRoom(targetId.toUpperCase(), name);
    };

    if (mode === 'editor') {
        return <ContentEditor onBack={() => setMode('menu')} />;
    }

    return (
        <>
            <AnimatedBackground />
            <div className="flex flex-col items-center gap-12 w-full max-w-md p-8 md:p-12 relative">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight uppercase">
                        Welcome to<br />
                        <span className="text-slate-400">Ryunix Games</span>
                    </h1>
                    <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">
                        v0.1.0
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/20 text-red-500 p-4 rounded text-center border-l-4 border-red-500 w-full font-bold">
                        {error}
                    </div>
                )}

                <div className="w-full space-y-4">
                    {mode === 'menu' && (
                        <div className="flex flex-col gap-4 w-full ani-fade-in">
                            <Button
                                size="lg"
                                variant="primary"
                                className="w-full text-lg h-16"
                                onClick={() => setMode('create')}>
                                CREATE ROOM
                            </Button>
                            <Button
                                size="lg"
                                variant="secondary"
                                className="w-full text-lg h-16"
                                onClick={() => setMode('join')}>
                                JOIN ROOM
                            </Button>
                            <button
                                onClick={() => {
                                    const pwd = window.prompt("Enter Admin Password:");
                                    if (pwd === "admin") setMode('editor');
                                    else if (pwd) alert("Incorrect Password");
                                }}
                                className="mt-4 text-xs font-bold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                                Manage Content
                            </button>
                        </div>
                    )}

                    {mode === 'create' && (
                        <div className="flex flex-col gap-6 w-full ani-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Name</label>
                                <input
                                    type="text"
                                    placeholder="ENTER NAME"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-4 bg-slate-900 border-2 border-slate-800 focus:border-slate-500 rounded text-white placeholder-slate-600 focus:outline-none font-bold text-lg transition-colors text-center uppercase"
                                />
                            </div>

                            <Button
                                size="lg"
                                onClick={handleCreate}
                                disabled={!name}
                                className="w-full h-14">
                                START GAME
                            </Button>
                            <button onClick={() => setMode('menu')} className="text-sm text-slate-500 hover:text-white uppercase font-bold tracking-widest">
                                Back
                            </button>
                        </div>
                    )}

                    {mode === 'join' && (
                        <div className="flex flex-col gap-6 w-full ani-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Name</label>
                                <input
                                    type="text"
                                    placeholder="ENTER NAME"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-4 bg-slate-900 border-2 border-slate-800 focus:border-slate-500 rounded text-white placeholder-slate-600 focus:outline-none font-bold text-lg transition-colors text-center uppercase"
                                />
                            </div>

                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Active Rooms</label>
                                {availableRooms.length === 0 ? (
                                    <div className="text-slate-600 text-sm italic text-center p-8 border-2 border-slate-800 border-dashed rounded">No active rooms found.</div>
                                ) : (
                                    availableRooms.map(r => (
                                        <div key={r.id}
                                            onClick={() => { setRoomId(r.id); if (name) joinRoom(r.id, name); }}
                                            className="p-4 bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-slate-600 rounded cursor-pointer group transition-all">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-mono text-white text-lg font-bold">#{r.id}</span>
                                                <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400 group-hover:text-white">{r.playerCount}/{r.maxPlayers}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 uppercase font-bold">Host: {r.hostName}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-800"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-600 text-xs font-bold uppercase">OR Enter Code</span>
                                <div className="flex-grow border-t border-slate-800"></div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="CODE"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="flex-1 p-3 bg-slate-900 border-2 border-slate-800 focus:border-slate-500 rounded text-white text-center focus:outline-none font-mono uppercase font-bold"
                                />
                                <Button
                                    onClick={() => handleJoin()}
                                    disabled={!name || !roomId}
                                    className="px-8">
                                    JOIN
                                </Button>
                            </div>

                            <button onClick={() => setMode('menu')} className="text-sm text-slate-500 hover:text-white uppercase font-bold tracking-widest text-center w-full">
                                Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
