'use client';

import { useState, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types';

interface GameMasterMenuProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance;
}

export default function GamemasterMenu({ joinCode, socketRef, socketReady, roleInstance }: GameMasterMenuProps) {

    const authedFetch = useAuthedFetch();

    const [deletingGame, setDeletingGame] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(true);

    const handleDeleteGame = async () => {
        if (!socketReady || !socketRef.current) return;
        if (!confirm("Are you sure you want to delete this game?\nThis is irreversible.")) return;
        const socket = socketRef.current;

        try {
            setDeletingGame(true);
            const res = await authedFetch(`/api/game-instances/delete/${roleInstance.team_instance.game_instance.join_code}/`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || "Failed to delete this game.");
            }

            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    channel: "games",
                    action: "delete",
                    data: {
                        join_code: joinCode
                    }
                }));
            }
            
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
            setDeletingGame(false);
        }
    };

    return (
        <div className="bg-neutral-700 rounded-lg p-4 mt-4 text-white">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Gamemaster Menu</h3>
                <button
                    onClick={() => setOpen(!open)}
                    className="text-sm bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-neutral-500"
                >
                    {open ? '-' : '+'}
                </button>
            </div>

            {open && (
                // Delete Game
                <div>
                    <button
                        onClick={handleDeleteGame}
                        disabled={deletingGame}
                        className={`px-3 py-2 rounded transition
                            ${deletingGame
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-red-600 cursor-pointer hover:bg-red-500"
                            }
                        `}
                    >
                        {deletingGame ? "Deleting Game..." : "Delete Game"}
                    </button>
                </div>
            )}
        </div>
    );
};