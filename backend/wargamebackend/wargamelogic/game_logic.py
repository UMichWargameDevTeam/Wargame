from .models import UnitInstance, Tile

TILE_DISTANCE_MILES = 2

def move_unit_instance(unit_instance, target_tile):
    current_tile = unit_instance.tile
    dx = abs(current_tile.row - target_tile.row)
    dy = abs(current_tile.column - target_tile.column)
    distance = dx + dy

    speed = unit_instance.unit.speed
    if distance > speed/TILE_DISTANCE_MILES:
        return False, f"Move too far: {distance} > {speed}"

    unit_instance.tile = target_tile
    unit_instance.save()
    return True, "Moved successfully"
