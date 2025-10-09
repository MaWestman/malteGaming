
// v5.3.1 game.js — controls restored + celebration + flag sits ON platform
(() => {
  'use strict';
  const W = 800, H = 450;
  const K = { EQUIPPED:'equipped', HISCORE:'hiscore', WALLET:'wallet', STATS:'stats', MAXLVL:'maxLevelReached' };
  const loadWallet   = () => Number(localStorage.getItem(K.WALLET)||0);
  const saveWallet   = (v) => localStorage.setItem(K.WALLET, String(v));
  function loadStats(){ try { return JSON.parse(localStorage.getItem(K.STATS)||'{}'); } catch { return {}; } }
  function saveStats(s){ localStorage.setItem(K.STATS, JSON.stringify(s)); }
  function incStat(key, by=1){ const s=loadStats(); s[key]=(s[key]||0)+by; saveStats(s); }
  function addTime(dt){ const s=loadStats(); s.timeSec=(s.timeSec||0)+dt; saveStats(s); }
  function addPointsToStats(pts){ const s=loadStats(); s.totalPoints=(s.totalPoints||0)+pts; saveStats(s); }
  function setMaxLevel(n){ const cur=Number(localStorage.getItem(K.MAXLVL)||1); if(n>cur) localStorage.setItem(K.MAXLVL,String(n)); }

  const THEME={ platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' };

  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scaleCanvas(){ const dpr=Math.max(1,Math.floor(window.devicePixelRatio||1)); canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);} scaleCanvas(); window.addEventListener('resize', scaleCanvas,{passive:true});

  const btnPause=document.getElementById('btnPause'), btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump'), btnLeft=document.getElementById('btnLeft'), btnRight=document.getElementById('btnRight');
  const muteToggle=document.getElementById('mute');
  const scoreEl=document.getElementById('score'), hiscoreEl=document.getElementById('hiscore'), levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'), levelAction=document.getElementById('levelAction');
  const mobileBar=document.querySelector('.mobile-bar');

  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav'), win:new Audio('assets/audio/win.wav') };
  Object.values(sfx).forEach(a=>{ a.preload='auto'; a.volume=.28; });

  let state='waiting', dead=false, pendingNext=false; let shownOverlayAfterWin=false;
  let last=performance.now(); let hiscore=Number(localStorage.getItem(K.HISCORE)||0); if(hiscoreEl) hiscoreEl.textContent=String(hiscore);
  let cameraY=0, spawnY=H, bestY=0, playerStartY=300; let runPoints=0;
  let activeLevel=1; let levelProgress=0; let dynamicLevelHeight=levelLengthFor(1);

  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:2 };
  const platforms=[], coins=[], enemies=[], parts=[]; let GOAL=null; let goalY=0; let FINAL_PLAT=null;

  let celebrateT=0, flashT=0, shakeT=0;

  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000; const COIN=18; const MAX_LEVEL=100;  
  let P_W_MIN=90,P_W_MAX=180,P_GAP_Y_MIN=70,P_GAP_Y_MAX=130,P_MARGIN=30;

  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; const raw=base+(Math.max(1,n)-1)*per; return Math.round(raw*bonus); }
  function applyDifficulty(){ const t=(activeLevel-1)/(MAX_LEVEL-1); P_GAP_Y_MIN=70+Math.floor(40*t); P_GAP_Y_MAX=130+Math.floor(70*t); }

  function hideOverlay(){ if(levelOverlay){ levelOverlay.classList.add('hidden'); } }
  function showOverlay(text){ if(levelAction){ levelAction.textContent=text; } if(levelOverlay){ levelOverlay.classList.remove('hidden'); } }

  let moveLeft=false, moveRight=false, jumpQueued=false;
  function queueJump(){ jumpQueued=true; try{ sfx.jump.currentTime=0; sfx.jump.play().catch(()=>{});}catch{} }
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(state==='celebrating' && pendingNext){ onContinueNext(); } else { queueJump(); incStat('jumps',1);} } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  window.addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', ()=>{ if(state==='celebrating' && pendingNext) return onContinueNext(); incStat('jumps',1); queueJump(); });
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  function r(min,max){ return Math.random()*(max-min)+min; } function ri(min,max){ return Math.floor(r(min,max)); }
  function aabb(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function emit(color,x,y,vx,vy,life=0.6,size=3){ parts.push({x,y,vx,vy,life,color,size}); }
  function burst(x,y,color,count=18,spd=260){ for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, s=spd*(0.35+Math.random()*0.9); emit(color,x,y,Math.cos(a)*s,Math.sin(a)*s,0.5+Math.random()*0.6,3+Math.random()*2); } }
  function updateParticles(dt){ for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+= 600*dt; if(p.life<=0) parts.splice(i,1); } }

  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }
  function tryJump(){ if(player.jumpsLeft>0 && state==='playing'){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; burst(player.x+player.w/2, player.y+player.h/2, '#7cd1f9', 12, 240); } }

  function ensureSpawn(){ const target=cameraY-200; const ceiling=Math.min(target, goalY-120); while(spawnY>ceiling){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN, W-P_MARGIN-w), y=spawnY-ri(P_GAP_Y_MIN,P_GAP_Y_MAX); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); spawnY=y; } }

  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=enemies.length=0; GOAL=null; FINAL_PLAT=null; dead=false; celebrateT=flashT=shakeT=0; pendingNext=false; shownOverlayAfterWin=false;
    Object.assign(player,{ x:W*0.5-18, y:300, vx:0, vy:0, onGround:false, jumpsLeft:2 });
    let y=360; for(let i=0;i<6;i++){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN,W-P_MARGIN-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); y-=ri(P_GAP_Y_MIN,P_GAP_Y_MAX);} spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }

  function setGoalForLevel(){
    dynamicLevelHeight=levelLengthFor(activeLevel);
    goalY=playerStartY - dynamicLevelHeight;
    const platY = goalY + 10;              // platform top edge
    const plat = {x:0, y:platY, w:W, h:24};
    platforms.push(plat); FINAL_PLAT=plat;
    const flagW=36, flagH=120, gx=Math.floor(W/2 - flagW/2);
    GOAL={x:gx, y:platY - flagH, w:flagW, h:flagH, reached:false};
  }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); applyDifficulty(); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); levelEl && (levelEl.textContent=String(activeLevel)); syncUiVisibility(); incStat('runs',1); }
  function nextLevel(){ const next=Math.min(MAX_LEVEL, activeLevel+1); incStat('levelsCompleted',1); setMaxLevel(Math.max(next, activeLevel)); startLevel(next); }

  function onDeath(){ if(dead) return; dead=true; state='waiting'; const earned=Math.floor(levelProgress/5)+runPoints; addPointsToStats(earned); saveWallet(loadWallet()+earned); resetWorld(); showOverlay(`Retry Level ${activeLevel}`); syncUiVisibility(); }

  function updateHUD(){ if(scoreEl) scoreEl.textContent=String(levelProgress); if(hiscoreEl) hiscoreEl.textContent=String(Number(localStorage.getItem(K.HISCORE)||0)); if(levelEl) levelEl.textContent=String(activeLevel); }
  function syncUiVisibility(){ if(!mobileBar) return; const hide=(state==='playing' || state==='celebrating'); mobileBar.classList.toggle('hidden', hide); }

  function drawProgressBar(ctx,x,y,w,h,progress){ const p=Math.max(0,Math.min(1,progress)); ctx.save(); ctx.fillStyle='rgba(23,35,53,0.9)'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#7cd1f9'; ctx.fillRect(x,y,Math.max(h,Math.floor(w*p)),h); ctx.restore(); }
  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let y=0;y<bh;y+=6){ for(let x=0;x<bw;x+=6){ if(((x+y)/6)%2===0) ctx.fillRect(x,6+y,6,6);} } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function drawGlow(cx,cy,t){ ctx.save(); ctx.translate(cx, cy - cameraY); const r=120+Math.sin(t*4)*10; const g=ctx.createRadialGradient(0,0,10,0,0,r); g.addColorStop(0,'rgba(255,255,255,0.35)'); g.addColorStop(0.5,'rgba(124,209,249,0.20)'); g.addColorStop(1,'rgba(124,209,249,0.0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function drawRays(cx, cy, t){ ctx.save(); ctx.translate(cx, cy - cameraY); const beams=24; for(let i=0;i<beams;i++){ ctx.save(); const a = (i/beams)*Math.PI*2 + t*2; ctx.rotate(a); const len = 230 + Math.sin(t*6+i)*60; const w = 16; const grad = ctx.createLinearGradient(0,0,len,0); grad.addColorStop(0,'rgba(255,255,255,0.22)'); grad.addColorStop(1,'rgba(124,209,249,0.0)'); ctx.fillStyle=grad; ctx.fillRect(0,-w/2,len,w); ctx.restore(); } ctx.restore(); }
  function drawFlash(){ if(flashT<=0) return; const a=Math.max(0,Math.min(1, flashT/0.45)); ctx.save(); ctx.fillStyle=`rgba(255,255,255,${(a*0.85).toFixed(3)})`; ctx.fillRect(0,0,W,H); ctx.restore(); }
  function drawBanner(text){ ctx.save(); const y=80; ctx.font='700 42px system-ui,Segoe UI,Roboto,sans-serif'; ctx.textAlign='center'; ctx.lineWidth=6; ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.strokeText(text, W/2, y); ctx.fillStyle='#ffd166'; ctx.fillText(text, W/2, y); ctx.restore(); }

  function draw(){
    let ox=0, oy=0; if(shakeT>0){ const m=Math.min(1,shakeT/0.8); ox=(Math.random()*2-1)*10*m; oy=(Math.random()*2-1)*8*m; }
    ctx.save(); ctx.translate(ox,oy);
    ctx.fillStyle=THEME.bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=THEME.bg2; ctx.fillRect(0,0,W,H*0.6); ctx.fillStyle=THEME.para; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} 
    ctx.fillStyle=THEME.platform; for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 24);} 
    for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#e9c46a'; ctx.lineWidth=2; ctx.stroke(); }
    ctx.fillStyle='#7cd1f9'; ctx.fillRect(player.x, player.y-cameraY, player.w, player.h);
    if(GOAL){ const t=(performance.now()/1000)%1000; if(state==='celebrating' || pendingNext){ drawGlow(GOAL.x+GOAL.w/2, GOAL.y+20, t); drawRays(GOAL.x+GOAL.w/2, GOAL.y+20, t); } drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h); }
    for(const p of parts){ const a=Math.max(0,Math.min(1,p.life*2)); ctx.globalAlpha=a; ctx.fillStyle=p.color||p.c; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s);} ctx.globalAlpha=1;
    const prog = Math.max(0, Math.min(1, levelProgress / dynamicLevelHeight)); drawProgressBar(ctx, 10, 8, W-20, 8, prog);
    ctx.restore();
    drawFlash();
    if(state==='celebrating' || pendingNext){ drawBanner('LEVEL COMPLETE!'); }
    if(state==='waiting' && !pendingNext){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(0,0,W,H); }
  }

  function finishLevel(){ try{ sfx.win.currentTime=0; sfx.win.play().catch(()=>{});}catch{} const cx=GOAL.x+GOAL.w/2, cy=GOAL.y+10; const palette=['#7de07d','#ffd166','#7cd1f9','#f97098','#c084fc']; for(let k=0;k<18;k++){ const col=palette[k%palette.length]; burst(cx, cy, col, 26, 340); } flashT=0.45; shakeT=0.8; celebrateT=2.0; state='celebrating'; }
  function onContinueNext(){ if(!pendingNext) return; pendingNext=false; shownOverlayAfterWin=false; hideOverlay(); nextLevel(); }

  function update(dt){
    updateParticles(dt);
    if(state==='celebrating'){ celebrateT-=dt; flashT-=dt; shakeT-=dt; if(celebrateT<=0 && !shownOverlayAfterWin){ state='waiting'; shownOverlayAfterWin=true; pendingNext=true; showOverlay('Level Complete! Continue ▶'); /* show button */ } return; }
    if(state!=='playing') return;
    if(moveLeft && !moveRight) player.vx=Math.max(player.vx-2200*dt,-360); else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+2200*dt, 360); else { if(player.vx>0) player.vx=Math.max(0,player.vx-2000*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+2000*dt); }
    if(jumpQueued){ tryJump(); jumpQueued=false; }
    player.vy+=2200*dt; if(player.vy>1700) player.vy=1700; player.x+=player.vx*dt; player.y+=player.vy*dt; if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0;
    let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, '#8fb6ff', 6, 160);} player.onGround=true; break; } } } if(!landed && player.vy!==0) player.onGround=false;
    for(const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; incStat('coins',1); runPoints+=10; try{ sfx.coin.currentTime=0; sfx.coin.play().catch(()=>{});}catch{} burst(c.x+c.w/2, c.y+c.h/2, '#ffd166', 8, 180);} }
    const targetCam=Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); if(hiscoreEl){ let h=Number(localStorage.getItem(K.HISCORE)||0); if(height>h){ h=height; localStorage.setItem(K.HISCORE,String(h)); } hiscoreEl.textContent=String(h); }
    if(GOAL && !GOAL.reached && aabb(player,GOAL)){ GOAL.reached=true; finishLevel(); return; }
    if((player.y - cameraY) > (H + 60)) { try{ sfx.hit.currentTime=0; sfx.hit.play().catch(()=>{});}catch{} incStat('deaths',1); return onDeath(); }
    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); ensureSpawn(); if(scoreEl) scoreEl.textContent=String(levelProgress);
  }

  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; hideOverlay(); } mobileBar && mobileBar.classList.toggle('hidden', state==='playing'); });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });
  levelAction && levelAction.addEventListener('click', ()=>{ if(pendingNext){ onContinueNext(); } else { hideOverlay(); state='playing'; mobileBar && mobileBar.classList.toggle('hidden', true); } });

  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; const raw=base+(Math.max(1,n)-1)*per; return Math.round(raw*bonus); }
  function applyDifficulty(){ const t=(activeLevel-1)/(100-1); P_GAP_Y_MIN=70+Math.floor(40*t); P_GAP_Y_MAX=130+Math.floor(70*t); }
  function updateParticles(dt){ for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; if(p.life<=0) parts.splice(i,1); } }
  function updateHUD(){ if(scoreEl) scoreEl.textContent=String(levelProgress); if(hiscoreEl) hiscoreEl.textContent=String(Number(localStorage.getItem(K.HISCORE)||0)); if(levelEl) levelEl.textContent=String(activeLevel); }

  applyDifficulty(); resetWorld(); showOverlay('Start Level 1'); if(mobileBar) mobileBar.classList.toggle('hidden', true);
  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-(window.__t||now))/1000,0.033); window.__t=now; if(state==='playing' || state==='celebrating') update(dt); draw(); } requestAnimationFrame(loop);
})();
