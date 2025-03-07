import { setPlayerName, getPlayerName } from '../core/network.js';

/**
 * Sanitize a clan name to prevent XSS and ensure valid formatting
 * @param {string} clanName - The raw clan name input
 * @returns {string} - The sanitized clan name
 */
function sanitizeClanName(clanName) {
    if (!clanName) return '';

    console.log("Sanitizing clan name:", clanName);

    // Step 1: Remove HTML tags and special characters that could be used for script injection
    let sanitized = clanName
        .replace(/</g, '') // Remove < to prevent HTML tags
        .replace(/>/g, '') // Remove > to prevent HTML tags
        .replace(/&/g, '') // Remove & to prevent HTML entities
        .replace(/"/g, '') // Remove double quotes
        .replace(/'/g, '') // Remove single quotes
        .replace(/\\/g, '') // Remove backslashes
        .replace(/\//g, '') // Remove forward slashes
        .replace(/\[/g, '') // Remove square brackets (since we add these ourselves)
        .replace(/\]/g, ''); // Remove square brackets (since we add these ourselves)

    // Step 2: Trim whitespace and limit length
    sanitized = sanitized.trim();

    // Step 3: Ensure a minimum length after sanitization
    if (sanitized.length < 2) {
        console.log("Clan name too short after sanitization:", sanitized);
        return '';
    }

    // Step 4: Limit maximum length
    if (sanitized.length > 15) {
        sanitized = sanitized.substring(0, 15);
        console.log("Clan name truncated to 15 characters:", sanitized);
    }

    console.log("Sanitized clan name:", sanitized);
    return sanitized;
}

/**
 * Clan command implementation
 * @param {Array<string>} args - Command arguments
 * @param {object} chatSystem - Reference to the chat system
 */
export function clanCommand(args, chatSystem) {
    console.log("CLAN COMMAND EXECUTED with args:", args);
    // Check if any arguments were provided
    if (args.length === 0) {
        showClanCommandHelp(chatSystem);
        return;
    }

    const subcommand = args[0].toLowerCase();
    console.log("Clan subcommand:", subcommand);

    // Handle different clan subcommands
    switch (subcommand) {
        case 'create':
            handleClanCreate(args.slice(1), chatSystem);
            break;
        case 'help':
            showClanCommandHelp(chatSystem);
            break;
        default:
            chatSystem.addSystemMessage(`Unknown clan subcommand: ${subcommand}. Type "/clan help" for available commands.`);
            break;
    }
}

/**
 * Handle the clan create subcommand
 * @param {Array<string>} args - Command arguments after "create"
 * @param {object} chatSystem - Reference to the chat system
 */
function handleClanCreate(args, chatSystem) {
    console.log("HANDLE CLAN CREATE with args:", args);

    // Check if a clan name was provided
    if (args.length === 0) {
        chatSystem.addSystemMessage('Please provide a clan name: /clan create [name]');
        return;
    }

    // Join all remaining arguments to form the clan name
    const rawClanName = args.join(' ').trim();
    console.log("Raw clan name input:", rawClanName);

    // Sanitize the clan name to prevent XSS and ensure valid formatting
    const clanName = sanitizeClanName(rawClanName);

    // Validate sanitized clan name
    if (!clanName || clanName.length < 2) {
        chatSystem.addSystemMessage('Invalid clan name. Please use at least 2 alphanumeric characters and avoid special characters.');
        return;
    }

    // Get the current player name from the network module
    let currentPlayerName = getPlayerName();
    console.log("Retrieved current player name:", currentPlayerName);

    // Get the player's base name (without any existing clan tags)
    let baseName = currentPlayerName;

    // Check if the player already has a clan tag
    if (currentPlayerName.includes('[') && currentPlayerName.includes(']')) {
        console.log("Player already has clan tag in name, extracting original name");

        // Match everything after the last closing bracket
        // This handles cases like "[OldClan] PlayerName" or just "[OldClan]"
        const matches = currentPlayerName.match(/\](.*?)$/);
        console.log("Regex matches:", matches);

        if (matches && matches[1] && matches[1].trim().length > 0) {
            // We found text after the closing bracket - this is the actual player name
            baseName = matches[1].trim();
            console.log("Extracted base name:", baseName);
        } else {
            // If we're here, the name is probably just "[Something]"
            // We need to check if we have an original name stored in Firestore
            // For now, just use a default name
            baseName = "Sailor_" + Math.floor(Math.random() * 1000);
            console.log("Using default name:", baseName);
        }
    }

    // Final safety check - ensure we have a valid name
    if (!baseName || baseName.length === 0) {
        baseName = "Sailor_" + Math.floor(Math.random() * 1000);
        console.log("Using fallback name:", baseName);
    }

    // Format the new player name with clan tag at the beginning
    const newPlayerName = `[${clanName}] ${baseName}`;
    console.log("New player name with clan tag:", newPlayerName);

    // Update the player name
    console.log("Calling setPlayerName with:", newPlayerName);
    setPlayerName(newPlayerName);

    chatSystem.addSystemMessage(`You've created and joined clan "${clanName}". Your new display name is "${newPlayerName}".`);
}

/**
 * Show help for the clan command
 * @param {object} chatSystem - Reference to the chat system
 */
function showClanCommandHelp(chatSystem) {
    chatSystem.addSystemMessage(`
        Clan Commands:
        /clan create [name] - Create a new clan and add its tag to your name
        /clan help - Show this help message
    `);
}

// Export a list of all commands in this module with their descriptions
export const clanCommands = [
    {
        name: 'clan',
        handler: clanCommand,
        description: 'Create and manage clans'
    }
]; 