from wargamelogic.models.Asset import Asset, AssetType

class Destroyer(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.DESTROYER
        super().save(*args, **kwargs)
