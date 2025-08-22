'use client';

import { useState, useEffect } from 'react';
import { RoleInstance } from '@/lib/Types';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';

export default function ResourcePoints() {
    const [open, setOpen] = useState(true);
    const [resources, setResources] = useState<RoleInstance[]>([]);
    const authedFetch = useAuthedFetch();

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const joinCode = sessionStorage.getItem('join_code');
                const teamName = sessionStorage.getItem('team_name');
                if (!joinCode || !teamName) {
                    console.error("Missing join_code or team_name in sessionStorage");
                    return;
                }

                const res = await authedFetch(
                    `/api/game-instances/${joinCode}/team-instances/${teamName}/role-instances/`
                );
                if (!res.ok) {
                    throw new Error(`Failed to fetch role instances: ${res.status}`);
                }
                const data: RoleInstance[] = await res.json();
                setResources(data);
            } catch (err) {
                console.error("Failed to fetch resources", err);
            }
        };

        fetchResources();
    }, []);

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Resource Points</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>
            {open && (
                <ul className="space-y-2">
                    {resources.map((entry, index) => (
                        <li
                            key={index}
                            className="flex justify-between bg-neutral-800 p-2 rounded text-sm"
                        >
                            <span className="text-gray-300">{entry.role.name}</span>
                            <span className="text-white font-semibold">{entry.supply_points}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
