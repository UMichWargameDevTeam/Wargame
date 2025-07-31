
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status

from .models.Asset import Asset
from .models.AssetType import AssetType

from .serializers import AssetSerializer
from .serializers import AssetTypeSerializer
import json

@csrf_exempt
def register_role(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            role = data.get('role')
            # TODO: Save this role to a database or session if needed
            print(f"[Backend] Role registered: {role}")
            return JsonResponse({'status': 'ok', 'role': role})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)

def main_map(request):
    return JsonResponse({"message": "Hello from Django view!"})

@api_view(['GET'])
def get_all_assets(request):
    assets = Asset.objects.all()
    return Response(AssetSerializer(assets, many=True).data)

@api_view(['GET'])
def get_asset_types(request):
    assets_types = AssetType.objects.all()
    return Response(AssetTypeSerializer(assets_types, many=True).data)


