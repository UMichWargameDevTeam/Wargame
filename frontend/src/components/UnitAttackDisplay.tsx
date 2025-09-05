'use client';

import { useState } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Attack, UnitInstance, RoleInstance } from '@/lib/Types';

interface Props {
  open: boolean;
  onClose: () => void;
  roleInstance: RoleInstance;
  unitInstances: UnitInstance[];
  attacks: Attack[];
  onAttackSuccess: (data: any) => void;
}

export default function UnitAttackDisplay({
  open,
  onClose,
  roleInstance,
  unitInstances,
  attacks,
  onAttackSuccess,
}: Props) {
  const authedFetch = useAuthedFetch();
  const [attackerId, setAttackerId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [attackName, setAttackName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null; // don't render unless open

  const handleSubmit = async () => {
    if (!attackerId || !targetId || !attackName) {
      setError('Attacker, target, and attack are required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await authedFetch('/api/use_attack/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attacker_id: attackerId,
          target_id: targetId,
          attack_name: attackName,
          role_instance: roleInstance.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Attack failed');

      onAttackSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative bg-neutral-800 text-white rounded-xl shadow-xl p-6 w-full max-w-md z-10">
        <h2 className="text-lg font-bold mb-4">Launch Attack</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Attacker</label>
            <select
              value={attackerId}
              onChange={(e) => setAttackerId(e.target.value)}
              className="w-full p-2 rounded bg-neutral-700"
            >
              <option value="">Select attacker</option>
              {unitInstances.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit.name} (#{u.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-2 rounded bg-neutral-700"
            >
              <option value="">Select target</option>
              {unitInstances.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit.name} (#{u.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Attack</label>
            <select
              value={attackName}
              onChange={(e) => setAttackName(e.target.value)}
              className="w-full p-2 rounded bg-neutral-700"
            >
              <option value="">Select attack</option>
              {attacks.map((atk) => (
                <option key={atk.id} value={atk.name}>
                  {atk.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-600 hover:bg-neutral-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Attacking...' : 'Attack'}
          </button>
        </div>
      </div>
    </div>
  );
}
