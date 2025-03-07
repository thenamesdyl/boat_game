import * as THREE from 'three';

/**
 * Creates a coastal cliff scene with a cave entrance
 * @param {THREE.Scene} scene - The scene to add elements to
 * @param {THREE.Vector3} position - Position to place the cliff
 * @returns {Object} - References to created elements
 */
export function createCoastalCliffScene(scene, position = new THREE.Vector3(0, 0, 0)) {
    // Scene container
    const sceneContainer = new THREE.Group();
    sceneContainer.position.copy(position);
    scene.add(sceneContainer);

    // ===== CLIFF GENERATION =====
    const cliffMaterial = new THREE.MeshPhongMaterial({
        color: 0x3D3B3C,
        shininess: 10,
        flatShading: true,
    });

    // Create main cliff structure using extruded shape
    const cliffShape = new THREE.Shape();
    cliffShape.moveTo(0, 0);
    cliffShape.lineTo(200, 0);
    cliffShape.lineTo(220, 100);
    cliffShape.lineTo(180, 240);
    cliffShape.lineTo(150, 260);
    cliffShape.lineTo(100, 280);
    cliffShape.lineTo(50, 260);
    cliffShape.lineTo(20, 200);
    cliffShape.lineTo(0, 0);

    // Add jaggedness to the extrusion
    const extrudeSettings = {
        steps: 2,
        depth: 150,
        bevelEnabled: true,
        bevelThickness: 20,
        bevelSize: 15,
        bevelSegments: 5
    };

    const cliffGeometry = new THREE.ExtrudeGeometry(cliffShape, extrudeSettings);

    // Add noise to cliff vertices for jagged appearance
    const positions = cliffGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Add more vertical variation (y-axis)
        if (positions[i + 1] > 50) { // Only affect upper areas
            positions[i] += (Math.random() - 0.5) * 15; // X noise
            positions[i + 1] += Math.random() * 30; // Y noise (more upward)
            positions[i + 2] += (Math.random() - 0.5) * 15; // Z noise
        }
    }

    cliffGeometry.computeVertexNormals();
    const cliff = new THREE.Mesh(cliffGeometry, cliffMaterial);
    cliff.rotation.x = -Math.PI / 2; // Rotate to stand upright
    cliff.position.set(-100, -20, -75);
    sceneContainer.add(cliff);

    // ===== VERTICAL COLUMNS =====
    const addVerticalColumns = () => {
        const columnCount = 8;
        const columnMaterial = new THREE.MeshPhongMaterial({
            color: 0x2D2D2D,
            shininess: 5,
            flatShading: true
        });

        for (let i = 0; i < columnCount; i++) {
            // Determine column position along cliff face
            const xPos = -80 + i * 30 + (Math.random() - 0.5) * 15;
            const zPos = -50 + (Math.random() - 0.5) * 30;

            // Create column height and width
            const height = 150 + Math.random() * 130;
            const radius = 8 + Math.random() * 6;

            // Create jagged column
            const columnGeometry = new THREE.CylinderGeometry(
                radius * 0.8, // top radius
                radius, // bottom radius
                height,
                8, // radial segments
                10, // height segments
                false
            );

            // Add noise to vertices for natural, jagged look
            const positions = columnGeometry.attributes.position.array;
            for (let j = 0; j < positions.length; j += 3) {
                const normalizedHeight = positions[j + 1] / height;
                // More noise in the middle, less at ends
                const noiseFactor = 0.5 - Math.abs(normalizedHeight - 0.5);
                positions[j] += (Math.random() - 0.5) * radius * noiseFactor * 2;
                positions[j + 2] += (Math.random() - 0.5) * radius * noiseFactor * 2;
            }

            columnGeometry.computeVertexNormals();
            const column = new THREE.Mesh(columnGeometry, columnMaterial);
            column.position.set(xPos, height / 2, zPos);
            // Tilt the columns slightly for more natural look
            column.rotation.x = (Math.random() - 0.5) * 0.2;
            column.rotation.z = (Math.random() - 0.5) * 0.2;
            sceneContainer.add(column);
        }
    };

    addVerticalColumns();

    // ===== CAVE ENTRANCE =====
    const createCaveEntrance = () => {
        // Create cave entrance shape
        const caveEntranceMaterial = new THREE.MeshPhongMaterial({
            color: 0x1A1A1A,
            shininess: 5,
            side: THREE.DoubleSide
        });

        // Create an arch shape for the cave entrance
        const caveShape = new THREE.Shape();
        caveShape.moveTo(-20, 0);
        caveShape.lineTo(20, 0);
        caveShape.lineTo(25, 15);
        caveShape.bezierCurveTo(25, 40, -25, 40, -25, 15);
        caveShape.lineTo(-20, 0);

        // Extrude the cave entrance
        const caveExtrudeSettings = {
            steps: 3,
            depth: 60,
            bevelEnabled: true,
            bevelThickness: 5,
            bevelSize: 3,
            bevelSegments: 3
        };

        const caveGeometry = new THREE.ExtrudeGeometry(caveShape, caveExtrudeSettings);
        const cave = new THREE.Mesh(caveGeometry, caveEntranceMaterial);
        cave.position.set(0, 10, -80);
        cave.rotation.y = Math.PI / 2; // Face outward
        sceneContainer.add(cave);

        // Add framing rocks around cave entrance
        const rocksMaterial = new THREE.MeshPhongMaterial({
            color: 0x4A4A4A,
            flatShading: true
        });

        const addFramingRock = (x, y, z, scale) => {
            const rockGeometry = new THREE.DodecahedronGeometry(5, 1);
            // Add noise to vertices
            const positions = rockGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 2;
                positions[i + 1] += (Math.random() - 0.5) * 2;
                positions[i + 2] += (Math.random() - 0.5) * 2;
            }
            rockGeometry.computeVertexNormals();

            const rock = new THREE.Mesh(rockGeometry, rocksMaterial);
            rock.position.set(x, y, z);
            rock.scale.set(scale, scale, scale);
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            sceneContainer.add(rock);
        };

        // Place rocks around the cave entrance
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI;
            const radius = 27 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.7 + 15;
            addFramingRock(x, y, -82, 1.5 + Math.random() * 2);
        }
    };

    createCaveEntrance();

    // ===== FOREST ELEMENTS =====
    const addForestElements = () => {
        const treeCount = 35;
        const treeMaterial = new THREE.MeshPhongMaterial({
            color: 0x1E472E,
            flatShading: true
        });
        const trunkMaterial = new THREE.MeshPhongMaterial({
            color: 0x3D2817
        });

        for (let i = 0; i < treeCount; i++) {
            // Create tree group
            const tree = new THREE.Group();

            // Determine tree position on top of cliff
            const xPos = -90 + Math.random() * 180;
            const zPos = -70 + Math.random() * 120;

            // Don't place trees in front of cave entrance
            if (Math.abs(xPos) < 30 && zPos < -50) continue;

            // Create trunk
            const trunkHeight = 5 + Math.random() * 8;
            const trunkGeometry = new THREE.CylinderGeometry(0.8, 1.2, trunkHeight, 5);
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            tree.add(trunk);

            // Create foliage - darker and more pine-like for coastal cliff
            const foliageCount = 3 + Math.floor(Math.random() * 2);
            let foliageSize = 8 + Math.random() * 4;

            for (let j = 0; j < foliageCount; j++) {
                const foliageGeometry = new THREE.ConeGeometry(
                    foliageSize,
                    8 + Math.random() * 4,
                    6 + Math.floor(Math.random() * 3)
                );
                const foliage = new THREE.Mesh(foliageGeometry, treeMaterial);
                foliage.position.y = trunkHeight / 2 + j * 5 + 4;
                tree.add(foliage);
                foliageSize *= 0.8; // Each level gets smaller
            }

            tree.position.set(xPos, 100 + Math.random() * 80, zPos);
            // Slightly random rotation
            tree.rotation.y = Math.random() * Math.PI * 2;
            sceneContainer.add(tree);
        }
    };

    addForestElements();

    // ===== DISTANT ISLANDS =====
    const addDistantIslands = () => {
        const islandCount = 5;
        const islandMaterial = new THREE.MeshPhongMaterial({
            color: 0x2E8B57
        });

        for (let i = 0; i < islandCount; i++) {
            // Create a simple island with a cone
            const islandGeometry = new THREE.ConeGeometry(
                20 + Math.random() * 30,
                15 + Math.random() * 25,
                8
            );
            const island = new THREE.Mesh(islandGeometry, islandMaterial);

            // Position island far away, visible from cave
            const angle = (i / islandCount) * Math.PI * 0.5 + Math.PI * 0.25;
            const distance = 800 + Math.random() * 400;
            island.position.set(
                Math.cos(angle) * distance,
                5,
                Math.sin(angle) * distance - 200 // Position in front of cave
            );

            sceneContainer.add(island);
        }
    };

    addDistantIslands();

    return {
        container: sceneContainer,
        cliff: cliff
    };
} 