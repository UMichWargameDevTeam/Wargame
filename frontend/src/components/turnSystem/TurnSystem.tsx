'use client';

import React, { useState, useEffect, useRef, RefObject } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import TurnControls from '@/components/turnSystem/TurnControls';
import Timer from '@/components/turnSystem/Timer';
import TimerControls from '@/components/turnSystem/TimerControls';
import Ready from '@/components/turnSystem/Ready';
import { GameInstance, RoleInstance } from "@/lib/Types";


interface TurnSystemProps {
    joinCode: string;
    socketRef: RefObject<ReconnectingWebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    gameInstance: GameInstance | null;
    setGameInstance: React.Dispatch<React.SetStateAction<GameInstance | null>>;
    roleInstances: RoleInstance[];
    setRoleInstances: React.Dispatch<React.SetStateAction<RoleInstance[]>>;
};

export default function TurnSystem({ joinCode, socketRef, socketReady, roleInstance, gameInstance, setGameInstance, roleInstances, setRoleInstances }: TurnSystemProps) {
    const turnDuration = 600;

    const [timer, setTimer] = useState<number>(turnDuration);

    const addedTurnMessageListener = useRef<boolean>(false);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedTurnMessageListener.current) return;
        addedTurnMessageListener.current = true;
        const socket = socketRef.current;

        const handleTurnMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);

            if (msg.channel === "turn") {
                switch (msg.action) {

                    case "set":
                        setGameInstance(msg.data);
                        setRoleInstances(prev => prev.map(r => ({ ...r, ready: false })));
                        break;

                    case "set_turn_finish_time":
                        setGameInstance(msg.data);
                        break;
                }
            }
        };

        socket.addEventListener("message", handleTurnMessage);
        return () => {
            socket.removeEventListener("message", handleTurnMessage);
            addedTurnMessageListener.current = false;
        };
    }, [socketRef, socketReady, setGameInstance, setRoleInstances]);

    return (
        <div className="flex items-center gap-4 rounded-lg px-6 py-3 bg-neutral-800 text-white text-lg font-semibold whitespace-nowrap">
            <div className="flex items-center gap-2">
                <p>Turn {gameInstance?.turn || 0}</p>
                {roleInstance?.role.name === "Gamemaster" && (
                    <TurnControls
                        joinCode={joinCode}
                        socketRef={socketRef}
                        socketReady={socketReady}
                        roleInstance={roleInstance}
                        gameInstance={gameInstance}
                        timer={timer}
                        turnDuration={turnDuration}
                        roleInstances={roleInstances}
                    />
                )}
            </div>
            <div className="flex items-center gap-2">
                <Timer
                    gameInstance={gameInstance}
                    timer={timer}
                    turnDuration={turnDuration}
                    setTimer={setTimer}
                />
                {roleInstance?.role.name === "Gamemaster" ? (
                    <TimerControls
                        joinCode={joinCode}
                        socketRef={socketRef}
                        socketReady={socketReady}
                        turnDuration={turnDuration}
                    />
                ) : (
                    <Ready
                        socketRef={socketRef}
                        socketReady={socketReady}
                        roleInstance={roleInstance}
                        roleInstances={roleInstances}
                    />
                )}
            </div>
        </div>
    );
}
