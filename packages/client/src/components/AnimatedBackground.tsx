import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Animated Grid */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgb(34, 211, 238) 1px, transparent 1px),
                        linear-gradient(to bottom, rgb(34, 211, 238) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Animated gradient orbs */}
            <motion.div
                className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl"
                style={{ top: '10%', left: '10%' }}
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
                className="absolute w-96 h-96 rounded-full bg-purple-500/10 blur-3xl"
                style={{ bottom: '10%', right: '10%' }}
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
