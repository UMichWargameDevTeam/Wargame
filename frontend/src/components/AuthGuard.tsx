'use client'

import { useRouter } from "next/navigation"
import { useEffect } from "react"

type AuthGuardProps = {
    children: React.ReactNode
    redirectTo?: string
    publicPaths?: string[]
}

export default function AuthGuard({children, redirectTo = '/login', publicPaths= ['/register', '/login']}: AuthGuardProps) {
    const router = useRouter()

    useEffect(() => {
        if (publicPaths.includes(window.location.pathname)) return
        
        const access_token = localStorage.getItem("accessToken")
        if (!access_token)
            router.replace(redirectTo)
    }, [router, redirectTo, publicPaths])
    return <>{children}</>
}