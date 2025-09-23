// Next.js can only access environment variables whose names are prefixed by NEXT_PUBLIC_
// and when the .env file is in the same directory as next.config.ts
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";


export async function getCsrfToken(): Promise<string> {
    const res = await fetch(`${BACKEND_URL}/api/auth/csrf-token/`, {
        credentials: "include",
    });
    const data = await res.json();
    return data.csrfToken;
}


// This should only be used when fetching all records of a Static table
export async function getSessionStorageOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetcher();
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
}


export function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}


export function isValidName(name: string) {
    const regex = /^[A-Za-z0-9\-.]+$/;
    return name.length <= 50 && regex.test(name);
}