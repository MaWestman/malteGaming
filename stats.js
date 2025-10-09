
(()=>{
  const K={STATS:'stats',HISCORE:'hiscore',MAXLVL:'maxLevelReached'};
  function load(){try{return JSON.parse(localStorage.getItem(K.STATS)||'{}')}catch{return{}}}
  function get(k,d=0){const s=load();return k in s?s[k]:d}
  const grid=document.getElementById('statsGrid');
  const items=[['Best Height',Number(localStorage.getItem(K.HISCORE)||0)],['Max Level Reached',Number(localStorage.getItem(K.MAXLVL)||1)],['Total Points',get('totalPoints',0)],['Total Time (min)',(get('timeSec',0)/60).toFixed(1)],['Jumps',get('jumps',0)],['Coins',get('coins',0)],['Stomps',get('stomps',0)],['Deaths',get('deaths',0)],['Runs',get('runs',0)],['Levels Completed',get('levelsCompleted',0)]];
  if(grid) grid.innerHTML=items.map(x=>`<article class="card"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></article>`).join('');
})();
