'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import UsersList from '@/components/UsersList';
import { WS_URL } from '@/lib/utils';

export default function CreateGamePage() {
    const [joinCode, setJoinCode] = useState('');
    const [success, setSuccess] = useState(false);

    const [joinGameCode, setJoinGameCode] = useState('');
    const [joinedGameCode, setJoinedGameCode] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    const authed_fetch = useAuthedFetch();
    const router = useRouter();

    useEffect(() => {
        const storedJoinCode = sessionStorage.getItem('joinCode');
        const gameCreated = sessionStorage.getItem('gameCreated') === 'true';
        if (storedJoinCode && gameCreated) {
            setJoinCode(storedJoinCode);
            setSuccess(true);
        }

        const existingJoinGameCode = sessionStorage.getItem('gameJoinCode');
        const existingGameInstanceId = sessionStorage.getItem('gameInstanceId');
        if (existingJoinGameCode && existingGameInstanceId) {
            setJoinedGameCode(existingJoinGameCode);
        }
    }, []);

    const handleCreate = async () => {
        const response = await authed_fetch('/api/game-instances/create/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ join_code: joinCode }),
        });

        if (response.ok) {
            sessionStorage.setItem('joinCode', joinCode);
            sessionStorage.setItem('gameCreated', 'true');
            setSuccess(true);
        }
    };

    const handleJoinGame = async () => {
        setJoinError(null);
        try {
            const res = await authed_fetch(`/api/game-instances/?join_code=${joinGameCode}`);
            if (!res.ok) throw new Error('Game instance not found');
            const data = await res.json();
            if (data.length === 0) throw new Error('No matching join code');

            const gameId = data[0].id;
            sessionStorage.setItem('gameInstanceId', gameId);
            sessionStorage.setItem('gameJoinCode', data[0].join_code);
            sessionStorage.setItem('role', 'Gamemaster');
            sessionStorage.setItem('username', sessionStorage.getItem('username') || 'Gamemaster');

            // Open WS and send join event
            const socket = new WebSocket(`${WS_URL}/game/${gameId}/`);
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'join',
                    username: sessionStorage.getItem('username'),
                    team: 'Gamemaster', // or whatever team logic you want
                    branch: 'None',
                    role: 'Gamemaster',
                    ready: false,
                }));
            };

            setJoinedGameCode(data[0].join_code);
            setJoinGameCode('');

        } catch (err: unknown) {
            if (err instanceof Error)
                console.error(err.message);
            else 
                console.error("An unkown error has occured.")
        }
    };

    const handleLeaveGame = () => {
        sessionStorage.removeItem('gameInstanceId');
        sessionStorage.removeItem('gameJoinCode');
        setJoinedGameCode(null);
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8 flex flex-col gap-8">
            {/* Header */}
            <h1 className="text-4xl font-bold border-b border-neutral-700 pb-4">
                Gamemaster Controls
            </h1>
            <div className="min-h-screen bg-neutral-900 text-white p-8 flex gap-12">
                {/* Left side: Create + Join */}
                <div className="flex flex-col gap-8 max-w-md">
                    {/* Create Join Code */}
                    <div className="bg-neutral-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h2 className="text-2xl font-semibold border-b border-neutral-700 pb-2">
                            Create Join Code
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                className="px-4 py-2 text-black rounded w-full bg-white"
                                placeholder="e.g. redvsblue2025"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={success}
                                className={`px-6 py-2 rounded transition ${success
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-purple-700 hover:bg-purple-600'
                                    }`}
                            >
                                Create Game
                            </button>
                            {success && (
                                <div className="mt-4 space-y-4">
                                    <p className="text-green-400">
                                        ✅ Game created with join code: <span className="font-mono">{joinCode}</span>
                                    </p>
                                    <button
                                        onClick={() => {
                                            sessionStorage.setItem('role', 'Gamemaster');
                                            router.push('/mainmap');
                                        }}
                                        className="px-6 py-2 bg-green-600 rounded hover:bg-green-500 transition"
                                    >
                                        Go to Main Page
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Join Game */}
                    <div className="bg-neutral-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h2 className="text-2xl font-semibold border-b border-neutral-700 pb-2">
                            Join Game as Gamemaster
                        </h2>

                        {joinedGameCode ? (
                            <div className="space-y-3">
                                <p>✅ Currently joined game: <span className="font-mono">{joinedGameCode}</span></p>
                                <button
                                    onClick={handleLeaveGame}
                                    className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition text-sm"
                                >
                                    Leave Game
                                </button>
                                <button
                                    onClick={() => router.push('/mainmap')}
                                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition w-full"
                                >
                                    Go to Main Page
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={joinGameCode}
                                    onChange={(e) => setJoinGameCode(e.target.value)}
                                    placeholder="Enter join code..."
                                    className="w-full px-4 py-2 rounded text-black bg-white"
                                />
                                {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
                                <button
                                    onClick={handleJoinGame}
                                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition w-full"
                                >
                                    Join
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="bg-neutral-800 rounded-lg max-w-md max-h-[475px] overflow-y-auto">
                    <UsersList/>
                </div>
            </div>
        </div>
    );
}
