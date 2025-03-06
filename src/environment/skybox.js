import * as THREE from 'three';
import { scene, camera, directionalLight, ambientLight, getTime } from '../core/gameState.js';

const skyRadius = 20001; // Larger sky radius
const sunSize = 600; // Increased size for more impressive sun
const moonSize = 400; // Slightly smaller moon
let skyMaterial;
let skyMesh;
let lastTimeOfDay = "";
let skyboxTransitionProgress = 0;
let skyboxTransitionDuration = 20; // Seconds for transition
let sunMesh, moonMesh;
let sunGlow, moonGlow, sunFlare, moonHalo;

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

    // Define key colors for different times of day with extremely extended day time
    const colors = [
        { phase: 0.0, color: new THREE.Color(0x191970) },   // Night (start/end)
        { phase: 0.025, color: new THREE.Color(0xffa07a) }, // Dawn
        { phase: 0.05, color: new THREE.Color(0x4287f5) },  // Day start
        { phase: 0.925, color: new THREE.Color(0x4287f5) }, // Day end
        { phase: 0.95, color: new THREE.Color(0xff7f50) },  // Dusk
        { phase: 0.975, color: new THREE.Color(0x191970) }  // Night (approaching end of cycle)
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

    // ===== SUN IMPLEMENTATION =====
    // Create a sun mesh with larger size and more detailed geometry
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffcc, // Warmer yellow color
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        depthTest: false
    });

    // Add a primary glow effect to the sun
    const sunGlowGeometry = new THREE.SphereGeometry(sunSize * 1.4, 32, 32);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd88, // Warm orange-yellow glow
        transparent: true,
        opacity: 0.6,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending // Add additive blending for brighter effect
    });

    // Create an outer corona effect
    const sunCoronaGeometry = new THREE.SphereGeometry(sunSize * 2.5, 32, 32);
    const sunCoronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa44, // Orange corona
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });

    // Create sun lens flare effect (simplified circle)
    const sunFlareGeometry = new THREE.CircleGeometry(sunSize * 0.4, 32);
    const sunFlareMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    // Create meshes for all sun effects
    sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    const sunCorona = new THREE.Mesh(sunCoronaGeometry, sunCoronaMaterial);
    sunFlare = new THREE.Mesh(sunFlareGeometry, sunFlareMaterial);

    // Position the flare slightly offset from the sun
    sunFlare.position.set(sunSize * 0.1, sunSize * 0.1, -sunSize * 0.5);

    // Create the main sun mesh and add all effects as children
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.add(sunGlow);
    sunMesh.add(sunCorona);
    sunMesh.add(sunFlare);
    sunMesh.renderOrder = 1000;
    sunMesh.frustumCulled = false;

    // ===== MOON IMPLEMENTATION =====
    // Create moon with craters texture effect (procedural)
    const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // Pure white base color for better visibility
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        depthTest: false
    });

    // Create procedural moon texture with more contrast
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 512;
    moonCanvas.height = 512;
    const moonContext = moonCanvas.getContext('2d');

    // Fill with base color
    moonContext.fillStyle = '#ffffff';
    moonContext.fillRect(0, 0, 512, 512);

    // Add more visible craters with higher contrast
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = 5 + Math.random() * 25;
        const shade = 120 + Math.floor(Math.random() * 70); // Darker craters for contrast

        // Create gradient for each crater
        const gradient = moonContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgb(${shade}, ${shade}, ${shade + 20})`);
        gradient.addColorStop(1, '#ffffff');

        moonContext.beginPath();
        moonContext.fillStyle = gradient;
        moonContext.arc(x, y, radius, 0, Math.PI * 2);
        moonContext.fill();
    }

    // Add distinctive mare patterns (darker areas)
    for (let i = 0; i < 5; i++) {
        const x = 100 + Math.random() * 312;
        const y = 100 + Math.random() * 312;
        const radius = 40 + Math.random() * 60;

        moonContext.beginPath();
        moonContext.fillStyle = `rgba(100, 110, 150, 0.15)`;
        moonContext.arc(x, y, radius, 0, Math.PI * 2);
        moonContext.fill();
    }

    // Create texture from canvas
    const moonTexture = new THREE.CanvasTexture(moonCanvas);
    moonMaterial.map = moonTexture;

    // Add a soft glow effect to the moon
    const moonGlowGeometry = new THREE.SphereGeometry(moonSize * 1.5, 32, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaddff, // Blue-tinted glow
        transparent: true,
        opacity: 0.5, // Increased from 0.4
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });

    // Create a halo effect for the moon
    const moonHaloGeometry = new THREE.RingGeometry(moonSize * 1.6, moonSize * 2.5, 32);
    const moonHaloMaterial = new THREE.MeshBasicMaterial({
        color: 0x8899ff, // Stronger blue halo
        transparent: true,
        opacity: 0.3, // Increased from 0.2
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });

    // Create moon meshes
    moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moonHalo = new THREE.Mesh(moonHaloGeometry, moonHaloMaterial);

    // Create the main moon mesh and add effects
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.add(moonGlow);
    moonMesh.add(moonHalo);
    moonMesh.renderOrder = 1000;
    moonMesh.frustumCulled = false;

    // Initially hide the moon (will be shown at night)
    moonMesh.visible = false;

    // Position sun and moon based on directional light
    const lightDirection = new THREE.Vector3()
        .copy(directionalLight.position)
        .normalize();
    sunMesh.position.copy(lightDirection.multiplyScalar(skyRadius * 0.95));

    // Position moon on opposite side
    const moonDirection = lightDirection.clone().multiplyScalar(-1);
    moonMesh.position.copy(moonDirection.multiplyScalar(skyRadius * 0.95));

    // Add both to scene
    scene.add(sunMesh);
    scene.add(moonMesh);

    // Ensure camera far plane is sufficient
    if (camera.far < skyRadius * 2) {
        camera.far = skyRadius * 2;
        camera.updateProjectionMatrix();
        console.log("Increased camera far plane to see sky objects:", camera.far);
    }
}

// Modify updateTimeOfDay to use the sun/moon transition
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

        // Update directional light with faster transition - only for color and intensity
        // Position is now handled by updateSunPosition
        directionalLight.color.lerp(targetDirectionalLight.color, 0.05);
        directionalLight.intensity += (targetDirectionalLight.intensity - directionalLight.intensity) * 0.05;

        // Update skybox to match time of day - but only when NOT using realistic sky
        if (!useRealisticSky) {
            updateSkybox();
        }
    }

    // Always update moon glow when it's night
    if (lastTimeOfDay === 'night') {
        updateMoonGlow();
    } else {
        // Add subtle pulsing effect to sun during the day
        updateSunPulse(deltaTime);
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

// Update function to properly handle the sun and moon positions realistically
export function updateSunPosition() {
    // Use same day phase calculation as skybox for consistency
    const dayPhase = (getTime() * 0.005) % 1;

    // Get the positions for both sun and moon
    const sunPosition = calculateSunPosition(dayPhase);
    const moonPosition = calculateMoonPosition(dayPhase);

    // Update sun and moon positions and visibility
    updateCelestialBodyPositions(sunPosition, moonPosition, dayPhase);

    // Update directional light to follow the main light source (sun during day, moon during night)
    updateLightSource(sunPosition, moonPosition, dayPhase);
}

// Replace getGradualSunPosition with specific calculations for sun
function calculateSunPosition(dayPhase) {
    // Calculate angle: 0 at dawn (rising in east), π/2 at noon (directly above), π at dusk (setting in west)
    // Dawn: 0.025, Day: 0.475, Afternoon: 0.925, Dusk: 0.95, Night: 1.0

    // Map dayPhase to sun angle
    let sunAngle;

    if (dayPhase < 0.025) {
        // Dawn - rising from horizon
        sunAngle = Math.PI * (dayPhase / 0.025) - Math.PI;
    } else if (dayPhase < 0.475) {
        // Morning - rising to zenith
        sunAngle = (dayPhase - 0.025) / (0.475 - 0.025) * (Math.PI / 2);
    } else if (dayPhase < 0.925) {
        // Afternoon - moving from zenith toward west, still above horizon
        // Adjust this range to make sure the sun is visible in the afternoon
        // It should only start setting closer to dusk
        const afternoonProgress = (dayPhase - 0.475) / (0.925 - 0.475);
        // Make the afternoon descent slower - only go 3/8 of the way down by end of afternoon
        sunAngle = Math.PI / 2 + afternoonProgress * (Math.PI / 4);
    } else if (dayPhase < 0.95) {
        // Dusk - setting below horizon - make this transition more dramatic
        const duskProgress = (dayPhase - 0.925) / (0.95 - 0.925);
        // Start from where afternoon left off (π/2 + π/4 = 3π/4) and go to just below horizon
        sunAngle = 3 * Math.PI / 4 + duskProgress * (Math.PI / 4);
    } else {
        // Night - sun is below horizon, set to opposite side
        sunAngle = Math.PI * 1.5;
    }

    // Calculate position in 3D space - we want it to go below the horizon
    const distance = skyRadius * 0.9; // Distance from center

    // Calculate height based on sine of angle, but adjust to make the sun clearly visible at all appropriate times
    // At angle 0 or PI, height should be 0 (horizon)
    // At angle PI/2, height should be maximum (zenith)
    const height = Math.sin(sunAngle) * distance;

    // Calculate x,z position
    const x = Math.cos(sunAngle) * distance;
    // Add a small z offset to make the sun's path slightly tilted for visual interest
    const z = Math.sin(sunAngle * 0.2) * distance * 0.2;

    return new THREE.Vector3(x, height, z);
}

// New function to calculate moon position based on dayPhase
function calculateMoonPosition(dayPhase) {
    // The moon follows opposite cycle to the sun
    // When sun is at noon, moon is below horizon
    // When sun sets, moon rises from opposite horizon

    // Offset moon phase by 0.5 to place it opposite the sun in the cycle
    const moonPhase = (dayPhase + 0.5) % 1;

    // Use the same angle calculation logic as the sun but modified for better visibility
    let moonAngle;

    if (moonPhase < 0.025) {
        // Moon rising from horizon
        moonAngle = Math.PI * (moonPhase / 0.025) - Math.PI;
    } else if (moonPhase < 0.475) {
        // Moon rising to zenith
        moonAngle = (moonPhase - 0.025) / (0.475 - 0.025) * (Math.PI / 2);
    } else if (moonPhase < 0.925) {
        // Moon moving from zenith toward west
        const afternoonProgress = (moonPhase - 0.475) / (0.925 - 0.475);
        // Make the moon's movement mirror the sun's
        moonAngle = Math.PI / 2 + afternoonProgress * (Math.PI / 4);
    } else if (moonPhase < 0.95) {
        // Moon setting below horizon
        const duskProgress = (moonPhase - 0.925) / (0.95 - 0.925);
        moonAngle = 3 * Math.PI / 4 + duskProgress * (Math.PI / 4);
    } else {
        // Moon below horizon
        moonAngle = Math.PI * 1.5;
    }

    // Calculate position - similar to sun but rotate 180 degrees on x-z plane
    const distance = skyRadius * 0.85; // Slightly closer than sun
    const height = Math.sin(moonAngle) * distance;

    // Rotate 180 degrees from sun position at same angle
    const x = -Math.cos(moonAngle) * distance;
    // Add a small tilt in a different direction from the sun
    const z = Math.sin(moonAngle * 0.2) * distance * -0.2;

    return new THREE.Vector3(x, height, z);
}

// New function to update both celestial bodies based on their calculated positions
function updateCelestialBodyPositions(sunPosition, moonPosition, dayPhase) {
    if (!sunMesh || !moonMesh) return;

    // Update sun position and visibility
    sunMesh.position.copy(sunPosition);

    // Update moon position and visibility
    moonMesh.position.copy(moonPosition);

    // Set visibility based on height (if below horizon, not visible)
    // Add some transition to avoid abrupt appearing/disappearing
    // Reduced horizon buffer to make transitions shorter and ensure full visibility
    const horizonBuffer = 50;

    // Sun visibility based on height
    if (sunPosition.y < -horizonBuffer * 2) {
        // Well below horizon
        sunMesh.visible = false;
    } else if (sunPosition.y < horizonBuffer) {
        // Transition zone near horizon
        sunMesh.visible = true;
        // Calculate opacity based on height
        const opacity = (sunPosition.y + horizonBuffer) / (2 * horizonBuffer);
        sunMesh.material.opacity = opacity;
        // Also adjust children opacity
        sunMesh.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                child.material.opacity = child.material.opacity * opacity;
            }
        });
    } else {
        // Well above horizon
        sunMesh.visible = true;
        sunMesh.material.opacity = 1.0;
        // Reset children opacity
        sunMesh.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                // Reset to natural opacity based on child type
                if (child === sunGlow) {
                    child.material.opacity = 0.6;
                } else if (child === sunFlare) {
                    child.material.opacity = 0.7;
                }
            }
        });
    }

    // Moon visibility based on height
    if (moonPosition.y < -horizonBuffer * 2) {
        // Well below horizon
        moonMesh.visible = false;
    } else if (moonPosition.y < horizonBuffer) {
        // Transition zone near horizon
        moonMesh.visible = true;
        // Calculate opacity based on height
        const opacity = (moonPosition.y + horizonBuffer) / (2 * horizonBuffer);
        moonMesh.material.opacity = opacity;
        // Also adjust children opacity
        moonMesh.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                child.material.opacity = child.material.opacity * opacity;
            }
        });
    } else {
        // Well above horizon - make the moon more visible with brighter material
        moonMesh.visible = true;
        moonMesh.material.opacity = 1.0;

        // Make moon more visible at night
        if (dayPhase >= 0.95 || dayPhase < 0.025) {
            // Boost moon brightness at night 
            if (moonMesh.material.color) {
                moonMesh.material.color.set(0xffffff); // Brighter white
            }

            // Reset children opacity with higher values
            moonMesh.children.forEach(child => {
                if (child.material && child.material.opacity !== undefined) {
                    // Enhanced opacity for night
                    if (child === moonGlow) {
                        child.material.opacity = 0.7; // Increased from 0.4
                    } else if (child === moonHalo) {
                        child.material.opacity = 0.35; // Increased from 0.2
                    }
                }
            });
        } else {
            // Reset children opacity to normal values when moon is visible during day
            moonMesh.children.forEach(child => {
                if (child.material && child.material.opacity !== undefined) {
                    if (child === moonGlow) {
                        child.material.opacity = 0.4;
                    } else if (child === moonHalo) {
                        child.material.opacity = 0.2;
                    }
                }
            });
        }
    }

    // Always face celestial bodies toward the camera
    sunMesh.lookAt(camera.position);
    moonMesh.lookAt(camera.position);

    // Update sun appearance based on phase
    updateSunAppearance(dayPhase);
}

// Update directional light to follow the active celestial body (sun or moon)
function updateLightSource(sunPosition, moonPosition, dayPhase) {
    // Determine which celestial body is the primary light source
    let primaryLightPosition;
    let primaryLightColor;
    let lightIntensity;

    // Night is from 0.95 to 0.025
    const isNight = (dayPhase >= 0.95 || dayPhase < 0.025);

    if (isNight) {
        // Use moon as light source during night
        primaryLightPosition = moonPosition;
        primaryLightColor = new THREE.Color(0x6a8abc); // Moonlight color
        lightIntensity = 1.0; // Moon light intensity
    } else {
        // Use sun as light source during day
        primaryLightPosition = sunPosition;

        // Adjust color based on sun position
        if (dayPhase < 0.05) {
            // Dawn
            primaryLightColor = new THREE.Color(0xffb55a);
            lightIntensity = 1.4;
        } else if (dayPhase >= 0.9) {
            // Dusk
            primaryLightColor = new THREE.Color(0xff6a33);
            lightIntensity = 1.4;
        } else {
            // Day
            primaryLightColor = new THREE.Color(0xffefd1);
            lightIntensity = 1.6;
        }
    }

    // Update directional light
    directionalLight.position.lerp(primaryLightPosition, 0.05);
    directionalLight.color.lerp(primaryLightColor, 0.05);
    directionalLight.intensity = directionalLight.intensity * 0.95 + lightIntensity * 0.05;

    // Update ambient light intensity based on time (brighter during day)
    const ambientIntensity = isNight ? 0.5 : 0.2 + lightIntensity * 0.3;
    ambientLight.intensity = ambientLight.intensity * 0.95 + ambientIntensity * 0.05;

    // Update ambient light color
    const ambientColor = isNight
        ? new THREE.Color(0x2a3045)  // Night ambient
        : new THREE.Color(0x89a7c5); // Day ambient
    ambientLight.color.lerp(ambientColor, 0.05);
}

// Update sun appearance based on the time of day
function updateSunAppearance(dayPhase) {
    if (!sunMesh) return;

    let sunColor, glowColor, flareOpacity, sunScale;

    if (dayPhase < 0.025) {
        // Dawn
        sunColor = new THREE.Color(0xff8800);
        glowColor = new THREE.Color(0xff6600);
        flareOpacity = 0.8;
        sunScale = 1.2;
    } else if (dayPhase < 0.925) {
        // Day
        sunColor = new THREE.Color(0xffffcc);
        glowColor = new THREE.Color(0xffdd88);
        flareOpacity = 0.7;
        sunScale = 1.0;
    } else if (dayPhase < 0.95) {
        // Dusk
        sunColor = new THREE.Color(0xff8800);
        glowColor = new THREE.Color(0xff6600);
        flareOpacity = 0.8;
        sunScale = 1.2;
    } else {
        // Night (sun not visible, but update anyway)
        sunColor = new THREE.Color(0xff8800);
        glowColor = new THREE.Color(0xff6600);
        flareOpacity = 0.7;
        sunScale = 1.0;
    }

    // Apply changes with smooth transitions
    sunMesh.material.color.lerp(sunColor, 0.05);
    sunMesh.scale.lerp(new THREE.Vector3(sunScale, sunScale, sunScale), 0.05);

    // Update sun effects
    if (sunGlow) {
        sunGlow.material.color.lerp(glowColor, 0.05);
    }

    if (sunFlare && sunFlare.material) {
        sunFlare.material.opacity = sunFlare.material.opacity * 0.95 + flareOpacity * 0.05;
    }
}

export function getTimeOfDay() {
    // Cycle through different times of day
    const dayPhase = (getTime() * 0.005) % 1; // 0 to 1 representing full day cycle

    // Modified distribution to make day 20x longer (90% of the cycle)
    if (dayPhase < 0.025) return "Dawn";      // 2.5% for dawn
    if (dayPhase < 0.475) return "Day";       // 45% for day 
    if (dayPhase < 0.925) return "Afternoon"; // 45% for afternoon (90% total for blue sky)
    if (dayPhase < 0.95) return "Dusk";       // 2.5% for dusk
    return "Night";                           // 5% for night
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

// Enhanced function to update moon glow with subtle animation
function updateMoonGlow() {
    if (moonMesh && (lastTimeOfDay === 'night' || moonMesh.visible)) {
        // Create more dynamic pulsing effect for moon glow
        const time = getTime() * 0.001;
        const pulseAmount = Math.sin(time * 0.5) * 0.08 + 0.96; // 0.88 to 1.04 range
        const secondaryPulse = Math.sin(time * 0.2) * 0.03; // Second subtle pulse

        // Apply to moon glow with enhanced effects
        if (moonGlow) {
            // Determine base opacity based on time of day
            const baseOpacity = lastTimeOfDay === 'night' ? 0.8 : 0.4;
            moonGlow.material.opacity = baseOpacity * (pulseAmount + secondaryPulse);

            // More dynamic scaling
            const glowScale = lastTimeOfDay === 'night' ? 1.5 : 1.3;
            moonGlow.scale.set(
                glowScale * pulseAmount,
                glowScale * pulseAmount,
                glowScale * pulseAmount
            );

            // Update glow color based on time
            if (lastTimeOfDay === 'night') {
                // Slightly shift color for visual interest
                const blueShift = 0.9 + secondaryPulse * 0.2;
                moonGlow.material.color.setRGB(0.7, 0.85 * blueShift, 1.0 * blueShift);
            }
        }

        // Apply to moon halo with enhanced rotation
        if (moonHalo) {
            // Rotate the halo at varying speeds
            moonHalo.rotation.z += 0.0003 + Math.sin(time * 0.1) * 0.0001;

            // Determine base opacity based on time of day
            const baseOpacity = lastTimeOfDay === 'night' ? 0.4 : 0.2;
            moonHalo.material.opacity = baseOpacity * pulseAmount;

            // Scale halo slightly with pulse
            const haloScale = 1.0 + secondaryPulse * 0.5;
            moonHalo.scale.set(haloScale, haloScale, 1);
        }

        // Make the moon itself brighter at night with subtle color variations
        if (moonMesh.material) {
            if (lastTimeOfDay === 'night') {
                // Subtle color shift for visual interest
                const blueShift = 1.0 + secondaryPulse * 0.05;
                moonMesh.material.color.setRGB(1, 1, blueShift);

                // Slightly enlarged moon at night for better visibility
                const moonScale = 1.2 + secondaryPulse * 0.1;
                moonMesh.scale.set(moonScale, moonScale, moonScale);
            } else {
                moonMesh.material.color.set(0xddddff); // Slightly blue-tinted during day
                moonMesh.scale.set(1.0, 1.0, 1.0); // Normal size during day
            }
        }
    }
}

// Add function to create subtle pulsing/flickering effect for the sun
function updateSunPulse(deltaTime) {
    if (sunMesh && sunMesh.visible) {
        // Create subtle pulsing effect for sun
        const time = getTime() * 0.001;

        // Combine multiple sine waves for a more organic effect
        const pulse1 = Math.sin(time * 0.5) * 0.03;
        const pulse2 = Math.sin(time * 1.3) * 0.015;
        const pulseAmount = 1.0 + pulse1 + pulse2; // Range from ~0.955 to ~1.045

        // Apply to sun glow
        if (sunGlow) {
            const baseScale = 1.4;
            sunGlow.scale.set(
                baseScale * pulseAmount,
                baseScale * pulseAmount,
                baseScale * pulseAmount
            );

            // Also slightly vary the opacity
            sunGlow.material.opacity = 0.6 * (0.95 + 0.1 * Math.sin(time * 0.7));
        }

        // Apply subtle rotation to sun flare
        if (sunFlare) {
            sunFlare.rotation.z += deltaTime * 0.1;
        }
    }
}

// Update function for the updateSkybox method to call
function updateRealisticSky(skyMesh, deltaTime) {
    if (!skyMesh || !skyMesh.material || !skyMesh.material.uniforms) return;

    // Get time of day and phase
    const timeOfDay = getTimeOfDay().toLowerCase();
    const dayPhase = (getTime() * 0.005) % 1;

    // Use our new sun position calculation
    const sunPosition = calculateSunPosition(dayPhase);
    const moonPosition = calculateMoonPosition(dayPhase);

    // Determine which celestial body to use for the sky shader
    const isNight = (dayPhase >= 0.95 || dayPhase < 0.025);
    const celestialPosition = isNight ? moonPosition : sunPosition;

    // Update sun position uniform
    skyMesh.material.uniforms.sunPosition.value.copy(celestialPosition);

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
    if (skyMesh.material.uniforms.sunColor) skyMesh.material.uniforms.sunColor.value.copy(sunColor);
    if (skyMesh.material.uniforms.horizonColor) skyMesh.material.uniforms.horizonColor.value.copy(horizonColor);
    if (skyMesh.material.uniforms.zenithColor) skyMesh.material.uniforms.zenithColor.value.copy(zenithColor);
    if (skyMesh.material.uniforms.fadeExponent) skyMesh.material.uniforms.fadeExponent.value = fadeExponent;
    if (skyMesh.material.uniforms.sunSize) skyMesh.material.uniforms.sunSize.value = sunSize;
    if (skyMesh.material.uniforms.sunFuzziness) skyMesh.material.uniforms.sunFuzziness.value = sunFuzziness;

    // Add the new gradient sharpness parameter
    if (skyMesh.material.uniforms.gradientSharpness) {
        skyMesh.material.uniforms.gradientSharpness.value = gradientSharpness;
    }

    // Keep skybox centered on camera
    skyMesh.position.copy(camera.position);
}