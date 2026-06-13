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
  maxForce: 20.0,         // N — saturation limit on control output
  integralClamp: 5.0,     // N·s — anti-windup clamp on PID integral term

  // ── PID presets (gains: { Kp, Ki, Kd, xKp, xKd }) ─────────
  // Cascade structure: outer loop computes θ_ref = clamp(-xKp·x - xKd·ẋ, ±0.2rad),
  // inner PD drives θ₁ → θ_ref. xKp/xKd units: rad/m and rad/(m/s).
  pidPresets: {
    'TUNED':             { Kp: 50,  Ki: 0.5, Kd: 12,  xKp: 0.05, xKd: 0.2 },
    'UNDERDAMPED':       { Kp: 25,  Ki: 0.0, Kd: 3,   xKp: 0.02, xKd: 0.1 },
    'CRITICALLY DAMPED': { Kp: 80,  Ki: 1.0, Kd: 18,  xKp: 0.08, xKd: 0.3 },
    'UNSTABLE':          { Kp: 5,   Ki: 0.0, Kd: 0.5, xKp: 0.0,  xKd: 0.0 },
  },

  // ── LQR gains (computed offline via continuous Riccati equation, T11) ──
  // u = −K · z  where z = [x, θ₁,…,θₙ, ẋ, θ̇₁,…,θ̇ₙ]
  // Q = diag([1, 200×n, 0.5, 10×n]),  R = 0.01
  // Verified: all three link counts stabilise from θ₀=0.10 and ẋ₀=2 m/s impulse.
  lqrGains: {
    1: [-10.0, -204.0361, -21.0758, -40.6922],
    2: [10.0, -568.5984, 858.9738, 25.8617, 7.8914, 98.8117],
    3: [-10.0, -668.2167, 3438.9155, -3199.1197, -29.8565, 8.2321, 98.3774, -263.7155],
  },

  // ── Rendering ─────────────────────────────────────────
  pixelsPerMetre: 150,  // canvas pixels per metre at 1× DPR
  cartWidth:  0.24,     // m
  cartHeight: 0.12,     // m
  linkWidth:  0.025,    // m (drawn width)
  bobRadius:  0.045,    // m (tip bob radius)
};
