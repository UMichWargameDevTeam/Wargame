'use client';

import { useState } from 'react';

interface ResourceData {
    role: string;
    points: number;
}

const dummyResources: ResourceData[] = [
    { role: 'Ops', points: 150 },
    { role: 'Logistics', points: 120 },
    { role: 'USA-CC', points: 300 },
    { role: 'USAF-CC', points: 280 },
    { role: 'USN-CC', points: 260 },
];

export default function ResourcePoints() {
    const [open, setOpen] = useState(true);

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
                    {dummyResources.map((entry, index) => (
                        <li
                            key={index}
                            className="flex justify-between bg-neutral-800 p-2 rounded text-sm"
                        >
                            <span className="text-gray-300">{entry.role}</span>
                            <span className="text-white font-semibold">{entry.points}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
