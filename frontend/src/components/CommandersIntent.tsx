'use client';

import { RoleInstance } from '@/lib/Types'

interface CommandersIntentProps {
    roleInstance: RoleInstance | null;
}

export default function CommandersIntent({ roleInstance }: CommandersIntentProps) {
    let intent = "Default intent."; // Default fallback value

    // Conditional logic based on roleName
    if (roleInstance?.role.is_operations) {
        intent = "Coordinate operations to achieve mission objectives.";
    } else if (roleInstance?.role.is_logistics) {
        intent = "Ensure continuous support for forces in area of operations.";
    } else if (roleInstance?.role.is_chief_of_staff && roleInstance?.role.branch.name === "Army") {
        intent = "Secure landmass control in southern Taiwan.";
    } else if (roleInstance?.role.is_chief_of_staff && roleInstance?.role.branch.name === "Air Force") {
        intent = "Establish air superiority in southern Taiwan.";
    } else if (roleInstance?.role.is_chief_of_staff && roleInstance?.role.branch.name === "Navy") {
        intent = "Ensure naval dominance in southern Taiwan.";
    } else if (roleInstance?.role.name === "Combatant Commander") {
        intent = "Ensure joint force superiority in southern Taiwan.";
    }

    return (
        <div className="flex items-center bg-yellow-800 px-6 py-3 rounded-lg">
            <h2 className="text-base font-bold">
                {roleInstance?.role.name} Intent: <span className="font-normal">{intent}</span>
            </h2>
        </div>
    );
}