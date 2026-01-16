import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket } from './SocketContext';

interface VoiceContextProps {
    joined: boolean;
    isMuted: boolean;
    joinVoice: () => void;
    leaveVoice: () => void;
    toggleMute: () => void;
    peers: { peerId: string; stream: MediaStream }[];
}

const VoiceContext = createContext<VoiceContextProps>({
    joined: false,
    isMuted: false,
    joinVoice: () => { },
    leaveVoice: () => { },
    toggleMute: () => { },
    peers: []
});

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { socket, room } = useSocket();
    const [joined, setJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [peers, setPeers] = useState<{ peerId: string; stream: MediaStream }[]>([]);

    const userStream = useRef<MediaStream | null>(null);
    const peersRef = useRef<{ [peerId: string]: SimplePeer.Instance }>({});

    useEffect(() => {
        if (!socket) return;

        const handleSignal = (data: { from: string; signal: any }) => {
            const peer = peersRef.current[data.from];
            if (peer) {
                peer.signal(data.signal);
            } else {
                // Incoming connection (someone calling me)
                // Only accept if we are joined? Or auto-join?
                // Ideally we handle this flow carefully. 
                // For this simple implementation, we assume if we receive a signal and we are in voice, we accept.
                if (userStream.current) {
                    const newPeer = createPeer(data.from, userStream.current, false); // false = not initiator
                    peersRef.current[data.from] = newPeer;
                    newPeer.signal(data.signal);
                }
            }
        };

        socket.on('voice_signal', handleSignal);

        return () => {
            socket.off('voice_signal', handleSignal);
        };
    }, [socket, joined]);

    // When room players change, we might need to connect to new ones?
    // Actually simpler: When we join, we initiate call to ALL existing players.
    // When a new player joins, they initiate call to US.

    // Monitor room updates to detecting leaving players?
    useEffect(() => {
        if (!room) return;
        const currentIds = room.players.map(p => p.id);

        // Remove peers that left
        Object.keys(peersRef.current).forEach(peerId => {
            if (!currentIds.includes(peerId)) {
                if (peersRef.current[peerId]) {
                    peersRef.current[peerId].destroy();
                }
                delete peersRef.current[peerId];
                setPeers(prev => prev.filter(p => p.peerId !== peerId));
            }
        });
    }, [room]);

    const createPeer = (targetId: string, stream: MediaStream, initiator: boolean) => {
        const peer = new SimplePeer({
            initiator,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket?.emit('voice_signal', {
                to: targetId,
                signal
            });
        });

        peer.on('stream', (remoteStream) => {
            setPeers(prev => {
                const exists = prev.find(p => p.peerId === targetId);
                if (exists) return prev;
                return [...prev, { peerId: targetId, stream: remoteStream }];
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error', err);
        });

        return peer;
    };

    const joinVoice = async () => {
        if (!socket || !room) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            userStream.current = stream;
            setJoined(true);

            // Initiate connection to all OTHER players in the room
            // In mesh, everyone connects to everyone.
            // Convention: We initiate to everyone who has a "lower" ID? 
            // Or simpler: We initiate to everyone currently in the room (assuming they are already listening).
            // But wait, they might not be in voice.
            // Protocol:
            // 1. I join voice.
            // 2. I send "I joined voice" to room? (Or just rely on visual indicator).
            // 3. For now, let's just Try to connect to everyone. 
            // If they are not in voice, they won't respond (no signal handler active if logic correct).
            // Actually, if they are in the room, they have the socket event listener if we put it in context.
            // But if `joined` is false, `userStream.current` is null, so we won't create a peer in handleSignal.

            room.players.forEach(p => {
                if (p.id === socket.id) return;
                const peer = createPeer(p.id, stream, true); // I am initiator
                peersRef.current[p.id] = peer;
            });

        } catch (err) {
            console.error('Failed to get media', err);
            alert('Could not access microphone.');
        }
    };

    const leaveVoice = () => {
        if (userStream.current) {
            userStream.current.getTracks().forEach(track => {
                track.stop();
            });
            userStream.current = null;
        }
        Object.values(peersRef.current).forEach(peer => peer.destroy());
        peersRef.current = {};
        setPeers([]);
        setJoined(false);
        setIsMuted(false);
    };

    // Auto-leave when unmounting or room changes to null (handled partly by useEffect but let's be safe)
    useEffect(() => {
        return () => {
            leaveVoice();
        };
    }, []);

    const toggleMute = () => {
        if (userStream.current) {
            const audioTrack = userStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    return (
        <VoiceContext.Provider value={{ joined, isMuted, joinVoice, leaveVoice, toggleMute, peers }}>
            {children}
            {/* Render Audio Elements */}
            {peers.map(p => (
                <AudioPlayer key={p.peerId} stream={p.stream} />
            ))}
        </VoiceContext.Provider>
    );
};

const AudioPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return <audio ref={ref} autoPlay playsInline />;
};
