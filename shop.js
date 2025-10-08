
(() => {
  'use strict';
  const K = { WALLET:'wallet', OWNED:'owned', EQUIPPED:'equipped', MAXLVL:'maxLevelReached', STATS:'stats' };
  const walletEl = document.getElementById('wallet');
  const grid = document.getElementById('grid');
  const tabs = document.querySelectorAll('.tab');
  const tmpl = document.getElementById('item-card');

  const PRICES = { common:200, rare:600, epic:1200, legendary:3000 };

  // Catalogs — expanded
  const THEMES = [
    { id:'theme-default',  name:'Default',    rarity:'common',   preview:{platform:'#5e81ac',bg:'#0f1a2b'} },
    { id:'theme-heaven',   name:'Heaven',     rarity:'rare',     preview:{platform:'#b3e5ff',bg:'#e6f7ff'} },
    { id:'theme-hell',     name:'Hellfire',   rarity:'epic',     preview:{platform:'#ff3b30',bg:'#2a0000'} },
    { id:'theme-space',    name:'Space Neon', rarity:'epic',     preview:{platform:'#8a7dff',bg:'#0b0a1a'} },
    { id:'theme-mars',     name:'Mars Red',   rarity:'rare',     preview:{platform:'#c1440e',bg:'#2b0f07'} },
    { id:'theme-ocean',    name:'Ocean Blue', rarity:'rare',     preview:{platform:'#2ec4ff',bg:'#012a3a'} },
    { id:'theme-desert',   name:'Desert',     rarity:'common',   preview:{platform:'#e0b26a',bg:'#3a240e'} },
    { id:'theme-cyber',    name:'Cyber Grid', rarity:'epic',     preview:{platform:'#00ffd1',bg:'#00131d'} },
    { id:'theme-candy',    name:'Candy Pop',  rarity:'rare',     preview:{platform:'#f48fb1',bg:'#2a0c1c'} },
    { id:'theme-aurora',   name:'Aurora',     rarity:'legendary',preview:{platform:'#7de07d',bg:'#06141f'} },
    { id:'theme-volcano',  name:'Volcano',    rarity:'epic',     preview:{platform:'#ff6b00',bg:'#180905'} },
    { id:'theme-glacier',  name:'Glacier',    rarity:'rare',     preview:{platform:'#9ad7ff',bg:'#0a1b2e'} },
  ];

  const BACKGROUNDS = [
    { id:'bg-default', name:'Deep Night',   rarity:'common',    preview:{bg1:'#0f1a2b',bg2:'#162238'} },
    { id:'bg-heaven',  name:'Heaven',       rarity:'rare',      preview:{bg1:'#e6f7ff',bg2:'#b3e5ff'} },
    { id:'bg-hell',    name:'Hellfire',     rarity:'epic',      preview:{bg1:'#2a0000',bg2:'#5a0000'} },
    { id:'bg-space',   name:'Space',        rarity:'epic',      preview:{bg1:'#0b0a1a',bg2:'#1b173a'} },
    { id:'bg-mars',    name:'Mars',         rarity:'rare',      preview:{bg1:'#2b0f07',bg2:'#6a2b16'} },
    { id:'bg-ocean',   name:'Ocean',        rarity:'rare',      preview:{bg1:'#012a3a',bg2:'#024b6a'} },
    { id:'bg-desert',  name:'Desert',       rarity:'common',    preview:{bg1:'#3a240e',bg2:'#6a4422'} },
    { id:'bg-cyber',   name:'Cyber',        rarity:'epic',      preview:{bg1:'#00131d',bg2:'#003348'} },
    { id:'bg-candy',   name:'Candyland',    rarity:'rare',      preview:{bg1:'#2a0c1c',bg2:'#5a1f3d'} },
    { id:'bg-aurora',  name:'Aurora Sky',   rarity:'legendary', preview:{bg1:'#0a0e2a',bg2:'#10385a'} },
    { id:'bg-volcano', name:'Volcano',      rarity:'epic',      preview:{bg1:'#180905',bg2:'#3a160a'} },
    { id:'bg-glacier', name:'Glacier',      rarity:'rare',      preview:{bg1:'#0a1b2e',bg2:'#1a3b5e'} },
  ];

  const SKINS = [
    // Commons
    { id:'skin-default', name:'Blue Buddy', rarity:'common', preview:{player:'#7cd1f9'}, sprite:true },
    { id:'skin-cloud',   name:'Cloud Puff', rarity:'common', preview:{player:'#e6f7ff'}, sprite:true },
    { id:'skin-sand',    name:'Sandy',      rarity:'common', preview:{player:'#e0b26a'}, sprite:true },
    // Rares
    { id:'skin-angel',   name:'Angel',      rarity:'rare',   preview:{player:'#b3e5ff'}, sprite:true },
    { id:'skin-demon',   name:'Demon',      rarity:'rare',   preview:{player:'#ff3b30'}, sprite:true },
    { id:'skin-surfer',  name:'Surfer',     rarity:'rare',   preview:{player:'#2ec4ff'}, sprite:true },
    // Epics
    { id:'skin-astronaut', name:'Astronaut', rarity:'epic',  preview:{player:'#8a7dff'}, sprite:true },
    { id:'skin-martian',   name:'Martian',   rarity:'epic',  preview:{player:'#c1440e'}, sprite:true },
    { id:'skin-ninja',     name:'Ninja',     rarity:'epic',  preview:{player:'#222222'}, sprite:true },
    { id:'skin-wizard',    name:'Wizard',    rarity:'epic',  preview:{player:'#7e57c2'}, sprite:true },
    // Legendaries
    { id:'skin-robot',     name:'Robot',     rarity:'legendary', preview:{player:'#9ad7ff'}, sprite:true },
    { id:'skin-cyborg',    name:'Cyborg',    rarity:'legendary', preview:{player:'#00ffd1'}, sprite:true },
    { id:'skin-dragon',    name:'Dragon',    rarity:'legendary', preview:{player:'#ff6b00'}, sprite:true },
    { id:'skin-holo2',     name:'Holo Prism II', rarity:'legendary', preview:{player:'#b3ffe6'}, sprite:true },
  ];

  const ACCESSORIES = [
    // Head
    { id:'head-halo',    name:'Halo',         slot:'head', rarity:'rare',   price:800,  minLevel:10,  preview:'🟡' },
    { id:'head-horns',   name:'Horns',        slot:'head', rarity:'epic',   price:1200, minLevel:15,  preview:'🔻' },
    { id:'head-cap',     name:'Blue Cap',     slot:'head', rarity:'common', price:200,  minLevel:3,   preview:'🧢' },
    { id:'head-cowboy',  name:'Cowboy Hat',   slot:'head', rarity:'rare',   price:700,  minLevel:8,   preview:'🤠' },
    { id:'head-crown',   name:'Crown',        slot:'head', rarity:'legendary', price:2500, minLevel:25, preview:'👑' },
    { id:'head-wizard',  name:'Wizard Hat',   slot:'head', rarity:'epic',   price:1200, minLevel:12,  preview:'🧙' },
    { id:'head-pirate',  name:'Pirate Hat',   slot:'head', rarity:'epic',   price:1200, minLevel:12,  preview:'🏴‍☠️' },
    { id:'head-space',   name:'Space Helmet', slot:'head', rarity:'epic',   price:1500, minLevel:18,  preview:'🪐' },
    { id:'head-mars',    name:'Mars Helmet',  slot:'head', rarity:'epic',   price:1500, minLevel:18,  preview:'🟥' },
    // Eyes
    { id:'eyes-round',   name:'Round Glasses', slot:'eyes', rarity:'common',    price:300,  minLevel:2,  preview:'👓' },
    { id:'eyes-aviator', name:'Aviators',      slot:'eyes', rarity:'rare',      price:700,  minLevel:7,  preview:'😎' },
    { id:'eyes-visor',   name:'Neon Visor',    slot:'eyes', rarity:'epic',      price:1200, minLevel:12, preview:'🧿' },
    { id:'eyes-goggles', name:'Goggles',       slot:'eyes', rarity:'rare',      price:700,  minLevel:7,  preview:'🥽' },
    { id:'eyes-monocle', name:'Monocle',       slot:'eyes', rarity:'legendary', price:2000, minLevel:20, preview:'🧐' },
  ];

  const CATALOG = { themes: THEMES, backgrounds: BACKGROUNDS, skins: SKINS, accessories: ACCESSORIES };

  function loadWallet(){ return Number(localStorage.getItem(K.WALLET)||0); }
  function saveWallet(v){ localStorage.setItem(K.WALLET, String(v)); }
  function loadOwned(){ try { return new Set(JSON.parse(localStorage.getItem(K.OWNED)||'[]')); } catch { return new Set(); } }
  function saveOwned(s){ localStorage.setItem(K.OWNED, JSON.stringify([...s])); }
  function loadEquipped(){ try { return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}'); } catch { return {}; } }
  function saveEquipped(e){ localStorage.setItem(K.EQUIPPED, JSON.stringify(e)); }
  function maxLevel(){ return Number(localStorage.getItem(K.MAXLVL)||1); }

  function ensureDefaults(){
    const owned = loadOwned(); let changed=false;
    ['theme-default','skin-default','bg-default'].forEach(id=>{ if(!owned.has(id)){ owned.add(id); changed=true; }});
    if (changed) saveOwned(owned);
    const eq = loadEquipped();
    if (!eq.theme) eq.theme='theme-default';
    if (!eq.skin) eq.skin='skin-default';
    if (!eq.background) eq.background='bg-default';
    if (!eq.accessories) eq.accessories = { head:null, eyes:null };
    saveEquipped(eq);
  }

  function updateWalletUI(){ walletEl.textContent = String(loadWallet()); }
  function lockBadge(minLvl){ const m=document.createElement('div'); m.className='lock'; m.textContent = `Req LVL ${minLvl}`; return m; }

  function render(type){
    if (type === 'stats') {
      const sRaw = localStorage.getItem(K.STATS);
      const s = sRaw? JSON.parse(sRaw) : {};
      const his = Number(localStorage.getItem('hiscore')||0);
      const maxL = maxLevel();
      grid.innerHTML = `
        <article class='card'><div class='name'>Best Height</div><div class='value'>${his}</div></article>
        <article class='card'><div class='name'>Max Level</div><div class='value'>${maxL}</div></article>
        <article class='card'><div class='name'>Total Jumps</div><div class='value'>${s.jumps||0}</div></article>
        <article class='card'><div class='name'>Coins</div><div class='value'>${s.coins||0}</div></article>
        <article class='card'><div class='name'>Stomps</div><div class='value'>${s.stomps||0}</div></article>
        <article class='card'><div class='name'>Deaths</div><div class='value'>${s.deaths||0}</div></article>
        <article class='card'><div class='name'>Runs</div><div class='value'>${s.runs||0}</div></article>
        <article class='card'><div class='name'>Levels Completed</div><div class='value'>${s.levelsCompleted||0}</div></article>
      `;
      return;
    }

    const items = CATALOG[type];
    const owned = loadOwned();
    const eq = loadEquipped();
    grid.innerHTML = '';

    items.forEach(item => {
      const node = tmpl.content.firstElementChild.cloneNode(true);
      const prev = node.querySelector('.preview');
      const nameEl = node.querySelector('.name');
      const rarityEl = node.querySelector('.rarity');
      const buyBtn = node.querySelector('.buy');

      nameEl.textContent = item.name;
      rarityEl.textContent = item.rarity.toUpperCase();
      rarityEl.classList.add('rarity', item.rarity);
      node.classList.add(item.rarity);

      // Preview
      if (type === 'skins') {
        const div = document.createElement('div');
        div.style.width='40px'; div.style.height='52px'; div.style.borderRadius='6px'; div.style.background=item.preview.player; prev.appendChild(div);
      } else if (type === 'themes') {
        prev.style.background = item.preview.bg;
        const plat = document.createElement('div'); plat.style.width='70%'; plat.style.height='16px'; plat.style.background=item.preview.platform; plat.style.borderRadius='8px'; prev.appendChild(plat);
      } else if (type === 'backgrounds') {
        prev.style.background = `linear-gradient(180deg, ${item.preview.bg1}, ${item.preview.bg2})`;
      } else if (type === 'accessories') {
        prev.textContent = item.preview || '🎩';
      }

      // Equip state
      let isEquipped=false;
      const eqAcc = (eq.accessories||{head:null,eyes:null});
      if (type === 'themes') isEquipped = (eq.theme === item.id);
      if (type === 'skins') isEquipped = (eq.skin === item.id);
      if (type === 'backgrounds') isEquipped = (eq.background === item.id);
      if (type === 'accessories') isEquipped = (eqAcc[item.slot] === item.id);

      // Gating
      const isOwned = owned.has(item.id);
      const minLvl = item.minLevel || 1;
      const meetsLevel = maxLevel() >= minLvl;

      if (!isOwned) {
        const price = item.price || PRICES[item.rarity] || 1000;
        const canBuy = loadWallet() >= price && meetsLevel;
        if (!meetsLevel) node.querySelector('.meta').prepend(lockBadge(minLvl));
        buyBtn.textContent = `Buy • ${price}`;
        buyBtn.disabled = !canBuy;
        buyBtn.onclick = () => {
          if (!meetsLevel) return;
          const w = loadWallet(); if (w < price) return;
          saveWallet(w - price); owned.add(item.id); saveOwned(owned);
          if (type === 'themes') eq.theme = item.id;
          if (type === 'skins') eq.skin = item.id;
          if (type === 'backgrounds') eq.background = item.id;
          if (type === 'accessories') { eq.accessories = eqAcc; eq.accessories[item.slot] = item.id; }
          saveEquipped(eq); updateWalletUI(); render(type);
        };
      } else if (!isEquipped) {
        buyBtn.textContent = 'Equip';
        buyBtn.onclick = () => {
          if (type === 'themes') eq.theme = item.id;
          if (type === 'skins') eq.skin = item.id;
          if (type === 'backgrounds') eq.background = item.id;
          if (type === 'accessories') { eq.accessories = eqAcc; eq.accessories[item.slot] = item.id; }
          saveEquipped(eq); render(type);
        };
      } else {
        buyBtn.textContent = 'Equipped'; buyBtn.disabled = true;
      }

      grid.appendChild(node);
    });
  }

  tabs.forEach(t => t.addEventListener('click', () => { tabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); render(t.dataset.tab); }));
  ensureDefaults(); updateWalletUI(); render('themes');
})();
