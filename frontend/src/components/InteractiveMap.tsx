'use client';

import React, { useEffect, useState, useRef, RefObject, useCallback } from 'react';
import { useAuthedFetch } from '@/hooks/useAuthedFetch';
import DraggableUnitInstance from './DraggableUnitInstance';
import { UnitInstance } from '@/lib/Types';

interface InteractiveMapProps {
    socketRef: RefObject<WebSocket | null>;
    socketReady: boolean;
    mapSrc: string;
    unitInstances: UnitInstance[];
    setUnitInstances: React.Dispatch<React.SetStateAction<UnitInstance[]>>;
    selectedUnitInstances: Record<string, boolean>;
}

const BASE_CELL_SIZE = 80;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

// NEW: use the finest cell size as a canonical world-grid cell (80 / 4 = 20)
const MAX_GRID_LEVEL = 2;
const FINE_CELL_SIZE = BASE_CELL_SIZE / (2 ** MAX_GRID_LEVEL);

export default function InteractiveMap({ socketRef, socketReady, mapSrc, unitInstances, setUnitInstances, selectedUnitInstances }: InteractiveMapProps) {
    const authedFetch = useAuthedFetch();
    
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const addedUnitsMessageListener = useRef<boolean>(false);

    const [zoom, setZoom] = useState<number>(1);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const [dragging, setDragging] = useState<boolean>(false); // panning
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementDragId, setElementDragId] = useState<number>(0); // id of unit being dragged (toggle)
    const [showGrid, setShowGrid] = useState<boolean>(true);

    useEffect(() => {
        const savedZoom = sessionStorage.getItem('map_zoom');
        if (savedZoom) setZoom(Number(savedZoom));
        const savedOffset = sessionStorage.getItem('map_offset');
        if (savedOffset) setOffset(JSON.parse(savedOffset));
    }, []);

    useEffect(() => {
        sessionStorage.setItem('map_zoom', zoom.toString());
        sessionStorage.setItem('map_offset', JSON.stringify(offset));
    }, [zoom, offset]);

    // WebSocket setup
    useEffect(() => {
        if (!socketReady || !socketRef.current || addedUnitsMessageListener.current) return;
        addedUnitsMessageListener.current = true;
        const socket = socketRef.current;

        const handleUnitsMessage = (event: MessageEvent) => {
            const msg  = JSON.parse(event.data);
            if (msg.channel === "units") {
                switch (msg.action) {

                    case "attack":
                        // TODO
                        break;
                    case "create":
                        setUnitInstances(prev => [...prev, msg.data]);
                        break;
                    case "delete":
                        setUnitInstances(prev => prev.filter(u => u.id !== msg.data.id));
                        break;
                    case "move":
                        setUnitInstances(prev =>
                            prev.map(unitInstance =>
                                unitInstance.id === msg.data.id ? msg.data : unitInstance
                            )
                        );
                        break;
                }
            }
        };

        socket.addEventListener("message", handleUnitsMessage);

        return () => {
            socket.removeEventListener("message", handleUnitsMessage);
            addedUnitsMessageListener.current = false;
        }

    }, [socketRef, socketReady, setUnitInstances]);

    function getLabelPart(row: number, col: number, useLowercase = false) {
        const letter = String.fromCharCode((useLowercase ? 97 : 65) + row); // a-z or A-Z
        const number = String(col + 1).padStart(2, '0');
        return `${letter}${number}`;
    }

    // DRAW (unchanged except for axis label fixes if needed)...
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const container = containerRef.current;
        if (!container) return;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (imageRef.current) {
            ctx.save();
            ctx.translate(offset.x, offset.y);
            ctx.scale(zoom, zoom);
            ctx.drawImage(imageRef.current, 0, 0);
            ctx.restore();
        }

        if (showGrid) {
            ctx.save();
            ctx.translate(offset.x, offset.y);
            ctx.scale(zoom, zoom);

            const imgW = imageRef.current?.width || 0;
            const imgH = imageRef.current?.height || 0;

            let level = 0;
            if (zoom >= 2) level = 2;
            else if (zoom >= 1) level = 1;
            else level = 0;

            const cellSize = BASE_CELL_SIZE / Math.pow(2, level);

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1 / zoom;
            ctx.font = `${10 / zoom}px sans-serif`;
            ctx.fillStyle = 'white';

            for (let x = 0; x <= imgW; x += cellSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, imgH);
                ctx.stroke();
            }
            for (let y = 0; y <= imgH; y += cellSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(imgW, y);
                ctx.stroke();
            }

            const rows = Math.ceil(imgH / cellSize);
            const cols = Math.ceil(imgW / cellSize);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    let label = "";

                    if (level === 0) {
                        label = getLabelPart(row, col, false);
                    } else if (level === 1) {
                        const parentRow = Math.floor(row / 2);
                        const parentCol = Math.floor(col / 2);
                        label = getLabelPart(parentRow, parentCol, false) +
                            getLabelPart(row % 2, col % 2, false);
                    } else if (level === 2) {
                        const grandParentRow = Math.floor(row / 4);
                        const grandParentCol = Math.floor(col / 4);
                        const grandParentLabel = getLabelPart(grandParentRow, grandParentCol, false);
                        const parentRow = Math.floor(row / 2) % 2;
                        const parentCol = Math.floor(col / 2) % 2;
                        const parentLabel = getLabelPart(parentRow, parentCol, false);
                        const childLabel = getLabelPart(row % 2, col % 2, true);
                        label = grandParentLabel + parentLabel + childLabel;
                    }

                    ctx.fillText(label, col * cellSize + 2, row * cellSize + 12 / zoom);
                }
            }

             // Axis labels (top + left edges)
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            let groupSize = 1;
            if (level === 0) groupSize = 4;
            else if (level === 1) groupSize = 2;
            else if (level === 2) groupSize = 1;

            const fontSize = 14 / zoom;
            ctx.font = `${fontSize}px sans-serif`;

            // Top edge (columns)
            for (let col = 0; col < cols * groupSize; col += groupSize) {
                const start = col;
                const end = Math.min(col + groupSize, cols * groupSize) - 1;
                const label = level === 2 ? `${start}` : `${start}-${end}`;

                // Anchor at the first tile in the group
                const x = col * 20 + 8;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(label, x, -2);
            }

            // Left edge (rows)
            for (let row = 0; row < rows * groupSize; row += groupSize) {
                const start = row;
                const end = Math.min(row + groupSize, rows * groupSize) - 1;
                const label = level === 2 ? `${start}` : `${start}-${end}`;

                // Anchor at the first tile in the group
                const y = row * 20 + 8;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText(label, -4, y);
            }

            ctx.restore();
        }
    }, [offset, zoom, showGrid]);

    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        const img = new Image();
        img.src = mapSrc;
        img.onload = () => {
            imageRef.current = img;
            draw();
        };
    }, [mapSrc, draw]);

    // Zoom (unchanged)
    const handleWheel = (e: React.WheelEvent) => {
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(zoom + delta, MIN_ZOOM), MAX_ZOOM);

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

    // Panning (unchanged)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (elementDragId) return; // don't pan while a unit is active
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

                // snap to finest grid and clamp to >= 0
                const newCol = Math.max(0, Math.floor(mouseX / FINE_CELL_SIZE));
                const newRow = Math.max(0, Math.floor(mouseY / FINE_CELL_SIZE));

                setUnitInstances(prev =>
                    prev.map(unitInstance =>
                        unitInstance.id === elementDragId
                            ? { ...unitInstance, tile: { ...unitInstance.tile, column: newCol, row: newRow } }
                            : unitInstance
                    )
                );
            }
        }
    };

    // Keep handleMouseUp only for panning end (do NOT commit unit move here anymore).
    const handleMouseUp = () => {
        setDragging(false);
    };

    // Toggle drag on a unit (click to start; click again to stop & commit)
    const toggleElementDrag = async (id: number) => {
        if (!socketReady || !socketRef.current) return;
        const socket = socketRef.current;

        if (elementDragId === id) {
            // stop dragging immediately so UI un-sticks
            setElementDragId(0);
            setDragging(false);

            const unitInstance = unitInstances.find(a => a.id === id);
            if (!unitInstance) return;

            try {
                const res = await authedFetch(
                    `/api/unit-instances/${unitInstance.id}/move/tiles/${unitInstance.tile.row}/${unitInstance.tile.column}/`,
                    { method: "PATCH", headers: { "Content-Type": "application/json" } }
                );
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || data.detail || "Failed to move unit instance.");
                }

                if (socket.readyState === WebSocket.OPEN) {
                    const unitInstance: UnitInstance = data;

                    socket.send(JSON.stringify({
                        channel: "units",
                        action: "move",
                        data: unitInstance
                    }));
                }
            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                  alert(err.message);
                }
            }
        } else {
            // start dragging this unit (will move on mousemove)
            setElementDragId(id);
        }
    };

    // Background click should also stop & commit if a unit is active
    const handleBackgroundClick = (e: React.MouseEvent) => {
        // only act if user clicked the container itself (not a child)
        if (elementDragId && e.target === containerRef.current) {
            toggleElementDrag(elementDragId);
        }
    };

    return (
        <div
            className="relative w-full h-full overflow-hidden"
            ref={containerRef}
            onClick={handleBackgroundClick}
        >
            <button
                onClick={() => { setShowGrid(!showGrid); draw(); }}
                className="absolute top-2 left-2 z-50 bg-neutral-700 text-white px-3 py-1 rounded cursor-pointer hover:bg-neutral-600"
            >Toggle Grid</button>

            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            />

            {/* UnitInstances rendered above canvas */}
            {unitInstances
                .filter(unitInstance => selectedUnitInstances[unitInstance.unit.domain] === true)
                .map(unitInstance => (
                    <DraggableUnitInstance
                        key={unitInstance.id}
                        unitInstance={unitInstance}
                        cellSize={FINE_CELL_SIZE}
                        zoom={zoom}
                        offset={offset}
                        onToggleDrag={toggleElementDrag}
                    />
                ))}
        </div>
    );
}
