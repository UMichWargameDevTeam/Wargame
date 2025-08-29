'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL, getSessionStorageOrFetch } from '@/lib/utils';
import MapSelector from '@/components/MapSelector';
import UnitInstanceDisplay from '@/components/UnitInstanceDisplay';
import FooterControls from '@/components/FooterControls';
import AvailableUnitInstances from '@/components/AvailableUnitInstances';
import AddUnitInstance from '@/components/AddUnitInstance';
import ResourcePoints from '@/components/ResourcePoints';
import CommandersIntent from '@/components/CommandersIntent';
import InteractiveMap from '@/components/InteractiveMap';
import JTFMenu from '@/components/JTFMenu';
import GamemasterMenu from '@/components/GamemasterMenu';
import SendResourcePoints from '@/components/SendResourcePoints';
import UnitAttackDisplay from '@/components/UnitAttackDisplay';
import Timer from '@/components/Timer';
import UsersList from '@/components/UsersList';
import { Team, Unit, Attack, RoleInstance, UnitInstance } from '@/lib/Types'


export default function MainMapPage() {
    const params = useParams();
    const authedFetch = useAuthedFetch()

    const join_code = params.join_code as string;const socketRef = useRef<WebSocket | null>(null);
    const [socketReady, setSocketReady] = useState<boolean>(false);

    // const [messages, setMessages] = useState<string[]>([]);
    // const [input, setInput] = useState('');

    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_clean.png');

    const [teams, setTeams] = useState<Team[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
     const [attacks, setAttacks] = useState<Attack[]>([]);
    // const [abilities, setAbilities] = useState<Ability[]>([]);

    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);

    const [mapValidationError, setMapValidationError] = useState<string | null>(null);

    const defaultState: Record<string, boolean> = {
        Air: true,
        Ground: true,
        Sea: true,
    };
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<string, boolean>>(defaultState);

    useEffect(() => {
        let ws: WebSocket | null = null;

        const fetchData = async () => {
            try {
                // First validate map access
                const validationRes = await authedFetch(`/api/game-instances/${join_code}/validate-map-access/`);
                const validationData = await validationRes.json();
                if (!validationRes.ok) {
                    throw new Error(validationData.error || validationData.detail || "Access denied");
                }
                sessionStorage.setItem('username', validationData.user.username);
                sessionStorage.setItem('join_code', validationData.team_instance.game_instance.join_code);
                sessionStorage.setItem('team_name', validationData.team_instance.team.name);
                sessionStorage.setItem('branch_name', validationData.role.branch?.name ?? 'None');
                sessionStorage.setItem('role_name', validationData.role.name);
                sessionStorage.setItem('role_instance', JSON.stringify(validationData))
                setRoleInstance(validationData);

                // If validation passed, fetch database data
                // Unit instances
                authedFetch(`/api/game-instances/${join_code}/unit-instances/`)
                    .then(res => {
                        if (!res.ok) throw new Error(`UnitInstance fetch failed with ${res.status}`);
                        return res.json();
                    })
                    .then(data => setUnitInstances(data))

                // Teams
                getSessionStorageOrFetch<Team[]>('teams', async () => {
                    const res = await authedFetch("/api/teams/");
                    if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setTeams(data))

                // Units
                getSessionStorageOrFetch<Unit[]>('units', async () => {
                    const res = await authedFetch("/api/units/");
                    if (!res.ok) throw new Error(`Unit fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setUnits(data))

                
                // Attacks
                getSessionStorageOrFetch<Attack[]>('attacks', async () => {
                    const res = await authedFetch("/api/attacks/");
                    if (!res.ok) throw new Error(`Attack fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setAttacks(data))
                /*
                // Abilities
                getSessionStorageOrFetch<Ability[]>('abilities', async () => {
                    const res = await authedFetch("/api/abilities/");
                    if (!res.ok) throw new Error(`Ability fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setAbilities(data))
                */

                const stored = sessionStorage.getItem('unitInstanceDisplay');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setSelectedUnitInstances((prev) => ({ ...prev, ...parsed }));
                }

                if (!socketRef.current) {
                    const token = localStorage.getItem("accessToken");
                    ws = new WebSocket(`${WS_URL}/game-instances/testcode2/?token=${token}`);
                    socketRef.current = ws;

                    ws.onopen = () => {
                        setSocketReady(true);
                        socketRef.current?.send(JSON.stringify({
                            channel: "users",
                            action: "user_join",
                            data: validationData
                        }));
                    }

                }

            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setMapValidationError(err.message);
                }
            }
        };

        fetchData();

        return () => {
            ws?.close();
            socketRef.current = null;
            setSocketReady(false);
        };
    }, [authedFetch, join_code]);

    useEffect(() => {
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

    return (
        <div className="flex h-screen w-screen bg-neutral-900 text-white p-4 space-x-4">
            {/* Map + Header + Footer */}
            <div className="flex flex-col w-[70%] h-full space-y-4">
                {/* Header for Combatant Commander and Chief of Staff */}
                {(roleInstance?.role.name == "Combatant Commander" || roleInstance?.role.is_chief_of_staff) && (
                    <div className="flex space-x-4 w-full items-stretch">
                        <div className="flex-grow">
                            <CommandersIntent roleInstance={roleInstance} />
                        </div>
                        <div className="flex-shrink-0">
                            <Timer 
                                socketRef={socketRef}
                                socketReady={socketReady}
                            />
                        </div>
                    </div>
                )}
                <div className="w-full h-full bg-neutral-800 rounded-lg overflow-hidden">
                    <InteractiveMap
                        socketRef={socketRef}
                        socketReady={socketReady}
                        mapSrc={mapSrc}
                        unitInstances={unitInstances}
                        setUnitInstances={setUnitInstances} 
                        selectedUnitInstances={selectedUnitInstances}
                    />
                </div>

                {/* Footer for Ops/Logs */}
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && (
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
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                        />
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
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                        />
                        <AvailableUnitInstances
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            unitInstances={unitInstances} 
                        />
                        <ResourcePoints />
                    </>
                )}
                {/* Menu for Combatant Commander */}
                {roleInstance?.role.name == "Combatant Commander" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                        />
                        <JTFMenu />
                        <SendResourcePoints />
                    </>
                )}
                {/* Menu for Gamemaster */}
                {roleInstance?.role.name == "Gamemaster" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                        />
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
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            unitInstances={unitInstances}
                        />
                        <AddUnitInstance
                            join_code={join_code}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            units={units}
                            teams={teams}
                        />
                        <GamemasterMenu
                            join_code={join_code}
                            roleInstance={roleInstance}
                        />
                    </>
                )}

            </div>
        </div>
    );
}
