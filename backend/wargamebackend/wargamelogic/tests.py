import json
from rest_framework import status
from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth.models import User
from urllib.parse import quote
from wargamelogic.models.static import (
    Team, Branch, Role, Unit, Attack, UnitBranch, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)

class GetEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

        self.game_instance = GameInstance.objects.create(join_code="ABC123")
        self.team = Team.objects.create(name="RED")
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=self.team,
        )
        self.branch = Branch.objects.create(name="Air Force")
        self.unit = Unit.objects.create(
            name='B-2 Spirit',
            cost=0,
            is_logistic=False,
            domain='Air',
            type='Heavy',
            speed=900.0,
            max_health=1000.0,
            max_supply_points=500.0,
            defense_modifier=1.2,
            description='Stealth bomber aircraft'
        )
        UnitBranch.objects.create(
            unit=self.unit,
            branch=self.branch
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
            supply_points=100.0
        )

        role = Role.objects.create(
            name="Gamemaster",
        )
        RoleInstance.objects.create(
            user=self.user,
            role=role,
            team_instance=self.team_instance,
        )

    def test_get_units(self):
        self.client.force_authenticate(user=self.user)
        unit_name = quote("B-2 Spirit")
        response = self.client.get(f"/api/units/{unit_name}/")
        self.assertEqual(response.status_code, 200)
    
    def test_get_unit_instances_by_team_and_branch(self):
        url = f"/api/game-instances/{self.game_instance.join_code}/team-instances/{self.team.name}/branch/{self.unit.branches.all()[0].name}/unit-instances/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        response_json = response.json()
        self.assertEqual(response_json[0]['team_instance']['team']['name'], self.team.name)
        self.assertEqual(
            response_json[0]['unit']['branches'][0]['name'],
            self.unit.branches.all()[0].name
        )

class PostEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')

        self.role = Role.objects.create(name='Gamemaster')
        self.team = Team.objects.create(name='USA')
        self.gamemaster_team = Team.objects.create(name='Gamemasters')
        self.game_instance = GameInstance.objects.create(join_code='ABC123')
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=self.team,
        )

    def test_create_game_instance(self):
        self.client.force_authenticate(user=self.user)
        payload = {'join_code': 'NEW123'}
        response = self.client.post(
            '/api/game-instances/create/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

    def test_create_role_instance(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'join_code': self.game_instance.join_code,
            'team_name': self.team.name,
            'role_name': self.role.name
        }
        response = self.client.post(
            '/api/role-instances/create/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        role_instance = RoleInstance.objects.filter(role=self.role, team_instance=self.team_instance).first()
        self.assertIsNotNone(role_instance)
        self.assertEqual(role_instance.user, self.user)

class RoleRequiredTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.navy_branch = Branch.objects.create(name="Navy")
        self.air_force_branch = Branch.objects.create(name="Air Force")

        self.combatant_commander_role = Role.objects.create(
            name="Combatant Commander",
            description="Chooses how to divide supply points amongst the three branch commanders."
        )
        self.navy_commander_role = Role.objects.create(
            name="Navy Commander",
            branch=self.navy_branch,
            is_chief_of_staff=True,
            description="Allocates the supply points given by the Combatant Commander among the Navy operations and logistics teams."
        )

        self.combatant_commander_user = User.objects.create_user(
            username="combatant_commander_user", password="testpass"
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
        )

        RoleInstance.objects.create(
            team_instance=self.team_instance,
            role=self.combatant_commander_role,
            user=self.combatant_commander_user,
        )
        RoleInstance.objects.create(
            team_instance=self.team_instance,
            role=self.navy_commander_role,
            user=self.navy_commander_user,
        )

        self.unit = Unit.objects.create(
            name="B-2 Spirit",
            cost=0,
            domain="Air",
            is_logistic=False,
            type="Heavy",
            speed=550,
            max_health=20,
            max_supply_points=4,
            defense_modifier=2,
            description="Stealth bomber aircraft"
        )
        UnitBranch.objects.create(
            unit=self.unit,
            branch=self.air_force_branch
        )
        self.tile = Tile.objects.create(row=0, column=0, terrain="Plains/Grasslands")
        UnitInstance.objects.create(
            team_instance=self.team_instance,
            unit=self.unit,
            tile=self.tile,
            health=20,
            supply_points=4
        )

        self.url = f"/api/game-instances/{self.game_instance.join_code}/team-instances/{self.team.name}/unit-instances/"
        self.create_role_instance_url = "/api/role-instances/create/"

    def test_invalid_join_code(self):
        self.client.force_authenticate(user=self.combatant_commander_user)
        bad_url = f"/api/game-instances/INVALIDCODE/team-instances/{self.team.name}/unit-instances/"
        response = self.client.get(bad_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valid_join_code_but_no_role_instance(self):
        self.client.force_authenticate(user=self.random_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_team(self):
        other_team = Team.objects.create(name="Russia")
        TeamInstance.objects.create(
            game_instance=self.game_instance,
            team=other_team,
        )
        self.client.force_authenticate(user=self.combatant_commander_user)
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
            "join_code": self.game_instance.join_code,
            "team_name": self.team.name,
            "role_name": self.combatant_commander_role.name,
            "user": "combatant_commander_user"  # Ignored
        }
        response = self.client.post(
            self.create_role_instance_url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ri = RoleInstance.objects.latest("id")
        self.assertEqual(ri.user, self.navy_commander_user)

    def test_combatant_commander_can_access(self):
        self.client.force_authenticate(user=self.combatant_commander_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)


class UseAttackQueryCountTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.gm_user = User.objects.create_user(username="gm", password="pass")
        self.ops_user = User.objects.create_user(username="ops", password="pass")

        # Core objects
        self.team = Team.objects.create(name="USA")
        self.branch = Branch.objects.create(name="Army")
        self.gm_role = Role.objects.create(name="Gamemaster")
        self.ops_role = Role.objects.create(
            name="Infantry Commander",
            branch=self.branch,
            is_operations=True,
        )
        self.tile = Tile.objects.create(row=0, column=0)

        self.game_instance = GameInstance.objects.create(join_code="TEST123")
        self.team_instance = TeamInstance.objects.create(
            game_instance=self.game_instance, team=self.team
        )

        # Assign GM role
        self.gm_role_instance = RoleInstance.objects.create(
            role=self.gm_role,
            team_instance=self.team_instance,
            user=self.gm_user,
        )

        # Assign non-GM ops role
        self.ops_role_instance = RoleInstance.objects.create(
            role=self.ops_role,
            team_instance=self.team_instance,
            user=self.ops_user
        )

        # Unit + attack
        self.unit = Unit.objects.create(
            name="Infantry",
            cost=0,
            domain="Ground",
            is_logistic=False,
            type="Light",
            max_health=20,
            max_supply_points=4,
            speed=30,
            defense_modifier=0,
            description="The Queen of the Battlefield."
        )
        self.unit_branch = UnitBranch.objects.create(
            unit=self.unit,
            branch=self.branch
        )

        self.attack = Attack.objects.create(
            unit=self.unit,
            name="Standard",
            cost=1,
            to_hit=3,
            shots=6,
            min_damage=1,
            max_damage=1,
            range=2,
            type="Light",
            attack_modifier=0,
            attack_modifier_applies_to="None"
        )

        self.unit_instance = UnitInstance.objects.create(
            unit=self.unit,
            team_instance=self.team_instance,
            tile=self.tile,
            health=self.unit.max_health,
            supply_points=self.unit.max_supply_points
        )

    def test_use_attack_query_count_gm(self):
        """GM should match first criteria; caching isn’t really tested here."""
        self.client.force_authenticate(self.gm_user)

        with self.assertNumQueries(4):
            resp = self.client.patch(
                f"/api/unit-instances/{self.unit_instance.pk}/attacks/{self.attack.name}/use/"
            )
            self.assertEqual(resp.status_code, 200)
            self.assertIn("attack_used", resp.json())

    def test_use_attack_query_count_ops(self):
        self.client.force_authenticate(self.ops_user)

        with self.assertNumQueries(6):
            resp = self.client.patch(
                f"/api/unit-instances/{self.unit_instance.pk}/attacks/{self.attack.name}/use/"
            )
            self.assertEqual(resp.status_code, 200)
            self.assertIn("attack_used", resp.json())

# ----------------------------
# ViewSet tests
# ----------------------------

class BaseInstanceViewSetTestCase(TestCase):
    """
    Builds one game with:
      - Teams: Gamemasters, RED, BLUE
      - Users: gm_user (Gamemaster), red_user (Player on RED), blue_user (Player on BLUE)
      - Unit: B-2 Spirit
      - UnitInstances: one for RED, one for BLUE
      - LandmarkInstance and a LandmarkInstanceTile
    """

    def setUp(self):
        self.client = APIClient()

        # Users
        self.gm_user = User.objects.create_user(username="gm_user", password="x")
        self.red_user = User.objects.create_user(username="red_user", password="x")
        self.blue_user = User.objects.create_user(username="blue_user", password="x")

        # Branches
        self.air_force_branch = Branch.objects.create(name="Air Force") 

        # Roles
        self.role_gm = Role.objects.create(name="Gamemaster")
        self.role_player = Role.objects.create(name="Player", branch=self.air_force_branch, is_operations=True)

        # Game & Teams
        self.game_instance = GameInstance.objects.create(join_code="GAME-1")

        self.team_gm = Team.objects.create(name="Gamemasters")
        self.team_red = Team.objects.create(name="RED")
        self.team_blue = Team.objects.create(name="BLUE")

        # TeamInstances
        self.ti_gm = TeamInstance.objects.create(
            game_instance=self.game_instance, team=self.team_gm
        )
        self.ti_red = TeamInstance.objects.create(
            game_instance=self.game_instance, team=self.team_red
        )
        self.ti_blue = TeamInstance.objects.create(
            game_instance=self.game_instance, team=self.team_blue
        )

        # RoleInstances=
        self.ri_gm = RoleInstance.objects.create(
            user=self.gm_user, team_instance=self.ti_gm, role=self.role_gm
        )
        self.ri_red = RoleInstance.objects.create(
            user=self.red_user, team_instance=self.ti_red, role=self.role_player
        )
        self.ri_blue = RoleInstance.objects.create(
            user=self.blue_user, team_instance=self.ti_blue, role=self.role_player
        )

        # Static Unit (exact shape you requested)
        self.unit = Unit.objects.create(
            name="B-2 Spirit",
            cost=0,
            domain="Air",
            is_logistic=False,
            type="Heavy",
            speed=550,
            max_health=20,
            max_supply_points=4,
            defense_modifier=2,
            description="Stealth bomber aircraft"
        )
        UnitBranch.objects.create(
            unit=self.unit,
            branch=self.air_force_branch
        )

        # Tiles
        self.tile_a = Tile.objects.create(row=0, column=0, terrain="Plains/Grasslands")
        self.tile_b = Tile.objects.create(row=1, column=1, terrain="Plains/Grasslands")
        Tile.objects.create(row=2, column=3, terrain="Plains/Grasslands")
        Tile.objects.create(row=5, column=6, terrain="Plains/Grasslands")

        # UnitInstances (one for each team)
        self.ui_red = UnitInstance.objects.create(
            team_instance=self.ti_red, unit=self.unit, tile=self.tile_a, health=20, supply_points=4
        )
        self.ui_blue = UnitInstance.objects.create(
            team_instance=self.ti_blue, unit=self.unit, tile=self.tile_b, health=20, supply_points=4
        )

        self.landmark = Landmark.objects.create(
            name="City",  # Must match one of LANDMARK_TYPES
            max_victory_points=100,
            can_repair=False,
            description="A big city"
        )

        self.landmark_instance = LandmarkInstance.objects.create(
            landmark=self.landmark,
            game_instance=self.game_instance,  # assuming self.game_instance exists
            team_instance=self.ti_red,       # or None if neutral
            victory_points=50
        )

        self.landmark_instance_tile = LandmarkInstanceTile.objects.create(
            landmark_instance=self.landmark_instance,
            tile=self.tile_a
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

# ----------------------------
# RoleInstanceViewSet tests
# ----------------------------
class RoleInstanceViewSetTests(BaseInstanceViewSetTestCase):
    # The following 3 tests are not testing an endpoint defined by the viewset.

    # A normal user can create a non-gamemaster role for themselves in any game that they don't already have a role.
    def test_create_role_success_for_normal_user(self):
        # Remove this user's existing role
        RoleInstance.objects.filter(
            team_instance__game_instance=self.game_instance,
            user=self.red_user
        ).delete()

        self.auth(self.red_user)
        url = "/api/role-instances/create/"
        data = {
            "join_code": self.game_instance.join_code,
            "team_name": self.team_red.name,
            "role_name": self.role_player.name
        }
        resp = self.client.post(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_create_gamemaster_denied_if_already_exists(self):
        # Remove this user's existing role
        RoleInstance.objects.filter(
            team_instance__game_instance=self.game_instance,
            user=self.blue_user
        ).delete()

        self.auth(self.blue_user)
        url = "/api/role-instances/create/"
        data = {
            "team_instance_id": self.ti_blue.id,
            "role_id": self.role_gm.id,
            "user_id": self.blue_user.id
        }
        resp = self.client.post(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Restore their original role for later tests
        RoleInstance.objects.create(
            team_instance=self.ti_blue,
            role=self.role_player,
            user=self.blue_user
        )

    def test_create_multiple_roles_for_same_user_in_same_game_denied(self):
        self.auth(self.red_user)
        url = "/api/role-instances/create/"
        data = {
            "team_instance_id": self.ti_red.id,
            "role_id": self.role_player.id,
            "user_id": self.red_user.id
        }
        resp = self.client.post(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_partial_update_denied_for_non_gm(self):
        # Only a Gamemaster (in same game) can PATCH/PUT RoleInstances
        self.auth(self.red_user)
        url = f"/api/role-instances/{self.ri_blue.id}/"
        resp = self.client.patch(url, data={}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_update_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = f"/api/role-instances/{self.ri_blue.id}/"
        # Empty payload is fine for permission test; serializer will no-op.
        resp = self.client.patch(url, data={}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_destroy_denied_for_non_owner_non_gm(self):
        # red_user trying to delete blue_user's RoleInstance -> forbidden
        self.auth(self.red_user)
        url = f"/api/role-instances/{self.ri_blue.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_allowed_for_gm(self):
        # GM can delete anyone's RoleInstance
        self.auth(self.gm_user)
        url = f"/api/role-instances/{self.ri_blue.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

# ----------------------------
# UnitInstanceViewSet tests
# ----------------------------
class UnitInstanceViewSetTests(BaseInstanceViewSetTestCase):
    
    def test_partial_update_unit_instance_permissions(self):
        # Underprivileged user (blue team)
        self.auth(self.blue_user)
        response = self.client.patch(f"/api/unit-instances/{self.ui_red.id}/move/tiles/2/3/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ui_red.refresh_from_db()
        # Ensure the position hasn't changed
        self.assertNotEqual(self.ui_red.tile.row, 2)
        self.assertNotEqual(self.ui_red.tile.column, 3)

        # Same team (red team)
        self.auth(self.red_user)
        response = self.client.patch(f"/api/unit-instances/{self.ui_red.id}/move/tiles/2/3/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ui_red.refresh_from_db()
        self.assertEqual(self.ui_red.tile.row, 2)
        self.assertEqual(self.ui_red.tile.column, 3)

        # Gamemaster
        self.auth(self.gm_user)
        response = self.client.patch(f"/api/unit-instances/{self.ui_red.id}/move/tiles/5/6/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ui_red.refresh_from_db()
        self.assertEqual(self.ui_red.tile.row, 5)
        self.assertEqual(self.ui_red.tile.column, 6)

    def test_destroy_unit_instance_permissions(self):
        # Underprivileged user (blue team)
        self.auth(self.blue_user)
        resp = self.client.delete(f"/api/unit-instances/{self.ui_red.id}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Same team (red team)
        self.auth(self.red_user)
        resp = self.client.delete(f"/api/unit-instances/{self.ui_red.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

        # Gamemaster
        self.auth(self.gm_user)
        resp = self.client.delete(f"/api/unit-instances/{self.ui_blue.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

# ----------------------------
# LandmarkInstanceViewSet tests
# ----------------------------
class LandmarkInstanceViewSetTests(BaseInstanceViewSetTestCase):

    def test_destroy_denied_for_non_gm(self):
        self.auth(self.red_user)
        url = f"/api/landmark-instances/{self.landmark_instance.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = f"/api/landmark-instances/{self.landmark_instance.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

# ------------------------------------
# LandmarkInstanceTileViewSet tests
# ------------------------------------
class LandmarkInstanceTileViewSetTests(BaseInstanceViewSetTestCase):

    def test_destroy_denied_for_non_gm(self):
        self.auth(self.red_user)
        url = f"/api/landmark-instance-tiles/{self.landmark_instance_tile.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = f"/api/landmark-instance-tiles/{self.landmark_instance_tile.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

# ----------------------------
# GameInstanceViewSet tests
# ----------------------------
class GameInstanceViewSetTests(BaseInstanceViewSetTestCase):

    def test_destroy_denied_for_non_gm(self):
        self.auth(self.red_user)
        url = f"/api/game-instances/{self.game_instance.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = f"/api/game-instances/{self.game_instance.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

# ----------------------------
# TeamInstanceViewSet tests
# ----------------------------
class TeamInstanceViewSetTests(BaseInstanceViewSetTestCase):

    def test_create_denied_for_non_gm(self):
        self.auth(self.red_user)
        url = "/api/team-instances/"
        data = {
            "game_instance_id": self.game_instance.id,
            "team_id": self.team_blue.id,
        }
        resp = self.client.post(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = "/api/team-instances/"

        new_team = Team.objects.create(name="Green Team")

        data = {
            "game_instance_id": self.game_instance.id,
            "team_id": new_team.id,
        }
        resp = self.client.post(url, data, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
       
    def test_destroy_denied_for_non_gm(self):
        self.auth(self.red_user)
        url = f"/api/team-instances/{self.ti_red.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_allowed_for_gm(self):
        self.auth(self.gm_user)
        url = f"/api/team-instances/{self.ti_red.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)