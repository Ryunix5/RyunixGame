export const AnimatedBackground: React.FC = () => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                backgroundColor: '#0a0a0a',
                backgroundImage: 'url(/dark_rpg_trial_room.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.4) contrast(1.2) grayscale(0.5)'
            }}
        >
            {/* Retro 8-bit Dungeon Grid / Danganronpa cutscene style */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.2, // Subtle so it doesn't distract
                    backgroundImage: `
                        linear-gradient(#ff007f 1px, transparent 1px),
                        linear-gradient(90deg, #ff007f 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    backgroundPosition: 'center center',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)' // Dark vignette for that dungeon feel
                }}
            />
            
            {/* CRT Scanline overlay effect */}
            <div 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                    backgroundSize: '100% 4px, 3px 100%',
                    pointerEvents: 'none',
                    zIndex: 10
                }}
            />
        </div>
    );
};
