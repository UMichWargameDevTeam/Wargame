export interface Asset {
    id: number;  // unit instance id
    unit: { name: string };
    team: { name: string };
    tile: { id: number; row: number; column: number }; // includes tile.id
    health: number;
    supply_count: number;
}