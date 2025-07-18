'use client';

import { useEffect, useRef, useState } from 'react';

const GRID_ROWS = 25;
const GRID_COLS = 40;
const CELL_SIZE = 40;

interface MapElement {
    id: string;
    x: number;
    y: number;
}

interface Props {
    mapSrc: string;
}

export default function InteractiveMap({ mapSrc }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [initialized, setInitialized] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementDragId, setElementDragId] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);
    const [elements, setElements] = useState<MapElement[]>([]);

    const gridWidth = GRID_COLS * CELL_SIZE;
    const gridHeight = GRID_ROWS * CELL_SIZE;

    useEffect(() => {
        const saved = sessionStorage.getItem('mapElements');
        if (saved) {
            setElements(JSON.parse(saved));
        } else {
            setElements([
                { id: '1', x: 5, y: 5 },
                { id: '2', x: 10, y: 8 },
            ]);
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem('mapElements', JSON.stringify(elements));
    }, [elements]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || initialized) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate best zoom to fit the entire grid
        const zoomX = containerWidth / gridWidth;
        const zoomY = containerHeight / gridHeight;
        const initialZoom = Math.min(zoomX, zoomY);

        // Center the map in the container
        const initialOffsetX = (containerWidth - gridWidth * initialZoom) / 2;
        const initialOffsetY = (containerHeight - gridHeight * initialZoom) / 2;

        setZoom(initialZoom);
        setOffset({ x: initialOffsetX, y: initialOffsetY });
        setInitialized(true);
    }, [initialized, gridWidth, gridHeight]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
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

                const newX = Math.floor(mouseX / CELL_SIZE);
                const newY = Math.floor(mouseY / CELL_SIZE);

                setElements(prev =>
                    prev.map(el =>
                        el.id === elementDragId ? { ...el, x: newX, y: newY } : el
                    )
                );
            }
        }
    };

    const handleMouseUp = () => {
        setDragging(false);
        setElementDragId(null);
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
                    {/* Grid Cells */}
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

                    {/* Draggable Elements */}
                    {elements.map(el => (
                        <div
                            key={el.id}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setElementDragId(el.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: el.x * CELL_SIZE,
                                top: el.y * CELL_SIZE,
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                                backgroundColor: 'dodgerblue',
                                borderRadius: '50%',
                                cursor: 'grab',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
