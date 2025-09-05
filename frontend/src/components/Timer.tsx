import { useState, useEffect, RefObject } from "react";

interface TimerProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
}

export default function Timer({ socketRef, socketReady }: TimerProps) {
    const defaultTime = 600;

    const [finishTime, setFinishTime] = useState<number | null>(null);
    const [timer, setTimer] = useState<number>(defaultTime);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleTimerMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "timer") {
                switch (msg.action) {
                    case "get_finish_time":
                        if (msg.data?.finish_time) {
                            setFinishTime(msg.data.finish_time);
                        } else {
                            setFinishTime(null);
                        }
                        break;
                }
            }
        };

        cachedSocket.addEventListener("message", handleTimerMessage);
        return () => {
            cachedSocket.removeEventListener("message", handleTimerMessage);
        };
    }, [socketRef, socketReady]);

    // Update countdown every second
    useEffect(() => {
        const interval = setInterval(() => {
            if (finishTime) {
                const now = Math.floor(Date.now() / 1000);
                const remaining = Math.max(finishTime - now, 0);
                setTimer(remaining);
            } else {
                setTimer(defaultTime);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [finishTime]);

    return (
        <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md mb-4 text-lg font-semibold">
            {Math.floor(timer / 60).toString().padStart(2, "0")}:
            {(timer % 60).toString().padStart(2, "0")}
        </div>
    );
}
