from django.db import models
from .static import Role, Team, Unit, Tile, Landmark

class RoleInstance(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.CharField(max_length=255)  # e.g., browser ID or cookie

    def __str__(self):
        return f"{self.role.name} | {self.team.name} | User: {self.user}"

class UnitInstance(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)
    health = models.FloatField()
    supply_count = models.FloatField()

    def __str__(self):
        return f"{self.unit.name} | {self.team.name} | Tile: ({self.tile.row}, {self.tile.column}) | Health: {self.health}"

class LandmarkInstance(models.Model):
    landmark = models.ForeignKey(Landmark, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    victory_points = models.FloatField()

    def __str__(self):
        return f"{self.landmark.name} | {self.team.name} | Victory Points: {self.victory_points}"

# My current understanding is that multiple tiles can be part of a landmark,
# And possibly that a tile can be part of multiple landmarks. 
# If this is not the case, like if a tile can only be part of one landmark,
# this code and the corresponding view can be changed to assume
# that for a given row and column, there is either 0 or 1 corresponding LandmarkInstanceTiles.
class LandmarkInstanceTile(models.Model):
    landmark_instance = models.ForeignKey(LandmarkInstance, on_delete=models.CASCADE)
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tile", "landmark_instance"], name="unique_tile_landmark_pair")
        ]

    def __str__(self):
        return f"{self.landmark_instance.landmark.name} | Tile ({self.tile.row}, {self.tile.column})"
