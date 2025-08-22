'use client';

import { useState, useEffect } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { getSessionStorageOrFetch } from '@/lib/utils';
import { Branch } from '@/lib/Types';

const JTFMenu = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const authedFetch = useAuthedFetch();

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await getSessionStorageOrFetch<Branch[]>('branches', async () => {
                    const res = await authedFetch("/api/branches/");
                    return res.json();
                });

                setBranches(data);
                setActiveTab(data.length > 0 ? data[0].name : null);
            } catch (err) {
                console.error("Failed to get branches", err);
            }
        };

        fetchBranches();
    }, [authedFetch]);

    const renderTabContent = () => {
        // These are just dummy values. Possible TODO.
        switch (activeTab) {
            case 'Air Force':
                return <p>✈️ Air Force Overview: Air superiority established over northern airspace. Refueling tankers en route.</p>;
            case 'Army':
                return <p>🪖 Army Overview: Unit readiness is at 85%. Resupply en route. Continue monitoring southern border defenses.</p>;
            case 'Navy':
                return <p>⚓ Navy Overview: 2 fleets are patrolling the eastern maritime zone. Amphibious units on standby.</p>;
            default:
                return activeTab ? <p>No overview available for {activeTab}</p> : null;
        }
    };

    return (
        <div className="text-white">
            <div className="flex space-x-2 mb-4">
                {branches?.map((branch) => (
                    <button
                        key={branch.name}
                        onClick={() => setActiveTab(branch.name)}
                        className={`px-4 py-2 rounded ${activeTab === branch.name ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-gray-300'} hover:bg-blue-500`}
                    >
                        {branch.name}
                    </button>
                ))}
            </div>
            <div className="bg-neutral-700 p-4 rounded-lg">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default JTFMenu;
