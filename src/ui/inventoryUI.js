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
        // Create inventory chest container (the icon)
        const inventoryChest = document.createElement('div');
        inventoryChest.style.position = 'absolute';
        inventoryChest.style.top = '15px';
        inventoryChest.style.right = '60px';
        inventoryChest.style.width = '65px';
        inventoryChest.style.height = '60px';
        inventoryChest.style.cursor = 'pointer';
        inventoryChest.style.transition = 'transform 0.3s';
        inventoryChest.style.zIndex = '100';
        inventoryChest.style.pointerEvents = 'auto';
        inventoryChest.style.perspective = '300px';

        // Create a back panel for the chest that will be visible during lid animation
        const chestBackPanel = document.createElement('div');
        chestBackPanel.style.position = 'absolute';
        chestBackPanel.style.width = '100%';
        chestBackPanel.style.height = '90%';
        chestBackPanel.style.backgroundColor = '#5D2906'; // Darker brown than chest body
        chestBackPanel.style.borderRadius = '5px'; // Slightly smaller radius to appear behind
        chestBackPanel.style.zIndex = '-1'; // Position it behind other chest elements
        chestBackPanel.style.boxShadow = 'inset 0 0 5px rgba(0, 0, 0, 0.5)';
        inventoryChest.appendChild(chestBackPanel);

        // Create chest body - simplified styling
        const chestBody = document.createElement('div');
        chestBody.className = 'chest-body';
        chestBody.style.position = 'absolute';
        chestBody.style.width = '100%';
        chestBody.style.height = '60%';
        chestBody.style.bottom = '0';
        chestBody.style.backgroundColor = '#8B4513'; // Brown color
        chestBody.style.borderRadius = '0 0 8px 8px';
        chestBody.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
        chestBody.style.border = '1px solid rgba(0, 0, 0, 0.3)';

        // Create chest lid with transform capabilities - proper back-hinge opening
        const chestLid = document.createElement('div');
        chestLid.className = 'chest-lid';
        chestLid.style.position = 'absolute';
        chestLid.style.width = '100%';
        chestLid.style.height = '45%';
        chestLid.style.top = '0';
        chestLid.style.backgroundColor = '#A0522D'; // Slightly lighter brown
        chestLid.style.borderRadius = '8px 8px 0 0';
        chestLid.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.4)';
        // Changed to back-edge opening for traditional chest
        chestLid.style.transformOrigin = 'center top';
        chestLid.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.2)';
        chestLid.style.border = '1px solid rgba(0, 0, 0, 0.3)';

        // Add interior of the lid (visible when open)
        const lidInterior = document.createElement('div');
        lidInterior.style.position = 'absolute';
        lidInterior.style.width = '90%';
        lidInterior.style.height = '90%';
        lidInterior.style.top = '10%';
        lidInterior.style.left = '5%';
        lidInterior.style.backgroundColor = '#654321';
        lidInterior.style.borderRadius = '5px 5px 0 0';
        lidInterior.style.boxShadow = 'inset 0 0 5px rgba(0, 0, 0, 0.5)';
        lidInterior.style.opacity = '0'; // Hidden initially
        lidInterior.style.transition = 'opacity 0.3s';
        chestLid.appendChild(lidInterior);

        // Create simplified lock/clasp at the front edge
        const chestLock = document.createElement('div');
        chestLock.className = 'chest-lock';
        chestLock.style.position = 'absolute';
        chestLock.style.width = '12px';
        chestLock.style.height = '14px';
        chestLock.style.top = '100%'; // Position it at bottom of lid, extending down
        chestLock.style.left = '50%';
        chestLock.style.transform = 'translateX(-50%)';
        chestLock.style.backgroundColor = '#DAA520'; // Gold color
        chestLock.style.borderRadius = '0 0 3px 3px';
        chestLock.style.boxShadow = '0 2px 3px rgba(0, 0, 0, 0.4)';
        chestLock.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.2)';
        chestLid.appendChild(chestLock);

        // Add keyhole to lock - simple circle
        const keyhole = document.createElement('div');
        keyhole.style.position = 'absolute';
        keyhole.style.width = '5px';
        keyhole.style.height = '5px';
        keyhole.style.top = '7px';
        keyhole.style.left = '50%';
        keyhole.style.transform = 'translateX(-50%)';
        keyhole.style.backgroundColor = '#333';
        keyhole.style.borderRadius = '50%';
        chestLock.appendChild(keyhole);

        // Add lock plate on the body that the lock closes onto
        const lockPlate = document.createElement('div');
        lockPlate.style.position = 'absolute';
        lockPlate.style.width = '14px';
        lockPlate.style.height = '5px';
        lockPlate.style.top = '0';
        lockPlate.style.left = '50%';
        lockPlate.style.transform = 'translateX(-50%)';
        lockPlate.style.backgroundColor = '#DAA520'; // Gold color
        lockPlate.style.borderRadius = '0 0 3px 3px';
        chestBody.appendChild(lockPlate);

        // Create wood grain lines - limited to just a few
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

        // Add just a few wood grain lines
        createWoodGrain(chestBody, 30, 85);
        createWoodGrain(chestBody, 70, 90);
        createWoodGrain(chestLid, 50, 85);

        // Create the interior treasure area
        const treasureArea = document.createElement('div');
        treasureArea.style.position = 'absolute';
        treasureArea.style.width = '90%';
        treasureArea.style.height = '80%';
        treasureArea.style.top = '10%';
        treasureArea.style.left = '5%';
        treasureArea.style.backgroundColor = '#654321'; // Dark brown interior
        treasureArea.style.borderRadius = '0 0 5px 5px';
        treasureArea.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.7)';
        treasureArea.style.overflow = 'hidden';
        chestBody.appendChild(treasureArea);

        // Assemble the chest
        inventoryChest.appendChild(chestBody);
        inventoryChest.appendChild(chestLid);
        document.body.appendChild(inventoryChest);

        // Proper chest opening animation with lid opening backward
        inventoryChest.addEventListener('mouseover', () => {
            // Open lid backward with proper physics
            chestLid.style.transform = 'rotateX(-100deg)';
            inventoryChest.style.transform = 'scale(1.05)';

            // Show interior of lid as it opens
            lidInterior.style.opacity = '1';

            // Reveal coins with slight delay for effect
            const coins = treasureArea.querySelectorAll('.treasure-coin');
            coins.forEach((coin, index) => {
                setTimeout(() => {
                    coin.style.opacity = '1';
                }, 150 + (index * 50));
            });
        });

        inventoryChest.addEventListener('mouseout', () => {
            // Close lid
            chestLid.style.transform = 'rotateX(0deg)';
            inventoryChest.style.transform = 'scale(1)';

            // Hide interior of lid
            lidInterior.style.opacity = '0';

            // Hide coins
            const coins = treasureArea.querySelectorAll('.treasure-coin');
            coins.forEach(coin => {
                coin.style.opacity = '0';
            });
        });

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

        // Treasure tab
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