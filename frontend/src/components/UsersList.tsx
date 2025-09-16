'use client';

import React, { useEffect, useState, useRef, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types'

interface UsersListProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    roleInstances: RoleInstance[];
    setRoleInstances: React.Dispatch<React.SetStateAction<RoleInstance[]>>;
}

export default function UsersList({ socketRef, socketReady, roleInstance, roleInstances, setRoleInstances }: UsersListProps) {
    const authedFetch = useAuthedFetch();
    const [deletingRoleInstance, setDeletingRoleInstance] = useState<number | null>(null);
    const addedUsersMessageListener = useRef<boolean>(false);
    const [open, setOpen] = useState<boolean>(true);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || !roleInstance || addedUsersMessageListener.current) return;
        addedUsersMessageListener.current = true;
        const socket = socketRef.current;

        const handleUsersMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "users") {
                switch (msg.action) {
                    case "list":
                        setRoleInstances(() => msg.data);
                        if (!msg.data.some((ri: RoleInstance) => ri.user.id == roleInstance.user.id)) {
                            socket.send(JSON.stringify({
                                channel: "users",
                                action: "join",
                                data: roleInstance
                            }));
                        }
                        break;
                    case "join":
                        setRoleInstances(prev => [...prev, msg.data]);
                        break;
                    case "leave":
                        setRoleInstances(prev => prev.filter(r => r.id !== msg.data.id));
                        break;
                    case "update_ready":
                        setRoleInstances(prev =>
                            prev.map(r =>
                                r.id === msg.data.id ? { ...r, ready: msg.data.ready } : r
                            )
                        );
                        break;
                }
            }
        };

        socket.addEventListener("message", handleUsersMessage);
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                channel: "users",
                action: "list",
                data: roleInstance
            }));
        }

        return () => {
            socket.removeEventListener("message", handleUsersMessage);
            addedUsersMessageListener.current = false;
        };
    }, [socketRef, socketReady, roleInstance, setRoleInstances]);

    const handleDeleteRoleInstance = async (roleId: number) => {
        if (!socketReady || !socketRef.current) return;
        if (!confirm("Are you sure you want to delete this user's role?")) return;
        const socket = socketRef.current;

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

            if (socket.readyState === WebSocket.OPEN && roleUserId) {
                socket.send(JSON.stringify({
                    channel: "role_instances",
                    action: "delete",
                    data: {
                        id: roleUserId
                    }
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
        const branch = ri.role.branch?.name || "Branch-neutral";
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
        <div className="bg-neutral-700 p-4 rounded-lg shadow-lg w-full max-w-md max-h-md">
            {/* Header with collapse toggle */}
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Connected Players</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {/* Collapsible content */}
            {open && (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {Object.keys(grouped).sort().map((team) => (
                        <div key={team}>
                            <h3 className={`text-lg font-bold ${teamColor(team)}`}>{team}</h3>
                            {Object.keys(grouped[team]).sort().map((branch) => (
                                <div key={branch} className="ml-3">
                                    <h4 className="text-md font-semibold text-green-300">{branch}</h4>
                                    {Object.keys(grouped[team][branch]).sort().map((role) => (
                                        <div key={role} className="ml-4">
                                            <h5 className="text-sm font-medium text-yellow-200">
                                                {role.replace(new RegExp(`^${branch} `), "")}
                                            </h5>
                                            <ul className="ml-3 space-y-0.5">
                                                {grouped[team][branch][role]
                                                    .sort((a, b) =>
                                                        a.user.username.localeCompare(b.user.username)
                                                    )
                                                    .map((ri) => (
                                                        <li
                                                            key={ri.id}
                                                            className="flex items-center gap-2 text-sm"
                                                        >
                                                            <span>{ri.user.username}</span>
                                                            <span className={ri.ready ? "text-green-400" : "text-red-400"}>
                                                                {ri.ready ? "Ready" : "Not Ready"}
                                                            </span>
                                                            {roleInstance?.role.name === "Gamemaster" && (
                                                                <button
                                                                    onClick={() => handleDeleteRoleInstance(ri.id)}
                                                                    disabled={deletingRoleInstance === ri.id}
                                                                    className={`px-2 py-0.5 rounded text-xs transition
                                                                        ${deletingRoleInstance === ri.id
                                                                            ? "bg-gray-500 cursor-not-allowed"
                                                                            : "bg-red-600 cursor-pointer hover:bg-red-500"
                                                                        }
                                                                    `}
                                                                >
                                                                    {deletingRoleInstance === ri.id
                                                                        ? "Deleting..."
                                                                        : "Delete"}
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
            )}
        </div>
    );
}
