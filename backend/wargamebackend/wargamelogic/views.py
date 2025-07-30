
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view

from wargamelogic.models.Asset import Asset
from wargamelogic.serializers import get_asset_serializer_map
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
    all_assets = []

    # Loop through all subclasses of Asset
    for subclass in Asset.__subclasses__():
        model_name = subclass.__name__
        serializer_class = get_asset_serializer_map().get(model_name)
        
        if serializer_class:
            instances = subclass.objects.all()
            serialized = serializer_class(instances, many=True).data
            for obj in serialized:
                obj["type"] = model_name
            all_assets.extend(serialized)

    return Response(all_assets)