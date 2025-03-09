from firebase_admin import firestore
from datetime import datetime
import time

# This will be initialized in app.py
db = None

# Simple timestamp serialization - just convert to string
def serialize_timestamp(value):
    """Convert any timestamp to a string representation"""
    if value is None:
        return None
    # Just convert to string, no fancy handling
    return str(value)

class Player:
    """Player model for Firestore"""
    collection_name = 'players'
    
    @staticmethod
    def collection():
        return db.collection(Player.collection_name)
    
    @staticmethod
    def to_dict(doc_snapshot):
        """Convert Firestore document to dictionary"""
        if not doc_snapshot.exists:
            return None
            
        data = doc_snapshot.to_dict()
        data['id'] = doc_snapshot.id
        
        # Just convert all potential timestamp fields to strings
        for field in ['created_at', 'updated_at', 'last_update']:
            if field in data:
                data[field] = serialize_timestamp(data[field])
                
        return data
    
    @staticmethod
    def get(player_id):
        """Get player by ID"""
        doc_ref = Player.collection().document(player_id)
        return Player.to_dict(doc_ref.get())
    
    @staticmethod
    def create(player_id, **data):
        """Create new player"""
        # Set defaults if not provided
        defaults = {
            'name': f'Sailor {player_id[:4]}',
            'color': {'r': 0.3, 'g': 0.6, 'b': 0.8},
            'position': {'x': 0, 'y': 0, 'z': 0},
            'rotation': 0,
            'mode': 'boat',
            'last_update': time.time(),  # Use simple timestamp
            'fishCount': 0,
            'monsterKills': 0,
            'money': 0,
            'active': True,
            'created_at': time.time()  # Use simple timestamp instead of SERVER_TIMESTAMP
        }
        
        # Update defaults with provided data
        player_data = {**defaults, **data}
        
        # Create the document
        doc_ref = Player.collection().document(player_id)
        doc_ref.set(player_data)
        
        # Return the created player
        return Player.get(player_id)
    
    @staticmethod
    def update(player_id, **updates):
        """Update player fields"""
        # Add updated_at timestamp
        updates['updated_at'] = time.time()  # Use simple timestamp
        
        doc_ref = Player.collection().document(player_id)
        doc_ref.update(updates)
        
        # Return updated player
        return Player.get(player_id)
    
    @staticmethod
    def delete(player_id):
        """Delete player"""
        Player.collection().document(player_id).delete()
    
    @staticmethod
    def get_all():
        """Get all players"""
        docs = Player.collection().stream()
        return [Player.to_dict(doc) for doc in docs]
    
    @staticmethod
    def get_active_players():
        """Get all active players"""
        docs = Player.collection().where('active', '==', True).stream()
        return [Player.to_dict(doc) for doc in docs]
    
    @staticmethod
    def get_leaderboard(category, limit=10):
        """
        Get the leaderboard for a specific category
        
        :param category: The category to get the leaderboard for ('fishCount', 'monsterKills', or 'money')
        :param limit: Maximum number of entries to return
        :return: List of players sorted by the specified category
        """
        print(f"Getting leaderboard for category: {category}")
        if category not in ['fishCount', 'monsterKills', 'money']:
            raise ValueError("Category must be 'fishCount', 'monsterKills', or 'money'")
        
        # Query active players sorted by the specified category
        docs = (Player.collection()
                .order_by(category, direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream())

        ret = [Player.to_dict(doc) for doc in docs]
        print(f"Leaderboard: {ret}")
        
        return ret
    
    @staticmethod
    def get_combined_leaderboard(limit=10):
        """
        Get leaderboards for all categories
        
        :param limit: Maximum number of entries to return per category
        :return: Dictionary containing leaderboards for each category
        """
        return {
            'fishCount': [
                {
                    'name': player['name'],
                    'value': player['fishCount'],
                    'color': player['color']
                } for player in Player.get_leaderboard('fishCount', limit)
            ],
            'monsterKills': [
                {
                    'name': player['name'],
                    'value': player['monsterKills'],
                    'color': player['color']
                } for player in Player.get_leaderboard('monsterKills', limit)
            ],
            'money': [
                {
                    'name': player['name'],
                    'value': player['money'],
                    'color': player['color']
                } for player in Player.get_leaderboard('money', limit)
            ]
        }


class Island:
    """Island model for Firestore"""
    collection_name = 'islands'
    
    @staticmethod
    def collection():
        return db.collection(Island.collection_name)
    
    @staticmethod
    def to_dict(doc_snapshot):
        """Convert Firestore document to dictionary"""
        if not doc_snapshot.exists:
            return None
            
        data = doc_snapshot.to_dict()
        data['id'] = doc_snapshot.id
        
        # Simple string conversion for timestamps
        for field in ['created_at', 'updated_at']:
            if field in data:
                data[field] = serialize_timestamp(data[field])
                
        return data
    
    @staticmethod
    def get(island_id):
        """Get island by ID"""
        doc_ref = Island.collection().document(island_id)
        return Island.to_dict(doc_ref.get())
    
    @staticmethod
    def create(island_id, **data):
        """Create new island"""
        # Set defaults if not provided
        defaults = {
            'position': {'x': 0, 'y': 0, 'z': 0},
            'radius': 50,
            'type': 'default',
            'created_at': time.time()  # Use simple timestamp
        }
        
        # Update defaults with provided data
        island_data = {**defaults, **data}
        
        # Create the document
        doc_ref = Island.collection().document(island_id)
        doc_ref.set(island_data)
        
        # Return the created island
        return Island.get(island_id)
    
    @staticmethod
    def update(island_id, **updates):
        """Update island fields"""
        # Add updated_at timestamp
        updates['updated_at'] = time.time()  # Use simple timestamp
        
        doc_ref = Island.collection().document(island_id)
        doc_ref.update(updates)
        
        # Return updated island
        return Island.get(island_id)
    
    @staticmethod
    def delete(island_id):
        """Delete island"""
        Island.collection().document(island_id).delete()
    
    @staticmethod
    def get_all():
        """Get all islands"""
        docs = Island.collection().stream()
        return [Island.to_dict(doc) for doc in docs]


class Message:
    """Message model for Firestore"""
    collection_name = 'messages'
    
    @staticmethod
    def collection():
        return db.collection(Message.collection_name)
    
    @staticmethod
    def to_dict(doc_snapshot):
        """Convert Firestore document to dictionary"""
        if not doc_snapshot.exists:
            return None
            
        data = doc_snapshot.to_dict()
        data['id'] = doc_snapshot.id
        
        # Simple string conversion for timestamp
        if 'timestamp' in data:
            data['timestamp'] = serialize_timestamp(data['timestamp'])
        
        return data
    
    @staticmethod
    def create(sender_id, content, message_type='global'):
        """Create new message"""
        # Create message data
        message_data = {
            'sender_id': sender_id,
            'content': content[:500],  # Limit message length
            'timestamp': time.time(),  # Use simple timestamp
            'message_type': message_type
        }
        
        # Create document with auto-generated ID
        doc_ref = Message.collection().document()
        doc_ref.set(message_data)
        
        # Get the created message
        created_message = Message.to_dict(doc_ref.get())
        
        # Also add sender info for convenience
        if created_message:
            sender = Player.get(sender_id)
            if sender:
                created_message['sender_name'] = sender.get('name', 'Unknown')
                created_message['sender_color'] = sender.get('color')
        
        return created_message
    
    @staticmethod
    def get(message_id):
        """Get message by ID"""
        doc_ref = Message.collection().document(message_id)
        message = Message.to_dict(doc_ref.get())
        
        # Add sender info
        if message:
            sender = Player.get(message['sender_id'])
            if sender:
                message['sender_name'] = sender.get('name', 'Unknown')
                message['sender_color'] = sender.get('color')
        
        return message
    
    @staticmethod
    def get_recent_messages(limit=50, message_type='global'):
        """
        Get recent messages of a specific type
        
        :param limit: Maximum number of messages to return
        :param message_type: Type of messages to retrieve ('global', 'team', etc.)
        :return: List of recent messages in chronological order
        """
        try:
            # Try the original query (will fail without index)
            docs = (Message.collection()
                    .where('message_type', '==', message_type)
                    .order_by('timestamp', direction=firestore.Query.DESCENDING)
                    .limit(limit)
                    .stream())
            
            # Convert to dictionaries
            messages = [Message.to_dict(doc) for doc in docs]
            
        except Exception as e:
            # Fallback: Get all messages of the specified type without ordering
            # Then sort them in memory (less efficient but works without index)
            print(f"Warning: Using fallback for message retrieval: {str(e)}")
            docs = Message.collection().where('message_type', '==', message_type).stream()
            messages = [Message.to_dict(doc) for doc in docs]
            
            # Sort by timestamp in memory
            messages.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            
            # Limit the results
            messages = messages[:limit]
        
        # Add sender information to each message
        for message in messages:
            sender = Player.get(message['sender_id'])
            if sender:
                message['sender_name'] = sender.get('name', 'Unknown')
                message['sender_color'] = sender.get('color')
            else:
                message['sender_name'] = 'Unknown'
                message['sender_color'] = {'r': 0.5, 'g': 0.5, 'b': 0.5}
        
        # Reverse to get chronological order
        messages.reverse()
        return messages

class Inventory:
    """Inventory model for Firestore - stores player's fish, treasures, and cargo"""
    collection_name = 'inventories'
    
    @staticmethod
    def collection():
        return db.collection(Inventory.collection_name)
    
    @staticmethod
    def to_dict(doc_snapshot):
        """Convert Firestore document to dictionary"""
        if not doc_snapshot.exists:
            return None
            
        data = doc_snapshot.to_dict()
        data['id'] = doc_snapshot.id
        
        # Simple string conversion for timestamps
        for field in ['created_at', 'updated_at']:
            if field in data:
                data[field] = serialize_timestamp(data[field])
                
        return data
    
    @staticmethod
    def get(player_id):
        """Get player's inventory by player ID"""
        doc_ref = Inventory.collection().document(player_id)
        inventory = Inventory.to_dict(doc_ref.get())
        
        # If inventory doesn't exist, create a default one
        if not inventory:
            return Inventory.create(player_id)
            
        return inventory
    
    @staticmethod
    def create(player_id):
        """Create new inventory for a player with default empty collections"""
        # Set defaults for a new inventory
        defaults = {
            'player_id': player_id,
            'fish': [],       # List of fish caught
            'treasures': [],  # List of treasures found
            'cargo': [],      # List of cargo/trade items
            'created_at': time.time()
        }
        
        # Create the document with player_id as the document ID
        doc_ref = Inventory.collection().document(player_id)
        doc_ref.set(defaults)
        
        # Return the created inventory
        return Inventory.to_dict(doc_ref.get())
    
    @staticmethod
    def update(player_id, **updates):
        """Update inventory fields"""
        # Add updated_at timestamp
        updates['updated_at'] = time.time()
        
        doc_ref = Inventory.collection().document(player_id)
        doc_ref.update(updates)
        
        # Return updated inventory
        return Inventory.get(player_id)
    
    @staticmethod
    def add_fish(player_id, fish_name, fish_data=None):
        """Add a fish to player's inventory"""
        # Get current inventory
        inventory = Inventory.get(player_id)
        
        # Create fish entry with timestamp
        fish_entry = {
            'name': fish_name,
            'caught_at': time.time(),
            'data': fish_data or {}
        }
        
        # Ensure fish array exists
        current_fish = inventory.get('fish', [])
        
        # Add new fish
        current_fish.append(fish_entry)
        
        # Update inventory
        return Inventory.update(player_id, fish=current_fish)
    
    @staticmethod
    def add_treasure(player_id, treasure_name, treasure_data=None):
        """Add a treasure to player's inventory"""
        # Get current inventory
        inventory = Inventory.get(player_id)
        
        # Create treasure entry with timestamp
        treasure_entry = {
            'name': treasure_name,
            'found_at': time.time(),
            'data': treasure_data or {}
        }
        
        # Ensure treasures array exists
        current_treasures = inventory.get('treasures', [])
        
        # Add new treasure
        current_treasures.append(treasure_entry)
        
        # Update inventory
        return Inventory.update(player_id, treasures=current_treasures)
    
    @staticmethod
    def add_cargo(player_id, cargo_name, cargo_data=None):
        """Add cargo item to player's inventory"""
        # Get current inventory
        inventory = Inventory.get(player_id)
        
        # Create cargo entry with timestamp
        cargo_entry = {
            'name': cargo_name,
            'acquired_at': time.time(),
            'data': cargo_data or {}
        }
        
        # Ensure cargo array exists
        current_cargo = inventory.get('cargo', [])
        
        # Add new cargo
        current_cargo.append(cargo_entry)
        
        # Update inventory
        return Inventory.update(player_id, cargo=current_cargo)
    
    @staticmethod
    def remove_item(player_id, item_type, item_index):
        """Remove an item from player's inventory by index"""
        # Get current inventory
        inventory = Inventory.get(player_id)
        
        # Validate item type
        if item_type not in ['fish', 'treasures', 'cargo']:
            raise ValueError("Item type must be 'fish', 'treasures', or 'cargo'")
        
        # Get current items of the specified type
        current_items = inventory.get(item_type, [])
        
        # Check if index is valid
        if item_index < 0 or item_index >= len(current_items):
            raise ValueError(f"Invalid index {item_index} for {item_type}")
        
        # Remove the item at the specified index
        removed_item = current_items.pop(item_index)
        
        # Update inventory
        update_data = {item_type: current_items}
        result = Inventory.update(player_id, **update_data)
        
        # Return the removed item and updated inventory
        return {'removed_item': removed_item, 'inventory': result}
    
    @staticmethod
    def get_all_player_inventories():
        """Get all player inventories"""
        docs = Inventory.collection().stream()
        return [Inventory.to_dict(doc) for doc in docs]
    
    @staticmethod
    def clear_inventory(player_id):
        """Clear a player's entire inventory"""
        empty_inventory = {
            'fish': [],
            'treasures': [],
            'cargo': [],
            'updated_at': time.time()
        }
        
        return Inventory.update(player_id, **empty_inventory)

# Initialize Firebase in your app.py file
def init_firestore(firestore_client):
    """Initialize the Firestore client for all models to use"""
    global db
    db = firestore_client 