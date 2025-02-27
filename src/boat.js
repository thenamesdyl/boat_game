import * as THREE from 'three';

// Boat physics variables
let boat;
let boatVelocity = new THREE.Vector3();
let boatPitchAngle = 0;
const maxPitchAngle = 0.05;
const pitchDamping = 0.95;
let lastBoatSpeed = 0;
const boatSpeed = 0.1;
const rotationSpeed = 0.03;

// Player state
let playerState = {
    mode: 'boat', // Default to boat mode
    currentIsland: null,
    transitioningMode: false,
    transitionProgress: 0,
    characterHeight: 2
};

// Input keys state
let keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    space: false
};

export function setupBoat(scene) {
    // Create boat geometry
    const boatGeometry = new THREE.BoxGeometry(2, 1, 4);
    const boatMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    boat = new THREE.Mesh(boatGeometry, boatMaterial);
    boat.position.set(0, 0.5, 0);
    scene.add(boat);

    // Set up keyboard controls
    setupControls();

    return boat;
}

function setupControls() {
    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                keys.right = true;
                break;
            case 'Space':
                keys.space = true;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                keys.right = false;
                break;
            case 'Space':
                keys.space = false;
                break;
        }
    });
}

export function updateBoat(deltaTime, waterHeight) {
    // Skip if not in boat mode
    if (playerState.mode !== 'boat' && !playerState.transitioningMode) {
        return boat.position;
    }

    // Handle boat movement
    if (keys.forward) boatVelocity.z -= boatSpeed;
    if (keys.backward) boatVelocity.z += boatSpeed;
    if (keys.left) boat.rotation.y += rotationSpeed;
    if (keys.right) boat.rotation.y -= rotationSpeed;

    // Apply velocity and friction
    boatVelocity.multiplyScalar(0.95);

    // Calculate direction and new position
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
    const newPosition = boat.position.clone().add(direction.multiplyScalar(boatVelocity.z));

    // Update position
    boat.position.copy(newPosition);

    // Update boat pitch based on acceleration
    updateBoatPitch(deltaTime);

    // Update boat height based on water
    updateBoatWaterInteraction(waterHeight);

    return boat.position;
}

function updateBoatPitch(deltaTime) {
    // Calculate current boat speed
    const currentSpeed = Math.abs(boatVelocity.z);

    // Calculate acceleration
    const acceleration = currentSpeed - lastBoatSpeed;

    // Apply pitch based on acceleration
    const targetPitch = -acceleration * 2.0;

    // Smoothly interpolate current pitch toward target pitch
    boatPitchAngle = boatPitchAngle * pitchDamping + targetPitch * (1 - pitchDamping);

    // Clamp pitch angle
    boatPitchAngle = Math.max(Math.min(boatPitchAngle, maxPitchAngle), -maxPitchAngle);

    // Apply pitch rotation
    const yRotation = boat.rotation.y;
    boat.rotation.x = boatPitchAngle;

    // Add roll based on turning
    const turnAmount = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    const maxRollAngle = 0.03;
    boat.rotation.z = -turnAmount * maxRollAngle * currentSpeed;

    // Restore heading
    boat.rotation.y = yRotation;

    // Store current speed for next frame
    lastBoatSpeed = currentSpeed;
}

function updateBoatWaterInteraction(waterHeight) {
    // Add bobbing effect
    const bobbingAmount = 0.1;
    const bobbingSpeed = 0.5;
    const verticalBob = Math.sin(Date.now() * 0.001 * bobbingSpeed) * bobbingAmount;

    // Set boat height
    const floatOffset = 0.5;
    boat.position.y = waterHeight + floatOffset + verticalBob;
}

export function getBoat() {
    return boat;
}

export function getBoatVelocity() {
    return boatVelocity;
}

export function getKeys() {
    return keys;
}

export function getPlayerState() {
    return playerState;
}

export function setPlayerState(newState) {
    playerState = { ...playerState, ...newState };
}

export function calculateBoatSpeed() {
    return Math.abs(boatVelocity.z) * 10; // Scale for UI display
} 