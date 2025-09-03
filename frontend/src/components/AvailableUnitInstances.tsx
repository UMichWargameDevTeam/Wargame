'use client';

import { useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance, UnitInstance } from "@/lib/Types"

interface AvailableUnitInstancesProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance;
    unitInstances: UnitInstance[];
}

export default function AvailableUnitInstances({ socketRef, socketReady, roleInstance, unitInstances }: AvailableUnitInstancesProps) {
    const authedFetch = useAuthedFetch();
    
    const [open, setOpen] = useState<boolean>(true);
    const [deletingUnitInstance, setDeletingUnitInstance] = useState<number | null>(null);

    const isGamemaster = roleInstance.role.name === "Gamemaster";

    const handleDeleteUnitInstance = async (unitId: number) => {
        if (!socketReady) return;
        if (!confirm("Are you sure you want to delete this unit?")) return;

        try {
            setDeletingUnitInstance(unitId);
            const res = await authedFetch(`/api/unit-instances/${unitId}/`, {
                method: 'DELETE'
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || 'Failed to delete unit.');
            }

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "units",
                    action: "delete",
                    data: {
                        id: unitId
                    }
                }));
            }
            
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setDeletingUnitInstance(null);
        }
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Available Units</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>
            {open && (
                <div className="space-y-2">
                    {unitInstances.length == 0 && (
                        <p>There are no units on the board.</p>
                    )}
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
                                    disabled={deletingUnitInstance === unitInstance.id}
                                    className={`px-2 py-1 rounded text-sm 
                                        ${deletingUnitInstance === unitInstance.id
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-red-600 hover:bg-red-500"
                                        }
                                    `}
                                >
                                    {deletingUnitInstance === unitInstance.id ? "Deleting..." : "Delete"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
