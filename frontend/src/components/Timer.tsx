import { useState, useEffect, RefObject } from 'react';

interface TimerProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
}

export default function Timer({ socketRef, socketReady }: TimerProps) {
    const [timer, setTimer] = useState<number>(600);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current) return;
        const cachedSocket = socketRef.current;

        const handleTimerMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "timer") {
                switch (msg.action) {
                    case "update":
                        setTimer(msg.data.remaining);
                        break;
                }
            }
        }

        cachedSocket.addEventListener("message", handleTimerMessage);

        return () => {
            cachedSocket.removeEventListener("message", handleTimerMessage);
        };
    }, [socketRef, socketReady, setTimer]);

    return (
        <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md mb-4 text-lg font-semibold">
            {Math.floor(timer / 60).toString().padStart(2, '0')}:
            {(timer % 60).toString().padStart(2, '0')}
        </div>
    )
}