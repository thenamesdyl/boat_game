// chat.js - Integrated ship communications and radar system
import { sendChatMessage, getRecentMessages, onChatMessage, onRecentMessages } from '../core/network.js';

export class ChatSystem {
    constructor() {
        this.messages = [];
        this.visible = false;
        this.minimized = false;
        this.unreadCount = 0;

        // Create the UI elements
        this.createChatUI();

        // Set up Socket.IO event listeners
        this.setupSocketEvents();
    }

    createChatUI() {
        // Create the integrated control panel container (styled as a wooden navigation desk)
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'ship-control-panel';
        this.controlPanel.style.position = 'absolute';
        this.controlPanel.style.bottom = '20px';
        this.controlPanel.style.right = '20px';
        this.controlPanel.style.width = '200px';
        this.controlPanel.style.backgroundColor = '#8B5A2B'; // Medium cedar wood
        this.controlPanel.style.borderRadius = '8px';
        this.controlPanel.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7), inset 0 0 10px rgba(0, 0, 0, 0.3)'; // Worn wood look
        this.controlPanel.style.border = '4px solid #A67C52'; // Lighter wood border
        this.controlPanel.style.borderBottom = '6px solid #A67C52'; // Thicker bottom border for desk-like appearance
        this.controlPanel.style.overflow = 'hidden';
        this.controlPanel.style.zIndex = '900';
        document.body.appendChild(this.controlPanel);

        // Panel header with navigation station look
        const panelHeader = document.createElement('div');
        panelHeader.className = 'control-panel-header';
        panelHeader.style.height = '30px';
        panelHeader.style.backgroundColor = '#654321'; // Darker wood
        panelHeader.style.borderBottom = '2px solid #D2B48C'; // Tan border like worn leather
        panelHeader.style.display = 'flex';
        panelHeader.style.justifyContent = 'space-between';
        panelHeader.style.alignItems = 'center';
        panelHeader.style.padding = '0 10px';
        this.controlPanel.appendChild(panelHeader);

        // Ship systems label (now NAVIGATION STATION)
        const systemsLabel = document.createElement('div');
        systemsLabel.textContent = 'HELM';
        systemsLabel.style.color = '#DAA520'; // Golden text
        systemsLabel.style.fontFamily = 'serif';
        systemsLabel.style.fontWeight = 'bold';
        systemsLabel.style.fontSize = '14px';
        systemsLabel.style.letterSpacing = '1px';
        panelHeader.appendChild(systemsLabel);

        // Brass status light
        const statusLight = document.createElement('div');
        statusLight.style.width = '10px';
        statusLight.style.height = '10px';
        statusLight.style.borderRadius = '50%';
        statusLight.style.backgroundColor = '#B8860B'; // Darker gold/brass
        statusLight.style.boxShadow = '0 0 5px #B8860B';
        statusLight.style.border = '1px solid #FFD700'; // Gold border
        panelHeader.appendChild(statusLight);

        // Create tabbed interface (styled as weathered book tabs)
        const tabsContainer = document.createElement('div');
        tabsContainer.style.display = 'flex';
        tabsContainer.style.borderBottom = '1px solid #D2B48C'; // Tan border
        this.controlPanel.appendChild(tabsContainer);

        // Navigator's Map tab (renamed from Radar)
        this.radarTab = document.createElement('div');
        this.radarTab.textContent = 'CHART';
        this.radarTab.style.padding = '6px 10px';
        this.radarTab.style.backgroundColor = '#654321'; // Darker wood
        this.radarTab.style.color = '#DAA520'; // Golden text
        this.radarTab.style.fontFamily = 'serif';
        this.radarTab.style.fontSize = '12px';
        this.radarTab.style.cursor = 'pointer';
        this.radarTab.style.flex = '1';
        this.radarTab.style.textAlign = 'center';
        this.radarTab.style.borderRight = '1px solid #D2B48C'; // Tan border
        this.radarTab.style.borderTop = '2px solid #DAA520'; // Gold top accent
        this.radarTab.dataset.active = 'true';
        tabsContainer.appendChild(this.radarTab);

        // Comms tab (styled as a logbook tab)
        this.commsTab = document.createElement('div');
        this.commsTab.textContent = 'LOGBOOK';
        this.commsTab.style.padding = '6px 10px';
        this.commsTab.style.backgroundColor = 'transparent';
        this.commsTab.style.color = '#B8860B'; // Darker gold/brass
        this.commsTab.style.fontFamily = 'serif';
        this.commsTab.style.fontSize = '12px';
        this.commsTab.style.cursor = 'pointer';
        this.commsTab.style.flex = '1';
        this.commsTab.style.textAlign = 'center';
        this.commsTab.style.borderTop = '1px solid transparent'; // For alignment
        this.commsTab.dataset.active = 'false';
        tabsContainer.appendChild(this.commsTab);

        // Content area
        const contentArea = document.createElement('div');
        contentArea.style.position = 'relative';
        contentArea.style.height = '200px';
        this.controlPanel.appendChild(contentArea);

        // Navigator's Map container (previously mini-map)
        this.miniMapContainer = document.createElement('div');
        this.miniMapContainer.id = 'navigators-map';
        this.miniMapContainer.style.position = 'absolute';
        this.miniMapContainer.style.top = '0';
        this.miniMapContainer.style.left = '0';
        this.miniMapContainer.style.width = '100%';
        this.miniMapContainer.style.height = '100%';
        this.miniMapContainer.style.backgroundColor = '#D2B48C'; // Tan color like parchment
        this.miniMapContainer.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'smallGrid\' width=\'8\' height=\'8\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 8 0 L 0 0 0 8\' fill=\'none\' stroke=\'%23C19A6B\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23D2B48C\'/%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23smallGrid)\'/%3E%3C/svg%3E")'; // Grid pattern for map
        this.miniMapContainer.style.display = 'flex';
        this.miniMapContainer.style.justifyContent = 'center';
        this.miniMapContainer.style.alignItems = 'center';
        contentArea.appendChild(this.miniMapContainer);

        // Map overlay (circular chart with directional compass)
        const radarScreen = document.createElement('div');
        radarScreen.style.position = 'absolute';
        radarScreen.style.top = '50%';
        radarScreen.style.left = '50%';
        radarScreen.style.transform = 'translate(-50%, -50%)';
        radarScreen.style.width = '150px';
        radarScreen.style.height = '150px';
        radarScreen.style.borderRadius = '50%';
        radarScreen.style.border = '2px solid #B8860B'; // Brass border
        radarScreen.style.boxShadow = 'inset 0 0 10px rgba(184, 134, 11, 0.4)'; // Darker gold inner glow
        radarScreen.style.background = 'radial-gradient(circle, #D2B48C 0%, #C19A6B 100%)'; // Parchment gradient
        radarScreen.style.overflow = 'hidden';

        // Add compass rose elements
        const directions = ['N', 'E', 'S', 'W'];
        directions.forEach((dir, i) => {
            const dirMarker = document.createElement('div');
            dirMarker.textContent = dir;
            dirMarker.style.position = 'absolute';
            dirMarker.style.color = '#8B4513'; // Dark brown text
            dirMarker.style.fontSize = '10px';
            dirMarker.style.fontFamily = 'serif';
            dirMarker.style.fontWeight = 'bold';

            // Position based on direction
            if (dir === 'N') {
                dirMarker.style.top = '5px';
                dirMarker.style.left = '50%';
                dirMarker.style.transform = 'translateX(-50%)';
            } else if (dir === 'E') {
                dirMarker.style.right = '5px';
                dirMarker.style.top = '50%';
                dirMarker.style.transform = 'translateY(-50%)';
            } else if (dir === 'S') {
                dirMarker.style.bottom = '5px';
                dirMarker.style.left = '50%';
                dirMarker.style.transform = 'translateX(-50%)';
            } else {
                dirMarker.style.left = '5px';
                dirMarker.style.top = '50%';
                dirMarker.style.transform = 'translateY(-50%)';
            }

            radarScreen.appendChild(dirMarker);
        });

        // Add distance rings
        for (let i = 1; i <= 2; i++) {
            const ring = document.createElement('div');
            ring.style.position = 'absolute';
            ring.style.top = `${50 - i * 25}%`;
            ring.style.left = `${50 - i * 25}%`;
            ring.style.width = `${i * 50}%`;
            ring.style.height = `${i * 50}%`;
            ring.style.border = '1px dashed #8B4513'; // Dark brown dashed line
            ring.style.borderRadius = '50%';
            radarScreen.appendChild(ring);
        }

        this.miniMapContainer.appendChild(radarScreen);

        // Spyglass sweep effect instead of radar sweep
        const radarSweep = document.createElement('div');
        radarSweep.style.position = 'absolute';
        radarSweep.style.top = '0';
        radarSweep.style.left = '50%';
        radarSweep.style.width = '50%';
        radarSweep.style.height = '100%';
        radarSweep.style.background = 'linear-gradient(90deg, rgba(184, 134, 11, 0) 0%, rgba(184, 134, 11, 0.2) 100%)'; // Brass gradient
        radarSweep.style.transformOrigin = '0 50%';
        radarSweep.style.animation = 'radarSweep 4s infinite linear';
        radarScreen.appendChild(radarSweep);

        // Self marker (styled as a brass ship pin)
        this.selfMarker = document.createElement('div');
        this.selfMarker.style.position = 'absolute';
        this.selfMarker.style.width = '8px';
        this.selfMarker.style.height = '8px';
        this.selfMarker.style.backgroundColor = '#DAA520'; // Gold
        this.selfMarker.style.borderRadius = '0'; // Square for ship marker
        this.selfMarker.style.transform = 'translate(-50%, -50%) rotate(45deg)'; // Diamond shape
        this.selfMarker.style.boxShadow = '0 0 3px #DAA520'; // Gold glow
        this.selfMarker.style.zIndex = '5';
        this.selfMarker.style.border = '1px solid #8B4513'; // Dark brown border
        radarScreen.appendChild(this.selfMarker);

        // Chat container (styled as a ship's logbook)
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container';
        this.chatContainer.style.position = 'absolute';
        this.chatContainer.style.top = '0';
        this.chatContainer.style.left = '0';
        this.chatContainer.style.width = '100%';
        this.chatContainer.style.height = '100%';
        this.chatContainer.style.display = 'none';
        this.chatContainer.style.flexDirection = 'column';
        this.chatContainer.style.backgroundColor = '#D2B48C'; // Tan parchment
        this.chatContainer.style.backgroundImage = 'linear-gradient(to bottom, transparent 24px, #B8860B66 25px)'; // Lined paper
        this.chatContainer.style.backgroundSize = '100% 25px';
        contentArea.appendChild(this.chatContainer);

        // Messages area (logbook pages)
        this.messagesArea = document.createElement('div');
        this.messagesArea.className = 'chat-messages';
        this.messagesArea.style.flex = '1';
        this.messagesArea.style.padding = '5px 8px';
        this.messagesArea.style.overflowY = 'auto';
        this.messagesArea.style.color = '#8B4513'; // Dark brown text
        this.messagesArea.style.fontSize = '12px';
        this.messagesArea.style.fontFamily = 'serif';
        this.messagesArea.style.height = '140px';
        this.chatContainer.appendChild(this.messagesArea);

        // Input area (quill and ink design)
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';
        inputArea.style.display = 'flex';
        inputArea.style.padding = '5px';
        inputArea.style.borderTop = '1px solid #8B4513'; // Dark brown separator
        inputArea.style.backgroundColor = '#C19A6B'; // Slightly darker parchment
        this.chatContainer.appendChild(inputArea);

        // Message input (styled as a quill writing area)
        this.messageInput = document.createElement('input');
        this.messageInput.type = 'text';
        this.messageInput.placeholder = 'Write in logbook...';
        this.messageInput.style.flex = '1';
        this.messageInput.style.padding = '5px';
        this.messageInput.style.border = '1px solid #8B4513'; // Dark brown border
        this.messageInput.style.borderRadius = '3px';
        this.messageInput.style.backgroundColor = '#E6D2B5'; // Lighter parchment
        this.messageInput.style.color = '#3D1C00'; // Very dark brown
        this.messageInput.style.fontFamily = 'serif';
        this.messageInput.style.fontStyle = 'italic';
        inputArea.appendChild(this.messageInput);

        // Send button (styled as a wax seal)
        this.sendButton = document.createElement('button');
        this.sendButton.textContent = 'SEAL';
        this.sendButton.style.marginLeft = '5px';
        this.sendButton.style.padding = '5px';
        this.sendButton.style.border = '1px solid #8B4513'; // Dark brown border
        this.sendButton.style.borderRadius = '50%';
        this.sendButton.style.width = '40px';
        this.sendButton.style.height = '40px';
        this.sendButton.style.backgroundColor = '#B22222'; // Firebrick red for wax seal
        this.sendButton.style.color = '#FFD700'; // Gold text
        this.sendButton.style.cursor = 'pointer';
        this.sendButton.style.fontFamily = 'serif';
        this.sendButton.style.fontSize = '10px';
        this.sendButton.style.fontWeight = 'bold';
        this.sendButton.style.boxShadow = 'inset 0 0 5px rgba(0, 0, 0, 0.3)';
        inputArea.appendChild(this.sendButton);

        // Unread indicator (styled as a small ink blot)
        this.unreadIndicator = document.createElement('div');
        this.unreadIndicator.className = 'unread-indicator';
        this.unreadIndicator.style.position = 'absolute';
        this.unreadIndicator.style.top = '3px';
        this.unreadIndicator.style.right = '3px';
        this.unreadIndicator.style.width = '16px';
        this.unreadIndicator.style.height = '16px';
        this.unreadIndicator.style.backgroundColor = '#B22222'; // Firebrick red
        this.unreadIndicator.style.borderRadius = '50%';
        this.unreadIndicator.style.display = 'none';
        this.unreadIndicator.style.justifyContent = 'center';
        this.unreadIndicator.style.alignItems = 'center';
        this.unreadIndicator.style.fontSize = '10px';
        this.unreadIndicator.style.color = '#FFD700'; // Gold text
        this.unreadIndicator.style.fontWeight = 'bold';
        this.unreadIndicator.style.boxShadow = '0 0 3px #B22222';
        this.commsTab.appendChild(this.unreadIndicator);

        // Set up tab switching
        this.radarTab.addEventListener('click', () => {
            if (this.radarTab.dataset.active === 'true') return;

            this.radarTab.dataset.active = 'true';
            this.commsTab.dataset.active = 'false';

            this.radarTab.style.backgroundColor = '#654321'; // Darker wood
            this.radarTab.style.color = '#DAA520'; // Golden text
            this.commsTab.style.backgroundColor = 'transparent';
            this.commsTab.style.color = '#B8860B'; // Darker gold/brass

            this.miniMapContainer.style.display = 'flex';
            this.chatContainer.style.display = 'none';
        });

        this.commsTab.addEventListener('click', () => {
            if (this.commsTab.dataset.active === 'true') return;

            this.commsTab.dataset.active = 'true';
            this.radarTab.dataset.active = 'false';

            this.commsTab.style.backgroundColor = '#654321'; // Darker wood
            this.commsTab.style.color = '#DAA520'; // Golden text
            this.radarTab.style.backgroundColor = 'transparent';
            this.radarTab.style.color = '#B8860B'; // Darker gold/brass

            this.chatContainer.style.display = 'flex';
            this.miniMapContainer.style.display = 'none';

            // Clear unread count when switching to chat
            this.unreadCount = 0;
            this.updateUnreadIndicator();
            this.scrollToBottom();
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Send message on send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Send message on Enter key
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    setupSocketEvents() {
        // Listen for new messages
        // Register callback for incoming messages
        onChatMessage((message) => {
            console.log("message received", message);
            this.addMessage(message);

            // If chat tab is not active, increment unread count
            if (this.commsTab.dataset.active !== 'true') {
                this.unreadCount++;
                this.updateUnreadIndicator();
            }
        });

        // Register callback for receiving message history
        onRecentMessages((messages) => {
            console.log("message received", message);
            // Clear existing messages
            this.messages = [];
            this.messagesArea.innerHTML = '';

            // Add each message to the UI
            if (messages && messages.length) {
                // Display messages in chronological order
                for (const message of messages) {
                    this.addMessage(message, false);
                }

                // Scroll to the bottom
                this.scrollToBottom();
            }
        });

        // Request recent messages when initialized
        getRecentMessages('global', 20);
    }

    sendMessage() {
        console.log("message sent");
        const content = this.messageInput.value.trim();
        if (!content) return;

        // Clear input field
        this.messageInput.value = '';

        // Send message via network.js function
        sendChatMessage(content, 'global');
    }

    addMessage(message, shouldScroll = true) {
        // Create message element with quill-written appearance
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.style.marginBottom = '5px';
        messageEl.style.wordBreak = 'break-word';
        messageEl.style.fontFamily = 'serif';
        messageEl.style.fontSize = '12px';
        messageEl.style.lineHeight = '20px';

        // Format timestamp
        const date = new Date(message.timestamp * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Format message color based on sender color
        let colorStyle = '#8B4513'; // Default dark brown ink
        if (message.sender_color) {
            const r = Math.floor(message.sender_color.r * 255);
            const g = Math.floor(message.sender_color.g * 255);
            const b = Math.floor(message.sender_color.b * 255);
            colorStyle = `rgb(${r}, ${g}, ${b})`;
        }

        // Create message HTML with quill writing style
        messageEl.innerHTML = `
            <span style="color: #8B4513; font-size: 10px; font-style: italic;">${timeStr}</span>
            <span style="color: ${colorStyle}; font-weight: bold;"> ${message.sender_name}: </span>
            <span style="color: #3D1C00;">${message.content}</span>
        `;

        // Add to messages area
        this.messagesArea.appendChild(messageEl);
        this.messages.push(message);

        // Limit number of displayed messages
        while (this.messages.length > 100) {
            this.messages.shift();
            if (this.messagesArea.firstChild) {
                this.messagesArea.removeChild(this.messagesArea.firstChild);
            }
        }

        // Scroll to bottom if needed
        if (shouldScroll) {
            this.scrollToBottom();
        }
    }

    addSystemMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'system-message';
        messageEl.style.marginBottom = '5px';
        messageEl.style.color = '#B22222'; // Red ink for system messages
        messageEl.style.fontStyle = 'italic';
        messageEl.style.fontSize = '11px';
        messageEl.style.fontFamily = 'serif';
        messageEl.style.textAlign = 'center';
        messageEl.textContent = `~ ${text} ~`;

        this.messagesArea.appendChild(messageEl);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    updateUnreadIndicator() {
        if (this.unreadCount > 0) {
            this.unreadIndicator.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            this.unreadIndicator.style.display = 'flex';
        } else {
            this.unreadIndicator.style.display = 'none';
        }
    }
}

export class MiniMap {
    constructor() {
        this.islandMarkers = new Map();
        this.playerMarkers = new Map();
        this.monsterMarkers = new Map();

        // Reference the radar screen from ChatSystem
        this.chatSystem = null;
    }

    setChatSystem(chatSystem) {
        this.chatSystem = chatSystem;
        // Use the radar screen as our map container
        const radarScreen = this.chatSystem.miniMapContainer.querySelector('div');
        this.miniMapContainer = radarScreen;
    }

    addIslandMarker(id, position, radius) {
        if (this.islandMarkers.has(id) || !this.miniMapContainer) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '6px';
        marker.style.height = '6px';
        marker.style.backgroundColor = '#00ff88';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.boxShadow = '0 0 3px #00ff88';
        marker.style.zIndex = '3';
        this.miniMapContainer.appendChild(marker);

        this.islandMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    addPlayerMarker(id, position, color) {
        if (this.playerMarkers.has(id) || !this.miniMapContainer) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '5px';
        marker.style.height = '5px';
        marker.style.backgroundColor = color || '#ff3333';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.boxShadow = '0 0 3px ' + (color || '#ff3333');
        marker.style.zIndex = '4';
        this.miniMapContainer.appendChild(marker);

        this.playerMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    removePlayerMarker(id) {
        if (!this.playerMarkers.has(id) || !this.miniMapContainer) return;

        const marker = this.playerMarkers.get(id);
        this.miniMapContainer.removeChild(marker.element);
        this.playerMarkers.delete(id);
    }

    updateMonsterMarkers(monsters, playerPosition, playerRotation, mapScale) {
        if (!this.miniMapContainer) return;
        //console.log("Updating monster markers");

        // Clear existing monster markers that are no longer needed
        const activeMonsterIds = new Set(monsters.map((_, index) => `monster-${index}`));

        // Remove markers for monsters that no longer exist
        for (const id of this.monsterMarkers.keys()) {
            if (!activeMonsterIds.has(id)) {
                console.log("Removing monster marker", id);
                const marker = this.monsterMarkers.get(id);
                if (marker && marker.element && marker.element.parentNode) {
                    this.miniMapContainer.removeChild(marker.element);
                }
                this.monsterMarkers.delete(id);
            }
        }

        // Add or update markers for existing monsters
        monsters.forEach((monster, index) => {
            const monsterId = `monster-${index}`;
            let marker;

            // Only show monsters that are in SURFACING or ATTACKING states
            const shouldShow = monster.state === 'surfacing' || monster.state === 'attacking';

            if (!this.monsterMarkers.has(monsterId) && shouldShow) {
                // Create new marker for this monster
                marker = document.createElement('div');
                marker.style.position = 'absolute';
                marker.style.width = '6px';
                marker.style.height = '6px';
                marker.style.backgroundColor = '#ff3333'; // Red color for monsters
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)';
                marker.style.boxShadow = '0 0 5px #ff3333';
                marker.style.zIndex = '6'; // Higher than player marker
                this.miniMapContainer.appendChild(marker);

                this.monsterMarkers.set(monsterId, {
                    element: marker,
                    position: monster.mesh.position.clone()
                });
            } else if (this.monsterMarkers.has(monsterId)) {
                // Update existing marker
                marker = this.monsterMarkers.get(monsterId);
                marker.position = monster.mesh.position.clone();

                // Show/hide based on monster state
                marker.element.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    updateMiniMap(playerPosition, playerRotation, mapScale) {
        if (!this.miniMapContainer) return;

        // Center the player on the mini-map
        const centerX = this.miniMapContainer.clientWidth / 2;
        const centerY = this.miniMapContainer.clientHeight / 2;

        // Update self marker (already positioned at center)
        if (this.chatSystem && this.chatSystem.selfMarker) {
            this.chatSystem.selfMarker.style.left = `${centerX}px`;
            this.chatSystem.selfMarker.style.top = `${centerY}px`;
        }

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
            const radius = this.miniMapContainer.clientWidth / 2;
            if (distance > radius - 5) {
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
            const radius = this.miniMapContainer.clientWidth / 2;
            if (distance > radius - 5) {
                marker.element.style.display = 'none';
            } else {
                marker.element.style.display = 'block';
            }
        });

        // Update monster markers
        this.monsterMarkers.forEach((marker, id) => {
            const relX = (marker.position.x - playerPosition.x) / mapScale;
            const relZ = (marker.position.z - playerPosition.z) / mapScale;

            // Rotate relative to player heading
            const rotatedX = relX * Math.cos(-playerRotation) - relZ * Math.sin(-playerRotation);
            const rotatedZ = relX * Math.sin(-playerRotation) + relZ * Math.cos(-playerRotation);

            marker.element.style.left = `${centerX + rotatedX}px`;
            marker.element.style.top = `${centerY + rotatedZ}px`;

            // Hide if outside mini-map
            const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
            const radius = this.miniMapContainer.clientWidth / 2 - 5;
            marker.element.style.display = distance > radius ? 'none' : 'block';
        });
    }
}

// Export init functions
export function initChat() {
    const chatSystem = new ChatSystem();
    return chatSystem;
}

export function initMiniMap() {
    const miniMap = new MiniMap();
    return miniMap;
} 