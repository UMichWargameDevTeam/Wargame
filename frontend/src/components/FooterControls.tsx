'use client';

export default function FooterControls() {
    return (
        <div className="bg-neutral-800 rounded-lg p-4 pl-6 flex justify-start space-x-4">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded">
                Request
            </button>
            <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded">
                Move
            </button>
            <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded">
                Attack
            </button>
        </div>
    );
}

