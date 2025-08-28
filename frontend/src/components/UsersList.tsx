'use client';

import { useEffect, useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types'

interface UsersListProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
}

export default function UsersList({ socketRef, socketReady, roleInstance }: UsersListProps) {
    const authedFetch = useAuthedFetch();
    
    const [roleInstances, setRoleInstances] = useState<RoleInstance[]>([]);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleUsersMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "users") {
                switch (msg.action) {
                    case "users_list":
                        setRoleInstances(() => msg.data);
                        break;
                    case "user_join":
                        setRoleInstances(prev => [...prev, msg.data]);
                        break;
                    case "user_leave":
                        setRoleInstances(prev => prev.filter(r => r.id !== msg.data.id));
                        break;
                }
            }
        };

        cachedSocket.addEventListener("message", handleUsersMessage);

        return () => {
            cachedSocket.removeEventListener("message", handleUsersMessage);
        };
    }, [socketRef, socketReady]);

    const handleDeleteRoleInstance = async (roleId: number) => {
        if (!confirm("Are you sure you want to delete this Role Instance?")) return;

        try {
            const res = await authedFetch(`/api/role-instances/${roleId}/`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || 'Failed to delete role instance.');
            }

            setRoleInstances(prev => prev.filter(r => r.id !== roleId));

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
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
                                                                className="bg-red-600 px-2 py-0.5 rounded hover:bg-red-500 text-xs"
                                                            >
                                                                Delete
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
