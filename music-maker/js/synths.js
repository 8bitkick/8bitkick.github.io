let synths = [];
let effects = [];
let lfos = [];
let channelGains = {}; // Output gain nodes for automation
let masterBus = null;  // Master limiter and gain

let liveRefs = {
    synths: {},
    effects: {},
    lfos: {},
    channelGains: {} // Expose channel gains for automation
};

export function getLiveRefs() {
    return liveRefs;
}

export function disposeSynths(sequences) {
    sequences.forEach(seq => { if (seq) seq.dispose(); });
    synths.forEach(synth => { if (synth) synth.dispose(); });
    synths = [];
    effects.forEach(fx => { if (fx) fx.dispose(); });
    effects = [];
    lfos.forEach(lfo => { if (lfo) lfo.dispose(); });
    lfos = [];
    // Dispose channel gains
    Object.values(channelGains).forEach(gain => { if (gain) gain.dispose(); });
    channelGains = {};
    // Dispose master bus
    if (masterBus) {
        if (masterBus.compressor) masterBus.compressor.dispose();
        if (masterBus.limiter) masterBus.limiter.dispose();
        if (masterBus.gain) masterBus.gain.dispose();
        masterBus = null;
    }
    liveRefs = { synths: {}, effects: {}, lfos: {}, channelGains: {} };
    return [];
}

// Create a soft saturation curve for analog warmth
function createWarmSaturationCurve(amount = 0.3) {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const x = (i / samples) * 2 - 1;
        // Soft clipping with subtle harmonic distortion
        curve[i] = Math.tanh(x * (1 + amount)) / Math.tanh(1 + amount);
    }
    return curve;
}

// Create a tape-style saturation for warmth and compression
function createTapeSaturationCurve(drive = 0.4) {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const x = (i / samples) * 2 - 1;
        // Asymmetric soft clipping (like real tape)
        const k = drive * 2;
        if (x >= 0) {
            curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        } else {
            curve[i] = (1 + k * 0.8) * x / (1 + k * 0.8 * Math.abs(x));
        }
    }
    return curve;
}

export function createSynths(params) {
    const {
        space, stereoWidth, lfoRateVal, lfoDepthVal, brightness,
        // Note: vol* params are only used for non-arrangement mode initial channel gain
        volKick, volSnare, volBass, volSub, volSeq1, volSeq2, volLead, volPad,
        glissando = 0,
        arrangementMode = false  // If true, channel gains start at 1.0 for automation control
    } = params;

    const reverbDecay = 1.5 + space * 0.8;
    const lfoFreq = 0.02 * lfoRateVal;
    const leadFilterFreq = 2000 + brightness * 4000;

    // ============================================
    // CHANNEL OUTPUT GAIN NODES (for volume control)
    // These sit at the end of each channel's effect chain.
    // - In arrangement mode: automation controls these (0-1 = 0-100%)
    // - In non-arrangement mode: mixer sliders control these
    // Synth internal volumes are fixed for consistent timbre.
    // ============================================
    
    // Convert level (0-10) to linear gain for initial values
    const levelToGain = (level) => {
        if (level <= 0) return 0;
        return Math.pow(level / 10, 1.5);
    };
    
    // In arrangement mode, gains start at 0 (automation will set them before playback)
    // In non-arrangement mode, gains start based on mixer slider values
    const initGain = (vol) => arrangementMode ? 0 : levelToGain(vol);
    
    // ============================================
    // MASTER BUS: gain → compressor → limiter → destination
    // ============================================

    const masterLimiter = new Tone.Limiter(-1).toDestination();
    const masterCompressor = new Tone.Compressor({
        threshold: -12,
        ratio: 4,
        attack: 0.003,
        release: 0.15,
        knee: 6
    }).connect(masterLimiter);
    const masterGainNode = new Tone.Gain(0.7).connect(masterCompressor);

    masterBus = { limiter: masterLimiter, compressor: masterCompressor, gain: masterGainNode };
    
    // All channel gains route through master bus
    const kickGain = new Tone.Gain(initGain(volKick)).connect(masterGainNode);
    const snareGain = new Tone.Gain(initGain(volSnare)).connect(masterGainNode);
    const bassGain = new Tone.Gain(initGain(volBass)).connect(masterGainNode);
    const subGain = new Tone.Gain(initGain(volSub)).connect(masterGainNode);
    // Seq gains will connect to pingPong for effects first
    const seq1Gain = new Tone.Gain(initGain(volSeq1));
    const seq2Gain = new Tone.Gain(initGain(volSeq2));
    const leadGain = new Tone.Gain(initGain(volLead)).connect(masterGainNode);
    const padGain = new Tone.Gain(initGain(volPad)).connect(masterGainNode);

    channelGains = {
        kick: kickGain,
        snare: snareGain,
        bass: bassGain,
        sub: subGain,
        seq1: seq1Gain,
        seq2: seq2Gain,
        lead: leadGain,
        pad: padGain
    };

    // ============================================
    // MASTER EFFECTS CHAIN
    // ============================================
    
    // Master tape saturation for overall warmth (feeds into master bus)
    const masterSaturation = new Tone.WaveShaper(createTapeSaturationCurve(0.2));
    masterSaturation.connect(masterGainNode);
    
    const reverb = new Tone.Reverb({
        decay: reverbDecay,
        wet: 0.15 + space * 0.05
    }).connect(masterSaturation);

    const widener = new Tone.StereoWidener(stereoWidth).connect(reverb);

    // Ping pong delay feeds into seq channel gains
    const pingPong = new Tone.PingPongDelay({
        delayTime: '8n',
        feedback: 0.15 + space * 0.03,
        wet: 0.2
    }).connect(widener);

    // Sequencer auto-panners -> channel gains -> pingPong -> widener -> reverb -> master
    // Channel gains control the level going into the effects chain
    const autoPanSeq1 = new Tone.AutoPanner({
        frequency: lfoFreq * 1.5,
        depth: stereoWidth * 0.8
    }).connect(seq1Gain).start();
    seq1Gain.connect(pingPong);

    const autoPanSeq2 = new Tone.AutoPanner({
        frequency: lfoFreq * 0.7,
        depth: stereoWidth * 0.6
    }).connect(seq2Gain).start();
    seq2Gain.connect(pingPong);

    // Filter LFOs for sequencers
    const filterLFO1 = new Tone.LFO({
        frequency: lfoFreq,
        min: 800,
        max: 800 + lfoDepthVal * 5000
    }).start();

    const filterLFO2 = new Tone.LFO({
        frequency: lfoFreq * 0.6,
        min: 600,
        max: 600 + lfoDepthVal * 4000
    }).start();

    // ============================================
    // LEAD SYNTH - Warm analog mono with vibrato & drift
    // ============================================
    
    // Lead soft saturation for warmth -> channel gain
    const leadSaturation = new Tone.WaveShaper(createWarmSaturationCurve(0.4));
    leadSaturation.connect(leadGain);
    
    const leadChorus = new Tone.Chorus({
        frequency: 2.5,
        delayTime: 3.5,
        depth: 0.4,
        wet: 0.25,
        spread: 180
    }).connect(leadSaturation).start();

    const leadReverb = new Tone.Reverb({
        decay: 1.2,
        wet: 0.12
    }).connect(leadChorus);

    const leadFilter = new Tone.Filter({
        frequency: leadFilterFreq * 2.5,
        type: 'lowpass',
        rolloff: -24,  // Steeper rolloff like analog
        Q: 2.5
    }).connect(leadReverb);

    // Slow filter movement on lead
    const leadFilterLFO = new Tone.LFO({
        frequency: lfoFreq * 0.3,
        min: leadFilterFreq * 1.5,
        max: leadFilterFreq * 3.5
    }).start();
    leadFilterLFO.connect(leadFilter.frequency);

    const leadEQ = new Tone.EQ3({
        low: 0,
        mid: 2,
        high: 3,
        highFrequency: 3500
    }).connect(leadFilter);

    // Main lead oscillator - fat sawtooth with drift
    const leadSynth = new Tone.MonoSynth({
        oscillator: { 
            type: 'fatsawtooth', 
            count: 3, 
            spread: 25 
        },
        envelope: { 
            attack: 0.008, 
            decay: 0.3, 
            sustain: 0.55, 
            release: 1.0 
        },
        filterEnvelope: {
            attack: 0.001, 
            decay: 0.25, 
            sustain: 0.35, 
            release: 0.8,
            baseFrequency: 600, 
            octaves: 4
        }
    });
    leadSynth.portamento = 0;
    leadSynth.connect(leadEQ);

    // Slow vibrato with random-ish drift (like real analog)
    const leadVibrato = new Tone.LFO({
        frequency: 4.8,
        min: -10,
        max: 10,
        type: 'sine'
    }).start();
    leadVibrato.connect(leadSynth.detune);
    
    // Slow pitch drift for analog feel
    const leadDrift = new Tone.LFO({
        frequency: 0.15,
        min: -4,
        max: 4,
        type: 'sine',
        phase: Math.random() * 360
    }).start();
    leadDrift.connect(leadSynth.detune);

    // Sub oscillator (square wave, one octave down) for thickness
    const leadSub = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { 
            attack: 0.01, 
            decay: 0.25, 
            sustain: 0.5, 
            release: 0.8 
        }
    });
    leadSub.connect(leadEQ);
    leadSub.volume.value = -10;  // Sub oscillator well below main
    leadSynth.volume.value = -3;  // Headroom for master bus

    // ============================================
    // SEQUENCER 1 - Bright arpeggiated pulse
    // ============================================
    
    const seq1Saturation = new Tone.WaveShaper(createWarmSaturationCurve(0.25));
    seq1Saturation.connect(autoPanSeq1);
    
    const seq1Filter = new Tone.Filter({
        frequency: leadFilterFreq * 1.5,
        type: 'lowpass',
        rolloff: -12,
        Q: 1.5
    }).connect(seq1Saturation);
    filterLFO1.connect(seq1Filter.frequency);
    
    const seq1Synth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { 
            attack: 0.002, 
            decay: 0.12, 
            sustain: 0.25, 
            release: 0.25 
        }
    });
    seq1Synth.connect(seq1Filter);
    seq1Synth.volume.value = -3;  // Headroom for master bus

    // ============================================
    // SEQUENCER 2 - Warm pulse with PWM
    // ============================================
    
    const seq2Saturation = new Tone.WaveShaper(createWarmSaturationCurve(0.3));
    seq2Saturation.connect(autoPanSeq2);
    
    const seq2Filter = new Tone.Filter({
        frequency: 2800,
        type: 'lowpass',
        rolloff: -12,
        Q: 1.2
    }).connect(seq2Saturation);
    filterLFO2.connect(seq2Filter.frequency);
    
    const seq2Synth = new Tone.Synth({
        oscillator: { type: 'pulse', width: 0.35 },
        envelope: { 
            attack: 0.015, 
            decay: 0.18, 
            sustain: 0.18, 
            release: 0.35 
        }
    });
    seq2Synth.connect(seq2Filter);
    seq2Synth.volume.value = -3;  // Headroom for master bus

    // PWM LFO for seq2
    const seq2PwmLFO = new Tone.LFO({
        frequency: lfoFreq * 0.8,
        min: 0.2,
        max: 0.5
    }).start();
    seq2PwmLFO.connect(seq2Synth.oscillator.width);

    // ============================================
    // PAD - Rich analog string ensemble
    // ============================================
    
    // Pad effects chain - ensemble chorus for classic string machine sound -> channel gain
    const padSaturation = new Tone.WaveShaper(createTapeSaturationCurve(0.35));
    padSaturation.connect(padGain);
    
    // Ensemble chorus (like Solina/Juno)
    const padChorus = new Tone.Chorus({
        frequency: 0.6,
        delayTime: 3.5,
        depth: 0.7,
        wet: 0.45,
        spread: 180
    }).connect(padSaturation).start();

    // Second chorus for richer ensemble
    const padChorus2 = new Tone.Chorus({
        frequency: 1.2,
        delayTime: 2.0,
        depth: 0.5,
        wet: 0.3,
        spread: 120
    }).connect(padChorus).start();

    // Mid scoop and air boost for the pad — keeps it spacious, not dominant
    const padEQ = new Tone.EQ3({
        low: -2,
        mid: -6,     // Cut mids so pad doesn't compete with lead/bass
        high: 3,     // Boost highs for air and shimmer
        lowFrequency: 250,
        highFrequency: 4000
    }).connect(padChorus2);

    const padHighPass = new Tone.Filter({
        frequency: 180,
        type: 'highpass',
        rolloff: -12
    }).connect(padEQ);

    const padFilter = new Tone.Filter({
        frequency: 3500,
        type: 'lowpass',
        rolloff: -24,  // Steeper for warmer sound
        Q: 0.8
    }).connect(padHighPass);

    // Slow filter sweep for movement
    const padFilterLFO = new Tone.LFO({
        frequency: lfoFreq * 0.25,
        min: 2000,
        max: 2000 + lfoDepthVal * 2500
    }).start();
    padFilterLFO.connect(padFilter.frequency);

    // PAD LAYER 1 - Detuned saw with drift
    const padPanner = new Tone.Panner(0).connect(padFilter);
    const padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { 
            attack: 0.2, 
            decay: 0.4, 
            sustain: 0.75, 
            release: 2.0 
        }
    });
    padSynth.set({ detune: -8 + Math.random() * 4 }); // Random drift
    padSynth.connect(padPanner);

    // PAD LAYER 2 - Detuned saw (opposite direction)
    const padPanner2 = new Tone.Panner(0).connect(padFilter);
    const padSynth2 = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { 
            attack: 0.3, 
            decay: 0.5, 
            sustain: 0.7, 
            release: 2.2 
        }
    });
    padSynth2.set({ detune: 8 + Math.random() * 4 });
    padSynth2.connect(padPanner2);

    // PAD LAYER 3 - PWM pulse for richness
    const padPanner3 = new Tone.Panner(0).connect(padFilter);
    const padSynth3 = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'pulse', width: 0.35 },
        envelope: { 
            attack: 0.35, 
            decay: 0.4, 
            sustain: 0.6, 
            release: 2.0 
        }
    });
    padSynth3.connect(padPanner3);

    // PWM modulation for pad pulse layer
    const padPwmLFO = new Tone.LFO({
        frequency: lfoFreq * 0.4,
        min: 0.2,
        max: 0.5
    }).start();

    // Stereo movement LFOs
    const padLFO = new Tone.LFO({
        frequency: lfoFreq * 0.25,
        min: -stereoWidth * 0.35,
        max: stereoWidth * 0.35
    }).start();
    padLFO.connect(padPanner.pan);

    const padLFO2 = new Tone.LFO({
        frequency: lfoFreq * 0.2,
        min: stereoWidth * 0.35,
        max: -stereoWidth * 0.35,
        phase: 180
    }).start();
    padLFO2.connect(padPanner2.pan);

    const padLFO3 = new Tone.LFO({
        frequency: lfoFreq * 0.3,
        min: -stereoWidth * 0.25,
        max: stereoWidth * 0.25,
        phase: 90
    }).start();
    padLFO3.connect(padPanner3.pan);

    // Subtle pitch drift for analog feel on each pad layer
    const padDrift1 = new Tone.LFO({
        frequency: 0.08,
        min: -6,
        max: 6,
        phase: Math.random() * 360
    }).start();
    
    const padDrift2 = new Tone.LFO({
        frequency: 0.1,
        min: -6,
        max: 6,
        phase: Math.random() * 360
    }).start();

    padSynth.volume.value = -9;   // Pad sits back in the mix
    padSynth2.volume.value = -11;
    padSynth3.volume.value = -14;

    // ============================================
    // BASS - Warm analog bass with movement
    // ============================================
    
    const bassSaturation = new Tone.WaveShaper(createWarmSaturationCurve(0.5));
    bassSaturation.connect(bassGain);
    
    const bassFilter = new Tone.Filter({
        frequency: 800,
        type: 'lowpass',
        rolloff: -24,
        Q: 2
    }).connect(bassSaturation);

    const bassSynth = new Tone.MonoSynth({
        oscillator: { 
            type: 'fatsawtooth', 
            count: 2, 
            spread: 15 
        },
        envelope: { 
            attack: 0.002, 
            decay: 0.35, 
            sustain: 0.18, 
            release: 0.15 
        },
        filterEnvelope: {
            attack: 0.001, 
            decay: 0.2, 
            sustain: 0.1, 
            release: 0.12,
            baseFrequency: 250, 
            octaves: 4
        }
    });
    bassSynth.connect(bassFilter);
    bassSynth.volume.value = -3;  // Headroom for master bus

    // Sub bass - pure sine for low end weight -> channel gain
    const subBass = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { 
            attack: 0.008, 
            decay: 0.1, 
            sustain: 0.55, 
            release: 0.25 
        }
    });
    subBass.connect(subGain);
    subBass.volume.value = -3;  // Headroom for master bus

    // ============================================
    // DRUMS - Punchy with subtle saturation
    // ============================================
    
    const kickSaturation = new Tone.WaveShaper(createWarmSaturationCurve(0.3));
    kickSaturation.connect(kickGain);
    
    const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 7,
        oscillator: { type: 'sine' },
        envelope: { 
            attack: 0.001, 
            decay: 0.4, 
            sustain: 0, 
            release: 0.4 
        }
    });
    kick.connect(kickSaturation);
    kick.volume.value = -3;  // Headroom for master bus

    const snareFilter = new Tone.Filter({ 
        frequency: 4500, 
        type: 'highpass' 
    }).connect(snareGain);

    const snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { 
            attack: 0.001, 
            decay: 0.2, 
            sustain: 0, 
            release: 0.15 
        }
    });
    snare.connect(snareFilter);
    snare.volume.value = -3;  // Headroom for master bus

    const snareBody = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { 
            attack: 0.001, 
            decay: 0.15, 
            sustain: 0, 
            release: 0.1 
        }
    });
    snareBody.connect(snareGain);
    snareBody.volume.value = -6;  // Fixed: body 6dB below noise

    // ============================================
    // COLLECT REFERENCES
    // ============================================

    synths = [
        seq1Synth, seq2Synth, 
        padSynth, padSynth2, padSynth3, 
        bassSynth, subBass, 
        kick, snare, snareBody, 
        leadSynth, leadSub
    ];
    
    effects = [
        reverb, widener, pingPong, masterSaturation,
        autoPanSeq1, autoPanSeq2, seq1Filter, seq2Filter, seq1Saturation, seq2Saturation,
        padFilter, padPanner, padPanner2, padPanner3, padChorus, padChorus2, padHighPass, padEQ, padSaturation,
        leadFilter, leadChorus, leadReverb, leadSaturation, leadEQ,
        bassFilter, bassSaturation,
        snareFilter, kickSaturation,
        kickGain, snareGain, bassGain, subGain, seq1Gain, seq2Gain, leadGain, padGain
    ];
    
    lfos = [
        filterLFO1, filterLFO2, 
        padLFO, padLFO2, padLFO3, padFilterLFO, padPwmLFO, padDrift1, padDrift2,
        leadVibrato, leadDrift, leadFilterLFO,
        seq2PwmLFO
    ];

    liveRefs = {
        synths: {
            kick, snare, snareBody, bassSynth, subBass,
            seq1Synth, seq2Synth, leadSynth, leadSub, 
            padSynth, padSynth2, padSynth3
        },
        effects: {
            reverb, widener, pingPong, masterSaturation,
            autoPanSeq1, autoPanSeq2,
            seq1Filter, seq2Filter, seq1Saturation, seq2Saturation,
            leadFilter, leadEQ, leadSaturation, leadChorus, leadReverb,
            padFilter, padChorus, padChorus2, padHighPass, padSaturation,
            bassFilter, bassSaturation
        },
        lfos: {
            filterLFO1, filterLFO2, 
            padLFO, padLFO2, padLFO3, padFilterLFO, padPwmLFO,
            leadVibrato, leadDrift, leadFilterLFO,
            seq2PwmLFO
        },
        channelGains: {
            kick: kickGain,
            snare: snareGain,
            bass: bassGain,
            sub: subGain,
            seq1: seq1Gain,
            seq2: seq2Gain,
            lead: leadGain,
            pad: padGain
        },
        glissando
    };

    return { 
        seq1Synth, seq2Synth, 
        padSynth, padSynth2, padSynth3, 
        bassSynth, subBass, 
        kick, snare, snareBody, 
        leadSynth, leadSub 
    };
}
