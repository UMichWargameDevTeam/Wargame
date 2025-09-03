'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import ChatMessage from './ChatMessage';
import { Message, RoleInstance } from '@/lib/Types';

interface ChatChannelProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance
    channel: string;
    messages: Message[];
    onBack: () => void;
}

export default function ChatChannel({ socketRef, socketReady, roleInstance, channel, messages, onBack }: ChatChannelProps) {

    const [input, setInput] = useState("");
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const maxLength = 400;

    // make channel messages scroll to bottom if current scroll is near bottom when a message is sent
    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (isAtBottom) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }, [messages]);

    // when opening a new channel, set scroll to the bottom of the channel
    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }, [channel]);

    const handleSendMessage = () => {
        if (!socketReady || !input.trim()) return;
    
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

            setInput("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }

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
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={onBack}
                    className="text-sm text-blue-400 hover:underline"
                >
                    {"< Back"}
                </button>
                <h4 className="text-lg font-semibold">{channel}</h4>
            </div>

            <div ref={containerRef} className="overflow-y-auto">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        roleInstance={roleInstance}
                        message={message}
                    />
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                }}
            >
                <div className="flex gap-2">
                    <textarea
                        ref={textareaRef}
                        placeholder="Send message..."
                        value={input}
                        onChange={e => {
                            setInput(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        rows={1}
                        className="flex-1 p-2 rounded-lg bg-neutral-700 text-white resize-none overflow-hidden"
                    />
                    <button
                        type="submit"
                        disabled={sendingMessage || input.length > maxLength}
                        className={`px-4 py-2 rounded-lg font-medium transition 
                            ${sendingMessage || input.length > maxLength
                                ? "bg-gray-600 cursor-not-allowed text-gray-300"
                                : "bg-green-600 hover:bg-green-500 text-white"
                            }
                        `}
                    >
                        {sendingMessage ? "Sending..." : "Send"}
                    </button>
                </div>
            </form>
        </>
    );
}
