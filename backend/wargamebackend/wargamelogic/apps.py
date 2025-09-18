from django.apps import AppConfig


class WargamelogicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'wargamelogic'

    def ready(self):
        from wargamelogic.consumers import get_redis_client

        redis_client = get_redis_client()
        keys = redis_client.keys("game_*")

        if keys:
            redis_client.delete(*keys)

        print("Redis game_ keys cleared on startup")
