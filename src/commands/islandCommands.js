import * as THREE from 'three';
import { scene, boat } from '../core/gameState.js';
import { createRockyIsland } from '../world/rockyIslands.js';

/**
 * Rocky Island command implementation
 * @param {Array<string>} args - Command arguments
 * @param {object} chatSystem - Reference to the chat system
 */
export function rockyIslandCommand(args, chatSystem) {
    // Check for subcommands
    if (args.length > 0) {
        const subcommand = args[0].toLowerCase();

        // Handle create subcommand
        if (subcommand === 'create') {
            // Get the size parameter (default to 1.0 if not provided)
            let size = 1.0;
            if (args.length > 1) {
                const sizeArg = parseFloat(args[1]);
                if (!isNaN(sizeArg) && sizeArg > 0) {
                    size = sizeArg;
                } else {
                    chatSystem.addSystemMessage(`Invalid size value. Please use a positive number.`);
                    return;
                }
            }

            // Use boat position as the island position
            const offsetDistance = 500 * size; // Scale the distance based on size
            const boatDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);

            // Position the island in front of the boat at a distance
            const islandX = boat.position.x + (boatDirection.x * offsetDistance);
            const islandZ = boat.position.z + (boatDirection.z * offsetDistance);

            // Generate a random seed
            const seed = Math.floor(Math.random() * 1000000);

            try {
                // Create the rocky island
                const island = createRockyIsland(islandX, islandZ, seed, scene);

                // Scale the island based on the size parameter
                if (island && island.mesh) {
                    island.mesh.scale.set(size, size, size);

                    // Also scale the collider if it exists
                    if (island.collider) {
                        island.collider.scale.set(size, size, size);
                    }
                }

                chatSystem.addSystemMessage(`Created a rocky island of size ${size.toFixed(1)} at position (${islandX.toFixed(0)}, ${islandZ.toFixed(0)})`);
            } catch (error) {
                console.error("Error creating rocky island:", error);
                chatSystem.addSystemMessage(`Failed to create rocky island: ${error.message}`);
            }

            return;
        }
    }

    // Show usage info if no valid subcommand was provided
    chatSystem.addSystemMessage(
        `Rocky Island Command Usage:
        /rocky-island create [size] - Create a rocky island in front of your ship with optional size (default: 1.0)`
    );
}

// Export a list of all commands in this module with their descriptions
export const islandCommands = [
    {
        name: 'rocky-island',
        handler: rockyIslandCommand,
        description: 'Create a rocky island at your current position'
    }
    // Add more island-related commands here in the future
]; 