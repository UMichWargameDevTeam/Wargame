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

    const handleDeleteGame = async () => {
        if (!socketReady || !socketRef.current) return;
        if (!confirm("Are you sure you want to delete this Game Instance?")) return;

        try {
            setDeletingGame(true);
            const res = await authedFetch(`/api/game-instances/delete/${roleInstance.team_instance.game_instance.join_code}/`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || "Failed to delete game.");
            }

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    channel: "games",
                    action: "delete",
                    data: { join_code: joinCode }
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
            <h3 className="text-lg font-semibold mb-2">Gamemaster Menu</h3>
            {/* Delete Game */}
            <div>
                <button
                    onClick={handleDeleteGame}
                    disabled={deletingGame}
                    className={`px-3 py-2 rounded transition
                        ${deletingGame
                            ? "bg-gray-500 cursor-not-allowed"
                            : "bg-red-700 hover:bg-red-600 cursor-pointer"
                        }
                    `}
                >
                    {deletingGame ? "Deleting Game..." : "Delete Game"}
                </button>
            </div>
        </div>
    );
};