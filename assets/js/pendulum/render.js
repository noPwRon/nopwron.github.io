// Canvas rendering — cart, links, track, force arrow, fail/standby overlays.
// All drawing lives here. No physics, no DOM queries beyond the canvas element.
// Vector/wireframe aesthetic: glowing cyan strokes on dark, amber for force arrow.
// Coordinate origin is screen-centre at 58% of canvas height (cart equilibrium).

import { PARAMS } from './params.js';

// ── Palette (matches tokens.css) ────────────────────────────────────────────
const C = {
  bg:          '#071019',
  cyan:        '#6f97b3',
  cyanBright:  '#9fbfd4',
  cyanDim:     'rgba(111,151,179,0.30)',
  cyanGlow:    'rgba(111,151,179,0.18)',
  amber:       '#e09a16',
  amberDim:    'rgba(224,154,22,0.55)',
  success:     '#86f7b3',
  failRed:     'rgba(255,80,80,0.22)',
  failRedText: '#ff8080',
  textFaint:   'rgba(217,230,242,0.40)',
  textDim:     'rgba(217,230,242,0.65)',
  track:       'rgba(111,151,179,0.28)',
  trackStop:   'rgba(111,151,179,0.60)',
  cartFill:    'rgba(111,151,179,0.10)',
  cartStroke:  '#6f97b3',
  bobFill:     'rgba(111,151,179,0.15)',
};

// Pixels-per-metre scaling. We use PARAMS.pixelsPerMetre at 1× DPR;
// the canvas context is already scaled by DPR before draw() is called.
const PPM = PARAMS.pixelsPerMetre;

// ── Public API ───────────────────────────────────────────────────────────────
// ctx:    2D canvas context (pre-scaled for DPR by main.js)
// w, h:   logical canvas dimensions (CSS pixels, post-DPR-scale)
// state:  [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]
// u:      current control force (N) — for force arrow
// n:      active link count
// mode:   'STANDBY' | 'STABLE' | 'OSCILLATING' | 'CRASHED'
export function draw(ctx, w, h, state, u, n, mode) {
  const cx = w / 2;
  const cy = h * 0.58;  // cart equilibrium height

  ctx.clearRect(0, 0, w, h);

  drawTrack(ctx, cx, cy);
  drawCart(ctx, cx, cy, state[0]);

  // Build link tip positions for all active links
  const tips = buildTipChain(state, n, cx, cy);
  for (let i = 0; i < n; i++) {
    const base = i === 0
      ? cartTopCentre(cx, cy, state[0])
      : tips[i - 1];
    drawLink(ctx, base, tips[i], i, n);
  }
  for (let i = 0; i < n; i++) {
    const base = i === 0
      ? cartTopCentre(cx, cy, state[0])
      : tips[i - 1];
    drawBob(ctx, tips[i], i === n - 1);
  }

  if (Math.abs(u) > 0.01) drawForceArrow(ctx, cx, cy, state[0], u);

  if (mode === 'CRASHED') drawCrashOverlay(ctx, w, h);
  else drawInteractionHint(ctx, w, h);
}

// ── Track ────────────────────────────────────────────────────────────────────
function drawTrack(ctx, cx, cy) {
  const half = PARAMS.trackHalfLength * PPM;

  ctx.save();

  // Rail line
  ctx.strokeStyle = C.track;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();

  // Ground shadow beneath rail
  ctx.strokeStyle = 'rgba(111,151,179,0.08)';
  ctx.lineWidth   = 6;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy + 1);
  ctx.lineTo(cx + half, cy + 1);
  ctx.stroke();

  // End stops
  ctx.strokeStyle = C.trackStop;
  ctx.lineWidth   = 2.5;
  for (const side of [-1, 1]) {
    const x = cx + side * half;
    ctx.beginPath();
    ctx.moveTo(x, cy - 18);
    ctx.lineTo(x, cy + 10);
    ctx.stroke();

    // Stop tick marks
    ctx.strokeStyle = C.cyanDim;
    ctx.lineWidth   = 1;
    for (let t = 1; t <= 3; t++) {
      ctx.beginPath();
      ctx.moveTo(x - side * 6, cy - 18 + t * 6);
      ctx.lineTo(x,             cy - 18 + t * 6);
      ctx.stroke();
    }
    ctx.strokeStyle = C.trackStop;
    ctx.lineWidth   = 2.5;
  }

  // Scale markers every 0.5 m
  ctx.strokeStyle = C.cyanDim;
  ctx.lineWidth   = 1;
  for (let m = -Math.floor(PARAMS.trackHalfLength / 0.5); m <= Math.floor(PARAMS.trackHalfLength / 0.5); m++) {
    if (m === 0) continue;
    const mx = cx + m * 0.5 * PPM;
    ctx.beginPath();
    ctx.moveTo(mx, cy - 5);
    ctx.lineTo(mx, cy + 5);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Cart ─────────────────────────────────────────────────────────────────────
function drawCart(ctx, cx, cy, x) {
  const pw = PARAMS.cartWidth  * PPM;
  const ph = PARAMS.cartHeight * PPM;
  const px = cx + x * PPM - pw / 2;
  const py = cy - ph;

  ctx.save();

  // Body fill
  ctx.fillStyle = C.cartFill;
  ctx.fillRect(px, py, pw, ph);

  // Body stroke with glow
  ctx.strokeStyle = C.cartStroke;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor  = C.cyanGlow;
  ctx.shadowBlur   = 8;
  ctx.strokeRect(px, py, pw, ph);
  ctx.shadowBlur   = 0;

  // Corner brackets (top corners only — portfolio aesthetic)
  const blen = 8;
  ctx.strokeStyle = C.cyanBright;
  ctx.lineWidth   = 1;
  for (const [bx, by, sx, sy] of [
    [px,       py,       1,  1],
    [px + pw,  py,      -1,  1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(bx + sx * blen, by);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by + sy * blen);
    ctx.stroke();
  }

  // Wheels (two small circles on the rail)
  const wr = 5;
  const wy = cy;
  for (const wx of [px + pw * 0.25, px + pw * 0.75]) {
    ctx.strokeStyle = C.cyanDim;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Centre-top of cart in canvas coords (pivot point for link 1)
function cartTopCentre(cx, cy, x) {
  return {
    px: cx + x * PPM,
    py: cy - PARAMS.cartHeight * PPM,
  };
}

// ── Link chain geometry ───────────────────────────────────────────────────────
// Returns array of n tip positions {px, py} in canvas coords.
// θᵢ = 0 → link points straight up.
function buildTipChain(state, n, cx, cy) {
  const tips = [];
  let base = cartTopCentre(cx, cy, state[0]);
  for (let i = 0; i < n; i++) {
    const th  = state[i + 1];
    const len = PARAMS.linkLength[i] * PPM;
    tips.push({
      px: base.px + len * Math.sin(th),
      py: base.py - len * Math.cos(th),
    });
    base = tips[i];
  }
  return tips;
}

// ── Link rod ──────────────────────────────────────────────────────────────────
// Drawn as a thick glowing line with a thin bright centre stripe.
function drawLink(ctx, base, tip, index, totalLinks) {
  // Brightness decreases toward tip links (inner links are thicker/brighter)
  const alpha = 1.0 - index * 0.18;
  const width = Math.max(2, (PARAMS.linkWidth * PPM) * (1 - index * 0.15));

  ctx.save();

  // Glow pass
  ctx.strokeStyle = `rgba(111,151,179,${(alpha * 0.25).toFixed(2)})`;
  ctx.lineWidth   = width + 6;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(base.px, base.py);
  ctx.lineTo(tip.px,  tip.py);
  ctx.stroke();

  // Main rod
  ctx.strokeStyle = `rgba(111,151,179,${alpha.toFixed(2)})`;
  ctx.lineWidth   = width;
  ctx.beginPath();
  ctx.moveTo(base.px, base.py);
  ctx.lineTo(tip.px,  tip.py);
  ctx.stroke();

  // Bright centre stripe
  ctx.strokeStyle = `rgba(159,191,212,${(alpha * 0.6).toFixed(2)})`;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(base.px, base.py);
  ctx.lineTo(tip.px,  tip.py);
  ctx.stroke();

  // Pivot joint circle at base
  ctx.fillStyle   = C.bg;
  ctx.strokeStyle = `rgba(111,151,179,${(alpha * 0.8).toFixed(2)})`;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(base.px, base.py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ── Tip bob ───────────────────────────────────────────────────────────────────
function drawBob(ctx, tip, isLast) {
  const r = PARAMS.bobRadius * PPM;

  ctx.save();

  // Glow
  ctx.fillStyle = 'rgba(111,151,179,0.10)';
  ctx.beginPath();
  ctx.arc(tip.px, tip.py, r + 4, 0, Math.PI * 2);
  ctx.fill();

  // Fill
  ctx.fillStyle = isLast ? 'rgba(111,151,179,0.22)' : 'rgba(111,151,179,0.10)';
  ctx.beginPath();
  ctx.arc(tip.px, tip.py, r, 0, Math.PI * 2);
  ctx.fill();

  // Stroke
  ctx.strokeStyle = isLast ? C.cyanBright : C.cyanDim;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Cross-hair inside last bob
  if (isLast) {
    ctx.strokeStyle = 'rgba(159,191,212,0.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(tip.px - r * 0.5, tip.py);
    ctx.lineTo(tip.px + r * 0.5, tip.py);
    ctx.moveTo(tip.px, tip.py - r * 0.5);
    ctx.lineTo(tip.px, tip.py + r * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Control-force arrow ───────────────────────────────────────────────────────
// Drawn in amber, pointing in the direction of applied force.
// Length scaled by |u| / maxForce.
function drawForceArrow(ctx, cx, cy, x, u) {
  const cartPx    = cx + x * PPM;
  const cartCy    = cy - (PARAMS.cartHeight * PPM) / 2;  // mid-height of cart
  const maxArrow  = 60;  // px at full saturation
  const arrowLen  = (Math.abs(u) / PARAMS.maxForce) * maxArrow;
  const dir       = Math.sign(u);
  const x1        = cartPx;
  const x2        = cartPx + dir * arrowLen;
  const headLen   = 8;
  const headAngle = Math.PI / 7;

  if (arrowLen < 2) return;

  ctx.save();
  ctx.strokeStyle = C.amber;
  ctx.fillStyle   = C.amber;
  ctx.lineWidth   = 2;
  ctx.shadowColor = C.amberDim;
  ctx.shadowBlur  = 6;

  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, cartCy);
  ctx.lineTo(x2, cartCy);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, cartCy);
  ctx.lineTo(x2 - dir * headLen * Math.cos(headAngle),  cartCy - headLen * Math.sin(headAngle));
  ctx.moveTo(x2, cartCy);
  ctx.lineTo(x2 - dir * headLen * Math.cos(headAngle),  cartCy + headLen * Math.sin(headAngle));
  ctx.stroke();

  // Force label
  ctx.shadowBlur  = 0;
  ctx.font        = '10px "Share Tech Mono", monospace';
  ctx.fillStyle   = C.amberDim;
  ctx.textAlign   = dir > 0 ? 'left' : 'right';
  ctx.fillText(`${u.toFixed(1)}N`, x2 + dir * 4, cartCy - 6);

  ctx.restore();
}

// ── CRASHED overlay ───────────────────────────────────────────────────────────
function drawCrashOverlay(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = C.failRed;
  ctx.fillRect(0, 0, w, h);

  ctx.font      = '13px "Share Tech Mono", monospace';
  ctx.fillStyle = C.failRedText;
  ctx.textAlign = 'center';
  ctx.fillText('PENDULUM CRASHED — PRESS RESET', w / 2, h / 2 + 4);
  ctx.restore();
}

// ── Persistent canvas interaction hint ───────────────────────────────────────
function drawInteractionHint(ctx, w, h) {
  ctx.save();
  ctx.font          = '9px "Share Tech Mono", monospace';
  ctx.fillStyle     = 'rgba(111,151,179,0.22)';
  ctx.textAlign     = 'right';
  ctx.textBaseline  = 'bottom';
  ctx.fillText('TAP · SWIPE TO DISTURB', w - 10, h - 8);
  ctx.restore();
}
