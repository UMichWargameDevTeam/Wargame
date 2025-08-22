"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {BACKEND_URL } from '@/lib/utils';

export default function LoginForm() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            router.push('/roleselect')// role selection page
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(
                `${BACKEND_URL}/api/auth/token/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.detail || data.message || "Login failed");
            }

            localStorage.setItem("accessToken", data.access);
            localStorage.setItem("refreshToken", data.refresh);
            sessionStorage.setItem("username", username);

            router.push('/roleselect') // after login
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white p-4">
            <div className="w-full max-w-lg bg-neutral-800 shadow-lg rounded-2xl p-8">
                {/* Header */}
                <h1 className="text-3xl font-bold mb-2 text-center text-white whitespace-nowrap">
                    Welcome to the Digital Wargame
                </h1>
                <h2 className="text-xl mb-6 text-center text-gray-300">Login</h2>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-300">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-300">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg shadow-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-400 cursor-pointer hover:underline"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition duration-200"
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>

                    <Link href="/register" className="w-full">
                        <div className="w-full bg-orange-800 text-white py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex justify-center">
                            Register
                        </div>
                    </Link>
                </form>
            </div>
        </div>
    );
}
