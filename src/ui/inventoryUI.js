// InventoryUI.js - Manages all inventory-related UI components

class InventoryUI {
    constructor() {
        // Initialize elements container to store references to UI components
        this.elements = {
            chest: null,
            panel: null,
            fishContent: null,
            treasureContent: null
        };

        // Track if the inventory is currently open
        this.isOpen = false;

        // Make the instance globally accessible
        window.inventoryUI = this;
    }

    // Create the inventory chest and panel
    createInventory() {
        // Create inventory chest (the icon)
        const inventoryChest = document.createElement('div');
        inventoryChest.style.position = 'absolute';
        inventoryChest.style.top = '15px';
        inventoryChest.style.right = '60px';
        inventoryChest.style.width = '65px';
        inventoryChest.style.height = '58px';
        inventoryChest.style.borderRadius = '5px';
        inventoryChest.style.cursor = 'pointer';
        inventoryChest.style.transition = 'transform 0.2s';
        inventoryChest.style.zIndex = '100';
        inventoryChest.style.pointerEvents = 'auto';

        // Create chest body
        const chestBody = document.createElement('div');
        chestBody.className = 'chest-body';
        chestBody.style.position = 'absolute';
        chestBody.style.width = '100%';
        chestBody.style.height = '60%';
        chestBody.style.bottom = '0';
        chestBody.style.backgroundColor = '#8B4513'; // Brown color
        chestBody.style.borderRadius = '0 0 5px 5px';
        chestBody.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
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

        // Add hover effects
        inventoryChest.addEventListener('mouseover', () => {
            chestLid.style.transform = 'perspective(100px) rotateX(-15deg)';
            inventoryChest.style.transform = 'scale(1.05)';
        });

        inventoryChest.addEventListener('mouseout', () => {
            chestLid.style.transform = 'none';
            inventoryChest.style.transform = 'scale(1)';
        });

        // Add click events for tabs
        fishTab.addEventListener('click', () => {
            fishTab.style.backgroundColor = 'rgba(100, 150, 200, 0.5)';
            fishTab.style.opacity = '1';
            fishTab.dataset.active = 'true';

            treasureTab.style.backgroundColor = 'transparent';
            treasureTab.style.opacity = '0.7';
            treasureTab.dataset.active = 'false';

            fishContent.style.display = 'flex';
            treasureContent.style.display = 'none';
        });

        treasureTab.addEventListener('click', () => {
            treasureTab.style.backgroundColor = 'rgba(100, 150, 200, 0.5)';
            treasureTab.style.opacity = '1';
            treasureTab.dataset.active = 'true';

            fishTab.style.backgroundColor = 'transparent';
            fishTab.style.opacity = '0.7';
            fishTab.dataset.active = 'false';

            treasureContent.style.display = 'block';
            fishContent.style.display = 'none';
        });

        // Toggle inventory when chest is clicked
        inventoryChest.addEventListener('click', () => {
            if (inventoryPanel.style.display === 'none') {
                // Play chest opening sound
                this.playChestOpenSound();

                inventoryPanel.style.display = 'flex';
                this.isOpen = true;
                // Register this as an open UI with the main game UI if available
                if (typeof this.registerOpenUI === 'function') {
                    this.registerOpenUI('inventory');
                }
            } else {
                // Play chest closing sound (slightly different)
                this.playChestCloseSound();

                inventoryPanel.style.display = 'none';
                this.isOpen = false;
                // Unregister this as an open UI if available
                if (typeof this.unregisterOpenUI === 'function') {
                    this.unregisterOpenUI('inventory');
                }
            }
        });

        // Close inventory when close button is clicked
        closeButton.addEventListener('click', () => {
            inventoryPanel.style.display = 'none';
            this.isOpen = false;
            // Unregister this as an open UI if available
            if (typeof this.unregisterOpenUI === 'function') {
                this.unregisterOpenUI('inventory');
            }
        });

        // Store references to important elements
        this.elements.chest = inventoryChest;
        this.elements.panel = inventoryPanel;
        this.elements.fishContent = fishContent;
        this.elements.treasureContent = treasureContent;

        return inventoryChest;
    }

    // Function to update inventory content
    updateContent() {
        // This will be overridden by the main UI class
    }

    // Update fish inventory display
    updateInventory(fishInventory) {
        const fishContent = this.elements.fishContent;
        if (!fishContent) return;

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

    // Update treasure inventory display
    updateTreasureInventory(treasureInventory) {
        const treasureContent = this.elements.treasureContent;
        if (!treasureContent) return;

        // Clear existing content
        treasureContent.innerHTML = '';

        // If no treasures, show message
        if (Object.keys(treasureInventory).length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No treasures found yet. Defeat sea monsters to collect treasures!';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = 'rgba(200, 200, 200, 0.7)';
            treasureContent.appendChild(emptyMessage);
            return;
        }

        // Create treasure grid
        const treasureGrid = document.createElement('div');
        treasureGrid.style.display = 'grid';
        treasureGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        treasureGrid.style.gap = '15px';
        treasureGrid.style.padding = '10px';

        // Add each treasure to the grid
        for (const [treasureName, treasureData] of Object.entries(treasureInventory)) {
            const treasureCard = document.createElement('div');
            treasureCard.style.backgroundColor = 'rgba(50, 70, 110, 0.7)';
            treasureCard.style.borderRadius = '5px';
            treasureCard.style.padding = '12px';
            treasureCard.style.display = 'flex';
            treasureCard.style.flexDirection = 'column';
            treasureCard.style.alignItems = 'center';
            treasureCard.style.border = `1px solid rgba(200, 170, 100, 0.8)`;

            // Treasure icon
            const treasureIcon = document.createElement('div');
            treasureIcon.style.width = '60px';
            treasureIcon.style.height = '60px';
            treasureIcon.style.backgroundColor = `#${treasureData.color.toString(16).padStart(6, '0')}`;
            treasureIcon.style.borderRadius = '50%';
            treasureIcon.style.marginBottom = '10px';
            treasureIcon.style.boxShadow = '0 0 10px rgba(255, 255, 200, 0.5)';
            treasureCard.appendChild(treasureIcon);

            // Treasure name
            const nameElement = document.createElement('div');
            nameElement.textContent = treasureName;
            nameElement.style.fontWeight = 'bold';
            nameElement.style.marginBottom = '8px';
            nameElement.style.textAlign = 'center';
            nameElement.style.color = 'rgba(255, 220, 150, 1)';
            treasureCard.appendChild(nameElement);

            // Treasure count
            const countElement = document.createElement('div');
            countElement.textContent = `Count: ${treasureData.count}`;
            countElement.style.fontSize = '12px';
            countElement.style.marginBottom = '5px';
            treasureCard.appendChild(countElement);

            // Treasure value
            const valueElement = document.createElement('div');
            valueElement.textContent = `Value: ${treasureData.value}`;
            valueElement.style.fontSize = '12px';
            treasureCard.appendChild(valueElement);

            // Treasure description
            if (treasureData.description) {
                const descElement = document.createElement('div');
                descElement.textContent = treasureData.description;
                descElement.style.fontSize = '11px';
                descElement.style.marginTop = '8px';
                descElement.style.color = 'rgba(200, 200, 200, 0.9)';
                descElement.style.fontStyle = 'italic';
                descElement.style.textAlign = 'center';
                treasureCard.appendChild(descElement);
            }

            treasureGrid.appendChild(treasureCard);
        }

        treasureContent.appendChild(treasureGrid);
    }

    // Play a simple, pleasant chest open sound
    playChestOpenSound() {
        // Create audio context if not already created
        if (!window.audioContext) {
            try {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported in this browser');
                return;
            }
        }

        // Create a gentle "chip" sound
        const currentTime = window.audioContext.currentTime;

        // Simple oscillator for a pleasant tone
        const osc = window.audioContext.createOscillator();
        const gain = window.audioContext.createGain();

        // Use sine wave for a smooth sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, currentTime + 0.05);

        // Very short duration with quick fade
        gain.gain.setValueAtTime(0.1, currentTime); // Lower volume (0.1 instead of 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

        osc.connect(gain);
        gain.connect(window.audioContext.destination);

        // Start and stop - very brief sound
        osc.start(currentTime);
        osc.stop(currentTime + 0.08);
    }

    // Play a subtle chest close sound
    playChestCloseSound() {
        // Create audio context if not already created
        if (!window.audioContext) {
            try {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported in this browser');
                return;
            }
        }

        // Create a gentle "chip" sound (slightly different than open)
        const currentTime = window.audioContext.currentTime;

        // Simple oscillator
        const osc = window.audioContext.createOscillator();
        const gain = window.audioContext.createGain();

        // Use sine wave for a clean sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, currentTime + 0.05);

        // Very short duration with quick fade
        gain.gain.setValueAtTime(0.08, currentTime); // Even lower volume
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.06);

        osc.connect(gain);
        gain.connect(window.audioContext.destination);

        // Start and stop - very brief sound
        osc.start(currentTime);
        osc.stop(currentTime + 0.06);
    }
}

// Export the inventory UI class
export default InventoryUI; 