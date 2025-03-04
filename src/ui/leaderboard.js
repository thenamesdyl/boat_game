import { getPlayerStats, requestLeaderboard } from '../core/network.js';
import { gameUI } from './ui.js';
import { registerOpenUI, unregisterOpenUI } from './ui.js';

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

    // Update player stats section in the diary
    updatePlayerStatsInLeaderboard();

    // Make this function available globally so network.js can call it
    window.updateLeaderboardData = updateLeaderboardData;
}

// Update the leaderboard with new data
export function updateLeaderboardData(data) {
    if (!gameUI.elements.leaderboard) return;

    // Update monster kills tab
    if (data.monsterKills) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.monsterKillsContent,
            data.monsterKills,
            'Monster Records'
        );
    }

    // Update fish count tab
    if (data.fishCount) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.fishCountContent,
            data.fishCount,
            'Fish Records'
        );
    }

    // Update money tab
    if (data.money) {
        updateLeaderboardTab(
            gameUI.elements.leaderboard.moneyContent,
            data.money,
            'Gold Records',
            true
        );
    }
}

// New function to update player stats in the leaderboard/diary
export function updatePlayerStatsInLeaderboard() {
    if (!gameUI.elements.leaderboard || !gameUI.elements.leaderboard.playerStatsContent) return;

    // Get player stats
    const playerStats = getPlayerStats();

    // Clear existing content
    const container = gameUI.elements.leaderboard.playerStatsContent;
    container.innerHTML = '';

    // Create player stats section with a styled table
    const statsTable = document.createElement('table');
    statsTable.style.width = '100%';
    statsTable.style.borderCollapse = 'collapse';
    statsTable.style.marginTop = '20px';
    statsTable.style.fontFamily = '"Bookman Old Style", Georgia, serif';

    // Add fish count row
    const fishRow = document.createElement('tr');

    const fishLabel = document.createElement('td');
    fishLabel.textContent = 'Fish Caught:';
    fishLabel.style.padding = '10px';
    fishLabel.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
    fishLabel.style.fontWeight = 'bold';
    fishLabel.style.color = '#4B2D0A';
    fishRow.appendChild(fishLabel);

    const fishValue = document.createElement('td');
    fishValue.textContent = playerStats.fishCount || 0;
    fishValue.style.padding = '10px';
    fishValue.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
    fishValue.style.textAlign = 'right';
    fishValue.style.fontSize = '18px';
    fishRow.appendChild(fishValue);

    statsTable.appendChild(fishRow);

    // Add monster kills row
    const monsterRow = document.createElement('tr');

    const monsterLabel = document.createElement('td');
    monsterLabel.textContent = 'Monsters Slain:';
    monsterLabel.style.padding = '10px';
    monsterLabel.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
    monsterLabel.style.fontWeight = 'bold';
    monsterLabel.style.color = '#4B2D0A';
    monsterRow.appendChild(monsterLabel);

    const monsterValue = document.createElement('td');
    monsterValue.textContent = playerStats.monsterKills || 0;
    monsterValue.style.padding = '10px';
    monsterValue.style.borderBottom = '1px solid rgba(139, 69, 19, 0.3)';
    monsterValue.style.textAlign = 'right';
    monsterValue.style.fontSize = '18px';
    monsterRow.appendChild(monsterValue);

    statsTable.appendChild(monsterRow);

    // Add money row
    const moneyRow = document.createElement('tr');

    const moneyLabel = document.createElement('td');
    moneyLabel.textContent = 'Gold Coins:';
    moneyLabel.style.padding = '10px';
    moneyLabel.style.fontWeight = 'bold';
    moneyLabel.style.color = '#4B2D0A';
    moneyRow.appendChild(moneyLabel);

    const moneyValue = document.createElement('td');
    moneyValue.textContent = `${playerStats.money || 0} 🪙`;
    moneyValue.style.padding = '10px';
    moneyValue.style.textAlign = 'right';
    moneyValue.style.fontSize = '18px';
    moneyValue.style.color = '#B8860B'; // Gold color
    moneyRow.appendChild(moneyValue);

    statsTable.appendChild(moneyRow);

    container.appendChild(statsTable);
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
    // Create a book icon instead of a button
    const bookIcon = document.createElement('div');
    bookIcon.className = 'captains-diary-book';
    bookIcon.style.position = 'absolute';
    bookIcon.style.top = '10px';
    bookIcon.style.right = '180px';
    bookIcon.style.width = '50px';
    bookIcon.style.height = '60px';
    bookIcon.style.cursor = 'pointer';
    bookIcon.style.zIndex = '100';
    bookIcon.style.pointerEvents = 'auto';

    // Create the book cover
    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover';
    bookCover.style.position = 'absolute';
    bookCover.style.width = '100%';
    bookCover.style.height = '100%';
    bookCover.style.backgroundColor = '#8B4513'; // Brown leather color
    bookCover.style.borderRadius = '3px 10px 10px 3px'; // Rounded on right side like a book
    bookCover.style.boxShadow = '2px 2px 5px rgba(0, 0, 0, 0.5), 0 0 5px rgba(139, 69, 19, 0.8) inset';
    bookCover.style.border = '1px solid #654321';
    bookCover.style.transform = 'perspective(300px) rotateY(-10deg)';
    bookCover.style.transformOrigin = 'left center';
    bookCover.style.transition = 'transform 0.3s ease';

    // Create book spine
    const bookSpine = document.createElement('div');
    bookSpine.className = 'book-spine';
    bookSpine.style.position = 'absolute';
    bookSpine.style.left = '0';
    bookSpine.style.width = '5px';
    bookSpine.style.height = '100%';
    bookSpine.style.backgroundColor = '#654321'; // Darker brown for spine
    bookSpine.style.borderRadius = '2px 0 0 2px';
    bookSpine.style.boxShadow = 'inset -1px 0 3px rgba(0, 0, 0, 0.5)';

    // Create book pages (white edge visible on the side)
    const bookPages = document.createElement('div');
    bookPages.className = 'book-pages';
    bookPages.style.position = 'absolute';
    bookPages.style.top = '2px';
    bookPages.style.right = '2px';
    bookPages.style.width = '95%';
    bookPages.style.height = '95%';
    bookPages.style.backgroundColor = '#F5F1E4'; // Old paper color
    bookPages.style.borderRadius = '1px 7px 7px 1px'; // Slightly rounded
    bookPages.style.zIndex = '-1'; // Behind the cover
    bookPages.style.transform = 'translateX(-3px)';

    // Create book title label
    const bookTitle = document.createElement('div');
    bookTitle.className = 'book-title';
    bookTitle.textContent = "Diary";
    bookTitle.style.position = 'absolute';
    bookTitle.style.top = '50%';
    bookTitle.style.left = '50%';
    bookTitle.style.transform = 'translate(-50%, -50%) rotate(-90deg)';
    bookTitle.style.color = '#F5F1E4'; // Off-white color
    bookTitle.style.fontSize = '18px';
    bookTitle.style.fontWeight = 'bold';
    bookTitle.style.fontFamily = '"Pirata One", cursive, serif';
    bookTitle.style.whiteSpace = 'nowrap';
    bookTitle.style.textAlign = 'center';
    bookTitle.style.textShadow = '0 0 2px rgba(0, 0, 0, 0.7)';

    // Create a decorative bookmark hanging out of the book
    const bookmark = document.createElement('div');
    bookmark.className = 'book-bookmark';
    bookmark.style.position = 'absolute';
    bookmark.style.top = '5px';
    bookmark.style.right = '10px';
    bookmark.style.width = '5px';
    bookmark.style.height = '15px';
    bookmark.style.backgroundColor = '#B22222'; // Red bookmark
    bookmark.style.borderRadius = '0 0 2px 2px';
    bookmark.style.zIndex = '2';

    // Add hover effects
    bookIcon.addEventListener('mouseover', () => {
        bookCover.style.transform = 'perspective(300px) rotateY(-20deg)';
        bookIcon.style.transform = 'scale(1.05)';
    });

    bookIcon.addEventListener('mouseout', () => {
        bookCover.style.transform = 'perspective(300px) rotateY(-10deg)';
        bookIcon.style.transform = 'scale(1)';
    });

    // Assemble the book
    bookCover.appendChild(bookTitle);
    bookIcon.appendChild(bookPages);
    bookIcon.appendChild(bookCover);
    bookIcon.appendChild(bookSpine);
    bookIcon.appendChild(bookmark);
    document.body.appendChild(bookIcon);

    // Create book panel (hidden by default)
    const bookPanel = document.createElement('div');
    bookPanel.id = 'leaderboard-panel';
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

    // Table of contents entries (Left page)
    const tocTitle = document.createElement('h3');
    tocTitle.textContent = "Table of Contents";
    tocTitle.style.fontFamily = '"Pirata One", "Bookman Old Style", cursive';
    tocTitle.style.marginBottom = '15px';
    leftPage.appendChild(tocTitle);

    // Create entries that serve as our tabs
    const tocEntries = [
        { id: 'playerStats', icon: '📊', name: 'Captain\'s Stats' },
        { id: 'monsterKills', icon: '🐙', name: 'Monster Hunt Records' },  // Changed to Records
        { id: 'fishCount', icon: '🐟', name: 'Fishing Records' },          // Changed to Records
        { id: 'money', icon: '💰', name: 'Treasury Records' }              // Changed to Records
    ];

    // Create player stats content container (new)
    const playerStatsContent = document.createElement('div');
    playerStatsContent.id = 'player-stats-content';
    playerStatsContent.style.display = 'block'; // First one visible by default
    rightPage.appendChild(playerStatsContent);

    // Content containers 
    const monsterKillsContent = document.createElement('div');
    monsterKillsContent.id = 'monster-kills-leaderboard';
    monsterKillsContent.style.display = 'none'; // Hide initially, show stats first
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
    rightPageTitle.textContent = "Captain's Stats"; // Changed to Stats first
    rightPageTitle.style.fontFamily = '"Pirata One", "Bookman Old Style", cursive';
    rightPageTitle.style.textAlign = 'center';
    rightPageTitle.style.borderBottom = '2px solid #8B4513';
    rightPageTitle.style.paddingBottom = '10px';
    rightPageTitle.style.marginBottom = '20px';
    rightPage.insertBefore(rightPageTitle, rightPage.firstChild);

    // Set up event listeners for tab switching
    tabElements.playerStats.addEventListener('click', () => {
        if (tabElements.playerStats.dataset.active === 'true') return;

        // Update active states
        tabElements.playerStats.dataset.active = 'true';
        tabElements.monsterKills.dataset.active = 'false';
        tabElements.fishCount.dataset.active = 'false';
        tabElements.money.dataset.active = 'false';

        // Update styles
        tabElements.playerStats.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.monsterKills.style.backgroundColor = 'transparent';
        tabElements.fishCount.style.backgroundColor = 'transparent';
        tabElements.money.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Captain's Stats";

        // Show/hide content
        playerStatsContent.style.display = 'block';
        monsterKillsContent.style.display = 'none';
        fishCountContent.style.display = 'none';
        moneyContent.style.display = 'none';

        // Update player stats when this tab is shown
        updatePlayerStatsInLeaderboard();
    });

    tabElements.monsterKills.addEventListener('click', () => {
        if (tabElements.monsterKills.dataset.active === 'true') return;

        // Update active states
        tabElements.monsterKills.dataset.active = 'true';
        tabElements.playerStats.dataset.active = 'false';
        tabElements.fishCount.dataset.active = 'false';
        tabElements.money.dataset.active = 'false';

        // Update styles
        tabElements.monsterKills.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.playerStats.style.backgroundColor = 'transparent';
        tabElements.fishCount.style.backgroundColor = 'transparent';
        tabElements.money.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Monster Hunt Records";

        // Show/hide content
        monsterKillsContent.style.display = 'block';
        playerStatsContent.style.display = 'none';
        fishCountContent.style.display = 'none';
        moneyContent.style.display = 'none';

        // Request fresh leaderboard data
        console.log("data leaderboard " + requestLeaderboard());

    });

    tabElements.fishCount.addEventListener('click', () => {
        if (tabElements.fishCount.dataset.active === 'true') return;

        // Update active states
        tabElements.fishCount.dataset.active = 'true';
        tabElements.playerStats.dataset.active = 'false';
        tabElements.monsterKills.dataset.active = 'false';
        tabElements.money.dataset.active = 'false';

        // Update styles
        tabElements.fishCount.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.playerStats.style.backgroundColor = 'transparent';
        tabElements.monsterKills.style.backgroundColor = 'transparent';
        tabElements.money.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Fishing Records";

        // Show/hide content
        fishCountContent.style.display = 'block';
        playerStatsContent.style.display = 'none';
        monsterKillsContent.style.display = 'none';
        moneyContent.style.display = 'none';

        // Request fresh leaderboard data
        requestLeaderboard();
    });

    tabElements.money.addEventListener('click', () => {
        if (tabElements.money.dataset.active === 'true') return;

        // Update active states
        tabElements.money.dataset.active = 'true';
        tabElements.playerStats.dataset.active = 'false';
        tabElements.monsterKills.dataset.active = 'false';
        tabElements.fishCount.dataset.active = 'false';

        // Update styles
        tabElements.money.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
        tabElements.playerStats.style.backgroundColor = 'transparent';
        tabElements.monsterKills.style.backgroundColor = 'transparent';
        tabElements.fishCount.style.backgroundColor = 'transparent';

        // Update right page title
        rightPageTitle.textContent = "Treasury Records";

        // Show/hide content
        moneyContent.style.display = 'block';
        playerStatsContent.style.display = 'none';
        monsterKillsContent.style.display = 'none';
        fishCountContent.style.display = 'none';

        // Request fresh leaderboard data
        requestLeaderboard();
    });

    // Toggle leaderboard visibility when the book icon is clicked
    bookIcon.addEventListener('click', () => {
        if (bookPanel.style.display === 'none') {
            openLeaderboard();
        } else {
            closeLeaderboard();
        }
    });

    // Add these functions to handle opening and closing with proper registration
    function openLeaderboard() {
        bookPanel.style.display = 'block';
        // Play a book opening sound if available
        if (window.playSound) {
            window.playSound('page_turn');
        }
        // Update player stats when opening the diary
        updatePlayerStatsInLeaderboard();

        // Request latest leaderboard data from server
        requestLeaderboard();

        // Register the leaderboard as open
        registerOpenUI({
            element: bookPanel,
            close: closeLeaderboard
        });
    }

    function closeLeaderboard() {
        bookPanel.style.display = 'none';

        // Unregister from open UIs
        unregisterOpenUI({
            element: bookPanel,
            close: closeLeaderboard
        });
    }

    // Add close button (X) with dark background for visibility
    const closeButton = document.createElement('div');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Dark background for visibility
    closeButton.style.color = '#ffffff'; // White text
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.borderRadius = '12px'; // Circle shape
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.fontSize = '14px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.style.zIndex = '1001';

    // Add click event to close the diary
    closeButton.addEventListener('click', () => {
        closeLeaderboard();
    });

    bookPanel.appendChild(closeButton);

    // Store references to the leaderboard elements in gameUI
    gameUI.elements.leaderboard = {
        button: bookIcon, // Now using the book icon instead of a button
        panel: bookPanel,
        playerStatsContent: playerStatsContent,
        monsterKillsContent: monsterKillsContent,
        fishCountContent: fishCountContent,
        moneyContent: moneyContent
    };
} 