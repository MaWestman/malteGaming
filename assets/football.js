(function(){
  const list = document.getElementById('football-list');
  const meta = document.getElementById('feed-meta');
  const upd = document.getElementById('fb-updated');
  const err = document.getElementById('football-error');
  const rel = 'assets/football.json';

  fetch(rel, {cache:'no-store'})
    .then(r=> r.ok? r.json() : Promise.reject(new Error('HTTP '+r.status)))
    .then(data => { try{ render(data); }catch(e){ console.error(e); fail(); } })
    .catch(e=>{ console.error(e); fail(); });

  function render(data){
    const items = (data && data.items)||[];
    const sources = (data && data.sources)||[];
    const updated = data && data.generatedAt;

    upd.textContent = updated? `(uppdaterad ${fmtTime(updated)})` : '';

    list.innerHTML = '';
    if (!items.length){ list.innerHTML = '<div class="muted">Inga nyheter just nu.</div>'; return; }

    items.forEach(it=>{
      const card = document.createElement('article'); card.className='feed-card';
      const a = document.createElement('a'); a.href = it.link; a.target='_blank'; a.rel='noopener'; a.textContent = it.title || it.link;
      const when = document.createElement('div'); when.className='when'; when.textContent = fmtTime(it.isoDate || it.pubDate || it.date);
      const src = document.createElement('div'); src.className='src'; src.textContent = it.source || host(it.link);
      card.appendChild(a); card.appendChild(when); card.appendChild(src);
      list.appendChild(card);
    });

    meta.innerHTML = '';
    const ul = document.createElement('ul'); ul.style.margin='6px 0 0';
    (sources||[]).forEach(s=>{ const li = document.createElement('li'); li.textContent = `${s.title} — ${s.url}`; ul.appendChild(li); });
    meta.appendChild(ul);
  }

  function fail(){ err.hidden=false; }
  function host(u){ try{ return new URL(u).hostname.replace('www.',''); }catch{ return ''; } }
  function fmtTime(s){ try{ const d = new Date(s); return d.toLocaleString(); }catch{ return s; } }
})();
