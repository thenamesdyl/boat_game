#!/usr/bin/env python3
import os
import json
from dotenv import load_dotenv
from datetime import datetime

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

def print_chat_data():
    """Print all chat messages from the database in a readable format"""
    print("\n=== CHAT MESSAGES ===")
    
    # Get all message types in the database
    message_types = db.session.query(Message.message_type).distinct().all()
    message_types = [t[0] for t in message_types]
    
    if not message_types:
        print("No messages found in database.")
        return
    
    print(f"Message types found: {', '.join(message_types)}")
    
    # Print messages for each type
    for msg_type in message_types:
        print(f"\n--- {msg_type.upper()} MESSAGES ---")
        messages = Message.query.filter_by(message_type=msg_type).order_by(Message.timestamp.desc()).all()
        
        if not messages:
            print(f"No {msg_type} messages found.")
        else:
            print(f"Total {msg_type} messages: {len(messages)}")
            
            # Get a player name lookup dictionary
            player_ids = set(msg.sender_id for msg in messages)
            players = {p.id: p.name for p in Player.query.filter(Player.id.in_(player_ids)).all()}
            
            # Print each message with sender name
            for msg in messages:
                sender_name = players.get(msg.sender_id, f"Unknown ({msg.sender_id})")
                timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                print(f"\n[{timestamp}] {sender_name}:")
                print(f"  \"{msg.content}\"")
                if hasattr(msg, 'metadata') and msg.metadata:
                    try:
                        metadata = json.loads(msg.metadata)
                        print(f"  Metadata: {json.dumps(metadata, indent=2)}")
                    except:
                        print(f"  Metadata: {msg.metadata}")

    # Print statistics
    print("\n=== CHAT STATISTICS ===")
    total_messages = Message.query.count()
    print(f"Total messages in database: {total_messages}")
    
    # Get top chatters
    top_chatters = db.session.query(
        Message.sender_id, 
        db.func.count(Message.id).label('message_count')
    ).group_by(Message.sender_id).order_by(db.func.count(Message.id).desc()).limit(5).all()
    
    if top_chatters:
        print("\n--- TOP CHATTERS ---")
        for sender_id, count in top_chatters:
            sender_name = Player.query.get(sender_id).name if Player.query.get(sender_id) else f"Unknown ({sender_id})"
            print(f"{sender_name}: {count} messages")

if __name__ == "__main__":
    app = setup_app()
    with app.app_context():
        print_chat_data() 