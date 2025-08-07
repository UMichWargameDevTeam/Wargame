'use client';

import { authed_fetch } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RoleSelectPage() {
    const router = useRouter();
    const [team, setTeam] = useState<string>('Red');

    const handleRoleSelect = (role: string) => {
        sessionStorage.setItem('role', role);
        sessionStorage.setItem('team', team);

        authed_fetch(`/api/register_role/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role, team }),
        });

        router.push('/mainmap');
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('team');
        router.push('/login');
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-neutral-900 text-white">
            {/* Header */}
            <div className="text-center py-6 bg-neutral-800 text-3xl font-bold border-b border-neutral-700">
                Welcome to the Digital Wargame
            </div>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Rules / Tips */}
                <div className="w-1/2 p-6 overflow-y-auto border-r border-neutral-700">
                    <h2 className="text-2xl font-semibold mb-4">Rules & Tips</h2>
                    <div className="space-y-6 text-base text-white leading-relaxed">
                        <p>🚀 Move units by dragging them onto the map grid.</p>
                        <p>🛡️ Supply your units regularly to maintain performance.</p>
                        <p>📡 Coordinate between teams using real-time chat.</p>
                        <p>💣 Some roles have special abilities. Use them strategically.</p>
                        <p>📍 Control key landmarks to gain map advantage.</p>
                        <p>⏱️ Turns are timed. Be efficient in your planning.</p>
                        <p>🔁 Refresh the map if things appear out of sync.</p>
                        <p>📊 Your performance will be evaluated at the end of the game.</p>
                        <p>🧭 Always remember your mission objectives and team strategy.</p>
                    </div>
                </div>

                {/* Right: Team select + Roles */}
                <div className="w-1/2 p-6 flex flex-col">
                    {/* Team Selection */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">Select Your Team</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTeam('Red')}
                                className={`px-4 py-2 rounded ${team === 'Red' ? 'bg-red-700' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                                disabled={team === 'Red'}
                            >
                                Red Team
                            </button>
                            <button
                                onClick={() => setTeam('Blue')}
                                className={`px-4 py-2 rounded ${team === 'Blue' ? 'bg-blue-700' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                                disabled={team === 'Blue'}
                            >
                                Blue Team
                            </button>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                        <h2 className="text-xl font-semibold mb-2">Select Your Role</h2>
                        <button
                            onClick={() => handleRoleSelect('Gamemaster')}
                            className="w-full py-3 rounded bg-purple-700 hover:bg-purple-500 text-lg font-medium"
                        >
                            Gamemaster
                        </button>
                        <button
                            onClick={() => handleRoleSelect('Ops')}
                            className="w-full py-3 rounded bg-blue-700 hover:bg-blue-500 text-lg font-medium"
                        >
                            Ops
                        </button>
                        <button
                            onClick={() => handleRoleSelect('Logistics')}
                            className="w-full py-3 rounded bg-green-700 hover:bg-green-500 text-lg font-medium"
                        >
                            Logistics
                        </button>
                        <button
                            onClick={() => handleRoleSelect('USA-CC')}
                            className="w-full py-3 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-lg"
                        >
                            USA-CC
                        </button>
                        <button
                            onClick={() => handleRoleSelect('USAF-CC')}
                            className="w-full py-3 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-lg"
                        >
                            USAF-CC
                        </button>
                        <button
                            onClick={() => handleRoleSelect('USN-CC')}
                            className="w-full py-3 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-lg"
                        >
                            USN-CC
                        </button>
                        <button
                            onClick={() => handleRoleSelect('JTF-CC')}
                            className="w-full py-3 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-lg"
                        >
                            JTF-CC
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="absolute bottom-6 right-6 text-sm bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
            >
                Logout
            </button>
        </div>
    );
}
