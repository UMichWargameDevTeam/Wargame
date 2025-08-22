export interface Branch {
    name: string
}

export interface Unit {
    name: string,
    cost: number,
    domain: string,
    is_logistic: boolean,
    type: string,
    speed: number,
    max_health: number,
    max_supply_space: number,
    defense_modifier: number,
    description: string
}

export interface Tile {
    row: number,
    column: number
}

export interface TeamInstance {
    game_instance: {
        join_code: string,
        created_at: string,
        is_started: boolean
    },
    team: {
        name: string
    },
    victory_points: number
}

export interface RoleInstance {
    user: {
        username: string,
        is_staff: boolean
    },
    team_instance: TeamInstance,
    role: {
        name: string,
        branch: Branch,
        is_chief_of_staff: boolean,
        is_commander: boolean,
        is_vice_commander: boolean,
        is_operations: boolean,
        is_logistics: boolean,
        description: string
    }
    supply_points: number
}

export interface UnitInstance {
    id: number;  // unit instance id
    team_instance: TeamInstance,
    unit: Unit,
    tile: Tile,
    health: null,
    supply_count: null
}