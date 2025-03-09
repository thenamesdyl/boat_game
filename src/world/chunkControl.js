import * as THREE from 'three';
import { adjustFogToViewDistance } from '../environment/fog.js';
import {
    activeIslands,
    createIsland,
    areShoreEffectsEnabled,
    getMassiveIslandSpawned,
    getMassiveIslandPosition,
    removeIslandCollider,
} from './islands.js';
import {
    findNearestMassiveIsland,
    setMassiveIslandVisibility
} from './massiveIslands.js';
import {
    removeShore,
    setShoreVisibility
} from './shores.js';

// Chunking system variables
const visibleDistance = 2000; // Distance to see islands from
const chunkSize = 600; // Size of each "chunk" of ocean
const islandsPerChunk = 2; // Reduced from 3 to 1 island per chunk
const maxViewDistance = 1; // Reduced from 5 to 3 chunks view distance

// Store generated chunks
const generatedChunks = new Set();
const activeWaterChunks = new Map(); // Maps water chunk ID to water mesh

/**
 * Generates a unique key for a chunk based on its coordinates
 * @param {number} chunkX - The X coordinate of the chunk
 * @param {number} chunkZ - The Z coordinate of the chunk
 * @returns {string} A unique key string for the chunk
 */
function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

/**
 * Determines which chunk coordinates contain a given world position
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {Object} Object containing the chunk x and z coordinates
 */
function getChunkCoords(x, z) {
    return {
        x: Math.floor(x / chunkSize),
        z: Math.floor(z / chunkSize)
    };
}

function createWaterChunk(chunkX, chunkZ, scene, waterShader) {
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
    //scene.add(water);

    // Store in active water chunks
    activeWaterChunks.set(chunkKey, water);

    return water;
}


function updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition) {
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
                createWaterChunk(chunkX, chunkZ, scene, waterShader);
            }

            // Generate this chunk if needed
            generateChunk(chunkX, chunkZ, scene);
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

    // Remove islands marked for removal
    islandsToRemove.forEach(id => {
        const island = activeIslands.get(id);
        if (island) {
            scene.remove(island.mesh);

            // Remove the island's shore if it exists
            if (areShoreEffectsEnabled() && island.shore) {
                removeShore(id, scene);
            }

            // Remove collider
            removeIslandCollider(id);
            activeIslands.delete(id);
        }
    });

    // Remove water chunks that are too far
    const waterToRemove = [];
    activeWaterChunks.forEach((water, id) => {
        if (!waterChunksToKeep.has(id)) {
            waterToRemove.push(id);
        }
    });

    waterToRemove.forEach(id => {
        const water = activeWaterChunks.get(id);
        if (water) {
            scene.remove(water);
            activeWaterChunks.delete(id);
        }
    });

    // Update shore visibilities to match islands
    if (areShoreEffectsEnabled()) {
        activeIslands.forEach((island, id) => {
            setShoreVisibility(id, island.visible);
        });
    }

    // Update the last chunk update position
    lastChunkUpdatePosition.copy(boat.position);

    return { islandsRemoved: islandsToRemove.length, waterChunksRemoved: waterToRemove.length };
}

function generateChunk(chunkX, chunkZ, scene) {
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
        createIsland(islandX, islandZ, islandSeed, scene);
    }
}


function updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition) {
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
                createWaterChunk(chunkX, chunkZ, scene, waterShader);
            }

            // Generate this chunk if needed
            generateChunk(chunkX, chunkZ, scene);
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

    // Remove islands marked for removal
    islandsToRemove.forEach(id => {
        const island = activeIslands.get(id);
        if (island) {
            scene.remove(island.mesh);

            // Remove the island's shore if it exists
            if (areShoreEffectsEnabled() && island.shore) {
                removeShore(id, scene);
            }

            // Remove collider
            removeIslandCollider(id);
            activeIslands.delete(id);
        }
    });

    // Remove water chunks that are too far
    const waterToRemove = [];
    activeWaterChunks.forEach((water, id) => {
        if (!waterChunksToKeep.has(id)) {
            waterToRemove.push(id);
        }
    });

    waterToRemove.forEach(id => {
        const water = activeWaterChunks.get(id);
        if (water) {
            scene.remove(water);
            activeWaterChunks.delete(id);
        }
    });

    // Update shore visibilities to match islands
    if (areShoreEffectsEnabled()) {
        activeIslands.forEach((island, id) => {
            setShoreVisibility(id, island.visible);
        });
    }

    // Update the last chunk update position
    lastChunkUpdatePosition.copy(boat.position);

    return { islandsRemoved: islandsToRemove.length, waterChunksRemoved: waterToRemove.length };
}


export function updateAllIslandVisibility(boat, scene, waterShader, lastChunkUpdatePosition) {
    // Update regular island chunks
    const chunksUpdated = updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition);

    // Update massive island visibility - use getter instead of direct variable
    if (getMassiveIslandSpawned()) {
        // Get position using getter instead of directly accessing the variable
        const massivePosition = getMassiveIslandPosition();
        const distanceToMassiveIsland = boat.position.distanceTo(
            new THREE.Vector3(massivePosition.x, 0, massivePosition.z)
        );

        // Only check visibility when within view distance
        if (distanceToMassiveIsland < 4000) {
            const nearestMassive = findNearestMassiveIsland(boat.position);
            if (nearestMassive.id) {
                const isVisible = distanceToMassiveIsland < visibleDistance * 2;
                setMassiveIslandVisibility(nearestMassive.id, isVisible);
            }
        }
    }

    // Adjust fog to match current view distance and chunk size
    adjustFogToViewDistance(chunkSize, maxViewDistance);

    return chunksUpdated;
}

// Export the chunking variables and functions
export {
    visibleDistance,
    chunkSize,
    islandsPerChunk,
    maxViewDistance,
    generatedChunks,
    activeWaterChunks,
    getChunkKey,
    getChunkCoords,
    createWaterChunk,
    updateVisibleChunks
}; 