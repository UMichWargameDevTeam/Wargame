'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import ReconnectingWebSocket from "reconnecting-websocket";
import MapSelector from '@/components/MapSelector';
import UnitInstanceDisplay from '@/components/UnitInstanceDisplay';
import AvailableUnitInstances from '@/components/AvailableUnitInstances';
import AddUnitInstance from '@/components/AddUnitInstance';
import SupplyPoints from '@/components/SupplyPoints';
import CommandersIntent from '@/components/CommandersIntent';
import InteractiveMap from '@/components/InteractiveMap';
import JTFMenu from '@/components/JTFMenu';
import GamemasterMenu from '@/components/GamemasterMenu';
import UnitAttackDisplay from '@/components/UnitAttackDisplay';
import TurnSystem from '@/components/turnSystem/TurnSystem';
import UsersList from '@/components/UsersList';
import Communications from '@/components/communications/Communications';
import { WS_URL, getSessionStorageOrFetch } from '@/lib/utils';
import { Team, Unit, RoleInstance, UnitInstance, Attack, GameInstance } from '@/lib/Types'


export default function MainMapPage() {
    const params = useParams();
    const authedFetch = useAuthedFetch();

    const joinCode = params.join_code as string;
    const defaultState: Record<string, boolean> = {
        Air: true,
        Ground: true,
        Sea: true,
    };

    const socketRef = useRef<ReconnectingWebSocket | null>(null);
    const [socketReady, setSocketReady] = useState<boolean>(false);

    const [mapSrc, setMapSrc] = useState<string>('/maps/taiwan_middle_clean.png');
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<string, boolean>>(defaultState);
    const [teams, setTeams] = useState<Team[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [attacks, setAttacks] = useState<Attack[]>([]);
    // const [abilities, setAbilities] = useState<Ability[]>([]);
    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [teamInstanceRolePoints, setTeamInstanceRolePoints] = useState<number>(0);
    const [roleInstances, setRoleInstances] = useState<RoleInstance[]>([]);
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showAttack, setShowAttack] = useState(false);
    const [gameInstance, setGameInstance] = useState<GameInstance | null>(null);

    useEffect(() => {
        const validateAccess = async () => {
            try {
                const res = await authedFetch(`/api/game-instances/${joinCode}/validate-map-access/`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || data.detail || "Access denied");
                }

                const roleInstanceData: RoleInstance = data;
                sessionStorage.setItem('role_instance', JSON.stringify(roleInstanceData));
                setRoleInstance(roleInstanceData);
                setGameInstance(roleInstanceData.team_instance.game_instance);

                return data;

            } catch (err: unknown) {
                console.error(err);

                if (err instanceof Error) {
                    setValidationError(err.message);
                }

                return null;
            }
        }

        const fetchData = async (roleInstance: RoleInstance) => {
            const storedMap = sessionStorage.getItem('mapSrc');

            if (storedMap) {
                setMapSrc(storedMap);
            }

            const storedUnits = sessionStorage.getItem('unitInstanceDisplay');

            if (storedUnits) {
                setSelectedUnitInstances(prev => ({ ...prev, ...JSON.parse(storedUnits) }));
            }

            // fetch data in parallel
            await Promise.all([
                authedFetch(`/api/game-instances/${joinCode}/unit-instances/`)
                    .then(res => res.ok
                        ? res.json()
                        : Promise.reject(`UnitInstance fetch failed with ${res.status}`))
                    .then(data => setUnitInstances(data)),

                authedFetch(`/api/game-instances/${joinCode}/team-instances/${roleInstance.team_instance.team.name}/role/${roleInstance.role.name}/points/`)
                    .then(res => res.ok
                        ? res.json()
                        : Promise.reject(`TeamInstanceRolePoints fetch failed with ${res.status}`))
                    .then(data => setTeamInstanceRolePoints(data.supply_points)),

                getSessionStorageOrFetch<Team[]>('teams', async () => {
                    const res = await authedFetch("/api/teams/");
                    return res.ok
                        ? res.json()
                        : Promise.reject(`Team fetch failed with ${res.status}`);
                })
                    .then(data => setTeams(data)),

                getSessionStorageOrFetch<Unit[]>('units', async () => {
                    const res = await authedFetch("/api/units/");
                    return res.ok
                        ? res.json()
                        : Promise.reject(`Unit fetch failed with ${res.status}`);
                })
                    .then(data => setUnits(data)),

                getSessionStorageOrFetch<Attack[]>('attacks', async () => {
                    const res = await authedFetch("/api/attacks/");
                    return res.ok
                        ? res.json()
                        : Promise.reject(`Attack fetch failed with ${res.status}`);
                })
                    .then(data => setAttacks(data)),
            ])
                .catch(errMessage => setValidationError(errMessage))
        };

        const connectToWebSocket = () => {
            if (socketRef.current) return;
            socketRef.current = new ReconnectingWebSocket(`${WS_URL}/game-instances/${joinCode}/`, [], {
                minReconnectionDelay: 1000,
                reconnectionDelayGrowFactor: 2,
                maxRetries: 8,
            });

            socketRef.current.onopen = () => {
                setSocketReady(true);
                socketRef.current?.addEventListener("message", handleGamesMessage);
                socketRef.current?.addEventListener("message", handleRoleInstancesMessage);
            }

            socketRef.current.onclose = () => setSocketReady(false);
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
            await fetchData(roleInstanceData);
            connectToWebSocket();
        })();

        return () => {
            setSocketReady(false);
            socketRef.current?.removeEventListener("message", handleGamesMessage);
            socketRef.current?.removeEventListener("message", handleRoleInstancesMessage);
            socketRef.current?.close();
            socketRef.current = null;
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
                {/* Header */}
                <div className="flex w-full space-x-2">
                    <TurnSystem
                        joinCode={joinCode}
                        socketRef={socketRef}
                        socketReady={socketReady}
                        roleInstance={roleInstance}
                        gameInstance={gameInstance}
                        setGameInstance={setGameInstance}
                        roleInstances={roleInstances}
                        setRoleInstances={setRoleInstances}
                    />
                    {(roleInstance?.role.name !== "Gamemaster") && (
                        <CommandersIntent roleInstance={roleInstance} />
                    )}
                </div>
                {/* Map */}
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
                {/* Map controls bottom-left */}
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && (
                    <div className="text-sm fixed bottom-8 left-4 z-50 flex flex-col items-start bg-neutral-800 rounded p-2 gap-0">
                        {/* Buttons container */}
                        <div className="flex space-x-2 items-center">
                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded">
                                Request
                            </button>
                            <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded">
                                Move
                            </button>
                            <button
                                onClick={() => setShowAttack((prev) => !prev)}
                                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded ml-2"
                            >
                                Attack
                            </button>
                        </div>
                        {/* Attack popup menu */}
                        {showAttack && (
                            <div className="absolute bottom-full left-0 mb-0 rounded min-w-[550px]">
                                <UnitAttackDisplay
                                    open={showAttack}
                                    onClose={() => setShowAttack(false)}
                                    roleInstance={roleInstance}
                                    unitInstances={unitInstances}
                                    attacks={attacks}
                                    onAttackSuccess={(data) => console.log(data)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Sidebar */}
            <div className="flex-1 h-full bg-neutral-800 space-y-4 rounded-lg p-4 overflow-y-auto">
                <div className="text-lg font-bold mb-2">
                    <h2>Team: {roleInstance?.team_instance.team.name || 'Unknown'}</h2>
                    <h2>Role: {roleInstance?.role.name || 'Unknown'}</h2>
                    <h2>User: {roleInstance?.user.username || 'Unknown'}</h2>
                </div>
                {/* Menu for Ops/Logs */}
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            roleInstances={roleInstances}
                            setRoleInstances={setRoleInstances}
                        />
                        <Communications
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                        />
                        <SupplyPoints
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                            teamInstanceRolePoints={teamInstanceRolePoints}
                            setTeamInstanceRolePoints={setTeamInstanceRolePoints}
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
                    </>
                )}
                {/* Menu for CoS */}
                {roleInstance?.role.is_chief_of_staff && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            roleInstances={roleInstances}
                            setRoleInstances={setRoleInstances}
                        />
                        <Communications
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                        />
                        <SupplyPoints
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                            teamInstanceRolePoints={teamInstanceRolePoints}
                            setTeamInstanceRolePoints={setTeamInstanceRolePoints}
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
                    </>
                )}
                {/* Menu for Ambassador */}
                {roleInstance?.role.name === "Ambassador" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            roleInstances={roleInstances}
                            setRoleInstances={setRoleInstances}
                        />
                        <Communications
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                        />
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                    </>
                )}
                {/* Menu for Combatant Commander */}
                {roleInstance?.role.name === "Combatant Commander" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            roleInstances={roleInstances}
                            setRoleInstances={setRoleInstances}
                        />
                        <Communications
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                        />
                        <SupplyPoints
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                            teamInstanceRolePoints={teamInstanceRolePoints}
                            setTeamInstanceRolePoints={setTeamInstanceRolePoints}
                        />
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                        <JTFMenu />
                    </>
                )}
                {/* Menu for Gamemaster */}
                {roleInstance?.role.name === "Gamemaster" && (
                    <>
                        <UsersList
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            roleInstances={roleInstances}
                            setRoleInstances={setRoleInstances}
                        />
                        <Communications
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                        />
                        <SupplyPoints
                            joinCode={joinCode}
                            socketRef={socketRef}
                            socketReady={socketReady}
                            viewerRoleInstance={roleInstance}
                            teamInstanceRolePoints={teamInstanceRolePoints}
                            setTeamInstanceRolePoints={setTeamInstanceRolePoints}
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
                            roleInstance={roleInstance}
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
