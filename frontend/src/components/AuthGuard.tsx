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
    const [loading, setLoading] = useState<boolean>(true);

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
                } else {
                    setLoading(false);
                }
            } catch (err: unknown) {
                console.error(err);
                router.replace(redirectTo);
            }
        };

        checkAuth();
    }, [router, redirectTo, publicPaths, authedFetch]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
                <h1 className="text-xl font-bold">Validating access...</h1>
            </div>
        )
    };
    return <>{children}</>;
}