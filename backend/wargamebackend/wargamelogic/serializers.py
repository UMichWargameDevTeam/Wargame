from rest_framework import serializers
from .models.static import (
    Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from .models.dynamic import (
    RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile 
)

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
        fields = ['id', 'row', 'column']

class RoleInstanceSerializer(serializers.ModelSerializer):
    role = RoleSerializer()
    team = TeamSerializer()
    
    class Meta:
        model = RoleInstance
        fields = '__all__'


class UnitInstanceSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    tile = TileSerializer(read_only=True)
    tile_id = serializers.PrimaryKeyRelatedField(
        queryset=Tile.objects.all(),
        source="tile",
        write_only=True
    )

    class Meta:
        model = UnitInstance
        fields = '__all__'


class LandmarkInstanceSerializer(serializers.ModelSerializer):
    landmark = LandmarkSerializer()
    team = TeamSerializer()

    class Meta:
        model = LandmarkInstance
        fields = '__all__'


class LandmarkInstanceTileSerializer(serializers.ModelSerializer):
    landmark_instance = LandmarkInstanceSerializer()
    tile = TileSerializer()

    class Meta:
        model = LandmarkInstanceTile
        fields = '__all__'
