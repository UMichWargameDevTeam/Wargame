'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { getSessionStorageOrFetch } from '@/lib/utils';
import { Team, Branch, Role, RoleInstance } from '@/lib/Types'

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
    const [creatingGame, setCreatingGame] = useState<boolean>(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [joinCode, setJoinCode] = useState<string>('');
    const [joiningGame, setJoiningGame] = useState<boolean>(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    const [loggingOut, setLoggingOut] = useState<boolean>(false);

    const [sessionRoleInstance, setSessionRoleInstance] = useState<RoleInstance | null>(null);

    useEffect(() => {
        getSessionStorageOrFetch<Team[]>('teams', async () => {
                const res = await authedFetch("/api/teams/");
                if (!res.ok) throw new Error(`Team fetch failed with ${res.status}`);
                return res.json();
            })
                .then(data => setTeams(data));
          
        getSessionStorageOrFetch<Branch[]>('branches', async () => {
                const res = await authedFetch("/api/branches/");
                if (!res.ok) throw new Error(`Branch fetch failed with ${res.status}`);
                return res.json();
            })
                .then(data => setBranches(data));

        getSessionStorageOrFetch<Role[]>('roles', async () => {
                const res = await authedFetch("/api/roles/");
                if (!res.ok) throw new Error(`Role fetch failed with ${res.status}`);
                return res.json();
            })
                .then(data => setRoles(data));
        
        const roleInstanceStr = sessionStorage.getItem("role_instance");
        if (roleInstanceStr) {
            const roleInstance: RoleInstance = JSON.parse(roleInstanceStr);
            setSessionRoleInstance(roleInstance);
            setJoinCode(roleInstance.team_instance.game_instance.join_code);
            setSelectedTeam(roleInstance.team_instance.team.name);
            setSelectedBranch(roleInstance.role.branch?.name || null);
            setSelectedRole(roleInstance.role.name);
        }

    }, [authedFetch]);

    function isValidJoinCode(code: string) {
        const regex = /^[A-Za-z0-9\-.]+$/;
        return code.length <= 100 && regex.test(code);
    }

    const handleRoleSelect = (role: string | null = null, branch: string | null = null) => {
        setSelectedRole(role);
        setSelectedBranch(branch);
    };

    const handleCreateGame = async () => {
        if (!isValidJoinCode(createCode)) {
            alert("Please enter a valid Join Code before trying to create a game!");
            return;
        }

        try {
            setCreatingGame(true);
            const res = await authedFetch("/api/game-instances/create/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ join_code: createCode }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw Error(errorData.error || errorData.detail || "Failed to create game");
            }

            const data = await res.json();
            sessionStorage.setItem('role_instance', JSON.stringify(data));

            router.push(`/game-instances/${data.team_instance.game_instance.join_code}/main-map/`);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setCreateError(err.message);
            }
            setCreatingGame(false);
        }
    };

    const handleJoinGame = async () => {
        if (!isValidJoinCode(joinCode)) {
            alert("Please enter a valid Join Code before trying to join a game!");
            return;
        }

        try {
            setJoiningGame(true);
            const res = await authedFetch("/api/role-instances/create/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    join_code: joinCode,
                    team_name: selectedTeam,
                    role_name: selectedRole,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || errorData.detail || "Failed to join game");
            }

            const data = await res.json();
            sessionStorage.setItem('role_instance', JSON.stringify(data));

            router.push(`/game-instances/${data.team_instance.game_instance.join_code}/main-map/`);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setJoinError(err.message);
            }
            setJoiningGame(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.clear();
        router.push("/login");
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
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleCreateGame();
                        }}
                    >
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
                                type="submit"
                                disabled={!isValidJoinCode(createCode) || creatingGame}
                                className={`px-4 py-2 rounded transition
                                    ${(!isValidJoinCode(createCode) || creatingGame)
                                        ? "bg-gray-500 cursor-not-allowed"
                                        : "bg-purple-700 cursor-pointer hover:bg-purple-600"
                                    }
                                `}
                            >
                                {creatingGame ? "Creating Game..." : "Create Game"}
                            </button>
                        </div>
                        {createError && 
                            <p className="text-red-400 mb-2">{createError}</p>
                        }
                    </form>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleJoinGame();
                        }}
                    >
                        {/* Join game input */}
                        <h2 className="text-xl font-semibold mb-2">Join an existing game</h2>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="whitespace-nowrap">Join Code:</label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Enter the game's join code here..."
                                className="flex-1 px-4 py-2 rounded bg-white text-black"
                            />
                        </div>
                        {sessionRoleInstance && joinCode === sessionRoleInstance.team_instance.game_instance.join_code && (
                            <p className="text-yellow-400 mb-2">
                                You already have a role as a(n) <strong>{sessionRoleInstance.role.name}</strong> on the{" "}
                                <strong>{sessionRoleInstance.team_instance.team.name}</strong> team in game{" "}
                                <strong>{sessionRoleInstance.team_instance.game_instance.join_code}</strong>.{" "}
                                Click <strong>Join Game</strong> to continue.
                            </p>
                        )}

                        <div className="mt-4">
                            {/* Team Selector */}
                            <h3 className="text-lg font-semibold mb-1">Select Your Team</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {teams
                                    .filter((t: Team) => t.name !== 'Gamemasters')
                                    .map((t: Team) => (
                                        <button
                                            type="button"
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
                                    .filter((r: Role) => r.branch === null && r.name !== 'Gamemaster')
                                    .map((r: Role) => (
                                        <button
                                            type="button"
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
                                            .map((b: Branch) => (
                                                <button
                                                    type="button"
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
                                                .filter((r: Role) => r.branch?.name === selectedBranch)
                                                .map((r: Role) => (
                                                    <button
                                                        type="button"
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

                        {/* Join game button */}
                        <div className="mt-4 flex">
                            <button
                                type="submit"
                                disabled={!isValidJoinCode(joinCode) || joiningGame}
                                className={`flex-1 px-4 py-2 rounded transition
                                    ${(!isValidJoinCode(joinCode) || joiningGame)
                                        ? "bg-gray-500 cursor-not-allowed"
                                        : "bg-blue-600 cursor-pointer hover:bg-blue-700"
                                    }
                                `}
                            >
                                {joiningGame ? "Joining Game..." : "Join Game"}
                            </button>
                        </div>
                        {joinError && 
                            <p className="text-red-400 mb-2">{joinError}</p>
                        }
                    </form>
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                disabled={loggingOut}
                className={`absolute bottom-6 left-6 text-sm px-4 py-2 rounded transition
                    ${loggingOut
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-red-600 cursor-pointer hover:bg-red-500"
                    }
                `}
            >
                {loggingOut ? "Logging out..." : "Logout"}
            </button>
        </div>
    );
}
