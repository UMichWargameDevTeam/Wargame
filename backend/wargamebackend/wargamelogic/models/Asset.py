from django.db import models
import uuid

class Team(models.TextChoices):
    RED = "RED", "Red"
    BLUE = "BLUE", "Blue"
    NEUTRAL = "NEUTRAL", "Neutral"

class AssetType(models.TextChoices):
    # Aircraft
    CARGO_AIRCRAFT = "CARGO_AIRCRAFT", "Cargo Aircraft"
    C5 = "C5", "C-5 Galaxy"
    C17 = "C17", "C-17 Globemaster"
    BOMBER = "BOMBER", "Bomber"
    B2 = "B2", "B-2 Spirit"
    B52 = "B52", "B-52 Stratofortress"
    FIGHTER_AIRCRAFT = "FIGHTER_AIRCRAFT", "Fighter Aircraft"
    F35 = "F35", "F-35 Lightning II"
    F22 = "F22", "F-22 Raptor"
    F15 = "F15", "F-15 Eagle"
    MQ9 = "MQ9", "MQ-9 Reaper"
    REFUELING_AIRCRAFT = "REFUELING_AIRCRAFT", "Refueling Aircraft"
    K10 = "K10", "KC-10 Extender"
    KC135 = "KC135", "KC-135 Stratotanker"
    ISR_AIRCRAFT = "ISR_AIRCRAFT", "ISR Aircraft"
    E3 = "E3", "E-3 Sentry"
    U2 = "U2", "U-2 Dragon Lady"

    # Ground Forces
    FIELD_ARTILLERY = "FIELD_ARTILLERY", "Field Artillery"
    ARMOR = "ARMOR", "Armor"
    ENGINEER = "ENGINEER", "Engineer"
    AIR_DEFENSE_ARTILLERY = "AIR_DEFENSE_ARTILLERY", "Air Defense Artillery"
    SUPPORT = "SUPPORT", "Support"

    # Naval Assets
    USS_GERALD_R_FORD = "USS_GERALD_R_FORD", "USS Gerald R. Ford"
    F_A18E_F_SUPER_HORNET = "F_A18E_F_SUPER_HORNET", "F/A-18E/F Super Hornet"
    E_A18G_GROWLER = "E_A18G_GROWLER", "EA-18G Growler"
    F_35C_LIGHTNING_II = "F_35C_LIGHTNING_II", "F-35C Lightning II"
    ARLEIGH_BURKE_CLASS_DESTROYER = "ARLEIGH_BURKE_CLASS_DESTROYER", "Arleigh Burke-Class Destroyer"
    US_NAVY_ATTACK_SUBMARINE = "US_NAVY_ATTACK_SUBMARINE", "US Navy Attack Submarine"
    US_NAVY_NUCLEAR_BALLISTIC_SUBMARINE = "US_NAVY_NUCLEAR_BALLISTIC_SUBMARINE", "US Navy Nuclear Ballistic Submarine"
    MH_60R_SEAHAWK = "MH_60R_SEAHAWK", "MH-60R Seahawk"
    LHA_AMPHIBIOUS_ASSAULT_SHIP = "LHA_AMPHIBIOUS_ASSAULT_SHIP", "LHA Amphibious Assault Ship"


class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default="Unnamed")
    classification = models.CharField(max_length=50, choices=AssetType.choices)
    x_position = models.PositiveIntegerField()
    y_position = models.PositiveIntegerField()
    team = models.CharField(max_length=10, choices=Team.choices)

    class Meta:
        abstract = True
