import React, { useState } from 'react';

const requestedTroops = {
  USAF: 6,
  USN: 12,
  USA: 19,
};

const ResourcePointsPanel: React.FC = () => {
  const [inputs, setInputs] = useState({ USAF: '', USN: '', USA: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (branch: string, value: string) => {
    setInputs((prev) => ({ ...prev, [branch]: value.replace(/[^0-9]/g, '') }));
  };

  const handleSend = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    setInputs({ USAF: '', USN: '', USA: '' });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-md p-4 w-full max-w-xs min-w-0 text-white overflow-visible break-words">
      <h4 className="text-blue-400 font-bold mb-2">Resource Points Panel</h4>
      <div className="text-sm mb-4 flex flex-col gap-1">
        <div><b>OPS:</b> 99 &nbsp; <b>LOG:</b> 99</div>
      </div>
      {Object.entries(requestedTroops).map(([branch, req]) => (
        <div key={branch} className="flex items-center mb-2 min-w-0">
          <div className="flex-1 font-semibold min-w-0">{branch}</div>
          <span className="text-xs text-gray-400 mr-2">Requested Troops:</span>
          <span className="text-red-400 font-bold mr-2">{req}</span>
          <input
            type="text"
            value={inputs[branch as keyof typeof inputs]}
            onChange={e => handleChange(branch, e.target.value)}
            className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      ))}
      <button
        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 rounded transition"
        onClick={handleSend}
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