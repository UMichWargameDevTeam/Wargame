export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

/**
 * Retrieve a value from sessionStorage by key or, if absent, call a fetcher, cache its result, and return it.
 *
 * Uses sessionStorage (per browser session) to store a JSON-serialized copy of the fetched value under `key`.
 *
 * @param key - The sessionStorage key to read/write.
 * @param fetcher - Async function that produces the value when the key is not already cached.
 * @returns A promise resolving to the cached or freshly fetched value of type `T`.
 */
export async function getSessionStorageOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetcher();
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
}

/**
 * Determine whether two arrays have the same length and identical elements in the same order using strict (`===`) comparison.
 *
 * Order and values must match exactly (two empty arrays are considered equal).
 *
 * @param a - First array to compare.
 * @param b - Second array to compare.
 * @returns True if arrays are equal by length and element-wise strict equality; otherwise false.
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}