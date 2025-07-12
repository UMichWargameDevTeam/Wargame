from django.http import HttpResponse, JsonResponse

def main_map(request):
    return JsonResponse({"message": "Hello from Django view!"})

def red_commander(request):
    return HttpResponse("Red Commander Page")

def blue_commander(request):
    return HttpResponse("Blue Commander Page")

def red_field(request):
    return HttpResponse("Red Field Page")

def blue_field(request):
    return HttpResponse("Blue Field Page")