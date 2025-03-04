import { onMoneyEarned } from '../core/network.js';

function handleTreasureFound(treasureType) {
    // Your existing code for treasure collection

    // Update player money stats in network
    const treasureValue = getTreasureValue(treasureType);
    onMoneyEarned(treasureValue);
}

function getTreasureValue(treasureType) {
    switch (treasureType) {
        case 'chest': return 500;
        case 'jewel': return 200;
        case 'coin': return 50;
        default: return 100;
    }
} 