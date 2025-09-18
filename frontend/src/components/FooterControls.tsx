'use client';

import { useState } from 'react';

export default function FooterControls() {
  const [showAttackPopup, setShowAttackPopup] = useState<boolean>(false);

  const handleClick = (label: string) => {
    if (label === 'ATTACK') {
      setShowAttackPopup((prev) => !prev);
    } else {
      console.log(`${label} clicked`);
    }
  };

  return (
    <div className="bg-neutral-800 rounded-lg p-4 pl-6 flex flex-col space-y-4 w-full max-w-md">
      <div className="flex justify-start space-x-4">
        <button
          onClick={() => handleClick('REQUEST')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
        >
          Request
        </button>
        <button
          onClick={() => handleClick('MOVE')}
          className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded"
        >
          Move
        </button>
        <button
          onClick={() => handleClick('ATTACK')}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded"
        >
          Attack
        </button>
      </div>

      {showAttackPopup && (
        <div className="bg-neutral-700 rounded-md p-4 text-white max-w-md">
          <div className="mb-3">
            <label className="block mb-1 font-semibold" htmlFor="ammoType">
              Ammunition type:
            </label>
            <select
              id="ammoType"
              className="w-full rounded px-2 py-1 text-black"
              defaultValue=""
            >
              <option value="">-- Select ammo --</option>
              <option value="bullets">Bullets</option>
              <option value="rockets">Rockets</option>
              <option value="lasers">Lasers</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold" htmlFor="barrageCount">
              Number of barrages:
            </label>
            <select
              id="barrageCount"
              className="w-full rounded px-2 py-1 text-black"
              defaultValue=""
            >
              <option value="">-- Select number --</option>
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
