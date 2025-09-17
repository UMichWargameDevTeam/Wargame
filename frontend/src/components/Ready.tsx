'use client';

import React, { useState, useEffect } from "react";
import { RoleInstance } from "@/lib/Types";

interface ReadyProps {
    socket: WebSocket | null;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
}

export default function Ready({ socket, socketReady, roleInstance }: ReadyProps) {
    const [ready, setReady] = useState(roleInstance?.ready ?? false);

    useEffect(() => {
        if (roleInstance) setReady(roleInstance.ready);
    }, [roleInstance]);

    const toggleReady = () => {
        if (!socketReady || !socket || !roleInstance) return;

        // TODO: send an HTTP request, and only send data over socket
        // upon successful response

        const newReady = !ready;
        setReady(newReady);

        socket.send(
            JSON.stringify({
                channel: "users",
                action: "update_ready",
                data: {
                    id: roleInstance.id,
                    ready: newReady,
                },
            })
        );
    };

    return (
        <button
            onClick={toggleReady}
            className={`w-full bg-blue-600 text-white px-3 py-4 rounded-lg shadow-md mb-4 text-lg text-sm font-medium transition ${ready ? "bg-green-600 hover:bg-green-500" : "bg-gray-600 hover:bg-gray-500"
                }`}
        >
            {ready ? "Ready ✅" : "Not Ready"}
        </button>
    );
}
