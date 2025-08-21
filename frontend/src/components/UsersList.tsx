'use client';

import { useEffect, useState } from 'react';
import { WS_URL } from '@/lib/utils';

interface Props {
    join_code: string;
}

interface User {
    username: string;
    team: string;
    branch: string;
    role: string;
    ready: boolean;
}

export default function UsersList({ join_code } : Props) {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (!join_code) return;
        const socket = new WebSocket(`${WS_URL}/game-instances/${join_code}/users/`);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'user_list') {
                setUsers(data.users);
            }
        };

        return () => {
            socket.close();
        };
    }, [join_code]);

    // Group users by team > branch > role
    const groupedUsers = users.reduce((acc, user) => {
        if (!acc[user.team]) acc[user.team] = {};
        if (!acc[user.team][user.branch]) acc[user.team][user.branch] = {};
        if (!acc[user.team][user.branch][user.role]) acc[user.team][user.branch][user.role] = [];
        acc[user.team][user.branch][user.role].push(user);
        return acc;
    }, {} as Record<string, Record<string, Record<string, User[]>>>);

    // Helper to color team headers
    const teamColor = (team: string) => {
        if (team.toLowerCase() === 'red') return 'text-red-400';
        if (team.toLowerCase() === 'blue') return 'text-blue-400';
        if (team.toLowerCase() === 'gamemaster') return 'text-indigo-400';
        return 'text-gray-300';
    };

    return (
        <div className="bg-neutral-800 p-4 rounded-lg shadow-lg w-full max-w-md max-h-md">
            <h2 className="text-xl font-semibold mb-3 border-b border-neutral-700 pb-1">
                Connected Players
            </h2>
            <div className="space-y-3">
                {Object.keys(groupedUsers).sort().map((team) => (
                    <div key={team}>
                        <h3 className={`text-lg font-bold ${teamColor(team)}`}>{team}</h3>
                        {Object.keys(groupedUsers[team]).sort().map((branch) => (
                            <div key={branch} className="ml-3">
                                <h4 className="text-md font-semibold text-green-300">{branch}</h4>
                                {Object.keys(groupedUsers[team][branch]).sort().map((role) => (
                                    <div key={role} className="ml-4">
                                        <h5 className="text-sm font-medium text-yellow-300">{role}</h5>
                                        <ul className="ml-3 space-y-0.5">
                                            {groupedUsers[team][branch][role]
                                                .sort((a, b) => a.username.localeCompare(b.username))
                                                .map((user, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                                        <span>{user.username}</span>
                                                        <span className={user.ready ? 'text-green-400' : 'text-red-400'}>
                                                            {user.ready ? '✓' : '✗'}
                                                        </span>
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
