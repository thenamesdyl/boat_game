import * as THREE from 'three';
import { scene, getTime } from './gameState.js';

let cloudInstances = [];
const CLOUD_COUNT = 40;
const CLOUD_LAYER_HEIGHT = 500;
const CLOUD_FIELD_SIZE = 5000;
const CLOUD_DRIFT_SPEED = 0.8;

export function setupClouds() {
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

        // Store cloud speed (varies slightly between clouds but overall faster)
        cloud.userData.speed = CLOUD_DRIFT_SPEED * (0.7 + Math.random() * 0.6);
        cloud.userData.initialX = cloud.position.x;

        // Add to scene and tracking array
        scene.add(cloud);
        cloudInstances.push(cloud);
    }

    return cloudInstances;
}

export function updateClouds(playerPosition) {
    const time = getTime();

    cloudInstances.forEach(cloud => {
        // Move clouds in the x direction (faster wave movement)
        cloud.position.x = cloud.userData.initialX + Math.sin(time * 0.0002) * 500; // Doubled the time factor

        // Drift clouds based on their speed (now faster)
        cloud.position.x += cloud.userData.speed;

        // If cloud moves too far, wrap around to the other side
        if (cloud.position.x > playerPosition.x + CLOUD_FIELD_SIZE / 2) {
            cloud.position.x = playerPosition.x - CLOUD_FIELD_SIZE / 2;
            cloud.userData.initialX = cloud.position.x;
        }

        // Very subtle vertical bobbing
        cloud.position.y += Math.sin(time * 0.0003 + cloud.position.x * 0.001) * 0.1;
    });
} 