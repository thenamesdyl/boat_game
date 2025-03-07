// New file to control structure spawning
export const STRUCTURE_CONTROLS = {
    enableRandomSpawning: true,
    smugglersHideout: true,
    pirateTavern: true,
    blockCave: true
};

export function shouldSpawnStructure(structureId, random, features = []) {
    return (STRUCTURE_CONTROLS[structureId] &&
        STRUCTURE_CONTROLS.enableRandomSpawning &&
        random() < 0.3) ||
        features.includes(structureId);
} 