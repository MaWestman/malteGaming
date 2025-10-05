(() => {
  console.log('[Neon Ascent] game.js start');
  // TDZ fix: declare audio before updateMuteButton() can run
  let audio = null;

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const WORLD = { w: 540, h: 960 };

  // Physics — tighter feel
  const GRAVITY = 2100;      // was 2000
  const MOVE_ACCEL = 2500;
  const MAX_SPEED_X = 360;
  const JUMP_VY = 880;       // was 820 → ~184px apex with GRAVITY 2100
  const FRICTION_GROUND = 0.85;

  const CLIMB_GOLD_PER_PX = 0.5;
  const LANDING_GOLD = 10;
  const LEVEL_BASE_BONUS = 250;
  const LEVEL_PER_LEVEL_BONUS = 50;
  const PAR_SPEED = 120;
  const TIME_BONUS_RATE = 20;
  const DAILY_GIFT_AMOUNT = 150;

  const STORE = { pb: (lvl)=> `neonAscent_pb_level_${lvl}`, kid: 'neonAscent_kidMode', theme: 'neonAscent_theme', muted: 'neonAscent_muted', save: 'neonAscent_save', gold: 'neonAscent_gold', inv: 'neonAscent_inventory', skin: 'neonAscent_skin', best: 'neonAscent_bestLevel', lifetime: 'neonAscent_lifetimeGold', daily: 'neonAscent_dailyGift_lastClaim', levelsCompleted: 'neonAscent_levelsCompleted', mostGoldInLevel: 'neonAscent_mostGoldInLevel', deaths: 'neonAscent_deaths', bestNoDeathStreak: 'neonAscent_bestNoDeathStreak', longestComboClimb: 'neonAscent_longestComboClimb' };

  const SKINS = [
    { id:'default', name:'Default Neon',  price:0,    rarity:'common', unlockLevel:1, body:'#303136', visor:'#2cf9ff', stripe:'#ff3df2' },
    { id:'rust',    name:'Rust Ranger',   price:500,  rarity:'common', unlockLevel:1, body:'#4a3b31', visor:'#ffe66d', stripe:'#2cf9ff' },
    { id:'midnight',name:'Midnight Magenta', price:800, rarity:'rare',   unlockLevel:3, body:'#262733', visor:'#ff3df2', stripe:'#7af9ff' },
    { id:'solar',   name:'Solar Flare',   price:1200, rarity:'rare',   unlockLevel:5, body:'#3a2a19', visor:'#ffd36d', stripe:'#ff8a0f' },
    { id:'emerald', name:'Emerald Edge',  price:1800, rarity:'epic',   unlockLevel:7, body:'#1d3a2a', visor:'#66ffcc', stripe:'#00ffaa' },
    { id:'shadow',  name:'Cyber Shadow',  price:2400, rarity:'epic',   unlockLevel:9, body:'#161616', visor:'#7af9ff', stripe:'#ffe66d' }
  ];

  // --- Constant, deterministic 100 levels with difficulty scaling ---
  const LEVELS = buildConstantLevels(100);

  let level = 1;
  let kidMode = loadKidMode();
  let muted;

  let gold = loadGold(); let lifetimeGold = loadLifetimeGold(); let levelsCompleted = loadLevelsCompleted();
  let mostGoldInOneLevel = loadMostGoldInLevel(); let deaths = loadDeaths(); let bestNoDeathStreak = loadBestNoDeathStreak();
  let streakNoDeath = 0; let longestComboClimb = loadLongestComboClimb();
  let goldThisLevel = 0; let comboClimbThisAir = 0; let bestComboThisLevel = 0;
  let inventory = loadInventory(); if (!inventory.includes('default')) inventory.push('default');
  let equippedSkinId = loadSkin() || 'default'; let bestLevel = loadBestLevel();

  const player = { x: WORLD.w*0.5, y:0, w:44, h:56, vx:0, vy:0, onGround:false, coyoteTime:0, jumpBuffer:0 };
  const COYOTE_TIME = ()=> kidMode ? 0.14 : 0.10;   // was 0.12/0.08
  const JUMP_BUFFER = ()=> kidMode ? 0.20 : 0.16;   // was 0.18/0.12

  let gameState = 'overlay'; let countdown = 0; let camY = 0; let platforms = []; let goalY = 0; let currentLevelHeight = 0;
  const input = { left:false, right:false, jump:false, jumpConsumed:false };
  let levelTime = 0; let totalTime = 0; const levelProgressBestY = {};

  // Booster state
  let boosters = [];                // pickups in current level
  let boosterJumps = 0;            // remaining boosted jumps across levels
  let boosterVyBonus = 0;          // extra vy to apply on boosted jump

  // --- DOM refs ---
  const elLevel = document.getElementById('level');
  const elGoldHUD = document.getElementById('gold-hud'); const elGoldTop = document.getElementById('gold-top'); const elGoldShop = document.getElementById('gold-shop');
  const elLevelTime = document.getElementById('level-time'); const elTotalTime = document.getElementById('total-time'); const elPB = document.getElementById('pb');
  const elStatus = document.getElementById('status'); const elKidToggle = document.getElementById('kid-toggle'); const elPause = document.getElementById('pause-btn');
  const themeSelect = document.getElementById('theme-select'); const muteBtn = document.getElementById('mute-btn'); const shopBtn = document.getElementById('shop-btn');
  const shopOv = document.getElementById('shop-overlay'); const shopClose = document.getElementById('shop-close'); const skinGrid = document.getElementById('skin-grid');
  const ov = document.getElementById('overlay'); const ovTitle = document.getElementById('ov-title'); const ovSub = document.getElementById('ov-sub'); const ovCount = document.getElementById('ov-count');
  const btnStart = document.getElementById('btn-start'); const btnContinue = document.getElementById('btn-continue'); const btnRestart = document.getElementById('btn-restart');
  const statsBtn = document.getElementById('stats-btn'); const statsOv = document.getElementById('stats-overlay'); const statsClose = document.getElementById('stats-close');
  const statBest = document.getElementById('stat-best'); const statGold = document.getElementById('stat-gold'); const statLevels = document.getElementById('stat-levels');
  const statMost = document.getElementById('stat-most'); const statSkins = document.getElementById('stat-skins'); const statBal = document.getElementById('stat-balance');
  const statDeaths = document.getElementById('stat-deaths'); const statStreak = document.getElementById('stat-streak'); const statCombo = document.getElementById('stat-combo');
  const pbList = document.getElementById('pb-list'); const giftBtn = document.getElementById('gift-btn');
  const summaryOv = document.getElementById('summary-overlay'); const sumTitle = document.getElementById('sum-title'); const sumSub = document.getElementById('sum-sub');
  const sumTime = document.getElementById('sum-time'); const sumPB = document.getElementById('sum-pb'); const sumGold = document.getElementById('sum-gold');
  const sumTimeBonus = document.getElementById('sum-timebonus'); const sumLevelBonus = document.getElementById('sum-levelbonus'); const sumCombo = document.getElementById('sum-combo');
  const sumStreak = document.getElementById('sum-streak'); const sumBestStreak = document.getElementById('sum-beststreak'); const summaryNext = document.getElementById('summary-next');
  const summaryRetry = document.getElementById('summary-retry'); const summaryClose = document.getElementById('summary-close');

  // Booster HUD
  const elHUD = document.getElementById('hud');
  const elBooster = document.createElement('div');
  elBooster.id = 'booster-hud';
  elBooster.style.marginTop = '6px';
  elBooster.style.fontWeight = '700';
  elBooster.style.opacity = '0.95';
  elBooster.textContent = '';
  if (elHUD) elHUD.appendChild(elBooster);

  // Initialize theme & mute state
  applyTheme(loadTheme());
  muted = loadMuted();
  updateMuteButton();

  function resize(){ const vw = window.innerWidth, vh = window.innerHeight; canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px'; canvas.width = Math.max(1, Math.floor(vw * DPR)); canvas.height = Math.max(1, Math.floor(vh * DPR)); }
  window.addEventListener('resize', resize, {passive:true}); resize();

  const keymap = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump' };
  window.addEventListener('keydown', (e)=>{ const k = keymap[e.code]; if (!k) return;
    if (e.code === 'Escape'){ if (gameState==='running') pauseGame(); else if (gameState==='paused') resumeWithCountdown(2); e.preventDefault(); return; }
    e.preventDefault(); input[k] = true; if (k==='jump') input.jumpConsumed=false; ensureAudio();
  }, {passive:false});
  window.addEventListener('keyup', (e)=>{ const k = keymap[e.code]; if (!k) return; e.preventDefault(); input[k] = false; }, {passive:false});

  setupTouchControls();
  elKidToggle.addEventListener('click', ()=>{ kidMode=!kidMode; saveKidMode(kidMode); updateKidToggleUI(); flashStatus(kidMode? 'Kid Mode ON: friendlier jumps':'Kid Mode OFF'); startLevel(level, true, true); });
  updateKidToggleUI();
  elPause.addEventListener('click', ()=>{ if (gameState==='running') pauseGame(); else if (gameState==='paused') resumeWithCountdown(2); });
  btnStart.addEventListener('click', ()=>{ if (gameState==='overlay' || gameState==='paused') { clearSave(); streakNoDeath = 0; startCountdown(3); ensureAudio(); } });
  btnContinue.addEventListener('click', ()=>{ const save = loadSave(); if (save){ if (typeof save.score === 'number' && typeof save.gold !== 'number'){ save.gold = save.score; delete save.score; } gold = typeof save.gold === 'number' ? save.gold : gold; totalTime = save.totalTime||0; updateGoldUI(); startLevel(save.level||1, false, false); startCountdown(2); ensureAudio(); } });
  btnRestart.addEventListener('click', ()=>{ startLevel(level, true, true); });
  themeSelect.addEventListener('change', ()=>{ applyTheme(themeSelect.value); saveTheme(themeSelect.value); });
  themeSelect.value = loadTheme();
  muteBtn.addEventListener('click', ()=>{ muted = !muted; saveMuted(muted); updateMuteButton(); });
  shopBtn.addEventListener('click', ()=>{ openShop(); }); shopClose.addEventListener('click', ()=>{ closeShop(); });
  statsBtn.addEventListener('click', ()=>{ openStats(); }); statsClose.addEventListener('click', ()=>{ closeStats(); });
  giftBtn.addEventListener('click', ()=>{ tryClaimDailyGift(); }); refreshGiftButton();
  summaryNext.addEventListener('click', ()=>{ closeSummary(); startLevel(level + 1, false, true); });
  summaryRetry.addEventListener('click', ()=>{ closeSummary(); startLevel(level, true, true); });
  summaryClose.addEventListener('click', ()=>{ closeSummary(); startLevel(level + 1, false, true); });

  startLevel(1, false, true); updateGoldUI();

  let last = performance.now(); function loop(now){ const dt = Math.min(0.032, (now - last)/1000); last = now;
    if (gameState==='countdown'){ countdown -= dt; updateOverlayCountdown(); if (countdown <= 0) setRunning(); }
    else if (gameState==='running'){ update(dt); }
    draw(); requestAnimationFrame(loop);
  } requestAnimationFrame(loop);

  function update(dt){
    levelTime += dt; elLevelTime.textContent = formatTime(levelTime); elTotalTime.textContent = formatTime(totalTime);

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

    const wasGrounded = player.onGround; player.onGround = groundedThisFrame;
    if (player.onGround) player.coyoteTime = COYOTE_TIME();

    if (!wasGrounded && player.onGround){
      if (comboClimbThisAir > longestComboClimb){ longestComboClimb = comboClimbThisAir; saveLongestComboClimb(longestComboClimb); }
      if (comboClimbThisAir > bestComboThisLevel){ bestComboThisLevel = comboClimbThisAir; }
      comboClimbThisAir = 0; addGold(LANDING_GOLD); SFX.land();
    }

    for (const p of platforms){
      if (p.type==='moving'){
        p.phase += dt; const offset = Math.sin(p.phase) * (p.range || 0);
        p.x = p._origX + offset; if (p.x < 0) p.x = 0; if (p.x + p.w > WORLD.w) p.x = WORLD.w - p.w;
      }
    }

    const targetCamY = Math.min(camY, player.y - WORLD.h * 0.55); camY = lerp(camY, targetCamY, 0.08);
    const belowCut = camY + WORLD.h + 240; platforms = platforms.filter(p => p.y < belowCut);

    const bestY = levelProgressBestY[level] ?? player.y;
    if (player.y < bestY){
      const delta = bestY - player.y; const climbGold = Math.floor(delta * CLIMB_GOLD_PER_PX);
      if (climbGold>0){ addGold(climbGold); levelProgressBestY[level] = player.y; comboClimbThisAir += climbGold; }
    }

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
      elPB.textContent = `PB: ${formatTime(parseFloat(localStorage.getItem(key)) || levelTime)}`;

      if (level > bestLevel){ bestLevel = level; saveBestLevel(bestLevel); }
      levelsCompleted++; saveLevelsCompleted(levelsCompleted);
      if (goldThisLevel > mostGoldInOneLevel){ mostGoldInOneLevel = goldThisLevel; saveMostGoldInLevel(mostGoldInOneLevel); }

      streakNoDeath++; if (streakNoDeath > bestNoDeathStreak){ bestNoDeathStreak = streakNoDeath; saveBestNoDeathStreak(bestNoDeathStreak); }
      SFX.goal();
      flashStatus(`Level ${level} complete! +${gained}g | ${formatTime(levelTime)}` + (pbImproved?' (PB!)':''));
      saveProgress({ level: level+1, gold, totalTime });
      openSummary({ level, time: levelTime, isPB: pbImproved, gold: goldThisLevel, timeBonus, levelBonus, combo: bestComboThisLevel, streak: streakNoDeath, bestStreak: bestNoDeathStreak });
      return;
    }

    const fallLimit = camY + WORLD.h + 240;
    if (player.y > fallLimit){
      deaths++; saveDeaths(deaths); streakNoDeath = 0; flashStatus(kidMode? `${kidEncouragement()} Restarting…`:'Fell! Restarting level…');
      comboClimbThisAir = 0; bestComboThisLevel = 0; startLevel(level, true, true); return;
    }
  }

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
    ctx.save();
    ctx.lineWidth=3; ctx.setLineDash([10,8]);
    neonStroke(ctx, ()=>{ ctx.beginPath(); ctx.moveTo(24, goalY); ctx.lineTo(WORLD.w-24, goalY); ctx.stroke(); }, getAccentColor(), 18);
    ctx.restore();

    for (const p of platforms) drawPlatform(ctx, p);
    drawPlayer(ctx, player);

    // Draw boosters
    for (const b of boosters){ if (b.taken) continue; drawBooster(ctx, b); }

    ctx.restore();
  }

  function drawPlatform(ctx, p){
    const y=p.y, x=p.x, w=p.w, h=p.h;
    ctx.fillStyle='#242325'; ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1.2;
    roundRect(ctx,x,y,w,h,6); ctx.fill(); ctx.stroke();
    neonStroke(ctx, ()=>{ ctx.beginPath(); ctx.moveTo(x+3, y+2.5); ctx.lineTo(x+w-3, y+2.5); ctx.stroke(); }, p.type==='moving'? getAccent2Color() : getAccentColor(), p.type==='moving'?22:16);
    ctx.fillStyle='rgba(255,255,255,0.06)';
    for (let i=0;i<Math.max(2, Math.floor(w/100));i++){
      const bx = x + 12 + i*(w-24)/Math.max(1,(Math.floor(w/100)));
      ctx.beginPath(); ctx.arc(bx, y + h - 8, 2, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawBooster(ctx, b){
    const x = b.x, y = b.y;
    // Neon backpack/booster icon (rounded square + chevron)
    neonFill(ctx, ()=>{ roundRect(ctx, x-10, y-10, 20, 20, 5); ctx.fillStyle = getAccent2Color(); ctx.fill(); }, getAccent2Color(), 16);
    neonStroke(ctx, ()=>{ ctx.beginPath(); ctx.moveTo(x-6, y+4); ctx.lineTo(x, y-4); ctx.lineTo(x+6, y+4); ctx.strokeStyle = getAccentColor(); ctx.lineWidth=2; ctx.stroke(); }, getAccentColor(), 14);
  }

  function currentSkin(){ return SKINS.find(s=>s.id===equippedSkinId) || SKINS[0]; }
  function drawPlayer(ctx, pl){
    const skin = currentSkin(); const x=pl.x, y=pl.y, w=pl.w, h=pl.h;
    ctx.fillStyle=skin.body; roundRect(ctx,x,y,w,h,10); ctx.fill();
    neonFill(ctx, ()=>{ roundRect(ctx, x+8, y+10, w-16, 16, 8); ctx.fillStyle=skin.visor; ctx.fill(); }, skin.visor, 18);
    neonFill(ctx, ()=>{ roundRect(ctx, x + w*0.15, y + h - 12, w*0.7, 6, 3); ctx.fillStyle=skin.stripe; ctx.fill(); }, skin.stripe, 10);
  }

  function drawNeonPipes(ctx){
    ctx.save(); ctx.globalAlpha=.18;
    for (let i=0;i<6;i++){
      const x=(i+1)*WORLD.w/7; const color = i%3===0? getAccentColor(): (i%3===1? getAccent2Color(): '#ffe66d');
      neonStroke(ctx, ()=>{ ctx.beginPath(); ctx.moveTo(x, camY - 200); ctx.lineTo(x, camY + WORLD.h + 300); ctx.lineWidth=2; ctx.strokeStyle=color; ctx.stroke(); }, color, 22);
    }
    ctx.restore();
  }

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

  function showOverlay(title, sub, showStart=true, showRestart=false){ ovTitle.textContent = title||'Neon Ascent'; ovSub.textContent=sub||''; ovCount.textContent=''; btnStart.style.display = showStart? '':'none'; btnRestart.style.display = showRestart? '':'none'; const save = loadSave(); btnContinue.style.display = save? '' : 'none'; ov.classList.add('show'); }
  function hideOverlay(){ ov.classList.remove('show'); ovCount.textContent=''; }
  function startCountdown(seconds=3){ countdown = seconds; gameState='countdown'; btnStart.style.display='none'; btnRestart.style.display='none'; btnContinue.style.display='none'; updateOverlayCountdown(); }
  function updateOverlayCountdown(){ const t=Math.ceil(Math.max(0, countdown)); if (t>0){ ovCount.textContent=String(t); ovSub.textContent='Get ready…'; } else { ovCount.textContent='GO!'; ovSub.textContent=''; } }
  function setRunning(){ gameState='running'; hideOverlay(); }
  function pauseGame(){ if (gameState!=='running') return; gameState='paused'; showOverlay('Paused','Tap Resume to continue',true,true); btnStart.textContent='Resume'; }
  function resumeWithCountdown(seconds=2){ showOverlay('Ready?','',false,true); startCountdown(seconds); }

  function openSummary({ level, time, isPB, gold, timeBonus, levelBonus, combo, streak, bestStreak }){ gameState = 'overlay';
    sumTitle.textContent = `Level ${level} Complete!`; sumSub.textContent = `Great job!`;
    sumTime.textContent = formatTime(time); sumPB.hidden = !isPB; sumGold.textContent = String(gold);
    sumTimeBonus.textContent = String(timeBonus); sumLevelBonus.textContent = String(levelBonus);
    sumCombo.textContent = String(combo); sumStreak.textContent = String(streak); sumBestStreak.textContent = `Best: ${bestStreak}`;
    summaryOv.classList.add('show');
  }
  function closeSummary(){ summaryOv.classList.remove('show'); }

  function kidEncouragement(){ const msgs=['Nice try! You’ve got this! 💪','So close! One more jump! 🌟','Great effort! Try again! 🚀','You’re getting higher every time! 🔝']; return msgs[Math.floor(Math.random()*msgs.length)]; }
  function loadKidMode(){ try{ return localStorage.getItem(STORE.kid)==='true'; }catch{ return false; } }
  function saveKidMode(v){ try{ localStorage.setItem(STORE.kid, v?'true':'false'); }catch{} }
  function updateKidToggleUI(){ elKidToggle.setAttribute('aria-pressed', kidMode? 'true':'false'); elKidToggle.classList.toggle('active', kidMode); elKidToggle.textContent = `Kid Mode: ${kidMode? 'ON':'OFF'}`; }

  function applyTheme(name){ document.body.classList.remove('theme-cyan','theme-magenta','theme-yellow'); const t = (name||'cyan'); document.body.classList.add(`theme-${t}`); themeSelect.value = t; }
  function saveTheme(name){ try{ localStorage.setItem(STORE.theme, name); }catch{} }
  function loadTheme(){ try{ return localStorage.getItem(STORE.theme) || 'cyan'; }catch{ return 'cyan'; } }

  function saveMuted(v){ try{ localStorage.setItem(STORE.muted, v?'true':'false'); }catch{} }
  function loadMuted(){ try{ return localStorage.getItem(STORE.muted)==='true'; }catch{ return false; } }
  function updateMuteButton(){ muteBtn.setAttribute('aria-pressed', muted? 'true':'false'); muteBtn.textContent = muted? '🔈' : '🔊'; if (audio && audio.master) audio.master.gain.value = muted? 0 : 0.6; }

  function loadGold(){ try{ return parseInt(localStorage.getItem(STORE.gold)||'0',10) || 0; }catch{ return 0; } }
  function saveGold(){ try{ localStorage.setItem(STORE.gold, String(gold)); }catch{} }
  function loadLifetimeGold(){ try{ return parseInt(localStorage.getItem(STORE.lifetime)||'0',10) || 0; }catch{ return 0; } }
  function saveLifetimeGold(){ try{ localStorage.setItem(STORE.lifetime, String(lifetimeGold)); }catch{} }

  function updateGoldUI(){ elGoldHUD.textContent = String(gold); elGoldTop.textContent = String(gold); elGoldShop.textContent = String(gold); if (statBal) statBal.textContent = String(gold); }
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

  function startLevel(lvl, isRestart=false, showOverlayAtStart=false){
    if (lvl > LEVELS.length){
      // All levels complete
      level = LEVELS.length; gameState='overlay';
      btnStart.style.display=''; btnStart.textContent='Restart'; btnContinue.style.display='none'; btnRestart.style.display='none';
      showOverlay('All 100 levels complete!','Awesome! Tap Restart to play from Level 1.', true, false);
      btnStart.onclick = ()=>{ clearSave(); level=1; startLevel(1, false, true); };
      return;
    }

    level = lvl; if (elLevel) elLevel.textContent = `Level ${level}`;

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

    if (showOverlayAtStart){ gameState='overlay'; btnStart.textContent='Start'; showOverlay(`Level ${level}`, 'Tap Start to play', true, isRestart); }
    else { setRunning(); }
  }

  function updateBoosterHUD(){
    if (!elBooster || !elBooster.parentNode) return;
    elBooster.textContent = boosterJumps>0 ? `🚀 Booster: ${boosterJumps} jump${boosterJumps>1?'s':''} left` : '';
  }

  function flashStatus(text){
    if (!elStatus) return;
    elStatus.textContent=text; elStatus.style.opacity='1'; elStatus.style.transition='none';
    requestAnimationFrame(()=>{ elStatus.style.transition='opacity 1.6s ease 0.6s'; elStatus.style.opacity='0'; });
  }

  function addGold(amt, opts){ if (amt<=0) return; gold += amt; lifetimeGold += amt; if (!opts || opts.levelEarning !== false) { goldThisLevel += amt; } updateGoldUI(); saveGold(); saveLifetimeGold(); }

  function openShop(){ buildShop(); updateGoldUI(); shopOv.classList.add('show'); startPreviewAnim(); }
  function closeShop(){ shopOv.classList.remove('show'); }

  function buildShop(){
    skinGrid.innerHTML = '';
    SKINS.forEach(skin=>{
      const card = document.createElement('div'); card.className='skin-card'; card.dataset.skin=skin.id; card.classList.add(`rarity-${skin.rarity}`);
      const badge = document.createElement('div'); badge.className='skin-badge'; badge.textContent = skin.rarity.toUpperCase();
      const name = document.createElement('div'); name.className='skin-name'; name.textContent = skin.name;
      const price = document.createElement('div'); price.className='skin-price'; price.textContent = `🪙 ${skin.price}`;
      const lock = document.createElement('div'); lock.className='skin-lock'; lock.style.display='none';
      const prev = document.createElement('canvas'); prev.className='skin-preview'; prev.width = 260; prev.height = 120;
      const acts = document.createElement('div'); acts.className='skin-actions';
      const btnBuy = document.createElement('button'); btnBuy.className='btn'; btnBuy.textContent = `Buy`;
      const btnEquip = document.createElement('button'); btnEquip.className='btn'; btnEquip.textContent = `Equip`;
      acts.appendChild(btnBuy); acts.appendChild(btnEquip);
      card.appendChild(badge); card.appendChild(name); card.appendChild(price); card.appendChild(lock); card.appendChild(prev); card.appendChild(acts);
      skinGrid.appendChild(card);

      prev.dataset.phase = String(Math.random()*Math.PI*2); prev.dataset.skin = skin.id; drawSkinPreview(prev, skin, 0);

      const owned = inventory.includes(skin.id); const equipped = equippedSkinId === skin.id; const gated = (bestLevel < (skin.unlockLevel||1));
      if (gated){ lock.style.display='block'; lock.textContent = `Reach Level ${skin.unlockLevel} to unlock purchase`; }
      btnBuy.style.display = owned ? 'none' : ''; btnEquip.style.display = owned ? '' : 'none'; btnEquip.disabled = !owned || equipped;
      if (!owned && (gold < skin.price || gated)){ btnBuy.classList.add('disabled'); }
      btnBuy.addEventListener('click', ()=>{
        if (gated) return;
        if (gold >= skin.price){
          gold -= skin.price; saveGold(); updateGoldUI(); inventory.push(skin.id); saveInventory();
          btnBuy.style.display='none'; btnEquip.style.display=''; btnEquip.disabled=false; SFX.coin(); updateStatsUI();
        }
      });
      btnEquip.addEventListener('click', ()=>{
        if (!inventory.includes(skin.id)) return;
        equippedSkinId = skin.id; saveSkin(); SFX.equip();
        [...document.querySelectorAll('.skin-card')].forEach(c=>{
          const sid = c.dataset.skin; const eqBtn = c.querySelector('.skin-actions .btn:last-child');
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
    neonFill(c2, ()=>{ roundRect(c2, px+8, py+10, w-16, 16, 8); c2.fillStyle=skin.visor; c2.fill(); }, skin.visor, 10);
    neonFill(c2, ()=>{ roundRect(c2, px + w*0.15, py + h - 12, w*0.7, 6, 3); c2.fillStyle=skin.stripe; c2.fill(); }, skin.stripe, 8);
  }
  function startPreviewAnim(){ function step(t){ if (!shopOv.classList.contains('show')) return; document.querySelectorAll('.skin-preview').forEach((cnv)=>{ const sid = cnv.dataset.skin; const skin = SKINS.find(s=>s.id===sid) || SKINS[0]; drawSkinPreview(cnv, skin, t); }); requestAnimationFrame(step); } requestAnimationFrame(step); }

  function openStats(){ updateStatsUI(); statsOv.classList.add('show'); }
  function closeStats(){ statsOv.classList.remove('show'); }
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
        const li = document.createElement('li'); const lvl = document.createElement('span'); lvl.className='lvl'; lvl.textContent = `L${i}`;
        const tm = document.createElement('span'); tm.className='time'; tm.textContent = isFinite(v) ? formatTime(v) : '—';
        li.appendChild(lvl); li.appendChild(tm); pbList.appendChild(li);
      }
    }
  }

  function ensureAudio(){ if (audio) return; try{ const ctx = new (window.AudioContext || window.webkitAudioContext)(); const master = ctx.createGain(); master.gain.value = muted? 0 : 0.6; master.connect(ctx.destination); audio = { ctx, master }; }catch{} }
  function sweep(f1,f2,dur,type,vol){ if (!audio) return; const { ctx, master }=audio; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f1, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime+dur); g.gain.value = vol; o.connect(g); g.connect(master); o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); o.stop(ctx.currentTime + dur + 0.02); }
  function tone(freq, time, type, vol, when){ if (!audio) return; const { ctx, master }=audio; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; g.gain.value=vol; o.frequency.setValueAtTime(freq, when); o.connect(g); g.connect(master); o.start(when); g.gain.exponentialRampToValueAtTime(0.001, when + time); o.stop(when + time + 0.02); }
  const SFX = { jump(){ if (muted || !audio) return; sweep(380, 620, 0.12, 'square', 0.22); }, land(){ if (muted || !audio) return; sweep(160, 90, 0.08, 'sawtooth', 0.15); }, goal(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(660, 0.08, 'triangle', 0.22, t); tone(880, 0.10, 'triangle', 0.22, t+0.1); tone(990, 0.12, 'triangle', 0.22, t+0.22); }, coin(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(1200, 0.06, 'square', 0.25, t); tone(1600, 0.06, 'square', 0.2, t+0.06); }, equip(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(900, 0.08, 'triangle', 0.2, t); }, booster(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(1000, 0.06, 'square', 0.22, t); tone(1400, 0.06, 'square', 0.22, t+0.06); tone(1800, 0.08, 'square', 0.22, t+0.12); } };

  function setupTouchControls(){
    const left = document.getElementById('btn-left'); const right = document.getElementById('btn-right'); const jump = document.getElementById('btn-jump');
    const bind = (el, onDown, onUp)=>{
      ['touchstart','mousedown'].forEach(evt=> el.addEventListener(evt, e=>{ e.preventDefault(); onDown(); }, {passive:false}));
      ['touchend','touchcancel','mouseup','mouseleave'].forEach(evt=> el.addEventListener(evt, e=>{ e.preventDefault(); onUp(); }, {passive:false}));
    };
    bind(left, ()=>{ input.left=true; }, ()=>{ input.left=false; });
    bind(right, ()=>{ input.right=true; }, ()=>{ input.right=false; });
    bind(jump, ()=>{ input.jump=true; input.jumpConsumed=false; ensureAudio(); }, ()=>{ input.jump=false; });
  }

  // ---- Level builder (deterministic, no randomness across runs) ----
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
      if (boosterIndex < 0) boosterIndex = 0; if (boosterIndex >= platforms.length) boosterIndex = Math.floor(platforms.length/2);
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

  console.log('[Neon Ascent] game.js loaded OK');
})();
