(function () {
  'use strict';

  const MOBILE_QUERY = '(max-width: 980px)';
  const HIGH_SCORE_KEY = 'retroResumeHighScore';

  function initAsteroids() {
    const canvas = document.getElementById('game');
    if (!canvas) {
      return null;
    }

    const isMobile = window.matchMedia(MOBILE_QUERY).matches;

    if (isMobile) {
      const scoreBar = document.querySelector('.score-bar');
      const pauseButton = document.getElementById('togglePause');
      const centerMessage = document.getElementById('centerMessage');

      canvas.remove();

      if (scoreBar) {
        scoreBar.remove();
      }

      if (pauseButton) {
        pauseButton.remove();
      }

      if (centerMessage) {
        centerMessage.remove();
      }

      document.body.style.overflow = 'auto';

      return {
        mobile: true
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    const ui = {
      score: document.getElementById('score'),
      lives: document.getElementById('lives'),
      wave: document.getElementById('wave'),
      highScore: document.getElementById('highScore'),
      centerMessage: document.getElementById('centerMessage'),
      pauseBtn: document.getElementById('togglePause')
    };

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    const keys = new Set();

    let started = false;
    let paused = false;
    let gameOver = false;

    let score = 0;
    let lives = 3;
    let wave = 1;
    let highScore = Number(window.localStorage.getItem(HIGH_SCORE_KEY) || 0);

    if (ui.highScore) {
      ui.highScore.textContent = String(highScore);
    }

    const ship = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 14,
      invulnerable: 0,
      cooldown: 0
    };

    let bullets = [];
    let asteroids = [];
    let particles = [];
    let rafId = 0;
    let last = performance.now();

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.max(1, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function randomRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    function wrap(obj) {
      if (obj.x < -30) {
        obj.x = width + 30;
      }
      if (obj.x > width + 30) {
        obj.x = -30;
      }
      if (obj.y < -30) {
        obj.y = height + 30;
      }
      if (obj.y > height + 30) {
        obj.y = -30;
      }
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function resetShip() {
      ship.x = width / 2;
      ship.y = height / 2;
      ship.vx = 0;
      ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.invulnerable = 2.5;
      ship.cooldown = 0;
    }

    function spawnAsteroid(size, x, y) {
      let ax = x;
      let ay = y;
      const asteroidSize = size == null ? 3 : size;

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
      const scale = asteroidSize === 3 ? 1 : asteroidSize === 2 ? 1.35 : 1.8;
      const radius = asteroidSize === 3 ? 46 : asteroidSize === 2 ? 28 : 16;
      const points = [];
      const pointCount = 9 + Math.floor(Math.random() * 4);

      for (let i = 0; i < pointCount; i += 1) {
        const theta = (i / pointCount) * Math.PI * 2;
        const pointRadius = radius * randomRange(0.72, 1.15);
        points.push({
          x: Math.cos(theta) * pointRadius,
          y: Math.sin(theta) * pointRadius
        });
      }

      asteroids.push({
        x: ax,
        y: ay,
        vx: Math.cos(angle) * randomRange(speedBase * 0.55, speedBase * 0.95) * scale,
        vy: Math.sin(angle) * randomRange(speedBase * 0.55, speedBase * 0.95) * scale,
        angle: Math.random() * Math.PI * 2,
        spin: randomRange(-1.2, 1.2),
        size: asteroidSize,
        radius,
        points
      });
    }

    function spawnWave() {
      const count = Math.min(4 + wave, 11);
      let spawned = 0;

      while (spawned < count) {
        spawnAsteroid(3);

        if (distance(asteroids[asteroids.length - 1], ship) < 220) {
          asteroids.pop();
          continue;
        }

        spawned += 1;
      }

      if (ui.wave) {
        ui.wave.textContent = String(wave);
      }
    }

    function createExplosion(x, y, count) {
      const total = count == null ? 18 : count;

      for (let i = 0; i < total; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(20, 150);
        const maxLife = randomRange(0.35, 0.9);

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife
        });
      }
    }

    function setStartMessage() {
      if (!ui.centerMessage) {
        return;
      }

      ui.centerMessage.classList.remove('hidden');
      ui.centerMessage.innerHTML =
        '<div class="big">PRESS <span>SPACE</span></div>' +
        '<div class="small">Launch the ship, dodge the rocks, or pick a direction and dive deeper.</div>';
    }

    function setGameOverMessage() {
      if (!ui.centerMessage) {
        return;
      }

      ui.centerMessage.classList.remove('hidden');
      ui.centerMessage.innerHTML =
        '<div class="big">GAME <span>OVER</span></div>' +
        '<div class="small">Press R to restart, or pick a page.</div>';
    }

    function hideCenterMessage() {
      if (ui.centerMessage) {
        ui.centerMessage.classList.add('hidden');
      }
    }

    function updateHighScore() {
      if (score > highScore) {
        highScore = score;
        window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));

        if (ui.highScore) {
          ui.highScore.textContent = String(highScore);
        }
      }
    }

    function fireBullet() {
      if (ship.cooldown > 0 || gameOver) {
        return;
      }

      bullets.push({
        x: ship.x + Math.cos(ship.angle) * ship.radius,
        y: ship.y + Math.sin(ship.angle) * ship.radius,
        vx: ship.vx + Math.cos(ship.angle) * 420,
        vy: ship.vy + Math.sin(ship.angle) * 420,
        life: 1.05
      });

      ship.cooldown = 0.18;

      if (!started) {
        started = true;
        hideCenterMessage();
      }
    }

    function splitAsteroid(index) {
      const asteroid = asteroids[index];

      score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;

      if (ui.score) {
        ui.score.textContent = String(score);
      }

      updateHighScore();
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
      if (ship.invulnerable > 0) {
        return;
      }

      createExplosion(ship.x, ship.y, 22);
      lives -= 1;

      if (ui.lives) {
        ui.lives.textContent = String(lives);
      }

      if (lives <= 0) {
        gameOver = true;
        started = false;
        setGameOverMessage();
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
      keys.clear();

      if (ui.score) {
        ui.score.textContent = '0';
      }
      if (ui.lives) {
        ui.lives.textContent = '3';
      }
      if (ui.wave) {
        ui.wave.textContent = '1';
      }
      if (ui.pauseBtn) {
        ui.pauseBtn.textContent = 'PAUSE GAME';
      }

      setStartMessage();
      resetShip();
      spawnWave();
    }

    function update(dt) {
      if (paused || gameOver) {
        return;
      }

      if (ship.cooldown > 0) {
        ship.cooldown -= dt;
      }
      if (ship.invulnerable > 0) {
        ship.invulnerable -= dt;
      }

      if (keys.has('ArrowLeft')) {
        ship.angle -= 3.9 * dt;
      }
      if (keys.has('ArrowRight')) {
        ship.angle += 3.9 * dt;
      }
      if (keys.has('ArrowUp')) {
        ship.vx += Math.cos(ship.angle) * 220 * dt;
        ship.vy += Math.sin(ship.angle) * 220 * dt;

        if (!started) {
          started = true;
          hideCenterMessage();
        }
      }

      ship.vx *= 0.993;
      ship.vy *= 0.993;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship);

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        wrap(bullet);

        if (bullet.life <= 0) {
          bullets.splice(i, 1);
        }
      }

      for (let i = 0; i < asteroids.length; i += 1) {
        const asteroid = asteroids[i];
        asteroid.x += asteroid.vx * dt;
        asteroid.y += asteroid.vy * dt;
        asteroid.angle += asteroid.spin * dt;
        wrap(asteroid);
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= dt;

        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }

      for (let i = asteroids.length - 1; i >= 0; i -= 1) {
        const asteroid = asteroids[i];

        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          if (distance(asteroid, bullets[j]) < asteroid.radius) {
            bullets.splice(j, 1);
            splitAsteroid(i);
            break;
          }
        }
      }

      for (let i = 0; i < asteroids.length; i += 1) {
        const asteroid = asteroids[i];
        if (distance(asteroid, ship) < asteroid.radius + ship.radius * 0.85) {
          loseLife();
          break;
        }
      }
    }

    function drawStarfield() {
      ctx.clearRect(0, 0, width, height);

      const count = Math.floor((width * height) / 22000);

      for (let i = 0; i < count; i += 1) {
        const x = (i * 137.5) % width;
        const y = (i * 83.3) % height;
        ctx.globalAlpha = 0.4 + ((i * 17) % 10) / 20;
        ctx.fillStyle = '#d8fbff';
        ctx.fillRect(x, y, 1.2, 1.2);
      }

      ctx.globalAlpha = 1;
    }

    function drawShip() {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle + Math.PI / 2);

      if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 12) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }

      ctx.strokeStyle = '#8cf7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(11, 12);
      ctx.lineTo(0, 7);
      ctx.lineTo(-11, 12);
      ctx.closePath();
      ctx.stroke();

      if (keys.has('ArrowUp') && !paused && !gameOver) {
        ctx.strokeStyle = '#ffe169';
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(0, 22 + Math.random() * 8);
        ctx.lineTo(5, 12);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawAsteroids() {
      ctx.strokeStyle = '#d8fbff';
      ctx.lineWidth = 2;

      for (let i = 0; i < asteroids.length; i += 1) {
        const asteroid = asteroids[i];

        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.angle);
        ctx.beginPath();

        for (let j = 0; j < asteroid.points.length; j += 1) {
          const point = asteroid.points[j];
          if (j === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }

        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawBullets() {
      ctx.fillStyle = '#ffe169';

      for (let i = 0; i < bullets.length; i += 1) {
        const bullet = bullets[i];
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawParticles() {
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const alpha = Math.max(0, particle.life / particle.maxLife);

        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = alpha > 0.55 ? '#ffe169' : '#8cf7ff';
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(
          particle.x - particle.vx * 0.02,
          particle.y - particle.vy * 0.02
        );
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function drawPausedOverlay() {
      if (!paused || gameOver) {
        return;
      }

      ctx.fillStyle = 'rgba(6, 7, 10, 0.35)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#8cf7ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 130, height / 2 - 44, 260, 88);
      ctx.fillStyle = '#d8fbff';
      ctx.font = '28px "Share Tech Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', width / 2, height / 2);
    }

    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      update(dt);
      drawStarfield();
      drawParticles();
      drawAsteroids();
      drawBullets();

      if (!gameOver) {
        drawShip();
      }

      drawPausedOverlay();
      rafId = window.requestAnimationFrame(loop);
    }

    function togglePause() {
      if (gameOver) {
        return;
      }

      paused = !paused;

      if (ui.pauseBtn) {
        ui.pauseBtn.textContent = paused ? 'RESUME GAME' : 'PAUSE GAME';
      }
    }

    function onKeyDown(event) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === 'KeyP') {
        togglePause();
        return;
      }

      if (event.code === 'KeyR' && gameOver) {
        resetGame();
        return;
      }

      if (event.code === 'Space' && !gameOver) {
        fireBullet();
      }

      keys.add(event.code === 'Space' ? 'Space' : event.key);
    }

    function onKeyUp(event) {
      keys.delete(event.code === 'Space' ? 'Space' : event.key);
    }

    function onPauseClick(event) {
      event.preventDefault();
      togglePause();
    }

    function destroy() {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);

      if (ui.pauseBtn) {
        ui.pauseBtn.removeEventListener('click', onPauseClick);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    if (ui.pauseBtn) {
      ui.pauseBtn.addEventListener('click', onPauseClick);
    }

    window.requestAnimationFrame(function () {
      resize();
      window.addEventListener('resize', resize);
      resetGame();
      last = performance.now();
      rafId = window.requestAnimationFrame(loop);
    });

    return {
      destroy,
      reset: resetGame,
      pause: togglePause
    };
  }

  const api = {
    init: initAsteroids
  };

  if (window.Site) {
    window.Site.asteroids = api;
  } else {
    window.SiteAsteroids = api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      initAsteroids();
    });
  } else {
    initAsteroids();
  }
})();