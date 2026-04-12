(function () {
  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const body = document.body;
  const isDisciplinePage = body.classList.contains("site-discipline");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let animationId = null;

  function resizeCanvas() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildStars() {
    const density = isDisciplinePage ? 6500 : 8000;
    const count = Math.max(40, Math.floor((width * height) / density));
    stars = [];

    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.35 + 0.25,
        a: Math.random() * 0.55 + 0.08,
        speed: Math.random() * 0.12 + 0.02,
      });
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#071019");
    gradient.addColorStop(0.55, "#0a1826");
    gradient.addColorStop(1, "#0d1f2d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStars() {
    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(217, 230, 242, ${star.a})`;
      ctx.fill();

      star.y -= star.speed;

      if (star.y < -2) {
        star.y = height + 2;
        star.x = Math.random() * width;
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawStars();
    animationId = window.requestAnimationFrame(frame);
  }

  function handleResize() {
    resizeCanvas();
    buildStars();
  }

  handleResize();
  frame();

  window.addEventListener("resize", handleResize);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
      return;
    }

    if (animationId === null) {
      frame();
    }
  });
})();