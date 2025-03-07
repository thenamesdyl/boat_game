import * as THREE from 'three';
import { boat, boatVelocity } from '../core/gameState.js';

/**
 * Spawn command implementation - teleports the ship to the center of the map (0,0,0)
 * @param {Array<string>} args - Command arguments
 * @param {object} chatSystem - Reference to the chat system
 */
export function spawnCommand(args, chatSystem) {
    // Notify the player
    chatSystem.addSystemMessage("🌊 Teleporting to spawn point...");

    // Store previous position for messaging
    const previousX = Math.round(boat.position.x);
    const previousZ = Math.round(boat.position.z);

    // Teleport the boat to the center of the map
    boat.position.x = 0;
    boat.position.z = 0;

    // Keep the y-position as is (water level)
    // boat.position.y remains unchanged

    // Reset any velocity to prevent momentum after teleportation
    boatVelocity.set(0, 0, 0);

    // Add a success message with distance traveled
    const distance = Math.round(Math.sqrt(previousX * previousX + previousZ * previousZ));
    chatSystem.addSystemMessage(`🏝️ Teleported to spawn point (0, 0) from ${previousX}, ${previousZ} - traveled ${distance} units.`);
}

// Export all teleport commands
export const teleportCommands = [
    {
        name: 'spawn',
        handler: spawnCommand,
        description: 'Teleport back to the center of the map (0,0,0)'
    }
    // Add more teleport-related commands here in the future
]; 