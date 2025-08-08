'use client';

import { authed_fetch } from '@/lib/utils';
import { useState } from 'react';

interface JoinGameDialogProps {
    onClose: () => void;
    onSuccess: (gameInstanceId: number) => void;
}

export default function JoinGameDialog({ onClose, onSuccess }: JoinGameDialogProps) {
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        try {
            const res = await authed_fetch(`/api/game-instances/?join_code=${joinCode}`);
            if (!res.ok) throw new Error('Game instance not found');
            const data = await res.json();
            if (data.length === 0) throw new Error('No matching join code');

            sessionStorage.setItem('gameInstanceId', data[0].id);
            onSuccess(data[0].id);
            onClose();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500/90 flex items-center justify-center z-50">
            <div className="bg-neutral-800 p-6 rounded shadow-lg w-96">
                <h2 className="text-xl font-semibold mb-4">Enter Join Code</h2>
                <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full p-2 rounded text-black bg-white"
                    placeholder="e.g. ALPHA123"
                />
                {error && <p className="text-red-400 mt-2">{error}</p>}
                <div className="mt-4 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
}
