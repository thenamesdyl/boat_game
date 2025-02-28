import * as THREE from 'three';

// Create a skybox with a single material
export function setupSkybox(scene, camera) {
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
export function getGradualSkyboxColor(time) {
    // Normalize time to 0-1 range for a full day cycle
    const dayPhase = (time * 0.005) % 1;

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
export function updateSkybox(time, camera) {
    if (window.skybox) {
        // Get gradually changing color based on time
        const newColor = getGradualSkyboxColor(time);

        // Apply with slight easing for smoother transitions
        window.skybox.material.color.lerp(newColor, 0.03);

        // Keep skybox centered on camera
        window.skybox.position.copy(camera.position);
    }
} 