from django.test import TestCase
from rest_framework.test import APIClient
from urllib.parse import quote
from django.contrib.auth.models import User
import json
from .models.static import (
    Team, Role, Unit
)
from .models.dynamic import (
    GameInstance, TeamInstance, RoleInstance
)

class GetEndpointTests(TestCase):
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
        # print(response.json())
        self.assertEqual(response.status_code, 200)


class PostEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')

        # Create required objects for the test
        self.role = Role.objects.create(name='Navy Commander')
        self.team = Team.objects.create(name='USA')
        self.game_instance = GameInstance.objects.create(join_code='ABC123')
        self.team_instance = TeamInstance.objects.create(game_instance=self.game_instance, team=self.team, victory_points=0)

    def test_register_role_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'join-code': self.game_instance.join_code,
            'team': self.team.name,
            'role': self.role.name
        }
        response = self.client.post('/api/register_role/', data=json.dumps(payload), content_type='application/json')
        # print(response.json())
        self.assertEqual(response.status_code, 200)

        role_instance_exists = RoleInstance.objects.filter(role=self.role, team_instance=self.team_instance).exists()
        self.assertTrue(role_instance_exists)