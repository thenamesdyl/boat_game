import * as THREE from 'three';

// Configuration parameters with defaults
const DEFAULT_FOG_CONFIG = {
    color: 0xaaccff,        // Light blue fog
    near: 300,              // Start of fog (closer than chunk size)
    far: 1000,              // Complete fog (2x chunk size)
    density: 0.0015,        // For exponential fog
    useExponentialFog: true // Whether to use exp2 fog (more realistic)
};

// Fog object references
let sceneFog = null;
let fogConfig = { ...DEFAULT_FOG_CONFIG };

/**
 * Initializes fog in the scene
 * @param {THREE.Scene} scene - The scene to add fog to
 * @param {Object} config - Optional configuration parameters
 */
export function setupFog(scene, config = {}) {
    // Merge provided config with defaults
    fogConfig = { ...DEFAULT_FOG_CONFIG, ...config };

    // Remove any existing fog
    scene.fog = null;

    // Create appropriate fog type
    if (fogConfig.useExponentialFog) {
        sceneFog = new THREE.FogExp2(fogConfig.color, fogConfig.density);
    } else {
        sceneFog = new THREE.Fog(
            fogConfig.color,
            fogConfig.near,
            fogConfig.far
        );
    }

    // Add fog to scene
    scene.fog = sceneFog;

    console.log("Fog system initialized:", fogConfig);

    return sceneFog;
}

/**
 * Updates fog based on player position and time
 * @param {THREE.Vector3} playerPosition - Player's current position
 * @param {number} deltaTime - Time since last update (seconds)
 * @param {Object} windData - Optional wind data for fog movement
 */
export function updateFog(playerPosition, deltaTime, windData = null) {
    if (!sceneFog) return;

    // Example: Subtly change fog color based on position
    // This creates a gentle variation as you move through the world
    const positionFactor = (Math.sin(playerPosition.x * 0.001) + Math.sin(playerPosition.z * 0.001)) * 0.5;

    if (sceneFog instanceof THREE.FogExp2) {
        // Gently vary fog density based on player position
        // This makes some areas clearer than others
        const baseDensity = fogConfig.density;
        const densityVariation = baseDensity * 0.2; // 20% variation
        sceneFog.density = baseDensity + (positionFactor * densityVariation);
    } else {
        // For regular fog, we can adjust the near/far values
        const baseFar = fogConfig.far;
        const farVariation = baseFar * 0.15; // 15% variation
        sceneFog.far = baseFar + (positionFactor * farVariation);
    }

    // If we have wind data, we can make the fog color slightly respond to it
    if (windData) {
        const windStrength = Math.min(1, windData.speed / 10); // Normalized 0-1
        const baseColor = new THREE.Color(fogConfig.color);
        const windyColor = new THREE.Color(0xb3d9ff); // Slightly different blue

        const finalColor = new THREE.Color().lerpColors(
            baseColor,
            windyColor,
            windStrength * 0.3 // Subtle effect
        );

        sceneFog.color.copy(finalColor);
    }
}

/**
 * Sets fog density (only for exponential fog)
 * @param {number} density - New fog density value
 */
export function setFogDensity(density) {
    if (sceneFog instanceof THREE.FogExp2) {
        fogConfig.density = density;
        sceneFog.density = density;
    }
}

/**
 * Sets fog distance parameters (only for linear fog)
 * @param {number} near - Distance where fog starts
 * @param {number} far - Distance where fog is completely opaque
 */
export function setFogDistance(near, far) {
    if (sceneFog instanceof THREE.Fog) {
        fogConfig.near = near;
        fogConfig.far = far;
        sceneFog.near = near;
        sceneFog.far = far;
    }
}

/**
 * Sets fog color
 * @param {number|string} color - Fog color (hex value or string)
 */
export function setFogColor(color) {
    if (sceneFog) {
        fogConfig.color = color;
        sceneFog.color.set(color);
    }
}

/**
 * Dynamically adjusts fog based on the current view distance
 * @param {number} chunkSize - Size of world chunks
 * @param {number} maxViewDistance - Current max view distance in chunks
 */
export function adjustFogToViewDistance(chunkSize, maxViewDistance) {
    const visibilityDistance = chunkSize * maxViewDistance;

    if (sceneFog instanceof THREE.FogExp2) {
        // For exponential fog, density is inverse to visibility
        // Denser fog = shorter visibility
        const targetDensity = 2.5 / visibilityDistance;
        setFogDensity(targetDensity);
    } else {
        // For linear fog, set the far distance based on chunk visibility
        const near = visibilityDistance * 0.6; // Start fog at 60% of view distance
        const far = visibilityDistance * 1.2;  // Complete fog at 120% of view distance
        setFogDistance(near, far);
    }
}

/**
 * Toggles fog on/off
 * @param {THREE.Scene} scene - The scene containing fog
 * @returns {boolean} - New fog state (true = enabled)
 */
export function toggleFog(scene) {
    if (scene.fog) {
        sceneFog = scene.fog;
        scene.fog = null;
        return false;
    } else {
        scene.fog = sceneFog || setupFog(scene);
        return true;
    }
} 