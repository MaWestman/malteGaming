
(() => {
  'use strict';
  const W = 800, H = 450;
  const K = { EQUIPPED:'equipped', HISCORE:'hiscore', WALLET:'wallet', STATS:'stats', MAXLVL:'maxLevelReached' };
  const loadEquipped = () => { try { return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}'); } catch { return {}; } };
  const loadWallet   = () => Number(localStorage.getItem(K.WALLET)||0);
  const saveWallet   = (v) => localStorage.setItem(K.WALLET, String(v));
  function loadStats(){ try { return JSON.parse(localStorage.getItem(K.STATS)||'{}'); } catch { return {}; } }
  function saveStats(s){ localStorage.setItem(K.STATS, JSON.stringify(s)); }
  function incStat(key, by=1){ const s=loadStats(); s[key]=(s[key]||0)+by; saveStats(s); }
  function addTime(dt){ const s=loadStats(); s.timeSec=(s.timeSec||0)+dt; saveStats(s); }
  function addPointsToStats(pts){ const s=loadStats(); s.totalPoints=(s.totalPoints||0)+pts; saveStats(s); }
  function setMaxLevel(n){ const cur=Number(localStorage.getItem(K.MAXLVL)||1); if(n>cur) localStorage.setItem(K.MAXLVL,String(n)); }

  const THEMES={ 'theme-default':{platform:'#5e81ac',bg1:'#0f1a2b',bg2:'#162238',para:'#0b192c'} };
  const BACKGROUNDS={ 'bg-default':{bg1:'#0f1a2b',bg2:'#162238',para:'#0b192c'} };
  function visuals(){ const eq=loadEquipped()||{}; const theme=THEMES['theme-default']; const bg=BACKGROUNDS['bg-default']; return { platform:theme.platform, bg1:bg.bg1, bg2:bg.bg2, para:bg.para, enemyTint:theme.platform, accessories:(eq.accessories||{ head:null, eyes:null }), skin:eq.skin||'skin-default' }; }

  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scaleCanvas(){ const dpr=Math.max(1,Math.floor(window.devicePixelRatio||1)); canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);} scaleCanvas(); window.addEventListener('resize', scaleCanvas,{passive:true});

  const btnPause=document.getElementById('btnPause'), btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump'), btnLeft=document.getElementById('btnLeft'), btnRight=document.getElementById('btnRight');
  const muteToggle=document.getElementById('mute');
  const scoreEl=document.getElementById('score'), hiscoreEl=document.getElementById('hiscore'), levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'), levelAction=document.getElementById('levelAction');
  const mobileBar=document.querySelector('.mobile-bar');

  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav') };
  Object.values(sfx).forEach(a=>{ a.preload='auto'; a.volume=.25; });
  let audioUnlocked=false; function unlock(){ if(audioUnlocked) return; try{ sfx.jump.muted=true; sfx.jump.play().then(()=>{ sfx.jump.pause(); sfx.jump.currentTime=0; sfx.jump.muted=false; audioUnlocked=true; }).catch(()=>{});}catch{} }
  function play(name){ if(muteToggle&&muteToggle.checked) return; const a=sfx[name]; if(!a) return; try{ a.currentTime=0; a.play(); }catch{} }

  // World state
  let state='waiting';
  let last=performance.now(); let hiscore=Number(localStorage.getItem(K.HISCORE)||0); if(hiscoreEl) hiscoreEl.textContent=String(hiscore);
  let cameraY=0, spawnY=H, bestY=0, playerStartY=300; let runPoints=0; let dead=false;
  let activeLevel=1; let levelProgress=0; let dynamicLevelHeight=levelLengthFor(1);

  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:2 };
  const platforms=[], coins=[], enemies=[], parts=[]; let GOAL=null; let goalY=0; let FINAL_PLAT=null; let touchedFinalPlatform=false;

  // Physics & params
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000; const COIN=18; const MAX_LEVEL=100;  
  let P_W_MIN=90,P_W_MAX=180,P_GAP_Y_MIN=70,P_GAP_Y_MAX=130,P_MARGIN=30;

  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; const raw=base+(Math.max(1,n)-1)*per; return Math.round(raw*bonus); }
  function applyDifficulty(){ const t=(activeLevel-1)/(MAX_LEVEL-1); P_GAP_Y_MIN=70+Math.floor(40*t); P_GAP_Y_MAX=130+Math.floor(70*t); }

  // Overlay helpers
  function hideOverlay(){ if(levelOverlay){ levelOverlay.classList.add('hidden'); } }
  function showOverlay(text){ if(levelAction){ levelAction.textContent=text; } if(levelOverlay){ levelOverlay.classList.remove('hidden'); } }

  // Controls flags for keyboard/touch
  let moveLeft=false, moveRight=false, jumpQueued=false;
  function queueJump(){ jumpQueued=true; unlock(); }
  window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); queueJump(); incStat('jumps',1);} if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  window.addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', ()=>{ incStat('jumps',1); queueJump(); });
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  // Core helpers
  function r(min,max){ return Math.random()*(min>max?0:(max-min))+min; } function ri(min,max){ return Math.floor(r(min,max)); }
  function aabb(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function emit(color,x,y,vx,vy,life=0.35,size=3){ parts.push({x,y,vx,vy,life,color,size}); }
  function burst(x,y,color,count=10,spd=220){ for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, s=spd*(0.35+Math.random()*0.9); emit(color,x,y,Math.cos(a)*s,Math.sin(a)*s,0.35+Math.random()*0.35,3); } }

  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }
  function tryJump(){ if(player.jumpsLeft>0){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; play('jump'); burst(player.x+player.w/2, player.y+player.h/2, '#7cd1f9', 10, 240); } }

  function ensureSpawn(){ const target=cameraY-200; const ceiling=Math.min(target, goalY-120); while(spawnY>ceiling){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN, W-P_MARGIN-w), y=spawnY-ri(P_GAP_Y_MIN,P_GAP_Y_MAX); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); if(w>120 && Math.random()<0.20){ const left=x+12,right=x+w-12-34; enemies.push({type:'slime',x:r(left,right),y:y-40,w:34,h:30,dir:Math.random()<0.5?-1:1,speed:r(40,70),left,right,alive:true,anim:0}); } if(Math.random()<0.14){ const rangeL=x,rangeR=x+w-38; const cx=r(rangeL,rangeR); const baseY=y-r(60,120); enemies.push({type:'bat',x:cx,y:baseY,w:38,h:28,dir:Math.random()<0.5?-1:1,speed:r(60,100),left:rangeL,right:rangeR,alive:true,anim:0,t:r(0,Math.PI*2)});} spawnY=y; } }

  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=enemies.length=0; GOAL=null; FINAL_PLAT=null; touchedFinalPlatform=false; dead=false;
    Object.assign(player,{ x:W*0.5-18, y:300, vx:0, vy:0, onGround:false, jumpsLeft:2 });
    let y=360; for(let i=0;i<6;i++){ const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN,W-P_MARGIN-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); y-=ri(P_GAP_Y_MIN,P_GAP_Y_MAX);} spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }

  function setGoalForLevel(){ dynamicLevelHeight=levelLengthFor(activeLevel); goalY=playerStartY - dynamicLevelHeight; const w=ri(P_W_MIN,P_W_MAX), x=ri(P_MARGIN, W-P_MARGIN-w), platY=goalY+28; const plat={x, y:platY, w, h:20}; platforms.push(plat); FINAL_PLAT=plat; touchedFinalPlatform=false; const gx=x+w*0.5-18; GOAL={x:gx, y:goalY-60, w:36, h:120, reached:false}; }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); applyDifficulty(); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); levelEl && (levelEl.textContent=String(activeLevel)); syncUiVisibility(); incStat('runs',1); }
  function nextLevel(){ const next=Math.min(MAX_LEVEL, activeLevel+1); incStat('levelsCompleted',1); setMaxLevel(Math.max(next, activeLevel)); startLevel(next); }

  function onDeath(){ if(dead) return; dead=true; state='waiting'; const earned=Math.floor(levelProgress/5)+runPoints; addPointsToStats(earned); saveWallet(loadWallet()+earned); resetWorld(); showOverlay(`Retry Level ${activeLevel}`); syncUiVisibility(); }

  function updateHUD(){ if(scoreEl) scoreEl.textContent=String(levelProgress); if(hiscoreEl) hiscoreEl.textContent=String(Number(localStorage.getItem(K.HISCORE)||0)); if(levelEl) levelEl.textContent=String(activeLevel); }
  function syncUiVisibility(){ if(!mobileBar) return; const hide=(state==='playing'); mobileBar.classList.toggle('hidden', hide); }

  function drawProgressBar(ctx,x,y,w,h,progress){ const p=Math.max(0,Math.min(1,progress)); ctx.save(); ctx.fillStyle='rgba(23,35,53,0.9)'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#7cd1f9'; ctx.fillRect(x,y,Math.max(h,Math.floor(w*p)),h); ctx.restore(); }
  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let y=0;y<bh;y+=6){ for(let x=0;x<bw;x+=6){ if(((x+y)/6)%2===0) ctx.fillRect(x,6+y,6,6);} } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function drawShadow(px,py,pw,ph){ let gy=null; for(const p of platforms){ if(px+pw>p.x && px<p.x+p.w && p.y>=py+ph-1){ gy=(gy===null? p.y : Math.min(gy,p.y)); } } if(gy===null) return; const dist=gy-(py+ph); const t=Math.max(0,Math.min(1,1 - dist/220)); const scale=0.6+0.4*t; const alpha=0.15+0.25*t; const cx=px+pw/2, cy=gy + 2 - cameraY; const rw=pw*0.9*scale, rh=8*scale; ctx.save(); ctx.fillStyle=`rgba(0,0,0,${alpha.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(cx,cy,rw/2,rh/2,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function draw(){ const V=visuals(); ctx.fillStyle=V.bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=V.bg2; ctx.fillRect(0,0,W,H*0.6); ctx.fillStyle=V.para; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} ctx.fillStyle=V.platform; for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 20);} for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#e9c46a'; ctx.lineWidth=2; ctx.stroke(); }
    const tint=V.enemyTint; const tintAlpha=0.28; for(const e of enemies){ if(!e.alive) continue; const dx=e.x, dy=e.y-cameraY; ctx.save(); ctx.translate(dx,dy); if(e.dir<0){ ctx.translate(e.w,0); ctx.scale(-1,1);} ctx.fillStyle='#f97098'; ctx.fillRect(0,0,e.w,e.h); ctx.globalCompositeOperation='source-atop'; ctx.globalAlpha=tintAlpha; ctx.fillStyle=tint; ctx.fillRect(0,0,e.w,e.h); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; ctx.restore(); }
    drawShadow(player.x,player.y,player.w,player.h); ctx.fillStyle='#7cd1f9'; ctx.fillRect(player.x, player.y-cameraY, player.w, player.h); if(GOAL){ drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h); }
    const p = Math.max(0, Math.min(1, levelProgress / dynamicLevelHeight)); drawProgressBar(ctx, 10, 8, W-20, 8, p); if(state==='waiting'){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(0,0,W,H); }
  }

  function update(dt){ if(state==='playing') addTime(dt);
    // Left/right
    if(moveLeft && !moveRight) player.vx=Math.max(player.vx-MOVE_ACC*dt,-MOVE_MAX);
    else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+MOVE_ACC*dt, MOVE_MAX);
    else { if(player.vx>0) player.vx=Math.max(0,player.vx-FRICTION*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+FRICTION*dt); }
    // Jump
    if(jumpQueued && state==='playing'){ tryJump(); jumpQueued=false; }
    // Integrate
    player.vy+=GRAVITY*dt; if(player.vy>MAX_FALL) player.vy=MAX_FALL; player.x+=player.vx*dt; player.y+=player.vy*dt; if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0;
    // Platform collisions (falling only)
    let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, '#8fb6ff', 6, 160);} player.onGround=true; if(p===FINAL_PLAT) touchedFinalPlatform=true; break; } } } if(!landed && player.vy!==0) player.onGround=false;
    // Coins
    for(const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; incStat('coins',1); runPoints+=10; play('coin'); burst(c.x+c.w/2, c.y+c.h/2, '#ffd166', 8, 180);} }
    // Enemies
    for(const e of enemies){ if(!e.alive) continue; e.anim+=dt; if(e.type==='slime'){ e.x+=e.dir*e.speed*dt; if(e.x<e.left){e.x=e.left;e.dir=1;} if(e.x>e.right){e.x=e.right;e.dir=-1;} } else if(e.type==='bat'){ e.x+=e.dir*e.speed*dt; if(e.x<e.left){e.x=e.left;e.dir=1;} if(e.x>e.right){e.x=e.right;e.dir=-1;} e.t=(e.t||0)+dt*4; e.y += Math.sin(e.t) * 24 * dt * 8; } if(aabb(player,e)){ const feet=player.y+player.h; const stompY=e.y+e.h*0.38; if(player.vy>120 && feet - player.vy*dt <= stompY){ e.alive=false; runPoints+=20; incStat('stomps',1); player.vy=JUMP_V*0.7; burst(e.x+e.w/2, e.y+e.h/2, '#f97098', 12, 220); play('coin'); } else { play('hit'); incStat('deaths',1); return onDeath(); } } }
    // Camera & progress
    const targetCam=Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); if(height>hiscore){ hiscore=height; localStorage.setItem(K.HISCORE,String(hiscore)); }
    // Finish: must land on final platform first
    if(GOAL && !GOAL.reached && touchedFinalPlatform && aabb(player,GOAL)){ GOAL.reached=true; burst(GOAL.x+GOAL.w/2, GOAL.y+10, '#7de07d', 20, 260); state='waiting'; nextLevel(); return; }
    // FALL-DEATH: if player goes below screen, trigger death
    if((player.y - cameraY) > (H + 60)) { play('hit'); incStat('deaths',1); return onDeath(); }
    // Cleanup & spawn
    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); while(enemies.length && enemies[0].y>cut) enemies.shift(); ensureSpawn(); updateHUD(); }

  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; hideOverlay(); } syncUiVisibility(); });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });
  levelAction && levelAction.addEventListener('click', ()=>{ hideOverlay(); state='playing'; syncUiVisibility(); });

  // Boot
  applyDifficulty(); resetWorld(); showOverlay('Start Level 1'); syncUiVisibility();
  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-last)/1000,0.033); last=now; if(state==='playing') update(dt); draw(); } requestAnimationFrame(loop);
})();
