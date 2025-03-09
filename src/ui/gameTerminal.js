import * as THREE from 'three';
import { initCommandSystem, isCommand, processCommand } from '../commands/commandSystem.js';
import { registerOpenUI, unregisterOpenUI } from './ui.js';

export class GameTerminal {
    constructor() {
        this.messages = [];
        this.visible = false;

        // Initialize command system
        this.commandSystem = initCommandSystem();

        // Create the terminal UI
        this.createTerminalUI();
    }

    createTerminalUI() {
        // Create terminal container with console styling
        this.terminalContainer = document.createElement('div');
        this.terminalContainer.id = 'game-terminal';
        this.terminalContainer.style.position = 'absolute';
        this.terminalContainer.style.top = '50%';
        this.terminalContainer.style.left = '50%';
        this.terminalContainer.style.transform = 'translate(-50%, -50%)';
        this.terminalContainer.style.width = '600px';
        this.terminalContainer.style.height = '400px';
        this.terminalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.terminalContainer.style.padding = '0';
        this.terminalContainer.style.borderRadius = '8px';
        this.terminalContainer.style.border = '2px solid #DAA520';
        this.terminalContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.7)';
        this.terminalContainer.style.overflow = 'hidden';
        this.terminalContainer.style.display = 'none';
        this.terminalContainer.style.flexDirection = 'column';
        this.terminalContainer.style.zIndex = '1000';
        document.body.appendChild(this.terminalContainer);

        // Create header bar
        const headerBar = document.createElement('div');
        headerBar.style.backgroundColor = '#1a1a1a';
        headerBar.style.padding = '8px 10px';
        headerBar.style.borderBottom = '2px solid #DAA520';
        headerBar.style.display = 'flex';
        headerBar.style.justifyContent = 'space-between';
        headerBar.style.alignItems = 'center';
        this.terminalContainer.appendChild(headerBar);

        // Terminal title
        const terminalTitle = document.createElement('div');
        terminalTitle.textContent = 'SHIP COMMAND TERMINAL';
        terminalTitle.style.color = '#DAA520';
        terminalTitle.style.fontFamily = 'monospace';
        terminalTitle.style.fontWeight = 'bold';
        terminalTitle.style.fontSize = '16px';
        headerBar.appendChild(terminalTitle);

        // Close button
        const closeButton = document.createElement('div');
        closeButton.textContent = '×';
        closeButton.style.color = '#DAA520';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '24px';
        closeButton.style.height = '24px';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.borderRadius = '50%';
        closeButton.style.transition = 'background-color 0.2s';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = 'rgba(218, 165, 32, 0.2)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        closeButton.addEventListener('click', () => this.toggle());
        headerBar.appendChild(closeButton);

        // Messages area (terminal output)
        this.messagesArea = document.createElement('div');
        this.messagesArea.style.flex = '1';
        this.messagesArea.style.padding = '10px';
        this.messagesArea.style.overflowY = 'auto';
        this.messagesArea.style.color = '#33ff33';
        this.messagesArea.style.fontFamily = 'monospace';
        this.messagesArea.style.fontSize = '14px';
        this.messagesArea.style.backgroundColor = '#000';
        this.terminalContainer.appendChild(this.messagesArea);

        // Input area
        const inputArea = document.createElement('div');
        inputArea.style.display = 'flex';
        inputArea.style.padding = '10px';
        inputArea.style.borderTop = '1px solid #333';
        inputArea.style.backgroundColor = '#1a1a1a';
        this.terminalContainer.appendChild(inputArea);

        // Command prompt
        const commandPrompt = document.createElement('div');
        commandPrompt.textContent = '> ';
        commandPrompt.style.color = '#DAA520';
        commandPrompt.style.fontFamily = 'monospace';
        commandPrompt.style.marginRight = '5px';
        inputArea.appendChild(commandPrompt);

        // Command input
        this.commandInput = document.createElement('input');
        this.commandInput.type = 'text';
        this.commandInput.placeholder = 'Enter command...';
        this.commandInput.style.flex = '1';
        this.commandInput.style.background = 'none';
        this.commandInput.style.border = 'none';
        this.commandInput.style.outline = 'none';
        this.commandInput.style.color = '#33ff33';
        this.commandInput.style.fontFamily = 'monospace';
        this.commandInput.style.fontSize = '14px';
        inputArea.appendChild(this.commandInput);

        // Set up key events for command input
        this.commandInput.addEventListener('keydown', (e) => {
            // Handle Enter key
            if (e.key === 'Enter') {
                this.executeCommand();
                e.preventDefault();
                e.stopPropagation();
            }

            // Prevent game controls from capturing input
            e.stopPropagation();
        });

        // Focus tracking
        this.commandInput.addEventListener('focus', () => {
            window.terminalInputActive = true;
        });

        this.commandInput.addEventListener('blur', () => {
            window.terminalInputActive = false;
        });

        // Allow terminal to be closed with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible) {
                this.toggle();
                e.preventDefault();
            }
        });

        // Add close method for use with UI management system
        this.close = () => this.toggle(false);
    }

    executeCommand() {
        const command = this.commandInput.value.trim();
        if (!command) return;

        // Add command to history
        this.addMessage(`> ${command}`, '#DAA520');

        // Clear input field
        this.commandInput.value = '';

        // Process the command if it starts with /
        if (command.startsWith('/')) {
            const wasProcessed = processCommand(command, this);
            if (!wasProcessed) {
                this.addMessage(`Unknown command: ${command}`, '#ff3333');
            }
        } else {
            // Add / prefix if it wasn't included
            const commandWithPrefix = `/${command}`;
            const wasProcessed = processCommand(commandWithPrefix, this);
            if (!wasProcessed) {
                this.addMessage(`Unknown command: ${command}`, '#ff3333');
            }
        }
    }

    addMessage(message, color = '#33ff33') {
        const messageEl = document.createElement('div');
        messageEl.style.marginBottom = '5px';
        messageEl.style.wordBreak = 'break-word';
        messageEl.style.color = color;

        // Sanitize the text to prevent XSS
        const tempElement = document.createElement('div');
        tempElement.textContent = message;
        messageEl.textContent = tempElement.textContent;

        this.messagesArea.appendChild(messageEl);
        this.messages.push(message);

        // Limit message history
        while (this.messagesArea.children.length > 300) {
            this.messagesArea.removeChild(this.messagesArea.firstChild);
        }

        this.scrollToBottom();
    }

    addSystemMessage(text) {
        this.addMessage(`SYSTEM: ${text}`, '#ffcc00');
    }

    scrollToBottom() {
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }

    showCommandHelp() {
        this.addMessage('=== AVAILABLE COMMANDS ===', '#DAA520');

        // Get command list from commandSystem.js 
        // Since we don't have direct access to the commands Map from commandSystem,
        // we'll list the most common commands
        const commonCommands = [
            { name: 'fly', desc: 'Toggle fly mode or control flying options' },
            { name: 'island', desc: 'Manage islands' },
            { name: 'fire', desc: 'Fire cannons or create fireballs' },
            { name: 'ship', desc: 'Control your ship' },
            { name: 'monster', desc: 'Spawn or manage monsters' },
            { name: 'teleport', desc: 'Teleport to a location' },
            { name: 'clan', desc: 'Manage your clan' },
            { name: 'bird', desc: 'Spawn birds' },
            { name: 'help', desc: 'Show this help message' }
        ];

        commonCommands.forEach(cmd => {
            this.addMessage(`/${cmd.name} - ${cmd.desc}`);
        });

        this.addMessage('\nTo see more details about a specific command, type /<command> help', '#aaaaaa');
        this.addMessage('Commands can be entered with or without the / prefix', '#aaaaaa');
        this.addMessage('\nType "help" for this list of commands', '#aaaaaa');
    }

    toggle(forceState) {
        const newState = forceState !== undefined ? forceState : !this.visible;

        if (newState) {
            // Show terminal
            this.terminalContainer.style.display = 'flex';
            this.visible = true;
            this.commandInput.focus();

            // Register as open UI
            registerOpenUI(this);

            // Show help message if this is the first activation or has no messages
            if (this.messagesArea.children.length === 0) {
                this.addMessage('=== SHIP COMMAND TERMINAL v1.0 ===', '#DAA520');
                this.addMessage('Welcome, Captain. Enter commands to control your ship and the game world.\n', '#DAA520');
                this.showCommandHelp();
            }
        } else {
            // Hide terminal
            this.terminalContainer.style.display = 'none';
            this.visible = false;
            this.commandInput.blur();

            // Unregister from open UI
            unregisterOpenUI(this);
        }
    }
}

// Create a function to initialize the terminal
export function initGameTerminal() {
    const terminal = new GameTerminal();
    return terminal;
} 