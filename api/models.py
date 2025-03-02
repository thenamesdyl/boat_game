from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import func, desc, ForeignKey
from datetime import datetime

db = SQLAlchemy()

class Player(db.Model):
    __tablename__ = 'players'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(JSON, nullable=False)
    position = db.Column(JSON, nullable=False)
    rotation = db.Column(db.Float, default=0)
    mode = db.Column(db.String(20), default='boat')
    last_update = db.Column(db.Float, nullable=False)
    fishCount = db.Column(db.Integer, default=0)
    monsterKills = db.Column(db.Integer, default=0)
    money = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'position': self.position,
            'rotation': self.rotation,
            'mode': self.mode,
            'last_update': self.last_update,
            'fishCount': self.fishCount,
            'monsterKills': self.monsterKills,
            'money': self.money,
            'active': self.active
        }
    
    @classmethod
    def get_leaderboard(cls, category, limit=10):
        """
        Get the leaderboard for a specific category
        
        :param category: The category to get the leaderboard for ('fishCount', 'monsterKills', or 'money')
        :param limit: Maximum number of entries to return
        :return: List of players sorted by the specified category
        """
        if category not in ['fishCount', 'monsterKills', 'money']:
            raise ValueError("Category must be 'fishCount', 'monsterKills', or 'money'")
        
        # Query active players sorted by the specified category in descending order
        query = cls.query
        
        if category == 'fishCount':
            query = query.order_by(desc(cls.fishCount))
        elif category == 'monsterKills':
            query = query.order_by(desc(cls.monsterKills))
        elif category == 'money':
            query = query.order_by(desc(cls.money))
        
        return query.limit(limit).all()
    
    @classmethod
    def get_combined_leaderboard(cls, limit=10):
        """
        Get leaderboards for all categories
        
        :param limit: Maximum number of entries to return per category
        :return: Dictionary containing leaderboards for each category
        """
        return {
            'fishCount': [
                {
                    'name': player.name,
                    'value': player.fishCount,
                    'color': player.color
                } for player in cls.get_leaderboard('fishCount', limit)
            ],
            'monsterKills': [
                {
                    'name': player.name,
                    'value': player.monsterKills,
                    'color': player.color
                } for player in cls.get_leaderboard('monsterKills', limit)
            ],
            'money': [
                {
                    'name': player.name,
                    'value': player.money,
                    'color': player.color
                } for player in cls.get_leaderboard('money', limit)
            ]
        }

class Island(db.Model):
    __tablename__ = 'islands'
    
    id = db.Column(db.String(50), primary_key=True)
    position = db.Column(JSON, nullable=False)
    radius = db.Column(db.Float, default=50)
    type = db.Column(db.String(50), default='default')
    
    def to_dict(self):
        return {
            'id': self.id,
            'position': self.position,
            'radius': self.radius,
            'type': self.type
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.String(50), db.ForeignKey('players.id'), nullable=False)
    content = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    message_type = db.Column(db.String(20), default='global')
    
    # Relationship with Player
    sender = db.relationship('Player', backref=db.backref('messages', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else 'Unknown',
            'sender_color': self.sender.color,
            'content': self.content,
            'timestamp': self.timestamp.timestamp(),
            'message_type': self.message_type
        }
    
    @classmethod
    def get_recent_messages(cls, limit=50, message_type='global'):
        """
        Get recent messages of a specific type
        
        :param limit: Maximum number of messages to return
        :param message_type: Type of messages to retrieve ('global', 'team', etc.)
        :return: List of recent messages in chronological order
        """
        return (cls.query
                .filter_by(message_type=message_type)
                .order_by(cls.timestamp.desc())
                .limit(limit)
                .all()) 