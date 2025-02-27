import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';

// Renderer variables
let renderer;
let composer;

export function setupRenderer(scene, camera) {
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Set up post-processing
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Add bloom pass if it was in your original code
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    composer.addPass(bloomPass);

    // Add color correction if it was in your original code
    const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    composer.addPass(colorCorrectionPass);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    return renderer;
}

export function getRenderer() {
    return renderer;
}

export function getComposer() {
    return composer;
}

export function render() {
    composer.render();
} 