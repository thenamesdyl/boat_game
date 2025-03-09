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

// SHIP CONFIGURATION OBJECT - All tunable parameters in one place
const SHIP_CONFIG = {
    // PHYSICAL PROPERTIES
    mass: 1200,                     // Ultra light

    // POWER & SPEED
    baseSailPower: 100,             // Maximum power
    backwardPowerRatio: 0.6,        // Moderate backwards

    // TURNING
    baseRudderPower: 1.8,           // Modest turning - focused on speed
    turnSpeedMultiplier: 0.5,       // Slower rotation - not for cornering
    turnConsistencyFactor: 50,       // Poor turning at high speeds

    // RESISTANCE & FRICTION
    waterResistance: 0.3,           // Low resistance for speed

    // DAMPING (DECELERATION WHEN NOT ACCELERATING)
    normalDampingFactor: 0.98,      // Very slow deceleration
    lowSpeedDampingFactor: 0.8,     // Still slow to stop
    lowSpeedThreshold: 0.1,         // Low threshold - built for speed

    // DRIFTING
    turnDriftAmount: 0.2,           // Significant drift
    minTurnDriftSpeed: 0.4,         // Drifts easily

    // WIND EFFECTS
    windDriftStrength: 0.00003      // Affected by wind due to light weight
};

export function updateShipMovement(deltaTime) {
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

    // Wind efficiency calculation
    const windEfficiency = 0.1 + 0.9 * (1 - Math.abs(windAngleToShip - Math.PI) / Math.PI);

    // SAILING MECHANICS
    // Calculate forces acting on the ship
    let accelerationForce = new THREE.Vector3();

    // Apply sail power with wind efficiency
    const effectiveSailPower = SHIP_CONFIG.baseSailPower * Math.sqrt(shipSpeedConfig.speedMultiplier);

    if (keys.forward) {
        // DRAMATICALLY IMPROVED FORWARD ACCELERATION
        accelerationForce.add(shipHeading.clone().multiplyScalar(effectiveSailPower));
    }

    if (keys.backward) {
        // DRAMATICALLY IMPROVED BACKWARD ACCELERATION
        const backwardForce = -effectiveSailPower * SHIP_CONFIG.backwardPowerRatio;
        accelerationForce.add(shipHeading.clone().multiplyScalar(backwardForce));
    }

    // DRAMATICALLY IMPROVED TURNING MECHANICS
    let turnEffect = 0;

    // More consistent turning at all speeds
    const speedFactor = Math.max(0.2, Math.min(1, currentSpeed / SHIP_CONFIG.turnConsistencyFactor));
    const turnPower = SHIP_CONFIG.baseRudderPower / speedFactor;

    if (keys.left) {
        turnEffect = turnPower;
    } else if (keys.right) {
        turnEffect = -turnPower;
    }

    // DRAMATICALLY INCREASED ROTATION SPEED
    boat.rotation.y += turnEffect * deltaTime * SHIP_CONFIG.turnSpeedMultiplier;

    // DRAMATICALLY REDUCED DRIFT for more arcade-like handling
    if (Math.abs(turnEffect) > 0.1 && currentSpeed > SHIP_CONFIG.minTurnDriftSpeed) {
        const driftDirection = new THREE.Vector3(shipHeading.z, 0, -shipHeading.x);
        driftDirection.normalize().multiplyScalar(turnEffect * currentSpeed * SHIP_CONFIG.turnDriftAmount);
        accelerationForce.add(driftDirection);
    }

    // DRAMATICALLY INCREASED WATER RESISTANCE for less "icy" feel
    const resistanceForce = boatVelocity.clone().normalize().multiplyScalar(
        -SHIP_CONFIG.waterResistance * currentSpeed * currentSpeed
    );
    accelerationForce.add(resistanceForce);

    // Calculate acceleration (F = ma)
    const acceleration = accelerationForce.divideScalar(SHIP_CONFIG.mass);

    // Apply acceleration with force multiplier
    boatVelocity.add(acceleration.multiplyScalar(deltaTime * 60 *
        (shipSpeedConfig.speedMultiplier > 1.0 ? Math.sqrt(shipSpeedConfig.speedMultiplier) : 1.0)));

    // Maximum speed logic
    const playerMaxSpeed = shipSpeedConfig.basePlayerSpeed * shipSpeedConfig.speedMultiplier;
    const knockbackMaxSpeed = shipSpeedConfig.baseKnockbackSpeed * shipSpeedConfig.speedMultiplier;
    const maxSpeed = keys.forward ? playerMaxSpeed * (keys.forward ? 1 : 0.5) : knockbackMaxSpeed;

    const currentSpeedValue = boatVelocity.length();
    if (currentSpeedValue > maxSpeed) {
        // Hard cap at maximum speed
        boatVelocity.normalize().multiplyScalar(maxSpeed);


        if (shipSpeedConfig.speedMultiplier > 1.0 && window.showSpeedBoostEffect) {
            window.showSpeedBoostEffect(shipSpeedConfig.speedMultiplier);
        }
    }

    // Minimal wind drift
    const windDriftAmount = SHIP_CONFIG.windDriftStrength * deltaTime;
    const windDrift = windVector.clone().multiplyScalar(windDriftAmount);
    boatVelocity.add(windDrift);

    // DRAMATICALLY IMPROVED DECELERATION when not accelerating
    if (!keys.forward && !keys.backward) {
        // Much stronger damping for quick deceleration
        boatVelocity.multiplyScalar(SHIP_CONFIG.normalDampingFactor);

        // Even stronger damping at low speeds for quick stopping
        if (currentSpeed < SHIP_CONFIG.lowSpeedThreshold) {
            boatVelocity.multiplyScalar(SHIP_CONFIG.lowSpeedDampingFactor);
        }
    }

    // Return calculated velocity
    return boatVelocity;
}

// Update existing updateAllPlayers function to store the players data
export function updateAllPlayers(players) {
    allPlayers = players;
    console.log("🌍 GAME STATE: All players updated:", allPlayers);
    return allPlayers;
}

// Add this new function to return the stored players
export function getAllPlayers() {
    return allPlayers;
}