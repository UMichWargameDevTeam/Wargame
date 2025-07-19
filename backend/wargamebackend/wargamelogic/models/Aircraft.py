from wargamelogic.models.Asset import Asset, AssetType

class F18(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F18
        super().save(*args, **kwargs)