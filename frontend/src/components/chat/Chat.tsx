'use client';

import { useEffect, useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import ChatChannel from './ChatChannel';
import { Team, Role, RoleInstance, Message } from '@/lib/Types';
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

    const [teams, setTeams] = useState<Team[] | null>(null);
    const [roles, setRoles] = useState<Role[] | null>(null);

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
                        if (!teams || !roles) return;

                        const chatChannel = determineDestinationChannel(teams, roles, roleInstance, msg.data);
                        console.log(chatChannel);
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
                const roleData = await getSessionStorageOrFetch<Role[]>("roles", async () => {
                    const res = await authedFetch("/api/roles/");
                    if (!res.ok) throw new Error(`Role fetch failed with ${res.status}`);
                    return res.json();
                });
                setRoles(roleData);

                const teamData = await getSessionStorageOrFetch<Team[]>("teams", async () => {
                    const res = await authedFetch("/api/teams/");
                    if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                    return res.json();
                });
                setTeams(teamData);

                const channels = getUserChannels(teamData, roleData, roleInstance);
                setUserChannels(channels);
                setMessages(Object.fromEntries(channels.map(ch => [ch, []])));

                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        channel: "chat",
                        action: "list",
                        roleData: {}
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

    function getUserChannels(teams: Team[], roles: Role[], roleInstance: RoleInstance): string[] {
        let channels: string[] = [];
        const r = roleInstance.role;

        if (r.name === "Gamemaster") {
            channels = [
                "Gamemaster",
                ...teams.flatMap(team =>
                    team.name === "Gamemasters"
                        ? []
                        : roles
                            .filter(role => role.name !== "Gamemaster")
                            .map(role => `${team.name} ${role.name}`)
                ),
            ];
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
                "Gamemaster",
                "Combatant Commander",
                ...roles.filter(role => role.is_chief_of_staff).map(role => role.name),
                ...teams
                    .filter(team => team.name !== "Gamemasters")
                    .map(team => `${team.name} Ambassador`),
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

        return channels.sort();
    }

    function determineDestinationChannel(teams: Team[], roles: Role[],  roleInstance: RoleInstance, message: Message): string {
        const senderRole = message.role_instance.role.name;
        const senderTeam = message.role_instance.team_instance.team.name;
        const recipientRole = roleInstance.role.name;
        const recipientTeam = roleInstance.team_instance.team.name;

        if (senderRole === recipientRole && senderTeam == recipientTeam) {
            return message.channel;
        }

        if (senderRole === "Gamemaster") {
            return "Gamemaster";
        }

        const teamRoleChannel = `${senderTeam} ${senderRole}`;
        const recipientChannels = getUserChannels(teams, roles, roleInstance);
        if (recipientChannels.includes(teamRoleChannel)) {
            return teamRoleChannel;
        }

        return senderRole;
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
