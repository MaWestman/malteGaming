
(()=>{
  'use strict';
  const W=800,H=450,MAX_LEVEL=100; const K={HISCORE:'hiscore',STATS:'stats',EQUIPPED:'equipped'};
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function scale(){ const d=Math.max(1,Math.floor(devicePixelRatio||1)); canvas.width=W*d; canvas.height=H*d; ctx.setTransform(d,0,0,d,0,0); } scale(); addEventListener('resize',scale,{passive:true});

  // UI refs
  const btnPause=document.getElementById('btnPause'); const btnRestart=document.getElementById('btnRestart');
  const scoreEl=document.getElementById('score'); const hiscoreEl=document.getElementById('hiscore'); const levelEl=document.getElementById('level');
  const levelOverlay=document.getElementById('levelOverlay'); const levelAction=document.getElementById('levelAction');
  const stage=document.querySelector('.stage');

  // Centered dock overlay
  const dock=document.createElement('div'); dock.id='levelDock'; dock.className='dock-overlay hidden'; dock.innerHTML='<button id="levelActionDock" class="level-btn">Start Level 1</button>'; stage && stage.appendChild(dock);
  const cssDock=document.createElement('style'); cssDock.textContent='.dock-overlay{position:absolute;inset:0;display:grid;place-items:center;z-index:30}.dock-overlay.hidden{display:none !important}'; document.head.appendChild(cssDock);
  const levelActionDock=document.getElementById('levelActionDock');

  // Fullscreen toggle button
  const fullBtn=document.createElement('button'); fullBtn.className='full-btn'; fullBtn.id='btnFullscreen'; fullBtn.type='button'; fullBtn.title='Fullscreen'; fullBtn.setAttribute('aria-label','Enter fullscreen'); fullBtn.textContent='⛶'; stage && stage.appendChild(fullBtn);
  function isFullscreen(){ return !!(document.fullscreenElement||document.webkitFullscreenElement||document.msFullscreenElement); }
  async function enterFullscreen(){ try{ if(stage.requestFullscreen) await stage.requestFullscreen({navigationUI:'hide'}); else if(stage.webkitRequestFullscreen) stage.webkitRequestFullscreen(); else if(stage.msRequestFullscreen) stage.msRequestFullscreen(); }catch{} }
  async function exitFullscreen(){ try{ if(document.exitFullscreen) await document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen(); else if(document.msExitFullscreen) document.msExitFullscreen(); }catch{} }
  function updateFsUI(){ if(isFullscreen()){ fullBtn.textContent='⤢'; fullBtn.title='Exit fullscreen'; fullBtn.setAttribute('aria-label','Exit fullscreen'); } else { fullBtn.textContent='⛶'; fullBtn.title='Fullscreen'; fullBtn.setAttribute('aria-label','Enter fullscreen'); } }
  fullBtn.addEventListener('click',()=>{ if(isFullscreen()) exitFullscreen(); else enterFullscreen(); });
  document.addEventListener('fullscreenchange',updateFsUI); document.addEventListener('webkitfullscreenchange',updateFsUI);

  // SFX
  const sfx={ jump:new Audio('assets/audio/jump.wav'), coin:new Audio('assets/audio/coin.wav'), hit:new Audio('assets/audio/hit.wav'), win:new Audio('assets/audio/win.wav') }; try{ Object.values(sfx).forEach(a=>{a.preload='auto'; a.volume=.28;}); }catch{}

  // Sprites for enemies (if not found, we fall back to rectangles)
  const imgBat=new Image(); imgBat.src='assets/images/sprites/enemy-bat.png';
  const imgSlime=new Image(); imgSlime.src='assets/images/sprites/enemy-slime.png';

  // Equipped / Theme
  function loadEquipped(){ try{ return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}') } catch { return {}; } }
  function ensureEquipped(){ const eq=loadEquipped(); if(!eq.theme) eq.theme='theme-default'; if(!eq.skin) eq.skin='skin-default'; if(!eq.background) eq.background='bg-default'; if(!eq.accessories) eq.accessories={head:null,eyes:null,aura:null,trail:null}; localStorage.setItem(K.EQUIPPED, JSON.stringify(eq)); return eq; }
  let EQ=ensureEquipped();

  let THEME={ platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238' };
  let SKIN={ color:'#7cd1f9', flash:false, flashAlt:'#ffffff' };
  let FX={ bgAnimated:false, themeFlash:false, snow:false, stars:false, pitch:false, aura:null, trail:null, head:null, eyes:null };
  function applyEquipped(){
    EQ=ensureEquipped();
    const themeMap={ 'theme-default':{platform:'#5e81ac',bg1:'#0f1a2b',bg2:'#162238',flash:false}, 'theme-neon':{platform:'#00f5d4',bg1:'#0b1020',bg2:'#111a33',flash:false}, 'theme-voltage':{platform:'#ffd166',bg1:'#101010',bg2:'#1c1c1c',flash:true}, 'theme-sunset':{platform:'#f28482',bg1:'#2a2138',bg2:'#452650',flash:false}, 'theme-winter':{platform:'#bfe6ff',bg1:'#071520',bg2:'#0e2a40',flash:false}, 'theme-football':{platform:'#2ecc71',bg1:'#061a10',bg2:'#0c2e1c',flash:false}, 'theme-space':{platform:'#a5b4fc',bg1:'#080a12',bg2:'#12172a',flash:true}, 'theme-aurora':{platform:'#90e0ef',bg1:'#07121f',bg2:'#12304b',flash:true} };
    const t=themeMap[EQ.theme]||themeMap['theme-default']; THEME.platform=t.platform; THEME.bg1=t.bg1; THEME.bg2=t.bg2; FX.themeFlash=!!t.flash;
    const animatedBg=new Set(['bg-stars','bg-rainbow','bg-nebula','bg-cosmos','bg-snow']); const starBgs=new Set(['bg-stars','bg-nebula','bg-cosmos']);
    FX.bgAnimated=animatedBg.has(EQ.background); FX.snow=(EQ.background==='bg-snow'||EQ.theme==='theme-winter'); FX.stars=(starBgs.has(EQ.background)||EQ.theme==='theme-space'); FX.pitch=(EQ.background==='bg-pitch'||EQ.theme==='theme-football');
    const skinMap={ 'skin-default':{color:'#7cd1f9',flash:false,flashAlt:'#ffffff'}, 'skin-lime':{color:'#a3f7bf',flash:false}, 'skin-red':{color:'#ff6b6b',flash:false}, 'skin-ice':{color:'#bfe6ff',flash:false}, 'skin-neon-pulse':{color:'#00f5d4',flash:true,flashAlt:'#ffef5a'}, 'skin-royal':{color:'#a78bfa',flash:false}, 'skin-astro':{color:'#50fa7b',flash:true,flashAlt:'#8be9fd'}, 'skin-gold-legend':{color:'#f6c453',flash:true,flashAlt:'#fff1a6'} };
    SKIN=skinMap[EQ.skin]||skinMap['skin-default'];
    FX.aura=EQ.accessories?.aura||null; FX.trail=EQ.accessories?.trail||null; FX.head=EQ.accessories?.head||null; FX.eyes=EQ.accessories?.eyes||null;
  }
  applyEquipped();

  // World state
  let state='waiting', pendingNext=false, retryPending=false, dead=false; let celebrateT=0;
  let cameraY=0, spawnY=H, bestY=0, playerStartY=300; let activeLevel=1, levelProgress=0, dynamicLevelHeight=1000;
  const player={ x:W*0.5-18, y:280, w:36, h:47, vx:0, vy:0, onGround:false, jumpsLeft:2 };
  const platforms=[], coins=[], parts=[]; const enemies=[]; let enemySpawnY=H; let GOAL=null, FINAL_PLAT=null;

  // Params
  const GRAVITY=2200, JUMP_V=-900, MAX_FALL=1700, MOVE_ACC=2200, MOVE_MAX=360, FRICTION=2000, COIN=18; let moveLeft=false, moveRight=false, jumpQueued=false;

  // Stats helpers
  function loadStats(){ try{ return JSON.parse(localStorage.getItem(K.STATS)||'{}') } catch { return {}; } }
  function saveStats(s){ localStorage.setItem(K.STATS, JSON.stringify(s)); }
  function incStat(k,by=1){ const s=loadStats(); s[k]=(s[k]||0)+by; saveStats(s); }

  // Overlay helpers
  function showOverlay(text){ levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none'); levelActionDock && (levelActionDock.textContent=text); dock && dock.classList.remove('hidden'); }
  function hideOverlay(){ levelOverlay && (levelOverlay.classList.add('hidden'), levelOverlay.style.display='none'); dock && dock.classList.add('hidden'); }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(MAX_LEVEL,n)); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); }
  function retryNow(){ retryPending=false; resetWorld(); hideOverlay(); state='playing'; }
  function nextLevel(){ const nxt=Math.min(MAX_LEVEL, activeLevel+1); startLevel(nxt); }
  function onDeath(){ dead=true; retryPending=true; state='waiting'; try{ sfx.hit.currentTime=0; sfx.hit.play().catch(()=>{});}catch{} showOverlay(`Retry Level ${activeLevel}`); }
  function onContinueNext(){ pendingNext=false; hideOverlay(); nextLevel(); }
  function handleActionClick(){ if(pendingNext) return onContinueNext(); if(retryPending) return retryNow(); hideOverlay(); state='playing'; }
  ;['click','pointerdown','touchstart'].forEach(ev=>{ levelAction && levelAction.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); }); levelActionDock && levelActionDock.addEventListener(ev,(e)=>{ e.preventDefault(); e.stopPropagation(); handleActionClick(); }); });

  // HUD
  function updateHUD(){ scoreEl&&(scoreEl.textContent=String(levelProgress)); levelEl&&(levelEl.textContent=String(activeLevel)); const h=Number(localStorage.getItem(K.HISCORE)||0); hiscoreEl&&(hiscoreEl.textContent=String(h)); }

  // Utils & FX
  const aabb=(a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  function emit(c,x,y,vx,vy,life=.6,size=3){ parts.push({c,x,y,vx,vy,life,size}); }
  function burst(x,y,cnt=18,spd=260){ const pal=['#7de07d','#ffd166','#7cd1f9','#f97098','#c084fc']; for(let i=0;i<cnt;i++){ const A=Math.random()*Math.PI*2,S=spd*(0.35+Math.random()*0.9); emit(pal[i%pal.length],x,y,Math.cos(A)*S,Math.sin(A)*S,0.5+Math.random()*0.6,3+Math.random()*2);} }
  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; return Math.round((base+(Math.max(1,n)-1)*per)*bonus); }

  let SPAWN_CAP_Y=-Infinity; // hard cap above finish

  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }

  function ensureSpawn(){ const target=cameraY-200; const ceiling=Math.max(target,SPAWN_CAP_Y); while(spawnY>ceiling){ const w=90+Math.floor(Math.random()*90); const x=30+Math.floor(Math.random()*(W-60-w)); const y=spawnY-(70+Math.floor(Math.random()*60)); if(y<=SPAWN_CAP_Y){ spawnY=y; break; } platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-COIN/2,y:y-32,w:COIN,h:COIN,active:true}); spawnY=y; } }

  function ensureEnemies(){ const target=cameraY-220; const ceiling=Math.max(target,SPAWN_CAP_Y); while(enemySpawnY>ceiling){ const y=enemySpawnY-(140+Math.floor(Math.random()*120)); if(y<=SPAWN_CAP_Y){ enemySpawnY=y; break; } const r=Math.random(); if(r<0.6){ const x=40+Math.floor(Math.random()*(W-80)); enemies.push({type:'bat',x,y,baseY:y,w:36,h:24,t:Math.random()*Math.PI*2,amp:18+Math.random()*22,spd:50+Math.random()*70,dir:Math.random()<0.5?-1:1,alive:true}); } else { let plat=null,best=9999; for(const p of platforms){ const dy=Math.abs((y+30)-p.y); if(dy<best && dy<60){ best=dy; plat=p; } } if(plat){ const px=Math.max(plat.x+6, Math.min(plat.x+plat.w-30, plat.x+6+Math.random()*(plat.w-36)) ); enemies.push({type:'slime',x:px,y:plat.y-20,w:28,h:20,vx:(Math.random()<0.5?-60:60),patrol:{left:plat.x+6,right:plat.x+plat.w-30},alive:true}); } else { const x=40+Math.floor(Math.random()*(W-80)); enemies.push({type:'bat',x,y,baseY:y,w:36,h:24,t:Math.random()*Math.PI*2,amp:18+Math.random()*22,spd:50+Math.random()*70,dir:Math.random()<0.5?-1:1,alive:true}); } } enemySpawnY=y; } }

  function resetWorld(){ cameraY=0; spawnY=H; enemySpawnY=H; parts.length=0; platforms.length=coins.length=enemies.length=0; GOAL=null; FINAL_PLAT=null; dead=false; celebrateT=0; pendingNext=false; Object.assign(player,{x:W*0.5-18,y:300,vx:0,vy:0,onGround:false,jumpsLeft:2}); applyEquipped(); let y=360; for(let i=0;i<6;i++){ const w=90+Math.floor(Math.random()*90), x=30+Math.floor(Math.random()*(W-60-w)); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-COIN/2,y:y-32,w:COIN,h:COIN,active:true}); y-=(70+Math.floor(Math.random()*60)); } spawnY=y; enemySpawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }

  function setGoalForLevel(){ dynamicLevelHeight=levelLengthFor(activeLevel); const goalY=playerStartY-dynamicLevelHeight; const platY=goalY+10; const plat={x:0,y:platY,w:W,h:24}; platforms.push(plat); FINAL_PLAT=plat; const flagW=36,flagH=120,gx=Math.floor(W/2-flagW/2); GOAL={x:gx,y:platY-flagH,w:flagW,h:flagH,reached:false}; SPAWN_CAP_Y=FINAL_PLAT.y-1; }

  // Input
  function queueJump(){ jumpQueued=true; try{ sfx.jump.currentTime=0; sfx.jump.play().catch(()=>{});}catch{} }
  addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(state==='celebrating' && pendingNext) return onContinueNext(); queueJump(); incStat('jumps',1); } if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=true; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=true; });
  addEventListener('keyup', e=>{ if(e.code==='ArrowLeft'||e.code==='KeyA') moveLeft=false; if(e.code==='ArrowRight'||e.code==='KeyD') moveRight=false; });

  // 3 invisible touch zones: left / center (jump) / right
  (function createTouchZones(){ if(!stage) return; const zl=document.createElement('div'); zl.className='touch-zone left'; const zc=document.createElement('div'); zc.className='touch-zone center'; const zr=document.createElement('div'); zr.className='touch-zone right'; stage.appendChild(zl); stage.appendChild(zc); stage.appendChild(zr);
    let leftPtr=null,rightPtr=null,centerPtr=null; function pressStartIfNeeded(){ if(state==='celebrating' && pendingNext) return onContinueNext(); if(state==='waiting' && !retryPending && !pendingNext){ handleActionClick(); } }
    zl.addEventListener('pointerdown',e=>{ if(leftPtr!=null) return; leftPtr=e.pointerId; moveLeft=true; pressStartIfNeeded(); incStat('jumps',1); queueJump(); },{passive:false}); ['pointerup','pointercancel','pointerleave','pointerout'].forEach(ev=> zl.addEventListener(ev,e=>{ if(leftPtr===e.pointerId){ leftPtr=null; moveLeft=false; } }));
    zc.addEventListener('pointerdown',e=>{ if(centerPtr!=null) return; centerPtr=e.pointerId; pressStartIfNeeded(); incStat('jumps',1); queueJump(); },{passive:false}); ['pointerup','pointercancel','pointerleave','pointerout'].forEach(ev=> zc.addEventListener(ev,e=>{ if(centerPtr===e.pointerId){ centerPtr=null; } }));
    zr.addEventListener('pointerdown',e=>{ if(rightPtr!=null) return; rightPtr=e.pointerId; moveRight=true; pressStartIfNeeded(); incStat('jumps',1); queueJump(); },{passive:false}); ['pointerup','pointercancel','pointerleave','pointerout'].forEach(ev=> zr.addEventListener(ev,e=>{ if(rightPtr===e.pointerId){ rightPtr=null; moveRight=false; } }));
  })();

  // Update
  function tryJump(){ if(player.jumpsLeft>0 && state==='playing'){ player.vy=JUMP_V; player.onGround=false; player.jumpsLeft--; burst(player.x+player.w/2, player.y+player.h/2, 12, 240); } }
  function update(dt){
    for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; if(p.life<=0) parts.splice(i,1); }
    if(state==='celebrating'){ celebrateT-=dt; if(celebrateT<=0 && !pendingNext){ state='waiting'; pendingNext=true; showOverlay('Level Complete! Continue ▶'); } return; }
    if(state!=='playing') return;

    if(moveLeft && !moveRight) player.vx=Math.max(player.vx-MOVE_ACC*dt,-MOVE_MAX);
    else if(moveRight && !moveLeft) player.vx=Math.min(player.vx+MOVE_ACC*dt, MOVE_MAX);
    else { if(player.vx>0) player.vx=Math.max(0,player.vx-FRICTION*dt); else if(player.vx<0) player.vx=Math.min(0,player.vx+FRICTION*dt); }

    if(jumpQueued){ tryJump(); jumpQueued=false; }

    player.vy+=GRAVITY*dt; if(player.vy>MAX_FALL) player.vy=MAX_FALL; player.x+=player.vx*dt; player.y+=player.vy*dt; if(player.x+player.w<0) player.x=W-player.w; if(player.x>W) player.x=0;

    let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, 6, 160);} player.onGround=true; break; } } } if(!landed && player.vy!==0) player.onGround=false;

    for(const c of coins){ if(!c.active) continue; if(aabb(player,c)){ c.active=false; incStat('coins',1); try{ sfx.coin.currentTime=0; sfx.coin.play().catch(()=>{});}catch{} burst(c.x+c.w/2, c.y+c.h/2, 8, 180); } }

    const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); let h=Number(localStorage.getItem(K.HISCORE)||0); if(height>h){ h=height; localStorage.setItem(K.HISCORE, String(h)); } hiscoreEl && (hiscoreEl.textContent=String(h));

    if(GOAL && !GOAL.reached && aabb(player,GOAL)){ GOAL.reached=true; try{ sfx.win.currentTime=0; sfx.win.play().catch(()=>{});}catch{} const cx=GOAL.x+GOAL.w/2, cy=GOAL.y+10; burst(cx,cy,26,340); celebrateT=2.0; state='celebrating'; return; }

    if((player.y - cameraY) > (H + 60)) { return onDeath(); }

    const cut=cameraY+H+150; while(platforms.length && platforms[0].y>cut) platforms.shift(); while(coins.length && coins[0].y>cut) coins.shift(); ensureSpawn(); ensureEnemies(); updateEnemies(dt); updateHUD();

    if(FX.trail){ let col='#ffffffaa'; emit(col, player.x+player.w/2, player.y+player.h, (Math.random()*40-20), 60, .4, 2); }
  }

  function updateEnemies(dt){
    for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; if(!e) continue;
      if(e.type==='bat'){
        e.t=(e.t||0)+dt*2.0; e.y = e.baseY + Math.sin(e.t)*e.amp; e.x += e.spd*e.dir*dt; if(e.x<10){ e.x=10; e.dir=1; } if(e.x>W-10){ e.x=W-10; e.dir=-1; }
      } else if(e.type==='slime'){
        e.x += e.vx*dt; if(e.x<e.patrol.left){ e.x=e.patrol.left; e.vx=Math.abs(e.vx); } if(e.x>e.patrol.right){ e.x=e.patrol.right; e.vx=-Math.abs(e.vx); }
        let onPlat=false; for(const p of platforms){ if(e.x+e.w>p.x && e.x<p.x+p.w){ if(Math.abs((e.y+e.h)-p.y)<4){ e.y=p.y-e.h; onPlat=true; break; } } } if(!onPlat){ e.vy=(e.vy||0)+1800*dt; e.y+=e.vy*dt; if(e.y - cameraY > H+120){ enemies.splice(i,1); continue; } }
      }
      if((e.y - cameraY) > H+160){ enemies.splice(i,1); continue; }
      const box={x:e.x,y:e.y,w:e.w,h:e.h}; if(aabb(player,box)){
        const stomp = player.vy>120 && (player.y+player.h) <= (e.y + e.h*0.6);
        if(stomp){ enemies.splice(i,1); burst(e.x+e.w/2, e.y+e.h/2, 12, 260); player.vy = JUMP_V*0.55; player.onGround=false; player.jumpsLeft=Math.max(player.jumpsLeft,1); try{ sfx.coin.currentTime=0; sfx.coin.play().catch(()=>{});}catch{} }
        else { return onDeath(); }
      }
    }
  }

  // Drawing helpers for accessories
  function drawAura(){ if(!FX.aura) return; const cx=player.x+player.w/2, cy=player.y+player.h/2 - cameraY; let color='rgba(124,209,249,0.35)';
    if(FX.aura==='aura-gold') color='rgba(255,209,102,0.45)'; else if(FX.aura==='aura-snow') color='rgba(191,230,255,0.45)'; else if(FX.aura==='aura-space') color='rgba(167,139,250,0.40)'; else if(FX.aura==='aura-team') color='rgba(46,204,113,0.40)';
    const r=80+Math.sin(performance.now()/200)*6; const g=ctx.createRadialGradient(cx,cy,10,cx,cy,r); g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function drawHead(){ if(!FX.head) return; const x=player.x, y=player.y-cameraY; ctx.save();
    if(FX.head==='hat-crown'){ ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.moveTo(x+6,y-6); ctx.lineTo(x+14,y-14); ctx.lineTo(x+22,y-6); ctx.lineTo(x+30,y-14); ctx.lineTo(x+38,y-6); ctx.closePath(); ctx.fill(); }
    else if(FX.head==='head-helmet'){ ctx.fillStyle='#2ecc71'; ctx.fillRect(x+4,y-10,28,10); ctx.fillStyle='#111'; ctx.fillRect(x+6,y-6,24,3); }
    else if(FX.head==='hat-santa'){ ctx.fillStyle='#ff4d4d'; ctx.fillRect(x+4,y-10,28,8); ctx.fillStyle='#fff'; ctx.fillRect(x+4,y-2,28,2); }
    else if(FX.head==='hat-pumpkin'){ ctx.fillStyle='#ff8c00'; ctx.fillRect(x+6,y-10,24,10); }
    else if(FX.head==='hat-wizard'){ ctx.fillStyle='#6b5b95'; ctx.beginPath(); ctx.moveTo(x+22,y-18); ctx.lineTo(x+8,y-2); ctx.lineTo(x+36,y-2); ctx.closePath(); ctx.fill(); }
    else if(FX.head==='hat-cap-blue'){ ctx.fillStyle='#1d4ed8'; ctx.fillRect(x+4,y-8,28,8); }
    ctx.restore(); }

  function drawEyes(){ if(!FX.eyes) return; const ex=player.x+8, ey=player.y-cameraY+12; ctx.save(); ctx.fillStyle='#111'; ctx.fillRect(ex,ey,6,6); ctx.fillRect(ex+18,ey,6,6); ctx.restore(); }

  // Draw
  function themePlatformColor(){ return FX.themeFlash ? ((Math.floor(performance.now()/350)%2)? '#ffffff' : THEME.platform) : THEME.platform; }
  function colorForSkin(){ return SKIN.flash ? ((Math.floor(performance.now()/250)%2)? SKIN.flashAlt : SKIN.color) : SKIN.color; }
  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let yy=0;yy<bh;yy+=6){ for(let xx=0;xx<bw;xx+=6){ if(((xx+yy)/6)%2===0) ctx.fillRect(xx,6+yy,6,6);} } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function draw(){
    const t=performance.now()/1000; let bg1=THEME.bg1, bg2=THEME.bg2; if(FX.bgAnimated){ const pal=[THEME.bg1,THEME.bg2,'#1e3a8a','#3b82f6','#9333ea']; const i=Math.floor((t*1.2)%pal.length); bg1=pal[i]; bg2=pal[(i+1)%pal.length]; }
    ctx.fillStyle=bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=bg2; ctx.fillRect(0,0,W,H*0.6);
    if(FX.pitch){ ctx.save(); ctx.globalAlpha=0.08; ctx.fillStyle='#ffffff'; for(let i=0;i<6;i++){ const y=i*(H/6); ctx.fillRect(0,y,W,6); } ctx.restore(); }

    // simple parallax blocks
    ctx.fillStyle='#0b192c'; for(let i=0;i<10;i++){ const w2=160,h2=60; const xx=((i*180)-(performance.now()*0.02)%(W+200))-100; const yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} 

    // platforms
    ctx.fillStyle=themePlatformColor(); for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 24);} 

    // enemies (draw behind player)
    for(const e of enemies){ if(!e) continue; if(e.type==='bat'){ if(imgBat.complete && imgBat.naturalWidth){ ctx.drawImage(imgBat, e.x-18, e.y-cameraY-12, 36,24); } else { ctx.fillStyle='#a78bfa'; ctx.fillRect(e.x-18, e.y-cameraY-12, 36,24); } } else { if(imgSlime.complete && imgSlime.naturalWidth){ ctx.drawImage(imgSlime, e.x, e.y-cameraY, 28,20); } else { ctx.fillStyle='#64b5f6'; ctx.fillRect(e.x, e.y-cameraY, 28,20); } } }

    // snow/aura/coins
    if(FX.aura) drawAura();
    for(const c of coins){ if(!c.active) continue; const cx=c.x+c.w/2, cy=c.y+c.h/2 - cameraY, r=c.w/2; ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }

    // player
    ctx.fillStyle=colorForSkin(); ctx.fillRect(player.x, player.y-cameraY, player.w, player.h);
    drawHead(); drawEyes();

    // flag
    if(GOAL){ drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h); }

    // particles
    for(const p of parts){ const a=Math.max(0,Math.min(1,p.life*2)); ctx.globalAlpha=a; ctx.fillStyle=p.c; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s);} ctx.globalAlpha=1;
  }

  // Pause/Restart
  btnPause && (btnPause.onclick=()=>{ if(state==='playing'){ state='paused'; } else if(state==='paused'){ state='playing'; hideOverlay(); } });
  btnRestart && (btnRestart.onclick=()=>{ startLevel(activeLevel); });

  // Loop
  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-(window.__t||now))/1000,0.033); window.__t=now; if(state==='playing'||state==='celebrating') update(dt); draw(); }
  startLevel(1); showOverlay('Start Level 1'); requestAnimationFrame(loop);
})();
