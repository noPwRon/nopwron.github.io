// PID and LQR controllers.
// Both are pure functions (state in → force out).
// Anti-windup on PID integral term is clamped, not back-calculated.
// See docs/PHYSICS.md for LQR gain derivation method.

import { PARAMS } from './params.js';

// ── PID ─────────────────────────────────────────────────────────────────────
// Operates on θ₁ error (angle of first link from vertical).
// Secondary weak loop on cart position x prevents track drift.
//
// pidState: { integral, prevError }  — mutated each call (caller owns it)
// q, qdot:  current state vectors
// gains:    { Kp, Ki, Kd, xKp }
// dt:       timestep (s)
// Returns:  force u (N), clamped to ±PARAMS.maxForce
export function pidStep(pidState, q, qdot, gains, dt) {
  // TODO T5: implement PID with anti-windup
  return 0;
}

// Reset PID integrator (call on mode switch, reset, link count change)
export function resetPID(pidState) {
  pidState.integral  = 0;
  pidState.prevError = 0;
}

// ── LQR ─────────────────────────────────────────────────────────────────────
// Full-state feedback: u = -K · (state - x_ref)
// x_ref is the upright equilibrium: all zeros.
// K is a row vector hardcoded in PARAMS.lqrGains[n].
//
// state: [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]  (length 2*(n+1))
// n:     link count
// Returns: force u (N), clamped to ±PARAMS.maxForce
export function lqrStep(state, n) {
  // TODO T11: populate PARAMS.lqrGains and implement multiplication
  return 0;
}
