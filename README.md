# REVERB — Static Site

Dark, bold, editorial music-criticism site. Long-form reviews, dual rating system (critic + community), and a native **SR7 motion layer** for cinematic transitions.

🔴 **Live:** https://reverb-music-five.vercel.app

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| `index.html` | `/` | Homepage — hero slider, Mood Board filmstrip, editorial grid |
| `browse.html` | `/browse` | Full review archive with genre/tag filters |
| `review.html` | `/review?id=...` | Individual review — parallax hero, dual scorecard, tracklist voting |
| `community.html` | `/community` | Comments, Fan Rankings, community votes |
| `artist.html` | `/artist?name=...` | Artist profile + dynamic review grid |
| `new.html` | `/new` | Best New Music / latest releases |
| `profile.html` | `/profile` | User profile & taste data |
| `admin.html` | `/admin` | Editorial pipeline + Spotify draft generator |

## SR7 Motion Layer

Native motion system (`reverb-sr7.css` + `reverb-sr7.js`, inlined per page):

- 🎬 Branded loading screen (3-dot bounce)
- 📜 Scroll-reveal with `IntersectionObserver`
- ⚡ Staggered grid entry animations
- 🖼️ Genre-mapped Instagram-style cover filters
- ✨ Elastic-pop score chips
- 🌀 Shimmer skeleton loaders
- 🎭 Hero wipe transitions
- 🔧 Global `window.REVERB_SR7` API: `.wipe()`, `.applyFilter()`, `.shimmer()`

## Brand

- **Colors:** Void Black `#0A0A0A` · REVERB Red `#E8363A` · Score Gold `#F5C518` · Community Blue `#4A9EFF`
- **Type:** Playfair Display (headlines) · Lora (body) · Inter (UI) · DM Mono (scores)

## Stack

Static HTML + shared partials build system. Data hydrated from Base44 (`Review`, `Comment`, `CommunityVote` entities) via public-safe API proxy. Deployed on Vercel.

## Deploy

```bash
vercel --prod
```

Routing handled by `vercel.json` (clean URLs, query-string canonical patterns).
