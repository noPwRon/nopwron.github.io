// PID and LQR controllers.
// Both are pure functions (state in → force out).
// Anti-windup: integral clamped before accumulation (not back-calculated).
// LQR gains computed offline — see docs/PHYSICS.md §5.2 for method.

import { PARAMS } from './params.js';

// Angle reference clamp — keeps cascade outer-loop reference within a safe range.
// Prevents the centering correction from exceeding ~11° and destabilising the angle.
const THETA_REF_MAX = 0.20; // rad ≈ 11.5°

// ── PID ─────────────────────────────────────────────────────────────────────
// Cascade structure: outer loop sets angle reference from cart position/velocity;
// inner PD loop drives θ₁ → θ_ref.
//
// Additive structure (error = θ₁, u = Kp·θ + Kd·θ̇ − xKp·x) fails because the
// angle term exactly cancels the centering term at steady state, leaving the cart
// with zero restoring force. Cascade avoids this by generating a signed angle
// reference that keeps the net force direction correct via the pendulum's inertia.
//
// For 2–3 links: same PID on θ₁ only — will visibly fail (by design).
//
// pidState: { integral, prevError }  — mutable, owned by caller
// q:        [x, θ₁, …, θₙ]
// qdot:     [ẋ, θ̇₁, …, θ̇ₙ]
// gains:    { Kp, Ki, Kd, xKp, xKd }
// dt:       physics timestep (s)
// Returns:  force u (N), clamped to ±PARAMS.maxForce
export function pidStep(pidState, q, qdot, gains, dt) {
  const theta1 = q[1];
  const x      = q[0];
  const xdot   = qdot[0];
  const { Kp, Ki, Kd, xKp, xKd = 0 } = gains;

  // Outer loop: desired angle reference from cart displacement and velocity.
  // θ_ref < 0 when x > 0 (pendulum leans left to pull cart back to centre).
  const thetaRef = clamp(-xKp * x - xKd * xdot, -THETA_REF_MAX, THETA_REF_MAX);

  // Inner loop error relative to angle reference.
  // θ̈ = 35.6·θ − 2.79·u: u > 0 when θ > thetaRef (tilt right of reference) stabilises.
  const error  = theta1 - thetaRef;
  const dError = qdot[1];  // θ̇₁ directly — avoids finite-difference noise
  pidState.prevError = error;

  // Integral with anti-windup clamp
  pidState.integral = clamp(
    pidState.integral + error * dt,
    -PARAMS.integralClamp,
    PARAMS.integralClamp,
  );

  return clamp(
    Kp * error + Ki * pidState.integral + Kd * dError,
    -PARAMS.maxForce,
    PARAMS.maxForce,
  );
}

// Reset integrator — call on mode change, link count change, or reset
export function resetPID(pidState) {
  pidState.integral  = 0;
  pidState.prevError = 0;
}

// ── LQR ─────────────────────────────────────────────────────────────────────
// Full-state feedback: u = −K · z  where z is deviation from upright equilibrium.
// State layout: [x, θ₁, …, θₙ, ẋ, θ̇₁, …, θ̇ₙ]
//
// Gains in PARAMS.lqrGains[n] computed offline via continuous CARE (see PHYSICS.md §5.2).
// Returns 0 until gains are populated in T11.
export function lqrStep(state, n) {
  const K = PARAMS.lqrGains[n];
  if (!K) return 0;  // gains not yet computed

  let u = 0;
  for (let i = 0; i < K.length; i++) u -= K[i] * state[i];
  return clamp(u, -PARAMS.maxForce, PARAMS.maxForce);
}

// ── Utility ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
