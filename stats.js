
(() => {
  'use strict';
  const K = { STATS:'stats', HISCORE:'hiscore', MAXLVL:'maxLevelReached' };
  function loadStats(){ try { return JSON.parse(localStorage.getItem(K.STATS)||'{}'); } catch { return {}; } }
  function get(k, d=0){ const s=loadStats(); return (k in s)? s[k] : d; }
  const grid=document.getElementById('statsGrid');
  const items=[
    {label:'Best Height', value:String(Number(localStorage.getItem(K.HISCORE)||0))},
    {label:'Max Level Reached', value:String(Number(localStorage.getItem(K.MAXLVL)||1))},
    {label:'Total Points Earned', value:String(get('totalPoints',0))},
    {label:'Total Time (min)', value:(get('timeSec',0)/60).toFixed(1)},
    {label:'Total Jumps', value:String(get('jumps',0))},
    {label:'Coins Collected', value:String(get('coins',0))},
    {label:'Enemies Stomped', value:String(get('stomps',0))},
    {label:'Deaths', value:String(get('deaths',0))},
    {label:'Runs Started', value:String(get('runs',0))},
    {label:'Levels Completed', value:String(get('levelsCompleted',0))},
  ];
  grid.innerHTML = items.map(it=>`<article class="card"><div class="label">${it.label}</div><div class="value">${it.value}</div></article>`).join('');
  const ach=[]; const maxLvl = Number(localStorage.getItem(K.MAXLVL)||1); const coins=get('coins',0);
  ach.push({done:maxLvl>=10, text:'Reach Level 10'});
  ach.push({done:maxLvl>=25, text:'Reach Level 25'});
  ach.push({done:maxLvl>=50, text:'Reach Level 50'});
  ach.push({done:maxLvl>=75, text:'Reach Level 75'});
  ach.push({done:maxLvl>=100, text:'Reach Level 100'});
  ach.push({done:coins>=500, text:'Collect 500 coins'});
  ach.push({done:coins>=2000, text:'Collect 2000 coins'});
  document.getElementById('achList').innerHTML = ach.map(a=>`<li class="${a.done?'done':''}">${a.done?'✅':'⬜️'} ${a.text}</li>`).join('');
})();
