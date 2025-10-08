
(() => {
  'use strict';
  /**
   * 2D Jump Game — vanilla JS canvas runner
   * - States: menu, playing, paused, gameover
   * - Platforms, coins, spikes
   * - AABB collisions, one-way platforms
   * - HiDPI scaling, mobile tap button, basic audio
   */

  const LOGICAL_W = 800;
  const LOGICAL_H = 450;

  // Tuning constants
  const GRAVITY = 2200;
  const JUMP_VELOCITY = -900;
  const MAX_FALL = 1600;
  const SCROLL_BASE = 260;
  const SCROLL_MAX = 520;
  const SCROLL_ACCEL = 2; // px/s per second

  const PLATFORM_MIN_W = 120;
  const PLATFORM_MAX_W = 300;
  const GAP_MIN = 140;
  const GAP_MAX = 260;
  const PLATFORM_MIN_Y = 220;
  const PLATFORM_MAX_Y = 360;
  const PLATFORM_VARIANCE = 120;

  const COIN_SIZE = 18;
  const SPIKE_W = 28;
  const SPIKE_H = 28;

  // Colors
  const COLOR_BG = '#1b2a41';
  const COLOR_GROUND = '#314e75';
  const COLOR_PLAYER = '#7cd1f9';
  const COLOR_PLATFORM = '#5e81ac';
  const COLOR_COIN = '#ffd166';
  const COLOR_SPIKE = '#ff6b6b';
  const COLOR_TEXT = '#e6edf3';

  // DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const btnJump = document.getElementById('btnJump');
  const muteToggle = document.getElementById('mute');
  const scoreEl = document.getElementById('score');
  const hiscoreEl = document.getElementById('hiscore');

  // HiDPI scaling to keep crisp rendering
  function applyHiDPIScale() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = LOGICAL_W * dpr;
    canvas.height = LOGICAL_H * dpr;
    // Keep CSS size responsive via stylesheet; set transform to logical units
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  applyHiDPIScale();
  window.addEventListener('resize', applyHiDPIScale, { passive: true });

  // Game state
  let state = 'menu';
  let score = 0;
  let hiscore = Number(localStorage.getItem('hiscore') || 0);
  let scrollSpeed = SCROLL_BASE;
  let last = performance.now();

  // Input
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
    unlockAudio();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('pointerdown', () => { unlockAudio(); tryJump(); });
  btnJump.addEventListener('pointerdown', () => { unlockAudio(); tryJump(); });

  btnStart.onclick = () => { unlockAudio(); if (state !== 'playing') state = 'playing'; };
  btnPause.onclick = () => { if (state === 'playing') state = 'paused'; else if (state === 'paused') state = 'playing'; };
  btnRestart.onclick = () => restart();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') state = 'paused';
  });

  hiscoreEl.textContent = String(hiscore);

  // Audio (simple SFX via <audio> elements)
  const sfx = {
    jump: new Audio('assets/audio/jump.wav'),
    coin: new Audio('assets/audio/coin.wav'),
    hit: new Audio('assets/audio/hit.wav')
  };
  Object.values(sfx).forEach(a => { a.preload = 'auto'; a.volume = 0.25; });
  let audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;
    // iOS/Safari needs a gesture before playing. Try quick play/pause to unlock.
    try { sfx.jump.muted = true; sfx.jump.play().then(() => { sfx.jump.pause(); sfx.jump.currentTime = 0; sfx.jump.muted = false; audioUnlocked = true; }).catch(()=>{}); } catch {}
  }
  function play(name) {
    if (muteToggle.checked) return;
    const a = sfx[name];
    if (!a) return;
    try { a.currentTime = 0; a.play(); } catch {}
  }

  // Entities
  const player = {
    x: 150,
    y: 280,
    w: 42,
    h: 52,
    vy: 0,
    onGround: false,
  };

  /** @type {{x:number,y:number,w:number,h:number}[]} */
  const platforms = [];
  /** @type {{x:number,y:number,w:number,h:number,active:boolean}[]} */
  const coins = [];
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  const spikes = [];

  // Spawn control
  let rightmostX = 0;

  function restart() {
    state = 'menu';
    score = 0;
    scrollSpeed = SCROLL_BASE;
    player.x = 150; player.y = 280; player.vy = 0; player.onGround = false;
    platforms.length = 0; coins.length = 0; spikes.length = 0;
    rightmostX = 0;

    // Create starting platform
    const startW = 300;
    const startY = 360;
    platforms.push({ x: 60, y: startY, w: startW, h: 20 });
    rightmostX = 60 + startW + 220; // space before the next spawn

    // Pre-fill ahead
    while (rightmostX < LOGICAL_W * 2) spawnNextChunk();

    updateScoreUI();
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnNextChunk() {
    // Decide platform width and gap
    const w = Math.floor(rand(PLATFORM_MIN_W, PLATFORM_MAX_W));
    const gap = Math.floor(rand(GAP_MIN, GAP_MAX));

    // Pick Y near last platform's Y with variance and clamp
    const lastY = platforms.length ? platforms[platforms.length - 1].y : 340;
    let y = lastY + rand(-PLATFORM_VARIANCE, PLATFORM_VARIANCE);
    y = Math.max(PLATFORM_MIN_Y, Math.min(PLATFORM_MAX_Y, y));

    const x = rightmostX + gap;
    const h = 20;
    platforms.push({ x, y, w, h });

    // 50% chance to add a coin above the platform
    if (Math.random() < 0.5) {
      coins.push({ x: x + w * 0.5 - COIN_SIZE/2, y: y - 30, w: COIN_SIZE, h: COIN_SIZE, active: true });
    }
    // 30% chance to add a spike near the right edge of the platform
    if (Math.random() < 0.3) {
      spikes.push({ x: x + w - SPIKE_W - 10, y: y - SPIKE_H, w: SPIKE_W, h: SPIKE_H });
    }

    rightmostX = x + w;
  }

  function tryJump() {
    if (state !== 'playing') return;
    if (player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      play('jump');
    }
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    // Input
    if (keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) tryJump();

    // Difficulty ramp
    scrollSpeed = Math.min(scrollSpeed + SCROLL_ACCEL * dt, SCROLL_MAX);

    // Move world left (player x stays mostly fixed)
    for (const p of platforms) p.x -= scrollSpeed * dt;
    for (const c of coins) if (c.active) c.x -= scrollSpeed * dt;
    for (const s of spikes) s.x -= scrollSpeed * dt;

    // Recycle off-screen entities
    while (platforms.length && platforms[0].x + platforms[0].w < -100) platforms.shift();
    while (coins.length && coins[0].x + coins[0].w < -100) coins.shift();
    while (spikes.length && spikes[0].x + spikes[0].w < -100) spikes.shift();

    // Ensure we have enough platforms ahead
    while (rightmostX < LOGICAL_W * 2) spawnNextChunk();

    // Physics integration
    player.vy += GRAVITY * dt;
    player.vy = Math.min(player.vy, MAX_FALL);
    player.y += player.vy * dt;

    // One-way platform resolve (only when falling)
    if (player.vy >= 0) {
      // Find the platform the player is above and would intersect this frame
      for (const p of platforms) {
        const wasAbove = (player.y + player.h) <= p.y + 10; // tolerance
        if (!wasAbove) continue;
        if (aabb(player, p)) {
          // Land on platform
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }

    // Check if not on any platform after movement
    // (simple heuristic: if feet are within 1px of any platform top, consider grounded)
    if (!platforms.some(p => Math.abs((player.y + player.h) - p.y) <= 0.5 && player.x + player.w > p.x && player.x < p.x + p.w)) {
      // if player feet are exactly resting, keep onGround true, else false
      player.onGround = platforms.some(p => (player.y + player.h) === p.y && player.x + player.w > p.x && player.x < p.x + p.w);
    }

    // Coins
    for (const c of coins) {
      if (!c.active) continue;
      if (aabb(player, c)) {
        c.active = false;
        score += 50;
        play('coin');
      }
    }

    // Spikes (hazard)
    for (const sp of spikes) {
      if (aabb(player, sp)) {
        play('hit');
        return gameOver();
      }
    }

    // Fall off the world
    if (player.y > LOGICAL_H + 200) {
      play('hit');
      return gameOver();
    }

    // Score from distance
    score += Math.floor(scrollSpeed * dt * 0.5);
  }

  function gameOver() {
    state = 'gameover';
    if (score > hiscore) {
      hiscore = score;
      localStorage.setItem('hiscore', String(hiscore));
    }
    updateScoreUI();
  }

  function updateScoreUI() {
    scoreEl.textContent = String(score);
    hiscoreEl.textContent = String(hiscore);
  }

  function draw() {
    // Clear
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // Simple parallax background (two bands)
    ctx.fillStyle = '#162238';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H * 0.6);
    ctx.fillStyle = '#0f1a2b';
    for (let i = 0; i < 10; i++) {
      const w = 160, h = 60;
      const x = ((i * 180) - (performance.now() * 0.02) % (LOGICAL_W + 200)) - 100;
      const y = 220 + Math.sin(i) * 10;
      ctx.fillRect(x, y, w, h);
    }

    // Platforms
    ctx.fillStyle = COLOR_PLATFORM;
    for (const p of platforms) {
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // Coins
    for (const c of coins) {
      if (!c.active) continue;
      ctx.fillStyle = COLOR_COIN;
      // Draw as a circle coin
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2, r = c.w / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9c46a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Spikes (triangles)
    ctx.fillStyle = COLOR_SPIKE;
    for (const sp of spikes) {
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y + sp.h);
      ctx.lineTo(sp.x + sp.w / 2, sp.y);
      ctx.lineTo(sp.x + sp.w, sp.y + sp.h);
      ctx.closePath();
      ctx.fill();
    }

    // Player
    ctx.fillStyle = COLOR_PLAYER;
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // HUD overlay (state text)
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Score: ${score}`, 12, 24);

    if (state === 'menu') {
      drawCenteredText('Press Start (or tap) to play. Jump with Space/Tap.', LOGICAL_W/2, LOGICAL_H/2, 18);
    } else if (state === 'paused') {
      drawCenteredText('Paused', LOGICAL_W/2, LOGICAL_H/2, 20);
    } else if (state === 'gameover') {
      drawCenteredText('Game Over — Press Restart', LOGICAL_W/2, LOGICAL_H/2 - 10, 22);
      drawCenteredText(`Score: ${score}  ·  Best: ${hiscore}`, LOGICAL_W/2, LOGICAL_H/2 + 18, 16);
    }
  }

  function drawCenteredText(text, x, y, size=16) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    ctx.textAlign = 'start';
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    if (state === 'playing') {
      update(dt);
      updateScoreUI();
    }
    draw();
  }

  // Boot
  restart();
  requestAnimationFrame(loop);
})();
