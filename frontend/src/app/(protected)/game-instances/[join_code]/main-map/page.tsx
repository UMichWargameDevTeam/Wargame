'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MapSelector from '@/components/MapSelector';
import UnitInstanceDisplay from '@/components/UnitInstanceDisplay';
import FooterControls from '@/components/FooterControls';
import AvailableUnitInstances from '@/components/AvailableUnitInstances';
import ResourcePoints from '@/components/ResourcePoints';
import CommandersIntent from '@/components/CommandersIntent';
import InteractiveMap from '@/components/InteractiveMap';
import JTFMenu from '@/components/JTFMenu';
import GamemasterMenu from '@/components/GamemasterMenu';
import SendResourcePoints from '@/components/SendResourcePoints';
import { Team, Unit, RoleInstance, UnitInstance } from '@/lib/Types'
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL, getSessionStorageOrFetch } from '@/lib/utils';

export default function MainMapPage() {
    // const [socket, setSocket] = useState<WebSocket | null>(null);
    //const [messages, setMessages] = useState<string[]>([]);
    // const [input, setInput] = useState('');

    const params = useParams();
    const join_code = params.join_code as string;

    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_clean.png');

    const [teams, setTeams] = useState<Team[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    // const [attacks, setAttacks] = useState<Attack[]>([]);
    // const [abilities, setAbilities] = useState<Ability[]>([]);

    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);

    const [timer, setTimer] = useState<number>(600); // 10 minutes in seconds
    const [mapValidationError, setMapValidationError] = useState<string | null>(null);

    const defaultState: Record<string, boolean> = {
        Air: true,
        Ground: true,
        Sea: true,
    };
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<string, boolean>>(defaultState);

    const authedFetch = useAuthedFetch()

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First validate map access
                const validationRes = await authedFetch(`/api/game-instances/${join_code}/validate-map-access/`);
                const data = await validationRes.json();
                if (!validationRes.ok) {
                    throw new Error(data.error || data.detail || "Access denied");
                }
                sessionStorage.setItem('username', data.user.username);
                sessionStorage.setItem('join_code', data.team_instance.game_instance.join_code);
                sessionStorage.setItem('team_name', data.team_instance.team.name);
                sessionStorage.setItem('branch_name', data.role.branch?.name ?? 'None');
                sessionStorage.setItem('role_name', data.role.name);
                sessionStorage.setItem('role_instance', JSON.stringify(data))

                // If validation passed, fetch unit instances
                const unitInstancesRes = await authedFetch(`/api/game-instances/${join_code}/unit-instances/`);
                if (!unitInstancesRes.ok) {
                    throw new Error(`UnitInstance fetch failed with ${unitInstancesRes.status}`);
                }

                const unitInstances = await unitInstancesRes.json();
                if (Array.isArray(unitInstances)) {
                    setUnitInstances(unitInstances);
                } else {
                    setUnitInstances([]);
                    throw new Error(`Expected array from Unit fetch but got: ${unitInstances}`);
                }

                const teams = await getSessionStorageOrFetch<Team[]>('teams', async () => {
                    const res = await authedFetch("/api/teams/");
                    if (!res.ok) {
                        throw new Error(`Team fetch failed with ${res.status}`)
                    }
                    return res.json();
                });
                setTeams(teams);

                const units = await getSessionStorageOrFetch<Unit[]>('units', async () => {
                    const res = await authedFetch("/api/units/");
                    if (!res.ok) {
                        throw new Error(`Unit fetch failed with ${res.status}`)
                    }
                    return res.json();
                });
                setUnits(units);

                /*
                const attacks = await getSessionStorageOrFetch<Attack[]>('attacks', async () => {
                    const res = await authedFetch("/api/attacks/");
                    if (!res.ok) {
                        throw new Error(`Attack fetch failed with ${res.status}`)
                    }
                    return res.json();
                });
                setAttacks(attacks);

                const abilities = await getSessionStorageOrFetch<Ability[]>('abilities', async () => {
                    const res = await authedFetch("/api/abilities/");
                    if (!res.ok) {
                        throw new Error(`Ability fetch failed with ${res.status}`)
                    }
                    return res.json();
                });
                setAbilities(abilities);
                */

                const stored = sessionStorage.getItem('unitInstanceDisplay');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        setSelectedUnitInstances((prev) => ({ ...prev, ...parsed }));
                    } catch (err) {
                        console.error('Invalid session data for unitInstanceDisplay', err);
                    }
                }

                // Start the timer WebSocket only if validation succeeded
                const ws = new WebSocket(`${WS_URL}/game-instances/${join_code}/global-timer/`);
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setTimer(data.remaining_seconds);
                };
                // Clean up WebSocket on unmount
                return () => ws.close();

            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setMapValidationError(err.message);
                }
            }
        };

        fetchData();
    }, [authedFetch, join_code]);

    useEffect(() => {
        const storedRoleInstanceString = sessionStorage.getItem('role_instance') || '{}';
        const storedRoleInstanceParsed = JSON.parse(storedRoleInstanceString)
        setRoleInstance(storedRoleInstanceParsed);
        const storedMap = sessionStorage.getItem('mapSrc');
        if (storedMap) {
            setMapSrc(storedMap);
        }
    }, []);

    // used for sending messages over websockets - currently not in use
    // const sendMessage = () => {
    //     if (socket && socket.readyState === WebSocket.OPEN) {
    //         const payload = JSON.stringify({ message: input });
    //         socket.send(payload);
    //         setInput('');
    //     }
    // };

    if (mapValidationError) {
        return ( 
            <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
                <h1 className="text-xl font-bold">{mapValidationError}</h1> 
            </div>
        );
    }

    const isOperationsOrLogistics = (role_instance: RoleInstance | null) => {
        return role_instance && (role_instance.role.is_operations || role_instance.role.is_logistics);
    };

    const handleAddUnitInstance = async (join_code: string, teamName: string, unitName: string, row: string, column: string) => {
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
            if (res.ok) {
                setUnitInstances([...unitInstances, data]);
            } else {
                throw new Error(data.error || data.detail || 'Failed to add unit.');
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const handleDeleteUnitInstance = async (unitId: number) => {
        if (!join_code) return;
        if (!confirm("Are you sure you want to delete this Unit Instance?")) return;

        try {
            const res = await authedFetch(`/api/unit-instances/${unitId}/`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setUnitInstances(unitInstances.filter(u => u.id !== unitId));
            } else {
                const data = await res.json();
                throw new Error(data.error || data.detail || data.message || 'Failed to delete unit instance.');
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="flex h-screen w-screen bg-neutral-900 text-white p-4 space-x-4">
            {/* Map + + Header + Footer */}
            <div className="flex flex-col w-[70%] h-full space-y-4">
                {/* Header Combatant Commander and Chief of Staff */}
                {(roleInstance?.role.name == "Combatant Commander" || roleInstance?.role.is_chief_of_staff) && (
                    <div className="flex space-x-4 w-full items-stretch">
                        <div className="flex-grow">
                            <CommandersIntent roleInstance={roleInstance} />
                        </div>
                        <div className="flex-shrink-0">
                            <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md mb-4 text-lg font-semibold">
                                {Math.floor(timer / 60).toString().padStart(2, '0')}:
                                {(timer % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                )}
                <div className="w-full h-full bg-neutral-800 rounded-lg overflow-hidden">
                    <InteractiveMap
                        mapSrc={mapSrc}
                        join_code={join_code}
                        unitInstances={unitInstances}
                        setUnitInstances={setUnitInstances} 
                        selectedUnitInstances={selectedUnitInstances}
                    />
                </div>

                {/* Footer for Ops/Logs */}
                {isOperationsOrLogistics(roleInstance) && (
                    <>
                        <FooterControls />
                    </>
                )}
            </div>

            {/* Sidebar */}
            <div className="flex-1 h-full bg-neutral-800 rounded-lg p-4 overflow-y-auto">
                <h2 className="text-lg mb-2">Team: {roleInstance?.team_instance.team.name || 'Unknown'}</h2>
                <h2 className="text-lg mb-2">Role: {roleInstance?.role.name || 'Unknown'}</h2>
                {/* Menu for Ops/Logs */}
                {isOperationsOrLogistics(roleInstance) && (
                    <>
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                        <UnitInstanceDisplay
                            selectedUnitInstances={selectedUnitInstances}
                            setSelectedUnitInstances={setSelectedUnitInstances}
                        />
                    </>
                )}
                {/* Menu for CoS */}
                {roleInstance?.role.is_chief_of_staff && (
                    <>
                        <AvailableUnitInstances 
                            roleInstance={roleInstance}
                            unitInstances={unitInstances} 
                        />
                        <ResourcePoints />
                    </>
                )}
                {/* Menu for Combatant Commander */}
                {roleInstance?.role.name == "Combatant Commander" && (
                    <>
                        <JTFMenu />
                        <SendResourcePoints />
                    </>
                )}
                {/* Menu for Gamemaster */}
                {roleInstance?.role.name == "Gamemaster" && (
                    <>
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                        <UnitInstanceDisplay
                            selectedUnitInstances={selectedUnitInstances}
                            setSelectedUnitInstances={setSelectedUnitInstances}
                        />
                        <AvailableUnitInstances 
                            roleInstance={roleInstance}
                            unitInstances={unitInstances}
                            handleDeleteUnitInstance={handleDeleteUnitInstance}
                        />
                        <GamemasterMenu
                            join_code={join_code}
                            units={units}
                            teams={teams}
                            handleAddUnitInstance={handleAddUnitInstance}
                        />
                    </>
                )}

            </div>
        </div>
    );
}
