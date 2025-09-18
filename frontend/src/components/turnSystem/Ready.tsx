'use client';

import { useState, RefObject } from "react";
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from "@/lib/Types";


interface ReadyProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    roleInstances: RoleInstance[];
};

export default function Ready({ socketRef, socketReady, roleInstance, roleInstances } : ReadyProps) {
    const authedFetch = useAuthedFetch();

    const [togglingReady, setTogglingReady] = useState<boolean>(false);

    const handleToggleReady = async () => {
        if (!socketReady || !socketRef.current || !roleInstance) return;
        const socket = socketRef.current;

        try {
            setTogglingReady(true);

            const res = await authedFetch(`/api/role-instances/${roleInstance.id}/ready/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ready: !roleInstances.find(r => r.id === roleInstance?.id)?.ready
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to toggle ready state.');
            }

            if (socket.readyState === WebSocket.OPEN) {
                const updatedRoleInstance: RoleInstance = data;

                socket.send(
                    JSON.stringify({
                        channel: "users",
                        action: "ready",
                        data: updatedRoleInstance
                    })
                );

            }

        } catch (err: unknown) {
            console.error(err);

            if (err instanceof Error) {
                alert(err.message);
            }

        } finally {
            setTogglingReady(false);
        }

    };

    return (
        <>
            <button
                onClick={() => handleToggleReady()}
                disabled={togglingReady}
                className={`px-6 py-3 rounded whitespace-nowrap
                    ${togglingReady
                        ? "bg-gray-600 cursor-not-allowed"
                        : (roleInstances.find(r => r.id === roleInstance?.id)?.ready
                            ? "bg-green-600 cursor-pointer hover:bg-green-500"
                            : "bg-gray-600 cursor-pointer hover:bg-gray-500"
                        )
                    }
                `}
            >
                {togglingReady
                    ? "Toggling Ready..."
                    : (roleInstances.find(r => r.id === roleInstance?.id)?.ready
                        ? "Ready ✅"
                        : "Not Ready"
                    )
                }
            </button>
        </>
    );
}