import { motion } from 'framer-motion';

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
                pointerEvents: 'none'
            }}
        >
            {/* Animated Grid */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.2,
                    backgroundImage: `
                        linear-gradient(to right, rgb(34, 211, 238) 1px, transparent 1px),
                        linear-gradient(to bottom, rgb(34, 211, 238) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Animated gradient orbs */}
            <motion.div
                style={{
                    position: 'absolute',
                    width: '384px',
                    height: '384px',
                    borderRadius: '9999px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    filter: 'blur(96px)',
                    top: '10%',
                    left: '10%'
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />

            <motion.div
                style={{
                    position: 'absolute',
                    width: '384px',
                    height: '384px',
                    borderRadius: '9999px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    filter: 'blur(96px)',
                    bottom: '10%',
                    right: '10%'
                }}
                animate={{
                    x: [0, -50, 0],
                    y: [0, -30, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />
        </div>
    );
};
