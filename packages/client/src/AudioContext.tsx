import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
    playSound: (sound: 'click' | 'success' | 'error' | 'roundStart' | 'timerTick' | 'lifeLost' | 'victory') => void;
    toggleMusic: () => void;
    isMusicEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
    setMusicVolume: (volume: number) => void;
    setSFXVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
        const saved = localStorage.getItem('musicEnabled');
        return saved !== 'false';
    });

    const [musicVolume, setMusicVolumeState] = useState(() => {
        const saved = localStorage.getItem('musicVolume');
        return saved ? parseFloat(saved) : 0.3;
    });

    const [sfxVolume, setSFXVolumeInternal] = useState(() => {
        const saved = localStorage.getItem('sfxVolume');
        return saved ? parseFloat(saved) : 0.5;
    });

    const musicRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const hasAutoStarted = useRef(false);

    // Initialize music audio element when user enables music
    const initializeMusicIfNeeded = () => {
        if (!musicRef.current) {
            musicRef.current = new Audio('/music/mainmenu.mp3');
            musicRef.current.loop = true;
            musicRef.current.volume = musicVolume;
        }
    };

    // Auto-start music on first user interaction if music is enabled
    useEffect(() => {
        const handleFirstInteraction = () => {
            if (!hasAutoStarted.current && isMusicEnabled) {
                hasAutoStarted.current = true;
                initializeMusicIfNeeded();
                if (musicRef.current) {
                    musicRef.current.play().catch(() => {
                        // Music autoplay blocked
                    });
                }
            }
        };

        // Listen for any click anywhere on the page
        document.addEventListener('click', handleFirstInteraction, { once: true });

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [isMusicEnabled]);

    // Update music volume when it changes
    useEffect(() => {
        if (musicRef.current) {
            musicRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    // Handle music toggle
    useEffect(() => {
        if (isMusicEnabled) {
            // Create audio element on first enable
            initializeMusicIfNeeded();
            if (musicRef.current) {
                musicRef.current.play().catch(() => {
                    // Music blocked
                });
            }
        } else {
            if (musicRef.current) {
                musicRef.current.pause();
            }
        }
    }, [isMusicEnabled]);

    const toggleMusic = () => {
        const newValue = !isMusicEnabled;
        setIsMusicEnabled(newValue);
        localStorage.setItem('musicEnabled', String(newValue));

        if (newValue) {
            // Create and play music in direct response to user click
            if (!musicRef.current) {
                musicRef.current = new Audio('/music/mainmenu.mp3');
                musicRef.current.loop = true;
                musicRef.current.volume = musicVolume;
            }
            musicRef.current.play().catch(err => {
                console.error('Music play failed:', err);
                alert('Could not play music. Please check if the file exists and try again.');
            });
        }
    };

    const setMusicVolume = (volume: number) => {
        setMusicVolumeState(volume);
        localStorage.setItem('musicVolume', String(volume));
    };

    const setSFXVolume = (volume: number) => {
        setSFXVolumeInternal(volume);
        localStorage.setItem('sfxVolume', String(volume));
    };

    // Simple SFX using Web Audio API
    const playSound = (sound: 'click' | 'success' | 'error' | 'roundStart' | 'timerTick' | 'lifeLost' | 'victory') => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const soundConfig = {
            click: { frequency: 800, duration: 0.05, type: 'sine' as OscillatorType },
            success: { frequency: 1200, duration: 0.15, type: 'triangle' as OscillatorType },
            error: { frequency: 400, duration: 0.2, type: 'sawtooth' as OscillatorType },
            roundStart: { frequency: 1000, duration: 0.3, type: 'triangle' as OscillatorType },
            timerTick: { frequency: 600, duration: 0.05, type: 'square' as OscillatorType },
            lifeLost: { frequency: 300, duration: 0.4, type: 'sawtooth' as OscillatorType },
            victory: { frequency: 1500, duration: 0.5, type: 'sine' as OscillatorType }
        };

        const config = soundConfig[sound];
        oscillator.type = config.type;
        oscillator.frequency.value = config.frequency;
        gainNode.gain.setValueAtTime(sfxVolume * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + config.duration);
    };

    return (
        <AudioContext.Provider
            value={{
                playSound,
                toggleMusic,
                isMusicEnabled,
                musicVolume,
                sfxVolume,
                setMusicVolume,
                setSFXVolume
            }}
        >
            {children}
        </AudioContext.Provider>
    );
};
