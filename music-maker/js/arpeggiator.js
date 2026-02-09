// Arpeggiator pattern generation
export function generateArpPattern(notes, pattern, length) {
    const result = [];
    let sorted = [...notes].sort((a, b) => Tone.Frequency(a).toFrequency() - Tone.Frequency(b).toFrequency());
    let sequence = [];

    switch (pattern) {
        case 'up':
            sequence = sorted;
            break;
        case 'down':
            sequence = sorted.reverse();
            break;
        case 'updown':
            sequence = [...sorted, ...sorted.slice(1, -1).reverse()];
            break;
        case 'downup':
            const rev = sorted.reverse();
            sequence = [...rev, ...rev.slice(1, -1).reverse()];
            break;
        case 'converge':
            const half = Math.floor(sorted.length / 2);
            for (let i = 0; i < sorted.length; i++) {
                if (i % 2 === 0) sequence.push(sorted[Math.floor(i / 2)]);
                else sequence.push(sorted[sorted.length - 1 - Math.floor(i / 2)]);
            }
            break;
        case 'random':
        default:
            for (let i = 0; i < length; i++) {
                sequence.push(notes[Math.floor(Math.random() * notes.length)]);
            }
            return sequence;
    }

    // Repeat pattern to fill length
    for (let i = 0; i < length; i++) {
        result.push(sequence[i % sequence.length]);
    }
    return result;
}
