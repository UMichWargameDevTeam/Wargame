'use client';

import React, { useEffect } from "react";
import { GameInstance } from "@/lib/Types";

interface TimerProps {
    gameInstance: GameInstance | null;
    timer: number;
    turnDuration: number;
    setTimer: React.Dispatch<React.SetStateAction<number>>;
}

export default function Timer({ gameInstance, timer, turnDuration, setTimer }: TimerProps) {

    // Drive the visible countdown and push value to parent via setTimer
    useEffect(() => {
        if (!gameInstance) return;

        // immediately set initial timer (so UI updates instantly)
        if (gameInstance?.turn_finish_time != null) {
            const now = Math.floor(Date.now() / 1000);
            setTimer(Math.max(gameInstance.turn_finish_time - now, 0));
        } else {
            setTimer(turnDuration);
        }

        const interval = setInterval(() => {
            if (gameInstance?.turn_finish_time != null) {
                const now = Math.floor(Date.now() / 1000);
                const remaining = Math.max(gameInstance.turn_finish_time - now, 0);
                setTimer(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameInstance, turnDuration, setTimer]);

    const minutes = Math.floor(timer / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (timer % 60).toString().padStart(2, "0");

    return (
        <div className="flex items-center justify-center px-6 py-3 bg-blue-600 rounded">
            {minutes}:{seconds}
        </div>
    );
}
