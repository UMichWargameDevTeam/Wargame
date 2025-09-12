from rest_framework import serializers
from django.contrib.auth.models import User
from wargamelogic.models.static import (
    Team, Branch, Role, Unit, UnitBranch, Attack, Ability, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)

# static model serializers

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'
        read_only_fields = ['id']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'
        read_only_fields = ['id']

class RoleSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['id']

class UnitSerializer(serializers.ModelSerializer):
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id', 'name', 'cost', 'domain', 'is_logistic', 'type', 'speed', 'max_health', 'max_supply_points', 'defense_modifier', 'icon', 'description', 
            'branches'
        ]
        read_only_fields = ['id']

class UnitBranchSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = UnitBranch
        fields = '__all__'
        read_only_fields = ['id']

class AttackSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    unit_id = serializers.PrimaryKeyRelatedField(
        source='unit',
        queryset=Unit.objects.all(),
        write_only=True
    )

    class Meta:
        model = Attack
        fields = [
            'id', 'unit', 'name', 'cost', 'to_hit', 'shots', 'min_damage', 'max_damage', 'range', 'type', 'attack_modifier', 'attack_modifier_applies_to', 'description',
            'unit_id'
        ]
        read_only_fields = ['id']

class AbilitySerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    unit_id = serializers.PrimaryKeyRelatedField(
        source='unit',
        queryset=Unit.objects.all(),
        write_only=True
    )

    class Meta:
        model = Ability
        fields = [
            'id', 'unit', 'name', 'description',
            'unit_id'
        ]
        read_only_fields = ['id']

class LandmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landmark
        fields = '__all__'
        read_only_fields = ['id']

class TileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tile
        fields = '__all__'
        read_only_fields = ['id']

# dynamic model serializers
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'is_staff']

class GameInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameInstance
        fields = '__all__'
        read_only_fields = ['id']

class TeamInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    game_instance_id = serializers.PrimaryKeyRelatedField(
        source='game_instance',
        queryset=GameInstance.objects.all(),
        write_only=True
    )
    team_id = serializers.PrimaryKeyRelatedField(
        source='team',
        queryset=Team.objects.all(),
        write_only=True
    )

    class Meta:
        model = TeamInstance
        fields = [
            'id', 'game_instance', 'team', 'victory_points',
            'game_instance_id', 'team_id'
        ]
        read_only_fields = ['id']

class RoleInstanceSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    team_instance = TeamInstanceSerializer(read_only=True)
    role = RoleSerializer(read_only=True)

    user_id = serializers.PrimaryKeyRelatedField(
        source='user',
        queryset=User.objects.all(),
        write_only=True
    )
    team_instance_id = serializers.PrimaryKeyRelatedField(
        source='team_instance',
        queryset=TeamInstance.objects.all(),
        write_only=True
    )
    role_id = serializers.PrimaryKeyRelatedField(
        source='role',
        queryset=Role.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = RoleInstance
        fields = [
            'id', 'user', 'team_instance', 'role', 'ready',
            'user_id', 'team_instance_id', 'role_id'
        ]
        read_only_fields = ['id']


class TeamInstanceRolePointsSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer(read_only=True)
    role = RoleSerializer(read_only=True)

    class Meta:
        model = TeamInstanceRolePoints
        fields = [
            'id', 'team_instance', 'role', 'supply_points'
        ]
        read_only_fields = ['id']
    

class UnitInstanceSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer(read_only=True)
    unit = UnitSerializer(read_only=True)
    tile = TileSerializer(read_only=True)

    row = serializers.IntegerField(write_only=True, required=False)
    column = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UnitInstance
        fields = [
            'id', 'team_instance', 'unit', 'tile', 'health', 'supply_points',
            'row', 'column'  # writable for PATCH
        ]
        read_only_fields = ['id']

class LandmarkInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer(read_only=True)
    team_instance = TeamInstanceSerializer(read_only=True, allow_null=True)
    landmark = LandmarkSerializer(read_only=True)

    game_instance_id = serializers.PrimaryKeyRelatedField(
        source='game_instance',
        queryset=GameInstance.objects.all(),
        write_only=True
    )
    team_instance_id = serializers.PrimaryKeyRelatedField(
        source='team_instance',
        queryset=TeamInstance.objects.all(),
        write_only=True
    )
    landmark_id = serializers.PrimaryKeyRelatedField(
        source='landmark',
        queryset=Landmark.objects.all(),
        write_only=True
    )

    class Meta:
        model = LandmarkInstance
        fields = [
            'id', 'game_instance', 'team_instance', 'landmark', 'victory_points',
            'game_instance_id', 'team_instance_id', 'landmark_id'
        ]
        read_only_fields = ['id']

class LandmarkInstanceTileSerializer(serializers.ModelSerializer):
    landmark_instance = LandmarkInstanceSerializer(read_only=True)
    tile = TileSerializer(read_only=True)

    landmark_instance_id = serializers.PrimaryKeyRelatedField(
        source='landmark_instance',
        queryset=Landmark.objects.all(),
        write_only=True
    )
    tile_id = serializers.PrimaryKeyRelatedField(
        source='tile',
        queryset=Tile.objects.all(),
        write_only=True
    )

    class Meta:
        model = LandmarkInstanceTile
        fields = [
            'id', 'landmark_instance', 'tile',
            'landmark_instance_id', 'tile_id'
        ]
        read_only_fields = ['id']
