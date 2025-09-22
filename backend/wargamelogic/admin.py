from django.contrib import admin
from wargamelogic.models.static import (
    Team, Branch, Role, Unit, UnitBranch, Attack, Ability, Tile, Landmark,
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)


class TeamInstanceInline(admin.TabularInline):
    model = TeamInstance
    extra = 0
    fields = ('team', 'victory_points')
    readonly_fields = ('victory_points',)

class RoleInstanceInline(admin.TabularInline):
    model = RoleInstance
    extra = 0
    fields = ('user', 'role')
    autocomplete_fields = ('user', 'role')

class TeamInstanceRolePointsInline(admin.TabularInline):
    model = TeamInstanceRolePoints
    extra = 0
    fields = ('role', 'supply_points')
    autocomplete_fields = ('role',)

class UnitInstanceInline(admin.TabularInline):
    model = UnitInstance
    extra = 0
    fields = ('unit', 'tile', 'health', 'supply_points')
    autocomplete_fields = ('unit', 'tile')

class UnitBranchInline(admin.TabularInline):
    model = UnitBranch
    extra = 1

class AttackInline(admin.TabularInline):
    model = Attack
    extra = 1

class AbilityInline(admin.TabularInline):
    model = Ability
    extra = 1

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "branch", "is_chief_of_staff", "is_commander", "is_vice_commander", "is_operations",
                    "is_logistics", "description")
    search_fields = ("name", "branch__name")
    list_filter = ("branch", "is_chief_of_staff", "is_commander", "is_vice_commander", "is_operations", "is_logistics")

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    inlines = [UnitBranchInline, AttackInline, AbilityInline]
    list_display = ("name", "cost", "domain", "is_logistic", "type", "speed", "max_health", "max_supply_points",
                     "defense_modifier", "icon", "description")
    search_fields = ("name",)
    list_filter = ("domain", "type", "is_logistic")

@admin.register(Attack)
class AttackAdmin(admin.ModelAdmin):
    list_display = ("unit", "name", "cost", "to_hit", "shots", "min_damage", "max_damage", "range", "type",
                    "attack_modifier", "attack_modifier_applies_to", "description")
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
    list_display = ("name", "max_victory_points", "can_repair", "description")
    search_fields = ("name",)
    list_filter = ("can_repair",)

@admin.register(Tile)
class TileAdmin(admin.ModelAdmin):
    search_fields = ('row', 'column')

@admin.register(GameInstance)
class GameInstanceAdmin(admin.ModelAdmin):
    list_display = ('join_code', 'created_at', 'is_started', 'turn', 'turn_finish_time')
    list_filter = ('is_started', 'created_at')
    search_fields = ('join_code',)
    inlines = [TeamInstanceInline]

@admin.register(TeamInstance)
class TeamInstanceAdmin(admin.ModelAdmin):
    list_display = ('game_instance', 'team', 'victory_points')
    list_filter = ('game_instance', 'team')
    search_fields = ('team__name', 'game_instance__join_code')
    inlines = [RoleInstanceInline, TeamInstanceRolePointsInline, UnitInstanceInline]

@admin.register(RoleInstance)
class RoleInstanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'team_instance', 'role', 'ready')
    list_filter = ('team_instance__game_instance', 'role__branch', 'role', 'ready')
    search_fields = ('user__username', 'team_instance__team__name', 'role__name')
    autocomplete_fields = ('user', 'team_instance', 'role')

@admin.register(TeamInstanceRolePoints)
class TeamInstanceRolePointsAdmin(admin.ModelAdmin):
    list_display = ('team_instance', 'role', 'supply_points')
    list_filter = ('team_instance__game_instance', 'role__branch', 'role')
    search_fields = ('team_instance__team__name', 'role__name')
    autocomplete_fields = ('team_instance', 'role')

@admin.register(UnitInstance)
class UnitInstanceAdmin(admin.ModelAdmin):
    list_display = ('unit', 'team_instance', 'tile', 'health', 'supply_points')
    list_filter = ('team_instance__game_instance', 'unit', 'tile')
    search_fields = ('unit__name', 'team_instance__team__name', 'tile__row', 'tile__column')
    autocomplete_fields = ('team_instance', 'unit', 'tile')

admin.site.register(Team)
admin.site.register(Branch)
admin.site.register(UnitBranch)

admin.site.register(LandmarkInstance)
admin.site.register(LandmarkInstanceTile)
