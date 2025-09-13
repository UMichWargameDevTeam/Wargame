'use client';

import { useCallback } from "react";
import { BACKEND_URL } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function useAuthedFetch() {
    const router = useRouter();
    
    const authedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
        try {
            let res = await fetch(`${BACKEND_URL}${url}`, {
                ...options,
                credentials: "include",
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