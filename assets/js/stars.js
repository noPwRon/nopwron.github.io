(function () {
  'use strict';

  const DEFAULTS = {
    selector: '#stars',
    backgroundTop: '#08131a',
    backgroundBottom: '#0d1f2d',
    densityDivisor: 6000,
    maxRadius: 1.2,
    minAlpha: 0.1,
    alphaRange: 0.6,
    minSpeed: 0.01,
    speedRange: 0.08,
    shape: 'circle',
    clearEachFrame: true
  };

  function clampNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function boolFromData(value, fallback) {
    if (value == null || value === '') {
      return fallback;
    }
    if (value === 'false' || value === '0') {
      return false;
    }
    if (value === 'true' || value === '1') {
      return true;
    }
    return fallback;
  }

  function readOptionsFromDataset(canvas) {
    const data = canvas.dataset || {};
    return {
      densityDivisor: clampNumber(data.starDensity, DEFAULTS.densityDivisor),
      maxRadius: clampNumber(data.starMaxRadius, DEFAULTS.maxRadius),
      minAlpha: clampNumber(data.starMinAlpha, DEFAULTS.minAlpha),
      alphaRange: clampNumber(data.starAlphaRange, DEFAULTS.alphaRange),
      minSpeed: clampNumber(data.starMinSpeed, DEFAULTS.minSpeed),
      speedRange: clampNumber(data.starSpeedRange, DEFAULTS.speedRange),
      shape: data.starShape || DEFAULTS.shape,
      backgroundTop: data.starBgTop || DEFAULTS.backgroundTop,
      backgroundBottom: data.starBgBottom || DEFAULTS.backgroundBottom,
      clearEachFrame: boolFromData(data.starClearEachFrame, DEFAULTS.clearEachFrame)
    };
  }

  function createStarfield(canvas, options) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    let stars = [];
    let animationFrame = 0;
    let running = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / options.densityDivisor);

      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * options.maxRadius,
          a: Math.random() * options.alphaRange + options.minAlpha,
          speed: Math.random() * options.speedRange + options.minSpeed
        });
      }
    }

    function drawBackground() {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, options.backgroundTop);
      gradient.addColorStop(1, options.backgroundBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawStar(star) {
      ctx.fillStyle = `rgba(255,255,255,${star.a})`;

      if (options.shape === 'square') {
        const size = Math.max(0.5, star.r + 0.3);
        ctx.fillRect(star.x, star.y, size, size);
        return;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    function step() {
      if (!running) {
        return;
      }

      if (options.clearEachFrame) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      drawBackground();

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        drawStar(star);

        star.y -= star.speed;
        if (star.y < -2) {
          star.y = canvas.height + 2;
          star.x = Math.random() * canvas.width;
        }
      }

      animationFrame = window.requestAnimationFrame(step);
    }

    function handleResize() {
      resize();
      initStars();
    }

    function start() {
      if (running) {
        return;
      }
      running = true;
      handleResize();
      step();
      window.addEventListener('resize', handleResize);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    }

    return {
      start,
      stop,
      resize: handleResize,
      canvas
    };
  }

  function init(customOptions) {
    const baseOptions = Object.assign({}, DEFAULTS, customOptions || {});
    const canvas = document.querySelector(baseOptions.selector);

    if (!canvas) {
      return null;
    }

    const datasetOptions = readOptionsFromDataset(canvas);
    const starfield = createStarfield(
      canvas,
      Object.assign({}, baseOptions, datasetOptions, customOptions || {})
    );

    if (!starfield) {
      return null;
    }

    starfield.start();
    return starfield;
  }

  const api = {
    init,
    createStarfield
  };

  if (window.Site) {
    window.Site.stars = api;
  } else {
    window.SiteStars = api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      init();
    });
  } else {
    init();
  }
})();