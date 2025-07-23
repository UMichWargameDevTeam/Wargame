from wargamelogic.models.asset import Asset, AssetType

class USSGeraldRFord(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.USS_GERALD_R_FORD
        super().save(*args, **kwargs)

class FA18EFSuperHornet(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F_A18E_F_SUPER_HORNET
        super().save(*args, **kwargs)

class EA18GGrowler(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.E_A18G_GROWLER
        super().save(*args, **kwargs)

class F35CLightningII(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F_35C_LIGHTNING_II
        super().save(*args, **kwargs)

class ArleighBurkeClassDestroyer(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.ARLEIGH_BURKE_CLASS_DESTROYER
        super().save(*args, **kwargs)

class USNavyAttackSubmarine(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.US_NAVY_ATTACK_SUBMARINE
        super().save(*args, **kwargs)

class USNavyNuclearBallisticSubmarine(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.US_NAVY_NUCLEAR_BALLISTIC_SUBMARINE
        super().save(*args, **kwargs)

class MH60RSeahawk(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.MH_60R_SEAHAWK
        super().save(*args, **kwargs)

class LHAAmphibiousAssaultShip(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.LHA_AMPHIBIOUS_ASSAULT_SHIP
        super().save(*args, **kwargs)
