'use client';

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getCsrfToken } from "@/lib/utils";

export function useAuthedFetch() {
    const router = useRouter();
    const csrfTokenRef = useRef<string | null>(null); // cache CSRF token
    
    const authedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
        try {
            const method = options?.method?.toUpperCase() || "GET";
            const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };
            if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                if (!csrfTokenRef.current) {
                    csrfTokenRef.current = await getCsrfToken();
                }
                headers["X-CSRFToken"] = csrfTokenRef.current;
            }

            let res = await fetch(`${BACKEND_URL}${url}`, {
                ...options,
                credentials: "include",
                headers,
            });

            if (res.status === 401) {
                const refreshRes = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
                    method: "POST",
                    credentials: "include",
                });

                if (refreshRes.ok) {
                    // retry original
                    res = await fetch(`${BACKEND_URL}${url}`, {
                        ...options,
                        credentials: "include",
                        headers,
                    });
                } else {
                    router.push("/login");
                    return res;
                }
            }

            return res;
        } catch (err: unknown) {
            console.error(err);
            throw err;
        }
    }, [router]);
    
    return authedFetch;
}