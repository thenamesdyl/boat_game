import * as THREE from 'three';
import { scene, getTime } from '../core/gameState.js';

// Store all active villagers
const activeVillagers = [];

// Function to create a single villager
function createVillager(position) {
    // Villager group to hold all body parts
    const villager = new THREE.Group();
    villager.position.copy(position);

    // Increase overall scale for bigger villagers
    villager.scale.set(1.5, 1.5, 1.5);

    // Random color palette for this villager
    const hue = Math.random();
    const skinColor = new THREE.Color().setHSL(hue, 0.5 + Math.random() * 0.3, 0.5 + Math.random() * 0.3);
    const clothesColor = new THREE.Color().setHSL((hue + 0.5) % 1.0, 0.7, 0.4);
    const hatColor = new THREE.Color().setHSL((hue + 0.3) % 1.0, 0.8, 0.5);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshPhongMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    villager.add(head);

    // Hat (add a hat!)
    const hatType = Math.floor(Math.random() * 3); // 3 different hat types

    if (hatType === 0) {
        // Top hat
        const hatGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.7, 8);
        const hatMaterial = new THREE.MeshPhongMaterial({ color: hatColor });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 2.1;
        villager.add(hat);
    } else if (hatType === 1) {
        // Cone hat
        const hatGeometry = new THREE.ConeGeometry(0.5, 0.8, 8);
        const hatMaterial = new THREE.MeshPhongMaterial({ color: hatColor });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 2.2;
        villager.add(hat);
    } else {
        // Wide brim hat
        const hatGeometry = new THREE.CylinderGeometry(0.8, 0.9, 0.3, 8);
        const hatMaterial = new THREE.MeshPhongMaterial({ color: hatColor });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 2.05;
        villager.add(hat);
    }

    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.2, 0.6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: clothesColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    villager.add(body);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.4, 1, 0.4);

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, headMaterial);
    leftArm.position.set(-0.7, 0.6, 0);
    villager.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, headMaterial);
    rightArm.position.set(0.7, 0.6, 0);
    villager.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.4, 1, 0.4);
    const legMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL((hue + 0.1) % 1.0, 0.7, 0.3)
    });

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.5, 0);
    villager.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.5, 0);
    villager.add(rightLeg);

    // Store initial position and animation data in userData
    villager.userData = {
        initialPosition: position.clone(),
        timeOffset: Math.random() * Math.PI * 2, // Random starting phase
        moveRadius: 5 + Math.random() * 5, // How far they move from center
        moveSpeed: 0.2 + Math.random() * 0.4, // How fast they move
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        leftArm: leftArm,
        rightArm: rightArm
    };

    return villager;
}

// Function to create villagers on islands
function createSampleVillagers(islands) {
    if (!islands || islands.size === 0) return;

    islands.forEach((island, id) => {
        // Create 2-4 villagers per island
        const count = 1;

        for (let i = 0; i < count; i++) {
            // Get island position and extract y-height from the mesh
            const islandPos = island.mesh.position.clone();
            const islandRadius = island.collider.radius * 0.8; // Keep villagers away from edges

            // Random position on the island
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * islandRadius;
            const offsetX = Math.cos(angle) * distance;
            const offsetZ = Math.sin(angle) * distance;

            // Position slightly above island surface (using 5 as a safe height value)
            const position = new THREE.Vector3(
                islandPos.x + offsetX,
                islandPos.y + 5, // Place above island surface
                islandPos.z + offsetZ
            );

            const villager = createVillager(position);

            // Store island ID with villager for movement constraints
            villager.userData.islandId = id;
            villager.userData.islandRadius = islandRadius;
            villager.userData.islandCenter = islandPos.clone();

            scene.add(villager);
            activeVillagers.push(villager);
        }
    });

    console.log(`Created ${activeVillagers.length} villagers on ${islands.size} islands`);
}

// Update villager animations to keep them on their island
function updateVillagerAnimations() {
    const time = getTime();

    for (let i = 0; i < activeVillagers.length; i++) {
        const villager = activeVillagers[i];
        const data = villager.userData;

        // Skip if no island data (safety check)
        if (!data.islandCenter || !data.islandRadius) continue;

        // Calculate movement within island boundary
        const xOffset = Math.sin(time * 0.5 * data.moveSpeed + data.timeOffset) * data.moveRadius;
        const zOffset = Math.cos(time * 0.3 * data.moveSpeed + data.timeOffset) * data.moveRadius;

        // Calculate new position
        const newX = data.islandCenter.x + xOffset;
        const newZ = data.islandCenter.z + zOffset;

        // Check if new position is within island boundary
        const distanceFromCenter = Math.sqrt(xOffset * xOffset + zOffset * zOffset);

        if (distanceFromCenter <= data.islandRadius) {
            // Update position if within bounds
            villager.position.x = newX;
            villager.position.z = newZ;

            // Add slight bobbing up and down
            villager.position.y = data.initialPosition.y + Math.sin(time * 2 * data.moveSpeed) * 0.2;
        }

        // Calculate movement direction for rotation
        const xDir = Math.cos(time * 0.5 * data.moveSpeed + data.timeOffset) * data.moveSpeed;
        const zDir = -Math.sin(time * 0.3 * data.moveSpeed + data.timeOffset) * data.moveSpeed;

        // Rotate villager to face movement direction
        if (Math.abs(xDir) > 0.01 || Math.abs(zDir) > 0.01) {
            villager.rotation.y = Math.atan2(xDir, zDir);
        }

        // Animate legs and arms with simple sine wave
        const animSpeed = 5; // Faster animation
        const legRotation = Math.sin(time * animSpeed * data.moveSpeed) * 0.4;

        // Update leg rotations
        data.leftLeg.rotation.x = legRotation;
        data.rightLeg.rotation.x = -legRotation;

        // Update arm rotations (opposite phase to legs)
        data.leftArm.rotation.x = -legRotation * 0.7;
        data.rightArm.rotation.x = legRotation * 0.7;
    }
}

// Initialize villagers
function initVillagers(islands) {
    if (!islands || islands.size === 0) return;
    createSampleVillagers(islands);
}

// Export functions
export function updateVillagers(islands) {
    // If no villagers yet, initialize with islands
    if (activeVillagers.length === 0) {
        if (!islands || islands.size === 0) return;
        initVillagers(islands);
    }

    // Update animations
    updateVillagerAnimations();
} 