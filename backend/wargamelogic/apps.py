from django.apps import AppConfig


class WargamelogicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'wargamelogic'

    def ready(self):
        from wargamelogic.consumers import get_redis_client


        try:
            redis_client = get_redis_client()
            redis_client.ping()

            redis_client.flushdb()
            print("Redis database cleared on startup")

        except Exception as e:
            print("Did not clear Redis keys because Redis isn't running: %s", e)
