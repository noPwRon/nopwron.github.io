// Equations of motion for n-link cart-pole system (n = 1, 2, or 3).
// Derives from Lagrangian mechanics in matrix form:
//   M(q)·q̈ + C(q,q̇)·q̇ + G(q) = B·u
// where q = [x, θ₁, …, θₙ].
//
// Solved each step for q̈ via Gaussian elimination.
// Pure function — no DOM, no globals, no side effects.
// See docs/PHYSICS.md for full derivation.

import { PARAMS } from './params.js';

// ── Gaussian elimination ────────────────────────────────────────────────────
// Solves Ax = b in place. A is n×n, b is length-n.
// Returns x (overwrites b). No pivoting needed for well-conditioned mass matrix.
function gaussElim(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    // Partial pivot for numerical stability
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / A[col][col];
      for (let k = col; k < n; k++) A[row][k] -= factor * A[col][k];
      b[row] -= factor * b[col];
    }
  }
  // Back-substitution
  for (let row = n - 1; row >= 0; row--) {
    b[row] /= A[row][row];
    for (let k = row - 1; k >= 0; k--) {
      b[k] -= A[k][row] * b[row];
    }
  }
  return b;
}

// ── Public API ──────────────────────────────────────────────────────────────
// q:    [x, θ₁, …, θₙ]            (length n+1)
// qdot: [ẋ, θ̇₁, …, θ̇ₙ]           (length n+1)
// u:    scalar horizontal force on cart (N)
// n:    link count (1, 2, or 3)
// Returns qddot: [ẍ, θ̈₁, …, θ̈ₙ]  (length n+1)
//
// Implementation is stubbed until T2 (1 link) and T9 (n links).
export function computeAccelerations(q, qdot, u, n) {
  // TODO T2: implement 1-link Lagrangian EOM
  // TODO T9: generalise to n links
  const dim = n + 1;
  return new Array(dim).fill(0);
}
