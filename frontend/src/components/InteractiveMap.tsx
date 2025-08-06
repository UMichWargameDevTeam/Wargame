'use client';

import React, { useEffect, useRef, useState } from 'react';
import DraggableAsset from './DraggableAsset';
import { Asset } from "@/lib/Types";
import {BACKEND_URL, WS_URL} from '@/lib/utils'

const GRID_ROWS = 25;
const GRID_COLS = 40;
const CELL_SIZE = 40;

interface Props {
    mapSrc: string;
    assets: Asset[];
    setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

export default function InteractiveMap({ mapSrc, assets, setAssets }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);

    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [initialized, setInitialized] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementDragId, setElementDragId] = useState<number>(0);
    const [showGrid, setShowGrid] = useState(true);

    const gridWidth = GRID_COLS * CELL_SIZE;
    const gridHeight = GRID_ROWS * CELL_SIZE;

    // Fit map to screen initially
    useEffect(() => {
        const container = containerRef.current;
        if (!container || initialized) return;

        const zoomX = container.clientWidth / gridWidth;
        const zoomY = container.clientHeight / gridHeight;
        const initialZoom = Math.min(zoomX, zoomY);

        const initialOffsetX = (container.clientWidth - gridWidth * initialZoom) / 2;
        const initialOffsetY = (container.clientHeight - gridHeight * initialZoom) / 2;

        setZoom(initialZoom);
        setOffset({ x: initialOffsetX, y: initialOffsetY });
        setInitialized(true);
    }, [initialized, gridWidth, gridHeight]);

    // WebSocket connection for live updates
    useEffect(() => {
        const socket = new WebSocket(`${WS_URL}/unit-instances/`);
        socketRef.current = socket;

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "unit_moved") {
                const updated = data.payload;
                setAssets(prev =>
                    prev.map(asset =>
                        asset.id === updated.id ? updated : asset
                    )
                );
            }
        };

        socket.onclose = () => console.log('WebSocket closed');
        return () => socket.close();
    }, [setAssets]);

    const handleWheel = (e: React.WheelEvent) => {
        //e.preventDefault();
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(zoom + delta, 0.5), 3);

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const dx = mouseX - offset.x;
            const dy = mouseY - offset.y;

            setOffset({
                x: offset.x - dx * (newZoom / zoom - 1),
                y: offset.y - dy * (newZoom / zoom - 1),
            });
        }
        setZoom(newZoom);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (elementDragId) return;
        setDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        } else if (elementDragId) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseX = (e.clientX - rect.left - offset.x) / zoom;
                const mouseY = (e.clientY - rect.top - offset.y) / zoom;

                const newCol = Math.floor(mouseX / CELL_SIZE);
                const newRow = Math.floor(mouseY / CELL_SIZE);

                setAssets(prev =>
                    prev.map(asset =>
                        asset.id === elementDragId
                            ? { ...asset, tile: { ...asset.tile, column: newCol, row: newRow } }
                            : asset
                    )
                );
            }
        }
    };


    const handleMouseUp = async () => {
        setDragging(false);
        if (!elementDragId) return;

        const asset = assets.find(a => a.id === elementDragId);
        if (!asset) return;

        try {
            await fetch(`${BACKEND_URL}/api/unit-instances/${asset.id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    row: asset.tile.row,
                    column: asset.tile.column
                }),
            });

            // Broadcast over WebSocket
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: "unit_moved",
                    payload: asset
                }));
            }
        } catch (error) {
            console.error("Failed to update unit:", error);
        }

        setElementDragId(0);
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            <button
                onClick={() => setShowGrid(!showGrid)}
                className="absolute top-2 left-2 z-50 bg-neutral-700 text-white px-3 py-1 rounded"
            >
                Toggle Grid
            </button>

            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: gridWidth,
                        height: gridHeight,
                        position: 'relative',
                        backgroundImage: `url(${mapSrc})`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                    }}
                    className='select-none'
                >
                    {/* Grid */}
                    {showGrid &&
                        Array.from({ length: GRID_ROWS }).flatMap((_, row) =>
                            Array.from({ length: GRID_COLS }).map((_, col) => (
                                <div
                                    key={`${row}-${col}`}
                                    style={{
                                        position: 'absolute',
                                        left: col * CELL_SIZE,
                                        top: row * CELL_SIZE,
                                        width: CELL_SIZE,
                                        height: CELL_SIZE,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        fontSize: 10,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {`${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, '0')}`}
                                </div>
                            ))
                        )}

                    {/* Draggable Units */}
                    {assets.map(asset => (
                        <DraggableAsset
                            key={asset.id}
                            asset={asset}
                            cellSize={CELL_SIZE}
                            onMouseDown={(id) => setElementDragId(asset.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
