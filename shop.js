
(() => {
  'use strict';
  const K = { WALLET:'wallet', OWNED:'owned', EQUIPPED:'equipped' };
  const walletEl = document.getElementById('wallet');
  const grid = document.getElementById('grid');
  const tabs = document.querySelectorAll('.tab');
  const tmpl = document.getElementById('item-card');

  const PRICES = { common:200, rare:600, epic:1200, legendary:3000 };
  const CATALOG = {
    themes: [
      { id:'theme-default', name:'Default', rarity:'common', preview:{platform:'#5e81ac',bg:'#0f1a2b'} },
      { id:'theme-candy',   name:'Candy Pop', rarity:'rare', preview:{platform:'#f48fb1',bg:'#2a0c1c'} },
      { id:'theme-neon',    name:'Neon Night', rarity:'epic', preview:{platform:'#00f5d4',bg:'#05121a'} },
      { id:'theme-aurora',  name:'Aurora', rarity:'legendary', preview:{platform:'#7de07d',bg:'#06141f'} },
    ],
    skins: [
      // Commons — simpler colors, low FX
      { id:'skin-default',    name:'Blue Buddy',     rarity:'common',    preview:{player:'#7cd1f9'}, sprite:true },
      { id:'skin-bubblegum',  name:'Bubblegum',      rarity:'common',    preview:{player:'#ff7ab6'}, sprite:true },
      { id:'skin-lime',       name:'Lime Pop',       rarity:'common',    preview:{player:'#78ff6b'}, sprite:true },

      // Rares — bolder colors/patterns
      { id:'skin-camo',       name:'Camo',          rarity:'rare',      preview:{player:'#6da86b'}, sprite:true },
      { id:'skin-tiger',      name:'Tiger Stripes', rarity:'rare',      preview:{player:'#ff9e2f'}, sprite:true },
      { id:'skin-zebra',      name:'Zebra',         rarity:'rare',      preview:{player:'#ffffff'}, sprite:true },

      // Epics — neon/gradient
      { id:'skin-vapor',      name:'Vaporwave',     rarity:'epic',      preview:{player:'#00f5d4'}, sprite:true },
      { id:'skin-ember',      name:'Ember',         rarity:'epic',      preview:{player:'#ff5a3c'}, sprite:true },
      { id:'skin-icy',        name:'Icy',           rarity:'epic',      preview:{player:'#9ad7ff'}, sprite:true },

      // Legendaries — wild FX
      { id:'skin-galaxy',     name:'Galaxy',        rarity:'legendary', preview:{player:'#a78bfa'}, sprite:true },
      { id:'skin-glitch',     name:'Glitch',        rarity:'legendary', preview:{player:'#ff00aa'}, sprite:true },
      { id:'skin-holo',       name:'Holo Prism',    rarity:'legendary', preview:{player:'#b3ffe6'}, sprite:true },

      // Existing animated examples & flags
      { id:'skin-neon',       name:'Neon (Animated)',   rarity:'epic',       preview:{player:'#00f5d4'}, sprite:true },
      { id:'skin-royal',      name:'Royal (Animated)',  rarity:'legendary',  preview:{player:'#ffd166'}, sprite:true },
      { id:'flag-se', name:'Sweden (Animated)', rarity:'rare', preview:{flag:'se'}, sprite:true },
      { id:'flag-no', name:'Norway (Animated)', rarity:'epic', preview:{flag:'no'}, sprite:true },
      { id:'flag-dk', name:'Denmark (Animated)', rarity:'rare', preview:{flag:'dk'}, sprite:true },
      { id:'flag-fi', name:'Finland (Animated)', rarity:'rare', preview:{flag:'fi'}, sprite:true },
      { id:'flag-is', name:'Iceland (Animated)', rarity:'epic', preview:{flag:'is'}, sprite:true },
    ],
    backgrounds: [
      { id:'bg-default', name:'Deep Night', rarity:'common',   preview:{bg1:'#0f1a2b',bg2:'#162238'} },
      { id:'bg-forest',  name:'Forest Canopy', rarity:'rare',  preview:{bg1:'#0b1f14',bg2:'#143d28'} },
      { id:'bg-sunset',  name:'Sunset', rarity:'epic',         preview:{bg1:'#24122b',bg2:'#5b2542'} },
      { id:'bg-aurora',  name:'Aurora Sky', rarity:'legendary',preview:{bg1:'#0a0e2a',bg2:'#10385a'} },
    ]
  };

  function loadWallet(){ return Number(localStorage.getItem(K.WALLET)||0); }
  function saveWallet(v){ localStorage.setItem(K.WALLET, String(v)); }
  function loadOwned(){ try { return new Set(JSON.parse(localStorage.getItem(K.OWNED)||'[]')); } catch { return new Set(); } }
  function saveOwned(s){ localStorage.setItem(K.OWNED, JSON.stringify([...s])); }
  function loadEquipped(){ try { return JSON.parse(localStorage.getItem(K.EQUIPPED)||'{}'); } catch { return {}; } }
  function saveEquipped(e){ localStorage.setItem(K.EQUIPPED, JSON.stringify(e)); }

  function ensureDefaults(){
    const owned = loadOwned(); let changed=false;
    ['theme-default','skin-default','bg-default'].forEach(id=>{ if(!owned.has(id)){ owned.add(id); changed=true; }});
    if (changed) saveOwned(owned);
    const eq = loadEquipped();
    if (!eq.theme) eq.theme='theme-default';
    if (!eq.skin) eq.skin='skin-default';
    if (!eq.background) eq.background='bg-default';
    saveEquipped(eq);
  }

  function updateWalletUI(){ walletEl.textContent = String(loadWallet()); }

  function render(type){
    const items = CATALOG[type];
    const owned = loadOwned();
    const eq = loadEquipped();
    const key = type.slice(0,-1);
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

      if (type === 'skins') {
        if (item.preview.flag) {
          const f = document.createElement('div'); f.className = 'flag ' + item.preview.flag; f.style.width='44px'; f.style.height='52px'; f.style.borderRadius='6px'; prev.appendChild(f);
        } else {
          const ply = document.createElement('div'); ply.style.width='40px'; ply.style.height='52px'; ply.style.background=item.preview.player; ply.style.borderRadius='6px'; prev.appendChild(ply);
        }
      } else if (type === 'themes') {
        prev.style.background = item.preview.bg;
        const plat = document.createElement('div'); plat.style.width='70%'; plat.style.height='16px'; plat.style.background=item.preview.platform; plat.style.borderRadius='8px'; prev.appendChild(plat);
      } else if (type === 'backgrounds') {
        prev.style.background = `linear-gradient(180deg, ${item.preview.bg1}, ${item.preview.bg2})`;
      }

      const isOwned = owned.has(item.id);
      const isEquipped = eq[key] === item.id;
      if (!isOwned) {
        const price = PRICES[item.rarity];
        const canBuy = loadWallet() >= price;
        buyBtn.textContent = `Buy • ${price}`;
        buyBtn.disabled = !canBuy;
        buyBtn.onclick = () => {
          const w = loadWallet(); if (w < price) return;
          saveWallet(w - price); owned.add(item.id); saveOwned(owned);
          eq[key] = item.id; saveEquipped(eq);
          updateWalletUI(); render(type);
        };
      } else if (!isEquipped) {
        buyBtn.textContent = 'Equip';
        buyBtn.onclick = () => { eq[key] = item.id; saveEquipped(eq); render(type); };
      } else {
        buyBtn.textContent = 'Equipped'; buyBtn.disabled = true;
      }

      grid.appendChild(node);
    });
  }

  tabs.forEach(t => t.addEventListener('click', () => { tabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); render(t.dataset.tab); }));
  ensureDefaults(); updateWalletUI(); render('themes');
})();
