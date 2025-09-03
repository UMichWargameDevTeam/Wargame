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
    const messagesDivRef = useRef<HTMLDivElement | null>(null);
    const wasAtBottomRef = useRef(true);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const maxLength = 400;

    useEffect(() => {
        if (!messagesDivRef.current) return;
        const container = messagesDivRef.current;

        const handleScroll = () => {
            wasAtBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // auto-scroll to bottom if scroll was already near bottom when new message is sent
    useEffect(() => {
        if (!messagesDivRef.current) return;
        const container = messagesDivRef.current;

        if (wasAtBottomRef.current) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }, [messages]);

    // when opening a new channel, set scroll to the bottom of the channel
    useEffect(() => {
        if (!messagesDivRef.current) return;
        const container = messagesDivRef.current;

        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }, [channel]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        const value = textarea.value;

        const container = messagesDivRef.current;
        const isAtBottom = container
            ? container.scrollHeight - container.scrollTop - container.clientHeight < 2
            : true;

        if (value.length <= maxLength) {
            setInput(value);
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        } else {
            setInput(value.slice(0, maxLength));
        }

        if (container && isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }
    };


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
                <h4 className="text-lg font-semibold"># {channel}</h4>
            </div>

            <div ref={messagesDivRef} className="overflow-y-auto">
                {messages.length == 0 && (
                    <p className="text-sm text-gray-400">Be the first to send a message in this channel...</p>
                )}
                {messages.map((message, index) => (
                    <ChatMessage
                        key={message.id}
                        roleInstance={roleInstance}
                        message={message}
                        previousSender={index > 0 ? messages[index - 1].role_instance.user.id : null}
                    />
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                }}
            >
                <div className="flex gap-2 mt-3">
                    <textarea
                        ref={textareaRef}
                        placeholder="Send message..."
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
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
