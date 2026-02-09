// Spectrum Analyzer Visualizer using WebAudio AnalyserNode
let analyser = null;
let canvas = null;
let canvasCtx = null;
let dataArray = null;
let animationId = null;

const BAR_COUNT = 64;
const FFT_SIZE = 2048;
const SMOOTHING = 0.82;

export function initVisualizer() {
    const viz = document.getElementById('visualizer');
    viz.innerHTML = '';

    canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    viz.appendChild(canvas);

    canvasCtx = canvas.getContext('2d');
    sizeCanvas();

    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(viz);
}

function sizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
}

function ensureAnalyser() {
    if (analyser) return;
    const rawContext = Tone.context.rawContext;
    analyser = rawContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    // Tap into the master output so we visualize all audio
    Tone.Destination.connect(analyser);
}

export function updateVisualizer(isPlaying) {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (!isPlaying) {
        if (canvasCtx && canvas) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    ensureAnalyser();
    draw();
}

// Map bar index to frequency bin range using a power curve
// so lower frequencies (bass/mid) get more visual space
function binRange(barIndex) {
    const totalBins = analyser.frequencyBinCount;
    const lo = Math.floor(Math.pow(barIndex / BAR_COUNT, 2) * totalBins);
    const hi = Math.floor(Math.pow((barIndex + 1) / BAR_COUNT, 2) * totalBins);
    return [lo, Math.max(hi, lo + 1)];
}

function draw() {
    if (!analyser || !canvasCtx || !canvas) return;
    animationId = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    const gap = 1.5;
    const barWidth = (w / BAR_COUNT) - gap;

    canvasCtx.clearRect(0, 0, w, h);

    for (let i = 0; i < BAR_COUNT; i++) {
        // Average frequency bins for this bar
        const [lo, hi] = binRange(i);
        let sum = 0;
        for (let j = lo; j < hi; j++) {
            sum += dataArray[j];
        }
        const avg = sum / (hi - lo);
        const norm = avg / 255;
        const barHeight = norm * h;

        const x = i * (barWidth + gap);
        const y = h - barHeight;

        // Neon violet-blue gradient matching the page bg palette
        const alpha = 0.7 + norm * 0.3;
        const grad = canvasCtx.createLinearGradient(x, h, x, y);
        grad.addColorStop(0, `rgba(26, 10, 46, ${alpha})`);    // deep violet (#1a0a2e)
        grad.addColorStop(0.3, `rgba(80, 40, 180, ${alpha})`);  // purple
        grad.addColorStop(0.6, `rgba(100, 150, 255, ${alpha})`); // neon blue
        grad.addColorStop(1, `rgba(160, 200, 255, ${alpha})`);   // bright blue-white

        canvasCtx.fillStyle = grad;
        canvasCtx.fillRect(x, y, barWidth, barHeight);

        // Neon glow on loud bars
        if (norm > 0.6) {
            canvasCtx.shadowColor = 'rgba(100, 150, 255, 0.7)';
            canvasCtx.shadowBlur = 10;
            canvasCtx.fillRect(x, y, barWidth, barHeight);
            canvasCtx.shadowBlur = 0;
        }
    }
}
