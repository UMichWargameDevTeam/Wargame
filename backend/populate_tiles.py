import os
import django


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wargamebackend.settings")
django.setup()

from wargamelogic.models import Tile


def wipe_tiles():
    Tile.objects.all().delete()

def populate_tiles(num_rows: int, num_cols: int):
    tiles_to_create = []
    for row in range(num_rows):
        for column in range(num_cols):
            tiles_to_create.append(Tile(row=row, column=column, terrain="Plains/Grasslands"))

    Tile.objects.bulk_create(tiles_to_create)
    print(f"Inserted {len(tiles_to_create)} tiles.")

if __name__ == "__main__":
    # warning: if you wipe tiles, you'll also delete all unit instances
    # and landmark instance tiles that were on/associated with those tiles.
    wipe_tiles()

    try:
        num_rows = int(input("Enter the number of rows: "))
        num_cols = int(input("Enter the number of columns: "))

    except ValueError:
        print("Invalid input. Please enter integers.")
        exit(1)

    populate_tiles(num_rows, num_cols)
