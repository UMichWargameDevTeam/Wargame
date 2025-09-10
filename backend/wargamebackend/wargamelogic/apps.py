from django.apps import AppConfig


class WargamelogicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'wargamelogic'

    def ready(self):
        """
        Clear Redis keys with the "game_*" prefix when the Django app starts.
        
        On application startup (AppConfig.ready), obtains a Redis client via wargamelogic.consumers.get_redis_client(), deletes any keys matching the "game_*" pattern, and prints a confirmation message. This has the side effect of removing game-related state from Redis; any exceptions raised by the import or Redis operations will propagate.
        """
        from wargamelogic.consumers import get_redis_client

        redis_client = get_redis_client()
        keys = redis_client.keys("game_*")
        if keys:
            redis_client.delete(*keys)
        print("Redis game_ keys cleared on startup")
