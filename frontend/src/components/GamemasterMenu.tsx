'use client';

import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types';

interface GameMasterMenuProps {
    join_code: string;
    roleInstance: RoleInstance;
}

export default function GamemasterMenu({ join_code, roleInstance }: GameMasterMenuProps) {
    const authedFetch = useAuthedFetch();

    const handleDeleteGame = async () => {
        if (!join_code) return;
        if (!confirm("Are you sure you want to delete this Game Instance?")) return;

        try {
            const res = await authedFetch(`/api/game-instances/delete/${roleInstance.team_instance.game_instance.join_code}/`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || "Failed to delete game.");
            }

            alert("Game deleted.");
            sessionStorage.clear();
            window.location.href = '/'; // kick back to homepage
            
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="bg-neutral-700 rounded-lg p-4 mt-4 text-white">
            <h3 className="text-lg font-semibold mb-2">Gamemaster Menu</h3>
            {/* Delete Game */}
            <div>
                <button
                    onClick={handleDeleteGame}
                    className="bg-red-700 px-3 py-2 rounded hover:bg-red-600"
                >
                    Delete Game
                </button>
            </div>
        </div>
    );
};