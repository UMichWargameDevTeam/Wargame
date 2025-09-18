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
                    onClick={(e) => e.stopPropagation()}
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
