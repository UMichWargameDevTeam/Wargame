'use client'

import { useRouter } from "next/navigation"
import { useEffect } from "react"

type AuthGuardProps = {
    children: React.ReactNode
    redirectTo?: string
    publicPaths?: string[]
}

/**
 * Client-side route guard that redirects unauthenticated users to a login (or custom) page.
 *
 * If the current pathname is listed in `publicPaths`, no redirect occurs. Otherwise the guard
 * checks localStorage for the "accessToken" key and calls `router.replace(redirectTo)` when
 * no token is found.
 *
 * @param redirectTo - Path to redirect unauthenticated users to (default: `'/login'`).
 * @param publicPaths - Array of pathnames that should be accessible without authentication (default: `['/register', '/login']`).
 * @returns The component's children (renders nothing else).
 */
export default function AuthGuard({children, redirectTo = '/login', publicPaths= ['/register', '/login']}: AuthGuardProps) {
    const router = useRouter();

    useEffect(() => {
        if (publicPaths.includes(window.location.pathname)) {
            return;
        }
        
        const access_token = localStorage.getItem("accessToken");
        if (!access_token) {
            router.replace(redirectTo);
        }
    }, [router, redirectTo, publicPaths]);
    return <>{children}</>
}