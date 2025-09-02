'use client';

import { useEffect, useState, RefObject } from 'react';
import ChatChannel from './ChatChannel';
import { Message, RoleInstance } from '@/lib/Types';

interface ChatProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance
}

export default function Chat({ socketRef, socketReady, roleInstance }: ChatProps) {
    const [open, setOpen] = useState<boolean>(true);

    // TODO: determine channels based on roleInstance
    const channels = ["Combatant Commanders", "Air Force Operations Commander", "Air Force Logistics Commander"];
    const [messages, setMessages] = useState<Record<string, Message[]>>(
        () => Object.fromEntries(channels.map(ch => [ch, []]))
    );
    const [activeChannel, setActiveChannel] = useState<string | null>(null);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleChatMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "chat") {
                switch (msg.action) {
                    case "list": 
                        {
                            const chatChannel = msg.data.channel;
                            const chatMessages = msg.data.messages;
                            setMessages(prev => ({
                                ...prev,
                                [chatChannel]: chatMessages
                            }));
                        }
                        break;
                    case "send":
                        {
                            const chatChannel = msg.data.channel;
                            const chatMessage = msg.data;
                            setMessages(prev => ({
                                ...prev,
                                [chatChannel]: [...(prev[chatChannel] || []), chatMessage]
                            }));
                        }
                        break;
                }
            }
        };

        cachedSocket.addEventListener("message", handleChatMessage);

        return () => {
            cachedSocket.removeEventListener("message", handleChatMessage);
        };
    }, [socketRef, socketReady]);

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Chat</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>

            {open && (
                <div className="flex flex-col max-h-[80vh]">
                    {activeChannel ? (
                        <ChatChannel
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            channel={activeChannel}
                            messages={messages[activeChannel] || []}
                            onBack={() => setActiveChannel(null)}
                        />
                    ) : (
                        <ul className="space-y-2">
                            {channels.map(channel => (
                                <li
                                    key={channel}
                                    className="cursor-pointer bg-neutral-600 hover:bg-neutral-500 rounded px-3 py-2"
                                    onClick={() => setActiveChannel(channel)}
                                >
                                    {channel}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
