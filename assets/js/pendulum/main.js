// Bootstrap, animation loop, module wiring.
// Owns the accumulator pattern that keeps physics at PARAMS.dt
// regardless of monitor refresh rate.

import { PARAMS }               from './params.js';
import { computeAccelerations } from './dynamics.js';
import { rk4Step, makeDerivFn } from './integrator.js';
import { pidStep, lqrStep, resetPID } from './controller.js';
import { draw }                 from './render.js';
import { initUI, updateDashboard, drawStripChart } from './ui.js';

// ── Canvas setup ─────────────────────────────────────────────────────────────
const simCanvas   = document.getElementById('sim');
const chartCanvas = document.getElementById('chart');
const simCtx      = simCanvas.getContext('2d');
const chartCtx    = chartCanvas.getContext('2d');

function resizeCanvases() {
  const simRect   = simCanvas.getBoundingClientRect();
  const chartRect = chartCanvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;

  simCanvas.width  = Math.round(simRect.width  * dpr);
  simCanvas.height = Math.round(simRect.height * dpr);
  simCtx.scale(dpr, dpr);

  chartCanvas.width  = Math.round(chartRect.width  * dpr);
  chartCanvas.height = Math.round(chartRect.height * dpr);
  chartCtx.scale(dpr, dpr);
}

// ── Simulation state ─────────────────────────────────────────────────────────
let nLinks      = 1;
let ctrlMode    = 'PID';   // 'PID' | 'LQR'
let simPaused   = false;
let speedMult   = 1.0;
let unitDeg     = false;
let simStatus   = 'STANDBY';

// State vector: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]
function makeInitialState(n) {
  // Slightly perturbed from upright so the controller has something to correct
  const state = new Array(2 * (n + 1)).fill(0);
  state[1] = 0.05;  // θ₁ = 0.05 rad
  return state;
}

let state     = makeInitialState(nLinks);
let pidState  = { integral: 0, prevError: 0 };
let pidGains  = { ...PARAMS.pidPresets['TUNED'] };
let accumulator = 0;   // seconds of unintegrated physics time
let lastTime    = null;

// ── Derivative function (rebuilt when nLinks changes) ────────────────────────
let derivFn = makeDerivFn(computeAccelerations, nLinks);

// ── Crash / fail detection ───────────────────────────────────────────────────
function checkFail(st, n) {
  for (let i = 1; i <= n; i++) {
    if (Math.abs(st[i]) > PARAMS.fallThreshold) return true;
  }
  if (Math.abs(st[0]) >= PARAMS.trackHalfLength) return true;
  return false;
}

function reset() {
  state       = makeInitialState(nLinks);
  pidState    = { integral: 0, prevError: 0 };
  accumulator = 0;
  lastTime    = null;
  simStatus   = 'STANDBY';
  updateHUDStatus();
}

// ── HUD stat updates ─────────────────────────────────────────────────────────
const elLinks  = document.getElementById('statLinks');
const elMode   = document.getElementById('statMode');
const elStatus = document.getElementById('statStatus');

function updateHUDStatus() {
  if (elLinks)  elLinks.textContent  = String(nLinks);
  if (elMode)   elMode.textContent   = ctrlMode;
  if (elStatus) {
    elStatus.textContent = simStatus;
    elStatus.className   = 'pend-stat-value';
    if (simStatus === 'STABLE')      elStatus.classList.add('pend-stat-value--stable');
    if (simStatus === 'OSCILLATING') elStatus.classList.add('pend-stat-value--warn');
    if (simStatus === 'CRASHED')     elStatus.classList.add('pend-stat-value--fail');
  }
}

// ── UI callbacks ─────────────────────────────────────────────────────────────
initUI({
  onGainsChange(gains)     { pidGains = gains; },
  onLinkCountChange(n)     { nLinks = n; derivFn = makeDerivFn(computeAccelerations, n); reset(); updateHUDStatus(); },
  onModeChange(mode)       { ctrlMode = mode; resetPID(pidState); updateHUDStatus(); },
  onPreset(name)           { pidGains = { ...PARAMS.pidPresets[name] }; },
  onReset()                { reset(); },
  onPause(p)               { simPaused = p; if (!p) lastTime = null; },
  onSpeedChange(mult)      { speedMult = mult; },
  onNudge(impulse)         { state[nLinks + 1] += impulse; },  // kick ẋ
});

// ── Animation loop ────────────────────────────────────────────────────────────
function frame(timestamp) {
  requestAnimationFrame(frame);

  // Resize if layout changed
  resizeCanvases();

  const simW = simCanvas.width  / (devicePixelRatio || 1);
  const simH = simCanvas.height / (devicePixelRatio || 1);

  if (simStatus === 'CRASHED' || simPaused) {
    draw(simCtx, simW, simH, state, 0, nLinks, simStatus);
    return;
  }

  if (lastTime === null) { lastTime = timestamp; }
  const wallDelta = Math.min((timestamp - lastTime) / 1000, 0.1);  // cap at 100 ms
  lastTime = timestamp;

  accumulator += wallDelta * speedMult;

  let u = 0;
  while (accumulator >= PARAMS.dt) {
    if (ctrlMode === 'PID') {
      u = pidStep(pidState, state.slice(0, nLinks + 1), state.slice(nLinks + 1), pidGains, PARAMS.dt);
    } else {
      u = lqrStep(state, nLinks);
    }
    state = rk4Step(state, PARAMS.dt, derivFn, u);
    accumulator -= PARAMS.dt;

    if (checkFail(state, nLinks)) {
      simStatus = 'CRASHED';
      updateHUDStatus();
      break;
    }
  }

  // Classify status for live HUD (simple heuristic until T7 refines it)
  if (simStatus !== 'CRASHED') {
    const angleSum = Array.from({ length: nLinks }, (_, i) => Math.abs(state[i + 1]))
      .reduce((a, b) => a + b, 0);
    simStatus = angleSum < 0.05 ? 'STABLE' : 'OSCILLATING';
    updateHUDStatus();
  }

  draw(simCtx, simW, simH, state, u, nLinks, simStatus);
  updateDashboard(state, u, nLinks, unitDeg, simStatus);
}

// ── Start ─────────────────────────────────────────────────────────────────────
window.addEventListener('resize', resizeCanvases);
resizeCanvases();
updateHUDStatus();
requestAnimationFrame(frame);
