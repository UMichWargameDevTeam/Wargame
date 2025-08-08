'use client';

import { useState } from 'react';

const JTFMenu = () => {
    const [activeTab, setActiveTab] = useState<'USA' | 'USN' | 'USAF'>('USA');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'USA':
                return <p className="mt-4">🪖 USA Overview: Unit readiness is at 85%. Resupply en route. Continue monitoring southern border defenses.</p>;
            case 'USN':
                return <p className="mt-4">⚓ USN Overview: 2 fleets are patrolling the eastern maritime zone. Amphibious units on standby.</p>;
            case 'USAF':
                return <p className="mt-4">✈️ USAF Overview: Air superiority established over northern airspace. Refueling tankers en route.</p>;
            default:
                return null;
        }
    };

    return (
        <div className="text-white">
            <div className="flex space-x-2 mb-4">
                {['USA', 'USN', 'USAF'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as 'USA' | 'USN' | 'USAF')}
                        className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-gray-300'} hover:bg-blue-500`}
                    >
                        {tab}
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
