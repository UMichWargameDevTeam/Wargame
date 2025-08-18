from django.db import models
from django.core.exceptions import ValidationError

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Branch(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Role(models.Model):
    BRANCHES = [
        ("Army", "Army"),
        ("Air Force", "Air Force"),
        ("Navy", "Navy"),
    ]

    name = models.CharField(max_length=100, unique=True)
    branch = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.CASCADE)

    is_chief_of_staff = models.BooleanField(default=False)
    is_commander = models.BooleanField(default=False)
    is_vice_commander = models.BooleanField(default=False)

    is_operations = models.BooleanField(default=False)
    is_logistics = models.BooleanField(default=False)

    description = models.TextField()

    def clean(self):
        super().clean()

        # Enforce at most one of CoS / CC / CV
        role_flags = [self.is_chief_of_staff, self.is_commander, self.is_vice_commander]
        if sum(flag for flag in role_flags if flag) > 1:
            raise ValidationError("A role can only be one of: Chief of Staff, CC, CV.")

        # Enforce at most one of Ops / Log
        duty_flags = [self.is_operations, self.is_logistics]
        if sum(flag for flag in duty_flags if flag) > 1:
            raise ValidationError("A role can only be one of: Ops, Log.")

    def __str__(self):
        return self.name

class Unit(models.Model):
    DOMAINS = [
        ("Ground", "Ground"),
        ("Air", "Air"),
        ("Sea", "Sea"),
    ]
    DEFENDER_TYPES = [
        ("Light", "Light"),
        ("Medium", "Medium"),
        ("Heavy", "Heavy"),
        ("Structure", "Structure")
    ]

    name = models.CharField(max_length=100, unique=True)
    cost = models.FloatField()
    domain = models.CharField(max_length=20, choices=DOMAINS)
    is_logistic = models.BooleanField()
    type = models.CharField(max_length=20, choices=DEFENDER_TYPES)
    speed = models.FloatField()
    max_health = models.FloatField()
    max_supply_space = models.FloatField()
    defense_modifier = models.FloatField()
    description = models.TextField()

    # allows us to use Unit.branches.all()
    branches = models.ManyToManyField(Branch, through="UnitBranch")

    def __str__(self):
        return self.name

class UnitBranch(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["unit", "branch"], name="unique_unit_branch")
        ]

class Attack(models.Model):
    ATTACK_TYPES = [
        ("Light", "Light"),
        ("Medium", "Medium"),
        ("Heavy", "Heavy"),
        ("Structure", "Structure"),
    ]

    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='attacks')
    name = models.CharField(max_length=100)
    cost = models.FloatField()
    to_hit = models.FloatField()
    shots = models.IntegerField()
    min_damage = models.FloatField()
    max_damage = models.FloatField()
    range = models.FloatField()
    type = models.CharField(max_length=20, choices=ATTACK_TYPES)
    attack_modifier = models.FloatField()
    attack_modifier_applies_to = models.CharField(max_length=100)
    description = models.TextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["unit", "name"], name="unique_unit_attack_pair")
        ]

    def __str__(self):
        return f"{self.unit.name} - {self.name}"

class Ability(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='abilities')
    name = models.CharField(max_length=100)
    description = models.TextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["unit", "name"], name="unique_unit_ability_pair")
        ]

    def __str__(self):
        return f"{self.unit.name} - {self.name}"

class Landmark(models.Model):
    LANDMARK_TYPES = [
        ("City", "City"),
        ("Port", "Port"),
        ("Ground Base", "Ground Base"),
        ("Airfield", "Airfield"),
        ("Supply Node", "Supply Node"),
        ("Stockpile", "Stockpile"),
    ]

    name = models.CharField(max_length=100, choices=LANDMARK_TYPES, unique=True)
    max_victory_points = models.FloatField()
    can_repair = models.BooleanField()
    description = models.TextField()

    def __str__(self):
        return self.name

class Tile(models.Model):
    TERRAIN_TYPES = [
        ("Ocean", "Ocean"),
        ("Forest", "Forest"),
        ("Jungle/Swamp", "Jungle/Swamp"),
        ("Plains/Grasslands", "Plains/Grasslands"),
        ("Mountain", "Mountain"),
        ("Desert", "Desert"),
        ("Urban", "Urban"),
        ("Road", "Road"),
    ]

    row = models.IntegerField()
    column = models.IntegerField()
    terrain = models.CharField(max_length=30, choices=TERRAIN_TYPES)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["row", "column"], name="unique_row_column_pair")
        ]

    def __str__(self):
        return f"Tile ({self.row}, {self.column})"
