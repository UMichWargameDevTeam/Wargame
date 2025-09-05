from dataclasses import dataclass
from ..models import *

ATTACK_TYPES = [
        ("Light", "Light"),
        ("Medium", "Medium"),
        ("Heavy", "Heavy"),
        ("Structure", "Structure"),
    ]

@dataclass
class GameUnit:
    id: int
    team_id: int
    name: str
    type: str
    domain: str
    health: float
    max_health: float
    defense_modifier: float
    supply_count: float
    max_supply_space: float
    position: tuple[int, int]

    @classmethod
    def from_models(cls, instance: "UnitInstance", unit: "Unit"):
        return cls(
            id=instance.id,
            team_id=instance.team_instance.id,
            name=unit.name,
            type=unit.type,
            domain=unit.domain,
            health=instance.health,
            max_health=unit.max_health,
            defense_modifier=unit.defense_modifier,
            supply_count=instance.supply_count,
            max_supply_space=unit.max_supply_space,
            position=(instance.tile.row, instance.tile.column),
        )

@dataclass
class GameAttack:
    id: int
    unit_id: int
    name: str
    cost: float
    to_hit: float
    shots: int
    min_damage: float
    max_damage: float
    range: float
    attack_type: str
    attack_modifier: float
    attack_modifier_applies_to: str
    description: str

    @classmethod
    def from_models(cls, attack: "Attack"):
        return cls(
            id=attack.id,
            unit_id=attack.unit,
            name=attack.name,
            cost=attack.cost,
            to_hit=attack.to_hit,
            shots=attack.shots,
            min_damage=attack.min_damage,
            max_damage=attack.max_damage,
            range=attack.range,
            attack_type=attack.type,
            attack_modifier=attack.attack_modifier,
            attack_modifier_applies_to=attack.attack_modifier_applies_to,
            description=attack.description
        )