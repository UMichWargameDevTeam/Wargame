import math
from objects import *

RANGE_2_TILES_MULTIPLIER = .25

def calculate_distance(tile_a, tile_b):
    return math.ceil(math.sqrt((tile_a.x-tile_b.x)**2 + (tile_a.y - tile_b.y)**2))




def assess_attack(attacker: GameUnit, defender: GameUnit, attack: GameAttack):
    dist = calculate_distance(attacker.position, defender.position)
    if dist > attack.range*RANGE_2_TILES_MULTIPLIER:
        