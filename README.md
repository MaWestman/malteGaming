# Maltes Gamingsida! — 2D Jump Game

A cheerful 2D runner built with **HTML5 Canvas** and **vanilla JavaScript**. Now with **double jump**, **patrolling enemies** (stomp to defeat), coins, spikes, scoring, and a playful animated landing page.

## Project
```
/ (Landing page: index.html)
├─ index.html    # fun, animated landing page
├─ site.css
├─ game.html     # the game
├─ game.css
├─ game.js
└─ assets/
   ├─ audio/ (jump.wav, coin.wav, hit.wav)
   └─ images/ (favicon.svg placeholder)
```

## Run locally
- Open `index.html` directly, or run a static server:
  ```bash
  npx serve -l 5173
  # or
  npx http-server . -p 5173
  ```
  Then open http://localhost:5173

## Controls
- **Jump**: Space / W / ↑ / Tap / on‑screen **Jump** button
- **Double jump**: Press jump again mid‑air (enabled by default)
- **Pause**: Pause button (also auto‑pauses on tab change)
- **Restart**: Restart button

## Notes
- High score is saved in `localStorage`.
- Tweak physics and difficulty at the top of `game.js`.
- To disable double jump, set `ALLOW_DOUBLE_JUMP = false` in `game.js`.

## Deploy
- Static‑host anywhere: GitHub Pages, Netlify, Vercel. No build step or CORS issues.
