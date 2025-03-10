import * as THREE from 'three';
import { WORLD_SEED, chunkSize, CLEANUP_RADIUS } from '../world/chunkControl.js';


/**
 * BiomeSystem - Complete system for managing all biome-related functionality
 * Handles biome registration, storage, chunk assignment, and operations
 */

// Collection of registered biome implementations
const biomeImplementations = [];

// Map of biome IDs to their implementation instance
const biomeMap = new Map();

// Map to track which biome is assigned to which chunk
const chunkBiomes = new Map();

// Default biome to use when no specific biome is assigned
let defaultBiome = null;

// Seed for biome distribution
let biomeSeed = 12345;

/**
 * Initialize the biome system with the given seed
 * @param {number} seed - Seed for biome distribution
 */
function initializeBiomeSystem() {
    console.log("Initializing biome system...");
    clearBiomeCache();
}

/**
 * Register a biome implementation
 * @param {Object} biomeImplementation - Instance of a biome implementation
 * @returns {Object} The registered biome instance
 */
function registerBiome(biomeImplementation) {
    const id = biomeImplementation.id;

    // Prevent duplicate registration
    if (biomeMap.has(id)) {
        console.warn(`Biome with ID ${id} is already registered. Skipping.`);
        return biomeMap.get(id);
    }

    // Store the biome implementation
    biomeImplementations.push(biomeImplementation);
    biomeMap.set(id, biomeImplementation);

    // Register with the biome's own register method
    const registeredBiome = biomeImplementation.register();

    // Set as default if needed
    if (biomeImplementation.isDefault && !defaultBiome) {
        defaultBiome = biomeImplementation;
    } else if (!defaultBiome && biomeImplementations.length === 1) {
        // First biome becomes default if none is marked
        defaultBiome = biomeImplementation;
    }

    console.log(`Registered biome: ${biomeImplementation.name} (${id})`);
    return registeredBiome;
}

/**
 * Set the seed for biome distribution
 * @param {number} seed - New seed value
 */
function setBiomeSeed(seed) {
    biomeSeed = seed;
    clearBiomeCache();
}

/**
 * Deterministic random function based on coordinates and seed
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @returns {number} Random value between 0-1
 */
function seededRandom(x, z) {
    const hash = Math.sin(x * 12345.6789 + z * 9876.54321 + biomeSeed) * 43758.5453123;
    return hash - Math.floor(hash);
}

/**
 * Get the biome for a specific chunk
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @returns {Object} Biome implementation for this chunk
 */
function getBiomeForChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    // Return cached biome if available
    if (chunkBiomes.has(chunkKey)) {
        return chunkBiomes.get(chunkKey);
    }

    // Determine biome based on noise and weights
    const random = seededRandom(chunkX, chunkZ);
    let totalWeight = 0;

    // Calculate total weight
    biomeImplementations.forEach(biome => {
        totalWeight += biome.weight || 1;
    });

    // Select biome based on weighted random
    let currentWeight = 0;
    let selectedBiome = null;

    for (const biome of biomeImplementations) {
        currentWeight += biome.weight || 1;
        if (random <= currentWeight / totalWeight) {
            selectedBiome = biome;
            break;
        }
    }

    // Fallback to default if no biome was selected
    if (!selectedBiome) {
        selectedBiome = defaultBiome || (biomeImplementations.length > 0 ? biomeImplementations[0] : null);
    }

    // Cache the result
    chunkBiomes.set(chunkKey, selectedBiome);

    return selectedBiome;
}

/**
 * Get biome properties for a specific chunk
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @returns {Object} Properties of the biome for this chunk
 */
function getBiomePropertiesForChunk(chunkX, chunkZ) {
    const biome = getBiomeForChunk(chunkX, chunkZ);
    return biome ? biome.getProperties() : {};
}

/**
 * Process a chunk using its assigned biome
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @param {THREE.Scene} scene - Scene to add entities to
 * @param {number} seed - World seed
 * @returns {Array} Array of spawned entities
 */
function processChunk(chunkX, chunkZ, scene, seed) {
    const biome = getBiomeForChunk(chunkX, chunkZ);
    if (!biome) return [];

    const chunkSize = 1000; // Standard chunk size
    return biome.processChunk(chunkX, chunkZ, chunkSize, scene, seed);
}

/**
 * Spawn biome features around a position
 * @param {THREE.Vector3} centerPosition - Position to spawn around
 * @param {THREE.Scene} scene - Scene to add entities to
 * @param {number} seed - World seed
 * @param {number} radius - Radius in chunks
 * @returns {Array} Array of spawned entities
 */
function spawnAroundPosition(centerPosition, scene, seed, radius = 2) {
    const chunkSize = 1000;
    const centerChunkX = Math.floor(centerPosition.x / chunkSize);
    const centerChunkZ = Math.floor(centerPosition.z / chunkSize);

    let allSpawned = [];

    // Process chunks in radius
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const chunkX = centerChunkX + dx;
            const chunkZ = centerChunkZ + dz;

            const spawned = processChunk(chunkX, chunkZ, scene, seed);
            allSpawned = allSpawned.concat(spawned);
        }
    }

    return allSpawned;
}

/**
 * Update all biomes
 * @param {number} deltaTime - Time since last update
 * @param {THREE.Vector3} playerPosition - Current player position
 */
function updateAllBiomes(deltaTime, playerPosition) {
    biomeImplementations.forEach(biome => {
        biome.update(deltaTime, playerPosition);
    });
}

/**
 * Clean up distant entities across all biomes
 * @param {THREE.Vector3} playerPosition - Current player position
 * @param {number} cleanupRadius - Radius beyond which to remove entities
 */
function cleanupAllBiomes(playerPosition, cleanupRadius) {
    biomeImplementations.forEach(biome => {
        biome.cleanupDistantEntities(playerPosition, cleanupRadius);
    });
}

/**
 * Check if a biome is registered
 * @param {string} biomeId - ID of the biome to check
 * @returns {boolean} Whether the biome is registered
 */
function hasBiome(biomeId) {
    return biomeMap.has(biomeId);
}

/**
 * Get all registered biome implementations
 * @returns {Array} Array of biome implementations
 */
function getAllBiomes() {
    return [...biomeImplementations];
}

/**
 * Clear the biome assignment cache
 */
function clearBiomeCache() {
    chunkBiomes.clear();
}

/**
 * Get the default biome
 * @returns {Object} Default biome implementation
 */
function getDefaultBiome() {
    return defaultBiome;
}

/**
 * Get a biome implementation by ID
 * @param {string} biomeId - ID of the biome to get
 * @returns {Object|null} Biome implementation or null if not found
 */
function getBiomeById(biomeId) {
    return biomeMap.get(biomeId) || null;
}

// Export the public API
export {
    initializeBiomeSystem,
    registerBiome,
    setBiomeSeed,
    getBiomeForChunk,
    getBiomePropertiesForChunk,
    processChunk,
    spawnAroundPosition,
    updateAllBiomes,
    cleanupAllBiomes,
    hasBiome,
    getAllBiomes,
    clearBiomeCache,
    getDefaultBiome,
    getBiomeById
};