(() => {
  // TDZ fix: declare audio before updateMuteButton() can run
  let audio = null;

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const WORLD = { w: 540, h: 960 };
  const GRAVITY = 2000;
  const MOVE_ACCEL = 2500;
  const MAX_SPEED_X = 360;
  const JUMP_VY = 820;
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
    { id:'default', name:'Default Neon',  price:0, rarity:'common', unlockLevel:1, body:'#303136', visor:'#2cf9ff', stripe:'#ff3df2' },
    { id:'rust',    name:'Rust Ranger',   price:500, rarity:'common', unlockLevel:1, body:'#4a3b31', visor:'#ffe66d', stripe:'#2cf9ff' },
    { id:'midnight',name:'Midnight Magenta', price:800, rarity:'rare', unlockLevel:3, body:'#262733', visor:'#ff3df2', stripe:'#7af9ff' },
    { id:'solar',   name:'Solar Flare',   price:1200, rarity:'rare', unlockLevel:5, body:'#3a2a19', visor:'#ffd36d', stripe:'#ff8a0f' },
    { id:'emerald', name:'Emerald Edge',  price:1800, rarity:'epic', unlockLevel:7, body:'#1d3a2a', visor:'#66ffcc', stripe:'#00ffaa' },
    { id:'shadow',  name:'Cyber Shadow',  price:2400, rarity:'epic', unlockLevel:9, body:'#161616', visor:'#7af9ff', stripe:'#ffe66d' }
  ];

  let level = 1; let rng = mulberry32(Date.now() % 2**31); let kidMode = loadKidMode();
  let muted; // will set after DOM refs exist

  let gold = loadGold(); let lifetimeGold = loadLifetimeGold(); let levelsCompleted = loadLevelsCompleted();
  let mostGoldInOneLevel = loadMostGoldInLevel(); let deaths = loadDeaths(); let bestNoDeathStreak = loadBestNoDeathStreak();
  let streakNoDeath = 0; let longestComboClimb = loadLongestComboClimb();
  let goldThisLevel = 0; let comboClimbThisAir = 0; let bestComboThisLevel = 0;
  let inventory = loadInventory(); if (!inventory.includes('default')) inventory.push('default');
  let equippedSkinId = loadSkin() || 'default'; let bestLevel = loadBestLevel();

  const player = { x: WORLD.w*0.5, y:0, w:44, h:56, vx:0, vy:0, onGround:false, coyoteTime:0, jumpBuffer:0 };
  const COYOTE_TIME = ()=> kidMode ? 0.12 : 0.08; const JUMP_BUFFER = ()=> kidMode ? 0.18 : 0.12;

  let gameState = 'overlay'; let countdown = 0; let camY = 0; let platforms = []; let goalY = 0; let currentLevelHeight = 0;
  const input = { left:false, right:false, jump:false, jumpConsumed:false };
  let levelTime = 0; let totalTime = 0; const levelProgressBestY = {};

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

  // Initialize theme, mute state, and apply mute to audio if any
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
  btnStart.addEventListener('click', ()=>{ if (gameState==='overlay' or gameState==='paused') { clearSave(); streakNoDeath = 0; startCountdown(3); ensureAudio(); } });
  btnContinue.addEventListener('click', ()=>{ const save = loadSave(); if (save){ if (typeof save.score === 'number' and typeof save.gold !== 'number'){ save.gold = save.score; delete save.score; } gold = typeof save.gold === 'number' ? save.gold : gold; totalTime = save.totalTime||0; updateGoldUI(); startLevel(save.level||1, false, false); startCountdown(2); ensureAudio(); } });
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
    if (accel === 0 and player.onGround) player.vx *= FRICTION_GROUND;
    player.vx = clamp(player.vx, -MAX_SPEED_X, MAX_SPEED_X);

    player.coyoteTime = Math.max(0, player.coyoteTime - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    if (input.jump) player.jumpBuffer = JUMP_BUFFER();

    if (player.jumpBuffer > 0) {
      if (player.onGround || player.coyoteTime > 0){
        player.vy = -JUMP_VY; player.onGround = false; player.coyoteTime = 0; player.jumpBuffer = 0; input.jumpConsumed = true; SFX.jump();
      }
    }

    player.vy += GRAVITY * dt;
    let nextY = player.y + player.vy * dt;
    let nextX = player.x + player.vx * dt;

    let groundedThisFrame = false;
    if (player.vy >= 0){
      for (const p of platforms){
        if (player.y + player.h <= p.y and nextY + player.h >= p.y){
          const px1 = p.x, px2 = p.x + p.w; const plx1 = nextX, plx2 = nextX + player.w;
          if (plx2 > px1 and plx1 < px2){ nextY = p.y - player.h; player.vy = 0; groundedThisFrame = true; }
        }
      }
    }

    player.y = nextY; player.x = nextX;
    if (player.x < 0){ player.x = 0; player.vx = 0; }
    if (player.x + player.w > WORLD.w){ player.x = WORLD.w - player.w; player.vx = 0; }

    const wasGrounded = player.onGround; player.onGround = groundedThisFrame;
    if (player.onGround) player.coyoteTime = COYOTE_TIME();

    if (!wasGrounded and player.onGround){
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
  function randRange(r){ return r[0] + (r[1]-r[0]) * rng(); }
  function chance(p){ return rng() < p; }
  function mulberry32(a){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t | 61); return ((t ^ t>>>14)>>>0) / 4294967296; } }
  function formatTime(sec){ const s=Math.floor(sec%60); const m=Math.floor(sec/60); const hundredths=Math.floor((sec - Math.floor(sec))*100); const pad=(n,w=2)=> n.toString().padStart(w,'0'); return `${pad(m)}:${pad(s)}.${pad(hundredths)}`; }

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

  function todayKey(){ const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function loadDaily(){ try{ return localStorage.getItem(STORE.daily)||''; }catch{ return ''; } }
  function saveDaily(v){ try{ localStorage.setItem(STORE.daily, v); }catch{} }
  function canClaimDaily(){ const last = loadDaily(); return last !== todayKey(); }
  function tryClaimDailyGift(){ if (!canClaimDaily()) return; addGold(DAILY_GIFT_AMOUNT, { levelEarning:false }); saveDaily(todayKey()); flashStatus(`🎁 Daily gift: +${DAILY_GIFT_AMOUNT} gold!`); SFX.coin(); refreshGiftButton(); updateStatsUI(); }
  function refreshGiftButton(){ const ok = canClaimDaily(); giftBtn.disabled = !ok; giftBtn.title = ok ? `Claim +${DAILY_GIFT_AMOUNT} gold` : 'Come back tomorrow for another gift'; }

  function startLevel(lvl, isRestart=false, showOverlayAtStart=false){
    level = lvl; elLevel.textContent = `Level ${level}`;
    rng = mulberry32((Date.now() + level*1337) % 2**31);

    // Generate level and a wide start platform at y=40
    const WORLD_W = WORLD.w;
    platforms = [];
    const startPlat = { x: WORLD_W*0.5 - 180, y: 40, w: 360, h: 18, type:'static', phase:0 };
    platforms.push(startPlat);

    // Place player centered ABOVE the start platform so first frame lands cleanly
    player.w = player.w; // no-op clarity
    player.h = player.h; // no-op clarity
    player.x = clamp(startPlat.x + (startPlat.w - player.w)/2, 0, WORLD_W - player.w);
    player.y = startPlat.y - player.h - 1;   // <-- key fix so we don't start intersecting
    player.vx=0; player.vy=0; player.onGround=false; player.coyoteTime=0; player.jumpBuffer=0;

    levelTime = 0; elLevelTime.textContent = formatTime(0);
    goldThisLevel = 0; comboClimbThisAir = 0; bestComboThisLevel = 0;

    const height = clamp(1200 + (level-1)*220, 1200, 3600);
    currentLevelHeight = height; goalY = -height;

    let gapMin = clamp(90 + (level-1)*6, 90, 160);
    let gapMax = clamp(130 + (level-1)*10, 140, 220);
    let widthMin = clamp(120 - (level-1)*5, 70, 120);
    let widthMax = clamp(200 - (level-1)*6, 90, 200);
    let moveChance = clamp(0.08 + (level-1)*0.04, 0.08, 0.6);
    let moveRangeMin = 30, moveRangeMax = 80;
    if (kidMode){
      gapMin=Math.max(60, gapMin-25); gapMax=Math.max(90, gapMax-35);
      widthMin=Math.min(170, widthMin+40); widthMax=Math.min(260, widthMax+40);
      moveChance=Math.max(0.04, moveChance*0.5); moveRangeMin=18; moveRangeMax=44;
    }

    // Helper RNG shortcuts
    function rr(range){ return range[0] + (range[1]-range[0]) * rng(); }
    function ch(p){ return rng() < p; }

    // Build ascending platforms up to goalY
    let lastY = startPlat.y - rr([40,60]);
    while (lastY > goalY + 80){
      const w = rr([widthMin, widthMax]);
      const x = clamp(rr([24, WORLD_W - 24 - w]), 24, WORLD_W - 24 - w);
      const gap = rr([gapMin, gapMax]);
      const y = lastY - gap;
      if (ch(moveChance)){
        const range = rr([moveRangeMin, moveRangeMax]);
        platforms.push({ x, y, w, h:16, type:'moving', vx:0, range, _origX:x, phase: rr([0, Math.PI*2]) });
      } else {
        platforms.push({ x, y, w, h:16, type:'static', phase:0 });
      }
      lastY = y;
    }

    // PB label and UI
    const key = STORE.pb(level); const prev = parseFloat(localStorage.getItem(key));
    elPB.textContent = `PB: ${isFinite(prev) ? formatTime(prev) : '--:--.--'}`;
    updateGoldUI(); refreshGiftButton();

    // Camera and progress baseline
    camY = -WORLD.h*0.1; // slight look-ahead
    levelProgressBestY[level] = player.y;

    if (showOverlayAtStart){ gameState='overlay'; btnStart.textContent='Start'; showOverlay(`Level ${level}`, 'Tap Start to play', true, isRestart); }
    else { setRunning(); }
  }

  function flashStatus(text){
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
  function startPreviewAnim(){ function step(t){ if (!shopOv.classList.contains('show')) return; document.querySelectorAll('.skin-preview').forEach((cnv)=>{ const sid = cnv.dataset.skin; const skin = SKINS.find(s=>s.id===sid) or SKINS[0]; drawSkinPreview(cnv, skin, t); }); requestAnimationFrame(step); } requestAnimationFrame(step); }

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
  const SFX = { jump(){ if (muted || !audio) return; sweep(380, 620, 0.12, 'square', 0.22); }, land(){ if (muted || !audio) return; sweep(160, 90, 0.08, 'sawtooth', 0.15); }, goal(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(660, 0.08, 'triangle', 0.22, t); tone(880, 0.10, 'triangle', 0.22, t+0.1); tone(990, 0.12, 'triangle', 0.22, t+0.22); }, coin(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(1200, 0.06, 'square', 0.25, t); tone(1600, 0.06, 'square', 0.2, t+0.06); }, equip(){ if (muted || !audio) return; const t=audio.ctx.currentTime; tone(900, 0.08, 'triangle', 0.2, t); } };

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
})();
