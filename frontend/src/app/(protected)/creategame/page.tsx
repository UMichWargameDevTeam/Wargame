'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authed_fetch } from '@/lib/utils';

export default function CreateGamePage() {
    const [joinCode, setJoinCode] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const storedJoinCode = sessionStorage.getItem('joinCode');
        const gameCreated = sessionStorage.getItem('gameCreated') === 'true';

        if (storedJoinCode && gameCreated) {
            setJoinCode(storedJoinCode);
            setSuccess(true);
        }
    }, []);

    const handleCreate = async () => {
        const response = await authed_fetch('/api/game-instances/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ join_code: joinCode }),
        });

        if (response.ok) {
            sessionStorage.setItem('joinCode', joinCode);
            sessionStorage.setItem('gameCreated', 'true');
            setSuccess(true);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8">
            {/* Page Title */}
            <h1 className="text-4xl font-bold text-center mb-12">
                Gamemaster Controls
            </h1>

            {/* Grid layout for left/right controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Panel: Create Join Code */}
                <div className="bg-neutral-800 p-6 rounded-lg shadow-lg space-y-6 max-w-md">
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
                                        // sessionStorage.setItem('team', 'Neutral');
                                        sessionStorage.setItem('joinCode', joinCode);
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

                {/* Right Panel: Placeholder for more controls */}
                <div className="bg-neutral-800 p-6 rounded-lg shadow-lg h-full flex items-center justify-center text-neutral-500">
                    <span>More Gamemaster tools coming soon...</span>
                </div>
            </div>
        </div>
    );

}
