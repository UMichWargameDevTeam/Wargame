export interface User {
    id: number;
    username: string;
    is_staff: boolean;
}

export interface Team {
    id: number;
    name: string;
}

export interface Branch {
    id: number;
    name: string;
}

export interface Role {
    id: number;
    name: string;
    branch: Branch;
    is_chief_of_staff: boolean;
    is_commander: boolean;
    is_vice_commander: boolean;
    is_operations: boolean;
    is_logistics: boolean;
    description: string;
}

export interface Unit {
    id: number;
    name: string;
    cost: number;
    domain: string;
    is_logistic: boolean;
    type: string;
    speed: number;
    max_health: number;
    max_supply_points: number;
    defense_modifier: number;
    icon: string;
    description: string;
}

export interface Attack {
    id: number;
    unit: Unit;
    name: string;
    cost: number;
    to_hit: number;
    shots: number;
    min_damage: number;
    max_damage: number;
    range: number;
    type: string;
    attack_modifier: number;
    attack_modifier_applies_to: string;
    description: string;
}

export interface Ability {
    id: number;
    unit: Unit;
    name: string;
    description: string;
}

export interface Tile {
    id: number;
    row: number;
    column: number;
}

export interface GameInstance {
    id: number;
    join_code: string;
    created_at: string;
    is_started: boolean;
    turn: number;
    turn_finish_time: number | null;
}

export interface TeamInstance {
    id: number;
    game_instance: GameInstance;
    team: Team;
    victory_points: number;
}

export interface RoleInstance {
    id: number;
    user: User;
    team_instance: TeamInstance;
    role: Role;
    ready: boolean;
}

export interface TeamInstanceRolePoints {
    team_instance: TeamInstance;
    role: Role;
    supply_points: number;
}

export interface UnitInstance {
    id: number;
    team_instance: TeamInstance;
    unit: Unit;
    tile: Tile;
    health: number;
    supply_points: number;
}

export interface Message {
    id: string;
    sender_role_instance: RoleInstance;
    recipient_team_name: string;
    recipient_role_name: string;
    type?: string;
    text: string;
    timestamp: number;
}