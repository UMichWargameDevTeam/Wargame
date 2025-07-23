from wargamelogic.models.asset import Asset, AssetType

class Infantry(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.INFANTRY
        super().save(*args, **kwargs)

class FieldArtillery(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.FIELD_ARTILLERY
        super().save(*args, **kwargs)

class Armor(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.ARMOR
        super().save(*args, **kwargs)

class Engineer(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.ENGINEER
        super().save(*args, **kwargs)

class AirDefenseArtillery(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.AIR_DEFENSE_ARTILLERY
        super().save(*args, **kwargs)

class Support(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.SUPPORT
        super().save(*args, **kwargs)
