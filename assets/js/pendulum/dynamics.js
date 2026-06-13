// Equations of motion for n-link cart-pole system (n = 1, 2, or 3).
// Derives from Lagrangian mechanics in matrix form:
//   M(q)·q̈ = τ(q, q̇, u)
// where q = [x, θ₁, …, θₙ] (absolute angles from vertical).
//
// Solved each step for q̈ via Gaussian elimination with partial pivoting.
// Pure function — no DOM, no globals, no side effects.
// Full derivation: docs/PHYSICS.md.

import { PARAMS } from './params.js';

// ── Gaussian elimination with partial pivoting ──────────────────────────────
// Solves Ax = b (in-place). A is n×n (Array of rows), b is length-n Array.
// Returns b, overwritten with the solution x.
function gaussElim(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    for (let row = col + 1; row < n; row++) {
      const f = A[row][col] / A[col][col];
      b[row] -= f * b[col];
      for (let k = col; k < n; k++) A[row][k] -= f * A[col][k];
    }
  }
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
  return computeNLink(q, qdot, u, n);
}

// ── General n-link Lagrangian EOM ────────────────────────────────────────────
//
// Mass matrix M (n+1)×(n+1), symmetric:
//
//   M[0][0]  = M_cart + Σmₖ   (total system mass)
//   M[0][i]  = Mᵢ·cosθᵢ       where Mᵢ = lᵢ·(mᵢ/2 + Σₖ>ᵢ mₖ)
//   M[i][i]  = lᵢ²·(mᵢ/3 + Σₖ>ᵢ mₖ)
//   M[i][j]  = lᵢ·Mⱼ·cos(θᵢ−θⱼ)   (i < j, both ≥ 1)
//
// RHS τ (centripetal + gravity + damping + control):
//
//   τ[0] = u − bc·ẋ + Σⱼ Mⱼ·sinθⱼ·θ̇ⱼ²
//   τ[i] = Mᵢ·g·sinθᵢ − bᵢ·θ̇ᵢ
//          − Σⱼ<ᵢ lⱼ·Mᵢ·sin(θᵢ−θⱼ)·θ̇ⱼ²
//          − Σⱼ>ᵢ lᵢ·Mⱼ·sin(θᵢ−θⱼ)·θ̇ⱼ²
//
// Solves M·q̈ = τ by Gaussian elimination with partial pivoting.
// Maximum system size for n=3 is 4×4 — negligible per-step cost.
function computeNLink(q, qdot, u, n) {
  const { cartMass: M_cart, linkMass: mArr, linkLength: lArr, linkDamping: bArr,
          cartDamping: bc, gravity: g } = PARAMS;

  // Suffix mass sums: sumM[i] = Σₖ₌ᵢⁿ mₖ  (1-indexed, sumM[n+1] = 0)
  const sumM = new Array(n + 2).fill(0);
  for (let i = n; i >= 1; i--) sumM[i] = sumM[i + 1] + mArr[i - 1];

  // Mᵢ = lᵢ·(mᵢ/2 + Σₖ>ᵢ mₖ) — effective moment arm for coupling
  // Iᵢᵢ = lᵢ²·(mᵢ/3 + Σₖ>ᵢ mₖ) — diagonal entry (moment of inertia about pivot)
  const Mcoup = new Array(n + 1); // Mcoup[i] for i = 1..n
  const Idiag = new Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const li = lArr[i - 1], mi = mArr[i - 1], tail = sumM[i + 1];
    Mcoup[i] = li * (mi / 2 + tail);
    Idiag[i] = li * li * (mi / 3 + tail);
  }

  const dim = n + 1;

  // ── Build mass matrix ────────────────────────────────────────────────────
  const A = Array.from({ length: dim }, () => new Array(dim).fill(0));

  A[0][0] = M_cart + sumM[1];  // total system mass

  for (let i = 1; i <= n; i++) {
    const ci = Math.cos(q[i]);
    A[0][i] = A[i][0] = Mcoup[i] * ci;
    A[i][i] = Idiag[i];
  }

  for (let i = 1; i <= n; i++) {
    for (let j = i + 1; j <= n; j++) {
      const val = lArr[i - 1] * Mcoup[j] * Math.cos(q[i] - q[j]);
      A[i][j] = A[j][i] = val;
    }
  }

  // ── Build RHS ────────────────────────────────────────────────────────────
  const b = new Array(dim).fill(0);

  // τ[0]: cart equation
  b[0] = u - bc * qdot[0];
  for (let j = 1; j <= n; j++) {
    b[0] += Mcoup[j] * Math.sin(q[j]) * qdot[j] * qdot[j];
  }

  // τ[i]: link i angle equation
  for (let i = 1; i <= n; i++) {
    b[i] = Mcoup[i] * g * Math.sin(q[i]) - bArr[i - 1] * qdot[i];

    // Centripetal coupling from links j < i (use lⱼ)
    for (let j = 1; j < i; j++) {
      b[i] -= lArr[j - 1] * Mcoup[i] * Math.sin(q[i] - q[j]) * qdot[j] * qdot[j];
    }
    // Centripetal coupling from links j > i (use lᵢ)
    for (let j = i + 1; j <= n; j++) {
      b[i] -= lArr[i - 1] * Mcoup[j] * Math.sin(q[i] - q[j]) * qdot[j] * qdot[j];
    }
  }

  return gaussElim(A, b);
}
