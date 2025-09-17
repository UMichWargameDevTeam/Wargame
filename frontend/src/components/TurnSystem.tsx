'use client';

import React, { useEffect, useState } from "react";
import { RoleInstance } from "@/lib/Types";

interface TurnSystemProps {
    socket: WebSocket | null;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    roleInstances: RoleInstance[];
    timer: number; // countdown in seconds
}

export default function TurnSystem({ socket, socketReady, roleInstance, roleInstances, timer }: TurnSystemProps) {
    const [turn, setTurn] = useState<number>(1);

    // Listen for WebSocket updates
    useEffect(() => {
        if (!socketReady || !socket) return;

        const handleTurnMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "turns") {
                switch (msg.action) {
                    case "set":
                        setTurn(msg.data.turn);
                        break;
                    case "next":
                        setTurn(msg.data.turn);
                        break;
                }
            }
        };

        socket.addEventListener("message", handleTurnMessage);
        return () => socket.removeEventListener("message", handleTurnMessage);
    }, [socketReady, socket]);

    // Auto-advance if timer hits 0
    useEffect(() => {
        if (timer === 0) {
            goToNextTurn();
        }
    }, [timer]);

    // Auto-advance if all non-Gamemasters are ready
    useEffect(() => {
        if (roleInstances.length === 0) return;

        const nonGMs = roleInstances.filter(r => r.role.name !== "Gamemaster");
        const allReady = nonGMs.length > 0 && nonGMs.every(r => r.ready);

        if (allReady) {
            goToNextTurn();
        }
    }, [roleInstances]);

    // Increment turn
    const goToNextTurn = () => {
        if (!socketReady || !socket) return;
        // TODO: should probably make it so only a gamemaster actually increments this

        const newTurn = turn + 1;
        // TODO: send an HTTP request, and only send data over socket
        // upon successful response

        socket.send(JSON.stringify({
            channel: "turns",
            action: "next",
            data: { turn: newTurn }
        }));

        // Reset ready states for non-Gamemasters
        socket.send(JSON.stringify({
            channel: "users",
            action: "reset_ready",
            data: {}
        }));
    };

    // Allow GM to manually edit/set turn
    const handleSetTurn = () => {
        if (!socketReady || !socket) return;
        const newTurn = prompt("Enter new turn number:", String(turn));
        if (!newTurn) return;
        const parsed = parseInt(newTurn, 10);
        if (isNaN(parsed) || parsed <= 0) return;

        socket.send(JSON.stringify({
            channel: "turns",
            action: "set",
            data: { turn: parsed }
        }));
    };

    return (
        <div className="flex items-center space-x-2 bg-neutral-800 p-3 rounded-lgw-full bg-neutral-700 text-white px-6 py-3 rounded-lg shadow-md mb-4 flex items-center justify-between text-lg font-semibold">
            {/* Left side: Turn label */}
            <p className="font-bold whitespace-nowrap">Turn {turn}</p>

            {/* Right side: Buttons (Gamemaster only) */} 
            {roleInstance?.role.name === "Gamemaster" && (
                <div className="flex gap-2">
                    <button
                        onClick={goToNextTurn}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded"
                    >
                        Next Turn
                    </button>
                    <button
                        onClick={handleSetTurn}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                    >
                        Set Turn
                    </button>
                </div>
            )}
        </div>
    );


}
