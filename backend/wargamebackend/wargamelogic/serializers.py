from rest_framework import serializers
from .models.airforce import F18
from .models.ground import Bradley
from .models.navy import Destroyer

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
