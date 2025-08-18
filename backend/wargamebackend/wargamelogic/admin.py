from django.contrib import admin
from .models.static import (
    Team,
    Branch,
    Role,
    Unit,
    UnitBranch,
    Attack,
    Ability,
    Branch,
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

# Register your models here.
class UnitBranchInline(admin.TabularInline):
    model = UnitBranch
    extra = 1

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    inlines = [UnitBranchInline]

admin.site.register(Team)
admin.site.register(Branch) 
admin.site.register(Role)
admin.site.register(UnitBranch)
admin.site.register(Attack)
admin.site.register(Ability)
admin.site.register(Landmark)
admin.site.register(Tile)

admin.site.register(RoleInstance)
admin.site.register(UnitInstance)
admin.site.register(LandmarkInstance)
admin.site.register(LandmarkInstanceTile)
admin.site.register(GameInstance)

