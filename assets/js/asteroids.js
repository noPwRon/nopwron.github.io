const isMobile = window.matchMedia("(max-width: 980px)").matches;

if (isMobile) {
  document.getElementById("game")?.remove();
  document.querySelector(".right")?.remove();
  document.getElementById("togglePause")?.remove();
  document.body.style.overflow = "auto";
} else {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    score: document.getElementById("score"),
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    highScore: document.getElementById("highScore"),
    centerMessage: document.getElementById("centerMessage"),
    pauseBtn: document.getElementById("togglePause"),
  };

  let width = 0;
  let height = 0;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  const keys = new Set();
  let started = false;
  let paused = false;
  let gameOver = false;
  let score = 0;
  let lives = 3;
  let wave = 1;
  let highScore = Number(localStorage.getItem("retroResumeHighScore") || 0);
  ui.highScore.textContent = highScore;

  const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 14,
    invulnerable: 0,
    cooldown: 0,
  };

  let bullets = [];
  let asteroids = [];
  let particles = [];

  function resetShip() {
    ship.x = width / 2;
    ship.y = height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invulnerable = 2.5;
    ship.cooldown = 0;
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function wrap(obj) {
    if (obj.x < -30) obj.x = width + 30;
    if (obj.x > width + 30) obj.x = -30;
    if (obj.y < -30) obj.y = height + 30;
    if (obj.y > height + 30) obj.y = -30;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function spawnAsteroid(size = 3, x, y) {
    let ax = x;
    let ay = y;

    if (ax == null || ay == null) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        ax = Math.random() * width;
        ay = -20;
      } else if (edge === 1) {
        ax = width + 20;
        ay = Math.random() * height;
      } else if (edge === 2) {
        ax = Math.random() * width;
        ay = height + 20;
      } else {
        ax = -20;
        ay = Math.random() * height;
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const speedBase = 25 + wave * 6;
    const scale = size === 3 ? 1 : size === 2 ? 1.35 : 1.8;
    const radius = size === 3 ? 46 : size === 2 ? 28 : 16;
    const points = [];
    const count = 9 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const r = radius * randomRange(0.72, 1.15);
      points.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
    }

    asteroids.push({
      x: ax,
      y: ay,
      vx: Math.cos(angle) * randomRange(speedBase * 0.55, speedBase * 0.95) * scale,
      vy: Math.sin(angle) * randomRange(speedBase * 0.55, speedBase * 0.95) * scale,
      angle: Math.random() * Math.PI * 2,
      spin: randomRange(-1.2, 1.2),
      size,
      radius,
      points,
    });
  }

  function spawnWave() {
    const count = Math.min(4 + wave, 11);
    let spawned = 0;

    while (spawned < count) {
      spawnAsteroid(3);
      const a = asteroids[asteroids.length - 1];
      if (distance(a, ship) < 220) {
        asteroids.pop();
        continue;
      }
      spawned++;
    }

    ui.wave.textContent = wave;
  }

  function createExplosion(x, y, n = 18) {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(20, 150);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.35, 0.9),
        maxLife: randomRange(0.35, 0.9),
      });
    }
  }

  function fireBullet() {
    if (ship.cooldown > 0 || gameOver) return;

    bullets.push({
      x: ship.x + Math.cos(ship.angle) * ship.radius,
      y: ship.y + Math.sin(ship.angle) * ship.radius,
      vx: ship.vx + Math.cos(ship.angle) * 420,
      vy: ship.vy + Math.sin(ship.angle) * 420,
      life: 1.05,
    });

    ship.cooldown = 0.18;

    if (!started) {
      started = true;
      ui.centerMessage.classList.add("hidden");
    }
  }

  function splitAsteroid(index) {
    const asteroid = asteroids[index];
    score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
    ui.score.textContent = score;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("retroResumeHighScore", String(highScore));
      ui.highScore.textContent = highScore;
    }

    createExplosion(asteroid.x, asteroid.y, asteroid.size === 3 ? 14 : 10);

    if (asteroid.size > 1) {
      spawnAsteroid(asteroid.size - 1, asteroid.x, asteroid.y);
      spawnAsteroid(asteroid.size - 1, asteroid.x, asteroid.y);
    }

    asteroids.splice(index, 1);

    if (asteroids.length === 0) {
      wave += 1;
      spawnWave();
    }
  }

  function loseLife() {
    if (ship.invulnerable > 0) return;

    createExplosion(ship.x, ship.y, 22);
    lives -= 1;
    ui.lives.textContent = lives;

    if (lives <= 0) {
      gameOver = true;
      started = false;
      ui.centerMessage.classList.remove("hidden");
      ui.centerMessage.innerHTML =
        '<div class="big">Game Over</div><div class="small">Press R to restart, or open the resume like a sensible adult.</div>';
    } else {
      resetShip();
    }
  }

  function resetGame() {
    score = 0;
    lives = 3;
    wave = 1;
    started = false;
    paused = false;
    gameOver = false;
    bullets = [];
    asteroids = [];
    particles = [];
    ui.score.textContent = score;
    ui.lives.textContent = lives;
    ui.wave.textContent = wave;
    ui.pauseBtn.textContent = "Pause Game";
    ui.centerMessage.classList.remove("hidden");
    ui.centerMessage.innerHTML =
      '<div class="big">Press Space</div><div class="small">Launch the ship, dodge the rocks, then hit “Open Resume PDF” when curiosity wins.</div>';
    resetShip();
    spawnWave();
  }

  function update(dt) {
    if (paused || gameOver) return;

    if (ship.cooldown > 0) ship.cooldown -= dt;
    if (ship.invulnerable > 0) ship.invulnerable -= dt;

    if (keys.has("ArrowLeft")) ship.angle -= 3.9 * dt;
    if (keys.has("ArrowRight")) ship.angle += 3.9 * dt;

    if (keys.has("ArrowUp")) {
      ship.vx += Math.cos(ship.angle) * 220 * dt;
      ship.vy += Math.sin(ship.angle) * 220 * dt;
      if (!started) {
        started = true;
        ui.centerMessage.classList.add("hidden");
      }
    }

    ship.vx *= 0.993;
    ship.vy *= 0.993;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
      if (b.life <= 0) bullets.splice(i, 1);
    }

    for (const a of asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.spin * dt;
      wrap(a);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (distance(a, b) < a.radius) {
          bullets.splice(j, 1);
          splitAsteroid(i);
          break;
        }
      }
    }

    for (const a of asteroids) {
      if (distance(a, ship) < a.radius + ship.radius * 0.85) {
        loseLife();
        break;
      }
    }
  }

  function drawStarfield() {
    ctx.clearRect(0, 0, width, height);
    const count = Math.floor((width * height) / 22000);
    for (let i = 0; i < count; i++) {
      const x = (i * 137.5) % width;
      const y = (i * 83.3) % height;
      ctx.globalAlpha = 0.4 + ((i * 17) % 10) / 20;
      ctx.fillStyle = "#d8fbff";
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + Math.PI / 2);
    const blink =
      ship.invulnerable > 0 &&
      Math.floor(ship.invulnerable * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.3;

    ctx.strokeStyle = "#8cf7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(11, 12);
    ctx.lineTo(0, 7);
    ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.stroke();

    if (keys.has("ArrowUp") && !paused && !gameOver) {
      ctx.strokeStyle = "#ffe169";
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(0, 22 + Math.random() * 8);
      ctx.lineTo(5, 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroids() {
    ctx.strokeStyle = "#d8fbff";
    ctx.lineWidth = 2;
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.beginPath();
      a.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullets() {
    ctx.fillStyle = "#ffe169";
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = alpha > 0.55 ? "#ffe169" : "#8cf7ff";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPausedOverlay() {
    if (!paused || gameOver) return;
    ctx.fillStyle = "rgba(6, 7, 10, 0.35)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#8cf7ff";
    ctx.strokeRect(width / 2 - 130, height / 2 - 44, 260, 88);
    ctx.fillStyle = "#d8fbff";
    ctx.font = "28px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", width / 2, height / 2 + 10);
  }

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    drawStarfield();
    drawParticles();
    drawAsteroids();
    drawBullets();
    if (!gameOver) drawShip();
    drawPausedOverlay();
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    ui.pauseBtn.textContent = paused ? "Resume Game" : "Pause Game";
  }

  document.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === "KeyP") {
      togglePause();
      return;
    }

    if (e.code === "KeyR" && gameOver) {
      resetGame();
      return;
    }

    if (e.code === "Space") {
      if (gameOver) return;
      fireBullet();
    }

    keys.add(e.code === "Space" ? "Space" : e.key);
  });

  document.addEventListener("keyup", (e) => {
    keys.delete(e.code === "Space" ? "Space" : e.key);
  });

  ui.pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });

  resetGame();
  requestAnimationFrame(loop);
}