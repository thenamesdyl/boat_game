// Enhanced UI system for the boat game
import * as THREE from 'three';
import { initChat, initMiniMap } from './chat.js';
import { initShop, updateShopAvailability } from '../gameplay/shop.js';
import InventoryUI from './inventoryUI.js';
import { getDiagnosticsData, ENABLE_DIAGNOSTICS, isBraveBrowser } from './diagnostics.js';
import { fireCannons } from '../gameplay/cannons.js';

// Create a UI class to manage all interface elements
class GameUI {
    constructor() {
        // Initialize inventory UI first, before trying to use it
        this.inventoryUI = new InventoryUI();

        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'game-ui';
        this.container.style.position = 'absolute';
        this.container.style.top = '35px';
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

        // Initialize elements as an empty object first
        this.elements = {};

        // Create FPS counter (at the very top left, above all other elements)
        this.elements.fpsCounter = this.createFPSCounter();

        // Create basic UI elements
        this.elements.speed = this.createUIElement('Speed: 0 knots');
        this.elements.heading = this.createUIElement('Heading: N 0°');
        this.elements.coordinates = this.createUIElement('Position: 0, 0');
        this.elements.wind = this.createUIElement('Wind: Calm (0 knots)');
        this.elements.time = this.createUIElement('Time: Dawn');
        this.elements.playerCount = this.createUIElement('Players: 0');
        this.elements.connectionStatus = this.createUIElement('Status: Connecting...');
        this.elements.islandDistance = this.createUIElement('Nearest Island: None');
        this.elements.compass = this.createCompass();
        this.elements.speedometer = this.createSpeedometer();
        this.elements.fishing = this.createFishingUI();
        this.elements.cannon = this.createCannonUI();
        this.elements.inventory = this.createInventory();

        // Initialize player markers and island markers
        this.islandMarkers = new Map();
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

        // Create player stats panel after elements is initialized
        this.createPlayerStatsPanel();

        // Initialize the chat system
        this.chat = initChat();

        // Initialize the mini map and connect it to the chat system
        this.miniMap = initMiniMap();
        this.miniMap.setChatSystem(this.chat);

        // Initialize the shop UI
        this.elements.shop = initShop(this);

        // Connect the fire button to the fireCannons function
        this.elements.cannon.fireButton.addEventListener('click', fireCannons);
    }

    createUIElement(text) {
        const element = document.createElement('div');
        element.textContent = text;
        element.style.marginBottom = '8px';
        element.style.backgroundColor = 'rgba(60, 30, 0, 0.7)';
        element.style.padding = '5px 10px';
        element.style.borderRadius = '5px';
        element.style.border = '1px solid rgba(120, 80, 40, 0.8)';
        element.style.color = '#E6C68A';
        element.style.fontFamily = 'serif';
        this.container.appendChild(element);
        return element;
    }

    createCompass() {
        const compassContainer = document.createElement('div');
        compassContainer.style.width = '80px';
        compassContainer.style.height = '80px';
        compassContainer.style.borderRadius = '50%';
        compassContainer.style.border = '3px solid #B8860B';
        compassContainer.style.position = 'relative';
        compassContainer.style.marginTop = '10px';
        compassContainer.style.marginBottom = '15px';
        compassContainer.style.backgroundColor = '#D2B48C';
        compassContainer.style.backgroundImage = 'radial-gradient(circle, #D2B48C 0%, #C19A6B 100%)';
        compassContainer.style.display = 'flex';
        compassContainer.style.justifyContent = 'center';
        compassContainer.style.alignItems = 'center';
        compassContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';

        const directions = ['N', 'E', 'S', 'W'];
        directions.forEach((dir, i) => {
            const dirElement = document.createElement('div');
            dirElement.textContent = dir;
            dirElement.style.position = 'absolute';
            dirElement.style.fontWeight = 'bold';
            dirElement.style.color = '#8B4513';
            dirElement.style.fontFamily = 'serif';

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
        needle.style.width = '3px';
        needle.style.height = '35px';
        needle.style.backgroundColor = '#B22222';
        needle.style.position = 'absolute';
        needle.style.top = '50%';
        needle.style.left = '50%';
        needle.style.transformOrigin = 'bottom center';
        needle.style.transform = 'translateX(-50%) translateY(-100%) rotate(0deg)';
        needle.style.borderRadius = '50% 50% 0 0';

        const needleBase = document.createElement('div');
        needleBase.style.width = '10px';
        needleBase.style.height = '10px';
        needleBase.style.backgroundColor = '#B8860B';
        needleBase.style.borderRadius = '50%';
        needleBase.style.position = 'absolute';
        needleBase.style.top = '50%';
        needleBase.style.left = '50%';
        needleBase.style.transform = 'translate(-50%, -50%)';
        needleBase.style.boxShadow = 'inset 0 0 3px rgba(0, 0, 0, 0.5)';

        compassContainer.appendChild(needle);
        compassContainer.appendChild(needleBase);
        this.container.appendChild(compassContainer);

        return { container: compassContainer, needle: needle };
    }

    createSpeedometer() {
        const speedContainer = document.createElement('div');
        speedContainer.style.width = '100px';
        speedContainer.style.height = '15px';
        speedContainer.style.backgroundColor = 'rgba(50, 25, 0, 0.7)';
        speedContainer.style.borderRadius = '10px';
        speedContainer.style.overflow = 'hidden';
        speedContainer.style.marginBottom = '15px';
        speedContainer.style.border = '1px solid #B8860B';

        const speedBar = document.createElement('div');
        speedBar.style.width = '0%';
        speedBar.style.height = '100%';
        speedBar.style.backgroundColor = '#B8860B';
        speedBar.style.backgroundImage = 'linear-gradient(to right, #B8860B, #DAA520)';
        speedBar.style.transition = 'width 0.3s ease-out';

        speedContainer.appendChild(speedBar);
        this.container.appendChild(speedContainer);

        return { container: speedContainer, bar: speedBar };
    }

    createFishingUI() {
        // Create fishing container with ornate ship control styling
        const fishingContainer = document.createElement('div');
        fishingContainer.id = 'fishing-ui';
        fishingContainer.style.position = 'absolute';
        fishingContainer.style.bottom = '20px';
        fishingContainer.style.left = '20px';
        fishingContainer.style.width = '180px';
        fishingContainer.style.backgroundColor = '#3A2616'; // Rich dark wood
        fishingContainer.style.padding = '0'; // No padding, will add internal container
        fishingContainer.style.borderRadius = '8px';
        fishingContainer.style.border = '2px solid #DAA520'; // Gold border
        fishingContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7), inset 0 0 5px rgba(0, 0, 0, 0.3)';
        fishingContainer.style.overflow = 'hidden';
        fishingContainer.style.pointerEvents = 'auto';
        document.body.appendChild(fishingContainer);

        // Create header bar with ornate styling
        const headerBar = document.createElement('div');
        headerBar.style.backgroundColor = '#4A2D17'; // Slightly lighter wood for header
        headerBar.style.padding = '6px 10px';
        headerBar.style.borderBottom = '2px solid #DAA520'; // Gold border
        headerBar.style.textAlign = 'center';
        headerBar.style.position = 'relative';
        headerBar.style.backgroundImage = 'linear-gradient(to bottom, #5A3D27, #4A2D17)'; // Wood grain effect
        fishingContainer.appendChild(headerBar);

        // Brass corner accents for header
        const corners = ['top-left', 'top-right'];
        corners.forEach(corner => {
            const accent = document.createElement('div');
            accent.style.position = 'absolute';
            accent.style.width = '10px';
            accent.style.height = '10px';
            accent.style.backgroundColor = '#DAA520';
            accent.style.borderRadius = corner.includes('top') ?
                (corner.includes('left') ? '5px 0 0 0' : '0 5px 0 0') :
                (corner.includes('left') ? '0 0 0 5px' : '0 0 5px 0');

            if (corner.includes('top')) accent.style.top = '0';
            if (corner.includes('bottom')) accent.style.bottom = '0';
            if (corner.includes('left')) accent.style.left = '0';
            if (corner.includes('right')) accent.style.right = '0';

            headerBar.appendChild(accent);
        });

        // Fishing label with ship manifest styling
        const fishingLabel = document.createElement('div');
        fishingLabel.textContent = 'FISHING STATION';
        fishingLabel.style.color = '#FFD700'; // Brighter gold for header
        fishingLabel.style.fontFamily = 'serif';
        fishingLabel.style.fontWeight = 'bold';
        fishingLabel.style.fontSize = '16px';
        fishingLabel.style.letterSpacing = '1px';
        fishingLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        headerBar.appendChild(fishingLabel);

        // Content container with internal padding
        const contentContainer = document.createElement('div');
        contentContainer.style.padding = '12px';
        contentContainer.style.backgroundColor = '#3A2616';
        contentContainer.style.backgroundImage = 'radial-gradient(circle at center, #3A2616 0%, #2A1606 100%)'; // Vignette effect
        fishingContainer.appendChild(contentContainer);

        // Cast button with ornate styling
        const castButton = document.createElement('button');
        castButton.textContent = 'Cast Line';
        castButton.style.width = '100%';
        castButton.style.padding = '8px 0';
        castButton.style.marginBottom = '10px';
        castButton.style.backgroundColor = '#5A3D27'; // Medium brown wood
        castButton.style.backgroundImage = 'linear-gradient(to bottom, #6A4D37, #5A3D27)'; // Wood grain effect
        castButton.style.border = '1px solid #DAA520'; // Gold border
        castButton.style.borderRadius = '5px';
        castButton.style.color = '#FFD700'; // Gold text
        castButton.style.fontWeight = 'bold';
        castButton.style.cursor = 'pointer';
        castButton.style.fontFamily = 'serif';
        castButton.style.fontSize = '15px';
        castButton.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        castButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
        contentContainer.appendChild(castButton);

        // Add hover effect
        castButton.onmouseover = () => {
            castButton.style.backgroundImage = 'linear-gradient(to bottom, #7A5D47, #6A4D37)';
        };
        castButton.onmouseout = () => {
            castButton.style.backgroundImage = 'linear-gradient(to bottom, #6A4D37, #5A3D27)';
        };

        // Fishing status with parchment styling
        const fishingStatus = document.createElement('div');
        fishingStatus.textContent = 'Ready to fish';
        fishingStatus.style.color = '#FFD700'; // Gold
        fishingStatus.style.margin = '8px 0';
        fishingStatus.style.fontFamily = 'serif';
        fishingStatus.style.fontStyle = 'italic';
        fishingStatus.style.fontSize = '14px';
        fishingStatus.style.textAlign = 'center';
        fishingStatus.style.width = '100%';
        contentContainer.appendChild(fishingStatus);

        // Fish counter with brass instrument styling
        const fishCounter = document.createElement('div');
        fishCounter.textContent = 'Fish: 0';
        fishCounter.style.textAlign = 'center';
        fishCounter.style.width = '100%';
        fishCounter.style.padding = '6px 0';
        fishCounter.style.backgroundColor = '#28180A'; // Very dark wood
        fishCounter.style.backgroundImage = 'linear-gradient(to bottom, #28180A, #1A0D02)'; // Gradient
        fishCounter.style.border = '1px solid #DAA520'; // Gold border
        fishCounter.style.borderRadius = '5px';
        fishCounter.style.color = '#FFD700'; // Gold
        fishCounter.style.fontFamily = 'serif';
        fishCounter.style.fontWeight = 'bold';
        fishCounter.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
        contentContainer.appendChild(fishCounter);

        // Create minigame container (hidden by default)
        const minigameContainer = document.createElement('div');
        minigameContainer.id = 'fishing-minigame';
        minigameContainer.style.position = 'absolute';
        minigameContainer.style.top = '50%';
        minigameContainer.style.left = '50%';
        minigameContainer.style.transform = 'translate(-50%, -50%)';
        minigameContainer.style.backgroundColor = 'rgba(60, 30, 0, 0.9)'; // Dark wood
        minigameContainer.style.padding = '20px';
        minigameContainer.style.borderRadius = '10px';
        minigameContainer.style.border = '3px solid #B8860B'; // Brass border
        minigameContainer.style.display = 'none';
        minigameContainer.style.flexDirection = 'column';
        minigameContainer.style.alignItems = 'center';
        minigameContainer.style.pointerEvents = 'auto';
        minigameContainer.style.zIndex = '100';
        minigameContainer.style.width = '300px';
        minigameContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.8)';
        document.body.appendChild(minigameContainer);

        // Minigame title
        const minigameTitle = document.createElement('div');
        minigameTitle.textContent = 'Fish On!';
        minigameTitle.style.color = '#E6C68A'; // Muted gold
        minigameTitle.style.fontSize = '24px';
        minigameTitle.style.marginBottom = '20px';
        minigameTitle.style.fontFamily = 'serif';
        minigameTitle.style.fontWeight = 'bold';
        minigameContainer.appendChild(minigameTitle);

        // Minigame instructions
        const minigameInstructions = document.createElement('div');
        minigameInstructions.textContent = 'Click when the marker is in the green zone!';
        minigameInstructions.style.color = 'white';
        minigameInstructions.style.marginBottom = '20px';
        minigameContainer.appendChild(minigameInstructions);

        // Minigame progress bar container
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.width = '250px';
        progressBarContainer.style.height = '30px';
        progressBarContainer.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        progressBarContainer.style.borderRadius = '15px';
        progressBarContainer.style.position = 'relative';
        progressBarContainer.style.overflow = 'hidden';
        progressBarContainer.style.marginBottom = '20px';
        minigameContainer.appendChild(progressBarContainer);

        // Target zone (green area)
        const targetZone = document.createElement('div');
        targetZone.style.position = 'absolute';
        targetZone.style.height = '100%';
        targetZone.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
        targetZone.style.width = '60px';
        targetZone.style.left = '95px'; // Centered in the progress bar
        progressBarContainer.appendChild(targetZone);

        // Marker (moving element)
        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.height = '100%';
        marker.style.width = '10px';
        marker.style.backgroundColor = 'white';
        marker.style.left = '0px';
        marker.style.transition = 'left 0.1s linear';
        progressBarContainer.appendChild(marker);

        // Catch button
        const catchButton = document.createElement('button');
        catchButton.textContent = 'CATCH!';
        catchButton.style.padding = '10px 20px';
        catchButton.style.backgroundColor = 'rgba(255, 100, 100, 0.8)';
        catchButton.style.border = 'none';
        catchButton.style.borderRadius = '5px';
        catchButton.style.color = 'white';
        catchButton.style.fontWeight = 'bold';
        catchButton.style.fontSize = '18px';
        catchButton.style.cursor = 'pointer';
        minigameContainer.appendChild(catchButton);

        return {
            container: fishingContainer,
            castButton: castButton,
            status: fishingStatus,
            counter: fishCounter,
            minigame: {
                container: minigameContainer,
                marker: marker,
                targetZone: targetZone,
                catchButton: catchButton
            }
        };
    }

    createCannonUI() {
        // Create cannon control container with ornate styling
        const cannonContainer = document.createElement('div');
        cannonContainer.id = 'cannon-ui';
        cannonContainer.style.position = 'absolute';
        cannonContainer.style.bottom = '20px';
        cannonContainer.style.left = '210px'; // Position next to fishing UI
        cannonContainer.style.width = '180px';
        cannonContainer.style.backgroundColor = '#3A2616'; // Rich dark wood
        cannonContainer.style.padding = '0'; // No padding, will add internal container
        cannonContainer.style.borderRadius = '8px';
        cannonContainer.style.border = '2px solid #DAA520'; // Gold border
        cannonContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7), inset 0 0 5px rgba(0, 0, 0, 0.3)';
        cannonContainer.style.overflow = 'hidden';
        cannonContainer.style.pointerEvents = 'auto';
        document.body.appendChild(cannonContainer);

        // Create header bar with ornate styling matching fishing
        const headerBar = document.createElement('div');
        headerBar.style.backgroundColor = '#4A2D17'; // Slightly lighter wood for header
        headerBar.style.padding = '6px 10px';
        headerBar.style.borderBottom = '2px solid #DAA520'; // Gold border
        headerBar.style.textAlign = 'center';
        headerBar.style.position = 'relative';
        headerBar.style.backgroundImage = 'linear-gradient(to bottom, #5A3D27, #4A2D17)'; // Wood grain effect
        cannonContainer.appendChild(headerBar);

        // Brass corner accents for header
        const corners = ['top-left', 'top-right'];
        corners.forEach(corner => {
            const accent = document.createElement('div');
            accent.style.position = 'absolute';
            accent.style.width = '10px';
            accent.style.height = '10px';
            accent.style.backgroundColor = '#DAA520';
            accent.style.borderRadius = corner.includes('top') ?
                (corner.includes('left') ? '5px 0 0 0' : '0 5px 0 0') :
                (corner.includes('left') ? '0 0 0 5px' : '0 0 5px 0');

            if (corner.includes('top')) accent.style.top = '0';
            if (corner.includes('bottom')) accent.style.bottom = '0';
            if (corner.includes('left')) accent.style.left = '0';
            if (corner.includes('right')) accent.style.right = '0';

            headerBar.appendChild(accent);
        });

        // Cannon label
        const cannonLabel = document.createElement('div');
        cannonLabel.textContent = 'CANNON DECK';
        cannonLabel.style.color = '#FFD700'; // Brighter gold for header
        cannonLabel.style.fontFamily = 'serif';
        cannonLabel.style.fontWeight = 'bold';
        cannonLabel.style.fontSize = '16px';
        cannonLabel.style.letterSpacing = '1px';
        cannonLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        headerBar.appendChild(cannonLabel);

        // Content container with internal padding
        const contentContainer = document.createElement('div');
        contentContainer.style.padding = '12px';
        contentContainer.style.backgroundColor = '#3A2616';
        contentContainer.style.backgroundImage = 'radial-gradient(circle at center, #3A2616 0%, #2A1606 100%)'; // Vignette effect
        cannonContainer.appendChild(contentContainer);

        // Fire button with ornate styling
        const fireButton = document.createElement('button');
        fireButton.textContent = 'FIRE CANNONS';
        fireButton.style.width = '100%';
        fireButton.style.padding = '8px 0';
        fireButton.style.marginBottom = '5px';
        fireButton.style.backgroundColor = '#5A3D27'; // Medium brown wood
        fireButton.style.backgroundImage = 'linear-gradient(to bottom, #6A4D37, #5A3D27)'; // Wood grain effect
        fireButton.style.border = '1px solid #DAA520'; // Gold border
        fireButton.style.borderRadius = '5px';
        fireButton.style.color = '#FFD700'; // Gold text
        fireButton.style.fontWeight = 'bold';
        fireButton.style.cursor = 'pointer';
        fireButton.style.fontFamily = 'serif';
        fireButton.style.fontSize = '15px';
        fireButton.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        fireButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
        fireButton.disabled = true; // Disabled by default
        contentContainer.appendChild(fireButton);

        // Add hover effect (only when enabled)
        fireButton.onmouseover = () => {
            if (!fireButton.disabled) {
                fireButton.style.backgroundImage = 'linear-gradient(to bottom, #7A5D47, #6A4D37)';
            }
        };
        fireButton.onmouseout = () => {
            if (!fireButton.disabled) {
                fireButton.style.backgroundImage = 'linear-gradient(to bottom, #6A4D37, #5A3D27)';
            }
        };

        // Spacebar hint with brass style
        const spaceHint = document.createElement('div');
        spaceHint.textContent = '(SPACE)';
        spaceHint.style.color = '#B8860B'; // Darker gold
        spaceHint.style.fontSize = '10px';
        spaceHint.style.fontFamily = 'serif';
        spaceHint.style.fontStyle = 'italic';
        spaceHint.style.textAlign = 'center';
        spaceHint.style.marginBottom = '8px';
        contentContainer.appendChild(spaceHint);

        // Cannon status with parchment styling
        const cannonStatus = document.createElement('div');
        cannonStatus.textContent = 'No targets in range';
        cannonStatus.style.color = '#FFD700'; // Gold
        cannonStatus.style.margin = '8px 0';
        cannonStatus.style.fontFamily = 'serif';
        cannonStatus.style.fontStyle = 'italic';
        cannonStatus.style.fontSize = '14px';
        cannonStatus.style.textAlign = 'center';
        cannonStatus.style.width = '100%';
        contentContainer.appendChild(cannonStatus);

        // Cooldown indicator with brass styling
        const cooldownIndicator = document.createElement('div');
        cooldownIndicator.style.width = '100%';
        cooldownIndicator.style.height = '10px';
        cooldownIndicator.style.backgroundColor = '#28180A'; // Very dark wood
        cooldownIndicator.style.backgroundImage = 'linear-gradient(to bottom, #28180A, #1A0D02)'; // Gradient
        cooldownIndicator.style.borderRadius = '5px';
        cooldownIndicator.style.overflow = 'hidden';
        cooldownIndicator.style.border = '1px solid #DAA520'; // Gold border
        cooldownIndicator.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
        contentContainer.appendChild(cooldownIndicator);

        // Cooldown progress styled as glowing cannon fuse
        const cooldownProgress = document.createElement('div');
        cooldownProgress.style.width = '0%';
        cooldownProgress.style.height = '100%';
        cooldownProgress.style.backgroundColor = '#FFD700'; // Gold
        cooldownProgress.style.backgroundImage = 'linear-gradient(to right, #DAA520, #FFD700, #FFF8DC)'; // Glowing effect
        cooldownProgress.style.boxShadow = '0 0 10px #FFD700'; // Glow
        cooldownProgress.style.transition = 'width 0.1s linear';
        cooldownIndicator.appendChild(cooldownProgress);

        return {
            container: cannonContainer,
            fireButton: fireButton,
            status: cannonStatus,
            cooldown: {
                indicator: cooldownIndicator,
                progress: cooldownProgress
            }
        };
    }

    createInventory() {
        // Create the inventory using the dedicated InventoryUI class
        const inventory = this.inventoryUI.createInventory();

        // Override the updateContent method to use our data
        this.inventoryUI.updateContent = () => {
            this.updateInventoryContent();
        };

        // Store references in elements
        this.elements.inventory = inventory;

        return inventory;
    }

    updateInventoryContent() {
        // This will be called from outside to update the inventory
        // Implementation will be added later
    }

    createPlayerStatsPanel() {
        // Create a nautical-styled player stats panel
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '10px';
        panel.style.right = '10px';
        panel.style.backgroundColor = 'rgba(60, 30, 0, 0.8)';
        panel.style.padding = '10px';
        panel.style.borderRadius = '5px';
        panel.style.border = '2px solid rgba(120, 80, 40, 0.8)';
        panel.style.color = '#E6C68A';
        panel.style.fontFamily = 'serif';
        panel.style.zIndex = '10';
        panel.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.4)';


        // Add placeholders for various stats
        this.elements.playerStats = {};

        this.elements.playerStatsPanel = panel;
    }

    // Method to update player stats - can be called directly from fishing.js
    updatePlayerStats(stats) {
        if (!this.elements.playerStats) return;

        // Import getPlayerStats dynamically to avoid circular dependencies
        import('../core/network.js').then((network) => {
            // If stats parameter is provided, use it; otherwise get from network
            const playerStats = stats || network.getPlayerStats();

            // Update the UI elements with the latest stats
            if (playerStats.fishCount !== undefined) {
                this.elements.playerStats.fishCount.textContent = `Fish: ${playerStats.fishCount}`;
            }

            if (playerStats.monsterKills !== undefined) {
                this.elements.playerStats.monsterCount.textContent = `Monsters: ${playerStats.monsterKills}`;
            }

            if (playerStats.money !== undefined) {
                this.elements.playerStats.moneyCount.textContent = `Gold: ${playerStats.money}`;
            }
        });
    }

    addIslandMarker(id, position, radius) {
        this.miniMap.addIslandMarker(id, position, radius);
    }

    addPlayerMarker(id, position, color) {
        this.miniMap.addPlayerMarker(id, position, color);
    }

    removePlayerMarker(id) {
        this.miniMap.removePlayerMarker(id);
    }

    updateMiniMap(playerPosition, playerRotation, mapScale) {
        this.miniMap.updateMiniMap(playerPosition, playerRotation, mapScale);
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

        // Update fish count
        if (data.fishCount !== undefined) {
            this.elements.fishing.counter.textContent = `Fish: ${data.fishCount}`;
        }

        // Update mini-map
        if (data.position && data.heading !== undefined) {
            this.updateMiniMap(data.position, data.heading, data.mapScale || 100);
        }

        // Update player stats if requested
        if (data.updateStats) {
            this.updatePlayerStats();
        }

        // Update shop availability if we have position and island data
        if (data.position && data.nearestIsland) {
            updateShopAvailability(data.activeIslands, data.position);
        }

        // Update FPS counter
        this.updateFPS();

        /*
        // Update monster positions on the radar if we have access to the minimap
        if (data.monsters && this.miniMap) {
            // console.log('Updating monster markers');
            this.miniMap.updateMonsterMarkers(
                data.monsters,
                data.position,
                data.heading,
                data.mapScale
            );
        }*/
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

    updateInventory(fishInventory) {
        // Use the inventory UI to update the display
        this.inventoryUI.updateInventory(fishInventory);
    }

    createFPSCounter() {
        const fpsElement = document.createElement('div');
        fpsElement.textContent = 'FPS: 0';
        fpsElement.style.position = 'absolute';
        fpsElement.style.top = '5px';
        fpsElement.style.left = '5px';
        fpsElement.style.fontSize = '12px';
        fpsElement.style.padding = '3px 6px';
        fpsElement.style.backgroundColor = 'rgba(50, 25, 0, 0.8)';
        fpsElement.style.color = '#E6C68A';
        fpsElement.style.fontFamily = 'serif';
        fpsElement.style.borderRadius = '3px';
        fpsElement.style.border = '1px solid #B8860B';
        fpsElement.style.opacity = ENABLE_DIAGNOSTICS ? '1' : '0';
        document.body.appendChild(fpsElement);

        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.currentFps = 0;

        return fpsElement;
    }

    // New method to update FPS counter
    updateFPS() {
        // Increment frame count
        this.frameCount++;

        // Calculate FPS every 500ms for stability
        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;

        if (elapsed >= 500) {
            // Calculate FPS
            this.currentFps = Math.round((this.frameCount * 1000) / elapsed);

            // Update counter text with color based on performance
            let fpsColor = 'lime'; // Good performance

            if (this.currentFps < 30) {
                fpsColor = 'red'; // Poor performance
            } else if (this.currentFps < 50) {
                fpsColor = 'yellow'; // Moderate performance
            }

            this.elements.fpsCounter.textContent = `FPS: ${this.currentFps}`;
            this.elements.fpsCounter.style.color = fpsColor;

            // Reset counters
            this.lastFpsUpdate = now;
            this.frameCount = 0;
        }

        // Add this single line at the end of the existing method
        this.displayDiagnosticsInfo();
    }

    displayDiagnosticsInfo() {
        // Only do something if diagnostics is enabled
        if (!ENABLE_DIAGNOSTICS) return;

        const diagnosticsData = getDiagnosticsData();

        // Check if this is likely a browser-specific performance issue
        if (this.elements.fpsCounter && diagnosticsData.performanceScore > 0) {
            const fps = this.currentFps || 0;

            // If we have good hardware but low FPS, show a small indicator
            if (fps < 30 && diagnosticsData.performanceScore > 50) {
                // Only show browser warning if not already showing
                if (!this.elements.browserWarning) {
                    const browserWarning = document.createElement('div');
                    browserWarning.id = 'browser-performance-warning';
                    browserWarning.style.position = 'absolute';
                    browserWarning.style.top = '30px';
                    browserWarning.style.left = '5px';
                    browserWarning.style.backgroundColor = 'rgba(255, 60, 60, 0.8)';
                    browserWarning.style.color = 'white';
                    browserWarning.style.padding = '5px';
                    browserWarning.style.borderRadius = '3px';
                    browserWarning.style.fontSize = '12px';
                    browserWarning.style.zIndex = '9999';

                    // Different message for Brave
                    if (isBraveBrowser()) {
                        browserWarning.innerHTML = '⚠️ Performance may be affected by Brave settings. <a href="#" id="browser-help">Help</a>';
                    } else {
                        browserWarning.innerHTML = '⚠️ Browser settings may affect performance. <a href="#" id="browser-help">Help</a>';
                    }

                    document.body.appendChild(browserWarning);
                    this.elements.browserWarning = browserWarning;

                    // Add help click handler
                    document.getElementById('browser-help').addEventListener('click', (e) => {
                        e.preventDefault();
                        alert('To improve performance:\n\n' +
                            '1. Enable hardware acceleration in your browser settings\n' +
                            '2. Update your graphics drivers\n' +
                            '3. Close other browser tabs and applications\n' +
                            (isBraveBrowser() ?
                                '4. In Brave, go to brave://settings/system and ensure hardware acceleration is enabled' :
                                ''));
                    });
                }
            } else if (this.elements.browserWarning) {
                // Remove the warning if FPS is now good
                document.body.removeChild(this.elements.browserWarning);
                this.elements.browserWarning = null;
            }
        }
    }
}

// Create a global UI instance
const gameUI = new GameUI();

// Track open UI elements in a stack to handle multiple open UIs
const openUIElements = [];

// Global escape key handler
function handleEscapeKey(event) {
    if (event.key === 'Escape' && openUIElements.length > 0) {
        // Get the most recently opened UI
        const lastUI = openUIElements[openUIElements.length - 1];
        // Close it using its close method
        if (lastUI && typeof lastUI.close === 'function') {
            lastUI.close();
        }
        // UI's close function should handle removing itself from the stack
    }
}

// Register a UI element as open
export function registerOpenUI(uiElement) {
    console.log('registerOpenUI', uiElement);
    // Add the UI to the stack of open elements
    if (uiElement && !openUIElements.includes(uiElement)) {
        openUIElements.push(uiElement);

        // Ensure escape key handler is attached
        if (openUIElements.length === 1) {
            document.addEventListener('keydown', handleEscapeKey);
        }
    }
}

// Unregister a UI element when closed
export function unregisterOpenUI(uiElement) {
    const index = openUIElements.indexOf(uiElement);
    if (index !== -1) {
        openUIElements.splice(index, 1);

        // Remove escape key handler if no more UIs are open
        if (openUIElements.length === 0) {
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }
}

// Export the UI instance
export { gameUI }; 