'use client';

import { useEffect, useState } from 'react';

interface User {
    username: string;
    team: string;
    branch: string;
    role: string;
    ready: boolean;
}

export default function UsersList() {
    const [users, setUsers] = useState<User[]>([]);
    const gameInstanceId = typeof window !== 'undefined' ? sessionStorage.getItem('gameInstanceId') : null;

    useEffect(() => {
        if (!gameInstanceId) return;
        const socket = new WebSocket(`ws://localhost:8000/ws/game/${gameInstanceId}/`);

        socket.onopen = () => {
            console.log('Connected to game WebSocket');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'user_list') {
                setUsers(data.users);
            }
        };

        socket.onclose = () => {
            console.log('Disconnected from game WebSocket');
        };

        return () => {
            socket.close();
        };
    }, [gameInstanceId]);

    return (
        <div className="bg-neutral-800 p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-semibold mb-4 border-b border-neutral-700 pb-2">Connected Players</h2>
            <ul className="space-y-2">
                {users.map((user, idx) => (
                    <li key={idx} className="flex justify-between">
                        <span>{user.username}</span>
                        <span className={user.ready ? 'text-green-400' : 'text-red-400'}>
                            {user.ready ? 'Ready' : 'Not Ready'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
