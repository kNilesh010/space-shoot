const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const lifeBar = document.getElementById("lifeBar");
const lifeText = document.getElementById("lifeText");
const weaponBar = document.getElementById("weaponBar");
const weaponText = document.getElementById("weaponText");
const scoreText = document.getElementById("scoreText");
const destroyedText = document.getElementById("destroyedText");
const deepSpaceText = document.getElementById("deepSpaceText");
const consecutiveText = document.getElementById("consecutiveText");
const overlay = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const muteButton = document.getElementById("muteButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const instructionsButton = document.getElementById("instructionsButton");
const instructionsOverlay = document.getElementById("instructionsOverlay");
const closeInstructionsButton = document.getElementById(
  "closeInstructionsButton",
);
const rotateNotice = document.getElementById("rotateNotice");
const gameHud = document.getElementById("gameHud");
const startMenu = document.getElementById("startMenu");
const startGameButton = document.getElementById("startGameButton");
const readInstructionsButton = document.getElementById(
  "readInstructionsButton",
);
const startInstructions = document.getElementById("startInstructions");
const instructionBlocks = document.querySelectorAll("[data-instructions]");

const config = {
  maxLife: 3,
  maxAmmo: 40,
  bulletSpeed: 900,
  asteroidMinRadius: 22,
  asteroidMaxRadius: 52,
  shipRadius: 22,
};
const scoring = {
  destroyBase: 2,
  nearMissBonus: 3,
  cometBonus: 10,
  wormholeBonus: 25,
  whiteHoleSlingshotBonus: 12,
  survivalMinuteBonus: 30,
  comboWindowSec: 2.9,
};

const keys = {};
let mouse = { x: 0, y: 0, down: false, hasMoved: false, lastMoveAt: 0 };

let gameState;
let stars = [];
let particles = [];
let sparks = [];
let nebulae = [];
let starClusters = [];
let blackHoles = [];
let whiteHoles = [];
let exoplanets = [];
let centaurKuiperObjects = [];
let neutronStars = [];
let saturnPlanets = [];
let supernovaRemnants = [];
let supernovas = [];
let debrisFields = [];
let abandonedStations = [];
let gravityZones = [];
let solarFlares = [];
let darkMatterClouds = [];
let wormholes = [];
let asteroidSpawnQueue = [];
let shockwaves = [];
let ionClouds = [];
let comets = [];
let probeWreckage = [];
let shieldOrbs = [];
let kuiperFragments = [];
let cameraShake = 0;
let gameStarted = false;
let instructionsOpen = false;
let orientationBlocked = false;
const touchInput = {
  active: false,
  axisX: 0,
  axisY: 0,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  startAt: 0,
};
const motionInput = {
  available: typeof window !== "undefined" && "DeviceOrientationEvent" in window,
  listenerAttached: false,
  enabled: false,
  permissionState: "unknown",
  axisX: 0,
  axisY: 0,
  baseTiltX: 0,
  baseTiltY: 0,
  calibrated: false,
  lastEventAt: 0,
};
const audioMix = {
  master: 0.22,
  engine: 1.0,
  static: 0.72,
  alert: 0.95,
  muted: false,
};
let audioState = {
  ctx: null,
  master: null,
  engineOsc: null,
  engineGain: null,
  engineFilter: null,
  staticSource: null,
  staticGain: null,
  staticFilter: null,
  proximityOsc: null,
  proximityGain: null,
  proximityNextAt: 0,
  damagedOsc: null,
  damagedGain: null,
  hissSource: null,
  hissGain: null,
  hissFilter: null,
  nextHissAt: 0,
  rattleOsc: null,
  rattleGain: null,
  sirenOsc: null,
  sirenGain: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getScreenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === "number") return window.orientation;
  return window.innerWidth >= window.innerHeight ? 90 : 0;
}

function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

function hasFullscreenSupport() {
  const root = document.documentElement;
  return !!(
    root.requestFullscreen ||
    root.webkitRequestFullscreen ||
    root.msRequestFullscreen
  );
}

function orientationTiltToAxes(beta = 0, gamma = 0) {
  const angle = ((Math.round(getScreenAngle() / 90) * 90) % 360 + 360) % 360;
  if (angle === 90) return { x: beta, y: -gamma };
  if (angle === 270) return { x: -beta, y: gamma };
  if (angle === 180) return { x: -gamma, y: -beta };
  return { x: gamma, y: beta };
}

function resetMotionInput(recalibrate = true) {
  motionInput.axisX = 0;
  motionInput.axisY = 0;
  motionInput.lastEventAt = 0;
  if (recalibrate) {
    motionInput.baseTiltX = 0;
    motionInput.baseTiltY = 0;
    motionInput.calibrated = false;
  }
}

function onDeviceOrientation(event) {
  if (!motionInput.enabled || orientationBlocked) {
    resetMotionInput();
    return;
  }
  if (typeof event.beta !== "number" || typeof event.gamma !== "number") return;
  const tilt = orientationTiltToAxes(event.beta, event.gamma);
  if (!motionInput.calibrated) {
    motionInput.baseTiltX = tilt.x;
    motionInput.baseTiltY = tilt.y;
    motionInput.calibrated = true;
  }
  const deadZone = 2.2;
  const maxTilt = 18;
  const deltaX = tilt.x - motionInput.baseTiltX;
  const deltaY = tilt.y - motionInput.baseTiltY;
  motionInput.axisX =
    Math.abs(deltaX) < deadZone ? 0 : clamp(deltaX / maxTilt, -1, 1);
  motionInput.axisY =
    Math.abs(deltaY) < deadZone ? 0 : clamp(deltaY / maxTilt, -1, 1);
  motionInput.lastEventAt = performance.now();
}

async function enableMotionControlsFromGesture() {
  if (!isSmartphoneLike() || !motionInput.available) {
    motionInput.enabled = false;
    return false;
  }
  let granted = true;
  const deviceOrientation = window.DeviceOrientationEvent;
  if (
    deviceOrientation &&
    typeof deviceOrientation.requestPermission === "function"
  ) {
    try {
      const permission = await deviceOrientation.requestPermission();
      granted = permission === "granted";
    } catch {
      motionInput.permissionState = "unknown";
      motionInput.enabled = false;
      return false;
    }
  }
  motionInput.permissionState = granted ? "granted" : "denied";
  if (!granted) {
    motionInput.enabled = false;
    resetMotionInput();
    return false;
  }
  if (!motionInput.listenerAttached) {
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
    window.addEventListener("deviceorientationabsolute", onDeviceOrientation, true);
    motionInput.listenerAttached = true;
  }
  motionInput.enabled = true;
  resetMotionInput(true);
  return true;
}

function resetSceneVisuals() {
  stars = Array.from({ length: 280 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: 0.25 + Math.random() * 0.95,
    twinkle: Math.random() * Math.PI * 2,
  }));
  initAmbientSpace();
}

function resetGame() {
  particles = [];
  sparks = [];
  supernovas = [];
  debrisFields = [];
  abandonedStations = [];
  gravityZones = [];
  solarFlares = [];
  darkMatterClouds = [];
  wormholes = [];
  asteroidSpawnQueue = [];
  shockwaves = [];
  ionClouds = [];
  comets = [];
  probeWreckage = [];
  shieldOrbs = [];
  kuiperFragments = [];
  cameraShake = 0;
  keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false;
  keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
  keys.Space = false;
  mouse.down = false;
  mouse.hasMoved = false;
  mouse.lastMoveAt = performance.now();
  mouse.x = canvas.width * 0.5;
  mouse.y = canvas.height * 0.5;
  touchInput.active = false;
  touchInput.axisX = 0;
  touchInput.axisY = 0;
  touchInput.pointerId = null;
  touchInput.startX = 0;
  touchInput.startY = 0;
  touchInput.lastX = 0;
  touchInput.lastY = 0;
  touchInput.startAt = 0;
  resetMotionInput();
  resetSceneVisuals();
  instructionsOpen = false;
  if (instructionsOverlay) instructionsOverlay.classList.add("hidden");
  if (rotateNotice) rotateNotice.classList.add("hidden");
  orientationBlocked = false;
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
      wormholeCooldown: 0,
      boostHeat: 0,
      boosting: false,
      damageFxTimer: 0,
      sideThrusterTimer: 0,
      brakeThrusterTimer: 0,
      steerVisual: 0,
      shieldFlash: 0,
      muzzleFlash: 0,
      dangerHexTimer: 0,
      shieldActive: false,
      shieldTimer: 0,
    },
    asteroids: [],
    bullets: [],
    planets: [],
    asteroidSpawnTimer: 0,
    supportPlanetTimer: 4,
    ionCloudTimer: 14 + Math.random() * 9,
    cometTimer: 12 + Math.random() * 10,
    probeWreckTimer: 28 + Math.random() * 22,
    shieldOrbTimer: 22 + Math.random() * 18,
    supernovaTimer: 6 + Math.random() * 6,
    debrisTimer: 4 + Math.random() * 4,
    stationTimer: 11 + Math.random() * 8,
    advancedPhaseAt: 130 + Math.random() * 45,
    advancedUnlocked: false,
    gravityTimer: 12 + Math.random() * 8,
    flareTimer: 20 + Math.random() * 10,
    darkMatterTimer: 14 + Math.random() * 9,
    wormholeTimer: 24 + Math.random() * 12,
    visibilityPenalty: 0,
    gameOverSequence: false,
    gameOverTimer: 0,
    comboCount: 0,
    comboLastKillAt: -999,
    nextSurvivalBonusAt: 60,
    ammoBoostTimer: 0,
    ammoBoostTick: 0,
    eclipsePenalty: 0,
    neutronInterference: 0,
    paused: false,
  };

  overlay.classList.add("hidden");
  updateControlButtons();
  updateHud();
}

function addCameraShake(amount) {
  cameraShake = Math.min(2.2, cameraShake + amount);
}

function awardAsteroidDestroyScore() {
  const now = gameState.elapsed;
  if (now - gameState.comboLastKillAt <= scoring.comboWindowSec) {
    gameState.comboCount += 1;
  } else {
    gameState.comboCount = 1;
  }
  gameState.comboLastKillAt = now;

  let mult = 1;
  if (gameState.comboCount >= 3) {
    mult = 1 + Math.min(1.5, (gameState.comboCount - 2) * 0.35);
  }
  const points = Math.max(1, Math.round(scoring.destroyBase * mult));
  gameState.score += points;
  gameState.destroyed += 1;
}

function awardNearMissBonus() {
  gameState.score += scoring.nearMissBonus;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const sx = x1 + dx * t;
  const sy = y1 + dy * t;
  return Math.hypot(px - sx, py - sy);
}

function emitSideThrusterPuff(ship, direction) {
  const side = direction > 0 ? -1 : 1;
  const ang = ship.angle + Math.PI / 2;
  const px = ship.x + Math.cos(ang) * side * 14;
  const py = ship.y + Math.sin(ang) * side * 14;
  for (let i = 0; i < 4; i++) {
    const spread = (Math.random() - 0.5) * 0.8;
    const speed = 80 + Math.random() * 90;
    particles.push({
      x: px + (Math.random() - 0.5) * 4,
      y: py + (Math.random() - 0.5) * 4,
      vx: Math.cos(ang + spread) * speed * side - ship.vx * 0.25,
      vy: Math.sin(ang + spread) * speed * side - ship.vy * 0.25,
      life: 0.2 + Math.random() * 0.16,
      ttl: 0.2 + Math.random() * 0.16,
      color: "#f0f8ff",
      size: 1.2 + Math.random() * 1.3,
      drag: 0.93,
      gravity: 10,
      trail: true,
    });
  }
}

function emitBrakeThrusterPuff(ship) {
  const ang = ship.angle;
  for (let s = -1; s <= 1; s += 2) {
    const px =
      ship.x + Math.cos(ang) * 20 + Math.cos(ang + Math.PI / 2) * s * 8;
    const py =
      ship.y + Math.sin(ang) * 20 + Math.sin(ang + Math.PI / 2) * s * 8;
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.6;
      const speed = 70 + Math.random() * 85;
      particles.push({
        x: px + (Math.random() - 0.5) * 2,
        y: py + (Math.random() - 0.5) * 2,
        vx: Math.cos(ang + spread) * speed + ship.vx * 0.15,
        vy: Math.sin(ang + spread) * speed + ship.vy * 0.15,
        life: 0.16 + Math.random() * 0.13,
        ttl: 0.16 + Math.random() * 0.13,
        color: "#ffffff",
        size: 1 + Math.random() * 1.2,
        drag: 0.92,
        gravity: 8,
        trail: true,
      });
    }
  }
}

function createShieldShatter(
  ship,
  tint = "146,220,255",
  shardColor = "#b9e8ff",
) {
  ship.shieldFlash = Math.max(ship.shieldFlash, 0.36);
  createShockwave(ship.x, ship.y, 90, 110, tint);
  for (let i = 0; i < 28; i++) {
    const ang = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.2;
    const speed = 120 + Math.random() * 180;
    particles.push({
      x: ship.x + Math.cos(ang) * (18 + Math.random() * 6),
      y: ship.y + Math.sin(ang) * (18 + Math.random() * 6),
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0.25 + Math.random() * 0.2,
      ttl: 0.25 + Math.random() * 0.2,
      color: shardColor,
      size: 1 + Math.random() * 1.8,
      drag: 0.95,
      gravity: 12,
    });
  }
}

function activateShield(ship) {
  ship.shieldActive = true;
  ship.shieldTimer = 10;
  ship.shieldFlash = Math.max(ship.shieldFlash, 0.3);
  createExplosion(ship.x, ship.y, "#c98cff", 32, { blast: 1.1 });
  createShockwave(ship.x, ship.y, 85, 90, "186,120,255");
}

function breakShield(ship) {
  if (!ship.shieldActive) return;
  ship.shieldActive = false;
  ship.shieldTimer = 0;
  createShieldShatter(ship, "201,132,255", "#d8b6ff");
  createExplosion(ship.x, ship.y, "#c98cff", 30, { blast: 1.15 });
  addCameraShake(0.7);
}

function getAsteroidProgress() {
  return Math.min(1, gameState.elapsed / 330);
}

function getPrimaryStarLight() {
  const t = gameState ? gameState.elapsed : 0;
  return {
    x: canvas.width * (0.8 + Math.sin(t * 0.07) * 0.08),
    y: canvas.height * (0.16 + Math.cos(t * 0.09) * 0.07),
    intensity: 0.62 + 0.22 * Math.sin(t * 0.13),
  };
}

function createShockwave(x, y, radius, force, tint = "255,170,120") {
  shockwaves.push({
    x,
    y,
    radius: 4,
    maxRadius: radius,
    force,
    life: 0,
    ttl: 0.45 + radius / 700,
    tint,
  });
}

function createAsteroidTrail(x, y, vx, vy, color, amount = 18) {
  for (let i = 0; i < amount; i++) {
    const ang = Math.atan2(vy, vx) + (Math.random() - 0.5) * 1.25;
    const speed = Math.max(
      50,
      Math.hypot(vx, vy) * (0.25 + Math.random() * 0.45),
    );
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(ang) * speed - vx * 0.18,
      vy: Math.sin(ang) * speed - vy * 0.18,
      life: 0.6 + Math.random() * 0.8,
      ttl: 0.6 + Math.random() * 0.8,
      color,
      size: 1 + Math.random() * 2.4,
      drag: 0.962,
      gravity: 16 + Math.random() * 28,
      trail: true,
    });
  }
}

function ensureAudioStarted() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioState.ctx) {
    const audioCtx = new AudioCtx();
    const master = audioCtx.createGain();
    master.gain.value = audioMix.muted ? 0.0001 : audioMix.master;
    master.connect(audioCtx.destination);

    const engineOsc = audioCtx.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 54;
    const engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 220;
    const engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.0001;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();

    const noiseBuffer = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate * 2,
      audioCtx.sampleRate,
    );
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const staticSource = audioCtx.createBufferSource();
    staticSource.buffer = noiseBuffer;
    staticSource.loop = true;
    const staticFilter = audioCtx.createBiquadFilter();
    staticFilter.type = "bandpass";
    staticFilter.frequency.value = 2200;
    staticFilter.Q.value = 0.9;
    const staticGain = audioCtx.createGain();
    staticGain.gain.value = 0.0001;
    staticSource.connect(staticFilter);
    staticFilter.connect(staticGain);
    staticGain.connect(master);
    staticSource.start();

    const hissSource = audioCtx.createBufferSource();
    hissSource.buffer = noiseBuffer;
    hissSource.loop = true;
    const hissFilter = audioCtx.createBiquadFilter();
    hissFilter.type = "highpass";
    hissFilter.frequency.value = 2600;
    const hissGain = audioCtx.createGain();
    hissGain.gain.value = 0.0001;
    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(master);
    hissSource.start();

    const proximityOsc = audioCtx.createOscillator();
    proximityOsc.type = "square";
    proximityOsc.frequency.value = 760;
    const proximityGain = audioCtx.createGain();
    proximityGain.gain.value = 0.0001;
    proximityOsc.connect(proximityGain);
    proximityGain.connect(master);
    proximityOsc.start();

    const damagedOsc = audioCtx.createOscillator();
    damagedOsc.type = "triangle";
    damagedOsc.frequency.value = 92;
    const damagedGain = audioCtx.createGain();
    damagedGain.gain.value = 0.0001;
    damagedOsc.connect(damagedGain);
    damagedGain.connect(master);
    damagedOsc.start();

    const rattleOsc = audioCtx.createOscillator();
    rattleOsc.type = "square";
    rattleOsc.frequency.value = 42;
    const rattleGain = audioCtx.createGain();
    rattleGain.gain.value = 0.0001;
    rattleOsc.connect(rattleGain);
    rattleGain.connect(master);
    rattleOsc.start();

    const sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = "sine";
    sirenOsc.frequency.value = 660;
    const sirenGain = audioCtx.createGain();
    sirenGain.gain.value = 0.0001;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();

    audioState = {
      ctx: audioCtx,
      master,
      engineOsc,
      engineGain,
      engineFilter,
      staticSource,
      staticGain,
      staticFilter,
      hissSource,
      hissGain,
      hissFilter,
      nextHissAt: 0,
      proximityOsc,
      proximityGain,
      proximityNextAt: 0,
      damagedOsc,
      damagedGain,
      rattleOsc,
      rattleGain,
      sirenOsc,
      sirenGain,
    };
  }

  if (audioState.ctx && audioState.ctx.state === "suspended") {
    audioState.ctx.resume();
  }
}

function applyAudioMaster(now = null) {
  if (!audioState.ctx) return;
  const t = now ?? audioState.ctx.currentTime;
  const target = audioMix.muted ? 0.0001 : audioMix.master;
  audioState.master.gain.setTargetAtTime(target, t, 0.06);
}

function toggleAudioMute() {
  audioMix.muted = !audioMix.muted;
  if (audioState.ctx) {
    applyAudioMaster(audioState.ctx.currentTime);
  }
  updateControlButtons();
}

function togglePause() {
  if (
    !gameStarted ||
    instructionsOpen ||
    orientationBlocked ||
    !gameState ||
    gameState.over ||
    gameState.gameOverSequence
  )
    return;
  gameState.paused = !gameState.paused;
  updateControlButtons();
}

function updateControlButtons() {
  if (pauseButton) {
    const paused = !!(gameState && gameState.paused);
    pauseButton.textContent = paused ? "▶" : "⏸";
    pauseButton.title = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-label", paused ? "Resume" : "Pause");
  }
  if (muteButton) {
    const muted = !!audioMix.muted;
    muteButton.textContent = muted ? "🔇" : "🔊";
    muteButton.title = muted ? "Unmute" : "Mute";
    muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }
  if (fullscreenButton) {
    const fs = isFullscreenActive();
    fullscreenButton.textContent = "⛶";
    fullscreenButton.title = fs ? "Exit Fullscreen" : "Fullscreen";
    fullscreenButton.setAttribute(
      "aria-label",
      fs ? "Exit Fullscreen" : "Fullscreen",
    );
    fullscreenButton.classList.toggle("hidden", !hasFullscreenSupport());
  }
  if (instructionsButton) {
    instructionsButton.textContent = "ℹ";
    instructionsButton.title = "Instructions";
    instructionsButton.setAttribute("aria-label", "Instructions");
  }
}

async function toggleFullscreen() {
  const root = document.documentElement;
  const request =
    root.requestFullscreen ||
    root.webkitRequestFullscreen ||
    root.msRequestFullscreen;
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (!isFullscreenActive()) {
    if (request) await request.call(root);
  } else if (exit) {
    await exit.call(document);
  }
}

function isTouchLandscapeMode() {
  return isSmartphoneLike();
}

function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function isSmartphoneLike() {
  const ua = navigator.userAgent || "";
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const coarsePointer =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    navigator.maxTouchPoints > 0;
  return (
    coarsePointer &&
    (mobileUA || window.innerWidth <= 1366 || window.innerHeight <= 1366)
  );
}

function updateInstructionMode() {
  const mobile = isSmartphoneLike();
  for (const block of instructionBlocks) {
    const mode = block.getAttribute("data-instructions");
    block.classList.toggle("hidden", mode === "mobile" ? !mobile : mobile);
  }
}

function applyLandscapeLock() {
  const shouldLock = gameStarted && isTouchLandscapeMode() && isPortrait();
  if (rotateNotice) rotateNotice.classList.toggle("hidden", !shouldLock);
  if (shouldLock) {
    orientationBlocked = true;
    if (gameState && !gameState.over) gameState.paused = true;
    touchInput.active = false;
    touchInput.axisX = 0;
    touchInput.axisY = 0;
    touchInput.pointerId = null;
    resetMotionInput();
  } else if (orientationBlocked) {
    orientationBlocked = false;
    if (
      gameState &&
      !gameState.over &&
      !gameState.gameOverSequence &&
      !instructionsOpen
    ) {
      gameState.paused = false;
    }
  }
  updateControlButtons();
}

function setGameStarted(started) {
  gameStarted = started;
  if (gameHud) gameHud.classList.toggle("hidden", !started);
  if (startMenu) startMenu.classList.toggle("hidden", started);
  if (gameState && started) gameState.paused = false;
  updateInstructionMode();
  applyLandscapeLock();
  updateControlButtons();
}

function startGame() {
  resetGame();
  setGameStarted(true);
  ensureAudioStarted();
  enableMotionControlsFromGesture();
}

function openInstructionsOverlay() {
  if (!gameStarted || !gameState || gameState.over) return;
  instructionsOpen = true;
  gameState.paused = true;
  if (instructionsOverlay) instructionsOverlay.classList.remove("hidden");
  updateControlButtons();
}

function closeInstructionsOverlay() {
  instructionsOpen = false;
  if (instructionsOverlay) instructionsOverlay.classList.add("hidden");
  if (
    gameStarted &&
    gameState &&
    !gameState.over &&
    !gameState.gameOverSequence &&
    !orientationBlocked
  ) {
    gameState.paused = false;
  }
  applyLandscapeLock();
  updateControlButtons();
}

function updateAudio() {
  if (!audioState.ctx || !gameState) return;
  const now = audioState.ctx.currentTime;
  applyAudioMaster(now);
  if (!gameStarted || gameState.over || gameState.paused) {
    audioState.engineGain.gain.setTargetAtTime(0.0001, now, 0.2);
    audioState.staticGain.gain.setTargetAtTime(0.0001, now, 0.2);
    if (audioState.damagedGain) {
      audioState.damagedGain.gain.setTargetAtTime(0.0001, now, 0.2);
    }
    if (audioState.hissGain)
      audioState.hissGain.gain.setTargetAtTime(0.0001, now, 0.2);
    if (audioState.rattleGain)
      audioState.rattleGain.gain.setTargetAtTime(0.0001, now, 0.2);
    if (audioState.sirenGain)
      audioState.sirenGain.gain.setTargetAtTime(0.0001, now, 0.2);
    return;
  }
  const ship = gameState.ship;
  const speed = Math.hypot(ship.vx, ship.vy);
  const thrusting =
    keys.KeyW ||
    keys.KeyA ||
    keys.KeyS ||
    keys.KeyD ||
    keys.ArrowUp ||
    keys.ArrowDown;

  const stage = gameState.life;
  const stage3 = stage >= 3;
  const stage2 = stage === 2;
  const stage1 = stage === 1;

  const baseEngine =
    (0.015 + Math.min(1, speed / 650) * 0.038 + (thrusting ? 0.018 : 0)) *
    (stage3 ? 1 : stage2 ? 0.9 : 0.84);
  const engineFlicker = stage2
    ? 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now * 31))
    : 1;
  const engineLevel = baseEngine * engineFlicker * audioMix.engine;
  const engineFreq =
    (stage3 ? 44 : stage2 ? 50 : 58) +
    Math.min(1, speed / 700) * 30 +
    (thrusting ? 8 : 0);
  audioState.engineGain.gain.setTargetAtTime(engineLevel, now, 0.09);
  audioState.engineOsc.frequency.setTargetAtTime(engineFreq, now, 0.1);
  audioState.engineFilter.frequency.setTargetAtTime(
    (stage3 ? 160 : 210) + engineFreq * 3.1,
    now,
    0.12,
  );

  const staticLevel =
    (0.0028 +
      Math.random() * 0.002 +
      gameState.visibilityPenalty * 0.013 +
      gameState.neutronInterference * 0.012) *
    audioMix.static;
  audioState.staticGain.gain.setTargetAtTime(staticLevel, now, 0.15);

  if (audioState.damagedOsc && audioState.damagedGain) {
    const damaged = stage1 ? 1 : 0;
    const buzz = 92 + Math.sin(now * 9.2) * 11 + Math.sin(now * 17.5) * 3.2;
    audioState.damagedOsc.frequency.setTargetAtTime(buzz, now, 0.08);
    audioState.damagedGain.gain.setTargetAtTime(
      (0.0001 + damaged * 0.014) * audioMix.alert,
      now,
      0.12,
    );
  }

  if (audioState.hissGain) {
    if (stage2 && now >= audioState.nextHissAt) {
      const hissPeak = (0.016 + Math.random() * 0.012) * audioMix.static;
      audioState.hissGain.gain.cancelScheduledValues(now);
      audioState.hissGain.gain.setValueAtTime(hissPeak, now);
      audioState.hissGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.22 + Math.random() * 0.28,
      );
      audioState.nextHissAt = now + 1.2 + Math.random() * 1.5;
    }
    if (!stage2) audioState.hissGain.gain.setTargetAtTime(0.0001, now, 0.12);
  }

  if (audioState.rattleOsc && audioState.rattleGain) {
    const rattleAmp = stage2
      ? (0.004 + Math.min(1, speed / 500) * 0.01) * audioMix.alert
      : 0.0001;
    audioState.rattleOsc.frequency.setTargetAtTime(
      34 + Math.sin(now * 8.5) * 8,
      now,
      0.08,
    );
    audioState.rattleGain.gain.setTargetAtTime(rattleAmp, now, 0.12);
  }

  if (audioState.sirenOsc && audioState.sirenGain) {
    if (stage1) {
      const sirenFreq = 620 + 170 * (0.5 + 0.5 * Math.sin(now * 5.4));
      audioState.sirenOsc.frequency.setTargetAtTime(sirenFreq, now, 0.05);
      audioState.sirenGain.gain.setTargetAtTime(
        0.012 * audioMix.alert,
        now,
        0.08,
      );
    } else {
      audioState.sirenGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }
  }

  let nearest = Infinity;
  for (const asteroid of gameState.asteroids) {
    const d =
      Math.hypot(asteroid.x - ship.x, asteroid.y - ship.y) - asteroid.radius;
    if (d < nearest) nearest = d;
  }
  const alertDist = 255;
  if (nearest < alertDist) {
    const proximity = Math.max(0, 1 - nearest / alertDist);
    const interval = 0.85 - proximity * 0.62;
    if (now >= audioState.proximityNextAt) {
      const freq = 520 + proximity * 680;
      const vol = (0.02 + proximity * 0.05) * audioMix.alert;
      audioState.proximityOsc.frequency.setTargetAtTime(freq, now, 0.01);
      audioState.proximityGain.gain.cancelScheduledValues(now);
      audioState.proximityGain.gain.setValueAtTime(vol, now);
      audioState.proximityGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.16,
      );
      audioState.proximityNextAt = now + interval;
    }
  } else {
    audioState.proximityGain.gain.setTargetAtTime(0.0001, now, 0.08);
  }
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
  if (!nebulae.length) initAmbientSpace();
}

function initAmbientSpace() {
  nebulae = Array.from({ length: 3 }, createNebula);
  starClusters = Array.from({ length: 9 }, createStarCluster);
  blackHoles = Array.from(
    { length: 1 + Math.floor(Math.random() * 2) },
    createBlackHole,
  );
  whiteHoles = Array.from(
    { length: 1 + Math.floor(Math.random() * 2) },
    createWhiteHole,
  );
  exoplanets = Array.from(
    { length: 1 + Math.floor(Math.random() * 2) },
    createExoplanet,
  );
  centaurKuiperObjects = Array.from(
    { length: 8 + Math.floor(Math.random() * 6) },
    createCentaurKuiperObject,
  );
  neutronStars = Array.from(
    { length: 1 + Math.floor(Math.random() * 2) },
    createNeutronStar,
  );
  saturnPlanets = Array.from(
    { length: 1 + Math.floor(Math.random() * 2) },
    createSaturnPlanet,
  );
  supernovaRemnants = Array.from({ length: 1 }, createSupernovaRemnant);
}

function createNebula() {
  const radius = 180 + Math.random() * 300;
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius,
    hue: 180 + Math.random() * 130,
    alpha: 0.08 + Math.random() * 0.11,
    depth: 0.2 + Math.random() * 0.5,
    driftSpeed: 7 + Math.random() * 12,
    speedVar: 2 + Math.random() * 5,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 5,
  };
}

function createStarCluster() {
  const density = 25 + Math.floor(Math.random() * 35);
  const stars = [];
  for (let i = 0; i < density; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.65);
    stars.push({
      r: dist,
      a: ang,
      size: 0.8 + Math.random() * 1.8,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 40 + Math.random() * 90,
    stars,
    depth: 0.35 + Math.random() * 0.55,
    twinkle: Math.random() * Math.PI * 2,
    driftSpeed: 14 + Math.random() * 16,
    speedVar: 3 + Math.random() * 6,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 7,
  };
}

function createBlackHole() {
  const radius = 26 + Math.random() * 26;
  const diskRadius = radius * (2.4 + Math.random() * 0.9);
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.2 + Math.random() * 0.6),
    radius,
    diskRadius,
    pullRadius: diskRadius * (2.25 + Math.random() * 0.55),
    gravity: 540 + Math.random() * 340,
    depth: 0.25 + Math.random() * 0.25,
    spin: Math.random() * Math.PI * 2,
    ringTilt: 0.55 + Math.random() * 0.25,
    lensRadius: diskRadius * (1.2 + Math.random() * 0.35),
    driftSpeed: 4 + Math.random() * 8,
    speedVar: 1.5 + Math.random() * 4,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 5,
  };
}

function createWhiteHole() {
  const radius = 18 + Math.random() * 20;
  const flareRadius = radius * (2.8 + Math.random() * 1.1);
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.16 + Math.random() * 0.68),
    radius,
    flareRadius,
    pushRadius: flareRadius * (1.8 + Math.random() * 0.4),
    repulsion: 280 + Math.random() * 220,
    depth: 0.2 + Math.random() * 0.35,
    spin: Math.random() * Math.PI * 2,
    jetPhase: Math.random() * Math.PI * 2,
    hue: 190 + Math.random() * 50,
    slingshotArmed: false,
    minApproach: Infinity,
    cooldown: 0,
    driftSpeed: 3 + Math.random() * 7,
    speedVar: 1.2 + Math.random() * 3.2,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 5,
  };
}

function createExoplanet() {
  const radius = 46 + Math.random() * 86;
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.14 + Math.random() * 0.72),
    radius,
    depth: 0.18 + Math.random() * 0.34,
    hue: 155 + Math.random() * 180,
    band: Math.random() * Math.PI * 2,
    ringed: Math.random() > 0.55,
    ringTilt: 0.45 + Math.random() * 0.32,
    driftSpeed: 1.8 + Math.random() * 4.2,
    speedVar: 0.8 + Math.random() * 2.8,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 3.8,
  };
}

function createCentaurKuiperObject() {
  const radius = 6 + Math.random() * 16;
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.08 + Math.random() * 0.84),
    radius,
    depth: 0.3 + Math.random() * 0.55,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * (0.2 + Math.random() * 0.45),
    drift: (Math.random() - 0.5) * 24,
    hue: 185 + Math.random() * 45,
    driftSpeed: 14 + Math.random() * 20,
    speedVar: 3 + Math.random() * 8,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 8,
  };
}

function createNeutronStar() {
  const radius = 14 + Math.random() * 10;
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.12 + Math.random() * 0.76),
    radius,
    halo: radius * (2.6 + Math.random() * 1.2),
    depth: 0.22 + Math.random() * 0.28,
    spin: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2,
    jetTilt: Math.random() * Math.PI * 2,
    driftSpeed: 5 + Math.random() * 9,
    speedVar: 1.5 + Math.random() * 4.5,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 5,
  };
}

function createSaturnPlanet() {
  const radius = 58 + Math.random() * 42;
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.18 + Math.random() * 0.66),
    radius,
    ringOuter: radius * (1.85 + Math.random() * 0.24),
    ringInner: radius * (1.25 + Math.random() * 0.18),
    ringTilt: 0.34 + Math.random() * 0.16,
    hue: 30 + Math.random() * 20,
    depth: 0.16 + Math.random() * 0.25,
    spin: Math.random() * Math.PI * 2,
    driftSpeed: 1.4 + Math.random() * 3.6,
    speedVar: 0.7 + Math.random() * 2.2,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 3.2,
  };
}

function createSupernovaRemnant() {
  const radius = 46 + Math.random() * 58;
  return {
    x: Math.random() * canvas.width,
    y: canvas.height * (0.12 + Math.random() * 0.74),
    radius,
    shock: radius * (1.7 + Math.random() * 0.5),
    depth: 0.15 + Math.random() * 0.22,
    pulse: Math.random() * Math.PI * 2,
    hue: Math.random() > 0.5 ? 22 : 198,
    driftSpeed: 1 + Math.random() * 2.2,
    speedVar: 0.4 + Math.random() * 1.2,
    speedPhase: Math.random() * Math.PI * 2,
    verticalDrift: (Math.random() - 0.5) * 2.8,
  };
}

function createKuiperFragment(x, y, sourceVx = 0, sourceVy = 0) {
  const ang = Math.random() * Math.PI * 2;
  const speed = 50 + Math.random() * 120;
  return {
    x,
    y,
    vx: Math.cos(ang) * speed + sourceVx * 0.2,
    vy: Math.sin(ang) * speed + sourceVy * 0.2,
    radius: 6 + Math.random() * 4,
    life: 9 + Math.random() * 4,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * 2.4,
    pulse: Math.random() * Math.PI * 2,
  };
}

function spawnKuiperFragments(x, y, sourceVx = 0, sourceVy = 0) {
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    kuiperFragments.push(createKuiperFragment(x, y, sourceVx, sourceVy));
  }
}

function createSupernova() {
  return {
    x: canvas.width * (0.62 + Math.random() * 0.35),
    y: canvas.height * (0.12 + Math.random() * 0.68),
    life: 0,
    ttl: 2.6 + Math.random() * 1.3,
    maxRadius: 90 + Math.random() * 120,
    tint: Math.random() > 0.5 ? "130,220,255" : "255,186,130",
  };
}

function createDebrisField() {
  const count = 7 + Math.floor(Math.random() * 10);
  const scraps = [];
  for (let i = 0; i < count; i++) {
    scraps.push({
      x: Math.random() * 120 - 60,
      y: Math.random() * 70 - 35,
      w: 4 + Math.random() * 12,
      h: 2 + Math.random() * 5,
      r: Math.random() * Math.PI * 2,
    });
  }

  return {
    x: canvas.width + 120,
    y: 50 + Math.random() * (canvas.height - 100),
    speed: 95 + Math.random() * 85,
    depth: 0.65 + Math.random() * 0.4,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.6,
    scraps,
  };
}

function createAbandonedStation() {
  return {
    x: canvas.width + 180,
    y: 80 + Math.random() * (canvas.height - 160),
    speed: 60 + Math.random() * 40,
    depth: 0.75 + Math.random() * 0.25,
    scale: 0.7 + Math.random() * 0.7,
    tilt: (Math.random() - 0.5) * 0.4,
    blink: Math.random() * Math.PI * 2,
  };
}

function createGravityZone() {
  return {
    x: canvas.width + 180,
    y: 80 + Math.random() * (canvas.height - 160),
    radius: 95 + Math.random() * 55,
    strength: 60 + Math.random() * 55,
    speed: 22 + Math.random() * 18,
    phase: Math.random() * Math.PI * 2,
  };
}

function createSolarFlare() {
  return {
    life: 0,
    ttl: 1.2 + Math.random() * 1.0,
    intensity: 0.28 + Math.random() * 0.22,
    hue: Math.random() > 0.5 ? "255,174,102" : "132,210,255",
  };
}

function createDarkMatterCloud() {
  return {
    x: canvas.width + 180,
    y: 60 + Math.random() * (canvas.height - 120),
    radius: 135 + Math.random() * 120,
    speed: 24 + Math.random() * 18,
    density: 0.18 + Math.random() * 0.16,
    pulse: Math.random() * Math.PI * 2,
  };
}

function createWormhole() {
  return {
    x: canvas.width + 220,
    y: 100 + Math.random() * (canvas.height - 200),
    radius: 38 + Math.random() * 18,
    speed: 30 + Math.random() * 20,
    spin: Math.random() * Math.PI * 2,
  };
}

function createIonCloud() {
  return {
    x: canvas.width + 140,
    y: 90 + Math.random() * (canvas.height - 180),
    radius: 44 + Math.random() * 24,
    speed: 24 + Math.random() * 16,
    pulse: Math.random() * Math.PI * 2,
    charged: true,
  };
}

function createComet() {
  const fromTop = Math.random() > 0.5;
  const startY = fromTop
    ? 40 + Math.random() * 120
    : canvas.height - (40 + Math.random() * 120);
  const slope = (fromTop ? 1 : -1) * (110 + Math.random() * 100);
  return {
    x: canvas.width + 200,
    y: startY,
    vx: -(520 + Math.random() * 220),
    vy: slope,
    radius: 12 + Math.random() * 4,
    tail: 120 + Math.random() * 90,
    spin: Math.random() * Math.PI * 2,
  };
}

function createProbeWreckage() {
  return {
    x: canvas.width + 180,
    y: 80 + Math.random() * (canvas.height - 160),
    speed: 32 + Math.random() * 20,
    drift: (Math.random() - 0.5) * 26,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.55,
    scale: 0.6 + Math.random() * 0.8,
    style: Math.random() > 0.5 ? "satellite" : "probe",
  };
}

function createShieldOrb() {
  return {
    x: canvas.width + 140,
    y: 85 + Math.random() * (canvas.height - 170),
    radius: 17 + Math.random() * 5,
    speed: 58 + Math.random() * 28,
    pulse: Math.random() * Math.PI * 2,
    spin: Math.random() * Math.PI * 2,
  };
}

function findSafeTeleportPoint() {
  for (let i = 0; i < 24; i++) {
    const x = 100 + Math.random() * (canvas.width - 200);
    const y = 90 + Math.random() * (canvas.height - 180);
    let safe = true;

    for (const asteroid of gameState.asteroids) {
      if (Math.hypot(asteroid.x - x, asteroid.y - y) < asteroid.radius + 130) {
        safe = false;
        break;
      }
    }
    if (!safe) continue;

    for (const planet of gameState.planets) {
      if (Math.hypot(planet.x - x, planet.y - y) < planet.radius + 95) {
        safe = false;
        break;
      }
    }
    if (safe) return { x, y };
  }

  return {
    x: canvas.width * (0.35 + Math.random() * 0.45),
    y: canvas.height * (0.2 + Math.random() * 0.6),
  };
}

function getAsteroidType(progress) {
  const weights = {
    normal: Math.max(0.34, 0.72 - progress * 0.34),
    heavy: 0.16 + progress * 0.16,
    explosive: 0.11 + progress * 0.1,
    splitting: 0.13 + progress * 0.12,
    magnetic: 0.1 + progress * 0.2,
  };
  const total =
    weights.normal +
    weights.heavy +
    weights.explosive +
    weights.splitting +
    weights.magnetic;
  let roll = Math.random() * total;

  roll -= weights.normal;
  if (roll < 0) return "normal";
  roll -= weights.heavy;
  if (roll < 0) return "heavy";
  roll -= weights.explosive;
  if (roll < 0) return "explosive";
  roll -= weights.splitting;
  if (roll < 0) return "splitting";
  return "magnetic";
}

function getAsteroidStats(type, progress, radius) {
  const scaledRadius = Math.max(config.asteroidMinRadius * 0.55, radius);
  if (type === "heavy") {
    const hp = 2 + (progress > 0.55 ? 1 : 0);
    return {
      hp,
      maxHp: hp,
      score: 4 + hp,
      speedMul: 0.82,
      blastRadius: 0,
      magneticPull: 0,
    };
  }
  if (type === "explosive") {
    return {
      hp: 1,
      maxHp: 1,
      score: 5,
      speedMul: 0.95,
      blastRadius: scaledRadius * (2.0 + progress * 0.55),
      magneticPull: 0,
    };
  }
  if (type === "splitting") {
    return {
      hp: 1,
      maxHp: 1,
      score: 4,
      speedMul: 0.9,
      blastRadius: 0,
      magneticPull: 0,
    };
  }
  if (type === "magnetic") {
    return {
      hp: 1,
      maxHp: 1,
      score: 5,
      speedMul: 1.02,
      blastRadius: 0,
      magneticPull: 28 + progress * 20,
    };
  }
  return {
    hp: 1,
    maxHp: 1,
    score: 2,
    speedMul: 1,
    blastRadius: 0,
    magneticPull: 0,
  };
}

function spawnAsteroid(options = {}) {
  const progress = getAsteroidProgress();
  const difficulty = 1 + gameState.elapsed * 0.03;
  const type = options.type || getAsteroidType(progress);
  const radius =
    options.radius ||
    config.asteroidMinRadius +
      Math.random() * (config.asteroidMaxRadius - config.asteroidMinRadius);
  const profile = createAsteroidProfile(radius);
  const stats = getAsteroidStats(type, progress, radius);
  const speedBase = 130 + Math.random() * 70 + difficulty * 18;
  const spawnX = options.x ?? canvas.width + radius + 40;
  const spawnY =
    options.y ??
    Math.max(
      radius,
      Math.min(
        canvas.height - radius,
        radius + Math.random() * (canvas.height - radius * 2),
      ),
    );
  const mineralSpots = Array.from(
    { length: 5 + Math.floor(Math.random() * 5) },
    () => {
      const ang = Math.random() * Math.PI * 2;
      const dist = radius * (0.08 + Math.random() * 0.62);
      return {
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: radius * (0.05 + Math.random() * 0.15),
        a: 0.08 + Math.random() * 0.15,
      };
    },
  );

  gameState.asteroids.push({
    x: spawnX,
    y: spawnY,
    radius,
    type,
    hp: options.hp ?? stats.hp,
    maxHp: options.maxHp ?? stats.maxHp,
    scoreValue: options.scoreValue ?? stats.score,
    splitGen: options.splitGen ?? 0,
    blastRadius: options.blastRadius ?? stats.blastRadius,
    magneticPull: options.magneticPull ?? stats.magneticPull,
    profile,
    speed:
      speedBase *
      stats.speedMul *
      (options.speedMul ?? 1) *
      (1 + progress * 0.45),
    drift: options.drift ?? (Math.random() - 0.5) * 80,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 1.6,
    spin3d: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.8 + Math.random() * 1.6,
    tiltBase: 0.72 + Math.random() * 0.24,
    tiltAmp: 0.05 + Math.random() * 0.15,
    surfaceSeed: Math.random() * Math.PI * 2,
    surfaceRoughness: 0.45 + Math.random() * 0.5,
    striationFreq: 1.5 + Math.random() * 2.2,
    striationAmp: radius * (0.04 + Math.random() * 0.06),
    mineralSpots,
    hitFlash: 0,
    nearMissArmed: false,
    nearMissAwarded: false,
  });
}

function queueAsteroidSpawn(delay, options = {}) {
  asteroidSpawnQueue.push({ delay, options });
}

function spawnSplitAsteroids(parent) {
  if (parent.splitGen >= 1 || parent.radius < 18) return;
  const childCount = 2 + (Math.random() > 0.6 ? 1 : 0);
  for (let i = 0; i < childCount; i++) {
    const ang = (Math.PI * 2 * i) / childCount + Math.random() * 0.35;
    const drift = Math.sin(ang) * (120 + Math.random() * 40);
    spawnAsteroid({
      type: "normal",
      radius: parent.radius * (0.42 + Math.random() * 0.08),
      x: parent.x + Math.cos(ang) * 12,
      y: parent.y + Math.sin(ang) * 16,
      speedMul: 1.08,
      drift,
      splitGen: parent.splitGen + 1,
      scoreValue: 1,
    });
  }
}

function destroyAsteroid(index, source = "shot", awardScore = false) {
  const asteroid = gameState.asteroids[index];
  if (!asteroid) return false;

  gameState.asteroids.splice(index, 1);

  const colorByType = {
    normal: "#ffc27f",
    heavy: "#ffd8a6",
    explosive: "#ff8f6c",
    splitting: "#ffe28f",
    magnetic: "#93d8ff",
  };
  createExplosion(
    asteroid.x,
    asteroid.y,
    colorByType[asteroid.type] || "#ffc27f",
    22,
    {
      sourceVx: -asteroid.speed,
      sourceVy: asteroid.drift,
      blast: 0.9,
    },
  );
  createAsteroidTrail(
    asteroid.x,
    asteroid.y,
    -asteroid.speed,
    asteroid.drift,
    colorByType[asteroid.type] || "#ffc27f",
    14 + Math.floor(asteroid.radius * 0.2),
  );

  if (awardScore) {
    awardAsteroidDestroyScore();
  }

  if (asteroid.type === "splitting" && source !== "offscreen") {
    spawnSplitAsteroids(asteroid);
  }

  if (asteroid.type === "explosive") {
    triggerAsteroidExplosion(
      asteroid,
      source !== "collision" && source !== "offscreen",
    );
  }

  return true;
}

function triggerAsteroidExplosion(origin, canDamageShip = true) {
  const blastRadius = origin.blastRadius || origin.radius * 2.2;
  createExplosion(origin.x, origin.y, "#ff7b59", 44, {
    sourceVx: -origin.speed * 0.4,
    sourceVy: origin.drift * 0.4,
    blast: 1.35,
  });
  createShockwave(
    origin.x,
    origin.y,
    blastRadius,
    180 + origin.radius * 1.9,
    "255,145,110",
  );

  const shipDist = Math.hypot(
    gameState.ship.x - origin.x,
    gameState.ship.y - origin.y,
  );
  if (canDamageShip && shipDist < blastRadius + config.shipRadius * 0.4) {
    damageShip();
  }

  for (let i = gameState.asteroids.length - 1; i >= 0; i--) {
    const asteroid = gameState.asteroids[i];
    const d = Math.hypot(asteroid.x - origin.x, asteroid.y - origin.y);
    if (d < blastRadius + asteroid.radius * 0.35) {
      asteroid.hp -= 2;
      asteroid.hitFlash = 0.22;
      const push = (1 - d / Math.max(1, blastRadius)) * 130;
      asteroid.x += ((asteroid.x - origin.x) / Math.max(1, d)) * push * 0.016;
      asteroid.y += ((asteroid.y - origin.y) / Math.max(1, d)) * push * 0.016;
      if (asteroid.hp <= 0) {
        destroyAsteroid(i, "blast", true);
      }
    }
  }
}

function damageAsteroid(index, amount, source = "shot", awardScore = false) {
  const asteroid = gameState.asteroids[index];
  if (!asteroid) return false;
  asteroid.hp -= amount;
  asteroid.hitFlash = 0.2;

  if (asteroid.hp <= 0) {
    destroyAsteroid(index, source, awardScore);
    return true;
  }

  createExplosion(asteroid.x, asteroid.y, "#ffe5b8", 8);
  return false;
}

function scheduleNextAsteroidSpawn() {
  const progress = getAsteroidProgress();
  const baseDelay = Math.max(0.24, 1.45 - progress * 0.95);
  gameState.asteroidSpawnTimer =
    baseDelay + Math.random() * Math.max(0.18, 0.58 - progress * 0.22);
}

function spawnWavePattern(progress) {
  const count = 5 + Math.floor(progress * 4);
  const center = canvas.height * (0.28 + Math.random() * 0.44);
  const amp = canvas.height * (0.12 + progress * 0.12);
  const phase = Math.random() * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const y = center + Math.sin(phase + i * 0.9) * amp;
    queueAsteroidSpawn(i * 0.14, {
      y: Math.max(34, Math.min(canvas.height - 34, y)),
      type: Math.random() > 0.72 ? "magnetic" : getAsteroidType(progress),
      speedMul: 1.05 + progress * 0.24,
      drift: Math.cos(phase + i * 0.8) * 45,
    });
  }
}

function spawnSpiralPattern(progress) {
  const count = 7 + Math.floor(progress * 5);
  const centerY = canvas.height * (0.24 + Math.random() * 0.52);

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const spiralR = 20 + t * (70 + progress * 45);
    const ang = i * (0.68 + progress * 0.2) + Math.random() * 0.15;
    const y = centerY + Math.sin(ang) * spiralR;
    queueAsteroidSpawn(i * 0.1, {
      x: canvas.width + 70 + i * 18,
      y: Math.max(30, Math.min(canvas.height - 30, y)),
      type: i % 3 === 0 ? "heavy" : getAsteroidType(progress),
      speedMul: 1.08 + progress * 0.28,
      drift: Math.cos(ang) * (60 + progress * 32),
    });
  }
}

function spawnTunnelPattern(progress) {
  const columns = 6 + Math.floor(progress * 4);
  const gap = Math.max(125, 190 - progress * 48);
  const gapCenter = canvas.height * (0.3 + Math.random() * 0.4);
  const topEnd = Math.max(40, gapCenter - gap * 0.5);
  const bottomStart = Math.min(canvas.height - 40, gapCenter + gap * 0.5);

  for (let i = 0; i < columns; i++) {
    const delay = i * 0.11;
    queueAsteroidSpawn(delay, {
      x: canvas.width + 85 + i * 24,
      y: 24 + Math.random() * (topEnd - 24),
      type: i % 2 === 0 ? "heavy" : getAsteroidType(progress),
      speedMul: 1.02 + progress * 0.26,
      drift: 16 + Math.random() * 20,
    });
    queueAsteroidSpawn(delay, {
      x: canvas.width + 85 + i * 24,
      y: bottomStart + Math.random() * (canvas.height - bottomStart - 24),
      type: i % 3 === 0 ? "magnetic" : getAsteroidType(progress),
      speedMul: 1.02 + progress * 0.26,
      drift: -(16 + Math.random() * 20),
    });
  }
}

function spawnAsteroidPattern(progress) {
  const patterns = ["wave"];
  if (progress > 0.45) patterns.push("spiral");
  if (progress > 0.68) patterns.push("tunnel");
  const pick = patterns[Math.floor(Math.random() * patterns.length)];

  if (pick === "spiral") spawnSpiralPattern(progress);
  else if (pick === "tunnel") spawnTunnelPattern(progress);
  else spawnWavePattern(progress);
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
  if (
    !gameStarted ||
    gameState.over ||
    gameState.paused ||
    ship.fireCooldown > 0 ||
    gameState.ammo <= 0
  )
    return;

  const angle = ship.angle;
  gameState.bullets.push({
    x: ship.x + Math.cos(angle) * 30,
    y: ship.y + Math.sin(angle) * 30,
    vx: Math.cos(angle) * config.bulletSpeed,
    vy: Math.sin(angle) * config.bulletSpeed,
    life: 1.2,
  });

  ship.fireCooldown = 0.12;
  ship.muzzleFlash = 0.18;
  const ammoUse = gameState.ammoBoostTimer > 0 ? 0.65 : 1;
  gameState.ammo = Math.max(0, gameState.ammo - ammoUse);
}

function createExplosion(x, y, color, amount = 24, options = {}) {
  const sourceVx = options.sourceVx || 0;
  const sourceVy = options.sourceVy || 0;
  const blast = options.blast || 1;
  for (let i = 0; i < amount; i++) {
    const speed = (40 + Math.random() * 250) * blast;
    const ang = Math.random() * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed + sourceVx * (0.2 + Math.random() * 0.14),
      vy: Math.sin(ang) * speed + sourceVy * (0.2 + Math.random() * 0.14),
      life: 0.5 + Math.random() * 0.6,
      ttl: 0.5 + Math.random() * 0.6,
      color,
      size: 1 + Math.random() * 3,
      drag: 0.985,
      gravity: 22 + Math.random() * 35,
    });
  }
}

function damageShip() {
  const ship = gameState.ship;
  if (ship.invulnerableFor > 0 || gameState.over || gameState.gameOverSequence)
    return;

  if (ship.shieldActive && ship.shieldTimer > 0) {
    breakShield(ship);
    ship.invulnerableFor = Math.max(ship.invulnerableFor, 0.55);
    return;
  }

  createShieldShatter(ship);
  gameState.life = Math.max(0, gameState.life - 1);
  gameState.consecutiveHits += 1;
  ship.invulnerableFor = 1.2;
  createExplosion(ship.x, ship.y, "#ff964f", 40);
  addCameraShake(0.95);

  if (gameState.life <= 0 || gameState.consecutiveHits >= 3) {
    startGameOverSequence();
  }
}

function healShip() {
  gameState.life = Math.min(config.maxLife, gameState.life + 1);
  gameState.consecutiveHits = 0;
  createExplosion(gameState.ship.x, gameState.ship.y, "#86ff9b", 28);
}

function refillAmmo() {
  gameState.ammo = getAmmoCap();
  createExplosion(gameState.ship.x, gameState.ship.y, "#76e9ff", 24);
}

function getAmmoCap() {
  return config.maxAmmo + (gameState.ammoBoostTimer > 0 ? 20 : 0);
}

function activateAmmoBoost(amount = 10, duration = 10) {
  gameState.ammoBoostTimer = Math.max(gameState.ammoBoostTimer, duration);
  gameState.ammoBoostTick = 0;
  gameState.ammo = Math.min(getAmmoCap(), gameState.ammo + amount);
  createExplosion(gameState.ship.x, gameState.ship.y, "#98e5ff", 22);
}

function gameOver() {
  gameState.over = true;
  cameraShake = 0;
  finalScore.textContent = gameState.score;
  overlay.classList.remove("hidden");
}

function startGameOverSequence() {
  if (gameState.gameOverSequence || gameState.over) return;
  gameState.gameOverSequence = true;
  gameState.gameOverTimer = 1.55;
  createExplosion(gameState.ship.x, gameState.ship.y, "#ff9e74", 90, {
    sourceVx: gameState.ship.vx,
    sourceVy: gameState.ship.vy,
    blast: 1.55,
  });
  createShockwave(gameState.ship.x, gameState.ship.y, 240, 320, "255,150,110");
  addCameraShake(2);
}

function updateShipDamageEffects(dt) {
  const ship = gameState.ship;
  if (gameState.life >= 3 || gameState.over) return;

  ship.damageFxTimer -= dt;
  if (ship.damageFxTimer > 0) return;

  if (gameState.life === 2) {
    ship.damageFxTimer = 0.08 + Math.random() * 0.06;
    particles.push({
      x: ship.x - 10 + (Math.random() - 0.5) * 20,
      y: ship.y + 6 + (Math.random() - 0.5) * 16,
      vx: -40 + Math.random() * 30,
      vy: -18 + Math.random() * 34,
      life: 0.45 + Math.random() * 0.3,
      ttl: 0.45 + Math.random() * 0.3,
      color: "#7a8a98",
      size: 2 + Math.random() * 2,
      drag: 0.95,
      gravity: -5 + Math.random() * 10,
      trail: true,
    });
    if (Math.random() > 0.65) {
      particles.push({
        x: ship.x - 8 + (Math.random() - 0.5) * 14,
        y: ship.y + (Math.random() - 0.5) * 10,
        vx: -110 + Math.random() * 65,
        vy: -45 + Math.random() * 90,
        life: 0.22 + Math.random() * 0.16,
        ttl: 0.22 + Math.random() * 0.16,
        color: "#ffd58a",
        size: 1 + Math.random() * 1.5,
        drag: 0.94,
        gravity: 35,
      });
    }
  } else if (gameState.life === 1) {
    ship.damageFxTimer = 0.06 + Math.random() * 0.05;
    particles.push({
      x: ship.x - 8 + (Math.random() - 0.5) * 22,
      y: ship.y + 8 + (Math.random() - 0.5) * 20,
      vx: -28 + Math.random() * 24,
      vy: -30 + Math.random() * 30,
      life: 0.75 + Math.random() * 0.45,
      ttl: 0.75 + Math.random() * 0.45,
      color: "#5f6b77",
      size: 2.6 + Math.random() * 2.3,
      drag: 0.955,
      gravity: -8 + Math.random() * 10,
      trail: true,
    });
    particles.push({
      x: ship.x - 6 + (Math.random() - 0.5) * 16,
      y: ship.y + (Math.random() - 0.5) * 12,
      vx: -135 + Math.random() * 80,
      vy: -65 + Math.random() * 120,
      life: 0.16 + Math.random() * 0.15,
      ttl: 0.16 + Math.random() * 0.15,
      color: "#ffe69b",
      size: 1 + Math.random() * 1.2,
      drag: 0.94,
      gravity: 45,
    });
  }
}

function updateHud() {
  const lifePct = (gameState.life / config.maxLife) * 100;
  const ammoCap = getAmmoCap();
  const ammoPct = (gameState.ammo / ammoCap) * 100;
  const deepSpaceProgress = Math.min(
    1,
    Math.max(0, (gameState.elapsed - gameState.advancedPhaseAt) / 180),
  );

  lifeBar.style.width = `${lifePct}%`;
  weaponBar.style.width = `${ammoPct}%`;
  lifeText.textContent = `${gameState.life} / ${config.maxLife}`;
  const ammoText = `${Math.floor(gameState.ammo)} / ${ammoCap}`;
  weaponText.textContent =
    gameState.ammoBoostTimer > 0 ? `${ammoText} BOOST` : ammoText;
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
  deepSpaceText.textContent = `${Math.round(deepSpaceProgress * 100)}%`;
}

function update(dt, rawDt = dt) {
  if (!gameStarted) return;
  if (gameState.over || gameState.paused) return;

  const ship = gameState.ship;
  gameState.elapsed += dt;

  if (gameState.gameOverSequence) {
    gameState.gameOverTimer -= rawDt;
    cameraShake = Math.max(0, cameraShake - dt * 2.4);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag || 0.985;
      p.vy *= p.drag || 0.985;
      p.vy += (p.gravity || 0) * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const wave = shockwaves[i];
      wave.life += dt;
      const t = wave.life / wave.ttl;
      wave.radius = wave.maxRadius * t;
      if (wave.life >= wave.ttl) shockwaves.splice(i, 1);
    }
    if (gameState.gameOverTimer <= 0) {
      gameState.gameOverSequence = false;
      gameOver();
    }
    return;
  }

  if (gameState.elapsed >= gameState.nextSurvivalBonusAt) {
    gameState.score += scoring.survivalMinuteBonus;
    gameState.nextSurvivalBonusAt += 60;
  }

  const motionActive = isSmartphoneLike() && motionInput.enabled;
  const motionFresh =
    motionActive && performance.now() - motionInput.lastEventAt <= 420;
  const motionAxisX = motionFresh ? motionInput.axisX : 0;
  const motionAxisY = motionFresh ? motionInput.axisY : 0;
  const touchAxisX =
    !motionActive && touchInput.active ? touchInput.axisX : 0;
  const touchAxisY =
    !motionActive && touchInput.active ? touchInput.axisY : 0;

  const up = keys.KeyW || keys.ArrowUp;
  const down = keys.KeyS || keys.ArrowDown;
  const left = keys.KeyA || keys.ArrowLeft;
  const right = keys.KeyD || keys.ArrowRight;

  const axisX = (right ? 1 : 0) - (left ? 1 : 0) + touchAxisX + motionAxisX;
  const axisY = (down ? 1 : 0) - (up ? 1 : 0) + touchAxisY + motionAxisY;
  const moving = Math.hypot(axisX, axisY) > 0.06;
  const boosting = (keys.ShiftLeft || keys.ShiftRight) && moving;
  ship.boosting = boosting;

  const accel = boosting ? 1040 : 780;
  const drag = Math.exp(-(boosting ? 1.45 : 1.9) * dt);
  const maxSpeed = boosting ? 610 : 455;
  const axisLen = Math.hypot(axisX, axisY) || 1;
  const nx = axisX / axisLen;
  const ny = axisY / axisLen;

  const shipPrevX = ship.x;
  const shipPrevY = ship.y;

  ship.vx += nx * accel * dt;
  ship.vy += ny * accel * dt;

  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > maxSpeed) {
    const s = maxSpeed / speed;
    ship.vx *= s;
    ship.vy *= s;
  }
  ship.boostHeat = Math.max(
    0,
    Math.min(1, ship.boostHeat + (boosting ? 2.4 : -1.8) * dt),
  );
  ship.steerVisual += (axisX - ship.steerVisual) * Math.min(1, dt * 9);
  ship.sideThrusterTimer = Math.max(0, ship.sideThrusterTimer - dt);
  ship.brakeThrusterTimer = Math.max(0, ship.brakeThrusterTimer - dt);
  ship.shieldFlash = Math.max(0, ship.shieldFlash - dt * 3.6);
  ship.muzzleFlash = Math.max(0, ship.muzzleFlash - dt * 7.5);
  ship.dangerHexTimer = Math.max(0, ship.dangerHexTimer - dt * 2.8);

  if (axisX !== 0 && ship.sideThrusterTimer <= 0) {
    emitSideThrusterPuff(ship, axisX);
    ship.sideThrusterTimer = 0.045;
  }
  if (
    axisX === 0 &&
    axisY === 0 &&
    speed > 140 &&
    ship.brakeThrusterTimer <= 0
  ) {
    emitBrakeThrusterPuff(ship);
    ship.brakeThrusterTimer = 0.07;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.x = Math.max(60, Math.min(canvas.width - 60, ship.x));
  ship.y = Math.max(60, Math.min(canvas.height - 60, ship.y));

  const nowMs = performance.now();
  const mouseActive =
    (mouse.down || (mouse.hasMoved && nowMs - mouse.lastMoveAt < 2200)) &&
    !touchInput.active;
  let targetAngle = ship.angle;
  if ((touchInput.active || motionActive) && Math.hypot(axisX, axisY) > 0.08) {
    targetAngle = Math.atan2(axisY, axisX);
  } else if (mouseActive) {
    targetAngle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
  } else if (Math.hypot(ship.vx, ship.vy) > 18) {
    targetAngle = Math.atan2(ship.vy, ship.vx);
  }
  let delta = targetAngle - ship.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  ship.angle += delta * Math.min(1, dt * 14);
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  ship.invulnerableFor = Math.max(0, ship.invulnerableFor - dt);
  ship.wormholeCooldown = Math.max(0, ship.wormholeCooldown - dt);
  if (ship.shieldActive) {
    ship.shieldTimer = Math.max(0, ship.shieldTimer - dt);
    if (ship.shieldTimer <= 0) {
      ship.shieldActive = false;
    }
  }
  if (gameState.ammoBoostTimer > 0) {
    gameState.ammoBoostTimer = Math.max(0, gameState.ammoBoostTimer - dt);
    gameState.ammoBoostTick += dt;
    if (gameState.ammoBoostTick >= 0.55) {
      gameState.ammoBoostTick = 0;
      gameState.ammo = Math.min(getAmmoCap(), gameState.ammo + 1);
    }
  } else {
    gameState.ammoBoostTick = 0;
    gameState.ammo = Math.min(getAmmoCap(), gameState.ammo);
  }

  if ((mouse.down || keys.Space) && gameState.ammo > 0) shoot();

  if (
    !gameState.advancedUnlocked &&
    gameState.elapsed >= gameState.advancedPhaseAt
  ) {
    gameState.advancedUnlocked = true;
    gravityZones.push(createGravityZone());
    darkMatterClouds.push(createDarkMatterCloud());
    wormholes.push(createWormhole());
  }

  for (let i = asteroidSpawnQueue.length - 1; i >= 0; i--) {
    const queued = asteroidSpawnQueue[i];
    queued.delay -= dt;
    if (queued.delay <= 0) {
      spawnAsteroid(queued.options);
      asteroidSpawnQueue.splice(i, 1);
    }
  }

  gameState.asteroidSpawnTimer -= dt;
  if (gameState.asteroidSpawnTimer <= 0) {
    const asteroidProgress = getAsteroidProgress();
    const patternChance =
      asteroidProgress < 0.28 ? 0 : 0.18 + asteroidProgress * 0.45;
    if (Math.random() < patternChance) {
      spawnAsteroidPattern(asteroidProgress);
    } else {
      spawnAsteroid();
    }
    scheduleNextAsteroidSpawn();
  }

  gameState.supportPlanetTimer -= dt;
  if (gameState.supportPlanetTimer <= 0) {
    spawnPlanet(Math.random() > 0.5 ? "life" : "weapon");
    gameState.supportPlanetTimer = 8 + Math.random() * 6;
  }

  gameState.ionCloudTimer -= dt;
  if (gameState.ionCloudTimer <= 0) {
    ionClouds.push(createIonCloud());
    gameState.ionCloudTimer = 18 + Math.random() * 14;
  }

  gameState.cometTimer -= dt;
  if (gameState.cometTimer <= 0) {
    comets.push(createComet());
    gameState.cometTimer = 13 + Math.random() * 12;
  }

  gameState.probeWreckTimer -= dt;
  if (gameState.probeWreckTimer <= 0) {
    probeWreckage.push(createProbeWreckage());
    gameState.probeWreckTimer = 30 + Math.random() * 26;
  }

  gameState.shieldOrbTimer -= dt;
  if (gameState.shieldOrbTimer <= 0) {
    shieldOrbs.push(createShieldOrb());
    gameState.shieldOrbTimer = 24 + Math.random() * 18;
  }

  for (let i = ionClouds.length - 1; i >= 0; i--) {
    const cloud = ionClouds[i];
    const cloudPrevX = cloud.x;
    const cloudPrevY = cloud.y;
    cloud.x -= cloud.speed * dt;
    cloud.pulse += dt * 3.2;
    if (cloud.x < -cloud.radius - 80) {
      ionClouds.splice(i, 1);
      continue;
    }
    const pickupRadius = cloud.radius * 1.35 + config.shipRadius + 20;
    const directDistNow = Math.hypot(cloud.x - ship.x, cloud.y - ship.y);
    const directDistPrev = Math.hypot(cloudPrevX - ship.x, cloudPrevY - ship.y);
    const sweepDistNow = distancePointToSegment(
      cloud.x,
      cloud.y,
      shipPrevX,
      shipPrevY,
      ship.x,
      ship.y,
    );
    const sweepDistPrev = distancePointToSegment(
      cloudPrevX,
      cloudPrevY,
      shipPrevX,
      shipPrevY,
      ship.x,
      ship.y,
    );
    if (
      cloud.charged &&
      Math.min(directDistNow, directDistPrev, sweepDistNow, sweepDistPrev) <
        pickupRadius
    ) {
      healShip();
      refillAmmo();
      ship.invulnerableFor = Math.max(ship.invulnerableFor, 0.7);
      cloud.charged = false;
      createExplosion(cloud.x, cloud.y, "#8ff3ff", 30, { blast: 1.1 });
      ionClouds.splice(i, 1);
    }
  }

  for (let i = shieldOrbs.length - 1; i >= 0; i--) {
    const orb = shieldOrbs[i];
    const prevX = orb.x;
    const prevY = orb.y;
    orb.x -= orb.speed * dt;
    orb.pulse += dt * 2.6;
    orb.spin += dt * 2.1;
    if (orb.x < -orb.radius - 70) {
      shieldOrbs.splice(i, 1);
      continue;
    }
    const pickupRadius = orb.radius + config.shipRadius + 10;
    const directNow = Math.hypot(orb.x - ship.x, orb.y - ship.y);
    const sweepNow = distancePointToSegment(
      orb.x,
      orb.y,
      shipPrevX,
      shipPrevY,
      ship.x,
      ship.y,
    );
    const sweepPrev = distancePointToSegment(
      prevX,
      prevY,
      shipPrevX,
      shipPrevY,
      ship.x,
      ship.y,
    );
    if (Math.min(directNow, sweepNow, sweepPrev) < pickupRadius) {
      activateShield(ship);
      createExplosion(orb.x, orb.y, "#cc86ff", 28, { blast: 1.2 });
      shieldOrbs.splice(i, 1);
    }
  }

  for (let i = kuiperFragments.length - 1; i >= 0; i--) {
    const frag = kuiperFragments[i];
    frag.x += frag.vx * dt;
    frag.y += frag.vy * dt;
    frag.vx *= 0.992;
    frag.vy *= 0.992;
    frag.spin += frag.spinSpeed * dt;
    frag.pulse += dt * 4.1;
    frag.life -= dt;

    if (
      frag.life <= 0 ||
      frag.x < -60 ||
      frag.y < -60 ||
      frag.x > canvas.width + 60 ||
      frag.y > canvas.height + 60
    ) {
      kuiperFragments.splice(i, 1);
      continue;
    }

    if (
      Math.hypot(frag.x - ship.x, frag.y - ship.y) <
      frag.radius + config.shipRadius * 0.72
    ) {
      activateAmmoBoost(12, 10);
      createExplosion(frag.x, frag.y, "#9be8ff", 16, { blast: 0.95 });
      kuiperFragments.splice(i, 1);
    }
  }

  for (let i = gameState.asteroids.length - 1; i >= 0; i--) {
    const asteroid = gameState.asteroids[i];
    asteroid.x -= asteroid.speed * dt;
    asteroid.y += asteroid.drift * dt;
    asteroid.rotation += asteroid.rotSpeed * dt;
    asteroid.spin3d += asteroid.wobbleSpeed * dt;
    asteroid.hitFlash = Math.max(0, asteroid.hitFlash - dt * 2.6);

    if (asteroid.type === "magnetic") {
      const mdx = asteroid.x - ship.x;
      const mdy = asteroid.y - ship.y;
      const mdist = Math.hypot(mdx, mdy);
      if (mdist < asteroid.radius * 3.3) {
        const pull =
          ((1 - mdist / (asteroid.radius * 3.3)) * asteroid.magneticPull * dt) /
          Math.max(120, mdist);
        ship.vx += mdx * pull;
        ship.vy += mdy * pull;
      }
    }

    const distToShip = Math.hypot(asteroid.x - ship.x, asteroid.y - ship.y);
    if (distToShip < asteroid.radius + config.shipRadius + 82) {
      ship.dangerHexTimer = Math.max(ship.dangerHexTimer, 0.18);
    }
    const nearMissDist = asteroid.radius + config.shipRadius + 26;
    if (
      !asteroid.nearMissAwarded &&
      !asteroid.nearMissArmed &&
      asteroid.x > ship.x &&
      distToShip < nearMissDist
    ) {
      asteroid.nearMissArmed = true;
    }
    if (
      asteroid.nearMissArmed &&
      !asteroid.nearMissAwarded &&
      asteroid.x < ship.x - asteroid.radius * 0.25 &&
      distToShip > asteroid.radius + config.shipRadius + 6
    ) {
      asteroid.nearMissAwarded = true;
      awardNearMissBonus();
    }

    if (
      asteroid.y < asteroid.radius ||
      asteroid.y > canvas.height - asteroid.radius
    ) {
      asteroid.drift *= -1;
    }

    if (asteroid.x < -asteroid.radius - 15) {
      destroyAsteroid(i, "offscreen", false);
      gameState.consecutiveHits = 0;
      continue;
    }

    const dx = asteroid.x - ship.x;
    const dy = asteroid.y - ship.y;
    if (Math.hypot(dx, dy) < asteroid.radius + config.shipRadius - 4) {
      destroyAsteroid(i, "collision", false);
      damageShip();
      continue;
    }
  }

  for (let i = comets.length - 1; i >= 0; i--) {
    const comet = comets[i];
    comet.x += comet.vx * dt;
    comet.y += comet.vy * dt;
    comet.spin += dt * 2.2;
    if (comet.y < 30 || comet.y > canvas.height - 30) comet.vy *= -1;
    if (comet.x < -220 || comet.y < -120 || comet.y > canvas.height + 120) {
      comets.splice(i, 1);
      continue;
    }
    if (
      Math.hypot(comet.x - ship.x, comet.y - ship.y) <
      comet.radius + config.shipRadius - 2
    ) {
      createExplosion(comet.x, comet.y, "#b6ecff", 24, {
        sourceVx: comet.vx,
        sourceVy: comet.vy,
        blast: 1.15,
      });
      comets.splice(i, 1);
      damageShip();
      continue;
    }
  }

  for (let i = probeWreckage.length - 1; i >= 0; i--) {
    const wreck = probeWreckage[i];
    wreck.x -= wreck.speed * dt;
    wreck.y += wreck.drift * dt;
    wreck.rot += wreck.rotSpeed * dt;
    if (wreck.y < 42 || wreck.y > canvas.height - 42) wreck.drift *= -1;
    if (wreck.x < -220) probeWreckage.splice(i, 1);
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const wave = shockwaves[i];
    wave.life += dt;
    const t = wave.life / wave.ttl;
    wave.radius = wave.maxRadius * t;
    const band = 30 + wave.maxRadius * 0.14;
    const strength = wave.force * Math.max(0, 1 - t) * dt;

    const shipDx = ship.x - wave.x;
    const shipDy = ship.y - wave.y;
    const shipDist = Math.hypot(shipDx, shipDy);
    if (shipDist > wave.radius - band && shipDist < wave.radius + band) {
      const impulse = strength / Math.max(90, shipDist);
      ship.vx += shipDx * impulse;
      ship.vy += shipDy * impulse;
    }

    for (const asteroid of gameState.asteroids) {
      const dx = asteroid.x - wave.x;
      const dy = asteroid.y - wave.y;
      const d = Math.hypot(dx, dy);
      if (d > wave.radius - band && d < wave.radius + band) {
        const impulse = (strength * 1.1) / Math.max(110, d);
        asteroid.x += dx * impulse;
        asteroid.y += dy * impulse;
      }
    }

    if (wave.life >= wave.ttl) shockwaves.splice(i, 1);
  }

  for (let i = gameState.planets.length - 1; i >= 0; i--) {
    const planet = gameState.planets[i];
    planet.x -= planet.speed * dt;
    planet.pulse += dt * 2;

    if (planet.x < -planet.radius - 15) {
      gameState.planets.splice(i, 1);
      continue;
    }

    if (
      Math.hypot(planet.x - ship.x, planet.y - ship.y) <
      planet.radius + config.shipRadius
    ) {
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
      if (
        Math.hypot(asteroid.x - bullet.x, asteroid.y - bullet.y) <=
        asteroid.radius + 4
      ) {
        damageAsteroid(j, 1, "shot", true);
        gameState.consecutiveHits = 0;
        hit = true;
        break;
      }
    }

    if (!hit) {
      for (let j = centaurKuiperObjects.length - 1; j >= 0; j--) {
        const obj = centaurKuiperObjects[j];
        if (Math.hypot(obj.x - bullet.x, obj.y - bullet.y) <= obj.radius + 4) {
          createExplosion(obj.x, obj.y, "#bce7ff", 22, { blast: 0.92 });
          spawnKuiperFragments(obj.x, obj.y, obj.drift * 2, 0);
          centaurKuiperObjects.splice(j, 1);
          hit = true;
          break;
        }
      }
    }

    if (!hit) {
      for (let j = comets.length - 1; j >= 0; j--) {
        const comet = comets[j];
        if (
          Math.hypot(comet.x - bullet.x, comet.y - bullet.y) <=
          comet.radius + 3
        ) {
          createExplosion(comet.x, comet.y, "#d9f5ff", 34, {
            sourceVx: comet.vx,
            sourceVy: comet.vy,
            blast: 1.25,
          });
          gameState.score += scoring.cometBonus;
          comets.splice(j, 1);
          hit = true;
          break;
        }
      }
    }

    if (hit) gameState.bullets.splice(i, 1);
  }

  if (gameState.advancedUnlocked) {
    const advancedProgress = Math.min(
      1,
      Math.max(0, (gameState.elapsed - gameState.advancedPhaseAt) / 180),
    );

    gameState.gravityTimer -= dt;
    if (gameState.gravityTimer <= 0) {
      gravityZones.push(createGravityZone());
      gameState.gravityTimer =
        16 -
        advancedProgress * 4 +
        Math.random() * (9 - advancedProgress * 2.5);
    }
    for (let i = gravityZones.length - 1; i >= 0; i--) {
      const zone = gravityZones[i];
      zone.x -= (zone.speed + gameState.elapsed * 0.8) * dt;
      zone.phase += dt * 2.3;
      const dx = zone.x - ship.x;
      const dy = zone.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist < zone.radius * 1.35) {
        const pullScale = 0.42 + advancedProgress * 0.22;
        const pull =
          (((1 - dist / (zone.radius * 1.35)) * zone.strength * dt) /
            Math.max(120, dist)) *
          pullScale;
        ship.vx += dx * pull;
        ship.vy += dy * pull;
      }
      if (zone.x < -zone.radius - 200) gravityZones.splice(i, 1);
    }

    gameState.darkMatterTimer -= dt;
    if (gameState.darkMatterTimer <= 0) {
      darkMatterClouds.push(createDarkMatterCloud());
      gameState.darkMatterTimer =
        18 - advancedProgress * 4 + Math.random() * (9 - advancedProgress * 2);
    }
    let visibilityPenalty = 0;
    for (let i = darkMatterClouds.length - 1; i >= 0; i--) {
      const cloud = darkMatterClouds[i];
      cloud.x -= (cloud.speed + gameState.elapsed * 0.7) * dt;
      cloud.pulse += dt * 0.9;
      const dist = Math.hypot(cloud.x - ship.x, cloud.y - ship.y);
      if (dist < cloud.radius) {
        visibilityPenalty += (1 - dist / cloud.radius) * cloud.density * 0.72;
      }
      if (cloud.x < -cloud.radius - 220) darkMatterClouds.splice(i, 1);
    }
    gameState.visibilityPenalty = Math.min(
      0.62 + advancedProgress * 0.08,
      visibilityPenalty,
    );

    gameState.flareTimer -= dt;
    if (gameState.flareTimer <= 0) {
      solarFlares.push(createSolarFlare());
      gameState.flareTimer =
        24 - advancedProgress * 5 + Math.random() * (11 - advancedProgress * 3);
    }
    for (let i = solarFlares.length - 1; i >= 0; i--) {
      const flare = solarFlares[i];
      flare.life += dt;
      if (flare.life >= flare.ttl) solarFlares.splice(i, 1);
    }

    gameState.wormholeTimer -= dt;
    if (gameState.wormholeTimer <= 0) {
      wormholes.push(createWormhole());
      gameState.wormholeTimer =
        28 -
        advancedProgress * 6 +
        Math.random() * (12 - advancedProgress * 2.5);
    }
    for (let i = wormholes.length - 1; i >= 0; i--) {
      const wormhole = wormholes[i];
      wormhole.x -= (wormhole.speed + gameState.elapsed * 0.8) * dt;
      wormhole.spin += dt * 2.2;
      if (ship.wormholeCooldown <= 0) {
        const hitDist = Math.hypot(ship.x - wormhole.x, ship.y - wormhole.y);
        if (hitDist < wormhole.radius + config.shipRadius * 0.72) {
          const oldX = ship.x;
          const oldY = ship.y;
          const target = findSafeTeleportPoint();
          ship.x = target.x;
          ship.y = target.y;
          ship.vx *= 0.35;
          ship.vy *= 0.35;
          ship.wormholeCooldown = 3.1;
          gameState.score += scoring.wormholeBonus;
          gameState.consecutiveHits = 0;
          createExplosion(oldX, oldY, "#7ee9ff", 36);
          createExplosion(ship.x, ship.y, "#9ec2ff", 36);
          wormholes.splice(i, 1);
          continue;
        }
      }
      if (wormhole.x < -wormhole.radius - 200) wormholes.splice(i, 1);
    }
  } else {
    gameState.visibilityPenalty = 0;
  }

  ship.x = Math.max(60, Math.min(canvas.width - 60, ship.x));
  ship.y = Math.max(60, Math.min(canvas.height - 60, ship.y));

  for (const nebula of nebulae) {
    const speed =
      nebula.driftSpeed +
      Math.sin(gameState.elapsed * 0.34 + nebula.speedPhase) * nebula.speedVar +
      12 * nebula.depth;
    nebula.x -= speed * dt + ship.vx * dt * 0.018 * nebula.depth;
    nebula.y +=
      nebula.verticalDrift * dt +
      Math.sin(nebula.speedPhase + gameState.elapsed * 0.18) * 2.4 * dt;
    nebula.y -= ship.vy * dt * 0.012 * nebula.depth;
    if (nebula.x < -nebula.radius - 120) {
      nebula.x = canvas.width + nebula.radius + 80;
      nebula.y = Math.random() * canvas.height;
    }
    if (nebula.y < -nebula.radius) nebula.y = canvas.height + nebula.radius;
    if (nebula.y > canvas.height + nebula.radius) nebula.y = -nebula.radius;
  }

  for (const cluster of starClusters) {
    const speed =
      cluster.driftSpeed +
      Math.sin(gameState.elapsed * 0.42 + cluster.speedPhase) *
        cluster.speedVar +
      20 * cluster.depth;
    cluster.x -= speed * dt + ship.vx * dt * 0.03 * cluster.depth;
    cluster.y +=
      cluster.verticalDrift * dt +
      Math.sin(cluster.speedPhase + gameState.elapsed * 0.2) * 2.8 * dt;
    cluster.y -= ship.vy * dt * 0.016 * cluster.depth;
    cluster.twinkle += dt * (0.8 + cluster.depth);
    if (cluster.x < -cluster.radius - 80) {
      cluster.x = canvas.width + cluster.radius + 60;
      cluster.y = Math.random() * canvas.height;
    }
    if (cluster.y < -cluster.radius) cluster.y = canvas.height + cluster.radius;
    if (cluster.y > canvas.height + cluster.radius) cluster.y = -cluster.radius;
  }

  for (const hole of blackHoles) {
    const speed =
      hole.driftSpeed +
      Math.sin(gameState.elapsed * 0.36 + hole.speedPhase) * hole.speedVar +
      hole.depth * 8;
    hole.x -= speed * dt;
    hole.y += hole.verticalDrift * dt - ship.vy * dt * 0.008;
    hole.spin += dt * 0.7;

    if (gameState.advancedUnlocked) {
      const dx = hole.x - ship.x;
      const dy = hole.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist < hole.pullRadius) {
        const nx = dx / Math.max(1, dist);
        const ny = dy / Math.max(1, dist);
        const softening = hole.radius * 0.9;
        const invSq = 1 / (dist * dist + softening * softening);
        const edgeFalloff = Math.pow(
          Math.max(0, 1 - dist / hole.pullRadius),
          1.2,
        );
        const pull = hole.gravity * invSq * edgeFalloff * dt * 8800;
        ship.vx += nx * pull;
        ship.vy += ny * pull;

        const swirlSign = (Math.sin(hole.spin * 0.9) > 0 ? 1 : -1) * 0.18;
        ship.vx += -ny * pull * swirlSign;
        ship.vy += nx * pull * swirlSign;
      }
    }

    if (hole.x < -hole.radius - 140) {
      hole.x = canvas.width + hole.radius + 100;
      hole.y = canvas.height * (0.2 + Math.random() * 0.6);
    }
  }

  for (const hole of whiteHoles) {
    const speed =
      hole.driftSpeed +
      Math.sin(gameState.elapsed * 0.38 + hole.speedPhase) * hole.speedVar +
      hole.depth * 7;
    hole.x -= speed * dt;
    hole.y += hole.verticalDrift * dt - ship.vy * dt * 0.007;
    hole.spin += dt * 0.55;
    hole.jetPhase += dt * 1.8;
    hole.cooldown = Math.max(0, hole.cooldown - dt);

    if (gameState.advancedUnlocked) {
      const dx = ship.x - hole.x;
      const dy = ship.y - hole.y;
      const dist = Math.hypot(dx, dy);
      if (dist < hole.pushRadius) {
        const nx = dx / Math.max(1, dist);
        const ny = dy / Math.max(1, dist);
        const softening = hole.radius * 1.1;
        const invSq = 1 / (dist * dist + softening * softening);
        const edgeFalloff = Math.pow(
          Math.max(0, 1 - dist / hole.pushRadius),
          1.25,
        );
        const push = hole.repulsion * invSq * edgeFalloff * dt * 7600;
        ship.vx += nx * push;
        ship.vy += ny * push;
      }

      const closeRadius = Math.max(54, hole.radius * 2.3);
      const escapeRadius = Math.min(
        hole.pushRadius * 0.88,
        hole.pushRadius - 18,
      );
      if (dist < closeRadius) {
        hole.slingshotArmed = true;
        hole.minApproach = Math.min(hole.minApproach, dist);
      }
      if (hole.slingshotArmed && dist > escapeRadius) {
        const speed = Math.hypot(ship.vx, ship.vy);
        const radialAway = (dx * ship.vx + dy * ship.vy) / Math.max(1, dist);
        if (
          hole.cooldown <= 0 &&
          hole.minApproach < closeRadius * 0.86 &&
          radialAway > 165 &&
          speed > 240
        ) {
          gameState.score += scoring.whiteHoleSlingshotBonus;
          createExplosion(ship.x, ship.y, "#b6f0ff", 14, { blast: 0.8 });
          hole.cooldown = 5.2;
        }
        hole.slingshotArmed = false;
        hole.minApproach = Infinity;
      }
    }

    if (hole.x < -hole.flareRadius - 180) {
      hole.x = canvas.width + hole.flareRadius + 120;
      hole.y = canvas.height * (0.16 + Math.random() * 0.68);
      hole.slingshotArmed = false;
      hole.minApproach = Infinity;
    }
  }

  let eclipseTarget = 0;
  const starLight = getPrimaryStarLight();
  const sx = ship.x - starLight.x;
  const sy = ship.y - starLight.y;
  const segLenSq = sx * sx + sy * sy;
  for (const exoplanet of exoplanets) {
    const speed =
      exoplanet.driftSpeed +
      Math.sin(gameState.elapsed * 0.28 + exoplanet.speedPhase) *
        exoplanet.speedVar +
      5 * exoplanet.depth;
    exoplanet.x -= speed * dt + ship.vx * dt * 0.008 * exoplanet.depth;
    exoplanet.y +=
      exoplanet.verticalDrift * dt +
      Math.sin(exoplanet.speedPhase + gameState.elapsed * 0.13) * 1.6 * dt;
    exoplanet.y -= ship.vy * dt * 0.005 * exoplanet.depth;
    exoplanet.band += dt * (0.2 + exoplanet.depth * 0.35);

    if (segLenSq > 0.0001) {
      const px = exoplanet.x - starLight.x;
      const py = exoplanet.y - starLight.y;
      const t = (px * sx + py * sy) / segLenSq;
      if (t > 0.1 && t < 0.98) {
        const closestX = starLight.x + sx * t;
        const closestY = starLight.y + sy * t;
        const perp = Math.hypot(exoplanet.x - closestX, exoplanet.y - closestY);
        const shadowR = exoplanet.radius * (0.75 + exoplanet.depth * 0.4);
        if (perp < shadowR) {
          const shadow = (1 - perp / shadowR) * (0.14 + exoplanet.depth * 0.18);
          eclipseTarget = Math.max(eclipseTarget, shadow);
        }
      }
    }

    if (exoplanet.x < -exoplanet.radius - 220) {
      exoplanet.x = canvas.width + exoplanet.radius + 150;
      exoplanet.y = canvas.height * (0.14 + Math.random() * 0.72);
    }
    if (exoplanet.y < -exoplanet.radius)
      exoplanet.y = canvas.height + exoplanet.radius;
    if (exoplanet.y > canvas.height + exoplanet.radius)
      exoplanet.y = -exoplanet.radius;
  }
  gameState.eclipsePenalty +=
    (eclipseTarget - gameState.eclipsePenalty) * Math.min(1, dt * 2.6);

  for (const obj of centaurKuiperObjects) {
    const speed =
      obj.driftSpeed +
      Math.sin(gameState.elapsed * 0.55 + obj.speedPhase) * obj.speedVar +
      24 * obj.depth;
    obj.x -= speed * dt + ship.vx * dt * 0.014 * obj.depth;
    obj.y +=
      obj.verticalDrift * dt +
      obj.drift * dt * 0.04 +
      Math.sin(obj.speedPhase + gameState.elapsed * 0.31) * 3.2 * dt;
    obj.y -= ship.vy * dt * 0.01 * obj.depth;
    obj.spin += obj.spinSpeed * dt;
    if (obj.x < -obj.radius - 40) {
      obj.x = canvas.width + obj.radius + 30;
      obj.y = canvas.height * (0.08 + Math.random() * 0.84);
    }
    if (obj.y < -obj.radius) obj.y = canvas.height + obj.radius;
    if (obj.y > canvas.height + obj.radius) obj.y = -obj.radius;
  }

  let neutronInterferenceTarget = 0;
  for (const star of neutronStars) {
    const speed =
      star.driftSpeed +
      Math.sin(gameState.elapsed * 0.46 + star.speedPhase) * star.speedVar +
      8 * star.depth;
    star.x -= speed * dt + ship.vx * dt * 0.01 * star.depth;
    star.y +=
      star.verticalDrift * dt +
      Math.sin(star.speedPhase + gameState.elapsed * 0.2) * 2.1 * dt;
    star.y -= ship.vy * dt * 0.006 * star.depth;
    star.spin += dt * 1.2;
    star.pulse += dt * (1.7 + star.depth);

    const dx = star.x - ship.x;
    const dy = star.y - ship.y;
    const dist = Math.hypot(dx, dy);
    const influenceR = star.halo * 2.1;
    if (dist < influenceR) {
      const influence = Math.pow(Math.max(0, 1 - dist / influenceR), 1.6);
      neutronInterferenceTarget = Math.max(
        neutronInterferenceTarget,
        influence,
      );
    }

    if (star.x < -star.halo - 120) {
      star.x = canvas.width + star.halo + 90;
      star.y = canvas.height * (0.12 + Math.random() * 0.76);
    }
    if (star.y < -star.halo) star.y = canvas.height + star.halo;
    if (star.y > canvas.height + star.halo) star.y = -star.halo;
  }
  gameState.neutronInterference +=
    (neutronInterferenceTarget - gameState.neutronInterference) *
    Math.min(1, dt * 3);
  if (gameState.neutronInterference > 0.001) {
    const shakeAcc = 420 * gameState.neutronInterference;
    ship.vx += (Math.random() - 0.5) * shakeAcc * dt;
    ship.vy += (Math.random() - 0.5) * shakeAcc * dt;
  } else {
    gameState.neutronInterference = 0;
  }

  for (const planet of saturnPlanets) {
    const speed =
      planet.driftSpeed +
      Math.sin(gameState.elapsed * 0.23 + planet.speedPhase) * planet.speedVar +
      3.5 * planet.depth;
    planet.x -= speed * dt + ship.vx * dt * 0.006 * planet.depth;
    planet.y +=
      planet.verticalDrift * dt +
      Math.sin(planet.speedPhase + gameState.elapsed * 0.11) * 1.2 * dt;
    planet.y -= ship.vy * dt * 0.004 * planet.depth;
    planet.spin += dt * (0.08 + planet.depth * 0.12);
    if (planet.x < -planet.ringOuter - 260) {
      planet.x = canvas.width + planet.ringOuter + 180;
      planet.y = canvas.height * (0.18 + Math.random() * 0.66);
    }
    if (planet.y < -planet.ringOuter)
      planet.y = canvas.height + planet.ringOuter;
    if (planet.y > canvas.height + planet.ringOuter)
      planet.y = -planet.ringOuter;
  }

  for (const remnant of supernovaRemnants) {
    const speed =
      remnant.driftSpeed +
      Math.sin(gameState.elapsed * 0.18 + remnant.speedPhase) *
        remnant.speedVar +
      2.2 * remnant.depth;
    remnant.x -= speed * dt + ship.vx * dt * 0.004 * remnant.depth;
    remnant.y +=
      remnant.verticalDrift * dt +
      Math.sin(remnant.speedPhase + gameState.elapsed * 0.08) * 1.1 * dt;
    remnant.y -= ship.vy * dt * 0.003 * remnant.depth;
    remnant.pulse += dt * (0.35 + remnant.depth * 0.35);
    if (remnant.x < -remnant.shock - 340) {
      remnant.x = canvas.width + remnant.shock + 240;
      remnant.y = canvas.height * (0.12 + Math.random() * 0.74);
      remnant.hue = Math.random() > 0.5 ? 22 : 198;
    }
    if (remnant.y < -remnant.shock) remnant.y = canvas.height + remnant.shock;
    if (remnant.y > canvas.height + remnant.shock) remnant.y = -remnant.shock;
  }

  for (const star of stars) {
    star.x -=
      (55 + gameState.elapsed * 2) * star.z * dt + ship.vx * dt * 0.04 * star.z;
    star.y -= ship.vy * dt * 0.024 * star.z;
    if (star.x < -2) {
      star.x = canvas.width + 2;
      star.y = Math.random() * canvas.height;
    }
    if (star.y < -2) star.y = canvas.height + 2;
    if (star.y > canvas.height + 2) star.y = -2;
    star.twinkle += dt * (1 + star.z * 1.8);
  }

  gameState.supernovaTimer -= dt;
  if (gameState.supernovaTimer <= 0) {
    supernovas.push(createSupernova());
    gameState.supernovaTimer = 8 + Math.random() * 10;
  }
  for (let i = supernovas.length - 1; i >= 0; i--) {
    const s = supernovas[i];
    s.life += dt;
    if (s.life >= s.ttl) supernovas.splice(i, 1);
  }

  gameState.debrisTimer -= dt;
  if (gameState.debrisTimer <= 0) {
    debrisFields.push(createDebrisField());
    gameState.debrisTimer = 4 + Math.random() * 5;
  }
  for (let i = debrisFields.length - 1; i >= 0; i--) {
    const field = debrisFields[i];
    field.x -= (field.speed + gameState.elapsed * 2.2) * dt;
    field.y -= ship.vy * dt * 0.02 * field.depth;
    field.rot += field.rotSpeed * dt;
    if (field.x < -160) debrisFields.splice(i, 1);
  }

  gameState.stationTimer -= dt;
  if (gameState.stationTimer <= 0) {
    abandonedStations.push(createAbandonedStation());
    gameState.stationTimer = 12 + Math.random() * 10;
  }
  for (let i = abandonedStations.length - 1; i >= 0; i--) {
    const station = abandonedStations[i];
    station.x -= (station.speed + gameState.elapsed * 1.2) * dt;
    station.y -= ship.vy * dt * 0.018 * station.depth;
    station.blink += dt * 2.4;
    if (station.x < -280) abandonedStations.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag || 0.985;
    p.vy *= p.drag || 0.985;
    p.vy += (p.gravity || 0) * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  updateShipDamageEffects(dt);
  cameraShake = Math.max(0, cameraShake - dt * 3.8);

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
    canvas.width * 0.9,
  );
  bg.addColorStop(0, "#1d2a57");
  bg.addColorStop(0.5, "#0b122c");
  bg.addColorStop(1, "#05070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const nebula of nebulae) {
    const cloud = ctx.createRadialGradient(
      nebula.x - nebula.radius * 0.3,
      nebula.y - nebula.radius * 0.25,
      nebula.radius * 0.1,
      nebula.x,
      nebula.y,
      nebula.radius,
    );
    cloud.addColorStop(
      0,
      `hsla(${nebula.hue}, 70%, 65%, ${nebula.alpha * 1.1})`,
    );
    cloud.addColorStop(
      0.5,
      `hsla(${(nebula.hue + 30) % 360}, 75%, 52%, ${nebula.alpha * 0.65})`,
    );
    cloud.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const remnant of supernovaRemnants) {
    const pulse = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(remnant.pulse));
    const haze = ctx.createRadialGradient(
      remnant.x,
      remnant.y,
      remnant.radius * 0.2,
      remnant.x,
      remnant.y,
      remnant.shock,
    );
    haze.addColorStop(
      0,
      `hsla(${remnant.hue}, 85%, 68%, ${0.2 + pulse * 0.12})`,
    );
    haze.addColorStop(
      0.55,
      `hsla(${(remnant.hue + 28) % 360}, 85%, 56%, ${0.13 + pulse * 0.08})`,
    );
    haze.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(remnant.x, remnant.y, remnant.shock, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `hsla(${remnant.hue}, 95%, 72%, ${0.2 + pulse * 0.16})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(
      remnant.x,
      remnant.y,
      remnant.radius * (1.05 + pulse * 0.18),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  for (const planet of saturnPlanets) {
    ctx.save();
    ctx.translate(planet.x, planet.y);
    ctx.rotate(planet.spin * 0.45);

    const ringBack = ctx.createLinearGradient(
      -planet.ringOuter,
      0,
      planet.ringOuter,
      0,
    );
    ringBack.addColorStop(0, "rgba(216,198,156,0.12)");
    ringBack.addColorStop(0.5, "rgba(252,230,184,0.3)");
    ringBack.addColorStop(1, "rgba(196,180,146,0.12)");
    ctx.strokeStyle = ringBack;
    ctx.lineWidth = Math.max(2.2, planet.radius * 0.11);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      planet.ringOuter,
      planet.ringOuter * planet.ringTilt,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.stroke();

    const body = ctx.createRadialGradient(
      -planet.radius * 0.3,
      -planet.radius * 0.28,
      planet.radius * 0.12,
      0,
      0,
      planet.radius,
    );
    body.addColorStop(0, `hsla(${planet.hue}, 75%, 82%, 0.92)`);
    body.addColorStop(0.5, `hsla(${planet.hue + 4}, 62%, 63%, 0.88)`);
    body.addColorStop(1, `hsla(${planet.hue + 7}, 54%, 36%, 0.9)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
    ctx.fill();

    for (let b = 0; b < 4; b++) {
      ctx.strokeStyle = `rgba(255,236,204,${0.1 + b * 0.04})`;
      ctx.lineWidth = 1 + b * 0.6;
      ctx.beginPath();
      ctx.ellipse(
        0,
        (b - 1.5) * planet.radius * 0.14,
        planet.radius * (0.72 + b * 0.08),
        planet.radius * (0.08 + b * 0.02),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    const ringFront = ctx.createLinearGradient(
      -planet.ringOuter,
      0,
      planet.ringOuter,
      0,
    );
    ringFront.addColorStop(0, "rgba(205,188,150,0.18)");
    ringFront.addColorStop(0.5, "rgba(255,236,194,0.52)");
    ringFront.addColorStop(1, "rgba(205,188,150,0.18)");
    ctx.strokeStyle = ringFront;
    ctx.lineWidth = Math.max(2.6, planet.radius * 0.12);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      planet.ringOuter,
      planet.ringOuter * planet.ringTilt,
      0,
      0,
      Math.PI,
    );
    ctx.stroke();
    ctx.restore();
  }

  for (const star of neutronStars) {
    const pulse = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(star.pulse));
    const corona = ctx.createRadialGradient(
      star.x,
      star.y,
      star.radius * 0.2,
      star.x,
      star.y,
      star.halo,
    );
    corona.addColorStop(0, `rgba(240,250,255,${0.95})`);
    corona.addColorStop(0.2, `rgba(180,225,255,${0.5 + pulse * 0.25})`);
    corona.addColorStop(0.6, `rgba(120,180,255,${0.2 + pulse * 0.12})`);
    corona.addColorStop(1, "rgba(120,180,255,0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.halo, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.jetTilt + star.spin);
    ctx.strokeStyle = `rgba(188,228,255,${0.22 + pulse * 0.2})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-star.halo * 0.9, 0);
    ctx.lineTo(star.halo * 0.9, 0);
    ctx.moveTo(0, -star.halo * 0.72);
    ctx.lineTo(0, star.halo * 0.72);
    ctx.stroke();
    ctx.restore();

    const core = ctx.createRadialGradient(
      star.x - star.radius * 0.15,
      star.y - star.radius * 0.15,
      1,
      star.x,
      star.y,
      star.radius,
    );
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(196,232,255,0.96)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const exoplanet of exoplanets) {
    const glow = ctx.createRadialGradient(
      exoplanet.x - exoplanet.radius * 0.25,
      exoplanet.y - exoplanet.radius * 0.3,
      exoplanet.radius * 0.08,
      exoplanet.x,
      exoplanet.y,
      exoplanet.radius * 1.35,
    );
    glow.addColorStop(
      0,
      `hsla(${exoplanet.hue}, 75%, 72%, ${0.15 + exoplanet.depth * 0.18})`,
    );
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(exoplanet.x, exoplanet.y, exoplanet.radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(
      exoplanet.x - exoplanet.radius * 0.32,
      exoplanet.y - exoplanet.radius * 0.3,
      exoplanet.radius * 0.12,
      exoplanet.x,
      exoplanet.y,
      exoplanet.radius,
    );
    body.addColorStop(0, `hsla(${exoplanet.hue}, 55%, 78%, 0.85)`);
    body.addColorStop(
      0.55,
      `hsla(${(exoplanet.hue + 35) % 360}, 48%, 50%, 0.82)`,
    );
    body.addColorStop(1, `hsla(${(exoplanet.hue + 75) % 360}, 52%, 25%, 0.88)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(exoplanet.x, exoplanet.y, exoplanet.radius, 0, Math.PI * 2);
    ctx.fill();

    for (let b = 0; b < 3; b++) {
      const phase = exoplanet.band + b * 0.9;
      ctx.strokeStyle = `rgba(220,236,255,${0.06 + b * 0.04})`;
      ctx.lineWidth = 1.2 + b * 0.8;
      ctx.beginPath();
      ctx.ellipse(
        exoplanet.x,
        exoplanet.y + Math.sin(phase) * exoplanet.radius * 0.12,
        exoplanet.radius * (0.62 + b * 0.1),
        exoplanet.radius * (0.11 + b * 0.04),
        phase * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    if (exoplanet.ringed) {
      ctx.save();
      ctx.translate(exoplanet.x, exoplanet.y);
      ctx.rotate(exoplanet.band * 0.1);
      ctx.strokeStyle = "rgba(206,220,255,0.25)";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        exoplanet.radius * 1.45,
        exoplanet.radius * exoplanet.ringTilt,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const hole of blackHoles) {
    const lens = ctx.createRadialGradient(
      hole.x,
      hole.y,
      hole.radius * 0.3,
      hole.x,
      hole.y,
      hole.lensRadius,
    );
    lens.addColorStop(0, "rgba(255,255,255,0)");
    lens.addColorStop(0.4, "rgba(180,230,255,0.08)");
    lens.addColorStop(0.7, "rgba(145,198,255,0.1)");
    lens.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.lensRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.spin);
    for (let r = 0; r < 3; r++) {
      const t = r / 2;
      const ringW = hole.radius * (1.95 + t * 1.25);
      const ringH = ringW * hole.ringTilt;
      const ring = ctx.createLinearGradient(-ringW, 0, ringW, 0);
      ring.addColorStop(0, `rgba(120,170,255,${0.08 + t * 0.05})`);
      ring.addColorStop(0.24, `rgba(148,206,255,${0.2 + t * 0.08})`);
      ring.addColorStop(0.5, `rgba(255,236,188,${0.42 + t * 0.14})`);
      ring.addColorStop(0.76, `rgba(255,148,102,${0.26 + t * 0.08})`);
      ring.addColorStop(1, `rgba(118,96,220,${0.09 + t * 0.05})`);
      ctx.strokeStyle = ring;
      ctx.lineWidth = hole.radius * (0.26 - t * 0.06);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringW, ringH, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const nearShadow = ctx.createLinearGradient(
      0,
      -hole.diskRadius,
      0,
      hole.diskRadius,
    );
    nearShadow.addColorStop(0, "rgba(0,0,0,0)");
    nearShadow.addColorStop(0.45, "rgba(0,0,0,0.12)");
    nearShadow.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.strokeStyle = nearShadow;
    ctx.lineWidth = hole.radius * 0.55;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      hole.radius * 2.55,
      hole.radius * hole.ringTilt,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();

    const photonRing = ctx.createRadialGradient(
      hole.x,
      hole.y,
      hole.radius * 0.92,
      hole.x,
      hole.y,
      hole.radius * 1.42,
    );
    photonRing.addColorStop(0, "rgba(255,255,255,0)");
    photonRing.addColorStop(0.45, "rgba(255,220,170,0.42)");
    photonRing.addColorStop(0.7, "rgba(178,198,255,0.3)");
    photonRing.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = photonRing;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius * 1.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.985)";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();

    const innerFade = ctx.createRadialGradient(
      hole.x,
      hole.y,
      hole.radius * 0.06,
      hole.x,
      hole.y,
      hole.radius * 0.95,
    );
    innerFade.addColorStop(0, "rgba(0,0,0,1)");
    innerFade.addColorStop(1, "rgba(4,5,8,0.7)");
    ctx.fillStyle = innerFade;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const hole of whiteHoles) {
    const corona = ctx.createRadialGradient(
      hole.x,
      hole.y,
      hole.radius * 0.35,
      hole.x,
      hole.y,
      hole.flareRadius,
    );
    corona.addColorStop(0, "rgba(255,255,255,0.96)");
    corona.addColorStop(0.12, `hsla(${hole.hue}, 95%, 75%, 0.62)`);
    corona.addColorStop(0.45, `hsla(${(hole.hue + 20) % 360}, 98%, 65%, 0.25)`);
    corona.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.flareRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.rotate(hole.spin);
    const jetLen = hole.flareRadius * (0.85 + 0.18 * Math.sin(hole.jetPhase));
    ctx.strokeStyle = `hsla(${hole.hue}, 95%, 76%, 0.35)`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-jetLen, 0);
    ctx.lineTo(jetLen, 0);
    ctx.moveTo(0, -jetLen * 0.8);
    ctx.lineTo(0, jetLen * 0.8);
    ctx.stroke();
    ctx.restore();

    const core = ctx.createRadialGradient(
      hole.x - hole.radius * 0.1,
      hole.y - hole.radius * 0.1,
      1,
      hole.x,
      hole.y,
      hole.radius,
    );
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.5, "rgba(220,243,255,0.95)");
    core.addColorStop(1, "rgba(166,224,255,0.7)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const cluster of starClusters) {
    const haze = ctx.createRadialGradient(
      cluster.x,
      cluster.y,
      0,
      cluster.x,
      cluster.y,
      cluster.radius,
    );
    haze.addColorStop(0, "rgba(182,220,255,0.14)");
    haze.addColorStop(1, "rgba(182,220,255,0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(cluster.x, cluster.y, cluster.radius, 0, Math.PI * 2);
    ctx.fill();

    for (const point of cluster.stars) {
      const x = cluster.x + Math.cos(point.a) * cluster.radius * point.r;
      const y = cluster.y + Math.sin(point.a) * cluster.radius * point.r;
      const tw = 0.55 + 0.45 * Math.sin(cluster.twinkle + point.twinkle);
      ctx.fillStyle = `rgba(220,236,255,${0.18 + tw * 0.42})`;
      ctx.fillRect(x, y, point.size, point.size);
    }
  }

  ctx.globalCompositeOperation = "lighter";
  for (const star of stars) {
    const a = 0.3 + (Math.sin(star.twinkle) + 1) * 0.3;
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    const size = star.z * 2.2;
    ctx.fillRect(star.x, star.y, size, size);
  }

  for (const obj of centaurKuiperObjects) {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.spin);
    const ice = ctx.createRadialGradient(
      -obj.radius * 0.2,
      -obj.radius * 0.25,
      1,
      0,
      0,
      obj.radius,
    );
    ice.addColorStop(0, `hsla(${obj.hue}, 60%, 85%, 0.92)`);
    ice.addColorStop(0.55, `hsla(${(obj.hue + 22) % 360}, 45%, 62%, 0.85)`);
    ice.addColorStop(1, "rgba(52,72,108,0.86)");
    ctx.fillStyle = ice;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      obj.radius,
      obj.radius * (0.74 + Math.sin(obj.spin) * 0.1),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(210,236,255,0.24)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  for (const nova of supernovas) {
    const t = nova.life / nova.ttl;
    const pulse = Math.sin(t * Math.PI);
    const r = nova.maxRadius * (0.16 + t * 0.84);
    const bloom = ctx.createRadialGradient(
      nova.x,
      nova.y,
      0,
      nova.x,
      nova.y,
      r,
    );
    bloom.addColorStop(0, `rgba(${nova.tint},${0.85 * pulse})`);
    bloom.addColorStop(0.45, `rgba(${nova.tint},${0.32 * pulse})`);
    bloom.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(nova.x, nova.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  for (const zone of gravityZones) {
    const glow = 0.35 + 0.25 * Math.sin(zone.phase);
    ctx.strokeStyle = `rgba(140,220,255,${glow * 0.32})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      zone.x,
      zone.y,
      zone.radius * (0.62 + 0.06 * Math.sin(zone.phase * 1.7)),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  for (const cloud of darkMatterClouds) {
    const haze = ctx.createRadialGradient(
      cloud.x,
      cloud.y,
      cloud.radius * 0.2,
      cloud.x,
      cloud.y,
      cloud.radius,
    );
    haze.addColorStop(0, `rgba(10,14,24,${cloud.density * 0.48})`);
    haze.addColorStop(0.65, `rgba(12,14,24,${cloud.density * 0.28})`);
    haze.addColorStop(1, "rgba(6,9,14,0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAmbientPassers() {
  for (const wormhole of wormholes) {
    ctx.save();
    ctx.translate(wormhole.x, wormhole.y);
    ctx.rotate(wormhole.spin);

    const ring = ctx.createRadialGradient(
      0,
      0,
      wormhole.radius * 0.45,
      0,
      0,
      wormhole.radius * 1.28,
    );
    ring.addColorStop(0, "rgba(0,0,0,0.92)");
    ring.addColorStop(0.5, "rgba(96,214,255,0.34)");
    ring.addColorStop(0.85, "rgba(174,206,255,0.44)");
    ring.addColorStop(1, "rgba(120,180,255,0)");
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(0, 0, wormhole.radius * 1.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(170,230,255,0.45)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      wormhole.radius * 1.05,
      wormhole.radius * 0.72,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.restore();
  }

  for (const field of debrisFields) {
    ctx.save();
    ctx.translate(field.x, field.y);
    ctx.rotate(field.rot);
    for (const scrap of field.scraps) {
      ctx.save();
      ctx.translate(scrap.x, scrap.y);
      ctx.rotate(scrap.r);
      ctx.fillStyle = "rgba(136,149,168,0.45)";
      ctx.fillRect(-scrap.w * 0.5, -scrap.h * 0.5, scrap.w, scrap.h);
      ctx.restore();
    }
    ctx.restore();
  }

  for (const station of abandonedStations) {
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.rotate(station.tilt);
    ctx.scale(station.scale, station.scale);

    const hull = ctx.createLinearGradient(-70, 0, 90, 0);
    hull.addColorStop(0, "rgba(72,82,99,0.72)");
    hull.addColorStop(1, "rgba(101,116,141,0.58)");
    ctx.fillStyle = hull;
    ctx.fillRect(-68, -18, 136, 36);

    ctx.strokeStyle = "rgba(28,34,48,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-68, -18, 136, 36);

    ctx.fillStyle = "rgba(86,99,120,0.72)";
    ctx.fillRect(-18, -46, 36, 92);
    ctx.fillRect(-90, -8, 26, 16);
    ctx.fillRect(64, -8, 26, 16);

    const blinkA = 0.22 + 0.55 * (0.5 + 0.5 * Math.sin(station.blink));
    const blinkB = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(station.blink + 1.9));
    ctx.fillStyle = `rgba(255,168,112,${blinkA})`;
    ctx.fillRect(-8, -8, 6, 6);
    ctx.fillStyle = `rgba(112,215,255,${blinkB})`;
    ctx.fillRect(4, 2, 6, 6);

    ctx.restore();
  }

  for (const wreck of probeWreckage) {
    ctx.save();
    ctx.translate(wreck.x, wreck.y);
    ctx.rotate(wreck.rot);
    ctx.scale(wreck.scale, wreck.scale);

    if (wreck.style === "satellite") {
      ctx.fillStyle = "rgba(102,118,138,0.78)";
      ctx.fillRect(-22, -8, 44, 16);
      ctx.strokeStyle = "rgba(50,64,82,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -8, 44, 16);
      ctx.fillStyle = "rgba(86,142,188,0.65)";
      ctx.fillRect(-40, -5, 14, 10);
      ctx.fillRect(26, -5, 14, 10);
      ctx.fillStyle = "rgba(255,193,123,0.32)";
      ctx.fillRect(-3, -3, 6, 6);
    } else {
      ctx.fillStyle = "rgba(96,108,128,0.72)";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-4, -10);
      ctx.lineTo(-22, 0);
      ctx.lineTo(-4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(45,58,76,0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(121,207,255,0.35)";
      ctx.fillRect(-28, -2, 8, 4);
    }

    ctx.restore();
  }
}

function getSolarDistortionAmount() {
  let amount = 0;
  for (const flare of solarFlares) {
    const t = flare.life / flare.ttl;
    const pulse = Math.sin(t * Math.PI);
    amount = Math.max(amount, flare.intensity * pulse);
  }
  return amount;
}

function drawScreenEffects() {
  if (gameState.paused && !gameState.over) {
    ctx.fillStyle = "rgba(6,10,18,0.34)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(214,234,255,0.92)";
    ctx.font = "600 28px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width * 0.5, canvas.height * 0.46);
    ctx.font = "500 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(190,220,255,0.85)";
    ctx.fillText(
      "Press P or click Resume",
      canvas.width * 0.5,
      canvas.height * 0.5,
    );
  }

  const ship = gameState.ship;
  if (ship && ship.muzzleFlash > 0) {
    const flash = ship.muzzleFlash;
    const muzzleGlow = ctx.createRadialGradient(
      ship.x + 22,
      ship.y,
      2,
      ship.x + 22,
      ship.y,
      140,
    );
    muzzleGlow.addColorStop(0, `rgba(165,226,255,${0.38 * flash})`);
    muzzleGlow.addColorStop(1, "rgba(165,226,255,0)");
    ctx.fillStyle = muzzleGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const flare of solarFlares) {
    const t = flare.life / flare.ttl;
    const pulse = Math.sin(t * Math.PI);
    const overlay = ctx.createRadialGradient(
      canvas.width * 0.75,
      canvas.height * 0.18,
      10,
      canvas.width * 0.75,
      canvas.height * 0.18,
      canvas.width * (0.35 + pulse * 0.18),
    );
    overlay.addColorStop(
      0,
      `rgba(${flare.hue},${0.18 * pulse * flare.intensity})`,
    );
    overlay.addColorStop(
      0.5,
      `rgba(${flare.hue},${0.06 * pulse * flare.intensity})`,
    );
    overlay.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const totalVisibilityPenalty = Math.min(
    0.9,
    gameState.visibilityPenalty + gameState.eclipsePenalty,
  );
  if (totalVisibilityPenalty > 0) {
    const alpha = 0.14 + totalVisibilityPenalty * 0.38;
    ctx.fillStyle = `rgba(5,8,13,${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const clearRadius = Math.max(95, 230 - totalVisibilityPenalty * 95);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const clear = ctx.createRadialGradient(
      gameState.ship.x,
      gameState.ship.y,
      clearRadius * 0.15,
      gameState.ship.x,
      gameState.ship.y,
      clearRadius,
    );
    clear.addColorStop(0, "rgba(0,0,0,0.95)");
    clear.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = clear;
    ctx.beginPath();
    ctx.arc(gameState.ship.x, gameState.ship.y, clearRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (gameState.neutronInterference > 0.02) {
    const n = gameState.neutronInterference;
    ctx.fillStyle = `rgba(190,220,255,${0.035 + n * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lines = 4 + Math.floor(n * 7);
    ctx.strokeStyle = `rgba(210,232,255,${0.05 + n * 0.12})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < lines; i++) {
      const y = Math.random() * canvas.height;
      const len = canvas.width * (0.25 + Math.random() * 0.65);
      const x = Math.random() * (canvas.width - len);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (Math.random() - 0.5) * 1.2);
      ctx.stroke();
    }
  }
}

function drawCockpitOverlay() {
  const glow = 0.08 + Math.min(0.08, gameState.visibilityPenalty * 0.1);
  const w = canvas.width;
  const h = canvas.height;
  const flicker =
    gameState.life === 1 ? 0.78 + 0.22 * Math.sin(gameState.elapsed * 26) : 1;

  ctx.save();
  ctx.globalAlpha *= flicker;
  ctx.strokeStyle = `rgba(128,214,255,${glow})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, h - 30);
  ctx.lineTo(34, h * 0.62);
  ctx.lineTo(w * 0.18, h * 0.56);
  ctx.moveTo(w - 34, h - 30);
  ctx.lineTo(w - 34, h * 0.62);
  ctx.lineTo(w * 0.82, h * 0.56);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(160,225,255,${glow * 0.85})`;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, 28, 0, Math.PI * 2);
  ctx.moveTo(w * 0.5 - 40, h * 0.5);
  ctx.lineTo(w * 0.5 - 18, h * 0.5);
  ctx.moveTo(w * 0.5 + 18, h * 0.5);
  ctx.lineTo(w * 0.5 + 40, h * 0.5);
  ctx.stroke();

  const glass = ctx.createLinearGradient(0, 0, 0, h);
  glass.addColorStop(0, "rgba(130,220,255,0.03)");
  glass.addColorStop(0.5, "rgba(0,0,0,0)");
  glass.addColorStop(1, "rgba(130,220,255,0.02)");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = `rgba(156,222,255,${glow * 1.55})`;
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  const ship = gameState.ship;
  if (ship && ship.shieldActive && ship.shieldTimer > 0) {
    const shieldSecs = ship.shieldTimer.toFixed(1);
    const shieldPulse =
      0.65 + 0.35 * (0.5 + 0.5 * Math.sin(gameState.elapsed * 7));
    ctx.fillStyle = `rgba(222,180,255,${0.62 + shieldPulse * 0.28})`;
    ctx.fillText(`Shield: ${shieldSecs}s`, w - 22, h - 38);
  }
  if (gameState.ammoBoostTimer > 0) {
    const ammoBoostSecs = gameState.ammoBoostTimer.toFixed(1);
    ctx.fillStyle = "rgba(166,231,255,0.86)";
    ctx.fillText(`Ammo Boost: ${ammoBoostSecs}s`, w - 22, h - 56);
  }
  ctx.fillStyle = `rgba(156,222,255,${glow * 1.55})`;
  ctx.fillText(`Audio: ${audioMix.muted ? "OFF" : "ON"} (M)`, w - 22, h - 20);
  ctx.restore();
}

function drawShip() {
  const { ship } = gameState;
  const light = getPrimaryStarLight();
  const ldx = light.x - ship.x;
  const ldy = light.y - ship.y;
  const llen = Math.max(1, Math.hypot(ldx, ldy));
  const lx = ldx / llen;
  const ly = ldy / llen;
  const lifeStage = gameState.life;
  const flapTilt = ship.steerVisual * 0.28;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.globalAlpha = 1;

  const baseShipAlpha = 1;

  // Contrast plate behind the ship to separate it from bright nebula/FX layers.
  const plate = ctx.createRadialGradient(-2, 0, 6, -2, 0, 44);
  plate.addColorStop(0, "rgba(5,8,15,0.42)");
  plate.addColorStop(1, "rgba(5,8,15,0)");
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.ellipse(-2, 0, 44, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(20, -7);
  ctx.lineTo(1, -12);
  ctx.lineTo(-16, -15);
  ctx.lineTo(-28, -8);
  ctx.lineTo(-18, -2);
  ctx.lineTo(-18, 2);
  ctx.lineTo(-28, 8);
  ctx.lineTo(-16, 15);
  ctx.lineTo(1, 12);
  ctx.lineTo(20, 7);
  ctx.closePath();
  const hull = ctx.createLinearGradient(
    -24 - lx * 12,
    -ly * 9,
    34 + lx * 12,
    ly * 9,
  );
  if (lifeStage >= 3) {
    hull.addColorStop(0, "#ffffff");
    hull.addColorStop(1, "#ffffff");
  } else if (lifeStage === 2) {
    hull.addColorStop(0, "#f7f7f7");
    hull.addColorStop(1, "#ffffff");
  } else {
    hull.addColorStop(0, "#f1f1f1");
    hull.addColorStop(1, "#ffffff");
  }
  ctx.fillStyle = hull;
  ctx.fill();

  // Persistent glow so the ship remains readable against busy deep-space FX.
  const hullGlow = ctx.createRadialGradient(4, 0, 2, 4, 0, 46);
  hullGlow.addColorStop(0, "rgba(255,255,245,0.34)");
  hullGlow.addColorStop(1, "rgba(255,255,245,0)");
  ctx.fillStyle = hullGlow;
  ctx.beginPath();
  ctx.arc(2, 0, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(10,14,22,0.86)";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,252,236,0.82)";
  ctx.lineWidth = 1.15;
  ctx.stroke();

  // Wing root fairings add depth and break the flat silhouette.
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.moveTo(-4, s * 8);
    ctx.lineTo(-20, s * 16);
    ctx.lineTo(-10, s * 6);
    ctx.closePath();
    ctx.fillStyle = "rgba(230,236,244,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(8,12,20,0.66)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Engine nacelles.
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.ellipse(-18, s * 6, 7, 3.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(224,232,242,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(8,12,20,0.72)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Spine panel and nose plate.
  ctx.beginPath();
  ctx.moveTo(23, 0);
  ctx.lineTo(8, -4);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-10, 4);
  ctx.lineTo(8, 4);
  ctx.closePath();
  ctx.fillStyle = "rgba(225,233,242,0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(40,52,70,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(24, -3.5);
  ctx.lineTo(24, 3.5);
  ctx.closePath();
  ctx.fillStyle = "rgba(210,220,232,0.95)";
  ctx.fill();

  if (lifeStage <= 2) {
    ctx.strokeStyle =
      lifeStage === 1 ? "rgba(255,142,142,0.58)" : "rgba(255,210,170,0.4)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(7, 2);
    ctx.moveTo(-10, 6);
    ctx.lineTo(5, 9);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(-1, 0, 7.6, 5.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#294a84";
  ctx.fill();
  ctx.strokeStyle = "rgba(174,218,255,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -0.8);
  ctx.lineTo(3, -2.2);
  ctx.strokeStyle = "rgba(222,246,255,0.56)";
  ctx.stroke();

  // Wing flaps tilt with left/right steering for more lifelike movement.
  ctx.save();
  ctx.translate(-19, -8);
  ctx.rotate(-flapTilt);
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(-17, -9.5);
  ctx.lineTo(-4, 2.5);
  ctx.closePath();
  ctx.fillStyle = "rgba(246,250,255,0.98)";
  ctx.fill();
  ctx.strokeStyle = "rgba(18,24,34,0.78)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(-19, 8);
  ctx.rotate(flapTilt);
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(-17, 9.5);
  ctx.lineTo(-4, -2.5);
  ctx.closePath();
  ctx.fillStyle = "rgba(246,250,255,0.98)";
  ctx.fill();
  ctx.strokeStyle = "rgba(18,24,34,0.78)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const engineLen =
    13 +
    ship.boostHeat * 18 +
    Math.min(1, Math.hypot(ship.vx, ship.vy) / 520) * 13;
  for (let e = -1; e <= 1; e += 2) {
    const engineY = e * 5;
    const flicker =
      lifeStage === 2 && e > 0
        ? 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(gameState.elapsed * 25))
        : 1;
    const colA =
      lifeStage === 1 ? "rgba(255,122,92,0.88)" : "rgba(104,216,255,0.9)";
    const colB =
      lifeStage === 1 ? "rgba(255,176,146,0.22)" : "rgba(182,240,255,0.16)";
    const flame = ctx.createLinearGradient(
      -31 - engineLen,
      engineY,
      -16,
      engineY,
    );
    flame.addColorStop(0, colA);
    flame.addColorStop(1, colB);
    ctx.globalAlpha = baseShipAlpha * flicker;
    ctx.beginPath();
    ctx.moveTo(-20, engineY);
    ctx.lineTo(-31 - engineLen, engineY - (3 + ship.boostHeat * 1.6));
    ctx.lineTo(-31 - engineLen + 7, engineY);
    ctx.lineTo(-31 - engineLen, engineY + (3 + ship.boostHeat * 1.6));
    ctx.closePath();
    ctx.fillStyle = flame;
    ctx.fill();
    ctx.globalAlpha = baseShipAlpha;
  }

  if (lifeStage === 1) {
    const warnAlpha =
      0.3 + 0.5 * (0.5 + 0.5 * Math.sin(gameState.elapsed * 15));
    ctx.fillStyle = `rgba(255,88,76,${warnAlpha})`;
    ctx.beginPath();
    ctx.arc(-1, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ship.shieldActive && ship.shieldTimer > 0) {
    const pulse = 0.56 + 0.44 * (0.5 + 0.5 * Math.sin(gameState.elapsed * 5.2));
    const ringAlpha = 0.24 + pulse * 0.28;
    for (let ring = 0; ring < 2; ring++) {
      const spin = gameState.elapsed * (ring === 0 ? 0.8 : -1.1);
      const rad = 30 + ring * 5 + pulse * 1.8;
      ctx.strokeStyle = `rgba(213,156,255,${ringAlpha - ring * 0.06})`;
      ctx.lineWidth = ring === 0 ? 2.1 : 1.4;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + spin;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    const badgeGlow = ctx.createRadialGradient(-2, -2, 1, -2, -2, 8);
    badgeGlow.addColorStop(0, `rgba(232,206,255,${0.5 + pulse * 0.2})`);
    badgeGlow.addColorStop(1, "rgba(198,127,255,0)");
    ctx.fillStyle = badgeGlow;
    ctx.beginPath();
    ctx.arc(-2, -1, 8, 0, Math.PI * 2);
    ctx.fill();

    // Shield sign on the hull while shield is active.
    ctx.strokeStyle = `rgba(246,231,255,${0.82 + pulse * 0.14})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-3.8, -9);
    ctx.lineTo(-0.2, -9);
    ctx.lineTo(2, -5);
    ctx.lineTo(2, -1.2);
    ctx.lineTo(-2, 2.8);
    ctx.lineTo(-6, -1.2);
    ctx.closePath();
    ctx.stroke();
  }

  if (ship.brakeThrusterTimer > 0) {
    const a = ship.brakeThrusterTimer * 7;
    const jetCol = `rgba(245,252,255,${0.3 + a})`;
    for (let s = -1; s <= 1; s += 2) {
      const y = s * 6;
      ctx.beginPath();
      ctx.moveTo(17, y);
      ctx.lineTo(26 + Math.random() * 3, y - 2);
      ctx.lineTo(26 + Math.random() * 3, y + 2);
      ctx.closePath();
      ctx.fillStyle = jetCol;
      ctx.fill();
    }
  }

  if (ship.shieldFlash > 0) {
    ctx.strokeStyle = `rgba(170,236,255,${ship.shieldFlash * 0.75})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const px = Math.cos(a) * 32;
      const py = Math.sin(a) * 32;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  if (ship.dangerHexTimer > 0) {
    const alpha = Math.min(0.44, ship.dangerHexTimer * 1.7);
    ctx.strokeStyle = `rgba(255,120,96,${alpha})`;
    ctx.lineWidth = 1.2;
    for (let ring = 1; ring <= 2; ring++) {
      const r = 34 + ring * 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + ring * 0.15;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Always-on high-contrast reticle to keep the ship readable in dense FX.
  const reticlePulse =
    0.7 + 0.3 * (0.5 + 0.5 * Math.sin(gameState.elapsed * 4.5));
  const reticleR = 37;
  ctx.strokeStyle = `rgba(8,12,20,${0.72 + reticlePulse * 0.18})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, reticleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,246,214,${0.86 + reticlePulse * 0.12})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, reticleR, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const inner = reticleR + 2;
    const outer = reticleR + 10;

    ctx.strokeStyle = `rgba(8,12,20,${0.78 + reticlePulse * 0.12})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(c * inner, s * inner);
    ctx.lineTo(c * outer, s * outer);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,246,214,${0.9 + reticlePulse * 0.08})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(c * inner, s * inner);
    ctx.lineTo(c * outer, s * outer);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEntities() {
  for (const cloud of ionClouds) {
    const pulse = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(cloud.pulse));
    const aura = ctx.createRadialGradient(
      cloud.x,
      cloud.y,
      cloud.radius * 0.2,
      cloud.x,
      cloud.y,
      cloud.radius * 1.6,
    );
    aura.addColorStop(0, `rgba(138,238,255,${0.28 * pulse})`);
    aura.addColorStop(1, "rgba(95,170,255,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(145,233,255,${0.34 + pulse * 0.22})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const ang = cloud.pulse * (1.1 + k * 0.12) + k * 1.23;
      const r = cloud.radius * (0.4 + (k % 2) * 0.22);
      ctx.beginPath();
      ctx.moveTo(cloud.x + Math.cos(ang) * r, cloud.y + Math.sin(ang) * r);
      ctx.lineTo(
        cloud.x + Math.cos(ang + 0.33) * (r + 10),
        cloud.y + Math.sin(ang + 0.33) * (r + 10),
      );
      ctx.lineTo(
        cloud.x + Math.cos(ang + 0.6) * (r - 5),
        cloud.y + Math.sin(ang + 0.6) * (r - 5),
      );
      ctx.stroke();
    }
  }

  for (const orb of shieldOrbs) {
    const pulse = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(orb.pulse));
    const aura = ctx.createRadialGradient(
      orb.x,
      orb.y,
      orb.radius * 0.25,
      orb.x,
      orb.y,
      orb.radius * 2.2,
    );
    aura.addColorStop(0, `rgba(218,151,255,${0.34 * pulse})`);
    aura.addColorStop(1, "rgba(182,116,255,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(orb.spin);

    ctx.strokeStyle = `rgba(229,196,255,${0.48 + pulse * 0.28})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const px = Math.cos(a) * (orb.radius + 4 + pulse * 2);
      const py = Math.sin(a) * (orb.radius + 4 + pulse * 2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    const core = ctx.createRadialGradient(
      -orb.radius * 0.2,
      -orb.radius * 0.2,
      1,
      0,
      0,
      orb.radius,
    );
    core.addColorStop(0, "#f6e9ff");
    core.addColorStop(1, "#b66cff");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(248,233,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(-2.5, -7);
    ctx.lineTo(2.5, -7);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 2);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  for (const comet of comets) {
    const dir = Math.atan2(comet.vy, comet.vx);
    const tailX = Math.cos(dir) * comet.tail;
    const tailY = Math.sin(dir) * comet.tail;
    const tail = ctx.createLinearGradient(
      comet.x,
      comet.y,
      comet.x - tailX,
      comet.y - tailY,
    );
    tail.addColorStop(0, "rgba(206,243,255,0.9)");
    tail.addColorStop(0.3, "rgba(155,214,255,0.45)");
    tail.addColorStop(1, "rgba(123,183,255,0)");
    ctx.strokeStyle = tail;
    ctx.lineWidth = comet.radius * 0.95;
    ctx.beginPath();
    ctx.moveTo(comet.x, comet.y);
    ctx.lineTo(comet.x - tailX, comet.y - tailY);
    ctx.stroke();

    const head = ctx.createRadialGradient(
      comet.x - 2,
      comet.y - 2,
      1,
      comet.x,
      comet.y,
      comet.radius,
    );
    head.addColorStop(0, "rgba(245,255,255,0.98)");
    head.addColorStop(1, "rgba(130,208,255,0.82)");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const frag of kuiperFragments) {
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(frag.pulse));
    const glow = ctx.createRadialGradient(
      frag.x,
      frag.y,
      frag.radius * 0.2,
      frag.x,
      frag.y,
      frag.radius * 1.9,
    );
    glow.addColorStop(0, `rgba(183,232,255,${0.45 * pulse})`);
    glow.addColorStop(1, "rgba(130,196,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(frag.x, frag.y, frag.radius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(frag.x, frag.y);
    ctx.rotate(frag.spin);
    ctx.fillStyle = `rgba(220,245,255,${0.75 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(0, -frag.radius);
    ctx.lineTo(frag.radius * 0.7, -frag.radius * 0.1);
    ctx.lineTo(frag.radius * 0.25, frag.radius * 0.85);
    ctx.lineTo(-frag.radius * 0.6, frag.radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(172,225,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  const light = getPrimaryStarLight();
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
      planet.radius,
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
    const tilt = Math.max(
      0.58,
      Math.min(
        1.05,
        asteroid.tiltBase + Math.sin(asteroid.spin3d) * asteroid.tiltAmp,
      ),
    );
    ctx.scale(1, tilt);

    ctx.beginPath();
    const { points, craters } = asteroid.profile;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const ldx = light.x - asteroid.x;
    const ldy = light.y - asteroid.y;
    const llen = Math.max(1, Math.hypot(ldx, ldy));
    const lx = ldx / llen;
    const ly = ldy / llen;

    const typeStyle = {
      normal: {
        a: "#c7b39b",
        b: "#8e7767",
        c: "#4a3b32",
        stroke: "rgba(38,27,22,0.55)",
      },
      heavy: {
        a: "#d2beaa",
        b: "#8e7667",
        c: "#3f322b",
        stroke: "rgba(58,42,31,0.72)",
      },
      explosive: {
        a: "#e5a186",
        b: "#9d614c",
        c: "#4f2a26",
        stroke: "rgba(85,36,24,0.78)",
      },
      splitting: {
        a: "#e1ce9a",
        b: "#9a8457",
        c: "#54462d",
        stroke: "rgba(85,64,21,0.72)",
      },
      magnetic: {
        a: "#9abfd8",
        b: "#65849d",
        c: "#2a3c50",
        stroke: "rgba(56,88,116,0.75)",
      },
    };
    const skin = typeStyle[asteroid.type] || typeStyle.normal;
    const grd = ctx.createLinearGradient(
      -lx * asteroid.radius * 1.1,
      -ly * asteroid.radius * 1.1,
      lx * asteroid.radius * 1.1,
      ly * asteroid.radius * 1.1,
    );
    grd.addColorStop(0, skin.a);
    grd.addColorStop(0.5, skin.b);
    grd.addColorStop(1, skin.c);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.save();
    ctx.clip();
    for (let band = 0; band < 5; band++) {
      const y0 =
        -asteroid.radius * 0.72 +
        (band / 4) * asteroid.radius * 1.44 +
        Math.sin(asteroid.surfaceSeed + band * 1.7) * asteroid.striationAmp;
      ctx.strokeStyle = `rgba(54,44,38,${0.07 + asteroid.surfaceRoughness * 0.1})`;
      ctx.lineWidth = Math.max(0.8, asteroid.radius * 0.018);
      ctx.beginPath();
      ctx.moveTo(-asteroid.radius * 0.9, y0);
      ctx.lineTo(
        asteroid.radius * 0.9,
        y0 +
          Math.sin(asteroid.surfaceSeed * 1.4 + band * asteroid.striationFreq) *
            asteroid.striationAmp *
            0.7,
      );
      ctx.stroke();
    }
    for (const spot of asteroid.mineralSpots || []) {
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,27,22,${spot.a})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        spot.x - spot.r * 0.24,
        spot.y - spot.r * 0.24,
        spot.r * 0.42,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(240,215,180,${spot.a * 0.34})`;
      ctx.fill();
    }
    ctx.restore();

    ctx.lineWidth = Math.max(1.5, asteroid.radius * 0.06);
    ctx.strokeStyle = skin.stroke;
    ctx.stroke();

    const rim = ctx.createRadialGradient(
      -asteroid.radius * 0.2,
      -asteroid.radius * 0.3,
      asteroid.radius * 0.1,
      0,
      0,
      asteroid.radius * 1.1,
    );
    rim.addColorStop(0, "rgba(255,241,220,0.28)");
    rim.addColorStop(1, "rgba(255,241,220,0)");
    ctx.fillStyle = rim;
    ctx.fill();

    const spec = ctx.createRadialGradient(
      lx * asteroid.radius * 0.42,
      ly * asteroid.radius * 0.35,
      asteroid.radius * 0.05,
      0,
      0,
      asteroid.radius * 1.1,
    );
    spec.addColorStop(0, `rgba(255,245,230,${0.16 + light.intensity * 0.18})`);
    spec.addColorStop(1, "rgba(255,245,230,0)");
    ctx.fillStyle = spec;
    ctx.fill();

    const shadow = ctx.createRadialGradient(
      -lx * asteroid.radius * 0.48,
      -ly * asteroid.radius * 0.4,
      asteroid.radius * 0.1,
      0,
      0,
      asteroid.radius * 1.2,
    );
    shadow.addColorStop(0, "rgba(10,12,18,0.22)");
    shadow.addColorStop(1, "rgba(10,12,18,0)");
    ctx.fillStyle = shadow;
    ctx.fill();

    for (const crater of craters) {
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30,22,18,0.42)";
      ctx.fill();

      ctx.strokeStyle = "rgba(17,12,9,0.26)";
      ctx.lineWidth = Math.max(0.8, crater.r * 0.18);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        crater.x - crater.r * 0.28,
        crater.y - crater.r * 0.28,
        crater.r * 0.45,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255,238,210,0.14)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        crater.x + crater.r * 0.22,
        crater.y + crater.r * 0.18,
        crater.r * 0.76,
        Math.PI * 1.02,
        Math.PI * 1.66,
      );
      ctx.strokeStyle = "rgba(28,20,16,0.22)";
      ctx.lineWidth = Math.max(0.7, crater.r * 0.14);
      ctx.stroke();
    }

    if (asteroid.type === "heavy") {
      const hpRatio = asteroid.hp / Math.max(1, asteroid.maxHp);
      ctx.strokeStyle = `rgba(255,232,204,${0.18 + (1 - hpRatio) * 0.4})`;
      ctx.lineWidth = Math.max(1, asteroid.radius * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, asteroid.radius * 0.52, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (asteroid.type === "explosive") {
      const core = ctx.createRadialGradient(
        0,
        0,
        1,
        0,
        0,
        asteroid.radius * 0.65,
      );
      core.addColorStop(0, "rgba(255,178,150,0.52)");
      core.addColorStop(1, "rgba(255,120,82,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, asteroid.radius * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    if (asteroid.type === "splitting") {
      ctx.strokeStyle = "rgba(255,236,178,0.35)";
      ctx.lineWidth = Math.max(1, asteroid.radius * 0.035);
      ctx.beginPath();
      ctx.moveTo(-asteroid.radius * 0.45, -asteroid.radius * 0.1);
      ctx.lineTo(-asteroid.radius * 0.05, asteroid.radius * 0.15);
      ctx.lineTo(asteroid.radius * 0.32, -asteroid.radius * 0.08);
      ctx.stroke();
    }

    if (asteroid.type === "magnetic") {
      ctx.strokeStyle = "rgba(123,215,255,0.34)";
      ctx.lineWidth = Math.max(1, asteroid.radius * 0.03);
      ctx.beginPath();
      ctx.arc(0, 0, asteroid.radius * 1.14, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (asteroid.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,220,${asteroid.hitFlash * 0.35})`;
      ctx.beginPath();
      ctx.arc(0, 0, asteroid.radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  for (const wave of shockwaves) {
    const t = wave.life / wave.ttl;
    const alpha = Math.max(0, 0.26 * (1 - t));
    ctx.strokeStyle = `rgba(${wave.tint},${alpha})`;
    ctx.lineWidth = 2 + (1 - t) * 1.8;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
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
    const a = Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    ctx.fillStyle = `${p.color}${a}`;
    ctx.beginPath();
    const particleSize = p.trail ? p.size * (0.65 + alpha * 0.8) : p.size;
    ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

let last = performance.now();
function loop(now) {
  const rawDt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const slowMo = gameState && gameState.gameOverSequence ? 0.26 : 1;
  const dt = rawDt * slowMo;

  update(dt, rawDt);
  updateAudio();
  const distortion = getSolarDistortionAmount();
  ctx.save();
  if (!gameState.over && cameraShake > 0) {
    const shakeAmp = 8 * cameraShake;
    ctx.translate(
      (Math.random() - 0.5) * shakeAmp,
      (Math.random() - 0.5) * shakeAmp * 0.82,
    );
  }
  if (!gameState.over && gameState.life === 1 && Math.random() > 0.7) {
    ctx.translate((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.6);
  }
  if (distortion > 0) {
    const jitterX = (Math.random() - 0.5) * distortion * 4.8;
    const jitterY = (Math.random() - 0.5) * distortion * 3.2;
    const scale = 1 + distortion * 0.006;
    ctx.translate(jitterX, jitterY);
    ctx.scale(scale, scale);
  }
  drawStars();
  drawAmbientPassers();
  drawEntities();
  ctx.restore();
  drawScreenEffects();
  drawShip();
  drawCockpitOverlay();

  requestAnimationFrame(loop);
}

window.addEventListener("resize", () => {
  resize();
  updateInstructionMode();
  applyLandscapeLock();
});
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.hasMoved = true;
  mouse.lastMoveAt = performance.now();
});
window.addEventListener("mousedown", () => {
  mouse.down = true;
});
window.addEventListener("mouseup", () => {
  mouse.down = false;
});
window.addEventListener("keydown", (e) => {
  if (gameStarted) ensureAudioStarted();
  if (instructionsOpen && e.code !== "Escape") return;
  if (e.code === "Space") {
    e.preventDefault();
    if (
      document.activeElement === pauseButton ||
      document.activeElement === muteButton
    ) {
      document.activeElement.blur();
    }
  }
  if (e.code === "KeyM" && !e.repeat) {
    toggleAudioMute();
  }
  if (e.code === "KeyP" && !e.repeat) {
    togglePause();
  }
  if (e.code === "Escape" && instructionsOpen) {
    closeInstructionsOverlay();
  }
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
canvas.addEventListener("click", () => {
  if (!gameStarted) return;
  if (isSmartphoneLike()) return;
  ensureAudioStarted();
  shoot();
});
restartButton.addEventListener("click", resetGame);
if (startGameButton)
  startGameButton.addEventListener("click", () => {
    startGame();
    startGameButton.blur();
  });
if (readInstructionsButton && startInstructions)
  readInstructionsButton.addEventListener("click", () => {
    startInstructions.open = !startInstructions.open;
    readInstructionsButton.textContent = startInstructions.open
      ? "Hide Instructions"
      : "Read Instructions";
    readInstructionsButton.blur();
  });
if (pauseButton)
  pauseButton.addEventListener("click", () => {
    togglePause();
    pauseButton.blur();
  });
if (muteButton)
  muteButton.addEventListener("click", () => {
    toggleAudioMute();
    muteButton.blur();
  });
if (fullscreenButton)
  fullscreenButton.addEventListener("click", async () => {
    try {
      await toggleFullscreen();
    } catch {}
    updateControlButtons();
    fullscreenButton.blur();
  });
if (instructionsButton)
  instructionsButton.addEventListener("click", () => {
    openInstructionsOverlay();
    instructionsButton.blur();
  });
if (closeInstructionsButton)
  closeInstructionsButton.addEventListener("click", () => {
    closeInstructionsOverlay();
    closeInstructionsButton.blur();
  });

function beginTouchControl(clientX, clientY, id = null) {
  if (
    !isSmartphoneLike() ||
    !gameStarted ||
    orientationBlocked ||
    instructionsOpen
  )
    return false;
  ensureAudioStarted();
  if (
    !motionInput.enabled &&
    motionInput.available &&
    motionInput.permissionState !== "denied"
  ) {
    enableMotionControlsFromGesture();
  }
  touchInput.active = true;
  touchInput.pointerId = id;
  touchInput.startX = clientX;
  touchInput.startY = clientY;
  touchInput.lastX = clientX;
  touchInput.lastY = clientY;
  touchInput.startAt = performance.now();
  touchInput.axisX = 0;
  touchInput.axisY = 0;
  return true;
}

function updateTouchControl(clientX, clientY) {
  if (!touchInput.active) return;
  touchInput.lastX = clientX;
  touchInput.lastY = clientY;
  if (motionInput.enabled && isSmartphoneLike()) return;
  const dx = clientX - touchInput.startX;
  const dy = clientY - touchInput.startY;
  const dead = 8;
  const scale = 68;
  touchInput.axisX = Math.max(
    -1,
    Math.min(1, Math.abs(dx) < dead ? 0 : dx / scale),
  );
  touchInput.axisY = Math.max(
    -1,
    Math.min(1, Math.abs(dy) < dead ? 0 : dy / scale),
  );
}

function endTouchControl(id = null) {
  if (!touchInput.active) return;
  if (id !== null && touchInput.pointerId !== id) return;
  const dx = touchInput.lastX - touchInput.startX;
  const dy = touchInput.lastY - touchInput.startY;
  const dist = Math.hypot(dx, dy);
  const duration = performance.now() - touchInput.startAt;
  if (
    gameStarted &&
    !orientationBlocked &&
    !instructionsOpen &&
    dist < 18 &&
    duration < 260
  ) {
    shoot();
  }
  touchInput.active = false;
  touchInput.pointerId = null;
  touchInput.axisX = 0;
  touchInput.axisY = 0;
}

canvas.addEventListener("pointerdown", (e) => {
  const started = beginTouchControl(e.clientX, e.clientY, e.pointerId);
  if (!started) return;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}
});

canvas.addEventListener("pointermove", (e) => {
  if (touchInput.pointerId !== e.pointerId) return;
  updateTouchControl(e.clientX, e.clientY);
});

canvas.addEventListener("pointerup", (e) => endTouchControl(e.pointerId));
canvas.addEventListener("pointercancel", (e) => endTouchControl(e.pointerId));
canvas.addEventListener("lostpointercapture", (e) =>
  endTouchControl(e.pointerId),
);
document.addEventListener("fullscreenchange", updateControlButtons);
document.addEventListener("webkitfullscreenchange", updateControlButtons);

// Fallback for mobile browsers that do not reliably dispatch pointer events.
if (!("PointerEvent" in window)) {
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      if (beginTouchControl(t.clientX, t.clientY, t.identifier)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      const t = Array.from(e.changedTouches).find(
        (touch) => touch.identifier === touchInput.pointerId,
      );
      if (!t) return;
      updateTouchControl(t.clientX, t.clientY);
      e.preventDefault();
    },
    { passive: false },
  );

  const endTouch = (e) => {
    const t = Array.from(e.changedTouches).find(
      (touch) => touch.identifier === touchInput.pointerId,
    );
    if (!t) return;
    endTouchControl(t.identifier);
    e.preventDefault();
  };
  canvas.addEventListener("touchend", endTouch, { passive: false });
  canvas.addEventListener("touchcancel", endTouch, { passive: false });
}

resize();
resetGame();
updateInstructionMode();
setGameStarted(false);
requestAnimationFrame(loop);
