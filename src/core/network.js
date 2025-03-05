// network.js - Socket.IO integration for the ship game
import * as THREE from 'three';
import { getAuth } from 'firebase/auth';

// Network configuration
const SERVER_URL = 'http://localhost:5001';
//const SERVER_URL = 'https://boat-game-python.onrender.com';

// Network state
let socket;
let playerId;
let firebaseUid = null; // Store Firebase UID if available
let otherPlayers = new Map(); // Map to store other players' meshes
let isConnected = false;
let playerName = "Sailor_" + Math.floor(Math.random() * 1000);
let playerColor;
let playerStats = {
    fishCount: 0,
    monsterKills: 0,
    money: 0
};

// Reference to scene and game objects (to be set from script.js)
let sceneRef;
let playerStateRef;
let boatRef;
let character;
let islandCollidersRef;
let activeIslandsRef;

// Chat system variables
let chatMessageCallback = null;
let recentMessagesCallback = null;
let messageHistory = [];
const DEFAULT_MESSAGE_LIMIT = 50;

// Initialize the network connection
export async function initializeNetwork(
    scene,
    playerState,
    boat,
    islandColliders,
    activeIslands,
    name,
    color,
    userId = null // Firebase UID
) {
    // Store references to game objects
    sceneRef = scene;
    playerStateRef = playerState;
    boatRef = boat;
    islandCollidersRef = islandColliders;
    activeIslandsRef = activeIslands;
    playerName = name;
    playerColor = color;

    // Store Firebase UID if provided
    firebaseUid = userId;

    console.log(`Initializing network with user ID: ${userId || 'anonymous'}`);

    // Apply the player's color to their own boat
    applyColorToBoat(boat, playerColor);

    // Initialize Socket.IO connection
    socket = io(SERVER_URL);

    // Set up event handlers
    setupSocketEvents();

    // Get the Firebase auth token if using Firebase
    let firebaseToken = null;
    if (userId) {
        try {
            const auth = getAuth();
            firebaseToken = await auth.currentUser.getIdToken();
            console.log("Firebase token acquired successfully");
        } catch (error) {
            console.error("Failed to get Firebase token:", error);
        }
    }

    console.log('Connecting to game server...');

    // Once connected, we'll send the player_join event
    socket.on('connect', () => {
        console.log('Connected to game server, sending player data');
        isConnected = true;

        // Send player data with the token to authenticate
        socket.emit('player_join', {
            name: playerName,
            color: playerColor,
            position: boat.position,
            rotation: boat.rotation.y,
            mode: playerState.mode,
            firebaseUid: userId,            // Send Firebase UID
            firebaseToken: firebaseToken    // Send Firebase token for verification
        });
    });
}

// Helper function to apply color to a boat
function applyColorToBoat(boatMesh, color) {
    // Initialize texture if needed (first time function is called)
    if (!window.boatTextureCache) {
        createBoatTextures();
    }

    // Find the hull in the boat group
    boatMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
            // Only change color if it's NOT flagged as not player colorable
            if (child.material && !child.userData.isNotPlayerColorable) {
                // Create a new material with the player's color and texture
                const newMaterial = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(color.r, color.g, color.b),
                    map: window.boatTextureCache.imperfectionMap,
                    bumpMap: window.boatTextureCache.bumpMap,
                    bumpScale: 0.02,
                    shininess: 40, // Slightly glossy finish
                    specular: new THREE.Color(0x333333) // Subtle specular highlights
                });

                child.material = newMaterial;
            }
        }
    });
}

// Create textures for boat materials (called once)
function createBoatTextures() {
    // Create cache object for textures
    window.boatTextureCache = {};

    // Create a canvas for the imperfection texture
    const impCanvas = document.createElement('canvas');
    impCanvas.width = 512;
    impCanvas.height = 512;
    const impCtx = impCanvas.getContext('2d');

    // Fill with nearly transparent white (allows color to show through)
    impCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    impCtx.fillRect(0, 0, impCanvas.width, impCanvas.height);

    // Add subtle scratches and imperfections
    impCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';

    // Add random scratches
    for (let i = 0; i < 30; i++) {
        impCtx.lineWidth = 0.5 + Math.random() * 1.5;
        impCtx.beginPath();
        const x1 = Math.random() * impCanvas.width;
        const y1 = Math.random() * impCanvas.height;
        const length = 10 + Math.random() * 40;
        const angle = Math.random() * Math.PI * 2;
        impCtx.moveTo(x1, y1);
        impCtx.lineTo(
            x1 + Math.cos(angle) * length,
            y1 + Math.sin(angle) * length
        );
        impCtx.stroke();
    }

    // Add some subtle noise/grain
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * impCanvas.width;
        const y = Math.random() * impCanvas.height;
        const size = 1 + Math.random() * 2;
        impCtx.fillStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.05})`;
        impCtx.fillRect(x, y, size, size);
    }

    // Create the imperfection texture
    const imperfectionMap = new THREE.CanvasTexture(impCanvas);
    imperfectionMap.wrapS = THREE.RepeatWrapping;
    imperfectionMap.wrapT = THREE.RepeatWrapping;
    window.boatTextureCache.imperfectionMap = imperfectionMap;

    // Create bump map for surface detail
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bumpCtx = bumpCanvas.getContext('2d');

    // Fill with middle gray (neutral bump)
    bumpCtx.fillStyle = 'rgb(128, 128, 128)';
    bumpCtx.fillRect(0, 0, bumpCanvas.width, bumpCanvas.height);

    // Add wood-like grain for bump
    for (let i = 0; i < 15; i++) {
        const y = i * (bumpCanvas.height / 15) + (Math.random() * 10 - 5);
        bumpCtx.strokeStyle = `rgb(${100 + Math.random() * 30}, ${100 + Math.random() * 30}, ${100 + Math.random() * 30})`;
        bumpCtx.lineWidth = 2 + Math.random() * 3;

        bumpCtx.beginPath();
        bumpCtx.moveTo(0, y);

        const segments = 8;
        const xStep = bumpCanvas.width / segments;

        for (let j = 1; j <= segments; j++) {
            const x = j * xStep;
            const yOffset = (Math.random() - 0.5) * 15;
            bumpCtx.lineTo(x, y + yOffset);
        }

        bumpCtx.stroke();
    }

    // Create the bump texture
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
    window.boatTextureCache.bumpMap = bumpMap;
}

// Set up Socket.IO event handlers
function setupSocketEvents() {
    // Skip connect handler as we'll handle it in initializeNetwork

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

        // Important: The server will now send back the Firebase UID as the player ID
        // if authentication was successful
        playerId = data.id;

        // This may be different from the socket ID now - it could be the Firebase UID
        console.log(`Server assigned player ID: ${playerId}`);
        console.log(`Is using Firebase auth: ${playerId === firebaseUid}`);

        // Set player name
        setPlayerName(playerName);

        // Register islands
        registerIslands();

        // Initialize player stats from server
        initializePlayerStats();

        // Request all current players (as a backup in case the automatic all_players event wasn't received)
        socket.emit('get_all_players');

        // Request initial chat messages
        requestInitialMessages();
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

    // Leaderboard events
    socket.on('leaderboard_update', (data) => {
        console.log('Received leaderboard update:', data);

        // Update the UI with new leaderboard data
        if (typeof updateLeaderboardData === 'function') {
            updateLeaderboardData(data);
        } else {
            console.warn('updateLeaderboardData function not available');
        }
    });

    // Add this handler to process the player stats response
    socket.on('player_stats', (data) => {
        console.log('Received player stats from server:', data);

        // Update local player stats
        if (data.fishCount !== undefined) {
            playerStats.fishCount = data.fishCount;
        }
        if (data.monsterKills !== undefined) {
            playerStats.monsterKills = data.monsterKills;
        }
        if (data.money !== undefined) {
            playerStats.money = data.money;
        }

        // Update UI if gameUI exists
        if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
            window.gameUI.updatePlayerStats();
        }
    });

    // Chat events
    socket.on('new_message', (data) => {
        console.log('Received new chat message:', data);

        // Add to message history
        messageHistory.push(data);

        // Trim history if it gets too long (keep last 100 messages in memory)
        if (messageHistory.length > 100) {
            messageHistory = messageHistory.slice(-100);
        }

        // Notify UI if callback is registered
        if (chatMessageCallback) {
            chatMessageCallback(data);
        }
    });

    socket.on('recent_messages', (data) => {
        console.log('Received recent messages:', data.messages.length);

        // Replace message history with recent messages (sorted chronologically)
        messageHistory = data.messages.sort((a, b) => a.timestamp - b.timestamp);

        // Notify UI if callback is registered
        if (recentMessagesCallback) {
            recentMessagesCallback(messageHistory);
        }
    });
}

// Send player position update to the server
export function updatePlayerPosition() {
    if (!isConnected || !socket || !playerId) return;

    // Get the active object (boat or character)
    const activeObject = playerStateRef.mode === 'boat' ? boatRef : character;

    socket.emit('update_position', {
        x: activeObject.position.x,
        y: activeObject.position.y,
        z: activeObject.position.z,
        rotation: activeObject.rotation.y,
        mode: playerStateRef.mode
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
    islandCollidersRef.forEach(collider => {
        socket.emit('register_island', {
            id: collider.id,
            x: collider.center.x,
            y: collider.center.y,
            z: collider.center.z,
            radius: collider.radius,
            type: activeIslandsRef.get(collider.id)?.type || 'default'
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

    // Add a vertical, thin, bright yellow light that follows the player
    const lightHeight = 10000; // Adjust the height of the light
    const lightGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, lightHeight, 0)
    ]);

    const lightColor = playerData.color ?
        new THREE.Color(playerData.color.r, playerData.color.g, playerData.color.b) :
        new THREE.Color(0xffff00); // Default to bright yellow if no color is provided
    const lightMaterial = new THREE.LineBasicMaterial({
        color: lightColor, // Bright yellow
        linewidth: 1 // Adjust the width of the line
    });
    const lightLine = new THREE.Line(lightGeometry, lightMaterial);
    lightLine.position.y = playerData.mode === 'boat' ? 1 : 1; // Adjust height based on player mode
    playerMesh.add(lightLine);


    // Add a point light for additional visibility
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 10); // Adjust intensity and distance as needed
    pointLight.position.y = playerData.mode === 'boat' ? 1 : 1; // Adjust height based on player mode
    playerMesh.add(pointLight);

    // Position the player
    playerMesh.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    playerMesh.rotation.y = playerData.rotation;

    // Add to scene
    sceneRef.add(playerMesh);

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
    sceneRef.remove(player.mesh);

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

// Request leaderboard data from the server
export function requestLeaderboard() {
    if (!isConnected || !socket) return;

    console.log('Requesting leaderboard data...');
    socket.emit('get_leaderboard');
}

// Update player stats
export function updatePlayerStats(stats) {
    if (!isConnected || !socket) return;

    // Update local stats
    if (stats.fishCount !== undefined) {
        playerStats.fishCount = stats.fishCount;
    }
    if (stats.monsterKills !== undefined) {
        playerStats.monsterKills = stats.monsterKills;
    }
    if (stats.money !== undefined) {
        playerStats.money = stats.money;
    }

    // Send update to server
    console.log('Updating player stats:', stats);
    socket.emit('player_action', {
        action: 'update_stats',
        stats: stats
    });

    // Update UI if gameUI exists
    if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
        window.gameUI.updatePlayerStats();
    }
}

// Increment player stats (more convenient for individual updates)
export function incrementPlayerStats(stats) {
    if (!isConnected || !socket) return;

    // Update local stats
    if (stats.fishCount) {
        playerStats.fishCount += stats.fishCount;
    }
    if (stats.monsterKills) {
        playerStats.monsterKills += stats.monsterKills;
    }
    if (stats.money) {
        playerStats.money += stats.money;
    }

    updatePlayerStats(playerStats);

    // Send the complete updated stats to server
    console.log('Incrementing player stats:', stats);
    socket.emit('player_action', {
        action: 'update_stats',
        stats: playerStats
    });

    // Update UI if gameUI exists
    if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
        window.gameUI.updatePlayerStats();
    }
}

// Get current player stats
export function getPlayerStats() {
    return { ...playerStats };
}

// Call this when a player catches a fish
export function onFishCaught(value = 1) {
    if (!isConnected || !socket) return;

    // Update local stats
    playerStats.fishCount += value;

    console.log(`Fish caught! New count: ${playerStats.fishCount}`);

    // Send the fish caught action to server
    socket.emit('player_action', {
        action: 'fish_caught',
        value: value
    });

    // Update UI
    if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
        window.gameUI.updatePlayerStats();
    }
}

// Call this when a player kills a monster
export function onMonsterKilled(value = 1) {
    if (!isConnected || !socket) return;

    // Update local stats
    playerStats.monsterKills += value;

    console.log(`Monster killed! New count: ${playerStats.monsterKills}`);

    // Send the monster killed action to server
    socket.emit('player_action', {
        action: 'monster_killed',
        value: value
    });

    // Update UI
    if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
        window.gameUI.updatePlayerStats();
    }
}

// Call this when a player earns money
export function onMoneyEarned(value) {
    if (!isConnected || !socket) return;

    // Update local stats
    playerStats.money += value;

    console.log(`Money earned! New amount: ${playerStats.money}`);

    // Send the money earned action to server
    socket.emit('player_action', {
        action: 'money_earned',
        value: value
    });

    // Update UI
    if (window.gameUI && typeof window.gameUI.updatePlayerStats === 'function') {
        window.gameUI.updatePlayerStats();
    }
}

// Add this new function to initialize player stats
function initializePlayerStats() {
    if (!isConnected || !socket || !playerId) return;

    console.log('Initializing player stats from server...');

    // Request player stats from server
    socket.emit('get_player_stats', { id: playerId });
}

// Send a chat message
export function sendChatMessage(content, messageType = 'global') {
    if (!isConnected || !socket || !playerId) return false;

    console.log('Sending chat message:', content);

    socket.emit('send_message', {
        content: content,
        type: messageType
    });

    return true;
}

// Request recent messages from the server
export function getRecentMessages(messageType = 'global', limit = DEFAULT_MESSAGE_LIMIT) {
    if (!isConnected || !socket) return false;

    console.log('Requesting recent messages...');

    socket.emit('get_recent_messages', {
        type: messageType,
        limit: limit
    });

    return true;
}

// Register a callback function to be called when a new message is received
export function onChatMessage(callback) {
    chatMessageCallback = callback;
}

// Register a callback function to be called when recent messages are received
export function onRecentMessages(callback) {
    recentMessagesCallback = callback;
}

// Get message history from memory
export function getChatHistory() {
    return [...messageHistory]; // Return a copy to prevent external modification
}

// Request initial messages when connecting
function requestInitialMessages() {
    getRecentMessages('global', DEFAULT_MESSAGE_LIMIT);
} 