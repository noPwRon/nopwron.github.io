// All physical constants and simulation parameters in one place.
// Edit here; do not scatter magic numbers across other modules.

export const PARAMS = {
  // ── Cart ──────────────────────────────────────────────
  cartMass: 1.0,         // kg
  cartDamping: 0.1,      // N·s/m  (viscous friction on track)
  trackHalfLength: 2.0,  // m  (cart x clamped to [-2, 2])

  // ── Links (arrays, index 0 = link closest to cart) ───
  linkMass:    [0.3,  0.3,  0.3 ],  // kg
  linkLength:  [0.5,  0.4,  0.3 ],  // m
  linkDamping: [0.01, 0.01, 0.01],  // N·m·s/rad (joint viscous damping)

  // ── Physics ───────────────────────────────────────────
  gravity: 9.81,  // m/s²

  // ── Simulation ────────────────────────────────────────
  dt: 1 / 240,    // physics timestep (s); integrator runs at this rate
  fallThreshold: Math.PI * 0.75,  // rad from upright → fail state

  // ── Controller ────────────────────────────────────────
  maxForce: 20.0,          // N — saturation limit on control output
  integralClamp: 10.0,     // N·s — anti-windup clamp on PID integral term

  // ── PID presets (gains: { Kp, Ki, Kd, xKp }) ─────────
  // xKp: weak secondary loop on cart position to prevent drift
  pidPresets: {
    'TUNED':             { Kp: 50,  Ki: 1.0, Kd: 12,  xKp: 0.5 },
    'UNDERDAMPED':       { Kp: 25,  Ki: 0.5, Kd: 3,   xKp: 0.3 },
    'CRITICALLY DAMPED': { Kp: 80,  Ki: 2.0, Kd: 18,  xKp: 0.8 },
    'UNSTABLE':          { Kp: 5,   Ki: 0.0, Kd: 0.5, xKp: 0.0 },
  },

  // ── LQR gains (computed offline, hardcoded per link count) ──
  // State vector: [x, θ₁, (θ₂, θ₃), ẋ, θ̇₁, (θ̇₂, θ̇₃)]
  // K row vector: u = -K · (state - reference)
  // Placeholder — will be filled after PHYSICS.md derivation in T2/T9/T11
  lqrGains: {
    1: null,  // [Kx, Kθ1, Kxdot, Kθ1dot]
    2: null,  // [Kx, Kθ1, Kθ2, Kxdot, Kθ1dot, Kθ2dot]
    3: null,  // [Kx, Kθ1, Kθ2, Kθ3, Kxdot, Kθ1dot, Kθ2dot, Kθ3dot]
  },

  // ── Rendering ─────────────────────────────────────────
  pixelsPerMetre: 150,  // canvas pixels per metre at 1× DPR
  cartWidth:  0.24,     // m
  cartHeight: 0.12,     // m
  linkWidth:  0.025,    // m (drawn width)
  bobRadius:  0.045,    // m (tip bob radius)
};
