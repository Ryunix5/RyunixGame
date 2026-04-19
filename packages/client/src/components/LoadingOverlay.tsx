import React from 'react';
import { motion } from 'framer-motion';

export const LoadingOverlay: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
        >
            <div className="flex flex-col items-center gap-8">
                <motion.div
                    animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, -5, 5, 0]
                    }}
                    transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-[#00e5ff] blur-2xl opacity-20 rounded-full animate-pulse" />
                    <img 
                        src="/Logo.png" 
                        alt="Loading Eye" 
                        className="w-48 h-48 drop-shadow-[0_0_15px_rgba(255,0,127,0.8)] relative z-10"
                    />
                </motion.div>
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-[#ff007f] animate-ping" />
                    <h2 className="text-2xl font-pixel text-[#ff007f] tracking-widest uppercase shadow-black drop-shadow-md">
                        &gt; ESTABLISHING_LINK...
                    </h2>
                </div>
            </div>
        </motion.div>
    );
};
