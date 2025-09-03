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
    viewerRoleInstance: RoleInstance
}

export default function Chat({ socketRef, socketReady, userJoined, viewerRoleInstance }: ChatProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);

    const [viewerChannels, setviewerChannels] = useState<[string, string][]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [activeChannel, setActiveChannel] = useState<[string, string] | null>(null);
    const [unreadChannels, setUnreadChannels] = useState<[string, string][]>([]);

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
                        const receivedMessage = msg.data;
                        const viewerChannel = determineViewerChannel(viewerRoleInstance, receivedMessage);
                        const [viewerTeamName, viewerRoleName] = viewerChannel;
                        const viewerChannelKey = `${viewerTeamName} ${viewerRoleName}`;

                        setMessages(prev => ({
                            ...prev,
                            [viewerChannelKey]: [...(prev[viewerChannelKey] || []), receivedMessage]
                        }));
                        
                        if (!arraysEqual(viewerChannel, activeChannel || [])) {
                            setUnreadChannels(prev =>
                                prev.some(c => arraysEqual(c, viewerChannel)) ? prev : [...prev, viewerChannel]
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
    }, [socketRef, socketReady, viewerRoleInstance, activeChannel]);

    // get list of roles (the channels) this user can message
    useEffect(() => {
        async function fetchRoles() {
            if (!socketReady || !socketRef.current || !userJoined || !viewerRoleInstance) return;

            try {
                const roleData = await getSessionStorageOrFetch<Role[]>("roles", async () => {
                    const res = await authedFetch("/api/roles/");
                    if (!res.ok) throw new Error(`Role fetch failed with ${res.status}`);
                    return res.json();
                });

                const teamData = await getSessionStorageOrFetch<Team[]>("teams", async () => {
                    const res = await authedFetch("/api/teams/");
                    if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                    return res.json();
                });

                const channels = getViewerChannels(teamData, roleData, viewerRoleInstance);
                setviewerChannels(channels);
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
    }, [authedFetch, socketRef, socketReady, userJoined, viewerRoleInstance]);

    function arraysEqual<T>(a: T[], b: T[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((value, index) => value === b[index]);
    }

    function getViewerChannels(teams: Team[], roles: Role[], viewerRoleInstance: RoleInstance): [string, string][] {
        const r = viewerRoleInstance.role;
        const viewerTeamName = viewerRoleInstance.team_instance.team.name;
        let channels: [string, string][] = [];

        if (r.name === "Gamemaster") {
            channels = [
                ["Gamemasters", "Gamemaster"],
                ...teams.flatMap(team =>
                    team.name === "Gamemasters"
                        ? []
                        : roles
                            .filter(role => role.name !== "Gamemaster")
                            .map(role => [team.name, role.name] as [string, string])
                ),
            ];
        }

        if (r.name === "Combatant Commander") {
            channels = [
                [viewerTeamName, r.name],
                ["Gamemasters", "Gamemaster"],
                [viewerTeamName, "Ambassador"],
                ...roles
                    .filter(role => role.is_chief_of_staff)
                    .map(role => [viewerTeamName, role.name] as [string, string])
            ];
        }

        if (r.name === "Ambassador") {
            channels = [
                ["Gamemasters", "Gamemaster"],
                [viewerTeamName, "Combatant Commander"],
                ...roles
                    .filter(role => role.is_chief_of_staff)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
                ...teams
                    .filter(team => team.name !== "Gamemasters")
                    .map(team => [team.name, "Ambassador"] as [string, string]),
            ];
        }

        if (r.is_chief_of_staff) {
            channels = [
                [viewerTeamName, r.name],
                ["Gamemasters", "Gamemaster"],
                [viewerTeamName, "Combatant Commander"],
                ...roles
                    .filter(role => role.is_commander && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string])
            ];
        }

        if (r.is_commander) {
            channels = [
                ["Gamemasters", "Gamemaster"],
                ...roles
                    .filter(role => role.is_chief_of_staff && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
                ...roles
                    .filter(role => role.is_commander && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
                ...roles
                    .filter(role => role.is_vice_commander && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
            ];
        }

        if (r.is_vice_commander) {
            channels = [
                ["Gamemasters", "Gamemaster"],
                ...roles
                    .filter(role => role.is_commander && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
                ...roles
                    .filter(role => role.is_vice_commander && role.branch.name === r.branch.name)
                    .map(role => [viewerTeamName, role.name] as [string, string]),
            ];
        }

        return channels.sort();
    }

    function determineViewerChannel(viewerRoleInstance: RoleInstance, receivedMessage: Message): [string, string] {
        const senderTeamName = receivedMessage.sender_role_instance.team_instance.team.name;
        const senderRoleName = receivedMessage.sender_role_instance.role.name;
        const destinationTeamName = receivedMessage.destination_team_name;
        const destinationRoleName = receivedMessage.destination_role_name;

        const viewerTeamName = viewerRoleInstance.team_instance.team.name;
        const viewerRoleName = viewerRoleInstance.role.name;

        if (viewerTeamName == senderTeamName && viewerRoleName == senderRoleName) {
            return [destinationTeamName, destinationRoleName];
        }

        if (viewerTeamName == destinationTeamName && viewerRoleName == destinationRoleName) {
            return [senderTeamName, senderRoleName];
        }

        throw Error("Recipient of message isn't sender or destination!");
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
                        (() => {
                            const [teamName, roleName] = activeChannel;
                            const channelKey = `${teamName} ${roleName}`;

                            return (
                                <ChatChannel
                                    socketRef={socketRef}
                                    socketReady={socketReady}
                                    viewerRoleInstance={viewerRoleInstance}
                                    destinationTeamName={teamName}
                                    destinationRoleName={roleName}
                                    messages={messages[channelKey] || []}
                                    onBack={() => setActiveChannel(null)}
                                />
                            );
                        })()
                    ) : (
                        <div className="overflow-y-auto">
                            <h4 className="text-lg font-semibold">Select a channel...</h4>
                            <ul className="space-y-2">
                                {viewerChannels.map(([destinationTeamName, destinationRoleName]) => {

                                    const channelKey = `${destinationTeamName} ${destinationRoleName}`;
                                    const channelDisplayName = destinationRoleName === "Gamemaster" ? destinationRoleName : channelKey;

                                    return (
                                        <li
                                            key={channelKey}
                                            className="cursor-pointer bg-neutral-600 hover:bg-neutral-500 rounded px-3 py-2"
                                            onClick={() => {
                                                setActiveChannel([destinationTeamName, destinationRoleName]);
                                                setUnreadChannels(prev => prev.filter(c => !arraysEqual(c, [destinationTeamName, destinationRoleName])));
                                            }}
                                        >
                                            {unreadChannels.some(c => arraysEqual(c, [destinationTeamName, destinationRoleName])) ? (
                                                <div className="font-semibold">
                                                    <span className="text-red-400">! </span> # {channelDisplayName}
                                                </div>
                                            ) : (
                                                <>
                                                    # {channelDisplayName}
                                                </>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
