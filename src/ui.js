// Enhanced UI system for the boat game
import * as THREE from 'three';

// Create a UI class to manage all interface elements
class GameUI {
    constructor() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'game-ui';
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.left = '10px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '14px';
        this.container.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        this.container.style.pointerEvents = 'none'; // Don't block mouse events
        document.body.appendChild(this.container);

        // Create mini-map container
        this.miniMapContainer = document.createElement('div');
        this.miniMapContainer.id = 'mini-map';
        this.miniMapContainer.style.position = 'absolute';
        this.miniMapContainer.style.bottom = '20px';
        this.miniMapContainer.style.right = '20px';
        this.miniMapContainer.style.width = '150px';
        this.miniMapContainer.style.height = '150px';
        this.miniMapContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
        this.miniMapContainer.style.borderRadius = '50%';
        this.miniMapContainer.style.border = '2px solid rgba(100, 200, 255, 0.7)';
        document.body.appendChild(this.miniMapContainer);

        // Create UI elements
        this.elements = {
            speed: this.createUIElement('Speed: 0 knots'),
            heading: this.createUIElement('Heading: N 0°'),
            coordinates: this.createUIElement('Position: 0, 0'),
            wind: this.createUIElement('Wind: Calm (0 knots)'),
            time: this.createUIElement('Time: Dawn'),
            playerCount: this.createUIElement('Players: 0'),
            connectionStatus: this.createUIElement('Status: Connecting...'),
            islandDistance: this.createUIElement('Nearest Island: None'),
            compass: this.createCompass(),
            speedometer: this.createSpeedometer()
        };

        // Create island markers for mini-map
        this.islandMarkers = new Map();

        // Create player markers for mini-map
        this.playerMarkers = new Map();

        // Create player marker (self)
        this.selfMarker = document.createElement('div');
        this.selfMarker.style.position = 'absolute';
        this.selfMarker.style.width = '8px';
        this.selfMarker.style.height = '8px';
        this.selfMarker.style.backgroundColor = '#ffff00';
        this.selfMarker.style.borderRadius = '50%';
        this.selfMarker.style.transform = 'translate(-50%, -50%)';
        this.miniMapContainer.appendChild(this.selfMarker);
    }

    createUIElement(text) {
        const element = document.createElement('div');
        element.textContent = text;
        element.style.marginBottom = '8px';
        element.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        this.container.appendChild(element);
        return element;
    }

    createCompass() {
        const compassContainer = document.createElement('div');
        compassContainer.style.width = '80px';
        compassContainer.style.height = '80px';
        compassContainer.style.borderRadius = '50%';
        compassContainer.style.border = '2px solid rgba(100, 200, 255, 0.7)';
        compassContainer.style.position = 'relative';
        compassContainer.style.marginTop = '10px';
        compassContainer.style.marginBottom = '15px';
        compassContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
        compassContainer.style.display = 'flex';
        compassContainer.style.justifyContent = 'center';
        compassContainer.style.alignItems = 'center';

        // Add cardinal directions
        const directions = ['N', 'E', 'S', 'W'];
        directions.forEach((dir, i) => {
            const dirElement = document.createElement('div');
            dirElement.textContent = dir;
            dirElement.style.position = 'absolute';
            dirElement.style.fontWeight = 'bold';

            // Position based on direction
            switch (dir) {
                case 'N':
                    dirElement.style.top = '5px';
                    dirElement.style.left = '50%';
                    dirElement.style.transform = 'translateX(-50%)';
                    break;
                case 'E':
                    dirElement.style.right = '5px';
                    dirElement.style.top = '50%';
                    dirElement.style.transform = 'translateY(-50%)';
                    break;
                case 'S':
                    dirElement.style.bottom = '5px';
                    dirElement.style.left = '50%';
                    dirElement.style.transform = 'translateX(-50%)';
                    break;
                case 'W':
                    dirElement.style.left = '5px';
                    dirElement.style.top = '50%';
                    dirElement.style.transform = 'translateY(-50%)';
                    break;
            }

            compassContainer.appendChild(dirElement);
        });

        const needle = document.createElement('div');
        needle.style.width = '2px';
        needle.style.height = '35px';
        needle.style.backgroundColor = 'red';
        needle.style.position = 'absolute';
        needle.style.top = '50%';
        needle.style.left = '50%';
        needle.style.transformOrigin = 'bottom center';
        needle.style.transform = 'translateX(-50%) translateY(-100%) rotate(0deg)';

        compassContainer.appendChild(needle);
        this.container.appendChild(compassContainer);

        return { container: compassContainer, needle: needle };
    }

    createSpeedometer() {
        const speedContainer = document.createElement('div');
        speedContainer.style.width = '100px';
        speedContainer.style.height = '15px';
        speedContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        speedContainer.style.borderRadius = '10px';
        speedContainer.style.overflow = 'hidden';
        speedContainer.style.marginBottom = '15px';

        const speedBar = document.createElement('div');
        speedBar.style.width = '0%';
        speedBar.style.height = '100%';
        speedBar.style.backgroundColor = 'rgba(0, 255, 128, 0.7)';
        speedBar.style.transition = 'width 0.3s ease-out';

        speedContainer.appendChild(speedBar);
        this.container.appendChild(speedContainer);

        return { container: speedContainer, bar: speedBar };
    }

    addIslandMarker(id, position, radius) {
        if (this.islandMarkers.has(id)) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '6px';
        marker.style.height = '6px';
        marker.style.backgroundColor = '#00ff88';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        this.miniMapContainer.appendChild(marker);

        this.islandMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    addPlayerMarker(id, position, color) {
        if (this.playerMarkers.has(id)) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '6px';
        marker.style.height = '6px';
        marker.style.backgroundColor = color || '#ff0000';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        this.miniMapContainer.appendChild(marker);

        this.playerMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    removePlayerMarker(id) {
        if (!this.playerMarkers.has(id)) return;

        const marker = this.playerMarkers.get(id);
        this.miniMapContainer.removeChild(marker.element);
        this.playerMarkers.delete(id);
    }

    updateMiniMap(playerPosition, playerRotation, mapScale) {
        // Center the player on the mini-map
        const centerX = this.miniMapContainer.clientWidth / 2;
        const centerY = this.miniMapContainer.clientHeight / 2;

        // Update self marker
        this.selfMarker.style.left = `${centerX}px`;
        this.selfMarker.style.top = `${centerY}px`;

        // Update island markers
        this.islandMarkers.forEach((marker, id) => {
            const relX = (marker.position.x - playerPosition.x) / mapScale;
            const relZ = (marker.position.z - playerPosition.z) / mapScale;

            // Rotate relative to player heading
            const rotatedX = relX * Math.cos(-playerRotation) - relZ * Math.sin(-playerRotation);
            const rotatedZ = relX * Math.sin(-playerRotation) + relZ * Math.cos(-playerRotation);

            marker.element.style.left = `${centerX + rotatedX}px`;
            marker.element.style.top = `${centerY + rotatedZ}px`;

            // Hide if outside mini-map
            const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
            if (distance > this.miniMapContainer.clientWidth / 2) {
                marker.element.style.display = 'none';
            } else {
                marker.element.style.display = 'block';
            }
        });

        // Update other player markers
        this.playerMarkers.forEach((marker, id) => {
            const relX = (marker.position.x - playerPosition.x) / mapScale;
            const relZ = (marker.position.z - playerPosition.z) / mapScale;

            // Rotate relative to player heading
            const rotatedX = relX * Math.cos(-playerRotation) - relZ * Math.sin(-playerRotation);
            const rotatedZ = relX * Math.sin(-playerRotation) + relZ * Math.cos(-playerRotation);

            marker.element.style.left = `${centerX + rotatedX}px`;
            marker.element.style.top = `${centerY + rotatedZ}px`;

            // Hide if outside mini-map
            const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
            if (distance > this.miniMapContainer.clientWidth / 2) {
                marker.element.style.display = 'none';
            } else {
                marker.element.style.display = 'block';
            }
        });
    }

    update(data) {
        // Update speed
        if (data.speed !== undefined) {
            this.elements.speed.textContent = `Speed: ${data.speed.toFixed(1)} knots`;
            // Update speedometer (max speed of 10 knots)
            const speedPercent = Math.min(data.speed / 10 * 100, 100);
            this.elements.speedometer.bar.style.width = `${speedPercent}%`;

            // Change color based on speed
            if (data.speed > 7) {
                this.elements.speedometer.bar.style.backgroundColor = 'rgba(255, 50, 50, 0.7)';
            } else if (data.speed > 4) {
                this.elements.speedometer.bar.style.backgroundColor = 'rgba(255, 200, 50, 0.7)';
            } else {
                this.elements.speedometer.bar.style.backgroundColor = 'rgba(0, 255, 128, 0.7)';
            }
        }

        // Update heading
        if (data.heading !== undefined) {
            const headingDegrees = (data.heading * 180 / Math.PI) % 360;
            const cardinalDirection = this.getCardinalDirection(headingDegrees);
            this.elements.heading.textContent = `Heading: ${cardinalDirection} (${Math.abs(headingDegrees).toFixed(0)}°)`;
            this.elements.compass.needle.style.transform = `translateX(-50%) translateY(-100%) rotate(${headingDegrees}deg)`;
        }

        // Update coordinates
        if (data.position) {
            this.elements.coordinates.textContent = `Position: ${data.position.x.toFixed(0)}, ${data.position.z.toFixed(0)}`;
        }

        // Update wind
        if (data.windDirection !== undefined && data.windSpeed !== undefined) {
            const windDescription = this.getWindDescription(data.windSpeed);
            this.elements.wind.textContent = `Wind: ${windDescription} (${data.windSpeed.toFixed(1)} knots)`;
        }

        // Update time
        if (data.timeOfDay !== undefined) {
            this.elements.time.textContent = `Time: ${data.timeOfDay}`;
        }

        // Update player count
        if (data.playerCount !== undefined) {
            this.elements.playerCount.textContent = `Players: ${data.playerCount}`;
        }

        // Update connection status
        if (data.isConnected !== undefined) {
            this.elements.connectionStatus.textContent = data.isConnected ?
                'Status: Connected' : 'Status: Disconnected';
            this.elements.connectionStatus.style.color = data.isConnected ?
                'rgba(100, 255, 100, 1)' : 'rgba(255, 100, 100, 1)';
        }

        // Update nearest island
        if (data.nearestIsland !== undefined) {
            if (data.nearestIsland.distance < 1000) {
                this.elements.islandDistance.textContent =
                    `Nearest Island: ${data.nearestIsland.name} (${data.nearestIsland.distance.toFixed(0)}m)`;
            } else {
                this.elements.islandDistance.textContent = 'Nearest Island: None in range';
            }
        }

        // Update mini-map
        if (data.position && data.heading !== undefined) {
            this.updateMiniMap(data.position, data.heading, data.mapScale || 100);
        }
    }

    getCardinalDirection(degrees) {
        // Normalize to 0-360
        const normalized = ((degrees % 360) + 360) % 360;

        // Define direction ranges
        const directions = [
            { name: 'N', min: 337.5, max: 360 },
            { name: 'N', min: 0, max: 22.5 },
            { name: 'NE', min: 22.5, max: 67.5 },
            { name: 'E', min: 67.5, max: 112.5 },
            { name: 'SE', min: 112.5, max: 157.5 },
            { name: 'S', min: 157.5, max: 202.5 },
            { name: 'SW', min: 202.5, max: 247.5 },
            { name: 'W', min: 247.5, max: 292.5 },
            { name: 'NW', min: 292.5, max: 337.5 }
        ];

        // Find matching direction
        for (const dir of directions) {
            if ((dir.min <= normalized && normalized < dir.max) ||
                (dir.name === 'N' && normalized >= 337.5)) {
                return dir.name;
            }
        }

        return 'N'; // Default
    }

    getWindDescription(speed) {
        // Beaufort scale (simplified)
        if (speed < 1) return 'Calm';
        if (speed < 4) return 'Light Air';
        if (speed < 7) return 'Light Breeze';
        if (speed < 11) return 'Gentle Breeze';
        if (speed < 17) return 'Moderate Breeze';
        if (speed < 22) return 'Fresh Breeze';
        if (speed < 28) return 'Strong Breeze';
        if (speed < 34) return 'Near Gale';
        if (speed < 41) return 'Gale';
        if (speed < 48) return 'Strong Gale';
        if (speed < 56) return 'Storm';
        if (speed < 64) return 'Violent Storm';
        return 'Hurricane';
    }
}

// Create a global UI instance
const gameUI = new GameUI();

// Export the UI instance
export { gameUI }; 