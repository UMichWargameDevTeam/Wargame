from django.contrib import admin
from .models.static import (
    Team,
    Role,
    Unit,
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
# Register your models here.
admin.site.register(Team)
admin.site.register(Role)
admin.site.register(Unit)
admin.site.register(Attack)
admin.site.register(Ability)
admin.site.register(Tile)
admin.site.register(Landmark)

admin.site.register(RoleInstance)
admin.site.register(UnitInstance)
admin.site.register(LandmarkInstance)
admin.site.register(LandmarkInstanceTile)
admin.site.register(GameInstance)

