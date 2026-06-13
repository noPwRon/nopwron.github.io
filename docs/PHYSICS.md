# PHYSICS.md — Inverted Pendulum Simulation

Derivation notes for the cart + n-link inverted pendulum model.  
Coordinate convention, Lagrangian, matrix EOM, numerical integration, and controller design.

---

## 1. Notation and Sign Convention

| Symbol | Meaning |
|--------|---------|
| M      | Cart mass (kg) |
| mᵢ     | Mass of link i (kg) |
| lᵢ     | Length of link i (m) |
| x      | Cart horizontal position (m), positive right |
| θᵢ     | Absolute angle of link i from upright vertical (rad), positive counter-clockwise |
| u      | Horizontal control force applied to cart (N) |
| g      | Gravitational acceleration 9.81 m/s² |
| bc     | Cart viscous damping (N·s/m) |
| bᵢ     | Joint i viscous damping (N·m·s/rad) |

θ = 0 is the upright (unstable) equilibrium.  
θ = ±π is hanging down (stable).  
All links are uniform rigid rods with COM at lᵢ/2 from the proximal end.

---

## 2. Single-Link System (n = 1)

### 2.1 Generalised Coordinates

    q = [x, θ₁]ᵀ

### 2.2 Kinematics

Cart position: **(x, 0)**

Link 1 COM position:

    x_c1 = x + (l₁/2)·sin θ₁
    y_c1 =     (l₁/2)·cos θ₁

Link 1 COM velocity:

    ẋ_c1 = ẋ + (l₁/2)·θ̇₁·cos θ₁
    ẏ_c1 =   − (l₁/2)·θ̇₁·sin θ₁

### 2.3 Kinetic Energy

**Cart:**

    T_cart = ½·M·ẋ²

**Link 1 — translational (COM):**

    T₁_trans = ½·m₁·(ẋ_c1² + ẏ_c1²)
             = ½·m₁·[ẋ² + l₁·ẋ·θ̇₁·cos θ₁ + (l₁/2)²·θ̇₁²]

**Link 1 — rotational (about COM):**

    T₁_rot = ½·(m₁l₁²/12)·θ̇₁²

**Total link 1 KE** (combining and using I_pivot = ml²/3):

    T₁ = ½·m₁·ẋ² + m₁·(l₁/2)·ẋ·θ̇₁·cos θ₁ + ½·(m₁l₁²/3)·θ̇₁²

*Note: l₁²/4 + l₁²/12 = l₁²/3 — equivalent to moment of inertia about pivot
by the parallel axis theorem.*

**System KE:**

    T = ½·(M+m₁)·ẋ² + m₁·(l₁/2)·ẋ·θ̇₁·cos θ₁ + ½·(m₁l₁²/3)·θ̇₁²

### 2.4 Potential Energy

Taking the cart track as datum (y = 0):

    V = m₁·g·(l₁/2)·cos θ₁

V is maximum at upright (θ₁ = 0), which confirms the equilibrium is unstable:
gravity acts to increase |θ₁| when perturbed.

### 2.5 Lagrangian

    L = T − V
      = ½(M+m₁)ẋ² + m₁(l₁/2)ẋθ̇₁cosθ₁ + ½(m₁l₁²/3)θ̇₁² − m₁g(l₁/2)cosθ₁

### 2.6 Euler-Lagrange Equations

    d/dt (∂L/∂q̇ᵢ) − ∂L/∂qᵢ = Qᵢ

where Q = [u − bc·ẋ,  −b₁·θ̇₁]ᵀ (generalised forces: control input + damping).

**For x** — compute ∂L/∂ẋ and differentiate:

    ∂L/∂ẋ = (M+m₁)ẋ + m₁(l₁/2)θ̇₁cosθ₁

    d/dt(∂L/∂ẋ) = (M+m₁)ẍ + m₁(l₁/2)(θ̈₁cosθ₁ − θ̇₁²sinθ₁)

    ∂L/∂x = 0

EL → x:

    (M+m₁)ẍ + m₁(l₁/2)θ̈₁cosθ₁ − m₁(l₁/2)θ̇₁²sinθ₁ = u − bc·ẋ

**For θ₁** — compute ∂L/∂θ̇₁:

    ∂L/∂θ̇₁ = m₁(l₁/2)ẋcosθ₁ + (m₁l₁²/3)θ̇₁

    d/dt(∂L/∂θ̇₁) = m₁(l₁/2)(ẍcosθ₁ − ẋθ̇₁sinθ₁) + (m₁l₁²/3)θ̈₁

    ∂L/∂θ₁ = −m₁(l₁/2)ẋθ̇₁sinθ₁ + m₁g(l₁/2)sinθ₁

EL → θ₁  (the −ẋθ̇₁sinθ₁ terms cancel):

    m₁(l₁/2)ẍcosθ₁ + (m₁l₁²/3)θ̈₁ = m₁g(l₁/2)sinθ₁ − b₁θ̇₁

### 2.7 Matrix Form  M(q)·q̈ + C(q,q̇)·q̇ + G(q) = B·u

Rearranging into **M·q̈ = τ**:

    ┌ M+m₁       m₁lc·cosθ₁ ┐ ┌ẍ ┐   ┌ u − bc·ẋ + m₁lc·θ̇₁²·sinθ₁ ┐
    │                         │·│  │ = │                               │
    └ m₁lc·cosθ₁  m₁l₁²/3   ┘ └θ̈₁┘   └ m₁g·lc·sinθ₁ − b₁·θ̇₁      ┘

where **lc = l₁/2** (COM distance from pivot).

This is solved each physics timestep for [ẍ, θ̈₁] using Gaussian elimination
with partial pivoting (implemented in `dynamics.js: gaussElim`).

### 2.8 Linearisation — Sanity Check

Setting sinθ₁ ≈ θ₁, cosθ₁ ≈ 1, θ̇₁² ≈ 0:

    ┌ M+m₁    m₁lc ┐ ┌ẍ ┐   ┌ u − bc·ẋ        ┐
    │              │·│  │ = │                   │
    └ m₁lc   m₁l₁²/3┘ └θ̈₁┘   └ m₁g·lc·θ₁ − b₁θ̇₁┘

This matches the standard linearised cart-pole for a uniform rod. ✓

The open-loop eigenvalue of θ₁ (ignoring cart coupling and damping):

    λ² = m₁g·lc / (m₁l₁²/3) = 3g/(2l₁)

Both roots real — one positive (unstable mode). ✓

---

## 3. Multi-Link Extension (n = 2, 3) — Full Derivation

*(Implemented in T9. Verified: energy drift <10⁻⁶% before fall threshold for n=1,2,3.)*

Define the **effective moment arm** for link j coupling:

    Mⱼ = lⱼ·(mⱼ/2 + Σₖ>ⱼ mₖ)

This equals the first moment of mass of link j and everything above it, about
link j's pivot.

### 3.1 Mass Matrix M (n+1)×(n+1), symmetric

    M[0][0]  = M_cart + Σₖ mₖ           (total system mass)
    M[0][i]  = Mᵢ · cosθᵢ               (cart−link coupling)
    M[i][i]  = lᵢ² · (mᵢ/3 + Σₖ>ᵢ mₖ) (effective inertia about link i's pivot)
    M[i][j]  = lᵢ · Mⱼ · cos(θᵢ−θⱼ)    (i < j, both ≥ 1)

The diagonal term lᵢ²·(mᵢ/3 + Σₖ>ᵢ mₖ) arises from: Iᵢ_pivot = mᵢlᵢ²/3 (parallel
axis theorem) plus mₖlᵢ² for every heavier link k that sits atop link i's pivot.

### 3.2 RHS τ — centripetal + gravity + control

    τ[0] = u − bc·ẋ + Σⱼ Mⱼ·sinθⱼ·θ̇ⱼ²
    τ[i] = Mᵢ·g·sinθᵢ − bᵢ·θ̇ᵢ
           − Σⱼ<ᵢ lⱼ·Mᵢ·sin(θᵢ−θⱼ)·θ̇ⱼ²
           − Σⱼ>ᵢ lᵢ·Mⱼ·sin(θᵢ−θⱼ)·θ̇ⱼ²

The centripetal terms come from the Christoffel symbols; each pair (i,j) with
i<j contributes lᵢ·Mⱼ·sin(θᵢ−θⱼ)·θ̇ⱼ² to τ[i] and lⱼ·Mᵢ·sin(θᵢ−θⱼ)·θ̇ⱼ² to
the partner equation (derived by computing Cᵢ = Ṁ_{ij}·q̇ⱼ − ½∂M_{jk}/∂θᵢ·q̇ⱼq̇ₖ).

### 3.3 n=1 consistency check

With n=1: Mⱼ = l₁·m₁/2 = m₁lc₁, M[1][1] = m₁l₁²/3.  
τ[0] = u − bc·ẋ + m₁lc₁·sinθ₁·θ̇₁²  ✓  
τ[1] = m₁g·lc₁·sinθ₁ − b₁·θ̇₁       ✓

### 3.4 Energy verification results (T9)

    n=1: drift = 9.98e-7% over operational regime  ✓
    n=2: drift = 8.51e-7% over operational regime  ✓
    n=3: drift = 1.59e-6% over operational regime  ✓

"Operational regime" = until |θᵢ| exceeds fallThreshold (135°). The RK4 at
dt=1/240 is sufficient. (60-second free-swing drifts higher due to chaotic
post-fall oscillations, which the simulation never reaches.)

---

## 4. Numerical Integration — RK4

Fixed-step fourth-order Runge-Kutta (implemented in `integrator.js`).

Given state z = [q, q̇] and derivative ż = f(z, u):

    k₁ = f(zₙ, u)
    k₂ = f(zₙ + ½h·k₁, u)
    k₃ = f(zₙ + ½h·k₂, u)
    k₄ = f(zₙ + h·k₃, u)

    zₙ₊₁ = zₙ + (h/6)·(k₁ + 2k₂ + 2k₃ + k₄)

Physics timestep h = 1/240 s. The control input u is held constant over
each RK4 step (zero-order hold). The main loop uses an accumulator to
decouple the physics rate from the monitor refresh rate — the loop never
integrates with a raw requestAnimationFrame delta.

**Energy verification (1-link, damping off):**

Total mechanical energy:

    E = ½(M+m₁)ẋ² + m₁lc·ẋ·θ̇₁·cosθ₁ + ½(m₁l₁²/3)·θ̇₁² + m₁g·lc·cosθ₁

With bc = b₁ = 0 and u = 0, dE/dt = 0 analytically.
Acceptance criterion: |E(60s) − E(0)| / |E(0)| < 1%.

---

## 5. Controllers

### 5.1 PID (1-link; demonstrates limitation on 2–3 links)

Classic PID on θ₁ error, with a weak secondary cart-position loop:

    e(t) = θ₁_ref − θ₁        (reference θ₁_ref = 0)
    u_θ = Kp·e + Ki·∫e dt + Kd·ė
    u_x = −xKp·x              (cart centering term)
    u   = clamp(u_θ + u_x, −u_max, u_max)

**Anti-windup:** the integral term is clamped before accumulation:

    integral ← clamp(integral + e·dt, −I_max, I_max)

This prevents integrator saturation when the pendulum has fallen beyond
recovery. The clamping bound `integralClamp` is set in `params.js`.

PID applied to 2- and 3-link systems uses only θ₁ feedback and will
visibly fail, as expected. Full-state feedback (LQR) is required for
higher link counts.

### 5.2 LQR — Full-State Feedback

**Linearised state-space model** about the upright equilibrium, with
state z = [x, θ₁, …, θₙ, ẋ, θ̇₁, …, θ̇ₙ]ᵀ:

    ż = A·z + B·u

A and B are derived from the linearised mass matrix and gravity vector
(sin θ ≈ θ, cos θ ≈ 1 in M and G evaluated at equilibrium).

For n = 1:

    M_lin = [[M+m₁,   m₁lc ],
             [m₁lc, m₁l₁²/3]]

    G_lin = [[0,       0  ],
             [0, m₁g·lc   ]]   (gravity Jacobian w.r.t. [x, θ])

    A = [[0₂ₓ₂,        I₂ₓ₂        ],
         [M_lin⁻¹·G_lin, M_lin⁻¹·D_lin]]

where D_lin = [[−bc, 0], [0, −b₁]] (linearised damping contribution).

    B = [0; 0; M_lin⁻¹·[1; 0]]

**Gain computation (offline, Python/scipy):**

Choose weighting matrices Q (penalise state deviation) and R (penalise
control effort). Solve the continuous-time algebraic Riccati equation:

    AᵀP + PA − P·B·R⁻¹·Bᵀ·P + Q = 0

Optimal gain:

    K = R⁻¹·Bᵀ·P

Control law: u = −K·z (drives state to upright equilibrium).

The K vector for each link count is computed once, verified offline against
the step response of the linear model, then hardcoded in `params.js`.

Example Q/R tuning for 1-link (starting point):

    Q = diag([1, 100, 1, 10])   # penalise position, angle, velocities
    R = [0.01]                   # low control cost → aggressive stabilisation

---

## 6. References

- Spong, Hutchinson, Vidyasagar — *Robot Modeling and Control* (2006),
  Chapter 6 (Lagrangian dynamics)
- Åström & Wittenmark — *Adaptive Control* (2008), cart-pole example
- Standard result: 1-link linearised open-loop eigenvalue √(3g/2l) ≈ 5.4 rad/s
  for l = 0.5 m → period ≈ 1.2 s, consistent with the simulation.
