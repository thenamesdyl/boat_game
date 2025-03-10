import * as THREE from 'three';
import { applyOutline } from '../theme/outlineStyles.js';

// Cache for iceberg textures to improve performance
const icebergTextureCache = {};

/**
 * Creates an iceberg with procedural geometry and materials
 * @param {Object} options - Configuration options
 * @param {THREE.Vector3} options.position - Position of the iceberg
 * @param {Function} options.random - Random function with seed
 * @param {number} options.scale - Size multiplier for the iceberg
 * @param {THREE.Object3D} options.parent - Parent object to attach to (optional)
 * @returns {Object} The created iceberg object and its collider
 */
export function createIceberg(options) {
    const {
        position = new THREE.Vector3(0, 0, 0),
        random = Math.random,
        scale = 1.0,
        parent = null
    } = options;

    // Create a unique ID for this iceberg
    const icebergId = `iceberg_${Math.floor(position.x)}_${Math.floor(position.z)}`;

    // Group to hold all iceberg parts
    const iceberg = new THREE.Group();
    iceberg.position.copy(position);

    if (parent) {
        parent.add(iceberg);
    }

    // Determine iceberg type - Now heavily favor jagged spiky types
    // 70% chance of jagged, 20% chance of tabular, 10% chance of rounded
    const typeRoll = random();
    let icebergType;
    if (typeRoll < 0.7) {
        icebergType = 0; // Jagged (most common for dramatic effect)
    } else if (typeRoll < 0.9) {
        icebergType = 1; // Tabular
    } else {
        icebergType = 2; // Rounded (least common)
    }

    // Create iceberg geometry based on type
    let mainGeometry;
    let mainHeight;

    switch (icebergType) {
        case 0: // Jagged peak
            mainGeometry = createJaggedIceberg(random);
            mainHeight = 35 * scale;
            break;
        case 1: // Tabular flat-top
            mainGeometry = createTabularIceberg(random);
            mainHeight = 25 * scale;
            break;
        case 2: // Rounded dome
            mainGeometry = createRoundedIceberg(random);
            mainHeight = 20 * scale;
            break;
    }

    // Create ice texture and material
    const iceColor = new THREE.Color(0x88cfff);
    const iceTexture = createIceTexture(iceColor, random);

    const iceMaterial = new THREE.MeshPhongMaterial({
        color: iceColor,
        map: iceTexture,
        bumpMap: iceTexture,
        bumpScale: 0.1,
        transparent: true,
        opacity: 0.9,
        shininess: 90,
        specular: new THREE.Color(0xffffff)
    });

    // Create main iceberg mesh
    const mainIceberg = new THREE.Mesh(mainGeometry, iceMaterial);

    // Scale to desired size
    mainIceberg.scale.set(scale, scale, scale);

    // Add to iceberg group
    iceberg.add(mainIceberg);

    // Apply outline to main body
    applyOutline(mainIceberg, { scale: 1.08 });

    // Create underwater part (about 90% of an iceberg is underwater)
    const underwaterScale = scale * 1.5; // Wider underwater
    const underwaterHeight = mainHeight * 1.2; // Deeper underwater

    const underwaterGeometry = new THREE.CylinderGeometry(
        7 * underwaterScale, // Top radius
        12 * underwaterScale, // Bottom radius
        underwaterHeight,
        12
    );

    // Make underwater part slightly darker and more transparent
    const underwaterMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x6babdf),
        transparent: true,
        opacity: 0.7,
        shininess: 120,
        specular: new THREE.Color(0xaadeff)
    });

    const underwater = new THREE.Mesh(underwaterGeometry, underwaterMaterial);
    underwater.position.y = -underwaterHeight / 2;
    iceberg.add(underwater);

    // Apply subtle outline to underwater part
    applyOutline(underwater, { scale: 1.05 });

    // Add some ice chunks floating nearby
    addFloatingIceChunks(iceberg, random, scale);

    // Create a collider for physics/interaction
    const collider = {
        center: new THREE.Vector3(
            position.x,
            position.y,
            position.z
        ),
        radius: 15 * scale, // Collision radius
        id: icebergId,
        type: 'iceberg'
    };

    // Return both the iceberg and its collider
    return {
        mesh: iceberg,
        collider: collider,
        type: 'iceberg',
        id: icebergId
    };
}

/**
 * Creates a jagged peak iceberg with irregular geometry
 * @param {Function} random - Random function with seed
 * @returns {THREE.BufferGeometry} The generated geometry
 */
function createJaggedIceberg(random) {
    // Create a taller, narrower cone shape for more dramatic peaks
    const baseGeometry = new THREE.ConeGeometry(
        12, // Reduced radius for narrower base
        50, // Increased height for taller spikes
        6,  // Fewer radial segments for more angular look
        6,  // More height segments for better spike definition
        false // open ended
    );

    // Distort vertices for more pronounced extreme spiky appearance
    const positionAttribute = baseGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Add extreme distortion for very spiky shapes
        if (vertex.y > 0) {
            // Calculate distortion factor - much stronger at the top
            const heightPercent = vertex.y / 50;
            const topFactor = Math.pow(heightPercent, 2) * 3; // Exponential for more top-heavy effect

            // Create sharp angular displacement
            if (random() > 0.3) {
                // More dramatic x/z displacement for sharper angles
                vertex.x += (random() - 0.5) * 10 * topFactor;
                vertex.z += (random() - 0.5) * 10 * topFactor;
            } else {
                // Create very sharp angles by making some vertices extend outward
                const angle = Math.floor(random() * 6) * (Math.PI / 3);
                const distance = 5 + random() * 10 * topFactor;
                vertex.x += Math.cos(angle) * distance;
                vertex.z += Math.sin(angle) * distance;
            }

            // Create dramatic height variations - especially tall spikes
            if (vertex.y > 25) {
                if (random() > 0.5) {
                    // Create extremely tall spikes at random points
                    vertex.y += random() * 25 * Math.pow(heightPercent, 1.5);

                    // Make spikes narrower
                    vertex.x *= 0.8;
                    vertex.z *= 0.8;
                } else if (random() > 0.7) {
                    // Create some dips to enhance the spiky look
                    vertex.y -= random() * 10;
                }
            }
        }

        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Add a second pass to create some extreme spikes
    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Only affect vertices near the top
        if (vertex.y > 40) {
            // 15% chance of creating an extreme spike
            if (random() > 0.85) {
                // Dramatic vertical spike
                vertex.y += 15 + random() * 20;

                // Make the spike thinner
                vertex.x *= 0.6;
                vertex.z *= 0.6;
            }
        }

        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Update geometry
    baseGeometry.computeVertexNormals();
    return baseGeometry;
}

/**
 * Creates a tabular (flat-top) iceberg
 * @param {Function} random - Random function with seed
 * @returns {THREE.BufferGeometry} The generated geometry
 */
function createTabularIceberg(random) {
    // Create a cylinder with a flat top
    const baseGeometry = new THREE.CylinderGeometry(
        14, // top radius
        18, // bottom radius (increased from 16 for more dramatic shape)
        25, // height
        10, // radial segments (increased from 8 for more detail)
        4, // height segments (increased from 3 for more detail)
        false // open ended
    );

    // Distort sides but keep top mostly flat with some edge features
    const positionAttribute = baseGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Make the sides more irregular and angular
        if (vertex.y < 12) {
            // For sides, create more pronounced angular features
            const distance = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
            if (distance > 5) {
                // Stronger distortion
                vertex.x += (random() - 0.5) * 6;
                vertex.z += (random() - 0.5) * 6;

                // Occasionally add sharp protrusions on the sides
                if (random() > 0.85 && vertex.y > 0) {
                    vertex.x *= 1.1;
                    vertex.z *= 1.1;
                }
            }
        }

        // Add some slight variation to the top edge to make it less perfectly flat
        if (vertex.y > 12 && Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z) > 10) {
            // Only modify the outer edge of the top
            if (random() > 0.5) {
                vertex.y += (random() - 0.5) * 3;
            }
        }

        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Update geometry
    baseGeometry.computeVertexNormals();
    return baseGeometry;
}

/**
 * Creates a rounded dome iceberg with some angular features
 * @param {Function} random - Random function with seed
 * @returns {THREE.BufferGeometry} The generated geometry
 */
function createRoundedIceberg(random) {
    // Create a hemisphere shape
    const baseGeometry = new THREE.SphereGeometry(
        15, // radius
        12, // width segments
        8, // height segments
        0, // phi start
        Math.PI * 2, // phi length
        0, // theta start
        Math.PI / 2 // theta length - half sphere
    );

    // Add angular variation to make it less dome-like
    const positionAttribute = baseGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Height-based distortion (more at top)
        const heightFactor = Math.max(0, vertex.y / 15);

        // Add more significant angular displacement
        vertex.x += (random() - 0.5) * 4 * heightFactor;
        vertex.z += (random() - 0.5) * 4 * heightFactor;

        // Add some spiky features at random points
        if (random() > 0.85 && vertex.y > 8) {
            // Create occasional spikes
            vertex.y += random() * 5;
            vertex.x *= 0.9; // Narrow these points slightly
            vertex.z *= 0.9;
        }

        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Update geometry
    baseGeometry.computeVertexNormals();
    return baseGeometry;
}

/**
 * Adds small ice chunks floating around the main iceberg
 * @param {THREE.Object3D} iceberg - The parent iceberg object
 * @param {Function} random - Random function with seed
 * @param {number} scale - Size multiplier
 */
function addFloatingIceChunks(iceberg, random, scale) {
    const chunkCount = Math.floor(random() * 5) + 3; // 3-7 chunks

    for (let i = 0; i < chunkCount; i++) {
        // Create a small iceberg chunk
        const chunkSize = (random() * 2 + 1) * scale;
        let chunkGeometry;

        // Mix different chunk shapes
        if (random() < 0.5) {
            chunkGeometry = new THREE.BoxGeometry(
                chunkSize * 2,
                chunkSize * 0.8,
                chunkSize * 2
            );
        } else {
            chunkGeometry = new THREE.TetrahedronGeometry(chunkSize * 1.5);
        }

        // Create icy material for chunks
        const chunkMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(0xb0e0ff),
            transparent: true,
            opacity: 0.8,
            shininess: 80
        });

        const chunk = new THREE.Mesh(chunkGeometry, chunkMaterial);

        // Position chunks around the iceberg
        const angle = random() * Math.PI * 2;
        const distance = (15 + random() * 15) * scale;

        chunk.position.set(
            Math.cos(angle) * distance,
            random() * 0.5, // Slightly above water
            Math.sin(angle) * distance
        );

        // Random rotation
        chunk.rotation.set(
            random() * Math.PI,
            random() * Math.PI,
            random() * Math.PI
        );

        iceberg.add(chunk);

        // Apply outline to chunk
        applyOutline(chunk, { scale: 1.1 });
    }
}

/**
 * Creates and caches a procedural ice texture
 * @param {THREE.Color} baseColor - The base color for the ice
 * @param {Function} random - Random function with seed
 * @returns {THREE.Texture} The generated texture
 */
function createIceTexture(baseColor, random) {
    // Use cached texture if available
    const cacheKey = `ice_${baseColor.getHexString()}`;
    if (icebergTextureCache[cacheKey]) {
        return icebergTextureCache[cacheKey];
    }

    // Create canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color (light blue ice)
    const iceColorHex = `#${baseColor.getHexString()}`;
    ctx.fillStyle = iceColorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle cracks and variations

    // First layer: subtle linear cracks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + random() * 1;

        // Start point
        const startX = random() * canvas.width;
        const startY = random() * canvas.height;

        ctx.moveTo(startX, startY);

        // Create branching cracks
        let x = startX;
        let y = startY;
        const segments = 2 + Math.floor(random() * 3);

        for (let j = 0; j < segments; j++) {
            x += (random() - 0.5) * 100;
            y += (random() - 0.5) * 100;
            ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    // Second layer: darker areas representing ice density variations
    for (let i = 0; i < 30; i++) {
        const x = random() * canvas.width;
        const y = random() * canvas.height;
        const radius = 10 + random() * 40;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(150, 200, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(150, 200, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Third layer: bright reflective spots
    for (let i = 0; i < 20; i++) {
        const x = random() * canvas.width;
        const y = random() * canvas.height;
        const radius = 5 + random() * 15;

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
    icebergTextureCache[cacheKey] = texture;

    return texture;
}

/**
 * Checks if a position collides with any iceberg
 * @param {THREE.Vector3} position - Position to check
 * @param {Array} icebergColliders - Array of iceberg colliders
 * @param {number} extraRadius - Extra radius to add to collision check
 * @returns {boolean} Whether there is a collision
 */
export function checkIcebergCollision(position, icebergColliders, extraRadius = 2) {
    for (const collider of icebergColliders) {
        const distance = position.distanceTo(collider.center);
        if (distance < collider.radius + extraRadius) {
            return true;
        }
    }
    return false;
}

export default {
    createIceberg,
    checkIcebergCollision
}; 