'use client';

import { useState, useEffect } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { getSessionStorageOrFetch } from '@/lib/utils';
import { Branch } from '@/lib/Types';

const SendResourcePoints = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [inputs, setInputs] = useState<Record<string, string>>({}); // start as empty object
    const authedFetch = useAuthedFetch();

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await getSessionStorageOrFetch<Branch[]>('branches', async () => {
                    const res = await authedFetch("/api/branches/");
                    return res.json();
                });

                setBranches(data);

                const initInputs = Object.fromEntries(
                    data.map(branch => [branch.name, ""])
                );
                setInputs(initInputs);
            } catch (err) {
                console.error("Failed to get branches", err);
            }
        };

        fetchBranches();
    }, [authedFetch]);

    const handleChange = (branch: string, value: string) => {
        setInputs(prev => ({
            ...prev,
            [branch]: value,
        }));
    };

    return (
        <div className="mt-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Send Resource Points</h2>

            {/* Display Ops & Log points */}
            <div className="bg-neutral-700 p-4 rounded-lg mb-4">
                <p className="mb-2 font-bold">Ops Points: <span className="font-bold text-green-400">30</span></p>
                <p className="mb-2 font-bold">Log Points: <span className="font-bold text-green-400">20</span></p>
            </div>

            {/* Inputs for each Branch */}
            <div className="space-y-3 mb-4">
                {branches.map(branch => (
                    <div key={branch.name} className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
                        <span className="w-16 font-bold">{branch.name}</span>
                        <input
                            type="number"
                            value={inputs[branch.name] ?? ""}   // always controlled
                            onChange={(e) => handleChange(branch.name, e.target.value)}
                            className="w-24 px-2 py-1 bg-neutral-900 border border-gray-600 rounded text-white"
                            placeholder="0"
                        />
                        {/* TODO: change this placeholder to actual dynamically-retrieved values */}
                        <span className="text-sm text-red-400">Requested: 15</span>
                    </div>
                ))}
            </div>

            {/* Send Button */}
            {/* TODO: change this button to actually do something when clicked */}
            <button
                className="w-full bg-green-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg font-semibold"
            >
                Send
            </button>
        </div>
    );
};

export default SendResourcePoints;