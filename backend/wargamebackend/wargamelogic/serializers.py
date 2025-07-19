from rest_framework import serializers
from .models.Aircraft import F18
from .models.LandVehicles import Bradley
from .models.Warships import Destroyer

class F18Serializer(serializers.ModelSerializer):
    class Meta:
        model = F18
        fields = '__all__'

class BradleySerializer(serializers.ModelSerializer):
    class Meta:
        model = Bradley
        fields = '__all__'

class DestroyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destroyer
        fields = '__all__'
