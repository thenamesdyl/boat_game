import { gameUI } from './ui.js';

// Sample leaderboard data (will be replaced with real data later)
const sampleLeaderboardData = {
    monsterKills: [
        { name: 'Captain Morgan', value: 32, color: '#e74c3c' },
        { name: 'BlackBeard', value: 28, color: '#3498db' },
        { name: 'SeaWolf', value: 21, color: '#2ecc71' },
        { name: 'StormRider', value: 17, color: '#f1c40f' },
        { name: 'WaveDancer', value: 14, color: '#9b59b6' },
        { name: 'SaltySailor', value: 11, color: '#e67e22' },
        { name: 'DeepBlueDiver', value: 8, color: '#1abc9c' },
        { name: 'MarineMaster', value: 6, color: '#34495e' }
    ],
    fishCount: [
        { name: 'FisherKing', value: 78, color: '#3498db' },
        { name: 'CastMaster', value: 65, color: '#2ecc71' },
        { name: 'HookLine', value: 54, color: '#e74c3c' },
        { name: 'DeepSeaAngler', value: 47, color: '#f1c40f' },
        { name: 'BaitDropper', value: 39, color: '#9b59b6' },
        { name: 'ReelDeal', value: 28, color: '#e67e22' },
        { name: 'OceanHarvester', value: 22, color: '#1abc9c' },
        { name: 'NetCaster', value: 18, color: '#34495e' }
    ],
    money: [
        { name: 'GoldDigger', value: 4250, color: '#f1c40f' },
        { name: 'TreasureHunter', value: 3800, color: '#e74c3c' },
        { name: 'WealthyTrader', value: 3200, color: '#2ecc71' },
        { name: 'RichSeaDog', value: 2700, color: '#3498db' },
        { name: 'FortuneSeeker', value: 2100, color: '#9b59b6' },
        { name: 'GoldenSails', value: 1800, color: '#e67e22' },
        { name: 'PearlCollector', value: 1500, color: '#1abc9c' },
        { name: 'EmperorOfSeas', value: 1200, color: '#34495e' }
    ]
};

// Initialize the leaderboard system
export function initLeaderboard() {
    // Create the leaderboard UI in gameUI
    createLeaderboardUI();

    // Set up initial leaderboard data
    updateLeaderboardData(sampleLeaderboardData);
}

// Update the leaderboard with new data
export function updateLeaderboardData(data) {
    if (!gameUI.elements.leaderboard) return;

    // Update monster kills tab
    if (data.monsterKills) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.monsterKillsContent,
            data.monsterKills,
            'Monster Kills'
        );
    }

    // Update fish count tab
    if (data.fishCount) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.fishCountContent,
            data.fishCount,
            'Fish Count'
        );
    }

    // Update money tab
    if (data.money) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.moneyContent,
            data.money,
            'Gold Coins',
            true
        );
    }
}

// Helper function to update a specific leaderboard tab
function updateLeaderboardTab(contentElement, data, valueName, isCurrency = false) {
    // Clear existing content
    contentElement.innerHTML = '';

    // Create leaderboard table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    table.style.fontFamily = '"Bookman Old Style", Georgia, serif';

    // Create table header
    const headerRow = document.createElement('tr');

    // Rank column
    const rankHeader = document.createElement('th');
    rankHeader.textContent = 'Rank';
    rankHeader.style.padding = '8px';
    rankHeader.style.textAlign = 'center';
    rankHeader.style.borderBottom = '1px solid #8B4513';
    rankHeader.style.color = '#4B2D0A';
    headerRow.appendChild(rankHeader);

    // Player column
    const playerHeader = document.createElement('th');
    playerHeader.textContent = 'Captain';
    playerHeader.style.padding = '8px';
    playerHeader.style.textAlign = 'left';
    playerHeader.style.borderBottom = '1px solid #8B4513';
    playerHeader.style.color = '#4B2D0A';
    headerRow.appendChild(playerHeader);

    // Value column
    const valueHeader = document.createElement('th');
    valueHeader.textContent = valueName;
    valueHeader.style.padding = '8px';
    valueHeader.style.textAlign = 'right';
    valueHeader.style.borderBottom = '1px solid #8B4513';
    valueHeader.style.color = '#4B2D0A';
    headerRow.appendChild(valueHeader);

    table.appendChild(headerRow);

    // Add player rows
    data.forEach((player, index) => {
        const row = document.createElement('tr');

        // Add hover effect
        row.style.transition = 'background-color 0.2s';
        row.addEventListener('mouseover', () => {
            row.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
        });
        row.addEventListener('mouseout', () => {
            row.style.backgroundColor = 'transparent';
        });

        // Rank cell
        const rankCell = document.createElement('td');
        rankCell.textContent = `#${index + 1}`;
        rankCell.style.padding = '8px';
        rankCell.style.textAlign = 'center';
        rankCell.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';

        // Add medal icons for top 3
        if (index < 3) {
            const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
            rankCell.innerHTML = `<span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: ${medalColors[index]}; color: #333; font-weight: bold; line-height: 20px; text-align: center;">${index + 1}</span>`;
        }

        row.appendChild(rankCell);

        // Player cell
        const playerCell = document.createElement('td');

        // Create player name with color indicator
        const playerDisplay = document.createElement('div');
        playerDisplay.style.display = 'flex';
        playerDisplay.style.alignItems = 'center';

        const colorIndicator = document.createElement('div');
        colorIndicator.style.width = '12px';
        colorIndicator.style.height = '12px';
        colorIndicator.style.borderRadius = '50%';
        colorIndicator.style.backgroundColor = player.color || '#ffffff';
        colorIndicator.style.marginRight = '8px';

        const playerName = document.createElement('span');
        playerName.textContent = player.name;
        playerName.style.fontFamily = 'inherit';

        playerDisplay.appendChild(colorIndicator);
        playerDisplay.appendChild(playerName);
        playerCell.appendChild(playerDisplay);

        playerCell.style.padding = '8px';
        playerCell.style.textAlign = 'left';
        playerCell.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
        row.appendChild(playerCell);

        // Value cell
        const valueCell = document.createElement('td');
        valueCell.textContent = isCurrency ? `${player.value} 🪙` : player.value;
        valueCell.style.padding = '8px';
        valueCell.style.textAlign = 'right';
        valueCell.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
        valueCell.style.fontWeight = index === 0 ? 'bold' : 'normal';
        row.appendChild(valueCell);

        table.appendChild(row);
    });

    contentElement.appendChild(table);
}

// Create the leaderboard UI
function createLeaderboardUI() {
    // Create leaderboard button (to open/close leaderboard)
    const leaderboardButton = document.createElement('button');
    leaderboardButton.textContent = '📜 Captain\'s Diary';
    leaderboardButton.style.position = 'absolute';
    leaderboardButton.style.top = '10px';
    leaderboardButton.style.right = '120px'; // Position to the left of inventory button
    leaderboardButton.style.padding = '8px 15px';
    leaderboardButton.style.backgroundColor = 'rgba(60, 80, 120, 0.8)';
    leaderboardButton.style.border = '2px solid rgba(100, 150, 200, 0.9)';
    leaderboardButton.style.borderRadius = '5px';
    leaderboardButton.style.color = 'white';
    leaderboardButton.style.fontWeight = 'bold';
    leaderboardButton.style.cursor = 'pointer';
    leaderboardButton.style.fontSize = '16px';
    leaderboardButton.style.pointerEvents = 'auto';
    document.body.appendChild(leaderboardButton);

    // Create book panel (hidden by default)
    const bookPanel = document.createElement('div');
    bookPanel.style.position = 'absolute';
    bookPanel.style.top = '50%';
    bookPanel.style.left = '50%';
    bookPanel.style.transform = 'translate(-50%, -50%)';
    bookPanel.style.width = '800px'; // Wider to accommodate book spread
    bookPanel.style.height = '500px'; // Taller for a book look
    bookPanel.style.display = 'none';
    bookPanel.style.zIndex = '1000';
    bookPanel.style.pointerEvents = 'auto';
    bookPanel.style.fontFamily = '"Bookman Old Style", Georgia, serif'; // More book-like font

    // Create book cover design (background)
    bookPanel.style.backgroundImage = 'linear-gradient(to right, #8B4513, #A0522D 49%, #654321 50%, #8B4513)';
    bookPanel.style.border = '20px solid #654321'; // Brown book cover border
    bookPanel.style.borderRadius = '10px 25px 25px 10px'; // Rounded on right side like a book
    bookPanel.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.7), inset 0 0 50px rgba(0, 0, 0, 0.7)'; // Book shadow

    document.body.appendChild(bookPanel);

    // Create book binding (the middle line of the book)
    const bookBinding = document.createElement('div');
    bookBinding.style.position = 'absolute';
    bookBinding.style.top = '0';
    bookBinding.style.left = '50%';
    bookBinding.style.width = '20px';
    bookBinding.style.height = '100%';
    bookBinding.style.transform = 'translateX(-50%)';
    bookBinding.style.backgroundImage = 'linear-gradient(to right, #654321, #8B4513, #654321)';
    bookBinding.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.5)';
    bookPanel.appendChild(bookBinding);

    // Create left page (table of contents)
    const leftPage = document.createElement('div');
    leftPage.style.position = 'absolute';
    leftPage.style.top = '20px';
    leftPage.style.left = '20px';
    leftPage.style.width = 'calc(50% - 30px)';
    leftPage.style.height = 'calc(100% - 40px)';
    leftPage.style.backgroundColor = '#F5F1E4'; // Old paper color
    leftPage.style.backgroundImage = 'url("https://www.transparenttextures.com/patterns/parchment.png")'; // Subtle parchment texture
    leftPage.style.borderRadius = '5px 0 0 5px';
    leftPage.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.2)';
    leftPage.style.padding = '20px';
    leftPage.style.color = '#4B2D0A'; // Dark brown text
    leftPage.style.overflowY = 'auto';
    leftPage.style.display = 'flex';
    leftPage.style.flexDirection = 'column';
    bookPanel.appendChild(leftPage);

    // Create right page (content)
    const rightPage = document.createElement('div');
    rightPage.style.position = 'absolute';
    rightPage.style.top = '20px';
    rightPage.style.right = '20px';
    rightPage.style.width = 'calc(50% - 30px)';
    rightPage.style.height = 'calc(100% - 40px)';
    rightPage.style.backgroundColor = '#F5F1E4'; // Old paper color
    rightPage.style.backgroundImage = 'url("https://www.transparenttextures.com/patterns/parchment.png")'; // Subtle parchment texture
    rightPage.style.borderRadius = '0 5px 5px 0';
    rightPage.style.boxShadow = 'inset 0 0 10px rgba(0, 0, 0, 0.2)';
    rightPage.style.padding = '20px';
    rightPage.style.color = '#4B2D0A'; // Dark brown text
    rightPage.style.overflowY = 'auto';
    bookPanel.appendChild(rightPage);

    // Title on left page
    const diaryTitle = document.createElement('h1');
    diaryTitle.textContent = "Captain's Diary";
    diaryTitle.style.textAlign = 'center';
    diaryTitle.style.fontFamily = '"Pirata One", "Bookman Old Style", cursive';
    diaryTitle.style.fontSize = '28px';
    diaryTitle.style.color = '#4B2D0A';
    diaryTitle.style.borderBottom = '2px solid #8B4513';
    diaryTitle.style.paddingBottom = '10px';
    diaryTitle.style.marginBottom = '20px';
    leftPage.appendChild(diaryTitle);

    // Close button designed as a bookmark
    const closeButton = document.createElement('div');
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '-15px';
    closeButton.style.right = '10px';
    closeButton.style.width = '30px';
    closeButton.style.height = '40px';
    closeButton.style.backgroundColor = '#B22222'; // Red bookmark
    closeButton.style.color = '#F5F1E4';
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.cursor = 'pointer';
    closeButton.style.borderRadius = '0 0 5px 5px';
    closeButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.5)';
    closeButton.style.zIndex = '10';
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#8B0000'; // Darker red on hover
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = '#B22222';
    });
    bookPanel.appendChild(closeButton);

    // Table of contents entries (Left page)
    const tocTitle = document.createElement('h3');
    tocTitle.textContent = "Table of Contents";
    tocTitle.style.fontFamily = '"Pirata One", "Bookman Old Style", cursive';
    tocTitle.style.marginBottom = '15px';
    leftPage.appendChild(tocTitle);

    // Create entries that serve as our tabs
    const tocEntries = [
        { id: 'monsterKills', icon: '🐙', name: 'Monster Hunt Records' },
        { id: 'fishCount', icon: '🐟', name: 'Fishing Achievements' },
        { id: 'money', icon: '💰', name: 'Treasury Notes' }
    ];

    // Content containers on right page (initially hidden)
    const monsterKillsContent = document.createElement('div');
    monsterKillsContent.id = 'monster-kills-leaderboard';
    monsterKillsContent.style.display = 'block'; // First one visible by default
    rightPage.appendChild(monsterKillsContent);

    const fishCountContent = document.createElement('div');
    fishCountContent.id = 'fish-count-leaderboard';
    fishCountContent.style.display = 'none';
    rightPage.appendChild(fishCountContent);

    const moneyContent = document.createElement('div');
    moneyContent.id = 'money-leaderboard';
    moneyContent.style.display = 'none';
    rightPage.appendChild(moneyContent);

    // Create actual TOC entry elements
    const tabElements = {};

    tocEntries.forEach((entry, index) => {
        const entryElement = document.createElement('div');
        entryElement.classList.add('toc-entry');
        entryElement.dataset.active = index === 0 ? 'true' : 'false';
        entryElement.style.display = 'flex';
        entryElement.style.alignItems = 'center';
        entryElement.style.padding = '10px 15px';
        entryElement.style.margin = '5px 0';
        entryElement.style.cursor = 'pointer';
        entryElement.style.borderRadius = '5px';
        entryElement.style.backgroundColor = index === 0 ? 'rgba(139, 69, 19, 0.2)' : 'transparent';
        entryElement.style.transition = 'all 0.2s';

        const entryIcon = document.createElement('span');
        entryIcon.textContent = entry.icon;
        entryIcon.style.marginRight = '10px';
        entryIcon.style.fontSize = '20px';

        const entryText = document.createElement('span');
        entryText.textContent = entry.name;
        entryText.style.fontFamily = '"Bookman Old Style", Georgia, serif';

        const pageNumber = document.createElement('span');
        pageNumber.textContent = `p.${index + 1}`;
        pageNumber.style.marginLeft = 'auto';
        pageNumber.style.fontStyle = 'italic';
        pageNumber.style.opacity = '0.7';

        entryElement.appendChild(entryIcon);
        entryElement.appendChild(entryText);
        entryElement.appendChild(pageNumber);
        leftPage.appendChild(entryElement);

        tabElements[entry.id] = entryElement;

        // Add hover effect
        entryElement.addEventListener('mouseover', () => {
            if (entryElement.dataset.active !== 'true') {
                entryElement.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
            }
        });

        entryElement.addEventListener('mouseout', () => {
            if (entryElement.dataset.active !== 'true') {
                entryElement.style.backgroundColor = 'transparent';
            }
        });
    });

    // Right page title (changes based on selected tab)
    const rightPageTitle = document.createElement('h2');
    rightPageTitle.textContent = "Monster Hunt Records";
    rightPageTitle.style.fontFamily = '"Pirata One", "Bookman Old Style", cursive';
    rightPageTitle.style.textAlign = 'center';
    rightPageTitle.style.borderBottom = '2px solid #8B4513';
    rightPageTitle.style.paddingBottom = '10px';
    rightPageTitle.style.marginBottom = '20px';
    rightPage.insertBefore(rightPageTitle, rightPage.firstChild);

    // Set up event listeners for tab switching
    tabElements.monsterKills.addEventListener('click', () => {
        if (tabElements.monsterKills.dataset.active === 'true') return;

        // Update active states
        tabElements.monsterKills.dataset.active = 'true';
        tabElements.fishCount.dataset.active = 'false';
        tabElements.money.dataset.active = 'false';

        // Update styles
        tabElements.monsterKills.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.fishCount.style.backgroundColor = 'transparent';
        tabElements.money.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Monster Hunt Records";

        // Show/hide content
        monsterKillsContent.style.display = 'block';
        fishCountContent.style.display = 'none';
        moneyContent.style.display = 'none';
    });

    tabElements.fishCount.addEventListener('click', () => {
        if (tabElements.fishCount.dataset.active === 'true') return;

        // Update active states
        tabElements.fishCount.dataset.active = 'true';
        tabElements.monsterKills.dataset.active = 'false';
        tabElements.money.dataset.active = 'false';

        // Update styles
        tabElements.fishCount.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.monsterKills.style.backgroundColor = 'transparent';
        tabElements.money.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Fishing Achievements";

        // Show/hide content
        fishCountContent.style.display = 'block';
        monsterKillsContent.style.display = 'none';
        moneyContent.style.display = 'none';
    });

    tabElements.money.addEventListener('click', () => {
        if (tabElements.money.dataset.active === 'true') return;

        // Update active states
        tabElements.money.dataset.active = 'true';
        tabElements.monsterKills.dataset.active = 'false';
        tabElements.fishCount.dataset.active = 'false';

        // Update styles
        tabElements.money.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.monsterKills.style.backgroundColor = 'transparent';
        tabElements.fishCount.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Treasury Notes";

        // Show/hide content
        moneyContent.style.display = 'block';
        monsterKillsContent.style.display = 'none';
        fishCountContent.style.display = 'none';
    });

    // Set up event listeners for opening/closing the book
    leaderboardButton.addEventListener('click', () => {
        bookPanel.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        bookPanel.style.display = 'none';
    });

    // Store references in gameUI
    gameUI.elements.leaderboard = {
        button: leaderboardButton,
        panel: bookPanel,
        monsterKillsContent: monsterKillsContent,
        fishCountContent: fishCountContent,
        moneyContent: moneyContent,
        tabs: {
            monsterKills: tabElements.monsterKills,
            fishCount: tabElements.fishCount,
            money: tabElements.money
        }
    };
} 