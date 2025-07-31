
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework import viewsets

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

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer

class AssetTypeViewSet(viewsets.ModelViewSet):
    queryset = AssetType.objects.all()
    serializer_class = AssetTypeSerializer


