import { useAuthedFetch } from '@/hooks/useAuthedFetch';

export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

// This should only be used when fetching all records of a Static table
export async function getSessionStorageOrFetch(key: string, fetcher: () => Promise<any>) {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);

    const data = await fetcher();
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
}
