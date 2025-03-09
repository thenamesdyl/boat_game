// soundEffects.js - Dedicated file for game sound effects

// Audio context singleton to ensure we only create one
let audioContext = null;

// Initialize the audio system
export function initAudioSystem() {
    try {
        // Create audio context if browser supports it
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio system initialized");
        return true;
    } catch (e) {
        console.warn('Web Audio API not supported in this browser');
        return false;
    }
}

// Get or create audio context
function getAudioContext() {
    if (!audioContext) {
        initAudioSystem();
    }
    return audioContext;
}

// Play a simple cartoon-style cannon sound
export function playCannonSound(volume = 0.8) {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Simple compressor
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, ctx.currentTime);
    compressor.knee.setValueAtTime(10, ctx.currentTime);
    compressor.ratio.setValueAtTime(5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    compressor.connect(ctx.destination);

    // Create a simple cartoon-style boom
    createCartoonBoom(ctx, volume, compressor);

    // Add a simple reverb/echo effect
    setTimeout(() => {
        createSimpleEcho(ctx, volume * 0.3, compressor);
    }, 150); // 150ms delay for echo
}

// Create a simple cartoon-style boom sound with more PUNCH
function createCartoonBoom(ctx, volume, output = ctx.destination) {
    // Create main oscillator for the "boom" - larger frequency drop for more impact
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ctx.currentTime); // Higher starting frequency
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.25); // Faster drop

    // Add a percussive click for more punch
    const clickOsc = ctx.createOscillator();
    clickOsc.type = "square"; // Square wave for sharper attack
    clickOsc.frequency.setValueAtTime(200, ctx.currentTime);
    clickOsc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

    // Create noise for explosion character - shorter and punchier
    const bufferSize = 4096;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const outputData = noiseBuffer.getChannelData(0);

    // Fill buffer with sharper noise (more emphasis on attack)
    for (let i = 0; i < bufferSize; i++) {
        // Add stronger attack at the beginning
        const attackEmphasis = Math.max(0, 1 - (i / bufferSize) * 3);
        outputData[i] = (Math.random() * 2 - 1) * (1 + attackEmphasis);
    }

    // Noise source
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Simple lowpass filter for the noise - higher cutoff for more punch
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(500, ctx.currentTime); // Higher cutoff for more punch
    lowpass.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    // Volume envelopes - stronger attack, faster decay
    const oscEnvelope = ctx.createGain();
    oscEnvelope.gain.setValueAtTime(0, ctx.currentTime);
    oscEnvelope.gain.linearRampToValueAtTime(volume * 1.2, ctx.currentTime + 0.01); // Faster, stronger attack
    oscEnvelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    // Click envelope - very sharp attack
    const clickEnvelope = ctx.createGain();
    clickEnvelope.gain.setValueAtTime(0, ctx.currentTime);
    clickEnvelope.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.005); // Super fast attack
    clickEnvelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); // Very fast decay

    // Noise envelope - sharper attack
    const noiseEnvelope = ctx.createGain();
    noiseEnvelope.gain.setValueAtTime(0, ctx.currentTime);
    noiseEnvelope.gain.linearRampToValueAtTime(volume * 1.0, ctx.currentTime + 0.008); // Faster attack
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // Faster decay

    // Connect everything
    osc.connect(oscEnvelope);
    clickOsc.connect(clickEnvelope);
    noise.connect(lowpass);
    lowpass.connect(noiseEnvelope);
    oscEnvelope.connect(output);
    clickEnvelope.connect(output);
    noiseEnvelope.connect(output);

    // Play the sounds
    osc.start();
    clickOsc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.5);
    clickOsc.stop(ctx.currentTime + 0.1);
    noise.stop(ctx.currentTime + 0.2);
}

// Create a simple echo effect for cartoon feel - slightly punchier
function createSimpleEcho(ctx, volume, output = ctx.destination) {
    // Simple oscillator for echo
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(70, ctx.currentTime); // Slightly higher for more presence
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.25);

    // Volume envelope - sharper attack
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + 0.03); // Faster attack, higher peak
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    // Connect everything
    osc.connect(envelope);
    envelope.connect(output);

    // Play the sound
    osc.start();
    osc.stop(ctx.currentTime + 0.4); // Slightly shorter
}

// Additional sound effects can be added below 