'use client';

import { useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Team, Unit, RoleInstance, UnitInstance } from '@/lib/Types';

interface AddUnitInstanceProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance;
    units: Unit[];
    teams: Team[];
}

export default function AddUnitInstance({ joinCode, socketRef, socketReady, roleInstance, units, teams }: AddUnitInstanceProps) {
    const authedFetch = useAuthedFetch();
    const [open, setOpen] = useState<boolean>(true);
    
    const [unitName, setUnitName] = useState<string>('');
    const [teamName, setTeamName] = useState<string>('');
    const [row, setRow] = useState<string>('');
    const [column, setColumn] = useState<string>('');
    const [creatingUnitInstance, setCreatingUnitInstance] = useState<boolean>(false);

    const handleAddUnitInstance = async (joinCode: string, teamName: string, unitName: string, row: string, column: string) => {
        if (!socketReady || !socketRef.current) return;
        const socket = socketRef.current;
    
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

            if (socket.readyState === WebSocket.OPEN) {
                const unitInstance: UnitInstance = data;
                const unitName = unitInstance.unit.name;
                const unitCost = roleInstance.role.name == "Gamemaster" ? 0 : unitInstance.unit.cost;

                socket.send(JSON.stringify({
                    channel: "units",
                    action: "create",
                    data: unitInstance
                }));

                if (roleInstance.role.name != "Gamemaster") {
                    socket.send(JSON.stringify({
                        channel: "points",
                        action: "spend",
                        data: {
                            team_name: roleInstance.team_instance.team.name,
                            role_name: roleInstance.role.name,
                            supply_points: unitCost
                        }
                    }));
                }

                const messageSenderName = roleInstance.user.username;
                const messageSenderTeamName = roleInstance.team_instance.team.name;
                const messageSenderRoleName = roleInstance.role.name;
                const messageRoleDisplayName = messageSenderTeamName == "Gamemasters" ? messageSenderRoleName : `${messageSenderTeamName} ${messageSenderRoleName}`;
                const messageText = `${messageRoleDisplayName} ${messageSenderName} spent ${unitCost} supply points to spawn a ${unitName}.`

                socket.send(JSON.stringify({
                    channel: "communications",
                    action: "send",
                    data: {
                        id: crypto.randomUUID(),
                        sender_role_instance: roleInstance,
                        recipient_team_name: roleInstance.team_instance.team.name,
                        recipient_role_name: roleInstance.role.name,
                        type: "system",
                        text: messageText,
                        timestamp: Date.now(),
                    }
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
        <div className="bg-neutral-700 rounded-lg mb-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Add Unit</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {open && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAddUnitInstance(joinCode, teamName, unitName, row, column);
                    }}
                >
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
                        type="submit"
                        disabled={creatingUnitInstance}
                        className={`w-full py-2 rounded-lg font-medium transition 
                            ${creatingUnitInstance
                                ? "bg-gray-600 cursor-not-allowed text-gray-300"
                                : "bg-green-600 cursor-pointer hover:bg-green-500 text-white"
                            }`}
                    >
                        {creatingUnitInstance ? "Adding..." : "Add Unit"}
                    </button>
                </form>
            )}
        </div>
    );

}