'use client';

import { useState } from 'react';

const SendResourcePoints = () => {
    const [inputs, setInputs] = useState({
        USA: '',
        USN: '',
        USAF: '',
    });

    const handleChange = (branch: string, value: string) => {
        setInputs((prev) => ({
            ...prev,
            [branch]: value,
        }));
    };

    return (
        <div className="mt-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Send Resource Points</h2>

            {/* Display Ops & Log points */}
            <div className="bg-neutral-700 p-4 rounded-lg mb-4">
                <p className="mb-2 font-bold">Ops Points: <span className="font-bold text-green-400">30</span></p>
                <p className="mb-2 font-bold">Log Points: <span className="font-bold text-green-400">20</span></p>
            </div>

            {/* Inputs for USA, USN, USAF */}
            <div className="space-y-3 mb-4">
                {['USA', 'USN', 'USAF'].map((branch) => (
                    <div key={branch} className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
                        <span className="w-16 font-bold">{branch}</span>
                        <input
                            type="number"
                            value={inputs[branch as keyof typeof inputs]}
                            onChange={(e) => handleChange(branch, e.target.value)}
                            className="w-24 px-2 py-1 bg-neutral-900 border border-gray-600 rounded text-white"
                            placeholder="0"
                        />
                        <span className="text-sm text-red-400">Requested: 15</span>
                    </div>
                ))}
            </div>

            {/* Send Button */}
            <button
                className="w-full bg-green-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg font-semibold"
            >
                Send
            </button>
        </div>
    );
};

export default SendResourcePoints;
