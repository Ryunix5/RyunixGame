import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
    children: ReactNode;
    variant?: 'fade' | 'slide' | 'scale';
}

const variants = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 }
    },
    slide: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
        transition: { duration: 0.4, ease: 'easeInOut' }
    },
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.3 }
    }
};

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, variant = 'fade' }) => {
    const config = variants[variant];

    return (
        <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={config.transition}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
};
