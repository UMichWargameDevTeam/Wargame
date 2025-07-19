from wargamelogic.models.Asset import Asset, AssetType

class Bradley(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.BRADLEY
        super().save(*args, **kwargs)
