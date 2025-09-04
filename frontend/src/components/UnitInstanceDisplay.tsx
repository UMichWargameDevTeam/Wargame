'use client';

import { useState } from 'react';

interface UserInstanceDisplayProps {
    selectedUnitInstances: Record<string, boolean>;
    setSelectedUnitInstances: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export default function UnitInstanceDisplay({ selectedUnitInstances, setSelectedUnitInstances }: UserInstanceDisplayProps) {
    const [open, setOpen] = useState<boolean>(true);

    const toggleUnitInstance = (domain: string) => {
        setSelectedUnitInstances((prev) => {
            const updated = { ...prev, [domain]: !prev[domain] };
            sessionStorage.setItem('unitInstanceDisplay', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Unit Display</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {open && (
                <div className="space-y-2">
                    {(['Air', 'Ground', 'Sea'] as string[]).map((domain) => (
                        <div key={domain} className="flex items-center space-x-2">
                            <input
                                id={domain}
                                type="checkbox"
                                checked={selectedUnitInstances[domain]}
                                onChange={() => toggleUnitInstance(domain)}
                                className="form-checkbox text-blue-500 bg-neutral-800 border-neutral-500"
                            />
                            <label htmlFor={domain} className="capitalize text-sm text-white">
                                {domain}
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
