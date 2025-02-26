from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import json
import logging
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app and Socket.IO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ship_game_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store player data
players = {}
islands = {}

@socketio.on('player_join')
def handle_player_join(data):
    player_id = request.sid
    print(f"New player joined: {player_id}")
    print(f"Name: {data.get('name', 'Unknown')}")
    print(f"Color: {data.get('color')}")
    
    # Create new player entry
    players[player_id] = {
        'id': player_id,
        'name': data.get('name', f'Sailor {len(players) + 1}'),
        'color': data.get('color', {'r': 0.3, 'g': 0.6, 'b': 0.8}),
        'position': data.get('position', {'x': 0, 'y': 0, 'z': 0}),
        'rotation': data.get('rotation', 0),
        'mode': data.get('mode', 'boat'),
        'last_update': time.time()
    }
    
    # Broadcast to all clients that a new player joined
    emit('player_joined', players[player_id], broadcast=True)
    
    # Send existing players to the new player
    for pid, player_data in players.items():
        if pid != player_id:  # Don't send the player their own data
            emit('player_joined', player_data)

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle new client connections"""
    print(f"Client connected: {request.sid}")
    logger.info(f"Client connected: {request.sid}")
    emit('connection_response', {'status': 'connected', 'id': request.sid})
    
    # Send the current list of players to the newly connected client
    if players:
        emit('all_players', list(players.values()))

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnections"""
    logger.info(f"Client disconnected: {request.sid}")
    if request.sid in players:
        # Notify other players about the disconnection
        emit('player_disconnected', {'id': request.sid}, broadcast=True, include_self=False)
        # Remove player from the players dictionary
        del players[request.sid]

@socketio.on('get_all_players')
def handle_get_all_players():
    """Send all current players to the requesting client"""
    emit('all_players', list(players.values()))

@socketio.on('update_position')
def handle_position_update(data):
    """Handle player position updates"""
    player_id = request.sid
    print(f"Received position update from {player_id}")
    
    # Update player data
    if player_id not in players:
        # New player
        players[player_id] = {
            'id': player_id,
            'name': data.get('name', f'Player_{player_id[:5]}'),
            'color': data.get('color', {'r': 0.3, 'g': 0.6, 'b': 0.8}),
            'position': {
                'x': data.get('x', 0),
                'y': data.get('y', 0),
                'z': data.get('z', 0)
            },
            'rotation': data.get('rotation', 0),
            'mode': data.get('mode', 'boat'),
            'last_update': time.time()
        }
        # Notify all clients about the new player
        emit('player_joined', players[player_id], broadcast=True)
    else:
        print(f"Player {player_id} updated:")
        print(f"  Position: ({players[player_id]['position']['x']:.2f}, {players[player_id]['position']['y']:.2f}, {players[player_id]['position']['z']:.2f})")
        # Existing player - update position
        players[player_id]['position']['x'] = data.get('x', players[player_id]['position']['x'])
        players[player_id]['position']['y'] = data.get('y', players[player_id]['position']['y'])
        players[player_id]['position']['z'] = data.get('z', players[player_id]['position']['z'])
        players[player_id]['rotation'] = data.get('rotation', players[player_id]['rotation'])
        players[player_id]['mode'] = data.get('mode', players[player_id]['mode'])
        
        # Update name and color if provided
        if 'name' in data:
            players[player_id]['name'] = data['name']
        if 'color' in data:
            players[player_id]['color'] = data['color']
            
        players[player_id]['last_update'] = time.time()
        
        # Broadcast the updated position to all other clients
        emit('player_moved', {
            'id': player_id,
            'position': players[player_id]['position'],
            'rotation': players[player_id]['rotation'],
            'mode': players[player_id]['mode'],
            'color': players[player_id]['color']
        }, broadcast=True, include_self=False)

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
        emit('island_registered', islands[island_id], broadcast=True)

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
        emit('player_disconnected', {'id': player_id}, broadcast=True)

if __name__ == '__main__':
    # Run the Socket.IO server
    socketio.run(app, host='0.0.0.0', port=5001, debug=True) 