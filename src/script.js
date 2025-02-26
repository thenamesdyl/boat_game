import * as THREE from 'three';
import * as Network from './network.js';

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

// Stormy Lighting
const ambientLight = new THREE.AmbientLight(0x333344, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x666688, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Expanded Water with Slower Shader
const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 256, 256);
const waterShader = {
    uniforms: {
        time: { value: 0 },
        waveHeight: { value: 2.0 },
        waveSpeed: { value: 0.09 }, // Slowed down wave speed (was 1.5)
    },
    vertexShader: `
    uniform float time;
    uniform float waveHeight;
    uniform float waveSpeed;
    varying vec2 vUv;
    varying float vHeight;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Slower, gentler layered waves
      float wave1 = sin(pos.x * 0.1 + time * waveSpeed) * cos(pos.y * 0.1 + time * waveSpeed) * waveHeight;
      float wave2 = sin(pos.x * 0.2 + time * waveSpeed * 1.2) * cos(pos.y * 0.15 + time * waveSpeed) * waveHeight * 0.5;
      float wave3 = sin(pos.x * 0.05 + time * waveSpeed * 0.8) * waveHeight * 0.3;

      pos.z += wave1 + wave2 + wave3;
      vHeight = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
    fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    varying float vHeight;

    void main() {
      vec3 deepColor = vec3(0.1, 0.15, 0.3);
      vec3 crestColor = vec3(0.4, 0.5, 0.7);
      float heightFactor = clamp(vHeight * 0.5, 0.0, 1.0);
      vec3 waterColor = mix(deepColor, crestColor, heightFactor);
      float foam = smoothstep(0.7, 1.0, heightFactor + sin(vUv.x * 20.0 + time) * 0.1);
      waterColor = mix(waterColor, vec3(0.9, 0.95, 1.0), foam);
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

const skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000); // Large cube to encompass the scene

// Load an equirectangular panorama image (replace with your Unsplash image URL or local path)
const textureLoader = new THREE.TextureLoader();
textureLoader.load('https://miro.medium.com/v2/resize:fit:4800/format:webp/1*WI5Zw1eKEKNmRX3zreeUHw.png', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping; // Use equirectangular mapping for panorama
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        transparent: true, // Enable transparency
        opacity: 0.1 // Set opacity (0.0 is fully transparent, 1.0 is fully opaque)
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
}, undefined, (error) => {
    console.error('Error loading skybox texture:', error);
});

// Boat
const boat = new THREE.Group();
const hullGeometry = new THREE.BoxGeometry(2, 1, 4);
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x885533 });
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
hull.position.y = 0.2;
boat.add(hull);

const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
const mast = new THREE.Mesh(mastGeometry, mastMaterial);
mast.position.y = 2;
boat.add(mast);

boat.position.set(0, 0, 0);
scene.add(boat);

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

// Update boat movement in the animate function to check collisions
function animate() {
    requestAnimationFrame(animate);
    time += 0.09;

    // Update water shader time uniform
    waterShader.uniforms.time.value = time;

    // Boat movement
    if (keys.forward) boatVelocity.z -= boatSpeed;
    if (keys.backward) boatVelocity.z += boatSpeed;
    if (keys.left) boat.rotation.y += rotationSpeed;
    if (keys.right) boat.rotation.y -= rotationSpeed;

    // Apply velocity and friction
    boatVelocity.multiplyScalar(0.5);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
    let newPosition = boat.position.clone().add(direction.multiplyScalar(boatVelocity.z));


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

        // Only update chunks when we've moved a significant distance
        if (boat.position.distanceTo(lastChunkUpdatePosition) > chunkUpdateThreshold) {
            lastChunkUpdatePosition.copy(boat.position);
            updateVisibleChunks();
        }
    }

    // Wave influence
    const waveHeight = waterShader.uniforms.waveHeight.value;
    const waveX = boat.position.x;
    const waveZ = boat.position.z;
    const boatHeight = Math.sin(waveX * 0.1 + time * 0.3) * Math.cos(waveZ * 0.1 + time * 0.3) * waveHeight +
        Math.sin(waveX * 0.2 + time * 0.35) * waveHeight * 0.5;

    // Lower the boat to be partially submerged in the water
    boat.position.y = boatHeight - 0.3; // Submerge the boat by 0.3 units

    // Increase the boat's rotation response to waves for more natural bobbing
    boat.rotation.z = Math.sin(time * 0.5 + waveX) * 0.03; // Increased from 0.02
    boat.rotation.x = Math.cos(time * 0.4 + waveZ) * 0.02; // Increased from 0.01

    // Base camera position and orientation
    const cameraOffset = new THREE.Vector3(0, 5, 10).applyQuaternion(boat.quaternion);
    camera.position.copy(boat.position).add(cameraOffset);

    // Apply mouse-based camera adjustment if enabled
    if (mouseControl.isEnabled) {
        // Calculate rotation angles based on mouse position, limited by maxAngle
        const horizontalAngle = Math.max(Math.min(mouseControl.mouseX * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);
        const verticalAngle = Math.max(Math.min(-mouseControl.mouseY * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);

        // Create a temporary vector for the look target
        const lookTarget = boat.position.clone();

        // Adjust the look target based on mouse position
        // For horizontal movement (left/right)
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
        lookTarget.add(rightVector.multiplyScalar(horizontalAngle * 50));

        // For vertical movement (up/down)
        lookTarget.y += verticalAngle * 50;

        // Look at the adjusted target
        camera.lookAt(lookTarget);
    } else {
        // Default camera behavior when mouse control is disabled
        camera.lookAt(boat.position);
    }


    // Send position updates to the server
    Network.updatePlayerPosition();

    // Update UI elements
    updateUI();

    renderer.render(scene, camera);
}

// Update UI elements
function updateUI() {
    // Update player count
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        playerCountElement.textContent = `Players: ${Network.getConnectedPlayersCount()}`;
    }

    // Update connection status
    const connectionStatusElement = document.getElementById('connection-status');
    if (connectionStatusElement) {
        if (Network.isNetworkConnected()) {
            connectionStatusElement.textContent = 'Connected';
            connectionStatusElement.classList.add('connected');
        } else {
            connectionStatusElement.textContent = 'Disconnected';
            connectionStatusElement.classList.remove('connected');
        }
    }
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