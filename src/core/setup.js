// If you have a setup function that creates default terrain:

function setupDefaultTerrain(scene) {
    console.log("DEBUG: Default terrain setup - HIDING massive island");

    // Find the massive island if it exists in the scene
    const massiveIsland = scene.getObjectByName("massiveIsland");
    if (massiveIsland) {
        // Make it invisible instead of removing (preserves functionality)
        massiveIsland.visible = false;
        console.log("DEBUG: Found and hid massive island");
    }

    // Still setup the cave
    setupBlockCave(scene);
}

// ... rest of existing code ... 