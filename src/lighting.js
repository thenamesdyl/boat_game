import * as THREE from 'three';

// Lighting variables
let directionalLight;
let ambientLight;
let hemisphereLight;

export function setupLighting(scene) {
    // Create ambient light
    ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create hemisphere light (sky/ground)
    hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2E8B57, 0.6);
    scene.add(hemisphereLight);

    // Create directional light (sun/moon)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(0, 1000, 0);
    directionalLight.name = 'directionalLight'; // Name for reference

    // Set up shadows
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.top = 1000;
    directionalLight.shadow.camera.bottom = -1000;

    scene.add(directionalLight);

    return {
        directionalLight,
        ambientLight,
        hemisphereLight
    };
}

export function updateLighting(timeOfDay) {
    // Update lighting based on time of day
    switch (timeOfDay) {
        case 'Dawn':
            directionalLight.color.set(0xffd4a3);
            directionalLight.intensity = 0.8;
            ambientLight.color.set(0xffd4a3);
            ambientLight.intensity = 0.5;
            break;
        case 'Day':
            directionalLight.color.set(0xffffff);
            directionalLight.intensity = 1.0;
            ambientLight.color.set(0xffffff);
            ambientLight.intensity = 0.8;
            break;
        case 'Afternoon':
            directionalLight.color.set(0xf9f9f9);
            directionalLight.intensity = 0.9;
            ambientLight.color.set(0xf0f0f0);
            ambientLight.intensity = 0.7;
            break;
        case 'Dusk':
            directionalLight.color.set(0xff7f50);
            directionalLight.intensity = 0.7;
            ambientLight.color.set(0xff7f50);
            ambientLight.intensity = 0.5;
            break;
        case 'Night':
            directionalLight.color.set(0x0a1a2a);
            directionalLight.intensity = 0.4;
            ambientLight.color.set(0x0a1a2a);
            ambientLight.intensity = 0.2;
            break;
    }
}

export function getDirectionalLight() {
    return directionalLight;
}

export function getAmbientLight() {
    return ambientLight;
}

export function getHemisphereLight() {
    return hemisphereLight;
} 