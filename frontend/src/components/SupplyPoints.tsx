'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { getSessionStorageOrFetch } from '@/lib/utils';
import { Team, Role, RoleInstance, TeamInstanceRolePoints, Message } from '@/lib/Types';

interface SupplyPointsProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    viewerRoleInstance: RoleInstance | null;
    teamInstanceRolePoints: number;
    setTeamInstanceRolePoints: React.Dispatch<React.SetStateAction<number>>;
}


export default function SupplyPoints({ joinCode, socketRef, socketReady, viewerRoleInstance, teamInstanceRolePoints, setTeamInstanceRolePoints }: SupplyPointsProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);

    const [viewerTransferRecipients, setViewerTransferRecipients] = useState<[string, string][]>([]);
    const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({});
    const [sendingPoints, setSendingPoints] = useState<boolean>(false);

    const addedPointsMessageListener = useRef<boolean>(false);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || !viewerRoleInstance || addedPointsMessageListener.current) return;
        addedPointsMessageListener.current = true;
        const socket = socketRef.current;

        const handlePointsMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "points") {
                switch (msg.action) {
                    case "send":
                        const transfer: Message = msg.data;
                        const transferAmount = Number(transfer.text);
                        if (transfer.recipient_team_name === viewerRoleInstance.team_instance.team.name
                         && transfer.recipient_role_name === viewerRoleInstance.role.name) {
                            setTeamInstanceRolePoints(prev => prev + transferAmount);
                        }
                        else if (transfer.sender_role_instance.team_instance.team.name === viewerRoleInstance.team_instance.team.name
                              && transfer.sender_role_instance.role.name === viewerRoleInstance.role.name) {
                            setTeamInstanceRolePoints(prev => prev - transferAmount);
                        }
                        else {
                            throw Error("Recipient of message isn't sender or intended recipient!");
                        }
                        break;
                    case "spend":
                        const spendingAmount = msg.data.supply_points;
                        setTeamInstanceRolePoints(prev => prev - spendingAmount);
                        break;
                }
            }
        };

        socket.addEventListener("message", handlePointsMessage);

        return () => {
            socket.removeEventListener("message", handlePointsMessage);
            addedPointsMessageListener.current = false;
        };
    }, [socketRef, socketReady, viewerRoleInstance, setTeamInstanceRolePoints]);

    // get list of roles this user can send points to
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

                const pointRecipients = getViewerTransferRecipients(teamData, roleData, viewerRoleInstance);
                setViewerTransferRecipients(pointRecipients);
                setInputs(
                    pointRecipients.reduce<Record<string, Record<string, string>>>((acc, [teamName, roleName]) => {
                        if (!acc[teamName]) acc[teamName] = {};
                        acc[teamName][roleName] = "0";
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

    function getViewerTransferRecipients(teams: Team[], roles: Role[], roleInstance: RoleInstance): [string, string][] {
        const r = roleInstance.role;
        const viewerTeamName = roleInstance.team_instance.team.name;
        let recipients: [string, string][] = [];

        if (r.name === "Gamemaster") {
            recipients = [
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
            recipients = roles
                    .filter(role => role.is_chief_of_staff)
                    .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        else if (r.is_chief_of_staff) {
            recipients = roles
                .filter(role => role.is_logistics && role.is_commander && role.branch.name === r.branch.name)
                .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        else if (r.is_logistics && r.is_commander) {
            recipients = roles
                .filter(role => role.is_logistics && role.is_vice_commander && role.branch.name === r.branch.name)
                .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        return recipients.sort();
    }

    const validTransferValues = (() => {
        let hasValidGreaterThanZero = false;

        for (const team of Object.values(inputs)) {
            for (const rawValue of Object.values(team)) {
                const num = Number(rawValue);

                if (rawValue !== "" && isNaN(num)) {
                    return false;
                }

                if (num > 0) {
                    hasValidGreaterThanZero = true;
                }
            }
        }

        return hasValidGreaterThanZero;
    })();

    const handleInputChange = (teamName: string, roleName: string, value: string) => {
        setInputs(prev => ({
            ...prev,
            [teamName]: {
                ...prev[teamName],
                [roleName]: value,
            },
        }));
    };

    const handleSendPoints = async (joinCode: string) => {
        if (!joinCode || !socketReady || !socketRef.current || !viewerRoleInstance) return;
        const socket = socketRef.current;

        try {
            setSendingPoints(true);
            const teamName = viewerRoleInstance.team_instance.team.name;
            const roleName = viewerRoleInstance.role.name;

            const res = await authedFetch(`/api/game-instances/${joinCode}/team-instances/${teamName}/role/${roleName}/points/send/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transfers: Object.entries(inputs).flatMap(([teamName, roleInputs]) =>
                        Object.entries(roleInputs)
                            .filter((entry) => parseInt(entry[1]) > 0)
                            .map(([roleName, value]) => ({
                                team_name: teamName,
                                role_name: roleName,
                                supply_points: parseInt(value),
                            }))
                    )
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to add unit instance.');
            }

            if (socket.readyState === WebSocket.OPEN) {
                const transfers: TeamInstanceRolePoints[] = data;
                for (const transfer of transfers) {
                    const messageRecipientTeamName = transfer.team_instance.team.name;
                    const messageRecipientRoleName = transfer.role.name;

                    socket.send(JSON.stringify({
                        channel: "points",
                        action: "send",
                        data: {
                            id: crypto.randomUUID(),
                            sender_role_instance: viewerRoleInstance,
                            recipient_team_name: messageRecipientTeamName,
                            recipient_role_name: messageRecipientRoleName,
                            text: String(transfer.supply_points),
                            timestamp: Date.now(),
                        }
                    }));

                    const messageSenderName = viewerRoleInstance.user.username;
                    const messageSenderTeamName = viewerRoleInstance.team_instance.team.name;
                    const messageSenderRoleName = viewerRoleInstance.role.name;
                    const messageRoleDisplayName = messageSenderTeamName === "Gamemasters" ? messageSenderRoleName : `${messageSenderTeamName} ${messageSenderRoleName}`;
                    const messageText = `${messageRoleDisplayName} ${messageSenderName} transferred ${transfer.supply_points} supply points to ${messageRecipientTeamName} ${messageRecipientRoleName}s.`
    
                    socket.send(JSON.stringify({
                        channel: "communications",
                        action: "send",
                        data: {
                            id: crypto.randomUUID(),
                            sender_role_instance: viewerRoleInstance,
                            recipient_team_name: transfer.team_instance.team.name,
                            recipient_role_name: transfer.role.name,
                            type: "system",
                            text: messageText,
                            timestamp: Date.now(),
                        }
                    }));
                }

            }

            setInputs(prev =>
                Object.fromEntries(
                    Object.entries(prev).map(([team, roles]) => [
                        team,
                        Object.fromEntries(
                            Object.keys(roles).map(role => [role, "0"])
                        )
                    ])
                )
            );

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setSendingPoints(false);
        }
    };
    

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Supply Points</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {open && (
                <div className="flex flex-col max-h-[80vh] overflow-y-auto">

                    {viewerRoleInstance && (() => {
                        
                        const teamName = viewerRoleInstance.team_instance.team.name;
                        const roleName = viewerRoleInstance.role.name;
                        const roleDisplayName = teamName === "Gamemasters" ? roleName : `${teamName} ${roleName}`;

                        return (
                            <p>
                                {roleDisplayName}s have 
                                <span className="font-semibold text-yellow-200"> {teamInstanceRolePoints} </span>
                                supply points.
                            </p>
                        )
                    })()}

                    {viewerTransferRecipients.length > 0 && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendPoints(joinCode);
                            }}
                            className="space-y-3 mt-5"
                        >
                            <h4 className="text-md font-semibold">Send Supply Points</h4>

                            {viewerTransferRecipients.map(([teamName, roleName]) => (
                                <div key={`${teamName} ${roleName}`} className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
                                    <span className="font-bold">{roleName === "Gamemaster" ? roleName : `${teamName} ${roleName}`}</span>
                                    <input
                                        type="number"
                                        value={inputs[teamName]?.[roleName] ?? "0"}
                                        onChange={(e) => handleInputChange(teamName, roleName, e.target.value)}
                                        className="w-[80px] px-2 py-1 bg-neutral-900 border border-gray-600 rounded text-white"
                                        placeholder="0"
                                    />
                                    
                                </div>
                            ))}

                            <button
                                type="submit"
                                disabled={sendingPoints || !validTransferValues}
                                className={`w-full py-2 rounded-lg font-medium 
                                    ${sendingPoints || !validTransferValues
                                        ? "bg-gray-600 cursor-not-allowed text-gray-300"
                                        : "bg-green-600 cursor-pointer hover:bg-green-500 text-white"
                                    }`}
                            >
                                {sendingPoints ? "Sending..." : "Send Points"}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};