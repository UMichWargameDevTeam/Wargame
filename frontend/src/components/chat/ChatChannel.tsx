'use client';

import React, { useState, useEffect, useRef, RefObject } from 'react';
import ChatMessage from './ChatMessage';
import { Message, RoleInstance } from '@/lib/Types';
import { arraysEqual } from '@/lib/utils';

interface ChatChannelProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    viewerRoleInstance: RoleInstance;
    unreadChannels: [string, string][];
    setUnreadChannels: React.Dispatch<React.SetStateAction<[string, string][]>>;
    channel: [string, string];
    setActiveChannel: React.Dispatch<React.SetStateAction<[string, string] | null>>;
    wasAtBottomRef: RefObject<boolean>;
    messages: Message[];
}

export default function ChatChannel({ 
    socketRef, socketReady, viewerRoleInstance, 
    unreadChannels, setUnreadChannels, channel, setActiveChannel, wasAtBottomRef, 
    messages
}: ChatChannelProps) {
    const MAX_MESSAGE_LENGTH = 400;
    const SEND_DEBOUNCE_MS = 2000;

    const [input, setInput] = useState("");
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);

    const messagesDivRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const lastSendTimeRef = useRef<number>(0);

    const [destinationTeamName, destinationRoleName] = channel;
    const channelKey = `${destinationTeamName} ${destinationRoleName}`;
    const channelDisplayName = destinationRoleName === "Gamemaster" ? destinationRoleName : channelKey;

    // attach an event listener to the messages div that updates wasAtBottomRef.current dynamically
    useEffect(() => {
        if (!messagesDivRef.current) return;
        const container = messagesDivRef.current;

        const handleScroll = () => {
            wasAtBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (wasAtBottomRef.current) {
                setUnreadChannels(prev => prev.filter(c => !arraysEqual(c, channel)));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [channel, setUnreadChannels, wasAtBottomRef]);

    // auto-scroll to bottom if scroll was already near bottom when new message is sent
    useEffect(() => {
        if (!messagesDivRef.current) return;
        const container = messagesDivRef.current;

        if (wasAtBottomRef.current) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }, [messages, wasAtBottomRef]);

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

        if (value.length <= MAX_MESSAGE_LENGTH) {
            setInput(value);
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        } else {
            setInput(value.slice(0, MAX_MESSAGE_LENGTH));
        }

        if (container && isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }
    };

    const handleSendMessage = () => {
        if (!socketReady || !input.trim()) return;

        const now = Date.now();
        if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS) {
            return;
        }
        lastSendTimeRef.current = now;
    
        try {
            setSendingMessage(true);

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "chat",
                    action: "send",
                    data: {
                        id: crypto.randomUUID(),
                        sender_role_instance: viewerRoleInstance,
                        destination_team_name: destinationTeamName,
                        destination_role_name: destinationRoleName,
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
                    onClick={() => setActiveChannel(null)}
                    className="text-sm text-blue-400 cursor-pointer hover:underline whitespace-nowrap"
                >
                    {unreadChannels.some(c => !arraysEqual(c, channel)) && <span className="text-red-400">! </span>}
                    {"< Back"}
                </button>
                <h4 className="text-lg font-semibold">
                    {unreadChannels.some(c => arraysEqual(c, channel)) && <span className="text-red-400">! </span> }
                    # {channelDisplayName}
                </h4>
            </div>

            <div ref={messagesDivRef} className="overflow-y-auto">
                {messages.length == 0 && (
                    <p className="text-sm text-gray-400">Be the first to send a message in this channel...</p>
                )}
                {messages.map((message, index) => (
                    <ChatMessage
                        key={message.id}
                        destinationTeamName={destinationTeamName}
                        viewerRoleInstance={viewerRoleInstance}
                        message={message}
                        previousMessage={index > 0 ? messages[index - 1] : null}
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
                        disabled={sendingMessage || input.length > MAX_MESSAGE_LENGTH}
                        className={`px-4 py-2 rounded-lg font-medium transition 
                            ${sendingMessage || input.length > MAX_MESSAGE_LENGTH
                                ? "bg-gray-600 cursor-not-allowed text-gray-300"
                                : "bg-green-600 cursor-pointer hover:bg-green-500 text-white"
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
