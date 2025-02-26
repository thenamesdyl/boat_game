# Ship Game Backend

This is a Flask-based backend server with Socket.IO for the ship game. It tracks player positions and enables real-time communication between clients.

## Features

- Real-time player position tracking
- Player state management (boat/character mode)
- Island registration and tracking
- REST API endpoints for game state
- Automatic cleanup of inactive players

## Setup

1. Install Python 3.8+ if not already installed
2. Install the required dependencies:

```bash
cd api
pip install -r requirements.txt
```

3. Start the server:

```bash
python app.py
```

The server will run on `http://localhost:5000` by default.

## Socket.IO Events

### Client to Server

- `update_position`: Send player position updates
  ```javascript
  socket.emit('update_position', {
    x: 123.45,
    y: 0.5,
    z: 67.89,
    rotation: 1.57,
    mode: 'boat' // or 'character'
  });
  ```

- `update_player_name`: Update player name
  ```javascript
  socket.emit('update_player_name', {
    name: 'Captain Jack'
  });
  ```

- `register_island`: Register a new island
  ```javascript
  socket.emit('register_island', {
    id: 'island_123',
    x: 500,
    y: 0,
    z: 300,
    radius: 50,
    type: 'lighthouse'
  });
  ```

- `get_all_players`: Request the current list of all players
  ```javascript
  socket.emit('get_all_players');
  ```

### Server to Client

- `connection_response`: Sent when a client connects
- `player_joined`: Sent when a new player joins
- `player_moved`: Sent when a player moves
- `player_updated`: Sent when a player's data is updated
- `player_disconnected`: Sent when a player disconnects
- `island_registered`: Sent when a new island is registered
- `all_players`: Sent with the complete list of current players (automatically on connect or in response to `get_all_players`)

## REST API Endpoints

- `GET /api/players`: Get all active players
- `GET /api/islands`: Get all registered islands
- `GET /api/status`: Get server status

## Integration with the Game Client

To integrate this backend with your Three.js game client, you'll need to:

1. Add Socket.IO client to your frontend:
   ```html
   <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
   ```

2. Connect to the server:
   ```javascript
   const socket = io('http://localhost:5000');
   
   socket.on('connect', () => {
     console.log('Connected to server');
   });
   
   socket.on('connection_response', (data) => {
     console.log('Connection response:', data);
     // Store the player ID
     playerId = data.id;
   });
   
   // Handle receiving all current players
   socket.on('all_players', (players) => {
     players.forEach(playerData => {
       if (playerData.id !== playerId) {
         addOtherPlayerToScene(playerData);
       }
     });
   });
   ```

3. Send position updates in your animation loop:
   ```javascript
   // In your animate function
   socket.emit('update_position', {
     x: boat.position.x,
     y: boat.position.y,
     z: boat.position.z,
     rotation: boat.rotation.y,
     mode: playerState.mode
   });
   ```

4. Handle other players' movements:
   ```javascript
   socket.on('player_joined', (data) => {
     // Add new player to the scene
     addOtherPlayerToScene(data);
   });
   
   socket.on('player_moved', (data) => {
     // Update other player's position
     updateOtherPlayerPosition(data);
   });
   
   socket.on('player_disconnected', (data) => {
     // Remove player from the scene
     removeOtherPlayerFromScene(data.id);
   });
   ``` 