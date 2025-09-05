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
import Chat from '@/components/chat/Chat';
import { Team, Unit, RoleInstance, UnitInstance, Attack, Ability } from '@/lib/Types'


export default function MainMapPage() {
    const params = useParams();
    const authedFetch = useAuthedFetch();

    const joinCode = params.join_code as string;

    const [mapSrc, setMapSrc] = useState<string>('/maps/taiwan_middle_clean.png');
    const defaultState: Record<string, boolean> = {
        Air: true,
        Ground: true,
        Sea: true,
    };
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<string, boolean>>(defaultState);

    const socketRef = useRef<WebSocket | null>(null);
    const [socketReady, setSocketReady] = useState<boolean>(false);
    const [userJoined, setUserJoined] = useState<boolean>(false);

    const [teams, setTeams] = useState<Team[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [attacks, setAttacks] = useState<Attack[]>([]);
    const [abilities, setAbilities] = useState<Ability[]>([]);

    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);

    const [validationError, setValidationError] = useState<string | null>(null);

    const [showAttack, setShowAttack] = useState(false);

    useEffect(() => {
        let ws: WebSocket | null = null;

        const validateAccess = async () => {
            try {
                const res = await authedFetch(`/api/game-instances/${joinCode}/validate-map-access/`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || data.detail || "Access denied");
                }
                sessionStorage.setItem('role_instance', JSON.stringify(data));
                setRoleInstance(data);

                return data;
            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setValidationError(err.message);
                }
                return null;
            }
        }

        const fetchData = async () => {
            try {
                const storedMap = sessionStorage.getItem('mapSrc');
                if (storedMap) {
                    setMapSrc(storedMap);
                }

                const stored = sessionStorage.getItem('unitInstanceDisplay');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setSelectedUnitInstances((prev) => ({ ...prev, ...parsed }));
                }

                // Unit instances
                authedFetch(`/api/game-instances/${joinCode}/unit-instances/`)
                    .then(res => {
                        if (!res.ok) throw new Error(`UnitInstance fetch failed with ${res.status}`);
                        return res.json();
                    })
                    .then(data => setUnitInstances(data));

                // Teams
                getSessionStorageOrFetch<Team[]>('teams', async () => {
                    const res = await authedFetch("/api/teams/");
                    if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setTeams(data));

                // Units
                getSessionStorageOrFetch<Unit[]>('units', async () => {
                    const res = await authedFetch("/api/units/");
                    if (!res.ok) throw new Error(`Unit fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setUnits(data));


                // Attacks
                getSessionStorageOrFetch<Attack[]>('attacks', async () => {
                    const res = await authedFetch("/api/attacks/");
                    if (!res.ok) throw new Error(`Attack fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setAttacks(data));

                // Abilities
                getSessionStorageOrFetch<Ability[]>('abilities', async () => {
                    const res = await authedFetch("/api/abilities/");
                    if (!res.ok) throw new Error(`Ability fetch failed with ${res.status}`);
                    return res.json();
                })
                    .then(data => setAbilities(data));


            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setValidationError(err.message);
                }
            }
        };

        const connectToWebsocket = () => {
            if (socketRef.current) return;

            const token = localStorage.getItem("accessToken");
            ws = new WebSocket(`${WS_URL}/game-instances/${joinCode}/?token=${token}`);
            socketRef.current = ws;

            ws.onopen = () => {
                setSocketReady(true);
                socketRef.current?.addEventListener("message", handleGamesMessage);
                socketRef.current?.addEventListener("message", handleRoleInstancesMessage);
                socketRef.current?.send(JSON.stringify({
                    channel: "users",
                    action: "list",
                    data: {}
                }));
                socketRef.current?.send(JSON.stringify({
                    channel: "timer",
                    action: "get_finish_time",
                    data: {}
                }));
            }
        }

        const handleGamesMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "games") {
                switch (msg.action) {
                    case "delete":
                        alert("This game was deleted.");
                        sessionStorage.clear();
                        window.location.href = "/roleselect";
                        break;
                }
            }
        }

        const handleRoleInstancesMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "role_instances") {
                switch (msg.action) {
                    case "delete":
                        alert("Your role in this game was deleted.");
                        sessionStorage.clear();
                        window.location.href = "/roleselect";
                        break;
                }
            }
        }

        (async () => {
            const roleInstanceData = await validateAccess();
            if (!roleInstanceData) return;
            fetchData();
            connectToWebsocket();
        })();

        return () => {
            ws?.close();
            socketRef.current = null;
            setSocketReady(false);
        };
    }, [authedFetch, joinCode]);

    if (validationError) {
        return (
            <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
                <h1 className="text-xl font-bold">{validationError}</h1>
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
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-50">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-sm">
                            Request
                        </button>
                        <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded text-sm">
                            Move
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowAttack((prev) => !prev)}
                                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded text-sm"
                            >
                                Attack
                            </button>

                            <UnitAttackDisplay
                                open={showAttack}
                                onClose={() => setShowAttack(false)}
                                roleInstance={roleInstance}
                                unitInstances={unitInstances}
                                attacks={attacks}
                                onAttackSuccess={(data) => console.log(data)}
                            />
                        </div>
                    </div>
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
                            setUserJoined={setUserJoined}
                            roleInstance={roleInstance}
                        />
                        <Chat
                            socketRef={socketRef}
                            socketReady={socketReady}
                            userJoined={userJoined}
                            viewerRoleInstance={roleInstance}
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
                            setUserJoined={setUserJoined}
                            roleInstance={roleInstance}
                        />
                        <Chat
                            socketRef={socketRef}
                            socketReady={socketReady}
                            userJoined={userJoined}
                            viewerRoleInstance={roleInstance}
                        />
                        <AvailableUnitInstances
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            unitInstances={unitInstances}
                        />
                        <ResourcePoints
                            joinCode={joinCode}
                            roleInstance={roleInstance}
                        />
                    </>
                )}
                {/* Menu for Ambassador */}
                {roleInstance?.role.name == "Ambassador" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            setUserJoined={setUserJoined}
                            roleInstance={roleInstance}
                        />
                        <Chat
                            socketRef={socketRef}
                            socketReady={socketReady}
                            userJoined={userJoined}
                            viewerRoleInstance={roleInstance}
                        />
                    </>
                )}
                {/* Menu for Combatant Commander */}
                {roleInstance?.role.name == "Combatant Commander" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            setUserJoined={setUserJoined}
                            roleInstance={roleInstance}
                        />
                        <Chat
                            socketRef={socketRef}
                            socketReady={socketReady}
                            userJoined={userJoined}
                            viewerRoleInstance={roleInstance}
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
                            setUserJoined={setUserJoined}
                            roleInstance={roleInstance}
                        />
                        <Chat
                            socketRef={socketRef}
                            socketReady={socketReady}
                            userJoined={userJoined}
                            viewerRoleInstance={roleInstance}
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
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            units={units}
                            teams={teams}
                        />
                        <GamemasterMenu
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                        />
                    </>
                )}

            </div>
        </div>
    );
}
