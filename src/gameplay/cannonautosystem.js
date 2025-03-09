import * as THREE from 'three';
import { scene, getTime } from '../core/gameState.js';

// Configuration for the targeting system
const TARGETING_CONFIG = {
    // Targeting behavior
    TRACKING_SPEED: 0.6,            // How quickly cannons track targets (0-1, higher = faster)
    MAX_PREDICTION: 2.0,            // Maximum seconds to predict target movement
    CONVERGENCE_DISTANCE: 50,       // Distance at which cannons aim precisely at target

    // Visual appearance
    AIM_LINE_LENGTH: 75,            // Length of targeting lines
    LINE_SEGMENTS: 30,              // Number of segments in trajectory line
    ARC_HEIGHT: 15,                 // Height of the parabolic arc
    LINE_WIDTH: 1000,                  // Width of the trajectory line

    // Colors
    COLOR_OUT_OF_RANGE: 0xff3333,   // Red when target is out of range
    COLOR_IN_RANGE: 0x33ff33,       // Green when target is in range
    COLOR_OPTIMAL: 0xffff33,        // Yellow when in optimal firing position
};

// Main system state
let boat = null;
let monsters = [];
let cannonRange = 100;
let targetingVisualsActive = true;

// Cannon positions - now with 4 cannons (2 per side)
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
        trajectory: null
    };
});

// Initialize the auto-targeting system
export function initCannonTargetingSystem(playerBoat, seaMonsters, cannons, range) {
    boat = playerBoat;
    monsters = seaMonsters;
    cannonRange = range || 100;

    // Create initial targeting visuals
    createTargetingVisuals();

    console.log("🎯 Cannon auto-targeting system initialized with parabolic trajectories");

    return {
        updateTargeting,
        toggleTargetingVisuals,
        getTargets
    };
}

// Create visual elements for cannon targeting
function createTargetingVisuals() {
    Object.keys(cannonPositions).forEach(position => {
        createCannonTrajectory(position);
    });
}

// Create trajectory line for a specific cannon
function createCannonTrajectory(position) {
    // Remove existing trajectory if any
    if (targets[position].trajectory) {
        scene.remove(targets[position].trajectory);
    }

    // Create ribbon-like trajectory instead of a line
    // We'll use a strip of triangles (ribbon) that follows the parabola
    const ribbonWidth = 0.5; // Width of the trajectory ribbon

    // Create parabolic trajectory points
    const points = [];
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i <= TARGETING_CONFIG.LINE_SEGMENTS; i++) {
        const t = i / TARGETING_CONFIG.LINE_SEGMENTS;

        // Parabolic arc with POSITIVE Z direction (fix for targeting issue)
        const x = 0;
        const y = 4 * TARGETING_CONFIG.ARC_HEIGHT * t * (1 - t);
        const z = t * TARGETING_CONFIG.AIM_LINE_LENGTH; // CHANGED: Removed negative sign

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

    // Create material for the ribbon
    const ribbonMaterial = new THREE.MeshBasicMaterial({
        color: TARGETING_CONFIG.COLOR_OUT_OF_RANGE,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    // Create the mesh
    const trajectoryRibbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);

    // Hide initially
    trajectoryRibbon.visible = false;

    // Add to scene and store reference
    scene.add(trajectoryRibbon);
    targets[position].trajectory = trajectoryRibbon;
    targets[position].useRibbon = true; // Flag to indicate we're using ribbon now
}

// Update the targeting system
export function updateTargeting(deltaTime) {
    if (!boat || !monsters) return;

    // Update targeting for each cannon
    Object.keys(cannonPositions).forEach(position => {
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

    // Apply boat's transformation to get world position
    cannonWorldPosition.applyMatrix4(boat.matrixWorld);

    // Get default aim direction based on cannon position
    let defaultAimDirection = cannonConfig.defaultDir.clone();
    defaultAimDirection.applyQuaternion(boat.quaternion);
    defaultAimDirection.normalize();

    // Find the closest monster in range for this cannon
    let closestMonster = null;
    let closestDistance = Infinity;
    let inOptimalPosition = false;

    // First, check if we should show any targeting at all
    let surfaceMonsterExists = false;

    for (const monster of monsters) {
        // Enhanced check for monsters at the surface
        // Monsters should be in attacking or surfacing state AND be near water level
        const isAtSurface = (monster.state === 'attacking' || monster.state === 'surfacing') &&
            (monster.mesh.position.y >= -5 && monster.mesh.position.y <= 5);

        if (isAtSurface) {
            surfaceMonsterExists = true;

            const distance = monster.mesh.position.distanceTo(cannonWorldPosition);

            // Check if monster is in range
            if (distance <= cannonRange) {
                // Calculate vector to monster
                const toMonster = new THREE.Vector3()
                    .subVectors(monster.mesh.position, cannonWorldPosition)
                    .normalize();

                // Check if monster is in firing arc for this cannon
                let validArc = false;

                // Define firing arcs based on cannon position
                if (position.includes('left')) {
                    // Left cannons can only target to the left side
                    const leftDirection = new THREE.Vector3(-1, 0, 0).applyQuaternion(boat.quaternion);
                    const leftDot = leftDirection.dot(toMonster);
                    validArc = leftDot > 0.3; // About 70° arc to the left
                } else if (position.includes('right')) {
                    // Right cannons can only target to the right side
                    const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
                    const rightDot = rightDirection.dot(toMonster);
                    validArc = rightDot > 0.3; // About 70° arc to the right
                }

                // Front/rear specialization
                if (validArc) {
                    if (position.includes('Front')) {
                        // Front cannons prefer targets in front
                        const frontDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
                        const frontDot = frontDirection.dot(toMonster);
                        validArc = frontDot > 0;
                    } else if (position.includes('Rear')) {
                        // Rear cannons prefer targets behind
                        const rearDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(boat.quaternion);
                        const rearDot = rearDirection.dot(toMonster);
                        validArc = rearDot > 0;
                    }
                }

                // If in valid arc and closer than previous closest
                if (validArc && distance < closestDistance) {
                    closestMonster = monster;
                    closestDistance = distance;

                    // Check if cannon is in optimal firing position (perpendicular for broadsides)
                    if (position.includes('left') || position.includes('right')) {
                        // For broadsides, optimal is 90° to monster (dot product near 0)
                        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
                        const dotToMonster = shipForward.dot(toMonster);
                        inOptimalPosition = Math.abs(dotToMonster) < 0.3; // Within ~20° of perpendicular
                    }
                }
            }
        }
    }

    // Update targeting state
    const targetData = targets[position];

    // Hide targeting if no surface monsters exist
    if (!surfaceMonsterExists) {
        if (targetData.trajectory) {
            targetData.trajectory.visible = false;
        }
        return;
    }

    // If we have a target, update aiming
    if (closestMonster) {
        // Target acquired!
        targetData.currentTarget = closestMonster;

        // Get monster position and velocity, ensuring we target the water-level point
        const monsterPosition = closestMonster.mesh.position.clone();
        // Adjust Y to water level for better targeting (cannons should aim at body, not above)
        monsterPosition.y = 0;

        const monsterVelocity = closestMonster.velocity ? closestMonster.velocity.clone() : new THREE.Vector3();

        // Adjust prediction based on distance - closer monsters need less prediction
        const predictionScale = Math.min(
            TARGETING_CONFIG.MAX_PREDICTION,
            closestDistance / TARGETING_CONFIG.CONVERGENCE_DISTANCE * TARGETING_CONFIG.MAX_PREDICTION
        );

        // Calculate predicted position but limit the prediction for more accuracy
        const predictedPosition = monsterPosition.clone().add(
            monsterVelocity.clone().multiplyScalar(predictionScale)
        );

        // Debug log monster positions
        if (Math.random() < 0.01) { // Only log occasionally to avoid spam
            console.log(`Monster position: ${monsterPosition.x.toFixed(1)}, ${monsterPosition.y.toFixed(1)}, ${monsterPosition.z.toFixed(1)}`);
            console.log(`Predicted position: ${predictedPosition.x.toFixed(1)}, ${predictedPosition.y.toFixed(1)}, ${predictedPosition.z.toFixed(1)}`);
            console.log(`Cannon position: ${cannonWorldPosition.x.toFixed(1)}, ${cannonWorldPosition.y.toFixed(1)}, ${cannonWorldPosition.z.toFixed(1)}`);
        }

        // Set the aim point as the predicted position
        targetData.aimPoint.copy(predictedPosition);

        // Calculate the ideal aim direction
        const idealAimDirection = new THREE.Vector3()
            .subVectors(predictedPosition, cannonWorldPosition)
            .normalize();

        // Gradually adjust current aim direction toward the ideal direction
        if (!targetData.aimDirection.length()) {
            // First time targeting, initialize with current direction
            targetData.aimDirection.copy(defaultAimDirection);
        }

        // Adjust speed based on distance - slower tracking at greater distances
        const trackingSpeed = TARGETING_CONFIG.TRACKING_SPEED *
            (1 - Math.min(1, (closestDistance / cannonRange) * 0.8));

        // Lerp toward the ideal aim direction
        targetData.aimDirection.lerp(idealAimDirection, trackingSpeed * deltaTime * 60);
        targetData.aimDirection.normalize();

        // Update trajectory if it exists
        if (targetData.trajectory && targetingVisualsActive) {
            // Show targeting trajectory
            targetData.trajectory.visible = true;

            // Position at cannon
            targetData.trajectory.position.copy(cannonWorldPosition);

            // Orient in aim direction
            const lookTarget = new THREE.Vector3()
                .addVectors(cannonWorldPosition, targetData.aimDirection);
            targetData.trajectory.lookAt(lookTarget);

            // Update trajectory with parabolic arc
            updateTrajectory(position, inOptimalPosition);
        }
    } else {
        // No target, return to default direction
        targetData.currentTarget = null;
        targetData.aimDirection.lerp(defaultAimDirection, 0.1 * deltaTime * 60);

        // Hide trajectory or show it pointing in default direction
        if (targetData.trajectory) {
            if (targetingVisualsActive) {
                // Show trajectory pointing in default direction
                targetData.trajectory.visible = true;
                targetData.trajectory.position.copy(cannonWorldPosition);

                const lookTarget = new THREE.Vector3()
                    .addVectors(cannonWorldPosition, defaultAimDirection);
                targetData.trajectory.lookAt(lookTarget);

                // Update trajectory with parabolic arc
                updateTrajectory(position, false);
            } else {
                // Hide trajectory completely
                targetData.trajectory.visible = false;
            }
        }
    }
}

// Update the trajectory for a specific cannon
function updateTrajectory(position, isOptimal) {
    const targetData = targets[position];
    if (!targetData.trajectory) return;

    // Check if we're using the ribbon approach
    if (targetData.useRibbon) {
        // Update color based on target status
        if (targetData.currentTarget) {
            if (isOptimal) {
                targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_OPTIMAL);
            } else {
                targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_IN_RANGE);
            }
        } else {
            targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_OUT_OF_RANGE);
        }
        return;
    }

    // If we get here, it means we're not using the ribbon approach
    // Create parabolic trajectory points with positive Z
    const points = [];
    for (let i = 0; i <= TARGETING_CONFIG.LINE_SEGMENTS; i++) {
        const t = i / TARGETING_CONFIG.LINE_SEGMENTS;

        // Parabolic arc with POSITIVE Z direction (fix for targeting issue)
        const x = 0;
        const y = 4 * TARGETING_CONFIG.ARC_HEIGHT * t * (1 - t);
        const z = t * TARGETING_CONFIG.AIM_LINE_LENGTH; // CHANGED: Removed negative sign

        points.push(new THREE.Vector3(x, y, z));
    }

    // Update geometry
    targetData.trajectory.geometry.setFromPoints(points);
    targetData.trajectory.computeLineDistances();

    // Update color based on target status
    if (targetData.currentTarget) {
        if (isOptimal) {
            targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_OPTIMAL);
        } else {
            targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_IN_RANGE);
        }
    } else {
        targetData.trajectory.material.color.setHex(TARGETING_CONFIG.COLOR_OUT_OF_RANGE);
    }
}

// Toggle visibility of targeting visuals
export function toggleTargetingVisuals(visible = null) {
    if (visible === null) {
        targetingVisualsActive = !targetingVisualsActive;
    } else {
        targetingVisualsActive = visible;
    }

    // Update visibility of all targeting visuals
    Object.keys(targets).forEach(position => {
        if (targets[position].trajectory) {
            targets[position].trajectory.visible = targetingVisualsActive;
        }
    });

    return targetingVisualsActive;
}

// Get current targeting data for all cannons
export function getTargets() {
    return targets;
} 