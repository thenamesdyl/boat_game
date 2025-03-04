// Add this function after updateBoatRocking (around line 1210)
import * as THREE from 'three';
import { boat, getTime, getWindData } from '../core/gameState.js';
import { scene } from '../core/gameState.js';


export function animateSail(deltaTime) {
    // Find the sail in the boat
    boat.traverse((object) => {
        if (object.userData && object.userData.isSail) {
            const sail = object;
            const geometry = sail.geometry;
            const time = getTime();

            // Get wind data
            const windData = getWindData();
            const windDirection = windData.direction;
            const windSpeed = windData.speed;

            // Calculate wind vector in world space
            const windVector = new THREE.Vector2(
                Math.cos(windDirection),
                Math.sin(windDirection)
            );

            // Get boat's forward direction
            const boatDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(boat.quaternion);
            const boatDirectionXZ = new THREE.Vector2(boatDirection.x, boatDirection.z).normalize();

            // Calculate relative wind angle (how the wind hits the sail)
            // Dot product gives cosine of angle between vectors
            const windAngle = Math.acos(windVector.dot(boatDirectionXZ));

            // Calculate billowing factor - maximum when wind is perpendicular to sail
            const billowFactor = Math.sin(windAngle) * (windSpeed / 10);

            // Apply wind effect to vertices
            if (geometry.userData.originalPositions) {
                const positions = geometry.attributes.position.array;
                const originalPositions = geometry.userData.originalPositions;

                for (let i = 0; i < positions.length; i += 3) {
                    const x = originalPositions[i];
                    const y = originalPositions[i + 1];
                    const z = originalPositions[i + 2];

                    // Calculate displacement based on position in sail
                    // More displacement in the center, less at edges
                    const verticalPos = (y - originalPositions[1]) / 9; // Normalize to 0-1 range
                    const horizontalPos = Math.abs(x) / 2.5; // Distance from center

                    // Inverse of distance from edge (1 at center, 0 at edges)
                    const edgeFactor = 1 - horizontalPos;

                    // Combined effect - more billowing in center, less at top and edges
                    const displacement = edgeFactor * (1 - verticalPos) * billowFactor;

                    // Calculate wave effect
                    const waveSpeed = 1.5;
                    const waveFrequency = 0.3;
                    const waveAmplitude = 0.1;
                    const wave = Math.sin(verticalPos * 5 + time * waveSpeed) * waveFrequency;

                    // Apply displacement in z-axis (considering sail is rotated)
                    positions[i + 2] = z + displacement + wave * waveAmplitude * windSpeed / 8;
                }

                geometry.attributes.position.needsUpdate = true;
            }
        }
    });
}
