
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models.Aircraft import F18
from .models.LandVehicles import Bradley
from .models.Warships import Destroyer

from .serializers import F18Serializer, BradleySerializer, DestroyerSerializer

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
    f18s = F18Serializer(F18.objects.all(), many=True).data
    for f in f18s:
        f["type"] = "F18"

    bradleys = BradleySerializer(Bradley.objects.all(), many=True).data
    for b in bradleys:
        b["type"] = "Bradley"

    destroyers = DestroyerSerializer(Destroyer.objects.all(), many=True).data
    for d in destroyers:
        d["type"] = "Destroyer"

    all_assets = f18s + bradleys + destroyers

    return Response(all_assets)
