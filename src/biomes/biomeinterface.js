/**
 * BiomeInterface - Standard interface for all biome implementations
 * This module defines the contract that all biome types must follow,
 * ensuring consistent behavior across different biome implementations.
 */

/**
 * Base class for all biome implementations
 * Each specific biome (Open Water, Arctic, Desert, etc.) should extend this class
 */
class BiomeInterface {
    /**
     * Create a new biome implementation
     * @param {Object} config - Configuration for this biome
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.properties = config.properties || {};
        this.isDefault = config.isDefault || false;
        this.weight = config.weight || 1;

        // Track spawned entities within this biome
        this.spawnedEntities = {
            islands: [],
            structures: [],
            creatures: [],
            vegetation: [],
            effects: []
        };

        // Track processed chunks
        this.processedChunks = new Set();
    }

    /**
     * Register this biome with the biome manager
     * @returns {Object} The registered biome instance
     */
    register() {
        throw new Error("register() must be implemented by biome classes");
    }

    /**
     * Process a single chunk according to this biome's rules
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @param {number} chunkSize - Size of the chunk in world units
     * @param {THREE.Scene} scene - The scene to add entities to
     * @param {number} seed - World seed for consistent generation
     * @returns {Array} Array of spawned entities
     */
    processChunk(chunkX, chunkZ, chunkSize, scene, seed) {
        throw new Error("processChunk() must be implemented by biome classes");
    }

    /**
     * Spawns biome features around a position
     * @param {THREE.Vector3} centerPosition - Center position to spawn around
     * @param {THREE.Scene} scene - The scene to add entities to
     * @param {number} seed - World seed for consistent generation
     * @param {number} radius - Radius in chunks to spawn around
     * @returns {Array} Array of spawned entities
     */
    spawnAroundPosition(centerPosition, scene, seed, radius = 2) {
        throw new Error("spawnAroundPosition() must be implemented by biome classes");
    }

    /**
     * Update this biome's entities and effects
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        throw new Error("update() must be implemented by biome classes");
    }

    /**
     * Cleanup entities that are too far from the player
     * @param {THREE.Vector3} centerPosition - Current player position
     * @param {number} cleanupRadius - Radius beyond which to remove entities
     */
    cleanupDistantEntities(centerPosition, cleanupRadius) {
        throw new Error("cleanupDistantEntities() must be implemented by biome classes");
    }

    /**
     * Clear all entities spawned by this biome
     * @param {THREE.Scene} scene - The scene containing the entities
     */
    clearAll(scene) {
        throw new Error("clearAll() must be implemented by biome classes");
    }

    /**
     * Get this biome's properties
     * @returns {Object} Biome properties
     */
    getProperties() {
        return { ...this.properties };
    }

    /**
     * Determine if a feature should spawn at given coordinates
     * @param {number} x - X coordinate in world space
     * @param {number} z - Z coordinate in world space
     * @param {number} seed - World seed for consistent generation
     * @param {string} featureType - Type of feature (island, creature, etc.)
     * @param {number} baseChance - Base chance of spawning (0-1)
     * @returns {boolean} Whether the feature should spawn
     */
    shouldSpawnFeature(x, z, seed, featureType, baseChance) {
        // Default implementation with common logic
        const hash = Math.sin(x * 12345.6789 + z * 9876.54321 + seed) * 43758.5453123;
        const value = hash - Math.floor(hash);

        // Get density modifier from properties
        const densityProp = `${featureType}Density`;
        const densityModifier = this.properties[densityProp] || 1.0;

        // Calculate final spawn chance
        const finalChance = baseChance * densityModifier;

        return value < finalChance;
    }
}

export default BiomeInterface;