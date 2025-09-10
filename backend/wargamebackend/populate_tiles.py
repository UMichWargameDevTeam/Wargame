import os
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wargamebackend.settings")
django.setup()

from wargamelogic.models import Tile

def wipe_tiles():
    Tile.objects.all().delete()

def populate_tiles():
    """
    Create and insert a full game grid of Tile records into the database.
    
    This function constructs and bulk-inserts a rectangular grid of Tile instances covering 41 rows (0–40)
    and 81 columns (0–80), for a total of 3,321 tiles. Each tile is created with its row, column, and
    terrain set to "Plains/Grasslands". After insertion it prints the number of tiles inserted.
    
    Side effects:
    - Adds Tile rows to the database using bulk_create().
    """
    tiles_to_create = []
    for row in range(41):
        for column in range(81):
            tiles_to_create.append(Tile(row=row, column=column, terrain="Plains/Grasslands"))
    
    Tile.objects.bulk_create(tiles_to_create)
    print(f"Inserted {len(tiles_to_create)} tiles.")

if __name__ == "__main__":
    # warning: if you wipe tiles, you'll also delete all unit instances
    # and landmark instance tiles that were on/associated with those tiles.
    wipe_tiles()
    populate_tiles()