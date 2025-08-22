'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { WS_URL } from '@/lib/utils';

export default function RoleSelectPage() {
    const router = useRouter();
    const authedFetch = useAuthedFetch();

    const [teams, setTeams] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const [createCode, setCreateCode] = useState<string>('');
    const [createError, setCreateError] = useState<string | null>(null);

    const [join_code, set_join_code] = useState<string>('');
    const [joinError, setJoinError] = useState<string | null>(null);

    useEffect(() => {
        const stored_join_code = sessionStorage.getItem('join_code');
        const storedTeam = sessionStorage.getItem('team_name');
        const storedBranch = sessionStorage.getItem('branch_name');
        const storedRole = sessionStorage.getItem('role_name');

        authedFetch('/api/teams/')
            .then(res => res.json())
            .then(data => setTeams(Array.isArray(data) ? data : data.results || []))
            .catch(err => console.error("Failed to fetch teams", err));
          
        authedFetch('/api/branches/')
            .then(res => res.json())
            .then(data => setBranches(Array.isArray(data) ? data : data.results || []))
            .catch(err => console.error("Failed to fetch branches", err));

        authedFetch('/api/roles/')
            .then(res => res.json())
            .then(data => setRoles(Array.isArray(data) ? data : data.results || []))
            .catch(err => console.error("Failed to fetch roles", err));
    }, []);

    const handleRoleSelect = (role: string | null = null, branch: string | null = null) => {
        setSelectedRole(role);
        setSelectedBranch(branch)
    };

    const handleCreateGame = async () => {
        if (!createCode.trim()) {
            alert("Please enter a Join Code game before trying to create a game!");
            return;
        }

        try {
            const res = await authedFetch('/api/game-instances/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ join_code: createCode }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw Error(errorData.error || errorData.detail || "Failed to create game");
            }

            const data = await res.json();

            sessionStorage.setItem('username', data.user.username);
            sessionStorage.setItem('join_code', data.team_instance.game_instance.join_code);
            sessionStorage.setItem('team_name', data.team_instance.team.name);
            sessionStorage.setItem('branch_name', data.role.branch?.name ?? 'None');
            sessionStorage.setItem('role_name', data.role.name);

            sessionStorage.setItem('teams', JSON.stringify(teams))
            sessionStorage.setItem('branches', JSON.stringify(branches))
            sessionStorage.setItem('role_instance', JSON.stringify(data))

            // Optionally send "joined" event before redirect
            const socket = new WebSocket(`${WS_URL}/game-instances/${data.team_instance.game_instance.join_code}/users/`);
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'join',
                    username: data.user.username,
                    join_code: data.team_instance.game_instance.join_code,
                    team_name: data.team_name,
                    branch_name: data.branch_name,
                    role_name: data.role_name,
                    ready: false,
                }));
                router.push(`/game-instances/${data.team_instance.game_instance.join_code}/main-map/`);
            };

        } catch (err: any) {
            console.error(err);
            setCreateError(err.message);
        }
    };

    const handleJoinGame = async () => {
        if (!join_code.trim()) {
            alert("Please enter a Join Code before trying to join a game!");
            return;
        }

        try {
            const res = await authedFetch('/api/role-instances/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    join_code: join_code,
                    team_name: selectedTeam,
                    role_name: selectedRole,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || errorData.detail || "Failed to join game");
            }

            const data = await res.json();

            sessionStorage.setItem('username', data.user.username);
            sessionStorage.setItem('join_code', data.team_instance.game_instance.join_code);
            sessionStorage.setItem('team_name', data.team_instance.team.name);
            sessionStorage.setItem('branch_name', data.role.branch?.name ?? 'None');
            sessionStorage.setItem('role_name', data.role.name);

            sessionStorage.setItem('teams', JSON.stringify(teams))
            sessionStorage.setItem('branches', JSON.stringify(branches))
            sessionStorage.setItem('role_instance', JSON.stringify(data)) 

            // Optionally send "joined" event before redirect
            const socket = new WebSocket(`${WS_URL}/game-instances/${data.team_instance.game_instance.join_code}/users/`);
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'join',
                    username: data.user.username,
                    join_code: data.team_instance.game_instance.join_code,
                    team_name: data.team_name,
                    branch_name: data.branch_name,
                    role_name: data.role_name,
                    ready: false,
                }));
                router.push(`/game-instances/${data.team_instance.game_instance.join_code}/main-map/`);
            };

        } catch (err: any) {
            console.error(err);
            setJoinError(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
        router.push('/login');
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-neutral-900 text-white overflow-auto">
            {/* Header */}
            <div className="text-center py-6 bg-neutral-800 text-3xl font-bold border-b border-neutral-700">
                Welcome to the Digital Wargame
            </div>

            <div className="flex flex-1 overflow-auto">
                {/* LEFT SIDE */}
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

                {/* RIGHT SIDE */}
                <div className="w-1/2 p-6 flex flex-col overflow-y-auto gap-6">
                    <div>
                        {/* Create game input */}
                        <h2 className="text-xl font-semibold mb-2">Create a new game as Gamemaster</h2>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="whitespace-nowrap">Join Code:</label>
                            <input
                                type="text"
                                value={createCode}
                                onChange={(e) => setCreateCode(e.target.value)}
                                placeholder="Enter your new game's join code..."
                                className="flex-1 px-4 py-2 rounded bg-white text-black"
                            />
                            <button
                                onClick={handleCreateGame}
                                disabled={!createCode.trim()}
                                className={`px-4 py-2 rounded transition
                                    ${!createCode.trim()
                                        ? "bg-gray-500 cursor-not-allowed"
                                        : "bg-purple-700 hover:bg-purple-600 cursor-pointer"
                                    }`}
                            >
                                Create Game
                            </button>
                        </div>
                        {createError && <p className="text-red-400 mb-2">{createError}</p>}
                    </div>

                    <div>
                        {/* Join game input */}
                        <h2 className="text-xl font-semibold mb-2">Join an existing game</h2>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="whitespace-nowrap">Join Code:</label>
                            <input
                                type="text"
                                value={join_code}
                                onChange={(e) => set_join_code(e.target.value)}
                                placeholder="Enter the game's join code here..."
                                className="flex-1 px-4 py-2 rounded bg-white text-black"
                            />
                        </div>

                        <div className="mt-4">
                            {/* Team Selector */}
                            <h3 className="text-lg font-semibold mb-1">Select Your Team</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {teams
                                    .filter((t: any) => t.name !== 'Gamemasters')
                                    .map((t: any) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTeam(t.name !== selectedTeam ? t.name : null)}
                                            className={`px-4 py-2 rounded cursor-pointer ${selectedTeam === t.name ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                            </div>

                            {/* Branch-neutral role selector */}
                            <h3 className="text-lg font-semibold mb-1">Branch-neutral Roles</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {roles
                                    .filter((r: any) => r.branch === null && r.name !== 'Gamemaster')
                                    .map((r: any) => (
                                        <button
                                            key={r.id}
                                            onClick={() => handleRoleSelect(r.name !== selectedRole ? r.name : null, null)}
                                            className={`px-4 py-2 rounded cursor-pointer ${selectedRole === r.name ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Branch-specific Roles</h3>
                                <div className="mb-2">
                                    {/* Branch Selector */}
                                    <h4 className="text-md font-medium mb-1">Branch</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {branches
                                            .map((b: any) => (
                                                <button
                                                    key={b.id}
                                                    onClick={() => handleRoleSelect(null, b.name !== selectedBranch ? b.name : null)}
                                                    className={`px-4 py-2 rounded cursor-pointer ${selectedBranch === b.name ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                                >
                                                    {b.name}
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>

                                <div>
                                    {/* Branch-specific role selector */}
                                    <h4 className="text-md font-medium mb-1">Role</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBranch ? (
                                            roles
                                                .filter((r: any) => r.branch?.name === selectedBranch)
                                                .map((r: any) => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => handleRoleSelect(r.name !== selectedRole ? r.name : null, r.branch.name)}
                                                        className={`px-4 py-2 rounded cursor-pointer ${selectedRole === r.name ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                                    >
                                                        {r.name}
                                                    </button>
                                                ))
                                        ) : (
                                            <span className="text-gray-400">Please select a branch first...</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    {/* Join game button */}
                    <button
                        onClick={handleJoinGame}
                        disabled={!join_code.trim()}
                        className={`px-4 py-2 rounded transition
                            ${!join_code.trim()
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            }`}
                    >
                        Join Game
                    </button>
                    {joinError && <p className="text-red-400 mb-2">{joinError}</p>}

                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="absolute bottom-6 left-6 text-sm bg-red-600 px-4 py-2 rounded cursor-pointer hover:bg-red-700 transition"
            >
                Logout
            </button>
        </div>
    );
}
