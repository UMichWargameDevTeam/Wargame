'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { getSessionStorageOrFetch, arraysEqual } from '@/lib/utils';
import { Team, Role, RoleInstance } from '@/lib/Types';
import { stringify } from 'querystring';

interface SupplyPointsProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    viewerRoleInstance: RoleInstance | null;
    roleInstances: RoleInstance[];
    teamInstanceRolePoints: number;
    setTeamInstanceRolePoints: React.Dispatch<React.SetStateAction<number>>;
}


export default function SupplyPoints({ joinCode, socketRef, socketReady, viewerRoleInstance, roleInstances, teamInstanceRolePoints, setTeamInstanceRolePoints }: SupplyPointsProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);
    const [viewerPointDestinations, setViewerPointDestinations] = useState<[string, string][]>([]);
    const [sendingPoints, setSendingPoints] = useState<boolean>(false);

    const addedPointsMessageListener = useRef<boolean>(false);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedPointsMessageListener.current) return;
        addedPointsMessageListener.current = true;
        const socket = socketRef.current;

        const handlePointsMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "points") {
                switch (msg.action) {
                    case "send":
                        // TODO
                        break;
                    case "spend":
                        // TODO
                        break;
                }
            }
        };

        socket.addEventListener("message", handlePointsMessage);

        return () => {
            socket.removeEventListener("message", handlePointsMessage);
            addedPointsMessageListener.current = false;
        };
    }, [socketRef, socketReady, setTeamInstanceRolePoints]);

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

                const pointDestinations = getViewerPointDestinations(teamData, roleData, viewerRoleInstance);
                setViewerPointDestinations(pointDestinations);

            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    alert(err.message);
                }
            }
        }

        fetchRoles();
    }, [authedFetch, socketRef, socketReady, viewerRoleInstance]);

    function getViewerPointDestinations(teams: Team[], roles: Role[], roleInstance: RoleInstance): [string, string][] {
        const r = roleInstance.role;
        const viewerTeamName = roleInstance.team_instance.team.name;
        let destinations: [string, string][] = [];

        if (r.name === "Gamemaster") {
            destinations = [
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
            destinations = roles
                    .filter(role => role.is_chief_of_staff)
                    .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        else if (r.is_chief_of_staff) {
            destinations = roles
                .filter(role => role.is_logistics && role.is_commander && role.branch.name === r.branch.name)
                .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        else if (r.is_logistics && r.is_commander) {
            destinations = roles
                .filter(role => role.is_logistics && role.is_vice_commander && role.branch.name === r.branch.name)
                .map(role => [viewerTeamName, role.name] as [string, string]);
        }

        return destinations.sort();
    }

    const handleSendPoints = async (joinCode: string) => {
        if (!socketReady || !socketRef.current) return;
        const socket = socketRef.current;

        try {
            setSendingPoints(true);
            // TODO

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
                <div className="flex flex-col max-h-[80vh]">
                    {teamInstanceRolePoints}
                </div>
            )}
        </div>
    );
};