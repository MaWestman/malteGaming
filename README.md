# Maltes gamingsida! — GitHub Pages package

This package contains a ready-to-deploy kid‑friendly website with the game **Neon Ascent** (including Daily Gift, extended lifetime stats, falls/streaks, combo climb, PB list) and a run **Summary popup** after each clear.

## Structure
```
/                   # Home portal
  index.html
  assets/
    site.css        # Global look & feel
  games/
    index.html      # Games hub
    neon-ascent/
      index.html    # Game page (back link goes two folders up to site root)
      style.css
      game.js
README.md
```

## Deploy (GitHub Pages)
1. Create a new repo (e.g. `maltesgamingsida`).
2. Extract this ZIP into the repo root and commit+push.
3. In **Settings → Pages**, choose the `main` branch, `/ (root)` folder, and Save.
4. Wait ~1–2 minutes. Your site will be live at `https://<user>.github.io/<repo>/`.

> Note: All links are **relative**, so the site works both on a user site (`<user>.github.io`) and a project site (`<user>.github.io/<repo>`). The game page back link points to `../../`.

## Next steps (optional)
- **Football newsfeed**: We can hook up a trusted feed via a CORS‑friendly API or a tiny serverless proxy.
- **Reset stats** button in Stats overlay.
- **Gold breakdown** line in the Summary (Climb vs Landing vs Bonuses).

— Built on 2025-10-05 —
