"use client";
import { useEffect, useState } from "react";

type User = {
    username: string;
    branch: string;
    team: string;
    role: string;
    status: "ready" | "notready";
    game_instance?: { id: number }; // Added so we can filter
};

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [gameInstanceId, setGameInstanceId] = useState<number | null>(null);

    useEffect(() => {
        // Pull gameInstanceId from sessionStorage
        const storedId = sessionStorage.getItem("gameInstanceId");
        if (storedId) setGameInstanceId(parseInt(storedId));

        const ws = new WebSocket(`ws://${window.location.host}/ws/users/`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "users_list") {
                setUsers(sortUsers(data.users));
            }

            if (data.type === "user_update") {
                setUsers((prev) =>
                    sortUsers([
                        ...prev.filter((u) => u.username !== data.user.username),
                        data.user,
                    ])
                );
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    function sortUsers(list: User[]) {
        return list.sort((a, b) => {
            if (a.branch === b.branch) {
                return a.team.localeCompare(b.team);
            }
            return a.branch.localeCompare(b.branch);
        });
    }

    // Filter users by gameInstanceId if present
    const filteredUsers =
        gameInstanceId !== null
            ? users.filter((u) => u.game_instance?.id === gameInstanceId)
            : users;

    return (
        <div className="bg-neutral-800 p-4 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Active Users</h2>
            <ul className="space-y-2">
                {filteredUsers.map((user) => (
                    <li
                        key={user.username}
                        className="flex justify-between bg-neutral-700 px-3 py-1 rounded"
                    >
                        <span>{user.username}</span>
                        <span className="text-sm text-gray-400">
                            {user.branch} | {user.team} | {user.role} | {user.status}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
