from django.contrib import admin
from .models.static import (
    Team,
    Branch,
    Role,
    Unit,
    UnitBranch,
    Attack,
    Ability,
    Tile,
    Landmark,
)
from .models.dynamic import (
    RoleInstance,
    UnitInstance,
    LandmarkInstance,
    LandmarkInstanceTile,
    GameInstance
)


class UnitBranchInline(admin.TabularInline):
    model = UnitBranch
    extra = 1


class AttackInline(admin.TabularInline):
    model = Attack
    extra = 1


class AbilityInline(admin.TabularInline):
    model = Ability
    extra = 1


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    inlines = [UnitBranchInline, AttackInline, AbilityInline]
    list_display = (
        "name",
        "cost",
        "domain",
        "is_logistic",
        "type",
        "speed",
        "max_health",
        "max_supply_space",
        "defense_modifier",
        "description",
    )
    search_fields = ("name",)
    list_filter = ("domain", "type", "is_logistic")


@admin.register(Attack)
class AttackAdmin(admin.ModelAdmin):
    list_display = (
        "unit",
        "name",
        "cost",
        "to_hit",
        "shots",
        "min_damage",
        "max_damage",
        "range",
        "type",
        "attack_modifier",
        "attack_modifier_applies_to",
        "description",
    )
    search_fields = ("name", "unit__name")
    list_filter = ("type",)


@admin.register(Ability)
class AbilityAdmin(admin.ModelAdmin):
    list_display = (
        "unit",
        "name",
        "description",
    )
    search_fields = ("name", "unit__name")


@admin.register(Landmark)
class LandmarkAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "max_victory_points",
        "can_repair",
        "description",
    )
    search_fields = ("name",)
    list_filter = ("can_repair",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "branch",
        "is_chief_of_staff",
        "is_commander",
        "is_vice_commander",
        "is_operations",
        "is_logistics",
        "description",
    )
    search_fields = ("name", "branch__name")
    list_filter = (
        "branch",
        "is_chief_of_staff",
        "is_commander",
        "is_vice_commander",
        "is_operations",
        "is_logistics",
    )


# keep the others simple
admin.site.register(Team)
admin.site.register(Branch)
admin.site.register(UnitBranch)
admin.site.register(Tile)

admin.site.register(RoleInstance)
admin.site.register(UnitInstance)
admin.site.register(LandmarkInstance)
admin.site.register(LandmarkInstanceTile)
admin.site.register(GameInstance)
