import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
import json
import logging
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import firestore_models  # Import our new Firestore models
from collections import defaultdict
import mimetypes

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Ensure logs go to console/terminal
    ]
)
logger = logging.getLogger(__name__)

# Change Werkzeug logger level to ERROR to hide HTTP request logs
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.ERROR)  # Changed from INFO to ERROR to hide polling requests

# Set Firebase logging to a higher level to reduce token logging
firebase_logger = logging.getLogger('firebase_admin')
firebase_logger.setLevel(logging.WARNING)  # Changed from DEBUG to WARNING

# Initialize Flask app and Socket.IO
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'ship_game_secret_key')

# Initialize Firebase and Firestore (instead of SQLAlchemy)
firebase_cred_path = os.environ.get('FIREBASE_CREDENTIALS', 'firebasekey.json')
cred = credentials.Certificate(firebase_cred_path)
firebase_app = firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize our Firestore models with the Firestore client
firestore_models.init_firestore(db)

# Set up Socket.IO
socketio = SocketIO(app, cors_allowed_origins=os.environ.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*'))

# Keep a session cache for quick access
players = {}
islands = {}

# Add this near your other global variables
last_db_update = defaultdict(float)  # Track last database update time for each player
DB_UPDATE_INTERVAL = 0.2  # seconds between database updates
# Add new distance threshold constant and tracking dictionary
MIN_POSITION_UPDATE_DISTANCE = 1.5  # minimum distance in units to trigger a database update
last_db_positions = {}  # Track last database position for each player

# Add this near your other global variables (at the top of the file)
socket_to_user_map = {}

# Add these MIME type registrations after your existing imports
# Register GLB and GLTF MIME types
mimetypes.add_type('model/gltf-binary', '.glb')
mimetypes.add_type('model/gltf+json', '.gltf')

# Set up the static file directory path
STATIC_FILES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(STATIC_FILES_DIR, exist_ok=True)

# Load data from Firestore on startup
def load_data_from_firestore():
    # Load players
    db_players = firestore_models.Player.get_all()
    for player in db_players:
        # Set all players to inactive on server start
        if player.get('active', False):
            firestore_models.Player.update(player['id'], active=False)
            player['active'] = False
        players[player['id']] = player
    
    # Load islands
    db_islands = firestore_models.Island.get_all()
    for island in db_islands:
        islands[island['id']] = island
    
    logger.info(f"Loaded {len(players)} players and {len(islands)} islands from Firestore")

# Call the function during app startup
load_data_from_firestore()

# Add this new function for token verification
def verify_firebase_token(token):
    """Verify Firebase token and return the UID if valid"""
    try:
        if not token:
            logger.warning("No token provided for verification")
            return None
            
        logger.info("Attempting to verify Firebase token")
        
        # Verify the token
        decoded_token = firebase_auth.verify_id_token(token)
        
        # Get user UID from the token
        uid = decoded_token['uid']
        logger.info(f"Successfully verified Firebase token for user: {uid}")
        return uid
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {e}")
        logger.exception("Token verification exception details:")  # This logs the full stack trace
        return None

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.error(f"Client disconnected: {request.sid}")
    
    # Look up the player ID from our mapping
    player_id = socket_to_user_map.pop(request.sid, None)
    logger.error(f'request.sid: {request.sid}')
    logger.error(f"Socket to user map: {socket_to_user_map}")

    logger.error(f"Player ID: {player_id}")
    logger.error(f"Players: {players}")
    
    # If this was a player, mark them as inactive
    if player_id and player_id in players:
        # Update player in Firestore and cache
        firestore_models.Player.update(player_id, active=False, last_update=time.time())
        if player_id in players:
            players[player_id]['active'] = False
            
            # Broadcast that the player disconnected
            emit('player_disconnected', {'id': player_id}, broadcast=True)
            logger.error(f"Player {player_id} marked as inactive after disconnect")

@socketio.on('player_join')
def handle_player_join(data):
    # Get the Firebase token and UID from the request
    firebase_token = data.get('firebaseToken')
    claimed_firebase_uid = data.get('player_id')

    logger.info(f"Firebase token: {firebase_token}")
    logger.info(f"Claimed Firebase UID: {claimed_firebase_uid}")
    
    # ONLY proceed with database storage if Firebase authentication is provided and valid
    if firebase_token and claimed_firebase_uid:
        verified_uid = verify_firebase_token(firebase_token)
        
        if verified_uid and verified_uid == claimed_firebase_uid:
            logger.info(f"Authentication successful for Firebase user: {verified_uid}")
            # Use the Firebase UID directly without the prefix
            player_id = verified_uid
            
            # Store player_id directly on request for simplicity
            request.player_id = player_id
            
            # Store in our socket-to-user mapping
            logger.info(f"Mapped socket {request.sid} to user {player_id}")
            
            # Now proceed with database operations
            docid = "firebase_" + player_id

            socket_to_user_map[request.sid] = docid
            
            # Get existing player from Firestore before sending connection response
            existing_player = firestore_models.Player.get(docid)
            
            # Send connection_response with the assigned player ID AND name if it exists
            connection_data = {
                'id': docid
            }
            
            # Add player name if they have one (already registered)
            if existing_player and 'name' in existing_player:
                connection_data['name'] = existing_player['name']
                logger.info(f"Player {docid} already has name: {existing_player['name']}")
            
            emit('connection_response', connection_data)
            
            if existing_player:
                # Update the existing player in database
                player_data = {
                    'active': True,
                    'last_update': time.time(),
                }
                
                # Update in Firestore
                firestore_models.Player.update(docid, **player_data)
                
                # Update cache
                players[docid] = {**existing_player, **player_data}
            else:
                # Create new player entry with stats
                player_data = {
                    'name': data.get('name', f'Sailor {player_id[:4]}'),
                    'color': data.get('color', {'r': 0.3, 'g': 0.6, 'b': 0.8}),
                    'position': data.get('position', {'x': 0, 'y': 0, 'z': 0}),
                    'rotation': data.get('rotation', 0),
                    'mode': data.get('mode', 'boat'),
                    'last_update': time.time(),
                    'fishCount': 0,
                    'monsterKills': 0,
                    'money': 0,
                    'active': True,  # Mark as active when they join
                    'firebase_uid': verified_uid
                }
                
                # Create player in Firestore and cache the result
                player = firestore_models.Player.create(docid, **player_data)
                players[docid] = player
            
            # Broadcast to all clients that a new player joined
            emit('player_joined', players[docid], broadcast=True)
        else:
            logger.warning(f"Firebase token verification failed. No data will be stored.")
            emit('auth_error', {'message': 'Authentication failed'})
            return
    else:
        logger.warning(f"No Firebase authentication provided. No data will be stored.")
        emit('auth_required', {'message': 'Firebase authentication required'})
        return
    
    # Send game data regardless of auth status (read-only operations)
    # Send existing ACTIVE players to the new player
    active_players = [p for p in players.values() if p.get('active', False)]
    emit('all_players', active_players)
    
    # Send all islands to the new player
    emit('all_islands', list(islands.values()))
    
    # Send recent messages to the new player
    recent_messages = firestore_models.Message.get_recent_messages(limit=20)
    emit('chat_history', recent_messages)
    
    # Send leaderboard data to the new player
    emit('leaderboard_update', firestore_models.Player.get_combined_leaderboard())

@socketio.on('update_position')
def handle_position_update(data):
    """
    Handle frequent position updates from client.
    Expects: { x, y, z, rotation, mode, player_id }
    """
    player_id = data.get('player_id')
    if not player_id:
        # Also check request if not explicitly provided
        player_id = data.get('player_id', None)
        if not player_id:
            logger.warning("Missing player ID in position update. Ignoring.")
            return
    

    # Extract individual position components
    x = data.get('x')
    y = data.get('y')
    z = data.get('z')
    rotation = data.get('rotation')
    mode = data.get('mode')
    
    # Validate required fields
    if x is None or z is None:  # y can be 0, so check None specifically
        logger.warning("Missing position data in update. Ignoring.")
        return
    
    # Ensure player exists in cache
    if player_id not in players:
        logger.warning(f"Player ID {player_id} not found in cache. Ignoring position update.")
        return
    
    current_time = time.time()
    
    # Construct position object for storage
    position = {
        'x': x,
        'y': y,
        'z': z
    }
    
    # Always update in-memory cache immediately for responsive gameplay
    players[player_id]['position'] = position
    if rotation is not None:
        players[player_id]['rotation'] = rotation
    if mode is not None:
        players[player_id]['mode'] = mode
    players[player_id]['last_update'] = current_time
    
    # Calculate distance from last stored database position (if available)
    should_update_db = False
    if player_id not in last_db_positions:
        # First time seeing this player, always update
        should_update_db = True
    else:
        # Calculate distance between current and last stored position
        last_pos = last_db_positions[player_id]
        dx = x - last_pos['x']
        dy = y - last_pos['y']
        dz = z - last_pos['z']
        distance = (dx*dx + dy*dy + dz*dz) ** 0.5  # Euclidean distance

        # logger.info(f"Distance between current and last stored position: {distance}")
        
        # Update if moved more than threshold distance
        if distance > MIN_POSITION_UPDATE_DISTANCE:
            should_update_db = True
    
    # Throttle database updates to reduce Firestore writes
    if current_time - last_db_update.get(player_id, 0) > DB_UPDATE_INTERVAL and should_update_db:
        last_db_update[player_id] = current_time
        last_db_positions[player_id] = position  # Update the last known DB position
        
        # Build update data with only necessary fields
        update_data = {
            'position': position,
            'last_update': current_time
        }
        if rotation is not None:
            update_data['rotation'] = rotation
        if mode is not None:
            update_data['mode'] = mode
        
        # Update in Firestore
        firestore_models.Player.update(player_id, **update_data)
        logger.debug(f"Updated player {player_id} position in Firestore (distance threshold)")
    
    # Broadcast to all other clients (not back to sender)
    emit_data = {
        'id': player_id,
        'position': position
    }
    if rotation is not None:
        emit_data['rotation'] = rotation
    if mode is not None:
        emit_data['mode'] = mode
        
    emit('player_moved', emit_data, broadcast=True, include_self=False)

@socketio.on('player_action')
def handle_player_action(data):
    # Get both action and type fields (to handle client inconsistencies)
    action_type = data.get('action') or data.get('type')
    
    # Simplified: Just use the player_id from the current request
    player_id = data.get('player_id')

    logger.info(f"Player action data: {data}, player_id: {player_id}")
    
    # Check if player_id is available and valid
    if not player_id or not player_id.startswith('firebase_'):
        logger.warning(f"Missing or invalid player ID. Ignoring action.")
        return
    
    # Ensure player exists
    if player_id not in players:
        logger.warning(f"Player ID {player_id} not found in cache. Ignoring action.")
        return
    
    if action_type == 'fish_caught':
        # Increment fish count
        if 'fishCount' not in players[player_id]:
            players[player_id]['fishCount'] = 0
        players[player_id]['fishCount'] += 1
        
        # Update player in Firestore
        firestore_models.Player.update(player_id, 
                                     fishCount=players[player_id]['fishCount'])
        
        # Broadcast achievement to all players
        emit('player_achievement', {
            'id': player_id,
            'name': players[player_id]['name'],
            'achievement': 'Caught a fish!',
            'fishCount': players[player_id]['fishCount']
        }, broadcast=True)
        
        # Update leaderboard
        emit('leaderboard_update', 
             firestore_models.Player.get_combined_leaderboard(), 
             broadcast=True)
    
    elif action_type == 'monster_killed':
        # Increment monster kills
        if 'monsterKills' not in players[player_id]:
            players[player_id]['monsterKills'] = 0
        players[player_id]['monsterKills'] += 1
        
        # Update player in Firestore
        firestore_models.Player.update(player_id, 
                                     monsterKills=players[player_id]['monsterKills'])
        
        # Broadcast achievement to all players
        emit('player_achievement', {
            'id': player_id,
            'name': players[player_id]['name'],
            'achievement': 'Defeated a sea monster!',
            'monsterKills': players[player_id]['monsterKills']
        }, broadcast=True)
        
        # Update leaderboard
        emit('leaderboard_update', 
             firestore_models.Player.get_combined_leaderboard(), 
             broadcast=True)
    
    elif action_type == 'money_earned':
        amount = data.get('amount', 0)
        
        # Add money
        if 'money' not in players[player_id]:
            players[player_id]['money'] = 0
        players[player_id]['money'] += amount
        
        # Update player in Firestore
        firestore_models.Player.update(player_id, 
                                     money=players[player_id]['money'])
        
        # Broadcast achievement to all players
        emit('player_achievement', {
            'id': player_id,
            'name': players[player_id]['name'],
            'achievement': f'Earned {amount} coins!',
            'money': players[player_id]['money']
        }, broadcast=True)
        
        # Update leaderboard
        emit('leaderboard_update', 
             firestore_models.Player.get_combined_leaderboard(), 
             broadcast=True)

@socketio.on('send_message')
def handle_chat_message(data):
    content = data.get('content', '').strip()
    
    # Validate message
    if not content or len(content) > 500:
        return
    
    # Simplified: Just use the player_id from the current request
    player_id = data.get('player_id', None)
    
    # Check if player_id is available and valid
    if not player_id or not player_id.startswith('firebase_'):
        logger.warning(f"Missing or invalid player ID. Ignoring chat message.")
        return
    
    # Create message in Firestore
    #message = firestore_models.Message.create(
    #    player_id,
    #    content,
    #    message_type='global'
    #)
    
    if message:
        # Broadcast message to all clients
        emit('new_message', message, broadcast=True)

@socketio.on('update_player_color')
def handle_update_player_color(data):
    """
    Update a player's color
    Expects: { player_id, color: {r, g, b} }
    """
    player_id = data.get('player_id')
    if not player_id:
        logger.warning("Missing player ID in color update. Ignoring.")
        return
    
    color = data.get('color')
    if not color:
        logger.warning("Missing color data in update. Ignoring.")
        return
    
    # Ensure player exists in cache
    if player_id not in players:
        logger.warning(f"Player ID {player_id} not found in cache. Ignoring color update.")
        return
    
    # Update in-memory cache
    players[player_id]['color'] = color
    
    # Update in Firestore directly with the data
    firestore_models.Player.update(player_id, color=color)
    logger.info(f"Updated player {player_id} color to {color}")
    
    # Broadcast to all other clients
    emit('player_updated', {
        'id': player_id,
        'color': color
    }, broadcast=True)

@socketio.on('update_player_name')
def handle_update_player_name(data):
    """
    Update a player's name
    Expects: { player_id, name }
    """
    player_id = data.get('player_id')
    if not player_id:
        logger.warning("Missing player ID in name update. Ignoring.")
        return
    
    name = data.get('name')
    if not name or not isinstance(name, str) or len(name) > 50:
        logger.warning("Invalid name in update. Ignoring.")
        return
    
    # Ensure player exists in cache
    if player_id not in players:
        logger.warning(f"Player ID {player_id} not found in cache. Ignoring name update.")
        return
    
    # Update in-memory cache
    players[player_id]['name'] = name
    
    # Update in Firestore directly
    firestore_models.Player.update(player_id, name=name)
    logger.info(f"Updated player {player_id} name to {name}")
    
    # Broadcast to all other clients
    emit('player_updated', {
        'id': player_id,
        'name': name
    }, broadcast=True)

# API endpoints
@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all active players"""
    active_players = [p for p in players.values() if p.get('active', False)]
    return jsonify(active_players)

@app.route('/api/players/<player_id>', methods=['GET'])
def get_player(player_id):
    """Get a specific player"""
    player = firestore_models.Player.get(player_id)
    if player:
        return jsonify(player)
    return jsonify({'error': 'Player not found'}), 404

@app.route('/api/islands', methods=['GET'])
def get_islands():
    """Get all islands"""
    return jsonify(list(islands.values()))

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get the combined leaderboard"""
    return jsonify(firestore_models.Player.get_combined_leaderboard())

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Get recent chat messages"""
    message_type = request.args.get('type', 'global')
    limit = int(request.args.get('limit', 50))
    messages = firestore_models.Message.get_recent_messages(limit=limit, message_type=message_type)
    return jsonify(messages)

@app.route('/api/admin/create_island', methods=['POST'])
def create_island():
    """Admin endpoint to create an island"""
    data = request.json
    
    # Basic validation
    if not data or 'position' not in data:
        return jsonify({'error': 'Invalid island data'}), 400
    
    # Generate island ID
    island_id = f"island_{int(time.time())}"
    
    # Create island in Firestore
    island = firestore_models.Island.create(island_id, **data)
    
    # Add to cache
    islands[island_id] = island
    
    # Broadcast to all clients
    socketio.emit('island_created', island)
    
    return jsonify(island)


if __name__ == '__main__':
    # Run the Socket.IO server with debug and reloader enabled
    socketio.run(app, host='0.0.0.0') 
    # socketio.run(app, host='0.0.0.0', port=5001, debug=True, use_reloader=True) 
