// Main application logic
import { scales } from './scales.js';
import { generateArpPattern } from './arpeggiator.js';
import { initVisualizer, updateVisualizer } from './visualizer.js';
import { createSynths, disposeSynths, getLiveRefs } from './synths.js';
import { createSequences, setLivePatterns, regenerateLeadRiff } from './sequences.js';
import { downloadWAV } from './audio-export.js';
import { generateArrangement, getVibeArrangement, applyBeatVolumes, startArrangementPlayback, getCurrentBeat, BEATS_PER_BAR } from './arrangement.js';
import { initArrangementUI, renderArrangement, startPlayheadAnimation, stopPlayheadAnimation, setArrangementData, setPresetLevels, onCellInteraction } from './arrangement-ui.js';

// State
let isPlaying = false;
let currentPattern = null;
let sequences = [];
let arrangementData = null;
let currentBeat = 0;
let cleanupArrangement = null;

// Convert slider value to dB
const toDb = (val) => val === 0 ? -Infinity : (val - 10) * 3;

// Check if arrangement mode is active
function isArrangementMode() {
    return document.getElementById('arrangementMode').value === 'arrangement';
}

// Apply vibe preset settings to UI
function applyVibePreset(mood) {
    const preset = scales[mood];
    if (!preset) return;

    // Tempo
    if (preset.tempo) {
        document.getElementById('tempo').value = preset.tempo;
        document.getElementById('tempoVal').textContent = preset.tempo + ' BPM';
        Tone.Transport.bpm.value = preset.tempo;
    }

    // Density
    if (preset.density) {
        document.getElementById('density').value = preset.density;
        document.getElementById('densityVal').textContent = preset.density;
    }

    // Space/Reverb
    if (preset.space) {
        document.getElementById('space').value = preset.space;
        document.getElementById('spaceVal').textContent = preset.space;
    }

    // Brightness
    if (preset.brightness) {
        document.getElementById('brightness').value = preset.brightness;
        document.getElementById('brightnessVal').textContent = (preset.brightness * 10) + '%';
    }

    // Mixer levels
    if (preset.mixer) {
        const m = preset.mixer;
        if (m.kick !== undefined) document.getElementById('volKick').value = m.kick;
        if (m.snare !== undefined) document.getElementById('volSnare').value = m.snare;
        if (m.bass !== undefined) document.getElementById('volBass').value = m.bass;
        if (m.sub !== undefined) document.getElementById('volSub').value = m.sub;
        if (m.seq1 !== undefined) document.getElementById('volSeq1').value = m.seq1;
        if (m.seq2 !== undefined) document.getElementById('volSeq2').value = m.seq2;
        if (m.lead !== undefined) document.getElementById('volLead').value = m.lead;
        if (m.pad !== undefined) document.getElementById('volPad').value = m.pad;
    }
}

// Generate sequencer pattern
function generatePattern() {
    const mood = document.getElementById('mood').value;
    const density = parseInt(document.getElementById('density').value);
    const arpType = document.getElementById('arpPattern').value;
    const scaleSet = scales[mood];

    // Main sequencer pattern (16 steps)
    const seq1Pattern = generateArpPattern(scaleSet.notes, arpType, 16);
    // Add rests based on density
    for (let i = 0; i < seq1Pattern.length; i++) {
        if (Math.random() > 0.5 + density * 0.1) {
            seq1Pattern[i] = null;
        }
    }

    // Secondary sequencer (8 steps, higher register)
    const seq2Pattern = generateArpPattern(scaleSet.notesHigh, arpType, 8);
    for (let i = 0; i < seq2Pattern.length; i++) {
        if (Math.random() > 0.3 + density * 0.12) {
            seq2Pattern[i] = null;
        }
    }

    // Pad progression (8 chords)
    const padPattern = [...scaleSet.pad];

    // Bass sequence (16-step pattern with nulls for rests)
    const bassPattern = [...scaleSet.bass];

    // Pulse pattern
    const pulsePattern = [];
    for (let i = 0; i < 16; i++) {
        pulsePattern.push(i % 4 === 0 || (density > 2 && i % 4 === 2));
    }

    return { seq1Pattern, seq2Pattern, padPattern, bassPattern, pulsePattern, mood };
}

// Get all parameters from UI
function getParams() {
    const totalBars = parseInt(document.getElementById('barCount').value);
    const tempo = parseInt(document.getElementById('tempo').value);
    // Compute duration from bars and BPM when in arrangement mode
    const duration = isArrangementMode()
        ? Math.ceil(totalBars * 240 / tempo)
        : Math.ceil(totalBars * 240 / tempo);

    return {
        tempo,
        duration,
        density: parseInt(document.getElementById('density').value),
        space: parseInt(document.getElementById('space').value),
        stereoWidth: parseInt(document.getElementById('stereoWidth').value) / 10,
        lfoRateVal: parseInt(document.getElementById('lfoRate').value),
        lfoDepthVal: parseInt(document.getElementById('lfoDepth').value) / 10,
        brightness: parseInt(document.getElementById('brightness').value) / 10,
        volKick: toDb(parseInt(document.getElementById('volKick').value)),
        volSnare: toDb(parseInt(document.getElementById('volSnare').value)),
        volBass: toDb(parseInt(document.getElementById('volBass').value)),
        volSub: toDb(parseInt(document.getElementById('volSub').value)),
        volSeq1: toDb(parseInt(document.getElementById('volSeq1').value)),
        volSeq2: toDb(parseInt(document.getElementById('volSeq2').value)),
        volLead: toDb(parseInt(document.getElementById('volLead').value)),
        volPad: toDb(parseInt(document.getElementById('volPad').value)),
        glissando: parseInt(document.getElementById('glissando')?.value || 0)
    };
}

// Regenerate arrangement data from current vibe
// Uses hand-crafted per-vibe templates when available, random fallback otherwise
function regenerateArrangementData() {
    const mood = document.getElementById('mood').value;
    const totalBars = parseInt(document.getElementById('barCount').value);
    const preset = scales[mood];
    if (!preset) return;

    // Try vibe-specific arrangement first, fall back to random generation
    arrangementData = getVibeArrangement(mood, totalBars) || generateArrangement(preset.mixer, totalBars);
    setArrangementData(arrangementData);
    setPresetLevels(preset.mixer);
    renderArrangement(arrangementData, 0);
    updatePositionDisplay(0);
}

// Update position display
function updatePositionDisplay(bar) {
    const totalBars = arrangementData ? arrangementData.totalBars : 32;
    document.getElementById('barPosition').textContent = `Bar ${bar + 1} / ${totalBars}`;
    const bpm = parseInt(document.getElementById('tempo').value);
    const seconds = Math.floor(bar * 240 / bpm);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timePosition').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update mixer slider disabled state based on mode
function updateMixerSlidersState() {
    const disabled = isArrangementMode();
    const sliderIds = ['volKick', 'volSnare', 'volBass', 'volSub', 'volSeq1', 'volSeq2', 'volLead', 'volPad'];
    for (const id of sliderIds) {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = disabled;
            el.style.opacity = disabled ? '0.4' : '1';
        }
    }
}

// Live update functions
function updateLiveVolume(synthName, value) {
    if (!isPlaying) return;
    if (isArrangementMode()) return; // arrangement controls volumes
    const refs = getLiveRefs();
    
    // Convert level (0-10) to linear gain
    const levelToGain = (level) => {
        if (level <= 0) return 0;
        return Math.pow(level / 10, 1.5);
    };
    const gain = levelToGain(parseInt(value));

    // Update channel output gains for consistent behavior
    if (refs.channelGains) {
        switch (synthName) {
            case 'kick':
                if (refs.channelGains.kick) refs.channelGains.kick.gain.value = gain;
                break;
            case 'snare':
                if (refs.channelGains.snare) refs.channelGains.snare.gain.value = gain;
                break;
            case 'bass':
                if (refs.channelGains.bass) refs.channelGains.bass.gain.value = gain;
                break;
            case 'sub':
                if (refs.channelGains.sub) refs.channelGains.sub.gain.value = gain;
                break;
            case 'seq1':
                if (refs.channelGains.seq1) refs.channelGains.seq1.gain.value = gain;
                break;
            case 'seq2':
                if (refs.channelGains.seq2) refs.channelGains.seq2.gain.value = gain;
                break;
            case 'lead':
                if (refs.channelGains.lead) refs.channelGains.lead.gain.value = gain;
                break;
            case 'pad':
                if (refs.channelGains.pad) refs.channelGains.pad.gain.value = gain;
                break;
        }
    }
}

function updateLiveTempo(value) {
    Tone.Transport.bpm.value = parseInt(value);
}

function updateLiveLfoRate(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    const lfoFreq = 0.02 * parseInt(value);

    // Sequencer filter LFOs
    if (refs.lfos.filterLFO1) refs.lfos.filterLFO1.frequency.value = lfoFreq;
    if (refs.lfos.filterLFO2) refs.lfos.filterLFO2.frequency.value = lfoFreq * 0.6;

    // Pad LFOs (stereo movement)
    if (refs.lfos.padLFO) refs.lfos.padLFO.frequency.value = lfoFreq * 0.25;
    if (refs.lfos.padLFO2) refs.lfos.padLFO2.frequency.value = lfoFreq * 0.2;
    if (refs.lfos.padLFO3) refs.lfos.padLFO3.frequency.value = lfoFreq * 0.3;
    if (refs.lfos.padFilterLFO) refs.lfos.padFilterLFO.frequency.value = lfoFreq * 0.25;
    if (refs.lfos.padPwmLFO) refs.lfos.padPwmLFO.frequency.value = lfoFreq * 0.4;

    // Lead LFOs
    if (refs.lfos.leadFilterLFO) refs.lfos.leadFilterLFO.frequency.value = lfoFreq * 0.3;

    // Seq2 PWM
    if (refs.lfos.seq2PwmLFO) refs.lfos.seq2PwmLFO.frequency.value = lfoFreq * 0.8;

    // Auto-panners
    if (refs.effects.autoPanSeq1) refs.effects.autoPanSeq1.frequency.value = lfoFreq * 1.5;
    if (refs.effects.autoPanSeq2) refs.effects.autoPanSeq2.frequency.value = lfoFreq * 0.7;
}

function updateLiveLfoDepth(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    const depth = parseInt(value) / 10;

    if (refs.lfos.filterLFO1) {
        refs.lfos.filterLFO1.min = 400;
        refs.lfos.filterLFO1.max = 400 + depth * 3000;
    }
    if (refs.lfos.filterLFO2) {
        refs.lfos.filterLFO2.min = 300;
        refs.lfos.filterLFO2.max = 300 + depth * 2000;
    }
    if (refs.lfos.padFilterLFO) {
        refs.lfos.padFilterLFO.min = 500;
        refs.lfos.padFilterLFO.max = 500 + depth * 1500;
    }
}

function updateLiveStereoWidth(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    const width = parseInt(value) / 10;

    if (refs.effects.widener) refs.effects.widener.width.value = width;
    if (refs.effects.autoPanSeq1) refs.effects.autoPanSeq1.depth.value = width * 0.8;
    if (refs.effects.autoPanSeq2) refs.effects.autoPanSeq2.depth.value = width * 0.6;

    // Pad stereo LFOs
    if (refs.lfos.padLFO) {
        refs.lfos.padLFO.min = -width * 0.35;
        refs.lfos.padLFO.max = width * 0.35;
    }
    if (refs.lfos.padLFO2) {
        refs.lfos.padLFO2.min = width * 0.35;
        refs.lfos.padLFO2.max = -width * 0.35;
    }
    if (refs.lfos.padLFO3) {
        refs.lfos.padLFO3.min = -width * 0.25;
        refs.lfos.padLFO3.max = width * 0.25;
    }
}

function updateLiveReverb(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    const space = parseInt(value);

    if (refs.effects.reverb) {
        refs.effects.reverb.wet.value = 0.25 + space * 0.1;
    }
    if (refs.effects.pingPong) {
        refs.effects.pingPong.feedback.value = 0.25 + space * 0.05;
    }
}

function updateLiveBrightness(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    const brightness = parseInt(value) / 10;
    const freq = 1000 + brightness * 2500;

    if (refs.effects.seq1Filter) refs.effects.seq1Filter.frequency.value = freq;
    if (refs.effects.leadFilter) refs.effects.leadFilter.frequency.value = freq;
}

function updateLiveArpPattern(arpType) {
    if (!isPlaying || !currentPattern) return;

    const mood = currentPattern.mood;
    const density = parseInt(document.getElementById('density').value);
    const scaleSet = scales[mood];

    // Regenerate seq1 pattern with new arp type
    const seq1Pattern = generateArpPattern(scaleSet.notes, arpType, 16);
    for (let i = 0; i < seq1Pattern.length; i++) {
        if (Math.random() > 0.5 + density * 0.1) {
            seq1Pattern[i] = null;
        }
    }

    // Regenerate seq2 pattern with new arp type
    const seq2Pattern = generateArpPattern(scaleSet.notesHigh, arpType, 8);
    for (let i = 0; i < seq2Pattern.length; i++) {
        if (Math.random() > 0.3 + density * 0.12) {
            seq2Pattern[i] = null;
        }
    }

    // Update live patterns - sequences will pick up the new values
    setLivePatterns({ seq1: seq1Pattern, seq2: seq2Pattern });

    // Also update currentPattern for consistency
    currentPattern.seq1Pattern = seq1Pattern;
    currentPattern.seq2Pattern = seq2Pattern;
}

function updateLiveGlissando(value) {
    if (!isPlaying) return;
    const refs = getLiveRefs();
    refs.glissando = parseInt(value);
}

// Play
async function play() {
    if (isPlaying) return;
    await Tone.start();

    const params = getParams();
    Tone.Transport.bpm.value = params.tempo;

    if (!currentPattern) {
        currentPattern = generatePattern();
    }

    // Pass arrangementMode flag so synths know how to initialize channel gains
    params.arrangementMode = isArrangementMode() && arrangementData;
    
    const instruments = createSynths(params);
    sequences = createSequences(currentPattern, instruments, params.density);

    sequences.forEach(seq => seq.start(0));

    // Arrangement mode: apply per-beat volume automation
    if (isArrangementMode() && arrangementData) {
        applyBeatVolumes(arrangementData, 0, getLiveRefs, toDb);

        cleanupArrangement = startArrangementPlayback(
            arrangementData,
            getLiveRefs,
            toDb,
            (beat) => {
                currentBeat = beat;
                renderArrangement(arrangementData, currentBeat);
                updatePositionDisplay(Math.floor(beat / BEATS_PER_BAR));
            },
            () => {
                // Arrangement complete — stop playback
                stop();
                document.getElementById('status').textContent = 'Arrangement complete';
            }
        );

        startPlayheadAnimation(() => getCurrentBeat());
    }

    Tone.Transport.start();

    isPlaying = true;
    document.getElementById('status').textContent = isArrangementMode()
        ? 'Playing arrangement...'
        : 'Playing sequence...';
    updateVisualizer(isPlaying);
}

// Stop
function stop() {
    if (!isPlaying) return;
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled arrangement events
    sequences.forEach(seq => seq.stop());
    sequences = disposeSynths(sequences);

    if (cleanupArrangement) {
        cleanupArrangement();
        cleanupArrangement = null;
    }
    stopPlayheadAnimation();
    currentBeat = 0;

    isPlaying = false;
    document.getElementById('status').textContent = 'Stopped';
    updateVisualizer(false);
    renderArrangement(arrangementData, 0);
    updatePositionDisplay(0);
}

// New track — regenerates musical patterns (notes, rhythms) but keeps arrangement
function newTrack() {
    const wasPlaying = isPlaying;
    stop();
    currentPattern = generatePattern();
    document.getElementById('status').textContent = 'New sequence generated';
    if (wasPlaying) {
        play();
    }
}

// Change vibe - applies preset and regenerates
async function changeVibe() {
    const mood = document.getElementById('mood').value;
    applyVibePreset(mood);

    const wasPlaying = isPlaying;
    stop();
    currentPattern = generatePattern();
    regenerateArrangementData();
    document.getElementById('status').textContent = scales[mood]?.name || 'Ready';

    if (wasPlaying) {
        await play();
    }
}

// Handle WAV download
async function handleDownload() {
    stop();
    if (!currentPattern) {
        currentPattern = generatePattern();
    }
    const arrData = isArrangementMode() ? arrangementData : null;
    await downloadWAV(currentPattern, getParams, arrData);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('playBtn').addEventListener('click', play);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('newBtn').addEventListener('click', newTrack);
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);

    // Vibe/Mood change - applies preset and regenerates
    document.getElementById('mood').addEventListener('change', changeVibe);

    // Tempo - live update
    document.getElementById('tempo').addEventListener('input', (e) => {
        document.getElementById('tempoVal').textContent = e.target.value + ' BPM';
        updateLiveTempo(e.target.value);
    });

    // Density - display only (requires regeneration)
    document.getElementById('density').addEventListener('input', (e) => {
        document.getElementById('densityVal').textContent = e.target.value;
    });

    // Arp Pattern - live update
    document.getElementById('arpPattern').addEventListener('change', (e) => {
        updateLiveArpPattern(e.target.value);
    });

    // Reverb/Space - live update
    document.getElementById('space').addEventListener('input', (e) => {
        document.getElementById('spaceVal').textContent = e.target.value;
        updateLiveReverb(e.target.value);
    });

    // LFO Rate - live update
    document.getElementById('lfoRate').addEventListener('input', (e) => {
        const hz = (0.02 * parseInt(e.target.value)).toFixed(2);
        document.getElementById('lfoRateVal').textContent = hz + ' Hz';
        updateLiveLfoRate(e.target.value);
    });

    // LFO Depth - live update
    document.getElementById('lfoDepth').addEventListener('input', (e) => {
        document.getElementById('lfoDepthVal').textContent = (parseInt(e.target.value) * 10) + '%';
        updateLiveLfoDepth(e.target.value);
    });

    // Stereo Width - live update
    document.getElementById('stereoWidth').addEventListener('input', (e) => {
        document.getElementById('stereoWidthVal').textContent = (parseInt(e.target.value) * 10) + '%';
        updateLiveStereoWidth(e.target.value);
    });

    // Brightness - live update
    document.getElementById('brightness').addEventListener('input', (e) => {
        document.getElementById('brightnessVal').textContent = (parseInt(e.target.value) * 10) + '%';
        updateLiveBrightness(e.target.value);
    });

    // Glissando - live update
    const glissandoEl = document.getElementById('glissando');
    if (glissandoEl) {
        glissandoEl.addEventListener('input', (e) => {
            document.getElementById('glissandoVal').textContent = (parseInt(e.target.value) * 10) + '%';
            updateLiveGlissando(e.target.value);
        });
    }

    // Mixer volume controls - live update (disabled in arrangement mode)
    document.getElementById('volKick').addEventListener('input', (e) => {
        updateLiveVolume('kick', e.target.value);
    });
    document.getElementById('volSnare').addEventListener('input', (e) => {
        updateLiveVolume('snare', e.target.value);
    });
    document.getElementById('volBass').addEventListener('input', (e) => {
        updateLiveVolume('bass', e.target.value);
    });
    document.getElementById('volSub').addEventListener('input', (e) => {
        updateLiveVolume('sub', e.target.value);
    });
    document.getElementById('volSeq1').addEventListener('input', (e) => {
        updateLiveVolume('seq1', e.target.value);
    });
    document.getElementById('volSeq2').addEventListener('input', (e) => {
        updateLiveVolume('seq2', e.target.value);
    });
    document.getElementById('volLead').addEventListener('input', (e) => {
        updateLiveVolume('lead', e.target.value);
    });
    document.getElementById('volPad').addEventListener('input', (e) => {
        updateLiveVolume('pad', e.target.value);
    });

    // Arrangement controls
    document.getElementById('barCount').addEventListener('change', () => {
        const wasPlaying = isPlaying;
        if (wasPlaying) stop();
        regenerateArrangementData();
        if (wasPlaying) play();
    });

    document.getElementById('arrangementMode').addEventListener('change', (e) => {
        const grid = document.getElementById('arrangementGrid');
        const pos = document.querySelector('.arrangement-position');
        const isArr = e.target.value === 'arrangement';
        grid.style.display = isArr ? 'block' : 'none';
        pos.style.display = isArr ? 'flex' : 'none';
        updateMixerSlidersState();

        // If switching modes while playing, restart
        if (isPlaying) {
            stop();
            play();
        }
    });

    // Cell interaction from arrangement UI
    onCellInteraction((channel, beat, newValue) => {
        renderArrangement(arrangementData, currentBeat);
        // Apply immediately if playing this beat
        if (isPlaying && getCurrentBeat() === beat) {
            applyBeatVolumes(arrangementData, beat, getLiveRefs, toDb);
        }
    });
}

// Initialize
function init() {
    initVisualizer();
    initArrangementUI('arrangementGrid');
    setupEventListeners();

    // Apply initial vibe preset
    const initialMood = document.getElementById('mood').value;
    applyVibePreset(initialMood);

    currentPattern = generatePattern();
    regenerateArrangementData();
    updateMixerSlidersState();
    document.getElementById('status').textContent = scales[initialMood]?.name || 'Ready - Press Play';
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', init);
