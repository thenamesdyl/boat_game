import * as THREE from 'three';
import { scene, camera, boat } from '../core/gameState.js';
import * as BirdSystem from '../entities/birds.js';

// Collection to track command-spawned birds
let commandBirds = [];

// Bird configuration for command-spawned birds
const COMMAND_BIRD_CONFIG = {
    count: 10,              // Default number of birds to spawn
    maxCount: 30,           // Maximum allowed birds per command
    flockRadius: 15,        // How close birds stay to each other
    lifespan: 60            // Birds disappear after 60 seconds
};

/**
 * Get the current player position
 * @returns {THREE.Vector3} Player position
 */
function getPlayerPosition() {
    // First priority: use the boat position if available
    if (boat && boat.position) {
        return boat.position.clone();
    }

    // Second priority: if we're in fly mode, use the camera position
    if (window.flyModeEnabled && camera) {
        return camera.position.clone();
    }

    // Fallback: use camera position with adjustments
    const position = camera.position.clone();
    position.y = Math.max(position.y, 1.0); // Ensure minimum height
    return position;
}

/**
 * Spawn a swarm of birds at the player's location
 * @param {Array<string>} args - Command arguments
 * @param {Object} chatSystem - Chat system for feedback
 */
function spawnBirdSwarm(args, chatSystem) {
    try {
        // Parse arguments for bird count
        let birdCount = COMMAND_BIRD_CONFIG.count;
        if (args.length > 0) {
            const parsedCount = parseInt(args[0]);
            if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount <= COMMAND_BIRD_CONFIG.maxCount) {
                birdCount = parsedCount;
            } else {
                chatSystem.addSystemMessage(`Invalid bird count. Using default of ${COMMAND_BIRD_CONFIG.count} birds.`);
            }
        }

        // Get player position
        const playerPosition = getPlayerPosition();
        console.log("Spawning birds at player position:", playerPosition);

        // Create a new group of birds
        const newBirds = createCommandBirds(birdCount, playerPosition);
        if (newBirds && newBirds.length > 0) {
            commandBirds = commandBirds.concat(newBirds);
            chatSystem.addSystemMessage(`Spawned a swarm of ${birdCount} birds at your location!`);
        } else {
            chatSystem.addSystemMessage("Failed to spawn birds. Check console for errors.");
        }
    } catch (error) {
        console.error("Error in spawnBirdSwarm command:", error);
        chatSystem.addSystemMessage("An error occurred while spawning birds.");
    }
}

/**
 * Create birds using the existing bird system, but at a specific location
 * @param {number} count - Number of birds to create
 * @param {THREE.Vector3} position - Position to spawn birds
 * @returns {Array} Created birds
 */
function createCommandBirds(count, position) {
    try {
        const newBirds = [];

        // Create bird geometry based on existing system code
        const bodyGeometry = new THREE.ConeGeometry(1, 4, 4);
        bodyGeometry.rotateX(Math.PI / 2);

        // Create wing geometry
        const wingGeometry = new THREE.PlaneGeometry(6, 2);

        // Create different bird colors (same as in birds.js)
        const birdColors = [
            0xFFFFFF, // White
            0x333333, // Dark gray
            0x87CEEB, // Sky blue
            0xA52A2A, // Brown
            0x000000  // Black
        ];

        // Create birds
        for (let i = 0; i < count; i++) {
            // Choose random color
            const colorIndex = Math.floor(Math.random() * birdColors.length);
            const birdColor = birdColors[colorIndex];

            // Create bird group
            const bird = new THREE.Group();

            // Create body
            const bodyMaterial = new THREE.MeshPhongMaterial({ color: birdColor });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            bird.add(body);

            // Create left wing
            const leftWingMaterial = new THREE.MeshPhongMaterial({
                color: birdColor,
                side: THREE.DoubleSide
            });
            const leftWing = new THREE.Mesh(wingGeometry, leftWingMaterial);
            leftWing.position.set(-2, 0, 0);
            leftWing.rotation.z = Math.PI / 4;
            bird.add(leftWing);

            // Create right wing
            const rightWing = new THREE.Mesh(wingGeometry, leftWingMaterial);
            rightWing.position.set(2, 0, 0);
            rightWing.rotation.z = -Math.PI / 4;
            bird.add(rightWing);

            // Position bird at player location with small random offset
            const randomOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                5 + Math.random() * 10,
                (Math.random() - 0.5) * 10
            );

            bird.position.copy(position).add(randomOffset);

            // Set random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.5
            );

            // Add spawn time to track lifespan
            const spawnTime = Date.now();

            // Add bird to scene
            scene.add(bird);

            // Store bird data
            newBirds.push({
                mesh: bird,
                velocity: velocity,
                leftWing: leftWing,
                rightWing: rightWing,
                wingFlapDirection: 1,
                wingFlapPhase: Math.random() * Math.PI * 2, // Random starting phase
                goalIndex: null,
                goalTimer: 0,
                state: 'flock', // Start in flocking state
                spawnTime: spawnTime, // For command birds to expire
                isCommandSpawned: true // Flag to identify command-spawned birds
            });
        }

        // Start bird update loop if not already running
        if (!window.birdCommandUpdateInitialized) {
            initCommandBirdUpdates();
        }

        return newBirds;
    } catch (error) {
        console.error("Error creating command birds:", error);
        return [];
    }
}

/**
 * Initialize update loop for command-spawned birds
 */
function initCommandBirdUpdates() {
    window.birdCommandUpdateInitialized = true;

    // Set up the update function
    function updateCommandBirds() {
        try {
            // Remove expired birds
            const now = Date.now();
            for (let i = commandBirds.length - 1; i >= 0; i--) {
                const bird = commandBirds[i];
                const age = (now - bird.spawnTime) / 1000; // Age in seconds

                if (age > COMMAND_BIRD_CONFIG.lifespan) {
                    // Remove from scene and list
                    scene.remove(bird.mesh);
                    commandBirds.splice(i, 1);
                    continue;
                }

                // Apply the bird update functions from the main bird system
                // We'll use the same flocking, movement, and wing flap logic

                // Calculate steering forces for flocking behavior
                const steeringForce = new THREE.Vector3();

                // Apply cohesion - birds stay close to average position
                const centerOfMass = getPlayerPosition().clone();
                centerOfMass.y += 10; // Stay above player

                const cohesionForce = new THREE.Vector3()
                    .subVectors(centerOfMass, bird.mesh.position)
                    .multiplyScalar(0.005);
                steeringForce.add(cohesionForce);

                // Apply separation - birds avoid each other
                const separationForce = calculateSeparationForce(bird, i);
                steeringForce.add(separationForce);

                // Apply alignment - birds try to move in same direction
                const alignmentForce = calculateAlignmentForce(bird, i);
                steeringForce.add(alignmentForce);

                // Add random wander force
                steeringForce.add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                ));

                // Apply steering to velocity
                bird.velocity.add(steeringForce);

                // Limit velocity
                if (bird.velocity.length() > 0.5) {
                    bird.velocity.normalize().multiplyScalar(0.5);
                }

                // Apply velocity to position
                bird.mesh.position.add(bird.velocity);

                // Make bird face direction of travel
                if (bird.velocity.length() > 0.01) {
                    const lookTarget = bird.mesh.position.clone().add(bird.velocity);
                    bird.mesh.lookAt(lookTarget);
                }

                // Flap wings
                bird.wingFlapPhase += 0.2;
                const wingAngle = Math.sin(bird.wingFlapPhase) * Math.PI / 4;
                bird.leftWing.rotation.z = Math.PI / 4 + wingAngle;
                bird.rightWing.rotation.z = -Math.PI / 4 - wingAngle;

                // Random chance to poop (use existing function if possible)
                if (Math.random() < 0.0005 && typeof BirdSystem.createBirdPoop === 'function') {
                    BirdSystem.createBirdPoop(bird.mesh.position.clone());
                }
            }

            // Continue the update loop if birds exist
            if (commandBirds.length > 0) {
                requestAnimationFrame(updateCommandBirds);
            } else {
                window.birdCommandUpdateInitialized = false;
            }
        } catch (error) {
            console.error("Error in updateCommandBirds:", error);
            // Continue the loop despite error
            requestAnimationFrame(updateCommandBirds);
        }
    }

    // Start the update loop
    requestAnimationFrame(updateCommandBirds);
}

/**
 * Calculate separation force for a bird (avoid other birds)
 * @param {Object} bird - The bird to calculate for
 * @param {number} index - Index of the bird in the array
 * @returns {THREE.Vector3} Separation force
 */
function calculateSeparationForce(bird, index) {
    const separationForce = new THREE.Vector3();
    let neighborCount = 0;

    // Check all other birds
    commandBirds.forEach((otherBird, otherIndex) => {
        if (index !== otherIndex) {
            const distance = bird.mesh.position.distanceTo(otherBird.mesh.position);

            if (distance < COMMAND_BIRD_CONFIG.flockRadius) {
                // Calculate vector away from other bird
                const awayVector = new THREE.Vector3()
                    .subVectors(bird.mesh.position, otherBird.mesh.position)
                    .normalize()
                    .divideScalar(Math.max(0.1, distance));

                separationForce.add(awayVector);
                neighborCount++;
            }
        }
    });

    // Average the separation force
    if (neighborCount > 0) {
        separationForce.divideScalar(neighborCount);
        separationForce.multiplyScalar(0.05); // Separation factor
    }

    return separationForce;
}

/**
 * Calculate alignment force for a bird (align with other birds)
 * @param {Object} bird - The bird to calculate for
 * @param {number} index - Index of the bird in the array
 * @returns {THREE.Vector3} Alignment force
 */
function calculateAlignmentForce(bird, index) {
    const alignmentForce = new THREE.Vector3();
    let neighborCount = 0;

    // Check all other birds
    commandBirds.forEach((otherBird, otherIndex) => {
        if (index !== otherIndex) {
            const distance = bird.mesh.position.distanceTo(otherBird.mesh.position);

            if (distance < COMMAND_BIRD_CONFIG.flockRadius) {
                // Add other bird's velocity
                alignmentForce.add(otherBird.velocity);
                neighborCount++;
            }
        }
    });

    // Average the alignment force
    if (neighborCount > 0) {
        alignmentForce.divideScalar(neighborCount);
        alignmentForce.multiplyScalar(0.05); // Alignment factor
    }

    return alignmentForce;
}

// Export bird commands
export const birdCommands = [
    {
        name: 'birds',
        handler: spawnBirdSwarm,
        description: 'Spawn a swarm of birds at your location. Usage: /birds [count]'
    }
]; 