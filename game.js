
(()=>{
  'use strict';
  const W=800,H=450,MAX_LEVEL=100; const K={HISCORE:'hiscore',WALLET:'wallet',STATS:'stats',MAXLVL:'maxLevelReached',EQUIPPED:'equipped'};
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scale(){ const d=Math.max(1,Math.floor(devicePixelRatio||1)); canvas.width=W*d; canvas.height=H*d; ctx.setTransform(d,0,0,d,0,0); } scale(); addEventListener('resize',scale,{passive:true});

  // top menu controls
  const btnPause=document.getElementById('btnPause'); const btnRestart=document.getElementById('btnRestart');
  const btnJump=document.getElementById('btnJump'); const btnLeft=document.getElementById('btnLeft'); const btnRight=document.getElementById('btnRight');
  const scoreEl=document.getElementById('score'); const hiscoreEl=document.getElementById('hiscore'); const levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'); const levelAction=document.getElementById('levelAction');

  // Centered dock overlay
  const stage=document.querySelector('.stage'); const dock=document.createElement('div'); dock.id='levelDock'; dock.className='dock-overlay hidden'; dock.innerHTML='<button id="levelActionDock" class="level-btn">Start Level 1</button>'; stage && stage.appendChild(dock);
  const css=document.createElement('style'); css.textContent='.dock-overlay{position:absolute;inset:0;display:grid;place-items:center;z-index:30}.dock-overlay.hidden{display:none !important}'; document.head.appendChild(css);
  const levelActionDock=document.getElementById('levelActionDock');

  // Audio
  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav'), win:new Audio('assets/audio/win.wav') }; Object.values(sfx).forEach(a=>{a.preload='auto'; a.volume=.28;});

  // EQUIPPED VISUALS
  function loadEquipped(){ try{ return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}') } catch { return {}; } }
  function ensureEquipped(){ const eq=loadEquipped(); if(!eq.theme) eq.theme='theme-default'; if(!eq.skin) eq.skin='skin-default'; if(!eq.background) eq.background='bg-default'; if(!eq.accessories) eq.accessories={head:null,eyes:null,aura:null,trail:null}; localStorage.setItem(K.EQUIPPED,JSON.stringify(eq)); return eq; }

  let EQ=ensureEquipped();

  // Theme/backdrop & skin defaults
  let THEME={ platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' };
  let SKIN={ color:'#7cd1f9', flash:false, flashAlt:'#ffffff' };
  let FX={ aura:null, trail:null, head:null, eyes:null, bgAnimated:false, themeFlash:false, snow:false, stars:false, pitch:false };

  function applyEquipped(){
    EQ=ensureEquipped();
    // THEMES mapping
    const themeMap={
      'theme-default': {platform:'#5e81ac',bg1:'#0f1a2b',bg2:'#162238',flash:false},
      'theme-neon': {platform:'#00f5d4',bg1:'#0b1020',bg2:'#111a33',flash:false},
      'theme-voltage': {platform:'#ffd166',bg1:'#101010',bg2:'#1c1c1c',flash:true},
      'theme-sunset': {platform:'#f28482',bg1:'#2a2138',bg2:'#452650',flash:false},
      'theme-winter': {platform:'#bfe6ff',bg1:'#071520',bg2:'#0e2a40',flash:false},
      'theme-football': {platform:'#2ecc71',bg1:'#061a10',bg2:'#0c2e1c',flash:false},
      'theme-space': {platform:'#a5b4fc',bg1:'#080a12',bg2:'#12172a',flash:true},
      'theme-aurora': {platform:'#90e0ef',bg1:'#07121f',bg2:'#12304b',flash:true}
    };
    const t=themeMap[EQ.theme]||themeMap['theme-default']; THEME.platform=t.platform; THEME.bg1=t.bg1; THEME.bg2=t.bg2; FX.themeFlash=!!t.flash;

    // BACKGROUNDS flags
    const animated={'bg-stars':true,'bg-rainbow':true,'bg-nebula':true,'bg-cosmos':true,'bg-snow':true};
    FX.bgAnimated=!!animated[EQ.background];
    FX.snow = (EQ.background==='bg-snow' || EQ.theme==='theme-winter');
    FX.stars = (EQ.background in {'bg-stars':1,'bg-nebula':1,'bg-cosmos':1} or False) or (EQ.theme==='theme-space');
    FX.pitch = (EQ.background==='bg-pitch' or EQ.theme==='theme-football');

    // SKINS
    const skinMap={
      'skin-default': {color:'#7cd1f9',flash:false,flashAlt:'#ffffff'},
      'skin-lime': {color:'#a3f7bf',flash:false},
      'skin-red': {color:'#ff6b6b',flash:false},
      'skin-ice': {color:'#bfe6ff',flash:false},
      'skin-neon-pulse': {color:'#00f5d4',flash:true,flashAlt:'#ffef5a'},
      'skin-royal': {color:'#a78bfa',flash:false},
      'skin-astro': {color:'#50fa7b',flash:true,flashAlt:'#8be9fd'},
      'skin-gold-legend': {color:'#f6c453',flash:true,flashAlt:'#fff1a6'}
    };
    SKIN=skinMap[EQ.skin]||skinMap['skin-default'];

    // ACCESSORIES
    FX.head=EQ.accessories?.head||null; FX.eyes=EQ.accessories?.eyes||null; FX.aura=EQ.accessories?.aura||null; FX.trail=EQ.accessories?.trail||null;
  }

  applyEquipped();

  // World state
  let state='waiting', pendingNext=false, retryPending=false, dead=false, shownOverlayAfterWin=false;
  let last=performance.now(), cameraY=0, spawnY=H, bestY=0, playerStartY=300, runPoints=0;
  let activeLevel=1, levelProgress=0, dynamicLevelHeight=1000;
  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:2 };
  const platforms=[], coins=[], parts=[]; let GOAL=null, FINAL_PLAT=null, goalY=0; let celebrateT=0;

  // Params
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000, COIN=18; let moveLeft=false, moveRight=false, jumpQueued=false;

  // Stats helpers
  function loadStats(){ try{ return JSON.parse(localStorage.getItem('stats')||'{}') } catch { return {}; } }
  function saveStats(s){ localStorage.setItem('stats', JSON.stringify(s)); }
  function incStat(k,by=1){ const s=loadStats(); s[k]=(s[k]||0)+by; saveStats(s); }

  // Overlay control
  function showOverlay(text){ levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none'); levelActionDock && (levelActionDock.textContent=text); dock && dock.classList.remove('hidden'); }
  function hideOverlay(){ levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none'); dock && dock.classList.add('hidden'); }

  // Input
  function queueJump(){ jumpQueued=true; try{ sfx.jump.currentTime=0; sfx.jump.play().catch(()=>{});}catch{} }
  addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(state==='celebrating' && pendingNext) return onContinueNext(); queueJump(); incStat('jumps',1); } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });
  btnJump && btnJump.addEventListener('pointerdown', ()=>{ if(state==='celebrating' && pendingNext) return onContinueNext(); incStat('jumps',1); queueJump(); });
  function hold(btn,set){ if(!btn) return; const on=()=>set(true), off=()=>set(false); btn.addEventListener('pointerdown',on); ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off)); }
  hold(btnLeft,v=>moveLeft=v); hold(btnRight,v=>moveRight=v);

  // Utils
  const aabb=(a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  function emit(c,x,y,vx,vy,life=.6,size=3){ parts.push({c,x,y,vx,vy,life,size}); }
  function burst(x,y,cnt=18,spd=260){ const pal=['#7de07d','#ffd166','#7cd1f9','#f97098','#c084fc']; for(let i=0;i<cnt;i++){ const A=Math.random()*Math.PI*2,S=spd*(0.35+Math.random()*0.9); emit(pal[i%pal.length],x,y,Math.cos(A)*S,Math.sin(A)*S,0.5+Math.random()*0.6,3+Math.random()*2);} }

  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; return Math.round((base+(Math.max(1,n)-1)*per)*bonus); }
  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }
  function ensureSpawn(){ const target=cameraY-200; const ceiling=Math.min(target, goalY-120); while(spawnY>ceiling){ const w=90+Math.floor(Math.random()*90), x=30+Math.floor(Math.random()*(W-60-w)), y=spawnY-(70+Math.floor(Math.random()*60)); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2,y:y-32,w:COIN,h:COIN,active:true}); spawnY=y; } }

  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=0; GOAL=null; FINAL_PLAT=null; dead=false; celebrateT=0; pendingNext=false; shownOverlayAfterWin=false; applyEquipped();
    Object.assign(player,{x:W*0.5-18,y:300,vx:0,vy:0,onGround:false,jumpsLeft:2});
    let y=360; for(let i=0;i<6;i++){ const w=90+Math.floor(Math.random()*90), x=30+Math.floor(Math.random()*(W-60-w)); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2,y:y-32,w:COIN,h:COIN,active:true}); y-=(70+Math.floor(Math.random()*60)); } spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }

  function setGoalForLevel(){ dynamicLevelHeight=levelLengthFor(activeLevel); goalY=playerStartY-dynamicLevelHeight; const platY=goalY+10; const plat={x:0,y:platY,w:W,h:24}; platforms.push(plat); FINAL_PLAT=plat; const flagW=36,flagH=120,gx=Math.floor(W/2-flagW/2); GOAL={x:gx,y:platY-flagH,w:flagW,h:flagH,reached:false}; }

  // Flow
  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); }
  function retryNow(){ retryPending=false; resetWorld(); hideOverlay(); state='playing'; }
  function nextLevel(){ const nxt=Math.min(MAX_LEVEL, activeLevel+1); startLevel(nxt); }
  function onDeath(){ dead=true; retryPending=true; state='waiting'; showOverlay(`Retry Level ${activeLevel}`); }
  function onContinueNext(){ pendingNext=false; hideOverlay(); nextLevel(); }
  function handleActionClick(){ if(pendingNext) return onContinueNext(); if(retryPending) return retryNow(); hideOverlay(); state='playing'; }
  ;['click','pointerdown','touchstart'].forEach(ev=>{ levelAction && levelAction.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); }); levelActionDock && levelActionDock.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); }); });

  // Pause/Restart
  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; hideOverlay(); } });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });

  // HUD helpers
  function updateHUD(){ scoreEl&&(scoreEl.textContent=String(levelProgress)); levelEl&&(levelEl.textContent=String(activeLevel)); const h=Number(localStorage.getItem(K.HISCORE)||0); hiscoreEl&&(hiscoreEl.textContent=String(h)); }

  // FX helpers
  const snowFlakes=[]; function updateSnow(dt){ if(!FX.snow) return; // add flakes
    while(snowFlakes.length<70){ snowFlakes.push({x:Math.random()*W, y:cameraY-20-Math.random()*H, v:30+Math.random()*50, r:1+Math.random()*2}); }
    for(const f of snowFlakes){ f.y += f.v*dt; if(f.y>cameraY+H+10){ f.y=cameraY-10-Math.random()*H; f.x=Math.random()*W; } }
  }
  const starField=[]; function updateStars(){ if(!FX.stars) return; if(starField.length===0){ for(let i=0;i<80;i++){ starField.push({x:Math.random()*W, y:Math.random()*H}); } } }

  function colorForSkin(){ if(!SKIN.flash) return SKIN.color; return (Math.floor(performance.now()/250)%2)? SKIN.flashAlt : SKIN.color; }
  function themePlatformColor(){ if(!FX.themeFlash) return THEME.platform; return (Math.floor(performance.now()/350)%2)? '#ffffff' : THEME.platform; }

  // Update/draw
  function tryJump(){ if(player.jumpsLeft>0 && state==='playing'){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; burst(player.x+player.w/2, player.y+player.h/2, 12, 240); } }
  function update(dt){
    for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; if(p.life<=0) parts.splice(i,1); }
    updateSnow(dt); updateStars();
    if(state==='celebrating'){ celebrateT-=dt; if(celebrateT<=0 && !pendingNext){ state='waiting'; pendingNext=true; showOverlay('Level Complete! Continue ▶'); } return; }
    if(state!=='playing') return; // paused or waiting

    if(moveLeft && !moveRight) player.vx=Math.max(player.vx-MOVE_ACC*dt,-MOVE_MAX);
    else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+MOVE_ACC*dt, MOVE_MAX);
    else { if(player.vx>0) player.vx=Math.max(0,player.vx-FRICTION*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+FRICTION*dt); }

    if(jumpQueued){ tryJump(); jumpQueued=false; }

    player.vy+=GRAVITY*dt; if(player.vy>MAX_FALL) player.vy=MAX_FALL; player.x+=player.vx*dt; player.y+=player.vy*dt; if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0;

    let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, '#8fb6ff', 6, 160);} player.onGround=true; break; } } } if(!landed && player.vy!==0) player.onGround=false;

    for(const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; incStat('coins',1); runPoints+=10; try{ sfx.coin.currentTime=0; sfx.coin.play().catch(()=>{});}catch{} burst(c.x+c.w/2, c.y+c.h/2, 8, 180); } }

    const targetCam=Math.min(cameraY, player.y - H*0.4); cameraY=targetCam; const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); let h=Number(localStorage.getItem(K.HISCORE)||0); if(height>h){ h=height; localStorage.setItem(K.HISCORE, String(h)); } hiscoreEl && (hiscoreEl.textContent=String(h));

    if(GOAL && !GOAL.reached && aabb(player,GOAL)){ GOAL.reached=true; return celebrate(); }

    if((player.y - cameraY) > (H + 60)) { return onDeath(); }

    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); ensureSpawn(); updateHUD();

    // Trails
    if(FX.trail){ let col='#ffffffaa'; if(FX.trail==='trail-comet') col = ['#ffd166','#ffa7c4','#a78bfa'][Math.floor((performance.now()/160)%3)]; if(FX.trail==='trail-ghost') col='rgba(255,255,255,0.35)'; if(FX.trail==='trail-snow') col='#bfe6ffaa'; emit(col, player.x+player.w/2, player.y+player.h, (Math.random()*40-20), 60, .4, 2); }
  }

  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let yy=0;yy<bh;yy+=6){ for(let xx=0;xx<bw;xx+=6){ if(((xx+yy)/6)%2===0) ctx.fillRect(xx,6+yy,6,6);} } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function draw(){
    // background
    const t = performance.now()/1000;
    let bg1=THEME.bg1, bg2=THEME.bg2;
    if(FX.bgAnimated){ const pal=[THEME.bg1, THEME.bg2, '#1e3a8a', '#3b82f6', '#9333ea']; const i=Math.floor((t*1.2)%pal.length); bg1=pal[i]; bg2=pal[(i+1)%pal.length]; }
    ctx.fillStyle=bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=bg2; ctx.fillRect(0,0,W,H*0.6);

    // pitch stripes
    if(FX.pitch){ ctx.save(); ctx.globalAlpha=0.08; ctx.fillStyle='#ffffff'; for(let i=0;i<6;i++){ const y=i*(H/6); ctx.fillRect(0,y,W,6); } ctx.restore(); }

    // parallax blocks
    ctx.fillStyle='#0b192c'; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} 

    // stars overlay
    if(FX.stars){ ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; for(const s of starField){ const y=s.y - (cameraY*0.1 % H); ctx.fillRect(s.x, y, 1, 1); } ctx.restore(); }

    // platforms
    ctx.fillStyle=themePlatformColor(); for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 24);} 

    // snow overlay
    if(FX.snow){ ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; for(const f of snowFlakes){ ctx.beginPath(); ctx.arc(f.x, f.y - cameraY, f.r, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }

    // coins
    for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }

    // aura
    if(FX.aura){ ctx.save(); let auraColor='rgba(124,209,249,0.35)'; if(FX.aura==='aura-gold') auraColor='rgba(255,209,102,0.45)'; if(FX.aura==='aura-snow') auraColor='rgba(191,230,255,0.45)'; if(FX.aura==='aura-space') auraColor='rgba(167,139,250,0.40)'; if(FX.aura==='aura-team') auraColor='rgba(46,204,113,0.40)'; const cxp=player.x+player.w/2, cyp=player.y+player.h/2 - cameraY; const r=80+Math.sin(performance.now()/200)*6; const g=ctx.createRadialGradient(cxp,cyp,10,cxp,cyp,r); g.addColorStop(0,auraColor); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cxp,cyp,r,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // player
    ctx.fillStyle=colorForSkin(); ctx.fillRect(player.x, player.y-cameraY, player.w, player.h);

    // headwear
    if(FX.head){ ctx.save(); ctx.translate(0,0); if(FX.head==='hat-crown'){ ctx.fillStyle='#ffd166'; ctx.beginPath(); const x=player.x+6, y=player.y-cameraY-6; ctx.moveTo(x,y); ctx.lineTo(x+8,y-8); ctx.lineTo(x+16,y); ctx.lineTo(x+24,y-8); ctx.lineTo(x+32,y); ctx.closePath(); ctx.fill(); } else if(FX.head==='head-helmet'){ ctx.fillStyle='#2ecc71'; ctx.fillRect(player.x+4, player.y-cameraY-10, 28, 10); ctx.fillStyle='#111'; ctx.fillRect(player.x+6, player.y-cameraY-6, 24, 3); } else if(FX.head==='hat-santa'){ ctx.fillStyle='#ff4d4d'; ctx.fillRect(player.x+4, player.y-cameraY-10, 28, 8); ctx.fillStyle='#fff'; ctx.fillRect(player.x+4, player.y-cameraY-2, 28, 2); } else if(FX.head==='hat-pumpkin'){ ctx.fillStyle='#ff8c00'; ctx.fillRect(player.x+6, player.y-cameraY-10, 24, 10); } else { ctx.fillStyle='#ffd166'; ctx.fillRect(player.x+6, player.y-cameraY-6, 24, 6); } ctx.restore(); }

    // eyes
    if(FX.eyes){ ctx.fillStyle='#111'; const ex=player.x+8, ey=player.y-cameraY+12; ctx.fillRect(ex,ey,6,6); ctx.fillRect(ex+18,ey,6,6); }

    // flag
    if(GOAL){ drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h); }

    // particles
    for(const p of parts){ const a=Math.max(0,Math.min(1,p.life*2)); ctx.globalAlpha=a; ctx.fillStyle=p.c; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s);} ctx.globalAlpha=1;
  }

  function celebrate(){ try{ sfx.win.currentTime=0; sfx.win.play().catch(()=>{});}catch{} const cx=GOAL.x+GOAL.w/2, cy=GOAL.y+10; burst(cx,cy,26,340); celebrateT=2.0; state='celebrating'; }

  // Boot
  function boot(){ startLevel(1); showOverlay('Start Level 1'); function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-(window.__t||now))/1000,0.033); window.__t=now; if(state==='playing'||state==='celebrating') update(dt); draw(); } requestAnimationFrame(loop);} boot();
})();
