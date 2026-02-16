const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const lifeBar = document.getElementById("lifeBar");
const lifeText = document.getElementById("lifeText");
const weaponBar = document.getElementById("weaponBar");
const weaponText = document.getElementById("weaponText");
const scoreText = document.getElementById("scoreText");
const destroyedText = document.getElementById("destroyedText");
const consecutiveText = document.getElementById("consecutiveText");
const overlay = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");

const config = {
  maxLife: 3,
  maxAmmo: 40,
  bulletSpeed: 900,
  asteroidMinRadius: 22,
  asteroidMaxRadius: 52,
  shipRadius: 22,
};

const keys = {};
let mouse = { x: 0, y: 0, down: false };

let gameState;
let stars = [];
let particles = [];
let sparks = [];

function resetGame() {
  gameState = {
    score: 0,
    destroyed: 0,
    life: config.maxLife,
    ammo: config.maxAmmo,
    consecutiveHits: 0,
    over: false,
    elapsed: 0,
    ship: {
      x: canvas.width * 0.25,
      y: canvas.height * 0.5,
      vx: 0,
      vy: 0,
      angle: 0,
      fireCooldown: 0,
      invulnerableFor: 0,
    },
    asteroids: [],
    bullets: [],
    planets: [],
    asteroidSpawnTimer: 0,
    supportPlanetTimer: 4,
  };

  overlay.classList.add("hidden");
  updateHud();
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (!stars.length) {
    stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: 0.25 + Math.random() * 0.95,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }
}

function spawnAsteroid() {
  const difficulty = 1 + gameState.elapsed * 0.03;
  const radius =
    config.asteroidMinRadius +
    Math.random() * (config.asteroidMaxRadius - config.asteroidMinRadius);
  const profile = createAsteroidProfile(radius);
  gameState.asteroids.push({
    x: canvas.width + radius + 40,
    y: radius + Math.random() * (canvas.height - radius * 2),
    radius,
    profile,
    speed: 130 + Math.random() * 70 + difficulty * 18,
    drift: (Math.random() - 0.5) * 80,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 1.6,
  });

  const baseDelay = Math.max(0.35, 1.6 - gameState.elapsed * 0.025);
  gameState.asteroidSpawnTimer = baseDelay + Math.random() * 0.7;
}

function createAsteroidProfile(radius) {
  const points = [];
  const pointCount = 14 + Math.floor(Math.random() * 8);
  for (let i = 0; i < pointCount; i++) {
    const angle = (Math.PI * 2 * i) / pointCount;
    const jitter = 0.68 + Math.random() * 0.38;
    points.push({
      x: Math.cos(angle) * radius * jitter,
      y: Math.sin(angle) * radius * jitter,
    });
  }

  const craterCount = 2 + Math.floor(Math.random() * 3);
  const craters = [];
  for (let i = 0; i < craterCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = radius * (0.15 + Math.random() * 0.45);
    const r = radius * (0.12 + Math.random() * 0.14);
    craters.push({
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      r,
    });
  }

  return { points, craters };
}

function spawnPlanet(type) {
  const isLife = type === "life";
  gameState.planets.push({
    type,
    x: canvas.width + 80,
    y: 80 + Math.random() * (canvas.height - 160),
    radius: isLife ? 24 : 20,
    speed: 90 + Math.random() * 30,
    pulse: Math.random() * Math.PI * 2,
  });
}

function shoot() {
  const ship = gameState.ship;
  if (gameState.over || ship.fireCooldown > 0 || gameState.ammo <= 0) return;

  const angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
  gameState.bullets.push({
    x: ship.x + Math.cos(angle) * 30,
    y: ship.y + Math.sin(angle) * 30,
    vx: Math.cos(angle) * config.bulletSpeed,
    vy: Math.sin(angle) * config.bulletSpeed,
    life: 1.2,
  });

  ship.fireCooldown = 0.12;
  gameState.ammo = Math.max(0, gameState.ammo - 1);
}

function createExplosion(x, y, color, amount = 24) {
  for (let i = 0; i < amount; i++) {
    const speed = 40 + Math.random() * 250;
    const ang = Math.random() * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0.5 + Math.random() * 0.6,
      ttl: 0.5 + Math.random() * 0.6,
      color,
      size: 1 + Math.random() * 3,
    });
  }
}

function damageShip() {
  const ship = gameState.ship;
  if (ship.invulnerableFor > 0 || gameState.over) return;

  gameState.life = Math.max(0, gameState.life - 1);
  gameState.consecutiveHits += 1;
  ship.invulnerableFor = 1.2;
  createExplosion(ship.x, ship.y, "#ff964f", 40);

  if (gameState.life <= 0 || gameState.consecutiveHits >= 3) {
    gameOver();
  }
}

function healShip() {
  gameState.life = Math.min(config.maxLife, gameState.life + 1);
  gameState.consecutiveHits = 0;
  createExplosion(gameState.ship.x, gameState.ship.y, "#86ff9b", 28);
}

function refillAmmo() {
  gameState.ammo = config.maxAmmo;
  createExplosion(gameState.ship.x, gameState.ship.y, "#76e9ff", 24);
}

function gameOver() {
  gameState.over = true;
  finalScore.textContent = gameState.score;
  overlay.classList.remove("hidden");
}

function updateHud() {
  const lifePct = (gameState.life / config.maxLife) * 100;
  const ammoPct = (gameState.ammo / config.maxAmmo) * 100;

  lifeBar.style.width = `${lifePct}%`;
  weaponBar.style.width = `${ammoPct}%`;
  lifeText.textContent = `${gameState.life} / ${config.maxLife}`;
  weaponText.textContent = `${gameState.ammo} / ${config.maxAmmo}`;
  consecutiveText.textContent = `${gameState.consecutiveHits} / 3`;

  if (gameState.life >= 3) {
    lifeBar.style.background = "linear-gradient(90deg,#57df69,#9efe88)";
  } else if (gameState.life === 2) {
    lifeBar.style.background = "linear-gradient(90deg,#ffaf4f,#ffd76f)";
  } else {
    lifeBar.style.background = "linear-gradient(90deg,#ff4f61,#ff8383)";
  }

  scoreText.textContent = gameState.score;
  destroyedText.textContent = gameState.destroyed;
}

function update(dt) {
  if (gameState.over) return;

  const ship = gameState.ship;
  gameState.elapsed += dt;

  const accel = 900;
  const drag = 0.88;

  const up = keys.KeyW || keys.ArrowUp;
  const down = keys.KeyS || keys.ArrowDown;
  const left = keys.KeyA || keys.ArrowLeft;
  const right = keys.KeyD || keys.ArrowRight;

  ship.vx += ((right ? 1 : 0) - (left ? 1 : 0)) * accel * dt;
  ship.vy += ((down ? 1 : 0) - (up ? 1 : 0)) * accel * dt;

  ship.vx *= drag;
  ship.vy *= drag;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.x = Math.max(60, Math.min(canvas.width - 60, ship.x));
  ship.y = Math.max(60, Math.min(canvas.height - 60, ship.y));

  ship.angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  ship.invulnerableFor = Math.max(0, ship.invulnerableFor - dt);

  if ((mouse.down || keys.Space) && gameState.ammo > 0) shoot();

  gameState.asteroidSpawnTimer -= dt;
  if (gameState.asteroidSpawnTimer <= 0) spawnAsteroid();

  gameState.supportPlanetTimer -= dt;
  if (gameState.supportPlanetTimer <= 0) {
    spawnPlanet(Math.random() > 0.5 ? "life" : "weapon");
    gameState.supportPlanetTimer = 8 + Math.random() * 6;
  }

  for (let i = gameState.asteroids.length - 1; i >= 0; i--) {
    const asteroid = gameState.asteroids[i];
    asteroid.x -= asteroid.speed * dt;
    asteroid.y += asteroid.drift * dt;
    asteroid.rotation += asteroid.rotSpeed * dt;

    if (asteroid.y < asteroid.radius || asteroid.y > canvas.height - asteroid.radius) {
      asteroid.drift *= -1;
    }

    if (asteroid.x < -asteroid.radius - 15) {
      gameState.asteroids.splice(i, 1);
      gameState.score += 1;
      gameState.consecutiveHits = 0;
      continue;
    }

    const dx = asteroid.x - ship.x;
    const dy = asteroid.y - ship.y;
    if (Math.hypot(dx, dy) < asteroid.radius + config.shipRadius - 4) {
      gameState.asteroids.splice(i, 1);
      damageShip();
      continue;
    }
  }

  for (let i = gameState.planets.length - 1; i >= 0; i--) {
    const planet = gameState.planets[i];
    planet.x -= planet.speed * dt;
    planet.pulse += dt * 2;

    if (planet.x < -planet.radius - 15) {
      gameState.planets.splice(i, 1);
      continue;
    }

    if (Math.hypot(planet.x - ship.x, planet.y - ship.y) < planet.radius + config.shipRadius) {
      gameState.planets.splice(i, 1);
      if (planet.type === "life") healShip();
      else refillAmmo();
    }
  }

  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > canvas.width + 20 ||
      bullet.y > canvas.height + 20
    ) {
      gameState.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = gameState.asteroids.length - 1; j >= 0; j--) {
      const asteroid = gameState.asteroids[j];
      if (Math.hypot(asteroid.x - bullet.x, asteroid.y - bullet.y) <= asteroid.radius + 4) {
        createExplosion(asteroid.x, asteroid.y, "#ffc27f", 30);
        gameState.asteroids.splice(j, 1);
        gameState.destroyed += 1;
        gameState.score += 2;
        gameState.consecutiveHits = 0;
        hit = true;
        break;
      }
    }

    if (hit) gameState.bullets.splice(i, 1);
  }

  for (const star of stars) {
    star.x -= (55 + gameState.elapsed * 2) * star.z * dt;
    if (star.x < -2) {
      star.x = canvas.width + 2;
      star.y = Math.random() * canvas.height;
    }
    star.twinkle += dt * (1 + star.z * 1.8);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    if (p.life <= 0) particles.splice(i, 1);
  }

  sparks.push({
    x: ship.x - Math.cos(ship.angle) * 24,
    y: ship.y - Math.sin(ship.angle) * 24,
    vx: -Math.cos(ship.angle) * (120 + Math.random() * 140),
    vy: -Math.sin(ship.angle) * (120 + Math.random() * 140),
    life: 0.22,
  });

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) sparks.splice(i, 1);
  }

  updateHud();
}

function drawStars() {
  const bg = ctx.createRadialGradient(
    canvas.width * 0.35,
    canvas.height * 0.4,
    0,
    canvas.width * 0.4,
    canvas.height * 0.45,
    canvas.width * 0.9
  );
  bg.addColorStop(0, "#1d2a57");
  bg.addColorStop(0.5, "#0b122c");
  bg.addColorStop(1, "#05070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "lighter";
  for (const star of stars) {
    const a = 0.3 + (Math.sin(star.twinkle) + 1) * 0.3;
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    const size = star.z * 2.2;
    ctx.fillRect(star.x, star.y, size, size);
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawShip() {
  const { ship } = gameState;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (ship.invulnerableFor > 0 && Math.floor(ship.invulnerableFor * 18) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-20, -14);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-20, 14);
  ctx.closePath();
  const hull = ctx.createLinearGradient(-20, 0, 28, 0);
  hull.addColorStop(0, "#6ea7ff");
  hull.addColorStop(1, "#d3f6ff");
  ctx.fillStyle = hull;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-4, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#142748";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-17, -6);
  ctx.lineTo(-32, -15);
  ctx.lineTo(-16, -1);
  ctx.closePath();
  ctx.fillStyle = "#7fbcff";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-17, 6);
  ctx.lineTo(-32, 15);
  ctx.lineTo(-16, 1);
  ctx.closePath();
  ctx.fillStyle = "#7fbcff";
  ctx.fill();

  ctx.restore();
}

function drawEntities() {
  for (const planet of gameState.planets) {
    const isLife = planet.type === "life";
    const pulse = 0.5 + (Math.sin(planet.pulse) + 1) * 0.35;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius + 8 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = isLife ? "rgba(132,255,153,0.20)" : "rgba(111,220,255,0.2)";
    ctx.fill();

    const grad = ctx.createRadialGradient(
      planet.x - 5,
      planet.y - 8,
      2,
      planet.x,
      planet.y,
      planet.radius
    );
    grad.addColorStop(0, isLife ? "#f3ffe7" : "#dcfaff");
    grad.addColorStop(1, isLife ? "#6fdb77" : "#3ca6c8");
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  for (const asteroid of gameState.asteroids) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);

    ctx.beginPath();
    const { points, craters } = asteroid.profile;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const grd = ctx.createLinearGradient(-asteroid.radius, -asteroid.radius, asteroid.radius, asteroid.radius);
    grd.addColorStop(0, "#b7a38d");
    grd.addColorStop(0.45, "#8e7462");
    grd.addColorStop(1, "#4c3c33");
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.lineWidth = Math.max(1.5, asteroid.radius * 0.06);
    ctx.strokeStyle = "rgba(38,27,22,0.55)";
    ctx.stroke();

    const rim = ctx.createRadialGradient(
      -asteroid.radius * 0.2,
      -asteroid.radius * 0.3,
      asteroid.radius * 0.1,
      0,
      0,
      asteroid.radius * 1.1
    );
    rim.addColorStop(0, "rgba(255,241,220,0.28)");
    rim.addColorStop(1, "rgba(255,241,220,0)");
    ctx.fillStyle = rim;
    ctx.fill();

    for (const crater of craters) {
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(44,31,26,0.3)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(crater.x - crater.r * 0.28, crater.y - crater.r * 0.28, crater.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,232,198,0.08)";
      ctx.fill();
    }

    ctx.restore();
  }

  for (const bullet of gameState.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#8df7ff";
    ctx.fill();
  }

  for (const s of sparks) {
    ctx.fillStyle = `rgba(120,220,255,${Math.max(0, s.life * 3.4)})`;
    ctx.fillRect(s.x, s.y, 2, 2);
  }

  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `${p.color}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  drawStars();
  drawEntities();
  drawShip();

  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("mousedown", () => {
  mouse.down = true;
});
window.addEventListener("mouseup", () => {
  mouse.down = false;
});
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
canvas.addEventListener("click", shoot);
restartButton.addEventListener("click", resetGame);

resize();
resetGame();
requestAnimationFrame(loop);
