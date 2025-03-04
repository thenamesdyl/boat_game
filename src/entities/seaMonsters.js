import * as THREE from 'three';
import { scene, getTime, boatVelocity } from '../core/gameState.js';
import { getTimeOfDay } from '../environment/skybox.js'; // Import time of day function
import { flashBoatDamage } from '../entities/character.js'; // Add this import
import { getFishInventory } from '../gameplay/fishing.js'; // Import the fish inventory

// Sea monster configuration
const MONSTER_COUNT = 15;
const MONSTER_TYPES = {
    YELLOW_BEAST: 'yellowBeast',   // Original monster
    KRAKEN: 'kraken',              // New octopus-like monster
    SEA_SERPENT: 'seaSerpent',     // New serpent monster
    PHANTOM_JELLYFISH: 'phantomJellyfish' // New jellyfish monster
};
const MONSTER_TYPE_WEIGHTS = {
    [MONSTER_TYPES.YELLOW_BEAST]: 0.4,    // 40% chance
    [MONSTER_TYPES.KRAKEN]: 0.2,          // 20% chance
    [MONSTER_TYPES.SEA_SERPENT]: 0.2,     // 20% chance 
    [MONSTER_TYPES.PHANTOM_JELLYFISH]: 0.2 // 20% chance
};
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

// Monster treasure drops - each monster type has a specific treasure it drops
const MONSTER_TREASURES = {
    yellowBeast: { name: "Monster Scale", value: 5, color: 0xFFD700, description: "A glimmering scale from a sea beast." },
    blueDevil: { name: "Abyssal Pearl", value: 8, color: 0x00BFFF, description: "A mysterious pearl with swirling blue patterns." },
    greenHorror: { name: "Emerald Fang", value: 12, color: 0x32CD32, description: "A razor-sharp tooth with verdant energy." },
    redTerror: { name: "Crimson Crystal", value: 15, color: 0xFF4500, description: "A blood-red crystal that pulses with heat." }
};

// Monster state
let monsters = [];
let playerBoat = null;
let lastNightSpawn = false; // Track if we've already spawned monsters this night
let lastTimeOfDay = ""; // Track the previous time of day
let treasureDrops = [];
let treasureInventory = {}; // Treasures collected from monsters

// Add a hit cooldown system to prevent constant damage
const HIT_COOLDOWN = 1.5; // Seconds between possible hits
let lastHitTime = -999; // Initialize to negative value to ensure first hit works

export function setupSeaMonsters(boat) {
    try {
        playerBoat = boat;

        // Reset hit cooldown to ensure monsters can hit on first approach
        lastHitTime = -999; // Set to a very negative value to ensure first hit works

        // Create monsters
        for (let i = 0; i < MONSTER_COUNT; i++) {
            // Determine monster type using weighted random selection
            const monsterType = selectRandomMonsterType();

            // Create monster based on type
            switch (monsterType) {
                case MONSTER_TYPES.KRAKEN:
                    createKrakenMonster();
                    break;
                case MONSTER_TYPES.SEA_SERPENT:
                    createSeaSerpentMonster();
                    break;
                case MONSTER_TYPES.PHANTOM_JELLYFISH:
                    createPhantomJellyfishMonster();
                    break;
                case MONSTER_TYPES.YELLOW_BEAST:
                default:
                    createYellowBeastMonster(); // Original monster
                    break;
            }
        }

        return monsters;
    } catch (error) {
        console.error("Error in setupSeaMonsters:", error);
        return [];
    }
}

// Helper function to select random monster type based on weights
export function selectRandomMonsterType() {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const [type, weight] of Object.entries(MONSTER_TYPE_WEIGHTS)) {
        cumulativeWeight += weight;
        if (random < cumulativeWeight) {
            return type;
        }
    }

    // Default to original monster if something goes wrong
    return MONSTER_TYPES.YELLOW_BEAST;
}

export function updateSeaMonsters(deltaTime) {
    try {
        if (!deltaTime || isNaN(deltaTime)) {
            deltaTime = 0.016; // Default to ~60fps
        }

        if (!playerBoat) return;

        // Get current time of day from skybox.js
        const currentTimeOfDay = getTimeOfDay();

        // Check if night has just started (transition from another time to night)
        if (currentTimeOfDay === "Night" && lastTimeOfDay !== "Night") {
            console.log("Night has fallen - preparing to respawn sea monsters");
            respawnMonstersAtNight();
        }

        // Update last time of day
        lastTimeOfDay = currentTimeOfDay;

        // Debug current time and last hit time

        // Update existing monsters
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

            // Apply special behaviors based on monster type
            updateSpecialMonsterBehaviors(monster, deltaTime);

            // Only run default tentacle animation for original yellow monster
            // (other monsters handle their own animations in updateSpecialMonsterBehaviors)
            if (monster.monsterType === MONSTER_TYPES.YELLOW_BEAST) {
                animateTentacles(monster, deltaTime);
            }

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

        // Also update treasure drops
        updateTreasureDrops();
    } catch (error) {
        console.error("Error in updateSeaMonsters:", error);
    }
}

export function updateLurkingMonster(monster, deltaTime) {
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

export function updateHuntingMonster(monster, deltaTime) {
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

export function updateSurfacingMonster(monster, deltaTime) {
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

export function updateAttackingMonster(monster, deltaTime) {
    // Initialize sub-state for attacking if not present
    if (!monster.attackSubState) {
        monster.attackSubState = 'charging';
        monster.chargeTarget = new THREE.Vector3();
        monster.repositionTimer = 0; // Initialize reposition timer
    }

    // Keep at surface level with slight bobbing
    monster.mesh.position.y = Math.sin(getTime() * 0.5) * 0.5;
    monster.velocity.y = 0;

    const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);

    // Check if monster can hit the boat
    const currentTime = getTime() / 1000; // Convert to seconds
    const canHit = currentTime - lastHitTime > HIT_COOLDOWN;

    // Debug monster distance

    if (distanceToPlayer < 15) { // Increased hit range for better detection
        // Monster hit the boat - trigger damage flash
        flashBoatDamage();
        lastHitTime = currentTime;

        // Add some physical impact - push boat slightly
        const hitDirection = new THREE.Vector3()
            .subVectors(playerBoat.position, monster.mesh.position)
            .normalize();

        // Use the imported boatVelocity directly instead of window.boatVelocity
        if (boatVelocity) {
            boatVelocity.add(hitDirection.multiplyScalar(0.5));
        }
    }

    if (monster.attackSubState === 'charging') {
        // Set charge target as player position
        monster.chargeTarget.copy(playerBoat.position);

        // Calculate direction to the charge target
        const directionToTarget = new THREE.Vector3()
            .subVectors(monster.chargeTarget, monster.mesh.position)
            .normalize();

        // Set velocity to charge through player at increased speed
        monster.velocity.x = directionToTarget.x * MONSTER_SPEED * 3;
        monster.velocity.z = directionToTarget.z * MONSTER_SPEED * 3;

        // Check if we've passed the player (dot product becomes negative)
        const toPlayer = new THREE.Vector3().subVectors(playerBoat.position, monster.mesh.position);
        const movingDirection = new THREE.Vector3(monster.velocity.x, 0, monster.velocity.z).normalize();
        const dotProduct = toPlayer.dot(movingDirection);

        // If passed player or gotten very close, switch to repositioning
        if (dotProduct < -5 || distanceToPlayer < 5) {
            monster.attackSubState = 'repositioning';

            // Set a random reposition timer between 5-7 seconds
            monster.repositionTimer = 5 + Math.random() * 2;

            // Calculate a position to swim away to - not too far from player
            const swimAwayDistance = MONSTER_ATTACK_RANGE * 1.5; // Not too far

            // Calculate direction away from player
            const awayFromPlayerDir = new THREE.Vector3()
                .subVectors(monster.mesh.position, playerBoat.position)
                .normalize();

            // Set the target position to swim away to
            monster.chargeTarget.set(
                playerBoat.position.x + awayFromPlayerDir.x * swimAwayDistance,
                0,
                playerBoat.position.z + awayFromPlayerDir.z * swimAwayDistance
            );
        }
    } else { // repositioning
        // Update reposition timer
        monster.repositionTimer -= deltaTime;

        // During repositioning phase
        if (monster.repositionTimer > 0) {
            // Move toward reposition target at moderate speed
            const directionToTarget = new THREE.Vector3()
                .subVectors(monster.chargeTarget, monster.mesh.position)
                .normalize();

            monster.velocity.x = directionToTarget.x * MONSTER_SPEED * 1.2;
            monster.velocity.z = directionToTarget.z * MONSTER_SPEED * 1.2;
        } else {
            // Timer expired, prepare for another charge
            monster.attackSubState = 'charging';
        }
    }

    // If attack time expires or player gets too far, dive
    if (monster.stateTimer <= 0 || distanceToPlayer > MONSTER_ATTACK_RANGE * 3) {
        monster.state = MONSTER_STATE.DIVING;
        monster.stateTimer = 5; // Time to dive
        delete monster.attackSubState; // Clean up attack sub-state
        delete monster.chargeTarget;
        delete monster.repositionTimer;
    }
}

export function updateDivingMonster(monster, deltaTime) {
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

export function updateDyingMonster(monster, deltaTime) {
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

function createYellowBeastMonster() {
    // Create monster group
    const monster = new THREE.Group();

    // Create body with bright yellow color
    const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
    bodyGeometry.rotateX(-Math.PI / 2); // Point forward

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
    const tentacleGeometry = new THREE.CylinderGeometry(1, 0.2, 15, 8);
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
    const finGeometry = new THREE.BoxGeometry(12, 1, 8);
    finGeometry.translate(0, 5, 0); // Move up so it sticks out of water

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

    // Position and configure monster
    setupMonsterPosition(monster, tentacles, dorsalFin, leftFin, rightFin, MONSTER_TYPES.YELLOW_BEAST);
}

function setupMonsterPosition(monster, tentacles, dorsalFin, leftFin, rightFin, monsterType) {
    // Position monster randomly around the player
    const randomAngle = Math.random() * Math.PI * 2;
    const randomRadius = 200 + Math.random() * 800;

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

    // Store monster data
    monsters.push({
        mesh: monster,
        velocity: velocity,
        tentacles: tentacles || [],
        dorsalFin: dorsalFin,
        leftFin: leftFin,
        rightFin: rightFin,
        state: MONSTER_STATE.ATTACKING, // Start in attacking state
        stateTimer: MONSTER_SURFACE_TIME + Math.random() * 20, // Stay visible longer
        targetPosition: new THREE.Vector3(),
        eyeGlow: 0,
        monsterType: monsterType,
        health: getMonsterHealth(monsterType)
    });
}

function getMonsterHealth(monsterType) {
    switch (monsterType) {
        case MONSTER_TYPES.KRAKEN:
            return 6; // Tougher than regular monster
        case MONSTER_TYPES.SEA_SERPENT:
            return 4; // Average toughness
        case MONSTER_TYPES.PHANTOM_JELLYFISH:
            return 3; // Fragile but dangerous
        case MONSTER_TYPES.YELLOW_BEAST:
        default:
            return 3; // Original monster health
    }
}

function createKrakenMonster() {
    // Create monster group
    const monster = new THREE.Group();

    // Create kraken head - using sphere for a bulbous head
    const headGeometry = new THREE.SphereGeometry(8, 16, 16);
    const krakenMaterial = new THREE.MeshPhongMaterial({
        color: 0x800000, // Dark red color
        specular: 0xaa5555,
        shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, krakenMaterial);
    head.scale.set(1, 0.8, 1.3); // Slightly oval shaped
    monster.add(head);

    // Create eyes - large and glowing
    const eyeGeometry = new THREE.SphereGeometry(1.5, 12, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff, // Cyan eyes
        emissive: 0x00aaaa, // Glowing
        shininess: 90
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-3, 2, -4);
    monster.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(3, 2, -4);
    monster.add(rightEye);

    // Create beak/mouth
    const beakGeometry = new THREE.ConeGeometry(3, 6, 8);
    const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000, // Black beak
        shininess: 60
    });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.rotation.x = Math.PI; // Point downward
    beak.position.set(0, 0, -8);
    monster.add(beak);

    // Create many long tentacles
    const tentacleCount = 12; // More tentacles than the original monster
    const tentacles = [];

    // Tentacle geometry - longer and more tapered
    const tentacleGeometry = new THREE.CylinderGeometry(2, 0.2, 30, 8);

    // Different positions for tentacles in a circle
    for (let i = 0; i < tentacleCount; i++) {
        const angle = (i / tentacleCount) * Math.PI * 2;
        const radius = 6;

        const tentacle = new THREE.Mesh(tentacleGeometry, krakenMaterial);

        // Position tentacles in a circle around the bottom of the head
        tentacle.position.set(
            Math.cos(angle) * radius,
            -4,
            Math.sin(angle) * radius + 2
        );

        // Rotate to hang down and outward
        tentacle.rotation.x = Math.PI / 2;
        tentacle.rotation.z = angle;

        monster.add(tentacle);
        tentacles.push(tentacle);
    }

    // Kraken doesn't have fins, but let's add some spikes on top
    const spikeGeometry = new THREE.ConeGeometry(1, 4, 4);
    const spikeMaterial = new THREE.MeshPhongMaterial({
        color: 0x600000, // Darker red
        shininess: 30
    });

    // Create central dorsal spike (replaces fin for fin detection)
    const dorsalSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    dorsalSpike.position.set(0, 8, 0);
    monster.add(dorsalSpike);

    // Add side spikes in place of fins
    const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    leftSpike.position.set(-6, 3, 0);
    leftSpike.rotation.z = -Math.PI / 6;
    monster.add(leftSpike);

    const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    rightSpike.position.set(6, 3, 0);
    rightSpike.rotation.z = Math.PI / 6;
    monster.add(rightSpike);

    // Setup position and add to scene
    setupMonsterPosition(monster, tentacles, dorsalSpike, leftSpike, rightSpike, MONSTER_TYPES.KRAKEN);
}

function createSeaSerpentMonster() {
    // Create monster group
    const monster = new THREE.Group();

    // Create serpent segments - series of connected spheres for a segmented look
    const segmentCount = 7;
    const segmentGeometry = new THREE.SphereGeometry(4, 16, 16);
    const serpentMaterial = new THREE.MeshPhongMaterial({
        color: 0x006400, // Dark green
        specular: 0x88aa88,
        shininess: 70
    });

    // Keep track of segments for animation
    const segments = [];

    // Create body segments
    for (let i = 0; i < segmentCount; i++) {
        const segment = new THREE.Mesh(segmentGeometry, serpentMaterial);
        segment.position.set(0, 0, i * 8); // Spaced out along z-axis
        segment.scale.set(1, 0.8, 1); // Slightly flattened
        monster.add(segment);
        segments.push(segment);
    }

    // Serpent head is the first segment - make it larger
    segments[0].scale.set(1.3, 1, 1.3);

    // Create eyes - yellow with slit pupils
    const eyeGeometry = new THREE.SphereGeometry(1, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00, // Yellow
        emissive: 0x888800
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-2.5, 1, -3);
    monster.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(2.5, 1, -3);
    monster.add(rightEye);

    // Add pupils (black slits)
    const pupilGeometry = new THREE.PlaneGeometry(0.5, 2);
    const pupilMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-2.5, 1, -3.6);
    monster.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(2.5, 1, -3.6);
    monster.add(rightPupil);

    // Create fins - triangular and thin
    const finGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        0, 0, 0,
        0, 10, 0,
        15, 0, 0
    ]);
    finGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    finGeometry.computeVertexNormals();

    const finMaterial = new THREE.MeshPhongMaterial({
        color: 0x008800, // Lighter green
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    // Dorsal fin - tall and prominent
    const dorsalFin = new THREE.Mesh(finGeometry, finMaterial);
    dorsalFin.position.set(0, 3, 16);
    dorsalFin.rotation.y = Math.PI / 2;
    monster.add(dorsalFin);

    // Create side fins
    const leftFin = new THREE.Mesh(finGeometry, finMaterial);
    leftFin.position.set(-4, 0, 16);
    leftFin.rotation.set(0, Math.PI / 2, Math.PI / 5);
    leftFin.scale.set(0.6, 0.6, 0.6);
    monster.add(leftFin);

    const rightFin = new THREE.Mesh(finGeometry, finMaterial);
    rightFin.position.set(4, 0, 16);
    rightFin.rotation.set(0, Math.PI / 2, -Math.PI / 5);
    rightFin.scale.set(0.6, 0.6, 0.6);
    monster.add(rightFin);

    // Create forked tail
    const tailGeometry = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
        0, 0, 0,
        -8, 8, 0,
        -8, -8, 0,
        8, 8, 0,
        8, -8, 0
    ]);
    tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailGeometry.setIndex([0, 1, 2, 0, 3, 4]);
    tailGeometry.computeVertexNormals();

    const tail = new THREE.Mesh(tailGeometry, finMaterial);
    tail.position.set(0, 0, 8 * (segmentCount - 1) + 4);
    tail.rotation.y = Math.PI / 2;
    monster.add(tail);

    // Rotate entire monster to be horizontal
    monster.rotation.x = -Math.PI / 2;

    // Use segments as tentacles for animation system
    setupMonsterPosition(monster, segments, dorsalFin, leftFin, rightFin, MONSTER_TYPES.SEA_SERPENT);
}

function createPhantomJellyfishMonster() {
    // Create monster group
    const monster = new THREE.Group();

    // Create bell (main body) - translucent with bioluminescence
    const bellGeometry = new THREE.SphereGeometry(10, 32, 32);
    bellGeometry.scale(1, 0.6, 1); // Flatten to dome shape

    // Use MeshPhysicalMaterial for translucency effects
    const bellMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x5555ff, // Blue base color
        emissive: 0x0000ff, // Glowing blue
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide
    });

    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    bell.position.y = 5;
    monster.add(bell);

    // Create inner core - brighter glow
    const coreGeometry = new THREE.SphereGeometry(5, 16, 16);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0x8888ff, // Lighter blue
        emissive: 0x0088ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.6
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 5;
    monster.add(core);

    // Create tentacles - many thin, glowing strands
    const tentacleCount = 24;
    const tentacles = [];

    const tentacleMaterial = new THREE.MeshPhongMaterial({
        color: 0x8888ff,
        emissive: 0x0000ff,
        transparent: true,
        opacity: 0.6
    });

    // Create circular arrangement of tentacles
    for (let i = 0; i < tentacleCount; i++) {
        const angle = (i / tentacleCount) * Math.PI * 2;
        const radius = 8;

        // Vary tentacle length and thickness
        const length = 15 + Math.random() * 10;
        const thickness = 0.1 + Math.random() * 0.3;

        const tentacleGeometry = new THREE.CylinderGeometry(thickness, thickness * 0.5, length, 6);
        const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);

        // Position around bottom edge of bell
        tentacle.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );

        // Rotate to hang down
        tentacle.rotation.x = Math.PI / 2;

        monster.add(tentacle);
        tentacles.push(tentacle);
    }

    // Create thicker feeding tentacles
    const feedingTentacleCount = 4;

    for (let i = 0; i < feedingTentacleCount; i++) {
        const angle = (i / feedingTentacleCount) * Math.PI * 2;
        const radius = 4;

        const feedingTentacleGeometry = new THREE.CylinderGeometry(0.6, 0.3, 25, 8);
        const feedingTentacle = new THREE.Mesh(feedingTentacleGeometry, tentacleMaterial);

        // Position near center of bell
        feedingTentacle.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );

        // Rotate to hang down
        feedingTentacle.rotation.x = Math.PI / 2;

        monster.add(feedingTentacle);
        tentacles.push(feedingTentacle);
    }

    // Add detection "eyes" - not visible but needed for system
    // We'll use the bell itself as the "fin" for surface detection

    setupMonsterPosition(monster, tentacles, bell, bell, bell, MONSTER_TYPES.PHANTOM_JELLYFISH);

    // Add pulsating glow animation capability
    monster.userData.pulseTime = Math.random() * Math.PI * 2;
    monster.userData.chargeLevel = 0;
}

// Add special monster update functions based on type
export function updateSpecialMonsterBehaviors(monster, deltaTime) {
    switch (monster.monsterType) {
        case MONSTER_TYPES.KRAKEN:
            updateKrakenBehavior(monster, deltaTime);
            break;
        case MONSTER_TYPES.SEA_SERPENT:
            updateSeaSerpentBehavior(monster, deltaTime);
            break;
        case MONSTER_TYPES.PHANTOM_JELLYFISH:
            updateJellyfishBehavior(monster, deltaTime);
            break;
    }
}

export function updateKrakenBehavior(monster, deltaTime) {
    // Kraken has more aggressive tentacle movement
    const time = getTime();

    if (monster.tentacles && monster.tentacles.length > 0) {
        monster.tentacles.forEach((tentacle, index) => {
            const phase = index * Math.PI / 6;
            const speed = 3;

            // Dramatic waving motion
            tentacle.rotation.x = Math.PI / 2 + Math.sin(time * speed + phase) * 0.5;
            tentacle.rotation.z = Math.sin(time * (speed * 0.7) + phase) * 0.4;
        });
    }

    // Kraken can periodically lunge at player when close enough
    if (monster.state === MONSTER_STATE.ATTACKING) {
        const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);

        if (distanceToPlayer < MONSTER_ATTACK_RANGE * 0.7 && Math.random() < 0.01) {
            // Lunge toward player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(playerBoat.position, monster.mesh.position)
                .normalize();

            monster.velocity.copy(directionToPlayer.multiplyScalar(MONSTER_SPEED * 4));

            // Create splash for dramatic effect
            createSplashEffect(monster.mesh.position.clone());
        }
    }
}

export function updateSeaSerpentBehavior(monster, deltaTime) {
    // Sea serpent has snake-like undulating movement
    const time = getTime();

    // Adjust segments to create undulating motion
    if (monster.tentacles && monster.tentacles.length > 0) {
        monster.tentacles.forEach((segment, index) => {
            // Skip first segment (head)
            if (index === 0) return;

            const waveSpeed = 2;
            const waveAmplitude = 3;
            const wavelength = 4; // Controls how many waves appear along body

            // Sideways serpentine motion
            const xOffset = Math.sin((time * waveSpeed) + (index / wavelength) * Math.PI * 2) * waveAmplitude;

            segment.position.x = xOffset;
        });
    }

    // If attacking, serpent can occasionally do a quick strike
    if (monster.state === MONSTER_STATE.ATTACKING) {
        const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);

        if (distanceToPlayer < MONSTER_ATTACK_RANGE * 1.5 && Math.random() < 0.005) {
            // Quick strike - sudden acceleration toward player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(playerBoat.position, monster.mesh.position)
                .normalize();

            monster.velocity.copy(directionToPlayer.multiplyScalar(MONSTER_SPEED * 5));

            // Create splash effect
            createSplashEffect(monster.mesh.position.clone());
        }
    }
}

export function updateJellyfishBehavior(monster, deltaTime) {
    // Jellyfish pulses and glows
    const time = getTime();

    // Pulsating animation for bell
    const pulseSpeed = 1.5;
    const pulseAmplitude = 0.15;

    // Use userData for storing the pulse time if not already set
    if (!monster.mesh.userData.pulseTime) {
        monster.mesh.userData.pulseTime = Math.random() * Math.PI * 2;
    }

    const scale = 1 + Math.sin(time * pulseSpeed + monster.mesh.userData.pulseTime) * pulseAmplitude;

    // Apply pulsing to bell (first child is bell)
    if (monster.mesh.children[0]) {
        monster.mesh.children[0].scale.set(scale, scale * 0.6, scale);
    }

    // Pulse tentacles slightly out of sync with bell
    if (monster.tentacles && monster.tentacles.length > 0) {
        monster.tentacles.forEach((tentacle, index) => {
            const phase = index * 0.2;
            tentacle.position.y = -1 + Math.sin(time * pulseSpeed + phase) * 0.5;
        });
    }

    // Special attack: charge and discharge electric shock
    if (monster.state === MONSTER_STATE.ATTACKING) {
        // When attacking, gradually charge up
        if (!monster.chargeLevel) monster.chargeLevel = 0;

        const distanceToPlayer = monster.mesh.position.distanceTo(playerBoat.position);

        if (distanceToPlayer < MONSTER_ATTACK_RANGE) {
            // Charge up faster when closer to player
            monster.chargeLevel += deltaTime * 0.2;

            // Increase glow based on charge level
            if (monster.mesh.children[0] && monster.mesh.children[0].material) {
                // Adjust bell glow
                monster.mesh.children[0].material.emissiveIntensity = 0.5 + monster.chargeLevel * 0.5;

                // Core glow (second child)
                if (monster.mesh.children[1] && monster.mesh.children[1].material) {
                    monster.mesh.children[1].material.emissiveIntensity = 0.8 + monster.chargeLevel * 0.7;
                }

                // Change color toward electric blue as it charges
                const hue = 0.6 + monster.chargeLevel * 0.1; // Shift toward cyan
                monster.mesh.children[0].material.color.setHSL(hue, 0.8, 0.5);

                // When fully charged, discharge!
                if (monster.chargeLevel >= 1) {
                    // Create electric discharge effect
                    createElectricDischargeEffect(monster.mesh.position);

                    // Reset charge level
                    monster.chargeLevel = 0;

                    // Reset color
                    monster.mesh.children[0].material.color.set(0x5555ff);
                    monster.mesh.children[0].material.emissiveIntensity = 0.5;

                    if (monster.mesh.children[1]) {
                        monster.mesh.children[1].material.emissiveIntensity = 0.8;
                    }
                }
            }
        } else {
            // Discharge gradually when far from player
            monster.chargeLevel = Math.max(0, monster.chargeLevel - deltaTime * 0.1);
        }
    }
}

// New function to create electric discharge effect
function createElectricDischargeEffect(position) {
    // Create lightning bolt effect
    const lightningMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });

    const bolts = [];
    const boltCount = 8;

    for (let i = 0; i < boltCount; i++) {
        // Create jagged line for lightning
        const points = [];
        const segments = 6;
        const radius = 20;
        const angle = (i / boltCount) * Math.PI * 2;

        // Starting point at jellyfish position
        points.push(new THREE.Vector3(0, 0, 0));

        // Create jagged path outward
        for (let j = 1; j < segments; j++) {
            const segmentRadius = (j / segments) * radius;
            const jitter = 2 * (1 - j / segments); // More jitter near origin

            points.push(new THREE.Vector3(
                Math.cos(angle) * segmentRadius + (Math.random() - 0.5) * jitter,
                (Math.random() - 0.5) * jitter,
                Math.sin(angle) * segmentRadius + (Math.random() - 0.5) * jitter
            ));
        }

        // Create geometry from points
        const boltGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const bolt = new THREE.Line(boltGeometry, lightningMaterial);
        bolt.position.copy(position);

        scene.add(bolt);
        bolts.push(bolt);
    }

    // Add glow sphere at center
    const glowGeometry = new THREE.SphereGeometry(5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);
    scene.add(glow);

    // Animate the discharge
    const startTime = getTime();

    function animateDischarge() {
        const elapsedTime = (getTime() - startTime) / 1000;

        if (elapsedTime > 0.5) {
            // Remove all bolts and glow
            bolts.forEach(bolt => scene.remove(bolt));
            scene.remove(glow);
            return;
        }

        // Pulsate intensity
        const intensity = 1 - elapsedTime / 0.5;

        // Update bolt opacity
        bolts.forEach(bolt => {
            bolt.material.opacity = intensity * 0.8;
        });

        // Update glow
        glow.material.opacity = intensity * 0.6;
        glow.scale.set(1 + elapsedTime * 4, 1 + elapsedTime * 4, 1 + elapsedTime * 4);

        requestAnimationFrame(animateDischarge);
    }

    animateDischarge();
}

// Respawn monsters at night until we reach the maximum count
function respawnMonstersAtNight() {
    // Count how many monsters to spawn
    const monstersToSpawn = MONSTER_COUNT - monsters.length;

    if (monstersToSpawn <= 0) {
        console.log("Monster population is already at maximum capacity");
        return;
    }

    console.log(`Night has fallen. Respawning ${monstersToSpawn} sea monsters...`);

    // Spawn monsters in positions away from the player
    for (let i = 0; i < monstersToSpawn; i++) {
        const monsterType = selectRandomMonsterType();
        const spawnPosition = getRandomSpawnPosition();
        createMonsterByType(monsterType, spawnPosition);
    }

    console.log(`Sea monsters have respawned (${monsters.length}/${MONSTER_COUNT})`);
}

// Helper function to create a monster by type
function createMonsterByType(monsterType, position = null) {
    switch (monsterType) {
        case MONSTER_TYPES.KRAKEN:
            createKrakenMonster(position);
            break;
        case MONSTER_TYPES.SEA_SERPENT:
            createSeaSerpentMonster(position);
            break;
        case MONSTER_TYPES.PHANTOM_JELLYFISH:
            createPhantomJellyfishMonster(position);
            break;
        case MONSTER_TYPES.YELLOW_BEAST:
        default:
            createYellowBeastMonster(position); // Original monster
            break;
    }
}

// Helper function to get a random spawn position away from player
function getRandomSpawnPosition() {
    // Get vector pointing in random direction
    const angle = Math.random() * Math.PI * 2;
    const direction = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
    );

    // Position the monster at least 300 units away from player
    // but not more than 800 units away
    const distance = 300 + Math.random() * 500;
    const spawnPosition = new THREE.Vector3();

    // If playerBoat exists, spawn relative to it
    if (playerBoat) {
        spawnPosition.copy(playerBoat.position);
        spawnPosition.add(direction.multiplyScalar(distance));
    } else {
        // Fallback if no player boat
        spawnPosition.set(
            (Math.random() - 0.5) * 1000,
            MONSTER_DEPTH,
            (Math.random() - 0.5) * 1000
        );
    }

    spawnPosition.y = MONSTER_DEPTH; // Always spawn at monster depth

    return spawnPosition;
}

// When a monster is killed, create a treasure drop
export function createTreasureDrop(monster) {
    // Determine which treasure to drop based on monster type
    const treasureType = MONSTER_TREASURES[monster.monsterType] || MONSTER_TREASURES.yellowBeast;

    // Create glowing orb geometry for the treasure
    const orbGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    const orbMaterial = new THREE.MeshStandardMaterial({
        color: treasureType.color,
        emissive: treasureType.color,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.8
    });

    const treasureOrb = new THREE.Mesh(orbGeometry, orbMaterial);
    treasureOrb.position.copy(monster.mesh.position);
    treasureOrb.position.y = 0.5; // Float slightly above water
    treasureOrb.userData.treasureType = treasureType;
    treasureOrb.userData.creationTime = getTime() / 1000;

    // Add to scene and tracking array
    scene.add(treasureOrb);
    treasureDrops.push(treasureOrb);

    // Add pulsing animation to make it more noticeable
    const startScale = treasureOrb.scale.x;
    const pulseAnimation = () => {
        if (!treasureOrb.parent) return; // Stop if removed from scene

        const time = getTime() / 1000;
        const pulse = 1 + 0.2 * Math.sin(time * 3);
        treasureOrb.scale.set(startScale * pulse, startScale * pulse, startScale * pulse);

        requestAnimationFrame(pulseAnimation);
    };

    pulseAnimation();
}

// Update function for treasure drops - check for collection
function updateTreasureDrops() {
    //console.log("updateTreasureDrops: ", treasureDrops.length);
    if (!playerBoat || treasureDrops.length === 0) return;

    const currentTime = getTime() / 1000;
    const boatPosition = playerBoat.position.clone();
    boatPosition.y = 0.5; // Match Y level for better collision

    // Collection distance threshold (how close boat needs to be)
    const COLLECT_DISTANCE = 5;

    // Process treasures in reverse order to safely remove while iterating
    for (let i = treasureDrops.length - 1; i >= 0; i--) {
        const treasureOrb = treasureDrops[i];


        // Check if treasure should disappear due to timeout (30 seconds)
        if (currentTime - treasureOrb.userData.creationTime > 30) {
            scene.remove(treasureOrb);
            treasureDrops.splice(i, 1);
            continue;
        }

        // Check if boat is close enough to collect
        if (treasureOrb.position.distanceTo(boatPosition) < COLLECT_DISTANCE) {
            // Collect the treasure
            collectTreasure(treasureOrb.userData.treasureType);

            // Remove the orb

            scene.remove(treasureOrb);
            treasureDrops.splice(i, 1);
        }
    }
}

// Export treasure inventory for use in other modules
export function getTreasureInventory() {
    return treasureInventory;
}

// Make getTreasureInventory available globally for the UI
window.getTreasureInventory = getTreasureInventory;

// Update the treasure inventory in the UI when changes occur
function updateTreasureInventoryDisplay() {
    // If inventory UI exists and has a method for updating treasures, call it
    if (window.inventoryUI && typeof window.inventoryUI.updateTreasureInventory === 'function') {
        window.inventoryUI.updateTreasureInventory(treasureInventory);
    }
}

// Modify the collectTreasure function to update the inventory display
function collectTreasure(treasureType) {
    // console.log("collectTreasure: ", treasureType);
    const treasureName = treasureType.name;

    // Add to inventory
    if (!treasureInventory[treasureName]) {
        treasureInventory[treasureName] = {
            ...treasureType,
            count: 1
        };
    } else {
        treasureInventory[treasureName].count++;
    }

    // Remove from scene and tracking array
    //treasureDrops = treasureDrops.filter(orb => orb !== treasureOrb);

    // console.log(`Collected ${treasureName}!`, treasureInventory);

    // Update the inventory UI
    updateTreasureInventoryDisplay();

    // Play collection sound
    playCollectionSound();
}

// Simple sound effect for collecting treasures
function playCollectionSound() {
    // Create audio context if not already created
    if (!window.audioContext) {
        try {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported in this browser');
            return;
        }
    }

    // Create oscillator for simple collection sound
    const oscillator = window.audioContext.createOscillator();
    const gainNode = window.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, window.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, window.audioContext.currentTime + 0.2);

    // Set volume (50% of typical sound)
    gainNode.gain.setValueAtTime(0.15, window.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(window.audioContext.destination);

    oscillator.start();
    oscillator.stop(window.audioContext.currentTime + 0.3);
} 