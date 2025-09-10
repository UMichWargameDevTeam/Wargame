'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {BACKEND_URL } from '@/lib/utils';

/**
 * Client-side registration form component.
 *
 * Renders a username/password form that posts { username, password } to `${BACKEND_URL}/api/auth/register/`.
 * On successful registration navigates to the root path ("/"). Tracks local UI state for `username`, `password`,
 * `showPassword` (toggles password visibility), `loading` (disables the submit button while the request is in-flight),
 * and `error` (used to display server-provided error messages when set).
 *
 * Note: network errors and non-OK responses are logged to the console; the catch block does not currently update the
 * visible `error` state for display.
 */
export default function RegisterForm() {
    const router = useRouter();
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.detail || data.message || "Registration failed. Username may already be taken.");
            }

            router.push("/"); // back to login after register
        } catch (err) {
            console.error(err);
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
                <h2 className="text-xl mb-6 text-center text-gray-300">Register</h2>

                <form onSubmit={handleRegister} className="space-y-5">
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
                        {loading ? "Registering..." : "Register"}
                    </button>

                    <Link href="/" className="w-full">
                        <div className="w-full bg-orange-800 text-white py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex justify-center">
                            Back to Login
                        </div>
                    </Link>
                </form>
            </div>
        </div>
    );
}
