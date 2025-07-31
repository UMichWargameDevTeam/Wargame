from django.db import models
import uuid

class Classification(models.TextChoices):
    LAND = "LAND", "Land"
    SEA = "SEA", "Sea"
    AIR = "AIR", "Air"

class Armor(models.TextChoices):
    LIGHT = "LIGHT", "Light"
    MEDIUM = "MEDIUM", "Medium"
    HEAVY = "HEAVY", "Heavy"
    STRUCTURE = "STRUCTURE", "Structure"

class Damage(models.TextChoices):
    LIGHT = "LIGHT", "Light"
    MEDIUM = "MEDIUM", "Medium"
    HEAVY = "HEAVY", "Heavy"

class AssetType(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default="Unnamed")

    classification = models.CharField(max_length=10, choices=Classification.choices) # air, sea, ground, etc
    speed_mph = models.PositiveIntegerField() # raw speed in mph. Stored as mph, converted after fetching
    supply_space = models.PositiveIntegerField() # standardized supply units capable of holding/transporting
    supply_cost = models.PositiveIntegerField() # supply points deducted for spawning asset

    armor_type = models.CharField(max_length=50, choices=Armor.choices) # light, medium, heavy, structure
    damage_type = models.CharField(max_length=50, choices=Damage.choices) # light, medium, heavy
    defense_mod = models.IntegerField() # positive or negative defense modifier (see Unit Stats doc)
    health = models.IntegerField() # Total health on spawn
    is_logi = models.BooleanField() # logi will have special multpipliers
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    description = models.CharField(max_length= 2500)

    def __str__(self):
        return f"{self.name} ({self.id})"