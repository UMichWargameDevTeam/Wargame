'use client';

export default function CommandersIntent() {
    const intent = "Secure control of airspace over southern Taiwan."; // filler value

    return (
        <div className="w-full bg-yellow-800 text-white px-6 py-3 rounded-lg shadow-md mb-4">
            <h2 className="text-base font-bold truncate overflow-hidden whitespace-nowrap">
                Commander's Intent: <span className="font-normal">{intent}</span>
            </h2>
        </div>
    );
}
