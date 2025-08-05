// components/AvailableAssets.tsx
'use client';

import { useEffect, useState } from 'react';
import { Asset } from "@/lib/Types"

interface AvailableAssetsProps {
    assets: Asset[];
}

export default function AvailableAssets({ assets }: AvailableAssetsProps) {
    const [open, setOpen] = useState(true);


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
                            <div><strong>Unit:</strong> {asset.unit.name}</div>
                            <div><strong>Team:</strong> {asset.team.name}</div>
                            <div><strong>Row:</strong> {asset.tile.row}</div>
                            <div><strong>Column:</strong> {asset.tile.column}</div>
                            <div><strong>Health:</strong> {asset.health}</div>
                            <div><strong>Supply Count:</strong> {asset.supply_count}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
