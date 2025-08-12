from rest_framework import serializers
from .models.static import (
    Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from .models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)

# static model serializers

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'

class AttackSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    class Meta:
        model = Attack
        fields = '__all__'

class AbilitySerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    class Meta:
        model = Ability
        fields = '__all__'

class LandmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landmark
        fields = '__all__'

class TileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tile
        fields = '__all__'

# dynamic model serializers

class GameInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameInstance
        fields = '__all__'

class TeamInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer()
    team = TeamSerializer(read_only=True)

    class Meta:
        model = TeamInstance
        fields = '__all__'

class RoleInstanceSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer(read_only=True)
    role = RoleSerializer(read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = RoleInstance
        fields = '__all__'

class UnitInstanceSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer(read_only=True)
    unit = UnitSerializer(read_only=True)
    tile = TileSerializer(read_only=True)  # Show tile details in GET
    row = serializers.IntegerField(write_only=True, required=False)
    column = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UnitInstance
        fields = [
            'id', 'unit', 'team_instance', 'tile', 'health', 'supply_count',
            'row', 'column'  # writable for PATCH
        ]

class LandmarkInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer(read_only=True)
    team_instance = TeamInstanceSerializer(read_only=True, allow_null=True)
    landmark = LandmarkSerializer(read_only=True)

    class Meta:
        model = LandmarkInstance
        fields = '__all__'

class LandmarkInstanceTileSerializer(serializers.ModelSerializer):
    landmark_instance = LandmarkInstanceSerializer(read_only=True)
    tile = TileSerializer(read_only=True)

    class Meta:
        model = LandmarkInstanceTile
        fields = '__all__'
