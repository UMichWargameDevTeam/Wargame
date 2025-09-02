'use client';

import { useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Team, Unit } from '@/lib/Types';

interface AddUnitInstanceProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    units: Unit[];
    teams: Team[];
}

export default function AddUnitInstance({ joinCode, socketRef, socketReady, units, teams }: AddUnitInstanceProps) {
    const authedFetch = useAuthedFetch();
    
    const [unitName, setUnitName] = useState<string>('');
    const [teamName, setTeamName] = useState<string>('');
    const [row, setRow] = useState<string>('');
    const [column, setColumn] = useState<string>('');
    const [creatingUnitInstance, setCreatingUnitInstance] = useState<boolean>(false);

    const handleAddUnitInstance = async (joinCode: string, teamName: string, unitName: string, row: string, column: string) => {
        if (!socketReady) return;
    
        try {
            setCreatingUnitInstance(true);
            const res = await authedFetch(`/api/unit-instances/create/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    join_code: joinCode,
                    team_name: teamName,
                    unit_name: unitName,
                    row: row,
                    column: column,
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to add unit instance.');
            }

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "units",
                    action: "create",
                    data: data
                }));
            }

            setUnitName('');
            setTeamName('');
            setRow('');
            setColumn('');

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setCreatingUnitInstance(false);
        }
    };

    return (
    <div className="bg-neutral-700 rounded-2xl shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Add Unit</h3>

        {/* Unit + Team Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm text-gray-300 mb-1">Unit</label>
                <select
                    value={unitName}
                    onChange={e => setUnitName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm text-gray-300 mb-1">Team</label>
                <select
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select Team</option>
                    {teams.map(t => (
                        <option key={t.id} value={t.name}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        {/* Row + Column Inputs */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm text-gray-300 mb-1">Row</label>
                <input
                    type="number"
                    placeholder="Row"
                    value={row}
                    onChange={e => setRow(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm text-gray-300 mb-1">Column</label>
                <input
                    type="number"
                    placeholder="Column"
                    value={column}
                    onChange={e => setColumn(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {/* Add Button */}
        <button
            onClick={() => handleAddUnitInstance(joinCode, teamName, unitName, row, column)}
            disabled={creatingUnitInstance}
            className={`w-full py-2 rounded-lg font-medium transition 
                ${creatingUnitInstance
                    ? "bg-gray-600 cursor-not-allowed text-gray-300"
                    : "bg-green-600 hover:bg-green-500 text-white"
                }`}
        >
            {creatingUnitInstance ? "Adding..." : "Add Unit"}
        </button>
    </div>
);

}