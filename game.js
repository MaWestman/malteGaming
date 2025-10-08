
(() => {
  'use strict';
  const W=800,H=450; const THEME={ platform:'#5e81ac', bg1:'#0f1a2b', bg2:'#162238', para:'#0b192c' };
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
  function scale(){ const d=Math.max(1,Math.floor(devicePixelRatio||1)); canvas.width=W*d; canvas.height=H*d; ctx.setTransform(d,0,0,d,0,0);} scale(); addEventListener('resize',scale,{passive:true});
  const levelOverlay=document.getElementById('levelOverlay'), levelAction=document.getElementById('levelAction');
  const hiscoreEl=document.getElementById('hiscore'), levelEl=document.getElementById('level'), scoreEl=document.getElementById('score');

  // State
  let state='waiting', last=performance.now(); let cameraY=0, spawnY=H, bestY=0; let playerStartY=300; let activeLevel=1; let levelProgress=0; let dynamicLevelHeight=1000;
  const player={x:W*0.5-18,y:280,w:36,h:47,vx:0,vy:0,onGround:false,jumpsLeft:2};
  const platforms=[], coins=[], parts=[]; let GOAL=null, FINAL_PLAT=null, goalY=0; let celebrateT=0, flashT=0, shakeT=0, pendingNext=false, shownOverlayAfterWin=false;

  // Simple SFX placeholders
  const sfx={}; function play(){}

  // Utils
  function aabb(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function r(min,max){return Math.random()*(max-min)+min} function ri(min,max){return Math.floor(r(min,max))}
  function emit(c,x,y,vx,vy,life=0.8,size=3){parts.push({c,x,y,vx,vy,life,size})}
  function burst(x,y,cnt=20,spd=320){const pal=['#7de07d','#ffd166','#7cd1f9','#f97098','#c084fc'];for(let i=0;i<cnt;i++){const a=Math.random()*Math.PI*2,s=spd*(0.35+Math.random()*0.9);emit(pal[i%pal.length],x,y,Math.cos(a)*s,Math.sin(a)*s,0.7+Math.random()*0.8,3+Math.random()*2)}}
  function updParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt; if(p.life<=0) parts.splice(i,1)}}

  function levelLengthFor(n){ const base=900, per=120; const b=Math.floor((Math.max(1,n)-1)/10); const bonus=1+0.05*b; const raw=base+(Math.max(1,n)-1)*per; return Math.round(raw*bonus); }

  function showOverlay(t){ if(levelAction) levelAction.textContent=t; levelOverlay&&levelOverlay.classList.remove('hidden'); }
  function hideOverlay(){ levelOverlay&&levelOverlay.classList.add('hidden'); }

  function updateHUD(){ scoreEl&&(scoreEl.textContent=String(levelProgress)); levelEl&&(levelEl.textContent=String(activeLevel)); }

  function placePlayerOnPlatform(){ if(!platforms.length) return; let p=platforms[0]; for(const pl of platforms){ if(pl.y>p.y) p=pl; } const right=p.x+p.w-player.w; player.x=Math.max(p.x,Math.min(right,p.x+(p.w-player.w)/2)); player.y=p.y-player.h; player.vx=0; player.vy=0; player.onGround=true; player.jumpsLeft=2; }

  function resetWorld(){ cameraY=0; spawnY=H; parts.length=0; platforms.length=coins.length=0; GOAL=null; FINAL_PLAT=null; pendingNext=false; shownOverlayAfterWin=false;
    Object.assign(player,{x:W*0.5-18,y:300,vx:0,vy:0,onGround:false,jumpsLeft:2});
    let y=360; for(let i=0;i<6;i++){ const w=ri(90,180), x=ri(30,W-30-w); platforms.push({x,y,w,h:20}); if(Math.random()<0.6) coins.push({x:x+w*0.5-9,y:y-32,w:18,h:18,active:true}); y-=ri(70,130);} spawnY=y; placePlayerOnPlatform(); playerStartY=player.y; bestY=player.y; levelProgress=0; setGoalForLevel(); updateHUD(); }

  // ---------- FIX: Make the flag sit ON TOP of the platform ----------
  function setGoalForLevel(){
    dynamicLevelHeight = levelLengthFor(activeLevel);
    goalY = playerStartY - dynamicLevelHeight;              // top of level
    const platY = goalY + 10;                               // platform top edge
    const plat = { x:0, y:platY, w:W, h:24 };               // full-width finish platform
    platforms.push(plat); FINAL_PLAT = plat;

    // Flag geometry
    const flagW = 36, flagH = 120;                          // drawFlag expects top-left + height
    const gx = Math.floor(W/2 - flagW/2);                   // center flag horizontally

    // IMPORTANT: drawFlag draws the pole from y=0 to y=h downward.
    // To place the BASE of the pole exactly ON the platform top (platY),
    // we set the flag's top Y to platY - flagH.
    GOAL = { x: gx, y: platY - flagH, w: flagW, h: flagH, reached:false };
  }

  function startLevel(n){ activeLevel=Math.max(1,Math.min(100,n)); resetWorld(); state='waiting'; showOverlay(`Start Level ${activeLevel}`); }
  function nextLevel(){ const next=Math.min(100,activeLevel+1); startLevel(next); }

  function finishLevel(){ flashT=0.45; shakeT=0.8; celebrateT=2.0; state='celebrating'; burst(GOAL.x+GOAL.w/2, GOAL.y+10, 26, 340); }

  levelAction&&levelAction.addEventListener('click',()=>{ if(pendingNext){ pendingNext=false; hideOverlay(); nextLevel(); } else { hideOverlay(); state='playing'; }});

  function ensureSpawn(){ const target=cameraY-200, ceiling=Math.min(target, goalY-120); while(spawnY>ceiling){ const w=ri(90,180), x=ri(30,W-30-w), y=spawnY-ri(70,130); platforms.push({x,y,w,h:20}); if(Math.random()<0.55) coins.push({x:x+w*0.5-9,y:y-32,w:18,h:18,active:true}); spawnY=y; } }

  function drawFlag(ctx,gx,gy,w,h){ ctx.save(); ctx.translate(gx, gy - cameraY); ctx.fillStyle='#9aa7b2'; ctx.fillRect(14,0,6,h); const bw=28,bh=22; ctx.fillStyle='#fff'; ctx.fillRect(0,6,bw,bh); ctx.fillStyle='#111'; for(let yy=0; yy<bh; yy+=6){ for(let xx=0; xx<bw; xx+=6){ if(((xx+yy)/6)%2===0) ctx.fillRect(xx,6+yy,6,6); } } ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(17,h+6,24,6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function draw(){
    // background
    ctx.fillStyle=THEME.bg1; ctx.fillRect(0,0,W,H); ctx.fillStyle=THEME.bg2; ctx.fillRect(0,0,W,H*0.6); ctx.fillStyle=THEME.para; for(let i=0;i<10;i++){ const w2=160,h2=60, xx=((i*180)-(performance.now()*0.02)%(W+200))-100, yy=220+Math.sin(i)*10 - cameraY*0.05; ctx.fillRect(xx,yy,w2,h2);} 
    // platforms
    ctx.fillStyle=THEME.platform; for(const p of platforms){ ctx.fillRect(p.x, p.y-cameraY, p.w, 24); }
    // player
    ctx.fillStyle='#7cd1f9'; ctx.fillRect(player.x, player.y-cameraY, player.w, player.h);
    // flag
    if(GOAL) drawFlag(ctx, GOAL.x, GOAL.y, GOAL.w, GOAL.h);
    // particles
    for(const p of parts){ const a=Math.max(0,Math.min(1,p.life*2)); ctx.globalAlpha=a; ctx.fillStyle=p.c; const s=p.size||3; ctx.fillRect(p.x-s/2, p.y-s/2 - cameraY, s, s);} ctx.globalAlpha=1;
    // waiting dim
    if(state==='waiting'){ ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(0,0,W,H); }
  }

  function loop(now){ requestAnimationFrame(loop); const dt=Math.min((now-last)/1000,0.033); last=now; if(state==='celebrating'){ celebrateT-=dt; flashT-=dt; shakeT-=dt; if(celebrateT<=0 && !shownOverlayAfterWin){ state='waiting'; shownOverlayAfterWin=true; pendingNext=true; showOverlay('Level Complete! Continue ▶'); } } else if(state==='playing'){ // integrate simple physics
      player.vy+=2200*dt; if(player.vy>1700) player.vy=1700; player.x+=player.vx*dt; player.y+=player.vy*dt; let landed=false; if(player.vy>=0){ for(const p of platforms){ const wasAbove=(player.y+player.h)<=p.y+10; if(!wasAbove) continue; if(aabb(player,p)){ player.y=p.y-player.h; player.vy=0; landed=true; if(!player.onGround){ player.jumpsLeft=2; burst(player.x+player.w/2, player.y+player.h, 8, 180);} player.onGround=true; break; } } } if(!landed&&player.vy!==0) player.onGround=false; if(GOAL && !GOAL.reached && aabb(player,GOAL)){ GOAL.reached=true; finishLevel(); } if((player.y - cameraY) > (H + 60)) { state='waiting'; showOverlay(`Retry Level ${activeLevel}`); resetWorld(); } ensureSpawn(); const height=Math.round((playerStartY - Math.min(bestY,player.y))); bestY=Math.min(bestY,player.y); levelProgress=Math.max(levelProgress,height); updateHUD(); }
    updParts(dt); draw(); }

  resetWorld(); showOverlay('Start Level 1'); requestAnimationFrame(loop);
})();
