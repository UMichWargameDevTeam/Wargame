'use client';

import { useEffect, useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types'

interface UsersListProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    setUserJoined: React.Dispatch<React.SetStateAction<boolean>>;
    roleInstance: RoleInstance | null;
}

export default function UsersList({ socketRef, socketReady, setUserJoined, roleInstance }: UsersListProps) {
    const authedFetch = useAuthedFetch();
    
    const [roleInstances, setRoleInstances] = useState<RoleInstance[]>([]);
    const [deletingRoleInstance, setDeletingRoleInstance] = useState<number | null>(null);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleUsersMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "users") {
                switch (msg.action) {
                    case "list":
                        setRoleInstances(() => msg.data);
                        cachedSocket.send(JSON.stringify({
                            channel: "users",
                            action: "join",
                            data: roleInstance
                        }));
                        break;
                    case "join":
                        setRoleInstances(prev => [...prev, msg.data]);
                        if (msg.data.user.id == roleInstance?.user.id) {
                            setUserJoined(true);
                        }
                        break;
                    case "leave":
                        setRoleInstances(prev => prev.filter(r => r.id !== msg.data.id));
                        break;
                }
            }
        };

        cachedSocket.addEventListener("message", handleUsersMessage);

        return () => {
            cachedSocket.removeEventListener("message", handleUsersMessage);
        };
    }, [socketRef, socketReady, roleInstance]);

    const handleDeleteRoleInstance = async (roleId: number) => {
        if (!socketReady || !socketRef.current) return;
        if (!confirm("Are you sure you want to delete this user's role?")) return;

        try {
            setDeletingRoleInstance(roleId);
            const res = await authedFetch(`/api/role-instances/${roleId}/`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || "Failed to delete this user's role.");
            }

            const roleUserId = roleInstances.find(ri => ri.id === roleId)?.user.id;

            if (socketRef.current?.readyState === WebSocket.OPEN && roleUserId) {
                socketRef.current.send(JSON.stringify({
                    channel: "role_instances",
                    action: "delete",
                    data: { id: roleUserId }
                }));
            }

            setRoleInstances(prev => prev.filter(r => r.id !== roleId));

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setDeletingRoleInstance(null);
        }
    };


    // Group by team > branch > role
    const grouped = roleInstances.reduce((acc, ri) => {
        const team = ri.team_instance.team.name;
        const branch = ri.role.branch?.name || "None";
        const role = ri.role.name;

        if (!acc[team]) acc[team] = {};
        if (!acc[team][branch]) acc[team][branch] = {};
        if (!acc[team][branch][role]) acc[team][branch][role] = [];
        acc[team][branch][role].push(ri);

        return acc;
    }, {} as Record<string, Record<string, Record<string, RoleInstance[]>>>);

    // Color by team
    const teamColor = (team: string) => {
        if (team.toLowerCase() === 'red') return 'text-red-400';
        if (team.toLowerCase() === 'blue') return 'text-blue-400';
        if (team.toLowerCase() === 'gamemasters') return 'text-indigo-400';
        return 'text-gray-300';
    };

    return (
        <div className="bg-neutral-800 p-4 rounded-lg shadow-lg w-full max-w-md max-h-md">
            <h2 className="text-xl font-semibold mb-3 border-b border-neutral-700 pb-1">
                Connected Players
            </h2>
            <div className="space-y-3">
                {Object.keys(grouped).sort().map((team) => (
                    <div key={team}>
                        <h3 className={`text-lg font-bold ${teamColor(team)}`}>{team}</h3>
                        {Object.keys(grouped[team]).sort().map((branch) => (
                            <div key={branch} className="ml-3">
                                <h4 className="text-md font-semibold text-green-300">{branch}</h4>
                                {Object.keys(grouped[team][branch]).sort().map((role) => (
                                    <div key={role} className="ml-4">
                                        <h5 className="text-sm font-medium text-yellow-300">{role}</h5>
                                        <ul className="ml-3 space-y-0.5">
                                            {grouped[team][branch][role]
                                                .sort((a, b) =>
                                                    a.user.username.localeCompare(b.user.username)
                                                )
                                                .map((ri) => (
                                                    <li key={ri.id} className="flex items-center gap-2 text-sm">
                                                        <span>{ri.user.username}</span>
                                                        {roleInstance?.role.name === "Gamemaster" && (
                                                            <button
                                                                onClick={() => handleDeleteRoleInstance(ri.id)}
                                                                disabled={deletingRoleInstance === ri.id} 
                                                                className={`px-2 py-0.5 rounded text-xs transition
                                                                    ${deletingRoleInstance === ri.id
                                                                        ? "bg-gray-500 cursor-not-allowed"
                                                                        : "bg-red-600 hover:bg-red-500 cursor-pointer"
                                                                    }
                                                                `}
                                                            >
                                                                {deletingRoleInstance === ri.id ? "Deleting..." : "Delete"}
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
