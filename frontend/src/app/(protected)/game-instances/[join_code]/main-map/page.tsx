'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MapSelector from '@/components/MapSelector';
import AssetDisplay from '@/components/AssetDisplay';
import FooterControls from '@/components/FooterControls';
import AvailableAssets from '@/components/AvailableAssets';
import ResourcePoints from '@/components/ResourcePoints';
import CommandersIntent from '@/components/CommandersIntent';
import InteractiveMap from '@/components/InteractiveMap';
import JTFMenu from '@/components/JTFMenu';
import SendResourcePoints from '@/components/SendResourcePoints';
import { Asset } from '@/lib/Types'
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL } from '@/lib/utils';

export default function MainMapPage() {
    // const [socket, setSocket] = useState<WebSocket | null>(null);
    //const [messages, setMessages] = useState<string[]>([]);
    // const [input, setInput] = useState('');

    const params = useParams();
    const join_code = params.join_code as string;

    const [role, setRole] = useState<string | null>(null);
    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_clean.png');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [timer, setTimer] = useState<number>(600); // 10 minutes in seconds
    const [mapValidationError, setMapValidationError] = useState<string | null>(null);
    const authed_fetch = useAuthedFetch()

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First validate map access
                const validationRes = await authed_fetch(`/api/game-instances/${join_code}/validate-map-access/`);
                if (validationRes.status !== 204) {
                    const data = await validationRes.json();
                    throw new Error(data.error || data.detail || "Access denied");
                }

                // If validation passed, fetch unit instances
                const unitsRes = await authed_fetch(`/api/game-instances/${join_code}/unit-instances/`);
                if (!unitsRes.ok) {
                    throw new Error(`Unit fetch failed with ${unitsRes.status}`);
                }

                const units = await unitsRes.json();
                if (Array.isArray(units)) {
                    setAssets(units);
                } else {
                    setAssets([]);
                    throw new Error(`Expected array from Unit fetch but got: ${units}`);
                }
            } catch (err: any) {
                console.error(err);
                setMapValidationError(err.message);
            }
        };

        fetchData();
    }, [join_code, authed_fetch]);

    useEffect(() => {
        const storedRole = sessionStorage.getItem('role_name');
        setRole(storedRole);
        const storedMap = sessionStorage.getItem('mapSrc');
        if (storedMap) {
            setMapSrc(storedMap);
        }
    }, []);

    // effect for timer
    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/game-instances/${join_code}/global-timer/`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTimer(data.remaining_seconds);
        };
        return () => ws.close();
    }, []);

    // used for sending messages over websockets - currently not in use
    // const sendMessage = () => {
    //     if (socket && socket.readyState === WebSocket.OPEN) {
    //         const payload = JSON.stringify({ message: input });
    //         socket.send(payload);
    //         setInput('');
    //     }
    // };

    const canViewRestrictedComponents = (role: string | null) => {
        return role === 'Ops' || role === 'Logistics';
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
                {/* Header for USA/USAF/USN CC*/}
                {['Ops', 'Logistics', 'USA-CC', 'USAF-CC', 'USN-CC', 'JTF-CC'].includes(role || '') && (
                    <div className="flex space-x-4 w-full items-stretch">
                        <div className="flex-grow">
                            <CommandersIntent role={role} />
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
                    <InteractiveMap mapSrc={mapSrc} join_code={join_code} assets={assets} setAssets={setAssets} />
                </div>

                {/* Footer for Ops/Logs */}
                {canViewRestrictedComponents(role) && (
                    <>
                        <FooterControls />
                    </>
                )}
            </div>

            {/* Sidebar */}
            <div className="flex-1 h-full bg-neutral-800 rounded-lg p-4 overflow-y-auto">
                <h2 className="text-lg mb-2">Current Role: {role || 'Unknown'}</h2>
                {/* Menu for Ops/Logs */}
                {['Ops', 'Logistics'].includes(role || '') && (
                    <>
                        <MapSelector
                            initialMap={mapSrc}
                            onMapChange={(path) => {
                                setMapSrc(path);
                                sessionStorage.setItem('mapSrc', path);
                            }}
                        />
                        <AssetDisplay />
                    </>
                )}
                {/* Menu for USA/USAF/USN CC*/}
                {['USA-CC', 'USAF-CC', 'USN-CC'].includes(role || '') && (
                    <>
                        <AvailableAssets assets={assets} />
                        <ResourcePoints />
                    </>
                )}
                {/* Menu for USA/USAF/USN CC*/}
                {['JTF-CC'].includes(role || '') && (
                    <>
                        <JTFMenu />
                        <SendResourcePoints />
                    </>
                )}

            </div>
        </div>
    );
}
