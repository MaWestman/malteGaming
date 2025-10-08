
# 2D Jump Game (Vanilla JS)

A lightweight, kid‑friendly 2D jumping runner built with **HTML5 Canvas** and **vanilla JavaScript**. Works on desktop and mobile (tap to jump, on‑screen Jump button). No frameworks or build step.

## Features
- Canvas 2D with HiDPI scaling
- Player jump physics (gravity, max fall)
- Infinite platforms with fair spacing
- Coins (+50) and spikes (game over)
- Distance‑based score + high score in `localStorage`
- States: menu, playing, paused, gameover
- Start / Pause / Restart buttons
- Mute toggle and basic SFX placeholders

## Getting started

### 1) Download & unzip
Download the ZIP, unzip, and open the folder.

### 2) Run locally (static server)
Open `index.html` directly works in most browsers, but for a smoother experience use a small static server:

- **VS Code**: Install *Live Server* extension → Right‑click `index.html` → **Open with Live Server**.
- **Node** (any terminal):
  ```bash
  npx serve -l 5173
  # or
  npx http-server . -p 5173
  ```
  Then open http://localhost:5173

### 3) Controls
- **Jump**: Space / W / ArrowUp / Tap / on‑screen **Jump** button
- **Pause**: Pause button (or browser tab change pauses automatically)
- **Restart**: Restart button

### 4) Deploy
- **GitHub Pages**: Push this folder to a repo → Settings → Pages → Deploy from *main* → `/`.
- **Netlify/Vercel**: Drag‑and‑drop the folder in the dashboard.

## Customization
- Tweak gameplay in `game.js` top constants (gravity, jump velocity, scroll speed, spawn sizes).
- Replace rectangle art with sprites in `draw()` (hooks are commented for player/platform drawing).
- Add more hazards or a double jump (see TODO comments in code).

## License
You are free to use and modify this project for personal or educational use.
