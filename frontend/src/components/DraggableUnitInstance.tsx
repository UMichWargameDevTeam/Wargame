'use client';

import React, { useState } from 'react';
import { UnitInstance } from '@/lib/Types';

interface Props {
    unitInstance: UnitInstance;
    cellSize: number;
    onMouseDown: (id: string | number) => void;
}

export default function DraggableUnitInstance({ unitInstance, cellSize, onMouseDown }: Props) {
    const [showInfo, setShowInfo] = useState(false);

    const toggleInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInfo(prev => !prev);
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: unitInstance.tile.column * cellSize,
                top: unitInstance.tile.row * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: unitInstance.team_instance.team.name === "Red" ? 'red' : 'blue',
                borderRadius: '50%',
                cursor: 'grab',
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(unitInstance.id);
            }}
            onClick={toggleInfo}
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
                    <div><b>Supply count:</b> {unitInstance.supply_count}</div>
                </div>
            )}
        </div>
    );
}
