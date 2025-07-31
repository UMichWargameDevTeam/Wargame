import React, { useState } from 'react';

const requestedTroops = {
  USAF: 6,
  USN: 12,
  USA: 19,
} as const;

type Branch = keyof typeof requestedTroops;

const ResourcePointsPanel: React.FC = () => {
  const [inputs, setInputs] = useState<Record<Branch, string>>({
    USAF: '',
    USN: '',
    USA: '',
  });
  const [showConfirm, setShowConfirm] = useState(false);

  /* ---------- handlers ---------- */
  const handleChange = (branch: Branch, value: string) => {
    setInputs(prev => ({
      ...prev,
      [branch]: value.replace(/[^0-9]/g, ''),
    }));
  };

  const handleConfirm = () => {
    // send data if needed
    setShowConfirm(false);
    setInputs({ USAF: '', USN: '', USA: '' });
  };

  /* ---------- view ---------- */
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-md
                    p-4 w-full max-w-xs text-white break-words">
      <h4 className="text-blue-400 font-bold mb-2">Resource Points Panel</h4>

      <div className="text-sm mb-4">
        <b>OPS:</b> 99&nbsp;&nbsp;<b>LOG:</b> 99
      </div>

      {/* branch rows */}
      {Object.entries(requestedTroops).map(([branch, req]) => (
        <div
          key={branch}
          className="flex items-center mb-2 gap-x-4"  /* <-- uniform spacing */
        >
          {/* branch name */}
          <div className="w-14 font-semibold flex-shrink-0">{branch}</div>

          {/* label */}
          <span className="text-xs text-gray-400 flex-shrink-0">Requested:</span>

          {/* requested number */}
          <span className="text-red-400 font-bold flex-shrink-0">{req}</span>

          {/* numeric input (keeps explicit width override) */}
          <input
            type="text"
            value={inputs[branch as Branch]}
            onChange={e => handleChange(branch as Branch, e.target.value)}
            style={{ width: '40px' }}      /* do NOT remove this override */
            className="px-1 py-0.5 rounded bg-neutral-800 border
                       border-neutral-600 text-white text-left
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      ))}

      {/* send / confirm flow */}
      <button
        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold
                   py-1.5 rounded transition"
        onClick={() => setShowConfirm(true)}
        disabled={showConfirm}
      >
        SEND
      </button>

      {showConfirm && (
        <div className="mt-3 p-2 bg-neutral-800 border border-blue-400 rounded text-center">
          <div className="mb-2">Confirm submission?</div>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2"
            onClick={handleConfirm}
          >
            Confirm
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourcePointsPanel;