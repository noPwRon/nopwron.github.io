// UI wiring — sliders, buttons, dashboard readouts, strip chart.
// Reads from and writes to DOM. Does NOT touch physics or canvas directly.
// Emits events / calls callbacks provided by main.js.

// ── Init ────────────────────────────────────────────────────────────────────
// callbacks: {
//   onGainsChange(gains),
//   onLinkCountChange(n),
//   onModeChange(mode),       // 'PID' | 'LQR'
//   onPreset(presetName),
//   onReset(),
//   onPause(isPaused),
//   onSpeedChange(multiplier),
//   onNudge(impulse),
// }
export function initUI(callbacks) {
  // TODO T6: wire gain sliders, link tabs, mode tabs, preset buttons
  // TODO T7: wire dashboard readout elements
  // TODO T8: wire disturbance nudge button
}

// ── Dashboard update ────────────────────────────────────────────────────────
// Called every frame with current simulation state.
// state: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]
// u:     control force
// n:     link count
// unitDeg: boolean — display angles in degrees (true) or radians (false)
// mode:  'STABLE' | 'OSCILLATING' | 'CRASHED' | 'STANDBY'
export function updateDashboard(state, u, n, unitDeg, mode) {
  // TODO T7: update readout elements and trigger strip chart append
}

// ── Strip chart ─────────────────────────────────────────────────────────────
// chartCtx: 2D context of #chart canvas
// history:  circular buffer of past ~10 s of state samples
export function drawStripChart(chartCtx, history, n, unitDeg) {
  // TODO T7: scrolling strip chart for θ₁..θₙ, x, u
}
