'use client';

import { useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Team, Unit } from '@/lib/Types';

interface AddUnitInstanceProps {
    join_code: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    units: Unit[];
    teams: Team[];
}

export default function AddUnitInstance({ join_code, socketRef, socketReady, units, teams }: AddUnitInstanceProps) {
    const authedFetch = useAuthedFetch()
    
    const [unitName, setUnitName] = useState<string>('');
    const [teamName, setTeamName] = useState<string>('');
    const [row, setRow] = useState<string>('');
    const [column, setColumn] = useState<string>('');

    const handleAddUnitInstance = async (join_code: string, teamName: string, unitName: string, row: string, column: string) => {
        if (!socketReady) return;
    
        try {
            const res = await authedFetch(`/api/unit-instances/create/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    join_code,
                    team_name: teamName,
                    unit_name: unitName,
                    row,
                    column
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to add unit instance.');
            }

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "units",
                    action: "unit_create",
                    data: data
                }));
            }

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <h3 className="text-lg font-semibold">Add Unit</h3>

            <div>
                <select
                    value={unitName}
                    onChange={e => setUnitName(e.target.value)}
                    className="p-1 rounded bg-neutral-800 mr-2"
                >
                    <option value="">Select Unit</option>
                    {units.map(u => (
                        <option key={u.id} value={u.name}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </div>
            
            <div>
                <select
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="p-1 rounded bg-neutral-800 mr-2"
                >
                    <option value="">Select Team</option>
                    {teams.map(t => (
                        <option key={t.id} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>
            
            <div className='flex space-x-2'>
                <input
                    type="number"
                    placeholder="Row"
                    value={row}
                    onChange={e => setRow(e.target.value)}
                    className="w-1/2 p-1 rounded bg-neutral-800 mr-2"
                />
                <input
                    type="number"
                    placeholder="Column"
                    value={column}
                    onChange={e => setColumn(e.target.value)}
                    className="w-1/2 p-1 rounded bg-neutral-800 mr-2"
                />
            </div>

            <button
                onClick={() => handleAddUnitInstance(join_code, teamName, unitName, row, column)}
                className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-500"
            >
                Add
            </button>
        </div>
    )
}