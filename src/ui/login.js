/**
 * User login and profile screen
 * Handles player name and color selection
 */
import { registerScreen } from './messages.js';
import { setPlayerName, setPlayerColor } from '../core/gameState.js';

// Store player information
let playerName = localStorage.getItem('playerName') || '';
let playerColor = localStorage.getItem('playerColor') || '#4285f4';

/**
 * Show the login/profile screen for setting player name and color
 * @param {Function} onComplete - Function to call when complete
 */
export function showLoginScreen(onComplete) {
    console.log("👤 Login: Showing name/color selection screen");

    // Create container
    const loginContainer = document.createElement('div');
    loginContainer.style.position = 'fixed';
    loginContainer.style.top = '0';
    loginContainer.style.left = '0';
    loginContainer.style.width = '100%';
    loginContainer.style.height = '100%';
    loginContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    loginContainer.style.display = 'flex';
    loginContainer.style.justifyContent = 'center';
    loginContainer.style.alignItems = 'center';
    loginContainer.style.zIndex = '9999';
    document.body.appendChild(loginContainer);

    // Create form
    const loginForm = document.createElement('div');
    loginForm.style.backgroundColor = '#0f1626';
    loginForm.style.padding = '30px';
    loginForm.style.borderRadius = '10px';
    loginForm.style.boxShadow = '0 0 20px rgba(50, 130, 240, 0.3)';
    loginForm.style.width = '400px';
    loginForm.style.maxWidth = '90%';
    loginForm.style.border = '1px solid rgba(50, 130, 240, 0.4)';
    loginContainer.appendChild(loginForm);

    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Captain Profile';
    title.style.textAlign = 'center';
    title.style.color = '#fff';
    title.style.marginBottom = '20px';
    title.style.fontWeight = 'bold';
    loginForm.appendChild(title);

    // Name input
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your Captain Name:';
    nameLabel.style.display = 'block';
    nameLabel.style.color = '#ccc';
    nameLabel.style.marginBottom = '5px';
    loginForm.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = playerName;
    nameInput.placeholder = 'Enter your name';
    nameInput.style.width = '100%';
    nameInput.style.padding = '10px';
    nameInput.style.marginBottom = '20px';
    nameInput.style.borderRadius = '5px';
    nameInput.style.border = '1px solid #4285f4';
    nameInput.style.backgroundColor = '#1a2639';
    nameInput.style.color = '#fff';
    nameInput.style.outline = 'none';
    loginForm.appendChild(nameInput);

    // Color input
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Your Flag Color:';
    colorLabel.style.display = 'block';
    colorLabel.style.color = '#ccc';
    colorLabel.style.marginBottom = '5px';
    loginForm.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = playerColor;
    colorInput.style.width = '100%';
    colorInput.style.height = '40px';
    colorInput.style.marginBottom = '30px';
    colorInput.style.border = 'none';
    colorInput.style.borderRadius = '5px';
    colorInput.style.cursor = 'pointer';
    loginForm.appendChild(colorInput);

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Set Sail!';
    submitButton.style.display = 'block';
    submitButton.style.width = '100%';
    submitButton.style.padding = '12px';
    submitButton.style.backgroundColor = '#4285f4';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '5px';
    submitButton.style.fontSize = '16px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontWeight = 'bold';
    loginForm.appendChild(submitButton);

    // Focus on name input
    setTimeout(() => nameInput.focus(), 100);

    // Handle form submission
    submitButton.addEventListener('click', () => {
        playerName = nameInput.value.trim() || 'Captain';
        playerColor = colorInput.value;

        // Save to localStorage
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerColor', playerColor);

        // Update player state
        setPlayerName(playerName);

        // Convert hex color to RGB (0-1 range for Three.js)
        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return { r, g, b };
        };
        setPlayerColor(hexToRgb(playerColor));

        // Remove login screen
        document.body.removeChild(loginContainer);

        console.log(`👤 Login: Profile set - Name: ${playerName}, Color: ${playerColor}`);

        // Call completion callback
        if (onComplete && typeof onComplete === 'function') {
            onComplete();
        }
    });

    // Hover effect
    submitButton.addEventListener('mouseover', () => {
        submitButton.style.backgroundColor = '#5294ff';
    });
    submitButton.addEventListener('mouseout', () => {
        submitButton.style.backgroundColor = '#4285f4';
    });
}

/**
 * Check if login screen should be shown
 * @returns {boolean} True if login screen should be shown
 */
export function shouldShowLoginScreen() {
    // If no name is set or it's empty, show the screen
    return !playerName || playerName.trim() === '';
}

/**
 * Get current player information
 * @returns {Object} Player name and color
 */
export function getPlayerInfo() {
    return {
        name: playerName,
        color: playerColor
    };
}

// Register the login screen with the message system
registerScreen({
    id: 'login-profile',
    order: 200, // Show after Firebase auth but before MOTD
    shouldShow: shouldShowLoginScreen,
    show: showLoginScreen,
    required: false // Only show if player doesn't have a name
}); 