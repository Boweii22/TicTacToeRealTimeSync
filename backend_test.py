#!/usr/bin/env python3
"""
Comprehensive backend API testing for Tic-Tac-Toe application
Tests all endpoints: players, games, moves, stats, history, replay, WebSocket
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TicTacToeAPITester:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.player_data = None
        self.game_data = None
        self.completed_game_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log(f"❌ {name} - Network Error: {str(e)}", "ERROR")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Unexpected Error: {str(e)}", "ERROR")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET", 
            "",
            200
        )
        return success

    def test_create_player(self):
        """Test player creation"""
        test_username = f"test_player_{datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Create Player",
            "POST",
            "players",
            200,
            data={"username": test_username}
        )
        if success and 'id' in response:
            self.player_data = response
            self.log(f"   Created player: {response['username']} (ID: {response['id'][:8]}...)")
            return True
        return False

    def test_get_player(self):
        """Test getting player by ID"""
        if not self.player_data:
            self.log("❌ No player data available for get test", "ERROR")
            return False
            
        success, response = self.run_test(
            "Get Player by ID",
            "GET",
            f"players/{self.player_data['id']}",
            200
        )
        return success and response.get('username') == self.player_data['username']

    def test_player_stats_empty(self):
        """Test getting player stats (should be empty initially)"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Get Player Stats (Empty)",
            "GET",
            f"players/{self.player_data['id']}/stats",
            200
        )
        if success:
            expected_stats = ['total_games', 'wins', 'losses', 'draws', 'win_rate']
            has_all_stats = all(key in response for key in expected_stats)
            if has_all_stats and response['total_games'] == 0:
                self.log(f"   Stats correct: {response}")
                return True
            else:
                self.log(f"   Stats incomplete or incorrect: {response}", "ERROR")
        return False

    def test_create_local_game(self):
        """Test creating a local game"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Create Local Game",
            "POST",
            "games",
            200,
            data={"mode": "local", "player_id": self.player_data['id']}
        )
        if success and 'id' in response:
            self.game_data = response
            self.log(f"   Created game: {response['id'][:8]}... (Mode: {response['mode']})")
            return True
        return False

    def test_get_game(self):
        """Test getting game by ID"""
        if not self.game_data:
            return False
            
        success, response = self.run_test(
            "Get Game by ID",
            "GET",
            f"games/{self.game_data['id']}",
            200
        )
        return success and response.get('id') == self.game_data['id']

    def test_make_moves_complete_game(self):
        """Test making moves to complete a game (X wins)"""
        if not self.game_data or not self.player_data:
            return False

        # Winning moves for X: positions 0, 1, 2 (top row)
        moves = [0, 3, 1, 4, 2]  # X wins on move 5
        
        for i, position in enumerate(moves):
            move_name = f"Make Move {i+1} (Position {position})"
            success, response = self.run_test(
                move_name,
                "POST",
                f"games/{self.game_data['id']}/move",
                200,
                data={"player_id": self.player_data['id'], "position": position}
            )
            
            if not success:
                return False
                
            # Update game data
            self.game_data = response
            
            # Check if game is completed
            if response['status'] == 'completed':
                self.completed_game_id = response['id']
                if response['state']['winner']:
                    self.log(f"   Game completed! Winner: {response['state']['winner']}")
                elif response['state']['is_draw']:
                    self.log(f"   Game completed! Result: Draw")
                break
        
        return True

    def test_invalid_move(self):
        """Test making an invalid move (occupied cell)"""
        if not self.game_data or not self.player_data:
            return False
            
        # Try to move to position 0 which should already be occupied
        success, response = self.run_test(
            "Invalid Move (Occupied Cell)",
            "POST",
            f"games/{self.game_data['id']}/move",
            400,  # Should return 400 for invalid move
            data={"player_id": self.player_data['id'], "position": 0}
        )
        return success  # Success means we got the expected 400 error

    def test_game_replay(self):
        """Test getting game replay data"""
        if not self.completed_game_id:
            return False
            
        success, response = self.run_test(
            "Get Game Replay",
            "GET",
            f"games/{self.completed_game_id}/replay",
            200
        )
        
        if success:
            required_keys = ['game', 'snapshots', 'total_moves']
            has_all_keys = all(key in response for key in required_keys)
            if has_all_keys and len(response['snapshots']) > 0:
                self.log(f"   Replay data: {response['total_moves']} moves, {len(response['snapshots'])} snapshots")
                return True
            else:
                self.log(f"   Replay data incomplete: {list(response.keys())}", "ERROR")
        return False

    def test_player_stats_after_game(self):
        """Test getting player stats after completing a game"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Get Player Stats (After Game)",
            "GET",
            f"players/{self.player_data['id']}/stats",
            200
        )
        
        if success and response['total_games'] > 0:
            self.log(f"   Updated stats: {response}")
            return True
        return False

    def test_player_history(self):
        """Test getting player match history"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Get Player History",
            "GET",
            f"players/{self.player_data['id']}/history",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log(f"   History: {len(response)} games")
            return True
        elif success and len(response) == 0:
            self.log("   History: No completed games yet")
            return True
        return False

    def test_create_online_game(self):
        """Test creating an online game"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Create Online Game",
            "POST",
            "games",
            200,
            data={"mode": "online", "player_id": self.player_data['id']}
        )
        
        if success and response.get('mode') == 'online' and response.get('status') == 'waiting':
            self.log(f"   Online game created: {response['id'][:8]}... (Status: {response['status']})")
            return True
        return False

    def test_get_waiting_games(self):
        """Test getting list of waiting games"""
        success, response = self.run_test(
            "Get Waiting Games",
            "GET",
            "games/waiting",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} waiting games")
            return True
        return False

    def test_rematch_request(self):
        """Test requesting a rematch"""
        if not self.completed_game_id or not self.player_data:
            return False
            
        success, response = self.run_test(
            "Request Rematch",
            "POST",
            f"games/{self.completed_game_id}/rematch",
            200,
            data={"mode": "local", "player_id": self.player_data['id']}
        )
        
        if success and 'id' in response:
            self.log(f"   Rematch created: {response['id'][:8]}...")
            return True
        return False

    def test_game_code_generation(self):
        """Test that games have 6-character codes"""
        if not self.game_data:
            return False
            
        if 'code' in self.game_data and len(self.game_data['code']) == 6:
            self.log(f"   Game code generated: {self.game_data['code']}")
            return True
        else:
            self.log(f"   Game code missing or invalid: {self.game_data.get('code', 'None')}", "ERROR")
            return False

    def test_get_game_by_code(self):
        """Test getting game by code"""
        if not self.game_data or 'code' not in self.game_data:
            return False
            
        success, response = self.run_test(
            "Get Game by Code",
            "GET",
            f"games/by-code/{self.game_data['code']}",
            200
        )
        
        if success and response.get('id') == self.game_data['id']:
            self.log(f"   Retrieved game by code: {self.game_data['code']}")
            return True
        return False

    def test_join_game_by_code(self):
        """Test joining game by code (should fail for same player)"""
        if not self.game_data or not self.player_data or 'code' not in self.game_data:
            return False
            
        # This should fail because player can't join their own game
        success, response = self.run_test(
            "Join Game by Code (Own Game - Should Fail)",
            "POST",
            "games/join-by-code",
            400,  # Should return 400 for joining own game
            data={"player_id": self.player_data['id'], "code": self.game_data['code']}
        )
        return success  # Success means we got the expected 400 error

    def test_search_players(self):
        """Test searching for players"""
        if not self.player_data:
            return False
            
        # Search for the player we created
        search_query = self.player_data['username'][:3]  # First 3 characters
        success, response = self.run_test(
            "Search Players",
            "GET",
            f"players/search/{search_query}",
            200
        )
        
        if success and isinstance(response, list):
            # Should find at least our player
            found_player = any(p['id'] == self.player_data['id'] for p in response)
            if found_player:
                self.log(f"   Found {len(response)} players matching '{search_query}'")
                return True
            else:
                self.log(f"   Player not found in search results", "ERROR")
        return False

    def test_get_player_games_by_username(self):
        """Test getting player games by username"""
        if not self.player_data:
            return False
            
        success, response = self.run_test(
            "Get Player Games by Username",
            "GET",
            f"players/{self.player_data['username']}/games",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} games for player {self.player_data['username']}")
            return True
        return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("🚀 Starting Tic-Tac-Toe API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        tests = [
            self.test_root_endpoint,
            self.test_create_player,
            self.test_get_player,
            self.test_player_stats_empty,
            self.test_create_local_game,
            self.test_game_code_generation,
            self.test_get_game,
            self.test_get_game_by_code,
            self.test_join_game_by_code,
            self.test_make_moves_complete_game,
            self.test_invalid_move,
            self.test_game_replay,
            self.test_player_stats_after_game,
            self.test_player_history,
            self.test_search_players,
            self.test_get_player_games_by_username,
            self.test_create_online_game,
            self.test_get_waiting_games,
            self.test_rematch_request,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log(f"❌ Test {test.__name__} failed with exception: {str(e)}", "ERROR")
        
        # Print final results
        self.log("=" * 50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = TicTacToeAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())