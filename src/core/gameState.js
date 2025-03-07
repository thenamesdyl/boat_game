// gameState.js - Central store for shared game objects to avoid circular dependencies
import * as THREE from 'three';
import { createBoat } from '../entities/character.js';
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
export const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
export let playerData = {
    name: localStorage.getItem('playerName') || 'Captain',
    color: localStorage.getItem('playerColor') || '#4285f4',
    rgbColor: { r: 0.26, g: 0.52, b: 0.96 } // Default blue
};

export const boatVelocity = new THREE.Vector3(0, 0, 0);
export const boatSpeed = 0.2; // Much slower speed (was 0.03)
export const rotationSpeed = 0.03; // Slower turning (was 0.03)
export const keys = { forward: false, backward: false, left: false, right: false };
export const boat = createBoat(scene);
let time = 0;

// Player name and color functions that login.js is trying to import
export function setPlayerName(name) {
    console.log(`Setting player name to: ${name}`);

    // Initialize playerData if it doesn't exist
    if (!playerData) {
        playerData = {};
    }

    // Update playerData
    playerData.name = name;

    // Save to localStorage for persistence
    localStorage.setItem('playerName', name);

    return name;
}

export function setPlayerColor(color) {
    console.log(`Setting player color to:`, color);

    // Initialize playerData if it doesn't exist
    if (!playerData) {
        playerData = {};
    }

    // If color is already in RGB format (Three.js format)
    if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
        playerData.rgbColor = color;

        // Convert to hex for storage
        const hexColor = rgbToHex(color);
        playerData.color = hexColor;
        localStorage.setItem('playerColor', hexColor);
    }
    // If color is in hex format (from HTML color picker)
    else if (typeof color === 'string' && color.startsWith('#')) {
        playerData.color = color;
        playerData.rgbColor = hexToRgb(color);
        localStorage.setItem('playerColor', color);
    }

    // Update boat color if needed
    if (boat && boat.material) {
        boat.material.color.setRGB(
            playerData.rgbColor.r,
            playerData.rgbColor.g,
            playerData.rgbColor.b
        );
    }

    return playerData.color;
}

// Helper functions for color conversion
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
}

function rgbToHex(rgb) {
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function updateTime(deltaTime) {
    time += deltaTime;
}

export function getTime() {
    return time;
}

export function getWindData() {
    // For now, return static data or calculate based on time
    return {
        direction: (Math.sin(getTime() * 0.01) * Math.PI) + Math.PI, // Slowly changing direction
        speed: 5 + Math.sin(getTime() * 0.05) * 3 // Wind speed between 2-8 knots
    };
}

export function getPlayerStateFromDb() {
    return playerData;
}

export function setPlayerStateFromDb(data) {
    playerData = data;
}

// Get current player info
export function getPlayerInfo() {
    return {
        name: playerData?.name || 'Captain',
        color: playerData?.color || '#4285f4',
        rgbColor: playerData?.rgbColor || { r: 0.26, g: 0.52, b: 0.96 }
    };
}

// Export the updateShipMovement function with reduced passive movement
export function updateShipMovement(deltaTime) {
    // Ship physical properties
    const shipMass = 5000; // kg - gives the ship weight and inertia
    const sailPower = 12; // maximum force from sails
    const rudderPower = 0.8; // how strong the rudder turns the ship
    const waterResistance = 0.3; // drag coefficient in water

    // Get wind info for sailing mechanics
    const windData = getWindData();
    const windDirection = windData.direction;
    const windSpeed = windData.speed;

    // Calculate ship's current speed and heading
    const currentSpeed = boatVelocity.length();
    const shipHeading = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), boat.rotation.y);

    // Calculate sailing efficiency based on wind angle
    const windVector = new THREE.Vector3(Math.cos(windDirection), 0, Math.sin(windDirection));
    const windAngleToShip = shipHeading.angleTo(windVector);

    // Wind efficiency ranges from 0.1 (against wind) to 1.0 (with wind)
    const windEfficiency = 0.1 + 0.9 * (1 - Math.abs(windAngleToShip - Math.PI) / Math.PI);

    // SAILING MECHANICS
    // Calculate forces acting on the ship
    let accelerationForce = new THREE.Vector3();

    // Strong player control - more dominant force than environmental factors
    if (keys.forward) {
        // Increased player control by reducing wind efficiency impact
        // Wind still helps but player input is dominant
        const windFactor = 0.2 + (windEfficiency * 0.3); // 0.2 base + up to 0.3 more from wind
        const sailForce = sailPower * windFactor;
        accelerationForce.add(shipHeading.clone().multiplyScalar(sailForce));
    }

    if (keys.backward) {
        // Rowing backward - consistent force regardless of wind
        accelerationForce.add(shipHeading.clone().multiplyScalar(-sailPower * 0.4));
    }

    // TURNING MECHANICS
    let turnEffect = 0;
    const speedFactor = Math.max(0.2, Math.min(1, currentSpeed / 5));
    const turnPower = rudderPower / speedFactor;

    if (keys.left) {
        turnEffect = turnPower;
    } else if (keys.right) {
        turnEffect = -turnPower;
    }

    // Apply turn effect based on current speed
    boat.rotation.y += turnEffect * deltaTime;

    // Add drift when turning hard at speed (realistic turning)
    if (Math.abs(turnEffect) > 0.1 && currentSpeed > 1) {
        const driftDirection = new THREE.Vector3(shipHeading.z, 0, -shipHeading.x);
        driftDirection.normalize().multiplyScalar(turnEffect * currentSpeed * 0.2);
        accelerationForce.add(driftDirection);
    }

    // PHYSICS UPDATE
    // Apply water resistance (increases with speed²)
    const resistanceForce = boatVelocity.clone().normalize().multiplyScalar(-waterResistance * currentSpeed * currentSpeed);
    accelerationForce.add(resistanceForce);

    // Calculate acceleration (F = ma)
    const acceleration = accelerationForce.divideScalar(shipMass);

    // Update velocity with acceleration
    boatVelocity.add(acceleration.multiplyScalar(deltaTime * 50));

    // Limit maximum speed
    const maxSpeed = 5 * (keys.forward ? 1 : 0.5);
    if (boatVelocity.length() > maxSpeed) {
        boatVelocity.normalize().multiplyScalar(maxSpeed);
    }

    // DRASTICALLY REDUCED WIND DRIFT
    // Only apply a tiny amount of passive movement from wind
    // Reduced by 50x from previous value (from 0.01 to 0.0002)
    const windDrift = windVector.clone().multiplyScalar(windSpeed * 0.0002 * deltaTime);
    boatVelocity.add(windDrift);

    // IMPROVED IDLE DAMPING
    // Apply stronger damping when not actively sailing
    // This ensures the ship stops much more quickly when not under player control
    if (!keys.forward && !keys.backward) {
        // Apply stronger damping (0.97 instead of 0.9)
        // This is applied every frame when not pressing keys, regardless of speed
        boatVelocity.multiplyScalar(0.97);

        // Extra strong damping at very low speeds to stop completely
        if (currentSpeed < 0.1) { // Increased threshold from 0.05 to 0.1
            boatVelocity.multiplyScalar(0.8); // Stronger damping to stop completely
        }
    }

    // DEBUG: Log info for testing (only show 0.1% of the time to reduce spam)
    if (Math.random() < 0.001) {
        console.log(`Speed: ${currentSpeed.toFixed(2)}, Wind Effect: ${(windSpeed * 0.0002).toFixed(5)}`);
    }
}