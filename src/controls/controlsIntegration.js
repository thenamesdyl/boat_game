import { initCollisionResponse, updateCollisionResponse } from './islandCollisionResponse.js';

// Initialize all control systems
export function initializeControlSystems() {
    // Initialize collision response
    const collisionSystem = initCollisionResponse();

    // Return update functions for the main loop
    return {
        updateControls: function (deltaTime) {
            // Update collision response
            updateCollisionResponse(deltaTime);
        }
    };
}

function animate() {
    const deltaTime = clock.getDelta();

    // Update game controls including collision response
    controlSystems.updateControls(deltaTime);

    // ... rest of animation loop
} 