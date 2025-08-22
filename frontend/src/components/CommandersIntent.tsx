'use client';

interface CommandersIntentProps {
    role: string | null;
}

export default function CommandersIntent({ role }: CommandersIntentProps) {
    let intent = "Default intent."; // Default fallback value

    // Conditional logic based on role
    if (role === 'Ops') {
        intent = "Coordinate operations to achieve mission objectives.";
    } else if (role === 'Logistics') {
        intent = "Ensure continuous support for forces in area of operations.";
    } else if (role === 'USA-CC') {
        intent = "Secure landmass control in southern Taiwan.";
    } else if (role === 'USAF-CC') {
        intent = "Establish air superiority in southern Taiwan.";
    } else if (role === 'USN-CC') {
        intent = "Ensure naval dominance in southern Taiwan.";
    } else if (role === 'JTF-CC') {
        intent = "Ensure joint force superiority in southern Taiwan.";
    }

    return (
        <div className="w-full bg-yellow-800 text-white px-6 py-3 rounded-lg shadow-md mb-4">
            <h2 className="text-base font-bold truncate overflow-hidden whitespace-nowrap">
                Role Intent: <span className="font-normal">{intent}</span>
            </h2>
        </div>
    );
}