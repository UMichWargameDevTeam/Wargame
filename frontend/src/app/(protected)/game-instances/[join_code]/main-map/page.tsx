'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WS_URL } from '@/lib/utils';
import { useGameData } from '@/hooks/useGameData';
import { useGameSocket } from '@/hooks/useGameSocket';
import InteractiveMap from '@/components/InteractiveMap';
import CommandersIntent from '@/components/CommandersIntent';
import Timer from '@/components/Timer';
import FooterControls from '@/components/FooterControls';
import UsersList from '@/components/UsersList';
import MapSelector from '@/components/MapSelector';
import UnitInstanceDisplay from '@/components/UnitInstanceDisplay';
import AvailableUnitInstances from '@/components/AvailableUnitInstances';
import AddUnitInstance from '@/components/AddUnitInstance';
import ResourcePoints from '@/components/ResourcePoints';
import JTFMenu from '@/components/JTFMenu';
import SendResourcePoints from '@/components/SendResourcePoints';
import GamemasterMenu from '@/components/GamemasterMenu';
import { RoleInstance, UnitInstance, Team, Unit, Attack } from '@/lib/Types';

export default function MainMapPage() {
    const params = useParams();
    const joinCode = params.join_code as string;

    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_clean.png');
    const defaultSelected: Record<string, boolean> = { Air: true, Ground: true, Sea: true };
    const [selectedUnitInstances, setSelectedUnitInstances] = useState<Record<string, boolean>>(defaultSelected);


    const {
        roleInstance,
        teams,
        units,
        attacks,
        abilities,
        unitInstances,
        setUnitInstances,
        validationError
    } = useGameData(joinCode);

    const { socketRef, socketReady } = useGameSocket(joinCode, roleInstance);

    useEffect(() => {
        const storedMap = sessionStorage.getItem('mapSrc');
        if (storedMap) setMapSrc(storedMap);

        const storedUnits = sessionStorage.getItem('unitInstanceDisplay');
        if (storedUnits) {
            setSelectedUnitInstances(prev => ({ ...prev, ...JSON.parse(storedUnits) }));
        }
    }, []);

    if (validationError) {
        return (
            <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
                <h1 className="text-xl font-bold">{validationError}</h1>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-neutral-900 text-white p-4 space-x-4">
            {/* Main Column: Map + Header + Footer */}
            <div className="flex flex-col w-[70%] h-full space-y-4">
                {/* Header: Commander / CoS */}
                {(roleInstance?.role.name === "Combatant Commander" || roleInstance?.role.is_chief_of_staff) && (
                    <div className="flex space-x-4 w-full items-stretch">
                        <div className="flex-grow">
                            <CommandersIntent roleInstance={roleInstance} />
                        </div>
                        <div className="flex-shrink-0">
                            <Timer socketRef={socketRef} socketReady={socketReady} />
                        </div>
                    </div>
                )}

                {/* Interactive Map */}
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

                {/* Footer Controls: Ops / Logistics */}
                {(roleInstance?.role.is_operations || roleInstance?.role.is_logistics) && <FooterControls />}
            </div>

            {/* Sidebar */}
            <div className="flex-1 h-full bg-neutral-800 rounded-lg p-4 overflow-y-auto">
                <h2 className="text-lg mb-2">Team: {roleInstance?.team_instance.team.name || 'Unknown'}</h2>
                <h2 className="text-lg mb-2">Role: {roleInstance?.role.name || 'Unknown'}</h2>

                {/* Role-based Menus */}
                {roleInstance?.role.is_operations || roleInstance?.role.is_logistics ? (
                    <>
                        <UsersList socketRef={socketRef} socketReady={socketReady} roleInstance={roleInstance} />
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
                ) : null}

                {roleInstance?.role.is_chief_of_staff && (
                    <>
                        <UsersList socketRef={socketRef} socketReady={socketReady} roleInstance={roleInstance} />
                        <AvailableUnitInstances
                            socketRef={socketRef}
                            socketReady={socketReady}
                            roleInstance={roleInstance}
                            unitInstances={unitInstances}
                        />
                        <ResourcePoints joinCode={joinCode} roleInstance={roleInstance} />
                    </>
                )}

                {roleInstance?.role.name === "Combatant Commander" && (
                    <>
                        <UsersList socketRef={socketRef} socketReady={socketReady} roleInstance={roleInstance} />
                        <JTFMenu />
                        <SendResourcePoints />
                    </>
                )}

                {roleInstance?.role.name === "Gamemaster" && (
                    <>
                        <UsersList socketRef={socketRef} socketReady={socketReady} roleInstance={roleInstance} />
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
                            roleInstance={roleInstance} 
                            socketReady={socketReady} 
                            socketRef={socketRef} 
                        />
                    </>
                )}
            </div>
        </div>
    );
}
