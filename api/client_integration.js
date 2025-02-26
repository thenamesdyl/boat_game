// Socket.IO Client Integration for Ship Game
// This file demonstrates how to integrate the Flask backend with the Three.js game

// Initialize Socket.IO connection
let socket;
let playerId;
let otherPlayers = new Map(); // Map to store other players' meshes

// Player name (can be customized)
let playerName = "Player_" + Math.floor(Math.random() * 1000);

// Connect to the Socket.IO server
function initializeSocketConnection() {
    // Connect to the server
    socket = io('http://localhost:5000');

    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('connection_response', (data) => {
        console.log('Connection response:', data);
        playerId = data.id;

        // Set player name
        socket.emit('update_player_name', { name: playerName });

        // Register existing islands
        registerIslands();
    });

    // Player events
    socket.on('player_joined', (data) => {
        console.log('New player joined:', data);
        if (data.id !== playerId) {
            addOtherPlayerToScene(data);
        }
    });

    socket.on('player_moved', (data) => {
        if (data.id !== playerId) {
            updateOtherPlayerPosition(data);
        }
    });

    socket.on('player_updated', (data) => {
        if (data.id !== playerId) {
            updateOtherPlayerInfo(data);
        }
    });

    socket.on('player_disconnected', (data) => {
        console.log('Player disconnected:', data);
        removeOtherPlayerFromScene(data.id);
    });

    // Island events
    socket.on('island_registered', (data) => {
        console.log('Island registered:', data);
        // You can use this to sync islands across clients if needed
    });
}

// Send player position updates
function updatePlayerPosition() {
    if (!socket || !playerId) return;

    // Get the active object (boat or character)
    const activeObject = playerState.mode === 'boat' ? boat : character;

    socket.emit('update_position', {
        x: activeObject.position.x,
        y: activeObject.position.y,
        z: activeObject.position.z,
        rotation: activeObject.rotation.y,
        mode: playerState.mode
    });
}

// Register islands with the server
function registerIslands() {
    if (!socket) return;

    // Register each island with the server
    islandColliders.forEach(collider => {
        socket.emit('register_island', {
            id: collider.id,
            x: collider.center.x,
            y: collider.center.y,
            z: collider.center.z,
            radius: collider.radius,
            type: activeIslands.get(collider.id)?.type || 'default'
        });
    });
}

// Add another player to the scene
function addOtherPlayerToScene(playerData) {
    // Skip if this player is already in the scene
    if (otherPlayers.has(playerData.id)) return;

    // Create a mesh for the other player
    let playerMesh;

    if (playerData.mode === 'boat') {
        // Create a boat mesh
        playerMesh = new THREE.Group();

        const hullGeometry = new THREE.BoxGeometry(2, 1, 4);
        const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x885533 });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.position.y = 0.5;
        playerMesh.add(hull);

        const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = 2;
        playerMesh.add(mast);
    } else {
        // Create a character mesh
        const characterGeometry = new THREE.BoxGeometry(1, 2, 1);
        const characterMaterial = new THREE.MeshPhongMaterial({ color: 0x2288cc });
        playerMesh = new THREE.Mesh(characterGeometry, characterMaterial);
    }

    // Add player name label
    const nameCanvas = document.createElement('canvas');
    const nameContext = nameCanvas.getContext('2d');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    nameContext.font = '24px Arial';
    nameContext.fillStyle = 'white';
    nameContext.textAlign = 'center';
    nameContext.fillText(playerData.name, 128, 32);

    const nameTexture = new THREE.CanvasTexture(nameCanvas);
    const nameMaterial = new THREE.SpriteMaterial({ map: nameTexture });
    const nameSprite = new THREE.Sprite(nameMaterial);
    nameSprite.position.y = 3;
    nameSprite.scale.set(5, 1.25, 1);
    playerMesh.add(nameSprite);

    // Position the player
    playerMesh.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    playerMesh.rotation.y = playerData.rotation;

    // Add to scene
    scene.add(playerMesh);

    // Store in otherPlayers map
    otherPlayers.set(playerData.id, {
        mesh: playerMesh,
        data: playerData,
        nameSprite: nameSprite
    });
}

// Update another player's position
function updateOtherPlayerPosition(playerData) {
    const player = otherPlayers.get(playerData.id);
    if (!player) return;

    // Check if mode has changed
    if (player.data.mode !== playerData.mode) {
        // Remove old mesh and create a new one with the correct mode
        removeOtherPlayerFromScene(playerData.id);
        addOtherPlayerToScene(playerData);
        return;
    }

    // Update position and rotation
    player.mesh.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    player.mesh.rotation.y = playerData.rotation;

    // Update stored data
    player.data = {
        ...player.data,
        position: playerData.position,
        rotation: playerData.rotation,
        mode: playerData.mode
    };
}

// Update another player's information (like name)
function updateOtherPlayerInfo(playerData) {
    const player = otherPlayers.get(playerData.id);
    if (!player) return;

    // Update name if provided
    if (playerData.name && player.data.name !== playerData.name) {
        player.data.name = playerData.name;

        // Update name sprite
        const nameCanvas = document.createElement('canvas');
        const nameContext = nameCanvas.getContext('2d');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        nameContext.font = '24px Arial';
        nameContext.fillStyle = 'white';
        nameContext.textAlign = 'center';
        nameContext.fillText(playerData.name, 128, 32);

        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        player.nameSprite.material.map = nameTexture;
        player.nameSprite.material.needsUpdate = true;
    }
}

// Remove another player from the scene
function removeOtherPlayerFromScene(playerId) {
    const player = otherPlayers.get(playerId);
    if (!player) return;

    // Remove from scene
    scene.remove(player.mesh);

    // Remove from map
    otherPlayers.delete(playerId);
}

// Set player name
function setPlayerName(name) {
    playerName = name;
    if (socket && playerId) {
        socket.emit('update_player_name', { name: playerName });
    }
}

// Integrate with the animation loop
// Add this to your existing animate function:
function animateWithNetworking() {
    // ... existing animation code ...

    // Send position updates to the server
    updatePlayerPosition();

    // ... rest of animation code ...
}

// Initialize networking when the game starts
// Call this after your scene is set up
// initializeSocketConnection();

// To change the player's name:
// setPlayerName('Captain Jack');

// To update the animation loop, modify your existing animate function to include:
// updatePlayerPosition(); 