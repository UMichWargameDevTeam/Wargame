'use client';

import { useState, useCallback, RefObject } from "react";
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { GameInstance } from "@/lib/Types";

interface TimerControlsProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    turnDuration: number;
};

export default function TimerControls({ joinCode, socketRef, socketReady, turnDuration }: TimerControlsProps) {
    const authedFetch = useAuthedFetch();
 
    const [minutes, setMinutes] = useState(Math.floor(turnDuration / 60));
    const [seconds, setSeconds] = useState(0);
    const [settingTimer, setSettingTimer] = useState<boolean>(false);

    const sendTimerUpdate = useCallback(async (turnFinishTime: number | null) => {
        if (!joinCode || !socketReady || !socketRef.current) return;
        const socket = socketRef.current;

        try {
            setSettingTimer(true);

            const res = await authedFetch(`/api/game-instances/${joinCode}/set-timer/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    turn_finish_time: turnFinishTime
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.detail || 'Failed to set turn.');
            }

            if (socket.readyState === WebSocket.OPEN) {
                const updatedGameInstance: GameInstance = data;

                socketRef.current.send(JSON.stringify({
                    channel: "turn",
                    action: "set_turn_finish_time",
                    data: updatedGameInstance
                }));
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setSettingTimer(false);
        }
    }, [authedFetch, joinCode, socketReady, socketRef]);

    const handleStart = () => {
        const totalSeconds = minutes * 60 + seconds;
        const turnFinishTime = Math.floor(Date.now() / 1000) + totalSeconds;
        sendTimerUpdate(turnFinishTime);
    };

    const handleReset = () => {
        sendTimerUpdate(null); // tells all clients to reset to default
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleStart();
            }}
            className="flex items-center gap-2 bg-neutral-700 p-3 rounded-lg"
        >
            <input
                type="number"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-16 p-1 rounded bg-neutral-600 text-white text-center"
            />
            <span className="text-white font-semibold">:</span>
            <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-16 p-1 rounded bg-neutral-600 text-white text-center"
            />

            <button
                type="submit"
                disabled={settingTimer}
                className={`px-3 py-1 rounded text-white font-semibold
                    ${settingTimer
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-green-600 cursor-pointer hover:bg-green-500"
                    }
                `}
            >
                Start
            </button>
            <button
                type="button"
                onClick={() => handleReset()}
                disabled={settingTimer}
                className={`px-3 py-1 rounded text-white font-semibold
                    ${settingTimer
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-red-600 cursor-pointer hover:bg-red-500"
                    }
                `}
            >
                Reset
            </button>
        </form>
    );
}
