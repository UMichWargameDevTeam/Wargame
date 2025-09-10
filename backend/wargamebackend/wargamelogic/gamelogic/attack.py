import math
from .objects import *


# RANGE_2_TILES_MULTIPLIER = .25

def calculate_distance(tile_a, tile_b):
    """
    Compute the distance between two 2D tile coordinates as the ceiling of the Euclidean distance.
    
    Parameters:
        tile_a (sequence[float] | sequence[int]): (x, y) coordinates of the first tile.
        tile_b (sequence[float] | sequence[int]): (x, y) coordinates of the second tile.
    
    Returns:
        int: The distance in tiles, rounded up to the nearest whole tile.
    """
    return math.ceil(math.sqrt((tile_a[0]-tile_b[0])**2 + (tile_a[1] - tile_b[1])**2))

def calculate_attack_damage(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    # TODO actually calculate damage
    """
    Estimate damage dealt by `attacker` to `target` using `attack`.
    
    Currently returns a fixed placeholder value (3). Intended to encapsulate attack/defense, modifiers, armor, and other rules; replace with the real damage formula.
    
    Parameters:
        attacker (GameUnit): Unit performing the attack.
        target (GameUnit): Unit receiving the attack.
        attack (GameAttack): Attack data (damage stats, modifiers, etc.).
    
    Returns:
        int: Calculated damage to apply to the target (placeholder value until implemented).
    """
    return 3


def conduct_attack(attacker: GameUnit, target: GameUnit, attack: GameAttack):
    """
    Execute an attack from attacker against target using the provided attack data.
    
    Performs pre-checks and, on success, applies damage and consumes supply points.
    
    Parameters:
        attacker (GameUnit): unit performing the attack.
        target (GameUnit): unit being attacked.
        attack (GameAttack): attack descriptor (includes cost and range).
    
    Returns:
        tuple[bool, str]: (success, message). On success success=True and message reports damage dealt.
            On failure success=False and message explains the reason ("not enough supplies" or "out of range").
    
    Side effects:
        - Reduces target.health by the computed damage (clamped to a minimum of 0.0).
        - Reduces attacker.supply_points by attack.cost (clamped to a minimum of 0.0).
    """
    if attack.cost > attacker.supply_points:
        return (False, "Unit does not have enough supplies for this attack")
    
    dist = calculate_distance(attacker.position, target.position)
    if dist > attack.range: # *RANGE_2_TILES_MULTIPLIER:
        return (False, "Range is not far enough to reach target")
    
    dmg = calculate_attack_damage(attacker, target, attack)
    target.health = max(0.0, target.health - dmg)
    attacker.supply_points = max(0.0, attacker.supply_points - attack.cost)

    return (True, f"Unit successfully landed the attack to do {dmg} damage")