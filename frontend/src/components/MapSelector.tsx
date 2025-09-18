'use client';

import { useState, useEffect } from 'react';

interface MapSelectorProps {
    onMapChange: (mapPath: string) => void;
    initialMap: string;
}

export default function MapSelector({ onMapChange, initialMap }: MapSelectorProps) {
    const [open, setOpen] = useState<boolean>(true);
    const [selectedMap, setSelectedMap] = useState<string>('');

    useEffect(() => {
        setSelectedMap(initialMap);
    }, [initialMap]);

    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newMap = event.target.value;
        setSelectedMap(newMap);
        onMapChange(newMap);
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Map Settings</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>
            {open && (
                <div className="space-y-2">
                    <label htmlFor="map-select" className="block text-sm text-gray-300">
                        Choose map:
                    </label>
                    <select
                        id="map-select"
                        value={selectedMap}
                        onChange={handleSelect}
                        className="w-full p-2 bg-neutral-800 text-white rounded"
                    >
                        <option value="">-- Select a map --</option>
                        <option value="/maps/taiwan_middle_clean.png">Taiwan (Clean)</option>
                    </select>
                </div>
            )}
        </div>
    );
}
