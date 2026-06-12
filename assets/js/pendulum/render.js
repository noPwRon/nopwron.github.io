// Canvas rendering — cart, links, track, force arrow, fail state overlay.
// All drawing is done here. No physics, no DOM queries outside the canvas.
// Vector/wireframe aesthetic: glowing cyan strokes on dark, amber for force.

import { PARAMS } from './params.js';

const C = {
  cyan:        '#6f97b3',
  cyanBright:  '#9fbfd4',
  amber:       '#e09a16',
  success:     '#86f7b3',
  bg:          '#071019',
  text:        '#d9e6f2',
  textFaint:   'rgba(217,230,242,0.45)',
  trackLine:   'rgba(111,151,179,0.35)',
  trackStop:   'rgba(111,151,179,0.65)',
  cartFill:    'rgba(111,151,179,0.12)',
  cartStroke:  '#6f97b3',
  fail:        'rgba(255,80,80,0.18)',
};

// Convert simulation metres to canvas pixels (centred at cx, cy).
function mToPx(m, ppm) { return m * ppm; }

// ── Main draw call ──────────────────────────────────────────────────────────
// ctx:   2D canvas context (already scaled for DPR in main.js)
// w, h:  logical canvas dimensions (post-DPR-scale, in CSS pixels)
// state: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]
// u:     control force (for arrow)
// n:     link count
// mode:  'STABLE' | 'OSCILLATING' | 'CRASHED' | 'STANDBY'
export function draw(ctx, w, h, state, u, n, mode) {
  // TODO T4: full implementation
  drawBackground(ctx, w, h);
  drawTrack(ctx, w, h);
}

// ── Background ──────────────────────────────────────────────────────────────
function drawBackground(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

// ── Track ───────────────────────────────────────────────────────────────────
function drawTrack(ctx, w, h) {
  const ppm  = PARAMS.pixelsPerMetre;
  const cx   = w / 2;
  const cy   = h * 0.58;
  const half = PARAMS.trackHalfLength * ppm;

  ctx.save();
  ctx.strokeStyle = C.trackLine;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();

  // End stops
  ctx.strokeStyle = C.trackStop;
  ctx.lineWidth   = 2.5;
  [-1, 1].forEach(side => {
    const x = cx + side * half;
    ctx.beginPath();
    ctx.moveTo(x, cy - 14);
    ctx.lineTo(x, cy + 14);
    ctx.stroke();
  });
  ctx.restore();
}
