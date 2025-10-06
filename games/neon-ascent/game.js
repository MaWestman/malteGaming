/* Neon Ascent — game.js
 * Version: v7.2 (Modals)
 * - Hub (between levels) is a centered modal window
 * - Shop is a centered modal window with tabs
 * - Legendary skins (expanded) with neon blink
 * - Theme locks with 🔒 + tooltip, rarity accents
 * - Kid Mode helpers restored
 * ----------------------------------------------------- */
(() => {
  console.log('[Neon Ascent] game.js start v7.2');

  // TDZ fix: declare audio before updateMuteButton() can run
  let audio = null;

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const WORLD = { w: 540, h: 960 };

  // Physics — tighter feel
  const GRAVITY = 2100;
  const MOVE_ACCEL = 2500;
  const MAX_SPEED_X = 360;
  const JUMP_VY = 880;
  const FRICTION_GROUND = 0.85;

  // ---- ECONOMY TUNING
  const CLIMB_GOLD_PER_PX = 0.2;
  const LANDING_GOLD = 4;
  const LEVEL_BASE_BONUS = 100;
  const LEVEL_PER_LEVEL_BONUS = 20;
  const PAR_SPEED = 120;
  const TIME_BONUS_RATE = 10;
  const DAILY_GIFT_AMOUNT = 150;

  const STORE = {
    pb: (lvl)=> `neonAscent_pb_level_${lvl}`,
    kid: 'neonAscent_kidMode',
    theme: 'neonAscent_theme',
    muted: 'neonAscent_muted',
    save: 'neonAscent_save',
    gold: 'neonAscent_gold',
    inv: 'neonAscent_inventory',
    skin: 'neonAscent_skin',
    best: 'neonAscent_bestLevel',
    lifetime: 'neonAscent_lifetimeGold',
    daily: 'neonAscent_dailyGift_lastClaim',
    levelsCompleted: 'neonAscent_levelsCompleted',
    mostGoldInLevel: 'neonAscent_mostGoldInLevel',
    deaths: 'neonAscent_deaths',
    bestNoDeathStreak: 'neonAscent_bestNoDeathStreak',
    longestComboClimb: 'neonAscent_longestComboClimb'
  };

  // Theme unlock table (level → available)
  const THEMES = [
    { id:'cyan',     name:'Cyan',     unlock:1,  accent:'#2cf9ff', accent2:'#7af9ff' },
    { id:'magenta',  name:'Magenta',  unlock:1,  accent:'#ff3df2', accent2:'#ff7ae6' },
    { id:'yellow',   name:'Yellow',   unlock:1,  accent:'#ffe66d', accent2:'#ffbe5c' },
    { id:'emerald',  name:'Emerald',  unlock:3,  accent:'#00ffaa', accent2:'#66ffcc' },
    { id:'sunset',   name:'Sunset',   unlock:5,  accent:'#ff8a0f', accent2:'#ffd36d' },
    { id:'midnight', name:'Midnight', unlock:7,  accent:'#7af9ff', accent2:'#ff3df2' },
    { id:'violet',   name:'Violet',   unlock:9,  accent:'#b48bff', accent2:'#8ac6ff' }
  ];

  // Skins (with many Legendary variants)
  const SKINS = [
    { id:'default',  name:'Default Neon',     price:0,     rarity:'common',    unlockLevel:1,  body:'#303136', visor:'#2cf9ff', stripe:'#ff3df2' },
    { id:'rust',     name:'Rust Ranger',      price:1500,  rarity:'common',    unlockLevel:1,  body:'#4a3b31', visor:'#ffe66d', stripe:'#2cf9ff' },
    { id:'midnight', name:'Midnight Magenta', price:3000,  rarity:'rare',      unlockLevel:3,  body:'#262733', visor:'#ff3df2', stripe:'#7af9ff' },
    { id:'solar',    name:'Solar Flare',      price:4500,  rarity:'rare',      unlockLevel:5,  body:'#3a2a19', visor:'#ffd36d', stripe:'#ff8a0f' },
    { id:'emerald',  name:'Emerald Edge',     price:6500,  rarity:'epic',      unlockLevel:7,  body:'#1d3a2a', visor:'#66ffcc', stripe:'#00ffaa' },
    { id:'shadow',   name:'Cyber Shadow',     price:9000,  rarity:'epic',      unlockLevel:9,  body:'#161616', visor:'#7af9ff', stripe:'#ffe66d' },

    // Legendary pack (new + existing)
    { id:'aurora',    name:'Aurora Pulse',     price:15000, rarity:'legendary', unlockLevel:11, body:'#0f1022', visor:'#b48bff', stripe:'#8af5ff' },
    { id:'prism',     name:'Prism Phantom',    price:18000, rarity:'legendary', unlockLevel:13, body:'#101018', visor:'#ffe66d', stripe:'#7af9ff' },
    { id:'nova',      name:'Neon Nova',        price:22000, rarity:'legendary', unlockLevel:15, body:'#121212', visor:'#ff3df2', stripe:'#2cf9ff' },
    { id:'quantum',   name:'Quantum Specter',  price:24000, rarity:'legendary', unlockLevel:17, body:'#0b0c0f', visor:'#8cfffb', stripe:'#ff7ae6' },
    { id:'eclipse',   name:'Eclipse Driver',   price:26000, rarity:'legendary', unlockLevel:19, body:'#0d0e14', visor:'#7af9ff', stripe:'#ffd36d' },
    { id:'hyper',     name:'Hyperdrive Ion',   price:28000, rarity:'legendary', unlockLevel:21, body:'#0f1118', visor:'#2cf9ff', stripe:'#ff8a0f' },
    { id:'spectrum',  name:'Spectrum Surge',   price:30000, rarity:'legendary', unlockLevel:23, body:'#0e0e0f', visor:'#ff7ae6', stripe:'#8ac6ff' },
    { id:'starlight', name:'Starlight Halo',   price:32000, rarity:'legendary', unlockLevel:25, body:'#0e0f13', visor:'#ffe66d', stripe:'#2cf9ff' },
    { id:'cascade',   name:'Cascade Reactor',  price:34000, rarity:'legendary', unlockLevel:28, body:'#0a0b0e', visor:'#66ffcc', stripe:'#b48bff' },
    { id:'thunder',   name:'Thunder Vortex',   price:36000, rarity:'legendary', unlockLevel:32, body:'#0b0c10', visor:'#7af9ff', stripe:'#ff3df2' }
  ];

  // --- Constant, deterministic 100 levels with difficulty scaling ---
  const LEVELS = buildConstantLevels(100);

  let level = 1;
  let kidMode = loadKidMode();
  let muted;

  let gold = loadGold();
  let lifetimeGold = loadLifetimeGold();
  let levelsCompleted = loadLevelsCompleted();
  let mostGoldInOneLevel = loadMostGoldInLevel();
  let deaths = loadDeaths();
  let bestNoDeathStreak = loadBestNoDeathStreak();
  let streakNoDeath = 0;
  let longestComboClimb = loadLongestComboClimb();

  let goldThisLevel = 0;
  let comboClimbThisAir = 0;
  let bestComboThisLevel = 0;

  let inventory = loadInventory();
  if (!inventory.includes('default')) inventory.push('default');

  let equippedSkinId = loadSkin() || 'default';
  let bestLevel = loadBestLevel();

  const player = { x: WORLD.w*0.5, y:0, w:44, h:56, vx:0, vy:0, onGround:false, coyoteTime:0, jumpBuffer:0 };
  const COYOTE_TIME = ()=> kidMode ? 0.14 : 0.10;
  const JUMP_BUFFER = ()=> kidMode ? 0.20 : 0.16;

  let gameState = 'overlay';
  let countdown = 0;
  let camY = 0;
  let platforms = [];
  let goalY = 0;
  let currentLevelHeight = 0;
  const input = { left:false, right:false, jump:false, jumpConsumed:false };
  let levelTime = 0;
  let totalTime = 0;
  const levelProgressBestY = {};

  // Booster state (pickups & jump boost)
  let boosters = [];         // pickups in current level
  let boosterJumps = 0;      // remaining boosted jumps
  let boosterVyBonus = 0;    // extra vy to apply on boosted jump

  // --- DOM refs ---
  const elLevel = document.getElementById('level');
  const elGoldHUD = document.getElementById('gold-hud');
  const elGoldTop = document.getElementById('gold-top');
  const elGoldShop = document.getElementById('gold-shop');

  const elLevelTime = document.getElementById('level-time');
  const elTotalTime = document.getElementById('total-time');
  const elPB = document.getElementById('pb');

  const elStatus = document.getElementById('status');
  const elKidToggle = document.getElementById('kid-toggle');
  const elPause = document.getElementById('pause-btn');

  const themeSelect = document.getElementById('theme-select');
  const muteBtn = document.getElementById('mute-btn');
  const shopBtn = document.getElementById('shop-btn');

  const ov = document.getElementById('overlay');
  const ovTitle = document.getElementById('ov-title');
  const ovSub = document.getElementById('ov-sub');
  const ovCount = document.getElementById('ov-count');
  const btnStart = document.getElementById('btn-start');
  const btnContinue = document.getElementById('btn-continue');
  const btnRestart = document.getElementById('btn-restart');

  const statsBtn = document.getElementById('stats-btn');
  const statsOv = document.getElementById('stats-overlay');
  const statsClose = document.getElementById('stats-close');
  const statBest = document.getElementById('stat-best');
  const statGold = document.getElementById('stat-gold');
  const statLevels = document.getElementById('stat-levels');
  const statMost = document.getElementById('stat-most');
  const statSkins = document.getElementById('stat-skins');
  const statBal = document.getElementById('stat-balance');
  const statDeaths = document.getElementById('stat-deaths');
  const statStreak = document.getElementById('stat-streak');
  const statCombo = document.getElementById('stat-combo');
  const pbList = document.getElementById('pb-list');
  const giftBtn = document.getElementById('gift-btn');

  const summaryOv = document.getElementById('summary-overlay');
  const sumTitle = document.getElementById('sum-title');
  const sumSub = document.getElementById('sum-sub');
  const sumTime = document.getElementById('sum-time');
  const sumPB = document.getElementById('sum-pb');
  const sumGold = document.getElementById('sum-gold');
  const sumTimeBonus = document.getElementById('sum-timebonus');
  const sumLevelBonus = document.getElementById('sum-levelbonus');
  const sumCombo = document.getElementById('sum-combo');
  const sumStreak = document.getElementById('sum-streak');
  const sumBestStreak = document.getElementById('sum-beststreak');
  const summaryNext = document.getElementById('summary-next');
  const summaryRetry = document.getElementById('summary-retry');
  const summaryClose = document.getElementById('summary-close');

  // Booster HUD
  const elHUD = document.getElementById('hud');
  const elBooster = document.createElement('div');
  elBooster.id = 'booster-hud';
  elBooster.style.marginTop = '6px';
  elBooster.style.fontWeight = '700';
  elBooster.style.opacity = '0.95';
  elBooster.textContent = '';
  if (elHUD) elHUD.appendChild(elBooster);

  // Inject shared CSS (shop + cards + rarity + themes)
  injectSharedStyles();
  injectModalStyles(); // v7.2 modal CSS

  // ---------- Modal helpers (v7.2) ----------
  function ensureModal(id, titleText) {
    let backdrop = document.getElementById(id);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = id;
      backdrop.className = 'na-modal-backdrop';

      const win = document.createElement('div');
      win.className = 'na-modal-window';

      const header = document.createElement('div');
      header.className = 'na-modal-header';

      const title = document.createElement('div');
      title.className = 'na-modal-title';
      header.appendChild(title);

      const close = document.createElement('button');
      close.className = 'na-close';
      close.textContent = '×';
      close.addEventListener('click', () => backdrop.classList.remove('show'));
      header.appendChild(close);

      const body = document.createElement('div');
      body.className = 'na-modal-body';

      win.appendChild(header);
      win.appendChild(body);
      backdrop.appendChild(win);
      document.body.appendChild(backdrop);
    }
    const titleEl = backdrop.querySelector('.na-modal-title');
    if (titleEl) titleEl.textContent = titleText || '';
    return backdrop;
  }
  function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('show'); }
  function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }

  // Initialize theme & mute state
  applyTheme(loadTheme());
  muted = loadMuted();
  updateMuteButton();

  // Resize
  function resize(){
    const vw = window.innerWidth, vh = window.innerHeight;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    canvas.width = Math.max(1, Math.floor(vw * DPR));
    canvas.height = Math.max(1, Math.floor(vh * DPR));
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  // Keyboard
  const keymap = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump' };
  window.addEventListener('keydown', (e)=>{
    const k = keymap[e.code];
    if (e.code === 'Escape'){
      if (gameState==='running') pauseGame();
      else if (gameState==='paused') resumeWithCountdown(2);
      e.preventDefault(); return;
    }
    if (!k) return;
    e.preventDefault();
    input[k] = true;
    if (k==='jump') input.jumpConsumed=false;
    ensureAudio();
  }, {passive:false});
  window.addEventListener('keyup', (e)=>{
    const k = keymap[e.code];
    if (!k) return;
    e.preventDefault(); input[k] = false;
  }, {passive:false});

  // Touch controls (guard if buttons aren’t present)
  setupTouchControls();

  // Kid Mode toggle
  if (elKidToggle){
    elKidToggle.addEventListener('click', ()=>{
      kidMode=!kidMode; saveKidMode(kidMode); updateKidToggleUI();
      flashStatus(kidMode? 'Kid Mode ON: friendlier jumps':'Kid Mode OFF');
      openHubFor(level);
    });
    updateKidToggleUI();
  }

  // Pause button
  if (elPause){
    elPause.addEventListener('click', ()=>{
      if (gameState==='running') pauseGame();
      else if (gameState==='paused') resumeWithCountdown(2);
    });
  }

  // Continue (load save)
  if (btnContinue){
    btnContinue.addEventListener('click', ()=>{
      const save = loadSave();
      if (save){
        if (typeof save.score === 'number' && typeof save.gold !== 'number'){ save.gold = save.score; delete save.score; }
        gold = typeof save.gold === 'number' ? save.gold : gold;
        totalTime = save.totalTime||0; updateGoldUI();
        openHubFor(save.level||1);
        ensureAudio();
      }
    });
  }
  if (btnRestart) btnRestart.addEventListener('click', ()=>{ startLevel(level, true, true); });

  // Theme select (top bar)
  if (themeSelect){
    themeSelect.addEventListener('change', ()=>{ applyTheme(themeSelect.value); saveTheme(themeSelect.value); });
    themeSelect.value = loadTheme();
  }

  // Mute button
  if (muteBtn){
    muteBtn.addEventListener('click', ()=>{ muted = !muted; saveMuted(muted); updateMuteButton(); });
  }

  // Shop button (top bar)
  if (shopBtn){ shopBtn.addEventListener('click', ()=>{ openShopModal(); }); }

  // Stats overlay
  if (statsBtn) statsBtn.addEventListener('click', ()=>{ openStats(); });
  if (statsClose) statsClose.addEventListener('click', ()=>{ closeStats(); });

  // Daily gift
  giftBtn && giftBtn.addEventListener('click', ()=>{ tryClaimDailyGift(); });
  refreshGiftButton();

  // Summary overlay actions
  if (summaryNext) summaryNext.addEventListener('click', ()=>{ closeSummary(); openHubFor(level + 1); });
  if (summaryRetry) summaryRetry.addEventListener('click', ()=>{ closeSummary(); startLevel(level, true, true); });
  if (summaryClose) summaryClose.addEventListener('click', ()=>{ closeSummary(); openHubFor(level + 1); });

  // Start in Hub for Level 1
  openHubFor(1); updateGoldUI();

  // -------- Main loop --------
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.032, (now - last)/1000);
    last = now;
    if (gameState==='countdown'){
      countdown -= dt; updateOverlayCountdown();
      if (countdown <= 0) setRunning();
    }
    else if (gameState==='running'){ update(dt); }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // -------- Update --------
  function update(dt){
    levelTime += dt;
    if (elLevelTime) elLevelTime.textContent = formatTime(levelTime);
    if (elTotalTime) elTotalTime.textContent = formatTime(totalTime);

    const accel = (input.left? -1:0) + (input.right? 1:0);
    player.vx += accel * MOVE_ACCEL * dt;
    if (accel === 0 && player.onGround) player.vx *= FRICTION_GROUND;
    player.vx = clamp(player.vx, -MAX_SPEED_X, MAX_SPEED_X);

    player.coyoteTime = Math.max(0, player.coyoteTime - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    if (input.jump) player.jumpBuffer = JUMP_BUFFER();

    // Booster pickup collisions
    for (const b of boosters){
      if (b.taken) continue;
      if (rectsOverlap(player.x, player.y, player.w, player.h, b.x - b.w/2, b.y - b.h/2, b.w, b.h)){
        b.taken = true;
        boosterJumps = 2; // next two jumps boosted
        boosterVyBonus = b.vyBonus; // per-level calibrated
        flashStatus('Booster acquired! 2 super jumps ready');
        SFX.booster();
        updateBoosterHUD();
      }
    }

    // Jump resolution with booster support
    if (player.jumpBuffer > 0) {
      if (player.onGround || player.coyoteTime > 0){
        if (boosterJumps > 0){
          player.vy = -(JUMP_VY + Math.max(0, boosterVyBonus));
          boosterJumps--;
          updateBoosterHUD();
        } else {
          player.vy = -JUMP_VY;
        }
        player.onGround = false; player.coyoteTime = 0; player.jumpBuffer = 0; input.jumpConsumed = true; SFX.jump();
      }
    }

    player.vy += GRAVITY * dt;
    let nextY = player.y + player.vy * dt;
    let nextX = player.x + player.vx * dt;

    let groundedThisFrame = false;
    if (player.vy >= 0){
      for (const p of platforms){
        if (player.y + player.h <= p.y && nextY + player.h >= p.y){
          const px1 = p.x, px2 = p.x + p.w; const plx1 = nextX, plx2 = nextX + player.w;
          if (plx2 > px1 && plx1 < px2){ nextY = p.y - player.h; player.vy = 0; groundedThisFrame = true; }
        }
      }
    }

    player.y = nextY; player.x = nextX;
    if (player.x < 0){ player.x = 0; player.vx = 0; }
    if (player.x + player.w > WORLD.w){ player.x = WORLD.w - player.w; player.vx = 0; }

    const wasGrounded = player.onGround;
    player.onGround = groundedThisFrame;
    if (player.onGround) player.coyoteTime = COYOTE_TIME();

    if (!wasGrounded && player.onGround){
      if (comboClimbThisAir > longestComboClimb){ longestComboClimb = comboClimbThisAir; saveLongestComboClimb(longestComboClimb); }
      if (comboClimbThisAir > bestComboThisLevel){ bestComboThisLevel = comboClimbThisAir; }
      comboClimbThisAir = 0; addGold(LANDING_GOLD); SFX.land();
    }

    // Animate moving platforms
    for (const p of platforms){
      if (p.type==='moving'){
        p.phase += dt;
        const offset = Math.sin(p.phase) * (p.range || 0);
        p.x = p._origX + offset;
        if (p.x < 0) p.x = 0;
        if (p.x + p.w > WORLD.w) p.x = WORLD.w - p.w;
      }
    }

    // Camera
    const targetCamY = Math.min(camY, player.y - WORLD.h * 0.55);
    camY = lerp(camY, targetCamY, 0.08);

    // Cull platforms
    const belowCut = camY + WORLD.h + 240;
    platforms = platforms.filter(p => p.y < belowCut);

    // Climb gold
    const bestY = levelProgressBestY[level] ?? player.y;
    if (player.y < bestY){
      const delta = bestY - player.y;
      const climbGold = Math.floor(delta * CLIMB_GOLD_PER_PX);
      if (climbGold>0){
        addGold(climbGold);
        levelProgressBestY[level] = player.y;
        comboClimbThisAir += climbGold;
      }
    }

    // Goal
    if (player.y <= goalY){
      if (comboClimbThisAir > longestComboClimb){ longestComboClimb = comboClimbThisAir; saveLongestComboClimb(longestComboClimb); }
      if (comboClimbThisAir > bestComboThisLevel){ bestComboThisLevel = comboClimbThisAir; }
      comboClimbThisAir = 0;

      const parSeconds = Math.max(1, currentLevelHeight / PAR_SPEED);
      const timeBonus = Math.max(0, Math.floor((parSeconds - levelTime) * TIME_BONUS_RATE));
      const levelBonus = LEVEL_BASE_BONUS + LEVEL_PER_LEVEL_BONUS * level;
      const gained = timeBonus + levelBonus; addGold(gained);
      totalTime += levelTime;

      const key = STORE.pb(level); const prev = parseFloat(localStorage.getItem(key));
      const pbImproved = isFinite(prev) ? (levelTime < prev) : true;
      if (pbImproved) localStorage.setItem(key, String(levelTime));
      if (elPB) elPB.textContent = `PB: ${formatTime(parseFloat(localStorage.getItem(key)) || levelTime)}`;

      if (level > bestLevel){ bestLevel = level; saveBestLevel(bestLevel); }
      levelsCompleted++; saveLevelsCompleted(levelsCompleted);
      if (goldThisLevel > mostGoldInOneLevel){ mostGoldInOneLevel = goldThisLevel; saveMostGoldInLevel(mostGoldInOneLevel); }

      streakNoDeath++;
      if (streakNoDeath > bestNoDeathStreak){ bestNoDeathStreak = streakNoDeath; saveBestNoDeathStreak(bestNoDeathStreak); }
      SFX.goal();

      flashStatus(`Level ${level} complete! +${gained}g | ${formatTime(levelTime)}` + (pbImproved?' (PB!)':''));
      saveProgress({ level: level+1, gold, totalTime });

      openSummary({
        level, time: levelTime, isPB: pbImproved,
        gold: goldThisLevel, timeBonus, levelBonus,
        combo: bestComboThisLevel, streak: streakNoDeath, bestStreak: bestNoDeathStreak
      });
      return;
    }

    // Fall
    const fallLimit = camY + WORLD.h + 240;
    if (player.y > fallLimit){
      deaths++; saveDeaths(deaths); streakNoDeath = 0;
      flashStatus(kidMode? `${kidEncouragement()} Restarting…`:'Fell! Restarting level…');
      comboClimbThisAir = 0; bestComboThisLevel = 0;
      startLevel(level, true, true);
      return;
    }
  }

  // -------- Draw --------
  function draw(){
    const w = canvas.width, h = canvas.height;
    const scaleX = w / WORLD.w, scaleY = h / WORLD.h; const s = Math.min(scaleX, scaleY);
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#0b0c0f'); g.addColorStop(1,'#161514');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

    ctx.save();
    ctx.translate((w - WORLD.w * s)/2, (h - WORLD.h * s)/2);
    ctx.scale(s, s);
    ctx.translate(0, -camY);

    drawNeonPipes(ctx);

    // Goal stripe
    ctx.save();
    ctx.lineWidth=3; ctx.setLineDash([10,8]);
    neonStroke(ctx, ()=>{
      ctx.beginPath(); ctx.moveTo(24, goalY); ctx.lineTo(WORLD.w-24, goalY); ctx.stroke();
    }, getAccentColor(), 18);
    ctx.restore();

    for (const p of platforms) drawPlatform(ctx, p);
    drawPlayer(ctx, player);

    // Draw boosters
    for (const b of boosters){ if (b.taken) continue; drawBooster(ctx, b); }

    ctx.restore();
  }

  function drawPlatform(ctx, p){
    const y=p.y, x=p.x, w=p.w, h=p.h || 16;
    ctx.fillStyle='#242325'; ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1.2;
    roundRect(ctx,x,y,w,h,6); ctx.fill(); ctx.stroke();
    neonStroke(ctx, ()=>{
      ctx.beginPath(); ctx.moveTo(x+3, y+2.5); ctx.lineTo(x+w-3, y+2.5); ctx.stroke();
    }, p.type==='moving'? getAccent2Color() : getAccentColor(), p.type==='moving'?22:16);
    ctx.fillStyle='rgba(255,255,255,0.06)';
    for (let i=0;i<Math.max(2, Math.floor(w/100));i++){
      const bx = x + 12 + i*(w-24)/Math.max(1,(Math.floor(w/100)));
      ctx.beginPath(); ctx.arc(bx, y + h - 8, 2, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawBooster(ctx, b){
    const x = b.x, y = b.y;
    neonFill(ctx, ()=>{
      roundRect(ctx, x-10, y-10, 20, 20, 5);
      ctx.fillStyle = getAccent2Color(); ctx.fill();
    }, getAccent2Color(), 16);
    neonStroke(ctx, ()=>{
      ctx.beginPath();
      ctx.moveTo(x-6, y+4); ctx.lineTo(x, y-4); ctx.lineTo(x+6, y+4);
      ctx.strokeStyle = getAccentColor(); ctx.lineWidth=2; ctx.stroke();
    }, getAccentColor(), 14);
  }

  function currentSkin(){ return SKINS.find(s=>s.id===equippedSkinId) || SKINS[0]; }

  function drawPlayer(ctx, pl){
    const skin = currentSkin();
    const x=pl.x, y=pl.y, w=pl.w, h=pl.h;

    // body
    ctx.fillStyle=skin.body; roundRect(ctx,x,y,w,h,10); ctx.fill();

    // visor + stripe with neon pulse if legendary
    const now = performance.now() * 0.004;
    const pulse = (Math.sin(now*3)+1)/2; // 0..1
    const visorColor = skin.visor;
    const stripeColor = skin.stripe;
    const accent = getAccentColor();
    const useAccent = (skin.rarity==='legendary' && pulse>0.5);

    neonFill(ctx, ()=>{
      roundRect(ctx, x+8, y+10, w-16, 16, 8);
      ctx.fillStyle = useAccent? accent : visorColor;
      ctx.globalAlpha = skin.rarity==='legendary'? (0.7 + 0.3*pulse) : 1; ctx.fill();
    }, useAccent? accent: visorColor, skin.rarity==='legendary'? 22:18);

    neonFill(ctx, ()=>{
      roundRect(ctx, x + w*0.15, y + h - 12, w*0.7, 6, 3);
      ctx.fillStyle = useAccent? accent : stripeColor;
      ctx.globalAlpha = skin.rarity==='legendary'? (0.65 + 0.35*pulse) : 1; ctx.fill();
    }, useAccent? accent: stripeColor, skin.rarity==='legendary'? 18:10);

    ctx.globalAlpha = 1;
  }

  function drawNeonPipes(ctx){
    ctx.save(); ctx.globalAlpha=.18;
    for (let i=0;i<6;i++){
      const x=(i+1)*WORLD.w/7;
      const color = i%3===0? getAccentColor(): (i%3===1? getAccent2Color(): '#ffe66d');
      neonStroke(ctx, ()=>{
        ctx.beginPath(); ctx.moveTo(x, camY - 200);
        ctx.lineTo(x, camY + WORLD.h + 300); ctx.lineWidth=2;
        ctx.strokeStyle=color; ctx.stroke();
      }, color, 22);
    }
    ctx.restore();
  }

  // ---------- Hub as modal (v7.2) ----------
  function openHubFor(targetLevel){
    level = Math.max(1, Math.min(targetLevel, LEVELS.length));

    const hub = ensureModal('modal-hub', `Level ${level}`);
    const body = hub.querySelector('.na-modal-body');
    body.innerHTML = '';

    // Row: Theme picker
    const row = document.createElement('div');
    row.style.display='flex'; row.style.flexWrap='wrap'; row.style.gap='10px';
    row.style.alignItems='center'; row.style.marginBottom='10px';

    const themeWrap = document.createElement('div');
    themeWrap.style.display='flex'; themeWrap.style.alignItems='center'; themeWrap.style.gap='8px';
    const lbl = document.createElement('label'); lbl.textContent='Theme:'; lbl.style.opacity='0.9';
    const sel = document.createElement('select'); sel.className='na-select'; sel.style.minWidth='160px';
    themeWrap.appendChild(lbl); themeWrap.appendChild(sel); row.appendChild(themeWrap);
    body.appendChild(row);

    // Populate themes (🔒 + tooltip)
    sel.innerHTML=''; const cur = loadTheme(); const bl = bestLevel;
    THEMES.forEach(t=>{
      const opt=document.createElement('option'); opt.value=t.id;
      const locked = bl < (t.unlock||1);
      opt.textContent = locked ? `🔒 ${t.name} (L${t.unlock})` : t.name;
      opt.title = locked ? `Reach Level ${t.unlock} to unlock` : `Theme: ${t.name}`;
      if (t.id===cur) opt.selected=true; sel.appendChild(opt);
    });
    sel.addEventListener('change', ()=>{
      const id = sel.value; const t = getThemeById(id);
      if (bestLevel < (t.unlock||1)){
        flashStatus(`🔒 Theme locked — reach Level ${t.unlock}`);
        sel.value = loadTheme();
        return;
      }
      applyTheme(id); saveTheme(id);
      flashStatus(`Theme: ${t.name}`);
    });

    // Actions: Start / Shop / Stats
    const actions = document.createElement('div');
    actions.style.display='flex'; actions.style.gap='10px'; actions.style.margin='8px 0 14px';
    const btnStart2 = document.createElement('button'); btnStart2.className='btn'; btnStart2.textContent=`Start Level ${level}`;
    const btnShop  = document.createElement('button'); btnShop.className='btn';  btnShop.textContent='Open Shop';
    const btnStats = document.createElement('button'); btnStats.className='btn'; btnStats.textContent='Stats';
    actions.appendChild(btnStart2); actions.appendChild(btnShop); actions.appendChild(btnStats);
    body.appendChild(actions);

    btnStart2.onclick = ()=>{
      closeModal('modal-hub');
      startLevel(level, false, false);
      startCountdown(3);
      ensureAudio();
    };
    btnShop.onclick = ()=>{ openShopModal(); };
    btnStats.onclick = ()=>{ openStats(); };

    // Info row
    const info = document.createElement('div');
    info.style.display='flex'; info.style.justifyContent='space-between'; info.style.alignItems='center';
    info.innerHTML = `<div><strong>Best:</strong> L${bestLevel} • <strong>Gold:</strong> ${gold}</div><div id="hub-tip" style="opacity:.8"></div>`;
    body.appendChild(info);
    const tips = [
      'Tip: Legendary skins pulse with neon!',
      'Tip: Daily gift in the shop header!',
      'Tip: Unlock more themes by pushing your best level!'
    ];
    const tipEl = info.querySelector('#hub-tip'); if (tipEl) tipEl.textContent = tips[Math.floor(Math.random()*tips.length)];

    // Show modal
    openModal('modal-hub');
  }

  // ----- SHOP as modal (v7.2) -----
  function openShopModal(){
    const shop = ensureModal('modal-shop', 'Shop');
    const body = shop.querySelector('.na-modal-body');
    body.innerHTML = '';

    // header row with gold
    const head = document.createElement('div');
    head.style.display='flex'; head.style.gap='12px'; head.style.alignItems='center'; head.style.marginBottom='10px';
    const goldBadge = document.createElement('div'); goldBadge.className='na-shop-gold'; goldBadge.textContent = `🪙 ${gold}`;
    head.appendChild(goldBadge); body.appendChild(head);

    // tabs
    const tabs = document.createElement('div'); tabs.className='na-shop-tabs';
    body.appendChild(tabs);
    let filter = 'all';
    ['All','Common','Rare','Epic','Legendary'].forEach(cat=>{
      const b=document.createElement('button');
      b.className='na-tab'; b.textContent=cat; b.dataset.filter=cat.toLowerCase();
      if (cat==='All') b.classList.add('active');
      b.addEventListener('click',()=>{
        filter=b.dataset.filter;
        [...tabs.children].forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        render();
      });
      tabs.appendChild(b);
    });

    // grid
    const grid = document.createElement('div'); grid.className='na-shop-grid'; body.appendChild(grid);

    function render(){ renderShopGrid(grid, { filter, scope:'overlay' }); updateShopGoldBadges(); }
    render();

    openModal('modal-shop');
  }
  function openShop(){ openShopModal(); }
  function closeShop(){ closeModal('modal-shop'); }

  // ----- SHOP renderer (shared) -----
  function renderShopGrid(container, { filter='all', scope='hub' }={}){
    container.innerHTML = '';
    const list = SKINS.filter(s=> filter==='all' ? true : s.rarity===filter);
    list.forEach(skin=>{
      const card = document.createElement('div'); card.className='na-card'; card.dataset.skin=skin.id; card.classList.add(`rarity-${skin.rarity}`);
      const rowTop = document.createElement('div'); rowTop.className='na-card-top';
      const name = document.createElement('div'); name.className='skin-name'; name.textContent = skin.name; rowTop.appendChild(name);
      const badge = document.createElement('div'); badge.className='skin-badge'; badge.textContent = skin.rarity.toUpperCase(); rowTop.appendChild(badge);

      const prev = document.createElement('canvas'); prev.className='skin-preview'; prev.width = 260; prev.height = 120;
      prev.style.width='100%'; prev.style.display='block'; prev.style.margin='8px 0';

      const meta = document.createElement('div'); meta.className='na-card-meta';
      const price = document.createElement('div'); price.className='skin-price'; price.textContent = `🪙 ${skin.price}`;
      const lock = document.createElement('div'); lock.className='skin-lock'; lock.style.display='none';
      meta.appendChild(price); meta.appendChild(lock);
      const acts = document.createElement('div'); acts.className='na-actions';
      const btnBuy = document.createElement('button'); btnBuy.className='btn'; btnBuy.textContent = `Buy`;
      const btnEquip = document.createElement('button'); btnEquip.className='btn'; btnEquip.textContent = `Equip`;
      acts.appendChild(btnBuy); acts.appendChild(btnEquip);

      card.appendChild(rowTop); card.appendChild(prev); card.appendChild(meta); card.appendChild(acts);
      container.appendChild(card);

      // animated preview (legendary pulse)
      prev.dataset.phase = String(Math.random()*Math.PI*2); prev.dataset.skin = skin.id; drawSkinPreview(prev, skin, 0);

      const owned = inventory.includes(skin.id);
      const equipped = equippedSkinId === skin.id;
      const gated = (bestLevel < (skin.unlockLevel||1));
      if (gated){ lock.style.display='block'; lock.textContent = `Reach Level ${skin.unlockLevel} to unlock purchase`; }
      btnBuy.style.display = owned ? 'none' : '';
      btnEquip.style.display = owned ? '' : 'none';
      btnEquip.disabled = !owned || equipped;
      if (!owned && (gold < skin.price || gated)){ btnBuy.classList.add('disabled'); }

      btnBuy.addEventListener('click', ()=>{
        if (gated) return;
        if (gold >= skin.price){
          gold -= skin.price; saveGold(); updateGoldUI();
          inventory.push(skin.id); saveInventory();
          btnBuy.style.display='none'; btnEquip.style.display='';
          btnEquip.disabled=false; SFX.coin(); updateStatsUI(); updateShopGoldBadges();
        }
      });
      btnEquip.addEventListener('click', ()=>{
        if (!inventory.includes(skin.id)) return;
        equippedSkinId = skin.id; saveSkin(); SFX.equip();
        container.querySelectorAll('.na-card').forEach(c=>{
          const sid = c.dataset.skin;
          const eqBtn = c.querySelector('.na-actions .btn:last-child');
          if (eqBtn) eqBtn.disabled = (sid===equippedSkinId);
        });
      });
    });
  }

  function drawSkinPreview(cnv, skin, t){
    const c2 = cnv.getContext('2d'); const phase = parseFloat(cnv.dataset.phase||'0');
    const time = (t||0)/1000 + phase; const bob = Math.sin(time*2.0) * 6;
    c2.clearRect(0,0,cnv.width, cnv.height);
    const grd = c2.createLinearGradient(0,0,0,cnv.height);
    grd.addColorStop(0, 'rgba(15,16,18,0.7)'); grd.addColorStop(1, 'rgba(10,11,13,0.5)');
    c2.fillStyle = grd; c2.fillRect(0,0,cnv.width, cnv.height);

    c2.fillStyle='#242325'; c2.strokeStyle='rgba(255,255,255,0.05)'; c2.lineWidth=1.2;
    roundRect(c2, 16, 86, 200, 16, 6); c2.fill(); c2.stroke();

    const px = 76, py = 56 + bob, w=44, h=56;
    c2.fillStyle=skin.body; roundRect(c2, px, py, w, h, 10); c2.fill();

    // Legendary pulse on preview visor/stripe
    const now = (t||0)/1000; const pulse = (Math.sin((now+phase)*3)+1)/2;
    const accent = getAccentColor();
    const visorCol = (skin.rarity==='legendary' && pulse>0.5) ? accent : skin.visor;
    const stripeCol = (skin.rarity==='legendary' && pulse>0.5) ? accent : skin.stripe;

    neonFill(c2, ()=>{ roundRect(c2, px+8, py+10, w-16, 16, 8); c2.fillStyle=visorCol; c2.globalAlpha = skin.rarity==='legendary'? (0.7+0.3*pulse):1; c2.fill(); }, visorCol, skin.rarity==='legendary'? 18:10);
    neonFill(c2, ()=>{ roundRect(c2, px + w*0.15, py + h - 12, w*0.7, 6, 3); c2.fillStyle=stripeCol; c2.globalAlpha = skin.rarity==='legendary'? (0.65+0.35*pulse):1; c2.fill(); }, stripeCol, skin.rarity==='legendary'? 16:8);

    // request next frame while modal is visible
    requestAnimationFrame((t2)=>{ if (document.body.contains(cnv)) drawSkinPreview(cnv, skin, t2); });
  }

  function updateShopGoldBadges(){ document.querySelectorAll('.na-shop-gold').forEach(el=>{ el.textContent = `🪙 ${gold}`; }); }

  // ----- Stats overlay -----
  function openStats(){ updateStatsUI(); if (statsOv) statsOv.classList.add('show'); }
  function closeStats(){ if (statsOv) statsOv.classList.remove('show'); }
  function updateStatsUI(){
    if (statBest) statBest.textContent = String(bestLevel);
    if (statGold) statGold.textContent = String(lifetimeGold);
    if (statLevels) statLevels.textContent = String(levelsCompleted);
    if (statMost) statMost.textContent = String(mostGoldInOneLevel);
    if (statSkins) statSkins.textContent = String((inventory||[]).length);
    if (statBal) statBal.textContent = String(gold);
    if (statDeaths) statDeaths.textContent = String(deaths);
    if (statStreak) statStreak.textContent = String(bestNoDeathStreak);
    if (statCombo) statCombo.textContent = String(longestComboClimb);
    if (pbList){
      pbList.innerHTML = '';
      for (let i=1; i<=bestLevel; i++){
        const key = STORE.pb(i); const v = parseFloat(localStorage.getItem(key));
        const li = document.createElement('li');
        const lvl = document.createElement('span'); lvl.className='lvl'; lvl.textContent = `L${i}`;
        const tm = document.createElement('span'); tm.className='time'; tm.textContent = isFinite(v) ? formatTime(v) : '—';
        li.appendChild(lvl); li.appendChild(tm);
        pbList.appendChild(li);
      }
    }
  }

  // ----- Countdown & overlay -----
  function showOverlay(title, sub, showStart=true, showRestart=false){
    if (!ov) return;
    ovTitle && (ovTitle.textContent = title||'Neon Ascent');
    ovSub && (ovSub.textContent=sub||'');
    ovCount && (ovCount.textContent='');
    if (btnStart) btnStart.style.display = showStart? '':'none';
    if (btnRestart) btnRestart.style.display = showRestart? '':'none';
    if (btnContinue){
      const save = loadSave(); btnContinue.style.display = save? '' : 'none';
    }
    ov.classList.add('show');
  }
  function hideOverlay(){ if (ov) { ov.classList.remove('show'); if (ovCount) ovCount.textContent=''; } }
  function startCountdown(seconds=3){
    countdown = seconds;
    gameState='countdown';
    // Close modals when starting countdown (v7.2)
    closeModal('modal-hub'); 
    closeModal('modal-shop');

    if (btnStart) btnStart.style.display='none';
    if (btnRestart) btnRestart.style.display='none';
    if (btnContinue) btnContinue.style.display='none';
    updateOverlayCountdown();
  }
  function updateOverlayCountdown(){
    const t=Math.ceil(Math.max(0, countdown));
    if (!ovCount || !ovSub) return;
    if (t>0){ ovCount.textContent=String(t); ovSub.textContent='Get ready…'; }
    else { ovCount.textContent='GO!'; ovSub.textContent=''; }
  }
  function setRunning(){ gameState='running'; hideOverlay(); }
  function pauseGame(){ if (gameState!=='running') return; gameState='paused'; showOverlay('Paused','Tap Resume to continue',true,true); btnStart && (btnStart.textContent='Resume'); }
  function resumeWithCountdown(seconds=2){ showOverlay('Ready?','',false,true); startCountdown(seconds); }

  // ----- Summary overlay -----
  function openSummary({ level, time, isPB, gold, timeBonus, levelBonus, combo, streak, bestStreak }){
    if (!summaryOv) return;
    if (sumTitle) sumTitle.textContent = `Level ${level} complete!`;
    if (sumSub) sumSub.textContent = isPB ? 'Personal Best! 🎉' : 'Nice climb!';
    if (sumTime) sumTime.textContent = formatTime(time);
    if (sumPB) sumPB.textContent = isPB ? 'Yes' : 'No';
    if (sumGold) sumGold.textContent = String(gold);
    if (sumTimeBonus) sumTimeBonus.textContent = String(timeBonus);
    if (sumLevelBonus) sumLevelBonus.textContent = String(levelBonus);
    if (sumCombo) sumCombo.textContent = String(combo);
    if (sumStreak) sumStreak.textContent = String(streak);
    if (sumBestStreak) sumBestStreak.textContent = String(bestStreak);
    summaryOv.classList.add('show');
  }
  function closeSummary(){ if (summaryOv) summaryOv.classList.remove('show'); }

  // ----- Level start -----
  function startLevel(lvl, isRestart=false, showOverlayAtStart=false){
    if (lvl > LEVELS.length){
      // All levels complete
      level = LEVELS.length; gameState='overlay';
      if (btnStart){ btnStart.style.display=''; btnStart.textContent='Restart'; }
      if (btnContinue) btnContinue.style.display='none';
      if (btnRestart) btnRestart.style.display='none';
      showOverlay('All 100 levels complete!','Awesome! Tap Restart to play from Level 1.', true, false);
      if (btnStart) btnStart.onclick = ()=>{ clearSave(); openHubFor(1); };
      return;
    }

    level = Math.max(1, lvl);
    if (elLevel) elLevel.textContent = `Level ${level}`;

    const L = LEVELS[level-1];
    platforms = [];

    // Start platform
    const startPlat = { x: L.start.x, y: L.start.y, w: L.start.w, h:16, type:'static', phase:0 };
    platforms.push(startPlat);

    // Place player just above the start platform
    player.x = clamp(startPlat.x + (startPlat.w - player.w)/2, 0, WORLD.w - player.w);
    player.y = startPlat.y - player.h - 1;
    player.vx=0; player.vy=0; player.onGround=false; player.coyoteTime=0; player.jumpBuffer=0;

    levelTime = 0; if (elLevelTime) elLevelTime.textContent = formatTime(0);
    goldThisLevel = 0; comboClimbThisAir = 0; bestComboThisLevel = 0;

    // Add level platforms
    for (const p of L.platforms){
      if (p.type==='moving') platforms.push({ x:p.x, y:p.y, w:p.w, h:16, type:'moving', range:p.range||40, _origX:p.x, phase:p.phase||0 });
      else platforms.push({ x:p.x, y:p.y, w:p.w, h:16, type:'static', phase:0 });
    }

    // Boosters
    boosters = [];
    for (const bp of (L.boosters||[])){
      boosters.push({ x: bp.x, y: bp.y, w: 20, h: 20, taken:false, vyBonus: L.boostVyBonus });
    }

    currentLevelHeight = L.height;
    goalY = (L.goalY != null ? L.goalY : -L.height);

    const key = STORE.pb(level); const prev = parseFloat(localStorage.getItem(key));
    if (elPB) elPB.textContent = `PB: ${isFinite(prev) ? formatTime(prev) : '--:--.--'}`;
    updateGoldUI(); refreshGiftButton(); updateBoosterHUD();

    camY = -WORLD.h*0.1; // slight look-ahead
    levelProgressBestY[level] = player.y;

    if (showOverlayAtStart){ gameState='overlay'; btnStart && (btnStart.textContent='Start'); showOverlay(`Level ${level}`, 'Tap Start to play', true, isRestart); }
    else { setRunning(); }
  }

  // ----- Touch controls -----
  function setupTouchControls(){
    const left = document.getElementById('btn-left');
    const right = document.getElementById('btn-right');
    const jump = document.getElementById('btn-jump');
    if (!left || !right || !jump) return;
    const bind = (el, onDown, onUp)=>{
      ['touchstart','mousedown'].forEach(evt=> el.addEventListener(evt, e=>{ e.preventDefault(); onDown(); }, {passive:false}));
      ['touchend','touchcancel','mouseup','mouseleave'].forEach(evt=> el.addEventListener(evt, e=>{ e.preventDefault(); onUp(); }, {passive:false}));
    };
    bind(left, ()=>{ input.left=true; }, ()=>{ input.left=false; });
    bind(right, ()=>{ input.right=true; }, ()=>{ input.right=false; });
    bind(jump, ()=>{ input.jump=true; input.jumpConsumed=false; ensureAudio(); }, ()=>{ input.jump=false; });
  }

  // ---------- Shared styles & themes ----------
  function injectSharedStyles(){
    if (document.getElementById('na-shared-styles')) return;
    const st = document.createElement('style'); st.id='na-shared-styles'; st.textContent = `
      :root { --accent:#2cf9ff; --accent-2:#7af9ff; }
      body.theme-cyan    { --accent:#2cf9ff; --accent-2:#7af9ff; }
      body.theme-magenta { --accent:#ff3df2; --accent-2:#ff7ae6; }
      body.theme-yellow  { --accent:#ffe66d; --accent-2:#ffbe5c; }
      body.theme-emerald { --accent:#00ffaa; --accent-2:#66ffcc; }
      body.theme-sunset  { --accent:#ff8a0f; --accent-2:#ffd36d; }
      body.theme-midnight{ --accent:#7af9ff; --accent-2:#ff3df2; }
      body.theme-violet  { --accent:#b48bff; --accent-2:#8ac6ff; }

      .na-select { background:#15161a; color:#eaecef; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 10px; }

      .na-shop { max-width: 1000px; margin: 0 auto; }
      .na-shop-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
      .na-shop-title { font-weight:800; letter-spacing:0.3px; }
      .na-shop-gold { font-weight:700; opacity:0.95; }
      .na-shop-close { background:transparent; border:none; color:#eaecef; font-size:22px; line-height:20px; padding:4px 8px; border-radius:8px; cursor:pointer; }
      .na-shop-close:hover { background: rgba(255,255,255,0.08); }
      .na-shop-tabs { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
      .na-tab { background:#15161a; color:#eaecef; border:1px solid rgba(255,255,255,0.1); border-radius:999px; padding:6px 12px; cursor:pointer; }
      .na-tab.active, .na-tab:hover { border-color: var(--accent); box-shadow: 0 0 12px rgba(44,249,255,0.2); }
      .na-shop-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
      .na-card { background: rgba(20,21,24,0.7); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px; transition:box-shadow .2s, border-color .2s; }
      .na-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
      .na-card .skin-name { font-weight:700; }
      .na-card .skin-badge { opacity:0.95; font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); }
      .na-card-meta { display:flex; justify-content:space-between; align-items:center; margin:8px 0; }
      .na-card .skin-price { font-weight:600; }
      .na-actions { display:flex; gap:8px; }
      .na-actions .btn { flex:1 1 auto; }

      /* Rarity accents */
      .na-card.rarity-common    { border-color: rgba(255,255,255,0.08); }
      .na-card.rarity-common .skin-badge { background:rgba(255,255,255,0.06); }
      .na-card.rarity-rare      { border-color: #6aa7ff55; box-shadow: 0 0 16px #6aa7ff22 inset; }
      .na-card.rarity-rare .skin-badge { background:#6aa7ff22; border-color:#6aa7ff66; }
      .na-card.rarity-epic      { border-color: #ff7ae655; box-shadow: 0 0 18px #ff7ae622 inset; }
      .na-card.rarity-epic .skin-badge { background:#ff7ae622; border-color:#ff7ae688; }
      .na-card.rarity-legendary { border-color: #ffd36d77; box-shadow: 0 0 20px #ffd36d33 inset, 0 0 10px #ffd36d22; }
      .na-card.rarity-legendary .skin-badge { background:#ffd36d22; border-color:#ffd36daa; }
    `;
    document.head.appendChild(st);
  }

  function injectModalStyles(){
    if (document.getElementById('na-modal-styles')) return;
    const st = document.createElement('style'); st.id='na-modal-styles'; st.textContent = `
      /* --- Modals (Hub + Shop) v7.2 --- */
      .na-modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.55);
        display: none; align-items: center; justify-content: center;
        z-index: 9999;
      }
      .na-modal-backdrop.show { display: flex; }

      .na-modal-window {
        width: min(1000px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: hidden;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(13,15,18,.95), rgba(10,11,13,.92));
        box-shadow: 0 10px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06) inset;
        display: flex; flex-direction: column;
      }

      .na-modal-header {
        display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:12px 14px;
        border-bottom:1px solid rgba(255,255,255,.06);
      }
      .na-modal-title { font-weight:800; letter-spacing:.3px; }
      .na-modal-body  { padding:14px; overflow:auto; }

      .na-close {
        background:transparent; border:none; color:#eaecef;
        font-size:22px; line-height:20px; padding:4px 8px;
        border-radius:8px; cursor:pointer;
      }
      .na-close:hover { background: rgba(255,255,255,.08); }
    `;
    document.head.appendChild(st);
  }

  // ---------- Audio ----------
  function ensureAudio(){ if (audio) return; try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = muted? 0 : 0.6; master.connect(ctx.destination);
    audio = { ctx, master };
  }catch{} }
  function sweep(f1,f2,dur,type,vol){ if (!audio) return; const { ctx, master }=audio; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f1, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime+dur); g.gain.value = vol; o.connect(g); g.connect(master); o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); o.stop(ctx.currentTime + dur + 0.02); }
  function tone(freq, time, type, vol, when){ if (!audio) return; const { ctx, master }=audio; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; g.gain.value=vol; o.frequency.setValueAtTime(freq, when); o.connect(g); g.connect(master); o.start(when); g.gain.exponentialRampToValueAtTime(0.001, when + time); o.stop(when + time + 0.02); }
  const SFX = {
    jump(){ if (muted || !audio) return; sweep(380, 620, 0.12, 'square', 0.22); },
    land(){ if (muted || !audio) return; sweep(160, 90, 0.08, 'sawtooth', 0.15); },
    goal(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(660, 0.08, 'triangle', 0.22, t); tone(880, 0.10, 'triangle', 0.22, t+0.1); tone(990, 0.12, 'triangle', 0.22, t+0.22); },
    coin(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(1200, 0.06, 'square', 0.25, t); tone(1600, 0.06, 'square', 0.2, t+0.06); },
    equip(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(900, 0.08, 'triangle', 0.2, t); },
    booster(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(1000, 0.06, 'square', 0.22, t); tone(1400, 0.06, 'square', 0.22, t+0.06); tone(1800, 0.08, 'square', 0.22, t+0.12); }
  };

  function updateMuteButton(){
    if (!muteBtn) return;
    muteBtn.setAttribute('aria-pressed', muted? 'true':'false');
    muteBtn.textContent = muted? '\uD83D\uDD08' : '\uD83D\uDD0A';
    if (audio && audio.master) audio.master.gain.value = muted? 0 : 0.6;
  }

  // ---------- Utilities ----------
  function roundRect(ctx,x,y,w,h,r){ const rr=Math.min(r,w*.5,h*.5); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
  function neonStroke(ctx, drawFn, color, glow=16){ ctx.save(); ctx.shadowColor=color; ctx.shadowBlur=glow; ctx.strokeStyle=color; drawFn(); ctx.restore(); }
  function neonFill(ctx, drawFn, color, glow=16){ ctx.save(); ctx.shadowColor=color; ctx.shadowBlur=glow; drawFn(); ctx.restore(); }
  function getAccentColor(){ return getCSS('--accent') || '#2cf9ff'; }
  function getAccent2Color(){ return getCSS('--accent-2') || '#7af9ff'; }
  function getCSS(varName){ return getComputedStyle(document.body).getPropertyValue(varName).trim(); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function formatTime(sec){ const s=Math.floor(sec%60); const m=Math.floor(sec/60); const hundredths=Math.floor((sec - Math.floor(sec))*100); const pad=(n,w=2)=> n.toString().padStart(w,'0'); return `${pad(m)}:${pad(s)}.${pad(hundredths)}`; }
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

  // ---------- Storage helpers ----------
  function applyTheme(name){
    document.body.classList.remove('theme-cyan','theme-magenta','theme-yellow','theme-emerald','theme-sunset','theme-midnight','theme-violet');
    const t = (name||'cyan');
    document.body.classList.add(`theme-${t}`);
    if (themeSelect) themeSelect.value = t;
  }
  function getThemeById(id){ return THEMES.find(t=>t.id===id); }
  function isThemeUnlocked(id){ const t = getThemeById(id); return t? (bestLevel >= (t.unlock||1)) : true; }

  function saveTheme(name){ try{ localStorage.setItem(STORE.theme, name); }catch{} }
  function loadTheme(){ try{ return localStorage.getItem(STORE.theme) || 'cyan'; }catch{ return 'cyan'; } }

  function saveMuted(v){ try{ localStorage.setItem(STORE.muted, v?'true':'false'); }catch{} }
  function loadMuted(){ try{ return localStorage.getItem(STORE.muted)==='true'; }catch{ return false; } }

  function loadGold(){ try{ return parseInt(localStorage.getItem(STORE.gold)||'0',10) || 0; }catch{ return 0; } }
  function saveGold(){ try{ localStorage.setItem(STORE.gold, String(gold)); }catch{} }
  function loadLifetimeGold(){ try{ return parseInt(localStorage.getItem(STORE.lifetime)||'0',10) || 0; }catch{ return 0; } }
  function saveLifetimeGold(){ try{ localStorage.setItem(STORE.lifetime, String(lifetimeGold)); }catch{} }

  function updateGoldUI(){
    if (elGoldHUD) elGoldHUD.textContent = String(gold);
    if (elGoldTop) elGoldTop.textContent = String(gold);
    if (elGoldShop) elGoldShop.textContent = String(gold);
    if (statBal) statBal.textContent = String(gold);
    updateShopGoldBadges();
  }

  function loadInventory(){ try{ return JSON.parse(localStorage.getItem(STORE.inv)||'[]'); }catch{ return []; } }
  function saveInventory(){ try{ localStorage.setItem(STORE.inv, JSON.stringify(inventory)); }catch{} }
  function loadSkin(){ try{ return localStorage.getItem(STORE.skin); }catch{ return null; } }
  function saveSkin(){ try{ localStorage.setItem(STORE.skin, equippedSkinId); }catch{} }

  function loadBestLevel(){ try{ return parseInt(localStorage.getItem(STORE.best)||'1',10) || 1; }catch{ return 1; } }
  function saveBestLevel(v){ try{ localStorage.setItem(STORE.best, String(v)); }catch{} }

  function loadLevelsCompleted(){ try{ return parseInt(localStorage.getItem(STORE.levelsCompleted)||'0',10) || 0; }catch{ return 0; } }
  function saveLevelsCompleted(v){ try{ localStorage.setItem(STORE.levelsCompleted, String(v)); }catch{} }

  function loadMostGoldInLevel(){ try{ return parseInt(localStorage.getItem(STORE.mostGoldInLevel)||'0',10) || 0; }catch{ return 0; } }
  function saveMostGoldInLevel(v){ try{ localStorage.setItem(STORE.mostGoldInLevel, String(v)); }catch{} }

  function loadDeaths(){ try{ return parseInt(localStorage.getItem(STORE.deaths)||'0',10) || 0; }catch{ return 0; } }
  function saveDeaths(v){ try{ localStorage.setItem(STORE.deaths, String(v)); }catch{} }

  function loadBestNoDeathStreak(){ try{ return parseInt(localStorage.getItem(STORE.bestNoDeathStreak)||'0',10) || 0; }catch{ return 0; } }
  function saveBestNoDeathStreak(v){ try{ localStorage.setItem(STORE.bestNoDeathStreak, String(v)); }catch{} }

  function loadLongestComboClimb(){ try{ return parseInt(localStorage.getItem(STORE.longestComboClimb)||'0',10) || 0; }catch{ return 0; } }
  function saveLongestComboClimb(v){ try{ localStorage.setItem(STORE.longestComboClimb, String(v)); }catch{} }

  function saveProgress({level, gold, totalTime}){ try{ localStorage.setItem(STORE.save, JSON.stringify({ level, gold, totalTime })); }catch{} }
  function clearSave(){ try{ localStorage.removeItem(STORE.save); }catch{} }
  function loadSave(){ try{ const s = localStorage.getItem(STORE.save); return s? JSON.parse(s) : null; }catch{ return null; } }

  // --- Daily gift ---
  function todayKey(){ const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function loadDaily(){ try{ return localStorage.getItem(STORE.daily)||''; }catch{ return ''; } }
  function saveDaily(v){ try{ localStorage.setItem(STORE.daily, v); }catch{} }
  function canClaimDaily(){ const last = loadDaily(); return last !== todayKey(); }
  function tryClaimDailyGift(){
    if (!canClaimDaily()) return;
    addGold(DAILY_GIFT_AMOUNT, { levelEarning:false });
    saveDaily(todayKey());
    flashStatus(`\uD83C\uDF81 Daily gift: +${DAILY_GIFT_AMOUNT} gold!`);
    SFX.coin(); refreshGiftButton(); updateStatsUI();
  }
  function refreshGiftButton(){ if (!giftBtn) return; const ok = canClaimDaily(); giftBtn.disabled = !ok; giftBtn.title = ok ? `Claim +${DAILY_GIFT_AMOUNT} gold` : 'Come back tomorrow for another gift'; }

  // ---- Kid Mode helpers ----
  function loadKidMode(){ try{ return localStorage.getItem(STORE.kid)==='true'; }catch{ return false; } }
  function saveKidMode(v){ try{ localStorage.setItem(STORE.kid, v?'true':'false'); }catch{} }
  function kidEncouragement(){
    const msgs=[
      'Nice try! You’ve got this! 💪',
      'So close! One more jump! 🌟',
      'Great effort! Try again! 🚀',
      'You’re getting higher every time! 🔝'
    ];
    return msgs[Math.floor(Math.random()*msgs.length)];
  }
  function updateKidToggleUI(){
    if (!elKidToggle) return;
    elKidToggle.setAttribute('aria-pressed', kidMode? 'true':'false');
    elKidToggle.classList.toggle('active', kidMode);
    elKidToggle.textContent = `Kid Mode: ${kidMode? 'ON':'OFF'}`;
  }

  function updateBoosterHUD(){ if (!elBooster || !elBooster.parentNode) return; elBooster.textContent = boosterJumps>0 ? `\uD83D\uDE80 Booster: ${boosterJumps} jump${boosterJumps>1?'s':''} left` : ''; }
  function flashStatus(text){ if (!elStatus) return; elStatus.textContent=text; elStatus.style.opacity='1'; elStatus.style.transition='none'; requestAnimationFrame(()=>{ elStatus.style.transition='opacity 1.6s ease 0.6s'; elStatus.style.opacity='0'; }); }
  function addGold(amt, opts){ if (amt<=0) return; gold += amt; lifetimeGold += amt; if (!opts || opts.levelEarning !== false) { goldThisLevel += amt; } updateGoldUI(); saveGold(); saveLifetimeGold(); }

  // ---- Level builder ----
  function buildConstantLevels(count){
    const levels = [];
    for (let i=1; i<=count; i++){
      const t = (i-1)/Math.max(1,(count-1)); // 0..1 progression
      const height = Math.round(1400 + t * 1000); // 1400 → 2400
      const startW = Math.round(clamp(360 - t*200, 180, 360));
      const gapMin = Math.round(clamp(100 + t*30, 100, 130));
      const gapMax = Math.round(clamp(130 + t*30, 140, 160)); // cap to 160 to stay within reach
      const widthMin = Math.round(clamp(180 - t*60, 110, 180));
      const widthMax = Math.round(clamp(220 - t*40, 150, 220));
      const moveChance = clamp(0.08 + t*0.42, 0.08, 0.5);
      const moveRange = Math.round(clamp(40 + t*50, 40, 90));

      const start = { x: (WORLD.w*0.5 - startW/2), y: 40, w: startW };
      const platforms = [];

      // Deterministic pseudo-random helper based on level & index
      const r01 = (seedA, seedB)=>{
        let x = (seedA*73856093) ^ (seedB*19349663);
        x = (x ^ (x>>>13)) * 1274126177;
        x = (x ^ (x>>>16)) >>> 0;
        return x / 4294967295;
      };

      let y = start.y;
      let gapSum = 0, nGaps = 0;
      let k = 0;
      while (y > -height + 100){
        const rrGap = gapMin + (gapMax-gapMin) * r01(i, k*5+1);
        const w = Math.round(widthMin + (widthMax-widthMin) * r01(i, k*5+2));
        const x = Math.round(clamp(24 + (WORLD.w - 48 - w) * r01(i, k*5+3), 24, WORLD.w - 24 - w));
        const moving = (r01(i, k*5+4) < moveChance);
        y -= rrGap;
        const type = moving? 'moving' : 'static';
        if (moving) platforms.push({ x, y, w, type, range: moveRange, phase: Math.PI*2 * r01(i, k*5+5) });
        else platforms.push({ x, y, w, type });
        gapSum += rrGap; nGaps++; k++;
      }

      // Booster placement: pick a static platform around 35% height (fallback to mid)
      let boosterIndex = Math.floor(platforms.length * 0.35);
      if (boosterIndex < 0) boosterIndex = 0;
      if (boosterIndex >= platforms.length) boosterIndex = Math.floor(platforms.length/2);
      let bp = platforms[boosterIndex];
      // Ensure static; if moving, scan forward then backward
      if (bp && bp.type==='moving'){
        let found = -1;
        for (let s=boosterIndex; s<platforms.length; s++){ if (platforms[s].type==='static'){ found = s; break; } }
        if (found<0){ for (let s=boosterIndex; s>=0; s--){ if (platforms[s].type==='static'){ found = s; break; } } }
        if (found>=0) bp = platforms[found];
      }

      const avgGap = nGaps? (gapSum / nGaps) : 120;
      const baseH = (JUMP_VY*JUMP_VY)/(2*GRAVITY);
      const targetH = baseH + (avgGap * 5); // +5 platforms worth
      const targetVy = Math.sqrt(Math.max(0.001, 2*GRAVITY*targetH));
      const boostVyBonus = Math.max(0, targetVy - JUMP_VY);

      const boosters = [];
      if (bp){ boosters.push({ x: Math.round(bp.x + bp.w/2), y: Math.round(bp.y - 24) }); }

      levels.push({ height, start, platforms, goalY: -height, boosters, boostVyBonus });
    }
    return levels;
  }

  // ---------- end of IIFE ----------
  console.log('[Neon Ascent] game.js v7.2 loaded OK');
})();
