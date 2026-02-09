import { scales } from './scales.js';
import { generateLeadRiff } from './riff-generator.js';

export async function downloadWAV(currentPattern, getParams, arrangementData = null) {
    const params = getParams();
    const { duration, tempo, space, stereoWidth, lfoRateVal, lfoDepthVal, brightness, density,
            volKick, volSnare, volBass, volSub, volSeq1, volSeq2, volLead, volPad } = params;

    // If arrangement data provided, compute render duration from bars + BPM
    const renderDuration = arrangementData
        ? Math.ceil(arrangementData.totalBars * 240 / tempo) + 2 // +2s for reverb tail
        : duration;

    const status = document.getElementById('status');
    status.textContent = 'Rendering audio... Please wait';

    await Tone.start();

    const scaleSet = scales[currentPattern.mood];

    const buffer = await Tone.Offline(({ transport }) => {
        transport.bpm.value = tempo;

        const reverbDecay = 2 + space * 1.5;
        const lfoFreq = 0.02 * lfoRateVal;
        const leadFilterFreq = 1000 + brightness * 2500;
        const padAttack = 2.0;

        // In arrangement mode, synths use fixed levels and channel gains control output
        // In non-arrangement mode, channel gains are set from mixer slider values
        const levelToGain = (level) => level <= 0 ? 0 : Math.pow(level / 10, 1.5);
        const isArrangementExport = !!arrangementData;

        // Master bus: gain → compressor → limiter → destination
        const masterLimiter = new Tone.Limiter(-1).toDestination();
        const masterCompressor = new Tone.Compressor({
            threshold: -12, ratio: 4, attack: 0.003, release: 0.15, knee: 6
        }).connect(masterLimiter);
        const masterGainNode = new Tone.Gain(0.7).connect(masterCompressor);

        const reverb = new Tone.Reverb({ decay: reverbDecay, wet: 0.25 + space * 0.1 }).connect(masterGainNode);
        const widener = new Tone.StereoWidener(stereoWidth).connect(reverb);
        const pingPong = new Tone.PingPongDelay({ delayTime: '8n', feedback: 0.25 + space * 0.05, wet: 0.3 }).connect(widener);

        // Channel gains route through master bus
        const kickGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volKick)).connect(masterGainNode);
        const snareGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volSnare)).connect(masterGainNode);
        const bassGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volBass)).connect(masterGainNode);
        const subGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volSub)).connect(masterGainNode);
        const seq1Gain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volSeq1)).connect(pingPong);
        const seq2Gain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volSeq2)).connect(pingPong);
        const leadGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volLead)).connect(pingPong);
        const padGain = new Tone.Gain(isArrangementExport ? 1 : levelToGain(volPad)).connect(reverb);

        const autoPanSeq1 = new Tone.AutoPanner({ frequency: lfoFreq * 1.5, depth: stereoWidth * 0.8 }).connect(seq1Gain).start();
        const autoPanSeq2 = new Tone.AutoPanner({ frequency: lfoFreq * 0.7, depth: stereoWidth * 0.6 }).connect(seq2Gain).start();

        const filterLFO1 = new Tone.LFO({ frequency: lfoFreq, min: 400, max: 400 + lfoDepthVal * 3000 }).start();
        const filterLFO2 = new Tone.LFO({ frequency: lfoFreq * 0.6, min: 300, max: 300 + lfoDepthVal * 2000 }).start();

        // Synths use fixed base levels (channel gains control actual output)
        const leadSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.8 }
        });
        const leadFilter = new Tone.Filter({ frequency: leadFilterFreq * 2, type: 'lowpass', rolloff: -12, Q: 4 }).connect(leadGain);
        leadSynth.connect(leadFilter);
        leadSynth.volume.value = -3;

        const seq1Synth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.001, decay: 0.12, sustain: 0.25, release: 0.25 }
        });
        const seq1Filter = new Tone.Filter({ frequency: leadFilterFreq, type: 'lowpass', rolloff: -24 }).connect(autoPanSeq1);
        filterLFO1.connect(seq1Filter.frequency);
        seq1Synth.connect(seq1Filter);
        seq1Synth.volume.value = -3;

        const seq2Synth = new Tone.Synth({
            oscillator: { type: 'pulse', width: 0.3 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 }
        });
        const seq2Filter = new Tone.Filter({ frequency: 1500, type: 'lowpass', rolloff: -12 }).connect(autoPanSeq2);
        filterLFO2.connect(seq2Filter.frequency);
        seq2Synth.connect(seq2Filter);
        seq2Synth.volume.value = -3;

        // Pad EQ: cut mids, add air
        const padEQ = new Tone.EQ3({ low: -2, mid: -6, high: 3, lowFrequency: 250, highFrequency: 4000 }).connect(padGain);
        const padPanner = new Tone.Panner(0).connect(padEQ);
        const padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: padAttack, decay: 1.0, sustain: 0.8, release: 3.0 }
        });
        const padPanner2 = new Tone.Panner(0).connect(padEQ);
        const padSynth2 = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: padAttack + 0.2, decay: 1.5, sustain: 0.7, release: 4.0 }
        });

        const padLFO = new Tone.LFO({ frequency: lfoFreq * 0.3, min: -stereoWidth, max: stereoWidth }).start();
        padLFO.connect(padPanner.pan);
        const padLFO2 = new Tone.LFO({ frequency: lfoFreq * 0.2, min: stereoWidth, max: -stereoWidth }).start();
        padLFO2.connect(padPanner2.pan);

        const padFilter = new Tone.Filter({ frequency: 800, type: 'lowpass' });
        const padFilterLFO = new Tone.LFO({ frequency: lfoFreq * 0.5, min: 500, max: 500 + lfoDepthVal * 1500 }).start();
        padFilterLFO.connect(padFilter.frequency);
        padSynth.connect(padFilter);
        padFilter.connect(padPanner);
        padSynth2.connect(padPanner2);
        padSynth.volume.value = -9;   // Pad sits back in the mix
        padSynth2.volume.value = -11;

        const bassSynth = new Tone.MonoSynth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.3 },
            filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.3, baseFrequency: 150, octaves: 2.5 }
        });
        bassSynth.connect(bassGain);
        bassSynth.volume.value = -3;

        const subBass = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.4 }
        });
        subBass.connect(subGain);
        subBass.volume.value = -3;

        const kick = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 7,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 }
        });
        kick.connect(kickGain);
        kick.volume.value = -3;

        const snare = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 }
        });
        const snareFilter = new Tone.Filter({ frequency: 5000, type: 'highpass' }).connect(snareGain);
        snare.connect(snareFilter);
        snare.volume.value = -3;

        const snareBody = new Tone.MembraneSynth({
            pitchDecay: 0.01, octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        });
        snareBody.connect(snareGain);
        snareBody.volume.value = -9;

        const leadPattern = generateLeadRiff(scaleSet.notes, currentPattern.padPattern, scaleSet.notesHigh);
        let leadIdx = 0;
        function exportNextNote(pattern, fromIdx) {
            for (let i = 1; i <= 16; i++) {
                if (pattern[(fromIdx + i) % pattern.length] !== null) return i;
            }
            return 16;
        }
        function exportDuration(gap) {
            if (gap <= 2) return '8n';
            if (gap <= 4) return '4n';
            if (gap <= 6) return '4n.';
            if (gap <= 8) return '2n';
            return '1n';
        }
        new Tone.Sequence((time) => {
            const idx = leadIdx % leadPattern.length;
            const note = leadPattern[idx];
            if (note) {
                const gap = exportNextNote(leadPattern, idx);
                leadSynth.triggerAttackRelease(note, exportDuration(gap), time);
            }
            leadIdx++;
        }, new Array(leadPattern.length || 128).fill(1), '16n').start(0);

        new Tone.Sequence((time, note) => {
            if (note) seq1Synth.triggerAttackRelease(note, '16n', time);
        }, currentPattern.seq1Pattern, '16n').start(0);

        new Tone.Sequence((time, note) => {
            if (note) seq2Synth.triggerAttackRelease(note, '8n', time);
        }, currentPattern.seq2Pattern, '8n').start(0);

        new Tone.Sequence((time, chord) => {
            if (chord) {
                padSynth.triggerAttackRelease(chord, '2n', time);
                padSynth2.triggerAttackRelease(chord, '2n', time);
            }
        }, currentPattern.padPattern, '2n').start(0);

        let bassIdx = 0;
        new Tone.Sequence((time) => {
            const note = currentPattern.bassPattern[bassIdx % currentPattern.bassPattern.length];
            if (note) {
                bassSynth.triggerAttackRelease(note, '8n', time);
                subBass.triggerAttackRelease(note, '4n', time);
            }
            bassIdx++;
        }, currentPattern.bassPattern, '8n').start(0);

        const kickPattern = [];
        for (let i = 0; i < 16; i++) {
            kickPattern.push(i % 4 === 0 || (density > 3 && i === 10));
        }
        new Tone.Sequence((time, trigger) => {
            if (trigger) kick.triggerAttackRelease('C1', '8n', time);
        }, kickPattern, '16n').start(0);

        const snarePattern = [];
        for (let i = 0; i < 16; i++) {
            snarePattern.push(i === 4 || i === 12);
        }
        new Tone.Sequence((time, trigger) => {
            if (trigger) {
                snare.triggerAttackRelease('16n', time);
                snareBody.triggerAttackRelease('A2', '16n', time);
            }
        }, snarePattern, '16n').start(0);

        // Arrangement volume automation for offline render (uses channel gains)
        if (arrangementData) {
            const ch = arrangementData.channels;
            const totalBeats = arrangementData.totalBeats;
            
            // Helper to get interpolated level
            const getLevel = (channel, beat) => {
                const beatFloor = Math.floor(beat);
                const beatCeil = Math.min(beatFloor + 1, totalBeats - 1);
                const t = beat - beatFloor;
                const v1 = ch[channel][beatFloor] ?? 0;
                const v2 = ch[channel][beatCeil] ?? 0;
                return v1 + (v2 - v1) * t;
            };
            
            // Convert level (0-10) to linear gain (0-1)
            const levelToGain = (level) => {
                if (level <= 0) return 0;
                return Math.pow(level / 10, 1.5);
            };

            // Apply volumes to channel gain nodes with smooth interpolation
            const applyVolumes = (exactBeat) => {
                const ramp = 0.1;
                kickGain.gain.rampTo(levelToGain(getLevel('kick', exactBeat)), ramp);
                snareGain.gain.rampTo(levelToGain(getLevel('snare', exactBeat)), ramp);
                bassGain.gain.rampTo(levelToGain(getLevel('bass', exactBeat)), ramp);
                subGain.gain.rampTo(levelToGain(getLevel('sub', exactBeat)), ramp);
                seq1Gain.gain.rampTo(levelToGain(getLevel('seq1', exactBeat)), ramp);
                seq2Gain.gain.rampTo(levelToGain(getLevel('seq2', exactBeat)), ramp);
                leadGain.gain.rampTo(levelToGain(getLevel('lead', exactBeat)), ramp);
                padGain.gain.rampTo(levelToGain(getLevel('pad', exactBeat)), ramp);
            };

            applyVolumes(0);
            
            // Update every 8th note for smooth interpolation
            let eighthCounter = 0;
            transport.scheduleRepeat(() => {
                eighthCounter++;
                const exactBeat = eighthCounter / 2; // 2 eighths per beat
                if (exactBeat < totalBeats) {
                    applyVolumes(exactBeat);
                }
            }, '8n', '8n');
        }

        transport.start();
    }, renderDuration);

    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `synth-vibe-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Download complete!';
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const samples = buffer.length;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < samples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = channelData[ch][i];
            sample = Math.max(-1, Math.min(1, sample));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }
    return arrayBuffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
