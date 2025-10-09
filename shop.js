
(()=>{
  'use strict';
  const K = { WALLET:'wallet', OWNED:'owned', EQUIPPED:'equipped', MAXLVL:'maxLevelReached', STATS:'stats' };
  const walletEl = document.getElementById('wallet');
  const grid = document.getElementById('grid');
  const tabs = document.querySelectorAll('.tab');
  const tmpl = document.getElementById('item-card');
  if(!grid || !tmpl){ console.warn('[shop] Missing DOM'); return; }

  const PRICES = { common:250, rare:650, epic:1300, legendary:0 };

  const THEMES=[
    {id:'theme-default', name:'Default', rarity:'common', preview:{platform:'#5e81ac',bg:'#0f1a2b',bg2:'#162238'}},
    {id:'theme-neon', name:'Neon Pulse', rarity:'rare', flash:true, preview:{platform:'#00f5d4',bg:'#0b1020',bg2:'#111a33'}, minLevel:3},
    {id:'theme-voltage', name:'Voltage', rarity:'epic', flash:true, preview:{platform:'#ffd166',bg:'#101010',bg2:'#1c1c1c'}, minLevel:9},
    {id:'theme-sunset', name:'Sunset Drift', rarity:'epic', preview:{platform:'#f28482',bg:'#2a2138',bg2:'#452650'}, minLevel:12},
    {id:'theme-winter', name:'Snowfall', rarity:'rare', preview:{platform:'#bfe6ff',bg:'#071520',bg2:'#0e2a40'}, minLevel:5, event:true},
    {id:'theme-football', name:'Pitch Night', rarity:'epic', preview:{platform:'#2ecc71',bg:'#061a10',bg2:'#0c2e1c'}, minLevel:10, event:true},
    {id:'theme-space', name:'Starlight', rarity:'epic', flash:true, preview:{platform:'#a5b4fc',bg:'#080a12',bg2:'#12172a'}, minLevel:14},
    {id:'theme-aurora', name:'Aurora Legend', rarity:'legendary', flash:true, preview:{platform:'#90e0ef',bg:'#07121f',bg2:'#12304b'}, minLevel:18, requireCoins:3000}
  ];

  const BACKGROUNDS=[
    {id:'bg-default', name:'Deep Night', rarity:'common', preview:{bg1:'#0f1a2b',bg2:'#162238'}},
    {id:'bg-stars', name:'Starfield', rarity:'rare', animated:true, preview:{bg1:'#0a0f1a',bg2:'#141e30'}, minLevel:4},
    {id:'bg-rainbow', name:'Rainbow Flow', rarity:'epic', animated:true, preview:{bg1:'#2b1055',bg2:'#7597de'}, minLevel:8},
    {id:'bg-ocean', name:'Ocean Fade', rarity:'rare', preview:{bg1:'#0b1d2a',bg2:'#1b4965'}, minLevel:5},
    {id:'bg-snow', name:'Snowfall', rarity:'epic', animated:true, preview:{bg1:'#0b1e2c',bg2:'#14344d'}, minLevel:10, event:true},
    {id:'bg-pitch', name:'Pitch Lines', rarity:'epic', preview:{bg1:'#0c2816',bg2:'#134d2a'}, minLevel:11, event:true},
    {id:'bg-nebula', name:'Nebula Drift', rarity:'epic', animated:true, preview:{bg1:'#0a0a1a',bg2:'#191942'}, minLevel:13},
    {id:'bg-cosmos', name:'Cosmos Legend', rarity:'legendary', animated:true, preview:{bg1:'#0a0a0a',bg2:'#242424'}, minLevel:20, requireCoins:4000}
  ];

  const SKINS=[
    {id:'skin-default', name:'Blue Buddy', rarity:'common', preview:{player:'#7cd1f9'}},
    {id:'skin-lime', name:'Lime Pop', rarity:'common', preview:{player:'#a3f7bf'}},
    {id:'skin-red', name:'Red Rush', rarity:'rare', preview:{player:'#ff6b6b'}, minLevel:3},
    {id:'skin-ice', name:'Ice Shard', rarity:'rare', preview:{player:'#bfe6ff'}, minLevel:5, event:true},
    {id:'skin-neon-pulse', name:'Neon Pulse', rarity:'epic', flash:true, flashAlt:'#ffef5a', preview:{player:'#00f5d4'}, minLevel:7},
    {id:'skin-royal', name:'Royal Violet', rarity:'epic', preview:{player:'#a78bfa'}, minLevel:9},
    {id:'skin-astro', name:'Astro Suit', rarity:'epic', flash:true, flashAlt:'#8be9fd', preview:{player:'#50fa7b'}, minLevel:12},
    {id:'skin-gold-legend', name:'Golden Legend', rarity:'legendary', flash:true, flashAlt:'#fff1a6', preview:{player:'#f6c453'}, minLevel:28, requireCoins:6000}
  ];

  const ACCESSORIES=[
    {id:'hat-cap-blue', name:'Blue Cap', slot:'head', rarity:'common', price:300, minLevel:2, preview:'🧢'},
    {id:'hat-wizard', name:'Wizard Hat', slot:'head', rarity:'rare', price:700, minLevel:6, preview:'🧙'},
    {id:'head-helmet', name:'Helmet', slot:'head', rarity:'epic', price:1100, minLevel:10, preview:'🏈', event:true},
    {id:'hat-santa', name:'Santa Hat', slot:'head', rarity:'epic', price:1200, minLevel:8, preview:'🎅', event:true},
    {id:'hat-pumpkin', name:'Pumpkin Head', slot:'head', rarity:'epic', price:1200, minLevel:8, preview:'🎃', event:true},
    {id:'hat-crown', name:'Crown', slot:'head', rarity:'legendary', price:0, minLevel:22, requireCoins:5000, preview:'👑'},
    {id:'eyes-shades', name:'Shades', slot:'eyes', rarity:'rare', price:650, minLevel:4, preview:'🕶️'},
    {id:'aura-blue', name:'Blue Aura', slot:'aura', rarity:'epic', price:1300, minLevel:8, preview:'💫', auraColor:'#7cd1f9'},
    {id:'aura-gold', name:'Golden Aura', slot:'aura', rarity:'legendary', price:0, minLevel:30, requireCoins:9000, preview:'✨', auraColor:'#ffd166'},
    {id:'aura-snow', name:'Snow Aura', slot:'aura', rarity:'epic', price:1200, minLevel:10, preview:'❄️', auraColor:'#bfe6ff', event:true},
    {id:'aura-space', name:'Cosmic Aura', slot:'aura', rarity:'epic', price:1400, minLevel:12, preview:'🪐', auraColor:'#a78bfa'},
    {id:'aura-team', name:'Team Spirit', slot:'aura', rarity:'epic', price:1200, minLevel:11, preview:'🏟️', auraColor:'#2ecc71', event:true},
    {id:'trail-sparkle', name:'Sparkle Trail', slot:'trail', rarity:'epic', price:1300, minLevel:12, preview:'✨'},
    {id:'trail-snow', name:'Snow Trail', slot:'trail', rarity:'epic', price:1200, minLevel:10, preview:'❄️', event:true},
    {id:'trail-comet', name:'Comet Trail', slot:'trail', rarity:'epic', price:1400, minLevel:14, preview:'☄️'},
    {id:'trail-ghost', name:'Ghost Trail', slot:'trail', rarity:'legendary', price:0, minLevel:24, requireCoins:7000, preview:'👻', event:true}
  ];

  const CATALOG = { themes:THEMES, backgrounds:BACKGROUNDS, skins:SKINS, accessories:ACCESSORIES };

  const loadWallet=()=>Number(localStorage.getItem(K.WALLET)||0), saveWallet=v=>localStorage.setItem(K.WALLET,String(v));
  const loadOwned=()=>{ try{ return new Set(JSON.parse(localStorage.getItem(K.OWNED)||'[]')) } catch { return new Set() } };
  const saveOwned=s=>localStorage.setItem(K.OWNED, JSON.stringify([...s]));
  const loadEquipped=()=>{ try{ return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}') } catch { return {} } };
  const saveEquipped=e=>localStorage.setItem(K.EQUIPPED, JSON.stringify(e));
  const maxLevel=()=>Number(localStorage.getItem(K.MAXLVL)||1);
  const loadStats=()=>{ try { return JSON.parse(localStorage.getItem(K.STATS)||'{}'); } catch { return {}; } };

  function ensureDefaults(){
    const owned=loadOwned(); let ch=false;
    ['theme-default','skin-default','bg-default'].forEach(id=>{ if(!owned.has(id)){ owned.add(id); ch=true; } });
    if(ch) saveOwned(owned);
    const eq=loadEquipped();
    if(!eq.theme) eq.theme='theme-default';
    if(!eq.skin) eq.skin='skin-default';
    if(!eq.background) eq.background='bg-default';
    if(!eq.accessories) eq.accessories={head:null,eyes:null,aura:null,trail:null};
    saveEquipped(eq);
  }

  function updateWalletUI(){ if(walletEl) walletEl.textContent=String(loadWallet()); }

  function addBadges(node, item){
    const b=document.createElement('div'); b.className='badges';
    if(item.flash) { const s=document.createElement('span'); s.className='badge'; s.textContent='FLASH'; b.appendChild(s); }
    if(item.animated) { const s=document.createElement('span'); s.className='badge'; s.textContent='ANIM'; b.appendChild(s); }
    if(item.event) { const s=document.createElement('span'); s.className='badge'; s.textContent='EVENT'; b.appendChild(s); }
    if(item.requireCoins) { const s=document.createElement('span'); s.className='badge'; s.textContent=`COINS ${item.requireCoins}`; b.appendChild(s); }
    if(b.childElementCount) node.appendChild(b);
  }

  function render(type){
    if(type==='stats'){
      const s=loadStats(); const his=Number(localStorage.getItem('hiscore')||0); const maxL=maxLevel();
      grid.innerHTML=`<article class='card'><div>Best Height</div><div>${his}</div></article>
                      <article class='card'><div>Max Level</div><div>${maxL}</div></article>
                      <article class='card'><div>Total Coins (lifetime)</div><div>${s.coins||0}</div></article>
                      <article class='card'><div>Runs</div><div>${s.runs||0}</div></article>`;
      return;
    }

    const items = CATALOG[type]||[]; const owned=loadOwned(); const eq=loadEquipped(); const s=loadStats(); const coinsLifetime=Number(s.coins||0);
    grid.innerHTML='';

    items.forEach(item=>{
      const node=tmpl.content.firstElementChild.cloneNode(true);
      const prev=node.querySelector('.preview'); const nameEl=node.querySelector('.name'); const rEl=node.querySelector('.rarity'); const btn=node.querySelector('.buy');
      nameEl.textContent=item.name; rEl.textContent=item.rarity.toUpperCase(); rEl.classList.add('rarity', item.rarity); node.classList.add(item.rarity);

      if(type==='skins'){
        const d=document.createElement('div'); d.style.cssText='width:44px;height:58px;border-radius:8px;'; d.style.background=item.preview.player; prev.appendChild(d);
        if(item.flash){ d.style.animation='flashSkin 1s infinite'; const k=document.createElement('style'); k.textContent='@keyframes flashSkin{0%{filter:none}50%{filter:brightness(1.6)}100%{filter:none}}'; document.head.appendChild(k); }
      } else if(type==='themes'){
        prev.style.background=item.preview.bg||'#0f1a2b'; const p=document.createElement('div'); p.style.cssText='width:70%;height:16px;border-radius:8px;'; p.style.background=item.preview.platform; prev.appendChild(p);
        if(item.flash){ prev.style.animation='flashPlat 1.2s infinite'; const k=document.createElement('style'); k.textContent='@keyframes flashPlat{50%{filter:brightness(1.4)}}'; document.head.appendChild(k); }
      } else if(type==='backgrounds'){
        prev.style.background=`linear-gradient(180deg, ${item.preview.bg1||'#0f1a2b'}, ${item.preview.bg2||'#162238'})`;
      } else if(type==='accessories'){
        prev.textContent=item.preview||'🎩';
      }
      addBadges(prev, item);

      let isEq=false; const acc=(eq.accessories||{head:null,eyes:null,aura:null,trail:null});
      if(type==='themes') isEq=eq.theme===item.id; if(type==='skins') isEq=eq.skin===item.id; if(type==='backgrounds') isEq=eq.background===item.id; if(type==='accessories') isEq=acc[item.slot]===item.id;

      const isOwned=owned.has(item.id);
      const minLvl=item.minLevel||1; const hasLvl=maxLevel()>=minLvl;
      const reqCoins=item.requireCoins||0; const hasCoins=coinsLifetime>=reqCoins;

      function lockBadge(){ const m=document.createElement('div'); m.className='lock'; const parts=[]; if(minLvl>1) parts.push(`LVL ${minLvl}`); if(reqCoins>0) parts.push(`${reqCoins} coins`); m.textContent='Req ' + parts.join(' + '); return m; }

      if(!isOwned){
        const price=(item.price!=null)? item.price : (PRICES[item.rarity]||1000);
        const canBuy=(loadWallet()>=price) && hasLvl && (reqCoins?hasCoins:true);
        if(!hasLvl || (reqCoins && !hasCoins)) node.querySelector('.meta').prepend(lockBadge());
        btn.textContent = (reqCoins && !hasCoins)? `Locked` : (price>0? `Buy • ${price}` : 'Unlock');
        btn.disabled=!canBuy;
        btn.onclick=()=>{
          if(!hasLvl || (reqCoins && !hasCoins)) return;
          const w=loadWallet(); if(w<price) return; if(price>0) saveWallet(w-price);
          owned.add(item.id); saveOwned(owned);
          if(type==='themes') eq.theme=item.id; if(type==='skins') eq.skin=item.id; if(type==='backgrounds') eq.background=item.id; if(type==='accessories'){ eq.accessories=acc; eq.accessories[item.slot]=item.id; }
          saveEquipped(eq); updateWalletUI(); render(type);
        };
      } else if(!isEq){
        btn.textContent='Equip'; btn.disabled=false;
        btn.onclick=()=>{ if(type==='themes') eq.theme=item.id; if(type==='skins') eq.skin=item.id; if(type==='backgrounds') eq.background=item.id; if(type==='accessories') { eq.accessories=acc; eq.accessories[item.slot]=item.id; } saveEquipped(eq); render(type); };
      } else {
        btn.textContent='Equipped'; btn.disabled=true;
      }

      grid.appendChild(node);
    });
  }

  tabs.forEach(t=>t.addEventListener('click',()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); render(t.dataset.tab); }));

  ensureDefaults(); updateWalletUI(); render('themes');
})();
