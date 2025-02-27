import * as THREE from 'three';

// Sky variables
let skyMaterial;
let skyMesh;
let sunMesh;
let sunAngle = 0;
const sunCycleSpeed = 0.0001;
const sunSize = 100;
const skyRadius = 20001;

// Time of day tracking
let lastTimeOfDay = "";
let skyboxTransitionProgress = 0;
const skyboxTransitionDuration = 20;

export function setupSky(scene) {
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

    scene.add(sunMesh);

    return {
        skyMesh,
        sunMesh
    };
}

export function updateSky(deltaTime, camera, directionalLight, ambientLight) {
    // Update sun angle continuously
    sunAngle += sunCycleSpeed * deltaTime * 60; // Multiply by 60 to normalize for frame rate
    if (sunAngle >= Math.PI * 2) {
        sunAngle -= Math.PI * 2; // Reset after full circle
    }

    // Calculate sun position based on angle
    // This creates a circular path tilted slightly for realism
    const sunX = Math.sin(sunAngle) * skyRadius * 0.95;
    const sunY = Math.sin(sunAngle + Math.PI / 2) * skyRadius * 0.4 + skyRadius * 0.2; // Offset to keep mostly above horizon
    const sunZ = Math.cos(sunAngle) * skyRadius * 0.95;

    // Update directional light position
    directionalLight.position.set(sunX, sunY, sunZ);

    // Update sun sprite position and visibility
    if (sunMesh) {
        // Check if the sun is above the horizon
        const aboveHorizon = directionalLight.position.y > 0;

        // Check if the sun would be visible from the camera's perspective
        const sunToCamera = new THREE.Vector3().subVectors(camera.position, directionalLight.position);
        const dot = sunToCamera.dot(camera.getWorldDirection(new THREE.Vector3()));

        // Only show the sun if it's in front of the camera AND above the horizon
        if (dot < 0 && aboveHorizon) {
            // Position the sprite at the directional light position
            sunMesh.position.copy(directionalLight.position);

            // Update sun color based on time of day
            const timeOfDay = getTimeOfDay();
            if (timeOfDay === 'Night') {
                sunMesh.material.color.set(0xaaaaff); // Bluish for moon
                sunMesh.scale.set(sunSize * 0.7, sunSize * 0.7, 1); // Smaller moon
            } else if (timeOfDay === 'Dawn' || timeOfDay === 'Dusk') {
                sunMesh.material.color.set(0xff7700); // Orange for sunrise/sunset
                sunMesh.scale.set(sunSize * 1.2, sunSize * 1.2, 1); // Slightly larger sun at dawn/dusk
            } else {
                sunMesh.material.color.set(0xffffaa); // Yellow for day
                sunMesh.scale.set(sunSize, sunSize, 1); // Normal size for day
            }

            // Make the sun visible
            sunMesh.visible = true;
        } else {
            // Sun is behind the camera or below horizon, hide it
            sunMesh.visible = false;
        }
    }

    // Update time of day based on sun position
    updateTimeOfDay(deltaTime, directionalLight, ambientLight);
}

function updateTimeOfDay(deltaTime, directionalLight, ambientLight) {
    const timeOfDay = getTimeOfDay();

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
        skyMaterial.color.lerp(targetSkyColor, 0.05);

        // Update ambient light with faster transition
        ambientLight.color.lerp(targetAmbientLight.color, 0.05);
        ambientLight.intensity += (targetAmbientLight.intensity - ambientLight.intensity) * 0.05;

        // Update directional light with faster transition
        directionalLight.color.lerp(targetDirectionalLight.color, 0.05);
        directionalLight.intensity += (targetDirectionalLight.intensity - directionalLight.intensity) * 0.05;
    }
}

export function getTimeOfDay() {
    // Determine time of day based on sun angle
    const normalizedAngle = sunAngle / (Math.PI * 2);

    if (normalizedAngle < 0.1) return "Night";
    if (normalizedAngle < 0.2) return "Dawn";
    if (normalizedAngle < 0.4) return "Day";
    if (normalizedAngle < 0.6) return "Afternoon";
    if (normalizedAngle < 0.7) return "Dusk";
    return "Night";
}

export function getSkyColor(timeOfDay) {
    switch (timeOfDay) {
        case 'Dawn':
            return new THREE.Color(0xffd4a3); // Warm orange/pink
        case 'Day':
            return new THREE.Color(0x87ceeb); // Sky blue
        case 'Afternoon':
            return new THREE.Color(0xb0c4de); // Light steel blue
        case 'Dusk':
            return new THREE.Color(0xff7f50); // Coral/orange
        case 'Night':
        default:
            return new THREE.Color(0x0a1a2a); // Dark blue
    }
}

export function getAmbientLight(timeOfDay) {
    switch (timeOfDay) {
        case 'Dawn':
            return {
                color: new THREE.Color(0xffd4a3),
                intensity: 0.5
            };
        case 'Day':
            return {
                color: new THREE.Color(0xffffff),
                intensity: 0.8
            };
        case 'Afternoon':
            return {
                color: new THREE.Color(0xf0f0f0),
                intensity: 0.7
            };
        case 'Dusk':
            return {
                color: new THREE.Color(0xff7f50),
                intensity: 0.5
            };
        case 'Night':
        default:
            return {
                color: new THREE.Color(0x0a1a2a),
                intensity: 0.2
            };
    }
}

export function getDirectionalLight(timeOfDay) {
    switch (timeOfDay) {
        case 'Dawn':
            return {
                color: new THREE.Color(0xffd4a3),
                intensity: 0.8,
                position: new THREE.Vector3(-1000, 400, 1000)
            };
        case 'Day':
            return {
                color: new THREE.Color(0xffffff),
                intensity: 1.0,
                position: new THREE.Vector3(0, 1800, 0)
            };
        case 'Afternoon':
            return {
                color: new THREE.Color(0xf9f9f9),
                intensity: 0.9,
                position: new THREE.Vector3(1000, 800, -1000)
            };
        case 'Dusk':
            return {
                color: new THREE.Color(0xff7f50),
                intensity: 0.7,
                position: new THREE.Vector3(1000, 400, -1000)
            };
        case 'Night':
        default:
            return {
                color: new THREE.Color(0x0a1a2a),
                intensity: 0.4,
                position: new THREE.Vector3(0, -800, 1000)
            };
    }
}

export function getSunAngle() {
    return sunAngle;
}

export function getSkyMesh() {
    return skyMesh;
}

export function getSunMesh() {
    return sunMesh;
} 