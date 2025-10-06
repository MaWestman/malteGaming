
// Maltes gamingsida! — game.js
// Version: v7.4+ (single-file build)
// Notes: Fixed-step update loop, decoupled render, basic tile collisions, camera follow, pause & reset.

const CONFIG = {
  VERSION: 'v7.4+',
  DEBUG: true,
  TILE_SIZE: 16,
  CANVAS: { WIDTH: 960, HEIGHT: 540 },
  GRAVITY: 1600,          // px/s^2
  PLAYER: {
    SPEED: 180,           // px/s
    JUMP: 520,            // px/s impulse
    MAX_FALL: 900,        // terminal velocity
    W: 14, H: 14
  }
};

class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    target.addEventListener('keydown', e => this.keys.add(e.code));
    target.addEventListener('keyup', e => this.keys.delete(e.code));
    target.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', () => (this.mouse.down = true));
    window.addEventListener('pointerup', () => (this.mouse.down = false));
    window.addEventListener('pointermove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
  }
  isDown(code) { return this.keys.has(code); }
}

class CanvasRenderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.canvas.width = width;
    this.canvas.height = height;
  }
  clear(color = '#1a1d29') {
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  drawRect(x, y, w, h, color = '#fff', fill = true) {
    const c = this.ctx;
    c.beginPath();
    c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (fill) { c.fillStyle = color; c.fill(); } else { c.strokeStyle = color; c.stroke(); }
  }
  drawText(text, x, y, color = '#fff', size = 12, font = 'monospace') {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `${size}px ${font}`;
    c.fillText(text, Math.round(x), Math.round(y));
  }
}

class Camera2D {
  constructor(viewWidth, viewHeight) {
    this.pos = { x: 0, y: 0 };
    this.view = { w: viewWidth, h: viewHeight };
    this.bounds = null; // {x,y,w,h}
  }
  follow(target, lerp = 0.15) {
    this.pos.x += (target.x - this.pos.x) * lerp;
    this.pos.y += (target.y - this.pos.y) * lerp;
    if (this.bounds) {
      const { x, y, w, h } = this.bounds;
      this.pos.x = Math.max(x, Math.min(this.pos.x, x + w - this.view.w));
      this.pos.y = Math.max(y, Math.min(this.pos.y, y + h - this.view.h));
    }
  }
}

class Tilemap {
  constructor({ width, height, tileSize, data }) {
    this.w = width; this.h = height; this.t = tileSize; this.data = data;
  }
  idx(tx, ty) { return ty * this.w + tx; }
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return 1; // treat OOB as solid
    return this.data[this.idx(tx, ty)] || 0;
  }
  isSolid(tx, ty) { return this.get(tx, ty) !== 0; }
}

function resolveTileCollisions(body, tilemap, dt) {
  const T = tilemap.t;
  // Integrate X
  body.x += body.vx * dt;
  if (body.vx !== 0) {
    const left = Math.floor(body.x / T);
    const right = Math.floor((body.x + body.w - 1) / T);
    const top = Math.floor(body.y / T);
    const bottom = Math.floor((body.y + body.h - 1) / T);
    for (let ty = top; ty <= bottom; ty++) {
      if (body.vx > 0 && tilemap.isSolid(right, ty)) {
        body.x = right * T - body.w; body.vx = 0;
      } else if (body.vx < 0 && tilemap.isSolid(left, ty)) {
        body.x = (left + 1) * T; body.vx = 0;
      }
    }
  }
  // Integrate Y
  body.y += body.vy * dt;
  body.onGround = false;
  if (body.vy !== 0) {
    const left = Math.floor(body.x / T);
    const right = Math.floor((body.x + body.w - 1) / T);
    const top = Math.floor(body.y / T);
    const bottom = Math.floor((body.y + body.h - 1) / T);
    for (let tx = left; tx <= right; tx++) {
      if (body.vy > 0 && tilemap.isSolid(tx, bottom)) {
        body.y = bottom * T - body.h; body.vy = 0; body.onGround = true;
      } else if (body.vy < 0 && tilemap.isSolid(tx, top)) {
        body.y = (top + 1) * T; body.vy = 0;
      }
    }
  }
}

class Game {
  constructor(canvas) {
    this.renderer = new CanvasRenderer(canvas, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
    this.input = new Input();

    // Build a simple demo tilemap: ground and platforms
    const W = 200, H = 40, T = CONFIG.TILE_SIZE;
    const data = new Array(W * H).fill(0);
    // ground
    for (let x = 0; x < W; x++) data[(H - 1) * W + x] = 1;
    // platforms
    for (let x = 10; x < 30; x++) data[(H - 8) * W + x] = 1;
    for (let x = 35; x < 60; x++) data[(H - 14) * W + x] = 1;
    for (let x = 70; x < 90; x++) data[(H - 20) * W + x] = 1;

    this.map = new Tilemap({ width: W, height: H, tileSize: T, data });

    this.player = {
      x: 32, y: 0,
      w: CONFIG.PLAYER.W, h: CONFIG.PLAYER.H,
      vx: 0, vy: 0,
      onGround: false
    };

    this.camera = new Camera2D(this.renderer.canvas.width, this.renderer.canvas.height);
    this.camera.bounds = { x: 0, y: 0, w: this.map.w * this.map.t, h: this.map.h * this.map.t };

    this.paused = false;
    this._bindShortcuts();
  }

  _bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') this.paused = !this.paused;
      if (e.code === 'KeyR') this._resetPlayer();
      if (e.code === 'F3') CONFIG.DEBUG = !CONFIG.DEBUG;
    });
  }

  _resetPlayer() {
    this.player.x = 32; this.player.y = 0; this.player.vx = 0; this.player.vy = 0; this.player.onGround = false;
  }

  update(dt) {
    if (this.paused) return;

    const P = this.player;
    const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
    const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
    const jump = this.input.isDown('Space') || this.input.isDown('ArrowUp') || this.input.isDown('KeyW');

    P.vx = (right - left) * CONFIG.PLAYER.SPEED;
    P.vy = Math.min(CONFIG.PLAYER.MAX_FALL, P.vy + CONFIG.GRAVITY * dt);
    if (jump && P.onGround) { P.vy = -CONFIG.PLAYER.JUMP; }

    resolveTileCollisions(P, this.map, dt);

    // Camera centers on player
    const target = {
      x: P.x + P.w / 2 - this.renderer.canvas.width / 2,
      y: P.y + P.h / 2 - this.renderer.canvas.height / 2,
    };
    this.camera.follow(target, 0.2);
  }

  render(alpha) {
    const r = this.renderer;
    r.clear('#0f1220');

    // Draw tiles in camera view
    const T = this.map.t;
    const startX = Math.floor(this.camera.pos.x / T);
    const startY = Math.floor(this.camera.pos.y / T);
    const endX = startX + Math.ceil(r.canvas.width / T) + 1;
    const endY = startY + Math.ceil(r.canvas.height / T) + 1;

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (this.map.isSolid(tx, ty)) {
          const sx = tx * T - this.camera.pos.x;
          const sy = ty * T - this.camera.pos.y;
          r.drawRect(sx, sy, T, T, '#2f3a5a', true);
        }
      }
    }

    // Player
    const px = this.player.x - this.camera.pos.x;
    const py = this.player.y - this.camera.pos.y;
    r.drawRect(px, py, this.player.w, this.player.h, '#ffd24a', true);

    // HUD / Debug
    r.drawText(`Maltes gamingsida! v${CONFIG.VERSION}`, 8, 18, '#9fb0ff', 12);
    r.drawText('←/A, →/D to move | Space to jump | P pause | R reset | F3 debug', 8, 36, '#c2d0ff', 12);
    if (CONFIG.DEBUG) {
      r.drawText(`x:${this.player.x.toFixed(1)} y:${this.player.y.toFixed(1)} vx:${this.player.vx.toFixed(1)} vy:${this.player.vy.toFixed(1)}`, 8, 54, '#88ff88', 12);
    }
  }
}

// Fixed-step main loop (60Hz)
function startLoop(game) {
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  let rafId = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = now - last;
    last = now;
    // avoid spiral of death
    acc += Math.max(-100, Math.min(100, dt));
    while (acc >= STEP) {
      game.update(STEP / 1000);
      acc -= STEP;
    }
    const alpha = acc / STEP;
    game.render(alpha);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
  return () => { running = false; cancelAnimationFrame(rafId); };
}

(function boot() {
  let canvas = document.getElementById('game');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game';
    document.body.appendChild(canvas);
  }
  const game = new Game(canvas);
  const stop = startLoop(game);
  // Expose for quick debugging
  window.__game = { stop, game, CONFIG };
})();
