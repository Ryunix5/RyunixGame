import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { SocketProvider, useSocket } from './SocketContext';
import { VoiceProvider } from './VoiceContext';
import { AudioProvider } from './AudioContext';
import { Home } from './Home';
import { RoomView } from './RoomView';
import { AnimatedPage } from './components/AnimatedPage';
import { AnimatedBackground } from './components/AnimatedBackground';

const AppContent: React.FC = () => {
    const { room } = useSocket();
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-cyan-500/30 relative">
            <AnimatedBackground />
            <div className="min-h-screen flex items-center justify-center relative" style={{ zIndex: 1 }}>
                <AnimatePresence mode="wait">
                    {!room ? (
                        <AnimatedPage key="home" variant="fade">
                            <Home />
                        </AnimatedPage>
                    ) : (
                        <AnimatedPage key="room" variant="slide">
                            <RoomView />
                        </AnimatedPage>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

function App() {
    return (
        <SocketProvider>
            <VoiceProvider>
                <AudioProvider>
                    <AppContent />
                </AudioProvider>
            </VoiceProvider>
        </SocketProvider>
    );
}

export default App;
