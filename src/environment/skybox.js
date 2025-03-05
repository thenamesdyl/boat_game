import * as THREE from 'three';
import { scene, camera, directionalLight, ambientLight, getTime } from '../core/gameState.js';

const skyRadius = 20001; // Larger sky radius
const sunSize = 500; // Increased from 10 to make the sun larger
let skyMaterial;
let skyMesh;
let lastTimeOfDay = "";
let skyboxTransitionProgress = 0;
let skyboxTransitionDuration = 20; // Seconds for transition
let sunMesh;

// Add a flag to track which skybox system is active
let useRealisticSky = false;

scene.add(ambientLight);

directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Create a skybox with a single material
export function setupSkybox() {
    // Skybox size
    const skyboxSize = 10000;

    // Create a skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);

    // Create a single material for all faces
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5, // Initial blue color
        side: THREE.BackSide
    });

    // Create the skybox with a single material
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

    // Set renderOrder to ensure skybox is rendered behind everything
    skybox.renderOrder = -1000;

    // Add the skybox to the scene
    scene.add(skybox);

    // Store reference for later updates
    window.skybox = skybox;

    // Make sure camera far plane is sufficient to see the skybox
    if (camera.far < skyboxSize * 0.5) {
        camera.far = skyboxSize * 0.5;
        camera.updateProjectionMatrix();
    }

    return skybox;
}

// Get gradual sky color based on continuous time
export function getGradualSkyboxColor() {
    // Normalize time to 0-1 range for a full day cycle
    const dayPhase = (getTime() * 0.005) % 1;

    // Define key colors for different times of day
    const colors = [
        { phase: 0.0, color: new THREE.Color(0x191970) }, // Night (start/end)
        { phase: 0.2, color: new THREE.Color(0xffa07a) }, // Dawn
        { phase: 0.4, color: new THREE.Color(0x4287f5) }, // Day
        { phase: 0.7, color: new THREE.Color(0xff7f50) }, // Dusk
        { phase: 0.9, color: new THREE.Color(0x191970) }  // Night (approaching end of cycle)
    ];

    // Find the two colors to interpolate between
    let startColor, endColor, t;

    for (let i = 0; i < colors.length - 1; i++) {
        if (dayPhase >= colors[i].phase && dayPhase < colors[i + 1].phase) {
            // Calculate how far we are between these two color points (0-1)
            t = (dayPhase - colors[i].phase) / (colors[i + 1].phase - colors[i].phase);
            startColor = colors[i].color;
            endColor = colors[i + 1].color;
            break;
        }
    }

    // If we somehow didn't find a range, use the last color
    if (!startColor) {
        return colors[colors.length - 1].color;
    }

    // Create result color by interpolating
    const resultColor = new THREE.Color();
    resultColor.copy(startColor).lerp(endColor, t);

    return resultColor;
}

// Modify updateSkybox to respect the active skybox type
export function updateSkybox() {
    if (useRealisticSky && window.realisticSkyMesh) {
        // Use the new realistic sky system
        const deltaTime = 1 / 60; // Approximation when not provided
        updateRealisticSky(window.realisticSkyMesh, deltaTime);
    } else if (window.skybox) {
        // Use the traditional skybox system
        const newColor = getGradualSkyboxColor();
        window.skybox.material.color.lerp(newColor, 0.03);
        window.skybox.position.copy(camera.position);
    }
}

export function setupSky() {
    // Create a sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 32);
    // Inside faces
    skyGeometry.scale(-1, 1, 1);

    // Create a basic material first, then set properties
    skyMaterial = new THREE.MeshBasicMaterial();

    // Set properties after creation
    skyMaterial.color = new THREE.Color(0x0a1a2a); // Dark blue for night
    skyMaterial.side = THREE.BackSide;
    skyMaterial.fog = false;
    skyMaterial.depthWrite = false; // Prevent sky from writing to depth buffer

    // Create the sky mesh
    skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    skyMesh.renderOrder = -1; // Ensure it renders first
    scene.add(skyMesh);

    // Create a sun/moon mesh with larger size
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.9,
        depthWrite: false, // Prevent sun from writing to depth buffer
        depthTest: false   // Disable depth testing for the sun
    });

    // Add a glow effect to the sun
    const sunGlowGeometry = new THREE.SphereGeometry(sunSize * 1.2, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
        depthWrite: false, // Prevent glow from writing to depth buffer
        depthTest: false   // Disable depth testing for the glow
    });

    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);

    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.add(sunGlow); // Add glow as a child of the sun
    sunMesh.renderOrder = 1000; // Ensure sun renders after everything else
    sunMesh.frustumCulled = false; // This prevents the sun from being culled when far away

    // Position it at the same position as the directional light
    // but scaled to be at the edge of the skybox
    const lightDirection = new THREE.Vector3()
        .copy(directionalLight.position)
        .normalize();
    sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

    scene.add(sunMesh);

    // Also ensure camera far plane is sufficient
    // Add this right after the above code
    if (camera.far < skyRadius * 2) {
        camera.far = skyRadius * 2;
        camera.updateProjectionMatrix();
        console.log("Increased camera far plane to see sun:", camera.far);
    }
}

// Modify updateTimeOfDay to skip skybox material changes when using realistic sky
export function updateTimeOfDay(deltaTime) {
    const timeOfDay = getTimeOfDay().toLowerCase();

    // If time of day has changed, start transition
    if (timeOfDay !== lastTimeOfDay) {
        console.log(`Time of day changed to: ${timeOfDay}`);
        lastTimeOfDay = timeOfDay;
        skyboxTransitionProgress = 0;
    }

    // Update transition progress
    if (skyboxTransitionProgress < 1) {
        skyboxTransitionProgress += deltaTime / skyboxTransitionDuration;
        skyboxTransitionProgress = Math.min(skyboxTransitionProgress, 1);

        // Get target colors and settings
        const targetAmbientLight = getAmbientLight(timeOfDay);
        const targetDirectionalLight = getDirectionalLight(timeOfDay);

        // Skip skyMaterial update if using realistic sky
        if (skyMaterial && !useRealisticSky) {
            const targetSkyColor = getSkyColor(timeOfDay);
            skyMaterial.color.lerp(targetSkyColor, 0.05);
        }

        // Update ambient light with faster transition
        ambientLight.color.lerp(targetAmbientLight.color, 0.05);
        ambientLight.intensity += (targetAmbientLight.intensity - ambientLight.intensity) * 0.05;

        // Update directional light with faster transition
        directionalLight.color.lerp(targetDirectionalLight.color, 0.05);
        directionalLight.intensity += (targetDirectionalLight.intensity - directionalLight.intensity) * 0.05;

        // Update directional light position with faster transition
        directionalLight.position.x += (targetDirectionalLight.position.x - directionalLight.position.x) * 0.05;
        directionalLight.position.y += (targetDirectionalLight.position.y - directionalLight.position.y) * 0.05;
        directionalLight.position.z += (targetDirectionalLight.position.z - directionalLight.position.z) * 0.05;

        // Update sun position to match directional light but ensure it stays within skybox
        if (sunMesh) {
            // Calculate direction from origin to light
            const lightDirection = new THREE.Vector3()
                .copy(directionalLight.position)
                .normalize();

            // Position sun at the edge of the skybox in the light direction
            sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

            // Always face the sun toward the camera
            sunMesh.lookAt(camera.position);

            // Update sun color and size based on time of day
            if (timeOfDay === 'night') {
                sunMesh.material.color.set(0xccddff); // Brighter moon (was 0xaaaaff)
                sunMesh.scale.set(0.7, 0.7, 0.7); // Smaller moon
                updateMoonGlow(); // Update moon glow
            } else if (timeOfDay === 'dawn' || timeOfDay === 'dusk') {
                sunMesh.material.color.set(0xff7700); // Orange for sunrise/sunset
                sunMesh.scale.set(1.2, 1.2, 1.2); // Slightly larger sun at dawn/dusk
            } else {
                sunMesh.material.color.set(0xffffaa); // Yellow for day
                sunMesh.scale.set(1.0, 1.0, 1.0); // Normal size for day
            }
        }

        // Update skybox to match time of day - but only when NOT using realistic sky
        if (!useRealisticSky) {
            updateSkybox();
        }
    }

    // Always update moon glow when it's night
    if (lastTimeOfDay === 'night') {
        updateMoonGlow();
    }
}

export function getDirectionalLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0xffb55a), // Warmer orange sunrise
                intensity: 1.4, // Doubled from 0.7
                position: new THREE.Vector3(-500, 1000, 0)
            };
        case 'day':
            return {
                color: new THREE.Color(0xffefd1), // Warmer, less harsh sunlight
                intensity: 1.6, // Doubled from 0.8
                position: new THREE.Vector3(0, 1800, 0)
            };
        case 'dusk':
            return {
                color: new THREE.Color(0xff6a33), // Richer sunset color
                intensity: 1.4, // Doubled from 0.7
                position: new THREE.Vector3(500, 1000, 0)
            };
        case 'night':
            return {
                color: new THREE.Color(0x6a8abc), // Brighter, more blue-tinted moonlight (was 0x445e8c)
                intensity: 1.0, // Doubled from 0.5
                position: new THREE.Vector3(0, -1000, 1000)
            };
        default:
            return {
                color: new THREE.Color(0xffefd1),
                intensity: 1.6, // Doubled from 0.8
                position: new THREE.Vector3(0, 1800, 0)
            };
    }
}

// Update updateSunPosition to avoid conflicts with realistic sky
export function updateSunPosition() {
    if (sunMesh && directionalLight) {
        // Get gradual sun position
        const sunPosition = getGradualSunPosition();

        // Update directional light position to match sun
        directionalLight.position.copy(sunPosition);

        // Position sun mesh at edge of skybox in light direction
        const lightDirection = new THREE.Vector3()
            .copy(directionalLight.position)
            .normalize();

        sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

        // Always face the sun toward the camera
        sunMesh.lookAt(camera.position);

        // Update sun color and intensity
        const sunColor = getGradualSunColor();
        sunMesh.material.color.lerp(sunColor, 0.05);

        // Update sun size based on time (smaller at night)
        const dayPhase = (getTime() * 0.005) % 1;
        const sunScale = (dayPhase > 0.85 || dayPhase < 0.15) ? 0.7 : 1.0;
        sunMesh.scale.lerp(new THREE.Vector3(sunScale, sunScale, sunScale), 0.05);

        // Update directional light intensity and color
        const intensity = getGradualLightIntensity();
        directionalLight.intensity = directionalLight.intensity * 0.95 + intensity * 0.05;
        directionalLight.color.lerp(sunColor, 0.05);

        // Update ambient light intensity (brighter during day)
        if (ambientLight) {
            ambientLight.intensity = 0.2 + intensity * 0.3;
        }
    }
}

export function getTimeOfDay() {
    // Cycle through different times of day
    const dayPhase = (getTime() * 0.005) % 1; // 0 to 1 representing full day cycle

    if (dayPhase < 0.2) return "Dawn";
    if (dayPhase < 0.4) return "Day";
    if (dayPhase < 0.6) return "Afternoon";
    if (dayPhase < 0.8) return "Dusk";
    return "Night";
}

function getSkyColor(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return new THREE.Color(0x9a6a8c); // Purplish dawn
        case 'day':
            return new THREE.Color(0x87ceeb); // Sky blue
        case 'dusk':
            return new THREE.Color(0xff7f50); // Coral sunset
        case 'night':
            return new THREE.Color(0x1a2a4a); // Lighter night blue (was 0x0a1a2a)
        default:
            return new THREE.Color(0x87ceeb);
    }
}

function getAmbientLight(timeOfDay) {
    switch (timeOfDay) {
        case 'dawn':
            return {
                color: new THREE.Color(0x7a5c70), // Purple-tinted for dawn
                intensity: 0.4 // Doubled from 0.2
            };
        case 'day':
            return {
                color: new THREE.Color(0x89a7c5), // Slightly bluer sky ambient
                intensity: 0.5 // Doubled from 0.25
            };
        case 'dusk':
            return {
                color: new THREE.Color(0x614b5a), // Deeper dusk ambient
                intensity: 0.4 // Doubled from 0.2
            };
        case 'night':
            return {
                color: new THREE.Color(0x2a3045), // Lighter night ambient (was 0x1a2035)
                intensity: 0.5 // Doubled from 0.25
            };
        default:
            return {
                color: new THREE.Color(0x89a7c5),
                intensity: 0.5 // Doubled from 0.25
            };
    }
}

function getGradualSunPosition() {
    // Use same day phase calculation as skybox for consistency
    const dayPhase = (getTime() * 0.005) % 1;

    // Calculate sun position in an arc from east to west
    // Angle goes from -π/2 (dawn) through π/2 (noon) to 3π/2 (dusk/night)
    const angle = (dayPhase * Math.PI * 2) - Math.PI / 2;

    // Sun height follows a sine curve (highest at noon)
    const height = Math.sin(dayPhase * Math.PI) * 800;
    const distance = 1000;

    // Calculate position
    const x = Math.cos(angle) * distance;
    const y = Math.max(height, -700); // Keep minimum height
    const z = Math.sin(angle) * distance;

    return new THREE.Vector3(x, y, z);
}

function getGradualSunColor() {
    const dayPhase = (getTime() * 0.005) % 1;

    // Define colors for different phases
    if (dayPhase < 0.2) {
        // Dawn
        return new THREE.Color(0xff7700); // Orange sunrise
    } else if (dayPhase < 0.75) {
        // Day
        return new THREE.Color(0xffffaa); // Yellow day
    } else if (dayPhase < 0.85) {
        // Dusk
        return new THREE.Color(0xff7700); // Orange sunset
    } else {
        // Night
        return new THREE.Color(0xaaaaff); // Bluish moon
    }
}

// Get gradual light intensity based on time
function getGradualLightIntensity() {
    const dayPhase = (getTime() * 0.005) % 1;

    // Highest at noon, lowest at night (all values doubled)
    if (dayPhase < 0.25) {
        // Dawn - rising intensity
        return 0.4 + (dayPhase / 0.25) * 1.6; // Doubled from 0.2 + * 0.8
    } else if (dayPhase < 0.75) {
        // Day - full intensity
        return 2.0; // Doubled from 1.0
    } else if (dayPhase < 0.85) {
        // Dusk - falling intensity
        return 2.0 - ((dayPhase - 0.75) / 0.1) * 1.6; // Doubled from 1.0 - * 0.8
    } else {
        // Night - low intensity
        return 0.4; // Doubled from 0.2
    }
}

// Add this function to enhance moon glow at night
function updateMoonGlow() {
    if (sunMesh && lastTimeOfDay === 'night') {
        // Find the glow child of the sun/moon
        sunMesh.children.forEach(child => {
            if (child.material) {
                // Enhance the glow for the moon
                child.material.opacity = 0.6; // Increased from 0.4
                child.scale.set(1.5, 1.5, 1.5); // Larger glow for moon
                child.material.color.set(0xaaddff); // Bluer glow for moon
            }
        });

        // Make the moon itself brighter
        if (sunMesh.material) {
            sunMesh.material.color.set(0xccddff); // Brighter moon
            sunMesh.material.opacity = 1.0; // Full opacity
        }
    }
}

// Create a shader-based sky with realistic gradients
export function setupRealisticSky() {
    // Create a sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 64, 64);
    // Inside faces
    skyGeometry.scale(-1, 1, 1);

    // Create a shader material for realistic sky gradients with enhanced gradients
    const skyShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            sunPosition: { value: new THREE.Vector3(0, 0, 0) },
            sunColor: { value: new THREE.Color(0xffaa44) },
            horizonColor: { value: new THREE.Color(0xff7700) },
            zenithColor: { value: new THREE.Color(0x1a3b80) },
            fadeExponent: { value: 2.5 },        // Increased for more dramatic gradient
            sunSize: { value: 0.04 },            // Increased sun size
            sunFuzziness: { value: 0.02 },       // Increased fuzziness
            gradientSharpness: { value: 0.6 },   // New parameter for gradient control
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            uniform vec3 sunPosition;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                // Compute sun direction for each vertex
                vSunDirection = normalize(sunPosition);
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            
            uniform vec3 sunColor;
            uniform vec3 horizonColor;
            uniform vec3 zenithColor;
            uniform float fadeExponent;
            uniform float sunSize;
            uniform float sunFuzziness;
            uniform float gradientSharpness;
            uniform float time;
            
            vec3 getSkyColor(vec3 direction) {
                // Calculate gradient based on height (y-coordinate)
                float y = normalize(direction).y;
                
                // More pronounced horizon band
                float horizonBand = 1.0 - pow(abs(y), gradientSharpness);
                
                // Main sky gradient - more dramatic from zenith to horizon
                float horizonFactor = pow(1.0 - abs(y), fadeExponent);
                
                // Add sun-influenced warmth on the sun's side of the sky
                float sunSideFactor = max(0.0, dot(normalize(direction), normalize(vec3(vSunDirection.x, 0.0, vSunDirection.z))));
                sunSideFactor = pow(sunSideFactor, 2.0); // More concentrated toward sun direction
                
                // Mix zenith color with horizon color based on enhanced factors
                vec3 baseColor = mix(zenithColor, horizonColor, horizonFactor);
                
                // Add sun-side warming effect to the base color
                baseColor = mix(baseColor, mix(horizonColor, sunColor, 0.3), sunSideFactor * 0.5);
                
                return baseColor;
            }
            
            void main() {
                // Normalize the world position to get the ray direction
                vec3 direction = normalize(vWorldPosition);
                
                // Get base sky gradient
                vec3 skyColor = getSkyColor(direction);
                
                // Calculate sun effect with larger, more diffuse sun
                float angle = max(0.0, dot(direction, vSunDirection));
                float sunFactor = smoothstep(1.0 - sunSize - sunFuzziness, 1.0 - sunSize + sunFuzziness, angle);
                
                // Add much stronger atmospheric scattering effect
                float scatterAngle = max(0.0, dot(direction, vec3(vSunDirection.x, 0.0, vSunDirection.z)));
                float scatter = pow(scatterAngle, 4.0) * 0.8;
                scatter *= (1.0 - direction.y * 0.75); // More scattering near horizon
                
                // Add direction-based color variation
                // This creates a more pronounced gradient that depends on view angle relative to the sun
                float eastWestFactor = abs(dot(normalize(vec3(direction.x, 0.0, direction.z)), 
                                            normalize(vec3(vSunDirection.x, 0.0, vSunDirection.z))));
                eastWestFactor = pow(eastWestFactor, 3.0); // More concentrated
                
                // Enhance colors opposite to the sun (purplish/pinkish hues at dusk/dawn)
                float oppositeSun = 1.0 - eastWestFactor;
                vec3 oppositeTint = mix(vec3(0.4, 0.2, 0.6), vec3(0.7, 0.3, 0.5), oppositeSun);
                
                // Mix sky with sun and scattering colors
                vec3 finalColor = mix(skyColor, sunColor, sunFactor);
                
                // Apply scatter effect (stronger)
                finalColor = mix(finalColor, mix(horizonColor, sunColor, 0.7), scatter);
                
                // Apply opposite-sun coloring in a more subtle way
                if (vSunDirection.y < 0.3 && vSunDirection.y > -0.3) { // Only during dawn/dusk
                    finalColor = mix(finalColor, finalColor * oppositeTint, oppositeSun * (1.0 - abs(direction.y)) * 0.3);
                }
                
                // Add subtle cloud-like variations
                float noise = sin(direction.x * 50.0 + time * 0.2) * 
                              sin(direction.z * 50.0 + time * 0.1) * 
                              sin(direction.y * 30.0 + time * 0.15) * 0.03;
                              
                finalColor += noise * vec3(1.0, 0.8, 0.6) * (1.0 - abs(direction.y));
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false
    });

    // Create the sky mesh with shader material
    const realisticSkyMesh = new THREE.Mesh(skyGeometry, skyShaderMaterial);
    realisticSkyMesh.renderOrder = -1; // Ensure it renders first
    scene.add(realisticSkyMesh);

    // Store reference globally for updates
    window.realisticSkyMesh = realisticSkyMesh;
    useRealisticSky = true;

    return realisticSkyMesh;
}

// Update realistic sky shader with current sun position and time of day
export function updateRealisticSky(skyMesh, deltaTime) {
    if (!skyMesh || !skyMesh.material || !skyMesh.material.uniforms) return;

    // Get time of day using existing function
    const timeOfDay = getTimeOfDay().toLowerCase();
    const sunPosition = getGradualSunPosition();

    // Update sun position uniform
    skyMesh.material.uniforms.sunPosition.value.copy(sunPosition);

    // Update time uniform for animated effects - slow it down
    skyMesh.material.uniforms.time.value += deltaTime * 0.5;

    // Determine sky colors based on time of day - with more dramatic colors
    let sunColor, horizonColor, zenithColor, fadeExponent, sunSize, sunFuzziness, gradientSharpness;

    switch (timeOfDay) {
        case 'dawn':
            sunColor = new THREE.Color(0xff9933);       // More orange
            horizonColor = new THREE.Color(0xff5500);   // More red-orange
            zenithColor = new THREE.Color(0x0a1a50);    // Deeper blue
            fadeExponent = 3.0;                         // Sharper gradient
            sunSize = 0.035;                            // Larger sun
            sunFuzziness = 0.025;                       // More fuzzy
            gradientSharpness = 0.4;                    // More spread out
            break;

        case 'day':
            sunColor = new THREE.Color(0xffffcc);
            horizonColor = new THREE.Color(0x64c8ff);   // Lighter blue
            zenithColor = new THREE.Color(0x0044aa);    // Deep sky blue
            fadeExponent = 2.2;
            sunSize = 0.03;
            sunFuzziness = 0.015;
            gradientSharpness = 0.7;                    // More concentrated
            break;

        case 'afternoon':
            sunColor = new THREE.Color(0xffeeaa);       // Warmer afternoon sun
            horizonColor = new THREE.Color(0x75c1ff);   // Light blue
            zenithColor = new THREE.Color(0x0040a0);    // Deep blue
            fadeExponent = 2.5;
            sunSize = 0.03;
            sunFuzziness = 0.015;
            gradientSharpness = 0.6;
            break;

        case 'dusk':
            sunColor = new THREE.Color(0xff6600);       // More intense orange
            horizonColor = new THREE.Color(0xff3300);   // More intense red
            zenithColor = new THREE.Color(0x0a1a60);    // Rich blue
            fadeExponent = 3.2;                         // Even sharper
            sunSize = 0.038;                            // Larger setting sun
            sunFuzziness = 0.025;                       // More fuzzy
            gradientSharpness = 0.3;                    // More spread out
            break;

        case 'night':
            sunColor = new THREE.Color(0xaaddff);       // Bluer moon
            horizonColor = new THREE.Color(0x061430);   // Dark blue
            zenithColor = new THREE.Color(0x000008);    // Near black
            fadeExponent = 2.8;
            sunSize = 0.022;
            sunFuzziness = 0.01;
            gradientSharpness = 0.5;
            break;

        default:
            // Default to day
            sunColor = new THREE.Color(0xffffcc);
            horizonColor = new THREE.Color(0x64c8ff);
            zenithColor = new THREE.Color(0x0044aa);
            fadeExponent = 2.2;
            sunSize = 0.03;
            sunFuzziness = 0.015;
            gradientSharpness = 0.7;
    }

    // Update all shader uniforms
    skyMesh.material.uniforms.sunColor.value.copy(sunColor);
    skyMesh.material.uniforms.horizonColor.value.copy(horizonColor);
    skyMesh.material.uniforms.zenithColor.value.copy(zenithColor);
    skyMesh.material.uniforms.fadeExponent.value = fadeExponent;
    skyMesh.material.uniforms.sunSize.value = sunSize;
    skyMesh.material.uniforms.sunFuzziness.value = sunFuzziness;

    // Add the new gradient sharpness parameter
    if (skyMesh.material.uniforms.gradientSharpness) {
        skyMesh.material.uniforms.gradientSharpness.value = gradientSharpness;
    }

    // Keep skybox centered on camera
    skyMesh.position.copy(camera.position);
}