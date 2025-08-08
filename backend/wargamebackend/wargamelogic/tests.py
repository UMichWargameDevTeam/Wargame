from django.test import TestCase
from rest_framework.test import APIClient
from urllib.parse import quote
from django.contrib.auth.models import User
from .models.static import (
    Unit
)

class EndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')

        Unit.objects.create(
            name='B-2 Spirit',
            domain='Air',
            type='Heavy',
            speed=900.0,
            max_health=1000.0,
            max_supply_space=500.0,
            defense_modifier=1.2,
            description='Stealth bomber aircraft'
        )

    def test_get_units_endpoint(self):
        self.client.force_authenticate(user=self.user)
        unit_name = quote("B-2 Spirit")
        response = self.client.get(f'/api/units/{unit_name}/')
        print(response.json())
        self.assertEqual(response.status_code, 200)