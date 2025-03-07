export function generateWorld(scene) {
    console.log("DEBUG: World generation modified - ONLY block cave");

    // Only generate block cave
    generateBlockCave(scene);

    // Disable all other generation
    // DO NOT call: generateIslands(scene);
    // DO NOT call: generateCoastalFeatures(scene);

    return true;
} 