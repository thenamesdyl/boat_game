import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import * as Network from './network.js';
import { gameUI } from './ui.js';


// Add these variables to your global scope
let skyMaterial;
let skyMesh;
let lastTimeOfDay = "";
let skyboxTransitionProgress = 0;
let skyboxTransitionDuration = 20; // Seconds for transition
let lastTime = null;
let sunMesh;
const sunSize = 100; // Increased from 10 to make the sun larger
const skyRadius = 20001; // Larger sky radius

// Add these variables near the top with your other boat variables
let boatRockAngleX = 0; // Pitch (forward/backward rocking)
let boatRockAngleZ = 0; // Roll (side-to-side rocking)
const rockSpeed = 1.5; // How fast the boat rocks
const maxRockAngle = 0.04; // Maximum rocking angle in radians (about 2.3 degrees)

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);


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
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Add sky setup here
setupSky();

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
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
scene.add(water);


// Add this at the beginning of your script.js file
let playerName = '';
let playerColor = '#3498db'; // Default blue

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
setTimeout(() => {
    console.log("Showing player setup screen...");
    showLoginScreen();
}, 2000);


// Island generation variables
let islandColliders = [];
const visibleDistance = 2000; // Increased to see islands from even further away
const chunkSize = 600; // Size of each "chunk" of ocean
const islandsPerChunk = 3; // Increased from 2 to have more islands per chunk
const maxViewDistance = 5; // Increased to render islands further away

// Store generated chunks
const generatedChunks = new Set();
const activeIslands = new Map(); // Maps island ID to island object
const activeWaterChunks = new Map(); // Maps water chunk ID to water mesh

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
        visible[i] = (Math.floor(i / (count / 5)) % 2) ? 1.0 : 0.0;
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

// Function to update visible chunks based on boat position
function updateVisibleChunks() {
    // Get current chunk coordinates based on boat position
    const currentChunk = getChunkCoords(boat.position.x, boat.position.z);

    // Set to track chunks that should be visible
    const chunksToKeep = new Set();
    const waterChunksToKeep = new Set();

    // Generate chunks in view distance
    for (let xOffset = -maxViewDistance; xOffset <= maxViewDistance; xOffset++) {
        for (let zOffset = -maxViewDistance; zOffset <= maxViewDistance; zOffset++) {
            const chunkX = currentChunk.x + xOffset;
            const chunkZ = currentChunk.z + zOffset;
            const chunkKey = getChunkKey(chunkX, chunkZ);

            // Add to set of chunks to keep
            chunksToKeep.add(chunkKey);

            // For water, we need a slightly larger view distance to avoid seeing edges
            if (Math.abs(xOffset) <= maxViewDistance + 1 && Math.abs(zOffset) <= maxViewDistance + 1) {
                waterChunksToKeep.add(chunkKey);
                // Create water chunk if needed
                createWaterChunk(chunkX, chunkZ);
            }

            // Generate this chunk if needed
            generateChunk(chunkX, chunkZ);
        }
    }

    // Remove islands that are too far away
    const islandsToRemove = [];
    activeIslands.forEach((island, id) => {
        // Calculate distance to boat
        const distance = boat.position.distanceTo(island.collider.center);

        // Get the chunk this island belongs to
        const islandChunkX = Math.floor(island.collider.center.x / chunkSize);
        const islandChunkZ = Math.floor(island.collider.center.z / chunkSize);
        const islandChunkKey = getChunkKey(islandChunkX, islandChunkZ);

        // If the island is too far or its chunk is not in the keep set, mark for removal
        if (distance > visibleDistance || !chunksToKeep.has(islandChunkKey)) {
            islandsToRemove.push(id);
        }
    });

    // Remove marked islands
    islandsToRemove.forEach(id => {
        const island = activeIslands.get(id);
        if (island) {
            // Remove from scene
            scene.remove(island.mesh);

            // Remove collider
            const colliderIndex = islandColliders.findIndex(c => c.id === id);
            if (colliderIndex !== -1) {
                islandColliders.splice(colliderIndex, 1);
            }

            // Remove from active islands
            activeIslands.delete(id);
        }
    });

    // Remove water chunks that are too far away
    const waterChunksToRemove = [];
    activeWaterChunks.forEach((waterChunk, chunkKey) => {
        if (!waterChunksToKeep.has(chunkKey)) {
            waterChunksToRemove.push(chunkKey);
        }
    });

    // Remove marked water chunks
    waterChunksToRemove.forEach(chunkKey => {
        const waterChunk = activeWaterChunks.get(chunkKey);
        if (waterChunk) {
            // Remove from scene
            scene.remove(waterChunk);

            // Remove from active water chunks
            activeWaterChunks.delete(chunkKey);
        }
    });

    // Debug info - log the number of active islands and chunks
    console.log(`Active islands: ${activeIslands.size}, Generated chunks: ${generatedChunks.size}, Water chunks: ${activeWaterChunks.size}`);
    console.log(`Current position: ${Math.floor(boat.position.x)}, ${Math.floor(boat.position.z)}, Current chunk: ${currentChunk.x}, ${currentChunk.z}`);
}

// Create a larger boat
function createBoat() {
    // Create boat group
    let boat = new THREE.Group();

    // Create larger hull (increased from 2x1x4 to 6x2x12)
    const hullGeometry = new THREE.BoxGeometry(6, 2, 12);
    const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 1; // Adjusted for larger size
    boat.add(hull);

    // Add front extension of the boat (forecastle)
    const frontExtensionGeometry = new THREE.BoxGeometry(4, 1.8, 3);
    const frontExtensionMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        name: 'frontExtensionMaterial'
    });
    const frontExtension = new THREE.Mesh(frontExtensionGeometry, frontExtensionMaterial);
    frontExtension.position.set(0, 1, -7.5); // Moved to front (negative Z)
    frontExtension.userData.isNotPlayerColorable = true;
    boat.add(frontExtension);

    // Add front cannon
    const frontCannonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 12);
    const frontCannonMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111, // Black color for cannons
        specular: 0x333333,
        shininess: 30,
        name: 'cannonMaterial'
    });
    const frontCannon = new THREE.Mesh(frontCannonGeometry, frontCannonMaterial);
    frontCannon.rotation.x = -Math.PI / 2; // Rotated to point forward
    frontCannon.position.set(0, 2.3, -9); // Positioned at front of ship (negative Z)
    frontCannon.userData.isNotPlayerColorable = true;
    boat.add(frontCannon);

    // Front cannon mount
    const frontMountGeometry = new THREE.BoxGeometry(2.5, 0.5, 0.5);
    const frontMountMaterial = new THREE.MeshPhongMaterial({
        color: 0x5c3317, // Dark brown for the mount
        name: 'mountMaterial'
    });
    const frontMount = new THREE.Mesh(frontMountGeometry, frontMountMaterial);
    frontMount.position.set(0, 2, -8.5); // Positioned at front
    frontMount.userData.isNotPlayerColorable = true;
    boat.add(frontMount);

    // Add a deck with fixed brown color
    const deckGeometry = new THREE.BoxGeometry(5.8, 0.3, 11.8);
    const deckMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513, // Brown color for deck
        name: 'deckMaterial' // Add a name to identify this material
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 2.15; // Position on top of hull
    deck.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    boat.add(deck);

    // Add cannons (two black cannons on the sides)
    const cannonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 12);
    const cannonMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111, // Black color for cannons
        specular: 0x333333,
        shininess: 30,
        name: 'cannonMaterial'
    });

    // Left cannon
    const leftCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    leftCannon.rotation.z = Math.PI / 2; // Rotate 90 degrees to point outward
    leftCannon.position.set(-3.2, 2.3, 0); // Position on left side of hull
    leftCannon.userData.isNotPlayerColorable = true;
    boat.add(leftCannon);

    // Right cannon
    const rightCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    rightCannon.rotation.z = -Math.PI / 2; // Rotate -90 degrees to point outward
    rightCannon.position.set(3.2, 2.3, 0); // Position on right side of hull
    rightCannon.userData.isNotPlayerColorable = true;
    boat.add(rightCannon);

    // Add cannon mounts
    const mountGeometry = new THREE.BoxGeometry(0.5, 0.5, 2.5);
    const mountMaterial = new THREE.MeshPhongMaterial({
        color: 0x5c3317, // Dark brown for the mounts
        name: 'mountMaterial'
    });

    // Left cannon mount
    const leftMount = new THREE.Mesh(mountGeometry, mountMaterial);
    leftMount.position.set(-3, 2, 0);
    leftMount.userData.isNotPlayerColorable = true;
    boat.add(leftMount);

    // Right cannon mount
    const rightMount = new THREE.Mesh(mountGeometry, mountMaterial);
    rightMount.position.set(3, 2, 0);
    rightMount.userData.isNotPlayerColorable = true;
    boat.add(rightMount);

    // Continue with the rest of your boat parts...
    // Add a much taller mast (increased from 3 to 12)
    const mastGeometry = new THREE.CylinderGeometry(0.25, 0.25, 12, 8);
    const mastMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513, // Brown color for mast
        name: 'mastMaterial'
    });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.y = 8; // Positioned higher for taller mast
    mast.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    boat.add(mast);

    // Add a larger sail
    const sailGeometry = new THREE.PlaneGeometry(5, 9);
    const sailMaterial = new THREE.MeshPhongMaterial({
        color: 0xf5f5f5,
        side: THREE.DoubleSide,
        name: 'sailMaterial'
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.rotation.y = Math.PI / 2;
    sail.position.set(0, 8, 1.5); // Positioned on the mast
    sail.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    boat.add(sail);

    // Rest of the boat code...

    // Position the boat
    boat.position.set(0, 0.5, 0);
    scene.add(boat);

    // Add a small Minecraft-style character to the front of the boat
    addCharacterToBoat(boat);

    return boat;
}

// Update or replace the existing boat creation code with the function above
// Then call it to create the boat:
const boat = createBoat();

// Update camera positioning in the animation loop
// Replace the existing camera positioning code (around line 1289) with:
function updateCamera() {
    // Increased camera height and distance for the larger boat
    const cameraOffset = new THREE.Vector3(0, 12, 20).applyQuaternion(boat.quaternion);
    camera.position.copy(boat.position).add(cameraOffset);

    if (mouseControl.isEnabled) {
        const horizontalAngle = Math.max(Math.min(mouseControl.mouseX * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);
        const verticalAngle = Math.max(Math.min(-mouseControl.mouseY * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);

        const lookTarget = boat.position.clone();
        // Look at a higher point on the boat (near the mast)
        lookTarget.y += 4;

        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
        lookTarget.add(rightVector.multiplyScalar(horizontalAngle * 50));
        lookTarget.y += verticalAngle * 50;
        camera.lookAt(lookTarget);
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
const boatVelocity = new THREE.Vector3(0, 0, 0);
const boatSpeed = 0.2; // Much slower speed (was 0.03)
const rotationSpeed = 0.03; // Slower turning (was 0.03)
const keys = { forward: false, backward: false, left: false, right: false };

// Mouse camera control variables
const mouseControl = {
    isEnabled: true,
    sensitivity: 0.05, // Low sensitivity for subtle movement
    maxAngle: 0.3, // Maximum rotation angle in radians (about 17 degrees)
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
        case 'w': case 'ArrowUp': keys.forward = true; break;
        case 's': case 'ArrowDown': keys.backward = true; break;
        case 'a': case 'ArrowLeft': keys.left = true; break;
        case 'd': case 'ArrowRight': keys.right = true; break;
        // Toggle mouse camera control with 'c' key
        case 'c': mouseControl.isEnabled = !mouseControl.isEnabled; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w': case 'ArrowUp': keys.forward = false; break;
        case 's': case 'ArrowDown': keys.backward = false; break;
        case 'a': case 'ArrowLeft': keys.left = false; break;
        case 'd': case 'ArrowRight': keys.right = false; break;
    }
});

// Animation
let time = 0;
let lastChunkUpdatePosition = new THREE.Vector3();
const chunkUpdateThreshold = 50; // Reduced from 100 to update chunks more frequently


// Add this function to set up the sky
function setupSky() {
    // Create a sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 32);
    // Inside faces
    skyGeometry.scale(-1, 1, 1);

    // Create a basic material first, then set properties
    skyMaterial = new THREE.MeshBasicMaterial();

    // Set properties after creation
    skyMaterial.color = new THREE.Color(0x0a1a2a); // Dark blue for night
    skyMaterial.side = THREE.BackSide;
    skyMaterial.fog = false;
    skyMaterial.depthWrite = false; // Prevent sky from writing to depth buffer

    // Create the sky mesh
    skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.renderOrder = -1; // Ensure it renders first
    scene.add(skyMesh);

    // Create a sun/moon mesh with larger size
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.9,
        depthWrite: false, // Prevent sun from writing to depth buffer
        depthTest: false   // Disable depth testing for the sun
    });

    // Add a glow effect to the sun
    const sunGlowGeometry = new THREE.SphereGeometry(sunSize * 1.2, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
        depthWrite: false, // Prevent glow from writing to depth buffer
        depthTest: false   // Disable depth testing for the glow
    });

    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);

    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.add(sunGlow); // Add glow as a child of the sun
    sunMesh.renderOrder = 1000; // Ensure sun renders after everything else

    // Position it at the same position as the directional light
    // but scaled to be at the edge of the skybox
    const lightDirection = new THREE.Vector3()
        .copy(directionalLight.position)
        .normalize();
    sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

    scene.add(sunMesh);
}

// Add this function to get sky color based on time of day
function getSkyColor(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return new THREE.Color(0xe0a080); // Richer dawn sky
        case 'day':
            return new THREE.Color(0x87ceeb); // Classic sky blue, less washed out
        case 'dusk':
            return new THREE.Color(0xff7747); // More vibrant sunset
        case 'night':
            return new THREE.Color(0x0a1025); // Deeper night sky
        default:
            return new THREE.Color(0x87ceeb);
    }
}

// Add this function to get ambient light color and intensity
function getAmbientLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0x7a5c70), // Purple-tinted for dawn
                intensity: 0.2 // Reduced for more contrast
            };
        case 'day':
            return {
                color: new THREE.Color(0x89a7c5), // Slightly bluer sky ambient
                intensity: 0.25 // Reduced for better contrast with directional
            };
        case 'dusk':
            return {
                color: new THREE.Color(0x614b5a), // Deeper dusk ambient
                intensity: 0.2
            };
        case 'night':
            return {
                color: new THREE.Color(0x1a2035), // Darker night ambient
                intensity: 0.15 // Very low but not completely dark
            };
        default:
            return {
                color: new THREE.Color(0x89a7c5),
                intensity: 0.25
            };
    }
}

// Add this function to get directional light color and intensity
function getDirectionalLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0xffb55a), // Warmer orange sunrise
                intensity: 0.7, // Higher intensity for better contrast
                position: new THREE.Vector3(-500, 1000, 0)
            };
        case 'day':
            return {
                color: new THREE.Color(0xffefd1), // Warmer, less harsh sunlight
                intensity: 0.8, // More directional intensity for better shadows
                position: new THREE.Vector3(0, 1800, 0)
            };
        case 'dusk':
            return {
                color: new THREE.Color(0xff6a33), // Richer sunset color
                intensity: 0.7, // Higher contrast for sunset
                position: new THREE.Vector3(500, 1000, 0)
            };
        case 'night':
            return {
                color: new THREE.Color(0x445e8c), // More blue-tinted moonlight
                intensity: 0.3, // Lower but still visible
                position: new THREE.Vector3(0, -1000, 1000)
            };
        default:
            return {
                color: new THREE.Color(0xffefd1),
                intensity: 0.8,
                position: new THREE.Vector3(0, 1800, 0)
            };
    }
}

// Add this function to update time of day
function updateTimeOfDay(deltaTime) {
    const timeOfDay = getTimeOfDay().toLowerCase(); // Convert to lowercase to match lighting functions

    // If time of day has changed, start transition
    if (timeOfDay !== lastTimeOfDay) {
        console.log(`Time of day changed to: ${timeOfDay}`); // Debug log
        lastTimeOfDay = timeOfDay;
        skyboxTransitionProgress = 0;
    }

    // Update transition progress
    if (skyboxTransitionProgress < 1) {
        skyboxTransitionProgress += deltaTime / skyboxTransitionDuration;
        skyboxTransitionProgress = Math.min(skyboxTransitionProgress, 1);

        // Get target colors and settings
        const targetSkyColor = getSkyColor(timeOfDay);
        const targetAmbientLight = getAmbientLight(timeOfDay);
        const targetDirectionalLight = getDirectionalLight(timeOfDay);

        // Make color transition more dramatic (0.05 instead of 0.01)
        if (skyMaterial) {
            skyMaterial.color.lerp(targetSkyColor, 0.05);
        }

        // Update ambient light with faster transition
        ambientLight.color.lerp(targetAmbientLight.color, 0.05);
        ambientLight.intensity += (targetAmbientLight.intensity - ambientLight.intensity) * 0.05;

        // Update directional light with faster transition
        directionalLight.color.lerp(targetDirectionalLight.color, 0.05);
        directionalLight.intensity += (targetDirectionalLight.intensity - directionalLight.intensity) * 0.05;

        // Update directional light position with faster transition
        directionalLight.position.x += (targetDirectionalLight.position.x - directionalLight.position.x) * 0.05;
        directionalLight.position.y += (targetDirectionalLight.position.y - directionalLight.position.y) * 0.05;
        directionalLight.position.z += (targetDirectionalLight.position.z - directionalLight.position.z) * 0.05;

        // Update sun position to match directional light but ensure it stays within skybox
        if (sunMesh) {
            // Calculate direction from origin to light
            const lightDirection = new THREE.Vector3()
                .copy(directionalLight.position)
                .normalize();

            // Position sun at the edge of the skybox in the light direction
            sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

            // Always face the sun toward the camera
            sunMesh.lookAt(camera.position);

            // Update sun color and size based on time of day
            if (timeOfDay === 'night') {
                sunMesh.material.color.set(0xaaaaff); // Bluish for moon
                sunMesh.scale.set(0.7, 0.7, 0.7); // Smaller moon
            } else if (timeOfDay === 'dawn' || timeOfDay === 'dusk') {
                sunMesh.material.color.set(0xff7700); // Orange for sunrise/sunset
                sunMesh.scale.set(1.2, 1.2, 1.2); // Slightly larger sun at dawn/dusk
            } else {
                sunMesh.material.color.set(0xffffaa); // Yellow for day
                sunMesh.scale.set(1.0, 1.0, 1.0); // Normal size for day
            }
        }

        // Update skybox to match time of day
        updateSkybox();
    }
}

// Update boat movement in the animate function to check collisions
function animate() {
    const now = performance.now();
    const deltaTime = (now - (lastTime || now)) / 1000; // Convert to seconds
    lastTime = now;

    requestAnimationFrame(animate);
    time += 0.09;

    // Update time of day
    updateTimeOfDay(deltaTime);

    // Update water shader time uniform
    waterShader.uniforms.time.value = time;

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
        const wave1 = Math.sin(vertex.x * 0.1 + time * waveSpeed) * Math.cos(vertex.y * 0.1 + time * waveSpeed) * waveHeight;
        const wave2 = Math.sin(vertex.x * 0.2 + time * waveSpeed * 1.2) * Math.cos(vertex.y * 0.15 + time * waveSpeed) * waveHeight * 0.5;
        const wave3 = Math.sin(vertex.x * 0.05 + time * waveSpeed * 0.8) * waveHeight * 0.3;
        vertex.z = wave1 + wave2 + wave3;

        positions[i + 2] = vertex.z; // Update height
    }
    water.geometry.attributes.position.needsUpdate = true;
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
    for (const collider of islandColliders) {
        const distance = newPosition.distanceTo(collider.center);
        if (distance < collider.radius + 2) {
            collided = true;
            break;
        }
    }

    if (!collided) {
        boat.position.copy(newPosition);

        if (boat.position.distanceTo(lastChunkUpdatePosition) > chunkUpdateThreshold) {
            lastChunkUpdatePosition.copy(boat.position);
            updateVisibleChunks();
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

    const floatOffset = 0.5;
    boat.position.y = interpolatedHeight + floatOffset;

    // Debugging
    console.log(`Boat: x=${boatX.toFixed(2)}, z=${boatZ.toFixed(2)}, y=${boat.position.y.toFixed(2)}, Water Height=${interpolatedHeight.toFixed(2)}`);

    // Camera positioning
    updateCamera();

    // Network and UI updates
    Network.updatePlayerPosition();
    updateGameUI();

    // Update sun position relative to camera
    updateSunPosition();
    updateSkybox();

    renderer.render(scene, camera);
    //composer.render();
}

// Calculate boat speed based on velocity
function calculateBoatSpeed() {
    // Convert internal velocity to knots (arbitrary scale for game purposes)
    return Math.abs(boatVelocity.z) * 20;
}

// Get wind direction and speed (you can make this dynamic later)
function getWindData() {
    // For now, return static data or calculate based on time
    return {
        direction: (Math.sin(time * 0.01) * Math.PI) + Math.PI, // Slowly changing direction
        speed: 5 + Math.sin(time * 0.05) * 3 // Wind speed between 2-8 knots
    };
}

// Get time of day based on game time
function getTimeOfDay() {
    // Cycle through different times of day
    const dayPhase = (time * 0.005) % 1; // 0 to 1 representing full day cycle

    if (dayPhase < 0.2) return "Dawn";
    if (dayPhase < 0.4) return "Day";
    if (dayPhase < 0.6) return "Afternoon";
    if (dayPhase < 0.8) return "Dusk";
    return "Night";
}

// Find nearest island
function findNearestIsland() {
    let nearest = { distance: Infinity, name: "None" };

    activeIslands.forEach((island, id) => {
        const distance = boat.position.distanceTo(island.collider.center);
        if (distance < nearest.distance) {
            nearest = {
                distance: distance,
                name: `Island ${id.substring(0, 4)}` // Use part of the ID as a name
            };
        }
    });

    return nearest;
}

// Update the UI in your animate function
function updateGameUI() {
    // Import at the top of your file: import { gameUI } from './ui.js';

    const windData = getWindData();
    const nearestIsland = findNearestIsland();

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
        mapScale: 200 // Scale factor for mini-map (adjust as needed)
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
updateVisibleChunks();

// Force an initial update to ensure islands are generated
setTimeout(() => {
    console.log("Forcing initial chunk update...");
    updateVisibleChunks();
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

// Get gradual sun position based on time
function getGradualSunPosition(time) {
    // Use same day phase calculation as skybox for consistency
    const dayPhase = (time * 0.005) % 1;

    // Calculate sun position in an arc from east to west
    // Angle goes from -π/2 (dawn) through π/2 (noon) to 3π/2 (dusk/night)
    const angle = (dayPhase * Math.PI * 2) - Math.PI / 2;

    // Sun height follows a sine curve (highest at noon)
    const height = Math.sin(dayPhase * Math.PI) * 800;
    const distance = 1000;

    // Calculate position
    const x = Math.cos(angle) * distance;
    const y = Math.max(height, -700); // Keep minimum height
    const z = Math.sin(angle) * distance;

    return new THREE.Vector3(x, y, z);
}

// Get gradual sun color based on time
function getGradualSunColor(time) {
    const dayPhase = (time * 0.005) % 1;

    // Define colors for different phases
    if (dayPhase < 0.2) {
        // Dawn
        return new THREE.Color(0xff7700); // Orange sunrise
    } else if (dayPhase < 0.75) {
        // Day
        return new THREE.Color(0xffffaa); // Yellow day
    } else if (dayPhase < 0.85) {
        // Dusk
        return new THREE.Color(0xff7700); // Orange sunset
    } else {
        // Night
        return new THREE.Color(0xaaaaff); // Bluish moon
    }
}

// Get gradual light intensity based on time
function getGradualLightIntensity(time) {
    const dayPhase = (time * 0.005) % 1;

    // Highest at noon, lowest at night
    if (dayPhase < 0.25) {
        // Dawn - rising intensity
        return 0.2 + (dayPhase / 0.25) * 0.8;
    } else if (dayPhase < 0.75) {
        // Day - full intensity
        return 1.0;
    } else if (dayPhase < 0.85) {
        // Dusk - falling intensity
        return 1.0 - ((dayPhase - 0.75) / 0.1) * 0.8;
    } else {
        // Night - low intensity
        return 0.2;
    }
}

// Update sun position and lighting in animation loop
function updateSunPosition() {
    if (sunMesh && directionalLight) {
        // Get gradual sun position
        const sunPosition = getGradualSunPosition(time);

        // Update directional light position to match sun
        directionalLight.position.copy(sunPosition);

        // Position sun mesh at edge of skybox in light direction
        const lightDirection = new THREE.Vector3()
            .copy(directionalLight.position)
            .normalize();

        sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

        // Always face the sun toward the camera
        sunMesh.lookAt(camera.position);

        // Update sun color and intensity
        const sunColor = getGradualSunColor(time);
        sunMesh.material.color.lerp(sunColor, 0.05);

        // Update sun size based on time (smaller at night)
        const dayPhase = (time * 0.005) % 1;
        const sunScale = (dayPhase > 0.85 || dayPhase < 0.15) ? 0.7 : 1.0;
        sunMesh.scale.lerp(new THREE.Vector3(sunScale, sunScale, sunScale), 0.05);

        // Update directional light intensity and color
        const intensity = getGradualLightIntensity(time);
        directionalLight.intensity = directionalLight.intensity * 0.95 + intensity * 0.05;
        directionalLight.color.lerp(sunColor, 0.05);

        // Update ambient light intensity (brighter during day)
        if (ambientLight) {
            ambientLight.intensity = 0.2 + intensity * 0.3;
        }
    }
}

// Add gentle rocking motion based on boat speed and waves
function updateBoatRocking(deltaTime) {
    // Calculate boat speed magnitude
    const speedMagnitude = Math.abs(boatVelocity.z);

    // Only rock if the boat is moving at least a little
    if (speedMagnitude > 0.01) {
        // Gentle oscillation using sine waves with different frequencies
        boatRockAngleX = Math.sin(time * rockSpeed) * maxRockAngle * speedMagnitude;
        boatRockAngleZ = Math.sin(time * rockSpeed * 0.7) * maxRockAngle * speedMagnitude;

        // Apply the rocking rotation (keep existing Y rotation)
        const currentYRotation = boat.rotation.y;
        boat.rotation.set(boatRockAngleX, currentYRotation, boatRockAngleZ);
    } else {
        // Gradually return to level when not moving
        boatRockAngleX *= 0.95;
        boatRockAngleZ *= 0.95;

        const currentYRotation = boat.rotation.y;
        boat.rotation.set(boatRockAngleX, currentYRotation, boatRockAngleZ);
    }
}

// Add a small Minecraft-style character to the front of the boat
function addCharacterToBoat(boat) {
    // Create a group for the character
    const character = new THREE.Group();

    // Head - slightly larger than body parts for the Minecraft look
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFD700, // Yellow skin tone
        name: 'characterHeadMaterial'
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.9;
    head.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    character.add(head);

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 1.0, 0.5);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF }); // Blue shirt
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.0;
    body.userData.isNotPlayerColorable = false; // Flag to prevent color changes
    character.add(body);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF }); // Match shirt

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 0.1, 0);
    leftArm.userData.isNotPlayerColorable = true;
    character.add(leftArm);

    // Right arm - raised as if pointing forward
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 0.1, 0);
    rightArm.rotation.z = -Math.PI / 4; // Angle the arm up
    rightArm.userData.isNotPlayerColorable = true;
    character.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown pants

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, -0.8, 0);
    leftLeg.userData.isNotPlayerColorable = true;
    character.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, -0.8, 0);
    rightLeg.userData.isNotPlayerColorable = true;
    character.add(rightLeg);

    // Position the character at the front of the boat, moved to the left for visibility
    character.position.set(-1.5, 3.2, -7.8); // Moved to the left side of the front extension
    character.rotation.y = Math.PI; // Face forward (looking out from the boat)

    // Add the character to the boat
    boat.add(character);

    return character;
}

// Create and add a simple blue skybox that changes with time of day

// Add these functions to your init and animate functions
// In your initialization:
setupSkybox();

// In your animate function, add:


// Create a skybox with a single material
function setupSkybox() {
    // Skybox size
    const skyboxSize = 10000;

    // Create a skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);

    // Create a single material for all faces
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5, // Initial blue color
        side: THREE.BackSide
    });

    // Create the skybox with a single material
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

    // Set renderOrder to ensure skybox is rendered behind everything
    skybox.renderOrder = -1000;

    // Add the skybox to the scene
    scene.add(skybox);

    // Store reference for later updates
    window.skybox = skybox;

    // Make sure camera far plane is sufficient to see the skybox
    if (camera.far < skyboxSize * 0.5) {
        camera.far = skyboxSize * 0.5;
        camera.updateProjectionMatrix();
    }

    return skybox;
}

// Get gradual sky color based on continuous time
function getGradualSkyboxColor(time) {
    // Normalize time to 0-1 range for a full day cycle
    const dayPhase = (time * 0.005) % 1;

    // Define key colors for different times of day
    const colors = [
        { phase: 0.0, color: new THREE.Color(0x191970) }, // Night (start/end)
        { phase: 0.2, color: new THREE.Color(0xffa07a) }, // Dawn
        { phase: 0.4, color: new THREE.Color(0x4287f5) }, // Day
        { phase: 0.7, color: new THREE.Color(0xff7f50) }, // Dusk
        { phase: 0.9, color: new THREE.Color(0x191970) }  // Night (approaching end of cycle)
    ];

    // Find the two colors to interpolate between
    let startColor, endColor, t;

    for (let i = 0; i < colors.length - 1; i++) {
        if (dayPhase >= colors[i].phase && dayPhase < colors[i + 1].phase) {
            // Calculate how far we are between these two color points (0-1)
            t = (dayPhase - colors[i].phase) / (colors[i + 1].phase - colors[i].phase);
            startColor = colors[i].color;
            endColor = colors[i + 1].color;
            break;
        }
    }

    // If we somehow didn't find a range, use the last color
    if (!startColor) {
        return colors[colors.length - 1].color;
    }

    // Create result color by interpolating
    const resultColor = new THREE.Color();
    resultColor.copy(startColor).lerp(endColor, t);

    return resultColor;
}

// Update skybox in animation loop
function updateSkybox() {
    if (window.skybox) {
        // Get gradually changing color based on time
        const newColor = getGradualSkyboxColor(time);

        // Apply with slight easing for smoother transitions
        window.skybox.material.color.lerp(newColor, 0.03);

        // Keep skybox centered on camera
        window.skybox.position.copy(camera.position);
    }
}