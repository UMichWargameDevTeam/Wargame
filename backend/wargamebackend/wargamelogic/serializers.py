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
        exclude = ['id']


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        exclude = ['id']


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        exclude = ['id']


class AttackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attack
        exclude = ['id']


class AbilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ability
        exclude = ['id']


class LandmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Landmark
        exclude = ['id']


class TileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tile
        fields = ['id', 'row', 'column', 'terrain']


class RoleInstanceSerializer(serializers.ModelSerializer):
    role = RoleSerializer()
    team = TeamSerializer()
    
    class Meta:
        model = RoleInstance
        exclude = ['id']


class UnitInstanceSerializer(serializers.ModelSerializer):
    tile = TileSerializer(read_only=True)  # Show tile details in GET
    row = serializers.IntegerField(write_only=True, required=False)
    column = serializers.IntegerField(write_only=True, required=False)
    team = TeamSerializer()
    unit = UnitSerializer()

    class Meta:
        model = UnitInstance
        fields = [
            'id', 'unit', 'team', 'tile', 'health', 'supply_count',
            'row', 'column'  # writable for PATCH
        ]


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
        exclude = ['id']
