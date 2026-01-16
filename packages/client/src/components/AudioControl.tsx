import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../AudioContext';

export const AudioControl: React.FC = () => {
    const { isMusicEnabled, toggleMusic, musicVolume, setMusicVolume } = useAudio();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full shadow-lg flex items-center justify-center text-white border-2 border-slate-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                🎵
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-64 bg-slate-900 rounded-xl shadow-2xl border-2 border-slate-700 p-4"
                    >
                        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Audio Settings</h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300 text-sm">Music</span>
                                <button
                                    onClick={toggleMusic}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${isMusicEnabled
                                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                                        }`}
                                >
                                    {isMusicEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {isMusicEnabled && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-xs">🔊</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={musicVolume}
                                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <span className="text-slate-400 text-xs w-8">{Math.round(musicVolume * 100)}%</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-slate-500 text-xs">
                                Click anywhere to start music
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
