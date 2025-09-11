import { useState, RefObject } from "react";

interface TimerControlsProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
}

export default function TimerControls({ socketRef, socketReady }: TimerControlsProps) {
    const [minutes, setMinutes] = useState(10); // default 10 minutes
    const [seconds, setSeconds] = useState(0);

    const sendTimerUpdate = (finishTime: number | null) => {
        if (socketRef.current && socketReady && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                channel: "timer",
                action: "set_finish_time",
                data: { finish_time: finishTime }
            }));
        }
    };

    const handleStart = () => {
        const totalSeconds = minutes * 60 + seconds;
        const finishTime = Math.floor(Date.now() / 1000) + totalSeconds;
        sendTimerUpdate(finishTime);
    };

    const handleReset = () => {
        sendTimerUpdate(null); // tells all clients to reset to default
    };

    return (
        <div className="flex items-center space-x-2 bg-neutral-800 p-3 rounded-lg shadow-md">
            <input
                type="number"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-16 p-1 rounded bg-neutral-700 text-white text-center"
            />
            <span className="text-white font-semibold">:</span>
            <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-16 p-1 rounded bg-neutral-700 text-white text-center"
            />

            <button
                onClick={handleStart}
                className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-semibold"
            >
                Start
            </button>
            <button
                onClick={handleReset}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
                Reset
            </button>
        </div>
    );
}
