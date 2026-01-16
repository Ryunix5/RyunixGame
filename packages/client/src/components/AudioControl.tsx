import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../AudioContext';

export const AudioControl: React.FC = () => {
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

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50">
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
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={musicVolume}
                                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
        </div>
    );
};
