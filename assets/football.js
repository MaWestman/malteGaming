(function(){
  const list = document.getElementById('football-list');
  const upd  = document.getElementById('fb-updated');
  const err  = document.getElementById('football-error');
  fetch('assets/football.json', {cache:'no-store'})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)))
    .then(data => render(data))
    .catch(e => { console.error(e); err.hidden=false; });
  function render(data){
    const items = (data && data.items) || [];
    const updated = data && data.generatedAt;
    upd.textContent = updated? `(uppdaterad ${new Date(updated).toLocaleString()})` : '';
    if (!items.length){ list.innerHTML = '<div class="muted">Inga nyheter ännu.</div>'; return; }
    list.innerHTML = '';
    items.forEach(it => {
      const a = document.createElement('a'); a.href = it.link; a.target='_blank'; a.rel='noopener'; a.textContent = it.title || it.link;
      const c = document.createElement('article'); c.className='feed-card';
      const w = document.createElement('div'); w.className='when'; w.textContent = it.isoDate ? new Date(it.isoDate).toLocaleString() : '';
      const s = document.createElement('div'); s.className='src';  s.textContent = it.source || (it.link? new URL(it.link).hostname.replace('www.','') : '');
      c.appendChild(a); c.appendChild(w); c.appendChild(s); list.appendChild(c);
    });
  }
})();
