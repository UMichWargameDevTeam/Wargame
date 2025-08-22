'use client';

import { useState, useEffect } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Team, Unit, RoleInstance } from '@/lib/Types';

interface GameMasterMenuProps {
    join_code: string,
    units: Unit[],
    teams: Team[]
    handleAddUnitInstance: (join_code: string, teamName: string, unitName: string, row: string, column: string) => void
}

const GamemasterMenu = ({ join_code, units, teams, handleAddUnitInstance }: GameMasterMenuProps) => {
    const authedFetch = useAuthedFetch();

    const [unitName, setUnitName] = useState<string>('');
    const [teamName, setTeamName] = useState<string>('');
    const [row, setRow] = useState<string>('');
    const [column, setColumn] = useState<string>('');
    const [roleInstances, setRoleInstances] = useState<RoleInstance[]>([]);

    const role_instance: RoleInstance = JSON.parse(sessionStorage.getItem('role_instance') || '{}');

    useEffect(() => {
        const fetchRoleInstances = async () => {
            if (!join_code) return;
            try {
                const res = await authedFetch(`/api/game-instances/${join_code}/role-instances/`);
                const data = await res.json();
                setRoleInstances(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                console.error("Failed to fetch role instances", err);
            }
        };
        fetchRoleInstances();
    }, [authedFetch, join_code]);

    const handleDeleteRoleInstance = async (roleId: number) => {
        if (!join_code) return;
        if (!confirm("Are you sure you want to delete this Role Instance?")) return;

        try {
            const res = await authedFetch(`/api/role-instances/${roleId}/`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setRoleInstances(roleInstances.filter(r => r.id !== roleId));
            } else {
                const data = await res.json();
                throw new Error(data.error || data.detail || data.message || 'Failed to delete role instance.');
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const handleDeleteGame = async () => {
        if (!join_code) return;
        if (!confirm("Are you sure you want to delete this Game Instance?")) return;

        try {
            const res = await authedFetch(`/api/game-instances/${role_instance.team_instance.game_instance.id}/`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert("Game deleted.");
                sessionStorage.clear();
                window.location.href = '/'; // kick back to homepage
            } else {
                const data = await res.json();
                throw new Error(data.error || data.detail || data.message || "Failed to delete game.");
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="bg-neutral-700 rounded-lg p-4 mt-4 text-white">
            <h3 className="text-lg font-semibold mb-2">Gamemaster Menu</h3>

            {/* Add Unit */}
            <div className="mb-4">
                <h4 className="font-medium mb-2">Add Unit Instance</h4>

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

            {/* Manage Role Instances */}
            <div className="mb-4">
                <h4 className="font-medium mb-2">Role Instances</h4>
                <div className="space-y-1">
                    {roleInstances.map(role => (
                        <div
                            key={role.id}
                            className="flex justify-between bg-neutral-800 p-2 rounded"
                        >
                            <span>
                                {role.team_instance.team.name} Team {role.role.name} ({role.user.username})
                            </span>
                            <button
                                onClick={() => handleDeleteRoleInstance(role.id)}
                                className="bg-red-600 px-2 py-1 rounded hover:bg-red-500 text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Delete Game */}
            <div>
                <button
                    onClick={handleDeleteGame}
                    className="bg-red-700 px-3 py-2 rounded hover:bg-red-600"
                >
                    Delete Game
                </button>
            </div>
        </div>
    );
};

export default GamemasterMenu;
