from rest_framework import serializers
from .models import Asset  # import the base class
from django.db import models

def get_asset_serializer_map():
    serializer_map = {}

    for subclass in Asset.__subclasses__():
        # Create a serializer class dynamically for each subclass
        Meta = type("Meta", (), {
            "model": subclass,
            "fields": "__all__"
        })

        serializer_class = type(
            f"{subclass.__name__}Serializer",
            (serializers.ModelSerializer,),
            {"Meta": Meta}
        )

        serializer_map[subclass.__name__] = serializer_class

    return serializer_map
