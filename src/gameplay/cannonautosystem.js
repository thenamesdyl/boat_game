import * as THREE from 'three';
import { scene, getTime } from '../core/gameState.js';

const TARGETING_CONFIG = {
    // Targeting behavior
    TRACKING_SPEED: 0.6,            // How quickly cannons track targets (0-1, higher = faster)
    MAX_PREDICTION: 2.0,            // Maximum seconds to predict target movement
    CONVERGENCE_DISTANCE: 50,       // Distance at which cannons aim precisely at target
    TARGET_PERSISTENCE: 1.0,        // How long to keep targeting after losing sight (seconds)

    // Visual appearance
    AIM_LINE_LENGTH: 75,            // Length of targeting lines
    LINE_SEGMENTS: 30,              // Number of segments in trajectory line
    ARC_HEIGHT: 15,                 // Height of the parabolic arc
    LINE_WIDTH: 1000,               // Width of the trajectory line

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
        trajectory: null,
        lastTargetTime: 0,          // Track when we last had a valid target
        lastMonsterY: null,        // Track last monster Y position
        targetDistance: null        // Track actual distance to target
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

    // Create parabolic trajectory points - using a default length initially
    // (the actual length will be set in updateTrajectory)
    const defaultLength = TARGETING_CONFIG.AIM_LINE_LENGTH;
    const points = [];
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i <= TARGETING_CONFIG.LINE_SEGMENTS; i++) {
        const t = i / TARGETING_CONFIG.LINE_SEGMENTS;

        // Parabolic arc with POSITIVE Z direction
        const x = 0;
        const y = 4 * TARGETING_CONFIG.ARC_HEIGHT * t * (1 - t);
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
    let activelyTargeting = false; // Flag to track if this cannon is actively targeting

    // First, check if we should show any targeting at all
    let surfaceMonsterExists = false;

    // Get current time for target persistence
    const currentTime = getTime();

    // Update targeting state
    const targetData = targets[position];

    for (const monster of monsters) {
        // Check for monsters at the surface
        // Use looser constraint if we were already tracking this monster
        const wasTrackingThisMonster = targetData.currentTarget === monster;

        // Normal surface check, but with hysteresis for already-tracked monsters
        const normalSurfaceCheck = (monster.state === 'attacking' || monster.state === 'surfacing') &&
            ((wasTrackingThisMonster && monster.mesh.position.y >= -2) || // More lenient if already tracking
                (!wasTrackingThisMonster && monster.mesh.position.y >= 0));  // Stricter for new targets

        const isAtSurface = normalSurfaceCheck;

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
                    activelyTargeting = true; // This cannon is now targeting a monster

                    // Remember last monster Y position for smooth transitions
                    targetData.lastMonsterY = monster.mesh.position.y;

                    // Update the last target time
                    targetData.lastTargetTime = currentTime;

                    // Store the actual distance to target for trajectory calculation
                    targetData.targetDistance = distance;

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

    // Check for target persistence - keep targeting for a short while after losing sight
    const timeSinceLastTarget = currentTime - targetData.lastTargetTime;

    // Continue targeting if we recently had a valid target
    if (!activelyTargeting && timeSinceLastTarget < TARGETING_CONFIG.TARGET_PERSISTENCE && targetData.currentTarget) {
        // Use the last known target but with decaying influence
        closestMonster = targetData.currentTarget;
        activelyTargeting = true;
    }

    // If no surface monsters exist or this cannon isn't targeting, hide trajectory and return to default position
    if (!surfaceMonsterExists && !activelyTargeting) {
        // Only reset targeting if we've truly lost track
        if (timeSinceLastTarget > TARGETING_CONFIG.TARGET_PERSISTENCE) {
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
    if (closestMonster) {
        // Target acquired!
        targetData.currentTarget = closestMonster;

        // Get monster position and velocity, ensuring we target the water-level point
        const monsterPosition = closestMonster.mesh.position.clone();

        // Adjust Y to water level for better targeting (cannons should aim at body, not above)
        // Use the higher of actual position or 0 (water level)
        monsterPosition.y = Math.max(0, monsterPosition.y);

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

        // Calculate and store the distance to the predicted position
        targetData.targetDistance = cannonWorldPosition.distanceTo(predictedPosition);

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

        // Update trajectory if this cannon is actively targeting and the visual should be shown
        if (targetData.trajectory && targetingVisualsActive && activelyTargeting) {
            // Show targeting trajectory only if this cannon is actively targeting
            targetData.trajectory.visible = true;

            // Position at cannon
            targetData.trajectory.position.copy(cannonWorldPosition);

            // Orient in aim direction
            const lookTarget = new THREE.Vector3()
                .addVectors(cannonWorldPosition, targetData.aimDirection);
            targetData.trajectory.lookAt(lookTarget);

            // Update trajectory with parabolic arc using actual distance
            updateTrajectory(position, inOptimalPosition);
        }
    } else {
        // No valid target but we might still be in persistence mode
        if (timeSinceLastTarget > TARGETING_CONFIG.TARGET_PERSISTENCE) {
            // Truly no target, reset everything
            targetData.currentTarget = null;
            targetData.targetDistance = null;
            targetData.aimDirection.lerp(defaultAimDirection, 0.1 * deltaTime * 60);

            if (targetData.trajectory) {
                targetData.trajectory.visible = false;
            }
        }
    }
}

// Update the trajectory for a specific cannon
function updateTrajectory(position, isOptimal) {
    const targetData = targets[position];
    if (!targetData.trajectory) return;

    // Use the actual distance to target, or fall back to default length
    const trajectoryLength = targetData.targetDistance || TARGETING_CONFIG.AIM_LINE_LENGTH;

    // Scale arc height based on distance - closer targets need lower arcs
    // This makes the trajectory more realistic
    const baseArcHeight = TARGETING_CONFIG.ARC_HEIGHT;
    const arcHeightScale = Math.min(1, trajectoryLength / 50); // Scale down for close targets
    const arcHeight = baseArcHeight * arcHeightScale;

    // Check if we're using the ribbon approach
    if (targetData.useRibbon) {
        // Update ribbon vertices to match target distance
        const ribbonWidth = 0.5;
        const positions = targetData.trajectory.geometry.getAttribute('position');

        for (let i = 0; i <= TARGETING_CONFIG.LINE_SEGMENTS; i++) {
            const t = i / TARGETING_CONFIG.LINE_SEGMENTS;

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
    // Create parabolic trajectory points with dynamic length
    const points = [];
    for (let i = 0; i <= TARGETING_CONFIG.LINE_SEGMENTS; i++) {
        const t = i / TARGETING_CONFIG.LINE_SEGMENTS;

        // Parabolic arc with dynamic length
        const x = 0;
        const y = 4 * arcHeight * t * (1 - t); // Scaled arc height
        const z = t * trajectoryLength; // Use actual distance

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

// Add this function to check if a monster is properly targeted by any cannon
export function isMonsterEffectivelyTargeted(monster) {
    if (!monster || !targets) return false;

    // Track which cannons are targeting this monster effectively
    const effectivelyTargeted = {};
    let anyCannonTargeting = false;

    // Check each cannon position
    Object.keys(targets).forEach(position => {
        const targetData = targets[position];

        // Check if this cannon is targeting this specific monster
        if (targetData.currentTarget === monster) {
            // Calculate how well the cannon is aimed at the monster
            // Get cannon position in world space
            const cannonConfig = cannonPositions[position];
            const cannonWorldPosition = new THREE.Vector3(
                cannonConfig.xOffset,
                1.5, // Height above deck
                cannonConfig.zOffset
            );
            cannonWorldPosition.applyMatrix4(boat.matrixWorld);

            // Get direction to monster
            const toMonster = new THREE.Vector3()
                .subVectors(monster.mesh.position, cannonWorldPosition)
                .normalize();

            // Check how closely the aim direction aligns with the direction to monster
            // Perfect alignment would be 1, opposite would be -1
            const aimAlignment = targetData.aimDirection.dot(toMonster);

            // Consider it effectively targeted if alignment is above 0.9 (within ~25 degrees)
            effectivelyTargeted[position] = (aimAlignment > 0.9);

            if (effectivelyTargeted[position]) {
                anyCannonTargeting = true;
            }
        }
    });

    return {
        anyCannonTargeting,            // Is at least one cannon properly aimed?
        effectivelyTargeted,           // Details on which cannons are targeting
        targetingQuality: getTargetingQualityForMonster(monster) // Get overall targeting quality
    };
}

// Helper function to determine overall targeting quality for a monster (0-1)
function getTargetingQualityForMonster(monster) {
    if (!monster || !targets) return 0;

    let bestAlignment = 0;

    // Check each cannon position
    Object.keys(targets).forEach(position => {
        const targetData = targets[position];

        // Check if this cannon is targeting this specific monster
        if (targetData.currentTarget === monster) {
            // Get cannon position in world space
            const cannonConfig = cannonPositions[position];
            const cannonWorldPosition = new THREE.Vector3(
                cannonConfig.xOffset,
                1.5, // Height above deck
                cannonConfig.zOffset
            );
            cannonWorldPosition.applyMatrix4(boat.matrixWorld);

            // Get direction to monster
            const toMonster = new THREE.Vector3()
                .subVectors(monster.mesh.position, cannonWorldPosition)
                .normalize();

            // Calculate alignment (dot product)
            const aimAlignment = targetData.aimDirection.dot(toMonster);

            // Track best alignment across all cannons
            bestAlignment = Math.max(bestAlignment, aimAlignment);
        }
    });

    // Scale to a quality factor (0 to 1)
    // 0.7 is about 45 degrees off, 1.0 is perfect alignment
    return Math.max(0, (bestAlignment - 0.7) / 0.3);
} 