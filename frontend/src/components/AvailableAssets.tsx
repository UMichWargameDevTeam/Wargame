'use client';

import { useState } from 'react';

interface Asset {
    name: string;
    details: string;
}

const dummyAssets: Asset[] = [
    { name: 'F-22 Raptor', details: 'Stealth air superiority fighter with high maneuverability.' },
    { name: 'Abrams Tank', details: 'Heavily armored land combat vehicle used for ground warfare.' },
    { name: 'Arleigh Burke Destroyer', details: 'Guided missile destroyer used by the US Navy.' },
    { name: 'MQ-9 Reaper', details: 'Unmanned aerial vehicle with strike capability.' },
    { name: 'CH-47 Chinook', details: 'Heavy-lift transport helicopter for troop movement and cargo.' },
];

export default function AvailableAssets() {
    const [open, setOpen] = useState(true);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleExpanded = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4 max-h-[400px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Available Assets</h3>
                <button onClick={() => setOpen(!open)} className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500">
                    {open ? '+' : '-'}
                </button>
            </div>
            {open && (
                <ul className="space-y-2">
                    {dummyAssets.map((asset, index) => (
                        <li key={index} className="bg-neutral-800 p-2 rounded cursor-pointer hover:bg-neutral-700">
                            <div onClick={() => toggleExpanded(index)} className="flex justify-between items-center">
                                <span className="font-medium">{asset.name}</span>
                                <span>{expandedIndex === index ? '▲' : '▼'}</span>
                            </div>
                            {expandedIndex === index && (
                                <p className="text-sm text-gray-300 mt-2">{asset.details}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
