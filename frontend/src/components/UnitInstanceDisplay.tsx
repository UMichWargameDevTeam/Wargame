'use client';

import { useEffect, useState } from 'react';

type Domain = 'Air' | 'Ground' | 'Sea';

export default function UnitInstanceDisplay() {
    const defaultState = {
        Air: true,
        Ground: true,
        Sea: true,
    };

    const [open, setOpen] = useState(true);
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<Domain, boolean>>(defaultState);

    useEffect(() => {
        const stored = sessionStorage.getItem('unitInstanceDisplay');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSelectedUnitInstances((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Invalid session data for unitInstanceDisplay', e);
            }
        }
    }, []);

    const toggleUnitInstance = (type: Domain) => {
        setSelectedUnitInstances((prev) => {
            const updated = { ...prev, [type]: !prev[type] };
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
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>

            {open && (
                <div className="space-y-2">
                    {(['Air', 'Ground', 'Sea'] as Domain[]).map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                            <input
                                id={type}
                                type="checkbox"
                                checked={selectedUnitInstances[type]}
                                onChange={() => toggleUnitInstance(type)}
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
