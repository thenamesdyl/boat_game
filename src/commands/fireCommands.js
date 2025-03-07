import * as THREE from 'three';
import { scene, boat } from '../core/gameState.js';

// Track active fireballs
const activeFireballs = [];
let fireballCounter = 0;

/**
 * Fireball command implementation
 * @param {Array<string>} args - Command arguments
 * @param {object} chatSystem - Reference to the chat system
 */
export function fireballCommand(args, chatSystem) {
    // Check for any parameters (size, intensity, etc.)
    let size = 1.0;
    let intensity = 1.0;

    if (args.length > 0) {
        // First parameter is size
        const sizeArg = parseFloat(args[0]);
        if (!isNaN(sizeArg) && sizeArg > 0) {
            size = Math.min(5.0, sizeArg); // Cap size at 5.0 to prevent huge fireballs
        }

        // Second parameter is intensity (affects glow and light)
        if (args.length > 1) {
            const intensityArg = parseFloat(args[1]);
            if (!isNaN(intensityArg) && intensityArg > 0) {
                intensity = Math.min(3.0, intensityArg); // Cap intensity at 3.0
            }
        }
    }

    // Create and launch a fireball
    try {
        const fireball = createFireball(size, intensity);
        launchFireball(fireball);

        chatSystem.addSystemMessage(`Launched a fireball of size ${size.toFixed(1)} with intensity ${intensity.toFixed(1)}! 🔥`);
    } catch (error) {
        console.error("Error creating fireball:", error);
        chatSystem.addSystemMessage(`Failed to create fireball: ${error.message}`);
    }
}

/**
 * Create a fireball with the specified parameters
 * @param {number} size - Size of the fireball
 * @param {number} intensity - Light intensity of the fireball
 * @returns {Object} The created fireball object
 */
function createFireball(size = 1.0, intensity = 1.0) {
    // Create a unique ID for this fireball
    const fireballId = `fireball_${fireballCounter++}`;

    // Create the fireball core (glowing sphere)
    const geometry = new THREE.SphereGeometry(size * 2, 32, 32);

    // Create a custom shader material for the glowing effect
    const fireballMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            intensity: { value: intensity },
            baseColor: { value: new THREE.Color(0xff6600) }, // Orange base color
            glowColor: { value: new THREE.Color(0xff4500) }  // Red-orange glow
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vNormal = normal;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float intensity;
            uniform vec3 baseColor;
            uniform vec3 glowColor;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Pulsating effect
                float pulse = 0.5 + 0.5 * sin(time * 5.0);
                
                // Edge glow effect (stronger at edges)
                float edgeGlow = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
                
                // Fire variation effect
                float noise = sin(vPosition.x * 10.0 + time) * sin(vPosition.y * 10.0 + time) * sin(vPosition.z * 10.0 + time);
                float fireVariation = 0.7 + 0.3 * noise;
                
                // Combine effects
                vec3 finalColor = mix(baseColor, glowColor, edgeGlow * pulse) * fireVariation * intensity;
                
                // Add extra brightness at the center
                float center = 1.0 - length(vUv - vec2(0.5));
                finalColor += glowColor * center * intensity * pulse;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const fireballCore = new THREE.Mesh(geometry, fireballMaterial);

    // Add a point light to make the fireball illuminate surroundings
    const light = new THREE.PointLight(0xff6600, intensity * 2, size * 30);
    fireballCore.add(light);

    // Create the particle system for the fire trail
    const particleCount = Math.floor(100 * size * intensity);
    const particlesGeometry = new THREE.BufferGeometry();

    // Create arrays for particle positions and initial velocities
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    // Initialize particles in a sphere-like arrangement
    for (let i = 0; i < particleCount; i++) {
        // Random position in a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = (0.7 + Math.random() * 0.3) * size * 2;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Random velocity outward
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

        // Random size
        sizes[i] = (0.1 + Math.random() * 0.9) * size;

        // Random lifetime
        lifetimes[i] = Math.random() * 2.0 + 1.0; // 1-3 seconds
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particlesGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    // Create custom shader for particles
    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: { value: createFireParticleTexture() },
            time: { value: 0 },
            intensity: { value: intensity }
        },
        vertexShader: `
            attribute vec3 velocity;
            attribute float size;
            attribute float lifetime;
            
            uniform float time;
            uniform float intensity;
            
            varying float vLifetime;
            varying float vSize;
            
            void main() {
                vLifetime = lifetime;
                vSize = size;
                
                // Simple physics simulation
                vec3 pos = position + velocity * time;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * intensity * (10.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            uniform float time;
            uniform float intensity;
            
            varying float vLifetime;
            varying float vSize;
            
            void main() {
                // Calculate particle age and fade out near end of lifetime
                float age = mod(time, vLifetime) / vLifetime;
                float opacity = 1.0 - age;
                
                // Sample the texture
                vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                
                // Create color variation from red-yellow to orange
                float colorVar = sin(age * 3.14159);
                vec3 color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.7, 0.0), colorVar);
                
                // Apply intensity
                color *= intensity;
                
                gl_FragColor = vec4(color, texColor.a * opacity);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);

    // Create the fireball group to hold everything
    const fireballGroup = new THREE.Group();
    fireballGroup.add(fireballCore);
    fireballGroup.add(particles);

    // Add to scene
    scene.add(fireballGroup);

    // Store reference to the fireball
    const fireball = {
        id: fireballId,
        group: fireballGroup,
        core: fireballCore,
        particles: particles,
        light: light,
        material: fireballMaterial,
        particlesMaterial: particlesMaterial,
        size: size,
        intensity: intensity,
        created: performance.now(),
        velocity: new THREE.Vector3(),
        update: function (deltaTime) {
            // Update shader time
            this.material.uniforms.time.value += deltaTime;
            this.particlesMaterial.uniforms.time.value += deltaTime;

            // Update position based on velocity
            this.group.position.add(this.velocity.clone().multiplyScalar(deltaTime));

            // Add some randomness to movement for a more natural fire motion
            const wobble = 0.1 * Math.sin(this.material.uniforms.time.value * 10);
            this.group.position.y += wobble * deltaTime;

            // Check lifetime (remove after 10 seconds)
            const age = (performance.now() - this.created) / 1000;
            if (age > 10) {
                return false; // Signal to remove
            }

            return true; // Keep updating
        }
    };

    // Add to active fireballs
    activeFireballs.push(fireball);

    return fireball;
}

/**
 * Helper function to create a fire particle texture
 */
function createFireParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const context = canvas.getContext('2d');

    // Create a radial gradient for a soft particle
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 0, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

/**
 * Launch a fireball from the boat in the direction it's facing
 * @param {Object} fireball - The fireball object to launch
 */
function launchFireball(fireball) {
    // Position slightly above and in front of the boat
    const launchOffset = new THREE.Vector3(0, 5, -5); // Adjust as needed
    launchOffset.applyQuaternion(boat.quaternion);

    fireball.group.position.copy(boat.position).add(launchOffset);

    // Set initial velocity in the direction the boat is facing
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
    fireball.velocity.copy(direction).multiplyScalar(50); // Speed factor

    // Add a slight upward arc
    fireball.velocity.y += 5;

    // Add dramatic launch effect
    createLaunchEffect(fireball.group.position, fireball.size);

    // Play sound if available
    if (window.playSound) {
        window.playSound('fireball_launch', 0.7);
    }
}

/**
 * Create a visual effect for the fireball launch
 * @param {THREE.Vector3} position - Launch position
 * @param {number} size - Size of the effect
 */
function createLaunchEffect(position, size) {
    // Create a flash of light
    const flash = new THREE.PointLight(0xffaa00, 3 * size, 50 * size);
    flash.position.copy(position);
    scene.add(flash);

    // Animate the flash to fade out
    const startTime = performance.now();
    const duration = 500; // milliseconds

    function animateFlash() {
        const elapsed = performance.now() - startTime;
        if (elapsed < duration) {
            const intensity = 3 * size * (1 - elapsed / duration);
            flash.intensity = intensity;
            requestAnimationFrame(animateFlash);
        } else {
            scene.remove(flash);
        }
    }

    animateFlash();
}

/**
 * Update all active fireballs
 * @param {number} deltaTime - Time since last update in seconds
 */
export function updateFireballs(deltaTime) {
    // Update all active fireballs and remove expired ones
    for (let i = activeFireballs.length - 1; i >= 0; i--) {
        const fireball = activeFireballs[i];
        const stillActive = fireball.update(deltaTime);

        if (!stillActive) {
            // Remove the fireball
            scene.remove(fireball.group);
            activeFireballs.splice(i, 1);
        }
    }
}

/**
 * Get count of active fireballs
 * @returns {number} Number of active fireballs
 */
export function getActiveFireballCount() {
    return activeFireballs.length;
}

// Export a list of all commands in this module with their descriptions
export const fireCommands = [
    {
        name: 'fireball',
        handler: fireballCommand,
        description: 'Launch a fireball from your ship - /fireball [size] [intensity]'
    }
    // Add more fire-related commands here in the future
]; 