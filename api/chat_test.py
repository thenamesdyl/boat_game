#!/usr/bin/env python3
import os
import json
from dotenv import load_dotenv
from datetime import datetime
import random

# Load environment variables from .env file (if present)
load_dotenv()

# Import the models and database
from models import db, Player, Message
from flask import Flask

def setup_app():
    """Create a minimal Flask app to initialize the database connection"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///game.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def print_messages():
    """Print all messages from the database"""
    print("\n=== CHAT MESSAGES ===")
    messages = Message.query.order_by(Message.timestamp.desc()).limit(10).all()
    if not messages:
        print("No messages found in database.")
    else:
        print(f"Total messages: {Message.query.count()}")
        print(f"Latest 10 messages:")
        for message in messages:
            # Get sender info
            sender = Player.query.get(message.sender_id)
            sender_name = sender.name if sender else "Unknown"
            timestamp = message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            print(f"[{timestamp}] {sender_name}: {message.content}")
            print(f"  Type: {message.message_type}")
            print(f"  Sender ID: {message.sender_id}")
            print("-----")

def send_test_message():
    """Send a test message to the database"""
    print("\n=== SENDING TEST MESSAGE ===")
    
    # Get a random active player to use as sender
    player = Player.query.filter_by(active=True).first()
    if not player:
        print("No active players found for sending a message.")
        # Get any player
        player = Player.query.first()
        if not player:
            print("No players found at all. Cannot send a test message.")
            return None
    
    # Create a test message
    message_content = f"Test message from chat_test.py at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    message = Message(
        sender_id=player.id,
        content=message_content,
        message_type='global'
    )
    
    # Save to database
    db.session.add(message)
    db.session.commit()
    
    print(f"Message sent as: {player.name}")
    print(f"Content: {message_content}")
    
    return message

def print_player_info():
    """Print basic player information"""
    print("\n=== PLAYERS ===")
    players = Player.query.all()
    active_players = [p for p in players if p.active]
    
    print(f"Total players: {len(players)}")
    print(f"Active players: {len(active_players)}")
    
    if active_players:
        print("\nActive players:")
        for player in active_players:
            print(f"- {player.name} (ID: {player.id})")
    
    # Print a few player details for potential message sending
    if players:
        print("\nSample players for reference:")
        for player in players[:5]:  # Just show first 5
            print(f"ID: {player.id}, Name: {player.name}, Active: {player.active}")

if __name__ == "__main__":
    app = setup_app()
    with app.app_context():
        print("\n===== CHAT FEATURE TEST =====")
        print("\nCurrent database state:")
        
        # Print player info
        print_player_info()
        
        # Print existing messages
        print_messages()
        
        # Send a test message
        new_message = send_test_message()
        
        if new_message:
            print("\nVerifying message was added:")
            print_messages()
        
        print("\n===== TEST COMPLETE =====") 