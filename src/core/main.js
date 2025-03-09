import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import * as Network from './network.js';
import { gameUI } from '../ui/ui.js';
import { scene, camera, renderer, updateTime, getTime, boat, getWindData, boatVelocity, boatSpeed, rotationSpeed, keys, updateShipMovement, updateAllPlayers, getAllPlayers } from './gameState.js';
import { setupSkybox, updateSkybox, setupSky, updateTimeOfDay, updateSunPosition, toggleSkySystem, updateRealisticSky } from '../environment/skybox.js';
import { setupClouds, updateClouds } from '../environment/clouds.js';
import { setupBirds, updateBirds } from '../entities/birds.js';
import { setupSeaMonsters, updateSeaMonsters, getMonsters, updateLurkingMonster, updateHuntingMonster, updateSurfacingMonster, updateAttackingMonster, updateDivingMonster, updateDyingMonster, updateSpecialMonsterBehaviors } from '../entities/seaMonsters.js';
import { initFishing, updateFishing, getFishCount } from '../gameplay/fishing.js';
import { initCannons, updateCannons } from '../gameplay/cannons.js';
import { animateSail } from '../animations/animations.js';
import { applyWindInfluence, updateBoatRocking } from '../entities/character.js';
import { initLeaderboard, updateLeaderboardData } from '../ui/leaderboard.js';
import { requestLeaderboard, setPlayerName, setPlayerColor } from './network.js';
import { updateVillagers } from '../entities/villagers.js';
import {
    updateVisibleIslands,
    getAllIslandColliders,
    findNearestIsland,
    checkIslandCollision
} from '../world/islandManager.js';
import MusicSystem from '../audio/music.js';
import { initCameraControls, updateCameraPosition } from '../controls/cameraControls.js';
import { setupWater, updateWater } from '../environment/water.js';
import { initDiagnostics, updateDiagnosticsDisplay, ENABLE_DIAGNOSTICS } from '../ui/diagnostics.js';
import * as Firebase from './firebase.js';
import {
    islandColliders,
    activeIslands,
    activeWaterChunks,
    updateIslandEffects,
    findNearestAnyIsland,
    spawnCoastalCliffScene,
    spawnMassiveIsland,
} from '../world/islands.js';
import { updateAllIslandVisibility } from '../world/chunkControl.js';
import { createTestRockyIsland, createTestRockyIslandCluster } from '../world/testRockyIslands.js';
import { showMessageOfDay, shouldShowMessageOfDay, forceShowMessageOfDay } from '../ui/motd.js';
import { startScreenSequence, resetScreenSequence } from '../ui/messages.js';
import { getCurrentUser } from '../ui/auth.js';
import { getPlayerInfo } from '../ui/login.js';
import { spawnBlockCave } from '../world/blockCave.js';
import { setupFog, updateFog, toggleFog, setFogColor } from '../environment/fog.js';
import { getTimeOfDay } from '../environment/skybox.js';
import { initCollisionResponse, updateCollisionResponse, isBoatAirborne } from '../controls/islandCollisionResponse.js';
import { getPlayerInventory, playerHasItem } from './network.js';

// Define these variables at the file level scope (outside any functions)
// so they're accessible throughout the file
const fogColors = {
    night: new THREE.Color(0x445566),  // Darker blue-gray
    dawn: new THREE.Color(0x9999aa),   // Light purple-gray
    day: new THREE.Color(0xaabbcc),    // Light blue-gray
    afternoon: new THREE.Color(0xa3b5c7), // Slightly warmer blue-gray
    dusk: new THREE.Color(0x9a8fa5)    // Warm purple-gray
};

// Define the keyframes at file level scope
const fogColorKeyframes = [
    { position: 0.0, color: new THREE.Color(0x121416) },  // Night (very dark gray with slight blue)
    { position: 0.2, color: new THREE.Color(0xe11e21) },  // Dawn (dark gray)
    { position: 0.4, color: new THREE.Color(0x4a4a4a) },  // Day (medium gray)
    { position: 0.6, color: new THREE.Color(0x424242) },  // Afternoon (medium gray)
    { position: 0.8, color: new THREE.Color(0x323232) },  // Dusk (darker gray)
    { position: 1.0, color: new THREE.Color(0x121416) }   // Night (cycle end)
];

// Initialize water with explicit realistic style as default
console.log("Initializing water in main.js");
const water = setupWater('cartoony');

/*
const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('/threejs-water-shader/');
const environmentMap = cubeTextureLoader.load([
    './px.png', // positive x
    './nx.png', // negative x 
    './py.png', // positive y
    './ny.png', // negative y
    './pz.png', // positive z
    './nz.png'  // negative z
]);


const waterResolution = { size: 124 };
const water2 = new Water({
    environmentMap,
    resolution: waterResolution.size
});
//scene.add(water2);



scene.background = environmentMap;
scene.environment = environmentMap;*/


// Add these variables to your global scope
let lastTime = null;

// Add this near the top with other variables
let firebaseInitialized = false;

// Scene setup
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Ensure camera's far plane is large enough to see the sky
camera.far = 50000;
camera.updateProjectionMatrix();
console.log("Camera setup:", { near: camera.near, far: camera.far, fov: camera.fov });

initCameraControls();


let playerState = {
    mode: 'boat', // Default to boat mode
    currentIsland: null,
    transitioningMode: false,
    transitionProgress: 0,
    characterHeight: 2
};

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add a color correction pass for lighter colors
const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
colorCorrectionPass.uniforms['powRGB'].value.set(1.1, 1.1, 1.1); // Slightly increase brightness
colorCorrectionPass.uniforms['mulRGB'].value.set(1.1, 1.1, 1.1); // Slightly increase saturation
composer.addPass(colorCorrectionPass);

// Add a bloom pass for subtle glows
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
bloomPass.threshold = 0.5;
bloomPass.strength = 0.5;
bloomPass.radius = 0.5;
composer.addPass(bloomPass);

// Stormy Lighting

// Add sky setup here
setupSky();
// Enable realistic sky with clouds and stars
console.log("Initializing realistic sky system...");

// Force removal of any existing sky before toggling
if (window.realisticSkyMesh) {
    scene.remove(window.realisticSkyMesh);
    window.realisticSkyMesh = null;
}
toggleSkySystem();

// Toggle to enable realistic sky
const skyEnabled = toggleSkySystem();
console.log(`Realistic sky system initialized: ${skyEnabled}`);

// Force update the sky once to ensure it's properly displayed
if (window.realisticSkyMesh) {
    const deltaTime = 1 / 60;
    updateRealisticSky(window.realisticSkyMesh, deltaTime);
    console.log("Forced initial sky update completed");
}

requestLeaderboard();
MusicSystem.playMusic();
MusicSystem.setVolume(0.1); // 30% volume

// Test Rocky Islands - set to true to create test islands
const TEST_ROCKY_ISLANDS = true;
if (TEST_ROCKY_ISLANDS) {
    console.log("Testing rocky islands - creating test islands");
    // Create a single test rocky island further from the starting position
    createTestRockyIslandCluster(scene, 4, 800, new THREE.Vector3(boat.position.x, 0, boat.position.z));
}

// Expanded Water with Slower Shader
const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 256, 256);
const waterShader = {
    uniforms: {
        time: { value: 0 },
        waveHeight: { value: 2.0 },
        waveSpeed: { value: 0.09 }, // Slowed down wave speed (was 1.5)
    },
    vertexShader: `
        varying vec2 vUv;
        varying float vHeight;

        void main() {
        vUv = uv;
        vHeight = position.z; // Use the CPU-updated Z (height)
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    varying float vHeight;

    void main() {
      vec3 deepColor = vec3(0.1, 0.15, 0.3);
      vec3 crestColor = vec3(0.4, 0.5, 0.7);
      float heightFactor = clamp(vHeight * 0.5, 0.0, 1.0); // Scale height for color
      vec3 waterColor = mix(deepColor, crestColor, heightFactor);

      // Foam effect
      float foam = smoothstep(0.7, 1.0, heightFactor + sin(vUv.x * 20.0 + time) * 0.1);
      waterColor = mix(waterColor, vec3(0.9, 0.95, 1.0), foam);

      // Glow effect
      float glow = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time) * 0.2 + 0.8;
      waterColor += vec3(0.05, 0.1, 0.15) * glow;

      gl_FragColor = vec4(waterColor, 1.0);
    }
  `,
};
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: waterShader.uniforms,
    vertexShader: waterShader.vertexShader,
    fragmentShader: waterShader.fragmentShader,
    side: THREE.DoubleSide,
});
//const water = new THREE.Mesh(waterGeometry, waterMaterial);
//water.rotation.x = -Math.PI / 2;
//scene.add(water);

// Comment out any calls to spawn massive islands
/*
spawnMassiveIsland(scene);
*/

// Add this line to spawn your block cave instead
const blockCave = spawnBlockCave(scene, new THREE.Vector3(0, 0, 0));
console.log("Block cave system created");

spawnMassiveIsland(scene);
// Add this at the beginning of your script.js file
let playerName = '';
let playerColor = '#3498db'; // Default blue

// Add this function after your other initialization code
async function initializeFirebaseAuth() {
    console.log("Initializing Firebase authentication...");

    // Try to initialize Firebase
    firebaseInitialized = await Firebase.initializeFirebase();

    if (!firebaseInitialized) {
        console.warn("Firebase initialization failed");
        return;
    }

    // Show Firebase auth popup
    Firebase.showAuthPopup((user) => {
        console.log("🔍 MAIN DEBUG: Firebase auth completed, user:", user?.uid || 'No user');
        console.log("🔍 MAIN DEBUG: User name:", user);

        // Check if user has already completed login process
        if (localStorage.getItem('hasCompletedLogin') === 'true') {
            console.log('🔍 MAIN DEBUG: User has already completed login, skipping login screen');
            onAuthAndLoginComplete(user);
            return;
        }

        // Check both Firebase displayName AND localStorage
        if ((user && !user.name) || !localStorage.getItem('playerName')) {
            console.log('🔍 MAIN DEBUG: User needs to set name, showing login screen');

            // If there's a name in localStorage, use it as default in the login screen
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                playerName = savedName;
            }

            // Your showLoginScreen function
            showLoginScreen(() => {
                console.log('🔍 MAIN DEBUG: Login screen complete, now showing MOTD');
                onAuthAndLoginComplete(user);
            });
        } else {
            console.log('🔍 MAIN DEBUG: User already has name, going to MOTD');
            // If there's a saved name, make sure to use it
            if (localStorage.getItem('playerName')) {
                playerName = localStorage.getItem('playerName');
            }
            onAuthAndLoginComplete(user);
        }
    });
}

// Add this call early in your initialization sequence 
// (can be placed right before or after other initialization code)
initializeFirebaseAuth();

// Create a new helper function to handle the sequence
function completeAuthAndShowMOTD(user = null) {
    console.log("🔔 Main: Authentication and login complete, checking MOTD");

    // Add a short delay to ensure any UI elements are properly closed
    setTimeout(() => {
        if (shouldShowMessageOfDay()) {
            console.log("🔔 Main: Showing MOTD after auth/login complete");
            showMessageOfDay(() => {
                // Complete network initialization after MOTD is closed
                if (user) {
                    console.log("🔔 Main: Initializing network with user after MOTD");
                    initializeNetworkWithPlayerInfo(user);
                }
            });
        } else if (user) {
            // Skip MOTD and initialize directly
            console.log("🔔 Main: Skipping MOTD, initializing network directly");
            initializeNetworkWithPlayerInfo(user);
        }
    }, 500); // Short delay to ensure UI elements are updated
}

// Create a simple login UI
export function showLoginScreen(onComplete) {
    // Create container
    const loginContainer = document.createElement('div');
    loginContainer.style.position = 'fixed';
    loginContainer.style.top = '0';
    loginContainer.style.left = '0';
    loginContainer.style.width = '100%';
    loginContainer.style.height = '100%';
    loginContainer.style.backgroundColor = 'rgba(0,0,0,0.85)';
    loginContainer.style.display = 'flex';
    loginContainer.style.justifyContent = 'center';
    loginContainer.style.alignItems = 'center';
    loginContainer.style.zIndex = '9999';

    // Create form
    const form = document.createElement('div');
    form.style.backgroundColor = '#0f1626';
    form.style.padding = '30px';
    form.style.borderRadius = '10px';
    form.style.boxShadow = '0 0 30px rgba(50, 130, 240, 0.4)';
    form.style.width = '400px';
    form.style.maxWidth = '90%';
    form.style.border = '1px solid rgba(50, 130, 240, 0.5)';

    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Captain Profile';
    title.style.textAlign = 'center';
    title.style.color = '#fff';
    title.style.marginBottom = '5px';
    title.style.fontWeight = '800';
    title.style.letterSpacing = '1px';
    title.style.textTransform = 'uppercase';
    title.style.textShadow = '0 0 10px rgba(66, 133, 244, 0.7)';
    title.style.fontSize = '28px';
    form.appendChild(title);

    // Add decorative divider
    const divider = document.createElement('div');
    divider.style.height = '3px';
    divider.style.width = '60px';
    divider.style.background = 'linear-gradient(to right, #4285f4, #34a853)';
    divider.style.margin = '0 auto 20px';
    form.appendChild(divider);

    // Add container for inputs
    const profileContainer = document.createElement('div');
    profileContainer.style.background = 'linear-gradient(135deg, rgba(10, 37, 64, 0.9), rgba(32, 58, 96, 0.9))';
    profileContainer.style.borderRadius = '8px';
    profileContainer.style.padding = '20px';
    profileContainer.style.marginBottom = '20px';
    profileContainer.style.borderLeft = '3px solid #4285f4';
    form.appendChild(profileContainer);

    // Name input
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'Your Name:';
    nameLabel.style.display = 'block';
    nameLabel.style.color = '#ccc';
    nameLabel.style.marginBottom = '5px';
    nameLabel.style.fontWeight = '500';
    profileContainer.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style.width = '100%';
    nameInput.style.marginBottom = '15px';
    nameInput.style.padding = '10px';
    nameInput.style.borderRadius = '5px';
    nameInput.style.border = '1px solid #4285f4';
    nameInput.style.backgroundColor = '#1a2639';
    nameInput.style.color = '#fff';
    nameInput.style.outline = 'none';
    nameInput.style.boxSizing = 'border-box';
    nameInput.value = 'Sailor ' + Math.floor(Math.random() * 1000);
    profileContainer.appendChild(nameInput);

    // Color selection
    const colorLabel = document.createElement('div');
    colorLabel.textContent = 'Choose Color:';
    colorLabel.style.display = 'block';
    colorLabel.style.color = '#ccc';
    colorLabel.style.marginBottom = '5px';
    colorLabel.style.fontWeight = '500';
    profileContainer.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = playerColor;
    colorInput.style.width = '100%';
    colorInput.style.marginBottom = '15px';
    colorInput.style.height = '40px';
    colorInput.style.border = 'none';
    colorInput.style.borderRadius = '5px';
    colorInput.style.cursor = 'pointer';
    profileContainer.appendChild(colorInput);

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Start Sailing';
    submitButton.style.width = '100%';
    submitButton.style.padding = '12px';
    submitButton.style.backgroundColor = '#4285f4';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '5px';
    submitButton.style.fontSize = '16px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontWeight = 'bold';
    submitButton.style.transition = 'background-color 0.2s';
    form.appendChild(submitButton);

    // Hover effect
    submitButton.addEventListener('mouseover', () => {
        submitButton.style.backgroundColor = '#5294ff';
    });
    submitButton.addEventListener('mouseout', () => {
        submitButton.style.backgroundColor = '#4285f4';
    });

    // Handle form submission - KEEPING ORIGINAL FUNCTIONALITY
    submitButton.addEventListener('click', () => {
        playerName = nameInput.value.trim() || nameInput.value;
        playerColor = colorInput.value;

        // Save directly to localStorage here
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerColor', playerColor);
        // Add the completion flag
        localStorage.setItem('hasCompletedLogin', 'true');

        // Now call the network setPlayerName (which will send to server)
        setPlayerName(playerName);

        // Remove login screen
        document.body.removeChild(loginContainer);

        // Call the completion callback directly
        if (onComplete && typeof onComplete === 'function') {
            console.log("🔔 Main: Login screen completed, calling callback");
            onComplete();
        }
    });

    loginContainer.appendChild(form);
    document.body.appendChild(loginContainer);
}

// Initialize network with player info
function initializeNetworkWithPlayerInfo(firebaseUser = null) {
    console.log(`🔔 Main: Connecting as: ${playerName} with color: ${playerColor}`);

    // Convert hex color to RGB (0-1 range for Three.js)
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { r, g, b };
    };

    const rgbColor = hexToRgb(playerColor);
    setPlayerColor(rgbColor);

    // Get Firebase user ID from the passed user parameter
    let firebaseUserId = null;
    if (firebaseUser) {
        firebaseUserId = firebaseUser.uid;
        console.log("🔔 Main: Using Firebase authentication with UID:", firebaseUserId);
    } else {
        console.log("🔔 Main: No Firebase user, using anonymous mode");
    }

    // Complete the initialization directly - MOTD should have been shown by now
    Network.initializeNetwork(
        scene,
        playerState,
        boat,
        getAllIslandColliders(),
        activeIslands,
        playerName,
        rgbColor,
        firebaseUserId
    );
}

// Replace your existing setTimeout for network initialization with this:
/*
setTimeout(() => {
    console.log("Showing player setup screen...");
    showLoginScreen();
}, 2000);
*/

// Mouse camera control variables
const mouseControl = {
    isEnabled: true,
    sensitivity: 0.05, // Low sensitivity for subtle movement
    maxAngle: 0.3, // Maximum rotation angle in radians (about 17 degrees)
    rotationSensitivity: 0.015, // Very low sensitivity for subtle ship rotation
    maxRotation: 0.1, // Maximum rotation (about 5.7 degrees)
    mouseX: 0,
    mouseY: 0
};

// Track mouse position
document.addEventListener('mousemove', (event) => {
    // Convert mouse position to normalized coordinates (-1 to 1)
    mouseControl.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseControl.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

// Keyboard input
// Store keyboard event handlers so they can be managed by the command system
const keydownHandler = (event) => {
    // Skip game controls if chat or any text input is focused
    if (window.chatInputActive ||
        (document.activeElement &&
            (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.isContentEditable))) {
        return;
    }

    switch (event.key) {
        case 'w': case 'ArrowUp':
            keys.forward = true;
            console.log("⌨️ KEYDOWN: W/UP pressed - keys.forward set to:", keys.forward);
            break;
        case 's': case 'ArrowDown':
            keys.backward = true;
            console.log("⌨️ KEYDOWN: S/DOWN pressed - keys.backward set to:", keys.backward);
            break;
        case 'a': case 'ArrowLeft':
            keys.left = true;
            console.log("⌨️ KEYDOWN: A/LEFT pressed - keys.left set to:", keys.left);
            break;
        case 'd': case 'ArrowRight':
            keys.right = true;
            console.log("⌨️ KEYDOWN: D/RIGHT pressed - keys.right set to:", keys.right);
            break;
        // Toggle mouse camera control with 'c' key
        case 'c': mouseControl.isEnabled = !mouseControl.isEnabled; break;
        // Add hotkey for firing cannons (space bar)
        case ' ': // Space bar
            // Import and call fireCannons if needed
            if (window.fireCannons) {
                window.fireCannons();
            }
            break;
        // Press 'T' to toggle sky system
        case 't': case 'T':
            console.log("Toggling sky system...");
            toggleSkySystem();
            break;
        case 'f': case 'F':
            console.log("Toggling fog system...");
            const fogEnabled = toggleFog(scene);
            console.log(`Fog system: ${fogEnabled ? 'ENABLED' : 'DISABLED'}`);
            break;
    }
};

const keyupHandler = (event) => {
    // Skip game controls if chat or any text input is focused
    if (window.chatInputActive ||
        (document.activeElement &&
            (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.isContentEditable))) {
        return;
    }

    switch (event.key) {
        case 'w': case 'ArrowUp':
            keys.forward = false;
            console.log("⌨️ KEYUP: W/UP released - keys.forward set to:", keys.forward);
            break;
        case 's': case 'ArrowDown':
            keys.backward = false;
            console.log("⌨️ KEYUP: S/DOWN released - keys.backward set to:", keys.backward);
            break;
        case 'a': case 'ArrowLeft':
            keys.left = false;
            console.log("⌨️ KEYUP: A/LEFT released - keys.left set to:", keys.left);
            break;
        case 'd': case 'ArrowRight':
            keys.right = false;
            console.log("⌨️ KEYUP: D/RIGHT released - keys.right set to:", keys.right);
            break;
    }
};

// Store event listeners for reference by the command system
document.eventListeners = document.eventListeners || {};
document.eventListeners.keydown = keydownHandler;
document.eventListeners.keyup = keyupHandler;

document.addEventListener('keydown', keydownHandler);
document.addEventListener('keyup', keyupHandler);

// Animation
let lastChunkUpdatePosition = new THREE.Vector3();
const chunkUpdateThreshold = 50; // Reduced from 100 to update chunks more frequently


let lastLeaderboardUpdate = 0;
const LEADERBOARD_UPDATE_INTERVAL = 10000; // 10 seconds

// Add this function to set up the sky

// Add this function to get sky color based on time of day

// Add this function to get ambient light color and intensity

// Add this function to get directional light color and intensity


// Add this function to update time of day

// Update boat movement in the animate function to check collisions
function animate() {
    const now = performance.now();
    const deltaTime = (now - (lastTime || now)) / 1000; // Convert to seconds
    lastTime = now;
    updateTime(0.09);

    // Update time of day
    updateTimeOfDay(deltaTime);

    // Update water with delta time
    updateWater(deltaTime);

    // Update island shore effects
    updateIslandEffects(deltaTime);

    // Update water shader time uniform
    waterShader.uniforms.time.value = getTime();

    // Get wave speed and height from the shader uniforms
    const waveSpeed = waterShader.uniforms.waveSpeed.value;
    const waveHeight = waterShader.uniforms.waveHeight.value;

    const positions = water.geometry.attributes.position.array;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.length; i += 3) {
        vertex.x = positions[i];
        vertex.y = positions[i + 1]; // Local Y before rotation (world Z)
        vertex.z = 0; // Reset Z

        // Wave equation matching your original
        const wave1 = Math.sin(vertex.x * 0.1 + getTime() * waveSpeed) * Math.cos(vertex.y * 0.1 + getTime() * waveSpeed) * waveHeight;
        const wave2 = Math.sin(vertex.x * 0.2 + getTime() * waveSpeed * 1.2) * Math.cos(vertex.y * 0.15 + getTime() * waveSpeed) * waveHeight * 0.5;
        const wave3 = Math.sin(vertex.x * 0.05 + getTime() * waveSpeed * 0.8) * waveHeight * 0.3;
        vertex.z = wave1 + wave2 + wave3;

        positions[i + 2] = vertex.z; // Update height
    }
    // water.geometry.attributes.position.needsUpdate = true;
    //water.geometry.computeVertexNormals(); // For lighting in shader

    // Get the boat speed multiplier if it exists
    const speedMultiplier = window.boatSpeedMultiplier || 1.0;

    // Use the new updateShipMovement function for boat controls

    updateShipMovement(deltaTime);

    // Call our collision response system
    updateCollisionResponse(deltaTime);

    // Create direction vector based on boat's current rotation
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), boat.rotation.y);
    let newPosition = boat.position.clone().add(boatVelocity);

    // Only apply rocking and water interaction if NOT in parabolic flight
    if (!window.boatInParabolicFlight) {
        updateBoatRocking(deltaTime);
    }

    // Check for island collisions - skip if in parabolic flight
    let collided = false;
    if (!window.boatInParabolicFlight && checkIslandCollision(newPosition)) {
        collided = true;
        // Our collision system will handle the response
    }

    // Right before updating position, add this logging
    if (window.collisionDebugActive && window.boatInParabolicFlight) {
        console.log("%c📌 MAIN: Position update during flight", "color:purple; font-weight:bold;");
        console.log("   Current position:", boat.position.x.toFixed(2), boat.position.y.toFixed(2), boat.position.z.toFixed(2));
        console.log("   New position:", newPosition.x.toFixed(2), newPosition.y.toFixed(2), newPosition.z.toFixed(2));
        console.log("   Velocity:", boatVelocity.x.toFixed(2), boatVelocity.y.toFixed(2), boatVelocity.z.toFixed(2));
        console.log("   Y will be preserved:", boat.position.y.toFixed(2));
    }

    if (!collided) {
        // Only update X and Z position - Y is controlled by collision system when in flight
        if (window.boatInParabolicFlight) {
            // Debug logging before position change
            if (window.collisionDebugActive) {
                console.log("%c🔄 MAIN: Applying flight-safe position update", "color:purple;");
                console.log("   Y before:", boat.position.y.toFixed(2));
            }

            // Only apply X and Z changes, Y is controlled by the collision system
            const currentY = boat.position.y;
            boat.position.x = newPosition.x;
            boat.position.z = newPosition.z;

            // Check if something modified Y incorrectly
            if (window.collisionDebugActive && Math.abs(boat.position.y - currentY) > 0.001) {
                console.warn("%c⚠️ Y-position was modified by something! Expected:",
                    currentY.toFixed(2), "Actual:", boat.position.y.toFixed(2),
                    "background:red; color:white;");
            }
        } else {
            // Normal update for all components
            const currentY = boat.position.y;
            boat.position.copy(newPosition);
            boat.position.y = currentY; // Restore Y position
        }

        if (boat.position.distanceTo(lastChunkUpdatePosition) > chunkUpdateThreshold) {
            updateAllIslandVisibility(boat, scene, waterShader, lastChunkUpdatePosition);
            // Add this line to update villagers whenever chunks update
            if (activeIslands && activeIslands.size > 0) {
                //updateVillagers(activeIslands);
            }
        }
    }

    // Sample water height under the boat
    const boatX = boat.position.x;
    const boatZ = boat.position.z;

    // Convert to grid indices (1000x1000 plane, 32x32 segments)
    const gridSize = 32;
    const waterSize = 1000;
    const xIndex = Math.floor((boatX + waterSize / 2) / waterSize * gridSize);
    const zIndex = Math.floor((boatZ + waterSize / 2) / waterSize * gridSize);

    const clampedX = Math.max(0, Math.min(gridSize, xIndex));
    const clampedZ = Math.max(0, Math.min(gridSize, zIndex));

    // Bilinear interpolation for smooth height
    const xFraction = (boatX + waterSize / 2) / waterSize * gridSize - clampedX;
    const zFraction = (boatZ + waterSize / 2) / waterSize * gridSize - clampedZ;
    const x1 = Math.min(gridSize, clampedX + 1);
    const z1 = Math.min(gridSize, clampedZ + 1);

    const h00 = positions[(clampedZ * (gridSize + 1) + clampedX) * 3 + 2];
    const h10 = positions[(clampedZ * (gridSize + 1) + x1) * 3 + 2];
    const h01 = positions[(z1 * (gridSize + 1) + clampedX) * 3 + 2];
    const h11 = positions[(z1 * (gridSize + 1) + x1) * 3 + 2];

    const interpolatedHeight = h00 * (1 - xFraction) * (1 - zFraction) +
        h10 * xFraction * (1 - zFraction) +
        h01 * (1 - xFraction) * zFraction +
        h11 * xFraction * zFraction;

    // Note: Boat height adjustment and water interaction is now handled by updateBoatRocking
    // in character.js, which samples the wave height directly from the shader functions

    // Update leaderboard periodically
    if (getTime() - lastLeaderboardUpdate > LEADERBOARD_UPDATE_INTERVAL) {
        requestLeaderboard();
        lastLeaderboardUpdate = time;
    }

    // Camera positioning
    //updateCamera();

    // Network and UI updates
    Network.updatePlayerPosition();
    updateGameUI();

    // Update sun position relative to camera
    updateSunPosition();
    updateSkybox();

    // Update clouds based on boat position - these are the separate clouds, not skybox clouds
    updateClouds(boat.position);

    // Update birds with delta time
    updateBirds(deltaTime);

    // Update sea monsters with delta time
    updateSeaMonsters(deltaTime);

    // Update fishing
    updateFishing();

    updateCameraPosition();

    updateVillagers(activeIslands);

    // Update cannons
    updateCannons(deltaTime);

    // Update sail animation
    animateSail(deltaTime);

    applyWindInfluence();

    //water2.update(deltaTime);

    // Rendering
    //renderer.render(scene, camera);  // Comment out the standard renderer
    requestAnimationFrame(animate);
    composer.render();  // Use the post-processing composer instead

    // Update FPS counter
    const currentFps = 1 / deltaTime;

    // Update diagnostics with current FPS (only does something if diagnostics is enabled)
    updateDiagnosticsDisplay(currentFps);

    // Update island visibility using the new islandManager
    updateAllIslandVisibility(boat, scene, waterShader, lastChunkUpdatePosition);

    // Use consolidated island colliders for collision detection
    const allIslandColliders = getAllIslandColliders();

    // After updateShipMovement:
    // Update fog with continuous color gradient
    const dayPhase = (getTime() * 0.005) % 1;

    // Find the two keyframes this dayPhase sits between
    let startKeyframe, endKeyframe;
    for (let i = 0; i < fogColorKeyframes.length - 1; i++) {
        if (dayPhase >= fogColorKeyframes[i].position && dayPhase < fogColorKeyframes[i + 1].position) {
            startKeyframe = fogColorKeyframes[i];
            endKeyframe = fogColorKeyframes[i + 1];
            break;
        }
    }

    // If we somehow didn't find keyframes, use the last and first (night transition)
    if (!startKeyframe) {
        startKeyframe = fogColorKeyframes[fogColorKeyframes.length - 1];
        endKeyframe = fogColorKeyframes[0];
    }

    // Calculate how far we are between the two keyframes (0-1)
    const keyframeRange = endKeyframe.position - startKeyframe.position;
    const normalizedPosition = keyframeRange <= 0 ? 0 :
        (dayPhase - startKeyframe.position) / keyframeRange;

    // Create a new color by interpolating between keyframe colors
    const interpolatedColor = new THREE.Color();
    interpolatedColor.copy(startKeyframe.color).lerp(endKeyframe.color, normalizedPosition);

    // Desaturate the color to remove luminosity
    const nonLuminousColor = desaturateColor(interpolatedColor);

    // Convert to hex and set fog color
    const hexColor = nonLuminousColor.getHex();
    setFogColor(hexColor);
    updateFog(boat.position, deltaTime, getWindData());

    // Optional: Log the changing colors (uncomment for debugging)
    // console.log(`Fog color gradient: phase ${dayPhase.toFixed(2)}, color #${interpolatedColor.getHexString()}`);
}

// Calculate boat speed based on velocity
function calculateBoatSpeed() {
    // Convert internal velocity to knots (arbitrary scale for game purposes)
    return Math.abs(boatVelocity.z) * 20;
}

// Get wind direction and speed (you can make this dynamic later)

// Get time of day based on game time

// Find nearest island

// Update the UI in your animate function
function updateGameUI() {
    // Import at the top of your file: import { gameUI } from './ui.js';

    const windData = getWindData();
    const nearestIsland = findNearestAnyIsland(boat);
    const monsters = getMonsters(); // Get current monsters

    // Update UI with all available data
    gameUI.update({
        speed: calculateBoatSpeed(),
        heading: boat.rotation.y,
        position: boat.position,
        windDirection: windData.direction,
        windSpeed: windData.speed,
        timeOfDay: getTimeOfDay(),
        playerCount: Network.getConnectedPlayersCount(),
        isConnected: Network.isNetworkConnected(),
        nearestIsland: nearestIsland,
        mapScale: 200, // Scale factor for mini-map (adjust as needed)
        fishCount: getFishCount(),
        activeIslands: activeIslands, // Add this line to pass the islands
        monsters: monsters // Pass monsters to UI for radar display
    });

    // Add island markers to mini-map
    activeIslands.forEach((island, id) => {
        gameUI.addIslandMarker(id, island.collider.center, island.collider.radius);
    });

    // Add other player markers (if you have access to other players)
    // This would need to be integrated with your Network module
}

// Initialize by generating the starting chunks
lastChunkUpdatePosition.copy(boat.position);
updateAllIslandVisibility(boat, scene, waterShader, lastChunkUpdatePosition);

// Force an initial update to ensure islands are generated
setTimeout(() => {
    console.log("Forcing initial chunk update...");
    //updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition);

    // Add this line to initialize villagers after the first chunk update
    if (activeIslands && activeIslands.size > 0) {
        console.log(`Initializing villagers with ${activeIslands.size} islands`);
        //updateVillagers(activeIslands);
    }
}, 1000);

// Add keypress handler for toggling the sky system
window.addEventListener('keydown', (event) => {
    // Press 'T' to toggle sky system
    if (event.key === 't' || event.key === 'T') {
        console.log("Toggling sky system...");
        toggleSkySystem();
    }
});

animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Clean up when the page is closed
window.addEventListener('beforeunload', () => {
    Network.disconnect();
});


// Add gentle rocking motion based on boat speed and waves

// Create and add a simple blue skybox that changes with time of day

// Add these functions to your init and animate functions
// In your initialization:
setupSkybox();

// Initialize clouds
const clouds = setupClouds();

// Initialize birds
const birds = setupBirds(activeIslands, boat);

// Initialize sea monsters
const seaMonsters = setupSeaMonsters(boat);

// Initialize fishing system
initFishing(boat);

// Initialize cannon system
initCannons(boat, seaMonsters);

// Get monsters reference for cannon system
const monsters = getMonsters();

// Add this to your initialization code, after other UI systems are initialized
// (Near where you call initFishing, initCannons, etc.)
initLeaderboard();

// Example data
const leaderboardData = {
    monsterKills: [
        { name: 'PlayerName', value: 10, color: '#ff0000' },
        // more players...
    ],
    fishCount: [
        { name: 'PlayerName', value: 25, color: '#00ff00' },
        // more players...
    ],
    money: [
        { name: 'PlayerName', value: 1000, color: '#0000ff' },
        // more players...
    ]
};

updateLeaderboardData(leaderboardData);

// Add this after your other initialization code (near where you initialize other systems)
// This function is already configured to do nothing if ENABLE_DIAGNOSTICS is false
initDiagnostics();

// Create the coastal cliff scene at a position offset from the starting point
const startPosition = new THREE.Vector3(boat.position.x + 1000, 0, boat.position.z + 1000);
const cliffScene = spawnCoastalCliffScene(scene, startPosition);
console.log("Coastal cliff scene created at:", startPosition);

// Create a global command to show MOTD for testing
window.showMOTD = function () {
    console.log("🔔 Main: Manually showing MOTD via global command");
    forceShowMessageOfDay();
};

console.log("🔔 MOTD: Global command available - call window.showMOTD() to display");

/**
 * Initialize the game with proper UI sequence
 */
function initializeGame() {
    console.log("🎮 Main: Starting game initialization");

    // Check if we need to show Firebase auth and login screens
    const needsAuth = !getCurrentUser();
    const needsLogin = !localStorage.getItem('playerName');

    if (needsAuth || needsLogin) {
        // If auth or login needed, start the full screen sequence
        // which will show MOTD only AFTER login completes
        console.log('🔍 MAIN DEBUG: Starting screen sequence WITHOUT MOTD');
        startScreenSequence(() => {
            console.log('🔍 MAIN DEBUG: Screen sequence complete, handling auth result');
            const user = getCurrentUser(); // If you have this function
            onAuthAndLoginComplete(user);
        });
    } else {
        // User is already authenticated and has set their profile
        // Show MOTD directly if it should be shown today
        const { showMessageOfDay, shouldShowMessageOfDay } = require('../ui/motd.js');

        if (shouldShowMessageOfDay()) {
            showMessageOfDay(() => {
                finishInitialization();
            });
        } else {
            finishInitialization();
        }
    }
}

// Common finish function to avoid code duplication
function finishInitialization() {
    console.log("🎮 Main: UI sequence complete, initializing network");

    // Get current user state after all screens
    const firebaseUser = getCurrentUser();
    const playerInfo = getPlayerInfo();

    // Initialize network with collected player info
    Network.initializeNetwork(
        scene,
        playerState,
        boat,
        getAllIslandColliders(),
        activeIslands,
        playerInfo.name,
        hexToRgb(playerInfo.color),
        firebaseUser ? firebaseUser.uid : null
    );

    console.log("🎮 Main: Game fully initialized");
}

/**
 * Convert hex color to RGB (0-1 range for Three.js)
 */
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game with proper UI sequence
    initializeGame();

    // Start animation loop
    animate();
});

/**
 * Function to handle when login/auth is complete
 * This is the ONLY place we should show the MOTD!
 */
function onAuthAndLoginComplete(user) {
    console.log('🔍 MAIN DEBUG: Auth and login complete, user:', user?.displayName || 'No name');

    // Check if MOTD should be shown based on localStorage
    if (shouldShowMessageOfDay()) {
        console.log('🔍 MAIN DEBUG: MOTD should be shown, displaying it now...');
        showMessageOfDay(() => {
            console.log('🔍 MAIN DEBUG: MOTD closed, continuing with game initialization');
            initializeGameAfterLogin(user);
        });
    } else {
        console.log('🔍 MAIN DEBUG: MOTD already shown before, skipping');
        // Proceed directly to game initialization
        initializeGameAfterLogin(user);
    }
}

/**
 * Initialize the game after all login/MOTD screens
 */
function initializeGameAfterLogin(user) {
    console.log('🔍 MAIN DEBUG: Initializing game with user:', user?.displayName || 'No name');

    // Your network initialization code here
    // For example:
    if (typeof initializeNetworkWithPlayerInfo === 'function') {
        initializeNetworkWithPlayerInfo(user);
    } else {
        console.log('🔍 MAIN DEBUG: Network initialization function not found');
    }
}

function initializeWorld() {
    // ... existing setup code ...

    console.log("DEBUG: Initializing world with ONLY block cave");

    // Only spawn block cave
    if (typeof spawnBlockCave === 'function') {
        spawnBlockCave(scene, new THREE.Vector3(0, 0, 0));
    }

    // Ensure these don't run by replacing calls with console logs
    if (typeof spawnMassiveIsland === 'function') {
        console.log("DEBUG: Massive Island initialization DISABLED");
        // Do NOT call spawnMassiveIsland
    }

    if (typeof spawnCoastalCliffScene === 'function') {
        console.log("DEBUG: Coastal Cliff initialization DISABLED");
        // Do NOT call spawnCoastalCliffScene
    }

    // ... rest of initialization ...
}

// Initialize fog system with appropriate color
console.log("Initializing fog system...");
const fog = setupFog(scene, {
    color: 0x3a3a3a,  // Neutral gray
    near: 300,
    far: 1200,
    density: 0.0008,
    useExponentialFog: false  // Linear fog is better for non-luminous fog
});

// Function to desaturate colors to prevent luminosity
function desaturateColor(color) {
    const hsl = {};
    color.getHSL(hsl);

    // Drastically reduce saturation
    hsl.s = Math.min(hsl.s * 0.2, 0.1);

    // Cap lightness to prevent bright fog
    hsl.l = Math.min(hsl.l, 0.3);

    // Return modified color
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

toggleFog(scene);

// Initialize collision response system near other initialization code
const collisionResponseSystem = initCollisionResponse();
console.log("Island collision response system initialized");

export function setupAllPlayersTracking() {
    console.log("🎮 Setting up all players tracking...");

    // Register for all_players updates
    Network.onAllPlayers((players) => {
        // Update our gameState variable
        updateAllPlayers(players);
        console.log("📊 All Players Updated:", players.length, "players found");

        // Debug output the first few players
        if (players.length > 0) {
            console.log("📊 Sample Player Data:", players.slice(0, 3));
        }
    });

    // Request initial player list
    const requestSent = Network.getAllPlayers();
    console.log("🎮 Initial player list request sent:", requestSent);

    // Set up a periodic refresh every 10 seconds
    setInterval(() => {
        Network.getAllPlayers();

        // Print the current players from gameState
        const currentPlayers = getAllPlayers();
        console.log("⏱️ Periodic player check:", currentPlayers.length, "players in game state");
    }, 10000);
}


// Add this to an appropriate key handler
document.addEventListener('keydown', (e) => {
    // Open terminal with backtick/tilde key (common in games)
    if ((e.key === '`' || e.key === '~') && !window.chatInputActive && !window.terminalInputActive) {
        if (gameUI && gameUI.terminal) {
            gameUI.terminal.toggle();
            e.preventDefault();
        }
    }
});