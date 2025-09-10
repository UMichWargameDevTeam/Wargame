'use client';

import { useCallback } from "react";
import { BACKEND_URL } from "@/lib/utils";
import { useRouter } from "next/navigation";

/**
 * React hook that returns an authenticated fetch helper which automatically
 * attempts to refresh the access token on a 401 and redirects to the login
 * page if refresh is unavailable or fails.
 *
 * The returned function has the signature `(url: string, options?: RequestInit) => Promise<Response]`.
 * Behavior:
 * - Reads `accessToken` from localStorage and includes it as `Authorization: Bearer <token>` for requests.
 * - If the response is 401, attempts to refresh using `refreshToken` from localStorage by POSTing to
 *   `${BACKEND_URL}/api/auth/token/refresh/` with `{ refresh: refreshToken }`.
 *   - On successful refresh, stores the new `accessToken` in localStorage and retries the original request once.
 *   - On refresh failure or if no `refreshToken` exists, clears `accessToken` and `refreshToken` from localStorage
 *     and navigates to `/login` via the router, then returns the original 401 response.
 * - Propagates network or unexpected errors (they are rethrown).
 *
 * @returns A memoized async function that performs authenticated HTTP requests and returns the fetch Response.
 */
export function useAuthedFetch() {
  const router = useRouter();
  
  const authedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      let res = await fetch(`${BACKEND_URL}${url}`, {
        ...options,
        headers: {
          ...(options?.headers || {}),
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      });

      if (res.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const refreshRes = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("accessToken", data.access);

            res = await fetch(`${BACKEND_URL}${url}`, {
              ...options,
              headers: {
                ...(options?.headers || {}),
                Authorization: `Bearer ${data.access}`,
              },
            });
          } else {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            router.push("/login");
            return res;
          }
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          router.push("/login");
          return res;
        }
      }

      return res;
    } catch (err) {
      console.error("Authed fetch error:", err);
      throw err;
    }
  }, [router]);
  
  return authedFetch;
}