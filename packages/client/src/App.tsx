import React from 'react';
import { SocketProvider, useSocket } from './SocketContext';
import { VoiceProvider } from './VoiceContext';
import { Home } from './Home';
import { RoomView } from './RoomView';

const AppContent: React.FC = () => {
    const { room } = useSocket();
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans selection:bg-cyan-500/30">
            {!room ? <Home /> : <RoomView />}
        </div>
    );
};

function App() {
    return (
        <SocketProvider>
            <VoiceProvider>
                <AppContent />
            </VoiceProvider>
        </SocketProvider>
    );
}

export default App;
