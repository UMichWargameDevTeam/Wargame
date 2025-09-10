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

/**
 * Gamemaster menu UI that provides a "Delete Game" action for the current game instance.
 *
 * Prompts the user for confirmation, issues an authenticated DELETE request to remove the game instance
 * identified by the roleInstance's game join code, and — on successful deletion — notifies other clients
 * over the provided WebSocket by sending a `{ channel: "games", action: "delete", data: { join_code } }` message.
 * While the delete request is in progress the component disables the button and shows a loading label.
 *
 * Side effects:
 * - Displays a blocking confirmation dialog before deleting.
 * - Sends an authenticated HTTP DELETE request to the server.
 * - Sends a WebSocket notification when deletion succeeds.
 * - Alerts on errors and logs errors to the console.
 *
 * @param joinCode - The join code for the game shown in the UI; included in the WebSocket notification payload.
 * @param socketRef - Ref to the WebSocket used to broadcast the deletion event to other clients.
 * @param socketReady - Whether the WebSocket connection is considered ready; if false, delete is disabled.
 * @param roleInstance - RoleInstance used to derive the server API path for the game instance to delete.
 */
export default function GamemasterMenu({ joinCode, socketRef, socketReady, roleInstance }: GameMasterMenuProps) {

    const authedFetch = useAuthedFetch();

    const [deletingGame, setDeletingGame] = useState<boolean>(false);

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
            <h3 className="text-lg font-semibold mb-2">Gamemaster Menu</h3>
            {/* Delete Game */}
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
        </div>
    );
};