import * as THREE from 'three';
import { getWindData, boatVelocity, boat, getTime } from '../core/gameState.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add these variables near the top with your other boat variables
let boatRockAngleX = 0; // Pitch (forward/backward rocking)
let boatRockAngleZ = 0; // Roll (side-to-side rocking)
const rockSpeed = 1.5; // How fast the boat rocks
const maxRockAngle = 0.04; // Maximum rocking angle in radians (about 2.3 degrees)

// Wood overlay texture for boat colored parts
let woodOverlayTexture = null;

// Variables to manage damage flash effect
let isDamageFlashing = false;
let damageFlashTimer = 0;
const damageFlashDuration = 0.5; // Duration of flash in seconds
let originalColors = new Map(); // Store original colors for restoration

// Add a flag to track if the model has been loaded
let boatModelLoaded = false;
let boatModelLoading = false; // Flag for tracking if model is currently loading

// Add these variables near other boat-related declarations
let damageOverlay; // Reference to the damage overlay mesh

// Initialize wood overlay texture
function initWoodOverlayTexture() {
    // Create a canvas for the subtle wood grain overlay
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    // Fill with transparent background
    context.fillStyle = 'rgba(255, 255, 255, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add very subtle wood grain lines
    const grainCount = 12;
    context.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Very transparent black
    context.lineWidth = 1;

    for (let i = 0; i < grainCount; i++) {
        const y = i * (canvas.height / grainCount) + (Math.random() * 10 - 5);

        context.beginPath();
        context.moveTo(0, y);

        // Create wavy lines
        const segments = 8;
        const xStep = canvas.width / segments;

        for (let j = 1; j <= segments; j++) {
            const x = j * xStep;
            const yOffset = (Math.random() - 0.5) * 8;
            context.lineTo(x, y + yOffset);
        }

        context.stroke();
    }

    // Create the texture
    woodOverlayTexture = new THREE.CanvasTexture(canvas);
    woodOverlayTexture.wrapS = THREE.RepeatWrapping;
    woodOverlayTexture.wrapT = THREE.RepeatWrapping;

    return woodOverlayTexture;
}

// Function to create a wooden texture material with a cartoony style
function createWoodMaterial(baseColor, name) {
    // Create a canvas for the wood texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    // Fill with base color
    context.fillStyle = '#' + new THREE.Color(baseColor).getHexString();
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add wood grain - fewer layers for cartoon style
    const grainLayers = 6; // Reduced from 15 for a more cartoon look

    for (let i = 0; i < grainLayers; i++) {
        // Less random color variation for cartoon style
        const grainColor = new THREE.Color(baseColor);
        const darkening = 0.1 + (i % 3) * 0.05; // More consistent darkening
        grainColor.r -= darkening;
        grainColor.g -= darkening;
        grainColor.b -= darkening;

        context.strokeStyle = '#' + grainColor.getHexString();
        context.lineWidth = 3 + (i % 3); // Thicker, more cartoon-like lines

        // Create fewer, more defined grain lines
        const grainCount = 5 + Math.floor(i * 0.8); // Fewer lines for cartoon style
        const yStep = canvas.height / grainCount;

        for (let j = 0; j < grainCount; j++) {
            const y = j * yStep + yStep * 0.3;

            context.beginPath();
            context.moveTo(0, y);

            // Create gentler waves for cartoon style
            const segments = 6; // Fewer segments
            const xStep = canvas.width / segments;

            for (let k = 1; k <= segments; k++) {
                const x = k * xStep;
                // Smaller yOffset for straighter, more cartoon-like lines
                const yOffset = (Math.random() - 0.5) * yStep * 0.4;
                context.lineTo(x, y + yOffset);
            }

            context.stroke();
        }

        // Add fewer knots (cartoon style usually has fewer details)
        if (Math.random() < 0.2) { // 0.2 instead of 0.4
            const knotX = Math.random() * canvas.width;
            const knotY = Math.random() * canvas.height;
            const knotSize = 8 + Math.random() * 12; // Slightly larger, more defined knots

            const gradient = context.createRadialGradient(
                knotX, knotY, 1,
                knotX, knotY, knotSize
            );

            // More contrast in knot colors for cartoon style
            gradient.addColorStop(0, '#3d2c17');
            gradient.addColorStop(0.5, '#' + new THREE.Color(baseColor).getHexString());
            gradient.addColorStop(1, '#' + new THREE.Color(baseColor).getHexString());

            context.fillStyle = gradient;
            context.beginPath();
            context.arc(knotX, knotY, knotSize, 0, Math.PI * 2);
            context.fill();
        }
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Create material with the texture
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        color: baseColor,
        name: name || 'woodMaterial',
        bumpMap: texture,
        bumpScale: 0.03, // Reduced bump scale for smoother cartoon look
        shininess: 3     // Lower shininess for a more matte, cartoon-like finish
    });

    return material;
}

// Applies wood texture overlay to materials that get color changes
export function applyWoodTextureToColoredParts(boatObject) {
    if (!woodOverlayTexture) {
        woodOverlayTexture = initWoodOverlayTexture();
    }

    boatObject.traverse((child) => {
        if (child.isMesh && !child.userData.isNotPlayerColorable) {
            // Only apply to parts that can change color but don't already have wood texture
            if (!child.material.name || !child.material.name.includes('wood')) {
                // Clone the texture to avoid sharing between materials
                const texture = woodOverlayTexture.clone();
                texture.needsUpdate = true;

                // If material already has a map, use texture as bump map
                if (child.material.map) {
                    child.material.bumpMap = texture;
                    child.material.bumpScale = 0.02;
                } else {
                    child.material.map = texture;
                }

                // Store original color application method to hook into color changes
                if (!child.userData.originalApplyColor) {
                    // Store original color setter
                    const originalColorSetter = Object.getOwnPropertyDescriptor(child.material.color, 'set');

                    // Hook into color setting to reapply texture
                    if (originalColorSetter) {
                        child.userData.originalApplyColor = true;
                        Object.defineProperty(child.material.color, 'set', {
                            value: function (color) {
                                // Call original setter
                                originalColorSetter.value.call(this, color);

                                // Reapply texture after color change
                                if (!child.material.map) {
                                    child.material.map = texture.clone();
                                }

                                child.material.needsUpdate = true;
                                return this;
                            }
                        });
                    }
                }

                child.material.needsUpdate = true;
            }
        }
    });
}

// Add a small Minecraft-style character to the front of the boat
export function addCharacterToBoat(boat) {
    // Create a group for the character
    const character = new THREE.Group();

    // Head - slightly larger than body parts for the Minecraft look
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFD700, // Yellow skin tone
        name: 'characterHeadMaterial'
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.9;
    head.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    character.add(head);

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 1.0, 0.5);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF }); // Blue shirt
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.0;
    body.userData.isNotPlayerColorable = false; // Flag to prevent color changes
    character.add(body);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF }); // Match shirt

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 0.1, 0);
    leftArm.userData.isNotPlayerColorable = true;
    character.add(leftArm);

    // Right arm - raised as if pointing forward
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 0.1, 0);
    rightArm.rotation.z = -Math.PI / 4; // Angle the arm up
    rightArm.userData.isNotPlayerColorable = true;
    character.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown pants

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, -0.8, 0);
    leftLeg.userData.isNotPlayerColorable = true;
    character.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, -0.8, 0);
    rightLeg.userData.isNotPlayerColorable = true;
    character.add(rightLeg);

    // Position the character at the front of the boat, moved to the left for visibility
    character.position.set(-1.5, 3.2, -7.8); // Moved to the left side of the front extension
    character.rotation.y = Math.PI; // Face forward (looking out from the boat)

    // Add the character to the boat
    boat.add(character);

    return character;
}

// Create a damage overlay instead of changing materials
function createDamageOverlay(boat) {
    // Create a box that's slightly larger than the boat
    const boatBoundingBox = new THREE.Box3().setFromObject(boat);
    const size = new THREE.Vector3();
    boatBoundingBox.getSize(size);

    // Make the overlay slightly larger than the boat
    const overlayGeometry = new THREE.BoxGeometry(
        size.x * 1.1,
        size.y * 1.1,
        size.z * 1.1
    );

    // Create a semi-transparent red material
    const overlayMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        depthWrite: false, // Prevents z-fighting
        side: THREE.DoubleSide
    });

    // Create the overlay mesh
    damageOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);

    // Position at boat's center
    const center = new THREE.Vector3();
    boatBoundingBox.getCenter(center);
    damageOverlay.position.copy(center);

    // Add to boat but hide initially
    boat.add(damageOverlay);
    damageOverlay.visible = false;

    return damageOverlay;
}

// Function to flash boat damage using the overlay
export function flashBoatDamage() {
    if (isDamageFlashing) return; // Don't start a new flash if one is in progress

    // Create overlay if it doesn't exist
    if (!damageOverlay) {
        damageOverlay = createDamageOverlay(boat);
    }

    isDamageFlashing = true;
    damageFlashTimer = damageFlashDuration;

    // Show the overlay
    damageOverlay.visible = true;
}

// Modify createBoat to initialize the damage overlay
export function createBoat(scene) {
    // Create a group to hold the boat
    let boat = new THREE.Group();

    // Call loadGLBModel directly here, passing the boat group
    loadGLBModel(boat);

    // Position the boat
    boat.position.set(0, 0.5, 0);

    // Add a small Minecraft-style character to the boat
    addCharacterToBoat(boat);

    // Create the damage overlay
    createDamageOverlay(boat);

    // Add the boat to the scene
    scene.add(boat);

    return boat;
}

// Original geometric boat creation (commented out but preserved as fallback)
function createGeometricBoat(boat) {
    /*
    // Create larger hull with wood texture
    const hullGeometry = new THREE.BoxGeometry(6, 2, 12);
    const hullMaterial = createWoodMaterial(0x8b4513, 'hullMaterial');
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 1; // Adjusted for larger size
    boat.add(hull);

    // Add front extension of the boat (forecastle)
    const frontExtensionGeometry = new THREE.BoxGeometry(4, 1.8, 3);
    const frontExtensionMaterial = createWoodMaterial(0x8b4513, 'frontExtensionMaterial');
    const frontExtension = new THREE.Mesh(frontExtensionGeometry, frontExtensionMaterial);
    frontExtension.position.set(0, 1, -7.5); // Moved to front (negative Z)
    frontExtension.userData.isNotPlayerColorable = true;
    boat.add(frontExtension);

    // Add front cannon
    const frontCannonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 12);
    const frontCannonMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111, // Black color for cannons
        specular: 0x333333,
        shininess: 30,
        name: 'cannonMaterial'
    });
    const frontCannon = new THREE.Mesh(frontCannonGeometry, frontCannonMaterial);
    frontCannon.rotation.x = -Math.PI / 2; // Rotated to point forward
    frontCannon.position.set(0, 2.3, -9); // Positioned at front of ship (negative Z)
    frontCannon.userData.isNotPlayerColorable = true;
    boat.add(frontCannon);

    // Front cannon mount
    const frontMountGeometry = new THREE.BoxGeometry(2.5, 0.5, 0.5);
    const frontMountMaterial = createWoodMaterial(0x5c3317, 'mountMaterial');
    const frontMount = new THREE.Mesh(frontMountGeometry, frontMountMaterial);
    frontMount.position.set(0, 2, -8.5); // Positioned at front
    frontMount.userData.isNotPlayerColorable = true;
    boat.add(frontMount);

    // Add a deck with wood texture
    const deckGeometry = new THREE.BoxGeometry(5.8, 0.3, 11.8);
    const deckMaterial = createWoodMaterial(0x8b4513, 'deckMaterial');
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 2.15; // Position on top of hull
    deck.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    boat.add(deck);

    // Add cannons (two black cannons on the sides)
    const cannonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 12);
    const cannonMaterial = new THREE.MeshPhongMaterial({
        color: 0x111111, // Black color for cannons
        specular: 0x333333,
        shininess: 30,
        name: 'cannonMaterial'
    });

    // Left cannon
    const leftCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    leftCannon.rotation.z = Math.PI / 2; // Rotate 90 degrees to point outward
    leftCannon.position.set(-3.2, 2.3, 0); // Position on left side of hull
    leftCannon.userData.isNotPlayerColorable = true;
    boat.add(leftCannon);

    // Right cannon
    const rightCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    rightCannon.rotation.z = -Math.PI / 2; // Rotate -90 degrees to point outward
    rightCannon.position.set(3.2, 2.3, 0); // Position on right side of hull
    rightCannon.userData.isNotPlayerColorable = true;
    boat.add(rightCannon);

    // Add cannon mounts
    const mountGeometry = new THREE.BoxGeometry(0.5, 0.5, 2.5);
    const mountMaterial = createWoodMaterial(0x5c3317, 'mountMaterial');

    // Left cannon mount
    const leftMount = new THREE.Mesh(mountGeometry, mountMaterial);
    leftMount.position.set(-3, 2, 0);
    leftMount.userData.isNotPlayerColorable = true;
    boat.add(leftMount);

    // Right cannon mount
    const rightMount = new THREE.Mesh(mountGeometry, mountMaterial);
    rightMount.position.set(3, 2, 0);
    rightMount.userData.isNotPlayerColorable = true;
    boat.add(rightMount);

    // Add a much taller mast with wood texture
    const mastGeometry = new THREE.CylinderGeometry(0.25, 0.25, 12, 8);
    const mastMaterial = createWoodMaterial(0x8b4513, 'mastMaterial');
    mastMaterial.map.repeat.set(1, 6); // Repeat the texture vertically for the tall mast
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.y = 8; // Positioned higher for taller mast
    mast.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    boat.add(mast);

    // Add a larger sail with animation capability
    const sailGeometry = new THREE.PlaneGeometry(5, 9, 20, 20); // More segments for better animation
    const sailMaterial = new THREE.MeshPhongMaterial({
        color: 0xf5f5f5,
        side: THREE.DoubleSide,
        name: 'sailMaterial'
    });

    // Store original vertex positions for animation
    sailGeometry.userData.originalPositions = [];
    const positions = sailGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
        sailGeometry.userData.originalPositions.push(positions[i]);
    }

    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.rotation.y = Math.PI / 2;
    sail.position.set(0, 8, 1.5); // Positioned on the mast
    sail.userData.isNotPlayerColorable = true; // Flag to prevent color changes
    sail.userData.isSail = true; // Flag to identify for animation
    boat.add(sail);

    // Add a crossbeam for the sail
    const crossBeamGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5.5, 8);
    const crossBeamMaterial = createWoodMaterial(0x8b4513, 'crossBeamMaterial');
    const crossBeam = new THREE.Mesh(crossBeamGeometry, crossBeamMaterial);
    crossBeam.rotation.z = Math.PI / 2; // Make it horizontal
    crossBeam.position.set(0, 12, 1.5); // Position at top of sail
    crossBeam.userData.isNotPlayerColorable = true;
    boat.add(crossBeam);
    */

    // Apply wood texture overlay to colorable parts
    applyWoodTextureToColoredParts(boat);
}

export function updateBoatRocking(deltaTime) {
    // Calculate boat speed magnitude
    const speedMagnitude = Math.abs(boatVelocity.z);

    // Get wind data for additional rocking effect
    const windData = getWindData();
    const windSpeed = windData.speed;

    // Combine boat speed and wind for total rocking factor
    // Wind has a smaller effect than boat speed
    const rockingFactor = speedMagnitude + (windSpeed * 0.1);

    // Calculate target rocking angles
    const targetRockAngleX = Math.sin(getTime() * rockSpeed) * maxRockAngle * rockingFactor;
    const targetRockAngleZ = Math.sin(getTime() * rockSpeed * 0.7) * maxRockAngle * rockingFactor;

    // Smoothly interpolate current angles toward target angles
    const smoothFactor = Math.min(deltaTime * 3, 1.0);
    boatRockAngleX += (targetRockAngleX - boatRockAngleX) * smoothFactor;
    boatRockAngleZ += (targetRockAngleZ - boatRockAngleZ) * smoothFactor;

    // Apply the rocking rotation (keep existing Y rotation)
    const currentYRotation = boat.rotation.y;
    boat.rotation.set(boatRockAngleX, currentYRotation, boatRockAngleZ);

    // Only attempt to load the model once and only if not already loaded/loading
    if (!boatModelLoaded && !boatModelLoading) {
        loadGLBModel(boat);
    }

    // Update damage flash effect
    updateDamageFlash(deltaTime);
}

// Add this function to apply wind influence to boat movement
export function applyWindInfluence() {
    // Get wind data
    const windData = getWindData();
    const windDirection = windData.direction;
    const windSpeed = windData.speed;

    // Calculate wind vector in world space
    const windVector = new THREE.Vector3(
        Math.cos(windDirection),
        0,
        Math.sin(windDirection)
    );

    // Scale by wind speed (very subtle influence)
    const windInfluence = 0.0005;
    windVector.multiplyScalar(windSpeed * windInfluence);

    // Apply to boat position
    boat.position.add(windVector);
}

// Update function to handle damage flash timing
export function updateDamageFlash(deltaTime) {
    if (!isDamageFlashing) return;

    damageFlashTimer -= deltaTime;

    if (damageFlashTimer <= 0) {
        // Hide the overlay instead of restoring colors
        if (damageOverlay) {
            damageOverlay.visible = false;
        }
        isDamageFlashing = false;
    }
}

// Update the loadGLBModel function to position and rotate the model correctly
function loadGLBModel(boat) {
    // Don't load if already loaded or currently loading
    if (boatModelLoaded || boatModelLoading) return;

    // Set loading flag to prevent concurrent load attempts
    boatModelLoading = true;

    // Create a GLTF loader
    const loader = new GLTFLoader();

    // Use a relative path to the GLB file in the assets directory
    const modelUrl = './boat.glb';

    console.log(`Loading boat model from local path: ${modelUrl}`);

    loader.load(
        modelUrl,
        // Success callback
        function (gltf) {
            console.log("✅ GLB model loaded successfully!");
            const model = gltf.scene;

            // Add LOD system
            const lod = new THREE.LOD();

            // Add highest detail model
            model.scale.set(20, 20, 20);
            model.rotation.y = Math.PI;
            model.position.set(0, 7, 0);
            lod.addLevel(model, 0);  // Highest detail at close range

            // Create simplified version for distance
            const simplifiedModel = model.clone();
            simplifiedModel.traverse(child => {
                if (child.isMesh && child.geometry) {
                    // Remove unnecessary details for distant view
                    if (child.name.includes('detail') || child.name.includes('accessory')) {
                        child.visible = false;
                    }
                }
            });
            lod.addLevel(simplifiedModel, 100);  // Medium detail

            // Add very simplified version for far distance
            const boxGeometry = new THREE.BoxGeometry(6, 2, 12);
            const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
            const boxModel = new THREE.Mesh(boxGeometry, boxMaterial);
            boxModel.position.set(0, 7, 0);
            lod.addLevel(boxModel, 500);  // Low detail at far range

            // Add LOD to boat
            boat.add(lod);

            // Handle animations if present
            if (gltf.animations && gltf.animations.length) {
                const mixer = new THREE.AnimationMixer(model);
                const animation = mixer.clipAction(gltf.animations[0]);
                animation.play();

                model.userData.mixer = mixer;

                if (!window.modelMixers) window.modelMixers = [];
                window.modelMixers.push(mixer);
            }

            // Set flags to indicate model is loaded and no longer loading
            boatModelLoaded = true;
            boatModelLoading = false;
        },
        // Progress callback
        function (xhr) {
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log(`Model loading: ${Math.round(percentComplete)}%`);
            }
        },
        // Error callback
        function (error) {
            console.error("❌ Error loading boat model:", error);
            console.log("Falling back to geometric boat model");

            // Reset loading flag but don't mark as loaded
            boatModelLoading = false;

            // Fallback to geometric boat model
            createGeometricBoat(boat);
        }
    );
}

// If you have an animation loop, add this to update the animations
export function updateGLBAnimations(deltaTime) {
    if (window.modelMixers) {
        for (const mixer of window.modelMixers) {
            mixer.update(deltaTime);
        }
    }
}

// Function to apply interesting colors to the boat model
function applyBoatColors(model) {
    // Color palette for different boat parts
    const colorPalette = {
        hull: new THREE.Color(0x8b4513),       // Dark wood brown for hull
        deck: new THREE.Color(0xa0522d),       // Lighter wood brown for deck
        sail: new THREE.Color(0xf0f0f0),       // Off-white for sails
        mast: new THREE.Color(0x5c3317),       // Dark brown for mast
        details: new THREE.Color(0xdaa520),    // Golden for decorative elements
        trim: new THREE.Color(0x191970),       // Navy blue for trim
        cannon: new THREE.Color(0x2f4f4f),     // Dark slate for cannons
        flag: new THREE.Color(0xb22222),       // Crimson for flags
    };

    // Apply colors based on mesh names or positions
    model.traverse((child) => {
        if (child.isMesh) {
            // Store original material for damage flash effect
            if (!originalColors.has(child.uuid)) {
                originalColors.set(child.uuid, child.material.color.clone());
            }

            // Apply colors based on mesh name or position
            // Note: Adjust these conditions based on the actual model structure
            if (child.name.includes('hull') || child.name.includes('body')) {
                child.material.color.copy(colorPalette.hull);
            } else if (child.name.includes('deck')) {
                child.material.color.copy(colorPalette.deck);
            } else if (child.name.includes('sail')) {
                child.material.color.copy(colorPalette.sail);
            } else if (child.name.includes('mast')) {
                child.material.color.copy(colorPalette.mast);
            } else if (child.name.includes('cannon')) {
                child.material.color.copy(colorPalette.cannon);
            } else if (child.name.includes('flag')) {
                child.material.color.copy(colorPalette.flag);
            } else if (child.name.includes('trim') || child.name.includes('detail')) {
                child.material.color.copy(colorPalette.trim);
            } else if (child.position.y > 5) {
                // Higher elements are likely masts or sails
                child.material.color.copy(colorPalette.sail);
            } else {
                // Default to hull color
                child.material.color.copy(colorPalette.hull);
            }

            // Apply wood texture to wooden parts
            if (child.name.includes('wood') ||
                child.name.includes('hull') ||
                child.name.includes('deck') ||
                child.name.includes('mast')) {
                applyWoodTextureToMesh(child);
            }

            // Make sure the material updates
            child.material.needsUpdate = true;
        }
    });

    console.log("Applied custom colors to boat model");
}

// Function to apply wood texture to a specific mesh
function applyWoodTextureToMesh(mesh) {
    if (!woodOverlayTexture) {
        woodOverlayTexture = initWoodOverlayTexture();
    }

    // Clone the texture to avoid sharing between materials
    const texture = woodOverlayTexture.clone();
    texture.needsUpdate = true;

    // If material already has a map, use texture as bump map
    if (mesh.material.map) {
        mesh.material.bumpMap = texture;
        mesh.material.bumpScale = 0.02;
    } else {
        mesh.material.map = texture;
    }

    mesh.material.needsUpdate = true;
}

// Add this new function to brighten the boat materials
function makeBoatCartoony(model) {
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            // Handle materials in arrays
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    brightifyMaterial(mat);
                });
            } else {
                // Handle single materials
                brightifyMaterial(child.material);
            }
        }
    });

    console.log("Applied cartoony bright style to boat model");
}

// Helper function to make a material more vibrant/cartoony
function brightifyMaterial(material) {
    // Increase saturation by boosting the color values
    if (material.color) {
        // Get current HSL values
        const hsl = {};
        material.color.getHSL(hsl);

        // Increase saturation by 30% and lightness by 20%
        hsl.s = Math.min(hsl.s * 1.3, 1.0);
        hsl.l = Math.min(hsl.l * 1.2, 1.0);

        // Apply new HSL values
        material.color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    // Add slight emissive glow for a more vibrant look
    if (!material.emissive) {
        material.emissive = new THREE.Color(0x222222);
    } else {
        material.emissive.set(0x222222);
    }

    // Make specular highlights more pronounced for a cartoony sheen
    if (material.shininess !== undefined) {
        material.shininess *= 1.5;
    }

    // Reduce roughness for a more plastic-like appearance
    if (material.roughness !== undefined) {
        material.roughness = Math.max(material.roughness * 0.7, 0.1);
    }

    material.needsUpdate = true;
}
