from rest_framework import serializers
from .models.static import Unit
from .models.dynamic import UnitInstance

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'

class UnitInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitInstance
        fields = '__all__'