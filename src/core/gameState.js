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

// Add these variables near the top with other exports
export const shipSpeedConfig = {
    basePlayerSpeed: 1.2,     // Normal max speed when player is controlling
    baseKnockbackSpeed: 8.5,   // Max speed when not player-controlled (like knockbacks)
    speedMultiplier: 1.0       // Multiplier that can be adjusted by /speed command
};

// Add this near the top with other exports
export let allPlayers = [];

// Player name and color functions that login.js is trying to import
export function setPlayerName(name) {

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

// Export the updateShipMovement function with moderately increased movement
export function updateShipMovement(deltaTime) {


    // Ship physical properties - MODERATELY INCREASED POWER
    const shipMass = 5000; // More reasonable mass (was 2000 in extreme version, 5000 in original)
    const sailPower = 18 * Math.sqrt(shipSpeedConfig.speedMultiplier); // Apply square root of multiplier to sail power
    const rudderPower = 1.0; // Moderate turning (was 1.5 in extreme, 0.8 in original)
    const waterResistance = 0.3; // Balanced resistance (was 0.1 in extreme, 0.3 in original)

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

    // Wind efficiency - More realistic than extreme version
    const windEfficiency = 0.1 + 0.9 * (1 - Math.abs(windAngleToShip - Math.PI) / Math.PI);

    // SAILING MECHANICS
    // Calculate forces acting on the ship
    let accelerationForce = new THREE.Vector3();

    // MODERATELY INCREASED FORWARD MOVEMENT
    if (keys.forward) {
        // Moderately increased forward force for noticeable movement
        accelerationForce.add(shipHeading.clone().multiplyScalar(sailPower));
    }

    // MODERATELY INCREASED BACKWARD MOVEMENT
    if (keys.backward) {
        // Moderately increased backward force for noticeable movement
        const backwardForce = -sailPower * 0.8; // Reduced from 1.5
        accelerationForce.add(shipHeading.clone().multiplyScalar(backwardForce));
    }

    // TURNING MECHANICS - MODERATELY RESPONSIVE
    let turnEffect = 0;
    const speedFactor = Math.max(0.2, Math.min(1, currentSpeed / 8)); // Adjusted from 10
    const turnPower = rudderPower / speedFactor;

    if (keys.left) {
        turnEffect = turnPower;
    } else if (keys.right) {
        turnEffect = -turnPower;
    }

    const rotationSpeedMultiplier = 0.5; // Reduce turning speed by 50%


    // Apply turn effect based on current speed
    boat.rotation.y += turnEffect * deltaTime * rotationSpeedMultiplier;

    // Add drift when turning hard at speed
    if (Math.abs(turnEffect) > 0.1 && currentSpeed > 1) {
        const driftDirection = new THREE.Vector3(shipHeading.z, 0, -shipHeading.x);
        driftDirection.normalize().multiplyScalar(turnEffect * currentSpeed * 0.25); // Reduced from 0.3
        accelerationForce.add(driftDirection);
    }

    // PHYSICS UPDATE
    // Balanced water resistance
    const resistanceForce = boatVelocity.clone().normalize().multiplyScalar(-waterResistance * currentSpeed * currentSpeed);
    accelerationForce.add(resistanceForce);

    // Calculate acceleration (F = ma)
    const acceleration = accelerationForce.divideScalar(shipMass);

    // Apply acceleration with force multiplier
    boatVelocity.add(acceleration.multiplyScalar(deltaTime * 60 *
        (shipSpeedConfig.speedMultiplier > 1.0 ? Math.sqrt(shipSpeedConfig.speedMultiplier) : 1.0)));

    // Limit maximum speed
    const playerMaxSpeed = shipSpeedConfig.basePlayerSpeed * shipSpeedConfig.speedMultiplier;
    const knockbackMaxSpeed = shipSpeedConfig.baseKnockbackSpeed * shipSpeedConfig.speedMultiplier;
    const maxSpeed = keys.forward ? playerMaxSpeed * (keys.forward ? 1 : 0.5) : knockbackMaxSpeed;

    const currentSpeedValue = boatVelocity.length();
    if (currentSpeedValue > maxSpeed) {
        // Hard cap at maximum speed
        boatVelocity.normalize().multiplyScalar(maxSpeed);

        // Add visual/console feedback when speed limit is reached
        console.log("🚨 MAXIMUM SPEED REACHED:", maxSpeed.toFixed(2),
            "Current:", currentSpeedValue.toFixed(2),
            "Speed Multiplier:", shipSpeedConfig.speedMultiplier.toFixed(2));

        // Add temporary visual effect when reaching max speed with custom multiplier
        if (shipSpeedConfig.speedMultiplier > 1.0) {
            // We could trigger a visual effect here like wake particles

            // If you have a way to add temporary visual effects, do it here
            if (window.showSpeedBoostEffect) {
                window.showSpeedBoostEffect(shipSpeedConfig.speedMultiplier);
            }
        }
    }

    // Almost eliminated wind drift
    const windDriftAmount = 0.00005 * deltaTime; // Small but noticeable drift
    const windDrift = windVector.clone().multiplyScalar(windDriftAmount);
    boatVelocity.add(windDrift);

    // MODERATELY LOWER DAMPING
    if (!keys.forward && !keys.backward) {
        // Moderate damping - slower deceleration than original but faster than extreme
        const dampingFactor = 0.975; // Between original (0.95) and extreme (0.99)
        boatVelocity.multiplyScalar(dampingFactor);

        // Only apply stronger damping at low speeds
        if (currentSpeed < 0.08) { // Higher threshold than extreme (0.05)
            const lowSpeedDampingFactor = 0.85; // Between original (0.7) and extreme (0.9)
            boatVelocity.multiplyScalar(lowSpeedDampingFactor);
        }
    }



    // Return calculated velocity
    return boatVelocity;
}

// Add this function to update the allPlayers array
export function updateAllPlayers(players) {
    allPlayers = players;
    console.log("🌍 GAME STATE: All players updated:", allPlayers);
    return allPlayers;
}

// Add a getter function for the allPlayers array
export function getAllPlayers() {
    return allPlayers;
}