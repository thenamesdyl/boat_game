import os
import sys
from dotenv import load_dotenv
from flask import Flask
from models import db, Player, Island

# Load environment variables
load_dotenv()

def reset_database():
    """Reset the database by dropping and recreating all tables."""
    app = Flask(__name__)
    
    # Configure database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///game.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        print("Database has been reset successfully!")

if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA in your database. Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        reset_database()
        print("Database reset complete.")
    else:
        print("Operation cancelled.") 