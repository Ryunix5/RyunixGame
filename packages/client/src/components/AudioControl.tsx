import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../AudioContext';

export const AudioControl: React.FC = () => {
<<<<<<< HEAD
    const { isMusicEnabled, toggleMusic, musicVolume, setMusicVolume } = useAudio();
=======
    const {
        toggleMusic,
        toggleSFX,
        isMusicEnabled,
        isSFXEnabled,
        musicVolume,
        sfxVolume,
        setMusicVolume,
        setSFXVolume
    } = useAudio();

>>>>>>> 599595466dac275e969d92c69afa4a9400992f41
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50">
<<<<<<< HEAD
            {/* Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full shadow-lg flex items-center justify-center text-white border-2 border-slate-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                🎵
            </motion.button>

            {/* Control Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-64 bg-slate-900 rounded-xl shadow-2xl border-2 border-slate-700 p-4"
                    >
                        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Audio Settings</h3>

                        {/* Music Controls */}
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
=======
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-16 right-0 bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700 min-w-[200px]"
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-300">Music</span>
                                    <button
                                        onClick={toggleMusic}
                                        className={`w-12 h-6 rounded-full transition-colors ${isMusicEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <motion.div
                                            className="w-5 h-5 bg-white rounded-full shadow"
                                            animate={{ x: isMusicEnabled ? 26 : 2 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                                {isMusicEnabled && (
>>>>>>> 599595466dac275e969d92c69afa4a9400992f41
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={musicVolume}
                                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
<<<<<<< HEAD
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
=======
                                        className="w-full"
                                    />
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-300">SFX</span>
                                    <button
                                        onClick={toggleSFX}
                                        className={`w-12 h-6 rounded-full transition-colors ${isSFXEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <motion.div
                                            className="w-5 h-5 bg-white rounded-full shadow"
                                            animate={{ x: isSFXEnabled ? 26 : 2 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                                {isSFXEnabled && (
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={sfxVolume}
                                        onChange={(e) => setSFXVolume(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                )}
                            </div>
>>>>>>> 599595466dac275e969d92c69afa4a9400992f41
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
<<<<<<< HEAD
=======

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-800 text-white p-3 rounded-full shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isMusicEnabled || isSFXEnabled ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                )}
            </motion.button>
>>>>>>> 599595466dac275e969d92c69afa4a9400992f41
        </div>
    );
};
