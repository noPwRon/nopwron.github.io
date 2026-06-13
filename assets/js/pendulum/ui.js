// UI wiring — sliders, buttons, dashboard readouts, strip chart.
// Reads from and writes to DOM. Does NOT touch physics or canvas directly.
// Emits events / calls callbacks provided by main.js.

import { PARAMS } from './params.js';

// ── Internal state ────────────────────────────────────────────────────────────
const HISTORY_LEN = 600;      // samples stored (~10 s at 60 fps)
const history = [];           // { state: Float64Array, u: number } oldest-first

let currentGains = { ...PARAMS.pidPresets['TUNED'] };

// ── Helpers ───────────────────────────────────────────────────────────────────
const el    = id => document.getElementById(id);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

function setActive(buttons, activeBtn) {
  buttons.forEach(b => {
    b.classList.toggle('active', b === activeBtn);
    b.setAttribute('aria-pressed', b === activeBtn ? 'true' : 'false');
  });
}

function syncSliders() {
  el('slKp').value = currentGains.Kp;  el('valKp').textContent = currentGains.Kp.toFixed(1);
  el('slKi').value = currentGains.Ki;  el('valKi').textContent = currentGains.Ki.toFixed(2);
  el('slKd').value = currentGains.Kd;  el('valKd').textContent = currentGains.Kd.toFixed(1);
}

// ── initUI ────────────────────────────────────────────────────────────────────
export function initUI(callbacks) {

  // ── Controller mode tabs ──────────────────────────────────────────────────
  const modeTabs = [...document.querySelectorAll('.pend-mode-tab')];
  modeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      setActive(modeTabs, btn);
      el('pidControls').classList.toggle('hidden', mode !== 'PID');
      el('lqrInfo').classList.toggle('hidden', mode !== 'LQR');
      callbacks.onModeChange(mode);
    });
  });

  // ── Link count tabs ───────────────────────────────────────────────────────
  const linkTabs = [...document.querySelectorAll('.pend-link-tab')];
  linkTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      setActive(linkTabs, btn);
      history.length = 0;
      callbacks.onLinkCountChange(parseInt(btn.dataset.links, 10));
    });
  });

  // ── PID gain sliders ──────────────────────────────────────────────────────
  function wireSlider(sliderId, valId, gainKey, decimals) {
    const sl = el(sliderId), vl = el(valId);
    sl.addEventListener('input', () => {
      const v = parseFloat(sl.value);
      vl.textContent = v.toFixed(decimals);
      currentGains = { ...currentGains, [gainKey]: v };
      callbacks.onGainsChange({ ...currentGains });
    });
  }
  wireSlider('slKp', 'valKp', 'Kp', 1);
  wireSlider('slKi', 'valKi', 'Ki', 2);
  wireSlider('slKd', 'valKd', 'Kd', 1);

  // ── Preset buttons ────────────────────────────────────────────────────────
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PARAMS.pidPresets[btn.dataset.preset];
      if (!preset) return;
      currentGains = { ...preset };
      syncSliders();
      callbacks.onGainsChange({ ...currentGains });
    });
  });

  // ── Speed slider ──────────────────────────────────────────────────────────
  const slSpeed = el('slSpeed'), valSpeed = el('valSpeed');
  slSpeed.addEventListener('input', () => {
    const v = parseFloat(slSpeed.value);
    valSpeed.textContent = v.toFixed(2) + '×';
    callbacks.onSpeedChange(v);
  });

  // ── Pause / Resume ────────────────────────────────────────────────────────
  const btnPause = el('btnPause');
  let paused = false;

  btnPause.addEventListener('click', () => {
    paused = !paused;
    btnPause.textContent = paused ? 'RESUME' : 'PAUSE';
    btnPause.classList.toggle('active', paused);
    callbacks.onPause(paused);
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  el('btnReset').addEventListener('click', () => {
    history.length = 0;
    if (paused) {
      paused = false;
      btnPause.textContent = 'PAUSE';
      btnPause.classList.remove('active');
      callbacks.onPause(false);
    }
    callbacks.onReset();
  });

  // ── Nudge ─────────────────────────────────────────────────────────────────
  el('btnNudge').addEventListener('click', () => {
    const sign    = Math.random() < 0.5 ? 1 : -1;
    const impulse = sign * (1.2 + Math.random() * 1.0);  // ±1.2–2.2 m/s kick to ẋ
    callbacks.onNudge(impulse);
  });

  // ── Units toggle ──────────────────────────────────────────────────────────
  el('btnDeg').addEventListener('click', () => {
    el('btnDeg').classList.add('active');
    el('btnRad').classList.remove('active');
    callbacks.onUnitsChange(true);
  });
  el('btnRad').addEventListener('click', () => {
    el('btnRad').classList.add('active');
    el('btnDeg').classList.remove('active');
    callbacks.onUnitsChange(false);
  });

  // ── Sync initial slider display ───────────────────────────────────────────
  syncSliders();
  callbacks.onGainsChange({ ...currentGains });
}

// ── Dashboard update ──────────────────────────────────────────────────────────
// Called once per rendered frame from main.js.
// state: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]   n = link count
export function updateDashboard(state, u, n, unitDeg, mode) {

  // Append sample (cap buffer length)
  history.push({ state: Float64Array.from(state), u });
  if (history.length > HISTORY_LEN) history.shift();

  // Angle formatter
  const fmtA = unitDeg
    ? v => (v * 180 / Math.PI).toFixed(2) + '°'
    : v => v.toFixed(4) + ' rad';

  // θ₁…θ₃ and θ̇₁…θ̇₃
  const aIds  = ['rθ1',  'rθ2',  'rθ3' ];
  const adIds = ['rθd1', 'rθd2', 'rθd3'];

  for (let i = 0; i < 3; i++) {
    const active = i < n;
    const aEl = el(aIds[i]),  dEl = el(adIds[i]);
    if (aEl) aEl.textContent  = active ? fmtA(state[1 + i])       : '—';
    if (dEl) dEl.textContent  = active ? fmtA(state[n + 2 + i])   : '—';
  }

  // Cart state (always active)
  const xEl  = el('rx'),  xdEl = el('rxd'),  uEl = el('ru');
  if (xEl)  xEl.textContent  = state[0].toFixed(3)     + ' m';
  if (xdEl) xdEl.textContent = state[n + 1].toFixed(3) + ' m/s';
  if (uEl)  uEl.textContent  = u.toFixed(2)             + ' N';
}

// ── Strip chart ───────────────────────────────────────────────────────────────
// Scrolling line chart with two panels:
//   Top  — angle signals (θ₁…θₙ), range ±fallThreshold
//   Bottom — cart position x (±trackHalfLength) and control force u (±maxForce)
export function drawStripChart(chartCtx, n, unitDeg) {
  const canvas = chartCtx.canvas;
  const W = canvas.width  / (devicePixelRatio || 1);
  const H = canvas.height / (devicePixelRatio || 1);

  // Colours (site tokens)
  const C_BG     = '#0d1117';
  const C_GRID   = 'rgba(255,255,255,0.06)';
  const C_ZERO   = 'rgba(255,255,255,0.18)';
  const C_BORDER = 'rgba(255,255,255,0.12)';
  const C_CYAN   = '#6f97b3';
  const C_CYAN2  = '#4a7a96';
  const C_CYAN3  = '#2e5a70';
  const C_GREEN  = '#86f7b3';
  const C_AMBER  = '#e09a16';
  const C_TEXT   = 'rgba(255,255,255,0.35)';

  const PAD_L = 28, PAD_R = 4, PAD_T = 4, PAD_B = 4;
  const split  = Math.floor(H * 0.55);  // y where angle panel ends
  const plotW  = W - PAD_L - PAD_R;

  // ── Background ──
  chartCtx.fillStyle = C_BG;
  chartCtx.fillRect(0, 0, W, H);

  // ── Panel separator ──
  chartCtx.strokeStyle = C_BORDER;
  chartCtx.lineWidth   = 1;
  chartCtx.beginPath();
  chartCtx.moveTo(PAD_L, split);
  chartCtx.lineTo(W - PAD_R, split);
  chartCtx.stroke();

  // ── Helpers ──────────────────────────────────────────────────────────────
  function drawGrid(yTop, yBot) {
    const mid = (yTop + yBot) / 2;
    const q1  = (yTop + mid) / 2;
    const q3  = (mid + yBot) / 2;
    chartCtx.strokeStyle = C_GRID;
    chartCtx.lineWidth   = 0.5;
    for (const y of [q1, q3]) {
      chartCtx.beginPath(); chartCtx.moveTo(PAD_L, y); chartCtx.lineTo(W - PAD_R, y); chartCtx.stroke();
    }
    chartCtx.strokeStyle = C_ZERO;
    chartCtx.lineWidth   = 1;
    chartCtx.beginPath(); chartCtx.moveTo(PAD_L, mid); chartCtx.lineTo(W - PAD_R, mid); chartCtx.stroke();
  }

  function drawTrace(samples, yTop, yBot, scaleMax, color) {
    if (samples.length < 2) return;
    const mid    = (yTop + yBot) / 2;
    const halfH  = (yBot - yTop) / 2 - PAD_T;
    const xStep  = plotW / HISTORY_LEN;
    // Right-align: most recent sample at right edge, empty space on the left.
    const xStart = PAD_L + (HISTORY_LEN - samples.length) * xStep;
    chartCtx.beginPath();
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth   = 1.2;
    for (let i = 0; i < samples.length; i++) {
      const x = xStart + i * xStep;
      const y = mid - clamp(samples[i] / scaleMax, -1, 1) * halfH;
      i === 0 ? chartCtx.moveTo(x, y) : chartCtx.lineTo(x, y);
    }
    chartCtx.stroke();
  }

  function yLabel(text, y, color) {
    chartCtx.fillStyle   = color;
    chartCtx.font        = '9px "Share Tech Mono", monospace';
    chartCtx.textAlign   = 'right';
    chartCtx.textBaseline = 'middle';
    chartCtx.fillText(text, PAD_L - 3, y);
  }

  // ── Angle panel ──────────────────────────────────────────────────────────
  const angTop = PAD_T, angBot = split - 2;
  drawGrid(angTop, angBot);

  const angScale = PARAMS.fallThreshold;  // ±135°

  const thColors  = [C_CYAN, C_CYAN2, C_CYAN3];
  const thLabels  = unitDeg ? ['θ₁°', 'θ₂°', 'θ₃°'] : ['θ₁', 'θ₂', 'θ₃'];

  for (let i = 0; i < n; i++) {
    const samples = history.map(s => s.state[1 + i]);
    drawTrace(samples, angTop, angBot, angScale, thColors[i]);
  }

  // Label: max scale value at top of angle panel
  const scaleLabel = unitDeg
    ? (angScale * 180 / Math.PI).toFixed(0) + '°'
    : angScale.toFixed(2);
  yLabel(scaleLabel, angTop + 8, C_TEXT);
  yLabel('0', (angTop + angBot) / 2, C_TEXT);
  yLabel(n === 1 ? thLabels[0] : 'θ', angTop + (angBot - angTop) * 0.25, C_CYAN);

  // ── x / u panel ───────────────────────────────────────────────────────────
  const xuTop = split + 2, xuBot = H - PAD_B;
  drawGrid(xuTop, xuBot);

  const xSamples = history.map(s => s.state[0]);
  const uSamples = history.map(s => s.u);

  drawTrace(xSamples, xuTop, xuBot, PARAMS.trackHalfLength, C_GREEN);
  drawTrace(uSamples, xuTop, xuBot, PARAMS.maxForce,        C_AMBER);

  yLabel('x/u', xuTop + 8, C_TEXT);
  yLabel('0',   (xuTop + xuBot) / 2, C_TEXT);

  // ── Left axis border ──────────────────────────────────────────────────────
  chartCtx.strokeStyle = C_BORDER;
  chartCtx.lineWidth   = 1;
  chartCtx.beginPath();
  chartCtx.moveTo(PAD_L, PAD_T);
  chartCtx.lineTo(PAD_L, H - PAD_B);
  chartCtx.stroke();

  // ── Legend ────────────────────────────────────────────────────────────────
  chartCtx.font        = '8px "Share Tech Mono", monospace';
  chartCtx.textAlign   = 'left';
  chartCtx.textBaseline = 'top';
  let lx = PAD_L + 4, ly = angTop + 2;
  const leg = n === 1
    ? [[C_CYAN,  thLabels[0]]]
    : n === 2
      ? [[C_CYAN, thLabels[0]], [C_CYAN2, thLabels[1]]]
      : [[C_CYAN, thLabels[0]], [C_CYAN2, thLabels[1]], [C_CYAN3, thLabels[2]]];

  for (const [c, label] of leg) {
    chartCtx.fillStyle = c;
    chartCtx.fillText(label, lx, ly);
    lx += chartCtx.measureText(label + '  ').width;
  }

  // x and u legend in the bottom panel
  lx = PAD_L + 4; ly = xuTop + 2;
  chartCtx.fillStyle = C_GREEN; chartCtx.fillText('x', lx, ly); lx += 14;
  chartCtx.fillStyle = C_AMBER; chartCtx.fillText('u', lx, ly);
}
