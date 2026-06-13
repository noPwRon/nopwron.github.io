# DECISIONS.md — Inverted Pendulum Simulation

Phase 0 answers recorded 2026-06-12. Approved by Jeremy Guido.

---

## Phase 0 Answers

**Q1: Link count / controller plan**
LQR is in scope for v1 (revised from initial "defer"). All three link counts (1, 2, 3)
are stabilizable with LQR full-state feedback. PID mode remains available to demonstrate
its limitations on 2–3 link systems. This contrast (PID fails, LQR succeeds, same
physical plant) is the core portfolio value.

**Q2: Page placement**
DEVIATION APPROVED: Simulation does not live under `/engineering/`.
A new "LAB" discipline section is added as a 4th card on `index.html`.
Hub page: `/lab/lab.html`. Simulation: `/lab/pendulum.html`.
Future simulations (robot sim) will also live under `/lab/`.

**Q3: Disturbance input**
Yes. User can apply impulse disturbances (click/drag on canvas + nudge button).

**Q4: Mobile support**
Full touch and desktop support. Not desktop-first.

**Q5: Units display**
Both radians and degrees with a toggle in the dashboard.

**Q6: Preset gains**
Yes. Named PID presets ship with v1: Underdamped, Critically Damped, Tuned, Unstable.

**Q7: LQR**
In scope for v1. Gains computed offline via continuous-time LQR (solve algebraic
Riccati equation), hardcoded per link count in `params.js`. Method documented in
`PHYSICS.md`.

---

## Approved Deviations from Spec

| ID     | Description |
|--------|-------------|
| DEV-01 | Page placement: `/lab/` hub instead of `/engineering/pendulum.html` |
| DEV-02 | `components.css` does not exist on the site; styles come from `tokens.css` + `base.css` |
| DEV-03 | LQR moved from stretch goal (Q7 "defer") to v1 scope |

---

## Confirmed v1 Scope

Vanilla JS + HTML5 Canvas inverted pendulum simulation. New "LAB" section as a 4th
discipline card on `index.html`, hub at `/lab/lab.html`, simulation at
`/lab/pendulum.html`. Supports 1, 2, and 3 rigid links. Two controller modes: PID
(demonstrates limitations on 2–3 links) and LQR (stabilises all three — gains computed
offline and hardcoded per link count). User can apply impulse disturbances. Full desktop
and touch support. Dashboard shows both radians and degrees with a toggle. Ships with
named PID gain presets.

---

## Architecture Note — PID Cart-Centering Structure

**Additive structure fails (discovered during T5 verification):**
`u = Kp·θ + Kd·θ̇ − xKp·x − xKd·ẋ` — at steady state the angle term exactly cancels
the centering term: the angle equilibrium settles to θ_ss = xKp·x/Kp, giving u_ss = 0.
The cart receives zero net restoring force and coasts to the track wall.

**Cascade structure used instead:**
Outer loop: `θ_ref = clamp(−xKp·x − xKd·ẋ, ±0.2 rad)` — sets target lean angle.
Inner PD: `u = Kp·(θ − θ_ref) + Kd·θ̇₁` — drives pendulum toward reference.
When x > 0, θ_ref < 0 (lean left). The pendulum gravity then pulls the cart back left.
This is the non-minimum-phase "tipping" manoeuvre: system briefly moves wrong-way before
returning. Verified: mxX < 0.21 m from θ₀ = 0.15 rad, stable within 6 s.

PID preset gains (xKp/xKd now in rad/m and rad/(m/s)):
- TUNED: Kp=50, Ki=0.5, Kd=12, xKp=0.05, xKd=0.2
- UNDERDAMPED: Kp=25, Ki=0.0, Kd=3, xKp=0.02, xKd=0.1
- CRITICALLY DAMPED: Kp=80, Ki=1.0, Kd=18, xKp=0.08, xKd=0.3
- UNSTABLE: Kp=5, Ki=0.0, Kd=0.5, xKp=0.0, xKd=0.0 (correctly crashes)

---

## Task Completion Log

- [x] T0. Phase 0 complete, DECISIONS.md written, scope confirmed
- [x] T1. Scaffold: lab.html hub + pendulum.html with site HUD/styles, canvas renders, LAB card on index.html
- [x] T2. params.js + dynamics.js (1 link); PHYSICS.md derivation complete
- [x] T3. RK4 accumulator verified — |ΔE|/|E₀| = 1.573e-5% over 60 s (criterion: <1%) PASS
- [x] T4. render.js: cart, link, track, vector aesthetic — 358 lines, full implementation
- [x] T5. controller.js: cascade PID verified — 1-link stable from θ₀=0.15 rad, mxX<0.21 m
- [x] T6. ui.js: gain sliders, mode/link tabs, preset buttons, speed/pause/reset — live tuning wired
- [x] T7. Dashboard: numeric readouts (θ₁–θ₃, θ̇₁–θ̇₃, x, ẋ, u) + scrolling strip chart (2-panel: angles / x+u)
- [x] T8. Disturbance input: nudge button (±1.2–2.2 m/s impulse to ẋ) wired
- [x] T9. Extend dynamics to n links (general Mⱼ/Lagrangian formulation); energy drift <2e-6% before fallThreshold for n=1,2,3
- [x] T10. Link selector (tabs wired, onLinkCountChange resets state), crash detection + overlay, preset buttons — all implemented in T6
- [x] T11. LQR gains computed (CARE, Hamiltonian method) and hardcoded for n=1,2,3; all scenarios stabilise ✓
- [x] T12. Mobile/touch pass — touch-action:none on canvas, ResizeObserver, tap/swipe drag-disturbance wired
- [x] T13. Polish — LQR panel copy, button titles, TAP·SWIPE canvas hint, lab.html card reviewed ✓
- [x] T14. Final review checklist executed — 7/7 assertions passed (params, PID NMP, LQR signs, dynamics gravity, RK4 drift 2e-6%, fail detection, LQR 30s stabilisation)
