'use client';

import { useCallback } from "react";
import { BACKEND_URL } from "@/lib/utils";
import { useRouter } from "next/navigation";

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