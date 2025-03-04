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
        // Create the integrated control panel container
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'ship-control-panel';
        this.controlPanel.style.position = 'absolute';
        this.controlPanel.style.bottom = '20px';
        this.controlPanel.style.right = '20px';
        this.controlPanel.style.width = '200px';
        this.controlPanel.style.backgroundColor = 'rgba(20, 40, 60, 0.85)';
        this.controlPanel.style.borderRadius = '10px';
        this.controlPanel.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7), inset 0 0 10px rgba(100, 200, 255, 0.2)';
        this.controlPanel.style.border = '2px solid #2a5a8a';
        this.controlPanel.style.overflow = 'hidden';
        this.controlPanel.style.zIndex = '900';
        document.body.appendChild(this.controlPanel);

        // Panel header with ship control look
        const panelHeader = document.createElement('div');
        panelHeader.className = 'control-panel-header';
        panelHeader.style.height = '30px';
        panelHeader.style.backgroundColor = '#1a3a5a';
        panelHeader.style.borderBottom = '2px solid #2a5a8a';
        panelHeader.style.display = 'flex';
        panelHeader.style.justifyContent = 'space-between';
        panelHeader.style.alignItems = 'center';
        panelHeader.style.padding = '0 10px';
        this.controlPanel.appendChild(panelHeader);

        // Ship systems label
        const systemsLabel = document.createElement('div');
        systemsLabel.textContent = 'SHIP SYSTEMS';
        systemsLabel.style.color = '#8ab7e0';
        systemsLabel.style.fontFamily = 'monospace, sans-serif';
        systemsLabel.style.fontWeight = 'bold';
        systemsLabel.style.fontSize = '14px';
        panelHeader.appendChild(systemsLabel);

        // Status indicator light
        const statusLight = document.createElement('div');
        statusLight.style.width = '10px';
        statusLight.style.height = '10px';
        statusLight.style.borderRadius = '50%';
        statusLight.style.backgroundColor = '#00ff66';
        statusLight.style.boxShadow = '0 0 5px #00ff66';
        panelHeader.appendChild(statusLight);

        // Create tabbed interface
        const tabsContainer = document.createElement('div');
        tabsContainer.style.display = 'flex';
        tabsContainer.style.borderBottom = '1px solid #2a5a8a';
        this.controlPanel.appendChild(tabsContainer);

        // Radar tab (Mini-map)
        this.radarTab = document.createElement('div');
        this.radarTab.textContent = 'RADAR';
        this.radarTab.style.padding = '6px 10px';
        this.radarTab.style.backgroundColor = '#1a3a5a';
        this.radarTab.style.color = '#8ab7e0';
        this.radarTab.style.fontFamily = 'monospace, sans-serif';
        this.radarTab.style.fontSize = '12px';
        this.radarTab.style.cursor = 'pointer';
        this.radarTab.style.flex = '1';
        this.radarTab.style.textAlign = 'center';
        this.radarTab.style.borderRight = '1px solid #2a5a8a';
        this.radarTab.dataset.active = 'true';
        tabsContainer.appendChild(this.radarTab);

        // Comms tab (Chat)
        this.commsTab = document.createElement('div');
        this.commsTab.textContent = 'COMMS';
        this.commsTab.style.padding = '6px 10px';
        this.commsTab.style.backgroundColor = 'transparent';
        this.commsTab.style.color = '#5a87b0';
        this.commsTab.style.fontFamily = 'monospace, sans-serif';
        this.commsTab.style.fontSize = '12px';
        this.commsTab.style.cursor = 'pointer';
        this.commsTab.style.flex = '1';
        this.commsTab.style.textAlign = 'center';
        this.commsTab.dataset.active = 'false';
        tabsContainer.appendChild(this.commsTab);

        // Content area
        const contentArea = document.createElement('div');
        contentArea.style.position = 'relative';
        contentArea.style.height = '200px';
        this.controlPanel.appendChild(contentArea);

        // Mini-map container (initially visible)
        this.miniMapContainer = document.createElement('div');
        this.miniMapContainer.id = 'mini-map';
        this.miniMapContainer.style.position = 'absolute';
        this.miniMapContainer.style.top = '0';
        this.miniMapContainer.style.left = '0';
        this.miniMapContainer.style.width = '100%';
        this.miniMapContainer.style.height = '100%';
        this.miniMapContainer.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
        this.miniMapContainer.style.display = 'flex';
        this.miniMapContainer.style.justifyContent = 'center';
        this.miniMapContainer.style.alignItems = 'center';
        contentArea.appendChild(this.miniMapContainer);

        // Radar screen overlay effect
        const radarScreen = document.createElement('div');
        radarScreen.style.position = 'absolute';
        radarScreen.style.top = '50%';
        radarScreen.style.left = '50%';
        radarScreen.style.transform = 'translate(-50%, -50%)';
        radarScreen.style.width = '150px';
        radarScreen.style.height = '150px';
        radarScreen.style.borderRadius = '50%';
        radarScreen.style.border = '2px solid rgba(100, 180, 255, 0.7)';
        radarScreen.style.boxShadow = 'inset 0 0 20px rgba(0, 150, 200, 0.3)';
        radarScreen.style.background = 'radial-gradient(circle, rgba(0,50,100,0.6) 0%, rgba(0,20,40,0.9) 100%)';
        radarScreen.style.overflow = 'hidden';
        this.miniMapContainer.appendChild(radarScreen);

        // Radar sweep effect
        const radarSweep = document.createElement('div');
        radarSweep.style.position = 'absolute';
        radarSweep.style.top = '0';
        radarSweep.style.left = '50%';
        radarSweep.style.width = '50%';
        radarSweep.style.height = '100%';
        radarSweep.style.background = 'linear-gradient(90deg, rgba(0,150,220,0) 0%, rgba(0,200,255,0.3) 100%)';
        radarSweep.style.transformOrigin = '0 50%';
        radarSweep.style.animation = 'radarSweep 4s infinite linear';
        radarScreen.appendChild(radarSweep);

        // Add animation for radar sweep
        const style = document.createElement('style');
        style.textContent = `
            @keyframes radarSweep {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .active-tab {
                background-color: #1a3a5a !important;
                color: #8ab7e0 !important;
            }
            
            .inactive-tab {
                background-color: transparent !important;
                color: #5a87b0 !important;
            }
        `;
        document.head.appendChild(style);

        // Self marker (player's ship)
        this.selfMarker = document.createElement('div');
        this.selfMarker.style.position = 'absolute';
        this.selfMarker.style.width = '8px';
        this.selfMarker.style.height = '8px';
        this.selfMarker.style.backgroundColor = '#ff3333';
        this.selfMarker.style.borderRadius = '50%';
        this.selfMarker.style.transform = 'translate(-50%, -50%)';
        this.selfMarker.style.boxShadow = '0 0 5px #ff3333';
        this.selfMarker.style.zIndex = '5';
        radarScreen.appendChild(this.selfMarker);

        // Chat container (initially hidden)
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container';
        this.chatContainer.style.position = 'absolute';
        this.chatContainer.style.top = '0';
        this.chatContainer.style.left = '0';
        this.chatContainer.style.width = '100%';
        this.chatContainer.style.height = '100%';
        this.chatContainer.style.display = 'none';
        this.chatContainer.style.flexDirection = 'column';
        contentArea.appendChild(this.chatContainer);

        // Messages area
        this.messagesArea = document.createElement('div');
        this.messagesArea.className = 'chat-messages';
        this.messagesArea.style.flex = '1';
        this.messagesArea.style.padding = '5px 8px';
        this.messagesArea.style.overflowY = 'auto';
        this.messagesArea.style.color = '#8ab7e0';
        this.messagesArea.style.fontSize = '12px';
        this.messagesArea.style.fontFamily = 'monospace, sans-serif';
        this.messagesArea.style.backgroundColor = 'rgba(0, 20, 40, 0.7)';
        this.messagesArea.style.borderTop = '1px solid #2a5a8a';
        this.messagesArea.style.height = '140px';
        this.chatContainer.appendChild(this.messagesArea);

        // Input area
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';
        inputArea.style.display = 'flex';
        inputArea.style.padding = '5px';
        inputArea.style.borderTop = '1px solid #2a5a8a';
        inputArea.style.backgroundColor = 'rgba(20, 40, 60, 0.7)';
        this.chatContainer.appendChild(inputArea);

        // Message input
        this.messageInput = document.createElement('input');
        this.messageInput.type = 'text';
        this.messageInput.placeholder = 'Send message...';
        this.messageInput.style.flex = '1';
        this.messageInput.style.padding = '5px';
        this.messageInput.style.border = '1px solid #2a5a8a';
        this.messageInput.style.borderRadius = '3px';
        this.messageInput.style.backgroundColor = 'rgba(10, 30, 50, 0.8)';
        this.messageInput.style.color = '#8ab7e0';
        this.messageInput.style.fontFamily = 'monospace, sans-serif';
        inputArea.appendChild(this.messageInput);

        // Send button
        this.sendButton = document.createElement('button');
        this.sendButton.textContent = 'SEND';
        this.sendButton.style.marginLeft = '5px';
        this.sendButton.style.padding = '5px';
        this.sendButton.style.border = '1px solid #2a5a8a';
        this.sendButton.style.borderRadius = '3px';
        this.sendButton.style.backgroundColor = '#1a3a5a';
        this.sendButton.style.color = '#8ab7e0';
        this.sendButton.style.cursor = 'pointer';
        this.sendButton.style.fontFamily = 'monospace, sans-serif';
        this.sendButton.style.fontSize = '12px';
        inputArea.appendChild(this.sendButton);

        // Unread indicator
        this.unreadIndicator = document.createElement('div');
        this.unreadIndicator.className = 'unread-indicator';
        this.unreadIndicator.style.position = 'absolute';
        this.unreadIndicator.style.top = '3px';
        this.unreadIndicator.style.right = '3px';
        this.unreadIndicator.style.width = '16px';
        this.unreadIndicator.style.height = '16px';
        this.unreadIndicator.style.backgroundColor = '#ff3333';
        this.unreadIndicator.style.borderRadius = '50%';
        this.unreadIndicator.style.display = 'none';
        this.unreadIndicator.style.justifyContent = 'center';
        this.unreadIndicator.style.alignItems = 'center';
        this.unreadIndicator.style.fontSize = '10px';
        this.unreadIndicator.style.color = 'white';
        this.unreadIndicator.style.fontWeight = 'bold';
        this.commsTab.appendChild(this.unreadIndicator);

        // Set up tab switching
        this.radarTab.addEventListener('click', () => {
            if (this.radarTab.dataset.active === 'true') return;

            this.radarTab.dataset.active = 'true';
            this.commsTab.dataset.active = 'false';

            this.radarTab.style.backgroundColor = '#1a3a5a';
            this.radarTab.style.color = '#8ab7e0';
            this.commsTab.style.backgroundColor = 'transparent';
            this.commsTab.style.color = '#5a87b0';

            this.miniMapContainer.style.display = 'flex';
            this.chatContainer.style.display = 'none';
        });

        this.commsTab.addEventListener('click', () => {
            if (this.commsTab.dataset.active === 'true') return;

            this.commsTab.dataset.active = 'true';
            this.radarTab.dataset.active = 'false';

            this.commsTab.style.backgroundColor = '#1a3a5a';
            this.commsTab.style.color = '#8ab7e0';
            this.radarTab.style.backgroundColor = 'transparent';
            this.radarTab.style.color = '#5a87b0';

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
        // Create message element
        const messageEl = document.createElement('div');
        console.log("message sent", message);
        messageEl.className = 'chat-message';
        messageEl.style.marginBottom = '5px';
        messageEl.style.wordBreak = 'break-word';
        messageEl.style.fontFamily = 'monospace, sans-serif';

        // Format timestamp
        const date = new Date(message.timestamp * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Format message color based on sender color
        let colorStyle = '#8ab7e0';
        if (message.sender_color) {
            const r = Math.floor(message.sender_color.r * 255);
            const g = Math.floor(message.sender_color.g * 255);
            const b = Math.floor(message.sender_color.b * 255);
            colorStyle = `rgb(${r}, ${g}, ${b})`;
        }

        // Create message HTML
        messageEl.innerHTML = `
            <span style="color: #4d7da8; font-size: 10px;">[${timeStr}]</span>
            <span style="color: ${colorStyle}; font-weight: bold;"> ${message.sender_name}: </span>
            <span>${message.content}</span>
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
        messageEl.style.color = '#ffcc00';
        messageEl.style.fontStyle = 'italic';
        messageEl.style.fontSize = '11px';
        messageEl.style.fontFamily = 'monospace, sans-serif';
        messageEl.textContent = `:: ${text} ::`;

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