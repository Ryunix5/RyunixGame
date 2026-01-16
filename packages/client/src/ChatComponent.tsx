import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents, ChatMessage } from '@ryunix/shared';

export const ChatComponent: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
    const { socket, sendChat } = useSocket();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg: ChatMessage) => {
            setMessages(prev => [...prev, msg]);
        };

        socket.on(SocketEvents.CHAT_MESSAGE, handleMessage);

        return () => {
            socket.off(SocketEvents.CHAT_MESSAGE, handleMessage);
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            sendChat(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className={`flex flex-col bg-gray-900 border border-gray-700 rounded-xl overflow-hidden ${height}`}>
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 font-bold text-gray-300 text-sm tracking-wider">
                CHAT
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => (
                    <div key={msg.id} className="text-sm break-words">
                        <span className="font-bold text-cyan-400 mr-2">{msg.senderName}:</span>
                        <span className="text-gray-200">{msg.content}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-2 bg-gray-800 border-t border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold text-xs uppercase transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
};
