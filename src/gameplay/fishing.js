import * as THREE from 'three';
import { scene, camera } from '../core/gameState.js';
import { gameUI } from '../ui/ui.js';
import { onFishCaught, onMoneyEarned } from '../core/network.js';

// Fishing system configuration
const FISHING_CAST_DISTANCE = 15;
const FISHING_LINE_COLOR = 0xFFFFFF;
const FISHING_BOBBER_COLOR = 0xFF0000;
const FISH_BITE_MIN_TIME = 3;
const FISH_BITE_MAX_TIME = 10;
const MINIGAME_DURATION = 5; // seconds
const MINIGAME_SPEED = 150; // pixels per second

// Fish types with their rarity and value
const FISH_TYPES = [
    { name: 'Anchovy', rarity: 0.3, value: 1, color: 0xCCCCCC },
    { name: 'Cod', rarity: 0.25, value: 2, color: 0xBBBB88 },
    { name: 'Salmon', rarity: 0.2, value: 3, color: 0xFF9977 },
    { name: 'Tuna', rarity: 0.15, value: 5, color: 0x6688AA },
    { name: 'Swordfish', rarity: 0.07, value: 10, color: 0x4477AA },
    { name: 'Shark', rarity: 0.02, value: 20, color: 0x778899 },
    { name: 'Golden Fish', rarity: 0.01, value: 50, color: 0xFFD700 }
];

// Fishing state
let isFishing = false;
let fishingLine = null;
let fishingBobber = null;
let fishingTimeout = null;
let minigameActive = false;
let minigameInterval = null;
let minigameDirection = 1;
let minigameMarkerPosition = 0;
let fishCaught = 0;
let boat = null;
let fishingStartPosition = new THREE.Vector3();
let fishingEndPosition = new THREE.Vector3();
let fishInventory = {};
let bobberAnimationInterval = null;
let fishEscapeTimeout = null;
let minigameTimeout = null;

// Initialize fishing system
export function initFishing(playerBoat) {
    boat = playerBoat;

    // Set up event listeners for fishing UI
    gameUI.elements.fishing.castButton.onclick = toggleFishing;
    gameUI.elements.fishing.minigame.catchButton.addEventListener('click', attemptCatch);

    // Update fish counter
    updateFishCounter();
}

// Toggle fishing on/off
function toggleFishing() {
    if (isFishing) {
        stopFishing();
    } else {
        startFishing();
    }
}

// Start fishing
function startFishing() {
    if (isFishing) return;

    isFishing = true;
    gameUI.elements.fishing.castButton.textContent = 'Reel In';
    gameUI.elements.fishing.status.textContent = 'Waiting for a bite...';

    // Calculate fishing line start and end positions
    fishingStartPosition.copy(boat.position);
    fishingStartPosition.y += 2; // Start from slightly above the boat

    // Calculate end position (in front of the boat)
    const boatDirection = new THREE.Vector3(0, 0, -1);
    boatDirection.applyQuaternion(boat.quaternion);

    fishingEndPosition.copy(fishingStartPosition);
    fishingEndPosition.addScaledVector(boatDirection, FISHING_CAST_DISTANCE);
    fishingEndPosition.y = 0; // End at water level

    // Create fishing line
    createFishingLine();

    // Set timeout for fish bite
    const biteTime = FISH_BITE_MIN_TIME + Math.random() * (FISH_BITE_MAX_TIME - FISH_BITE_MIN_TIME);
    fishingTimeout = setTimeout(() => {
        if (isFishing) {
            fishBite();
        }
    }, biteTime * 1000);
}

// Stop fishing
function stopFishing() {
    if (!isFishing) return;

    isFishing = false;
    gameUI.elements.fishing.castButton.textContent = 'Cast Line';
    gameUI.elements.fishing.status.textContent = 'Ready to fish';
    gameUI.elements.fishing.castButton.onclick = toggleFishing;

    // Clear any pending timeouts
    if (fishingTimeout) {
        clearTimeout(fishingTimeout);
        fishingTimeout = null;
    }

    // Remove fishing line and bobber
    removeFishingLine();

    // Stop minigame if active
    if (minigameActive) {
        stopMinigame(false);
    }
}

// Create fishing line and bobber
function createFishingLine() {
    // Create line geometry
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        fishingStartPosition,
        fishingEndPosition
    ]);

    // Create line material
    const lineMaterial = new THREE.LineBasicMaterial({
        color: FISHING_LINE_COLOR,
        linewidth: 1
    });

    // Create line
    fishingLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(fishingLine);

    // Create bobber
    const bobberGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const bobberMaterial = new THREE.MeshBasicMaterial({ color: FISHING_BOBBER_COLOR });
    fishingBobber = new THREE.Mesh(bobberGeometry, bobberMaterial);
    fishingBobber.position.copy(fishingEndPosition);
    fishingBobber.position.y = 0.3; // Float slightly above water
    scene.add(fishingBobber);
}

// Remove fishing line and bobber
function removeFishingLine() {
    if (fishingLine) {
        scene.remove(fishingLine);
        fishingLine = null;
    }

    if (fishingBobber) {
        scene.remove(fishingBobber);
        fishingBobber = null;
    }
}

// Update fishing line position (call this in the animation loop)
export function updateFishing() {
    if (!isFishing || !fishingLine || !fishingBobber) return;

    // Update fishing line start position (attached to boat)
    fishingStartPosition.copy(boat.position);
    fishingStartPosition.y += 2;

    // Update line geometry
    const positions = fishingLine.geometry.attributes.position.array;
    positions[0] = fishingStartPosition.x;
    positions[1] = fishingStartPosition.y;
    positions[2] = fishingStartPosition.z;
    fishingLine.geometry.attributes.position.needsUpdate = true;

    // Make bobber bob up and down slightly
    if (fishingBobber) {
        fishingBobber.position.y = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
    }
}

// Fish bite event
function fishBite() {
    gameUI.elements.fishing.status.textContent = 'Fish on! Click to catch!';
    gameUI.elements.fishing.status.style.color = 'rgba(255, 200, 0, 1)';

    // Clear any previous timeouts to prevent conflicts
    if (fishingTimeout) {
        clearTimeout(fishingTimeout);
        fishingTimeout = null;
    }

    // Make bobber move more vigorously
    if (fishingBobber) {
        fishingBobber.position.y = 0.3;
        // Store the animation interval to clear it properly later
        const bobberAnimation = setInterval(() => {
            if (fishingBobber) {
                fishingBobber.position.y = 0.3 + Math.sin(Date.now() * 0.01) * 0.3;
            } else {
                clearInterval(bobberAnimation);
            }
        }, 16);

        // Save the interval ID for reference
        bobberAnimationInterval = bobberAnimation;

        // Set timeout for fish to get away, but only if minigame isn't started
        fishEscapeTimeout = setTimeout(() => {
            // Only execute if still fishing and minigame not active
            if (isFishing && !minigameActive) {
                clearInterval(bobberAnimation);
                gameUI.elements.fishing.status.textContent = 'The fish got away!';
                gameUI.elements.fishing.status.style.color = 'rgba(255, 100, 100, 1)';

                // Reset after a moment
                setTimeout(() => {
                    if (isFishing) {
                        resetFishingState();
                    }
                }, 2000);
            }
        }, 5000);
    }

    // Start minigame when cast button is clicked
    gameUI.elements.fishing.castButton.textContent = 'Catch!';
    gameUI.elements.fishing.castButton.onclick = startMinigame;
}

// Start fishing minigame
function startMinigame() {
    // Prevent multiple minigame instances
    if (minigameActive) return;

    // Clear fish escape timeout since the player is attempting to catch
    if (fishEscapeTimeout) {
        clearTimeout(fishEscapeTimeout);
        fishEscapeTimeout = null;
    }

    // Reset cast button
    gameUI.elements.fishing.castButton.textContent = 'Reel In';
    gameUI.elements.fishing.castButton.onclick = toggleFishing;

    minigameActive = true;

    // Show minigame UI
    gameUI.elements.fishing.minigame.container.style.display = 'flex';

    // Reset marker position
    minigameMarkerPosition = 0;
    gameUI.elements.fishing.minigame.marker.style.left = '0px';

    // Start marker movement
    minigameDirection = 1;
    minigameInterval = setInterval(updateMinigame, 16);

    // Set timeout to end minigame if player doesn't catch in time
    minigameTimeout = setTimeout(() => {
        if (minigameActive) {
            stopMinigame(false);
            gameUI.elements.fishing.status.textContent = 'The fish got away!';
            gameUI.elements.fishing.status.style.color = 'rgba(255, 100, 100, 1)';

            // Reset after a moment
            setTimeout(() => {
                if (isFishing) {
                    resetFishingState();
                }
            }, 2000);
        }
    }, MINIGAME_DURATION * 1000);
}

// Update minigame marker position
function updateMinigame() {
    const progressBarWidth = 250;

    // Update marker position
    minigameMarkerPosition += minigameDirection * (MINIGAME_SPEED / 60);

    // Bounce at edges
    if (minigameMarkerPosition >= progressBarWidth - 10) {
        minigameMarkerPosition = progressBarWidth - 10;
        minigameDirection = -1;
    } else if (minigameMarkerPosition <= 0) {
        minigameMarkerPosition = 0;
        minigameDirection = 1;
    }

    // Update marker position
    gameUI.elements.fishing.minigame.marker.style.left = `${minigameMarkerPosition}px`;
}

// Attempt to catch fish
function attemptCatch() {
    if (!minigameActive) return;

    // Get target zone position
    const targetZone = gameUI.elements.fishing.minigame.targetZone;
    const targetLeft = parseInt(targetZone.style.left);
    const targetWidth = parseInt(targetZone.style.width);
    const targetRight = targetLeft + targetWidth;

    // Check if marker is in target zone
    if (minigameMarkerPosition >= targetLeft && minigameMarkerPosition <= targetRight) {
        // Success!
        stopMinigame(true);
        catchFish();
    } else {
        // Failure
        stopMinigame(false);
        gameUI.elements.fishing.status.textContent = 'Missed! The fish got away.';
        gameUI.elements.fishing.status.style.color = 'rgba(255, 100, 100, 1)';

        // Reset after a moment
        setTimeout(() => {
            if (isFishing) {
                gameUI.elements.fishing.status.textContent = 'Waiting for a bite...';
                gameUI.elements.fishing.status.style.color = 'white';

                // Set timeout for next fish bite
                const biteTime = FISH_BITE_MIN_TIME + Math.random() * (FISH_BITE_MAX_TIME - FISH_BITE_MIN_TIME);
                fishingTimeout = setTimeout(() => {
                    if (isFishing) {
                        fishBite();
                    }
                }, biteTime * 1000);
            }
        }, 2000);
    }
}

// Stop minigame
function stopMinigame(success) {
    if (!minigameActive) return;

    minigameActive = false;

    // Clear all intervals and timeouts to prevent conflicts
    if (minigameInterval) {
        clearInterval(minigameInterval);
        minigameInterval = null;
    }

    if (minigameTimeout) {
        clearTimeout(minigameTimeout);
        minigameTimeout = null;
    }

    if (bobberAnimationInterval) {
        clearInterval(bobberAnimationInterval);
        bobberAnimationInterval = null;
    }

    // Hide minigame UI
    gameUI.elements.fishing.minigame.container.style.display = 'none';
}

// Helper function to reset fishing state and set up for next bite
function resetFishingState() {
    // Clear any existing timeouts
    if (fishingTimeout) {
        clearTimeout(fishingTimeout);
    }

    if (fishEscapeTimeout) {
        clearTimeout(fishEscapeTimeout);
    }

    // Reset UI
    gameUI.elements.fishing.status.textContent = 'Waiting for a bite...';
    gameUI.elements.fishing.status.style.color = 'white';

    // Set timeout for next fish bite
    const biteTime = FISH_BITE_MIN_TIME + Math.random() * (FISH_BITE_MAX_TIME - FISH_BITE_MIN_TIME);
    fishingTimeout = setTimeout(() => {
        if (isFishing) {
            fishBite();
        }
    }, biteTime * 1000);
}

// Catch a fish
function catchFish() {
    // Determine which fish was caught based on rarity
    const rand = Math.random();
    let cumulativeRarity = 0;
    let caughtFish = FISH_TYPES[0]; // Default to most common fish

    for (const fish of FISH_TYPES) {
        cumulativeRarity += fish.rarity;
        if (rand <= cumulativeRarity) {
            caughtFish = fish;
            break;
        }
    }

    // Update fish inventory
    if (!fishInventory[caughtFish.name]) {
        fishInventory[caughtFish.name] = {
            count: 1,
            value: caughtFish.value,
            color: caughtFish.color
        };
    } else {
        fishInventory[caughtFish.name].count++;
    }

    // Increment fish counter
    fishCaught += caughtFish.value;
    updateFishCounter();

    // Update inventory UI
    gameUI.updateInventory(fishInventory);

    // Show success message
    gameUI.elements.fishing.status.textContent = `Caught a ${caughtFish.name}! (+${caughtFish.value})`;
    gameUI.elements.fishing.status.style.color = 'rgba(100, 255, 100, 1)';

    // Create a 3D fish model that jumps out of the water
    createCaughtFishEffect(caughtFish);

    // Update player stats in network
    onFishCaught(1);

    // If different fish have different values
    const fishValue = caughtFish.value; // Use the fish's value directly

    // IMPORTANT: Directly update the UI stats panel
    // This ensures the UI updates immediately without waiting for network responses
    gameUI.updatePlayerStats({
        fishCount: fishCaught,
    });

    // Reset after a moment
    setTimeout(() => {
        if (isFishing) {
            gameUI.elements.fishing.status.textContent = 'Waiting for a bite...';
            gameUI.elements.fishing.status.style.color = 'white';

            // Set timeout for next fish bite
            const biteTime = FISH_BITE_MIN_TIME + Math.random() * (FISH_BITE_MAX_TIME - FISH_BITE_MIN_TIME);
            fishingTimeout = setTimeout(() => {
                if (isFishing) {
                    fishBite();
                }
            }, biteTime * 1000);
        }
    }, 3000);
}

// Create visual effect for caught fish
function createCaughtFishEffect(fishType) {
    // Create fish geometry
    const fishGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    fishGeometry.rotateZ(Math.PI / 2);

    // Create fish material with the fish's color
    const fishMaterial = new THREE.MeshPhongMaterial({
        color: fishType.color,
        specular: 0xffffff,
        shininess: 30
    });

    // Create fish mesh
    const fish = new THREE.Mesh(fishGeometry, fishMaterial);

    // Position fish at bobber
    fish.position.copy(fishingBobber.position);

    // Add fish to scene
    scene.add(fish);

    // Create animation for fish jumping out of water
    const startTime = Date.now();
    const jumpDuration = 1500; // ms
    const jumpHeight = 5;

    const animateFish = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / jumpDuration, 1);

        // Parabolic jump
        const jumpProgress = progress * 2 - 1; // -1 to 1
        const height = jumpHeight * (1 - jumpProgress * jumpProgress);

        // Move fish up and slightly toward boat
        fish.position.copy(fishingBobber.position);
        fish.position.y += height;

        // Rotate fish
        fish.rotation.z = progress * Math.PI * 4;

        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animateFish);
        } else {
            // Remove fish after animation
            scene.remove(fish);
        }
    };

    // Start animation
    animateFish();
}

// Update fish counter
function updateFishCounter() {
    gameUI.elements.fishing.counter.textContent = `Fish: ${fishCaught}`;
}

// Get current fish count
export function getFishCount() {
    return fishCaught;
}

// Add this function to get the fish inventory
export function getFishInventory() {
    return fishInventory;
}

// Example function to determine fish value (implement based on your game design)
function getFishValue(fishType) {
    // Return money value based on fish type
    switch (fishType) {
        case 'common': return 10;
        case 'uncommon': return 25;
        case 'rare': return 50;
        case 'legendary': return 100;
        default: return 5;
    }
} 