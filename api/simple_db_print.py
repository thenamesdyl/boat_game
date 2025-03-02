#!/usr/bin/env python3
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file (if present)
load_dotenv()

# Import the models and database
from models import db, Player, Island
from flask import Flask

def setup_app():
    """Create a minimal Flask app to initialize the database connection"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///game.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def print_all_data():
    """Print all data from the database in a simple format"""
    print("\n=== PLAYERS ===")
    players = Player.query.all()
    if not players:
        print("No players found in database.")
    else:
        print(f"Total players: {len(players)}")
        for player in players:
            print(f"\nPlayer ID: {player.id}")
            print(f"  Name: {player.name}")
            print(f"  Position: {json.dumps(player.position)}")
            print(f"  Color: {json.dumps(player.color)}")
            print(f"  Rotation: {player.rotation}")
            print(f"  Mode: {player.mode}")
            print(f"  Last Update: {player.last_update}")
            print(f"  Fish Count: {player.fishCount}")
            print(f"  Monster Kills: {player.monsterKills}")
            print(f"  Money: {player.money}")
            print(f"  Active: {player.active}")

    print("\n=== ISLANDS ===")
    islands = Island.query.all()
    if not islands:
        print("No islands found in database.")
    else:
        print(f"Total islands: {len(islands)}")
        for island in islands:
            print(f"\nIsland ID: {island.id}")
            print(f"  Position: {json.dumps(island.position)}")
            print(f"  Radius: {island.radius}")
            print(f"  Type: {island.type}")
    
    print("\n=== LEADERBOARDS ===")
    # Get leaderboard data for each category
    print("\n--- FISH COUNT LEADERBOARD ---")
    fish_leaders = Player.get_leaderboard('fishCount')
    if not fish_leaders:
        print("No fish count leaders found.")
    else:
        for i, player in enumerate(fish_leaders, 1):
            print(f"{i}. {player.name}: {player.fishCount} fish")
    
    print("\n--- MONSTER KILLS LEADERBOARD ---")
    monster_leaders = Player.get_leaderboard('monsterKills')
    if not monster_leaders:
        print("No monster kill leaders found.")
    else:
        for i, player in enumerate(monster_leaders, 1):
            print(f"{i}. {player.name}: {player.monsterKills} kills")
    
    print("\n--- MONEY LEADERBOARD ---")
    money_leaders = Player.get_leaderboard('money')
    if not money_leaders:
        print("No money leaders found.")
    else:
        for i, player in enumerate(money_leaders, 1):
            print(f"{i}. {player.name}: {player.money} coins")

if __name__ == "__main__":
    app = setup_app()
    with app.app_context():
        print_all_data() 