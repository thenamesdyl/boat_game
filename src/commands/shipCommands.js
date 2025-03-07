import * as THREE from 'three';
import { boat } from '../core/gameState.js';

// Store the default boat speed for reference
const DEFAULT_BOAT_SPEED = 0.2;

// Keep track of the current speed multiplier
let speedMultiplier = 1.0;

/**
 * Speed command implementation - allows changing the ship's speed
 * @param {Array<string>} args - Command arguments
 * @param {object} chatSystem - Reference to the chat system
 */
export function speedCommand(args, chatSystem) {
    // If no arguments, show current speed
    if (args.length === 0) {
        chatSystem.addSystemMessage(`Current ship speed is ${speedMultiplier.toFixed(1)}x (${(DEFAULT_BOAT_SPEED * speedMultiplier).toFixed(3)})`);
        return;
    }

    const subcommand = args[0].toLowerCase();

    // Handle different speed settings
    switch (subcommand) {
        case 'reset':
            setSpeedMultiplier(1.0, chatSystem);
            break;

        case 'slow':
            setSpeedMultiplier(0.5, chatSystem);
            break;

        case 'normal':
            setSpeedMultiplier(1.0, chatSystem);
            break;

        case 'fast':
            setSpeedMultiplier(2.0, chatSystem);
            break;

        case 'turbo':
            setSpeedMultiplier(4.0, chatSystem);
            break;

        default:
            // Try to parse as a numeric multiplier
            const multiplier = parseFloat(subcommand);

            if (!isNaN(multiplier)) {
                // Limit the speed range to prevent extreme values
                if (multiplier >= 0.1 && multiplier <= 10.0) {
                    setSpeedMultiplier(multiplier, chatSystem);
                } else {
                    chatSystem.addSystemMessage('Speed multiplier must be between 0.1 and 10.0');
                }
            } else {
                // Show usage help
                showSpeedCommandHelp(chatSystem);
            }
    }
}

/**
 * Apply a speed multiplier to the boat
 * @param {number} multiplier - Speed multiplier value 
 * @param {object} chatSystem - Reference to the chat system
 */
function setSpeedMultiplier(multiplier, chatSystem) {
    try {
        // Store current value for reporting
        const oldMultiplier = speedMultiplier;

        // Update the global speed multiplier
        speedMultiplier = multiplier;

        // Apply the new speed directly to the global boatSpeed
        window.boatSpeedMultiplier = multiplier;

        // Apply any additional visual effects for speed changes
        applySpeedVisualEffects(multiplier);

        // Report the change
        chatSystem.addSystemMessage(`Ship speed changed from ${oldMultiplier.toFixed(1)}x to ${multiplier.toFixed(1)}x`);
    } catch (error) {
        console.error("Error setting ship speed:", error);
        chatSystem.addSystemMessage(`Failed to set speed: ${error.message}`);
    }
}

/**
 * Apply visual effects based on the speed multiplier
 * @param {number} multiplier - Speed multiplier value
 */
function applySpeedVisualEffects(multiplier) {
    // Add wake effects, sail angle changes, or other visual indicators
    // based on the speed multiplier

    // Example: Adjust boat tilt based on speed
    if (boat && boat.rotation) {
        // Slight forward tilt at high speeds
        const tiltAmount = Math.max(0, (multiplier - 1) * 0.05);

        // We don't want to directly set rotation.x as that would affect steering
        // Instead, we'll set a property that the boat update function can use
        boat.speedTilt = tiltAmount;
    }

    // Note: In a real implementation, you would likely want to
    // add more visual effects like wake particles, sail adjustments, etc.
}

/**
 * Show help information for the speed command
 * @param {object} chatSystem - Reference to the chat system
 */
function showSpeedCommandHelp(chatSystem) {
    chatSystem.addSystemMessage(
        `Speed Command Usage:
        /speed - Show current speed
        /speed [value] - Set ship speed
        
        You can specify speed as:
        - Named speed: slow, normal, fast, turbo, reset
        - Multiplier: a number between 0.1-10.0 (e.g., /speed 2.5 for 2.5x speed)`
    );
}

// Export a list of all commands in this module with their descriptions
export const shipCommands = [
    {
        name: 'speed',
        handler: speedCommand,
        description: 'Adjust ship movement speed - /speed [multiplier]'
    }
    // Add more ship-related commands here in the future
]; 