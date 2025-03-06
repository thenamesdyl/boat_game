import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

/**
 * Creates a custom cell-shaded water shader
 * Based on THREE.js Water but modified for toon shading
 */
export class ToonWater extends Water {
    constructor(geometry, options = {}) {
        super(geometry, options);

        // Override the fragment shader to create a cell-shaded look
        this.material.fragmentShader = this.material.fragmentShader.replace(
            'void main() {',
            `
            // Cell-shading function for toon water
            vec3 cellShade(vec3 color, int steps) {
                float factor = 1.0 / float(steps);
                float r = floor(color.r / factor) * factor;
                float g = floor(color.g / factor) * factor;
                float b = floor(color.b / factor) * factor;
                return vec3(r, g, b);
            }
            
            // Function to create cartoony highlights
            vec3 addHighlights(vec3 color, vec3 normal, vec3 lightDir, float intensity) {
                float highlightIntensity = pow(max(0.0, dot(normal, lightDir)), 16.0) * intensity;
                // Use step function for discrete highlight
                highlightIntensity = step(0.7, highlightIntensity) * intensity;
                return color + vec3(highlightIntensity);
            }
            
            void main() {
            `
        );

        // Modify how the final color is calculated to use cell-shading
        this.material.fragmentShader = this.material.fragmentShader.replace(
            'gl_FragColor = vec4( color, alpha );',
            `
            // Apply toon shading - use 3 to 5 steps for cartoony look
            color = cellShade(color, 4);
            
            // Add cartoony highlights for wave crests based on normal
            vec3 viewDir = normalize(cameraPosition - worldPosition);
            vec3 lightDir = normalize(sunDirection);
            color = addHighlights(color, normal, lightDir, 0.3);
            
            // Final color with alpha
            gl_FragColor = vec4(color, alpha);
            `
        );

        // Add additional uniforms for toon shading
        this.material.uniforms.steps = { value: 4 };
        this.material.uniforms.highlightIntensity = { value: 0.3 };

        // Force shader update
        this.material.needsUpdate = true;
    }

    // Method to adjust the number of color steps for toon shading
    setToonSteps(steps) {
        if (this.material.uniforms.steps) {
            this.material.uniforms.steps.value = steps;
        }
    }

    // Method to adjust highlight intensity
    setHighlightIntensity(intensity) {
        if (this.material.uniforms.highlightIntensity) {
            this.material.uniforms.highlightIntensity.value = intensity;
        }
    }
} 