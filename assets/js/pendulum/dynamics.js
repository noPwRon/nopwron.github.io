// Equations of motion for n-link cart-pole system (n = 1, 2, or 3).
// Derives from Lagrangian mechanics in matrix form:
//   M(q)·q̈ = τ(q, q̇, u)
// where q = [x, θ₁, …, θₙ].
//
// Solved each step for q̈ via Gaussian elimination with partial pivoting.
// Pure function — no DOM, no globals, no side effects.
// Full derivation: docs/PHYSICS.md.

import { PARAMS } from './params.js';

// ── Gaussian elimination with partial pivoting ──────────────────────────────
// Solves Ax = b (in-place). A is n×n (Array of rows), b is length-n Array.
// Returns b, overwritten with the solution x.
// Used for all link counts (2×2 for n=1, up to 4×4 for n=3).
function gaussElim(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    // Partial pivot: find row with largest absolute value in this column
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    // Eliminate below pivot
    for (let row = col + 1; row < n; row++) {
      const f = A[row][col] / A[col][col];
      b[row] -= f * b[col];
      for (let k = col; k < n; k++) A[row][k] -= f * A[col][k];
    }
  }
  // Back-substitution
  for (let row = n - 1; row >= 0; row--) {
    b[row] /= A[row][row];
    for (let k = row - 1; k >= 0; k--) b[k] -= A[k][row] * b[row];
  }
  return b;
}

// ── Public API ──────────────────────────────────────────────────────────────
// q:    [x, θ₁, …, θₙ]            (Array, length n+1)
// qdot: [ẋ, θ̇₁, …, θ̇ₙ]           (Array, length n+1)
// u:    scalar horizontal force on cart (N)
// n:    link count (1, 2, or 3)
// Returns [ẍ, θ̈₁, …, θ̈ₙ]         (Array, length n+1)
export function computeAccelerations(q, qdot, u, n) {
  if (n === 1) return compute1Link(q, qdot, u);
  // TODO T9: n=2, n=3
  return new Array(n + 1).fill(0);
}

// ── 1-Link ──────────────────────────────────────────────────────────────────
// See PHYSICS.md §2.7 for derivation.
//
// M·q̈ = τ  where
//
//   M = [[M+m,       m·lc·cosθ ],
//        [m·lc·cosθ, m·l²/3   ]]
//
//   τ = [u − bc·ẋ + m·lc·θ̇²·sinθ,
//        m·g·lc·sinθ − b·θ̇      ]
//
// m·l²/3 = moment of inertia of uniform rod about pivot (parallel axis).
function compute1Link(q, qdot, u) {
  const [, th]  = q;
  const [xd, thd] = qdot;

  const { cartMass: M, linkMass, linkLength, linkDamping,
          cartDamping: bc, gravity: g } = PARAMS;
  const m  = linkMass[0];
  const l  = linkLength[0];
  const bt = linkDamping[0];
  const lc = 0.5 * l;         // COM distance from pivot
  const Ip = m * l * l / 3;   // inertia about pivot: ml²/12 + m(l/2)² = ml²/3

  const c = Math.cos(th);
  const s = Math.sin(th);

  const A = [
    [M + m,      m * lc * c],
    [m * lc * c, Ip        ],
  ];
  const b = [
    u - bc * xd + m * lc * thd * thd * s,
    m * g * lc * s - bt * thd,
  ];

  return gaussElim(A, b);  // returns [ẍ, θ̈]
}
