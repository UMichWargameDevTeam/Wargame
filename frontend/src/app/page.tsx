'use client';

import { useRouter } from 'next/navigation';

export default function RoleSelectPage() {
  const router = useRouter();

  // Saves the role selected in the session (tab/device)
  const handleRoleSelect = (role: string) => {
    fetch('http://localhost:8000/api/register_role/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });
    sessionStorage.setItem('role', role);
    router.push('/mainmap');
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-neutral-900 text-white space-y-6">
      <h1 className="text-5xl font-bold mb-4">Digital Wargames</h1>
      <h2 className="text-2xl font-bold mb-4">Select Your Role</h2>
      <div className="space-x-4">
        <button
          onClick={() => handleRoleSelect('commander')}
          className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
        >
          Commander
        </button>
        <button
          onClick={() => handleRoleSelect('observer')}
          className="bg-green-600 px-6 py-2 rounded hover:bg-green-700"
        >
          Observer
        </button>
        <button
          onClick={() => handleRoleSelect('field')}
          className="bg-purple-600 px-6 py-2 rounded hover:bg-purple-700"
        >
          Field Unit
        </button>
      </div>
    </div>
  );
}
