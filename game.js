
(() => {
  'use strict';
  const W = 800, H = 450;

  // Storage keys
  const K = { EQUIPPED:'equipped', HISCORE:'hiscore', WALLET:'wallet' };
  const loadEquipped = () => { try { return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}'); } catch { return {}; } };
  const loadWallet   = () => Number(localStorage.getItem(K.WALLET)||0);
  const saveWallet   = (v) => localStorage.setItem(K.WALLET, String(v));

  // ---------------- Visual catalogs: Themes + Backgrounds ----------------
  const THEMES = {
    'theme-default': { platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' },
    'theme-candy':   { platform:'#f48fb1', bg1:'#2a0c1c', bg2:'#401729', para:'#210914' },
    'theme-neon':    { platform:'#00f5d4', bg1:'#05121a', bg2:'#082232', para:'#04121f' },
    'theme-aurora':  { platform:'#7de07d', bg1:'#06141f', bg2:'#0a2840', para:'#08172a' },
  };
  const BACKGROUNDS = {
    'bg-default': { bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' },
    'bg-forest':  { bg1:'#0b1f14', bg2:'#143d28', para:'#0b1c15' },
    'bg-sunset':  { bg1:'#24122b', bg2:'#5b2542', para:'#2a1430' },
    'bg-aurora':  { bg1:'#0a0e2a', bg2:'#10385a', para:'#0a1738' },
  };
  function getVisuals(){
    const eq = loadEquipped() || {};
    const theme = THEMES[eq.theme || 'theme-default'] || THEMES['theme-default'];
    const bg    = BACKGROUNDS[eq.background || 'bg-default'] || null;
    return {
      platform: theme.platform,
      bg1: bg ? bg.bg1 : theme.bg1,
      bg2: bg ? bg.bg2 : theme.bg2,
      para: bg ? bg.para : theme.para,
      enemyTint: theme.platform,
    };
  }

  // Skin accent for cosmetic particles
  function skinAccent(id){
    const map = { 'skin-default':'#7cd1f9','skin-forest':'#7de07d','skin-sunset':'#ff8e72','skin-neon':'#00f5d4','skin-royal':'#ffd166',
      'skin-bubblegum':'#ff7ab6','skin-lime':'#78ff6b','skin-camo':'#6da86b','skin-tiger':'#ff9e2f','skin-zebra':'#ffffff',
      'skin-vapor':'#00f5d4','skin-ember':'#ff5a3c','skin-icy':'#9ad7ff','skin-galaxy':'#a78bfa','skin-glitch':'#ff00aa','skin-holo':'#b3ffe6',
      'flag-se':'#ffcc00','flag-no':'#00205b','flag-dk':'#c60c30','flag-fi':'#003580','flag-is':'#dc1e35' };
    return map[id] || '#7cd1f9';
  }

  // FX intensity by rarity (affects trails/particles)
  function fxIntensityForSkin(id){
    const legendary=['skin-royal','skin-galaxy','skin-glitch','skin-holo'];
    const epic=['skin-neon','skin-vapor','skin-ember','skin-icy','flag-no','flag-is'];
    const rare=['skin-camo','skin-tiger','skin-zebra','flag-se','flag-dk','flag-fi'];
    const common=['skin-default','skin-bubblegum','skin-lime'];
    if(legendary.includes(id)) return 1.6;
    if(epic.includes(id)) return 1.3;
    if(rare.includes(id)) return 1.1;
    return 0.9; // common
  }

  // Player sprite settings
  const PLAYER_SPRITE = { FW:48, FH:56, ANIMS:{ idle:{row:0,frames:4,fps:4}, run:{row:1,frames:6,fps:10}, jump:{row:2,frames:2,fps:6} } };
  const eqAtLoad = loadEquipped();
  const ACCENT = skinAccent(eqAtLoad && eqAtLoad.skin);
  const FXI = fxIntensityForSkin(eqAtLoad && eqAtLoad.skin);
  let skinImg=null, skinReady=false; if(eqAtLoad && eqAtLoad.skin){ const img=new Image(); img.onload=()=>{ skinImg=img; skinReady=true; }; img.onerror=()=>{ skinImg=null; skinReady=false; }; img.src=`assets/images/sprites/${eqAtLoad.skin}.png`; }

  // Enemy sprite sheets
  const ENEMY = {
    slime: { FW:48, FH:40, frames:6, fps:8, img: new Image() },
    bat:   { FW:52, FH:34, frames:6, fps:10, img: new Image() },
    roller:{ FW:40, FH:40, frames:8, fps:12, img: new Image() }
  };
  ENEMY.slime.img.src = 'assets/images/sprites/enemy-slime.png';
  ENEMY.bat.img.src   = 'assets/images/sprites/enemy-bat.png';
  ENEMY.roller.img.src= 'assets/images/sprites/enemy-roller.png';

  // Physics
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000; const ALLOW_DOUBLE=true;

  // World gen base
  let P_W_MIN=90, P_W_MAX=180, P_GAP_Y_MIN=70, P_GAP_Y_MAX=130, P_MARGIN=30; const COIN=18;

  // Canvas
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scaleCanvas(){ const dpr=Math.max(1,Math.floor(window.devicePixelRatio||1)); canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  scaleCanvas(); window.addEventListener('resize', scaleCanvas, {passive:true});

  // UI
  const btnStart=document.getElementById('btnStart'), btnPause=document.getElementById('btnPause'), btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump'), btnLeft=document.getElementById('btnLeft'), btnRight=document.getElementById('btnRight');
  const muteToggle=document.getElementById('mute'); const scoreEl=document.getElementById('score'), hiscoreEl=document.getElementById('hiscore'), levelEl=document.getElementById('level');

  // Audio
  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav') };
  Object.values(sfx).forEach(a=>{ a.preload='auto'; a.volume=.25; }); let audioUnlocked=false; function unlock(){ if(audioUnlocked) return; try{ sfx.jump.muted=true; sfx.jump.play().then(()=>{ sfx.jump.pause(); sfx.jump.currentTime=0; sfx.jump.muted=false; audioUnlocked=true; }).catch(()=>{});}catch{} }
  function play(name){ if(muteToggle && muteToggle.checked) return; const a=sfx[name]; if(!a) return; try{ a.currentTime=0; a.play(); }catch{} }

  // Input
  let moveLeft=false, moveRight=false, jumpQ=false; function queueJump(){ jumpQ=true; unlock(); }
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); queueJump(); } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  window.addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', queueJump);
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  // State
  let state='menu', last=performance.now(); let score=0, hiscore=Number(localStorage.getItem(K.HISCORE)||0); if(hiscoreEl) hiscoreEl.textContent=String(hiscore);
  let cameraY=0, spawnY=H, bestY=0, playerStartY=300; let runPoints=0, pointsEarned=0;
  let level=1; const MAX_LEVEL=100; const LEVEL_HEIGHT=250; // every 250 height → +1 level, cap 100

  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:ALLOW_DOUBLE?2:1, facing:1, anim:'idle', animTime:0,
    squashX:1, squashY:1, trailT:0 };
  const platforms=[], coins=[], spikes=[], enemies=[], parts=[];

  function emit(color,x,y,vx,vy,life=0.35,size=3){ parts.push({x,y,vx,vy,life,color,size}); }
  function burst(x,y,color,count=10,spd=220){ const mult=FXI; for(let i=0;i<Math.round(count*mult);i++){ const a=Math.random()*Math.PI*2, s=spd*(0.35+Math.random()*0.9); emit(color,x,y,Math.cos(a)*s,Math.sin(a)*s,0.35+Math.random()*0.35,3); } }

  // Level/difficulty scaling
  function updateLevel(){ const newLevel = Math.max(1, Math.min(MAX_LEVEL, 1 + Math.floor(score/LEVEL_HEIGHT))); if(newLevel!==level){ level=newLevel; levelEl && (levelEl.textContent=String(level)); applyDifficulty(); }}
  function applyDifficulty(){
    const t = (level-1)/(MAX_LEVEL-1); // 0..1
    // Increase platform gaps slightly as levels climb
    P_GAP_Y_MIN = 70 + Math.floor(40*t);
    P_GAP_Y_MAX = 130 + Math.floor(70*t);
  }

  // Enemy pools by 10-level brackets
  function bracket(){ return Math.floor((level-1)/10); } // 0..9
  function enemyConfig(){
    const b = bracket();
    // groundChance: chance to place ground enemy on suitable platform
    // batChance: chance to spawn bat near that platform
    // rollerWeight among ground picks increases over brackets
    const cfg = [
      { ground:0.10, bat:0.10, rollerW:0.0, speed:1.00 }, // 1-10
      { ground:0.16, bat:0.14, rollerW:0.1, speed:1.05 }, // 11-20
      { ground:0.22, bat:0.18, rollerW:0.2, speed:1.10 },
      { ground:0.28, bat:0.22, rollerW:0.3, speed:1.15 },
      { ground:0.34, bat:0.26, rollerW:0.4, speed:1.20 },
      { ground:0.38, bat:0.30, rollerW:0.5, speed:1.25 },
      { ground:0.42, bat:0.33, rollerW:0.6, speed:1.30 },
      { ground:0.46, bat:0.36, rollerW:0.7, speed:1.35 },
      { ground:0.50, bat:0.40, rollerW:0.8, speed:1.40 },
      { ground:0.55, bat:0.45, rollerW:0.9, speed:1.45 }, // 91-100
    ];
    return cfg[Math.min(9,b)];
  }

  function restart(){ state='menu'; score=0; runPoints=0; pointsEarned=0; cameraY=0; spawnY=H; bestY=player.y; level=1; levelEl && (levelEl.textContent='1'); applyDifficulty();
    Object.assign(player,{ x:W*0.5-18, y:300, vx:0, vy:0, onGround:false, jumpsLeft:ALLOW_DOUBLE?2:1, facing:1, anim:'idle', animTime:0, squashX:1, squashY:1, trailT:0 });
    platforms.length=coins.length=spikes.length=enemies.length=parts.length=0;
    let y=360; for(let i=0;i<6;i++){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN,W-P_MARGIN-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); y-=ri(P_GAP_Y_MIN,P_GAP_Y_MAX);} spawnY=y; placePlayerOnPlatform(); updUI(); }

  function r(min,max){ return Math.random()*(max-min)+min; } function ri(min,max){ return Math.floor(r(min,max)); }

  function ensureSpawn(){
    const target = cameraY - 200;
    while (spawnY > target){
      const w = ri(P_W_MIN,P_W_MAX), x = ri(P_MARGIN, W-P_MARGIN-w), y = spawnY - ri(P_GAP_Y_MIN,P_GAP_Y_MAX);
      platforms.push({x,y,w,h:20}); if (Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true});
      // Enemies according to level bracket
      const C = enemyConfig();
      if (w>120 && Math.random()<C.ground){ const roll = Math.random(); const pick = roll < (1 - C.rollerW) ? 'slime' : 'roller'; if (pick==='slime') spawnSlimeOnPlatform(x,y,w,C); else spawnRollerOnPlatform(x,y,w,C); }
      if (Math.random()<C.bat){ spawnBatAbove(x,y,w,C); }
      spawnY = y;
    }
  }

  function spawnSlimeOnPlatform(px,py,pw,C){ const left=px+12, right=px+pw-12-34; enemies.push({type:'slime', x:r(left,right), y:py-40, w:34, h:30, dir:Math.random()<0.5?-1:1, speed:r(40,70)*C.speed, left, right, alive:true, anim:0}); }
  function spawnRollerOnPlatform(px,py,pw,C){ const left=px+8, right=px+pw-8-30; enemies.push({type:'roller', x:r(left,right), y:py-30, w:30, h:30, dir:Math.random()<0.5?-1:1, speed:r(60,90)*C.speed, left, right, alive:true, anim:0}); }
  function spawnBatAbove(px,py,pw,C){ const rangeL=px, rangeR=px+pw-38; const cx=r(rangeL, rangeR); const baseY=py - r(60,120); enemies.push({type:'bat', x:cx, y:baseY, w:38, h:28, dir:Math.random()<0.5?-1:1, speed:r(60,100)*C.speed, left:rangeL, right:rangeR, alive:true, anim:0, t:r(0,Math.PI*2)}); }

  function placePlayerOnPlatform(){ if (!platforms.length) return; let p = platforms[0]; for (const pl of platforms){ if (pl.y > p.y) p = pl; } const xCenter = p.x + (p.w - player.w) * 0.5; player.x = Math.max(p.x, Math.min(p.x + p.w - player.w, xCenter)); player.y = p.y - player.h; player.vx = 0; player.vy = 0; player.onGround = true; player.jumpsLeft = ALLOW_DOUBLE ? 2 : 1; player.anim = 'idle'; player.animTime = 0; bestY = player.y; }

  function tryJump(){ if(player.jumpsLeft>0){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; play('jump'); burst(player.x+player.w/2, player.y+player.h/2, ACCENT, 10, 240); player.squashX=0.92; player.squashY=1.08; } }

  function aabb(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function update(dt){
    // Input → velocity
    if(player.vx>10) player.facing=1; else if(player.vx<-10) player.facing=-1;
    if (moveLeft && !moveRight) player.vx=Math.max(player.vx - MOVE_ACC*dt, -MOVE_MAX);
    else if (moveRight && !moveLeft) player.vx=Math.min(player.vx + MOVE_ACC*dt,  MOVE_MAX);
    else { if(player.vx>0) player.vx=Math.max(0, player.vx-FRICTION*dt); else if(player.vx<0) player.vx=Math.min(0, player.vx+FRICTION*dt); }

    if (jumpQ && state==='playing') tryJump(); jumpQ=false;

    // Integrate
    player.vy+=GRAVITY*dt; if(player.vy>MAX_FALL) player.vy=MAX_FALL; player.x+=player.vx*dt; player.y+=player.vy*dt; if (player.x+player.w<0) player.x=W-player.w; if (player.x>W) player.x=0;

    // Landing
    let landed=false; const vyBefore=player.vy;
    if (player.vy>=0){ for (const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if (aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=ALLOW_DOUBLE?2:1; const k = Math.min(1, Math.abs(vyBefore)/900); player.squashX=1+0.25*k; player.squashY=1-0.2*k; burst(player.x+player.w/2, player.y+player.h, '#8fb6ff', 6, 160); } player.onGround=true; break; } } }
    if(!landed && player.vy!==0) player.onGround=false;

    // Animation state
    const prev=player.anim; player.anim = !player.onGround ? 'jump' : (Math.abs(player.vx)>30? 'run':'idle'); player.animTime = (player.anim===prev)? (player.animTime+dt) : 0;

    // Trails — more VFX for higher-rarity skins
    player.trailT += dt; const trailInterval = 0.05 / FXI; if ((Math.abs(player.vx)>60 || !player.onGround) && player.trailT>trailInterval){ player.trailT=0; emit(ACCENT, player.x+player.w*0.5 + (player.facing*-4), player.y+player.h*0.7, -player.vx*0.2+(Math.random()-0.5)*40, 40*(Math.random()-0.5), 0.25, 2+Math.round(1*(FXI-1))); }

    // Coins
    for (const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; score+=50; runPoints+=10; play('coin'); burst(c.x+c.w/2, c.y+c.h/2, '#ffd166', 8, 180); } }

    // Enemies
    for (const e of enemies){ if(!e.alive) continue; e.anim += dt; if (e.type==='slime' || e.type==='roller'){ e.x += e.dir * e.speed * dt; if (e.x<e.left){ e.x=e.left; e.dir=1; } if (e.x>e.right){ e.x=e.right; e.dir=-1; } } else if (e.type==='bat'){ e.x += e.dir * e.speed * dt; if (e.x<e.left){ e.x=e.left; e.dir=1; } if (e.x>e.right){ e.x=e.right; e.dir=-1; } e.t = (e.t||0) + dt * 4; e.y += Math.sin(e.t) * 24 * dt * 8; }
      if (aabb(player,e)){ if (e.type==='roller'){ play('hit'); return gameOver(); } const feet = player.y + player.h; const stompY = e.y + e.h*0.38; if (player.vy>120 && feet - player.vy*dt <= stompY){ e.alive=false; score+=100; runPoints+=20; player.vy=JUMP_V*0.7; burst(e.x+e.w/2, e.y+e.h/2, '#f97098', 12, 220); play('coin'); player.squashX=0.95; player.squashY=1.05; } else { play('hit'); return gameOver(); } }
    }

    // Camera & score & level
    const targetCam = Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; bestY=Math.min(bestY, player.y); const height=Math.round((playerStartY - bestY)); score=Math.max(score, height); updateLevel();

    // Despawn
    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); while(spikes.length && spikes[0].y>cut) spikes.shift(); while(enemies.length && enemies[0].y>cut) enemies.shift();
    ensureSpawn();

    // Death by falling
    if (player.y > cut + 200){ play('hit'); return gameOver(); }

    // Particles step
    for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; if(p.life<=0){ parts.splice(i,1); continue;} p.vy += GRAVITY*0.2*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.98; p.vy*=0.98; }

    updUI();
  }

  function gameOver(){ state='gameover'; if(score>hiscore){ hiscore=score; localStorage.setItem(K.HISCORE,String(hiscore)); } pointsEarned = Math.floor(score/5) + runPoints; saveWallet(loadWallet()+pointsEarned); updUI(); }
  function updUI(){ scoreEl && (scoreEl.textContent=String(score)); hiscoreEl && (hiscoreEl.textContent=String(hiscore)); levelEl && (levelEl.textContent=String(level)); }

  // Draw helpers
  function drawRect(x,y,w,h,color){ ctx.fillStyle=color; ctx.fillRect(x, y-cameraY, w, h); }
  function drawShadow(px,py,pw,ph){ let gy=null; for(const p of platforms){ if(px+pw>p.x && px<p.x+p.w && p.y>=py+ph-1){ gy = (gy===null? p.y : Math.min(gy,p.y)); } } if(gy===null) return; const dist=gy-(py+ph); const t=Math.max(0,Math.min(1,1 - dist/220)); const scale=0.6+0.4*t; const alpha=0.15+0.25*t; const cx=px+pw/2, cy=gy - cameraY + 2; const rw=pw*0.9*scale, rh=8*scale; ctx.save(); ctx.fillStyle=`rgba(0,0,0,${alpha.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(cx,cy,rw/2,rh/2,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  // Offscreen canvas for enemy tinting
  const tintCanvas = document.createElement('canvas'); const tintCtx = tintCanvas.getContext('2d');

  function draw(){
    const V = getVisuals();
    // BG & parallax
    ctx.fillStyle=V.bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=V.bg2; ctx.fillRect(0,0,W,H*0.6); ctx.fillStyle=V.para; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2); }

    // Platforms
    for(const p of platforms) drawRect(p.x,p.y,p.w,p.h,V.platform);

    // Coins
    for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#e9c46a'; ctx.lineWidth=2; ctx.stroke(); }

    // Spikes
    ctx.fillStyle='#ff6b6b'; for(const s of spikes){ ctx.beginPath(); ctx.moveTo(s.x, s.y+s.h-cameraY); ctx.lineTo(s.x+s.w/2, s.y-cameraY); ctx.lineTo(s.x+s.w, s.y+s.h-cameraY); ctx.closePath(); ctx.fill(); }

    // Enemies draw with theme tint
    const tint = V.enemyTint; const tintAlpha = 0.28 + 0.12*Math.min(1,(level-1)/99); // more tint on higher levels
    for(const e of enemies){ if(!e.alive) continue; const cfg = ENEMY[e.type]; const frame=Math.floor(e.anim*cfg.fps)%cfg.frames; const sx=frame*cfg.FW, sy=0; const dx=e.x, dy=e.y - cameraY; if(!cfg || !cfg.img.complete){ drawRect(e.x,e.y,e.w,e.h,'#f97098'); continue; }
      // draw to offscreen and tint
      tintCanvas.width = Math.max(1, Math.ceil(e.w)); tintCanvas.height = Math.max(1, Math.ceil(e.h));
      tintCtx.clearRect(0,0,tintCanvas.width,tintCanvas.height);
      // sprite
      if(e.dir<0){ tintCtx.save(); tintCtx.translate(e.w,0); tintCtx.scale(-1,1); tintCtx.drawImage(cfg.img, sx,sy,cfg.FW,cfg.FH, 0,0, e.w,e.h); tintCtx.restore(); }
      else{ tintCtx.drawImage(cfg.img, sx,sy,cfg.FW,cfg.FH, 0,0, e.w,e.h); }
      // tint overlay masked to sprite
      tintCtx.globalCompositeOperation='source-atop'; tintCtx.fillStyle=tint; tintCtx.globalAlpha=tintAlpha; tintCtx.fillRect(0,0,e.w,e.h); tintCtx.globalAlpha=1; tintCtx.globalCompositeOperation='source-over';
      // blit to main
      ctx.drawImage(tintCanvas, dx, dy);
    }

    // Particles
    for(const p of parts){ ctx.globalAlpha=Math.max(0,Math.min(1,p.life*2)); ctx.fillStyle=p.color; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s); } ctx.globalAlpha=1;

    // Shadow + Player
    drawShadow(player.x,player.y,player.w,player.h);
    const dx=player.x, dy=player.y-cameraY; ctx.save(); const cx=dx+player.w/2, cy=dy+player.h/2; ctx.translate(cx,cy); ctx.scale(player.squashX, player.squashY); ctx.translate(-cx,-cy);
    if(skinReady && skinImg){ const def=PLAYER_SPRITE.ANIMS[player.anim]||PLAYER_SPRITE.ANIMS.idle; const fr=Math.floor(player.animTime*def.fps)%def.frames; const sx=fr*PLAYER_SPRITE.FW, sy=def.row*PLAYER_SPRITE.FH; if(player.facing===1){ ctx.drawImage(skinImg, sx,sy,PLAYER_SPRITE.FW,PLAYER_SPRITE.FH, dx,dy, player.w,player.h); } else { ctx.save(); ctx.translate(dx+player.w,dy); ctx.scale(-1,1); ctx.drawImage(skinImg, sx,sy,PLAYER_SPRITE.FW,PLAYER_SPRITE.FH, 0,0, player.w,player.h); ctx.restore(); } } else { drawRect(player.x,player.y,player.w,player.h,'#7cd1f9'); }
    ctx.restore();

    // HUD
    ctx.fillStyle='#e6edf3'; ctx.font='16px system-ui, sans-serif'; ctx.fillText(`Level: ${level} / 100`, 12, 24);
    if(state==='menu') center('Press Start (tap ⤒). 100 Levels • Enemies rotate every 10 levels • Theme-tinted enemies', W/2, H/2, 16);
    else if(state==='paused') center('Paused', W/2, H/2, 20);
    else if(state==='gameover'){ center('Game Over — Press Restart', W/2, H/2-10, 22); center(`Level ${level} · Height ${score} · Best ${hiscore} · +${pointsEarned} pts`, W/2, H/2+18, 14); }
  }

  function center(t,x,y,s){ ctx.fillStyle='#e6edf3'; ctx.font=`${s}px system-ui, sans-serif`; ctx.textAlign='center'; ctx.fillText(t,x,y); ctx.textAlign='start'; }

  // Loop
  btnStart && (btnStart.onclick=()=>{ unlock(); if(state!=='playing') state='playing'; });
  btnPause && (btnPause.onclick=()=>{ if(state==='playing') state='paused'; else if(state==='paused') state='playing'; });
  btnRestart && (btnRestart.onclick=()=>restart());
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden && state==='playing') state='paused'; });

  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-last)/1000,0.033); last=now; if(state==='playing') update(dt); draw(); }
  restart(); requestAnimationFrame(loop);

  // --- Folding menu toggle (mobile-friendly) ---
  (function(){ const hud=document.querySelector('.hud'); const menuBtn=document.getElementById('btnMenu'); if(!hud||!menuBtn) return; function setCollapsed(c){ hud.classList.toggle('is-collapsed', c); menuBtn.setAttribute('aria-expanded', String(!c)); } if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) setCollapsed(true); menuBtn.addEventListener('click', ()=> setCollapsed(!hud.classList.contains('is-collapsed'))); })();
})();
