// components/AvailableUnitInstances.tsx
'use client';

import {useState } from 'react';
import { UnitInstance } from "@/lib/Types"

interface AvailableUnitInstancesProps {
    unitInstances: UnitInstance[];
}

export default function AvailableUnitInstances({ unitInstances }: AvailableUnitInstancesProps) {
    const [open, setOpen] = useState(true);


    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Available UnitInstances</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '+' : '-'}
                </button>
            </div>
            {open && (
                <div className="space-y-2">
                    {unitInstances.map(unitInstance => (
                        <div
                            key={unitInstance.id}
                            className="bg-neutral-800 text-white rounded p-2 hover:bg-neutral-600 cursor-pointer"
                        >
                            <div><strong>Unit:</strong> {unitInstance.unit.name}</div>
                            <div><strong>Team:</strong> {unitInstance.team_instance.team.name}</div>
                            <div><strong>Row:</strong> {unitInstance.tile.row}</div>
                            <div><strong>Column:</strong> {unitInstance.tile.column}</div>
                            <div><strong>Health:</strong> {unitInstance.health}</div>
                            <div><strong>Supply Count:</strong> {unitInstance.supply_count}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
