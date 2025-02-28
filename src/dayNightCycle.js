import * as THREE from 'three';
import gameState from './gameState.js';
import { directionalLight, ambientLight } from './gameState.js';

// Sun-related variables
let sunMesh;
const sunSize = 100; // Increased from 10 to make the sun larger
const skyRadius = 20001; // Larger sky radius

// Initialize the sun and lighting
export function initializeDayNightCycle(scene) {
    // Create sun mesh
    const sunGeometry = new THREE.SphereGeometry(sunSize, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.8
    });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);

    // Create directional light (sun light)
    directionalLight = new THREE.DirectionalLight(0xffffaa, 1.0);
    directionalLight.position.set(1000, 1000, 1000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create ambient light
    ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
}

// Get time of day based on game time
export function getTimeOfDay(time) {
    // Cycle through different times of day
    const dayPhase = (time * 0.005) % 1; // 0 to 1 representing full day cycle

    if (dayPhase < 0.2) return "Dawn";
    if (dayPhase < 0.4) return "Day";
    if (dayPhase < 0.6) return "Afternoon";
    if (dayPhase < 0.8) return "Dusk";
    return "Night";
}

// Get gradual sun position based on time
export function getGradualSunPosition(time) {
    // Use same day phase calculation as skybox for consistency
    const dayPhase = (time * 0.005) % 1;

    // Calculate sun position in an arc from east to west
    // Angle goes from -π/2 (dawn) through π/2 (noon) to 3π/2 (dusk/night)
    const angle = (dayPhase * Math.PI * 2) - Math.PI / 2;

    // Sun height follows a sine curve (highest at noon)
    const height = Math.sin(dayPhase * Math.PI) * 800;
    const distance = 1000;

    // Calculate position
    const x = Math.cos(angle) * distance;
    const y = Math.max(height, -700); // Keep minimum height
    const z = Math.sin(angle) * distance;

    return new THREE.Vector3(x, y, z);
}

// Get gradual sun color based on time
export function getGradualSunColor(time) {
    const dayPhase = (time * 0.005) % 1;

    // Define colors for different phases
    if (dayPhase < 0.2) {
        // Dawn
        return new THREE.Color(0xff7700); // Orange sunrise
    } else if (dayPhase < 0.75) {
        // Day
        return new THREE.Color(0xffffaa); // Yellow day
    } else if (dayPhase < 0.85) {
        // Dusk
        return new THREE.Color(0xff7700); // Orange sunset
    } else {
        // Night
        return new THREE.Color(0xaaaaff); // Bluish moon
    }
}

// Get gradual light intensity based on time
export function getGradualLightIntensity(time) {
    const dayPhase = (time * 0.005) % 1;

    // Highest at noon, lowest at night
    if (dayPhase < 0.25) {
        // Dawn - rising intensity
        return 0.2 + (dayPhase / 0.25) * 0.8;
    } else if (dayPhase < 0.75) {
        // Day - full intensity
        return 1.0;
    } else if (dayPhase < 0.85) {
        // Dusk - falling intensity
        return 1.0 - ((dayPhase - 0.75) / 0.1) * 0.8;
    } else {
        // Night - low intensity
        return 0.2;
    }
}

// Update sun position and lighting in animation loop
export function updateSunPosition() {
    if (sunMesh && directionalLight && gameState.camera) {
        // Get gradual sun position
        const sunPosition = getGradualSunPosition(gameState.time);

        // Update directional light position to match sun
        directionalLight.position.copy(sunPosition);

        // Position sun mesh at edge of skybox in light direction
        const lightDirection = new THREE.Vector3()
            .copy(directionalLight.position)
            .normalize();

        sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

        // Always face the sun toward the camera
        sunMesh.lookAt(gameState.camera.position);

        // Update sun color and intensity
        const sunColor = getGradualSunColor(gameState.time);
        sunMesh.material.color.lerp(sunColor, 0.05);

        // Update sun size based on time (smaller at night)
        const dayPhase = (gameState.time * 0.005) % 1;
        const sunScale = (dayPhase > 0.85 || dayPhase < 0.15) ? 0.7 : 1.0;
        sunMesh.scale.lerp(new THREE.Vector3(sunScale, sunScale, sunScale), 0.05);

        // Update directional light intensity and color
        const intensity = getGradualLightIntensity(gameState.time);
        directionalLight.intensity = directionalLight.intensity * 0.95 + intensity * 0.05;
        directionalLight.color.lerp(sunColor, 0.05);

        // Update ambient light intensity (brighter during day)
        if (ambientLight) {
            ambientLight.intensity = 0.2 + intensity * 0.3;
        }
    }
} 