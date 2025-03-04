import * as THREE from 'three';

// Island generation variables
let islandColliders = [];
const visibleDistance = 2000; // Distance to see islands from
const chunkSize = 600; // Size of each "chunk" of ocean
const islandsPerChunk = 3; // Islands per chunk
const maxViewDistance = 5; // How far to render islands

// Store generated chunks
const generatedChunks = new Set();
const activeIslands = new Map(); // Maps island ID to island object
const activeWaterChunks = new Map(); // Maps water chunk ID to water mesh

// Cache for structure textures to improve performance
const structureTextureCache = {};

// Function to generate a chunk key based on coordinates
function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

// Function to determine which chunk coordinates contain a given position
function getChunkCoords(x, z) {
    return {
        x: Math.floor(x / chunkSize),
        z: Math.floor(z / chunkSize)
    };
}

// Function to create a water chunk at specified coordinates
function createWaterChunk(chunkX, chunkZ, scene, waterShader) {
    const chunkKey = getChunkKey(chunkX, chunkZ);

    // Skip if this water chunk already exists
    if (activeWaterChunks.has(chunkKey)) {
        return;
    }

    // Create water geometry for this chunk - using fewer segments for better performance
    const waterGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 16, 16);

    // Create water material using the shader
    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: waterShader.uniforms,
        vertexShader: waterShader.vertexShader,
        fragmentShader: waterShader.fragmentShader,
        side: THREE.DoubleSide,
    });

    // Create water mesh
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;

    // Position the water chunk correctly in the world
    water.position.set(
        chunkX * chunkSize + chunkSize / 2,
        0,
        chunkZ * chunkSize + chunkSize / 2
    );

    // Add to scene
    //scene.add(water);

    // Store in active water chunks
    activeWaterChunks.set(chunkKey, water);

    return water;
}

// Function to generate islands in a chunk based on chunk coordinates
function generateChunk(chunkX, chunkZ, scene) {
    const chunkKey = getChunkKey(chunkX, chunkZ);

    // Skip if this chunk has already been generated
    if (generatedChunks.has(chunkKey)) {
        return;
    }

    // Add to set of generated chunks
    generatedChunks.add(chunkKey);

    // Use chunk coordinates as seed for deterministic generation
    // Use large prime numbers to avoid patterns in the generation
    let chunkSeed = Math.abs(chunkX * 73856093 ^ chunkZ * 19349663);

    // Create a simple deterministic random function for this chunk
    const seededRandom = () => {
        chunkSeed = (chunkSeed * 9301 + 49297) % 233280;
        return chunkSeed / 233280;
    };

    // Generate islands for this chunk
    for (let i = 0; i < islandsPerChunk; i++) {
        // Generate position within this chunk, but avoid edges to prevent islands from being too close to chunk boundaries
        const margin = 100; // Margin from chunk edges
        const islandX = (chunkX * chunkSize) + margin + seededRandom() * (chunkSize - 2 * margin);
        const islandZ = (chunkZ * chunkSize) + margin + seededRandom() * (chunkSize - 2 * margin);

        // Create a seed for this specific island based on its coordinates
        const islandSeed = Math.floor(islandX * 13371 + islandZ * 92717);

        // Create the island
        createIsland(islandX, islandZ, islandSeed, scene);
    }
}

// Function to create a single island with specified parameters
function createIsland(x, z, seed, scene) {
    // Use the seed to create deterministic randomness for this island
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    // Create a unique ID for this island
    const islandId = `island_${Math.floor(x)}_${Math.floor(z)}`;

    // Skip if this island already exists
    if (activeIslands.has(islandId)) {
        return;
    }

    // Island group to hold all parts
    const island = new THREE.Group();
    island.position.set(x, 0, z);
    scene.add(island);

    // Add island collider
    const collider = {
        center: new THREE.Vector3(x, 0, z),
        radius: 50, // Island radius
        id: islandId
    };
    islandColliders.push(collider);

    // Beach
    const beachGeometry = new THREE.CylinderGeometry(50, 55, 5, 64);
    const beachColor = new THREE.Color().setHSL(0.12 + random() * 0.05, 0.9, 0.7);
    const beachMaterial = new THREE.MeshPhongMaterial({ color: beachColor });
    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.position.y = 0;
    island.add(beach);

    // Create a palette of vibrant colors for this island
    const islandPalette = [
        new THREE.Color().setHSL(random(), 0.85, 0.6),
        new THREE.Color().setHSL(random(), 0.9, 0.7),
        new THREE.Color().setHSL(random(), 0.8, 0.5)
    ];

    // Determine if this island should have a mega structure (roughly 20% chance)
    const hasMegaStructure = random() < 0.2;

    if (hasMegaStructure) {
        // Choose a type of mega structure
        const structureType = Math.floor(random() * 4); // 0-3 different types

        switch (structureType) {
            case 0: // Ancient Temple
                createAncientTemple(island, random);
                break;
            case 1: // Lighthouse
                createLighthouse(island, random);
                break;
            case 2: // Giant Statue
                createGiantStatue(island, random);
                break;
            case 3: // Ruined Tower
                createRuinedTower(island, random);
                break;
        }
    } else {
        // Regular island with temple structures if no mega structure

        for (let p = 0; p < 1; p++) {
            const templeSize = 15 + random() * 15;
            const templeHeight = 15 + random() * 20;

            // Create a temple group
            const temple = new THREE.Group();

            // Create a stepped pyramid/ziggurat style temple
            const levels = 3 + Math.floor(random() * 3); // 3-5 levels
            const baseWidth = templeSize;
            const topWidth = templeSize * 0.3;
            const levelHeight = templeHeight / levels;

            // Create temple texture
            const templeColor = islandPalette[p % islandPalette.length];
            const templeTexture = createStoneTexture(templeColor, 0.5);

            // Create each level of the temple
            for (let i = 0; i < levels; i++) {
                // Calculate the width of this level (decreasing as we go up)
                const t = i / (levels - 1); // 0 to 1
                const width = baseWidth * (1 - t) + topWidth * t;

                // Create the level geometry
                const levelGeometry = new THREE.BoxGeometry(width, levelHeight, width);
                const levelMaterial = new THREE.MeshPhongMaterial({
                    color: templeColor,
                    map: templeTexture,
                    shininess: 10
                });

                const level = new THREE.Mesh(levelGeometry, levelMaterial);
                level.position.y = i * levelHeight + levelHeight / 2;
                temple.add(level);
            }

            // Add a small shrine/structure on top for some variation
            if (random() < 0.7) { // 70% chance of having a top structure
                const topStructureType = Math.floor(random() * 3);

                if (topStructureType === 0) {
                    // Small dome
                    const domeGeometry = new THREE.SphereGeometry(topWidth * 0.5, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
                    const domeMaterial = new THREE.MeshPhongMaterial({
                        color: templeColor.clone().multiplyScalar(1.2), // Slightly lighter
                        map: templeTexture
                    });
                    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
                    dome.position.y = levels * levelHeight;
                    temple.add(dome);
                } else if (topStructureType === 1) {
                    // Small pillars in a square
                    const pillarRadius = topWidth * 0.1;
                    const pillarHeight = levelHeight * 0.8;
                    const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 6);
                    const pillarMaterial = new THREE.MeshPhongMaterial({
                        color: templeColor,
                        map: templeTexture
                    });

                    // Add pillars at corners
                    const offset = topWidth * 0.3;
                    const positions = [
                        [-offset, 0, -offset],
                        [-offset, 0, offset],
                        [offset, 0, -offset],
                        [offset, 0, offset]
                    ];

                    for (const pos of positions) {
                        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
                        pillar.position.set(pos[0], levels * levelHeight + pillarHeight / 2, pos[2]);
                        temple.add(pillar);
                    }

                    // Small roof
                    const roofGeometry = new THREE.BoxGeometry(topWidth * 0.8, levelHeight * 0.2, topWidth * 0.8);
                    const roof = new THREE.Mesh(roofGeometry, pillarMaterial);
                    roof.position.y = levels * levelHeight + pillarHeight + levelHeight * 0.1;
                    temple.add(roof);
                } else {
                    // Obelisk
                    const obeliskWidth = topWidth * 0.25;
                    const obeliskHeight = levelHeight * 1.5;
                    const obeliskGeometry = new THREE.CylinderGeometry(0, obeliskWidth, obeliskHeight, 4);
                    const obeliskMaterial = new THREE.MeshPhongMaterial({
                        color: templeColor.clone().multiplyScalar(0.8), // Slightly darker
                        map: templeTexture
                    });
                    const obelisk = new THREE.Mesh(obeliskGeometry, obeliskMaterial);
                    obelisk.position.y = levels * levelHeight + obeliskHeight / 2;
                    temple.add(obelisk);
                }
            }

            // Position the temple on the island
            const templeAngle = random() * Math.PI * 2;
            const templeDistance = random() * 25;
            temple.position.set(
                Math.cos(templeAngle) * templeDistance,
                2.5,
                Math.sin(templeAngle) * templeDistance
            );

            // Add some rotation for variety
            temple.rotation.y = random() * Math.PI * 2;

            island.add(temple);
        }
    }

    // Vegetation (always add some trees regardless of structure)

    for (let v = 0; v < 2; v++) {
        // Create a tree group to hold trunk and foliage
        const tree = new THREE.Group();

        // Random tree properties with variation
        const treeHeight = 10 + random() * 8;
        const trunkHeight = treeHeight * 0.6;
        const trunkRadius = 0.5 + random() * 0.3;
        const foliageRadius = 3 + random() * 3;
        const foliageHeight = treeHeight - trunkHeight;

        // Tree type variation (0: cone, 1: rounded)
        const treeType = random() < 0.7 ? 0 : 1;

        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
        const trunkColor = new THREE.Color().setHSL(0.07 + random() * 0.05, 0.5 + random() * 0.2, 0.2 + random() * 0.1);
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: trunkColor });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        // Create foliage
        let foliageGeometry;
        if (treeType === 0) {
            // Cone-shaped foliage (palm-like)
            foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
        } else {
            // Rounded foliage (deciduous-like)
            foliageGeometry = new THREE.SphereGeometry(foliageRadius, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.8);
        }

        const foliageColor = new THREE.Color().setHSL(0.25 + random() * 0.15, 0.8, 0.3 + random() * 0.2);
        const foliageMaterial = new THREE.MeshPhongMaterial({ color: foliageColor });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);

        // Position foliage on top of trunk
        foliage.position.y = trunkHeight + (treeType === 0 ? foliageHeight / 2 : 0);
        if (treeType === 1) {
            // Move rounded foliage slightly up so it sits better on trunk
            foliage.position.y += foliageHeight / 4;
        }

        tree.add(foliage);

        // Add some random rotation to the tree for variety
        tree.rotation.y = random() * Math.PI * 2;
        tree.rotation.x = (random() - 0.5) * 0.05; // Slight random tilt
        tree.rotation.z = (random() - 0.5) * 0.05; // Slight random tilt

        // Position the tree on the island
        const treeAngle = random() * Math.PI * 2;
        const treeDistance = 20 + random() * 25; // Place trees more toward the edges
        tree.position.set(
            Math.cos(treeAngle) * treeDistance,
            2,
            Math.sin(treeAngle) * treeDistance
        );

        island.add(tree);
    }


    // Store the island with its ID
    activeIslands.set(islandId, {
        mesh: island,
        collider: collider
    });

    return island;
}

// Function to create and cache a stone texture with imperfections
function createStoneTexture(color, roughness) {
    // Use cached texture if available
    const cacheKey = `stone_${color.getHexString()}_${roughness}`;
    if (structureTextureCache[cacheKey]) {
        return structureTextureCache[cacheKey];
    }

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise/imperfections
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 2;

        // Random darker or lighter spots
        const shade = Math.random() > 0.5 ? 0 : 255;
        ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.05 + Math.random() * roughness * 0.1})`;
        ctx.fillRect(x, y, size, size);
    }

    // Add some cracks/lines
    ctx.strokeStyle = `rgba(0, 0, 0, ${roughness * 0.2})`;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + Math.random() * 1;

        // Random start point
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;

        ctx.moveTo(startX, startY);

        // Create jaggy line
        let x = startX;
        let y = startY;
        const segments = 3 + Math.floor(Math.random() * 4);

        for (let j = 0; j < segments; j++) {
            x += (Math.random() - 0.5) * 40;
            y += (Math.random() - 0.5) * 40;
            ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Cache the texture
    structureTextureCache[cacheKey] = texture;

    return texture;
}

// Function to create an ancient temple mega structure
function createAncientTemple(island, random) {
    // Create stone texture for temple
    const templeColor = new THREE.Color(0xd2b48c);
    const stoneTexture = createStoneTexture(templeColor, 0.7);

    // Base platform
    const baseGeometry = new THREE.BoxGeometry(40, 10, 40);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0xd2b48c,
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.05,
        roughness: 0.8,
        metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Temple steps
    const stepsGeometry = new THREE.BoxGeometry(30, 5, 30);
    const steps = new THREE.Mesh(stepsGeometry, baseMaterial);
    steps.position.y = 12.5;
    island.add(steps);

    // Main temple structure
    const templeGeometry = new THREE.BoxGeometry(20, 15, 20);
    const templeMaterial = new THREE.MeshPhongMaterial({
        color: 0xc2a278,
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.03,
        roughness: 0.7,
        metalness: 0.1
    });
    const temple = new THREE.Mesh(templeGeometry, templeMaterial);
    temple.position.y = 22.5;
    island.add(temple);

    // Temple roof
    const roofGeometry = new THREE.ConeGeometry(15, 10, 4);
    const roofTexture = createStoneTexture(new THREE.Color(0xa52a2a), 0.4);
    const roofMaterial = new THREE.MeshPhongMaterial({
        color: 0xa52a2a,
        map: roofTexture,
        bumpMap: roofTexture,
        bumpScale: 0.02
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 35;
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    island.add(roof);

    // Columns
    const columnPositions = [
        [-12, 0, -12], [12, 0, -12], [-12, 0, 12], [12, 0, 12]
    ];

    columnPositions.forEach(pos => {
        const columnGeometry = new THREE.CylinderGeometry(2, 2, 20, 16);
        const column = new THREE.Mesh(columnGeometry, baseMaterial);
        column.position.set(pos[0], 20, pos[2]);
        island.add(column);
    });
}

// Function to create a lighthouse mega structure
function createLighthouse(island, random) {
    // Create stone and metal textures
    const stoneTexture = createStoneTexture(new THREE.Color(0x808080), 0.6);
    const metalTexture = createStoneTexture(new THREE.Color(0x333333), 0.3);

    // Base
    const baseGeometry = new THREE.CylinderGeometry(15, 18, 10, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x808080,
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.04
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Tower
    const towerGeometry = new THREE.CylinderGeometry(8, 12, 40, 32);

    // Create a special texture for the lighthouse with stripes
    const lighthouseCanvas = document.createElement('canvas');
    lighthouseCanvas.width = 256;
    lighthouseCanvas.height = 256;
    const lhCtx = lighthouseCanvas.getContext('2d');

    // White base with subtle imperfections
    lhCtx.fillStyle = '#ffffff';
    lhCtx.fillRect(0, 0, lighthouseCanvas.width, lighthouseCanvas.height);

    // Add noise
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * lighthouseCanvas.width;
        const y = Math.random() * lighthouseCanvas.height;
        lhCtx.fillStyle = `rgba(0, 0, 0, ${0.01 + Math.random() * 0.03})`;
        lhCtx.fillRect(x, y, 1, 1);
    }

    // Add red stripes
    const stripeHeight = lighthouseCanvas.height / 5;
    for (let i = 0; i < 5; i += 2) {
        lhCtx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        lhCtx.fillRect(0, i * stripeHeight, lighthouseCanvas.width, stripeHeight);

        // Add weathering to red stripes
        for (let j = 0; j < 500; j++) {
            const x = Math.random() * lighthouseCanvas.width;
            const y = i * stripeHeight + Math.random() * stripeHeight;
            lhCtx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})`;
            lhCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
    }

    const lighthouseTexture = new THREE.CanvasTexture(lighthouseCanvas);
    lighthouseTexture.wrapS = THREE.RepeatWrapping;
    lighthouseTexture.wrapT = THREE.RepeatWrapping;

    const towerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: lighthouseTexture,
        roughness: 0.5
    });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = 30;
    island.add(tower);

    // Lantern room
    const lanternGeometry = new THREE.CylinderGeometry(10, 10, 8, 16);
    const lanternMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        map: metalTexture,
        bumpMap: metalTexture,
        bumpScale: 0.02,
        metalness: 0.8,
        roughness: 0.2
    });
    const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    lantern.position.y = 54;
    island.add(lantern);

    // Light source
    const lightGeometry = new THREE.SphereGeometry(6, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.y = 54;
    island.add(light);

    // Add a point light
    const pointLight = new THREE.PointLight(0xffff00, 1, 100);
    pointLight.position.y = 54;
    island.add(pointLight);
}

// Function to create a giant statue mega structure
function createGiantStatue(island, random) {
    // Create metal texture for statue
    const goldTexture = createStoneTexture(new THREE.Color(0xd4af37), 0.3);
    const stoneTexture = createStoneTexture(new THREE.Color(0x555555), 0.8);

    // Base/pedestal
    const baseGeometry = new THREE.BoxGeometry(20, 10, 20);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x555555,
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.05
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 5;
    island.add(base);

    // Statue body
    const bodyGeometry = new THREE.CylinderGeometry(5, 8, 25, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xd4af37, // Gold color
        map: goldTexture,
        bumpMap: goldTexture,
        bumpScale: 0.02,
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 22.5;
    island.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(6, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 38;
    island.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(2, 2, 20, 8);

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-8, 30, 0);
    leftArm.rotation.z = Math.PI / 4; // 45 degrees up
    island.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(8, 30, 0);
    rightArm.rotation.z = -Math.PI / 4; // 45 degrees up
    island.add(rightArm);

    // Crown/headdress
    const crownGeometry = new THREE.ConeGeometry(6, 8, 16);
    const crown = new THREE.Mesh(crownGeometry, bodyMaterial);
    crown.position.y = 45;
    island.add(crown);
}

// Function to create a ruined tower mega structure
function createRuinedTower(island, random) {
    // Create stone texture with heavy weathering
    const weatheredStoneTexture = createStoneTexture(new THREE.Color(0x777777), 1.0);

    // Base of the tower
    const baseGeometry = new THREE.CylinderGeometry(15, 18, 10, 16);
    const stoneMaterial = new THREE.MeshPhongMaterial({
        color: 0x777777,
        map: weatheredStoneTexture,
        bumpMap: weatheredStoneTexture,
        bumpScale: 0.08,
        roughness: 0.9
    });
    const base = new THREE.Mesh(baseGeometry, stoneMaterial);
    base.position.y = 5;
    island.add(base);

    // Tower sections with progressive damage
    const sections = 5;
    const maxHeight = 50;
    const sectionHeight = maxHeight / sections;

    for (let i = 0; i < sections; i++) {
        // Each section gets more damaged as we go up
        const damage = i / sections; // 0 to almost 1
        const radius = 12 - (i * 1.5); // Narrower as we go up
        const completeness = 1 - (damage * 0.7); // How complete the circle is

        // Create a cylinder with a portion missing
        const sectionGeometry = new THREE.CylinderGeometry(
            radius - 1, radius,
            sectionHeight,
            16, 1,
            false, // Open ended?
            0, // Start angle
            completeness * Math.PI * 2 // End angle (partial for damage)
        );

        // Rotate each section randomly for varied damage
        const section = new THREE.Mesh(sectionGeometry, stoneMaterial);
        section.position.y = 10 + (i * sectionHeight) + sectionHeight / 2;
        section.rotation.y = random() * Math.PI * 2;
        island.add(section);

        // Add some fallen debris around the base
        if (i > 1) { // More debris from higher sections
            const debrisCount = Math.floor(random() * 3) + 1;
            for (let d = 0; d < debrisCount; d++) {
                const debrisSize = 2 + random() * 3;
                const debrisGeometry = new THREE.BoxGeometry(debrisSize, debrisSize, debrisSize);
                const debris = new THREE.Mesh(debrisGeometry, stoneMaterial);

                // Position debris around the base
                const angle = random() * Math.PI * 2;
                const distance = 15 + random() * 25;
                debris.position.set(
                    Math.cos(angle) * distance,
                    2 + random() * 3, // Slightly above ground
                    Math.sin(angle) * distance
                );

                // Random rotation for natural look
                debris.rotation.set(
                    random() * Math.PI,
                    random() * Math.PI,
                    random() * Math.PI
                );

                island.add(debris);
            }
        }
    }

    // Add some larger fallen sections
    const largeDebrisCount = 2 + Math.floor(random() * 3);
    for (let d = 0; d < largeDebrisCount; d++) {
        // Create a partial cylinder section as a large piece of debris
        const angle = random() * Math.PI * 0.5; // How much of the cylinder to use
        const largeDebrisGeometry = new THREE.CylinderGeometry(
            5 + random() * 3,
            6 + random() * 3,
            8 + random() * 10,
            16, 1, false,
            0, angle
        );

        const largeDebris = new THREE.Mesh(largeDebrisGeometry, stoneMaterial);

        // Position large debris further from the tower
        const debrisAngle = random() * Math.PI * 2;
        const debrisDistance = 25 + random() * 20;
        largeDebris.position.set(
            Math.cos(debrisAngle) * debrisDistance,
            2,
            Math.sin(debrisAngle) * debrisDistance
        );

        // Rotate to look like it fell over
        largeDebris.rotation.set(
            Math.PI / 2 + (random() * 0.5 - 0.25), // Mostly on its side
            random() * Math.PI * 2,
            random() * Math.PI * 0.3
        );

        island.add(largeDebris);
    }

    // Add some vegetation growing on the ruins
    for (let v = 0; v < 5; v++) {
        const vineGeometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 8);
        const vineColor = new THREE.Color().setHSL(0.3 + random() * 0.1, 0.8, 0.4);
        const vineMaterial = new THREE.MeshPhongMaterial({ color: vineColor });
        const vine = new THREE.Mesh(vineGeometry, vineMaterial);

        // Position vines on the tower
        const vineAngle = random() * Math.PI * 2;
        const vineHeight = 10 + random() * 30;
        const vineRadius = 12 - (vineHeight / maxHeight * 5); // Match tower radius at that height

        vine.position.set(
            Math.cos(vineAngle) * vineRadius,
            vineHeight,
            Math.sin(vineAngle) * vineRadius
        );

        // Angle vines to droop down the tower
        vine.rotation.x = Math.PI / 2 - 0.5 - random() * 0.5;
        vine.rotation.y = random() * Math.PI * 2;

        island.add(vine);
    }

    // Add a mysterious glow at the top
    const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.7
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = maxHeight + 5;
    island.add(glow);

    // Add a point light for the glow
    const glowLight = new THREE.PointLight(0x66ccff, 1, 50);
    glowLight.position.y = maxHeight + 5;
    island.add(glowLight);
}

// Function to update visible chunks based on boat position
function updateVisibleChunks(boat, scene, waterShader, lastChunkUpdatePosition) {
    // Get current chunk coordinates based on boat position
    const currentChunk = getChunkCoords(boat.position.x, boat.position.z);

    // Set to track chunks that should be visible
    const chunksToKeep = new Set();
    const waterChunksToKeep = new Set();

    // Generate chunks in view distance
    for (let xOffset = -maxViewDistance; xOffset <= maxViewDistance; xOffset++) {
        for (let zOffset = -maxViewDistance; zOffset <= maxViewDistance; zOffset++) {
            const chunkX = currentChunk.x + xOffset;
            const chunkZ = currentChunk.z + zOffset;
            const chunkKey = getChunkKey(chunkX, chunkZ);

            // Add to set of chunks to keep
            chunksToKeep.add(chunkKey);

            // For water, we need a slightly larger view distance to avoid seeing edges
            if (Math.abs(xOffset) <= maxViewDistance + 1 && Math.abs(zOffset) <= maxViewDistance + 1) {
                waterChunksToKeep.add(chunkKey);
                // Create water chunk if needed
                createWaterChunk(chunkX, chunkZ, scene, waterShader);
            }

            // Generate this chunk if needed
            generateChunk(chunkX, chunkZ, scene);
        }
    }

    // Remove islands that are too far away
    const islandsToRemove = [];
    activeIslands.forEach((island, id) => {
        // Calculate distance to boat
        const distance = boat.position.distanceTo(island.collider.center);

        // Get the chunk this island belongs to
        const islandChunkX = Math.floor(island.collider.center.x / chunkSize);
        const islandChunkZ = Math.floor(island.collider.center.z / chunkSize);
        const islandChunkKey = getChunkKey(islandChunkX, islandChunkZ);

        // If the island is too far or its chunk is not in the keep set, mark for removal
        if (distance > visibleDistance || !chunksToKeep.has(islandChunkKey)) {
            islandsToRemove.push(id);
        }
    });

    // Remove marked islands
    islandsToRemove.forEach(id => {
        const island = activeIslands.get(id);
        if (island) {
            // Remove from scene
            scene.remove(island.mesh);

            // Remove collider
            const colliderIndex = islandColliders.findIndex(c => c.id === id);
            if (colliderIndex !== -1) {
                islandColliders.splice(colliderIndex, 1);
            }

            // Remove from active islands
            activeIslands.delete(id);
        }
    });

    // Remove water chunks that are too far away
    const waterChunksToRemove = [];
    activeWaterChunks.forEach((waterChunk, chunkKey) => {
        if (!waterChunksToKeep.has(chunkKey)) {
            waterChunksToRemove.push(chunkKey);
        }
    });

    // Remove marked water chunks
    waterChunksToRemove.forEach(chunkKey => {
        const waterChunk = activeWaterChunks.get(chunkKey);
        if (waterChunk) {
            // Remove from scene
            scene.remove(waterChunk);

            // Remove from active water chunks
            activeWaterChunks.delete(chunkKey);
        }
    });

    // Update the last chunk update position
    lastChunkUpdatePosition.copy(boat.position);

    return { islandsRemoved: islandsToRemove.length, waterChunksRemoved: waterChunksToRemove.length };
}

// Find nearest island function
function findNearestIsland(boat) {
    let nearest = { distance: Infinity, name: "None" };

    activeIslands.forEach((island, id) => {
        /*const distance = boat.position.distanceTo(island.collider.center);
        if (distance < nearest.distance) {
            nearest = {
                distance: distance,
                name: `Island ${id.substring(0, 4)}` // Use part of the ID as a name
            };
        }*/
    });

    return nearest;
}

// Check for island collisions
function checkIslandCollision(position, extraRadius = 2) {
    for (const collider of islandColliders) {
        const distance = position.distanceTo(collider.center);
        if (distance < collider.radius + extraRadius) {
            return true;
        }
    }
    return false;
}

// Export everything needed
export {
    islandColliders,
    activeIslands,
    activeWaterChunks,
    createWaterChunk,
    generateChunk,
    createIsland,
    updateVisibleChunks,
    findNearestIsland,
    checkIslandCollision
}; 