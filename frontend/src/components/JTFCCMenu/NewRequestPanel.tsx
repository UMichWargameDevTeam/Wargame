import React from 'react';

const NewRequestPanel: React.FC = () => {
  return (
    <div className="bg-neutral-900 border border-blue-400 rounded-lg shadow-md
                    p-4 w-64 max-w-full text-white">
      <h4 className="text-blue-400 font-bold mb-2">NEW REQUEST</h4>

      <div className="mb-4">
        <div className="text-sm"><b>FROM:</b> USA/CC</div>
        <div className="text-sm"><b>12&nbsp;LOG&nbsp;RP</b></div>
      </div>

      {/* Accept / Decline buttons with full spacing */}
      <div className="flex justify-between mt-2">
        <button
          aria-label="Accept request"
          className="bg-green-500 hover:bg-green-600 text-white rounded
                     px-4 py-1 font-bold text-lg transition"
        >
          ✔
        </button>

        <button
          aria-label="Decline request"
          className="bg-red-500 hover:bg-red-600 text-white rounded
                     px-4 py-1 font-bold text-lg transition"
        >
          ✖
        </button>
      </div>
    </div>
  );
};

export default NewRequestPanel;