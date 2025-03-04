import * as THREE from 'three';
import { scene, getTime } from '../core/gameState.js';

let cloudInstances = [];
const CLOUD_COUNT = 40;
const CLOUD_LAYER_HEIGHT = 500;
const CLOUD_FIELD_SIZE = 5000;
const CLOUD_DRIFT_SPEED = 1.5; // Base drift speed

// Global wind direction (prevailing wind)
let windDirection = new THREE.Vector2(1, 0.3).normalize(); // Default wind direction
let windChangeSpeed = 0.0001; // How quickly the wind direction can change

export function setupClouds() {
    // Randomly determine prevailing wind direction for this game session
    const windAngle = Math.random() * Math.PI * 2;
    windDirection = new THREE.Vector2(
        Math.cos(windAngle),
        Math.sin(windAngle)
    ).normalize();

    // Create cloud material
    const cloudMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        flatShading: true
    });

    // Create several cloud shapes
    for (let i = 0; i < CLOUD_COUNT; i++) {
        // Create a cloud group
        const cloud = new THREE.Group();

        // Random cloud size and complexity
        const cloudSize = 50 + Math.random() * 150;
        const blockCount = 5 + Math.floor(Math.random() * 8);

        // Create multiple blocks to form a Minecraft-style cloud
        for (let j = 0; j < blockCount; j++) {
            // Create rectangular blocks instead of spheres
            const blockWidth = cloudSize * (0.3 + Math.random() * 0.4);
            const blockHeight = cloudSize * 0.2 + Math.random() * cloudSize * 0.1;
            const blockDepth = cloudSize * (0.3 + Math.random() * 0.4);

            const blockGeometry = new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth);
            const block = new THREE.Mesh(blockGeometry, cloudMaterial);

            // Position blocks to form a flat, spread-out cloud shape
            const blockX = (Math.random() - 0.5) * cloudSize * 1.2;
            const blockY = (Math.random() - 0.5) * cloudSize * 0.1; // Very small Y variation
            const blockZ = (Math.random() - 0.5) * cloudSize * 1.2;
            block.position.set(blockX, blockY, blockZ);

            // Add slight random rotation for variety, but keep it minimal
            block.rotation.y = Math.random() * Math.PI * 0.1;

            cloud.add(block);
        }

        // Position cloud randomly in the sky
        cloud.position.set(
            (Math.random() - 0.5) * CLOUD_FIELD_SIZE,
            CLOUD_LAYER_HEIGHT + Math.random() * 100, // Less height variation
            (Math.random() - 0.5) * CLOUD_FIELD_SIZE
        );

        // Add some random rotation to the whole cloud
        cloud.rotation.y = Math.random() * Math.PI * 2;

        // Store cloud speed (varies slightly between clouds)
        cloud.userData.speed = CLOUD_DRIFT_SPEED * (0.7 + Math.random() * 0.6);

        // Small deviation from the prevailing wind direction
        const angleDeviation = (Math.random() - 0.5) * 0.2; // Small angle deviation (±0.1 radians)
        const windAngle = Math.atan2(windDirection.y, windDirection.x);
        const cloudAngle = windAngle + angleDeviation;

        cloud.userData.direction = new THREE.Vector2(
            Math.cos(cloudAngle),
            Math.sin(cloudAngle)
        ).normalize();

        // Add to scene and tracking array
        scene.add(cloud);
        cloudInstances.push(cloud);
    }

    return cloudInstances;
}

export function updateClouds(playerPosition) {
    const time = getTime();
    const deltaTime = 1 / 60; // Assume 60fps if not provided

    // Gradually shift wind direction over time for more realism
    const windAngle = Math.atan2(windDirection.y, windDirection.x);
    const newWindAngle = windAngle + (Math.sin(time * 0.0001) * windChangeSpeed);
    windDirection.x = Math.cos(newWindAngle);
    windDirection.y = Math.sin(newWindAngle);
    windDirection.normalize();

    cloudInstances.forEach(cloud => {
        // Move clouds horizontally based on prevailing wind with small individual variations
        cloud.position.x += cloud.userData.direction.x * cloud.userData.speed;
        cloud.position.z += cloud.userData.direction.y * cloud.userData.speed;

        // Very subtle vertical bobbing
        cloud.position.y += Math.sin(time * 0.0003 + cloud.position.x * 0.001) * 0.03;

        // If cloud moves too far, wrap around to the other side (upwind)
        const distanceFromPlayer = Math.sqrt(
            Math.pow(cloud.position.x - playerPosition.x, 2) +
            Math.pow(cloud.position.z - playerPosition.z, 2)
        );

        if (distanceFromPlayer > CLOUD_FIELD_SIZE / 1.5) {
            // Place cloud upwind from the player at edge of view distance
            const upwindAngle = Math.atan2(-windDirection.y, -windDirection.x);
            // Add some randomness to the spawn position, but mainly upwind
            const spawnAngle = upwindAngle + (Math.random() - 0.5) * 0.5;
            const distance = CLOUD_FIELD_SIZE / 2 * 0.8;

            cloud.position.x = playerPosition.x + Math.cos(spawnAngle) * distance;
            cloud.position.z = playerPosition.z + Math.sin(spawnAngle) * distance;

            // Small deviation from the prevailing wind direction
            const angleDeviation = (Math.random() - 0.5) * 0.2; // Small angle deviation
            const cloudAngle = Math.atan2(windDirection.y, windDirection.x) + angleDeviation;

            cloud.userData.direction = new THREE.Vector2(
                Math.cos(cloudAngle),
                Math.sin(cloudAngle)
            ).normalize();

            // Randomize cloud height slightly
            cloud.position.y = CLOUD_LAYER_HEIGHT + Math.random() * 100;
        }
    });
} 