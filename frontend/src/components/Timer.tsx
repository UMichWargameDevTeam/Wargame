import { useState, useEffect } from 'react';

interface Props {
    socket: WebSocket | null;
}

const Timer = ({ socket }: Props) => {
    const [timer, setTimer] = useState<number>(600);

    // WebSocket setup
    useEffect(() => {
        if (!socket) return;

        const handleTimerMessage = (event: any) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "timer") {
                switch (msg.action) {
                    case "timer_update":
                        setTimer(msg.data.remaining)
                        break;
                }
            }
        }

        socket.addEventListener("message", handleTimerMessage);

        return () => {
            socket.removeEventListener("message", handleTimerMessage);
        };
    }, [socket, setTimer]);

    return (
        <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md mb-4 text-lg font-semibold">
            {Math.floor(timer / 60).toString().padStart(2, '0')}:
            {(timer % 60).toString().padStart(2, '0')}
        </div>
    )
}

export default Timer;