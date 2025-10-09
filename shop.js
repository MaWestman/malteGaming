
(()=>{ 'use strict';
  const K={WALLET:'wallet',OWNED:'owned',EQUIPPED:'equipped',MAXLVL:'maxLevelReached',STATS:'stats'};
  const walletEl=document.getElementById('wallet'); const grid=document.getElementById('grid'); const tabs=document.querySelectorAll('.tab'); const tmpl=document.getElementById('item-card'); if(!grid||!tmpl) return;
  const PRICES={common:200,rare:600,epic:1200,legendary:3000};
  const THEMES=[{id:'theme-default',name:'Default',rarity:'common',preview:{platform:'#5e81ac',bg:'#0f1a2b'}}];
  const BACKGROUNDS=[{id:'bg-default',name:'Deep Night',rarity:'common',preview:{bg1:'#0f1a2b',bg2:'#162238'}}];
  const SKINS=[{id:'skin-default',name:'Blue Buddy',rarity:'common',preview:{player:'#7cd1f9'}}];
  const ACCESSORIES=[{id:'head-cap',name:'Blue Cap',slot:'head',rarity:'common',price:200,minLevel:3,preview:'🧢'}];
  const CATALOG={themes:THEMES,backgrounds:BACKGROUNDS,skins:SKINS,accessories:ACCESSORIES};
  const loadWallet=()=>Number(localStorage.getItem(K.WALLET)||0), saveWallet=v=>localStorage.setItem(K.WALLET,String(v));
  const loadOwned=()=>{try{return new Set(JSON.parse(localStorage.getItem(K.OWNED)||'[]'))}catch{return new Set()}}; const saveOwned=s=>localStorage.setItem(K.OWNED,JSON.stringify([...s]));
  const loadEquipped=()=>{try{return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}')}catch{return {}}}; const saveEquipped=e=>localStorage.setItem(K.EQUIPPED,JSON.stringify(e));
  const maxLevel=()=>Number(localStorage.getItem(K.MAXLVL)||1);
  function ensureDefaults(){ const owned=loadOwned(); let ch=false; ['theme-default','skin-default','bg-default'].forEach(id=>{ if(!owned.has(id)){ owned.add(id); ch=true; }}); if(ch) saveOwned(owned); const eq=loadEquipped(); if(!eq.theme) eq.theme='theme-default'; if(!eq.skin) eq.skin='skin-default'; if(!eq.background) eq.background='bg-default'; if(!eq.accessories) eq.accessories={head:null,eyes:null}; saveEquipped(eq); }
  function updateWalletUI(){ walletEl && (walletEl.textContent=String(loadWallet())); }
  function lockBadge(minLvl){ const m=document.createElement('div'); m.className='lock'; m.textContent=`Req LVL ${minLvl}`; return m; }
  function render(type){ if(type==='stats'){ const sRaw=localStorage.getItem(K.STATS); const s=sRaw?JSON.parse(sRaw):{}; const his=Number(localStorage.getItem('hiscore')||0); const maxL=maxLevel(); grid.innerHTML=`<article class='card'><div>Best Height</div><div>${his}</div></article><article class='card'><div>Max Level</div><div>${maxL}</div></article>`; return; }
    const items=CATALOG[type]||[]; const owned=loadOwned(); const eq=loadEquipped(); grid.innerHTML='';
    items.forEach(item=>{ const node=tmpl.content.firstElementChild.cloneNode(true); const prev=node.querySelector('.preview'); const nameEl=node.querySelector('.name'); const rEl=node.querySelector('.rarity'); const btn=node.querySelector('.buy'); nameEl.textContent=item.name; rEl.textContent=item.rarity.toUpperCase(); node.classList.add(item.rarity);
      if(type==='skins'){ const d=document.createElement('div'); d.style.cssText='width:40px;height:52px;border-radius:6px;'; d.style.background=item.preview.player; prev.appendChild(d); }
      else if(type==='themes'){ prev.style.background=item.preview.bg; const p=document.createElement('div'); p.style.cssText='width:70%;height:16px;border-radius:8px;'; p.style.background=item.preview.platform; prev.appendChild(p); }
      else if(type==='backgrounds'){ prev.style.background=`linear-gradient(180deg, ${item.preview.bg1||'#0f1a2b'}, ${item.preview.bg2||'#162238'})`; }
      else if(type==='accessories'){ prev.textContent=item.preview||'🎩'; }
      const acc=(eq.accessories||{head:null,eyes:null}); let isEq=false; if(type==='themes') isEq=eq.theme===item.id; if(type==='skins') isEq=eq.skin===item.id; if(type==='backgrounds') isEq=eq.background===item.id; if(type==='accessories') isEq=acc[item.slot]===item.id;
      const isOwned=owned.has(item.id); const minLvl=item.minLevel||1; const canLvl=maxLevel()>=minLvl;
      if(!isOwned){ const price=item.price||PRICES[item.rarity]||1000; const canBuy=loadWallet()>=price && canLvl; if(!canLvl) node.querySelector('.meta')?.prepend(lockBadge(minLvl)); btn.textContent=`Buy • ${price}`; btn.disabled=!canBuy; btn.onclick=()=>{ if(!canLvl) return; const w=loadWallet(); if(w<price) return; saveWallet(w-price); owned.add(item.id); saveOwned(owned); if(type==='themes') eq.theme=item.id; if(type==='skins') eq.skin=item.id; if(type==='backgrounds') eq.background=item.id; if(type==='accessories') { eq.accessories=acc; eq.accessories[item.slot]=item.id; } saveEquipped(eq); updateWalletUI(); render(type); };
      } else if(!isEq){ btn.textContent='Equip'; btn.onclick=()=>{ if(type==='themes') eq.theme=item.id; if(type==='skins') eq.skin=item.id; if(type==='backgrounds') eq.background=item.id; if(type==='accessories') { eq.accessories=acc; eq.accessories[item.slot]=item.id; } saveEquipped(eq); render(type); };
      } else { btn.textContent='Equipped'; btn.disabled=true; }
      grid.appendChild(node);
    });
  }
  tabs.forEach(t=>t.addEventListener('click',()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); render(t.dataset.tab); }));
  ensureDefaults(); updateWalletUI(); render('themes');
})();
