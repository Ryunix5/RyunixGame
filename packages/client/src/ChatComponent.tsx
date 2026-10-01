import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useSocket } from './SocketContext';
import { SocketEvents, ChatMessage, INPUT_LIMITS } from '@ryunix/shared';

export interface ChatComponentHandle {
    clearMessages: () => void;
}

export const ChatComponent = forwardRef<ChatComponentHandle, { height?: string }>(({ height = 'h-64' }, ref) => {
    const { socket, sendChat } = useSocket();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        clearMessages: () => setMessages([])
    }));

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
        <div className={`flex flex-col bg-black border-2 border-slate-800 overflow-hidden ${height}`}>
            <div className="bg-[#111] px-4 py-2 border-b border-slate-800 font-bold text-gray-300 text-sm tracking-wider">
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

            <form onSubmit={handleSend} className="p-2 bg-[#111] border-t border-slate-800 flex gap-2">
                <input
                    maxLength={INPUT_LIMITS.CHAT}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-black border-2 border-slate-600 px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
});

ChatComponent.displayName = 'ChatComponent';
