from rest_framework import serializers
from .models.Asset import Asset
from .models.AssetType import AssetType
class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'

class AssetTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = '__all__'
