'use client';

import { useEffect, useState, useRef, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import CommunicationsChannel from './CommunicationsChannel';
import { getSessionStorageOrFetch, arraysEqual } from '@/lib/utils';
import { Team, Role, RoleInstance, Message } from '@/lib/Types';

interface CommunicationsProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    viewerRoleInstance: RoleInstance
}

export default function Communications({ socketRef, socketReady, viewerRoleInstance }: CommunicationsProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);

    const [viewerChannels, setviewerChannels] = useState<[string, string][]>([]);
    const [messages, setMessages] = useState<Record<string, Record<string, Message[]>>>({});
    const [activeChannel, setActiveChannel] = useState<[string, string] | null>(null);
    const [unreadChannels, setUnreadChannels] = useState<[string, string][]>([]);

    const addedCommunicationsMessageListener = useRef<boolean>(false);
    const wasAtBottomRef = useRef<boolean>(true);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedCommunicationsMessageListener.current) return;
        addedCommunicationsMessageListener.current = true;
        const socket = socketRef.current;

        const handleCommunicationsMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "communications") {
                switch (msg.action) {
                    case "send":
                        const receivedMessage: Message = msg.data;
                        const viewerIsSender = receivedMessage.sender_role_instance.user.id === viewerRoleInstance.user.id;
                        const viewerChannel = determineViewerChannel(viewerRoleInstance, receivedMessage);
                        const [viewerTeamName, viewerRoleName] = viewerChannel;

                        setMessages(prev => ({
                            ...prev,
                            [viewerTeamName]: {
                                ...prev[viewerTeamName],
                                [viewerRoleName]: [...(prev[viewerTeamName]?.[viewerRoleName] || []), receivedMessage]
                            }
                        }));
                        
                        if (!arraysEqual(viewerChannel, activeChannel || [])
                         || (activeChannel && !viewerIsSender && !wasAtBottomRef.current)) {
                            setUnreadChannels(prev =>
                                prev.some(c => arraysEqual(c, viewerChannel)) ? prev : [...prev, viewerChannel]
                            );
                        }
                        break;
                }
            }
        };

        socket.addEventListener("message", handleCommunicationsMessage);

        return () => {
            socket.removeEventListener("message", handleCommunicationsMessage);
            addedCommunicationsMessageListener.current = false;
        };
    }, [socketRef, socketReady, viewerRoleInstance, activeChannel]);

    // get list of roles (the channels) this user can message
    useEffect(() => {
        async function fetchRoles() {
            if (!socketReady || !socketRef.current || !viewerRoleInstance) return;

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
                setMessages(
                    channels.reduce<Record<string, Record<string, Message[]>>>((acc, [teamName, roleName]) => {
                        if (!acc[teamName]) {
                        acc[teamName] = {};
                        }
                        acc[teamName][roleName] = [];
                        return acc;
                    }, {})
                );
            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    alert(err.message);
                }
            }
        }

        fetchRoles();
    }, [authedFetch, socketRef, socketReady, viewerRoleInstance]);

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
        const recipientTeamName = receivedMessage.recipient_team_name;
        const recipientRoleName = receivedMessage.recipient_role_name;

        const viewerTeamName = viewerRoleInstance.team_instance.team.name;
        const viewerRoleName = viewerRoleInstance.role.name;

        if (viewerTeamName == senderTeamName && viewerRoleName == senderRoleName) {
            return [recipientTeamName, recipientRoleName];
        }

        if (viewerTeamName == recipientTeamName && viewerRoleName == recipientRoleName) {
            return [senderTeamName, senderRoleName];
        }

        throw Error("Recipient of message isn't sender or intended recipient!");
    }

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Communications</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {open && (
                <div className="flex flex-col max-h-[80vh]">
                    {activeChannel ? (
                        <CommunicationsChannel
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={viewerRoleInstance}
                            unreadChannels={unreadChannels}
                            setUnreadChannels={setUnreadChannels}
                            channel={activeChannel}
                            setActiveChannel={setActiveChannel}
                            wasAtBottomRef={wasAtBottomRef}
                            messages={messages[activeChannel[0]]?.[activeChannel[1]] || []}
                        />
                    ) : (
                        <div className="overflow-y-auto">
                            <h4 className="text-md font-semibold mb-2">Select a role to communicate with...</h4>
                            <ul className="space-y-2">
                                {viewerChannels.map((recipientChannel) => {

                                    const [recipientTeamName, recipientRoleName] = recipientChannel;
                                    const channelKey = `${recipientTeamName} ${recipientRoleName}`;
                                    const channelDisplayName = recipientRoleName === "Gamemaster" ? recipientRoleName : channelKey;

                                    return (
                                        <li
                                            key={channelKey}
                                            className="cursor-pointer bg-neutral-600 hover:bg-neutral-500 rounded px-3 py-2"
                                            onClick={() => {
                                                setActiveChannel(recipientChannel);
                                                setUnreadChannels(prev => prev.filter(c => !arraysEqual(c, recipientChannel)));
                                            }}
                                        >
                                            {unreadChannels.some(c => arraysEqual(c, recipientChannel)) ? (
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
