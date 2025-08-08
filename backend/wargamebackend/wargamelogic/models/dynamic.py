from django.db import models
from .static import Role, Team, Unit, Tile, Landmark

class GameInstance(models.Model):
    join_code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GameInstance: {self.join_code}"

class TeamInstance(models.Model):
    game_instance = models.ForeignKey(GameInstance, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    # Victory points could also be calculated by querying all LandmarkInstances
    # Whose team_instance matches this teamInstance, then summing their victory_points
    victory_points = models.FloatField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["game_instance", "team"], name="unique_game_team_pair")
        ]

    def __str__(self):
        return f"GameInstance: {self.game_instance.join_code} | {self.team.name} | Victory Points: {self.victory_points}"

class RoleInstance(models.Model):
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    user = models.CharField(max_length=255)  # e.g., browser ID or cookie
    supply_points = models.FloatField()

    def __str__(self):
        return f"GameInstance: {self.team_instance.game_instance.join_code} | {self.team_instance.team.name} | {self.role.name} | User: {self.user} | Supply Points: {self.supply_points}"

class UnitInstance(models.Model):
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)
    health = models.FloatField()
    supply_count = models.FloatField()

    def __str__(self):
        return f"GameInstance: {self.team_instance.game_instance.join_code} | {self.team_instance.team.name} | {self.unit.name} | Tile: ({self.tile.row}, {self.tile.column}) | Health: {self.health} | Supply Count: {self.supply_count}"

class LandmarkInstance(models.Model):
    # Here, game_instance is a foreign key since team_instance can be null
    game_instance = models.ForeignKey(GameInstance, on_delete=models.CASCADE)
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE, null=True)
    landmark = models.ForeignKey(Landmark, on_delete=models.CASCADE)
    victory_points = models.FloatField()

    def __str__(self):
        team_name = self.team_instance.team.name if self.team_instance else "No Team"
        return f"GameInstance: {self.game_instance.join_code} | {team_name} | {self.landmark.name} | Victory Points: {self.victory_points}"

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
        team_name = self.landmark_instance.team_instance.team.name if self.landmark_instance.team_instance else "No Team"
        return f"GameInstance: {self.landmark_instance.game_instance.join_code} | {team_name} | {self.landmark_instance.landmark.name} | Tile ({self.tile.row}, {self.tile.column})"

