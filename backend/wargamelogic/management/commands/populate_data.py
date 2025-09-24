# Read data from seed_data.json in the same directory, and populate the database.
# The seed data was obtained by running $ python3 manage.py dumpdata myapp.MyModel --indent 2 > seed_data.json
# for every static model in the production database

import os
import json
from django.conf import settings
from django.core.management.base import BaseCommand
from django.apps import apps
from wargamelogic.models import Tile


class Command(BaseCommand):
    help = "Seed database from seed_data.json and populate default tiles"

    def add_arguments(self, parser):
        parser.add_argument("filename", type=str, help="Path to seed data JSON")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            confirm = input("⚠️  DEBUG is False, so you may overwrite the production database. Proceed? [Y/n]: ").strip().lower()

            if confirm != "y":
                self.stdout.write(self.style.ERROR("Aborted. No changes made."))
                return

        filename = options["filename"]

        if os.path.exists(filename):
            with open(filename, "r") as f:
                data = json.load(f)

            for obj in data:
                model_label = obj["model"]
                pk = obj["pk"]
                fields = obj["fields"]

                Model = apps.get_model(model_label)

                for field_name, value in list(fields.items()):
                    if value is None:
                        continue

                    try:
                        field = Model._meta.get_field(field_name)

                    except Exception:
                        continue

                    if field.is_relation and not field.many_to_many:
                        rel_model = field.related_model
                        fields[field_name] = rel_model.objects.get(pk=value)

                instance, created = Model.objects.update_or_create(
                    pk=pk,
                    defaults=fields,
                )
                action = "Created" if created else "Updated"
                self.stdout.write(f"{action} {model_label} (id={pk})")
        else:
            self.stdout.write(self.style.WARNING(f"No seed_data.json found at {filename}"))

        self.populate_tiles(117, 81)

    def populate_tiles(self, num_rows: int, num_cols: int):
        tiles_to_create = []

        for row in range(num_rows):
            for column in range(num_cols):
                tiles_to_create.append(Tile(row=row, column=column, terrain="Plains/Grasslands"))

        Tile.objects.bulk_create(tiles_to_create, ignore_conflicts=True)
        self.stdout.write(f"Inserted tiles.")
