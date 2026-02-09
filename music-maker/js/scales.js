// Curated synth vibes — 80s-inspired chord progressions, bass lines, and scale palettes
// Each vibe: extended chords (7ths, add9, sus), 8-chord progressions, 16-step bass patterns
// Plus preset settings for tempo, mixer, effects

export const scales = {
    // ═══════════════════════════════════════════
    // SYNTHWAVE
    // ═══════════════════════════════════════════

    midnight: {
        name: 'Midnight Drive (F#m)',
        // Preset settings - Classic synthwave, balanced
        tempo: 98,
        density: 3,
        space: 3,
        brightness: 6,
        mixer: { kick: 6, snare: 5, bass: 6, sub: 5, seq1: 5, seq2: 4, lead: 6, pad: 3 },
        // i - VI - III - VII — the classic synthwave progression
        notes: ['F#3', 'A3', 'B3', 'C#4', 'E4', 'F#4', 'A4', 'B4', 'C#5', 'E5'],
        notesHigh: ['C#4', 'E4', 'F#4', 'A4', 'B4', 'C#5', 'E5', 'F#5', 'A5', 'C#6'],
        pad: [
            ['F#2', 'C#3', 'E3', 'A3'],   // F#m7
            ['F#2', 'C#3', 'E3', 'A3'],   // F#m7
            ['D2', 'A2', 'D3', 'F#3'],    // Dmaj
            ['D2', 'A2', 'D3', 'F#3'],    // Dmaj
            ['A2', 'E3', 'A3', 'C#4'],    // Amaj
            ['A2', 'E3', 'A3', 'C#4'],    // Amaj
            ['E2', 'B2', 'E3', 'G#3'],    // Emaj
            ['E2', 'B2', 'E3', 'G#3']     // Emaj
        ],
        bass: [
            'F#1', null, 'F#2', null, 'C#2', null, 'F#1', null,
            'D1', null, 'D2', null, 'A1', 'E2', 'E1', null
        ]
    },

    neon: {
        name: 'Neon Tears (Am)',
        // Slow, emotional - NO DRUMS, lead-focused ballad
        tempo: 72,
        density: 1,
        space: 5,
        brightness: 4,
        mixer: { kick: 0, snare: 0, bass: 4, sub: 7, seq1: 2, seq2: 0, lead: 8, pad: 5 },
        // i - iv - v - VI — dark emotional
        notes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
        notesHigh: ['E4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'],
        pad: [
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['D2', 'A2', 'D3', 'F3'],     // Dm
            ['D2', 'A2', 'D3', 'F3'],     // Dm
            ['E2', 'B2', 'E3', 'G3'],     // Em
            ['E2', 'B2', 'E3', 'G3'],     // Em
            ['F2', 'C3', 'F3', 'A3'],     // Fmaj
            ['F2', 'C3', 'F3', 'A3']      // Fmaj
        ],
        bass: [
            'A1', null, 'A2', null, 'E2', null, 'A1', 'E1',
            'D1', null, 'D2', 'A1', 'F1', null, 'F2', null
        ]
    },

    chrome: {
        name: 'Chrome Horizon (Cm)',
        // Driving arps, NO LEAD - pure sequencer workout
        tempo: 138,
        density: 5,
        space: 2,
        brightness: 9,
        mixer: { kick: 7, snare: 6, bass: 7, sub: 3, seq1: 8, seq2: 7, lead: 0, pad: 2 },
        // i - VII - VI - v — expansive, evolving
        notes: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4'],
        notesHigh: ['G3', 'Bb3', 'C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'G5'],
        pad: [
            ['C2', 'G2', 'Bb2', 'Eb3'],   // Cm7
            ['C2', 'G2', 'Bb2', 'Eb3'],   // Cm7
            ['Bb1', 'F2', 'Bb2', 'D3'],   // Bbmaj
            ['Bb1', 'F2', 'Bb2', 'D3'],   // Bbmaj
            ['Ab1', 'Eb2', 'Ab2', 'C3'],  // Abmaj
            ['Ab1', 'Eb2', 'Ab2', 'C3'],  // Abmaj
            ['G1', 'D2', 'G2', 'Bb2'],    // Gm
            ['G1', 'D2', 'G2', 'Bb2']     // Gm
        ],
        bass: [
            'C1', null, 'C2', 'G1', null, 'C1', null, 'Eb1',
            'Bb0', null, 'Bb1', null, 'Ab0', null, 'G1', null
        ]
    },

    // ═══════════════════════════════════════════
    // DARK
    // ═══════════════════════════════════════════

    knifeWalker: {
        name: 'Knife Walker (Dm)',
        // Minimal, menacing - bass and kick dominant, NO PAD
        tempo: 85,
        density: 1,
        space: 1,
        brightness: 3,
        mixer: { kick: 8, snare: 4, bass: 8, sub: 7, seq1: 2, seq2: 0, lead: 4, pad: 0 },
        // i - bII - iv - V — tension and mystery
        notes: ['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4'],
        notesHigh: ['A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5'],
        pad: [
            ['D2', 'A2', 'D3', 'F3'],     // Dm
            ['D2', 'A2', 'C3', 'F3'],     // Dm7
            ['Eb2', 'Bb2', 'Eb3', 'G3'],  // Ebmaj
            ['Eb2', 'Bb2', 'D3', 'G3'],   // Ebmaj7
            ['G2', 'D3', 'G3', 'Bb3'],    // Gm
            ['G2', 'Bb2', 'D3', 'F3'],    // Gm7
            ['A2', 'E3', 'A3', 'C#4'],    // A (V)
            ['A2', 'E3', 'G3', 'C#4']     // A7
        ],
        bass: [
            'D1', 'D1', null, 'D2', null, 'A1', 'D1', null,
            'Eb1', null, 'G1', null, 'A1', null, 'A2', 'A1'
        ]
    },

    afterhours: {
        name: 'After Hours (Bbm)',
        // Deep house vibes - kick-heavy, hypnotic
        tempo: 122,
        density: 3,
        space: 4,
        brightness: 5,
        mixer: { kick: 8, snare: 3, bass: 7, sub: 6, seq1: 4, seq2: 5, lead: 3, pad: 4 },
        // i - iv - VII - III — dark club afterglow
        notes: ['Bb2', 'C3', 'Db3', 'Eb3', 'F3', 'Gb3', 'Ab3', 'Bb3', 'C4', 'Db4'],
        notesHigh: ['F3', 'Ab3', 'Bb3', 'Db4', 'Eb4', 'F4', 'Ab4', 'Bb4', 'Db5', 'F5'],
        pad: [
            ['Bb1', 'F2', 'Ab2', 'Db3'],  // Bbm7
            ['Bb1', 'F2', 'Ab2', 'Db3'],  // Bbm7
            ['Eb2', 'Bb2', 'Db3', 'Gb3'], // Ebm
            ['Eb2', 'Bb2', 'Db3', 'Gb3'], // Ebm
            ['Ab1', 'Eb2', 'Ab2', 'C3'],  // Abmaj
            ['Ab1', 'Eb2', 'Ab2', 'C3'],  // Abmaj
            ['Db2', 'Ab2', 'Db3', 'F3'],  // Dbmaj
            ['Db2', 'Ab2', 'Db3', 'F3']   // Dbmaj
        ],
        bass: [
            'Bb0', null, 'Bb1', null, 'F1', null, 'Bb0', null,
            'Eb1', null, 'Eb2', null, 'Ab0', null, 'Db1', null
        ]
    },

    tokyo: {
        name: 'Tokyo Nights (Em)',
        // Fast cyberpunk - maximum energy, all elements
        tempo: 145,
        density: 5,
        space: 1,
        brightness: 10,
        mixer: { kick: 7, snare: 7, bass: 6, sub: 3, seq1: 7, seq2: 6, lead: 6, pad: 2 },
        // i - iv - VII - VI — cyberpunk pulse
        notes: ['E3', 'F#3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4'],
        notesHigh: ['B3', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'B5'],
        pad: [
            ['E2', 'B2', 'D3', 'G3'],     // Em7
            ['E2', 'B2', 'D3', 'G3'],     // Em7
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['D2', 'A2', 'D3', 'F#3'],    // Dmaj
            ['D2', 'A2', 'D3', 'F#3'],    // Dmaj
            ['C2', 'G2', 'C3', 'E3'],     // Cmaj
            ['C2', 'G2', 'C3', 'E3']      // Cmaj
        ],
        bass: [
            'E1', null, 'E2', null, 'B1', 'E1', null, 'E2',
            'A1', null, 'A2', null, 'D1', null, 'C1', null
        ]
    },

    // ═══════════════════════════════════════════
    // BRIGHT
    // ═══════════════════════════════════════════

    oslo: {
        name: 'Oslo Dreams (A)',
        // Anthemic Scandi-pop - lush pads, soaring lead, NO KICK
        tempo: 108,
        density: 3,
        space: 5,
        brightness: 8,
        mixer: { kick: 0, snare: 4, bass: 4, sub: 3, seq1: 4, seq2: 5, lead: 8, pad: 6 },
        // I - V - vi - IV — anthemic Scandinavian pop (A-ha / Röyksopp style)
        notes: ['A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5'],
        notesHigh: ['E4', 'F#4', 'A4', 'B4', 'C#5', 'E5', 'F#5', 'A5', 'B5', 'C#6'],
        pad: [
            ['A2', 'E3', 'A3', 'C#4'],    // Amaj
            ['A2', 'E3', 'G#3', 'C#4'],   // Amaj7
            ['E2', 'B2', 'E3', 'G#3'],    // Emaj
            ['E2', 'B2', 'D3', 'G#3'],    // E7
            ['F#2', 'C#3', 'E3', 'A3'],   // F#m
            ['F#2', 'C#3', 'E3', 'A3'],   // F#m7
            ['D2', 'A2', 'D3', 'F#3'],    // Dmaj
            ['D2', 'A2', 'D3', 'F#3']     // Dmaj
        ],
        bass: [
            'A1', null, 'A2', null, 'E2', null, 'A1', null,
            'E1', null, 'E2', null, 'F#1', null, 'D1', null
        ]
    },

    sunset: {
        name: 'Sunset Strip (E)',
        // Upbeat 80s pop - punchy drums, bright everything
        tempo: 118,
        density: 4,
        space: 2,
        brightness: 9,
        mixer: { kick: 7, snare: 7, bass: 5, sub: 3, seq1: 6, seq2: 5, lead: 6, pad: 3 },
        // I - V - vi - IV — bright new wave anthem
        notes: ['E3', 'F#3', 'G#3', 'A3', 'B3', 'C#4', 'D#4', 'E4', 'F#4', 'G#4'],
        notesHigh: ['B3', 'C#4', 'E4', 'F#4', 'G#4', 'B4', 'C#5', 'E5', 'G#5', 'B5'],
        pad: [
            ['E2', 'B2', 'E3', 'G#3'],    // Emaj
            ['E2', 'B2', 'D#3', 'G#3'],   // Emaj7
            ['B1', 'F#2', 'B2', 'D#3'],   // Bmaj
            ['B1', 'F#2', 'A2', 'D#3'],   // B7
            ['C#2', 'G#2', 'C#3', 'E3'],  // C#m
            ['C#2', 'G#2', 'B2', 'E3'],   // C#m7
            ['A2', 'E3', 'A3', 'C#4'],    // Amaj
            ['A2', 'E3', 'G#3', 'C#4']    // Amaj7
        ],
        bass: [
            'E1', null, 'E2', null, 'B1', null, 'E1', null,
            'B0', null, 'B1', null, 'C#1', null, 'A1', null
        ]
    },

    curiousCosas: {
        name: 'Curious Cosas (C)',
        // Ambient pad wash - NO DRUMS, NO LEAD, pure texture
        tempo: 90,
        density: 2,
        space: 5,
        brightness: 5,
        mixer: { kick: 0, snare: 0, bass: 3, sub: 5, seq1: 4, seq2: 3, lead: 0, pad: 7 },
        // vi - IV - I - V — nostalgic synth drama
        notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'],
        notesHigh: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'G5', 'A5', 'B5', 'C6'],
        pad: [
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['A2', 'E3', 'G3', 'C4'],     // Am7
            ['F2', 'C3', 'F3', 'A3'],     // Fmaj
            ['F2', 'C3', 'E3', 'A3'],     // Fmaj7
            ['C2', 'G2', 'C3', 'E3'],     // Cmaj
            ['C2', 'G2', 'B2', 'E3'],     // Cmaj7
            ['G2', 'D3', 'G3', 'B3'],     // Gmaj
            ['G2', 'D3', 'F3', 'B3']      // G7
        ],
        bass: [
            'A1', null, 'A2', null, 'E2', null, 'A1', null,
            'F1', null, 'F2', null, 'C1', null, 'G1', null
        ]
    }
};
