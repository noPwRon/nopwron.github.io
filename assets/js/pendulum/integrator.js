// Fixed-step RK4 integrator + accumulator pattern.
//
// Physics runs at PARAMS.dt (1/240 s), decoupled from render rate.
// The accumulator in main.js calls step() as many times as needed
// per animation frame — never with raw rAF delta time.
//
// Pure function — no DOM, no globals.
// See docs/PHYSICS.md for RK4 formulation.

// ── RK4 step ───────────────────────────────────────────────────────────────
// state:   Float64Array or Array — [q..., qdot...]  (length 2*(n+1))
// dt:      timestep in seconds
// derivFn: (state, u) → dstate/dt  (same shape as state)
// u:       current control force (scalar)
// Returns new state (same shape, not mutated from input).
export function rk4Step(state, dt, derivFn, u) {
  const k1 = derivFn(state, u);
  const s2 = state.map((v, i) => v + 0.5 * dt * k1[i]);
  const k2 = derivFn(s2, u);
  const s3 = state.map((v, i) => v + 0.5 * dt * k2[i]);
  const k3 = derivFn(s3, u);
  const s4 = state.map((v, i) => v + dt * k3[i]);
  const k4 = derivFn(s4, u);
  return state.map((v, i) => v + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
}

// ── State derivative wrapper ────────────────────────────────────────────────
// Wraps computeAccelerations for use with rk4Step.
// state layout: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]  (length 2*(n+1))
// Returns:      [ẋ, θ̇₁,…,θ̇ₙ, ẍ, θ̈₁,…,θ̈ₙ]
export function makeDerivFn(computeAccelerations, n) {
  const dim = n + 1;
  return function deriv(state, u) {
    const q    = state.slice(0, dim);
    const qdot = state.slice(dim);
    const qddot = computeAccelerations(q, qdot, u, n);
    return [...qdot, ...qddot];
  };
}
