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
import SendResourcePoints from '@/components/SendResourcePoints';
import { RoleInstance, UnitInstance } from '@/lib/Types'
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL } from '@/lib/utils';

export default function MainMapPage() {
    // const [socket, setSocket] = useState<WebSocket | null>(null);
    //const [messages, setMessages] = useState<string[]>([]);
    // const [input, setInput] = useState('');

    const params = useParams();
    const join_code = params.join_code as string;

    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_clean.png');
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);
    const [timer, setTimer] = useState<number>(600); // 10 minutes in seconds
    const [mapValidationError, setMapValidationError] = useState<string | null>(null);
    const authed_fetch = useAuthedFetch()

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First validate map access
                const validationRes = await authed_fetch(`/api/game-instances/${join_code}/validate-map-access/`);
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
                const unitsRes = await authed_fetch(`/api/game-instances/${join_code}/unit-instances/`);
                if (!unitsRes.ok) {
                    throw new Error(`Unit fetch failed with ${unitsRes.status}`);
                }

                const units = await unitsRes.json();
                if (Array.isArray(units)) {
                    setUnitInstances(units);
                } else {
                    setUnitInstances([]);
                    throw new Error(`Expected array from Unit fetch but got: ${units}`);
                }

                // Start the timer WebSocket only if validation succeeded
                const ws = new WebSocket(`${WS_URL}/game-instances/${join_code}/global-timer/`);
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setTimer(data.remaining_seconds);
                };
                // Clean up WebSocket on unmount
                return () => ws.close();

            } catch (err: any) {
                console.error(err);
                setMapValidationError(err.message);
            }
        };

        fetchData();
    }, []);

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

    const canViewRestrictedComponents = (role_instance: RoleInstance | null) => {
        return role_instance && (role_instance.role.is_operations || role_instance.role.is_logistics);
    };

    if (mapValidationError) {
        return ( 
            <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
                <h1 className="text-xl font-bold">{mapValidationError}</h1> 
            </div>
        );
    }

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
                    <InteractiveMap mapSrc={mapSrc} join_code={join_code} unitInstances={unitInstances} setUnitInstances={setUnitInstances} />
                </div>

                {/* Footer for Ops/Logs */}
                {canViewRestrictedComponents(roleInstance) && (
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
                {canViewRestrictedComponents(roleInstance) && (
                    <>
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                        <UnitInstanceDisplay />
                    </>
                )}
                {/* Menu for CoS */}
                {roleInstance?.role.is_chief_of_staff && (
                    <>
                        <AvailableUnitInstances unitInstances={unitInstances} />
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

            </div>
        </div>
    );
}
