
(() => {
  'use strict';
  const W = 800, H = 450;

  const K = { EQUIPPED:'equipped', HISCORE:'hiscore', WALLET:'wallet', STATS:'stats', MAXLVL:'maxLevelReached' };
  const loadEquipped = () => { try { return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}'); } catch { return {}; } };
  const loadWallet   = () => Number(localStorage.getItem(K.WALLET)||0);
  const saveWallet   = (v) => localStorage.setItem(K.WALLET, String(v));

  // Stats helpers
  function loadStats(){ try { return JSON.parse(localStorage.getItem(K.STATS)||'{}'); } catch { return {}; } }
  function saveStats(s){ localStorage.setItem(K.STATS, JSON.stringify(s)); }
  function incStat(key, by=1){ const s=loadStats(); s[key]=(s[key]||0)+by; saveStats(s); }
  function addTime(dt){ const s=loadStats(); s.timeSec=(s.timeSec||0)+dt; saveStats(s); }
  function addPointsToStats(pts){ const s=loadStats(); s.totalPoints=(s.totalPoints||0)+pts; saveStats(s); }
  function setMaxLevel(n){ const cur=Number(localStorage.getItem(K.MAXLVL)||1); if(n>cur) localStorage.setItem(K.MAXLVL,String(n)); }

  // Themes + Backgrounds
  const THEMES = {
    'theme-default': { platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' },
    'theme-heaven':  { platform:'#b3e5ff', bg1:'#e6f7ff', bg2:'#b3e5ff', para:'#d6f0ff' },
    'theme-hell':    { platform:'#ff3b30', bg1:'#2a0000', bg2:'#5a0000', para:'#3a0000' },
    'theme-space':   { platform:'#8a7dff', bg1:'#0b0a1a', bg2:'#1b173a', para:'#0f0d24' },
    'theme-mars':    { platform:'#c1440e', bg1:'#2b0f07', bg2:'#6a2b16', para:'#3a170c' },
    'theme-ocean':   { platform:'#2ec4ff', bg1:'#012a3a', bg2:'#024b6a', para:'#013a52' },
    'theme-desert':  { platform:'#e0b26a', bg1:'#3a240e', bg2:'#6a4422', para:'#533516' },
    'theme-cyber':   { platform:'#00ffd1', bg1:'#00131d', bg2:'#003348', para:'#002434' },
    'theme-candy':   { platform:'#f48fb1', bg1:'#2a0c1c', bg2:'#5a1f3d', para:'#40152b' },
    'theme-aurora':  { platform:'#7de07d', bg1:'#06141f', bg2:'#0a2840', para:'#08172a' },
    'theme-volcano': { platform:'#ff6b00', bg1:'#180905', bg2:'#3a160a', para:'#2a0e07' },
    'theme-glacier': { platform:'#9ad7ff', bg1:'#0a1b2e', bg2:'#1a3b5e', para:'#112b46' },
  };
  const BACKGROUNDS = {
    'bg-default': { bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' },
    'bg-heaven':  { bg1:'#e6f7ff', bg2:'#b3e5ff', para:'#d6f0ff' },
    'bg-hell':    { bg1:'#2a0000', bg2:'#5a0000', para:'#3a0000' },
    'bg-space':   { bg1:'#0b0a1a', bg2:'#1b173a', para:'#0f0d24' },
    'bg-mars':    { bg1:'#2b0f07', bg2:'#6a2b16', para:'#3a170c' },
    'bg-ocean':   { bg1:'#012a3a', bg2:'#024b6a', para:'#013a52' },
    'bg-desert':  { bg1:'#3a240e', bg2:'#6a4422', para:'#533516' },
    'bg-cyber':   { bg1:'#00131d', bg2:'#003348', para:'#002434' },
    'bg-candy':   { bg1:'#2a0c1c', bg2:'#5a1f3d', para:'#40152b' },
    'bg-aurora':  { bg1:'#0a0e2a', bg2:'#10385a', para:'#0a1738' },
    'bg-volcano': { bg1:'#180905', bg2:'#3a160a', para:'#2a0e07' },
    'bg-glacier': { bg1:'#0a1b2e', bg2:'#1a3b5e', para:'#112b46' },
  };
  function visuals(){
    const eq = loadEquipped() || {};
    const theme = THEMES[eq.theme || 'theme-default'] || THEMES['theme-default'];
    const bg    = BACKGROUNDS[eq.background || 'bg-default'] || null;
    return {
      platform: theme.platform,
      bg1: bg ? bg.bg1 : theme.bg1,
      bg2: bg ? bg.bg2 : theme.bg2,
      para: bg ? bg.para : theme.para,
      enemyTint: theme.platform,
      accessories: (eq.accessories || { head:null, eyes:null })
    };
  }

  // Player sprites
  const PLAYER_SPRITE = { FW:48, FH:56, ANIMS:{ idle:{row:0,frames:4,fps:4}, run:{row:1,frames:6,fps:10}, jump:{row:2,frames:2,fps:6} } };
  const eqAtLoad = loadEquipped();
  let skinImg=null, skinReady=false;
  if (eqAtLoad && eqAtLoad.skin){ const img=new Image(); img.onload=()=>{ skinImg=img; skinReady=true; }; img.onerror=()=>{ skinImg=null; skinReady=false; }; img.src=`assets/images/sprites/${eqAtLoad.skin}.png`; }

  // Enemies
  const ENEMY = { slime:{FW:48,FH:40,frames:6,fps:8,img:new Image()}, bat:{FW:52,FH:34,frames:6,fps:10,img:new Image()}, roller:{FW:40,FH:40,frames:8,fps:12,img:new Image()} };
  ENEMY.slime.img.src='assets/images/sprites/enemy-slime.png';
  ENEMY.bat.img.src  ='assets/images/sprites/enemy-bat.png';
  ENEMY.roller.img.src='assets/images/sprites/enemy-roller.png';

  // Physics & world
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000; const ALLOW_DOUBLE=true;
  let P_W_MIN=90, P_W_MAX=180, P_GAP_Y_MIN=70, P_GAP_Y_MAX=130, P_MARGIN=30; const COIN=18;
  const MAX_LEVEL=100, LEVEL_HEIGHT=250;

  // Canvas
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scaleCanvas(){ const dpr=Math.max(1,Math.floor(window.devicePixelRatio||1)); canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  scaleCanvas(); window.addEventListener('resize', scaleCanvas, {passive:true});

  // UI refs
  const btnPause=document.getElementById('btnPause'), btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump'), btnLeft=document.getElementById('btnLeft'), btnRight=document.getElementById('btnRight');
  const muteToggle=document.getElementById('mute');
  const scoreEl=document.getElementById('score'), hiscoreEl=document.getElementById('hiscore'), levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'), levelAction=document.getElementById('levelAction');
  const mobileBar=document.querySelector('.mobile-bar');

  // Audio
  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav') };
  Object.values(sfx).forEach(a=>{ a.preload='auto'; a.volume=.25; }); let audioUnlocked=false; function unlock(){ if(audioUnlocked) return; try{ sfx.jump.muted=true; sfx.jump.play().then(()=>{ sfx.jump.pause(); sfx.jump.currentTime=0; sfx.jump.muted=false; audioUnlocked=true; }).catch(()=>{});}catch{} }
  function play(name){ if(muteToggle && muteToggle.checked) return; const a=sfx[name]; if(!a) return; try{ a.currentTime=0; a.play(); }catch{} }

  // Input
  let moveLeft=false, moveRight=false, jumpQ=false; function queueJump(){ jumpQ=true; unlock(); }
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); queueJump(); incStat('jumps',1); } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  window.addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', ()=>{ incStat('jumps',1); queueJump(); });
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  // Game state
  let state='waiting';
  let last=performance.now(); let hiscore=Number(localStorage.getItem(K.HISCORE)||0); if(hiscoreEl) hiscoreEl.textContent=String(hiscore);
  let cameraY=0, spawnY=H, bestY=0, playerStartY=300; let runPoints=0;
  let activeLevel=1; let levelProgress=0;

  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:ALLOW_DOUBLE?2:1, facing:1, anim:'idle', animTime:0, squashX:1, squashY:1, trailT:0 };
  const platforms=[], coins=[], spikes=[], enemies=[], parts=[];

  function emit(color,x,y,vx,vy,life=0.35,size=3){ parts.push({x,y,vx,vy,life,color,size}); }
  function burst(x,y,color,count=10,spd=220){ for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, s=spd*(0.35+Math.random()*0.9); emit(color,x,y,Math.cos(a)*s,Math.sin(a)*s,0.35+Math.random()*0.35,3); } }

  // Difficulty per level
  function applyDifficulty(){ const t=(activeLevel-1)/(MAX_LEVEL-1); P_GAP_Y_MIN=70+Math.floor(40*t); P_GAP_Y_MAX=130+Math.floor(70*t); }
  function bracket(){ return Math.floor((activeLevel-1)/10); }
  function enemyConfig(){ const b=bracket(); const cfg=[
    { ground:0.10, bat:0.10, rollerW:0.0, speed:1.00 },
    { ground:0.16, bat:0.14, rollerW:0.1, speed:1.05 },
    { ground:0.22, bat:0.18, rollerW:0.2, speed:1.10 },
    { ground:0.28, bat:0.22, rollerW:0.3, speed:1.15 },
    { ground:0.34, bat:0.26, rollerW:0.4, speed:1.20 },
    { ground:0.38, bat:0.30, rollerW:0.5, speed:1.25 },
    { ground:0.42, bat:0.33, rollerW:0.6, speed:1.30 },
    { ground:0.46, bat:0.36, rollerW:0.7, speed:1.35 },
    { ground:0.50, bat:0.40, rollerW:0.8, speed:1.40 },
    { ground:0.55, bat:0.45, rollerW:0.9, speed:1.45 },
  ]; return cfg[Math.min(9,b)]; }

  // Overlay & world reset
  function setOverlay(text){ if(levelAction){ levelAction.textContent=text; } if(levelOverlay){ levelOverlay.classList.remove('hidden'); } }
  function hideOverlay(){ if(levelOverlay){ levelOverlay.classList.add('hidden'); } }

  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=spikes.length=enemies.length=0; Object.assign(player,{ x:W*0.5-18, y:300, vx:0, vy:0, onGround:false, jumpsLeft:ALLOW_DOUBLE?2:1, facing:1, anim:'idle', animTime:0, squashX:1, squashY:1, trailT:0 }); let y=360; for(let i=0;i<6;i++){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN,W-P_MARGIN-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); y-=ri(P_GAP_Y_MIN,P_GAP_Y_MAX);} spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; updateHUD(); }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); applyDifficulty(); resetWorld(); state='waiting'; setOverlay(`Start Level ${activeLevel}`); levelEl && (levelEl.textContent=String(activeLevel)); syncUiVisibility(); incStat('runs',1); }
  function nextLevel(){ const next=Math.min(MAX_LEVEL, activeLevel+1); incStat('levelsCompleted',1); setMaxLevel(Math.max(next, activeLevel)); startLevel(next); }

  // Utils
  function r(min,max){ return Math.random()*(max-min)+min; } function ri(min,max){ return Math.floor(r(min,max)); }

  function ensureSpawn(){ const target=cameraY-200; while(spawnY>target){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN, W-P_MARGIN-w), y=spawnY-ri(P_GAP_Y_MIN,P_GAP_Y_MAX); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); const C=enemyConfig(); if(w>120 && Math.random()<C.ground){ const roll=Math.random(); const pick = roll < (1 - C.rollerW) ? 'slime' : 'roller'; if(pick==='slime') spawnSlimeOnPlatform(x,y,w,C); else spawnRollerOnPlatform(x,y,w,C); } if(Math.random()<C.bat){ spawnBatAbove(x,y,w,C); } spawnY=y; } }

  function spawnSlimeOnPlatform(px,py,pw,C){ const left=px+12,right=px+pw-12-34; enemies.push({type:'slime',x:r(left,right),y:py-40,w:34,h:30,dir:Math.random()<0.5?-1:1,speed:r(40,70)*C.speed,left,right,alive:true,anim:0}); }
  function spawnRollerOnPlatform(px,py,pw,C){ const left=px+8,right=px+pw-8-30; enemies.push({type:'roller',x:r(left,right),y:py-30,w:30,h:30,dir:Math.random()<0.5?-1:1,speed:r(60,90)*C.speed,left,right,alive:true,anim:0}); }
  function spawnBatAbove(px,py,pw,C){ const rangeL=px,rangeR=px+pw-38; const cx=r(rangeL,rangeR); const baseY=py-r(60,120); enemies.push({type:'bat',x:cx,y:baseY,w:38,h:28,dir:Math.random()<0.5?-1:1,speed:r(60,100)*C.speed,left:rangeL,right:rangeR,alive:true,anim:0,t:r(0,Math.PI*2)}); }

  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const xCenter=p.x+(p.w-player.w)*0.5; player.x=Math.max(p.x,Math.min(p.x+p.w-player.w,xCenter)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=ALLOW_DOUBLE?2:1; player.anim='idle'; player.animTime=0; }

  function tryJump(){ if(player.jumpsLeft>0){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; play('jump'); burst(player.x+player.w/2, player.y+player.h/2, '#7cd1f9', 10, 240); } }
  function aabb(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function update(dt){
    if(state==='playing') addTime(dt);

    // movement
    if(player.vx>10) player.facing=1; else if(player.vx<-10) player.facing=-1;
    if(moveLeft && !moveRight) player.vx=Math.max(player.vx-MOVE_ACC*dt,-MOVE_MAX);
    else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+MOVE_ACC*dt, MOVE_MAX);
    else { if(player.vx>0) player.vx=Math.max(0,player.vx-FRICTION*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+FRICTION*dt); }

    if(jumpQ && state==='playing') tryJump(); jumpQ=false;

    // physics
    player.vy+=GRAVITY*dt; if(player.vy>MAX_FALL) player.vy=MAX_FALL; player.x+=player.vx*dt; player.y+=player.vy*dt;
    if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0;

    // landing
    let landed=false; const vyBefore=player.vy;
    if(player.vy>=0){ for (const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if (aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=ALLOW_DOUBLE?2:1; const k=Math.min(1, Math.abs(vyBefore)/900); player.squashX=1+0.25*k; player.squashY=1-0.2*k; burst(player.x+player.w/2, player.y+player.h, '#8fb6ff', 6, 160); } player.onGround=true; break; } } }
    if(!landed && player.vy!==0) player.onGround=false;

    // anim
    const prev=player.anim; player.anim=!player.onGround ? 'jump' : (Math.abs(player.vx)>30? 'run':'idle'); player.animTime=(player.anim===prev)? (player.animTime+dt) : 0;

    // coins
    for (const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; levelProgress+=50; runPoints+=10; incStat('coins',1); play('coin'); burst(c.x+c.w/2, c.y+c.h/2, '#ffd166', 8, 180); } }

    // enemies
    for (const e of enemies){ if(!e.alive) continue; e.anim+=dt; if(e.type==='slime' || e.type==='roller'){ e.x += e.dir*e.speed*dt; if(e.x<e.left){ e.x=e.left; e.dir=1; } if(e.x>e.right){ e.x=e.right; e.dir=-1; } } else if(e.type==='bat'){ e.x+=e.dir*e.speed*dt; if(e.x<e.left){ e.x=e.left; e.dir=1; } if(e.x>e.right){ e.x=e.right; e.dir=-1; } e.t=(e.t||0)+dt*4; e.y += Math.sin(e.t) * 24 * dt * 8; }
      if(aabb(player,e)){
        if(e.type==='roller'){ play('hit'); incStat('deaths',1); return onDeath(); }
        const feet=player.y+player.h; const stompY=e.y+e.h*0.38;
        if(player.vy>120 && feet - player.vy*dt <= stompY){ e.alive=false; levelProgress+=100; runPoints+=20; incStat('stomps',1); player.vy=JUMP_V*0.7; burst(e.x+e.w/2, e.y+e.h/2, '#f97098', 12, 220); play('coin'); } else { play('hit'); incStat('deaths',1); return onDeath(); }
      }
    }

    // camera & progress
    const targetCam=Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; const height = Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY, player.y); levelProgress = Math.max(levelProgress, height);

    // level complete gate
    if(levelProgress >= LEVEL_HEIGHT){ state='waiting'; nextLevel(); return; }

    // cleanup
    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); while(spikes.length && spikes[0].y>cut) spikes.shift(); while(enemies.length && enemies[0].y>cut) enemies.shift();
    ensureSpawn();

    updateHUD();
  }

  function onDeath(){ state='waiting'; const earned = Math.floor(levelProgress/5) + runPoints; addPointsToStats(earned); saveWallet(loadWallet()+earned); setOverlay(`Retry Level ${activeLevel}`); resetWorld(); syncUiVisibility(); }
  function updateHUD(){ if(scoreEl) scoreEl.textContent=String(levelProgress); if(hiscoreEl){ const globalHeight=Number(localStorage.getItem(K.HISCORE)||0); const newHis=Math.max(globalHeight, levelProgress); hiscoreEl.textContent=String(newHis); } if(levelEl) levelEl.textContent=String(activeLevel); }

  // Auto-hide menubar during play
  function syncUiVisibility(){ if(!mobileBar) return; const hide = (state==='playing'); mobileBar.classList.toggle('hidden', hide); }

  // --- Color + shape helpers for the two-tone rounded progress bar ---
  function hexToRgb(hex){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||''); if(!m) return {r:124,g:209,b:249}; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)}; }
  function shade(hex,t){ const {r,g,b}=hexToRgb(hex); const f=(t<0?0:255), p=Math.abs(t); const rr=Math.round((f-r)*p+r), gg=Math.round((f-g)*p+g), bb=Math.round((f-b)*p+b); return `rgb(${rr},${gg},${bb})`; }
  function roundRectPath(ctx,x,y,w,h,r){ const rad=Math.max(0,Math.min(r,h*0.5,w*0.5)); ctx.beginPath(); ctx.moveTo(x+rad,y); ctx.arcTo(x+w,y,x+w,y+h,rad); ctx.arcTo(x+w,y+h,x,y+h,rad); ctx.arcTo(x,y+h,x,y,rad); ctx.arcTo(x,y,x+w,y,rad); ctx.closePath(); }
  function drawProgressBar(ctx,x,y,w,h,progress,themeHex,trackColor='rgba(23,35,53,0.9)'){
    const p=Math.max(0,Math.min(1,progress));
    ctx.save(); roundRectPath(ctx,x,y,w,h,h/2); ctx.fillStyle=trackColor; ctx.fill();
    const fillW=Math.max(h, Math.floor(w*p));
    if(fillW>0){ const grad=ctx.createLinearGradient(x,y,x+fillW,y); grad.addColorStop(0, shade(themeHex, +0.15)); grad.addColorStop(1, shade(themeHex, -0.10)); roundRectPath(ctx,x,y,fillW,h,h/2); ctx.fillStyle=grad; ctx.fill(); }
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,0.06)'; roundRectPath(ctx,x,y,w,h,h/2); ctx.stroke(); ctx.restore(); }

  // Accessory drawing
  function drawAccessories(ctx, dx, dy, w, h, facing, accessories){
    const head = accessories.head; const eyes = accessories.eyes; if(!head && !eyes) return;
    const cx=dx+w/2, top=dy+4, headH=h*0.28; const headY = dy + h*0.12; const eyeY = dy + h*0.38;
    ctx.save();
    // Head gear
    if(head){
      if(head==='head-halo'){
        ctx.strokeStyle='rgba(255,230,120,0.95)'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(cx, top, w*0.28, h*0.06, 0, 0, Math.PI*2); ctx.stroke();
      } else if(head==='head-horns'){
        ctx.fillStyle='#aa0000';
        const hornW=w*0.10, hornH=h*0.14;
        ctx.beginPath(); ctx.moveTo(cx-w*0.18, headY); ctx.lineTo(cx-w*0.18-hornW, headY+hornH); ctx.lineTo(cx-w*0.10, headY+hornH*0.7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx+w*0.18, headY); ctx.lineTo(cx+w*0.18+hornW, headY+hornH); ctx.lineTo(cx+w*0.10, headY+hornH*0.7); ctx.closePath(); ctx.fill();
      } else if(head==='head-cap'){
        ctx.fillStyle='#2a6fff'; ctx.fillRect(cx-w*0.22, headY, w*0.44, headH*0.6); ctx.fillRect(cx-w*0.1, headY+headH*0.5, w*0.28, headH*0.25);
      } else if(head==='head-cowboy'){
        ctx.fillStyle='#7a4a1f'; ctx.fillRect(cx-w*0.28, headY+headH*0.25, w*0.56, headH*0.15); ctx.fillRect(cx-w*0.16, headY, w*0.32, headH*0.35);
      } else if(head==='head-crown'){
        ctx.fillStyle='#f4c542'; const y=headY+headH*0.1; const lw=w*0.44; ctx.fillRect(cx-lw/2, y, lw, headH*0.28);
        ctx.beginPath(); const spikes=5; for(let i=0;i<spikes;i++){ const sx=cx-lw/2 + i*(lw/(spikes-1)); ctx.moveTo(sx, y); ctx.lineTo(sx+lw/(spikes*2), y-headH*0.4); ctx.lineTo(sx+lw/spikes, y); } ctx.fill();
      } else if(head==='head-wizard'){
        ctx.fillStyle='#6a4c93'; ctx.beginPath(); ctx.moveTo(cx, headY-headH*0.4); ctx.lineTo(cx-w*0.14, headY+headH*0.6); ctx.lineTo(cx+w*0.14, headY+headH*0.6); ctx.closePath(); ctx.fill();
      } else if(head==='head-pirate'){
        ctx.fillStyle='#111'; ctx.fillRect(cx-w*0.26, headY+headH*0.2, w*0.52, headH*0.18); ctx.fillStyle='#e00'; ctx.fillRect(cx-w*0.12, headY+headH*0.36, w*0.24, headH*0.12);
      } else if(head==='head-space' || head==='head-mars'){
        ctx.strokeStyle=head==='head-space'?'#8a7dff':'#c1440e'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(cx, dy+h*0.34, w*0.34, h*0.36, 0, 0, Math.PI*2); ctx.stroke();
      }
    }
    // Eyes / glasses
    if(eyes){
      if(eyes==='eyes-round'){
        ctx.strokeStyle='#111'; ctx.lineWidth=3; const r=w*0.08; const gap=w*0.05; ctx.beginPath(); ctx.arc(cx-gap, eyeY, r, 0, Math.PI*2); ctx.arc(cx+gap, eyeY, r, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx-gap+r,eyeY); ctx.lineTo(cx+gap-r,eyeY); ctx.stroke();
      } else if(eyes==='eyes-aviator'){
        ctx.fillStyle='rgba(0,0,0,0.6)'; const aw=w*0.14, ah=h*0.08; ctx.fillRect(cx-aw*1.5, eyeY-ah/2, aw, ah); ctx.fillRect(cx+aw*0.5, eyeY-ah/2, aw, ah); ctx.fillRect(cx-aw*0.5, eyeY-ah*0.2, aw, ah*0.4);
      } else if(eyes==='eyes-visor'){
        ctx.fillStyle='rgba(0,255,200,0.5)'; const aw=w*0.44, ah=h*0.1; ctx.fillRect(cx-aw/2, eyeY-ah/2, aw, ah);
      } else if(eyes==='eyes-goggles'){
        ctx.strokeStyle='#2e7'; ctx.lineWidth=3; const r=w*0.09; const gap=w*0.08; ctx.beginPath(); ctx.arc(cx-gap, eyeY, r, 0, Math.PI*2); ctx.arc(cx+gap, eyeY, r, 0, Math.PI*2); ctx.stroke();
      } else if(eyes==='eyes-monocle'){
        ctx.strokeStyle='#f4c542'; ctx.lineWidth=3; const r=w*0.10; ctx.beginPath(); ctx.arc(cx-w*0.12, eyeY, r, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx-w*0.12, eyeY+r); ctx.lineTo(cx-w*0.12, eyeY+r+h*0.18); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw
  function draw(){ const V=visuals();
    // BG & parallax
    ctx.fillStyle=V.bg1; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=V.bg2; ctx.fillRect(0,0,W,H*0.6);
    ctx.fillStyle=V.para; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2); }

    // Platforms
    ctx.fillStyle=V.platform; for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 20); }

    // Coins
    for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#e9c46a'; ctx.lineWidth=2; ctx.stroke(); }

    // Enemies (theme-tinted)
    const tint=V.enemyTint; const tintAlpha=0.28 + 0.12*Math.min(1,(activeLevel-1)/99);
    for(const e of enemies){ if(!e.alive) continue; const cfg=ENEMY[e.type]; if(!cfg||!cfg.img.complete){ ctx.fillStyle='#f97098'; ctx.fillRect(e.x, e.y-cameraY, e.w, e.h); continue; } const frame=Math.floor(e.anim*cfg.fps)%cfg.frames; const sx=frame*cfg.FW, sy=0; const dx=e.x, dy=e.y-cameraY; ctx.save(); ctx.translate(dx,dy); if(e.dir<0){ ctx.translate(e.w,0); ctx.scale(-1,1);} ctx.drawImage(cfg.img, sx,sy,cfg.FW,cfg.FH, 0,0, e.w,e.h); ctx.globalCompositeOperation='source-atop'; ctx.globalAlpha=tintAlpha; ctx.fillStyle=tint; ctx.fillRect(0,0,e.w,e.h); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.restore(); }

    // Particles
    for(const p of parts){ ctx.globalAlpha=Math.max(0,Math.min(1,p.life*2)); ctx.fillStyle=p.color; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s); } ctx.globalAlpha=1;

    // Shadow + Player + Accessories
    drawShadow(player.x,player.y,player.w,player.h);
    const dx=player.x, dy=player.y-cameraY; ctx.save(); const cx=dx+player.w/2, cy=dy+player.h/2; ctx.translate(cx,cy); ctx.scale(player.squashX,player.squashY); ctx.translate(-cx,-cy);
    if(skinReady && skinImg){ const def=PLAYER_SPRITE.ANIMS[player.anim]||PLAYER_SPRITE.ANIMS.idle; const fr=Math.floor(player.animTime*def.fps)%def.frames; const sx=fr*PLAYER_SPRITE.FW, sy=def.row*PLAYER_SPRITE.FH; if(player.facing===1){ ctx.drawImage(skinImg, sx,sy,PLAYER_SPRITE.FW,PLAYER_SPRITE.FH, dx,dy, player.w,player.h); } else { ctx.save(); ctx.translate(dx+player.w,dy); ctx.scale(-1,1); ctx.drawImage(skinImg, sx,sy,PLAYER_SPRITE.FW,PLAYER_SPRITE.FH, 0,0, player.w,player.h); ctx.restore(); } } else { ctx.fillStyle='#7cd1f9'; ctx.fillRect(player.x, player.y-cameraY, player.w, player.h); }
    // draw accessories on top
    drawAccessories(ctx, dx, dy, player.w, player.h, player.facing, visuals().accessories);
    ctx.restore();

    // Two-tone rounded progress bar (screen-space)
    const p = Math.max(0, Math.min(1, levelProgress / LEVEL_HEIGHT)); const margin = 10, barH = 8, barW = W - margin*2, x = margin, y = 8; drawProgressBar(ctx, x, y, barW, barH, p, visuals().platform);

    // Dim when waiting
    if(state==='waiting'){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(0,0,W,H); }
  }

  function drawShadow(px,py,pw,ph){ let gy=null; for(const p of platforms){ if(px+pw>p.x && px<p.x+p.w && p.y>=py+ph-1){ gy=(gy===null? p.y : Math.min(gy,p.y)); } } if(gy===null) return; const dist=gy-(py+ph); const t=Math.max(0,Math.min(1,1 - dist/220)); const scale=0.6+0.4*t; const alpha=0.15+0.25*t; const cx=px+pw/2, cy=gy + 2 - cameraY; const rw=pw*0.9*scale, rh=8*scale; ctx.save(); ctx.fillStyle=`rgba(0,0,0,${alpha.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(cx,cy,rw/2,rh/2,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  // Buttons & loop
  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; } syncUiVisibility(); });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });
  levelAction && levelAction.addEventListener('click', ()=>{ hideOverlay(); state='playing'; syncUiVisibility(); });

  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-last)/1000,0.033); last=now; if(state==='playing') update(dt); draw(); }

  // Init
  applyDifficulty(); resetWorld(); setOverlay('Start Level 1'); syncUiVisibility();
  requestAnimationFrame(loop);
})();
