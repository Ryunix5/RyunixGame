import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../AudioContext';

export const AudioControl: React.FC = () => {
    const { isMusicEnabled, toggleMusic, musicVolume, sfxVolume, setMusicVolume, setSFXVolume } = useAudio();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50 font-pixel">
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="pixel-btn w-16 h-16 bg-black hover:bg-slate-900 border-4 border-slate-700 flex items-center justify-center shadow-[4px_4px_0_0_#00e5ff] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span className="text-3xl">🔊</span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-80 bg-black border-4 border-slate-800 shadow-[8px_8px_0_0_#ff007f] p-4"
                    >
                        <h3 className="text-[#00e5ff] font-bold text-xl uppercase tracking-widest border-b-4 border-slate-800 pb-2 mb-4">
                            &gt; AUDIO_SETTINGS
                        </h3>

                        <div className="space-y-6">
                            {/* Music Controls */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-lg uppercase tracking-wider">MUSIC_TRACK</span>
                                    <button
                                        onClick={toggleMusic}
                                        className={`px-4 py-2 border-2 text-sm font-bold transition-colors uppercase ${isMusicEnabled
                                                ? 'bg-[#151515] border-[#00e5ff] text-[#00e5ff]'
                                                : 'bg-black border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {isMusicEnabled ? 'ACTIVE' : 'MUTED'}
                                    </button>
                                </div>

                                {isMusicEnabled && (
                                    <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 border-2 border-slate-800">
                                        <span className="text-[#ff007f] text-lg">VOL</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={musicVolume}
                                            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                            className="flex-1 h-4 bg-slate-900 appearance-none cursor-pointer accent-[#00e5ff] border border-slate-700"
                                        />
                                        <span className="text-white text-md font-sans w-12 text-right">{Math.round(musicVolume * 100)}%</span>
                                    </div>
                                )}
                            </div>

                            {/* SFX Controls */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-lg uppercase tracking-wider">SOUND_FX</span>
                                </div>
                                <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 border-2 border-slate-800">
                                    <span className="text-[#00e5ff] text-lg">SFX</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={sfxVolume}
                                        onChange={(e) => setSFXVolume(parseFloat(e.target.value))}
                                        className="flex-1 h-4 bg-slate-900 appearance-none cursor-pointer accent-[#ff007f] border border-slate-700"
                                    />
                                    <span className="text-white text-md font-sans w-12 text-right">{Math.round(sfxVolume * 100)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-2 border-t-2 border-slate-800 text-right">
                            <p className="text-slate-500 text-[10px] uppercase font-sans font-bold tracking-widest">
                                AUDIO INIT ON FIRST INTERACTION
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
