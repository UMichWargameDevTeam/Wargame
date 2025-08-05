'use client';

import React, { useState } from 'react';
import { Asset } from '@/lib/Types';

interface Props {
    asset: Asset;
    cellSize: number;
    onMouseDown: (id: string | number) => void;
}

export default function DraggableAsset({ asset, cellSize, onMouseDown }: Props) {
    const [showInfo, setShowInfo] = useState(false);

    const toggleInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowInfo(prev => !prev);
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: asset.tile.column * cellSize,
                top: asset.tile.row * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: asset.team.name === "RED" ? 'red' : 'blue',
                borderRadius: '50%',
                cursor: 'grab',
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(asset.id);
            }}
            onClick={toggleInfo}
            title={asset.unit.name}
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
                    <div><b>Team:</b> {asset.team.name}</div>
                    <div><b>Row:</b> {asset.tile.row}, <b>Col:</b> {asset.tile.column}</div>
                    <div><b>HP:</b> {asset.health}</div>
                    <div><b>Supplies:</b> {asset.supply_count}</div>
                </div>
            )}
        </div>
    );
}
