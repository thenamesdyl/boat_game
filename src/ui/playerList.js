/**
 * Player List UI Component
 * Displays a list of all players currently connected to the server
 */

// Update imports to include allPlayers functionality
import {
    playerData,
    getPlayerInfo,
    allPlayers,
    updateAllPlayers,
    getAllPlayers
} from '../core/gameState.js';
import { registerOpenUI, unregisterOpenUI } from './ui.js';

class PlayerList {
    constructor() {
        console.log("📋 PLAYERLIST: Initializing player list component");

        // Create container for the player list UI
        this.container = document.createElement('div');
        this.container.id = 'player-list';
        this.container.style.position = 'absolute';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.backgroundColor = 'rgba(40, 25, 10, 0.95)';
        this.container.style.padding = '20px';
        this.container.style.borderRadius = '10px';
        this.container.style.border = '3px solid #B8860B';
        this.container.style.display = 'none';
        this.container.style.flexDirection = 'column';
        this.container.style.width = '400px';
        this.container.style.maxHeight = '80vh';
        this.container.style.overflowY = 'auto';
        this.container.style.zIndex = '2000'; // Higher than other UI elements
        this.container.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.8)';
        document.body.appendChild(this.container);

        // Create basic header and content elements directly here
        const header = document.createElement('h2');
        header.textContent = 'Active Sailors';
        header.style.color = '#FFD700';
        header.style.textAlign = 'center';
        header.style.marginBottom = '15px';
        this.container.appendChild(header);

        // Create content container
        this.content = document.createElement('div');
        this.content.style.maxHeight = '400px';
        this.content.style.overflowY = 'auto';
        this.container.appendChild(this.content);

        // Add connectivity status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.style.padding = '8px';
        this.statusIndicator.style.marginTop = '10px';
        this.statusIndicator.style.textAlign = 'center';
        this.statusIndicator.style.fontSize = '14px';
        this.statusIndicator.style.color = '#ffaa00';
        this.statusIndicator.style.border = '1px solid #ffaa00';
        this.statusIndicator.style.borderRadius = '4px';
        this.statusIndicator.style.backgroundColor = 'rgba(60, 40, 0, 0.4)';
        this.container.appendChild(this.statusIndicator);

        // Create refresh button
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh List';
        refreshButton.style.marginTop = '15px';
        refreshButton.style.padding = '5px 10px';
        refreshButton.style.backgroundColor = '#5A3D27';
        refreshButton.style.color = '#FFD700';
        refreshButton.style.border = '1px solid #DAA520';
        refreshButton.style.borderRadius = '4px';
        refreshButton.style.cursor = 'pointer';
        refreshButton.addEventListener('click', () => this.refreshPlayerList());
        this.container.appendChild(refreshButton);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#5A3D27';
        closeButton.style.color = '#FFD700';
        closeButton.style.border = '1px solid #DAA520';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => this.close());
        this.container.appendChild(closeButton);

        // Fix circular dependency by using dynamic import for network
        setTimeout(() => this.initNetworkListeners(), 100);

        console.log("📋 PLAYERLIST: Initialization complete");
    }

    initNetworkListeners() {
        console.log("📋 PLAYERLIST: Setting up network listeners");

        // Try to access socket from multiple possible sources
        let socketConnection = null;

        // First try window.socket
        if (window.socket) {
            console.log("📋 PLAYERLIST: Found socket on window object");
            socketConnection = window.socket;
        }
        // Then try to import from network.js
        else {
            try {
                import('../core/network.js').then(network => {
                    console.log("📋 PLAYERLIST: Attempting to get socket from network module");
                    if (network.socket) {
                        console.log("📋 PLAYERLIST: Found socket in network module");
                        this.setupSocketListeners(network.socket);
                        return;
                    } else {
                        console.warn("📋 PLAYERLIST: Socket not found in network module");
                        this.showFallbackPlayerList();
                    }
                }).catch(err => {
                    console.error("📋 PLAYERLIST: Error importing network module:", err);
                    this.showFallbackPlayerList();
                });
                return; // Return early as we're handling this asynchronously
            } catch (err) {
                console.warn("📋 PLAYERLIST: Error accessing network module:", err);
            }
        }

        // If we got a socket connection, set it up
        if (socketConnection) {
            this.setupSocketListeners(socketConnection);
        } else {
            console.warn("📋 PLAYERLIST: No socket connection available from any source");
            this.statusIndicator.textContent = "No server connection - showing local data only";
            this.statusIndicator.style.color = "#ffaa00";
            this.statusIndicator.style.borderColor = "#ffaa00";

            // Use local player data as fallback
            this.showFallbackPlayerList();
        }
    }

    // Updated method to set up socket listeners with the provided socket
    setupSocketListeners(socket) {
        console.log("📋 PLAYERLIST: Setting up socket listeners with valid socket");
        this.statusIndicator.textContent = "Connected to game server";
        this.statusIndicator.style.color = "#00ff00";
        this.statusIndicator.style.borderColor = "#00ff00";

        socket.on('all_players', (players) => {
            console.log("📋 PLAYERLIST: Received player data", players);
            // Update both the UI and the gameState's allPlayers array
            updateAllPlayers(players);
            this.updatePlayerList(players);
        });

        // Add listener for player_joined events
        socket.on('player_joined', (player) => {
            console.log("📋 PLAYERLIST: Player joined", player);
            // Update gameState's allPlayers array by adding the new player
            const currentPlayers = getAllPlayers();
            const updatedPlayers = [...currentPlayers];

            // Check if player already exists, update if so
            const existingIndex = updatedPlayers.findIndex(p => p.id === player.id);
            if (existingIndex >= 0) {
                updatedPlayers[existingIndex] = player;
            } else {
                updatedPlayers.push(player);
            }

            updateAllPlayers(updatedPlayers);

            // Refresh the UI with the updated player list
            this.updatePlayerList(updatedPlayers);
        });

        // Add listener for player_left events
        socket.on('player_left', (playerId) => {
            console.log("📋 PLAYERLIST: Player left", playerId);
            // Update gameState's allPlayers array by removing the player
            const currentPlayers = getAllPlayers();
            const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);

            updateAllPlayers(updatedPlayers);

            // Refresh the UI with the updated player list
            this.updatePlayerList(updatedPlayers);
        });

        // Cache the socket for later use
        this.socketConnection = socket;

        // Request player list immediately
        this.refreshPlayerList();
    }

    // Updated to use gameState's allPlayers if available
    updatePlayerList(players) {
        console.log("📋 PLAYERLIST: Updating player list");

        // If no players are passed directly, try to use gameState's allPlayers
        if (!players || players.length === 0) {
            players = getAllPlayers();
            console.log("📋 PLAYERLIST: Using players from gameState:", players);
        }

        // Clear existing content
        this.content.innerHTML = '';

        if (!players || players.length === 0) {
            const noPlayers = document.createElement('div');
            noPlayers.textContent = 'No other sailors found on the seas';
            noPlayers.style.textAlign = 'center';
            noPlayers.style.color = '#aaa';
            noPlayers.style.padding = '20px 0';
            this.content.appendChild(noPlayers);
            return;
        }

        // Sort players by name
        const sortedPlayers = [...players].sort((a, b) => {
            return (a.name || '').localeCompare(b.name || '');
        });

        // Create a player entry for each player
        sortedPlayers.forEach(player => {
            const playerEntry = document.createElement('div');
            playerEntry.style.padding = '10px';
            playerEntry.style.marginBottom = '5px';
            playerEntry.style.backgroundColor = 'rgba(60, 40, 20, 0.5)';
            playerEntry.style.borderRadius = '4px';
            playerEntry.style.display = 'flex';
            playerEntry.style.justifyContent = 'space-between';

            const nameEl = document.createElement('div');
            nameEl.textContent = player.name || 'Unknown Sailor';

            // Set color based on player.color - handle different possible formats
            if (player.color) {
                if (typeof player.color === 'string') {
                    nameEl.style.color = player.color;
                } else if (player.color.r !== undefined) {
                    // RGB format from Three.js
                    const r = Math.floor(player.color.r * 255);
                    const g = Math.floor(player.color.g * 255);
                    const b = Math.floor(player.color.b * 255);
                    nameEl.style.color = `rgb(${r}, ${g}, ${b})`;
                }
            } else {
                nameEl.style.color = '#fff';
            }

            nameEl.style.fontWeight = 'bold';

            const statsEl = document.createElement('div');
            statsEl.textContent = `Fish: ${player.fishCount || 0} | Gold: ${player.money || 0}`;
            statsEl.style.color = '#ddd';
            statsEl.style.fontSize = '0.9em';

            playerEntry.appendChild(nameEl);
            playerEntry.appendChild(statsEl);
            this.content.appendChild(playerEntry);
        });

        // Update the count in the header
        const playerCount = document.createElement('div');
        playerCount.textContent = `${players.length} sailor${players.length !== 1 ? 's' : ''} online`;
        playerCount.style.fontSize = '14px';
        playerCount.style.color = '#aaa';
        playerCount.style.textAlign = 'center';
        playerCount.style.marginTop = '5px';
        this.content.appendChild(playerCount);
    }

    // Fallback function when socket isn't available - now uses gameState's allPlayers
    showFallbackPlayerList() {
        console.log("📋 PLAYERLIST: Using fallback player data from gameState");

        // First check if we have players in gameState
        const storedPlayers = getAllPlayers();

        if (storedPlayers && storedPlayers.length > 0) {
            console.log("📋 PLAYERLIST: Using cached players from gameState:", storedPlayers);
            // We have players in gameState, use them
            this.updatePlayerList(storedPlayers);
            return;
        }

        // If we don't have stored players, show only the current player
        this.content.innerHTML = '';

        try {
            // Get current player data from gameState
            const currentPlayer = getPlayerInfo();

            // Create an entry for the current player
            const player = {
                name: currentPlayer.name || 'You (Offline)',
                color: currentPlayer.color || '#4285f4',
                fishCount: localStorage.getItem('fishCount') || 0,
                money: localStorage.getItem('playerMoney') || 0
            };

            // Create visual notification that this is offline mode
            const offlineNotice = document.createElement('div');
            offlineNotice.textContent = '⚠️ OFFLINE MODE - Only showing your data';
            offlineNotice.style.textAlign = 'center';
            offlineNotice.style.color = '#ffaa00';
            offlineNotice.style.padding = '10px';
            offlineNotice.style.marginBottom = '15px';
            offlineNotice.style.backgroundColor = 'rgba(60, 40, 0, 0.4)';
            offlineNotice.style.borderRadius = '4px';
            this.content.appendChild(offlineNotice);

            // Create player entry
            const playerEntry = document.createElement('div');
            playerEntry.style.padding = '10px';
            playerEntry.style.marginBottom = '5px';
            playerEntry.style.backgroundColor = 'rgba(60, 40, 20, 0.5)';
            playerEntry.style.borderRadius = '4px';
            playerEntry.style.display = 'flex';
            playerEntry.style.justifyContent = 'space-between';

            const nameEl = document.createElement('div');
            nameEl.textContent = player.name;
            nameEl.style.color = player.color;
            nameEl.style.fontWeight = 'bold';

            const statsEl = document.createElement('div');
            statsEl.textContent = `Fish: ${player.fishCount} | Gold: ${player.money}`;
            statsEl.style.color = '#ddd';
            statsEl.style.fontSize = '0.9em';

            playerEntry.appendChild(nameEl);
            playerEntry.appendChild(statsEl);
            this.content.appendChild(playerEntry);

            // Add the single player to allPlayers
            updateAllPlayers([player]);

            console.log("📋 PLAYERLIST: Fallback data displayed successfully");
        } catch (error) {
            console.error("📋 PLAYERLIST: Error showing fallback data:", error);

            // Display error message in the player list
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Unable to display player data';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.color = '#ff5555';
            errorMsg.style.padding = '20px 0';
            this.content.appendChild(errorMsg);
        }
    }

    // Updated to check gameState first
    refreshPlayerList() {
        console.log("📋 PLAYERLIST: Refreshing player list");

        // Try to get players from gameState first
        const storedPlayers = getAllPlayers();
        if (storedPlayers && storedPlayers.length > 0) {
            console.log("📋 PLAYERLIST: Using players from gameState:", storedPlayers.length);
            this.updatePlayerList(storedPlayers);
        }

        // Still try to get updated data from the server
        if (this.socketConnection) {
            console.log("📋 PLAYERLIST: Using cached socket connection");
            this.socketConnection.emit('get_all_players');
        } else if (window.socket) {
            console.log("📋 PLAYERLIST: Using window.socket");
            window.socket.emit('get_all_players');
        } else {
            try {
                import('../core/network.js').then(network => {
                    if (network.socket) {
                        console.log("📋 PLAYERLIST: Using socket from network module");
                        network.socket.emit('get_all_players');
                    } else if (network.getAllPlayers && typeof network.getAllPlayers === 'function') {
                        console.log("📋 PLAYERLIST: Using getAllPlayers function from network module");
                        network.getAllPlayers();
                    } else {
                        console.log("📋 PLAYERLIST: No socket available, using fallback");
                        this.showFallbackPlayerList();
                    }
                }).catch(err => {
                    console.error("📋 PLAYERLIST: Error importing network module:", err);
                    this.showFallbackPlayerList();
                });
            } catch (error) {
                console.log("📋 PLAYERLIST: No socket connection, using fallback");
                this.showFallbackPlayerList();
            }
        }
    }

    show() {
        console.log("📋 PLAYERLIST: show() method called");
        this.container.style.display = 'block';
        console.log("📋 PLAYERLIST: Set container display to 'block'");
        this.refreshPlayerList();
        console.log("📋 PLAYERLIST: refreshPlayerList() called");
        registerOpenUI(this);
        console.log("📋 PLAYERLIST: Registered as open UI");
    }

    toggle() {
        console.log("📋 PLAYERLIST: toggle() method called");
        if (this.container.style.display === 'none') {
            console.log("📋 PLAYERLIST: Container is hidden, showing it now");
            this.show();
        } else {
            console.log("📋 PLAYERLIST: Container is visible, hiding it now");
            this.close();
        }
        console.log("📋 PLAYERLIST: toggle() completed");
    }

    close() {
        console.log("📋 PLAYERLIST: close() method called");
        this.container.style.display = 'none';
        unregisterOpenUI(this);
        console.log("📋 PLAYERLIST: Closed and unregistered");
    }
}

// Export a singleton instance
const playerList = new PlayerList();
export default playerList;

