from django.db import models
from django.contrib.auth.models import User
from wargamelogic.models.static import (
    Team, Role, Unit, Landmark, Tile
)

class GameInstance(models.Model):
    join_code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_started = models.BooleanField(default=False)

    def __str__(self):
        """
        Return a human-readable identifier for this GameInstance.
        
        Returns:
            str: Formatted string "GameInstance: {join_code}" where `join_code` is the instance's join code.
        """
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
        """
        Return a human-readable identifier for the TeamInstance.
        
        Returns:
            str: Formatted string "GameInstance: {join_code} | Team: {team_name}" where
                 {join_code} is the related GameInstance.join_code and {team_name} is the related Team.name.
        """
        return f"GameInstance: {self.game_instance.join_code} | Team: {self.team.name}"

class RoleInstance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "team_instance"], name="unique_user_team_instance_pair")
        ]
    
    def __str__(self):
        """
        Return a human-readable identifier for this RoleInstance.
        
        The string includes the game join code, team name, role name, and username,
        formatted as: "GameInstance: {join_code} | Team: {team_name} | Role: {role_name} | User: {username}".
        
        Returns:
            str: Single-line representation for display and logging.
        """
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
        """
        Return a concise, human-readable representation of the instance.
        
        Produces a single-line string containing the game join code, team name, and role name to uniquely identify this relationship for logging and display.
        
        Returns:
            str: Formatted string "GameInstance: {join_code} | Team: {team_name} | Role: {role_name}".
        """
        return f"GameInstance: {self.team_instance.game_instance.join_code} | Team: {self.team_instance.team.name} | Role: {self.role.name}"

class UnitInstance(models.Model):
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    tile = models.ForeignKey(Tile, on_delete=models.CASCADE)
    health = models.FloatField()
    supply_points = models.FloatField()

    def __str__(self):
        """
        Return a concise human-readable identifier for the UnitInstance.
        
        The string includes the model instance id, the associated GameInstance join code, and the Team name (formatted as: "id: {id} | GameInstance: {join_code} | Team: {team_name}").
        """
        return f"id: {self.id} | GameInstance: {self.team_instance.game_instance.join_code} | Team: {self.team_instance.team.name}"

class LandmarkInstance(models.Model):
    # Here, game_instance is a foreign key since team_instance can be null
    game_instance = models.ForeignKey(GameInstance, on_delete=models.CASCADE)
    team_instance = models.ForeignKey(TeamInstance, on_delete=models.CASCADE, null=True)
    landmark = models.ForeignKey(Landmark, on_delete=models.CASCADE)
    victory_points = models.FloatField()

    def __str__(self):
        """
        Return a concise, human-readable string identifying this LandmarkInstanceTile.
        
        The string includes the model instance id, the related GameInstance join code, the associated Team name (or "No Team" when none), and the Landmark name. This is suitable for admin displays and logs where a short identifier for the tile-landmark association is needed.
        
        Returns:
            str: Formatted representation like "id: {id} | GameInstance: {join_code} | Team: {team_name} | Landmark: {landmark_name}"
        """
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
        """
        Return a human-readable description of this LandmarkInstanceTile.
        
        The string includes the game instance join code, the team name (or "No Team" if the landmark is not assigned to a team), the landmark name, and the tile coordinates as (row, column).
        """
        team_name = self.landmark_instance.team_instance.team.name if self.landmark_instance.team_instance else "No Team"
        return f"GameInstance: {self.landmark_instance.game_instance.join_code} | Team: {team_name} | Landmark: {self.landmark_instance.landmark.name} | Tile ({self.tile.row}, {self.tile.column})"
