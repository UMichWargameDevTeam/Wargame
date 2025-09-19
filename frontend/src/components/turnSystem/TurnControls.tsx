'use client';

import { useState, useEffect, useCallback, RefObject } from "react";
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import ReconnectingWebSocket from "reconnecting-websocket";
import { GameInstance, RoleInstance } from "@/lib/Types";


interface TurnControlsProps {
    joinCode: string;
    socketRef: RefObject<ReconnectingWebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    gameInstance: GameInstance | null;
    timer: number;
    turnDuration: number;
    roleInstances: RoleInstance[];
};

export default function TurnControls({ joinCode, socketRef, socketReady, roleInstance, gameInstance, timer, turnDuration, roleInstances }: TurnControlsProps) {
    const authedFetch = useAuthedFetch();

    const [settingTurn, setSettingTurn] = useState<boolean>(false);

    const sendTurnUpdate = useCallback(async (newTurn: number) => {
        if (!joinCode || !socketReady || !socketRef.current) return;
        const socket = socketRef.current;

        try {
            setSettingTurn(true);

            const res = await authedFetch(`/api/game-instances/${joinCode}/set-turn/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    turn: newTurn,
                    turn_finish_time: Math.floor(Date.now() / 1000) + turnDuration
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to set turn.');
            }

            if (socket.readyState === WebSocket.OPEN) {
                const updatedGameInstance: GameInstance = data;

                socket.send(
                    JSON.stringify({
                        channel: "turn",
                        action: "set",
                        data: updatedGameInstance
                    })
                );
            }

        } catch (err: unknown) {
            console.error(err);

            if (err instanceof Error) {
                alert(err.message);
            }

        } finally {
            setSettingTurn(false);
        }

    }, [authedFetch, joinCode, socketReady, socketRef, turnDuration]);

    // Auto-advance turn if all non-gamemasters ready up
    // Need to consider whether this could potentially cause an infinite rendering loop.
    useEffect(() => {
        if (!roleInstance || !gameInstance || settingTurn) return;

        const nonGamemasters = roleInstances.filter(r => r.role.name !== "Gamemaster");
        if (nonGamemasters.length === 0) return;

        const allReady = nonGamemasters.every(r => r.ready);

        const gamemasterWithLowestId = roleInstances
            .filter(r => r.role.name === "Gamemaster")
            .reduce(
                (lowest, current) =>
                    !lowest || current.id < lowest.id ? current : lowest,
                null as RoleInstance | null
            );

        if (allReady && roleInstance.id === gamemasterWithLowestId?.id) {
            sendTurnUpdate(gameInstance.turn + 1);
        }
    }, [roleInstance, gameInstance, settingTurn, roleInstances, sendTurnUpdate]);

    // Auto-advance turn if timer hits 0
    useEffect(() => {
        if (!roleInstance || !gameInstance || !gameInstance.turn_finish_time) return;

        // gives some leeway. Current time can be 2 seconds before real finish time or later.
        const timerFinished = timer == 0 &&  (gameInstance.turn_finish_time - Math.floor(Date.now() / 1000) < 2);

        const gamemasterWithLowestId = roleInstances
            .filter(r => r.role.name === "Gamemaster")
            .reduce(
                (lowest, current) =>
                    !lowest || current.id < lowest.id ? current : lowest,
                null as RoleInstance | null
            );

        if (timerFinished && roleInstance.id === gamemasterWithLowestId?.id) {
            sendTurnUpdate(gameInstance.turn + 1);
        }

    }, [roleInstance, gameInstance, timer, roleInstances, sendTurnUpdate]);

    // Allow Gamemasters to manually edit/set turn
    const handleSetTurn = () => {
        const newTurnStr = prompt("Enter new turn number:", String(gameInstance?.turn));
        if (!newTurnStr) return;

        const newTurn = parseInt(newTurnStr, 10);
        if (isNaN(newTurn) || newTurn <= 0) return;

        sendTurnUpdate(newTurn);
    };

    return (
        <div className="flex items-center gap-2 bg-neutral-700 p-3 rounded-lg">
            <button
                onClick={() => sendTurnUpdate((gameInstance?.turn ?? 0) + 1)}
                disabled={settingTurn}
                className={`px-3 py-1 rounded whitespace-nowrap
                    ${settingTurn
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-green-600 cursor-pointer hover:bg-green-500 "
                    }
                `}
            >
                Next Turn
            </button>
            <button
                onClick={() => handleSetTurn()}
                disabled={settingTurn}
                className={`px-3 py-1 rounded whitespace-nowrap
                    ${settingTurn
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-blue-600 cursor-pointer hover:bg-blue-500 "
                    }
                `}
            >
                Set Turn
            </button>
        </div>
    );
}