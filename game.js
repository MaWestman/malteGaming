
// v5.3.3d game.js — Action button centered INSIDE the game screen
// - The Start/Retry/Continue button (#levelActionDock) is rendered as a centered overlay over the canvas
// - Top menu remains outside at the top of the page (from v5.3.3c)
// - Retry fix + flag-on-platform kept
(() => {
  'use strict';
  const W=800,H=450,MAX_LEVEL=100; const K={HISCORE:'hiscore',WALLET:'wallet',STATS:'stats',MAXLVL:'maxLevelReached'};

  // Canvas
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scale(){ const d=Math.max(1,Math.floor(devicePixelRatio||1)); canvas.width=W*d; canvas.height=H*d; ctx.setTransform(d,0,0,d,0,0);} scale(); addEventListener('resize',scale,{passive:true});

  // Top menu controls
  const btnPause=document.getElementById('btnPause');
  const btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump');
  const btnLeft=document.getElementById('btnLeft');
  const btnRight=document.getElementById('btnRight');

  // HUD / legacy overlay refs
  const scoreEl=document.getElementById('score'); const hiscoreEl=document.getElementById('hiscore'); const levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'); const levelAction=document.getElementById('levelAction');

  // === Create centered DOCK overlay inside the game stage ===
  const stage=document.querySelector('.stage');
  const dock=document.createElement('div');
  dock.id='levelDock';
  dock.className='dock-overlay hidden';
  dock.innerHTML = '<button id="levelActionDock" class="level-btn">Start Level 1</button>';
  stage && stage.appendChild(dock);

  // Inject minimal CSS so the dock is centered over the canvas
  const style=document.createElement('style');
  style.textContent = `
    .dock-overlay{ position:absolute; inset:0; display:grid; place-items:center; z-index:30; pointer-events:auto; }
    .dock-overlay.hidden{ display:none !important; }
  `;
  document.head.appendChild(style);

  const levelActionDock = dock.querySelector('#levelActionDock');

  // Audio
  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav'), win:new Audio('assets/audio/win.wav') };
  Object.values(sfx).forEach(a=>{ a.preload='auto'; a.volume=.28; });

  // World
  const THEME={ platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' };
  let state='waiting', pendingNext=false, retryPending=false, dead=false, shownOverlayAfterWin=false;
  let last=performance.now(), cameraY=0, spawnY=H, bestY=0, playerStartY=300, runPoints=0;
  let activeLevel=1, levelProgress=0, dynamicLevelHeight=1000;
  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:2 };
  const platforms=[], coins=[], parts=[]; let GOAL=null, FINAL_PLAT=null, goalY=0; let celebrateT=0;

  // Params
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000, COIN=18; let moveLeft=false, moveRight=false, jumpQueued=false;

  // Helpers
  const r=(a,b)=>Math.random()*(b-a)+a, ri=(a,b)=>Math.floor(r(a,b));
  const aabb=(a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  function emit(c,x,y,vx,vy,life=.6,size=3){ parts.push({c,x,y,vx,vy,life,size}); }
  function burst(x,y,cnt=18,spd=260){ const pal=['#7de07d','#ffd166','#7cd1f9','#f97098','#c084fc']; for(let i=0;i<cnt;i++){ const A=Math.random()*Math.PI*2,S=spd*(0.35+Math.random()*0.9); emit(pal[i%pal.length],x,y,Math.cos(A)*S,Math.sin(A)*S,0.5+Math.random()*0.6,3+Math.random()*2);} }

  // Overlay/Dock control — center in screen
  function showOverlay(text){
    // Always use centered dock overlay; keep any legacy overlay hidden
    levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none');
    if(levelActionDock) levelActionDock.textContent=text;
    dock && dock.classList.remove('hidden');
  }
  function hideOverlay(){
    levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none');
    dock && dock.classList.add('hidden');
  }

  // Input
  function queueJump(){ jumpQueued=true; try{ sfx.jump.currentTime=0; sfx.jump.play().catch(()=>{});}catch{} }
  addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(state==='celebrating' && pendingNext) return onContinueNext(); queueJump(); } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', ()=>{ if(state==='celebrating' && pendingNext) return onContinueNext(); queueJump(); });
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  // HUD
  function updateHUD(){ scoreEl&&(scoreEl.textContent=String(levelProgress)); levelEl&&(levelEl.textContent=String(activeLevel)); const h=Number(localStorage.getItem(K.HISCORE)||0); hiscoreEl&&(hiscoreEl.textContent=String(h)); }

  // Level
  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; return Math.round((base+(Math.max(1,n)-1)*per)*bonus); }
  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }
  function ensureSpawn(){ const target=cameraY-200; const ceiling=Math.min(target, goalY-120); while(spawnY>ceiling){ const w=ri(90,180), x=ri(30,W-30-w), y=spawnY-ri(70,130); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); spawnY=y; } }
  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=0; GOAL=null; FINAL_PLAT=null; dead=false; celebrateT=0; pendingNext=false; shownOverlayAfterWin=false; Object.assign(player,{x:W*0.5-18,y:300,vx:0,vy:0,onGround:false,jumpsLeft:2}); let y=360; for(let i=0;i<6;i++){ const w=ri(90,180), x=ri(30,W-30-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2, y:y-32, w:COIN, h:COIN, active:true}); y-=ri(70,130);} spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }
  function setGoalForLevel(){ dynamicLevelHeight=levelLengthFor(activeLevel); goalY=playerStartY-dynamicLevelHeight; const platY=goalY+10; const plat={x:0,y:platY,w:W,h:24}; platforms.push(plat); FINAL_PLAT=plat; const flagW=36,flagH=120,gx=Math.floor(W/2-flagW/2); GOAL={x:gx, y:platY-flagH, w:flagW, h:flagH, reached:false}; }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); }
  function retryNow(){ retryPending=false; resetWorld(); hideOverlay(); state='playing'; }
  function nextLevel(){ const nxt=Math.min(MAX_LEVEL, activeLevel+1); startLevel(nxt); }
  function onDeath(){ dead=true; retryPending=true; state='waiting'; showOverlay(`Retry Level ${activeLevel}`); }

  function onContinueNext(){ pendingNext=false; hideOverlay(); nextLevel(); }
  function handleActionClick(){ if(pendingNext) return onContinueNext(); if(retryPending) return retryNow(); hideOverlay(); state='playing'; }
  ;['click','pointerdown','touchstart'].forEach(ev=>{
    levelAction && levelAction.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); });
    levelActionDock && levelActionDock.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); });
  });

  // Pause/Restart
  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; hideOverlay(); } });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });

  // Update/Draw
  function tryJump(){ if(player.jumpsLeft>0 && state==='playing'){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; burst(player.x+player.w/2, player.y+player.h/2, 12, 240); } }
  function update(dt){ for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; if(p.life<=0) parts.splice(i,1);} if(state==='celebrating'){ celebrateT-=dt; if(celebrateT<=0 && !pendingNext){ state='waiting'; pendingNext=true; showOverlay('Level Complete! Continue ▶'); } return; } if(state!=='playing') return; if(moveLeft && !moveRight) player.vx=Math.max(player.vx-2200*dt,-360); else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+2200*dt,360); else { if(player.vx>0) player.vx=Math.max(0,player.vx-2000*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+2000*dt);} if(jumpQueued){ tryJump(); jumpQueued=false; } player.vy+=2200*dt; if(player.vy>1700) player.vy=1700; player.x+=player.vx*dt; player.y+=player.vy*dt; if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0; let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, 6, 160);} player.onGround=true; break; } } } if(!landed && player.vy!==0) player.onGround=false; for(const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; runPoints+=10; burst(c.x+c.w/2, c.y+c.h/2, 8, 180);} } const targetCam=Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); const h=Number(localStorage.getItem(K.HISCORE)||0); if(height>h) localStorage.setItem(K.HISCORE,String(height)); if(GOAL && !GOAL.reached && aabb(player,GOAL)){ GOAL.reached=true; return celebrate(); } if((player.y - cameraY) > (H + 60)) { return onDeath(); } const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); ensureSpawn(); updateHUD(); }
  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let yy=0;yy<bh;yy+=6){ for(let xx=0;xx<bw;xx+=6){ if(((xx+yy)/6)%2===0) ctx.fillRect(xx,6+yy,6,6);} } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function draw(){ ctx.fillStyle=THEME.bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=THEME.bg2; ctx.fillRect(0,0,W,H*0.6); ctx.fillStyle=THEME.para; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} ctx.fillStyle=THEME.platform; for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 24);} for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); } ctx.fillStyle='#7cd1f9'; ctx.fillRect(player.x, player.y-cameraY, player.w, player.h); if(GOAL){ drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h); } for(const p of parts){ const a=Math.max(0,Math.min(1,p.life*2)); ctx.globalAlpha=a; ctx.fillStyle=p.c; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s);} ctx.globalAlpha=1; }
  function celebrate(){ try{ sfx.win.currentTime=0; sfx.win.play().catch(()=>{});}catch{} const cx=GOAL.x+GOAL.w/2, cy=GOAL.y+10; burst(cx,cy,26,340); celebrateT=2.0; state='celebrating'; }

  // Boot
  function boot(){ startLevel(1); showOverlay('Start Level 1'); function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-(window.__t||now))/1000,0.033); window.__t=now; if(state==='playing'||state==='celebrating') update(dt); draw(); } requestAnimationFrame(loop);} boot();
})();
