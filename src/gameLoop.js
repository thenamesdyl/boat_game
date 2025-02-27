import { updateSky } from './sky.js';
import { updateBoat } from './boat.js';
import { updateCamera } from './camera.js';
import { updateWorld } from './world.js';
import { updateUI } from './ui.js';
import { updateNetwork } from './network.js';
import { render } from './renderer.js';

let time = 0;
let lastTime = null;

export function gameLoop(renderer, scene, camera, boat) {
    function animate() {
        const now = performance.now();
        const deltaTime = (now - (lastTime || now)) / 1000;
        lastTime = now;
        time += 0.09;

        // Update game systems
        const directionalLight = scene.getObjectByName('directionalLight');
        updateSky(deltaTime, camera, directionalLight);

        const waterHeight = updateWater(time, boat.position);
        updateBoat(deltaTime, getInputState(), waterHeight);
        updateCamera(camera, boat);
        updateWorld(scene, boat);
        updateUI(boat, time);
        updateNetwork(boat);

        // Render the scene
        render(scene, camera);

        // Continue the loop
        requestAnimationFrame(animate);
    }

    // Start the animation loop
    animate();
}

function getInputState() {
    // Return the current input state from the input module
    // ...
} 