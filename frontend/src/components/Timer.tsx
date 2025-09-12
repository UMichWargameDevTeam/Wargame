'use client';

import { useState, useEffect, useRef, RefObject } from "react";

interface TimerProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    timer: number;
    setTimer: React.Dispatch<React.SetStateAction<number>>;
}

export default function Timer({ socketRef, socketReady, timer, setTimer }: TimerProps) {
    const defaultTime = 600;

    const [finishTime, setFinishTime] = useState<number | null>(null);
    const addedTimerMessageListener = useRef<boolean>(false);

    // WebSocket setup: listen for finish_time updates
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedTimerMessageListener.current) return;
        addedTimerMessageListener.current = true;
        const socket = socketRef.current;

        const handleTimerMessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.channel === "timer") {
                    // accept both get_finish_time and set_finish_time broadcasts
                    if (
                        (msg.action === "get_finish_time" || msg.action === "set_finish_time") &&
                        msg.data !== undefined
                    ) {
                        // treat undefined as null; allow 0-ish values if used by server
                        const ft = msg.data.hasOwnProperty("finish_time") ? msg.data.finish_time : null;
                        setFinishTime(ft ?? null);
                    }
                }
            } catch (err) {
                // ignore parse errors
                // console.error('timer msg parse error', err);
            }
        };

        socket.addEventListener("message", handleTimerMessage);

        // request current finish_time from server
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                channel: "timer",
                action: "get_finish_time",
                data: {}
            }));
        } else {
            // if socket not open yet, ensure we request once it opens
            const onOpen = () => {
                socket.send(JSON.stringify({
                    channel: "timer",
                    action: "get_finish_time",
                    data: {}
                }));
            };
            socket.addEventListener("open", onOpen);

            // cleanup open listener on unmount
            return () => {
                socket.removeEventListener("open", onOpen);
                socket.removeEventListener("message", handleTimerMessage);
                addedTimerMessageListener.current = false;
            };
        }

        return () => {
            socket.removeEventListener("message", handleTimerMessage);
            addedTimerMessageListener.current = false;
        };
    }, [socketRef, socketReady]);

    // Drive the visible countdown and push value to parent via setTimer
    useEffect(() => {
        // immediately set initial timer (so UI updates instantly)
        if (finishTime != null) {
            const now = Math.floor(Date.now() / 1000);
            setTimer(Math.max(finishTime - now, 0));
        } else {
            setTimer(defaultTime);
        }

        const interval = setInterval(() => {
            if (finishTime != null) {
                const now = Math.floor(Date.now() / 1000);
                const remaining = Math.max(finishTime - now, 0);
                setTimer(remaining);
            } else {
                setTimer(defaultTime);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [finishTime, setTimer]);

    // Render using the parent's timer value
    const minutes = Math.floor(timer / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (timer % 60).toString().padStart(2, "0");

    return (
        <div className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md mb-4 text-lg font-semibold">
            {minutes}:{seconds}
        </div>
    );
}
