// Main entry point
import * as THREE from 'three';
import { setupRenderer } from './renderer.js';
import { setupScene } from './scene.js';
import { setupCamera } from './camera.js';
import { setupLighting } from './lighting.js';
import { setupSky } from './sky.js';
import { setupBoat } from './boat.js';
import { setupUI } from './ui.js';
import { setupNetwork } from './network.js';
import { setupWorld } from './world.js';
import { gameLoop } from './gameLoop.js';

// Initialize the game
function initGame() {
    // Create the basic Three.js components
    const renderer = setupRenderer();
    const scene = setupScene();
    const camera = setupCamera();

    // Set up game systems
    setupLighting(scene);
    setupSky(scene);
    const boat = setupBoat(scene);
    setupUI();
    setupNetwork();
    setupWorld(scene, boat);

    // Start the game loop
    gameLoop(renderer, scene, camera, boat);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Clean up when the page is closed
    window.addEventListener('beforeunload', () => {
        // Disconnect from network, etc.
    });
}

// Start the game when the page loads
window.addEventListener('load', initGame); 