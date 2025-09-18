'use client';

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, getCsrfToken } from "@/lib/utils";


export function useAuthedFetch() {
    const router = useRouter();
    const csrfTokenRef = useRef<string | null>(null); // cache CSRF token

    const authedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
        try {
            const method = options?.method?.toUpperCase() || "GET";
            const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };

            // add the CSRF token to headers if the request is non-safe
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
                // check whether the 401 was due to not having a valid access token
                try {
                    const data = await res.json();

                    // if the user doesn't have an access token, redirect them to the login page
                    if (data.detail === "no_token") {
                        router.push("/login");
                        return res;
                    }

                    // if the user has an access token but it's expired or invalid,
                    // try to refresh the access token using the refresh token, then retry the original request
                    if (data.detail === "expired_token" || data.detail === "invalid_token") {
                        const refreshRes = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
                            method: "POST",
                            credentials: "include",
                        });

                        if (refreshRes.ok) {
                            res = await fetch(`${BACKEND_URL}${url}`, {
                                ...options,
                                credentials: "include",
                                headers,
                            });
                        }
                        // if the refresh token is expired or invalid, redirect them to the login page
                        else {
                            router.push("/login");
                            return res;
                        }
                    }

                } catch (err: unknown) {
                    // if the 401 was not because the user didn't have a valid access token,
                    // simply return the request's response.
                    if (err instanceof SyntaxError) {
                        return res;
                    }
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