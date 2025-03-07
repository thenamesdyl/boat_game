import * as THREE from 'three';
import { sendChatMessage, getRecentMessages, onChatMessage, onRecentMessages } from '../core/network.js';
// Import the command system
import { initCommandSystem, isCommand, processCommand } from '../commands/commandSystem.js';

export class ChatSystem {
    constructor() {
        this.messages = [];
        this.visible = false;
        this.minimized = false;
        this.unreadCount = 0;

        // Initialize command system
        this.commandSystem = null;

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

        // Handle keys in the message input
        this.messageInput.addEventListener('keydown', (e) => {
            // Send message on Enter key
            if (e.key === 'Enter') {
                this.sendMessage();
                // Don't propagate Enter key to game controls
                e.preventDefault();
                e.stopPropagation();
            }

            // Prevent game controls from capturing input when typing in chat
            // This ensures keys like WASD don't control the boat while typing
            e.stopPropagation();
        });

        // Add focus and blur event handlers to track when chat is active
        this.messageInput.addEventListener('focus', () => {
            // Set a global flag that can be checked by other handlers
            window.chatInputActive = true;
            console.log("Chat input focused - game controls disabled");
        });

        this.messageInput.addEventListener('blur', () => {
            // Clear the global flag
            window.chatInputActive = false;
            console.log("Chat input blurred - game controls enabled");
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

        // Check if this is a command
        if (this.commandSystem && isCommand(content)) {
            // Process the command
            const wasProcessed = processCommand(content, this);
            if (wasProcessed) {
                return; // Command processed, don't send as a chat message
            }
        }

        // Send message via network.js function
        sendChatMessage(content, 'global');
    }

    addMessage(message, shouldScroll = true) {
        console.log('CHAT UI: Adding message to UI:', message);
        console.log('CHAT UI: Message type:', typeof message);

        // Create message element with quill-written appearance
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.style.marginBottom = '5px';
        messageEl.style.wordBreak = 'break-word';
        messageEl.style.fontFamily = 'serif';
        messageEl.style.fontSize = '12px';
        messageEl.style.lineHeight = '20px';

        // Format timestamp
        let timeStr = '';
        if (typeof message === 'string') {
            console.log('CHAT UI: Processing string message:', message);
            // Handle simple string messages (backward compatibility)
            timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messageEl.innerHTML = `
                <span style="color: #8B4513; font-size: 10px; font-style: italic;">${timeStr}</span>
                <span style="color: #3D1C00;">${message}</span>
            `;
        } else if (message && typeof message === 'object') {
            console.log('CHAT UI: Processing object message with keys:', Object.keys(message));

            // Handle object messages (new format)
            // Format timestamp if available
            if (message.timestamp) {
                // Check if timestamp is a number (unix timestamp) or ISO string
                try {
                    const date = typeof message.timestamp === 'number' ?
                        new Date(message.timestamp) :
                        new Date(message.timestamp);
                    timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    console.log('CHAT UI: Parsed timestamp:', timeStr);
                } catch (e) {
                    console.error('CHAT UI: Error parsing timestamp:', e);
                    timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            } else {
                timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            // Format message color based on sender color
            let colorStyle = '#8B4513'; // Default dark brown ink
            if (message.sender_color) {
                try {
                    const r = Math.floor(message.sender_color.r * 255);
                    const g = Math.floor(message.sender_color.g * 255);
                    const b = Math.floor(message.sender_color.b * 255);
                    colorStyle = `rgb(${r}, ${g}, ${b})`;
                    console.log('CHAT UI: Using sender color:', colorStyle);
                } catch (e) {
                    console.error('CHAT UI: Error applying sender color:', e);
                }
            }

            // Default sender name if not provided
            const senderName = message.sender_name || "Unknown Sailor";
            console.log('CHAT UI: Using sender name:', senderName);

            // Add special styling for messages with clan tags (matching [Tag] format)
            let formattedSenderName = senderName;

            // Check if the sender name has a clan tag
            try {
                if (senderName.includes('[') && senderName.includes(']')) {
                    // Apply special styling to clan tags
                    const tagMatch = senderName.match(/^(\[.*?\])\s*(.*?)$/);
                    console.log('CHAT UI: Clan tag regex match:', tagMatch);

                    if (tagMatch && tagMatch[1] && tagMatch[2]) {
                        const clanTag = tagMatch[1];
                        const baseName = tagMatch[2];

                        // Use gold color for clan tags
                        formattedSenderName = `<span style="color: #DAA520; font-style: italic;">${clanTag}</span> <span style="color: ${colorStyle};">${baseName}</span>`;
                        console.log('CHAT UI: Formatted sender name with clan tag styling');
                    } else {
                        // Fallback if regex doesn't match as expected
                        formattedSenderName = `<span style="color: ${colorStyle};">${senderName}</span>`;
                        console.log('CHAT UI: Clan tag detected but regex failed, using default formatting');
                    }
                } else {
                    // No clan tag, use normal styling
                    formattedSenderName = `<span style="color: ${colorStyle};">${senderName}</span>`;
                    console.log('CHAT UI: No clan tag detected, using default formatting');
                }
            } catch (e) {
                console.error('CHAT UI: Error formatting sender name:', e);
                formattedSenderName = `<span style="color: ${colorStyle};">${senderName}</span>`;
            }

            // Create message HTML with quill writing style
            const messageContent = message.content || (typeof message === 'string' ? message : "");
            messageEl.innerHTML = `
                <span style="color: #8B4513; font-size: 10px; font-style: italic;">${timeStr}</span>
                <span style="font-weight: bold;"> ${formattedSenderName}: </span>
                <span style="color: #3D1C00;">${messageContent}</span>
            `;
            console.log('CHAT UI: Final formatted message HTML created');
        } else {
            console.error('CHAT UI: Invalid message type received:', typeof message);
            return; // Skip rendering invalid messages
        }

        // Add to messages area
        this.messagesArea.appendChild(messageEl);
        this.messages.push(message);

        // Limit number of displayed messages
        while (this.messagesArea.children.length > 100) {
            this.messagesArea.removeChild(this.messagesArea.firstChild);
        }

        // Update unread indicator if chat is minimized
        if (!this.visible || this.minimized) {
            this.unreadCount++;
            this.updateUnreadIndicator();
        }

        // Scroll to bottom if requested (and if chat is visible)
        if (shouldScroll && (this.visible && !this.minimized)) {
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
        this.radarScreen = null; // Store reference to the actual circular radar screen
    }

    setChatSystem(chatSystem) {
        this.chatSystem = chatSystem;

        // Find the circular radar screen within the miniMapContainer
        // This is the circular element that should contain our markers
        const radarScreen = this.chatSystem.miniMapContainer.querySelector('div');
        if (!radarScreen) {
            console.error("Radar screen element not found in miniMapContainer");
            return;
        }

        console.log("Radar screen found:", radarScreen);
        this.miniMapContainer = this.chatSystem.miniMapContainer;
        this.radarScreen = radarScreen; // Store reference to actual radar screen
    }

    addIslandMarker(id, position, radius) {
        if (this.islandMarkers.has(id) || !this.radarScreen) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '6px';
        marker.style.height = '6px';
        marker.style.backgroundColor = '#00ff88';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.boxShadow = '0 0 3px #00ff88';
        marker.style.zIndex = '3';
        this.radarScreen.appendChild(marker);

        this.islandMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    addPlayerMarker(id, position, color) {
        if (this.playerMarkers.has(id) || !this.radarScreen) return;

        const marker = document.createElement('div');
        marker.style.position = 'absolute';
        marker.style.width = '5px';
        marker.style.height = '5px';
        marker.style.backgroundColor = color || '#ff3333';
        marker.style.borderRadius = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.boxShadow = '0 0 3px ' + (color || '#ff3333');
        marker.style.zIndex = '4';
        this.radarScreen.appendChild(marker);

        this.playerMarkers.set(id, {
            element: marker,
            position: position
        });
    }

    removePlayerMarker(id) {
        if (!this.playerMarkers.has(id) || !this.radarScreen) return;

        const marker = this.playerMarkers.get(id);
        this.radarScreen.removeChild(marker.element);
        this.playerMarkers.delete(id);
    }

    updateMonsterMarkers(monsters, playerPosition, playerRotation, mapScale) {
        if (!this.radarScreen) return; // Use radarScreen instead of miniMapContainer

        // Debug log to check for monsters and their positions
        //console.log(`Updating ${monsters.length} monster markers, player at ${playerPosition.x.toFixed(0)},${playerPosition.z.toFixed(0)}`);
        if (monsters.length > 0) {
            //console.log(`First monster: Type=${monsters[0].monsterType}, State=${monsters[0].state}, Pos=${monsters[0].mesh.position.x.toFixed(0)},${monsters[0].mesh.position.z.toFixed(0)}`);
        }

        // Use a much smaller scale for monsters to amplify their movement
        // This makes even small position changes very visible on the radar
        const monsterMapScale = mapScale / 13; // Make monsters appear to move 4x more on the radar

        // Clear existing monster markers that are no longer needed
        const activeMonsterIds = new Set(monsters.map((_, index) => `monster-${index}`));

        // Remove markers for monsters that no longer exist
        for (const id of this.monsterMarkers.keys()) {
            if (!activeMonsterIds.has(id)) {
                const marker = this.monsterMarkers.get(id);
                if (marker && marker.element && marker.element.parentNode) {
                    this.radarScreen.removeChild(marker.element); // Use radarScreen
                }
                this.monsterMarkers.delete(id);
            }
        }

        // Add or update markers for existing monsters
        monsters.forEach((monster, index) => {
            const monsterId = `monster-${index}`;
            let marker;

            // Calculate distance to monster
            const distanceToMonster = new THREE.Vector3()
                .subVectors(monster.mesh.position, playerPosition)
                .length();

            // Only show monsters within detection range (800 units)
            const detectionRange = 800;
            const shouldShow = distanceToMonster <= detectionRange;

            // Determine display style based on monster state
            let markerColor, markerSize, markerPulse;

            switch (monster.state) {
                case 'attacking':
                    markerColor = '#ff0000'; // Bright red for attacking monsters
                    markerSize = 10; // Make bigger for better visibility
                    markerPulse = true;
                    break;
                case 'surfacing':
                    markerColor = '#ff3333'; // Red for surfacing monsters
                    markerSize = 9; // Make bigger for better visibility
                    markerPulse = false;
                    break;
                case 'hunting':
                    markerColor = '#ff9900'; // Orange for hunting monsters
                    markerSize = 8; // Make bigger for better visibility
                    markerPulse = false;
                    break;
                default:
                    markerColor = '#aa3333'; // Darker red for lurking monsters
                    markerSize = 7; // Make bigger for better visibility
                    markerPulse = false;
                    break;
            }

            if (!this.monsterMarkers.has(monsterId) && shouldShow) {
                // Create new marker for this monster
                marker = document.createElement('div');
                marker.style.position = 'absolute';
                marker.style.width = `${markerSize}px`;
                marker.style.height = `${markerSize}px`;
                marker.style.backgroundColor = markerColor;
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)';
                marker.style.boxShadow = `0 0 5px ${markerColor}`;
                marker.style.zIndex = '6'; // Higher than player marker

                // Calculate initial position - use monsterMapScale
                const centerX = this.radarScreen.clientWidth / 2; // Use radarScreen
                const centerY = this.radarScreen.clientHeight / 2; // Use radarScreen
                const relX = (monster.mesh.position.x - playerPosition.x) / monsterMapScale;
                const relZ = (monster.mesh.position.z - playerPosition.z) / monsterMapScale;
                const rotatedX = relX * Math.cos(-playerRotation) - relZ * Math.sin(-playerRotation);
                const rotatedZ = relX * Math.sin(-playerRotation) + relZ * Math.cos(-playerRotation);

                // Set initial position immediately
                marker.style.left = `${centerX + rotatedX}px`;
                marker.style.top = `${centerY + rotatedZ}px`;

                // Add pulsing animation for attacking monsters
                if (markerPulse) {
                    marker.style.animation = 'pulse 1s infinite alternate';

                    // Create style for pulse animation if it doesn't exist
                    if (!document.getElementById('radar-pulse-animation')) {
                        const style = document.createElement('style');
                        style.id = 'radar-pulse-animation';
                        style.textContent = `
                            @keyframes pulse {
                                0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
                                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.4; }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                }

                this.radarScreen.appendChild(marker); // Use radarScreen
                console.log(`Created monster marker at ${centerX + rotatedX}, ${centerY + rotatedZ}`);

                this.monsterMarkers.set(monsterId, {
                    element: marker,
                    position: monster.mesh.position.clone(),
                    state: monster.state
                });
            } else if (this.monsterMarkers.has(monsterId)) {
                // Update existing marker
                marker = this.monsterMarkers.get(monsterId);
                marker.position = monster.mesh.position.clone();

                // Calculate updated position - use monsterMapScale
                const centerX = this.radarScreen.clientWidth / 2; // Use radarScreen
                const centerY = this.radarScreen.clientHeight / 2; // Use radarScreen
                const relX = (monster.mesh.position.x - playerPosition.x) / monsterMapScale;
                const relZ = (monster.mesh.position.z - playerPosition.z) / monsterMapScale;
                const rotatedX = relX * Math.cos(-playerRotation) - relZ * Math.sin(-playerRotation);
                const rotatedZ = relX * Math.sin(-playerRotation) + relZ * Math.cos(-playerRotation);

                // Update position immediately
                marker.element.style.left = `${centerX + rotatedX}px`;
                marker.element.style.top = `${centerY + rotatedZ}px`;

                // Update marker appearance if monster state changed
                if (marker.state !== monster.state) {
                    marker.state = monster.state;
                    marker.element.style.backgroundColor = markerColor;
                    marker.element.style.boxShadow = `0 0 5px ${markerColor}`;
                    marker.element.style.width = `${markerSize}px`;
                    marker.element.style.height = `${markerSize}px`;

                    // Update pulse animation
                    if (markerPulse) {
                        marker.element.style.animation = 'pulse 1s infinite alternate';
                    } else {
                        marker.element.style.animation = 'none';
                    }
                }

                // Hide if outside mini-map
                const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
                const radius = this.radarScreen.clientWidth / 2 - 5; // Use radarScreen
                marker.element.style.display = (shouldShow && distance <= radius) ? 'block' : 'none';
            }
        });
    }

    updateMiniMap(playerPosition, playerRotation, mapScale) {
        if (!this.radarScreen) return;

        // Center the player on the mini-map
        const centerX = this.radarScreen.clientWidth / 2;
        const centerY = this.radarScreen.clientHeight / 2;

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
            const radius = this.radarScreen.clientWidth / 2;
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
            const radius = this.radarScreen.clientWidth / 2;
            if (distance > radius - 5) {
                marker.element.style.display = 'none';
            } else {
                marker.element.style.display = 'block';
            }
        });

        // Note: Monster markers are now updated directly in updateMonsterMarkers method
        // instead of here to ensure immediate positioning on creation
    }
}

// Export init functions
export function initChat() {
    const chatSystem = new ChatSystem();

    // Initialize the command system and attach it to the chat system
    chatSystem.commandSystem = initCommandSystem();

    return chatSystem;
}

export function initMiniMap() {
    const miniMap = new MiniMap();
    return miniMap;
} 