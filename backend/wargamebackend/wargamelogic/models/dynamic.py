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

class TileInstance(models.Model):
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)
    landmark_instance = models.ForeignKey(LandmarkInstance, on_delete=models.CASCADE)

    def __str__(self):
        return f"Tile ({self.tile.row}, {self.tile.column}) | {self.landmark_instance.landmark.name}"
