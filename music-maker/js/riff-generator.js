// Melodic patterns using chord tone indices: 0=root, 1=3rd, 2=5th, 3=7th (from actual chord)
// These pick notes directly from the chord, guaranteeing harmonic fit
const chordTonePatterns = [
    // Strong patterns - emphasize root and 5th
    [0, 1, 2, 1, 0, 1, 2, 1],           // Classic arpeggio
    [0, 0, 1, 2, 2, 1, 0, 0],           // Root emphasis with climb
    [2, 1, 0, 0, 1, 2, 1, 0],           // Descending from 5th
    [0, 2, 1, 0, 0, 2, 1, 0],           // Root-5th-3rd (strong)
    [0, 1, 0, 2, 0, 1, 2, 1],           // Pedal tone on root
    [0, 2, 0, 1, 0, 2, 0, 1],           // Alternating root with chord tones
];

// Rhythms aligned with 8th note grid (bass plays on 1, 3, 5, 7)
const simpleRhythms = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],  // Steady 8ths
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Quarter notes
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],  // Syncopated
    [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],  // Punchy
    [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],  // Driving
];

// Get a chord tone, with octave transposition for melodic range
function getChordTone(chord, index, octaveUp = 0) {
    if (!chord || chord.length === 0) return null;
    const note = chord[index % chord.length];
    if (octaveUp === 0) return note;
    return Tone.Frequency(note).transpose(12 * octaveUp).toNote();
}

export function generateLeadRiff(scale, padProgression, highScale) {
    if (!padProgression || padProgression.length === 0) {
        return [];
    }

    // Pick ONE pattern and ONE rhythm for the whole riff (consistency)
    const patternIdx = Math.floor(Math.random() * chordTonePatterns.length);
    const rhythmIdx = Math.floor(Math.random() * simpleRhythms.length);
    const pattern = chordTonePatterns[patternIdx];
    const rhythm = simpleRhythms[rhythmIdx];
    
    const riff = [];
    const stepsPerChord = 16; // 16 sixteenth notes = 1 bar per chord (since pads are half notes, 2 chords per bar)
    
    // Actually each chord in padProgression is a half note, so 8 sixteenths per chord
    const stepsPerHalfNote = 8;

    for (const chord of padProgression) {
        // Transpose chord up an octave for lead register
        const leadChord = chord.map(note => Tone.Frequency(note).transpose(12).toNote());
        
        let noteIdx = 0;
        for (let step = 0; step < stepsPerHalfNote; step++) {
            // Use first half of rhythm pattern for each half-note chord
            if (rhythm[step]) {
                const chordToneIdx = pattern[noteIdx % pattern.length];
                const note = getChordTone(leadChord, chordToneIdx);
                riff.push(note);
                noteIdx++;
            } else {
                riff.push(null);
            }
        }
    }

    return riff;
}

// Keep generateMotif for backwards compatibility
export function generateMotif(scale, length = 8) {
    const pattern = chordTonePatterns[Math.floor(Math.random() * chordTonePatterns.length)];
    return pattern.slice(0, length).map((idx, i) => scale[Math.min(idx * 2, scale.length - 1)]);
}
