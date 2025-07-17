'use client';

import { useEffect, useState } from 'react';
import MapSelector from '@/components/MapSelector';
import AssetDisplay from '@/components/AssetDisplay';
import FooterControls from '@/components/FooterControls';
import AvailableAssets from '@/components/AvailableAssets';
import ResourcePoints from '@/components/ResourcePoints';
import CommandersIntent from '@/components/CommandersIntent';

export default function MainMapPage() {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [role, setRole] = useState<string | null>(null);
    const [mapSrc, setMapSrc] = useState('/maps/taiwan_middle_hex.png');
    

    useEffect(() => {
        const storedRole = sessionStorage.getItem('role');
        setRole(storedRole);
        const storedMap = sessionStorage.getItem('mapSrc');
        if (storedMap) {
            setMapSrc(storedMap);
        }
        // WEB SOCKETS DISABLED FOR NOW
        /*
        const ws = new WebSocket('ws://localhost:8000/ws/mainmap/');
        setSocket(ws);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                setMessages((prev) => [...prev, msg.message]); // 👈 extract "message" key
            } catch (e) {
                console.error('Invalid JSON received:', event.data);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            ws.close();
        };
        */
    }, []);

    // used for sending messages over websockets - currently not in use
    const sendMessage = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({ message: input });
            socket.send(payload);
            setInput('');
        }
    };

    const canViewRestrictedComponents = (role: string | null) => {
        return role === 'Ops' || role === 'Logistics';
    };

    return (
    <div className="flex h-screen w-screen bg-neutral-900 text-white p-4 space-x-4">
        {/* Map + + Header + Footer */}
        <div className="flex flex-col w-[70%] h-full space-y-4">
            {/* Header for USA/USAF/USN CC*/}
            {['USA-CC', 'USAF-CC', 'USN-CC'].includes(role || '') && (
                <>
                    <CommandersIntent />
                </>
            )}
            <div className="flex-1 bg-neutral-800 rounded-lg overflow-hidden">
                <img
                    src={mapSrc}
                    alt="Map"
                    className="object-contain w-full h-full"
                />
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
            {['Ops', 'Logistics'].includes(role || '')  && (
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
                    <AvailableAssets />
                    <ResourcePoints />
                </>
            )}

        </div>
    </div>
);
}
