from django.db import models
from django.contrib.auth.models import User
from wargamelogic.models.static import (
    Team, Role, Unit, Landmark, Tile
)


class GameInstance(models.Model):
    join_code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_started = models.BooleanField(default=False)
    turn = models.IntegerField(default=0)
    turn_finish_time = models.BigIntegerField(null=True, default=None)

    def __str__(self):
        return f"GameInstance: {self.join_code}"

class TeamInstance(models.Model):
    game_instance = models.ForeignKey(GameInstance, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    # Victory points could also be calculated by querying all LandmarkInstances
    # Whose team_instance matches this teamInstance, then summing their victory_points
    victory_points = models.FloatField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["game_instance", "team"], name="unique_game_team_pair")
        ]

    def __str__(self):
        return f"GameInstance: {self.game_instance.join_code} | Team: {self.team.name}"

class RoleInstance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    ready = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "team_instance"], name="unique_user_team_instance_pair")
        ]

    def __str__(self):
        return f"GameInstance: {self.team_instance.game_instance.join_code} | Team: {self.team_instance.team.name} | Role: {self.role.name} | User: {self.user.username} "

class TeamInstanceRolePoints(models.Model):
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    supply_points = models.FloatField(default=0)

    class Meta:
        verbose_name_plural = "team instance role points"
        constraints = [
            models.UniqueConstraint(fields=["team_instance", "role"], name="unique_team_instance_role_pair")
        ]

    def __str__(self):
        return f"GameInstance: {self.team_instance.game_instance.join_code} | Team: {self.team_instance.team.name} | Role: {self.role.name}"

class UnitInstance(models.Model):
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)
    health = models.FloatField()
    supply_points = models.FloatField()

    def __str__(self):
        return f"id: {self.id} | GameInstance: {self.team_instance.game_instance.join_code} | Team: {self.team_instance.team.name}"

class LandmarkInstance(models.Model):
    # Here, game_instance is a foreign key since team_instance can be null
    game_instance = models.ForeignKey(GameInstance, on_delete=models.CASCADE)
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE, null=True)
    landmark = models.ForeignKey(Landmark, on_delete=models.CASCADE)
    victory_points = models.FloatField()

    def __str__(self):
        team_name = self.team_instance.team.name if self.team_instance else "No Team"
        return f"id: {self.id} | GameInstance: {self.game_instance.join_code} | Team: {team_name} | Landmark: {self.landmark.name}"

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
        return f"GameInstance: {self.landmark_instance.game_instance.join_code} | Team: {team_name} | Landmark: {self.landmark_instance.landmark.name} | Tile ({self.tile.row}, {self.tile.column})"
