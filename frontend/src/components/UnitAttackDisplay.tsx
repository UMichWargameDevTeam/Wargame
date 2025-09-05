'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import { Attack, UnitInstance, RoleInstance } from '@/lib/Types';

interface Props {
  open: boolean;
  onClose: () => void;
  roleInstance: RoleInstance;
  unitInstances: UnitInstance[];
  attacks: Attack[];
  onAttackSuccess: (data: JSON) => void;
}

export default function UnitAttackDropdown({
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccessMessage(null);
      setAttackerId('');
      setTargetId('');
      setAttackName('');
    }
  }, [open]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!attackerId || !targetId || !attackName) {
      setError('Attacker, target, and attack are required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await authedFetch(
        `/api/unit-instances/${attackerId}/attacks/${attackName}/use/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attacker_id: attackerId,
            target_id: targetId,
            attack_name: attackName,
            role_instance: roleInstance.id,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Attack failed');

      onAttackSuccess(data);
      setSuccessMessage(data.message);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        }
        else {
            setError("Unknown fetch error")
        }
    } finally {
      setLoading(false);
    }
  };

  const filteredAttacks =
    attackerId === ''
      ? []
      : attacks.filter((atk) => {
          const attackerUnit = unitInstances.find((u) => u.id === Number(attackerId));
          return attackerUnit?.unit.id === atk.unit.id;
        });

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute bottom-full right-0 mb-1 bg-neutral-800 rounded-md p-3 text-white flex space-x-3 z-50 shadow-lg
        transition-transform duration-200 ease-out
        ${open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}
    >
      {successMessage ? (
        <div className="flex-1 text-center">{successMessage}</div>
      ) : (
        <>
          <div>
            <label className="block mb-1 text-sm font-semibold">Attacker</label>
            <select
              value={attackerId}
              onChange={(e) => setAttackerId(e.target.value)}
              className="w-full p-1 rounded bg-neutral-700 text-white text-sm"
            >
              <option value="">Select attacker</option>
              {unitInstances.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.team_instance.team.name} {u.unit.name} @ ({u.tile.row},{u.tile.column})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-1 rounded bg-neutral-700 text-white text-sm"
            >
              <option value="">Select target</option>
              {unitInstances.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.team_instance.team.name} {u.unit.name} @ ({u.tile.row},{u.tile.column})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Attack</label>
            <select
              value={attackName}
              onChange={(e) => setAttackName(e.target.value)}
              className="w-full p-1 rounded bg-neutral-700 text-white text-sm"
            >
              <option value="">Select attack</option>
              {filteredAttacks.map((atk) => (
                <option key={atk.id} value={atk.name}>
                  {atk.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-2 px-4 py-1 rounded bg-red-600 hover:bg-red-500 text-sm"
            >
              {loading ? 'Attacking...' : 'Attack'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-xs absolute bottom-0 left-1/2 -translate-x-1/2">{error}</p>}
    </div>
  );
}
