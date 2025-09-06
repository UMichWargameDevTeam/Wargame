'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { RoleInstance } from '@/lib/Types';

interface ResourcePointsProps {
    joinCode: string;
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    roleInstance: RoleInstance | null;
    roleInstances: RoleInstance[];
}


export default function ResourcePoints({ joinCode, socketRef, socketReady, roleInstance, roleInstances }: ResourcePointsProps) {
    const authedFetch = useAuthedFetch();

    const [sendingPoints, setSendingPoints] = useState<boolean>(false);

    const addedPointsMessageListener = useRef<boolean>(false);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedPointsMessageListener.current) return;
        addedPointsMessageListener.current = true;
        const socket = socketRef.current;

        const handlePointsMessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);
            if (msg.channel === "points") {
                switch (msg.action) {
                    case "send":
                        // TODO
                        break;
                }
            }
        };

        socket.addEventListener("message", handlePointsMessage);

        return () => {
            socket.removeEventListener("message", handlePointsMessage);
            addedPointsMessageListener.current = false;
        };
    }, [socketRef, socketReady]);

    function getViewerValidPointDestinations(): [string, string][] {
        // TODO
        return [["", ""]];
    }

    const handleSendPoints = async (joinCode: string) => {
        if (!socketReady || !socketRef.current) return;
        const socket = socketRef.current;

        try {
            setSendingPoints(true);
            // TODO

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setSendingPoints(false);
        }
    };
    

    return (
        <>
            {/* TODO */}
        </>
    );
};