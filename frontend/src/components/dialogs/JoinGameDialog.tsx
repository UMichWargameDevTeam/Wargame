'use client';

import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { useEffect, useState } from 'react';

interface JoinGameDialogProps {
    onClose: () => void;
    onSuccess: (gameInstanceId: string, joinCode: string) => void;
    onLeave: () => void;
}

export default function JoinGameDialog({ onClose, onSuccess, onLeave }: JoinGameDialogProps) {
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [existingCode, setExistingCode] = useState<string | null>(null);
    const authed_fetch = useAuthedFetch()

    useEffect(() => {
        const savedCode = sessionStorage.getItem('gameJoinCode');
        const savedId = sessionStorage.getItem('gameInstanceId');
        if (savedCode && savedId) {
            setExistingCode(savedCode);
        }
    }, []);

    const handleSubmit = async () => {
        setError(null);
        try {
            const res = await authed_fetch(`/api/game-instances/?join_code=${joinCode}`);
            if (!res.ok) throw new Error('Game instance not found');
            const data = await res.json();
            if (data.length === 0) throw new Error('No matching join code');

            sessionStorage.setItem('gameInstanceId', data[0].id);
            sessionStorage.setItem('gameJoinCode', data[0].join_code);
            onSuccess(data[0].id, data[0].join_code);
            onClose();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleLeaveGame = () => {
        sessionStorage.removeItem('gameInstanceId');
        sessionStorage.removeItem('gameJoinCode');
        setExistingCode(null);
        setJoinCode('');
        onClose();
        onLeave();
    };

    return (
        <div className="fixed inset-0 bg-gray-700/50 flex items-center justify-center z-50">
            <div className="bg-neutral-800 p-6 rounded shadow-lg w-full max-w-md space-y-4 text-white">
                <h2 className="text-xl font-semibold">Enter Join Code</h2>

                {existingCode ? (
                    <div className="space-y-3">
                        <p>✅ Currently joined game: <span className="font-mono">{existingCode}</span></p>
                        <button
                            onClick={handleLeaveGame}
                            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition text-sm"
                        >
                            Leave Game
                        </button>
                    </div>
                ) : (
                    <>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Enter join code..."
                            className="w-full px-4 py-2 bg-white rounded text-black"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition w-full"
                        >
                            Join
                        </button>
                    </>
                )}
                {existingCode === null && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-600 rounded hover:bg-blue-700 transition w-full"
                    >
                        Cancel
                    </button>
                )}

            </div>
        </div>
    );
}


