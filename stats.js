
(()=>{ const K={STATS:'stats',HISCORE:'hiscore',MAXLVL:'maxLevelReached'}; function load(){try{return JSON.parse(localStorage.getItem(K.STATS)||'{}')}catch{return{}}}
  const grid=document.getElementById('statsGrid'); const s=load(); const items=[['Best Height',Number(localStorage.getItem(K.HISCORE)||0)],['Max Level',Number(localStorage.getItem(K.MAXLVL)||1)],['Total Jumps',s.jumps||0],['Coins',s.coins||0]]; if(grid) grid.innerHTML=items.map(x=>`<article class="card"><div>${x[0]}</div><div>${x[1]}</div></article>`).join(''); })();
