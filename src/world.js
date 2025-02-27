import * as THREE from 'three';

// World variables
let islands = [];
let chunks = [];
const chunkSize = 600; // Size of each "chunk" of ocean
const chunkUpdateThreshold = 50;
let lastChunkUpdatePosition = new THREE.Vector3();
const maxViewDistance = 5; // How many chunks to render in each direction

// Island generation parameters
const islandDensity = 0.00001; // Lower value means fewer islands
const minIslandSize = 50;
const maxIslandSize = 200;
const maxIslandHeight = 30;
const islandsPerChunk = 3;
const visibleDistance = 2000;

// Island colliders
let islandColliders = [];

// Store generated chunks
const generatedChunks = new Set();
const activeIslands = new Map(); // Maps island ID to island object
const activeWaterChunks = new Map(); // Maps water chunk ID to water mesh

// Water variables
let water;
let waterShader;
const waterSize = 1000;
const waterSegments = 256;

export function setupWorld(scene, boat) {
    // Setup water
    setupWater(scene);

    // Initialize the world
    generateInitialChunks(scene, boat.position);

    return {
        islands,
        chunks,
        water,
        waterShader
    };
}

function setupWater(scene) {
    // Create water shader
    waterShader = {
        uniforms: {
            time: { value: 0 },
            waveHeight: { value: 2.0 },
            waveSpeed: { value: 0.09 }, // Slowed down wave speed
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

    // Create main water geometry
    const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize, waterSegments, waterSegments);

    // Create water material
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: waterShader.uniforms,
        vertexShader: waterShader.vertexShader,
        fragmentShader: waterShader.fragmentShader,
        side: THREE.DoubleSide,
    });

    // Create water mesh
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    return water;
}

// Function to get chunk key
function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

// Function to get chunk coordinates from world position
function getChunkCoords(x, z) {
    return {
        x: Math.floor(x / chunkSize),
        z: Math.floor(z / chunkSize)
    };
}

function generateInitialChunks(scene, position) {
    // Get current chunk coordinates
    const currentChunk = getChunkCoords(position.x, position.z);

    // Generate chunks in view distance
    for (let xOffset = -maxViewDistance; xOffset <= maxViewDistance; xOffset++) {
        for (let zOffset = -maxViewDistance; zOffset <= maxViewDistance; zOffset++) {
            const chunkX = currentChunk.x + xOffset;
            const chunkZ = currentChunk.z + zOffset;

            // Generate this chunk
            generateChunk(scene, chunkX, chunkZ);

            // Create water chunk
            createWaterChunk(scene, chunkX, chunkZ);
        }
    }

    // Store the position where we last updated chunks
    lastChunkUpdatePosition.copy(position);
}

function generateChunk(scene, chunkX, chunkZ) {
    const chunkKey = getChunkKey(chunkX, chunkZ);

    // Skip if this chunk has already been generated
    if (generatedChunks.has(chunkKey)) {
        return;
    }

    // Mark this chunk as generated
    generatedChunks.add(chunkKey);

    // Generate islands for this chunk
    for (let i = 0; i < islandsPerChunk; i++) {
        // Random position within the chunk
        const x = chunkX * chunkSize + Math.random() * chunkSize;
        const z = chunkZ * chunkSize + Math.random() * chunkSize;

        // Random size and height
        const size = minIslandSize + Math.random() * (maxIslandSize - minIslandSize);
        const height = 5 + Math.random() * maxIslandHeight;

        // Create the island
        createIsland(scene, x, z, size, height);
    }
}

function createWaterChunk(scene, chunkX, chunkZ) {
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
    const waterChunk = new THREE.Mesh(waterGeometry, waterMaterial);
    waterChunk.rotation.x = -Math.PI / 2;

    // Position the water chunk correctly in the world
    waterChunk.position.set(
        chunkX * chunkSize + chunkSize / 2,
        0,
        chunkZ * chunkSize + chunkSize / 2
    );

    // Add to scene
    scene.add(waterChunk);

    // Store in active water chunks
    activeWaterChunks.set(chunkKey, waterChunk);

    return waterChunk;
}

function createIsland(scene, x, z, size, height) {
    // Create island geometry
    const geometry = new THREE.ConeGeometry(size, height, 8);

    // Create materials for different parts of the island
    const islandMaterials = [
        new THREE.MeshPhongMaterial({ color: 0x8B4513 }), // Brown for the base
        new THREE.MeshPhongMaterial({ color: 0x228B22 }), // Green for the top
        new THREE.MeshPhongMaterial({ color: 0xF5DEB3 })  // Tan for the beach
    ];

    // Create the island mesh
    const islandMesh = new THREE.Mesh(geometry, islandMaterials[0]);
    islandMesh.position.set(x, 0, z);

    // Add some randomness to the island
    islandMesh.rotation.y = Math.random() * Math.PI * 2;

    // Create a unique ID for this island
    const islandId = `island_${Date.now()}_${Math.random()}`;

    // Create a collider for the island
    const collider = {
        id: islandId,
        center: new THREE.Vector3(x, 0, z),
        radius: size,
        height: height
    };

    // Store the collider
    islandColliders.push(collider);

    // Store island data
    islandMesh.userData = {
        id: islandId,
        radius: size,
        height: height
    };

    // Add to scene
    scene.add(islandMesh);

    // Store in active islands
    activeIslands.set(islandId, {
        mesh: islandMesh,
        collider: collider
    });

    return islandMesh;
}

export function updateWorld(scene, boat) {
    // Check if we need to update chunks
    if (boat.position.distanceTo(lastChunkUpdatePosition) > chunkUpdateThreshold) {
        updateVisibleChunks(scene, boat);
    }

    // Check for island collisions
    checkIslandCollisions(boat);
}

export function updateWater(time, boatPosition) {
    // Update water shader time uniform
    waterShader.uniforms.time.value = time;

    // Get wave parameters
    const waveSpeed = waterShader.uniforms.waveSpeed.value;
    const waveHeight = waterShader.uniforms.waveHeight.value;

    // Update main water mesh vertices
    if (water && water.geometry) {
        const positions = water.geometry.attributes.position.array;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positions.length; i += 3) {
            vertex.x = positions[i];
            vertex.y = positions[i + 1]; // Local Y before rotation (world Z)
            vertex.z = 0; // Reset Z

            // Wave equation
            const wave1 = Math.sin(vertex.x * 0.1 + time * waveSpeed) * Math.cos(vertex.y * 0.1 + time * waveSpeed) * waveHeight;
            const wave2 = Math.sin(vertex.x * 0.2 + time * waveSpeed * 1.2) * Math.cos(vertex.y * 0.15 + time * waveSpeed) * waveHeight * 0.5;
            const wave3 = Math.sin(vertex.x * 0.05 + time * waveSpeed * 0.8) * waveHeight * 0.3;
            vertex.z = wave1 + wave2 + wave3;

            positions[i + 2] = vertex.z; // Update height
        }

        water.geometry.attributes.position.needsUpdate = true;
    }

    // Calculate water height at boat position
    return calculateWaterHeight(boatPosition, time);
}

function calculateWaterHeight(position, time) {
    // Get wave parameters
    const waveSpeed = waterShader.uniforms.waveSpeed.value;
    const waveHeight = waterShader.uniforms.waveHeight.value;

    // Calculate wave height at position using the same equation as in the shader
    const x = position.x;
    const z = position.z;

    const wave1 = Math.sin(x * 0.1 + time * waveSpeed) * Math.cos(z * 0.1 + time * waveSpeed) * waveHeight;
    const wave2 = Math.sin(x * 0.2 + time * waveSpeed * 1.2) * Math.cos(z * 0.15 + time * waveSpeed) * waveHeight * 0.5;
    const wave3 = Math.sin(x * 0.05 + time * waveSpeed * 0.8) * waveHeight * 0.3;

    return wave1 + wave2 + wave3;
}

function updateVisibleChunks(scene, boat) {
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
                createWaterChunk(scene, chunkX, chunkZ);
            }

            // Generate this chunk if needed
            generateChunk(scene, chunkX, chunkZ);
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

    // Update last chunk update position
    lastChunkUpdatePosition.copy(boat.position);

    // Debug info
    console.log(`Active islands: ${activeIslands.size}, Generated chunks: ${generatedChunks.size}, Water chunks: ${activeWaterChunks.size}`);
}

function checkIslandCollisions(boat) {
    // Simple collision detection with islands
    for (const collider of islandColliders) {
        const distance = boat.position.distanceTo(collider.center);
        if (distance < collider.radius + 2) {
            // Push boat away from island
            const direction = new THREE.Vector3()
                .subVectors(boat.position, collider.center)
                .normalize();

            boat.position.add(direction.multiplyScalar(0.5));

            // Slow down the boat
            if (boat.userData && boat.userData.velocity) {
                boat.userData.velocity.multiplyScalar(0.8);
            }

            break;
        }
    }
}

export function getIslands() {
    return activeIslands;
}

export function getWater() {
    return water;
}

export function getWaterShader() {
    return waterShader;
}

export function findNearestIsland(position, maxDistance = 200) {
    let nearestIsland = null;
    let minDistance = maxDistance;

    activeIslands.forEach((island) => {
        const distance = position.distanceTo(island.collider.center);
        if (distance < minDistance) {
            minDistance = distance;
            nearestIsland = island;
        }
    });

    return nearestIsland;
} 