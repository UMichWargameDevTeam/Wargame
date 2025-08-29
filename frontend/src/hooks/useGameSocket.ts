import { RoleInstance } from "@/lib/Types";
import { WS_URL } from "@/lib/utils";

import { useEffect, useRef, useState } from "react";

export function useGameSocket(join_code: string, roleInstance: RoleInstance | null) {
    const socketRef = useRef<WebSocket | null>(null);
    const [socketReady, setSocketReady] = useState(false);

    useEffect(() => {
        if (!roleInstance) return;

        const token = localStorage.getItem("accessToken");
        const ws = new WebSocket(`${WS_URL}/game-instances/${join_code}/?token=${token}`);
        socketRef.current = ws;

        ws.onopen = () => {
            setSocketReady(true);
            ws.send(JSON.stringify({
                channel: "users",
                action: "join",
                data: roleInstance
            }));
        };

        ws.onmessage = (event: MessageEvent) => {
            const msg = JSON.parse(event.data);

            if (msg.channel === "games") {
                switch (msg.action) {
                    case "delete":
                        alert("This game was deleted.");
                        sessionStorage.clear();
                        window.location.href = "/roleselect";
                        break;
                }
            }

            if (msg.channel === "role_instances") {
                switch (msg.action) {
                    case "delete":
                        alert("Your role in this game was deleted.");
                        sessionStorage.clear();
                        window.location.href = "/roleselect";
                        break;
                }
            }

            // TODO add more message channel checks
        };

        ws.onclose = () => {
            setSocketReady(false);
            socketRef.current = null;
        };

        return () => {
            ws.close();
            socketRef.current = null;
            setSocketReady(false);
        };
    }, [join_code, roleInstance]);

    return { socketRef, socketReady };
}
