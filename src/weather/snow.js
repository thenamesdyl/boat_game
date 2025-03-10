import * as THREE from 'three';
import { scene, getTime } from '../core/gameState.js';

// Snow configuration
const SNOW_CONFIG = {
    PARTICLES_COUNT: 1,            // Number of active snow particles - let's drastically reduce this
    PARTICLE_SIZE_MIN: 0.05,          // Minimum size of a snowflake
    PARTICLE_SIZE_MAX: 0.2,           // Maximum size of a snowflake
    FALL_SPEED_MIN: 0.05,             // Minimum fall speed
    FALL_SPEED_MAX: 0.15,             // Maximum fall speed
    WIND_STRENGTH: 0.03,              // Sideways wind force
    WIND_CHANGE_SPEED: 0.001,         // How quickly wind direction changes
    SPAWN_RADIUS: 100,                // Radius around player to spawn snow
    SPAWN_HEIGHT: 50,                 // Height at which snow spawns
    LIFETIME: 15,                     // Maximum lifetime of a particle in seconds
    MELT_DURATION: 2,                 // How long snow takes to melt when hitting water
    COLOR: 0xffffff,                  // Snow color
    OPACITY: 0.8                      // Snow opacity
};

// Snow state
let snowParticles = [];
let meltingSnow = [];
let isSnowing = false;
let windAngle = 0;
let lastPlayerPosition = new THREE.Vector3();

/**
 * Initialize the snow system
 * @returns {Object} The snow system
 */
export function initSnow() {
    return {
        start: startSnow,
        stop: stopSnow,
        update: updateSnow,
        isActive: () => isSnowing
    };
}

/**
 * Start snow effect
 * @param {THREE.Vector3} playerPosition - Player's current position
 * @param {Object} intensity - Snow intensity parameters (optional)
 */
export function startSnow(playerPosition, intensity = {}) {
    isSnowing = true;
    lastPlayerPosition.copy(playerPosition);

    // Apply intensity overrides if provided
    if (intensity.count) SNOW_CONFIG.PARTICLES_COUNT = intensity.count;
    if (intensity.windStrength) SNOW_CONFIG.WIND_STRENGTH = intensity.windStrength;

    // Initialize with some particles
    for (let i = 0; i < 20; i++) {
        createSnowParticle(playerPosition);
    }
}

/**
 * Stop snow effect
 */
export function stopSnow() {
    isSnowing = false;

    // Allow existing snowflakes to fall and melt naturally
    // They'll be removed through the normal update cycle
}

/**
 * Create a new snowflake particle
 * @param {THREE.Vector3} centerPosition - Center position (usually player)
 * @returns {Object} The created particle
 */
function createSnowParticle(centerPosition) {
    // Random position around the player within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * SNOW_CONFIG.SPAWN_RADIUS;

    const position = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * radius,
        centerPosition.y + SNOW_CONFIG.SPAWN_HEIGHT,
        centerPosition.z + Math.sin(angle) * radius
    );

    // Random size
    const size = SNOW_CONFIG.PARTICLE_SIZE_MIN +
        Math.random() * (SNOW_CONFIG.PARTICLE_SIZE_MAX - SNOW_CONFIG.PARTICLE_SIZE_MIN);

    // Create geometry and material
    const geometry = new THREE.SphereGeometry(size, 4, 4);
    const material = new THREE.MeshBasicMaterial({
        color: SNOW_CONFIG.COLOR,
        transparent: true,
        opacity: SNOW_CONFIG.OPACITY
    });

    // Create mesh
    const snowflake = new THREE.Mesh(geometry, material);
    snowflake.position.copy(position);

    // Add some random rotation
    snowflake.rotation.x = Math.random() * Math.PI;
    snowflake.rotation.y = Math.random() * Math.PI;
    snowflake.rotation.z = Math.random() * Math.PI;

    // Add to scene
    scene.add(snowflake);

    // Random fall speed
    const fallSpeed = SNOW_CONFIG.FALL_SPEED_MIN +
        Math.random() * (SNOW_CONFIG.FALL_SPEED_MAX - SNOW_CONFIG.FALL_SPEED_MIN);

    // Store with metadata
    const particle = {
        mesh: snowflake,
        velocity: new THREE.Vector3(0, -fallSpeed, 0),
        size: size,
        lifetime: SNOW_CONFIG.LIFETIME,
        age: 0,
        hasHitWater: false
    };

    snowParticles.push(particle);
    return particle;
}

/**
 * Update all snow particles
 * @param {number} deltaTime - Time since last frame in seconds
 * @param {THREE.Vector3} playerPosition - Current player position
 */
export function updateSnow(deltaTime, playerPosition) {
    if (!deltaTime || isNaN(deltaTime)) {
        deltaTime = 0.016; // Default to ~60fps
    }

    // Update player position reference
    if (playerPosition) {
        lastPlayerPosition.copy(playerPosition);
    }

    // Update wind direction
    windAngle += SNOW_CONFIG.WIND_CHANGE_SPEED * deltaTime;
    const windX = Math.cos(windAngle) * SNOW_CONFIG.WIND_STRENGTH;
    const windZ = Math.sin(windAngle) * SNOW_CONFIG.WIND_STRENGTH;

    // Spawn new particles if snowing
    if (isSnowing && snowParticles.length < SNOW_CONFIG.PARTICLES_COUNT) {
        const particlesToSpawn = Math.min(
            10, // Max per frame
            SNOW_CONFIG.PARTICLES_COUNT - snowParticles.length
        );

        // for (let i = 0; i < 1; i++) {
        createSnowParticle(lastPlayerPosition);
        //}
    }

    // Update each snowflake
    for (let i = snowParticles.length - 1; i >= 0; i--) {
        const snow = snowParticles[i];

        // Update age
        snow.age += deltaTime;

        // Add wind to velocity
        snow.velocity.x = windX * (1 + Math.sin(getTime() * 0.5 + i) * 0.2);
        snow.velocity.z = windZ * (1 + Math.cos(getTime() * 0.5 + i) * 0.2);

        // Update position
        snow.mesh.position.x += snow.velocity.x;
        snow.mesh.position.y += snow.velocity.y;
        snow.mesh.position.z += snow.velocity.z;

        // Add some gentle rotation
        snow.mesh.rotation.x += 0.01 * deltaTime;
        snow.mesh.rotation.y += 0.02 * deltaTime;

        // Check if too far from player
        const distanceToPlayer = snow.mesh.position.distanceTo(lastPlayerPosition);

        // Check if hit water (y = 0) or lifetime exceeded or too far from player
        if (snow.age >= snow.lifetime || distanceToPlayer > SNOW_CONFIG.SPAWN_RADIUS * 2) {
            // Remove from scene
            scene.remove(snow.mesh);
            snow.mesh.geometry.dispose();
            snow.mesh.material.dispose();
            snowParticles.splice(i, 1);
        }
        else if (!snow.hasHitWater && snow.mesh.position.y <= 0) {
            snow.hasHitWater = true;
            snow.mesh.position.y = 0; // Set to water level

            // Move to melting array
            meltingSnow.push({
                mesh: snow.mesh,
                meltDuration: SNOW_CONFIG.MELT_DURATION,
                age: 0
            });

            // Remove from active snow array
            snowParticles.splice(i, 1);
        }
    }

    // Update melting snow
    updateMeltingSnow(deltaTime);
}

/**
 * Update melting snow particles
 * @param {number} deltaTime - Time since last frame
 */
function updateMeltingSnow(deltaTime) {
    for (let i = meltingSnow.length - 1; i >= 0; i--) {
        const melting = meltingSnow[i];

        // Update age
        melting.age += deltaTime;

        // Calculate melt progress
        const meltProgress = melting.age / melting.meltDuration;

        if (meltProgress >= 1) {
            // Remove from scene
            scene.remove(melting.mesh);
            melting.mesh.geometry.dispose();
            melting.mesh.material.dispose();
            meltingSnow.splice(i, 1);
        } else {
            // Gradually reduce opacity and size
            melting.mesh.material.opacity = SNOW_CONFIG.OPACITY * (1 - meltProgress);
            melting.mesh.scale.set(
                1 - meltProgress * 0.5,
                1 - meltProgress,
                1 - meltProgress * 0.5
            );
        }
    }
}

/**
 * Stop and clear all snow particles
 */
export function clearAllSnow() {
    // Clear active snowflakes
    snowParticles.forEach(snow => {
        scene.remove(snow.mesh);
        snow.mesh.geometry.dispose();
        snow.mesh.material.dispose();
    });
    snowParticles = [];

    // Clear melting snowflakes
    meltingSnow.forEach(melting => {
        scene.remove(melting.mesh);
        melting.mesh.geometry.dispose();
        melting.mesh.material.dispose();
    });
    meltingSnow = [];

    isSnowing = false;
} 