from django.http import HttpResponse

def red_commander(request):
    return HttpResponse("Red Commander Page")

def blue_commander(request):
    return HttpResponse("Blue Commander Page")

def red_field(request):
    return HttpResponse("Red Field Page")

def blue_field(request):
    return HttpResponse("Blue Field Page")