import { scales } from './scales.js';
import { generateLeadRiff } from './riff-generator.js';

let livePatterns = {
    seq1: [],
    seq2: [],
    lead: []
};

export function getLivePatterns() {
    return livePatterns;
}

export function setLivePatterns(patterns) {
    if (patterns.seq1) livePatterns.seq1 = patterns.seq1;
    if (patterns.seq2) livePatterns.seq2 = patterns.seq2;
    if (patterns.lead) livePatterns.lead = patterns.lead;
}

function stepsToNextNote(pattern, fromIndex) {
    const len = pattern.length;
    for (let i = 1; i <= 16; i++) {
        if (pattern[(fromIndex + i) % len] !== null) return i;
    }
    return 16;
}

// Generate arp pattern from chord notes
function arpFromChord(chord, pattern, stepsPerChord) {
    if (!chord || chord.length === 0) return new Array(stepsPerChord).fill(null);
    
    // Sort chord notes low to high
    const sorted = [...chord].sort((a, b) => 
        Tone.Frequency(a).toFrequency() - Tone.Frequency(b).toFrequency()
    );
    
    let sequence = [];
    switch (pattern) {
        case 'up':
            sequence = sorted;
            break;
        case 'down':
            sequence = [...sorted].reverse();
            break;
        case 'updown':
            sequence = [...sorted, ...sorted.slice(1, -1).reverse()];
            break;
        case 'downup':
            const rev = [...sorted].reverse();
            sequence = [...rev, ...rev.slice(1, -1).reverse()];
            break;
        case 'converge':
            for (let i = 0; i < sorted.length; i++) {
                if (i % 2 === 0) sequence.push(sorted[Math.floor(i / 2)]);
                else sequence.push(sorted[sorted.length - 1 - Math.floor(i / 2)]);
            }
            break;
        case 'random':
        default:
            sequence = sorted;
            break;
    }
    
    // Fill steps for this chord
    const result = [];
    for (let i = 0; i < stepsPerChord; i++) {
        result.push(sequence[i % sequence.length]);
    }
    return result;
}

// Transpose chord up an octave for high arp
function transposeChordUp(chord) {
    return chord.map(note => {
        return Tone.Frequency(note).transpose(12).toNote();
    });
}

export function createSequences(pattern, instruments, density, arpPattern = 'up') {
    const { seq1Synth, seq2Synth, padSynth, padSynth2, padSynth3, bassSynth, subBass, kick, snare, snareBody, leadSynth, leadSub } = instruments;
    const scaleSet = scales[pattern.mood];

    if (!scaleSet) {
        console.error('createSequences: invalid mood', pattern.mood);
        return [];
    }

    // === THE CHORD PROGRESSION IS THE FOUNDATION ===
    // Pads play half notes, so 8 chords = 8 half notes = 4 bars
    // Each chord lasts 8 sixteenth notes (half note)
    const chordProgression = pattern.padPattern;
    const stepsPerChord = 8; // 16th notes per half-note chord
    
    // === SEQ1: Arp through chord tones (16th notes) ===
    const seq1Notes = [];
    for (const chord of chordProgression) {
        const chordArp = arpFromChord(chord, arpPattern, stepsPerChord);
        // Add some rests based on density
        for (let i = 0; i < chordArp.length; i++) {
            if (Math.random() > 0.4 + density * 0.12) {
                seq1Notes.push(null);
            } else {
                seq1Notes.push(chordArp[i]);
            }
        }
    }
    livePatterns.seq1 = seq1Notes;

    // === SEQ2: Higher octave arp (8th notes = half the steps) ===
    const seq2Notes = [];
    for (const chord of chordProgression) {
        const highChord = transposeChordUp(chord);
        const chordArp = arpFromChord(highChord, arpPattern, stepsPerChord / 2);
        for (let i = 0; i < chordArp.length; i++) {
            if (Math.random() > 0.3 + density * 0.14) {
                seq2Notes.push(null);
            } else {
                seq2Notes.push(chordArp[i]);
            }
        }
    }
    livePatterns.seq2 = seq2Notes;

    // === LEAD: Melodic pattern following chords ===
    livePatterns.lead = generateLeadRiff(scaleSet.notes, chordProgression, scaleSet.notesHigh);
    if (!livePatterns.lead || livePatterns.lead.length === 0) {
        livePatterns.lead = [scaleSet.notes[0], null, scaleSet.notes[2], null];
    }

    // === SEQUENCES ===
    let seq1Index = 0;
    const seq1Seq = new Tone.Sequence((time) => {
        const currentNote = livePatterns.seq1[seq1Index % livePatterns.seq1.length];
        if (currentNote) seq1Synth.triggerAttackRelease(currentNote, '16n', time);
        seq1Index++;
    }, livePatterns.seq1, '16n');

    let seq2Index = 0;
    const seq2Seq = new Tone.Sequence((time) => {
        const currentNote = livePatterns.seq2[seq2Index % livePatterns.seq2.length];
        if (currentNote) seq2Synth.triggerAttackRelease(currentNote, '8n', time);
        seq2Index++;
    }, livePatterns.seq2, '8n');

    const leadTriggers = new Array(livePatterns.lead.length || 64).fill(1);
    let leadIndex = 0;

    const leadSeq = new Tone.Sequence((time) => {
        if (livePatterns.lead.length === 0) return;
        const idx = leadIndex % livePatterns.lead.length;
        const currentNote = livePatterns.lead[idx];
        
        if (currentNote) {
            const gap = stepsToNextNote(livePatterns.lead, idx);
            const length = gap <= 2 ? '8n' : gap <= 4 ? '4n' : '2n';
            
            leadSynth.triggerAttackRelease(currentNote, length, time);
            
            if (leadSub) {
                const subNote = Tone.Frequency(currentNote).transpose(-12).toNote();
                leadSub.triggerAttackRelease(subNote, length, time);
            }
        }
        leadIndex++;
    }, leadTriggers, '16n');

    const padSeq = new Tone.Sequence((time, chord) => {
        if (chord) {
            padSynth.triggerAttackRelease(chord, '2n', time);
            padSynth2.triggerAttackRelease(chord, '2n', time);
            if (padSynth3) padSynth3.triggerAttackRelease(chord, '2n', time);
        }
    }, pattern.padPattern, '2n');

    // Generate bass pattern from chord roots - simple rhythm, follows chords
    const bassPat = [];
    for (const chord of pattern.padPattern) {
        const root = chord[0];
        const pitchClass = root.replace(/[0-9]/g, '');
        const bassRoot = pitchClass + '1';
        const bassOctave = pitchClass + '2';
        // Simple pattern: root, root, octave, root (per half-note chord)
        bassPat.push(bassRoot, bassRoot, bassOctave, bassRoot);
    }
    
    let bassIndex = 0;
    const bassSeq = new Tone.Sequence((time) => {
        const note = bassPat[bassIndex % bassPat.length];
        if (note) {
            bassSynth.triggerAttackRelease(note, '8n', time);
            subBass.triggerAttackRelease(note, '2n', time);
        }
        bassIndex++;
    }, bassPat, '8n');

    const kickPattern = [];
    for (let i = 0; i < 16; i++) {
        kickPattern.push(i % 4 === 0 || (density > 3 && i === 10));
    }
    const kickSeq = new Tone.Sequence((time, trigger) => {
        if (trigger) kick.triggerAttackRelease('C1', '8n', time);
    }, kickPattern, '16n');

    const snarePattern = [];
    for (let i = 0; i < 16; i++) {
        snarePattern.push(i === 4 || i === 12);
    }
    const snareSeq = new Tone.Sequence((time, trigger) => {
        if (trigger) {
            snare.triggerAttackRelease('16n', time);
            snareBody.triggerAttackRelease('A2', '16n', time);
        }
    }, snarePattern, '16n');

    return [seq1Seq, seq2Seq, padSeq, bassSeq, kickSeq, snareSeq, leadSeq];
}

export function regenerateLeadRiff(mood, padPattern) {
    const scaleSet = scales[mood];
    const progression = padPattern || scaleSet.pad;
    livePatterns.lead = generateLeadRiff(scaleSet.notes, progression, scaleSet.notesHigh);
    return livePatterns.lead;
}
