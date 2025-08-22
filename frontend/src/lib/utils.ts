import { useAuthedFetch } from '@/hooks/useAuthedFetch';

export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export async function getSessionStorageOrFetch(key: string) {
    const authed_fetch = useAuthedFetch();

    let storedVal = sessionStorage.getItem(key);
    if (storedVal) {
        return JSON.parse(storedVal); // return as object/array
    }

    switch (key) {
        case 'branches': {
            try {
                const res = await authed_fetch('/api/branches/');
                const data = await res.json();
                const branches = Array.isArray(data) ? data : data.results || [];
                sessionStorage.setItem('branches', JSON.stringify(branches));
                return branches;
            } catch (err) {
                console.error("Failed to fetch branches", err);
                return [];
            }
        }
        default:
            throw Error(`No case to handle fetching data for key ${key}`);
    }
}