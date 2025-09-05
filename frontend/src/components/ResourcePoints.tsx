'use client';

import { useState, useEffect } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types';

interface ResourcePointsProps {
    joinCode: string;
    roleInstance: RoleInstance;
}

export default function ResourcePoints({ joinCode, roleInstance }: ResourcePointsProps) {
    const authedFetch = useAuthedFetch();

    const [open, setOpen] = useState<boolean>(true);
    const [resources, setResources] = useState<RoleInstance[]>([]);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const teamName = roleInstance.team_instance.team.name;

                const res = await authedFetch(`/api/game-instances/${joinCode}/team-instances/${teamName}/role-instances/`);
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
    }, [authedFetch, joinCode, roleInstance]);

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Resource Points</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
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
