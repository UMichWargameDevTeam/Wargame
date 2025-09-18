import math
from wargamelogic.gamelogic.objects import *


# RANGE_2_TILES_MULTIPLIER = .25

def calculate_distance(tile_a, tile_b):
    return math.ceil(math.sqrt((tile_a[0]-tile_b[0])**2 + (tile_a[1] - tile_b[1])**2))

def calculate_attack_damage(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    # TODO actually calculate damage
    return 3

def conduct_attack(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    if attack.cost > attacker.supply_points:
        return (False, "Unit does not have enough supplies for this attack")

    dist = calculate_distance(attacker.position, target.position)

    if dist > attack.range: # *RANGE_2_TILES_MULTIPLIER:
        return (False, "Range is not far enough to reach target")

    dmg = calculate_attack_damage(attacker, target, attack)
    target.health = max(0.0, target.health - dmg)
    attacker.supply_points = max(0.0, attacker.supply_points - attack.cost)

    return (True, f"Unit successfully landed the attack to do {dmg} damage")