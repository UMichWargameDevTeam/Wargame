'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Team, Branch, Role } from '@/lib/Types'

export default function RoleSelectPage() {
    const router = useRouter();
    const authedFetch = useAuthedFetch();

    const [teams, setTeams] = useState<Team[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const [createCode, setCreateCode] = useState<string>('');
    const [createError, setCreateError] = useState<string | null>(null);

    const [join_code, set_join_code] = useState<string>('');
    const [joinError, setJoinError] = useState<string | null>(null);

    useEffect(() => {
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
    }, [authedFetch]);

    function isValidJoinCode(code: string) {
        const regex = /^[A-Za-z0-9\-.]+$/;
        return code.length <= 100 && regex.test(code);
    }

    const handleRoleSelect = (role: string | null = null, branch: string | null = null) => {
        setSelectedRole(role);
        setSelectedBranch(branch)
    };

    const handleCreateGame = async () => {
        if (!isValidJoinCode(createCode)) {
            alert("Please enter a valid Join Code before trying to create a game!");
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

            router.push(`/game-instances/${data.team_instance.game_instance.join_code}/main-map/`);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setCreateError(err.message);
            }
        }
    };

    const handleJoinGame = async () => {
        if (!isValidJoinCode(join_code)) {
            alert("Please enter a valid Join Code before trying to join a game!");
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

            // Only store core game + user info (not team/branch/role yet)
            sessionStorage.setItem('username', data.user.username);
            sessionStorage.setItem('join_code', data.team_instance.game_instance.join_code);

            sessionStorage.setItem('teams', JSON.stringify(teams));
            sessionStorage.setItem('branches', JSON.stringify(branches));
            sessionStorage.setItem('role_instance', JSON.stringify(data));


            // Fire websocket event (optional)
            const socket = new WebSocket(`${WS_URL}/game-instances/${data.team_instance.game_instance.join_code}/users/`);
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'join',
                    username: data.user.username,
                    join_code: data.team_instance.game_instance.join_code,
                    ready: false,
                }));
            };

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setJoinError(err.message);
            }
        }
    };

    // Continue button handler
    const handleContinue = () => {
        const joinCode = sessionStorage.getItem('join_code');
        const team = sessionStorage.getItem('team_name');
        const branch = sessionStorage.getItem('branch_name');
        const role = sessionStorage.getItem('role_name');

        if (joinCode && team && branch && role) {
            router.push(`/game-instances/${joinCode}/main-map/`);
        } else {
            alert("Please select a team, branch, and role before continuing.");
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
                                disabled={!isValidJoinCode(createCode)}
                                className={`px-4 py-2 rounded transition
                                    ${!isValidJoinCode(createCode)
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
                                {sessionStorage.getItem('join_code')
                                    ? `Joined Game: ${sessionStorage.getItem('join_code')}`
                                    : "Join Game"}
                            </button>

                            {joinError && <p className="text-red-400 mb-2">{joinError}</p>}

                        </div>
                        <div className="mt-4">
                            {/* Team Selector */}
                            <h3 className="text-lg font-semibold mb-1">Select Your Team</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {teams
                                    .filter((t: Team) => t.name !== 'Gamemasters')
                                    .map((t: Team) => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                const newTeam = t.name !== selectedTeam ? t.name : null;
                                                setSelectedTeam(newTeam);
                                                if (newTeam) {
                                                    sessionStorage.setItem('team_name', newTeam);
                                                } else {
                                                    sessionStorage.removeItem('team_name');
                                                }
                                            }}
                                            className={`px-4 py-2 rounded cursor-pointer ${selectedTeam === t.name
                                                ? t.name === 'Red'
                                                    ? 'bg-red-600'
                                                    : t.name === 'Blue'
                                                        ? 'bg-blue-600'
                                                        : 'bg-green-600'
                                                : 'bg-gray-600 hover:bg-gray-500'
                                                }`}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                            </div>

                            {/* Branch-neutral role selector */}
                            <h3 className="text-lg font-semibold mb-1">Branch-neutral Roles</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {roles
                                    .filter((r: Role) => r.branch === null && r.name !== 'Gamemaster')
                                    .map((r: Role) => (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                const newRole = r.name !== selectedRole ? r.name : null;
                                                setSelectedRole(newRole);
                                                setSelectedBranch(null); // branch-neutral clears branch
                                                if (newRole) {
                                                    sessionStorage.setItem('role_name', newRole);
                                                    sessionStorage.setItem('branch_name', 'None');
                                                } else {
                                                    sessionStorage.removeItem('role_name');
                                                    sessionStorage.removeItem('branch_name');
                                                }
                                            }}
                                            className={`px-4 py-2 rounded cursor-pointer ${selectedRole === r.name ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                                                }`}
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
                                        {branches.map((b: Branch) => (
                                            <button
                                                key={b.id}
                                                onClick={() => {
                                                    const newBranch = b.name !== selectedBranch ? b.name : null;
                                                    setSelectedBranch(newBranch);
                                                    setSelectedRole(null); // reset role if branch changes
                                                    if (newBranch) {
                                                        sessionStorage.setItem('branch_name', newBranch);
                                                        sessionStorage.removeItem('role_name');
                                                    } else {
                                                        sessionStorage.removeItem('branch_name');
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded cursor-pointer ${selectedBranch === b.name
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-600 hover:bg-gray-500'
                                                    }`}
                                            >
                                                {b.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    {/* Branch-specific role selector */}
                                    <h4 className="text-md font-medium mb-1">Role</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBranch ? (
                                            roles
                                                .filter((r: Role) => r.branch?.name === selectedBranch)
                                                .map((r: Role) => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => {
                                                            const newRole = r.name !== selectedRole ? r.name : null;
                                                            setSelectedRole(newRole);
                                                            if (newRole) {
                                                                sessionStorage.setItem('role_name', newRole);
                                                                sessionStorage.setItem('branch_name', selectedBranch);
                                                            } else {
                                                                sessionStorage.removeItem('role_name');
                                                            }
                                                        }}
                                                        className={`px-4 py-2 rounded cursor-pointer ${selectedRole === r.name
                                                            ? 'bg-green-600'
                                                            : 'bg-gray-600 hover:bg-gray-500'
                                                            }`}
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

                    {/* Continue button */}
                    <button
                        onClick={handleContinue}
                        disabled={
                            !sessionStorage.getItem('join_code') ||
                            !sessionStorage.getItem('team_name') ||
                            !sessionStorage.getItem('branch_name') ||
                            !sessionStorage.getItem('role_name')
                        }
                        className={`mt-4 px-4 py-2 rounded transition
        ${(!sessionStorage.getItem('join_code') ||
                                !sessionStorage.getItem('team_name') ||
                                !sessionStorage.getItem('branch_name') ||
                                !sessionStorage.getItem('role_name'))
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 cursor-pointer"
                            }`}
                    >
                        Continue
                    </button>


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
