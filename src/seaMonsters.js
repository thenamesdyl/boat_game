import * as THREE from 'three';
import { scene, getTime } from './gameState.js';

// Sea monster configuration
const MONSTER_COUNT = 20;
const MONSTER_SPEED = 0.3;
const MONSTER_DETECTION_RANGE = 200;
const MONSTER_ATTACK_RANGE = 50;
const MONSTER_DEPTH = -20;
const MONSTER_SURFACE_TIME = 10; // seconds monster stays on surface
const MONSTER_DIVE_TIME = 30; // seconds monster stays underwater before considering resurfacing

// Monster states
const MONSTER_STATE = {
    LURKING: 'lurking',    // Deep underwater, moving randomly
    HUNTING: 'hunting',    // Detected player, moving toward them underwater
    SURFACING: 'surfacing', // Moving upward to surface
    ATTACKING: 'attacking', // On surface, actively pursuing player
    DIVING: 'diving',       // Returning to depth
    DYING: 'dying'         // Monster is dying
};

// Monster state
let monsters = [];
let playerBoat = null;

export function setupSeaMonsters(boat) {
    try {
        playerBoat = boat;

        // Create monster geometry
        const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
        bodyGeometry.rotateX(-Math.PI / 2); // Point forward

        // Create tentacle geometry
        const tentacleGeometry = new THREE.CylinderGeometry(1, 0.2, 15, 8);

        // Create fin geometry - larger and more prominent
        const finGeometry = new THREE.BoxGeometry(12, 1, 8);
        finGeometry.translate(0, 5, 0); // Move up so it sticks out of water

        // Create monsters
        for (let i = 0; i < MONSTER_COUNT; i++) {
            // Create monster group
            const monster = new THREE.Group();

            // Create body with bright yellow color
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: 0xffff00, // Bright yellow
                specular: 0xffffaa,
                shininess: 50
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            monster.add(body);

            // Create eyes - red for contrast with yellow body
            const eyeGeometry = new THREE.SphereGeometry(1, 8, 8);
            const eyeMaterial = new THREE.MeshPhongMaterial({
                color: 0xff0000,
                emissive: 0xaa0000
            });

            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-2, 2, -8);
            monster.add(leftEye);

            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(2, 2, -8);
            monster.add(rightEye);

            // Create tentacles - also yellow
            const tentacleMaterial = new THREE.MeshPhongMaterial({
                color: 0xffff00, // Bright yellow
                specular: 0xffffaa,
                shininess: 30
            });

            const tentaclePositions = [
                [-3, -2, 5],
                [3, -2, 5],
                [-5, -2, 0],
                [5, -2, 0],
                [-3, -2, -5],
                [3, -2, -5]
            ];

            const tentacles = [];

            tentaclePositions.forEach((pos, index) => {
                const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
                tentacle.position.set(pos[0], pos[1], pos[2]);

                // Rotate tentacles to hang down
                tentacle.rotation.x = Math.PI / 2;

                // Add some random rotation
                tentacle.rotation.z = Math.random() * Math.PI * 2;

                monster.add(tentacle);
                tentacles.push(tentacle);
            });

            // Add prominent dorsal fin that sticks out of water
            const finMaterial = new THREE.MeshPhongMaterial({
                color: 0xffff00, // Bright yellow
                specular: 0xffffaa,
                shininess: 50
            });

            const dorsalFin = new THREE.Mesh(finGeometry, finMaterial);
            dorsalFin.position.set(0, 8, 0); // Position high on the monster
            dorsalFin.rotation.y = Math.PI / 2; // Orient correctly
            monster.add(dorsalFin);

            // Add side fins that also stick out
            const leftFin = new THREE.Mesh(finGeometry, finMaterial);
            leftFin.position.set(-6, 2, 0);
            leftFin.rotation.z = Math.PI / 4; // Angle outward
            leftFin.scale.set(0.7, 0.7, 0.7); // Slightly smaller
            monster.add(leftFin);

            const rightFin = new THREE.Mesh(finGeometry, finMaterial);
            rightFin.position.set(6, 2, 0);
            rightFin.rotation.z = -Math.PI / 4; // Angle outward
            rightFin.scale.set(0.7, 0.7, 0.7); // Slightly smaller
            monster.add(rightFin);

            // Position monster randomly around the player, but above water to start
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = 200 + Math.random() * 800; // Closer to player

            monster.position.set(
                Math.cos(randomAngle) * randomRadius,
                5, // Start above water
                Math.sin(randomAngle) * randomRadius
            );

            // Set random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * MONSTER_SPEED,
                0,
                (Math.random() - 0.5) * MONSTER_SPEED
            );

            // Add monster to scene
            scene.add(monster);

            // Store monster data - start in ATTACKING state so they're visible
            monsters.push({
                mesh: monster,
                velocity: velocity,
                tentacles: tentacles,
                dorsalFin: dorsalFin,
                leftFin: leftFin,
                rightFin: rightFin,
                state: MONSTER_STATE.ATTACKING, // Start in attacking state
                stateTimer: MONSTER_SURFACE_TIME + Math.random() * 20, // Stay visible longer
                targetPosition: new THREE.Vector3(),
                eyeGlow: 0
            });
        }

        return monsters;
    } catch (error) {
        console.error("Error in setupSeaMonsters:", error);
        return [];
    }
}

export function updateSeaMonsters(deltaTime) {
    try {
        if (!deltaTime || isNaN(deltaTime)) {
            deltaTime = 0.016; // Default to ~60fps
        }

        if (!playerBoat) return;

        monsters.forEach((monster, index) => {
            // Update state timer
            monster.stateTimer -= deltaTime;

            // Update monster based on current state
            switch (monster.state) {
                case MONSTER_STATE.LURKING:
                    updateLurkingMonster(monster, deltaTime);
                    break;
                case MONSTER_STATE.HUNTING:
                    updateHuntingMonster(monster, deltaTime);
                    break;
                case MONSTER_STATE.SURFACING:
                    updateSurfacingMonster(monster, deltaTime);
                    break;
                case MONSTER_STATE.ATTACKING:
                    updateAttackingMonster(monster, deltaTime);
                    break;
                case MONSTER_STATE.DIVING:
                    updateDivingMonster(monster, deltaTime);
                    break;
                case MONSTER_STATE.DYING:
                    updateDyingMonster(monster, deltaTime);
                    break;
            }

            // Apply velocity to position
            monster.mesh.position.add(monster.velocity);

            // Make monster face direction of travel
            if (monster.velocity.length() > 0.01) {
                const lookTarget = monster.mesh.position.clone().add(monster.velocity);
                monster.mesh.lookAt(lookTarget);
            }

            // Animate tentacles
            animateTentacles(monster, deltaTime);

            // Ensure monster stays within world bounds
            keepMonsterInWorld(monster);

            // Make fins always visible above water when surfacing or attacking
            if (monster.state === MONSTER_STATE.SURFACING || monster.state === MONSTER_STATE.ATTACKING) {
                // Ensure dorsal fin sticks out of water
                const waterLevel = 0;
                const minFinHeight = waterLevel + 3; // Minimum height above water

                // Calculate how much of the monster is above water
                const monsterTopPosition = monster.mesh.position.y + 5;

                // Adjust fin visibility based on monster position
                if (monsterTopPosition < waterLevel) {
                    // Only fins should be visible
                    monster.dorsalFin.visible = true;
                    monster.leftFin.visible = true;
                    monster.rightFin.visible = true;

                    // Make fins stick out of water even when monster is below
                    const finOffset = Math.max(0, waterLevel - monsterTopPosition + 3);
                    monster.dorsalFin.position.y = 8 + finOffset;
                    monster.leftFin.position.y = 2 + finOffset;
                    monster.rightFin.position.y = 2 + finOffset;
                } else {
                    // Monster is partially above water, reset fin positions
                    monster.dorsalFin.position.y = 8;
                    monster.leftFin.position.y = 2;
                    monster.rightFin.position.y = 2;
                }
            }
        });
    } catch (error) {
        console.error("Error in updateSeaMonsters:", error);
    }
}

function updateLurkingMonster(monster, deltaTime) {
    // Random wandering movement underwater
    if (Math.random() < 0.01) {
        monster.velocity.x = (Math.random() - 0.5) * MONSTER_SPEED;
        monster.velocity.z = (Math.random() - 0.5) * MONSTER_SPEED;
    }

    // Check if player is in detection range
    const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);
    if (distanceToPlayer < MONSTER_DETECTION_RANGE) {
        // 20% chance to start hunting when player is detected
        if (Math.random() < 0.2) {
            monster.state = MONSTER_STATE.HUNTING;
            monster.stateTimer = 10; // Hunt for 10 seconds before deciding to surface
            monster.eyeGlow = 1; // Make eyes glow when hunting
        }
    }

    // Occasionally consider surfacing even without player
    if (monster.stateTimer <= 0 && Math.random() < 0.005) {
        monster.state = MONSTER_STATE.SURFACING;
        monster.stateTimer = 5; // Time to reach surface
    }
}

function updateHuntingMonster(monster, deltaTime) {
    // Move toward player underwater
    const directionToPlayer = new THREE.Vector3()
        .subVectors(playerBoat.position, monster.mesh.position)
        .normalize();

    // Keep at depth while hunting
    directionToPlayer.y = 0;

    // Set velocity toward player
    monster.velocity.copy(directionToPlayer.multiplyScalar(MONSTER_SPEED * 1.5));

    // Check if close enough to attack
    const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);
    if (distanceToPlayer < MONSTER_ATTACK_RANGE) {
        monster.state = MONSTER_STATE.SURFACING;
        monster.stateTimer = 3; // Faster surfacing when attacking
    }

    // If hunting timer expires, decide whether to surface or return to lurking
    if (monster.stateTimer <= 0) {
        if (distanceToPlayer < MONSTER_ATTACK_RANGE * 2 && Math.random() < 0.7) {
            // Close enough, surface to attack
            monster.state = MONSTER_STATE.SURFACING;
            monster.stateTimer = 3;
        } else {
            // Return to lurking
            monster.state = MONSTER_STATE.LURKING;
            monster.stateTimer = MONSTER_DIVE_TIME / 2;
            monster.eyeGlow = 0; // Reset eye glow
        }
    }
}

function updateSurfacingMonster(monster, deltaTime) {
    // Move upward to surface
    monster.velocity.y = MONSTER_SPEED;

    // Continue moving toward player if in attack range
    const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);
    if (distanceToPlayer < MONSTER_ATTACK_RANGE * 2) {
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerBoat.position, monster.mesh.position)
            .normalize();

        // Keep y component for surfacing, but move toward player on xz plane
        monster.velocity.x = directionToPlayer.x * MONSTER_SPEED;
        monster.velocity.z = directionToPlayer.z * MONSTER_SPEED;
    }

    // Check if reached surface
    if (monster.mesh.position.y >= 0) {
        monster.mesh.position.y = 0; // Clamp to water surface
        monster.state = MONSTER_STATE.ATTACKING;
        monster.stateTimer = MONSTER_SURFACE_TIME;

        // Create splash effect
        createSplashEffect(monster.mesh.position);
    }
}

function updateAttackingMonster(monster, deltaTime) {
    // Aggressively pursue player on surface
    const directionToPlayer = new THREE.Vector3()
        .subVectors(playerBoat.position, monster.mesh.position)
        .normalize();

    // Keep at surface level
    directionToPlayer.y = 0;
    monster.mesh.position.y = Math.sin(getTime() * 0.5) * 0.5; // Bob slightly on surface

    // Set velocity toward player with increased speed
    monster.velocity.x = directionToPlayer.x * MONSTER_SPEED * 2;
    monster.velocity.z = directionToPlayer.z * MONSTER_SPEED * 2;
    monster.velocity.y = 0;

    // If attack time expires or player gets too far, dive
    const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);
    if (monster.stateTimer <= 0 || distanceToPlayer > MONSTER_ATTACK_RANGE * 3) {
        monster.state = MONSTER_STATE.DIVING;
        monster.stateTimer = 5; // Time to dive
    }
}

function updateDivingMonster(monster, deltaTime) {
    // Move downward
    monster.velocity.y = -MONSTER_SPEED;

    // Slow down horizontal movement
    monster.velocity.x *= 0.95;
    monster.velocity.z *= 0.95;

    // Check if reached depth
    if (monster.mesh.position.y <= MONSTER_DEPTH) {
        monster.mesh.position.y = MONSTER_DEPTH; // Clamp to depth
        monster.state = MONSTER_STATE.LURKING;
        monster.stateTimer = MONSTER_DIVE_TIME;
        monster.eyeGlow = 0; // Reset eye glow
    }
}

function updateDyingMonster(monster, deltaTime) {
    // Handle dying animation
    monster.mesh.position.y += monster.velocity.y;
    monster.velocity.y -= 0.01; // Accelerate sinking

    // Rotate as it sinks
    monster.mesh.rotation.x += 0.02;
    monster.mesh.rotation.z += 0.01;

    // Reduce opacity if materials support it
    monster.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.transparent) {
            child.material.opacity = Math.max(0, child.material.opacity - 0.01);
        }
    });

    // Update state timer
    monster.stateTimer -= deltaTime;
    if (monster.stateTimer <= 0) {
        // Monster has completed dying animation
        // It will be removed by the timeout in hitMonster
    }

    return; // Skip other state handling
}

function animateTentacles(monster, deltaTime) {
    // Animate tentacles with sine wave motion
    const time = getTime();

    monster.tentacles.forEach((tentacle, index) => {
        // Different phase for each tentacle
        const phase = index * Math.PI / 3;

        // Faster tentacle movement when attacking
        const speed = monster.state === MONSTER_STATE.ATTACKING ? 5 : 2;

        // Calculate rotation based on sine wave
        const rotationAmount = Math.sin(time * speed + phase) * 0.2;

        // Apply rotation
        tentacle.rotation.z = Math.PI / 2 + rotationAmount;

        // Additional x-rotation for more dynamic movement
        tentacle.rotation.x = Math.PI / 2 + Math.sin(time * speed * 0.7 + phase) * 0.15;
    });

    // Update eye glow if hunting or attacking
    if (monster.state === MONSTER_STATE.HUNTING || monster.state === MONSTER_STATE.ATTACKING) {
        // Pulse the emissive intensity
        const eyeIntensity = 0.4 + Math.sin(time * 5) * 0.2;
        monster.mesh.children[1].material.emissive.setScalar(eyeIntensity); // Left eye
        monster.mesh.children[2].material.emissive.setScalar(eyeIntensity); // Right eye
    }
}

function createSplashEffect(position) {
    // Create a simple splash effect with particles
    const splashGeometry = new THREE.SphereGeometry(0.5, 4, 4);
    const splashMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff });

    for (let i = 0; i < 20; i++) {
        const splash = new THREE.Mesh(splashGeometry, splashMaterial);
        splash.position.copy(position);

        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 2
        );

        scene.add(splash);

        // Animate and remove splash particles
        const startTime = getTime();

        function animateSplash() {
            const elapsedTime = (getTime() - startTime) / 1000;

            if (elapsedTime > 1) {
                scene.remove(splash);
                return;
            }

            // Apply gravity
            velocity.y -= 0.1;

            // Move splash
            splash.position.add(velocity);

            // Fade out
            splash.material.opacity = 1 - elapsedTime;

            requestAnimationFrame(animateSplash);
        }

        animateSplash();
    }
}

function keepMonsterInWorld(monster) {
    // Get distance from center
    const distanceFromCenter = new THREE.Vector2(
        monster.mesh.position.x,
        monster.mesh.position.z
    ).length();

    // If monster is too far from center, add force toward center
    if (distanceFromCenter > 5000) {
        const towardCenter = new THREE.Vector3(
            -monster.mesh.position.x,
            0,
            -monster.mesh.position.z
        ).normalize().multiplyScalar(0.05);

        monster.velocity.add(towardCenter);
    }
}

// Export monsters array for other modules
export function getMonsters() {
    return monsters;
} 