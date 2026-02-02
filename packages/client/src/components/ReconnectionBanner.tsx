import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface ReconnectionBannerProps {
    status: ConnectionStatus;
    retryCount?: number;
}

export function ReconnectionBanner({ status, retryCount = 0 }: ReconnectionBannerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show banner when not connected
        setIsVisible(status !== 'connected');
    }, [status]);

    const getStatusConfig = () => {
        switch (status) {
            case 'reconnecting':
                return {
                    bg: 'bg-yellow-500/90',
                    icon: '🟡',
                    message: 'Reconnecting...',
                    subMessage: retryCount > 0 ? `Attempt ${retryCount}` : ''
                };
            case 'disconnected':
                return {
                    bg: 'bg-red-500/90',
                    icon: '🔴',
                    message: 'Connection Lost',
                    subMessage: 'Trying to reconnect...'
                };
            default:
                return {
                    bg: 'bg-green-500/90',
                    icon: '🟢',
                    message: 'Connected',
                    subMessage: ''
                };
        }
    };

    const config = getStatusConfig();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
                >
                    <div className={`${config.bg} text-white px-6 py-3 shadow-lg backdrop-blur-sm`}>
                        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                            <span className="text-xl animate-pulse">{config.icon}</span>
                            <div className="flex flex-col">
                                <span className="font-semibold">{config.message}</span>
                                {config.subMessage && (
                                    <span className="text-sm opacity-90">{config.subMessage}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
