'use client';

import React, { useState } from 'react';
import { UnitInstance } from '@/lib/Types';

interface DraggableUnitInstanceProps {
    unitInstance: UnitInstance;
    cellSize: number; // FINE_CELL_SIZE (world px, e.g., 20)
    zoom: number;
    offset: { x: number; y: number };
    onToggleDrag: (id: number) => void;
}


/**
 * Renders a positioned, clickable circular marker for a unit that can toggle dragging and show an info popup.
 *
 * The marker's on-screen position and size are computed from the given world coordinates using `cellSize`, `zoom`, and `offset`.
 * Single-click calls `onToggleDrag` with the unit's id; double-click toggles a small info panel showing team, unit, tile, health,
 * and supply points. The rendered circle is colored red when the unit's team name is `"Red"`, otherwise blue. The visual size
 * is rounded to integer pixels with a minimum of 6px to ensure visibility.
 *
 * @param unitInstance - The unit instance to render (provides tile, team, unit name, health, and supply points).
 * @param cellSize - Size of a world cell in pixels (used to convert tile coordinates to screen coordinates).
 * @param zoom - Current zoom factor applied to world → screen scaling.
 * @param offset - Screen offset { x, y } applied after scaling (same transform used by the canvas).
 * @param onToggleDrag - Callback invoked with the unit id when the marker is single-clicked to toggle dragging.
 * @returns A JSX element representing the unit marker and its optional info popup.
 */
export default function DraggableUnitInstance({ unitInstance, cellSize, zoom, offset, onToggleDrag }: DraggableUnitInstanceProps) {
    const [showInfo, setShowInfo] = useState<boolean>(false);

    const toggleInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInfo(prev => !prev);
    };

    // Convert world -> screen coords using same transform as the canvas:
    const left = offset.x + zoom * (unitInstance.tile.column * cellSize);
    const top = offset.y + zoom * (unitInstance.tile.row * cellSize);
    const size = Math.max(6, Math.round(zoom * cellSize)); // floor/ceil to integer px, min size to stay visible

    return (
        <div
            style={{
                position: 'absolute',
                left,
                top,
                width: size,
                height: size,
                backgroundColor: unitInstance.team_instance.team.name === "Red" ? 'red' : 'blue',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 40,
            }}
            // single click toggles drag on/off
            onClick={(e) => {
                e.stopPropagation();
                onToggleDrag(unitInstance.id);
            }}
            // double click shows info
            onDoubleClick={(e) => {
                e.stopPropagation();
                toggleInfo(e);
            }}
            title={unitInstance.unit.name}
        >
            {showInfo && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'white',
                        color: 'black',
                        padding: '8px',
                        borderRadius: '5px',
                        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                        zIndex: 100,
                        width: 200
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div><b>Team:</b> {unitInstance.team_instance.team.name}</div>
                    <div><b>Unit:</b> {unitInstance.unit.name}</div>
                    <div><b>Row:</b> {unitInstance.tile.row}, <b>Column:</b> {unitInstance.tile.column}</div>
                    <div><b>Health:</b> {unitInstance.health}</div>
                    <div><b>Supply count:</b> {unitInstance.supply_points}</div>
                </div>
            )}
        </div>
    );
}
