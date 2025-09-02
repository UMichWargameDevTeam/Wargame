'use client';

import { useState, useEffect, RefObject } from 'react';
import ChatMessage from './ChatMessage';
import { Message, RoleInstance } from '@/lib/Types';

interface ChatChannelProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance
    channel: string;
    messages: Message[];
}

export default function ChatChannel({ socketRef, socketReady, roleInstance, channel, messages }: ChatChannelProps) {

    const [input, setInput] = useState("");
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);
    // TODO: handle message sending over socket here

    const handleSendMessage = () => {
        if (!socketReady) return;
    
        try {
            setSendingMessage(true);

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "chat",
                    action: "send",
                    data: {
                        id: crypto.randomUUID(),
                        role_instance: roleInstance,
                        channel: channel,
                        text: input,
                        timestamp: Date.now(),
                    }
                }));
            }

            setInput('');

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setSendingMessage(false);
        }
    };


    return (
        <>
            <h4 className="text-lg font-semibold">{channel}</h4>
            {messages.map((message) => (
                <ChatMessage
                    key={message.id}
                    roleInstance={roleInstance}
                    message={message}
                />
            ))}
            <span>
                <input
                    type="text"
                    placeholder="Send message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </span>
            <button
                onClick={() => handleSendMessage()}
                disabled={sendingMessage}
                className={`w-full py-2 rounded-lg font-medium transition 
                    ${sendingMessage
                        ? "bg-gray-600 cursor-not-allowed text-gray-300"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
            >
                {sendingMessage ? "Sending..." : "Send"}
            </button>
        </>
    );
}
