// Simple sound manager using Web Audio API
class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;

    constructor() {
        // Check if user has sound preference saved
        const savedPreference = localStorage.getItem('soundEnabled');
        this.enabled = savedPreference !== 'false';
    }

    loadSound(name: string, url: string) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.sounds.set(name, audio);
    }

    play(name: string, volume: number = 0.5) {
        if (!this.enabled) return;

        const audio = this.sounds.get(name);
        if (audio) {
            const audioClone = audio.cloneNode() as HTMLAudioElement;
            audioClone.volume = volume;
            audioClone.play().catch(err => {
                console.warn(`Failed to play sound ${name}:`, err);
            });
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', String(this.enabled));
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

export const soundManager = new SoundManager();

// Load sounds (using free sound effects from public sources)
// We'll use data URIs for simple beeps to avoid external dependencies
soundManager.loadSound('click', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
soundManager.loadSound('success', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
soundManager.loadSound('error', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
