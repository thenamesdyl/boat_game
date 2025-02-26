// network.js - Socket.IO integration for the ship game
import * as THREE from 'three';

// Network configuration
const SERVER_URL = 'http://boat-game-back.vercel.app';

// Network state
let socket;
let playerId;
let otherPlayers = new Map(); // Map to store other players' meshes
let isConnected = false;
let playerName = "Sailor_" + Math.floor(Math.random() * 1000);
let playerColor;

// Reference to scene and game objects (to be set from script.js)
let scene;
let playerState;
let boat;
let character;
let islandColliders;
let activeIslands;

// Initialize the network connection
export function initializeNetwork(gameScene, gamePlayerState, gameBoat, gameIslandColliders, gameActiveIslands, gamePlayerName, gamePlayerColor) {
    // Store references to game objects
    console.log("we are here")

    scene = gameScene;
    playerState = gamePlayerState;
    boat = gameBoat;
    islandColliders = gameIslandColliders;
    activeIslands = gameActiveIslands;
    playerName = gamePlayerName;
    playerColor = gamePlayerColor;

    // Apply the player's color to their own boat
    applyColorToBoat(boat, playerColor);

    console.log("we are here")
    // Load Socket.IO client if not already loaded
    if (typeof io === 'undefined') {
        console.error('Socket.IO client not loaded. Make sure to include the Socket.IO script in your HTML.');
        return;
    }

    // Connect to the server
    try {
        socket = io(SERVER_URL);

        // Set up event handlers
        setupSocketEvents();

        console.log('Connecting to game server...');
    } catch (error) {
        console.error('Failed to connect to game server:', error);
    }
}

// Helper function to apply color to a boat
function applyColorToBoat(boatMesh, color) {
    // Find the hull in the boat group
    boatMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
            // This is likely the hull
            if (child.material) {
                // Create a new material with the player's color
                const newMaterial = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(color.r, color.g, color.b)
                });
                child.material = newMaterial;
            }
        }
    });
}

// Set up Socket.IO event handlers
function setupSocketEvents() {
    // Connection events
    socket.on('connect', () => {
        socket.emit('player_join', {
            name: playerName,
            color: playerColor,
            position: {
                x: boat.position.x,
                y: boat.position.y,
                z: boat.position.z
            },
            rotation: boat.rotation.y,
            mode: playerState.mode
        });
        console.log('Connected to game server');
        isConnected = true;
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from game server');
        isConnected = false;

        // Clean up other players
        otherPlayers.forEach((player, id) => {
            removeOtherPlayerFromScene(id);
        });
    });

    socket.on('connection_response', (data) => {
        console.log('Connection established, player ID:', data.id);
        playerId = data.id;

        // Set player name
        setPlayerName(playerName);

        // Register islands
        registerIslands();

        // Request all current players (as a backup in case the automatic all_players event wasn't received)
        socket.emit('get_all_players');
    });

    // Handle receiving all current players
    socket.on('all_players', (players) => {
        console.log('Received all players:', players.length);

        // Add each player to the scene (except ourselves)
        players.forEach(playerData => {
            if (playerData.id !== playerId) {
                addOtherPlayerToScene(playerData);
            }
        });
    });

    // Player events
    socket.on('player_joined', (data) => {
        console.log('New player joined:', data.name);
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
        console.log('Player disconnected:', data.id);
        removeOtherPlayerFromScene(data.id);
    });

    // Island events
    socket.on('island_registered', (data) => {
        // This could be used to sync islands across clients
        console.log('Island registered:', data.id);
    });
}

// Send player position update to the server
export function updatePlayerPosition() {
    if (!isConnected || !socket || !playerId) return;

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

// Set the player's name
export function setPlayerName(name) {
    playerName = name;

    if (isConnected && socket) {
        socket.emit('update_player_name', { name: playerName });
    }
}

// Register islands with the server
function registerIslands() {
    if (!isConnected || !socket) return;

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
        // Create a boat mesh (simplified version of the main boat)
        playerMesh = new THREE.Group();

        const hullGeometry = new THREE.BoxGeometry(2, 1, 4);

        // Use the player's color for the hull if available
        const hullColor = playerData.color ?
            new THREE.Color(playerData.color.r, playerData.color.g, playerData.color.b) :
            new THREE.Color(0x885533);

        const hullMaterial = new THREE.MeshPhongMaterial({ color: hullColor });
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

        // Use the player's color for the character if available
        const characterColor = playerData.color ?
            new THREE.Color(playerData.color.r, playerData.color.g, playerData.color.b) :
            new THREE.Color(0x2288cc);

        const characterMaterial = new THREE.MeshPhongMaterial({ color: characterColor });
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

    // Update color if provided
    if (playerData.color && player.data.mode === 'boat') {
        player.data.color = playerData.color;

        // Find the hull in the boat group and update its color
        player.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
                // This is likely the hull
                if (child.material) {
                    child.material.color.setRGB(
                        playerData.color.r,
                        playerData.color.g,
                        playerData.color.b
                    );
                    child.material.needsUpdate = true;
                }
            }
        });
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

// Disconnect from the server
export function disconnect() {
    if (socket) {
        socket.disconnect();
    }
}

// Get the number of connected players
export function getConnectedPlayersCount() {
    return otherPlayers.size + 1; // +1 for the local player
}

// Check if connected to the server
export function isNetworkConnected() {
    return isConnected;
} 