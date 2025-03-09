import * as THREE from 'three';
import { scene, getTime, getAllPlayers, getPlayerInfo } from '../core/gameState.js';

const PVP_TARGETING_CONFIG = {
    // Targeting behavior
    TRACKING_SPEED: 0.7,            // How quickly cannons track players (0-1, higher = faster)
    MAX_PREDICTION: 1.5,            // Maximum seconds to predict player movement
    CONVERGENCE_DISTANCE: 40,       // Distance at which cannons aim precisely at target
    TARGET_PERSISTENCE: 1.2,        // How long to keep targeting after losing sight (seconds)

    // Visual appearance
    AIM_LINE_LENGTH: 75,            // Length of targeting lines
    LINE_SEGMENTS: 30,              // Number of segments in trajectory line
    ARC_HEIGHT: 15,                 // Height of the parabolic arc
    LINE_WIDTH: 1000,               // Width of the trajectory line

    // Colors
    COLOR_OUT_OF_RANGE: 0xff5500,   // Orange when target is out of range
    COLOR_IN_RANGE: 0xffff33,       // Green when target is in range
    COLOR_OPTIMAL: 0x33ff33,        // Yellow when in optimal firing position
};

// Main system state
let boat = null;
let cannonRange = 100;
let targetingVisualsActive = true;
let pvpModeActive = false;  // Flag to toggle PvP targeting

// Add a flag for extended position logging
let VERBOSE_PLAYER_POSITION_LOGGING = true;

// Add at the top near other state variables
const UPDATE_RATE_LIMIT = 5; // Updates per second maximum
let lastTrajectoryUpdateTime = {};

// Cannon positions - same as cannonautosystem.js
const cannonPositions = {
    leftFront: {
        xOffset: -2.5,
        zOffset: -3,
        defaultDir: new THREE.Vector3(-0.7, 0, -0.7)
    },
    leftRear: {
        xOffset: -2.5,
        zOffset: 3,
        defaultDir: new THREE.Vector3(-0.7, 0, 0.7)
    },
    rightFront: {
        xOffset: 2.5,
        zOffset: -3,
        defaultDir: new THREE.Vector3(0.7, 0, -0.7)
    },
    rightRear: {
        xOffset: 2.5,
        zOffset: 3,
        defaultDir: new THREE.Vector3(0.7, 0, 0.7)
    }
};

// Targeting state for each cannon
const targets = {};

// Initialize the cannon positions
Object.keys(cannonPositions).forEach(position => {
    targets[position] = {
        currentTarget: null,
        aimDirection: new THREE.Vector3(0, 0, 0),
        aimPoint: new THREE.Vector3(0, 0, 0),
        trajectory: null,
        lastTargetTime: 0,          // Track when we last had a valid target
        lastPlayerY: null,         // Track last player Y position
        targetDistance: null        // Track actual distance to target
    };
});

// Initialize the PvP auto-targeting system
export function initPvPTargetingSystem(playerBoat, range) {
    boat = playerBoat;
    cannonRange = range || 100;

    console.log("🚢 PVP: Initializing targeting system with range:", cannonRange);
    console.log("🚢 PVP: Boat object:", boat);

    // Create initial targeting visuals
    createTargetingVisuals();

    console.log("🎯 PvP cannon auto-targeting system initialized");

    return {
        updateTargeting: updatePvPTargeting,
        toggleTargetingVisuals,
        togglePvPMode,
        isPvPModeActive,
        getTargets,
        debugTrajectoryAppearance,
        toggleDebugCannonPositions,
        toggleVerbosePositionLogging
    };
}

// Create visual elements for cannon targeting
function createTargetingVisuals() {
    console.log("🚢 PVP: Creating targeting visuals for all cannons");
    Object.keys(cannonPositions).forEach(position => {
        console.log(`🚢 PVP: Creating trajectory for ${position} cannon`);
        createCannonTrajectory(position);
    });
}

// Create trajectory line for a specific cannon - same as in cannonautosystem.js
function createCannonTrajectory(position) {
    // Remove existing trajectory if any
    if (targets[position].trajectory) {
        scene.remove(targets[position].trajectory);
    }

    // Create ribbon-like trajectory
    const ribbonWidth = 0.5; // Width of the trajectory ribbon

    // Create parabolic trajectory points
    const defaultLength = PVP_TARGETING_CONFIG.AIM_LINE_LENGTH;
    const points = [];
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i <= PVP_TARGETING_CONFIG.LINE_SEGMENTS; i++) {
        const t = i / PVP_TARGETING_CONFIG.LINE_SEGMENTS;

        // Parabolic arc with POSITIVE Z direction
        const x = 0;
        const y = 4 * PVP_TARGETING_CONFIG.ARC_HEIGHT * t * (1 - t);
        const z = t * defaultLength;

        // Center point
        const center = new THREE.Vector3(x, y, z);
        points.push(center);

        // Create points to the left and right to form a ribbon
        const left = new THREE.Vector3(x - ribbonWidth / 2, y, z);
        const right = new THREE.Vector3(x + ribbonWidth / 2, y, z);

        leftPoints.push(left);
        rightPoints.push(right);
    }

    // Create geometry for the ribbon
    const vertices = [];
    const indices = [];

    // Build triangle strip
    for (let i = 0; i < points.length; i++) {
        vertices.push(leftPoints[i].x, leftPoints[i].y, leftPoints[i].z);
        vertices.push(rightPoints[i].x, rightPoints[i].y, rightPoints[i].z);

        if (i < points.length - 1) {
            const baseIndex = i * 2;
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
        }
    }

    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    ribbonGeometry.setIndex(indices);
    ribbonGeometry.computeVertexNormals();

    // Create material for the ribbon - using PvP colors
    const ribbonMaterial = new THREE.MeshBasicMaterial({
        color: PVP_TARGETING_CONFIG.COLOR_OUT_OF_RANGE,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    // Create the mesh
    const trajectoryRibbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);

    // Hide initially
    trajectoryRibbon.visible = false;

    // Create a container object to handle positioning
    const trajectoryContainer = new THREE.Object3D();
    trajectoryContainer.name = `${position}Container`;
    trajectoryContainer.add(trajectoryRibbon);

    // Make sure the ribbon is positioned locally at 0,0,0 of the container
    trajectoryRibbon.position.set(0, 0, 0);

    // Add the container to the scene
    scene.add(trajectoryContainer);

    // Store references
    targets[position].trajectory = trajectoryRibbon;
    targets[position].trajectoryContainer = trajectoryContainer;
    targets[position].useRibbon = true;
}

// Update the PvP targeting system
export function updatePvPTargeting(deltaTime) {
    if (!boat) {
        console.log("🚢 PVP: No boat found, skipping targeting update");
        return;
    }

    if (!pvpModeActive) {
        // Don't spam logs when inactive
        return;
    }

    console.log("🚢 PVP: Updating targeting with deltaTime:", deltaTime);
    console.log("🚢 PVP: PvP mode active:", pvpModeActive);

    // Update targeting for each cannon
    Object.keys(cannonPositions).forEach(position => {
        console.log(`🚢 PVP: Updating targeting for ${position} cannon`);
        updateCannonTargeting(position, deltaTime);
    });
}

// Update targeting for a specific cannon
function updateCannonTargeting(position, deltaTime) {
    // Calculate cannon position in world space
    const cannonConfig = cannonPositions[position];
    const cannonWorldPosition = new THREE.Vector3(
        cannonConfig.xOffset,
        1.5, // Height above deck
        cannonConfig.zOffset
    );

    // Store original position for debugging
    const originalPosition = cannonWorldPosition.clone();

    // Apply boat's transformation to get world position
    cannonWorldPosition.applyMatrix4(boat.matrixWorld);

    // Debug the position transformation
    console.log(`🚢 PVP: ${position} cannon local position:`,
        `x:${originalPosition.x.toFixed(2)}, y:${originalPosition.y.toFixed(2)}, z:${originalPosition.z.toFixed(2)}`);
    console.log(`🚢 PVP: ${position} cannon world position:`,
        `x:${cannonWorldPosition.x.toFixed(2)}, y:${cannonWorldPosition.y.toFixed(2)}, z:${cannonWorldPosition.z.toFixed(2)}`);

    // Create a debug sphere to visualize cannon position (optional)
    if (window.DEBUG_CANNON_POSITIONS) {
        createCannonPositionMarker(cannonWorldPosition, position);
    }

    // Get default aim direction based on cannon position
    let defaultAimDirection = cannonConfig.defaultDir.clone();
    defaultAimDirection.applyQuaternion(boat.quaternion);
    defaultAimDirection.normalize();
    console.log(`🚢 PVP: ${position} default aim direction:`, defaultAimDirection);

    // Get current player info to avoid targeting self
    const currentPlayerInfo = getPlayerInfo();
    console.log("🚢 PVP: Current player info:", currentPlayerInfo);

    // Get all players from game state
    const allPlayers = getAllPlayers();
    console.log("🚢 PVP: All players count:", allPlayers ? allPlayers.length : 0);

    if (allPlayers && allPlayers.length > 0) {
        console.log("🚢 PVP: Available players:", allPlayers.map(p => p.name).join(", "));
    }

    // Find the closest enemy player
    let closestPlayer = null;
    let closestDistance = Infinity;
    let inOptimalPosition = false;
    let activelyTargeting = false;

    // Get current time for target persistence
    const currentTime = getTime();

    // Update targeting state
    const targetData = targets[position];
    console.log(`🚢 PVP: ${position} current target:`, targetData.currentTarget ? targetData.currentTarget.name : "none");

    // Process all players
    if (allPlayers && allPlayers.length > 0) {
        for (const player of allPlayers) {
            // Skip the current player (no self-targeting)
            if (player.name === currentPlayerInfo.name) {
                console.log(`🚢 PVP: Skipping self (${player.name})`);
                continue;
            }

            // Make sure player has a position
            if (!player.position) {
                console.log(`🚢 PVP: Player ${player.name} has no position, skipping`);
                continue;
            }

            // Convert player position to THREE.Vector3
            const playerPosition = new THREE.Vector3(
                player.position.x,
                player.position.y,
                player.position.z
            );
            console.log(`🚢 PVP: Player ${player.name} position:`, playerPosition);

            // Add this new detailed position logging
            if (VERBOSE_PLAYER_POSITION_LOGGING) {
                console.log(`🚢🔍 DETAILED PVP: Player ${player.name} world position:`,
                    `x:${playerPosition.x.toFixed(2)}, y:${playerPosition.y.toFixed(2)}, z:${playerPosition.z.toFixed(2)}`);

                // Log boat position too
                console.log(`🚢🔍 DETAILED PVP: My boat world position:`,
                    `x:${boat.position.x.toFixed(2)}, y:${boat.position.y.toFixed(2)}, z:${boat.position.z.toFixed(2)}`);

                // Calculate and log relative position to boat
                const relativePosition = playerPosition.clone().sub(boat.position);
                console.log(`🚢🔍 DETAILED PVP: Relative position to player:`,
                    `x:${relativePosition.x.toFixed(2)}, y:${relativePosition.y.toFixed(2)}, z:${relativePosition.z.toFixed(2)}`);

                // Log boat's quaternion/rotation
                console.log(`🚢🔍 DETAILED PVP: Boat rotation:`,
                    `x:${boat.rotation.x.toFixed(2)}, y:${boat.rotation.y.toFixed(2)}, z:${boat.rotation.z.toFixed(2)}`);
            }

            // Calculate distance to player
            const distance = playerPosition.distanceTo(cannonWorldPosition);
            console.log(`🚢 PVP: Distance to ${player.name}: ${distance.toFixed(2)} (range: ${cannonRange})`);

            // Check if player is in range
            if (distance <= cannonRange) {
                console.log(`🚢 PVP: ${player.name} is in range for ${position}`);

                // Calculate vector to player
                const toPlayer = new THREE.Vector3()
                    .subVectors(playerPosition, cannonWorldPosition)
                    .normalize();
                console.log(`🚢 PVP: Direction to ${player.name}:`, toPlayer);

                // Check if player is in firing arc for this cannon
                let validArc = false;

                // Define firing arcs based on cannon position
                if (position.includes('left')) {
                    // Left cannons can only target to the left side
                    const leftDirection = new THREE.Vector3(-1, 0, 0).applyQuaternion(boat.quaternion);
                    const leftDot = leftDirection.dot(toPlayer);
                    validArc = leftDot > 0.3; // About 70° arc to the left
                    console.log(`🚢 PVP: ${position} left dot product: ${leftDot.toFixed(2)}, valid arc: ${validArc}`);
                } else if (position.includes('right')) {
                    // Right cannons can only target to the right side
                    const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
                    const rightDot = rightDirection.dot(toPlayer);
                    validArc = rightDot > 0.3; // About 70° arc to the right
                    console.log(`🚢 PVP: ${position} right dot product: ${rightDot.toFixed(2)}, valid arc: ${validArc}`);
                }

                // Front/rear specialization
                if (validArc) {
                    if (position.includes('Front')) {
                        // Front cannons prefer targets in front
                        const frontDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
                        const frontDot = frontDirection.dot(toPlayer);
                        validArc = frontDot > 0;
                        console.log(`🚢 PVP: ${position} front dot product: ${frontDot.toFixed(2)}, valid arc: ${validArc}`);
                    } else if (position.includes('Rear')) {
                        // Rear cannons prefer targets behind
                        const rearDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(boat.quaternion);
                        const rearDot = rearDirection.dot(toPlayer);
                        validArc = rearDot > 0;
                        console.log(`🚢 PVP: ${position} rear dot product: ${rearDot.toFixed(2)}, valid arc: ${validArc}`);
                    }
                }

                // If in valid arc and closer than previous closest
                if (validArc && distance < closestDistance) {
                    console.log(`🚢 PVP: ${player.name} is now the closest valid target for ${position}`);
                    closestPlayer = player;
                    closestDistance = distance;
                    activelyTargeting = true;

                    // Remember last player Y position for smooth transitions
                    targetData.lastPlayerY = playerPosition.y;

                    // Update the last target time
                    targetData.lastTargetTime = currentTime;

                    // Store the actual distance to target for trajectory calculation
                    targetData.targetDistance = distance;

                    // Check if cannon is in optimal firing position (perpendicular for broadsides)
                    if (position.includes('left') || position.includes('right')) {
                        // For broadsides, optimal is 90° to player (dot product near 0)
                        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
                        const dotToPlayer = shipForward.dot(toPlayer);
                        inOptimalPosition = Math.abs(dotToPlayer) < 0.3; // Within ~20° of perpendicular
                        console.log(`🚢 PVP: Optimal position check: ${inOptimalPosition ? "YES" : "NO"} (dot: ${dotToPlayer.toFixed(2)})`);
                    }
                }
            }
        }
    } else {
        console.log("🚢 PVP: No players available to target");
    }

    // Check for target persistence - keep targeting for a short while after losing sight
    const timeSinceLastTarget = currentTime - targetData.lastTargetTime;
    console.log(`🚢 PVP: Time since last target: ${timeSinceLastTarget.toFixed(2)}s (persistence: ${PVP_TARGETING_CONFIG.TARGET_PERSISTENCE}s)`);

    // Continue targeting if we recently had a valid target
    if (!activelyTargeting && timeSinceLastTarget < PVP_TARGETING_CONFIG.TARGET_PERSISTENCE && targetData.currentTarget) {
        console.log(`🚢 PVP: Using persistence - keeping last known target: ${targetData.currentTarget.name}`);
        closestPlayer = targetData.currentTarget;
        activelyTargeting = true;
    }

    // If no players exist or this cannon isn't targeting, hide trajectory and return to default position
    if (!activelyTargeting) {
        // Only reset targeting if we've truly lost track
        if (timeSinceLastTarget > PVP_TARGETING_CONFIG.TARGET_PERSISTENCE) {
            console.log(`🚢 PVP: ${position} - no target, resetting to default`);
            targetData.currentTarget = null;
            targetData.targetDistance = null;

            // Return to default aim direction gradually
            targetData.aimDirection.lerp(defaultAimDirection, 0.1 * deltaTime * 60);

            // Hide trajectory line
            if (targetData.trajectory) {
                targetData.trajectory.visible = false;
            }
        }
        return;
    }

    // If we have a target, update aiming
    if (closestPlayer) {
        console.log(`🚢 PVP: ${position} targeting ${closestPlayer.name} at distance ${closestDistance.toFixed(2)}`);

        // Target acquired!
        targetData.currentTarget = closestPlayer;

        // Get player position, creating a THREE.Vector3 from the player data
        const playerPosition = new THREE.Vector3(
            closestPlayer.position.x,
            closestPlayer.position.y,
            closestPlayer.position.z
        );
        console.log(`🚢 PVP: Target position:`, playerPosition);

        // Create a simple velocity vector if player has one, otherwise zero
        const playerVelocity = closestPlayer.velocity ?
            new THREE.Vector3(closestPlayer.velocity.x, closestPlayer.velocity.y, closestPlayer.velocity.z) :
            new THREE.Vector3(0, 0, 0);
        console.log(`🚢 PVP: Target velocity:`, playerVelocity);

        // Adjust prediction based on distance - closer players need less prediction
        const predictionScale = Math.min(
            PVP_TARGETING_CONFIG.MAX_PREDICTION,
            closestDistance / PVP_TARGETING_CONFIG.CONVERGENCE_DISTANCE * PVP_TARGETING_CONFIG.MAX_PREDICTION
        );
        console.log(`🚢 PVP: Prediction scale: ${predictionScale.toFixed(2)}s`);

        // Calculate predicted position but limit the prediction for more accuracy
        const predictedPosition = playerPosition.clone().add(
            playerVelocity.clone().multiplyScalar(predictionScale)
        );
        console.log(`🚢 PVP: Predicted position:`, predictedPosition);

        // Calculate and store the distance to the predicted position
        targetData.targetDistance = cannonWorldPosition.distanceTo(predictedPosition);
        console.log(`🚢 PVP: Distance to predicted position: ${targetData.targetDistance.toFixed(2)}`);

        // Set the aim point as the predicted position
        targetData.aimPoint.copy(predictedPosition);

        // Calculate the ideal aim direction
        const idealAimDirection = new THREE.Vector3()
            .subVectors(predictedPosition, cannonWorldPosition)
            .normalize();
        console.log(`🚢 PVP: Ideal aim direction:`, idealAimDirection);

        // Gradually adjust current aim direction toward the ideal direction
        if (!targetData.aimDirection.length()) {
            // First time targeting, initialize with current direction
            targetData.aimDirection.copy(defaultAimDirection);
            console.log(`🚢 PVP: First-time aim initialization`);
        }

        // Adjust speed based on distance - slower tracking at greater distances
        const trackingSpeed = PVP_TARGETING_CONFIG.TRACKING_SPEED *
            (1 - Math.min(1, (closestDistance / cannonRange) * 0.8));
        console.log(`🚢 PVP: Tracking speed: ${trackingSpeed.toFixed(2)}`);

        // Current aim direction before update
        console.log(`🚢 PVP: Current aim direction (before):`, targetData.aimDirection.clone());

        // Lerp toward the ideal aim direction
        targetData.aimDirection.lerp(idealAimDirection, trackingSpeed * deltaTime * 60);
        targetData.aimDirection.normalize();
        console.log(`🚢 PVP: Updated aim direction:`, targetData.aimDirection.clone());

        // Update trajectory if this cannon is actively targeting and the visual should be shown
        if (targetData.trajectory && targetingVisualsActive && activelyTargeting) {
            console.log(`🚢 PVP: Updating trajectory for ${position} - ACTIVE TARGET`);

            // Show targeting trajectory only if this cannon is actively targeting
            targetData.trajectory.visible = true;

            // Debug trajectory position before update
            console.log(`🚢 PVP: Trajectory position before:`,
                targetData.trajectory.position.clone());

            // Position the container at cannon
            if (targetData.trajectoryContainer) {
                console.log(`🚢🔍 DETAILED PVP: Container position before:`,
                    `x:${targetData.trajectoryContainer.position.x.toFixed(2)}, y:${targetData.trajectoryContainer.position.y.toFixed(2)}, z:${targetData.trajectoryContainer.position.z.toFixed(2)}`);

                targetData.trajectoryContainer.position.copy(cannonWorldPosition);

                console.log(`🚢🔍 DETAILED PVP: Container position after:`,
                    `x:${targetData.trajectoryContainer.position.x.toFixed(2)}, y:${targetData.trajectoryContainer.position.y.toFixed(2)}, z:${targetData.trajectoryContainer.position.z.toFixed(2)}`);
            }

            // Orient the container toward the aim direction
            if (targetData.trajectoryContainer) {
                const lookTarget = new THREE.Vector3()
                    .addVectors(cannonWorldPosition, targetData.aimDirection);

                // Log the exact look target position
                console.log(`🚢🔍 DETAILED PVP: Look target position:`,
                    `x:${lookTarget.x.toFixed(2)}, y:${lookTarget.y.toFixed(2)}, z:${lookTarget.z.toFixed(2)}`);

                // Store previous rotation for comparison
                const prevRotation = targetData.trajectoryContainer.rotation.clone();

                // Apply the look rotation
                targetData.trajectoryContainer.lookAt(lookTarget);

                // Log rotation change
                console.log(`🚢🔍 DETAILED PVP: Container rotation from:`,
                    `x:${prevRotation.x.toFixed(2)}, y:${prevRotation.y.toFixed(2)}, z:${prevRotation.z.toFixed(2)}`,
                    `to: x:${targetData.trajectoryContainer.rotation.x.toFixed(2)}, y:${targetData.trajectoryContainer.rotation.y.toFixed(2)}, z:${targetData.trajectoryContainer.rotation.z.toFixed(2)}`);
            }

            // Update trajectory with parabolic arc using actual distance
            updateTrajectory(position, inOptimalPosition);
        } else {
            console.log(`🚢 PVP: Trajectory not updated - visible: ${targetingVisualsActive}, active: ${activelyTargeting}`);
        }
    } else {
        // No valid target but we might still be in persistence mode
        if (timeSinceLastTarget > PVP_TARGETING_CONFIG.TARGET_PERSISTENCE) {
            console.log(`🚢 PVP: ${position} - persistence expired, fully resetting`);
            // Truly no target, reset everything
            targetData.currentTarget = null;
            targetData.targetDistance = null;
            targetData.aimDirection.lerp(defaultAimDirection, 0.1 * deltaTime * 60);

            if (targetData.trajectory) {
                targetData.trajectory.visible = false;
            }
        }
    }

    // Rate limit updates for smooth movement
    if (!lastTrajectoryUpdateTime[position]) {
        lastTrajectoryUpdateTime[position] = 0;
    }

    const timeSinceLastUpdate = currentTime - lastTrajectoryUpdateTime[position];
    const minUpdateInterval = 1.0 / UPDATE_RATE_LIMIT;

    if (timeSinceLastUpdate < minUpdateInterval) {
        console.log(`🚢🔍 DETAILED PVP: Skipping update - too frequent (${timeSinceLastUpdate.toFixed(3)}s < ${minUpdateInterval.toFixed(3)}s)`);
        // Still update visibility
        targetData.trajectory.visible = true;
        return;
    }

    // Update the last update time
    lastTrajectoryUpdateTime[position] = currentTime;
}

// Update the trajectory for a specific cannon
function updateTrajectory(position, isOptimal) {
    const targetData = targets[position];
    if (!targetData.trajectory) {
        console.log(`🚢 PVP: No trajectory object for ${position}, skipping update`);
        return;
    }

    console.log(`🚢 PVP: Updating trajectory for ${position}, optimal: ${isOptimal}`);

    // Use the actual distance to target, or fall back to default length
    const trajectoryLength = targetData.targetDistance || PVP_TARGETING_CONFIG.AIM_LINE_LENGTH;
    console.log(`🚢 PVP: Trajectory length: ${trajectoryLength.toFixed(2)}`);

    // Scale arc height based on distance - closer targets need lower arcs
    const baseArcHeight = PVP_TARGETING_CONFIG.ARC_HEIGHT;
    const arcHeightScale = Math.min(1, trajectoryLength / 50); // Scale down for close targets
    const arcHeight = baseArcHeight * arcHeightScale;
    console.log(`🚢 PVP: Arc height: ${arcHeight.toFixed(2)} (scale: ${arcHeightScale.toFixed(2)})`);

    // Check if we're using the ribbon approach
    if (targetData.useRibbon) {
        console.log(`🚢 PVP: Updating ribbon trajectory`);

        // Update ribbon vertices to match target distance
        const ribbonWidth = 0.5;
        const positions = targetData.trajectory.geometry.getAttribute('position');

        for (let i = 0; i <= PVP_TARGETING_CONFIG.LINE_SEGMENTS; i++) {
            const t = i / PVP_TARGETING_CONFIG.LINE_SEGMENTS;

            // Calculate parabolic trajectory points to match actual distance
            const x = 0;
            const y = 4 * arcHeight * t * (1 - t); // Scaled arc height
            const z = t * trajectoryLength; // Use actual distance

            // Left and right points for ribbon
            const leftX = x - ribbonWidth / 2;
            const rightX = x + ribbonWidth / 2;

            // Update positions (two vertices per segment for left and right)
            const leftIdx = i * 2 * 3; // *2 for left/right, *3 for x,y,z
            const rightIdx = leftIdx + 3;

            // Left vertex
            positions.array[leftIdx] = leftX;
            positions.array[leftIdx + 1] = y;
            positions.array[leftIdx + 2] = z;

            // Right vertex
            positions.array[rightIdx] = rightX;
            positions.array[rightIdx + 1] = y;
            positions.array[rightIdx + 2] = z;
        }

        // Mark geometry for update
        positions.needsUpdate = true;

        // Update color based on target status
        let newColor;
        if (targetData.currentTarget) {
            if (isOptimal) {
                newColor = PVP_TARGETING_CONFIG.COLOR_OPTIMAL;
                console.log(`🚢 PVP: Setting trajectory color to OPTIMAL (yellow)`);
                targetData.trajectory.material.color.setHex(newColor);
            } else {
                newColor = PVP_TARGETING_CONFIG.COLOR_IN_RANGE;
                console.log(`🚢 PVP: Setting trajectory color to IN RANGE (green)`);
                targetData.trajectory.material.color.setHex(newColor);
            }
        } else {
            newColor = PVP_TARGETING_CONFIG.COLOR_OUT_OF_RANGE;
            console.log(`🚢 PVP: Setting trajectory color to OUT OF RANGE (orange)`);
            targetData.trajectory.material.color.setHex(newColor);
        }

        console.log(`🚢 PVP: New color hex: 0x${newColor.toString(16)}`);
    }
}

// Toggle visibility of targeting visuals
export function toggleTargetingVisuals(visible = null) {
    const previousValue = targetingVisualsActive;

    if (visible === null) {
        targetingVisualsActive = !targetingVisualsActive;
    } else {
        targetingVisualsActive = visible;
    }

    console.log(`🚢 PVP: Targeting visuals ${previousValue} -> ${targetingVisualsActive}`);

    // Update visibility of all targeting visuals
    Object.keys(targets).forEach(position => {
        if (targets[position].trajectory) {
            const shouldBeVisible = targetingVisualsActive && pvpModeActive;
            targets[position].trajectory.visible = shouldBeVisible;
            console.log(`🚢 PVP: Setting ${position} trajectory visibility: ${shouldBeVisible}`);
        }
    });

    return targetingVisualsActive;
}

// Toggle PvP mode on/off
export function togglePvPMode(active = null) {
    const previousValue = pvpModeActive;

    if (active === null) {
        pvpModeActive = !pvpModeActive;
    } else {
        pvpModeActive = active;
    }

    console.log(`🚢 PVP: PvP mode ${previousValue ? "ON" : "OFF"} -> ${pvpModeActive ? "ON" : "OFF"}`);

    // If turning off PvP mode, hide all trajectories
    if (!pvpModeActive) {
        Object.keys(targets).forEach(position => {
            if (targets[position].trajectory) {
                targets[position].trajectory.visible = false;
                console.log(`🚢 PVP: Hiding ${position} trajectory (PvP mode off)`);
            }
        });
    } else {
        console.log(`🚢 PVP: PvP targeting ACTIVATED - searching for enemy players`);
    }

    return pvpModeActive;
}

// Check if PvP mode is active
export function isPvPModeActive() {
    return pvpModeActive;
}

// Get current targeting data for all cannons
export function getTargets() {
    return targets;
}

// Check if a player is properly targeted by any cannon
export function isPlayerEffectivelyTargeted(player) {
    if (!player || !targets || !pvpModeActive) {
        console.log(`🚢 PVP: Effective targeting check skipped - invalid player, targets, or PvP inactive`);
        return false;
    }

    console.log(`🚢 PVP: Checking if ${player.name} is effectively targeted`);

    // Track which cannons are targeting this player effectively
    const effectivelyTargeted = {};
    let anyCannonTargeting = false;

    // Check each cannon position
    Object.keys(targets).forEach(position => {
        const targetData = targets[position];

        // Check if this cannon is targeting this specific player
        if (targetData.currentTarget && targetData.currentTarget.name === player.name) {
            console.log(`🚢 PVP: ${position} is targeting ${player.name}`);

            // Get cannon position in world space
            const cannonConfig = cannonPositions[position];
            const cannonWorldPosition = new THREE.Vector3(
                cannonConfig.xOffset,
                1.5, // Height above deck
                cannonConfig.zOffset
            );
            cannonWorldPosition.applyMatrix4(boat.matrixWorld);

            // Get direction to player
            const playerPosition = new THREE.Vector3(
                player.position.x,
                player.position.y,
                player.position.z
            );

            const toPlayer = new THREE.Vector3()
                .subVectors(playerPosition, cannonWorldPosition)
                .normalize();

            // Check how closely the aim direction aligns with the direction to player
            const aimAlignment = targetData.aimDirection.dot(toPlayer);

            // Consider it effectively targeted if alignment is above 0.9 (within ~25 degrees)
            effectivelyTargeted[position] = (aimAlignment > 0.9);
            console.log(`🚢 PVP: ${position} alignment: ${aimAlignment.toFixed(2)}, effective: ${effectivelyTargeted[position]}`);

            if (effectivelyTargeted[position]) {
                anyCannonTargeting = true;
            }
        }
    });

    const targetingQuality = getTargetingQualityForPlayer(player);
    console.log(`🚢 PVP: ${player.name} targeting summary - any cannon: ${anyCannonTargeting}, quality: ${targetingQuality.toFixed(2)}`);

    return {
        anyCannonTargeting,
        effectivelyTargeted,
        targetingQuality
    };
}

// Helper function to determine overall targeting quality for a player (0-1)
function getTargetingQualityForPlayer(player) {
    if (!player || !targets || !pvpModeActive) return 0;

    let bestAlignment = 0;

    // Check each cannon position
    Object.keys(targets).forEach(position => {
        const targetData = targets[position];

        // Check if this cannon is targeting this specific player
        if (targetData.currentTarget && targetData.currentTarget.name === player.name) {
            // Get cannon position in world space
            const cannonConfig = cannonPositions[position];
            const cannonWorldPosition = new THREE.Vector3(
                cannonConfig.xOffset,
                1.5, // Height above deck
                cannonConfig.zOffset
            );
            cannonWorldPosition.applyMatrix4(boat.matrixWorld);

            // Get direction to player
            const playerPosition = new THREE.Vector3(
                player.position.x,
                player.position.y,
                player.position.z
            );

            const toPlayer = new THREE.Vector3()
                .subVectors(playerPosition, cannonWorldPosition)
                .normalize();

            // Calculate alignment (dot product)
            const aimAlignment = targetData.aimDirection.dot(toPlayer);

            // Track best alignment across all cannons
            bestAlignment = Math.max(bestAlignment, aimAlignment);
        }
    });

    // Scale to a quality factor (0 to 1)
    return Math.max(0, (bestAlignment - 0.7) / 0.3);
}

// Check if a player is targeted with a green line
export function isPlayerTargetedWithGreenLine(player) {
    if (!player || !targets || !pvpModeActive) return false;

    // Check each cannon position
    for (const position of Object.keys(targets)) {
        const targetData = targets[position];

        // Check if this cannon is targeting this specific player and the line is visible
        if (targetData.currentTarget &&
            targetData.currentTarget.name === player.name &&
            targetData.trajectory &&
            targetData.trajectory.visible) {

            // Check if the trajectory color is green (in range) or yellow (optimal)
            const materialColor = targetData.trajectory.material.color.getHex();
            const isGreenLine = materialColor === PVP_TARGETING_CONFIG.COLOR_IN_RANGE;
            const isYellowLine = materialColor === PVP_TARGETING_CONFIG.COLOR_OPTIMAL;

            if (isGreenLine || isYellowLine) {
                return true; // This player is targeted with a green/yellow line
            }
        }
    }

    return false; // No green targeting line found for this player
}

// Add this function to create visual markers for cannon positions during debugging
function createCannonPositionMarker(position, name) {
    // Remove existing marker if any
    if (window.cannonMarkers && window.cannonMarkers[name]) {
        scene.remove(window.cannonMarkers[name]);
    }

    // Initialize markers object if needed
    if (!window.cannonMarkers) {
        window.cannonMarkers = {};
    }

    // Create a small sphere to mark the cannon position
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    scene.add(marker);

    // Store reference to remove later
    window.cannonMarkers[name] = marker;

    // Add text label if possible
    if (window.createLabel) {
        const label = window.createLabel(name, position, { fontSize: 0.5, color: '#ffffff' });
        scene.add(label);
        window.cannonMarkers[name + '_label'] = label;
    }

    console.log(`🚢 PVP: Created position marker for ${name} at`, position.clone());
}

// Add this function to diagnose trajectory appearance
export function debugTrajectoryAppearance() {
    console.log(`🚢 PVP: DEBUG TRAJECTORIES START ---------`);

    Object.keys(targets).forEach(position => {
        const targetData = targets[position];
        if (targetData.trajectory) {
            console.log(`🚢 PVP: ${position} trajectory:`, {
                visible: targetData.trajectory.visible,
                position: targetData.trajectory.position.clone(),
                rotation: targetData.trajectory.rotation.clone(),
                scale: targetData.trajectory.scale.clone(),
                color: targetData.trajectory.material.color.getHex().toString(16)
            });

            // Check parent
            console.log(`🚢 PVP: ${position} trajectory parent:`,
                targetData.trajectory.parent ? targetData.trajectory.parent.type : "none");

            // Check if geometry is valid
            const geometry = targetData.trajectory.geometry;
            console.log(`🚢 PVP: ${position} geometry valid:`,
                geometry && geometry.attributes && geometry.attributes.position ? "YES" : "NO");
        } else {
            console.log(`🚢 PVP: ${position} trajectory not created`);
        }
    });

    console.log(`🚢 PVP: DEBUG TRAJECTORIES END ---------`);
    return true;
}

// Add this to the exported functions
export function toggleDebugCannonPositions(active = null) {
    if (active === null) {
        window.DEBUG_CANNON_POSITIONS = !window.DEBUG_CANNON_POSITIONS;
    } else {
        window.DEBUG_CANNON_POSITIONS = active;
    }

    console.log(`🚢 PVP: Debug cannon positions: ${window.DEBUG_CANNON_POSITIONS}`);

    // If turning off, remove existing markers
    if (!window.DEBUG_CANNON_POSITIONS && window.cannonMarkers) {
        Object.keys(window.cannonMarkers).forEach(key => {
            if (window.cannonMarkers[key]) {
                scene.remove(window.cannonMarkers[key]);
            }
        });
        window.cannonMarkers = {};
    }

    return window.DEBUG_CANNON_POSITIONS;
}

// Add this to your exports
export function toggleVerbosePositionLogging(enabled = null) {
    if (enabled === null) {
        VERBOSE_PLAYER_POSITION_LOGGING = !VERBOSE_PLAYER_POSITION_LOGGING;
    } else {
        VERBOSE_PLAYER_POSITION_LOGGING = enabled;
    }
    console.log(`🚢 PVP: Verbose position logging ${VERBOSE_PLAYER_POSITION_LOGGING ? "ENABLED" : "DISABLED"}`);
    return VERBOSE_PLAYER_POSITION_LOGGING;
} 