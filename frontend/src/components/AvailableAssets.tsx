// components/AvailableAssets.tsx
'use client';

import { useEffect, useState } from 'react';

interface Asset {
    id: string;
    classification: string;
    position: string;
    team: string;
    asset_type: string;
}

export default function AvailableAssets() {
    const [open, setOpen] = useState(true);
    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        fetch('http://localhost:8000/api/assets/')
            .then(res => res.json())
            .then(data => setAssets(data))
            .catch(err => console.error('Failed to fetch assets:', err));
    }, []);

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Available Assets</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>
            {open && (
                <div className="space-y-2">
                    {assets.map(asset => (
                        <div
                            key={asset.id}
                            className="bg-neutral-800 text-white rounded p-2 hover:bg-neutral-600 cursor-pointer"
                        >
                            <div><strong>Type:</strong> {asset.classification}</div>
                            <div><strong>Team:</strong> {asset.team}</div>
                            <div><strong>Position:</strong> {asset.position}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
