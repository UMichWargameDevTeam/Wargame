'use client'

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuthedFetch } from '@/hooks/useAuthedFetch';

type AuthGuardProps = {
    children: React.ReactNode
    redirectTo?: string
    publicPaths?: string[]
}

export default function AuthGuard({children, redirectTo = '/login', publicPaths= ['/register', '/login']}: AuthGuardProps) {
    const router = useRouter();
    const authedFetch = useAuthedFetch();
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (publicPaths.includes(window.location.pathname)) {
                setLoading(false);
                return;
            }

            try {
                const res = await authedFetch("/api/auth/me/");

                if (!res.ok) {
                    router.replace(redirectTo);
                }
            } catch (err: unknown) {
                console.error(err);
                router.replace(redirectTo);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, redirectTo, publicPaths, authedFetch]);

    if (loading) {
        return (
            <p>Validating access...</p>
        )
    };
    return <>{children}</>;
}