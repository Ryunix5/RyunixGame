import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
    playSound: (sound: 'click' | 'success' | 'error' | 'timer' | 'win') => void;
    toggleMusic: () => void;
    toggleSFX: () => void;
    isMusicEnabled: boolean;
    isSFXEnabled: boolean;
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

    const [isSFXEnabled, setIsSFXEnabled] = useState(() => {
        const saved = localStorage.getItem('sfxEnabled');
        return saved !== 'false';
    });

    const [musicVolume, setMusicVolumeState] = useState(() => {
        const saved = localStorage.getItem('musicVolume');
        return saved ? parseFloat(saved) : 0.3;
    });

    const [sfxVolume, setSFXVolumeState] = useState(() => {
        const saved = localStorage.getItem('sfxVolume');
        return saved ? parseFloat(saved) : 0.5;
    });

    const musicRef = useRef<HTMLAudioElement | null>(null);
    const audioContext = useRef<AudioContext | null>(null);

    // Initialize background music
    useEffect(() => {
        musicRef.current = new Audio('/music/main%20menu%20ryunix%20game%20short%20.mp3');
        musicRef.current.loop = true;
        musicRef.current.volume = musicVolume;

        if (isMusicEnabled) {
            musicRef.current.play().catch(err => {
                console.warn('Music autoplay blocked:', err);
            });
        }

        return () => {
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
                musicRef.current.play().catch(err => console.warn('Music play failed:', err));
            } else {
                musicRef.current.pause();
            }
        }
    }, [isMusicEnabled]);

    const toggleMusic = () => {
        const newValue = !isMusicEnabled;
        setIsMusicEnabled(newValue);
        localStorage.setItem('musicEnabled', String(newValue));
    };

    const toggleSFX = () => {
        const newValue = !isSFXEnabled;
        setIsSFXEnabled(newValue);
        localStorage.setItem('sfxEnabled', String(newValue));
    };

    const setMusicVolume = (volume: number) => {
        setMusicVolumeState(volume);
        localStorage.setItem('musicVolume', String(volume));
    };

    const setSFXVolume = (volume: number) => {
        setSFXVolumeState(volume);
        localStorage.setItem('sfxVolume', String(volume));
    };

    // Simple SFX using Web Audio API
    const playSound = (sound: 'click' | 'success' | 'error' | 'timer' | 'win') => {
        if (!isSFXEnabled) return;

        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContext.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Different sounds have different frequencies and durations
        const soundConfig = {
            click: { frequency: 800, duration: 0.05, type: 'sine' as OscillatorType },
            success: { frequency: 1200, duration: 0.15, type: 'triangle' as OscillatorType },
            error: { frequency: 400, duration: 0.2, type: 'sawtooth' as OscillatorType },
            timer: { frequency: 600, duration: 0.1, type: 'square' as OscillatorType },
            win: { frequency: 1500, duration: 0.3, type: 'sine' as OscillatorType }
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
                toggleSFX,
                isMusicEnabled,
                isSFXEnabled,
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
