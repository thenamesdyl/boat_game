import * as THREE from 'three';

// Cache for shore meshes
const shoreCache = new Map();

/**
 * Creates a cartoony shore effect around an island
 * @param {Object} island - The island object
 * @param {Object} collider - The island's collision information
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {Object} The shore group and animation function
 */
export function createShoreEffect(island, collider, scene) {
    // Get unique ID for this shore
    const shoreId = `shore_${collider.id}`;

    // If this shore already exists in the cache, return it
    if (shoreCache.has(shoreId)) {
        return shoreCache.get(shoreId);
    }

    // Shore group to hold all shore elements
    const shoreGroup = new THREE.Group();

    // Get island position and radius
    const { center, radius } = collider;
    const islandRadius = radius;

    // Create inner shore (wave foam)
    const innerShoreWidth = 6;
    const innerRingGeometry = new THREE.RingGeometry(
        islandRadius - 0.5, // Inner radius slightly inside island edge
        islandRadius + innerShoreWidth, // Outer radius extends out from island
        32, // More segments for smoother circle
        1,  // Radial segments
        0,  // Start angle
        Math.PI * 2 // End angle (full circle)
    );

    // Create a material with foam-like appearance
    const innerShoreMaterial = new THREE.MeshBasicMaterial({
        color: 0xc2f0ff, // Light blue-white foam color
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });

    // Create the inner shore mesh
    const innerShore = new THREE.Mesh(innerRingGeometry, innerShoreMaterial);

    // Position at water level, flat on the water
    innerShore.rotation.x = -Math.PI / 2;
    innerShore.position.y = 0.1; // Just above water level
    shoreGroup.add(innerShore);

    // Create outer shore (subtle foam extension)
    const outerShoreWidth = 4;
    const outerRingGeometry = new THREE.RingGeometry(
        islandRadius + innerShoreWidth - 0.5, // Start where inner shore ends (with slight overlap)
        islandRadius + innerShoreWidth + outerShoreWidth, // Extend further out
        24, // Fewer segments for outer ring (performance)
        1,
        0,
        Math.PI * 2
    );

    // Create more transparent material for outer shore
    const outerShoreMaterial = new THREE.MeshBasicMaterial({
        color: 0xdaf5ff, // Even lighter blue
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });

    // Create the outer shore mesh
    const outerShore = new THREE.Mesh(outerRingGeometry, outerShoreMaterial);

    // Position slightly lower than inner shore
    outerShore.rotation.x = -Math.PI / 2;
    outerShore.position.y = 0.05;
    shoreGroup.add(outerShore);

    // Position shore group at island center
    shoreGroup.position.set(center.x, 0, center.z);

    // Add to scene
    scene.add(shoreGroup);

    // Create animation data for shore
    const animationData = {
        time: 0,
        innerScale: 1,
        outerScale: 1,
        innerRotation: 0,
        outerRotation: 0
    };

    // Animation function for the shore
    const animate = (deltaTime) => {
        // Update time
        animationData.time += deltaTime * 0.4; // Control animation speed

        // Subtle breathing effect for inner shore
        const innerBreathing = Math.sin(animationData.time * 0.5) * 0.03 + 1; // ±3% size change
        innerShore.scale.set(innerBreathing, 1, innerBreathing);

        // Subtle breathing and rotation for outer shore
        const outerBreathing = Math.sin(animationData.time * 0.3 + 0.5) * 0.05 + 1; // ±5% size change
        outerShore.scale.set(outerBreathing, 1, outerBreathing);

        // Very slight counter-rotation of the shores for wave-like effect
        innerShore.rotation.z = Math.sin(animationData.time * 0.2) * 0.02;
        outerShore.rotation.z = Math.sin(animationData.time * 0.15 + 0.5) * 0.015;
    };

    // Create shore object with mesh and animation function
    const shore = {
        group: shoreGroup,
        animate: animate,
        visible: true
    };

    // Cache this shore for future reference
    shoreCache.set(shoreId, shore);

    return shore;
}

/**
 * Updates all active shores
 * @param {number} deltaTime - Time since last frame in seconds
 */
export function updateShores(deltaTime) {
    // Animate all shores in the cache
    shoreCache.forEach(shore => {
        if (shore.visible) {
            shore.animate(deltaTime);
        }
    });
}

/**
 * Sets visibility of a shore
 * @param {string} islandId - ID of the island
 * @param {boolean} visible - Whether the shore should be visible
 */
export function setShoreVisibility(islandId, visible) {
    const shoreId = `shore_${islandId}`;
    if (shoreCache.has(shoreId)) {
        const shore = shoreCache.get(shoreId);
        shore.group.visible = visible;
        shore.visible = visible;
    }
}

/**
 * Removes a shore from the scene and cache
 * @param {string} islandId - ID of the island
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function removeShore(islandId, scene) {
    const shoreId = `shore_${islandId}`;
    if (shoreCache.has(shoreId)) {
        const shore = shoreCache.get(shoreId);
        scene.remove(shore.group);
        shoreCache.delete(shoreId);
    }
}

/**
 * Clears all shores from the scene and cache
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function clearAllShores(scene) {
    shoreCache.forEach(shore => {
        scene.remove(shore.group);
    });
    shoreCache.clear();
} 