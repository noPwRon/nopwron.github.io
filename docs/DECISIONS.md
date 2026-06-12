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

## Task Completion Log

- [x] T0. Phase 0 complete, DECISIONS.md written, scope confirmed
- [x] T1. Scaffold: lab.html hub + pendulum.html with site HUD/styles, canvas renders, LAB card on index.html
- [x] T2. params.js + dynamics.js (1 link); PHYSICS.md derivation complete
- [x] T3. RK4 accumulator verified — |ΔE|/|E₀| = 1.573e-5% over 60 s (criterion: <1%) PASS
- [ ] T4. render.js: cart, link, track, vector aesthetic
- [ ] T5. controller.js: PID with anti-windup; 1-link balances with reference gains
- [ ] T6. ui.js: gain sliders, reset/pause/speed, live tuning
- [ ] T7. Dashboard: numeric readouts + strip charts for θ, θ̇, x, u
- [ ] T8. Disturbance input
- [ ] T9. Extend dynamics to n links; verify 2-link and 3-link free-swing
- [ ] T10. Link selector + fail states + presets
- [ ] T11. LQR mode + toggle
- [ ] T12. Mobile/touch pass
- [ ] T13. Polish: copy, tooltips, lab.html card styled
- [ ] T14. Final review checklist executed
