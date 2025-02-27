import * as THREE from 'three';

export function setupScene() {
    // Create the scene
    const scene = new THREE.Scene();

    // Add fog for distance fading
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0005);

    return scene;
} 