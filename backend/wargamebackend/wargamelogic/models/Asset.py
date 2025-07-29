from django.db import models
from .AssetType import AssetType
import uuid

class Team(models.TextChoices):
    RED = "RED", "Red"
    BLUE = "BLUE", "Blue"
    NEUTRAL = "NEUTRAL", "Neutral"

class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    asset_type = models.ForeignKey(
        "AssetType",
        on_delete=models.CASCADE,
        to_field="id",
    )
    x_position = models.PositiveIntegerField()  
    y_position = models.PositiveIntegerField()
    team = models.CharField(max_length=10, choices=Team.choices)
    
    hitpoints = models.PositiveIntegerField() # current HP
    primary_ammo = models.IntegerField() # primary ammo
    secondary_ammo = models.IntegerField() # secondary attack ammo
    terciary_ammo = models.IntegerField() # terciary ammo (if applicable)
    
    supplies_count = models.IntegerField() # total supplies in possession by this asset (helpful for logis)