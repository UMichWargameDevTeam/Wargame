'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL, getSessionStorageOrFetch } from '@/lib/utils';
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
import Timer from '@/components/Timer';
import UsersList from '@/components/UsersList';
import Communications from '@/components/communications/Communications';
import { Team, Unit, RoleInstance, UnitInstance, Attack } from '@/lib/Types'


/**
 * Main protected map page for a game instance; validates access, loads initial game data,
 * opens a WebSocket for realtime updates, and renders the role-aware combat map UI.
 *
 * This component:
 * - Validates the current user's access to the map for the given join code and stores the returned role instance in sessionStorage.
 * - Loads map selection, unit display preferences, unit instances, teams, units, attacks, and team-role points (with sessionStorage fallbacks where applicable).
 * - Establishes a WebSocket connection to receive live updates and reacts to remote deletion of the game or the user's role by clearing sessionStorage and navigating to the role selection page.
 * - Maintains UI state (map, selected unit types, unit instances, teams, attacks, role data, and socket readiness) and conditionally renders controls and sidebar menus based on the current role.
 *
 * On validation or fetch failures the component surfaces an error message in place of the UI.
 *
 * @returns The page's React element tree.
 */
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

    const [teams, setTeams] = useState<Team[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [attacks, setAttacks] = useState<Attack[]>([]);
    // const [abilities, setAbilities] = useState<Ability[]>([]);

    // data about this user's role
    const [roleInstance, setRoleInstance] = useState<RoleInstance | null>(null);
    const [teamInstanceRolePoints, setTeamInstanceRolePoints] = useState<number>(0);
    // data about roles of all users in this game
    const [roleInstances, setRoleInstances] = useState<RoleInstance[]>([]);
    const [unitInstances, setUnitInstances] = useState<UnitInstance[]>([]);

    const [validationError, setValidationError] = useState<string | null>(null);

    const [showAttack, setShowAttack] = useState(false);
    useEffect(() => {

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

        const fetchData = async (roleInstance: RoleInstance) => {
            try {
                const storedMap = sessionStorage.getItem('mapSrc');
                if (storedMap) {
                    setMapSrc(storedMap);
                }

                const storedUnits = sessionStorage.getItem('unitInstanceDisplay');
                if (storedUnits) setSelectedUnitInstances(prev => ({ ...prev, ...JSON.parse(storedUnits) }));

                // fetch data in parallel
                const [
                    unitInstancesData,
                    teamInstanceRolePointsData,
                    teamsData,
                    unitsData,
                    attackData
                ] = 
                await Promise.all([
                    authedFetch(`/api/game-instances/${joinCode}/unit-instances/`)
                        .then(res => res.ok ? res.json() : Promise.reject(`UnitInstance fetch failed with ${res.status}`)),
                    authedFetch(`/api/game-instances/${joinCode}/team-instances/${roleInstance.team_instance.team.name}/role/${roleInstance.role.name}/points/`)
                        .then(res => res.ok ? res.json() : Promise.reject(`TeamInstanceRolePoints fetch failed with ${res.status}`)),
                    getSessionStorageOrFetch<Team[]>('teams', async () => {
                        const res = await authedFetch("/api/teams/");
                        if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                        return res.json();
                    }),
                    getSessionStorageOrFetch<Unit[]>('units', async () => {
                        const res = await authedFetch("/api/units/");
                        if (!res.ok) throw new Error(`Unit fetch failed with ${res.status}`);
                        return res.json();
                    }),
                    getSessionStorageOrFetch<Attack[]>('attacks', async () => {
                        const res = await authedFetch("/api/attacks/");
                        if (!res.ok) throw new Error(`Attack fetch failed with ${res.status}`);
                        return res.json();
                    })
                ]);

                setUnitInstances(unitInstancesData);
                setTeamInstanceRolePoints(teamInstanceRolePointsData.supply_points);
                setTeams(teamsData);
                setUnits(unitsData);
                setAttacks(attackData);

            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setValidationError(err.message);
                }
            }
        };

        const connectToWebSocket = () => {
            if (socketRef.current) return;

            const token = localStorage.getItem("accessToken");
            socketRef.current = new WebSocket(`${WS_URL}/game-instances/${joinCode}/?token=${token}`);

            socketRef.current.onopen = () => {
                setSocketReady(true);
                socketRef.current?.addEventListener("message", handleGamesMessage);
                socketRef.current?.addEventListener("message", handleRoleInstancesMessage);
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
            await fetchData(roleInstanceData);
            connectToWebSocket();
        })();

        return () => {
            setSocketReady(false);
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


                {/* Map controls bottom-left */}
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && (
                    <div className="fixed bottom-8 left-4 z-50 flex flex-col items-start bg-neutral-800 rounded p-2 gap-0">
                        {/* Buttons container */}
                        <div className="flex space-x-2 items-center">
                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-sm">
                                Request
                            </button>
                            <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded text-sm">
                                Move
                            </button>

                            <button
                                onClick={() => setShowAttack((prev) => !prev)}
                                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded text-sm ml-2"
                            >
                                Attack
                            </button>
                        </div>

                        {/* Attack popup menu */}
                        {showAttack && (
                            <div className="absolute bottom-full left-0 mb-0 rounded shadow-lg min-w-[550px]">
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
                {roleInstance?.role.name == "Ambassador" && (
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
                    </>
                )}
                {/* Menu for Combatant Commander */}
                {roleInstance?.role.name == "Combatant Commander" && (
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
                        <JTFMenu />
                    </>
                )}
                {/* Menu for Gamemaster */}
                {roleInstance?.role.name == "Gamemaster" && (
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
