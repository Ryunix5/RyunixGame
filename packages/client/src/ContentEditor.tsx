import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/Button';

const EDITABLE_GAMES = [
    { id: 'the-last-word', name: 'The Last Word' },
    { id: 'mind-reader', name: 'Mind Reader' },
    { id: 'unknown-to-one', name: 'Unknown to One' },
    // Add others if they have data-driven content
];

export const ContentEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [selectedGame, setSelectedGame] = useState(EDITABLE_GAMES[0].id);
    const [packs, setPacks] = useState<any[]>([]);
    const [selectedPack, setSelectedPack] = useState<any>(null);
    const [editorContent, setEditorContent] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchPacks(selectedGame);
    }, [selectedGame]);

    const fetchPacks = async (gameId: string) => {
        try {
            const res = await fetch(`/api/content/${gameId}`);
            const data = await res.json();
            setPacks(data);
            if (data.length > 0) {
                selectPack(data[0]);
            } else {
                setSelectedPack(null);
                setEditorContent('');
            }
        } catch (err) {
            console.error(err);
            setStatus('Failed to load packs');
        }
    };

    const selectPack = (pack: any) => {
        setSelectedPack(pack);
        setEditorContent(JSON.stringify(pack.data, null, 2));
    };

    const handleSave = async () => {
        if (!selectedPack) return;
        try {
            const parsedData = JSON.parse(editorContent);
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameType: selectedGame,
                    packName: selectedPack.packName,
                    data: parsedData
                })
            });
            if (res.ok) {
                setStatus('Saved successfully!');
                setTimeout(() => setStatus(''), 2000);
                setTimeout(() => fetchPacks(selectedGame), 500); // Small delay to ensure DB write
            } else {
                setStatus('Save failed');
            }
        } catch (err) {
            setStatus('Invalid JSON');
        }
    };

    return (
        <div className="p-8 w-full max-w-6xl mx-auto flex flex-col gap-6 text-white ani-fade-in">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold uppercase tracking-widest">Content Editor</h1>
                <Button onClick={onBack} variant="secondary">Back to Menu</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar: Game & Pack Selection */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Game</h2>
                        <div className="flex flex-col gap-2">
                            {EDITABLE_GAMES.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGame(g.id)}
                                    className={`p-3 rounded text-left font-bold transition-all ${selectedGame === g.id ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-700' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'}`}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content Packs</h2>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    const name = prompt("Enter new pack name:");
                                    if (name) {
                                        const newPack = { gameType: selectedGame, packName: name, data: {}, version: 1 };
                                        selectPack(newPack);
                                        // Ideally save immediately or let them edit first. 
                                        // For now, selecting it lets them edit and then save.
                                        setEditorContent('{}');
                                    }
                                }}
                                className="p-3 rounded text-center font-bold bg-green-900/50 text-green-400 border border-green-700 hover:bg-green-800 transition-all uppercase tracking-wider text-sm"
                            >
                                + New Pack
                            </button>
                            {packs.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => selectPack(p)}
                                    className={`p-3 rounded text-left font-bold transition-all ${selectedPack?.id === p.id && selectedPack.packName === p.packName ? 'bg-purple-900/50 text-purple-400 border border-purple-700' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'}`}
                                >
                                    {p.packName} <span className="text-xs opacity-50 block">v{p.version}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Editor */}
                <div className="md:col-span-3 flex flex-col gap-4">
                    {selectedPack ? (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">{selectedPack.packName} <span className="text-gray-500 text-sm">Editing JSON Data</span></h2>
                                {status && <span className={`font-bold ${status.includes('fail') || status.includes('Invalid') ? 'text-red-400' : 'text-green-400'}`}>{status}</span>}
                            </div>

                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                className="w-full h-[500px] bg-gray-900 border border-gray-700 rounded p-4 font-mono text-sm text-gray-300 focus:border-cyan-500 focus:outline-none custom-scrollbar"
                            />

                            <div className="flex justify-end gap-4">
                                <Button onClick={() => selectPack(selectedPack)} variant="secondary">Discard Changes</Button>
                                <Button onClick={handleSave} variant="primary">Save Changes</Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-800 rounded">
                            <p className="text-gray-500 font-bold">Select a content pack to edit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
