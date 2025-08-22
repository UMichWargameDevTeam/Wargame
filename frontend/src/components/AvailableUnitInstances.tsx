'use client';

import { useState } from 'react';
import { RoleInstance, UnitInstance } from "@/lib/Types"

interface AvailableUnitInstancesProps {
    roleInstance: RoleInstance,
    unitInstances: UnitInstance[],
    handleDeleteUnitInstance?: (id: number) => void
}

export default function AvailableUnitInstances({ roleInstance, unitInstances, handleDeleteUnitInstance }: AvailableUnitInstancesProps) {
    const [open, setOpen] = useState(true);

    const isGamemaster = roleInstance.role.name === "Gamemaster";

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Available Units</h3>
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
                            className="flex justify-between items-stretch bg-neutral-800 text-white rounded p-2 hover:bg-neutral-600"
                        >
                            <div>
                                <div><strong>Team:</strong> {unitInstance.team_instance.team.name}</div>
                                <div><strong>Unit:</strong> {unitInstance.unit.name}</div>
                                <div><strong>Row:</strong> {unitInstance.tile.row}, <strong>Column:</strong> {unitInstance.tile.column}</div>
                                <div><strong>Health:</strong> {unitInstance.health}</div>
                                <div><strong>Supply Count:</strong> {unitInstance.supply_count}</div>
                            </div>
                            {isGamemaster && handleDeleteUnitInstance && (
                                <button
                                    onClick={() => handleDeleteUnitInstance(unitInstance.id)}
                                    className="bg-red-600 px-2 py-1 rounded hover:bg-red-500 text-sm"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
