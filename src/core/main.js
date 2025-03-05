import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import * as Network from './network.js';
import { gameUI } from '../ui/ui.js';
import { scene, camera, renderer, updateTime, getTime, boat, getWindData, boatVelocity, boatSpeed, rotationSpeed, keys } from './gameState.js';
import { setupSkybox, updateSkybox, setupSky, updateTimeOfDay, updateSunPosition, getTimeOfDay } from '../environment/skybox.js';
import { setupClouds, updateClouds } from '../environment/clouds.js';
import { setupBirds, updateBirds } from '../entities/birds.js';
import { setupSeaMonsters, updateSeaMonsters, getMonsters, updateLurkingMonster, updateHuntingMonster, updateSurfacingMonster, updateAttackingMonster, updateDivingMonster, updateDyingMonster, updateSpecialMonsterBehaviors } from '../entities/seaMonsters.js';
import { initFishing, updateFishing, getFishCount } from '../gameplay/fishing.js';
import { initCannons, updateCannons } from '../gameplay/cannons.js';
import { animateSail } from '../animations/animations.js';
import { applyWindInfluence, updateBoatRocking } from '../entities/character.js';
import { initLeaderboard, updateLeaderboardData } from '../ui/leaderboard.js';
import { requestLeaderboard } from './network.js';
import { updateVillagers } from '../entities/villagers.js';
import {
    islandColliders,
    activeIslands,
    activeWaterChunks,
    updateVisibleChunks,
    findNearestIsland,
    checkIslandCollision
} from '../world/islands.js';
import MusicSystem from '../audio/music.js';
import { initCameraControls, updateCameraPosition } from '../controls/cameraControls.js';
import { setupWater, updateWater } from '../environment/water.js';
import { initDiagnostics, updateDiagnosticsDisplay, ENABLE_DIAGNOSTICS } from '../ui/diagnostics.js';
import * as Firebase from './firebase.js';

const water = setupWater();

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
requestLeaderboard();
MusicSystem.playMusic();
MusicSystem.setVolume(0.1); // 30% volume


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
        console.log("Firebase authentication successful:", user);

        // Firebase auth will proceed in parallel with existing login
        // User profile will be available through Firebase.getUserProfile()
        initializeNetworkWithPlayerInfo();
    });
}

// Add this call early in your initialization sequence 
// (can be placed right before or after other initialization code)
initializeFirebaseAuth();

// Create a simple login UI
function showLoginScreen() {
    // Create container
    const loginContainer = document.createElement('div');
    loginContainer.style.position = 'fixed';
    loginContainer.style.top = '0';
    loginContainer.style.left = '0';
    loginContainer.style.width = '100%';
    loginContainer.style.height = '100%';
    loginContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    loginContainer.style.display = 'flex';
    loginContainer.style.justifyContent = 'center';
    loginContainer.style.alignItems = 'center';
    loginContainer.style.zIndex = '1000';

    // Create form
    const form = document.createElement('div');
    form.style.backgroundColor = 'white';
    form.style.padding = '20px';
    form.style.borderRadius = '5px';
    form.style.width = '300px';

    // Name input
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'Your Name:';
    nameLabel.style.marginBottom = '5px';
    form.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style.width = '100%';
    nameInput.style.marginBottom = '15px';
    nameInput.style.padding = '5px';
    nameInput.value = 'Sailor ' + Math.floor(Math.random() * 1000);
    form.appendChild(nameInput);

    // Color selection
    const colorLabel = document.createElement('div');
    colorLabel.textContent = 'Choose Color:';
    colorLabel.style.marginBottom = '5px';
    form.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = playerColor;
    colorInput.style.width = '100%';
    colorInput.style.marginBottom = '15px';
    colorInput.style.height = '40px';
    form.appendChild(colorInput);

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Start Sailing';
    submitButton.style.width = '100%';
    submitButton.style.padding = '10px';
    submitButton.style.backgroundColor = '#3498db';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '5px';
    submitButton.style.cursor = 'pointer';
    form.appendChild(submitButton);

    // Handle form submission
    submitButton.addEventListener('click', () => {
        playerName = nameInput.value.trim() || nameInput.value;
        playerColor = colorInput.value;

        // Remove login screen
        document.body.removeChild(loginContainer);

        // Connect to server with player info
        initializeNetworkWithPlayerInfo();
    });

    loginContainer.appendChild(form);
    document.body.appendChild(loginContainer);
}

// Initialize network with player info
function initializeNetworkWithPlayerInfo() {
    console.log(`Connecting as: ${playerName} with color: ${playerColor}`);

    // Convert hex color to RGB (0-1 range for Three.js)
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { r, g, b };
    };

    const rgbColor = hexToRgb(playerColor);
    console.log("RGB Color:", rgbColor);

    // Initialize network connection
    Network.initializeNetwork(
        scene,
        playerState,
        boat,
        islandColliders,
        activeIslands,
        playerName,
        rgbColor
    );
}

// Replace your existing setTimeout for network initialization with this:
/*
setTimeout(() => {
    console.log("Showing player setup screen...");
    showLoginScreen();
}, 2000);
*/

// Island generation variables
const visibleDistance = 2000; // Increased to see islands from even further away
const chunkSize = 600; // Size of each "chunk" of ocean
const islandsPerChunk = 3; // Increased from 2 to have more islands per chunk
const maxViewDistance = 5; // Increased to render islands further away

// Store generated chunks

// Function to generate a chunk key based on coordinates
function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

// Function to determine which chunk coordinates contain a given position
function getChunkCoords(x, z) {
    return {
        x: Math.floor(x / chunkSize),
        z: Math.floor(z / chunkSize)
    };
}

// Function to create a water chunk at specified coordinates
function createWaterChunk(chunkX, chunkZ) {
    const chunkKey = getChunkKey(chunkX, chunkZ);

    // Skip if this water chunk already exists
    if (activeWaterChunks.has(chunkKey)) {
        return;
    }

    // Create water geometry for this chunk - using fewer segments for better performance
    const waterGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 16, 16);

    // Create water material using the shader
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: waterShader.uniforms,
        vertexShader: waterShader.vertexShader,
        fragmentShader: waterShader.fragmentShader,
        side: THREE.DoubleSide,
    });

    // Create water mesh
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;

    // Position the water chunk correctly in the world
    water.position.set(
        chunkX * chunkSize + chunkSize / 2,
        0,
        chunkZ * chunkSize + chunkSize / 2
    );

    // Add to scene
    scene.add(water);

    // Store in active water chunks
    activeWaterChunks.set(chunkKey, water);

    return water;
}

// Function to generate islands in a chunk based on chunk coordinates
function generateChunk(chunkX, chunkZ) {
    const chunkKey = getChunkKey(chunkX, chunkZ);

    // Skip if this chunk has already been generated
    if (generatedChunks.has(chunkKey)) {
        return;
    }

    // Add to set of generated chunks
    generatedChunks.add(chunkKey);

    // Use chunk coordinates as seed for deterministic generation
    // Use large prime numbers to avoid patterns in the generation
    let chunkSeed = Math.abs(chunkX * 73856093 ^ chunkZ * 19349663);

    // Create a simple deterministic random function for this chunk
    const seededRandom = () => {
        chunkSeed = (chunkSeed * 9301 + 49297) % 233280;
        return chunkSeed / 233280;
    };

    // Generate islands for this chunk
    for (let i = 0; i < islandsPerChunk; i++) {
        // Generate position within this chunk, but avoid edges to prevent islands from being too close to chunk boundaries
        const margin = 100; // Margin from chunk edges
        const islandX = (chunkX * chunkSize) + margin + seededRandom() * (chunkSize - 2 * margin);
        const islandZ = (chunkZ * chunkSize) + margin + seededRandom() * (chunkSize - 2 * margin);

        // Create a seed for this specific island based on its coordinates
        const islandSeed = Math.floor(islandX * 13371 + islandZ * 92717);

        // Create the island
        createIsland(islandX, islandZ, islandSeed);
    }
}

/// Function to create a single island with specified parameters
function createIsland(x, z, seed) {
    // Use the seed to create deterministic randomness for this island
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    // Create a unique ID for this island
    const islandId = `island_${Math.floor(x)}_${Math.floor(z)}`;

    // Skip if this island already exists
    if (activeIslands.has(islandId)) {
        return;
    }

    // Island group to hold all parts
    const island = new THREE.Group();
    island.position.set(x, 0, z);
    scene.add(island);

    // Add island collider
    const collider = {
        center: new THREE.Vector3(x, 0, z),
        radius: 50, // Island radius
        id: islandId
    };
    islandColliders.push(collider);

    // Beach
    const beachGeometry = new THREE.CylinderGeometry(50, 55, 5, 64);
    const beachColor = new THREE.Color().setHSL(0.12 + random() * 0.05, 0.9, 0.7);
    const beachMaterial = new THREE.MeshPhongMaterial({ color: beachColor });
    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.position.y = 0;
    island.add(beach);

    // Create a palette of vibrant colors for this island
    const islandPalette = [
        new THREE.Color().setHSL(random(), 0.85, 0.6),
        new THREE.Color().setHSL(random(), 0.9, 0.7),
        new THREE.Color().setHSL(random(), 0.8, 0.5)
    ];

    // Determine if this island should have a mega structure (roughly 20% chance)
    const hasMegaStructure = random() < 0.2;

    if (hasMegaStructure) {
        // Choose a type of mega structure
        const structureType = Math.floor(random() * 4); // 0-3 different types

        switch (structureType) {
            case 0: // Ancient Temple
                createAncientTemple(island, random);
                break;
            case 1: // Lighthouse
                createLighthouse(island, random);
                break;
            case 2: // Giant Statue
                createGiantStatue(island, random);
                break;
            case 3: // Ruined Tower
                createRuinedTower(island, random);
                break;
        }
    } else {
        // Regular island with mountains if no mega structure
        // Multiple mountain peaks
        for (let p = 0; p < 3; p++) {
            const peakSize = 15 + random() * 15;
            const peakHeight = 15 + random() * 20;
            const mountainGeometry = new THREE.ConeGeometry(peakSize, peakHeight, 32);

            const mountainMaterial = new THREE.MeshPhongMaterial({
                color: islandPalette[p % islandPalette.length],
                shininess: 30,
                specular: 0x333333
            });

            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            const peakAngle = random() * Math.PI * 2;
            const peakDistance = random() * 25;
            mountain.position.set(
                Math.cos(peakAngle) * peakDistance,
                2.5,
                Math.sin(peakAngle) * peakDistance
            );
            mountain.rotation.y = random() * Math.PI * 2;
            island.add(mountain);
        }
    }

    // Vegetation (always add some trees regardless of structure)
    for (let v = 0; v < 10; v++) {
        const treeGeometry = new THREE.CylinderGeometry(0, 8, 15, 8);
        const treeColor = new THREE.Color().setHSL(0.3 + random() * 0.1, 0.9, 0.4 + random() * 0.2);
        const treeMaterial = new THREE.MeshPhongMaterial({ color: treeColor });
        const tree = new THREE.Mesh(treeGeometry, treeMaterial);

        const treeAngle = random() * Math.PI * 2;
        const treeDistance = 20 + random() * 25; // Place trees more toward the edges
        tree.position.set(
            Math.cos(treeAngle) * treeDistance,
            5,
            Math.sin(treeAngle) * treeDistance
        );
        island.add(tree);
    }

    // Store the island with its ID
    activeIslands.set(islandId, {
        mesh: island,
        collider: collider
    });

    return island;
}

// Function to create an ancient temple mega structure
function createAncientTemple(island, random) {
    // Base platform
    const baseGeometry = new THREE.BoxGeometry(40, 10, 40);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0xd2b48c,
        roughness: 0.8,
        metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Temple steps
    const stepsGeometry = new THREE.BoxGeometry(30, 5, 30);
    const steps = new THREE.Mesh(stepsGeometry, baseMaterial);
    steps.position.y = 12.5;
    island.add(steps);

    // Main temple structure
    const templeGeometry = new THREE.BoxGeometry(20, 15, 20);
    const templeMaterial = new THREE.MeshPhongMaterial({
        color: 0xc2a278,
        roughness: 0.7,
        metalness: 0.1
    });
    const temple = new THREE.Mesh(templeGeometry, templeMaterial);
    temple.position.y = 22.5;
    island.add(temple);

    // Temple roof
    const roofGeometry = new THREE.ConeGeometry(15, 10, 4);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xa52a2a });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 35;
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    island.add(roof);

    // Columns
    const columnPositions = [
        [-12, 0, -12], [12, 0, -12], [-12, 0, 12], [12, 0, 12]
    ];

    columnPositions.forEach(pos => {
        const columnGeometry = new THREE.CylinderGeometry(2, 2, 20, 16);
        const column = new THREE.Mesh(columnGeometry, baseMaterial);
        column.position.set(pos[0], 20, pos[2]);
        island.add(column);
    });
}

let lastLeaderboardUpdate = 0;
const LEADERBOARD_UPDATE_INTERVAL = 10000; // 10 seconds

// Function to create a lighthouse mega structure
function createLighthouse(island, random) {
    // Base
    const baseGeometry = new THREE.CylinderGeometry(15, 18, 10, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Tower
    const towerGeometry = new THREE.CylinderGeometry(8, 12, 40, 32);
    const towerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        roughness: 0.5
    });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = 30;
    island.add(tower);

    // Red stripes
    const stripesGeometry = new THREE.CylinderGeometry(8.1, 12.1, 40, 32, 5, true);
    const stripesMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        side: THREE.BackSide
    });
    const stripes = new THREE.Mesh(stripesGeometry, stripesMaterial);
    stripes.position.y = 30;

    // Only show stripes on certain segments
    const count = stripesGeometry.attributes.position.count;
    const visible = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        // Every other segment
        visible[i] = (Math.floor(i / (count / 5)) % 2 ? 1.0 : 0.0);
    }
    stripesGeometry.setAttribute('visible', new THREE.BufferAttribute(visible, 1));
    stripesMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            `attribute float visible;
            varying float vVisible;
            void main() {
                vVisible = visible;`
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nif (vVisible < 0.5) { transformed = vec3(0.0);}'
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `varying float vVisible;
            void main() {
                if (vVisible < 0.5) discard;`
        );
    };
    island.add(stripes);

    // Lantern room
    const lanternGeometry = new THREE.CylinderGeometry(10, 10, 8, 16);
    const lanternMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });
    const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    lantern.position.y = 54;
    island.add(lantern);

    // Light source
    const lightGeometry = new THREE.SphereGeometry(6, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.y = 54;
    island.add(light);

    // Add a point light
    const pointLight = new THREE.PointLight(0xffff00, 1, 100);
    pointLight.position.y = 54;
    island.add(pointLight);
}

// Function to create a giant statue mega structure
function createGiantStatue(island, random) {
    // Base/pedestal
    const baseGeometry = new THREE.BoxGeometry(20, 10, 20);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Statue body
    const bodyGeometry = new THREE.CylinderGeometry(5, 8, 25, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xd4af37, // Gold color
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 22.5;
    island.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(6, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 38;
    island.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(2, 2, 20, 8);

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-8, 30, 0);
    leftArm.rotation.z = Math.PI / 4; // 45 degrees up
    island.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(8, 30, 0);
    rightArm.rotation.z = -Math.PI / 4; // 45 degrees up
    island.add(rightArm);

    // Crown/headdress
    const crownGeometry = new THREE.ConeGeometry(6, 8, 16);
    const crown = new THREE.Mesh(crownGeometry, bodyMaterial);
    crown.position.y = 45;
    island.add(crown);
}

// Function to create a ruined tower mega structure
// Function to create a ruined tower mega structure
function createRuinedTower(island, random) {
    // Base of the tower
    const baseGeometry = new THREE.CylinderGeometry(15, 18, 10, 16);
    const stoneMaterial = new THREE.MeshPhongMaterial({
        color: 0x777777,
        roughness: 0.9
    });
    const base = new THREE.Mesh(baseGeometry, stoneMaterial);
    base.position.y = 5;
    island.add(base);

    // Tower sections with progressive damage
    const sections = 5;
    const maxHeight = 50;
    const sectionHeight = maxHeight / sections;

    for (let i = 0; i < sections; i++) {
        // Each section gets more damaged as we go up
        const damage = i / sections; // 0 to almost 1
        const radius = 12 - (i * 1.5); // Narrower as we go up
        const completeness = 1 - (damage * 0.7); // How complete the circle is

        // Create a cylinder with a portion missing
        const sectionGeometry = new THREE.CylinderGeometry(
            radius - 1, radius,
            sectionHeight,
            16, 1,
            false, // Open ended?
            0, // Start angle
            completeness * Math.PI * 2 // End angle (partial for damage)
        );

        // Rotate each section randomly for varied damage
        const section = new THREE.Mesh(sectionGeometry, stoneMaterial);
        section.position.y = 10 + (i * sectionHeight) + sectionHeight / 2;
        section.rotation.y = random() * Math.PI * 2;
        island.add(section);

        // Add some fallen debris around the base
        if (i > 1) { // More debris from higher sections
            const debrisCount = Math.floor(random() * 3) + 1;
            for (let d = 0; d < debrisCount; d++) {
                const debrisSize = 2 + random() * 3;
                const debrisGeometry = new THREE.BoxGeometry(debrisSize, debrisSize, debrisSize);
                const debris = new THREE.Mesh(debrisGeometry, stoneMaterial);

                // Position debris around the base
                const angle = random() * Math.PI * 2;
                const distance = 15 + random() * 25;
                debris.position.set(
                    Math.cos(angle) * distance,
                    2 + random() * 3, // Slightly above ground
                    Math.sin(angle) * distance
                );

                // Random rotation for natural look
                debris.rotation.set(
                    random() * Math.PI,
                    random() * Math.PI,
                    random() * Math.PI
                );

                island.add(debris);
            }
        }
    }

    // Add some larger fallen sections
    const largeDebrisCount = 2 + Math.floor(random() * 3);
    for (let d = 0; d < largeDebrisCount; d++) {
        // Create a partial cylinder section as a large piece of debris
        const angle = random() * Math.PI * 0.5; // How much of the cylinder to use
        const largeDebrisGeometry = new THREE.CylinderGeometry(
            5 + random() * 3,
            6 + random() * 3,
            8 + random() * 10,
            16, 1, false,
            0, angle
        );

        const largeDebris = new THREE.Mesh(largeDebrisGeometry, stoneMaterial);

        // Position large debris further from the tower
        const debrisAngle = random() * Math.PI * 2;
        const debrisDistance = 25 + random() * 20;
        largeDebris.position.set(
            Math.cos(debrisAngle) * debrisDistance,
            2,
            Math.sin(debrisAngle) * debrisDistance
        );

        // Rotate to look like it fell over
        largeDebris.rotation.set(
            Math.PI / 2 + (random() * 0.5 - 0.25), // Mostly on its side
            random() * Math.PI * 2,
            random() * Math.PI * 0.3
        );

        island.add(largeDebris);
    }

    // Add some vegetation growing on the ruins
    for (let v = 0; v < 5; v++) {
        const vineGeometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 8);
        const vineColor = new THREE.Color().setHSL(0.3 + random() * 0.1, 0.8, 0.4);
        const vineMaterial = new THREE.MeshPhongMaterial({ color: vineColor });
        const vine = new THREE.Mesh(vineGeometry, vineMaterial);

        // Position vines on the tower
        const vineAngle = random() * Math.PI * 2;
        const vineHeight = 10 + random() * 30;
        const vineRadius = 12 - (vineHeight / maxHeight * 5); // Match tower radius at that height

        vine.position.set(
            Math.cos(vineAngle) * vineRadius,
            vineHeight,
            Math.sin(vineAngle) * vineRadius
        );

        // Angle vines to droop down the tower
        vine.rotation.x = Math.PI / 2 - 0.5 - random() * 0.5;
        vine.rotation.y = random() * Math.PI * 2;

        island.add(vine);
    }

    // Add a mysterious glow at the top
    const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.7
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = maxHeight + 5;
    island.add(glow);

    // Add a point light for the glow
    const glowLight = new THREE.PointLight(0x66ccff, 1, 50);
    glowLight.position.y = maxHeight + 5;
    island.add(glowLight);
}

// Update camera positioning in the animation loop
// Replace the existing camera positioning code (around line 1289) with:
function updateCamera() {
    // Increased camera height and distance for the larger boat
    const cameraOffset = new THREE.Vector3(0, 12, 20).applyQuaternion(boat.quaternion);
    camera.position.copy(boat.position).add(cameraOffset);

    if (mouseControl.isEnabled) {
        const horizontalAngle = Math.max(Math.min(mouseControl.mouseX * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);
        const verticalAngle = Math.max(Math.min(-mouseControl.mouseY * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);

        // Calculate subtle camera rotation amount (for the 3D ship effect)
        const rotationZ = Math.max(Math.min(mouseControl.mouseX * mouseControl.rotationSensitivity, mouseControl.maxRotation), -mouseControl.maxRotation);

        // Apply subtle rotation to camera around its z-axis
        camera.rotation.z = rotationZ;

        const lookTarget = boat.position.clone();
        // Look at a higher point on the boat (near the mast)
        lookTarget.y += 4;

        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
        lookTarget.add(rightVector.multiplyScalar(horizontalAngle * 50));
        lookTarget.y += verticalAngle * 50;
        camera.lookAt(lookTarget);

        // Add a slight "bank" to the camera based on horizontal mouse position
        // This is separate from the z-rotation and creates a more natural feel
        const bankAngle = horizontalAngle * 0.3; // 30% of the look angle
        camera.up.set(Math.sin(bankAngle), 1, 0).normalize();
    } else {
        // Look at a higher point on the boat instead of just the position
        const lookTarget = boat.position.clone();
        lookTarget.y += 4;
        camera.lookAt(lookTarget);
    }
}

// Make sure to call updateCamera() in your animation loop
// Replace the camera positioning code in your animate function with:
// updateCamera();

// Boat controls (slower)

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
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w': case 'ArrowUp': keys.backward = true; break;
        case 's': case 'ArrowDown': keys.forward = true; break;
        case 'a': case 'ArrowLeft': keys.left = true; break;
        case 'd': case 'ArrowRight': keys.right = true; break;
        // Toggle mouse camera control with 'c' key
        case 'c': mouseControl.isEnabled = !mouseControl.isEnabled; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w': case 'ArrowUp': keys.backward = false; break;
        case 's': case 'ArrowDown': keys.forward = false; break;
        case 'a': case 'ArrowLeft': keys.left = false; break;
        case 'd': case 'ArrowRight': keys.right = false; break;
    }
});

// Animation
let lastChunkUpdatePosition = new THREE.Vector3();
const chunkUpdateThreshold = 50; // Reduced from 100 to update chunks more frequently


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

    // Boat movement
    if (keys.forward) boatVelocity.z -= boatSpeed;
    if (keys.backward) boatVelocity.z += boatSpeed;
    if (keys.left) boat.rotation.y += rotationSpeed;
    if (keys.right) boat.rotation.y -= rotationSpeed;

    // Apply velocity and friction
    boatVelocity.multiplyScalar(0.5);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
    let newPosition = boat.position.clone().add(direction.multiplyScalar(boatVelocity.z));

    // Update boat rocking motion
    updateBoatRocking(deltaTime);

    // Check for island collisions
    let collided = false;
    if (checkIslandCollision(newPosition)) {
        collided = true;
    }

    if (!collided) {
        boat.position.copy(newPosition);

        if (boat.position.distanceTo(lastChunkUpdatePosition) > chunkUpdateThreshold) {
            updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition);
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

    // Add these lines for more consistent water placement
    // Baseline height detection and correction
    const normalWaterLevel = 0; // Expected average water level
    const baseWaterLevel = normalWaterLevel; // Default water level if calculation fails

    // Dampen bobbing effect to 50%
    const bobbingFactor = 0.5; // Reduce vertical movement by 50%
    const dampedHeight = baseWaterLevel * (1 - bobbingFactor) + interpolatedHeight * bobbingFactor;

    // Set appropriate float offset (lower value = lower in water)
    const floatOffset = 0.7; // Reduced from 1.5 to sit lower in water

    // Smooth transitions between heights to prevent jumps
    if (!boat.lastHeight) boat.lastHeight = dampedHeight + floatOffset;
    const targetHeight = dampedHeight + floatOffset;
    const smoothingFactor = 0.1; // Lower = smoother but slower transitions
    boat.position.y = boat.lastHeight + (targetHeight - boat.lastHeight) * smoothingFactor;
    boat.lastHeight = boat.position.y;

    // Add safeguard against extreme heights (in case of calculation errors)
    if (Math.abs(boat.position.y) > 10) { // If boat gets too high or low
        console.warn("Boat height correction triggered:", boat.position.y);
        boat.position.y = normalWaterLevel + floatOffset; // Reset to normal level
        boat.lastHeight = boat.position.y;
    }

    // Update leaderboard periodically
    if (getTime() - lastLeaderboardUpdate > LEADERBOARD_UPDATE_INTERVAL) {
        requestLeaderboard();
        lastLeaderboardUpdate = time;
    }

    // Debugging
    // Camera positioning
    updateCamera();

    // Network and UI updates
    Network.updatePlayerPosition();
    updateGameUI();

    // Update sun position relative to camera
    updateSunPosition();
    updateSkybox();

    // Update clouds based on boat position
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

    // Update water
    //updateWater(deltaTime);

    //water2.update(deltaTime);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    //composer.render();

    // Update FPS counter
    const currentFps = 1 / deltaTime;

    // Update diagnostics with current FPS (only does something if diagnostics is enabled)
    updateDiagnosticsDisplay(currentFps);
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
    const nearestIsland = findNearestIsland();
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
updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition);

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