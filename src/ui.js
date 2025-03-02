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

        // Initialize elements as an empty object first
        this.elements = {};

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
        this.elements.inventory = this.createInventoryUI();

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

    createFishingUI() {
        // Create fishing container
        const fishingContainer = document.createElement('div');
        fishingContainer.id = 'fishing-ui';
        fishingContainer.style.position = 'absolute';
        fishingContainer.style.bottom = '20px';
        fishingContainer.style.left = '20px';
        fishingContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.7)';
        fishingContainer.style.padding = '10px';
        fishingContainer.style.borderRadius = '5px';
        fishingContainer.style.display = 'flex';
        fishingContainer.style.flexDirection = 'column';
        fishingContainer.style.alignItems = 'center';
        fishingContainer.style.pointerEvents = 'auto'; // Allow interaction
        document.body.appendChild(fishingContainer);

        // Cast button
        const castButton = document.createElement('button');
        castButton.textContent = 'Cast Line';
        castButton.style.padding = '8px 15px';
        castButton.style.marginBottom = '10px';
        castButton.style.backgroundColor = 'rgba(100, 200, 255, 0.7)';
        castButton.style.border = 'none';
        castButton.style.borderRadius = '5px';
        castButton.style.color = 'white';
        castButton.style.fontWeight = 'bold';
        castButton.style.cursor = 'pointer';
        fishingContainer.appendChild(castButton);

        // Fishing status
        const fishingStatus = document.createElement('div');
        fishingStatus.textContent = 'Ready to fish';
        fishingStatus.style.color = 'white';
        fishingStatus.style.marginBottom = '10px';
        fishingContainer.appendChild(fishingStatus);

        // Fish caught counter
        const fishCounter = document.createElement('div');
        fishCounter.textContent = 'Fish: 0';
        fishCounter.style.color = 'white';
        fishingContainer.appendChild(fishCounter);

        // Create minigame container (hidden by default)
        const minigameContainer = document.createElement('div');
        minigameContainer.id = 'fishing-minigame';
        minigameContainer.style.position = 'absolute';
        minigameContainer.style.top = '50%';
        minigameContainer.style.left = '50%';
        minigameContainer.style.transform = 'translate(-50%, -50%)';
        minigameContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.9)';
        minigameContainer.style.padding = '20px';
        minigameContainer.style.borderRadius = '10px';
        minigameContainer.style.display = 'none';
        minigameContainer.style.flexDirection = 'column';
        minigameContainer.style.alignItems = 'center';
        minigameContainer.style.pointerEvents = 'auto';
        minigameContainer.style.zIndex = '100';
        minigameContainer.style.width = '300px';
        document.body.appendChild(minigameContainer);

        // Minigame title
        const minigameTitle = document.createElement('div');
        minigameTitle.textContent = 'Fish On!';
        minigameTitle.style.color = 'white';
        minigameTitle.style.fontSize = '24px';
        minigameTitle.style.marginBottom = '20px';
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
        // Create cannon control container
        const cannonContainer = document.createElement('div');
        cannonContainer.id = 'cannon-ui';
        cannonContainer.style.position = 'absolute';
        cannonContainer.style.bottom = '20px';
        cannonContainer.style.left = '200px'; // Position next to fishing UI
        cannonContainer.style.backgroundColor = 'rgba(60, 30, 0, 0.7)';
        cannonContainer.style.padding = '10px';
        cannonContainer.style.borderRadius = '5px';
        cannonContainer.style.display = 'flex';
        cannonContainer.style.flexDirection = 'column';
        cannonContainer.style.alignItems = 'center';
        cannonContainer.style.pointerEvents = 'auto'; // Allow interaction
        document.body.appendChild(cannonContainer);

        // Fire button
        const fireButton = document.createElement('button');
        fireButton.textContent = 'FIRE CANNONS';
        fireButton.style.padding = '10px 20px';
        fireButton.style.marginBottom = '10px';
        fireButton.style.backgroundColor = 'rgba(255, 50, 0, 0.9)';
        fireButton.style.border = '3px solid rgba(255, 200, 0, 0.9)';
        fireButton.style.borderRadius = '5px';
        fireButton.style.color = 'white';
        fireButton.style.fontWeight = 'bold';
        fireButton.style.cursor = 'pointer';
        fireButton.style.fontSize = '18px';
        fireButton.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        fireButton.style.boxShadow = '0 0 10px rgba(255, 100, 0, 0.5)';
        fireButton.disabled = true; // Disabled by default
        cannonContainer.appendChild(fireButton);

        // Cannon status
        const cannonStatus = document.createElement('div');
        cannonStatus.textContent = 'No targets in range';
        cannonStatus.style.color = 'white';
        cannonStatus.style.marginBottom = '5px';
        cannonContainer.appendChild(cannonStatus);

        // Cooldown indicator
        const cooldownIndicator = document.createElement('div');
        cooldownIndicator.style.width = '100%';
        cooldownIndicator.style.height = '5px';
        cooldownIndicator.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
        cooldownIndicator.style.borderRadius = '2px';
        cooldownIndicator.style.overflow = 'hidden';
        cannonContainer.appendChild(cooldownIndicator);

        // Cooldown progress
        const cooldownProgress = document.createElement('div');
        cooldownProgress.style.width = '0%';
        cooldownProgress.style.height = '100%';
        cooldownProgress.style.backgroundColor = 'rgba(255, 200, 50, 0.8)';
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

    createInventoryUI() {
        // Create a chest icon instead of a button
        const inventoryChest = document.createElement('div');
        inventoryChest.className = 'inventory-chest';
        inventoryChest.style.position = 'absolute';
        inventoryChest.style.top = '10px';
        inventoryChest.style.right = '20px';
        inventoryChest.style.width = '82.5px'; // Increased from 50px to 90px (1.8x)
        inventoryChest.style.height = '66px'; // Increased from 40px to 72px (1.8x)
        inventoryChest.style.cursor = 'pointer';
        inventoryChest.style.zIndex = '100';
        inventoryChest.style.pointerEvents = 'auto';

        // Create the chest body
        const chestBody = document.createElement('div');
        chestBody.className = 'chest-body';
        chestBody.style.position = 'absolute';
        chestBody.style.width = '100%';
        chestBody.style.height = '70%';
        chestBody.style.bottom = '0';
        chestBody.style.backgroundColor = '#8B4513'; // Brown wooden color
        chestBody.style.borderRadius = '3px 3px 5px 5px';
        chestBody.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.5), inset 0 0 3px rgba(0, 0, 0, 0.4)';
        chestBody.style.backgroundImage = 'linear-gradient(90deg, rgba(139, 69, 19, 0.9) 10%, rgba(160, 82, 45, 1) 50%, rgba(139, 69, 19, 0.9) 90%)';

        // Create chest lid
        const chestLid = document.createElement('div');
        chestLid.className = 'chest-lid';
        chestLid.style.position = 'absolute';
        chestLid.style.width = '100%';
        chestLid.style.height = '40%';
        chestLid.style.top = '0';
        chestLid.style.backgroundColor = '#A0522D'; // Slightly lighter brown for lid
        chestLid.style.borderRadius = '5px 5px 0 0';
        chestLid.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.5), inset 0 0 2px rgba(0, 0, 0, 0.4)';
        chestLid.style.backgroundImage = 'linear-gradient(90deg, rgba(160, 82, 45, 0.9) 10%, rgba(178, 95, 57, 1) 50%, rgba(160, 82, 45, 0.9) 90%)';
        chestLid.style.transition = 'transform 0.3s ease';
        chestLid.style.transformOrigin = 'bottom center';

        // Create chest lock/clasp
        const chestLock = document.createElement('div');
        chestLock.className = 'chest-lock';
        chestLock.style.position = 'absolute';
        chestLock.style.width = '10px';
        chestLock.style.height = '10px';
        chestLock.style.bottom = '0';
        chestLock.style.left = '50%';
        chestLock.style.transform = 'translateX(-50%)';
        chestLock.style.backgroundColor = '#DAA520'; // Gold color
        chestLock.style.borderRadius = '2px';
        chestLock.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.8)';

        // Create horizontal wood grain lines for body
        const createWoodGrain = (parent, top, width) => {
            const grain = document.createElement('div');
            grain.style.position = 'absolute';
            grain.style.height = '1px';
            grain.style.width = `${width}%`;
            grain.style.top = `${top}%`;
            grain.style.left = `${(100 - width) / 2}%`;
            grain.style.backgroundColor = 'rgba(101, 67, 33, 0.5)';
            parent.appendChild(grain);
        };

        // Add wood grain to chest body
        createWoodGrain(chestBody, 25, 90);
        createWoodGrain(chestBody, 50, 80);
        createWoodGrain(chestBody, 75, 85);

        // Add wood grain to chest lid
        createWoodGrain(chestLid, 30, 85);
        createWoodGrain(chestLid, 60, 90);

        // Add metal bands/reinforcements
        const createMetalBand = (parent, isVertical, position) => {
            const band = document.createElement('div');
            band.style.position = 'absolute';
            band.style.backgroundColor = '#B8860B'; // Dark golden

            if (isVertical) {
                band.style.width = '4px';
                band.style.height = '100%';
                band.style.left = `${position}%`;
                band.style.top = '0';
            } else {
                band.style.height = '4px';
                band.style.width = '100%';
                band.style.top = `${position}%`;
                band.style.left = '0';
            }

            parent.appendChild(band);
        };

        // Add vertical metal bands
        createMetalBand(chestBody, true, 15);
        createMetalBand(chestBody, true, 85);

        // Add hover effects
        inventoryChest.addEventListener('mouseover', () => {
            chestLid.style.transform = 'perspective(100px) rotateX(-15deg)';
            inventoryChest.style.transform = 'scale(1.05)';
        });

        inventoryChest.addEventListener('mouseout', () => {
            chestLid.style.transform = 'none';
            inventoryChest.style.transform = 'scale(1)';
        });

        // Assemble the chest
        inventoryChest.appendChild(chestBody);
        inventoryChest.appendChild(chestLock);
        inventoryChest.appendChild(chestLid);
        document.body.appendChild(inventoryChest);

        // Create inventory panel (hidden by default)
        const inventoryPanel = document.createElement('div');
        inventoryPanel.style.position = 'absolute';
        inventoryPanel.style.top = '50%';
        inventoryPanel.style.left = '50%';
        inventoryPanel.style.transform = 'translate(-50%, -50%)';
        inventoryPanel.style.width = '600px';
        inventoryPanel.style.height = '400px';
        inventoryPanel.style.backgroundColor = 'rgba(20, 40, 80, 0.9)';
        inventoryPanel.style.border = '3px solid rgba(100, 150, 200, 0.9)';
        inventoryPanel.style.borderRadius = '10px';
        inventoryPanel.style.padding = '20px';
        inventoryPanel.style.display = 'none';
        inventoryPanel.style.flexDirection = 'column';
        inventoryPanel.style.zIndex = '1000';
        inventoryPanel.style.pointerEvents = 'auto';
        inventoryPanel.style.color = 'white';
        inventoryPanel.style.fontFamily = 'Arial, sans-serif';
        inventoryPanel.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        document.body.appendChild(inventoryPanel);

        // Inventory header
        const inventoryHeader = document.createElement('div');
        inventoryHeader.style.display = 'flex';
        inventoryHeader.style.justifyContent = 'space-between';
        inventoryHeader.style.alignItems = 'center';
        inventoryHeader.style.marginBottom = '20px';
        inventoryPanel.appendChild(inventoryHeader);

        // Inventory title
        const inventoryTitle = document.createElement('h2');
        inventoryTitle.textContent = 'Inventory';
        inventoryTitle.style.margin = '0';
        inventoryTitle.style.color = 'rgba(150, 200, 255, 1)';
        inventoryHeader.appendChild(inventoryTitle);

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '5px 10px';
        closeButton.style.borderRadius = '5px';
        closeButton.style.transition = 'background-color 0.2s';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = 'rgba(255, 100, 100, 0.3)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        inventoryHeader.appendChild(closeButton);

        // Tabs for different inventory categories
        const tabsContainer = document.createElement('div');
        tabsContainer.style.display = 'flex';
        tabsContainer.style.marginBottom = '15px';
        tabsContainer.style.borderBottom = '1px solid rgba(100, 150, 200, 0.5)';
        inventoryPanel.appendChild(tabsContainer);

        // Fish tab (active by default)
        const fishTab = document.createElement('div');
        fishTab.textContent = 'Fish';
        fishTab.style.padding = '8px 15px';
        fishTab.style.marginRight = '10px';
        fishTab.style.cursor = 'pointer';
        fishTab.style.backgroundColor = 'rgba(100, 150, 200, 0.5)';
        fishTab.style.borderTopLeftRadius = '5px';
        fishTab.style.borderTopRightRadius = '5px';
        fishTab.dataset.active = 'true';
        tabsContainer.appendChild(fishTab);

        // Other tabs can be added here (for future expansion)
        const treasureTab = document.createElement('div');
        treasureTab.textContent = 'Treasures';
        treasureTab.style.padding = '8px 15px';
        treasureTab.style.marginRight = '10px';
        treasureTab.style.cursor = 'pointer';
        treasureTab.style.opacity = '0.7';
        treasureTab.style.borderTopLeftRadius = '5px';
        treasureTab.style.borderTopRightRadius = '5px';
        treasureTab.dataset.active = 'false';
        tabsContainer.appendChild(treasureTab);

        // Content area
        const contentArea = document.createElement('div');
        contentArea.style.flex = '1';
        contentArea.style.overflowY = 'auto';
        contentArea.style.padding = '10px';
        contentArea.style.backgroundColor = 'rgba(30, 50, 90, 0.5)';
        contentArea.style.borderRadius = '5px';
        inventoryPanel.appendChild(contentArea);

        // Fish inventory content (visible by default)
        const fishContent = document.createElement('div');
        fishContent.id = 'fish-inventory';
        fishContent.style.display = 'flex';
        fishContent.style.flexDirection = 'column';
        fishContent.style.gap = '15px';
        contentArea.appendChild(fishContent);

        // Treasure inventory content (hidden by default)
        const treasureContent = document.createElement('div');
        treasureContent.id = 'treasure-inventory';
        treasureContent.style.display = 'none';
        treasureContent.textContent = 'No treasures found yet. Explore more islands!';
        treasureContent.style.textAlign = 'center';
        treasureContent.style.padding = '20px';
        treasureContent.style.color = 'rgba(200, 200, 200, 0.7)';
        contentArea.appendChild(treasureContent);

        // Update the event listeners to use the chest
        inventoryChest.addEventListener('click', () => {
            inventoryPanel.style.display = 'flex';
            // Play a chest opening sound if available
            if (window.playSound) {
                window.playSound('chest_open');
            }
            // Update inventory content when opened
            this.updateInventoryContent();
        });

        closeButton.addEventListener('click', () => {
            inventoryPanel.style.display = 'none';
            // Play a chest closing sound if available
            if (window.playSound) {
                window.playSound('chest_close');
            }
        });

        // Tab switching
        fishTab.addEventListener('click', () => {
            if (fishTab.dataset.active === 'true') return;

            // Update active states
            fishTab.dataset.active = 'true';
            treasureTab.dataset.active = 'false';

            // Update styles
            fishTab.style.backgroundColor = 'rgba(100, 150, 200, 0.5)';
            fishTab.style.opacity = '1';
            treasureTab.style.backgroundColor = 'transparent';
            treasureTab.style.opacity = '0.7';

            // Show/hide content
            fishContent.style.display = 'flex';
            treasureContent.style.display = 'none';
        });

        treasureTab.addEventListener('click', () => {
            if (treasureTab.dataset.active === 'true') return;

            // Update active states
            treasureTab.dataset.active = 'true';
            fishTab.dataset.active = 'false';

            // Update styles
            treasureTab.style.backgroundColor = 'rgba(100, 150, 200, 0.5)';
            treasureTab.style.opacity = '1';
            fishTab.style.backgroundColor = 'transparent';
            fishTab.style.opacity = '0.7';

            // Show/hide content
            treasureContent.style.display = 'block';
            fishContent.style.display = 'none';
        });

        // Function to update inventory content
        this.updateInventoryContent = function () {
            // This will be called from outside to update the inventory
            // Implementation will be added later
        };

        return {
            button: inventoryChest, // Now using the chest icon instead of a button
            panel: inventoryPanel,
            fishContent: fishContent,
            treasureContent: treasureContent,
            updateContent: this.updateInventoryContent
        };
    }

    createPlayerStatsPanel() {
        // Create stats container
        const statsContainer = document.createElement('div');
        statsContainer.id = 'player-stats';
        statsContainer.style.position = 'absolute';
        statsContainer.style.top = '10px';
        statsContainer.style.right = '10px';
        statsContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.7)';
        statsContainer.style.padding = '10px';
        statsContainer.style.borderRadius = '5px';
        statsContainer.style.display = 'flex';
        statsContainer.style.flexDirection = 'column';
        statsContainer.style.gap = '8px';
        statsContainer.style.visibility = 'hidden';
        document.body.appendChild(statsContainer);

        // Fish count
        const fishCount = document.createElement('div');
        fishCount.textContent = `Fish: 0`;
        fishCount.style.color = 'white';

        statsContainer.appendChild(fishCount);

        // Monster kills
        const monsterCount = document.createElement('div');
        monsterCount.textContent = `Monsters: 0`;
        monsterCount.style.color = 'white';
        statsContainer.appendChild(monsterCount);

        // Money/gold
        const moneyCount = document.createElement('div');
        moneyCount.textContent = `Gold: 0`;
        moneyCount.style.color = 'white';
        statsContainer.appendChild(moneyCount);

        // Store references for easy updates
        this.elements.playerStats = {
            panel: statsContainer,
            fishCount: fishCount,
            monsterCount: monsterCount,
            moneyCount: moneyCount
        };
    }

    // Method to update player stats - can be called directly from fishing.js
    updatePlayerStats(stats) {
        if (!this.elements.playerStats) return;

        // Import getPlayerStats dynamically to avoid circular dependencies
        import('./network.js').then((network) => {
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
        const fishContent = this.elements.inventory.fishContent;

        // Clear existing content
        fishContent.innerHTML = '';

        // If no fish, show message
        if (Object.keys(fishInventory).length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No fish caught yet. Try fishing!';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = 'rgba(200, 200, 200, 0.7)';
            fishContent.appendChild(emptyMessage);
            return;
        }

        // Define fish tiers
        const tiers = [
            { name: "Legendary", color: "#FFD700", fishes: [] },  // Gold
            { name: "Rare", color: "#9370DB", fishes: [] },       // Purple
            { name: "Uncommon", color: "#32CD32", fishes: [] },   // Green
            { name: "Common", color: "#B0C4DE", fishes: [] }      // Light blue
        ];

        // Sort fish into tiers
        for (const [fishName, fishData] of Object.entries(fishInventory)) {
            if (fishData.value >= 20) {
                tiers[0].fishes.push({ name: fishName, ...fishData });
            } else if (fishData.value >= 5) {
                tiers[1].fishes.push({ name: fishName, ...fishData });
            } else if (fishData.value >= 2) {
                tiers[2].fishes.push({ name: fishName, ...fishData });
            } else {
                tiers[3].fishes.push({ name: fishName, ...fishData });
            }
        }

        // Create tier sections
        tiers.forEach(tier => {
            if (tier.fishes.length === 0) return; // Skip empty tiers

            // Create tier header
            const tierSection = document.createElement('div');
            tierSection.style.marginBottom = '15px';

            const tierHeader = document.createElement('div');
            tierHeader.textContent = tier.name;
            tierHeader.style.fontSize = '18px';
            tierHeader.style.fontWeight = 'bold';
            tierHeader.style.color = tier.color;
            tierHeader.style.borderBottom = `1px solid ${tier.color}`;
            tierHeader.style.paddingBottom = '5px';
            tierHeader.style.marginBottom = '10px';
            tierSection.appendChild(tierHeader);

            // Create fish grid
            const fishGrid = document.createElement('div');
            fishGrid.style.display = 'grid';
            fishGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
            fishGrid.style.gap = '10px';

            // Add fish to grid
            tier.fishes.forEach(fish => {
                const fishCard = document.createElement('div');
                fishCard.style.backgroundColor = 'rgba(50, 70, 110, 0.7)';
                fishCard.style.borderRadius = '5px';
                fishCard.style.padding = '10px';
                fishCard.style.display = 'flex';
                fishCard.style.flexDirection = 'column';
                fishCard.style.alignItems = 'center';
                fishCard.style.border = `1px solid ${tier.color}`;

                // Fish icon (colored rectangle for now, could be replaced with images)
                const fishIcon = document.createElement('div');
                fishIcon.style.width = '50px';
                fishIcon.style.height = '30px';
                fishIcon.style.backgroundColor = fish.color ? `#${fish.color.toString(16).padStart(6, '0')}` : tier.color;
                fishIcon.style.borderRadius = '3px';
                fishIcon.style.marginBottom = '8px';
                fishCard.appendChild(fishIcon);

                // Fish name
                const fishName = document.createElement('div');
                fishName.textContent = fish.name;
                fishName.style.fontWeight = 'bold';
                fishName.style.marginBottom = '5px';
                fishName.style.textAlign = 'center';
                fishCard.appendChild(fishName);

                // Fish count
                const fishCount = document.createElement('div');
                fishCount.textContent = `Count: ${fish.count}`;
                fishCount.style.fontSize = '12px';
                fishCard.appendChild(fishCount);

                // Fish value
                const fishValue = document.createElement('div');
                fishValue.textContent = `Value: ${fish.value}`;
                fishValue.style.fontSize = '12px';
                fishCard.appendChild(fishValue);

                fishGrid.appendChild(fishCard);
            });

            tierSection.appendChild(fishGrid);
            fishContent.appendChild(tierSection);
        });
    }
}

// Create a global UI instance
const gameUI = new GameUI();

// Export the UI instance
export { gameUI }; 