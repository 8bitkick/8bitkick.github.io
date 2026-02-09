// Arrangement automation UI — Logic Pro style volume lanes
// Sparse control points connected by lines, drag to create/edit points
import { CHANNEL_NAMES, CHANNEL_COUNT, BEATS_PER_BAR, getCell, setCell, getExactBeat } from './arrangement.js';

let canvas = null;
let ctx = null;
let arrangementData = null;
let currentBeat = -1;
let exactBeatPosition = 0;
let animFrameId = null;
let getCurrentBeatFn = null;
let cellInteractionCallback = null;
let isPlaying = false;

// Drag state
let isDragging = false;
let dragChannelIdx = -1;
let dragPointIdx = -1;
let hoveredPoint = null;

// Layout
const LABEL_WIDTH = 44;
const HEADER_HEIGHT = 20;
const LANE_PAD = 4;
const POINT_RADIUS = 5;
const POINT_HIT_RADIUS = 10;

const CHANNEL_LABELS = ['KCK', 'SNR', 'BAS', 'SUB', 'SQ1', 'SQ2', 'LED', 'PAD'];
const CHANNEL_COLORS = [
    '#ff0066', // kick - hot pink
    '#ff6600', // snare - orange
    '#00ff88', // bass - green
    '#4488ff', // sub - blue
    '#ffff00', // seq1 - yellow
    '#ff8800', // seq2 - amber
    '#00ffff', // lead - cyan
    '#cc00ff', // pad - purple
];

function getLaneHeight() {
    if (!canvas) return 0;
    return (canvas.height - HEADER_HEIGHT) / CHANNEL_COUNT;
}

function getBeatWidth() {
    if (!canvas || !arrangementData) return 0;
    return (canvas.width - LABEL_WIDTH) / arrangementData.totalBeats;
}

function beatToX(beat) {
    return LABEL_WIDTH + beat * getBeatWidth();
}

function xToBeat(x) {
    const beatW = getBeatWidth();
    if (beatW <= 0) return 0;
    return Math.max(0, Math.min((x - LABEL_WIDTH) / beatW, arrangementData.totalBeats - 1));
}

function volumeToY(vol, laneTop, laneH) {
    const inner = laneH - LANE_PAD * 2;
    return laneTop + LANE_PAD + (1 - vol / 10) * inner;
}

function yToVolume(y, laneTop, laneH) {
    const inner = laneH - LANE_PAD * 2;
    const rel = (y - laneTop - LANE_PAD) / inner;
    return Math.max(0, Math.min(10, (1 - rel) * 10));
}

function colorToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Get control points for a channel (from arrangementData or generate from dense array)
function getControlPoints(channel) {
    if (arrangementData?.controlPoints?.[channel]) {
        return arrangementData.controlPoints[channel];
    }
    // Fallback: extract key points from dense array where values change
    const points = [];
    const arr = arrangementData?.channels?.[channel];
    if (!arr) return points;
    
    let lastVal = null;
    for (let beat = 0; beat < arr.length; beat++) {
        const val = arr[beat];
        const nextVal = arr[beat + 1];
        // Add point if value changed or at endpoints
        if (beat === 0 || beat === arr.length - 1 || val !== lastVal || val !== nextVal) {
            // Avoid duplicates
            if (points.length === 0 || points[points.length - 1].beat !== beat) {
                points.push({ beat, level: val });
            }
        }
        lastVal = val;
    }
    return points;
}

// Find nearest control point to a position
function findNearestPoint(x, y) {
    if (!arrangementData) return null;
    
    const laneH = getLaneHeight();
    const gy = y - HEADER_HEIGHT;
    if (gy < 0) return null;
    
    const chIdx = Math.floor(gy / laneH);
    if (chIdx < 0 || chIdx >= CHANNEL_COUNT) return null;
    
    const channel = CHANNEL_NAMES[chIdx];
    const points = getControlPoints(channel);
    const laneTop = HEADER_HEIGHT + chIdx * laneH;
    
    let nearest = null;
    let nearestDist = POINT_HIT_RADIUS;
    
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const px = beatToX(p.beat);
        const py = volumeToY(p.level, laneTop, laneH);
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = { channelIndex: chIdx, channel, pointIndex: i, point: p, x: px, y: py };
        }
    }
    
    return nearest;
}

// Hit test for creating new points on the line
function hitTestLine(x, y) {
    if (!arrangementData) return null;
    
    const laneH = getLaneHeight();
    const gy = y - HEADER_HEIGHT;
    if (gy < 0 || x < LABEL_WIDTH) return null;
    
    const chIdx = Math.floor(gy / laneH);
    if (chIdx < 0 || chIdx >= CHANNEL_COUNT) return null;
    
    const channel = CHANNEL_NAMES[chIdx];
    const laneTop = HEADER_HEIGHT + chIdx * laneH;
    const beat = xToBeat(x);
    const volume = yToVolume(y, laneTop, laneH);
    
    return { channelIndex: chIdx, channel, beat, volume };
}

// === Public API ===

export function initArrangementUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'crosshair';
    container.appendChild(canvas);

    ctx = canvas.getContext('2d');
    sizeCanvas();

    const ro = new ResizeObserver(sizeCanvas);
    ro.observe(container);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function sizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    render();
}

export function setArrangementData(data) { arrangementData = data; }
export function setPresetLevels(_levels) { /* kept for API compat */ }
export function onCellInteraction(cb) { cellInteractionCallback = cb; }

export function renderArrangement(data, beat) {
    if (data) arrangementData = data;
    currentBeat = beat;
    render();
}

// === Rendering ===

function render() {
    if (!ctx || !canvas || !arrangementData) return;

    const w = canvas.width;
    const h = canvas.height;
    const laneH = getLaneHeight();
    const totalBars = arrangementData.totalBars;
    const totalBeats = arrangementData.totalBeats;

    ctx.clearRect(0, 0, w, h);

    // Bar numbers in header
    ctx.font = '10px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    for (let bar = 0; bar < totalBars; bar += 4) {
        const x = beatToX(bar * BEATS_PER_BAR) + getBeatWidth() * BEATS_PER_BAR * 2;
        ctx.fillText(String(bar + 1), x, HEADER_HEIGHT / 2);
    }

    // Draw lanes
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
        const channel = CHANNEL_NAMES[ch];
        const color = CHANNEL_COLORS[ch];
        const laneTop = HEADER_HEIGHT + ch * laneH;
        const laneBot = laneTop + laneH;
        const points = getControlPoints(channel);

        // Alternating lane background
        ctx.fillStyle = ch % 2 === 0
            ? 'rgba(13, 2, 33, 0.5)'
            : 'rgba(26, 0, 51, 0.5)';
        ctx.fillRect(LABEL_WIDTH, laneTop, w - LABEL_WIDTH, laneH);

        // Lane separator
        ctx.strokeStyle = 'rgba(102, 0, 153, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(LABEL_WIDTH, laneBot);
        ctx.lineTo(w, laneBot);
        ctx.stroke();

        // Horizontal grid lines at 25%, 50%, 75%
        ctx.strokeStyle = 'rgba(102, 0, 153, 0.15)';
        ctx.lineWidth = 0.5;
        for (const level of [2.5, 5, 7.5]) {
            const gy = volumeToY(level, laneTop, laneH);
            ctx.beginPath();
            ctx.moveTo(LABEL_WIDTH, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
        }

        // Channel label
        ctx.font = '10px Orbitron, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillText(CHANNEL_LABELS[ch], LABEL_WIDTH - 8, laneTop + laneH / 2);
        ctx.shadowBlur = 0;

        // Draw filled area under automation line
        if (points.length > 0) {
            ctx.beginPath();
            const zeroY = volumeToY(0, laneTop, laneH);
            
            // Start at zero level
            ctx.moveTo(beatToX(0), zeroY);
            
            // First point
            const firstX = beatToX(points[0].beat);
            ctx.lineTo(firstX, zeroY);
            ctx.lineTo(firstX, volumeToY(points[0].level, laneTop, laneH));
            
            // Lines between points
            for (let i = 1; i < points.length; i++) {
                const px = beatToX(points[i].beat);
                const py = volumeToY(points[i].level, laneTop, laneH);
                ctx.lineTo(px, py);
            }
            
            // Close to zero
            const lastX = beatToX(points[points.length - 1].beat);
            ctx.lineTo(lastX, zeroY);
            ctx.lineTo(beatToX(totalBeats), zeroY);
            ctx.closePath();
            
            // Gradient fill
            const gradient = ctx.createLinearGradient(0, laneTop, 0, laneBot);
            gradient.addColorStop(0, colorToRGBA(color, 0.3));
            gradient.addColorStop(1, colorToRGBA(color, 0.05));
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Draw automation line (connecting control points)
        if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(beatToX(points[0].beat), volumeToY(points[0].level, laneTop, laneH));
            
            for (let i = 1; i < points.length; i++) {
                const px = beatToX(points[i].beat);
                const py = volumeToY(points[i].level, laneTop, laneH);
                ctx.lineTo(px, py);
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw control points (diamonds like Logic)
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const px = beatToX(p.beat);
            const py = volumeToY(p.level, laneTop, laneH);
            
            const isHovered = hoveredPoint?.channel === channel && hoveredPoint?.pointIndex === i;
            const size = isHovered ? POINT_RADIUS + 2 : POINT_RADIUS;
            
            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(px, py - size);
            ctx.lineTo(px + size, py);
            ctx.lineTo(px, py + size);
            ctx.lineTo(px - size, py);
            ctx.closePath();
            
            ctx.fillStyle = isHovered ? '#ffffff' : color;
            ctx.shadowColor = color;
            ctx.shadowBlur = isHovered ? 8 : 4;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Bar separators
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let bar = 1; bar < totalBars; bar++) {
        const x = beatToX(bar * BEATS_PER_BAR);
        ctx.beginPath();
        ctx.moveTo(x, HEADER_HEIGHT);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // 4-bar phrase markers (stronger)
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let bar = 4; bar < totalBars; bar += 4) {
        const x = beatToX(bar * BEATS_PER_BAR);
        ctx.beginPath();
        ctx.moveTo(x, HEADER_HEIGHT);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // Smooth playhead
    const playheadBeat = isPlaying ? exactBeatPosition : currentBeat;
    if (playheadBeat >= 0 && playheadBeat < totalBeats) {
        const px = beatToX(playheadBeat);
        
        // Glow
        const gradient = ctx.createLinearGradient(px - 12, 0, px + 12, 0);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(px - 12, HEADER_HEIGHT, 24, h - HEADER_HEIGHT);
        
        // Line
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 255, 136, 1)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(px, HEADER_HEIGHT);
        ctx.lineTo(px, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// === Mouse interaction ===

function onMouseDown(e) {
    if (e.button !== 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on existing point
    const nearPoint = findNearestPoint(x, y);
    if (nearPoint) {
        isDragging = true;
        dragChannelIdx = nearPoint.channelIndex;
        dragPointIdx = nearPoint.pointIndex;
        canvas.style.cursor = 'grabbing';
        return;
    }
    
    // Create new point on line
    const hit = hitTestLine(x, y);
    if (hit) {
        const beat = Math.round(hit.beat);
        const volume = Math.round(hit.volume);
        
        // Add point to control points
        if (arrangementData.controlPoints?.[hit.channel]) {
            const points = arrangementData.controlPoints[hit.channel];
            const existingIdx = points.findIndex(p => p.beat === beat);
            if (existingIdx >= 0) {
                points[existingIdx].level = volume;
                dragPointIdx = existingIdx;
            } else {
                points.push({ beat, level: volume });
                points.sort((a, b) => a.beat - b.beat);
                dragPointIdx = points.findIndex(p => p.beat === beat);
            }
        }
        
        // Also update dense array
        setCell(arrangementData, hit.channel, beat, volume);
        
        isDragging = true;
        dragChannelIdx = hit.channelIndex;
        canvas.style.cursor = 'grabbing';
        
        render();
        if (cellInteractionCallback) cellInteractionCallback(hit.channel, beat, volume);
    }
}

function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging && dragChannelIdx >= 0) {
        const channel = CHANNEL_NAMES[dragChannelIdx];
        const laneH = getLaneHeight();
        const laneTop = HEADER_HEIGHT + dragChannelIdx * laneH;
        
        const beat = Math.round(xToBeat(x));
        const volume = Math.round(yToVolume(y, laneTop, laneH));
        
        // Update the dragged point
        if (arrangementData.controlPoints?.[channel] && dragPointIdx >= 0) {
            const points = arrangementData.controlPoints[channel];
            if (points[dragPointIdx]) {
                // Don't allow moving past adjacent points
                const prevBeat = dragPointIdx > 0 ? points[dragPointIdx - 1].beat + 1 : 0;
                const nextBeat = dragPointIdx < points.length - 1 ? points[dragPointIdx + 1].beat - 1 : arrangementData.totalBeats - 1;
                const clampedBeat = Math.max(prevBeat, Math.min(nextBeat, beat));
                
                const oldBeat = points[dragPointIdx].beat;
                points[dragPointIdx].beat = clampedBeat;
                points[dragPointIdx].level = Math.max(0, Math.min(10, volume));
                
                // Update dense array - clear old position, set new
                if (oldBeat !== clampedBeat) {
                    // Recalculate the dense array from control points
                    updateDenseArrayFromPoints(channel);
                } else {
                    setCell(arrangementData, channel, clampedBeat, points[dragPointIdx].level);
                }
            }
        }
        
        render();
        if (cellInteractionCallback) {
            const points = arrangementData.controlPoints?.[channel];
            const p = points?.[dragPointIdx];
            if (p) cellInteractionCallback(channel, p.beat, p.level);
        }
    } else {
        // Hover detection
        const nearPoint = findNearestPoint(x, y);
        if (nearPoint !== hoveredPoint) {
            hoveredPoint = nearPoint;
            canvas.style.cursor = nearPoint ? 'grab' : 'crosshair';
            render();
        }
    }
}

function onMouseUp() {
    isDragging = false;
    dragChannelIdx = -1;
    dragPointIdx = -1;
    canvas.style.cursor = hoveredPoint ? 'grab' : 'crosshair';
}

function onDoubleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Double-click on point to delete it
    const nearPoint = findNearestPoint(x, y);
    if (nearPoint && arrangementData.controlPoints?.[nearPoint.channel]) {
        const points = arrangementData.controlPoints[nearPoint.channel];
        // Don't delete if only 2 or fewer points
        if (points.length > 2) {
            points.splice(nearPoint.pointIndex, 1);
            updateDenseArrayFromPoints(nearPoint.channel);
            render();
        }
    }
}

// Recalculate dense array from control points
function updateDenseArrayFromPoints(channel) {
    if (!arrangementData?.controlPoints?.[channel] || !arrangementData?.channels?.[channel]) return;
    
    const points = arrangementData.controlPoints[channel];
    const arr = arrangementData.channels[channel];
    
    for (let beat = 0; beat < arr.length; beat++) {
        // Find surrounding points
        let before = null;
        let after = null;
        for (const p of points) {
            if (p.beat <= beat) before = p;
            if (p.beat >= beat && !after) after = p;
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
            // Interpolate
            const t = (beat - before.beat) / (after.beat - before.beat);
            arr[beat] = Math.round(before.level + (after.level - before.level) * t);
        }
    }
}

// === Playhead animation ===

export function startPlayheadAnimation(getBeatFn) {
    getCurrentBeatFn = getBeatFn;
    isPlaying = true;
    stopPlayheadAnimation();
    animatePlayhead();
}

export function stopPlayheadAnimation() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    isPlaying = false;
}

function animatePlayhead() {
    if (!isPlaying) return;
    
    try {
        exactBeatPosition = getExactBeat();
    } catch (e) {
        exactBeatPosition = currentBeat;
    }
    
    if (getCurrentBeatFn) {
        const beat = getCurrentBeatFn();
        if (beat !== currentBeat) {
            currentBeat = beat;
        }
    }
    
    render();
    animFrameId = requestAnimationFrame(animatePlayhead);
}

// Legacy API compatibility
export function renderArrangementBar(data, bar) {
    renderArrangement(data, bar * BEATS_PER_BAR);
}
