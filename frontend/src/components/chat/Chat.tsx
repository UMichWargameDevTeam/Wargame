'use client';

import { useEffect, useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import ChatChannel from './ChatChannel';
import { Message, Role, RoleInstance } from '@/lib/Types';
import { getSessionStorageOrFetch } from '@/lib/utils';

interface ChatProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    userJoined: boolean;
    roleInstance: RoleInstance
}

export default function Chat({ socketRef, socketReady, userJoined, roleInstance }: ChatProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);
    const [userChannels, setUserChannels] = useState<string[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [unreadChannels, setUnreadChannels] = useState<string[]>([]);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleChatMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "chat") {
                switch (msg.action) {
                    case "list": 
                        // TODO
                        break;
                    case "send":
                        const chatChannel = determineDestinationChannel(roleInstance, msg.data);
                        const chatMessage = msg.data;
                        setMessages(prev => ({
                            ...prev,
                            [chatChannel]: [...(prev[chatChannel] || []), chatMessage]
                        }));
                        if (chatChannel !== activeChannel) {
                            setUnreadChannels(prev =>
                                prev.includes(msg.channel) ? prev : [...prev, chatChannel]
                            );
                        }
                        break;
                }
            }
        };

        cachedSocket.addEventListener("message", handleChatMessage);

        return () => {
            cachedSocket.removeEventListener("message", handleChatMessage);
        };
    }, [socketRef, socketReady, roleInstance, activeChannel]);

    // get list of roles (the channels) this user can message
    useEffect(() => {
        async function fetchRoles() {
            if (!socketReady || !socketRef.current || !userJoined || !roleInstance) return;

            try {
                const data = await getSessionStorageOrFetch<Role[]>("roles", async () => {
                    const res = await authedFetch("/api/roles/");
                    if (!res.ok) throw new Error(`Role fetch failed with ${res.status}`);
                    return res.json();
                });

                const channels = getUserChannels(roleInstance, data);
                setUserChannels(channels);
                setMessages(Object.fromEntries(channels.map(ch => [ch, []])));

                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        channel: "chat",
                        action: "list",
                        data: {}
                    }));
                }
            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    alert(err.message);
                }
            }
        }

        fetchRoles();
    }, [socketRef, socketReady, userJoined, roleInstance]);

    function getUserChannels(roleInstance: RoleInstance, roles: Role[]): string[] {
        let channels: string[] = [];
        const r = roleInstance.role;

        if (r.name === "Gamemaster") {
            channels = roles.map(role => role.name);
        }

        if (r.name === "Combatant Commander") {
            channels = [
                r.name,
                "Gamemaster",
                "Ambassador",
                ...roles.filter(role => role.is_chief_of_staff).map(role => role.name)
            ];
        }

        if (r.name === "Ambassador") {
            channels = [
                r.name,
                "Gamemaster",
                "Combatant Commander",
                ...roles.filter(role => role.is_chief_of_staff).map(role => role.name)
            ];
        }

        if (r.is_chief_of_staff) {
            channels = [
                r.name,
                "Gamemaster",
                "Combatant Commander",
                ...roles
                    .filter(role => role.is_commander && role.branch === r.branch)
                    .map(role => role.name)
            ];
        }

        if (r.is_commander) {
            channels = [
                "Gamemaster",
                ...roles
                    .filter(role => role.is_chief_of_staff && role.branch === r.branch)
                    .map(role => role.name),
                ...roles
                    .filter(role => role.is_commander && role.branch === r.branch)
                    .map(role => role.name),
                ...roles
                    .filter(role => role.is_vice_commander && role.branch === r.branch)
                    .map(role => role.name),
            ];
        }

        if (r.is_vice_commander) {
            channels = [
                "Gamemaster",
                ...roles
                    .filter(role => role.is_commander && role.branch === r.branch)
                    .map(role => role.name),
                ...roles
                    .filter(role => role.is_vice_commander && role.branch === r.branch)
                    .map(role => role.name),
            ];
        }

        return channels;
    }

    function determineDestinationChannel(roleInstance: RoleInstance, message: Message): string {
        const sender_role = message.role_instance.role.name;
        const destination_role = message.channel;
        const recipient_role = roleInstance.role.name;

        if (recipient_role == destination_role) {
            return sender_role;
        }

        if (recipient_role == sender_role) {
            return destination_role;
        }

        throw Error("The user who received this message is neither the sender nor recipient");
    }

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Chat</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
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
                        <div className="overflow-y-auto">
                            <h4 className="text-lg font-semibold">Select a channel...</h4>
                            <ul className="space-y-2">
                                {userChannels.map(channel => (
                                    <li
                                        key={channel}
                                        className="cursor-pointer bg-neutral-600 hover:bg-neutral-500 rounded px-3 py-2"
                                        onClick={() => {
                                            setActiveChannel(channel);
                                            setUnreadChannels(prev => prev.filter(c => c !== channel));
                                        }}
                                    >
                                        {unreadChannels.includes(channel) ? (
                                            <div className="font-semibold">
                                                <span className="text-red-400">! </span> # {channel}
                                            </div>
                                        ) : (
                                            <>
                                                # {channel}
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
