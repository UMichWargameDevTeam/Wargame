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
    class Meta:
        model = Attack
        fields = '__all__'

class AbilitySerializer(serializers.ModelSerializer):
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
        fields = ['id', 'row', 'column', 'terrain']

# dynamic model serializers

class GameInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameInstance
        fields = ['id', 'join_code', 'created_at']

class TeamInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer()
    team = TeamSerializer()

    class Meta:
        model = TeamInstance
        fields = '__all__'

class RoleInstanceSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer()
    role = RoleSerializer()
    
    class Meta:
        model = RoleInstance
        fields = '__all__'

class UnitInstanceSerializer(serializers.ModelSerializer):
    team_instance = TeamInstanceSerializer()
    unit = UnitSerializer()
    tile = TileSerializer(read_only=True)  # Show tile details in GET
    row = serializers.IntegerField(write_only=True, required=False)
    column = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UnitInstance
        fields = [
            'id', 'unit', 'team', 'tile', 'health', 'supply_count',
            'row', 'column'  # writable for PATCH
        ]


class LandmarkInstanceSerializer(serializers.ModelSerializer):
    game_instance = GameInstanceSerializer()
    team_instance = TeamInstanceSerializer(allow_null=True, required=False)
    landmark = LandmarkSerializer()

    class Meta:
        model = LandmarkInstance
        fields = '__all__'


class LandmarkInstanceTileSerializer(serializers.ModelSerializer):
    landmark_instance = LandmarkInstanceSerializer()
    tile = TileSerializer()

    class Meta:
        model = LandmarkInstanceTile
        fields = '__all__'
