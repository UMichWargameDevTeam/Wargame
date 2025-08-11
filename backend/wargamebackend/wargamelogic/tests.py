from django.test import TestCase
from rest_framework.test import APIClient
from urllib.parse import quote
from django.contrib.auth.models import User
import json
from .models.static import (
    Team, Role, Unit, Tile
)
from .models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance
)

class GetEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

        self.game_instance = GameInstance.objects.create(
            join_code="ABC123"
        )
        self.team = Team.objects.create(
            name="RED"
        )
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=self.team,
            victory_points=0
        )
        self.unit = Unit.objects.create(
            name='B-2 Spirit',
            branch='Air Force',
            is_logistic=False,
            domain='Air',
            type='Heavy',
            speed=900.0,
            max_health=1000.0,
            max_supply_space=500.0,
            defense_modifier=1.2,
            description='Stealth bomber aircraft'
        )
        self.tile = Tile.objects.create(
            row=0,
            column=0,
            terrain='Plains/Grasslands'
        )
        self.unit_instance = UnitInstance.objects.create(
            team_instance=self.team_instance,
            unit=self.unit,
            tile=self.tile,
            health=1000.0,
            supply_count=100.0
        )

    def test_get_units_endpoint(self):
        self.client.force_authenticate(user=self.user)
        unit_name = quote("B-2 Spirit")
        response = self.client.get(f'/api/units/{unit_name}/')
        # print(response.json())
        self.assertEqual(response.status_code, 200)
    
    def test_get_unit_instances_by_team_and_branch(self):
        url = f'/api/game-instances/{self.game_instance.join_code}/team-instances/{self.team.name}/branch/{self.unit.branch}/unit-instances'
        response = self.client.get(url)
        response_json = response.json()
        # print(response_json)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_json[0]['team_instance']['team']['name'], self.team.name)
        self.assertEqual(response_json[0]['unit']['branch'], self.unit.branch)


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