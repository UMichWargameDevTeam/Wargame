from django.db import models
import uuid

class Team(models.TextChoices):
    RED = "RED", "Red"
    BLUE = "BLUE", "Blue"
    NEUTRAL = "NEUTRAL", "Neutral"

class AssetType(models.TextChoices):
    BRADLEY = "BRADLEY", "Bradley"
    F18 = "F18", "F-18 Jet"
    DESTROYER = "DESTROYER", "Destroyer"
    INFANTRY = "INFANTRY", "Infantry Battalion"

class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default="Unnamed")
    classification = models.CharField(max_length=50, choices=AssetType.choices)
    x_position = models.PositiveIntegerField()
    y_position = models.PositiveIntegerField()
    team = models.CharField(max_length=10, choices=Team.choices)

    class Meta:
        abstract = True
