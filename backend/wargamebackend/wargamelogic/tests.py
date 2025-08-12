from django.test import TestCase
from rest_framework import status
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

    def test_get_units(self):
        self.client.force_authenticate(user=self.user)
        unit_name = quote("B-2 Spirit")
        response = self.client.get(f'/api/units/{unit_name}/')
        # print(response.json())
        self.assertEqual(response.status_code, 200)
    
    def test_get_unit_instances_by_team_and_branch(self):
        url = f'/api/game-instances/{self.game_instance.join_code}/team-instances/{self.team.name}/branch/{self.unit.branch}/unit-instances/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        response_json = response.json()
        # print(response_json)
        self.assertEqual(response_json[0]['team_instance']['team']['name'], self.team.name)
        self.assertEqual(response_json[0]['unit']['branch'], self.unit.branch)


class PostEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')

        self.role = Role.objects.create(name='Gamemaster')
        self.team = Team.objects.create(name='USA')
        self.game_instance = GameInstance.objects.create(join_code='ABC123')
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=self.team,
            victory_points=0
        )

    def test_create_game_instance(self):
        self.client.force_authenticate(user=self.user)
        payload = {'join_code': 'NEW123'}
        response = self.client.post(
            '/api/game-instances/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        # print(response.json())
        self.assertEqual(response.status_code, 201)
        self.assertTrue(GameInstance.objects.filter(join_code='NEW123').exists())

    def test_register_role(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'join-code': self.game_instance.join_code,
            'team': self.team.name,
            'role': self.role.name
        }
        response = self.client.post(
            '/api/register_role/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        # print(response.json())
        self.assertEqual(response.status_code, 200)

        role_instance = RoleInstance.objects.filter(role=self.role, team_instance=self.team_instance).first()
        self.assertIsNotNone(role_instance)
        self.assertEqual(role_instance.user, self.user)


class RoleRequiredTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.overall_commander_role = Role.objects.create(
            name="Overall Commander",
            access_level="Strategic",
            description="Chooses how to divide supply points amongst the three branch commanders."
        )
        self.navy_commander_role = Role.objects.create(
            name="Navy Commander",
            access_level="Operational",
            description="Allocates the supply points given by the Overall Commander among the Navy operations and logistics teams."
        )

        self.overall_commander_user = User.objects.create_user(
            username="overall_user", password="testpass"
        )
        self.navy_commander_user = User.objects.create_user(
            username="navy_user", password="testpass"
        )
        self.random_user = User.objects.create_user(
            username="random_user", password="testpass"
        )

        self.game_instance = GameInstance.objects.create(join_code="GAME123")
        self.team = Team.objects.create(name="USA")
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=self.team,
            victory_points=0
        )

        RoleInstance.objects.create(
            team_instance=self.team_instance,
            role=self.overall_commander_role,
            user=self.overall_commander_user,
            supply_points=100
        )
        RoleInstance.objects.create(
            team_instance=self.team_instance,
            role=self.navy_commander_role,
            user=self.navy_commander_user,
            supply_points=0
        )

        self.unit = Unit.objects.create(
            name="B-2 Spirit",
            branch="Air Force",
            domain="Air",
            is_logistic=False,
            type="Heavy",
            speed=550,
            max_health=20,
            max_supply_space=4,
            defense_modifier=2,
            description="Stealth bomber aircraft"
        )
        self.tile = Tile.objects.create(row=0, column=0, terrain="Plains/Grasslands")
        UnitInstance.objects.create(
            team_instance=self.team_instance,
            unit=self.unit,
            tile=self.tile,
            health=20,
            supply_count=4
        )

        self.url = f"/api/game-instances/{self.game_instance.join_code}/team-instances/{self.team.name}/unit-instances/"
        self.register_role_url = "/api/register_role/"

    def test_invalid_join_code_returns_404(self):
        self.client.force_authenticate(user=self.overall_commander_user)
        bad_url = f"/api/game-instances/INVALIDCODE/team-instances/{self.team.name}/unit-instances/"
        response = self.client.get(bad_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_valid_join_code_but_no_role_instance_returns_403(self):
        self.client.force_authenticate(user=self.random_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_team_returns_403(self):
        other_team = Team.objects.create(name="Russia")
        TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=other_team,
            victory_points=0
        )
        self.client.force_authenticate(user=self.overall_commander_user)
        wrong_team_url = f"/api/game-instances/{self.game_instance.join_code}/team-instances/{other_team.name}/unit-instances/"
        response = self.client.get(wrong_team_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    

    def test_navy_commander_cannot_access(self):
        self.client.force_authenticate(user=self.navy_commander_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_impersonate_when_registering_role(self):
        # Remove the navy commander's existing role so the POST won't trigger duplicate constraint
        RoleInstance.objects.filter(user=self.navy_commander_user).delete()

        self.client.force_authenticate(user=self.navy_commander_user)
        payload = {
            "join-code": self.game_instance.join_code,
            "team": self.team.name,
            "role": self.overall_commander_role.name,
            "user": "overall_user"  # Ignored
        }
        response = self.client.post(
            self.register_role_url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ri = RoleInstance.objects.latest("id")
        self.assertEqual(ri.user, self.navy_commander_user)

    def test_overall_commander_can_access(self):
        self.client.force_authenticate(user=self.overall_commander_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
