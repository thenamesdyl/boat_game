import * as THREE from 'three';
import { scene, camera, directionalLight, ambientLight, getTime } from './gameState.js';

const skyRadius = 20001; // Larger sky radius
const sunSize = 100; // Increased from 10 to make the sun larger
let skyMaterial;
let skyMesh;
let lastTimeOfDay = "";
let skyboxTransitionProgress = 0;
let skyboxTransitionDuration = 20; // Seconds for transition
let sunMesh;

scene.add(ambientLight);

directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Create a skybox with a single material
export function setupSkybox() {
    // Skybox size
    const skyboxSize = 10000;

    // Create a skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);

    // Create a single material for all faces
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5, // Initial blue color
        side: THREE.BackSide
    });

    // Create the skybox with a single material
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

    // Set renderOrder to ensure skybox is rendered behind everything
    skybox.renderOrder = -1000;

    // Add the skybox to the scene
    scene.add(skybox);

    // Store reference for later updates
    window.skybox = skybox;

    // Make sure camera far plane is sufficient to see the skybox
    if (camera.far < skyboxSize * 0.5) {
        camera.far = skyboxSize * 0.5;
        camera.updateProjectionMatrix();
    }

    return skybox;
}

// Get gradual sky color based on continuous time
export function getGradualSkyboxColor() {
    // Normalize time to 0-1 range for a full day cycle
    const dayPhase = (getTime() * 0.005) % 1;

    // Define key colors for different times of day
    const colors = [
        { phase: 0.0, color: new THREE.Color(0x191970) }, // Night (start/end)
        { phase: 0.2, color: new THREE.Color(0xffa07a) }, // Dawn
        { phase: 0.4, color: new THREE.Color(0x4287f5) }, // Day
        { phase: 0.7, color: new THREE.Color(0xff7f50) }, // Dusk
        { phase: 0.9, color: new THREE.Color(0x191970) }  // Night (approaching end of cycle)
    ];

    // Find the two colors to interpolate between
    let startColor, endColor, t;

    for (let i = 0; i < colors.length - 1; i++) {
        if (dayPhase >= colors[i].phase && dayPhase < colors[i + 1].phase) {
            // Calculate how far we are between these two color points (0-1)
            t = (dayPhase - colors[i].phase) / (colors[i + 1].phase - colors[i].phase);
            startColor = colors[i].color;
            endColor = colors[i + 1].color;
            break;
        }
    }

    // If we somehow didn't find a range, use the last color
    if (!startColor) {
        return colors[colors.length - 1].color;
    }

    // Create result color by interpolating
    const resultColor = new THREE.Color();
    resultColor.copy(startColor).lerp(endColor, t);

    return resultColor;
}

// Update skybox in animation loop
export function updateSkybox() {
    if (window.skybox) {
        // Get gradually changing color based on time
        const newColor = getGradualSkyboxColor();

        // Apply with slight easing for smoother transitions
        window.skybox.material.color.lerp(newColor, 0.03);

        // Keep skybox centered on camera
        window.skybox.position.copy(camera.position);
    }
}

export function setupSky() {
    // Create a sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 32);
    // Inside faces
    skyGeometry.scale(-1, 1, 1);

    // Create a basic material first, then set properties
    skyMaterial = new THREE.MeshBasicMaterial();

    // Set properties after creation
    skyMaterial.color = new THREE.Color(0x0a1a2a); // Dark blue for night
    skyMaterial.side = THREE.BackSide;
    skyMaterial.fog = false;
    skyMaterial.depthWrite = false; // Prevent sky from writing to depth buffer

    // Create the sky mesh
    skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.renderOrder = -1; // Ensure it renders first
    scene.add(skyMesh);

    // Create a sun/moon mesh with larger size
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.9,
        depthWrite: false, // Prevent sun from writing to depth buffer
        depthTest: false   // Disable depth testing for the sun
    });

    // Add a glow effect to the sun
    const sunGlowGeometry = new THREE.SphereGeometry(sunSize * 1.2, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
        depthWrite: false, // Prevent glow from writing to depth buffer
        depthTest: false   // Disable depth testing for the glow
    });

    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);

    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.add(sunGlow); // Add glow as a child of the sun
    sunMesh.renderOrder = 1000; // Ensure sun renders after everything else

    // Position it at the same position as the directional light
    // but scaled to be at the edge of the skybox
    const lightDirection = new THREE.Vector3()
        .copy(directionalLight.position)
        .normalize();
    sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

    scene.add(sunMesh);
}

export function updateTimeOfDay(deltaTime) {
    const timeOfDay = getTimeOfDay().toLowerCase();

    // If time of day has changed, start transition
    if (timeOfDay !== lastTimeOfDay) {
        console.log(`Time of day changed to: ${timeOfDay}`);
        lastTimeOfDay = timeOfDay;
        skyboxTransitionProgress = 0;
    }

    // Update transition progress
    if (skyboxTransitionProgress < 1) {
        skyboxTransitionProgress += deltaTime / skyboxTransitionDuration;
        skyboxTransitionProgress = Math.min(skyboxTransitionProgress, 1);

        // Get target colors and settings
        const targetSkyColor = getSkyColor(timeOfDay);
        const targetAmbientLight = getAmbientLight(timeOfDay);
        const targetDirectionalLight = getDirectionalLight(timeOfDay);

        // Make color transition more dramatic (0.05 instead of 0.01)
        if (skyMaterial) {
            skyMaterial.color.lerp(targetSkyColor, 0.05);
        }

        // Update ambient light with faster transition
        ambientLight.color.lerp(targetAmbientLight.color, 0.05);
        ambientLight.intensity += (targetAmbientLight.intensity - ambientLight.intensity) * 0.05;

        // Update directional light with faster transition
        directionalLight.color.lerp(targetDirectionalLight.color, 0.05);
        directionalLight.intensity += (targetDirectionalLight.intensity - directionalLight.intensity) * 0.05;

        // Update directional light position with faster transition
        directionalLight.position.x += (targetDirectionalLight.position.x - directionalLight.position.x) * 0.05;
        directionalLight.position.y += (targetDirectionalLight.position.y - directionalLight.position.y) * 0.05;
        directionalLight.position.z += (targetDirectionalLight.position.z - directionalLight.position.z) * 0.05;

        // Update sun position to match directional light but ensure it stays within skybox
        if (sunMesh) {
            // Calculate direction from origin to light
            const lightDirection = new THREE.Vector3()
                .copy(directionalLight.position)
                .normalize();

            // Position sun at the edge of the skybox in the light direction
            sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

            // Always face the sun toward the camera
            sunMesh.lookAt(camera.position);

            // Update sun color and size based on time of day
            if (timeOfDay === 'night') {
                sunMesh.material.color.set(0xccddff); // Brighter moon (was 0xaaaaff)
                sunMesh.scale.set(0.7, 0.7, 0.7); // Smaller moon
                updateMoonGlow(); // Update moon glow
            } else if (timeOfDay === 'dawn' || timeOfDay === 'dusk') {
                sunMesh.material.color.set(0xff7700); // Orange for sunrise/sunset
                sunMesh.scale.set(1.2, 1.2, 1.2); // Slightly larger sun at dawn/dusk
            } else {
                sunMesh.material.color.set(0xffffaa); // Yellow for day
                sunMesh.scale.set(1.0, 1.0, 1.0); // Normal size for day
            }
        }

        // Update skybox to match time of day
        updateSkybox();
    }

    // Always update moon glow when it's night
    if (lastTimeOfDay === 'night') {
        updateMoonGlow();
    }
}

export function getDirectionalLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0xffb55a), // Warmer orange sunrise
                intensity: 1.4, // Doubled from 0.7
                position: new THREE.Vector3(-500, 1000, 0)
            };
        case 'day':
            return {
                color: new THREE.Color(0xffefd1), // Warmer, less harsh sunlight
                intensity: 1.6, // Doubled from 0.8
                position: new THREE.Vector3(0, 1800, 0)
            };
        case 'dusk':
            return {
                color: new THREE.Color(0xff6a33), // Richer sunset color
                intensity: 1.4, // Doubled from 0.7
                position: new THREE.Vector3(500, 1000, 0)
            };
        case 'night':
            return {
                color: new THREE.Color(0x6a8abc), // Brighter, more blue-tinted moonlight (was 0x445e8c)
                intensity: 1.0, // Doubled from 0.5
                position: new THREE.Vector3(0, -1000, 1000)
            };
        default:
            return {
                color: new THREE.Color(0xffefd1),
                intensity: 1.6, // Doubled from 0.8
                position: new THREE.Vector3(0, 1800, 0)
            };
    }
}

export function updateSunPosition() {
    if (sunMesh && directionalLight) {
        // Get gradual sun position
        const sunPosition = getGradualSunPosition();

        // Update directional light position to match sun
        directionalLight.position.copy(sunPosition);

        // Position sun mesh at edge of skybox in light direction
        const lightDirection = new THREE.Vector3()
            .copy(directionalLight.position)
            .normalize();

        sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

        // Always face the sun toward the camera
        sunMesh.lookAt(camera.position);

        // Update sun color and intensity
        const sunColor = getGradualSunColor();
        sunMesh.material.color.lerp(sunColor, 0.05);

        // Update sun size based on time (smaller at night)
        const dayPhase = (getTime() * 0.005) % 1;
        const sunScale = (dayPhase > 0.85 || dayPhase < 0.15) ? 0.7 : 1.0;
        sunMesh.scale.lerp(new THREE.Vector3(sunScale, sunScale, sunScale), 0.05);

        // Update directional light intensity and color
        const intensity = getGradualLightIntensity();
        directionalLight.intensity = directionalLight.intensity * 0.95 + intensity * 0.05;
        directionalLight.color.lerp(sunColor, 0.05);

        // Update ambient light intensity (brighter during day)
        if (ambientLight) {
            ambientLight.intensity = 0.2 + intensity * 0.3;
        }
    }
}

export function getTimeOfDay() {
    // Cycle through different times of day
    const dayPhase = (getTime() * 0.005) % 1; // 0 to 1 representing full day cycle

    if (dayPhase < 0.2) return "Dawn";
    if (dayPhase < 0.4) return "Day";
    if (dayPhase < 0.6) return "Afternoon";
    if (dayPhase < 0.8) return "Dusk";
    return "Night";
}

function getSkyColor(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return new THREE.Color(0x9a6a8c); // Purplish dawn
        case 'day':
            return new THREE.Color(0x87ceeb); // Sky blue
        case 'dusk':
            return new THREE.Color(0xff7f50); // Coral sunset
        case 'night':
            return new THREE.Color(0x1a2a4a); // Lighter night blue (was 0x0a1a2a)
        default:
            return new THREE.Color(0x87ceeb);
    }
}

function getAmbientLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0x7a5c70), // Purple-tinted for dawn
                intensity: 0.4 // Doubled from 0.2
            };
        case 'day':
            return {
                color: new THREE.Color(0x89a7c5), // Slightly bluer sky ambient
                intensity: 0.5 // Doubled from 0.25
            };
        case 'dusk':
            return {
                color: new THREE.Color(0x614b5a), // Deeper dusk ambient
                intensity: 0.4 // Doubled from 0.2
            };
        case 'night':
            return {
                color: new THREE.Color(0x2a3045), // Lighter night ambient (was 0x1a2035)
                intensity: 0.5 // Doubled from 0.25
            };
        default:
            return {
                color: new THREE.Color(0x89a7c5),
                intensity: 0.5 // Doubled from 0.25
            };
    }
}

function getGradualSunPosition() {
    // Use same day phase calculation as skybox for consistency
    const dayPhase = (getTime() * 0.005) % 1;

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

function getGradualSunColor() {
    const dayPhase = (getTime() * 0.005) % 1;

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
function getGradualLightIntensity() {
    const dayPhase = (getTime() * 0.005) % 1;

    // Highest at noon, lowest at night (all values doubled)
    if (dayPhase < 0.25) {
        // Dawn - rising intensity
        return 0.4 + (dayPhase / 0.25) * 1.6; // Doubled from 0.2 + * 0.8
    } else if (dayPhase < 0.75) {
        // Day - full intensity
        return 2.0; // Doubled from 1.0
    } else if (dayPhase < 0.85) {
        // Dusk - falling intensity
        return 2.0 - ((dayPhase - 0.75) / 0.1) * 1.6; // Doubled from 1.0 - * 0.8
    } else {
        // Night - low intensity
        return 0.4; // Doubled from 0.2
    }
}

// Add this function to enhance moon glow at night
function updateMoonGlow() {
    if (sunMesh && lastTimeOfDay === 'night') {
        // Find the glow child of the sun/moon
        sunMesh.children.forEach(child => {
            if (child.material) {
                // Enhance the glow for the moon
                child.material.opacity = 0.6; // Increased from 0.4
                child.scale.set(1.5, 1.5, 1.5); // Larger glow for moon
                child.material.color.set(0xaaddff); // Bluer glow for moon
            }
        });

        // Make the moon itself brighter
        if (sunMesh.material) {
            sunMesh.material.color.set(0xccddff); // Brighter moon
            sunMesh.material.opacity = 1.0; // Full opacity
        }
    }
}