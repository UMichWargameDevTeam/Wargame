'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JoinGameDialog from '@/components/dialogs/JoinGameDialog';

const branchCommandRoles: Record<string, string> = {
    USA: 'USA-CC',
    USN: 'USN-CC',
    USAF: 'USAF-CC',
    JTF: 'JTF-CC',
};

export default function RoleSelectPage() {
    const router = useRouter();

    const [team, setTeam] = useState<string>('Red');
    const [selectedBranch, setSelectedBranch] = useState<string>('USA');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [joinCode, setJoinCode] = useState<string | null>(null);
    const [gameInstance, setGameInstance] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        const storedRole = sessionStorage.getItem('role');
        const storedBranch = sessionStorage.getItem('branch');
        const storedTeam = sessionStorage.getItem('team');
        const storedGameId = sessionStorage.getItem('gameInstanceId');
        const storedCode = sessionStorage.getItem('gameJoinCode');
        const storedUsername = sessionStorage.getItem('username') || 'Unknown';

        if (storedRole) setSelectedRole(storedRole);
        if (storedBranch) setSelectedBranch(storedBranch);
        if (storedTeam) setTeam(storedTeam);
        if (storedGameId) setGameInstance(storedGameId);
        if (storedCode) setJoinCode(storedCode);
        setUsername(storedUsername);
    }, []);

    const handleRoleSelect = (role: string) => {
        setSelectedRole(role);
        sessionStorage.setItem('role', role);
        sessionStorage.setItem('team', team);
        sessionStorage.setItem('branch', selectedBranch);
    };

    const handleContinue = () => {
        if (!selectedRole || !gameInstance) {
            alert("Please select a role and join a game before continuing.");
            return;
        }

        // Save all details to sessionStorage
        sessionStorage.setItem('team', team);
        sessionStorage.setItem('branch', selectedBranch);
        sessionStorage.setItem('role', selectedRole);
        sessionStorage.setItem('gameInstanceId', gameInstance);
        sessionStorage.setItem('username', username);

        // Optionally send "joined" event before redirect
        const socket = new WebSocket(`ws://localhost:8000/ws/game/${gameInstance}/`);
        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'ready_status',
                ready: false,
            }));
            router.push('/mainmap');
        };
    };

    const handleJoinSuccess = (id: string, code: string) => {
        setGameInstance(id);
        setJoinCode(code);
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
        router.push('/login');
    };

    const handleLeave = () => {
        setJoinCode(null);
        setGameInstance(null);
        sessionStorage.removeItem('gameJoinCode');
        sessionStorage.removeItem('gameInstanceId');
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
                    <div className="space-y-6 text-lg leading-relaxed">
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

                {/* Right side: Game + Team + Roles */}
                <div className="w-1/2 p-6 flex flex-col">
                    <h2 className="text-xl font-semibold mb-2">Create or Join Game</h2>
                    {/* Game Mode Buttons */}
                    <div className="mb-6 flex gap-4">
                        <button onClick={() => router.push('/creategame')}
                            className="px-4 py-2 bg-purple-700 rounded hover:bg-purple-600 transition">
                            Create New Game as Gamemaster
                        </button>
                        <button
                            className="px-4 py-2 bg-orange-700 rounded hover:bg-orange-600 transition"
                            onClick={() => setShowDialog(true)}
                        >
                            {joinCode ? `Leave (${joinCode})` : 'Join Game'}
                        </button>

                        {showDialog && (
                            <JoinGameDialog
                                onClose={() => setShowDialog(false)}
                                onSuccess={handleJoinSuccess}
                                onLeave={handleLeave}
                            />
                        )}
                        {/* Continue Button */}
                        <button
                            onClick={handleContinue}
                            disabled={!team || !selectedRole || !gameInstance}
                            className={`px-4 py-2 rounded text-lg font-semibold transition ${team && selectedRole && gameInstance
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Continue
                        </button>
                    </div>

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

                    {/* Branch Tabs */}
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">Select Your Branch and Role</h2>
                        <div className="flex gap-4 mb-2">
                            {['USA', 'USN', 'USAF', 'JTF'].map(branch => (
                                <button
                                    key={branch}
                                    onClick={() => setSelectedBranch(branch)}
                                    className={`px-4 py-2 rounded ${selectedBranch === branch ? 'bg-yellow-600 text-black font-bold' : 'bg-gray-600 hover:bg-gray-500'}`}
                                >
                                    {branch}
                                </button>
                            ))}
                        </div>

                        {/* Role Buttons for Selected Branch */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handleRoleSelect('Ops')}
                                className={`w-full py-3 rounded bg-blue-700 hover:bg-blue-600 text-lg font-medium ${selectedRole === 'Ops' ? 'ring-2 ring-white' : ''}`}
                            >
                                Ops
                            </button>
                            <button
                                onClick={() => handleRoleSelect('Logistics')}
                                className={`w-full py-3 rounded bg-green-700 hover:bg-green-600 text-lg font-medium ${selectedRole === 'Logistics' ? 'ring-2 ring-white' : ''}`}
                            >
                                Logistics
                            </button>
                            <button
                                onClick={() => handleRoleSelect(branchCommandRoles[selectedBranch])}
                                className={`w-full py-3 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-lg ${selectedRole === branchCommandRoles[selectedBranch] ? 'ring-2 ring-white' : ''}`}
                            >
                                {branchCommandRoles[selectedBranch]}
                            </button>
                        </div>
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
