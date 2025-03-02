from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON

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