import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import json
import logging
import time
from datetime import datetime
from models import db, Player, Island
from collections import defaultdict

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.ERROR) 

# Initialize Flask app and Socket.IO
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'ship_game_secret_key')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///game.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)  # Initialize db with app

# Set up Socket.IO
socketio = SocketIO(app, cors_allowed_origins=os.environ.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*'))

# Create database tables
with app.app_context():
    db.create_all()

# Keep a session cache for quick access
players = {}
islands = {}

# Add this near your other global variables
last_db_update = defaultdict(float)  # Track last database update time for each player
DB_UPDATE_INTERVAL = 5.0  # seconds between database updates

# Helper function to get or create a player
def get_or_create_player(player_id, **kwargs):
    try:
        player = Player.query.get(player_id)
        if not player:
            try:
                player = Player(id=player_id, **kwargs)
                db.session.add(player)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                # If the error was due to the player already existing (race condition),
                # try to get the player again
                if "unique constraint" in str(e).lower() or "duplicate key" in str(e).lower():
                    player = Player.query.get(player_id)
                    if not player:  # If still no player, re-raise the exception
                        logger.error(f"Failed to create or get player {player_id}: {e}")
                        raise
                else:
                    logger.error(f"Error creating player {player_id}: {e}")
                    raise
        
        # Update cache
        players[player_id] = player.to_dict()
        return player
    finally:
        db.session.close()

# Helper function to update a player
def update_player(player_id, **kwargs):
    player = Player.query.get(player_id)
    if player:
        for key, value in kwargs.items():
            setattr(player, key, value)
        db.session.commit()
        # Update cache
        players[player_id] = player.to_dict()
    return player

# Load players and islands from database on startup
def load_data_from_db():
    db_players = Player.query.all()
    for player in db_players:
        # Set all players to inactive on server start
        if player.active:
            player.active = False
            db.session.add(player)
        players[player.id] = player.to_dict()
    
    db.session.commit()
    
    db_islands = Island.query.all()
    for island in db_islands:
        islands[island.id] = island.to_dict()
    
    logger.info(f"Loaded {len(players)} players and {len(islands)} islands from database")

# Call the function during app startup
with app.app_context():
    load_data_from_db()

@socketio.on('player_join')
def handle_player_join(data):
    player_id = request.sid
    print(f"New player joined: {player_id}")
    print(f"Name: {data.get('name', 'Unknown')}")
    print(f"Color: {data.get('color')}")
    
    # Create new player entry with stats
    player_data = {
        'name': data.get('name', f'Sailor {len(players) + 1}'),
        'color': data.get('color', {'r': 0.3, 'g': 0.6, 'b': 0.8}),
        'position': data.get('position', {'x': 0, 'y': 0, 'z': 0}),
        'rotation': data.get('rotation', 0),
        'mode': data.get('mode', 'boat'),
        'last_update': time.time(),
        'fishCount': 0,
        'monsterKills': 0,
        'money': 0,
        'active': True  # Mark as active when they join
    }
    
    # Create and store in database
    get_or_create_player(player_id, **player_data)
    
    # Broadcast to all clients that a new player joined
    emit('player_joined', players[player_id], broadcast=True)
    
    # Send existing ACTIVE players to the new player
    for pid, player_data in players.items():
        if pid != player_id and player_data.get('active', True):  # Only send active players
            emit('player_joined', player_data)
    
    # Send current leaderboard data to the new player
    emit('leaderboard_update', get_leaderboard_data())

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle new client connections"""
    print(f"Client connected: {request.sid}")
    logger.info(f"Client connected: {request.sid}")
    emit('connection_response', {'status': 'connected', 'id': request.sid})
    
    # Send only active players to the newly connected client
    if players:
        active_players = [p for p in players.values() if p.get('active', False)]
        emit('all_players', active_players)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnections"""
    logger.info(f"Client disconnected: {request.sid}")
    if request.sid in players:
        # Mark player as inactive in database
        update_player(request.sid, active=False)
        
        # Notify other players about the disconnection
        emit('player_disconnected', {'id': request.sid}, broadcast=True)
        
        # No need to remove from memory cache as we want to preserve state
        players[request.sid]['active'] = False
        
        logger.info(f"Player {players[request.sid]['name']} marked as inactive")

@socketio.on('get_all_players')
def handle_get_all_players():
    """Send only active players to the requesting client (despite the name)"""
    active_players = [p for p in players.values() if p.get('active', False)]
    emit('all_players', active_players)
    logger.info(f"Sent {len(active_players)} active players to client")

@socketio.on('update_position')
def handle_position_update(data):
    """Handle player position updates"""
    player_id = request.sid
    current_time = time.time()
    
    # Update player data
    if player_id not in players:
        # New player - always save to database
        player_data = {
            'name': data.get('name', f'Player_{player_id[:5]}'),
            'color': data.get('color', {'r': 0.3, 'g': 0.6, 'b': 0.8}),
            'position': {
                'x': data.get('x', 0),
                'y': data.get('y', 0),
                'z': data.get('z', 0)
            },
            'rotation': data.get('rotation', 0),
            'mode': data.get('mode', 'boat'),
            'last_update': current_time,
            'fishCount': 0,
            'monsterKills': 0,
            'money': 0
        }
        get_or_create_player(player_id, **player_data)
        last_db_update[player_id] = current_time
        # Notify all clients about the new player
        emit('player_joined', players[player_id], broadcast=True)
    else:
        # Existing player - update position in memory
        position = players[player_id]['position'].copy()
        position['x'] = data.get('x', position['x'])
        position['y'] = data.get('y', position['y'])
        position['z'] = data.get('z', position['z'])
        
        # Update in-memory cache
        players[player_id]['position'] = position
        players[player_id]['rotation'] = data.get('rotation', players[player_id]['rotation'])
        players[player_id]['mode'] = data.get('mode', players[player_id]['mode'])
        players[player_id]['last_update'] = current_time
        
        # Update name and color if provided (in memory)
        if 'name' in data:
            players[player_id]['name'] = data['name']
        if 'color' in data:
            players[player_id]['color'] = data['color']
        
        # Only update database if 5+ seconds have passed since last update
        if current_time - last_db_update.get(player_id, 0) >= DB_UPDATE_INTERVAL:
            update_data = {
                'position': position,
                'rotation': players[player_id]['rotation'],
                'mode': players[player_id]['mode'],
                'last_update': current_time
            }
            
            # Include name and color if they were updated
            if 'name' in data:
                update_data['name'] = data['name']
            if 'color' in data:
                update_data['color'] = data['color']
                
            # Update database
            update_player(player_id, **update_data)
            last_db_update[player_id] = current_time
            logger.debug(f"Updated database for player {player_id}")
        
        # Broadcast the updated position to all other clients
        emit('player_moved', {
            'id': player_id,
            'position': players[player_id]['position'],
            'rotation': players[player_id]['rotation'],
            'mode': players[player_id]['mode'],
            'color': players[player_id]['color']
        }, broadcast=True)

@socketio.on('update_player_name')
def handle_name_update(data):
    """Handle player name updates"""
    player_id = request.sid
    if player_id in players and 'name' in data:
        players[player_id]['name'] = data['name']
        emit('player_updated', {'id': player_id, 'name': data['name']}, broadcast=True)

@socketio.on('update_player_color')
def handle_color_update(data):
    """Handle player color updates"""
    player_id = request.sid
    if player_id in players and 'color' in data:
        players[player_id]['color'] = data['color']
        emit('player_updated', {'id': player_id, 'color': data['color']}, broadcast=True)

@socketio.on('register_island')
def handle_island_registration(data):
    """Register a new island in the world"""
    island_id = data.get('id')
    if island_id and island_id not in islands:
        islands[island_id] = {
            'id': island_id,
            'position': {
                'x': data.get('x', 0),
                'y': data.get('y', 0),
                'z': data.get('z', 0)
            },
            'radius': data.get('radius', 50),
            'type': data.get('type', 'default')
        }
        logger.info(f"Registered island: {island_id}")
        emit('island_registered', islands[island_id])

# New event handler for updating player stats
@socketio.on('update_stats')
def handle_stats_update(data):
    print(f"Received stats update from {request.sid}")
    """Handle player stats updates"""
    player_id = request.sid
    if player_id not in players:
        return
    
    # Update stats if provided
    if 'fishCount' in data:
        players[player_id]['fishCount'] = data['fishCount']
    if 'monsterKills' in data:
        players[player_id]['monsterKills'] = data['monsterKills']
    if 'money' in data:
        players[player_id]['money'] = data['money']
    
    logger.info(f"Updated stats for player {players[player_id]['name']}: Fish: {players[player_id]['fishCount']}, Monsters: {players[player_id]['monsterKills']}, Money: {players[player_id]['money']}")
    
    # Broadcast updated leaderboard to all players
    socketio.emit('leaderboard_update', get_leaderboard_data(), broadcast=True)

# New event handler for getting leaderboard data
@socketio.on('get_leaderboard')
def handle_get_leaderboard():
    """Send leaderboard data to the requesting client"""
    logger.info(f"Sending leaderboard data to client")
    emit('leaderboard_update', get_leaderboard_data())

# Helper function to format leaderboard data
def get_leaderboard_data():
    """Format player data for leaderboards"""
    leaderboard_data = {
        'monsterKills': [],
        'fishCount': [],
        'money': []
    }
    
    for player_id, player in players.items():
        # Convert server color format to hex color for frontend
        color_hex = '#'
        if isinstance(player['color'], dict):
            r = int(player['color'].get('r', 0.3) * 255)
            g = int(player['color'].get('g', 0.6) * 255)
            b = int(player['color'].get('b', 0.8) * 255)
            color_hex = f'#{r:02x}{g:02x}{b:02x}'
        else:
            color_hex = '#4287f5'  # Default blue if color is not in expected format
        
        # Add to monster kills leaderboard
        leaderboard_data['monsterKills'].append({
            'name': player['name'],
            'value': player['monsterKills'],
            'color': color_hex
        })
        
        # Add to fish count leaderboard
        leaderboard_data['fishCount'].append({
            'name': player['name'],
            'value': player['fishCount'],
            'color': color_hex
        })
        
        # Add to money leaderboard
        leaderboard_data['money'].append({
            'name': player['name'],
            'value': player['money'],
            'color': color_hex
        })
    
    # Sort each leaderboard by value in descending order
    leaderboard_data['monsterKills'].sort(key=lambda x: x['value'], reverse=True)
    leaderboard_data['fishCount'].sort(key=lambda x: x['value'], reverse=True)
    leaderboard_data['money'].sort(key=lambda x: x['value'], reverse=True)
    
    return leaderboard_data

# REST API endpoints
@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all active players"""
    return jsonify(list(players.values()))

@app.route('/api/islands', methods=['GET'])
def get_islands():
    """Get all registered islands"""
    return jsonify(list(islands.values()))

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get server status"""
    return jsonify({
        'status': 'online',
        'players': len(players),
        'islands': len(islands),
        'timestamp': datetime.now().isoformat()
    })

# New REST API endpoint for getting leaderboard data
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    """Get current leaderboard data"""
    return jsonify(get_leaderboard_data())

# New REST API endpoint for updating player stats
@app.route('/api/stats/<player_id>', methods=['POST'])
def update_player_stats(player_id):
    """Update stats for a specific player"""
    if player_id not in players:
        return jsonify({'error': 'Player not found'}), 404
    
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update stats if provided
    if 'fishCount' in data:
        players[player_id]['fishCount'] = data['fishCount']
    if 'monsterKills' in data:
        players[player_id]['monsterKills'] = data['monsterKills']
    if 'money' in data:
        players[player_id]['money'] = data['money']
    
    logger.info(f"API: Updated stats for player {players[player_id]['name']}")
    
    # Broadcast updated leaderboard to all players
    socketio.emit('leaderboard_update', get_leaderboard_data())
    
    return jsonify({'success': True, 'player': players[player_id]})

# Increment stats endpoint - more convenient for individual updates
@app.route('/api/stats/<player_id>/increment', methods=['POST'])
def increment_player_stats(player_id):
    """Increment stats for a specific player"""
    if player_id not in players:
        return jsonify({'error': 'Player not found'}), 404
    
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update stats if provided
    if 'fishCount' in data:
        players[player_id]['fishCount'] += data['fishCount']
    if 'monsterKills' in data:
        players[player_id]['monsterKills'] += data['monsterKills']
    if 'money' in data:
        players[player_id]['money'] += data['money']
    
    logger.info(f"API: Incremented stats for player {players[player_id]['name']}")
    
    # Broadcast updated leaderboard to all players
    socketio.emit('leaderboard_update', get_leaderboard_data())
    
    return jsonify({'success': True, 'player': players[player_id]})

# Periodic cleanup of inactive players (could be moved to a background task)
def cleanup_inactive_players():
    """Remove players who haven't updated their position in a while"""
    current_time = time.time()
    inactive_threshold = 60  # seconds
    
    inactive_players = []
    for player_id, player_data in players.items():
        if current_time - player_data['last_update'] > inactive_threshold:
            inactive_players.append(player_id)
    
    for player_id in inactive_players:
        logger.info(f"Removing inactive player: {player_id}")
        del players[player_id]
        emit('player_disconnected', {'id': player_id})

# Add a new event handler for getting only active players
@socketio.on('get_active_players')
def handle_get_active_players():
    """Send only active players to the requesting client (same as get_all_players now)"""
    active_players = [p for p in players.values() if p.get('active', False)]
    emit('active_players', active_players)
    logger.info(f"Sent {len(active_players)} active players to client")

# New REST API endpoint for getting active players
@app.route('/api/players/active', methods=['GET'])
def get_active_players_api():
    """Get all currently active players"""
    active_players = [p for p in players.values() if p.get('active', False)]
    return jsonify(active_players)

if __name__ == '__main__':
    # Run the Socket.IO server with debug and reloader enabled
   #  socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=True) 
   socketio.run(app, host='0.0.0.0') 