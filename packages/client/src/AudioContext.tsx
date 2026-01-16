import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
    playSound: (sound: 'click' | 'success' | 'error') => void;
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
    const hasInteracted = useRef(false);

    // Initialize background music
    useEffect(() => {
        musicRef.current = new Audio('/music/menumain.mp3');
        musicRef.current.loop = true;
        musicRef.current.volume = musicVolume;

        // Try to play music after first user interaction
        const handleFirstInteraction = () => {
            if (!hasInteracted.current && isMusicEnabled && musicRef.current) {
                hasInteracted.current = true;
                musicRef.current.play().catch(() => {
                    console.log('Music playback still blocked');
                });
            }
        };

        // Listen for any click or keypress
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);

        if (isMusicEnabled) {
            musicRef.current.play().catch(() => {
                console.log('Music will play after first user interaction');
            });
        }

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
            if (musicRef.current) {
                musicRef.current.pause();
                musicRef.current = null;
            }
        };
    }, []);

    // Update music volume
    useEffect(() => {
        if (musicRef.current) {
            musicRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    // Handle music toggle
    useEffect(() => {
        if (musicRef.current) {
            if (isMusicEnabled) {
                musicRef.current.play().catch(() => { });
            } else {
                musicRef.current.pause();
            }
        }
    }, [isMusicEnabled]);

    const toggleMusic = () => {
        const newValue = !isMusicEnabled;
        setIsMusicEnabled(newValue);
        localStorage.setItem('musicEnabled', String(newValue));

        if (newValue && musicRef.current) {
            hasInteracted.current = true;
            musicRef.current.play().catch(err => {
                console.log('Music play failed:', err.message);
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
    const playSound = (sound: 'click' | 'success' | 'error') => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const soundConfig = {
            click: { frequency: 800, duration: 0.05 },
            success: { frequency: 1200, duration: 0.15 },
            error: { frequency: 400, duration: 0.2 }
        };

        const config = soundConfig[sound];
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
