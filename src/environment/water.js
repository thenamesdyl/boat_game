import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { scene, camera, renderer, getTime, getWindData } from '../core/gameState.js';

let waterMesh;
let waterNormals;
const waterSize = 10000; // Very large water plane
const waterSegments = 200; // Increased from 100 for more detailed waves

// Initialize the advanced water effect
export function setupWater() {
    // Load normal map for detailed waves
    const textureLoader = new THREE.TextureLoader();
    waterNormals = textureLoader.load(
        './waternormals.jpg',
        function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            console.log("Water normal map loaded successfully");
        },
        undefined, // onProgress callback not supported
        function (err) {
            console.error("Error loading water normal map:", err);
        }
    );

    // Configure water properties
    const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize, waterSegments, waterSegments);

    // Create the water mesh with advanced shader
    waterMesh = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x000133,         // Darker blue color
        distortionScale: 3.7,         // Increased from 3.7 for more pronounced waves
        fog: scene.fog !== undefined,
        alpha: 100.0                  // Slightly higher opacity
    });

    // Position water at sea level
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0;

    // Add to scene
    scene.add(waterMesh);

    return waterMesh;
}

// Update water in animation loop
export function updateWater(deltaTime) {
    if (!waterMesh) return;

    // Get current time for wave animation
    const time = getTime() * 0.001; // Convert to seconds and slow down

    // Access the water material parameters
    const waterUniforms = waterMesh.material.uniforms;

    // Update animation time - increased speed for more active waves
    waterUniforms.time.value += deltaTime * 0.35; // Increased from 0.2

    // Get wind data to influence wave direction and intensity
    const wind = getWindData();
    const windStrength = wind.speed / 6; // More responsive to wind (was /8)

    // Adjust wave distortion based on wind - increased base and multiplier
    waterUniforms.distortionScale.value = 3.0 + windStrength * 3.0; // More dynamic range

    // Update wave direction based on wind
    const windDirection = new THREE.Vector3(
        Math.sin(wind.direction),
        0,
        Math.cos(wind.direction)
    );

    // Apply slight offset to wave direction for natural look
    const waveDirection = new THREE.Vector2(
        windDirection.x * 0.3,
        windDirection.z * 0.3
    );

    // Update wave direction
    if (waterUniforms.flowDirection) {
        waterUniforms.flowDirection.value.copy(waveDirection);
    }

    // Update sun position and color
    if (scene.directionalLight) {
        waterUniforms.sunDirection.value.copy(scene.directionalLight.position).normalize();
        //waterUniforms.sunColor.value.copy(scene.directionalLight.color);
    }

    // Darker blue colors for all time periods
    let waterColor;
    if (time % 24 < 0.25 || time % 24 > 0.75) {
        // Night/evening water (darker blue)
        // waterColor = new THREE.Color(0x001a33);
    } else if (time % 24 > 0.45 && time % 24 < 0.55) {
        // Mid-day water (still darker but brighter than night)
        //waterColor = new THREE.Color(0x00264d);
    } else {
        // Morning/afternoon water (medium dark blue)
        //waterColor = new THREE.Color(0x002244);
    }

    // Lerp current color to target color
    //waterUniforms.waterColor.value.lerp(waterColor, deltaTime * 0.5);

    // Make sure water follows camera on x/z
    waterMesh.position.x = camera.position.x;
    waterMesh.position.z = camera.position.z;
}

// Function to adjust water quality for performance
export function setWaterQuality(quality) {
    if (!waterMesh) return;

    // Quality settings: low, medium, high
    switch (quality) {
        case 'low':
            waterMesh.material.uniforms.size.value = 0.5;
            break;
        case 'medium':
            waterMesh.material.uniforms.size.value = 1.0;
            break;
        case 'high':
            waterMesh.material.uniforms.size.value = 2.0;
            break;
    }
} 