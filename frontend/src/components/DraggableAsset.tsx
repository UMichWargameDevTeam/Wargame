'use client';

import React, { useState } from 'react';
import { Asset } from '@/lib/Types';

interface Props {
    asset: Asset;
    cellSize: number;
    onMouseDown: (id: string) => void;
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
                left: asset.x_position * cellSize,
                top: asset.y_position * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: asset.team === "RED" ? 'red' : 'blue',
                borderRadius: '50%',
                cursor: 'grab',
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(asset.id);
            }}
            onClick={toggleInfo}
            title={asset.name}
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
                    <strong>{asset.name}</strong>
                    <div><b>Team:</b> {asset.team}</div>
                    <div><b>X:</b> {asset.x_position}, <b>Y:</b> {asset.y_position}</div>
                    <div><b>HP:</b> {asset.hitpoints}</div>
                    <div><b>Primary Ammo:</b> {asset.primary_ammo}</div>
                    <div><b>Secondary Ammo:</b> {asset.secondary_ammo}</div>
                    <div><b>Terciary Ammo:</b> {asset.terciary_ammo}</div>
                    <div><b>Supplies:</b> {asset.supplies_count}</div>
                </div>
            )}
        </div>
    );
}
