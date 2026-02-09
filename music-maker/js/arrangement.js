// Arrangement data model, generation algorithm, and playback engine
// Sparse control points with interpolated playback for smooth automation

export const CHANNEL_NAMES = ['kick', 'snare', 'bass', 'sub', 'seq1', 'seq2', 'lead', 'pad'];
export const CHANNEL_COUNT = 8;
export const BEATS_PER_BAR = 4;

// ════════════════════════════════════════════════════════════════════════════
// PER-VIBE ARRANGEMENT TEMPLATES
// Hand-crafted automation curves for each vibe. Points use proportional
// positions (at: 0-1) that scale to any song length.
// Each channel has an array of { at, level } where at=0 is song start,
// at=1 is song end, and level is 0-10.
// ════════════════════════════════════════════════════════════════════════════

const VIBE_ARRANGEMENTS = {
    // ── Midnight Drive ─────────────────────────────────────────────────
    // Classic synthwave: atmospheric pad intro → rhythm drops → full energy
    // → breakdown → slam back → staggered fade
    midnight: {
        kick:  [{at:0,level:0},{at:.12,level:0},{at:.15,level:7},{at:.35,level:8},{at:.6,level:8},{at:.62,level:0},{at:.69,level:0},{at:.7,level:9},{at:.88,level:8},{at:.95,level:4},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.18,level:0},{at:.22,level:5},{at:.35,level:6},{at:.6,level:7},{at:.62,level:0},{at:.69,level:0},{at:.7,level:7},{at:.88,level:6},{at:.95,level:2},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.1,level:0},{at:.15,level:6},{at:.35,level:7},{at:.6,level:8},{at:.62,level:3},{at:.69,level:3},{at:.7,level:8},{at:.88,level:7},{at:.95,level:3},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.04,level:3},{at:.15,level:5},{at:.35,level:6},{at:.6,level:6},{at:.62,level:4},{at:.69,level:4},{at:.7,level:7},{at:.88,level:5},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.2,level:0},{at:.25,level:4},{at:.35,level:6},{at:.6,level:7},{at:.62,level:5},{at:.69,level:5},{at:.7,level:7},{at:.88,level:5},{at:.95,level:2},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.28,level:0},{at:.32,level:3},{at:.5,level:5},{at:.6,level:5},{at:.62,level:3},{at:.69,level:3},{at:.7,level:6},{at:.88,level:4},{at:.93,level:0},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.3,level:0},{at:.35,level:5},{at:.5,level:7},{at:.6,level:8},{at:.62,level:0},{at:.69,level:0},{at:.7,level:9},{at:.85,level:8},{at:.92,level:5},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.02,level:2},{at:.1,level:4},{at:.35,level:5},{at:.6,level:4},{at:.62,level:5},{at:.69,level:5},{at:.7,level:4},{at:.85,level:3},{at:1,level:0}],
    },

    // ── Neon Tears ──────────────────────────────────────────────────────
    // Emotional ballad: lead solo → pad washes in → sub warmth → sparse build
    // → emotional peak → gentle drop → final swell → long fade
    // NO kick, snare, seq2
    neon: {
        kick:  [{at:0,level:0},{at:1,level:0}],
        snare: [{at:0,level:0},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.25,level:0},{at:.35,level:3},{at:.55,level:5},{at:.65,level:5},{at:.7,level:2},{at:.8,level:4},{at:.92,level:2},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.12,level:0},{at:.2,level:4},{at:.4,level:6},{at:.55,level:7},{at:.65,level:7},{at:.7,level:5},{at:.8,level:6},{at:.95,level:3},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.3,level:0},{at:.4,level:2},{at:.55,level:3},{at:.65,level:3},{at:.7,level:1},{at:.8,level:2},{at:.9,level:1},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.35,level:4},{at:.55,level:6},{at:.65,level:5},{at:.7,level:0},{at:.8,level:5},{at:.88,level:4},{at:.95,level:1},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.05,level:0},{at:.15,level:3},{at:.3,level:5},{at:.55,level:6},{at:.65,level:6},{at:.7,level:4},{at:.8,level:5},{at:.95,level:3},{at:1,level:0}],
    },

    // ── Chrome Horizon ──────────────────────────────────────────────────
    // Driving arp workout: seq1 from beat 1 → seq2 joins → kick drops hard
    // → full driving energy → break (arps continue) → slam back → arps fade last
    // NO lead
    chrome: {
        kick:  [{at:0,level:0},{at:.1,level:0},{at:.12,level:8},{at:.35,level:8},{at:.55,level:9},{at:.57,level:0},{at:.64,level:0},{at:.65,level:9},{at:.85,level:8},{at:.92,level:4},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.15,level:0},{at:.18,level:5},{at:.35,level:7},{at:.55,level:7},{at:.57,level:0},{at:.64,level:0},{at:.65,level:8},{at:.85,level:6},{at:.92,level:2},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.1,level:0},{at:.15,level:7},{at:.35,level:8},{at:.55,level:8},{at:.57,level:0},{at:.64,level:0},{at:.65,level:9},{at:.85,level:7},{at:.92,level:3},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.15,level:0},{at:.2,level:4},{at:.35,level:5},{at:.55,level:5},{at:.57,level:3},{at:.64,level:3},{at:.65,level:6},{at:.85,level:4},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.01,level:6},{at:.1,level:7},{at:.35,level:8},{at:.55,level:9},{at:.57,level:6},{at:.64,level:6},{at:.65,level:9},{at:.85,level:7},{at:.95,level:4},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.05,level:0},{at:.08,level:5},{at:.35,level:7},{at:.55,level:8},{at:.57,level:5},{at:.64,level:5},{at:.65,level:8},{at:.85,level:6},{at:.95,level:3},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.2,level:0},{at:.3,level:2},{at:.55,level:3},{at:.57,level:2},{at:.64,level:2},{at:.65,level:3},{at:.85,level:2},{at:1,level:0}],
    },

    // ── Knife Walker ────────────────────────────────────────────────────
    // Minimal menace: kick alone → bass creeps in → long sparse section
    // → brief snare + lead → tension drop → build back sparse → abrupt end
    // NO pad, seq2
    knifeWalker: {
        kick:  [{at:0,level:0},{at:.02,level:7},{at:.2,level:8},{at:.5,level:8},{at:.52,level:4},{at:.59,level:4},{at:.6,level:8},{at:.85,level:8},{at:.92,level:7},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.35,level:0},{at:.4,level:3},{at:.5,level:5},{at:.52,level:0},{at:.69,level:0},{at:.7,level:4},{at:.85,level:5},{at:.92,level:3},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.06,level:0},{at:.12,level:6},{at:.3,level:8},{at:.5,level:9},{at:.52,level:5},{at:.59,level:5},{at:.6,level:7},{at:.85,level:8},{at:.92,level:5},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.08,level:0},{at:.15,level:5},{at:.3,level:7},{at:.5,level:7},{at:.52,level:6},{at:.59,level:6},{at:.6,level:7},{at:.85,level:6},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.4,level:0},{at:.45,level:2},{at:.5,level:3},{at:.52,level:0},{at:.74,level:0},{at:.75,level:2},{at:.85,level:3},{at:.9,level:0},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:1,level:0}],
    },

    // ── After Hours ─────────────────────────────────────────────────────
    // Deep house hypnosis: kick from beat 1 → bass groove → pad atmosphere
    // → arps layer in → subtle lead → break (pad + bass hold) → build back
    // → long hypnotic outro
    afterhours: {
        kick:  [{at:0,level:0},{at:.01,level:7},{at:.15,level:8},{at:.4,level:8},{at:.5,level:8},{at:.52,level:0},{at:.59,level:0},{at:.6,level:8},{at:.82,level:8},{at:.9,level:5},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.2,level:0},{at:.25,level:3},{at:.4,level:4},{at:.5,level:4},{at:.52,level:0},{at:.59,level:0},{at:.6,level:4},{at:.82,level:3},{at:.88,level:0},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.05,level:0},{at:.1,level:6},{at:.25,level:7},{at:.4,level:8},{at:.52,level:4},{at:.59,level:4},{at:.6,level:7},{at:.82,level:7},{at:.92,level:4},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.02,level:4},{at:.15,level:6},{at:.4,level:6},{at:.52,level:5},{at:.59,level:5},{at:.6,level:6},{at:.82,level:5},{at:.95,level:3},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.2,level:0},{at:.28,level:3},{at:.4,level:5},{at:.5,level:5},{at:.52,level:4},{at:.59,level:4},{at:.6,level:5},{at:.82,level:4},{at:.9,level:2},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.15,level:0},{at:.2,level:4},{at:.35,level:5},{at:.5,level:6},{at:.52,level:4},{at:.59,level:4},{at:.6,level:6},{at:.82,level:5},{at:.9,level:3},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.35,level:0},{at:.4,level:3},{at:.5,level:4},{at:.52,level:0},{at:.67,level:0},{at:.68,level:3},{at:.78,level:4},{at:.85,level:2},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.08,level:0},{at:.15,level:3},{at:.3,level:4},{at:.5,level:5},{at:.52,level:5},{at:.59,level:5},{at:.6,level:4},{at:.82,level:4},{at:.95,level:2},{at:1,level:0}],
    },

    // ── Tokyo Nights ────────────────────────────────────────────────────
    // Cyberpunk burst: instant energy from beat 1 → maximum chaos
    // → hard cut at 50% → 2 beats silence → SLAM everything back
    // → relentless to end → abrupt stop
    tokyo: {
        kick:  [{at:0,level:0},{at:.01,level:8},{at:.2,level:8},{at:.48,level:9},{at:.5,level:0},{at:.53,level:0},{at:.54,level:9},{at:.85,level:9},{at:.95,level:7},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.03,level:6},{at:.2,level:7},{at:.48,level:8},{at:.5,level:0},{at:.53,level:0},{at:.54,level:8},{at:.85,level:8},{at:.95,level:5},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.01,level:7},{at:.2,level:7},{at:.48,level:8},{at:.5,level:0},{at:.53,level:0},{at:.54,level:8},{at:.85,level:8},{at:.95,level:5},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.02,level:4},{at:.2,level:5},{at:.48,level:5},{at:.5,level:0},{at:.53,level:0},{at:.54,level:5},{at:.85,level:5},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.01,level:7},{at:.2,level:8},{at:.48,level:8},{at:.5,level:0},{at:.53,level:0},{at:.54,level:8},{at:.85,level:8},{at:.95,level:5},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.05,level:0},{at:.1,level:5},{at:.35,level:7},{at:.48,level:7},{at:.5,level:0},{at:.53,level:0},{at:.54,level:7},{at:.85,level:7},{at:.95,level:4},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.15,level:0},{at:.2,level:6},{at:.35,level:7},{at:.48,level:8},{at:.5,level:0},{at:.53,level:0},{at:.54,level:9},{at:.75,level:9},{at:.85,level:7},{at:.95,level:4},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.2,level:0},{at:.3,level:2},{at:.48,level:3},{at:.5,level:0},{at:.53,level:0},{at:.54,level:3},{at:.75,level:2},{at:1,level:0}],
    },

    // ── Oslo Dreams ─────────────────────────────────────────────────────
    // Anthemic Scandi: pad wash → lead melody enters → gradual build
    // → soaring climax → break (pad + lead only) → final emotional swell → long fade
    // NO kick
    oslo: {
        kick:  [{at:0,level:0},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.3,level:0},{at:.35,level:3},{at:.5,level:5},{at:.65,level:6},{at:.68,level:0},{at:.77,level:0},{at:.78,level:5},{at:.88,level:5},{at:.93,level:2},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.18,level:0},{at:.25,level:3},{at:.4,level:5},{at:.55,level:5},{at:.65,level:6},{at:.68,level:2},{at:.77,level:2},{at:.78,level:5},{at:.88,level:4},{at:.95,level:2},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.1,level:0},{at:.18,level:3},{at:.35,level:4},{at:.55,level:5},{at:.65,level:5},{at:.68,level:3},{at:.77,level:3},{at:.78,level:5},{at:.88,level:4},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.25,level:0},{at:.32,level:3},{at:.5,level:5},{at:.65,level:6},{at:.68,level:2},{at:.77,level:2},{at:.78,level:5},{at:.88,level:4},{at:.95,level:2},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.15,level:0},{at:.22,level:3},{at:.4,level:5},{at:.55,level:6},{at:.65,level:6},{at:.68,level:3},{at:.77,level:3},{at:.78,level:6},{at:.88,level:5},{at:.95,level:2},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.65,level:9},{at:.68,level:5},{at:.77,level:5},{at:.78,level:8},{at:.85,level:9},{at:.92,level:6},{at:.97,level:3},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.02,level:2},{at:.1,level:4},{at:.3,level:5},{at:.55,level:6},{at:.65,level:6},{at:.68,level:5},{at:.77,level:5},{at:.78,level:6},{at:.88,level:5},{at:.97,level:3},{at:1,level:0}],
    },

    // ── Sunset Strip ────────────────────────────────────────────────────
    // 80s pop: iconic synth arp intro → drums drop hard
    // → bass locks in → lead carries the chorus → bridge drops drums
    // → final chorus slam → quick punchy ending
    sunset: {
        kick:  [{at:0,level:0},{at:.12,level:0},{at:.14,level:8},{at:.25,level:8},{at:.45,level:9},{at:.5,level:9},{at:.52,level:0},{at:.59,level:0},{at:.6,level:9},{at:.85,level:9},{at:.92,level:6},{at:1,level:0}],
        snare: [{at:0,level:0},{at:.14,level:0},{at:.16,level:6},{at:.25,level:7},{at:.45,level:8},{at:.5,level:8},{at:.52,level:0},{at:.59,level:0},{at:.6,level:8},{at:.85,level:8},{at:.92,level:5},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.1,level:0},{at:.14,level:7},{at:.25,level:8},{at:.45,level:8},{at:.5,level:8},{at:.52,level:3},{at:.59,level:3},{at:.6,level:8},{at:.85,level:8},{at:.92,level:4},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.08,level:0},{at:.12,level:5},{at:.25,level:5},{at:.45,level:6},{at:.52,level:4},{at:.59,level:4},{at:.6,level:6},{at:.85,level:5},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.01,level:7},{at:.08,level:8},{at:.25,level:8},{at:.45,level:9},{at:.5,level:9},{at:.52,level:6},{at:.59,level:6},{at:.6,level:9},{at:.85,level:8},{at:.92,level:5},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.04,level:0},{at:.06,level:5},{at:.25,level:6},{at:.45,level:7},{at:.5,level:7},{at:.52,level:4},{at:.59,level:4},{at:.6,level:7},{at:.85,level:6},{at:.92,level:3},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:.2,level:0},{at:.25,level:6},{at:.35,level:8},{at:.45,level:9},{at:.5,level:9},{at:.52,level:0},{at:.59,level:0},{at:.6,level:9},{at:.75,level:9},{at:.85,level:8},{at:.92,level:4},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.1,level:0},{at:.15,level:2},{at:.35,level:3},{at:.5,level:3},{at:.52,level:4},{at:.59,level:4},{at:.6,level:3},{at:.85,level:2},{at:.92,level:1},{at:1,level:0}],
    },

    // ── Curious Cosas ───────────────────────────────────────────────────
    // Pure ambient texture: pad wash from silence → sub drifts in → arps barely emerge
    // → gentle bass motion → very gradual peak (never fully loud, max ~7)
    // → ultra-long fade → pad alone at end
    // NO kick, snare, lead
    curiousCosas: {
        kick:  [{at:0,level:0},{at:1,level:0}],
        snare: [{at:0,level:0},{at:1,level:0}],
        bass:  [{at:0,level:0},{at:.35,level:0},{at:.45,level:2},{at:.6,level:4},{at:.75,level:4},{at:.85,level:3},{at:.95,level:1},{at:1,level:0}],
        sub:   [{at:0,level:0},{at:.1,level:0},{at:.2,level:3},{at:.4,level:5},{at:.6,level:6},{at:.75,level:6},{at:.85,level:4},{at:.95,level:2},{at:1,level:0}],
        seq1:  [{at:0,level:0},{at:.25,level:0},{at:.35,level:2},{at:.55,level:4},{at:.7,level:4},{at:.8,level:3},{at:.92,level:1},{at:1,level:0}],
        seq2:  [{at:0,level:0},{at:.3,level:0},{at:.4,level:2},{at:.6,level:3},{at:.75,level:3},{at:.85,level:2},{at:.92,level:0},{at:1,level:0}],
        lead:  [{at:0,level:0},{at:1,level:0}],
        pad:   [{at:0,level:0},{at:.02,level:1},{at:.1,level:3},{at:.3,level:5},{at:.5,level:6},{at:.65,level:7},{at:.75,level:7},{at:.85,level:5},{at:.95,level:3},{at:1,level:1}],
    },
};

// Build a fixed arrangement from a vibe template
// Scales proportional positions (0-1) to actual beat positions
export function getVibeArrangement(mood, totalBars = 32) {
    const template = VIBE_ARRANGEMENTS[mood];
    if (!template) return null;

    const totalBeats = totalBars * BEATS_PER_BAR;

    const controlPoints = {};
    const channels = {};

    for (const ch of CHANNEL_NAMES) {
        const templatePts = template[ch] || [{at: 0, level: 0}, {at: 1, level: 0}];

        // Scale proportional positions to beat positions
        const points = templatePts.map(p => ({
            beat: Math.round(p.at * (totalBeats - 1)),
            level: p.level
        }));

        // Deduplicate beats (rounding can collapse adjacent points)
        const deduped = [];
        for (const p of points) {
            const last = deduped[deduped.length - 1];
            if (!last || last.beat !== p.beat) {
                deduped.push(p);
            } else {
                last.level = p.level; // keep last value at that beat
            }
        }

        controlPoints[ch] = deduped;

        // Build dense array from control points
        const arr = new Array(totalBeats).fill(0);
        for (let beat = 0; beat < totalBeats; beat++) {
            let before = null;
            let after = null;
            for (const pt of deduped) {
                if (pt.beat <= beat) before = pt;
                if (pt.beat >= beat && !after) after = pt;
            }
            if (!before && !after) {
                arr[beat] = 0;
            } else if (!before) {
                arr[beat] = after.level;
            } else if (!after) {
                arr[beat] = before.level;
            } else if (before.beat === after.beat) {
                arr[beat] = before.level;
            } else {
                const t = (beat - before.beat) / (after.beat - before.beat);
                arr[beat] = Math.round(before.level + (after.level - before.level) * t);
            }
        }
        channels[ch] = arr;
    }

    return {
        totalBars,
        totalBeats,
        channels,
        controlPoints,
        archetype: mood
    };
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Arrangement archetypes - each creates a distinct musical journey (used for random generation)
const ARRANGEMENT_ARCHETYPES = [
    {
        name: 'classic-build',
        introChannels: ['pad', 'sub'],
        buildOrder: ['bass', 'kick', 'seq1', 'snare', 'seq2', 'lead'],
        breakDrop: ['kick', 'snare', 'bass'],
        breakKeep: ['pad', 'sub', 'seq1'],
        outroOrder: ['lead', 'snare', 'seq2', 'kick', 'bass', 'seq1', 'sub', 'pad'],
    },
    {
        name: 'rhythm-first',
        introChannels: ['kick', 'sub'],
        buildOrder: ['bass', 'snare', 'seq1', 'pad', 'seq2', 'lead'],
        breakDrop: ['snare', 'seq1', 'seq2', 'lead'],
        breakKeep: ['kick', 'bass', 'sub', 'pad'],
        outroOrder: ['lead', 'seq2', 'seq1', 'snare', 'pad', 'bass', 'kick', 'sub'],
    },
    {
        name: 'melodic-intro',
        introChannels: ['lead', 'pad'],
        buildOrder: ['sub', 'bass', 'seq1', 'kick', 'seq2', 'snare'],
        breakDrop: ['kick', 'snare', 'bass', 'seq2'],
        breakKeep: ['lead', 'pad', 'sub', 'seq1'],
        outroOrder: ['snare', 'kick', 'seq2', 'bass', 'seq1', 'sub', 'pad', 'lead'],
    },
    {
        name: 'arp-wash',
        introChannels: ['seq1', 'seq2'],
        buildOrder: ['sub', 'pad', 'bass', 'kick', 'snare', 'lead'],
        breakDrop: ['kick', 'snare', 'lead', 'bass'],
        breakKeep: ['seq1', 'seq2', 'pad', 'sub'],
        outroOrder: ['lead', 'snare', 'kick', 'bass', 'pad', 'sub', 'seq2', 'seq1'],
    },
    {
        name: 'minimal-groove',
        introChannels: ['kick', 'bass'],
        buildOrder: ['sub', 'snare', 'seq1', 'pad', 'seq2', 'lead'],
        breakDrop: ['snare', 'seq1', 'seq2'],
        breakKeep: ['kick', 'bass', 'sub', 'pad'],
        outroOrder: ['lead', 'seq2', 'seq1', 'snare', 'pad', 'sub', 'bass', 'kick'],
    },
    {
        name: 'ambient-swell',
        introChannels: ['pad'],
        buildOrder: ['sub', 'seq2', 'seq1', 'bass', 'kick', 'snare', 'lead'],
        breakDrop: ['kick', 'snare', 'lead'],
        breakKeep: ['pad', 'sub', 'seq1', 'seq2', 'bass'],
        outroOrder: ['snare', 'kick', 'lead', 'bass', 'seq1', 'seq2', 'sub', 'pad'],
    },
];

// Compute section boundaries
function getSections(totalBars) {
    if (totalBars <= 16) {
        return [
            { name: 'intro',   startBar: 0,  bars: 2 },
            { name: 'buildA',  startBar: 2,  bars: 4 },
            { name: 'climaxA', startBar: 6,  bars: 4 },
            { name: 'break',   startBar: 10, bars: 2 },
            { name: 'climaxB', startBar: 12, bars: 2 },
            { name: 'outro',   startBar: 14, bars: 2 },
        ];
    }
    if (totalBars <= 32) {
        return [
            { name: 'intro',   startBar: 0,  bars: 4 },
            { name: 'buildA',  startBar: 4,  bars: 8 },
            { name: 'climaxA', startBar: 12, bars: 4 },
            { name: 'break',   startBar: 16, bars: 4 },
            { name: 'buildB',  startBar: 20, bars: 4 },
            { name: 'climaxB', startBar: 24, bars: 4 },
            { name: 'outro',   startBar: 28, bars: 4 },
        ];
    }
    if (totalBars <= 48) {
        return [
            { name: 'intro',   startBar: 0,  bars: 4 },
            { name: 'buildA',  startBar: 4,  bars: 8 },
            { name: 'climaxA', startBar: 12, bars: 8 },
            { name: 'break',   startBar: 20, bars: 4 },
            { name: 'buildB',  startBar: 24, bars: 8 },
            { name: 'climaxB', startBar: 32, bars: 8 },
            { name: 'outro',   startBar: 40, bars: 8 },
        ];
    }
    // 64 bars
    return [
        { name: 'intro',   startBar: 0,  bars: 8 },
        { name: 'buildA',  startBar: 8,  bars: 12 },
        { name: 'climaxA', startBar: 20, bars: 8 },
        { name: 'break',   startBar: 28, bars: 8 },
        { name: 'buildB',  startBar: 36, bars: 8 },
        { name: 'climaxB', startBar: 44, bars: 12 },
        { name: 'outro',   startBar: 56, bars: 8 },
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// SPARSE CONTROL POINT SYSTEM
// Each channel has an array of { beat, level } control points
// Playback interpolates between them for smooth automation
// ════════════════════════════════════════════════════════════════════════════

function addPoint(points, beat, level) {
    // Avoid duplicate beats
    const existing = points.findIndex(p => p.beat === beat);
    if (existing >= 0) {
        points[existing].level = level;
    } else {
        points.push({ beat, level });
    }
}

function sortPoints(points) {
    points.sort((a, b) => a.beat - b.beat);
}

// Get interpolated level at any beat position
function getLevelAtBeat(points, beat) {
    if (points.length === 0) return 0;
    
    // Find surrounding points
    let before = null;
    let after = null;
    
    for (const p of points) {
        if (p.beat <= beat) before = p;
        if (p.beat >= beat && !after) after = p;
    }
    
    // Edge cases
    if (!before) return after ? after.level : 0;
    if (!after) return before.level;
    if (before.beat === after.beat) return before.level;
    
    // Linear interpolation
    const t = (beat - before.beat) / (after.beat - before.beat);
    return before.level + (after.level - before.level) * t;
}

// Convert sparse points to dense array for backward compatibility
function pointsToArray(points, totalBeats) {
    const arr = new Array(totalBeats).fill(0);
    for (let beat = 0; beat < totalBeats; beat++) {
        arr[beat] = Math.round(getLevelAtBeat(points, beat));
    }
    return arr;
}

// ════════════════════════════════════════════════════════════════════════════
// ARRANGEMENT GENERATION - Producer-style thinking
// ════════════════════════════════════════════════════════════════════════════

export function generateArrangement(mixerPreset, totalBars = 32) {
    const totalBeats = totalBars * BEATS_PER_BAR;
    const sections = getSections(totalBars);
    
    // Mixer preset determines which channels are enabled (>0 means enabled)
    // Automation levels are always 0-10 representing 0-100% of full volume
    const isEnabled = (ch) => (mixerPreset[ch] || 0) > 0;
    const fullLevel = 10;  // 100% = level 10
    
    // Pick arrangement archetype
    const archetype = pick(ARRANGEMENT_ARCHETYPES);
    
    // Initialize sparse control points for each channel
    const controlPoints = {};
    for (const ch of CHANNEL_NAMES) {
        controlPoints[ch] = [];
    }
    
    // Filter to enabled channels
    const introChannels = archetype.introChannels.filter(isEnabled);
    const buildOrder = archetype.buildOrder.filter(isEnabled);
    const breakDrop = archetype.breakDrop.filter(isEnabled);
    const breakKeep = archetype.breakKeep.filter(isEnabled);
    const outroOrder = archetype.outroOrder.filter(isEnabled);
    
    // All enabled channels
    const allEnabled = CHANNEL_NAMES.filter(isEnabled);
    
    // Helper to get section by name
    const getSection = (name) => sections.find(s => s.name === name);
    
    // ──────────────────────────────────────────────────────────────────────────
    // INTRO: Sparse entry, create atmosphere or hook
    // ──────────────────────────────────────────────────────────────────────────
    const intro = getSection('intro');
    if (intro) {
        const startBeat = intro.startBar * BEATS_PER_BAR;
        const endBeat = (intro.startBar + intro.bars) * BEATS_PER_BAR;
        
        for (const ch of introChannels) {
            // Start from silence, fade to ~60-70% over the intro
            addPoint(controlPoints[ch], startBeat, 0);
            addPoint(controlPoints[ch], endBeat, Math.round(fullLevel * 0.65));
        }
        
        // Everything else starts at 0
        for (const ch of allEnabled) {
            if (!introChannels.includes(ch)) {
                addPoint(controlPoints[ch], startBeat, 0);
            }
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // BUILD A: Progressive layering, tension building
    // ──────────────────────────────────────────────────────────────────────────
    const buildA = getSection('buildA');
    if (buildA) {
        const startBeat = buildA.startBar * BEATS_PER_BAR;
        const sectionBeats = buildA.bars * BEATS_PER_BAR;
        const endBeat = startBeat + sectionBeats;
        
        // Intro channels continue rising
        for (const ch of introChannels) {
            addPoint(controlPoints[ch], endBeat, Math.round(fullLevel * 0.85));
        }
        
        // Build channels enter progressively
        const numBuild = buildOrder.length;
        for (let i = 0; i < numBuild; i++) {
            const ch = buildOrder[i];
            
            // Stagger entry points across the build
            const entryProgress = i / Math.max(numBuild - 1, 1);
            const entryBeat = startBeat + Math.floor(entryProgress * sectionBeats * 0.6);
            
            // Enter at low level, rise toward end
            addPoint(controlPoints[ch], entryBeat, 0);
            addPoint(controlPoints[ch], entryBeat + BEATS_PER_BAR, Math.round(fullLevel * 0.4));
            addPoint(controlPoints[ch], endBeat, Math.round(fullLevel * 0.75));
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // CLIMAX A: Full energy, all channels at peak
    // ──────────────────────────────────────────────────────────────────────────
    const climaxA = getSection('climaxA');
    if (climaxA) {
        const startBeat = climaxA.startBar * BEATS_PER_BAR;
        const endBeat = (climaxA.startBar + climaxA.bars) * BEATS_PER_BAR;
        
        for (const ch of allEnabled) {
            // Quick rise to full at start of climax
            addPoint(controlPoints[ch], startBeat, fullLevel);
            // Hold steady (maybe tiny variation)
            addPoint(controlPoints[ch], endBeat - BEATS_PER_BAR, fullLevel);
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // BREAK: Dramatic drop, create space for impact
    // ──────────────────────────────────────────────────────────────────────────
    const breakSection = getSection('break');
    if (breakSection) {
        const startBeat = breakSection.startBar * BEATS_PER_BAR;
        const endBeat = (breakSection.startBar + breakSection.bars) * BEATS_PER_BAR;
        
        // Dropped channels: quick fade to silence
        for (const ch of breakDrop) {
            addPoint(controlPoints[ch], startBeat, fullLevel);
            addPoint(controlPoints[ch], startBeat + BEATS_PER_BAR, 0);
            addPoint(controlPoints[ch], endBeat - BEATS_PER_BAR, 0);
        }
        
        // Kept channels: drop to ~40-50%
        for (const ch of breakKeep) {
            const reduced = Math.round(fullLevel * 0.45);
            addPoint(controlPoints[ch], startBeat, fullLevel);
            addPoint(controlPoints[ch], startBeat + BEATS_PER_BAR, reduced);
            addPoint(controlPoints[ch], endBeat - BEATS_PER_BAR * 2, reduced);
            // Slight rise before climax B for anticipation
            addPoint(controlPoints[ch], endBeat - BEATS_PER_BAR, Math.round(fullLevel * 0.6));
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // BUILD B (if exists): Quick rebuild, higher energy
    // ──────────────────────────────────────────────────────────────────────────
    const buildB = getSection('buildB');
    if (buildB) {
        const startBeat = buildB.startBar * BEATS_PER_BAR;
        const endBeat = (buildB.startBar + buildB.bars) * BEATS_PER_BAR;
        
        // Everything rises quickly back to full
        for (const ch of allEnabled) {
            // Start where break left off (interpolation handles this)
            addPoint(controlPoints[ch], startBeat + BEATS_PER_BAR, Math.round(fullLevel * 0.5));
            addPoint(controlPoints[ch], endBeat, fullLevel);
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // CLIMAX B: Peak energy, slightly hotter than A
    // ──────────────────────────────────────────────────────────────────────────
    const climaxB = getSection('climaxB');
    if (climaxB) {
        const startBeat = climaxB.startBar * BEATS_PER_BAR;
        const endBeat = (climaxB.startBar + climaxB.bars) * BEATS_PER_BAR;
        
        for (const ch of allEnabled) {
            addPoint(controlPoints[ch], startBeat, fullLevel);
            addPoint(controlPoints[ch], endBeat - BEATS_PER_BAR * 2, fullLevel);
        }
    }
    
    // ──────────────────────────────────────────────────────────────────────────
    // OUTRO: Graceful exit, staggered fadeouts
    // ──────────────────────────────────────────────────────────────────────────
    const outro = getSection('outro');
    if (outro) {
        const startBeat = outro.startBar * BEATS_PER_BAR;
        const sectionBeats = outro.bars * BEATS_PER_BAR;
        const endBeat = startBeat + sectionBeats;
        
        // Stagger fadeouts - first in outroOrder drops first
        const numOutro = outroOrder.length;
        for (let i = 0; i < numOutro; i++) {
            const ch = outroOrder[i];
            
            // When does this channel start fading?
            const fadeStartProgress = i / Math.max(numOutro - 1, 1);
            const fadeStartBeat = startBeat + Math.floor(fadeStartProgress * sectionBeats * 0.5);
            
            // Start at full, fade to silence
            addPoint(controlPoints[ch], startBeat, fullLevel);
            if (fadeStartBeat > startBeat) {
                addPoint(controlPoints[ch], fadeStartBeat, fullLevel * 0.8);
            }
            addPoint(controlPoints[ch], endBeat, 0);
        }
        
        // Any channels not in outroOrder
        for (const ch of allEnabled) {
            if (!outroOrder.includes(ch)) {
                addPoint(controlPoints[ch], startBeat, fullLevel);
                addPoint(controlPoints[ch], endBeat, 0);
            }
        }
    }
    
    // Sort all control points
    for (const ch of CHANNEL_NAMES) {
        sortPoints(controlPoints[ch]);
    }
    
    // Convert to dense arrays for backward compatibility with UI
    const channels = {};
    for (const ch of CHANNEL_NAMES) {
        channels[ch] = pointsToArray(controlPoints[ch], totalBeats);
    }
    
    return { 
        totalBars, 
        totalBeats, 
        channels,
        controlPoints, // Also store sparse points for interpolated playback
        archetype: archetype.name 
    };
}

// ════════════════════════════════════════════════════════════════════════════
// CELL MANIPULATION
// ════════════════════════════════════════════════════════════════════════════

export function getCell(arrangement, channel, beat) {
    return arrangement.channels[channel]?.[beat] ?? 0;
}

export function setCell(arrangement, channel, beat, value) {
    if (arrangement.channels[channel] && beat >= 0 && beat < arrangement.totalBeats) {
        arrangement.channels[channel][beat] = clamp(value, 0, 10);
        // Also update control points if they exist
        if (arrangement.controlPoints?.[channel]) {
            addPoint(arrangement.controlPoints[channel], beat, value);
            sortPoints(arrangement.controlPoints[channel]);
        }
    }
}

// Get smoothly interpolated level at exact beat position
export function getInterpolatedLevel(arrangement, channel, exactBeat) {
    if (arrangement.controlPoints?.[channel]) {
        return getLevelAtBeat(arrangement.controlPoints[channel], exactBeat);
    }
    // Fallback to linear interpolation between array values
    const beatFloor = Math.floor(exactBeat);
    const beatCeil = Math.min(beatFloor + 1, arrangement.totalBeats - 1);
    const t = exactBeat - beatFloor;
    const v1 = getCell(arrangement, channel, beatFloor);
    const v2 = getCell(arrangement, channel, beatCeil);
    return v1 + (v2 - v1) * t;
}

export function getBarLevel(arrangement, channel, bar) {
    const beat = bar * BEATS_PER_BAR;
    return getCell(arrangement, channel, beat);
}

// Cycle through volume levels (100% -> 50% -> 0% -> 100%)
export function cycleCell(arrangement, channel, beat, _presetLevel) {
    const current = getCell(arrangement, channel, beat);
    const fullLevel = 10;  // 100%
    const half = 5;        // 50%
    if (current >= fullLevel) {
        setCell(arrangement, channel, beat, half);
    } else if (current > 0) {
        setCell(arrangement, channel, beat, 0);
    } else {
        setCell(arrangement, channel, beat, fullLevel);
    }
}

// Toggle between muted (0) and full (100%)
export function muteToggleCell(arrangement, channel, beat, _presetLevel) {
    const current = getCell(arrangement, channel, beat);
    const fullLevel = 10;  // 100%
    setCell(arrangement, channel, beat, current > 0 ? 0 : fullLevel);
}

// ════════════════════════════════════════════════════════════════════════════
// PLAYBACK ENGINE - Smooth interpolated volume control
// ════════════════════════════════════════════════════════════════════════════

let currentBeat = 0;
let repeatEventId = null;
let cleanupFn = null;

export function getCurrentBeat() {
    return currentBeat;
}

export function getExactBeat() {
    if (typeof Tone === 'undefined' || Tone.Transport.state !== 'started') return currentBeat;
    const position = Tone.Transport.position;
    const parts = position.split(':').map(Number);
    const bars = parts[0] || 0;
    const beats = parts[1] || 0;
    const sixteenths = parts[2] || 0;
    return bars * BEATS_PER_BAR + beats + sixteenths / 4;
}

// Apply smoothly interpolated volumes to channel gain nodes
// This affects the output level, not the note loudness at trigger time
// Set immediate=true for initial volume setup (no ramp, prevents glitches)
export function applyInterpolatedVolumes(arrangement, exactBeat, getLiveRefs, toDb, immediate = false) {
    const refs = typeof getLiveRefs === 'function' ? getLiveRefs() : getLiveRefs;
    if (!refs || !refs.channelGains) return;

    const ramp = immediate ? 0 : 0.1; // No ramp for immediate, 100ms ramp otherwise
    
    // Convert level (0-10) to linear gain (0-1)
    // Level 10 = full volume (gain 1), Level 0 = silence (gain 0)
    const levelToGain = (level) => {
        if (level <= 0) return 0;
        // Use a slight curve for more natural fades
        return Math.pow(level / 10, 1.5);
    };
    
    const getGain = (channel) => {
        const level = getInterpolatedLevel(arrangement, channel, exactBeat);
        return levelToGain(level);
    };

    // Apply automation to channel output gain nodes
    const gains = refs.channelGains;
    
    if (immediate) {
        // Set immediately without ramp (for initial setup)
        if (gains.kick) gains.kick.gain.value = getGain('kick');
        if (gains.snare) gains.snare.gain.value = getGain('snare');
        if (gains.bass) gains.bass.gain.value = getGain('bass');
        if (gains.sub) gains.sub.gain.value = getGain('sub');
        if (gains.seq1) gains.seq1.gain.value = getGain('seq1');
        if (gains.seq2) gains.seq2.gain.value = getGain('seq2');
        if (gains.lead) gains.lead.gain.value = getGain('lead');
        if (gains.pad) gains.pad.gain.value = getGain('pad');
    } else {
        // Ramp for smooth transitions during playback
        if (gains.kick) gains.kick.gain.rampTo(getGain('kick'), ramp);
        if (gains.snare) gains.snare.gain.rampTo(getGain('snare'), ramp);
        if (gains.bass) gains.bass.gain.rampTo(getGain('bass'), ramp);
        if (gains.sub) gains.sub.gain.rampTo(getGain('sub'), ramp);
        if (gains.seq1) gains.seq1.gain.rampTo(getGain('seq1'), ramp);
        if (gains.seq2) gains.seq2.gain.rampTo(getGain('seq2'), ramp);
        if (gains.lead) gains.lead.gain.rampTo(getGain('lead'), ramp);
        if (gains.pad) gains.pad.gain.rampTo(getGain('pad'), ramp);
    }
}

// Legacy function for discrete beat updates
export function applyBeatVolumes(arrangement, beat, getLiveRefs, toDb) {
    applyInterpolatedVolumes(arrangement, beat, getLiveRefs, toDb);
}

export function applyBarVolumes(arrangement, bar, getLiveRefs, toDb) {
    applyInterpolatedVolumes(arrangement, bar * BEATS_PER_BAR, getLiveRefs, toDb);
}

export function startArrangementPlayback(arrangement, getLiveRefs, toDb, onBeatChange, onEnd) {
    currentBeat = 0;

    // Apply initial volumes immediately (no ramp) to prevent glitches on first play
    applyInterpolatedVolumes(arrangement, 0, getLiveRefs, toDb, true);
    onBeatChange(0);

    // Update volumes every 8th note — smooth enough, lighter on CPU
    repeatEventId = Tone.Transport.scheduleRepeat((time) => {
        const exactBeat = getExactBeat();
        currentBeat = Math.floor(exactBeat);

        if (currentBeat >= arrangement.totalBeats) {
            Tone.Draw.schedule(() => {
                onEnd();
            }, time);
            return;
        }

        applyInterpolatedVolumes(arrangement, exactBeat, getLiveRefs, toDb);
        
        // Only notify UI on beat boundaries
        if (exactBeat % 1 < 0.25) {
            Tone.Draw.schedule(() => {
                onBeatChange(currentBeat);
            }, time);
        }
    }, '8n', '0');

    cleanupFn = () => {
        if (repeatEventId !== null) {
            Tone.Transport.clear(repeatEventId);
            repeatEventId = null;
        }
        currentBeat = 0;
    };

    return cleanupFn;
}

export function stopArrangementPlayback() {
    if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
    }
}
