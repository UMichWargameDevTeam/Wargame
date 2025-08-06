'use client';

import { useEffect, useState } from 'react';

type AssetType = 'air' | 'land' | 'sea';

export default function AssetDisplay() {
    const defaultState = {
        air: true,
        land: true,
        sea: true,
    };

    const [open, setOpen] = useState(true);
    const [selectedAssets, setSelectedAssets] = useState<Record<AssetType, boolean>>(defaultState);

    useEffect(() => {
        const stored = sessionStorage.getItem('assetDisplay');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSelectedAssets((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Invalid session data for assetDisplay', e);
            }
        }
    }, []);

    const toggleAsset = (type: AssetType) => {
        setSelectedAssets((prev) => {
            const updated = { ...prev, [type]: !prev[type] };
            sessionStorage.setItem('assetDisplay', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Asset Display</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>

            {open && (
                <div className="space-y-2">
                    {(['air', 'land', 'sea'] as AssetType[]).map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                            <input
                                id={type}
                                type="checkbox"
                                checked={selectedAssets[type]}
                                onChange={() => toggleAsset(type)}
                                className="form-checkbox text-blue-500 bg-neutral-800 border-neutral-500"
                            />
                            <label htmlFor={type} className="capitalize text-sm text-white">
                                {type}
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
