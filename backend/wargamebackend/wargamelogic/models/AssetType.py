from django.db import models
import uuid


class AssetType(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default="Unnamed")

    categorization = models.CharField(max_length=10) # air, sea, ground, etc
    speed_mph = models.PositiveIntegerField() # raw speed in mph. Stored as mph, converted after fetching
    supply_space = models.PositiveIntegerField() # standardized supply units capable of holding/transporting
    supply_cost = models.PositiveIntegerField() # supply points deducted for spawning asset

    armor_type = models.CharField(max_length=50) # light, medium, heavy, structure
    damage_type = models.CharField(max_length=50) # light, medium, heavy
    defense_mod = models.IntegerField() # positive or negative defense modifier (see Unit Stats doc)
    health = models.IntegerField() # Total health on spawn
    is_logi = models.BooleanField() # logi will have special multpipliers


    description = models.CharField(max_length= 2500)

    # we have a couple options for abilities: hardcode ability 1, 2, 3 or create a related table with a collection of all attacks