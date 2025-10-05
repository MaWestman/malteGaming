import Parser from 'rss-parser';
import fs from 'node:fs';
import path from 'node:path';
const FEEDS = (process.env.FEEDS||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean);
const MODE = (process.env.MODE||'TEAM').toUpperCase();
const TEAM_KEYWORDS = (process.env.TEAM_KEYWORDS||'Elfsborg').split(/,|;/).map(s=>s.trim()).filter(Boolean);
const MAX_ITEMS = parseInt(process.env.MAX_ITEMS||'24', 10);
const parser = new Parser({ timeout: 20000, headers: { 'user-agent': 'MaltesGamingsidaFeedBot/1.0 (+github actions)' }});
function normItem(item, feed){ const date = item.isoDate || item.pubDate || item.pubdate || item.date || item.published || item.updated; return { title: (item.title||'').trim(), link: (item.link||'').trim(), isoDate: date ? new Date(date).toISOString() : null, source: feed && (feed.title || host(feed.link) || host(feed.feedUrl) || null) }; }
function host(u){ try{ return new URL(u).hostname.replace('www.',''); }catch{ return null; } }
function matchTeam(it){ const t = `${it.title} ${it.link}`.toLowerCase(); return TEAM_KEYWORDS.some(k=> t.includes(k.toLowerCase())); }
(async () => { const out = { generatedAt: new Date().toISOString(), sources: [], items: [] }; for (const url of FEEDS){ try{ const feed = await parser.parseURL(url); out.sources.push({ title: feed.title || host(url) || url, url }); let items = (feed.items||[]).map(i=> normItem(i, feed)).filter(i=> i.title && i.link); if (MODE === 'TEAM') items = items.filter(matchTeam); out.items.push(...items); }catch(e){ out.sources.push({ title: host(url) || url, url, error: String(e) }); } } const seen = new Set(); out.items.sort((a,b)=> (b.isoDate||'').localeCompare(a.isoDate||'')); out.items = out.items.filter(it=> (it.link && !seen.has(it.link) && seen.add(it.link))); if (Number.isFinite(MAX_ITEMS) && MAX_ITEMS>0) out.items = out.items.slice(0, MAX_ITEMS); const file = path.join('assets','football.json'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 2)); console.log('WROTE', file, out.items.length, 'items from', FEEDS.length, 'feeds'); })();
