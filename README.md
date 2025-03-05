Ship Sailing Game
A multiplayer 3D sailing game where players navigate across procedurally generated seas, encounter islands, fight sea monsters, and collect treasures. This game features real-time player interaction, fishing mechanics, inventory systems, and more.
Getting Started
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.
Prerequisites
What you need to install the software:
- Git
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Python 3.8+ (for the backend)
Cloning the Repository
# Clone the repository
git clone https://github.com/yourusername/boat-game.git

# Navigate to the project directory
cd boat-game

Folder Structure
boat-game/
├── assets/            # Game assets (3D models, textures, etc.)
├── src/               # Frontend source code
│   ├── audio/         # Music and sound effects
│   ├── core/          # Core game functionality
│   ├── entities/      # Game entities (player, monsters, etc.)
│   ├── environment/   # Environmental elements (water, clouds, etc.)
│   ├── gameplay/      # Gameplay mechanics (fishing, combat, etc.)
│   └── ui/            # User interface elements
├── api/               # Backend server code
│   └── app.py         # Main Flask/Socket.IO server
├── public/            # Static files
├── index.html         # Main HTML entry point
└── package.json       # Node.js dependencies
Installation
Frontend Setup
# Install frontend dependencies
npm install
Backend Setup
# Navigate to the api directory
cd api

# Install backend dependencies
pip install -r requirements.txt
Running Locally
Start the Backend Server
# From the api directory
python app.py

The server will run at http://localhost:5000 by default.
Start the Frontend Development Server
npm run dev
This will start the development server and automatically open the game in your default browser at http://localhost:1234 or another available port.
Game Controls
WASD or Arrow Keys: Control the boat's movement
Space: Fire cannons
C: Toggle mouse camera control
Click: Interact with objects (fishing, interacting with islands, etc.)
ESC: Open/close menu
Features
Real-time multiplayer sailing experience
Dynamic ocean with physics-based boat movement
Procedurally generated islands with different structures
Fishing system with various fish types
Combat against sea monsters
Day/night cycle with dynamic lighting
Weather effects including wind that affects boat movement
Inventory system for collected items
Player customization
Backend API
The game uses Socket.IO for real-time communication. The backend handles:
Player position tracking
Player state management
Island registration and tracking
Monster spawning and behavior
Inventory persistence
See api/README.md for more detailed backend documentation.
Building for Production
# Build the frontend for production
npm run build

The built files will be in the dist directory.
Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
