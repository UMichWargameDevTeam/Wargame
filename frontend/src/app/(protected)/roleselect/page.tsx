'use client';

import { authed_fetch } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoleSelectPage() {
    const router = useRouter();

    const handleRoleSelect = (role: string) => {
        authed_fetch(`/api/register_role/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role }),
        });
        sessionStorage.setItem('role', role);
        router.push('/mainmap');
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('role');
        router.push('/login'); // Redirect to login
    };

    return (
        <div className="relative h-screen w-screen flex flex-col justify-center items-center bg-neutral-900 text-white space-y-6">
            <h1 className="text-5xl font-bold mb-4">Digital Wargames</h1>
            <h2 className="text-2xl font-bold mb-4">Select Your Role</h2>
            <div className="flex flex-wrap justify-center gap-4">
                <button
                    onClick={() => handleRoleSelect('Ops')}
                    className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
                >
                    Ops
                </button>
                <button
                    onClick={() => handleRoleSelect('Logistics')}
                    className="bg-green-600 px-6 py-2 rounded hover:bg-green-700"
                >
                    Logistics
                </button>
                <button
                    onClick={() => handleRoleSelect('USA-CC')}
                    className="bg-yellow-600 px-6 py-2 rounded hover:bg-yellow-700 text-black font-semibold"
                >
                    USA-CC
                </button>
                <button
                    onClick={() => handleRoleSelect('USAF-CC')}
                    className="bg-yellow-600 px-6 py-2 rounded hover:bg-yellow-700 text-black font-semibold"
                >
                    USAF-CC
                </button>
                <button
                    onClick={() => handleRoleSelect('USN-CC')}
                    className="bg-yellow-600 px-6 py-2 rounded hover:bg-yellow-700 text-black font-semibold"
                >
                    USN-CC
                </button>
                <button
                    onClick={() => handleRoleSelect('JTF-CC')}
                    className="bg-yellow-600 px-6 py-2 rounded hover:bg-yellow-700 text-black font-semibold"
                >
                    JTF-CC
                </button>
            </div>

            {/* 🔻 Logout Button in Lower Left */}
            <button
                onClick={handleLogout}
                className="absolute bottom-6 right-6 text-sm bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
            >
                Logout
            </button>
        </div>
    );
}
