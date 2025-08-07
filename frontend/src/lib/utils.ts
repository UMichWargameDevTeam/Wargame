export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export const authed_fetch = async (
    input: string | URL | globalThis.Request,
    init?: RequestInit
) => {
    const accessToken = localStorage.getItem("accessToken");
    const headers = new Headers(init?.headers);

    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000" + input, {
        ...init,
        headers,
    });

    if (res.status === 401 && accessToken) {
        const refreshToken = localStorage.getItem("refreshToken");

        const refreshRes = await fetch(`${BACKEND_URL}/api/auth/token/refresh/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("accessToken", data.access);


            headers.set("Authorization", `Bearer ${data.access}`);
            const res2 = await fetch(BACKEND_URL + input, {
                ...init,
                headers,
            });
            return res2
        }
    }
    return res;
}