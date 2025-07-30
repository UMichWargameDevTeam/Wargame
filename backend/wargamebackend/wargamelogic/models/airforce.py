from wargamelogic.models.Asset import Asset, AssetType

class CargoAircraft(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.CARGO_AIRCRAFT
        super().save(*args, **kwargs)

class C5(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.C5
        super().save(*args, **kwargs)

class C17(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.C17
        super().save(*args, **kwargs)

class Bomber(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.BOMBER
        super().save(*args, **kwargs)

class B2(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.B2
        super().save(*args, **kwargs)

class B52(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.B52
        super().save(*args, **kwargs)

class FighterAircraft(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.FIGHTER_AIRCRAFT
        super().save(*args, **kwargs)

class F35(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F35
        super().save(*args, **kwargs)

class F35(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F35
        super().save(*args, **kwargs)

class F22(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F22
        super().save(*args, **kwargs)

class F15(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.F15
        super().save(*args, **kwargs)

class MQ9(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.MQ9
        super().save(*args, **kwargs)

class RefuelingAircraft(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.REFUELING_AIRCRAFT
        super().save(*args, **kwargs)

class K10(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.K10
        super().save(*args, **kwargs)

class KC135(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.KC135
        super().save(*args, **kwargs)

class ISRAircraft(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.ISR_AIRCRAFT
        super().save(*args, **kwargs)

class E3(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.E3
        super().save(*args, **kwargs)

class U2(Asset):
    def save(self, *args, **kwargs):
        self.classification = AssetType.U2
        super().save(*args, **kwargs)
