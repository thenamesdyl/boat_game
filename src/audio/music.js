/**
 * Simple Music System
 * Loads and plays background music from the server
 */

const MusicSystem = (() => {
    // Main background music
    let backgroundMusic = null;
    let musicVolume = 0.1;
    let isMuted = true;
    let musicStartedByUserInteraction = false;

    /**
     * Initialize the music system and load the main track
     */
    const init = () => {
        // Create the audio element for background music
        backgroundMusic = new Audio('./output.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.volume = musicVolume;

        // Preload the audio
        backgroundMusic.load();

        // Add user interaction listeners to start music
        setupUserInteractionListeners();

        console.log('Music system initialized with main track');
    };

    /**
     * Set up listeners to start music on user interaction
     * This works around browser autoplay restrictions
     */
    const setupUserInteractionListeners = () => {
        const startMusicOnInteraction = () => {
            if (!musicStartedByUserInteraction) {
                playMusic();
                musicStartedByUserInteraction = true;

                // Remove listeners once music has started
                document.removeEventListener('click', startMusicOnInteraction);
                document.removeEventListener('keydown', startMusicOnInteraction);
                document.removeEventListener('touchstart', startMusicOnInteraction);

                console.log('Music started after user interaction');
            }
        };

        // Add listeners for common user interactions
        document.addEventListener('click', startMusicOnInteraction);
        document.addEventListener('keydown', startMusicOnInteraction);
        document.addEventListener('touchstart', startMusicOnInteraction);

        console.log('User interaction listeners set up');
    };

    /**
     * Play the background music
     */
    const playMusic = () => {
        console.log('Playing music', backgroundMusic);
        if (backgroundMusic) {
            backgroundMusic.play()
                .catch(error => console.error('Error playing music:', error));
        }
    };

    /**
     * Pause the background music
     */
    const pauseMusic = () => {
        if (backgroundMusic) {
            backgroundMusic.pause();
        }
    };

    /**
     * Set the volume of the background music
     * @param {number} volume - Volume level (0-1)
     */
    const setVolume = (volume) => {
        musicVolume = Math.max(0, Math.min(1, volume));

        if (backgroundMusic && !isMuted) {
            backgroundMusic.volume = musicVolume;
        }
    };

    /**
     * Mute or unmute the music
     * @param {boolean} mute - Whether to mute
     */
    const setMute = (mute) => {
        isMuted = mute;

        if (backgroundMusic) {
            backgroundMusic.volume = mute ? 0 : musicVolume;
        }
    };

    /**
     * Toggle mute state
     * @returns {boolean} - New mute state
     */
    const toggleMute = () => {
        setMute(!isMuted);
        return isMuted;
    };

    // Placeholder for future ambient sound system
    const updateWaveSound = (waveIntensity) => {
        // To be implemented in the future
        // Could adjust wave sound volume based on wave intensity
        console.log(`Wave intensity updated: ${waveIntensity}`);
    };

    // Placeholder for future weather sounds
    const updateWeatherSounds = (weatherType) => {
        // To be implemented in the future
        // Could play different weather sounds based on type
        console.log(`Weather changed to: ${weatherType}`);
    };

    // Return public API
    return {
        init,
        playMusic,
        pauseMusic,
        setVolume,
        setMute,
        toggleMute,
        updateWaveSound,    // Placeholder for future functionality
        updateWeatherSounds // Placeholder for future functionality
    };
})();

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    MusicSystem.init();

    // Uncomment to start music automatically
    // MusicSystem.playMusic();
});


// Export the music system
export default MusicSystem; 