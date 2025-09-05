import math
from .objects import *


RANGE_2_TILES_MULTIPLIER = .25

def calculate_distance(tile_a, tile_b):
    return math.ceil(math.sqrt((tile_a.x-tile_b.x)**2 + (tile_a.y - tile_b.y)**2))

def calculate_attack_damage(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    # TODO actually calculate damage
    return 3


def conduct_attack(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    if attack.cost > attacker.supply_count:
        return {False, "Unit does not have enough supplies for this attack"}
    
    dist = calculate_distance(attacker.position, target.position)
    if dist > attack.range*RANGE_2_TILES_MULTIPLIER:
        return {False, "Range is not far enough to reach target"}
    
    dmg = calculate_attack_damage(attacker, target, attack)
    target.health -= dmg
    attacker.supply_count -= attack.cost

    return {True, f"Unit successfully landed the attack to do {dmg} damage"}
    