import * as THREE from 'three';
import { applyOutline } from '../theme/outlineStyles.js';

// Cache for textures to improve performance
const textureCache = new Map();

/**
 * Creates a snow/glacier island at the specified position
 * @param {number} x - X coordinate in world space
 * @param {number} z - Z coordinate in world space
 * @param {number} seed - Random seed for consistent generation
 * @param {THREE.Scene} scene - The scene to add the island to
 * @param {Object} options - Additional options for island generation
 * @returns {Object} The created island object with collider
 */
export function createSnowIsland(x, z, seed, scene, options = {}) {
    // Use the seed to create deterministic randomness for this island
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    // Create a unique ID for this island
    const islandId = `snow_island_${Math.floor(x)}_${Math.floor(z)}`;

    // Island group to hold all parts
    const island = new THREE.Group();
    island.position.set(x, 0, z);
    scene.add(island);

    // Island size - make it bigger than regular islands
    const baseRadius = options.radius || (70 + random() * 30);
    const islandHeight = options.height || (8 + random() * 4);

    // Add island collider
    const collider = {
        center: new THREE.Vector3(x, 0, z),
        radius: baseRadius,
        id: islandId
    };

    // Create base glacier shape
    createGlacierBase(island, baseRadius, islandHeight, random);

    // Add snow features
    addSnowFeatures(island, baseRadius, random);

    // Add ice formations
    addIceFormations(island, baseRadius, random);

    // Add walkable paths
    addWalkablePaths(island, baseRadius, random);

    // Add optional structures based on random chance
    addStructures(island, baseRadius, random);

    // Create island entry to return
    const islandEntry = {
        mesh: island,
        collider: collider,
        visible: true,
        id: islandId
    };

    return islandEntry;
}

/**
 * Create the base glacier shape
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {number} height - Height of the island
 * @param {Function} random - Seeded random function
 */
function createGlacierBase(island, radius, height, random) {
    // Create a slightly irregular shape by using multiple overlapping geometries

    // Main flat disc for the base
    const baseGeometry = new THREE.CylinderGeometry(radius, radius * 1.05, height, 32);
    const baseColor = new THREE.Color(0xc8e0ff); // Slight blue tint for ice
    const baseTexture = createIceTexture(baseColor, 0.7);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: baseColor,
        map: baseTexture,
        bumpMap: baseTexture,
        bumpScale: 0.3,
        transparent: true,
        opacity: 0.9,
        shininess: 70
    });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = height / 2;
    island.add(base);

    // Apply outline to base
    applyOutline(base, { scale: 1.02 });

    // Add snow covering layer on top
    const snowGeometry = new THREE.CylinderGeometry(radius * 0.95, radius, height * 0.2, 32);
    const snowColor = new THREE.Color(0xffffff);
    const snowTexture = createSnowTexture(0.4);
    const snowMaterial = new THREE.MeshPhongMaterial({
        color: snowColor,
        map: snowTexture,
        bumpMap: snowTexture,
        bumpScale: 0.2,
        shininess: 10
    });

    const snowLayer = new THREE.Mesh(snowGeometry, snowMaterial);
    snowLayer.position.y = height + height * 0.1;
    island.add(snowLayer);

    // Apply outline to snow layer
    applyOutline(snowLayer, { scale: 1.05 });

    // Add irregular ice shelf edges around the perimeter
    const shelfCount = Math.floor(3 + random() * 4);
    for (let i = 0; i < shelfCount; i++) {
        const angle = random() * Math.PI * 2;
        const shelfRadius = radius * (0.3 + random() * 0.3);
        const distance = radius * 0.85;

        const shelfGeometry = new THREE.CylinderGeometry(
            shelfRadius,
            shelfRadius * 1.2,
            height * (0.6 + random() * 0.4),
            16
        );

        // Slightly different ice color for variety
        const shelfColor = new THREE.Color(0xadd8e6);
        const shelfMaterial = new THREE.MeshPhongMaterial({
            color: shelfColor,
            map: baseTexture, // Reuse texture
            transparent: true,
            opacity: 0.85,
            shininess: 60
        });

        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(
            Math.cos(angle) * distance,
            height * 0.3,
            Math.sin(angle) * distance
        );

        island.add(shelf);
        applyOutline(shelf, { scale: 1.03 });
    }
}

/**
 * Add snow features like drifts and small hills
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addSnowFeatures(island, radius, random) {
    const snowColor = new THREE.Color(0xffffff);
    const snowTexture = createSnowTexture(0.5);
    const snowMaterial = new THREE.MeshPhongMaterial({
        color: snowColor,
        map: snowTexture,
        bumpMap: snowTexture,
        bumpScale: 0.1,
        shininess: 5
    });

    // Add snow drifts
    const driftCount = Math.floor(5 + random() * 7);
    for (let i = 0; i < driftCount; i++) {
        const angle = random() * Math.PI * 2;
        const distance = radius * (0.1 + random() * 0.7);

        // Create elongated snow drift
        const driftWidth = 5 + random() * 15;
        const driftLength = 8 + random() * 20;
        const driftHeight = 2 + random() * 4;

        const driftGeometry = new THREE.SphereGeometry(1, 16, 12);
        driftGeometry.scale(driftWidth, driftHeight, driftLength);

        const drift = new THREE.Mesh(driftGeometry, snowMaterial);

        // Position the drift
        drift.position.set(
            Math.cos(angle) * distance,
            driftHeight / 2 + 4, // Slightly above base
            Math.sin(angle) * distance
        );

        // Random rotation for natural look
        drift.rotation.y = random() * Math.PI;

        island.add(drift);
    }

    // Add a few larger snow mounds
    const moundCount = Math.floor(2 + random() * 3);
    for (let i = 0; i < moundCount; i++) {
        const angle = random() * Math.PI * 2;
        const distance = radius * (0.1 + random() * 0.5); // More central

        const moundRadius = 8 + random() * 12;
        const moundHeight = 5 + random() * 7;

        const moundGeometry = new THREE.SphereGeometry(moundRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);

        const mound = new THREE.Mesh(moundGeometry, snowMaterial);

        mound.position.set(
            Math.cos(angle) * distance,
            4, // On base
            Math.sin(angle) * distance
        );

        island.add(mound);
        applyOutline(mound, { scale: 1.05 });
    }
}

/**
 * Add decorative ice formations
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addIceFormations(island, radius, random) {
    // Create transparent blue ice material
    const iceColor = new THREE.Color(0x88bfff);
    const iceTexture = createIceTexture(iceColor, 0.8);
    const iceMaterial = new THREE.MeshPhongMaterial({
        color: iceColor,
        map: iceTexture,
        transparent: true,
        opacity: 0.7,
        shininess: 90,
        specular: 0x6699cc
    });

    // Add ice spires/formations in clusters
    const clusterCount = Math.floor(2 + random() * 3);

    for (let c = 0; c < clusterCount; c++) {
        const clusterAngle = random() * Math.PI * 2;
        const clusterDistance = radius * (0.3 + random() * 0.6);
        const clusterX = Math.cos(clusterAngle) * clusterDistance;
        const clusterZ = Math.sin(clusterAngle) * clusterDistance;

        // Add several ice spires in this cluster
        const spireCount = 3 + Math.floor(random() * 4);

        for (let i = 0; i < spireCount; i++) {
            // Vary each spire within the cluster
            const offsetDistance = 5 + random() * 10;
            const offsetAngle = random() * Math.PI * 2;
            const x = clusterX + Math.cos(offsetAngle) * offsetDistance;
            const z = clusterZ + Math.sin(offsetAngle) * offsetDistance;

            // Create jagged ice spire
            const height = 10 + random() * 15;
            const baseWidth = 3 + random() * 5;

            // Use cone geometry for ice spires
            const spireGeometry = new THREE.ConeGeometry(
                baseWidth,
                height,
                5 + Math.floor(random() * 3), // Pentagonal or hexagonal
                1,
                false,
                random() * 0.5 // Random rotation offset
            );

            const spire = new THREE.Mesh(spireGeometry, iceMaterial);

            // Position and orient the spire
            spire.position.set(x, height / 2 + 4, z);
            spire.rotation.y = random() * Math.PI;

            // Add slight random tilt
            spire.rotation.x = (random() - 0.5) * 0.2;
            spire.rotation.z = (random() - 0.5) * 0.2;

            island.add(spire);
            applyOutline(spire, { scale: 1.05, outlineColor: 0xadd8e6 });

            // Sometimes add a smaller spire on top or nearby
            if (random() < 0.6) {
                const smallHeight = height * 0.4;
                const smallWidth = baseWidth * 0.5;

                const smallSpireGeometry = new THREE.ConeGeometry(
                    smallWidth,
                    smallHeight,
                    5,
                    1
                );

                const smallSpire = new THREE.Mesh(smallSpireGeometry, iceMaterial);

                // Position either on top or nearby
                if (random() < 0.5) {
                    // On top
                    smallSpire.position.set(
                        x,
                        height + smallHeight / 2 + 4,
                        z
                    );
                } else {
                    // Nearby
                    const nearbyAngle = random() * Math.PI * 2;
                    const nearbyDistance = baseWidth + 1;
                    smallSpire.position.set(
                        x + Math.cos(nearbyAngle) * nearbyDistance,
                        smallHeight / 2 + 4,
                        z + Math.sin(nearbyAngle) * nearbyDistance
                    );
                }

                smallSpire.rotation.y = random() * Math.PI;

                island.add(smallSpire);
                applyOutline(smallSpire, { scale: 1.05, outlineColor: 0xadd8e6 });
            }
        }
    }

    // Add horizontal ice crystals/formations
    const crystalCount = Math.floor(3 + random() * 4);
    for (let i = 0; i < crystalCount; i++) {
        const angle = random() * Math.PI * 2;
        const distance = radius * (0.6 + random() * 0.3); // More toward edges

        // Create horizontal crystal cluster
        const crystalSize = 3 + random() * 4;

        // Create cluster of boxes at different angles
        const clusterObj = new THREE.Group();

        const pieces = 3 + Math.floor(random() * 3);
        for (let p = 0; p < pieces; p++) {
            const boxWidth = crystalSize * (0.3 + random() * 0.7);
            const boxHeight = crystalSize * (0.2 + random() * 0.4);
            const boxDepth = crystalSize * (0.3 + random() * 0.7);

            const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
            const crystal = new THREE.Mesh(boxGeometry, iceMaterial);

            // Random position within cluster
            crystal.position.set(
                (random() - 0.5) * crystalSize,
                (random() - 0.5) * crystalSize * 0.3,
                (random() - 0.5) * crystalSize
            );

            // Random rotation for jagged look
            crystal.rotation.set(
                random() * Math.PI * 0.3,
                random() * Math.PI,
                random() * Math.PI * 0.3
            );

            clusterObj.add(crystal);
            applyOutline(crystal, { scale: 1.05, outlineColor: 0xadd8e6 });
        }

        // Position the entire cluster
        clusterObj.position.set(
            Math.cos(angle) * distance,
            4 + random() * 2, // Slightly above base
            Math.sin(angle) * distance
        );

        island.add(clusterObj);
    }
}

/**
 * Add walkable paths across the island
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addWalkablePaths(island, radius, random) {
    // Create a trampled snow texture/material that looks slightly darker
    const pathColor = new THREE.Color(0xeeeeee);
    const pathTexture = createSnowTexture(0.3, true);
    const pathMaterial = new THREE.MeshPhongMaterial({
        color: pathColor,
        map: pathTexture,
        bumpMap: pathTexture,
        bumpScale: 0.05,
        shininess: 10
    });

    // Create a central clearing
    const clearingRadius = radius * 0.25;
    const clearingGeometry = new THREE.CircleGeometry(clearingRadius, 32);
    const clearing = new THREE.Mesh(clearingGeometry, pathMaterial);
    clearing.rotation.x = -Math.PI / 2; // Lay flat
    clearing.position.y = 4.1; // Slightly above base to prevent z-fighting
    island.add(clearing);

    // Create 2-4 paths radiating from center
    const pathCount = 2 + Math.floor(random() * 3);

    for (let i = 0; i < pathCount; i++) {
        const pathAngle = (i / pathCount) * Math.PI * 2;
        const pathWidth = 5 + random() * 3;
        const pathLength = radius * 0.8;

        // Create a curved path using a custom shape
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(
                Math.cos(pathAngle + (random() - 0.5) * 0.5) * pathLength * 0.5,
                0,
                Math.sin(pathAngle + (random() - 0.5) * 0.5) * pathLength * 0.5
            ),
            new THREE.Vector3(
                Math.cos(pathAngle) * pathLength,
                0,
                Math.sin(pathAngle) * pathLength
            )
        );

        const points = curve.getPoints(20);

        // Create a geometry that follows the curve
        for (let j = 0; j < points.length - 1; j++) {
            const direction = new THREE.Vector3().subVectors(points[j + 1], points[j]).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);

            // Create a small segment
            const segmentGeometry = new THREE.PlaneGeometry(
                points[j].distanceTo(points[j + 1]),
                pathWidth
            );
            const segment = new THREE.Mesh(segmentGeometry, pathMaterial);

            // Position segment
            segment.position.set(
                (points[j].x + points[j + 1].x) / 2,
                4.1, // Slightly above ground
                (points[j].z + points[j + 1].z) / 2
            );

            // Orient segment along path
            segment.rotation.x = -Math.PI / 2; // Lay flat
            segment.rotation.z = Math.atan2(direction.z, direction.x) + Math.PI / 2;

            island.add(segment);
        }
    }
}

/**
 * Add various structures to the island
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addStructures(island, radius, random) {
    // Decide which structures to add based on random chance
    const structureType = Math.floor(random() * 3); // 0-2 different types

    switch (structureType) {
        case 0:
            addIceCastle(island, radius, random);
            break;
        case 1:
            addResearchStation(island, radius, random);
            break;
        case 2:
            addIceSculptures(island, radius, random);
            break;
    }
}

/**
 * Add an ice castle structure
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addIceCastle(island, radius, random) {
    // Create castle ice material (slightly blue and transparent)
    const castleColor = new THREE.Color(0x99ccff);
    const castleTexture = createIceTexture(castleColor, 0.9);
    const castleMaterial = new THREE.MeshPhongMaterial({
        color: castleColor,
        map: castleTexture,
        transparent: true,
        opacity: 0.8,
        shininess: 80,
        specular: 0x6699cc
    });

    // Create castle base
    const baseSize = 25 + random() * 10;
    const baseHeight = 8 + random() * 4;
    const baseGeometry = new THREE.BoxGeometry(baseSize, baseHeight, baseSize);
    const base = new THREE.Mesh(baseGeometry, castleMaterial);
    base.position.y = baseHeight / 2 + 4;

    // Create towers
    const towerCount = 3 + Math.floor(random() * 2); // 3-4 towers
    const towerRadius = 5 + random() * 2;
    const towerHeight = 20 + random() * 10;

    for (let i = 0; i < towerCount; i++) {
        const angle = (i / towerCount) * Math.PI * 2;
        const distance = baseSize / 2 - towerRadius / 2;

        const towerGeometry = new THREE.CylinderGeometry(
            towerRadius * 0.7,
            towerRadius,
            towerHeight,
            8
        );

        const tower = new THREE.Mesh(towerGeometry, castleMaterial);

        tower.position.set(
            Math.cos(angle) * distance,
            towerHeight / 2 + baseHeight + 4,
            Math.sin(angle) * distance
        );

        // Add conical roof to tower
        const roofHeight = towerRadius * 2;
        const roofGeometry = new THREE.ConeGeometry(towerRadius * 1.2, roofHeight, 8);
        const roof = new THREE.Mesh(roofGeometry, castleMaterial);

        roof.position.y = towerHeight / 2 + roofHeight / 2;
        tower.add(roof);

        island.add(tower);
        applyOutline(tower, { scale: 1.05, outlineColor: 0xadd8e6 });
        applyOutline(roof, { scale: 1.05, outlineColor: 0xadd8e6 });
    }

    // Add entrance archway
    const entranceWidth = 6 + random() * 2;
    const entranceHeight = 10 + random() * 3;
    const entranceDepth = 3 + random() * 2;

    // Create arch shape by differencing a box and a cylinder
    const entranceOuter = new THREE.BoxGeometry(
        entranceWidth,
        entranceHeight,
        entranceDepth
    );

    const entranceInner = new THREE.CylinderGeometry(
        entranceWidth / 2,
        entranceWidth / 2,
        entranceDepth + 1,
        16,
        1,
        false,
        0,
        Math.PI
    );
    entranceInner.rotateX(Math.PI / 2);
    entranceInner.translate(0, entranceHeight / 4, 0);

    // Create entrance using CSG (constructive solid geometry)
    // Since THREE.js doesn't have built-in CSG, we'll approximate with two meshes
    const entranceBox = new THREE.Mesh(entranceOuter, castleMaterial);
    entranceBox.position.set(0, entranceHeight / 2 + 4, baseSize / 2);

    // Add the entrance to castle
    island.add(entranceBox);
    applyOutline(entranceBox, { scale: 1.05, outlineColor: 0xadd8e6 });

    // Add base to island
    island.add(base);
    applyOutline(base, { scale: 1.05, outlineColor: 0xadd8e6 });

    // Add some decorative ice crystals around the castle
    for (let i = 0; i < 5; i++) {
        const angle = random() * Math.PI * 2;
        const distance = baseSize / 2 + 5 + random() * 10;

        const crystalHeight = 5 + random() * 8;
        const crystalRadius = 1 + random() * 2;

        const crystalGeometry = new THREE.ConeGeometry(
            crystalRadius,
            crystalHeight,
            5, // Pentagonal
            1
        );

        const crystal = new THREE.Mesh(crystalGeometry, castleMaterial);

        crystal.position.set(
            Math.cos(angle) * distance,
            crystalHeight / 2 + 4,
            Math.sin(angle) * distance
        );

        // Random rotation for natural look
        crystal.rotation.y = random() * Math.PI;
        crystal.rotation.x = (random() - 0.5) * 0.2;

        island.add(crystal);
        applyOutline(crystal, { scale: 1.05, outlineColor: 0xadd8e6 });
    }
}

/**
 * Add a research station structure
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addResearchStation(island, radius, random) {
    // Create materials
    const metalColor = new THREE.Color(0x888888);
    const metalTexture = createMetalTexture(metalColor);
    const metalMaterial = new THREE.MeshPhongMaterial({
        color: metalColor,
        map: metalTexture,
        bumpMap: metalTexture,
        bumpScale: 0.1,
        shininess: 60
    });

    // Red accent color for some details
    const accentColor = new THREE.Color(0xff4444);
    const accentMaterial = new THREE.MeshPhongMaterial({
        color: accentColor,
        shininess: 40
    });

    // Create main station building (rounded box shape)
    const buildingWidth = 20 + random() * 5;
    const buildingHeight = 8 + random() * 2;
    const buildingDepth = 15 + random() * 5;

    const buildingGeometry = new THREE.BoxGeometry(
        buildingWidth,
        buildingHeight,
        buildingDepth
    );

    const building = new THREE.Mesh(buildingGeometry, metalMaterial);
    building.position.y = buildingHeight / 2 + 4;

    // Rotate building slightly for interest
    building.rotation.y = random() * Math.PI * 0.25;

    island.add(building);
    applyOutline(building, { scale: 1.03 });

    // Add roof
    const roofGeometry = new THREE.BoxGeometry(
        buildingWidth + 2,
        2,
        buildingDepth + 2
    );

    const roof = new THREE.Mesh(roofGeometry, metalMaterial);
    roof.position.y = buildingHeight + 1 + 4;
    roof.rotation.y = building.rotation.y;

    island.add(roof);
    applyOutline(roof, { scale: 1.03 });

    // Add antenna tower
    const towerHeight = 15 + random() * 5;
    const towerGeometry = new THREE.CylinderGeometry(0.8, 1, towerHeight, 8);
    const tower = new THREE.Mesh(towerGeometry, metalMaterial);

    // Position tower on top of building
    const towerOffsetX = (random() - 0.5) * buildingWidth * 0.5;
    const towerOffsetZ = (random() - 0.5) * buildingDepth * 0.5;

    tower.position.set(
        towerOffsetX,
        buildingHeight + towerHeight / 2 + 2 + 4,
        towerOffsetZ
    );

    tower.rotation.y = building.rotation.y;

    island.add(tower);
    applyOutline(tower, { scale: 1.05 });

    // Add antenna dishes/equipment to tower
    const dishCount = 1 + Math.floor(random() * 3);

    for (let i = 0; i < dishCount; i++) {
        const height = random() * towerHeight * 0.7;
        const dishSize = 2 + random() * 2;

        const dishGeometry = new THREE.SphereGeometry(
            dishSize,
            8, 8,
            0, Math.PI * 2,
            0, Math.PI / 2
        );

        const dish = new THREE.Mesh(dishGeometry, accentMaterial);

        const angle = random() * Math.PI * 2;
        dish.position.set(
            Math.cos(angle) * 0.5,
            height - towerHeight / 2,
            Math.sin(angle) * 0.5
        );

        // Rotate dish to point outward
        dish.rotation.set(
            Math.PI / 2, // Point upward
            0,
            angle + Math.PI // Point away from tower
        );

        tower.add(dish);
        applyOutline(dish, { scale: 1.07 });
    }

    // Add solar panels
    const panelCount = 1 + Math.floor(random() * 2);

    for (let i = 0; i < panelCount; i++) {
        const panelWidth = 10 + random() * 5;
        const panelDepth = 8 + random() * 3;

        const panelGeometry = new THREE.BoxGeometry(
            panelWidth,
            0.5,
            panelDepth
        );

        const panel = new THREE.Mesh(panelGeometry, metalMaterial);

        // Position panels near the building
        const angle = random() * Math.PI * 2;
        const distance = buildingWidth / 2 + 5 + random() * 10;

        panel.position.set(
            Math.cos(angle) * distance,
            2 + 4, // Low to the ground
            Math.sin(angle) * distance
        );

        // Angle panel toward sky at about 45 degrees
        panel.rotation.set(
            Math.PI / 4, // Tilt up
            random() * Math.PI * 2, // Random orientation
            0
        );

        island.add(panel);
        applyOutline(panel, { scale: 1.05 });
    }

    // Add entrance door
    const doorWidth = 4;
    const doorHeight = 6;
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 50
    });

    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    // Position door on building side, accounting for building rotation
    const buildingRotation = building.rotation.y;
    door.position.set(
        Math.sin(buildingRotation) * (buildingDepth / 2 + 0.1),
        doorHeight / 2 + 4,
        Math.cos(buildingRotation) * (buildingDepth / 2 + 0.1)
    );

    door.rotation.y = buildingRotation;

    island.add(door);
    applyOutline(door, { scale: 1.03 });

    // Add some equipment containers
    const containerCount = 2 + Math.floor(random() * 3);

    for (let i = 0; i < containerCount; i++) {
        const containerWidth = 4 + random() * 2;
        const containerHeight = 3 + random() * 2;
        const containerDepth = 6 + random() * 3;

        const containerGeometry = new THREE.BoxGeometry(
            containerWidth,
            containerHeight,
            containerDepth
        );

        // Alternate between metal and accent materials
        const containerMaterial = (i % 2 === 0) ?
            metalMaterial : accentMaterial;

        const container = new THREE.Mesh(containerGeometry, containerMaterial);

        // Position containers near building
        const angle = buildingRotation + Math.PI / 2 + (random() - 0.5) * Math.PI;
        const distance = buildingWidth / 2 + 3 + random() * 8;

        container.position.set(
            Math.cos(angle) * distance,
            containerHeight / 2 + 4,
            Math.sin(angle) * distance
        );

        // Slight random rotation
        container.rotation.y = random() * Math.PI * 0.5;

        island.add(container);
        applyOutline(container, { scale: 1.03 });
    }
}

/**
 * Add ice sculpture decorations
 * @param {THREE.Group} island - The island group to add to
 * @param {number} radius - Base radius of the island
 * @param {Function} random - Seeded random function
 */
function addIceSculptures(island, radius, random) {
    // Create ice material with high transparency
    const sculptureColor = new THREE.Color(0xaaddff);
    const sculptureTexture = createIceTexture(sculptureColor, 0.9);
    const sculptureMaterial = new THREE.MeshPhongMaterial({
        color: sculptureColor,
        map: sculptureTexture,
        transparent: true,
        opacity: 0.7,
        shininess: 90,
        specular: 0xffffff
    });

    // Create a central large sculpture
    const centerSculptureType = Math.floor(random() * 3); // 0-2 types

    if (centerSculptureType === 0) {
        // Create abstract spiral sculpture
        const spiralHeight = 20 + random() * 10;
        const spiralRadius = 3 + random() * 2;

        // Create using a custom parametric curve
        const spiral = new THREE.Group();

        const coils = 3 + Math.floor(random() * 2);
        const pointsPerCoil = 8;
        const totalPoints = coils * pointsPerCoil;

        for (let i = 0; i < totalPoints - 1; i++) {
            const t1 = i / totalPoints;
            const t2 = (i + 1) / totalPoints;

            // Parametric equation for spiral
            const angle1 = t1 * Math.PI * 2 * coils;
            const angle2 = t2 * Math.PI * 2 * coils;

            const radius1 = spiralRadius;
            const radius2 = spiralRadius;

            const height1 = t1 * spiralHeight;
            const height2 = t2 * spiralHeight;

            // Position points
            const point1 = new THREE.Vector3(
                Math.cos(angle1) * radius1,
                height1,
                Math.sin(angle1) * radius1
            );

            const point2 = new THREE.Vector3(
                Math.cos(angle2) * radius2,
                height2,
                Math.sin(angle2) * radius2
            );

            // Create cylinder segment between points
            const segmentLength = point1.distanceTo(point2);
            const segmentRadius = 1 + (1 - t1) * 1.5; // Thicker at bottom

            const segmentGeometry = new THREE.CylinderGeometry(
                segmentRadius,
                segmentRadius * 1.1,
                segmentLength,
                8
            );

            const segment = new THREE.Mesh(segmentGeometry, sculptureMaterial);

            // Position and orient segment
            const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
            segment.position.copy(midpoint);

            // Orient along the spiral
            segment.lookAt(point2);
            segment.rotateX(Math.PI / 2);

            spiral.add(segment);
        }

        // Add entire spiral to scene
        spiral.position.y = 4;
        island.add(spiral);

        // Add a base plate
        const baseGeometry = new THREE.CylinderGeometry(
            spiralRadius * 2,
            spiralRadius * 2.5,
            2,
            16
        );

        const base = new THREE.Mesh(baseGeometry, sculptureMaterial);
        base.position.y = 1 + 4;

        island.add(base);
        applyOutline(base, { scale: 1.03, outlineColor: 0xadd8e6 });

    } else if (centerSculptureType === 1) {
        // Create geometric crystal formation
        const crystalHeight = 15 + random() * 10;
        const crystalWidth = 8 + random() * 5;

        const crystal = new THREE.Group();

        // Create several geometric shapes combined
        const partCount = 4 + Math.floor(random() * 4);

        for (let i = 0; i < partCount; i++) {
            // Vary size and shape of each segment
            const segmentHeight = 5 + random() * 15;
            const segmentWidth = 3 + random() * (crystalWidth * 0.8);

            // Create different geometric shapes
            let geometry;
            const shapeType = Math.floor(random() * 3);

            if (shapeType === 0) {
                // Angled box crystal
                geometry = new THREE.BoxGeometry(segmentWidth, segmentHeight, segmentWidth);
            } else if (shapeType === 1) {
                // Diamond/pyramid crystal
                geometry = new THREE.ConeGeometry(segmentWidth * 0.7, segmentHeight, 4);
            } else {
                // Hexagonal pillar
                geometry = new THREE.CylinderGeometry(segmentWidth * 0.6, segmentWidth * 0.5, segmentHeight, 6);
            }

            const segment = new THREE.Mesh(geometry, sculptureMaterial);

            // Position in cluster - angled and varied positions
            const angle = (i / partCount) * Math.PI * 2;
            const distance = i === 0 ? 0 : crystalWidth * 0.3;

            segment.position.set(
                Math.cos(angle) * distance,
                (i === 0 ? 0 : random() * crystalHeight * 0.4),
                Math.sin(angle) * distance
            );

            // Rotate for variety
            segment.rotation.set(
                (random() - 0.5) * 0.5,
                random() * Math.PI,
                (random() - 0.5) * 0.5
            );

            crystal.add(segment);
            applyOutline(segment, { scale: 1.05, outlineColor: 0xadd8e6 });
        }

        // Add crystal to island at center
        crystal.position.set(0, crystalHeight / 2 + 4, 0);
        island.add(crystal);

    } else {
        // Case 2: Create arctic animal ice sculptures
        const sculptureCount = 2 + Math.floor(random() * 3);

        for (let i = 0; i < sculptureCount; i++) {
            // Choose a sculpture type
            const sculptureType = Math.floor(random() * 3); // 0-2 types
            let sculpture;

            if (sculptureType === 0) {
                // Polar bear sculpture
                sculpture = createPolarBearSculpture(sculptureMaterial, random);
            } else if (sculptureType === 1) {
                // Seal sculpture
                sculpture = createSealSculpture(sculptureMaterial, random);
            } else {
                // Abstract form
                sculpture = createAbstractSculpture(sculptureMaterial, random);
            }

            // Position on the island
            const angle = random() * Math.PI * 2;
            const distance = radius * (0.1 + random() * 0.6);

            sculpture.position.set(
                Math.cos(angle) * distance,
                4,
                Math.sin(angle) * distance
            );

            // Random rotation
            sculpture.rotation.y = random() * Math.PI * 2;

            island.add(sculpture);
        }
    }

    // Regardless of central sculpture, add some small scattered ice art pieces
    const smallSculptureCount = 3 + Math.floor(random() * 4);

    for (let i = 0; i < smallSculptureCount; i++) {
        const smallSize = 3 + random() * 5;

        // Simple geometric forms
        const geometry = new THREE.TetrahedronGeometry(smallSize);
        const smallSculpture = new THREE.Mesh(geometry, sculptureMaterial);

        // Position around the island
        const angle = random() * Math.PI * 2;
        const distance = radius * (0.3 + random() * 0.6);

        smallSculpture.position.set(
            Math.cos(angle) * distance,
            smallSize / 2 + 4,
            Math.sin(angle) * distance
        );

        // Random rotation for variety
        smallSculpture.rotation.set(
            random() * Math.PI,
            random() * Math.PI,
            random() * Math.PI
        );

        island.add(smallSculpture);
        applyOutline(smallSculpture, { scale: 1.05, outlineColor: 0xadd8e6 });
    }
}

/**
 * Creates a simplistic polar bear ice sculpture
 * @param {THREE.Material} material - Material to use
 * @param {Function} random - Seeded random function
 * @returns {THREE.Group} The sculpture group
 */
function createPolarBearSculpture(material, random) {
    const bear = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(5, 12, 10);
    bodyGeometry.scale(1.5, 1, 1.2);
    const body = new THREE.Mesh(bodyGeometry, material);
    bear.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(3, 12, 10);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.set(6, 2, 0);
    bear.add(head);

    // Snout
    const snoutGeometry = new THREE.ConeGeometry(1.5, 3, 10);
    const snout = new THREE.Mesh(snoutGeometry, material);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(8, 1.5, 0);
    bear.add(snout);

    // Legs
    const legPositions = [
        [-4, -4, -3], [-4, -4, 3], [4, -4, -3], [4, -4, 3]
    ];

    legPositions.forEach(pos => {
        const legGeometry = new THREE.CylinderGeometry(1.5, 2, 4, 8);
        const leg = new THREE.Mesh(legGeometry, material);
        leg.position.set(pos[0], pos[1], pos[2]);
        bear.add(leg);
    });

    // Apply outlines to all parts
    bear.children.forEach(part => {
        applyOutline(part, { scale: 1.05, outlineColor: 0xadd8e6 });
    });

    return bear;
}

/**
 * Creates a simplistic seal ice sculpture
 * @param {THREE.Material} material - Material to use
 * @param {Function} random - Seeded random function
 * @returns {THREE.Group} The sculpture group
 */
function createSealSculpture(material, random) {
    const seal = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(4, 12, 10);
    bodyGeometry.scale(2.5, 1, 1);
    const body = new THREE.Mesh(bodyGeometry, material);
    seal.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(2.5, 12, 10);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.set(5, 1, 0);
    seal.add(head);

    // Tail
    const tailGeometry = new THREE.ConeGeometry(2, 4, 8);
    tailGeometry.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeometry, material);
    tail.position.set(-6, 0, 0);
    seal.add(tail);

    // Flippers
    const flipperGeometry = new THREE.CylinderGeometry(1, 2, 5, 8);
    flipperGeometry.scale(0.5, 1, 1);

    const leftFlipper = new THREE.Mesh(flipperGeometry, material);
    leftFlipper.rotation.set(0, 0, Math.PI / 4);
    leftFlipper.position.set(0, 0, 4);
    seal.add(leftFlipper);

    const rightFlipper = new THREE.Mesh(flipperGeometry.clone(), material);
    rightFlipper.rotation.set(0, 0, -Math.PI / 4);
    rightFlipper.position.set(0, 0, -4);
    seal.add(rightFlipper);

    // Apply outlines
    seal.children.forEach(part => {
        applyOutline(part, { scale: 1.05, outlineColor: 0xadd8e6 });
    });

    return seal;
}

/**
 * Creates an abstract ice sculpture form
 * @param {THREE.Material} material - Material to use
 * @param {Function} random - Seeded random function
 * @returns {THREE.Group} The sculpture group
 */
function createAbstractSculpture(material, random) {
    const abstract = new THREE.Group();

    // Create a twisting spire with random elements
    const segments = 5 + Math.floor(random() * 5);
    const baseSize = 4 + random() * 3;

    for (let i = 0; i < segments; i++) {
        // Get progressively smaller
        const t = i / (segments - 1);
        const size = baseSize * (1 - t * 0.7);

        // Choose a random shape
        const shapeType = Math.floor(random() * 3);
        let geometry;

        if (shapeType === 0) {
            geometry = new THREE.BoxGeometry(size, size, size);
        } else if (shapeType === 1) {
            geometry = new THREE.SphereGeometry(size * 0.8, 8, 8);
        } else {
            geometry = new THREE.TetrahedronGeometry(size);
        }

        const segment = new THREE.Mesh(geometry, material);

        // Position with a twisting effect
        const height = i * 3;
        const angle = i * (Math.PI / 4);
        const radius = 2 * Math.sin(t * Math.PI);

        segment.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );

        // Random rotation
        segment.rotation.set(
            random() * Math.PI,
            random() * Math.PI,
            random() * Math.PI
        );

        abstract.add(segment);
        applyOutline(segment, { scale: 1.05, outlineColor: 0xadd8e6 });
    }

    return abstract;
}

/**
 * Creates a texture for ice with cracks and variations
 * @param {THREE.Color} baseColor - Base color of the ice
 * @param {number} roughness - How rough the ice appears (0-1)
 * @returns {THREE.Texture} Generated texture
 */
function createIceTexture(baseColor, roughness) {
    // Use cached texture if available
    const cacheKey = `ice_${baseColor.getHexString()}_${roughness}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill with base color
    ctx.fillStyle = `#${baseColor.getHexString()}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add ice crystalline structure - linear cracks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + Math.random() * 1;

        // Start point
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;

        ctx.moveTo(startX, startY);

        // Create branching cracks
        let x = startX;
        let y = startY;
        const segments = 2 + Math.floor(Math.random() * 4);

        for (let j = 0; j < segments; j++) {
            x += (Math.random() - 0.5) * 100;
            y += (Math.random() - 0.5) * 100;
            ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    // Add darker areas for depth
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 10 + Math.random() * 40;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(150, 200, 255, ${roughness * 0.4})`);
        gradient.addColorStop(1, 'rgba(150, 200, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add bright reflective spots
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 5 + Math.random() * 15;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Cache the texture
    textureCache.set(cacheKey, texture);

    return texture;
}

/**
 * Creates a snow texture with subtle variations
 * @param {number} roughness - How rough the snow appears (0-1)
 * @param {boolean} trampled - Whether this is trampled snow (for paths)
 * @returns {THREE.Texture} Generated texture
 */
function createSnowTexture(roughness = 0.5, trampled = false) {
    // Use cached texture if available
    const cacheKey = `snow_${roughness}_${trampled ? 'trampled' : 'pristine'}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color - white for pristine snow, slightly darker for trampled
    const baseColorValue = trampled ? 235 : 255;
    ctx.fillStyle = `rgb(${baseColorValue}, ${baseColorValue}, ${baseColorValue})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add snow grain texture
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 1.5;

        // Vary shades for snow crystals
        const shade = 200 + Math.floor(Math.random() * 55);
        ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${roughness * 0.2})`;
        ctx.fillRect(x, y, size, size);
    }

    // Add subtle shadows and dimension
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 20 + Math.random() * 60;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

        if (Math.random() > 0.7) {
            // Darker areas (depressions)
            gradient.addColorStop(0, `rgba(200, 220, 240, ${roughness * 0.15})`);
            gradient.addColorStop(1, 'rgba(200, 220, 240, 0)');
        } else {
            // Lighter areas (mounds)
            gradient.addColorStop(0, `rgba(255, 255, 255, ${roughness * 0.2})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // For trampled snow, add footprint-like impressions
    if (trampled) {
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = 15 + Math.random() * 15;
            const height = width * (0.4 + Math.random() * 0.3);
            const angle = Math.random() * Math.PI;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            // Draw trampled impression
            ctx.fillStyle = 'rgba(180, 190, 200, 0.15)';
            ctx.beginPath();
            ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Cache the texture
    textureCache.set(cacheKey, texture);

    return texture;
}

/**
 * Creates a metal texture for station buildings
 * @param {THREE.Color} baseColor - Base color of the metal
 * @returns {THREE.Texture} Generated texture
 */
function createMetalTexture(baseColor) {
    // Use cached texture if available
    const cacheKey = `metal_${baseColor.getHexString()}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill with base color
    ctx.fillStyle = `#${baseColor.getHexString()}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add fine grain texture
    for (let i = 0; i < 30000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;

        // Random opacity for subtle effect
        const opacity = Math.random() * 0.03;

        // Mix of dark and light dots
        if (Math.random() > 0.5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        }

        ctx.fillRect(x, y, 1, 1);
    }

    // Add some scratches
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + Math.random() * 0.5;

        // Start point
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;

        ctx.moveTo(startX, startY);

        // Create a scratch with a slight curve
        const length = 20 + Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        const curve = (Math.random() - 0.5) * 20;

        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        const controlX = (startX + endX) / 2 + Math.cos(angle + Math.PI / 2) * curve;
        const controlY = (startY + endY) / 2 + Math.sin(angle + Math.PI / 2) * curve;

        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();
    }

    // Add some panel seams/rivets for industrial look
    const panelSize = 64;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;

    // Vertical seams
    for (let x = 0; x < canvas.width; x += panelSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        // Add rivets along seam
        for (let y = 10; y < canvas.height; y += 20) {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.2)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Highlight on rivets
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(x + 0.5, y - 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Horizontal seams
    for (let y = 0; y < canvas.height; y += panelSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        // Add rivets along seam
        for (let x = 10; x < canvas.width; x += 20) {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.2)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Highlight on rivets
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(x + 0.5, y - 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Cache the texture
    textureCache.set(cacheKey, texture);

    return texture;
}