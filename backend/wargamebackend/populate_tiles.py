import os
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wargamebackend.settings")
django.setup()

from wargamelogic.models import Tile

def wipe_tiles():
    Tile.objects.all().delete()

def populate_tiles():
    tiles_to_create = []
    for row in range(25):
        for column in range(40):
            tiles_to_create.append(Tile(row=row, column=column, terrain="Plains/Grasslands"))
    
    Tile.objects.bulk_create(tiles_to_create)
    print(f"Inserted {len(tiles_to_create)} tiles.")

if __name__ == "__main__":
    # warning: if you wipe tiles, you'll also delete all unit instances
    # and landmark instance tiles that were on/associated with those tiles.
    # wipe_tiles()
    populate_tiles()