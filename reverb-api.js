/**
 * REVERB Live Data Layer v2
 * Handles all API calls, DOM hydration, animations, and interactions.
 */

const REVERB_ARTIST_URL = 'https://base44.app/api/apps/6a2f58c44ff7e6f8f62a1de4/files/mp/public/6a2f58c44ff7e6f8f62a1de4/40f5e03de_artist_live.html';
const REVERB_API = 'https://shopify-copy-f62a1de4.base44.app/functions/reverbData';

// ── Cover image map (Unsplash by artist) ────────────────────────────────────
const COVER_MAP = {
  'aphex twin':       'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'sza':              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  'kendrick lamar':   'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&q=80',
  'radiohead':        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80',
  'charli xcx':       'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
  'sturgill simpson': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&q=80',
};

function getCover(r) {
  if (r.cover_image && !r.cover_image.includes('placeholder')) return r.cover_image;
  const key = (r.artist || '').toLowerCase();
  for (const [k, v] of Object.entries(COVER_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  const hue = Array.from(r.artist || '').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return null; // fallback to gradient
}

function coverBg(r) {
  const img = getCover(r);
  if (img) return `url(${img})`;
  const hue = Array.from(r.artist || '').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue},30%,12%), hsl(${(hue+60)%360},25%,8%))`;
}

function scoreColor(s) {
  const n = parseFloat(s);
  if (n >= 9.0) return '#1DB954';
  if (n >= 8.0) return '#F5C518';
  if (n >= 7.0) return '#FF9800';
  return '#E8363A';
}

// ── Fetch helper ────────────────────────────────────────────────────────────
async function reverbFetch(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${REVERB_API}?${qs}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── Scroll reveal ────────────────────────────────────────────────────────────
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ── Mobile nav ────────────────────────────────────────────────────────────────
function initMobileNav() {
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if (!burger || !navLinks) return;
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    burger.setAttribute('aria-expanded', open);
    burger.innerHTML = open ? '✕' : '☰';
  });
  document.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('mobile-open');
      burger.innerHTML = '☰';
    }
  });
}

// ── Score counter animation ──────────────────────────────────────────────────
function animateScore(el, target, duration = 800) {
  const start = performance.now();
  const from = 0;
  const to = parseFloat(target);
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = (from + (to - from) * ease).toFixed(1);
    el.textContent = val;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOMEPAGE
// ═══════════════════════════════════════════════════════════════════════════════
async function hydrateHomepage() {
  let data;
  try { data = await reverbFetch({ endpoint: 'homepage' }); }
  catch(e) { console.warn('API unavailable:', e); return; }

  const { hero, recent, top_of_year, genres, ticker, stats } = data;

  // ── Ticker
  const tickerInner = document.querySelector('.ticker-inner');
  if (tickerInner && ticker?.length) {
    const items = [...ticker, ...ticker].map(t => `<span>◆&nbsp;&nbsp;${t}&nbsp;&nbsp;</span>`).join('');
    tickerInner.innerHTML = items;
  }

  // ── Hero
  if (hero) {
    const img = getCover(hero);
    const heroBg = document.querySelector('.hero-image img, .hero-image');
    if (heroBg && img) {
      if (heroBg.tagName === 'IMG') { heroBg.src = img; heroBg.alt = `${hero.artist} — ${hero.album}`; }
      else heroBg.style.backgroundImage = `url(${img})`;
    }
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    const setHtml = (sel, val) => { const el = document.querySelector(sel); if (el) el.innerHTML = val; };
    const setHref = (sel, val) => { const el = document.querySelector(sel); if (el) el.href = val; };

    set('.hero-artist', hero.artist);
    set('.hero-genre', hero.genre || '');
    set('.hero-title', hero.album);
    set('.hero-summary', hero.summary || '');
    setHref('.hero-cta', `review.html?id=${hero.id}`);
    set('.hero-byline strong', hero.author_name || 'Staff');

    const criticEl = document.querySelector('.score-num.critic');
    const communityEl = document.querySelector('.score-num.community');
    if (criticEl) {
      criticEl.style.color = scoreColor(hero.rating);
      animateScore(criticEl, hero.rating);
    }
    if (communityEl && hero.community_score) {
      communityEl.style.color = scoreColor(hero.community_score);
      animateScore(communityEl, hero.community_score.toFixed(1));
    }

    const badge = document.querySelector('.hero-badge');
    if (badge) badge.style.display = hero.is_best_new_music ? '' : 'none';
  }

  // ── Stats counter
  if (stats) {
    const statNums = document.querySelectorAll('.stat-num');
    const vals = [stats.total_reviews, '47K', stats.writers, '18K'];
    statNums.forEach((el, i) => { if (vals[i]) el.textContent = vals[i]; });
  }

  // ── Reviews grid
  const grid = document.querySelector('.reviews-grid');
  if (grid && recent?.length) {
    grid.innerHTML = recent.map((r, i) => {
      const img = getCover(r);
      const bg = img ? `background-image:url(${img})` : coverBg(r).includes('url') ? `background-image:${coverBg(r)}` : `background:${coverBg(r)}`;
      return `
      <article class="review-card reveal" style="--delay:${i * 60}ms" data-genre="${r.genre || ''}" data-id="${r.id}">
        <a href="review.html?id=${r.id}" class="card-link" aria-label="${r.artist} — ${r.album}">
          <div class="card-image">
            <div class="card-cover" style="${bg};background-size:cover;background-position:center;"></div>
            <div class="card-scores">
              <div class="card-score critic" style="color:${scoreColor(r.rating)}">${r.rating}</div>
              <div class="card-score community">${r.community_score?.toFixed ? r.community_score.toFixed(1) : r.community_score}</div>
            </div>
            ${r.is_best_new_music ? '<div class="card-bnm"><span class="bnm-badge">★ BNM</span></div>' : ''}
          </div>
          <div class="card-body">
            <div class="card-genre">${r.genre || ''}</div>
            <div class="card-artist"><a href="${REVERB_ARTIST_URL}?artist=${encodeURIComponent(r.artist)}" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;border-bottom:1px dotted rgba(255,255,255,0.2)">${r.artist}</a></div>
            <div class="card-album">${r.album}</div>
            <div class="card-review-title">${r.title || ''}</div>
          </div>
          <div class="card-overlay"></div>
        </a>
      </article>`;
    }).join('');
    initScrollReveal();
  }

  // ── Genre pill filter (live)
  const pillsContainer = document.querySelector('.genre-pills');
  if (pillsContainer) {
    const allGenres = ['All', ...(genres || [])];
    pillsContainer.innerHTML = allGenres.map((g, i) => `
      <button class="genre-pill${i===0?' active':''}" data-genre="${g === 'All' ? 'all' : g}">${g}</button>
    `).join('');
    pillsContainer.addEventListener('click', e => {
      const pill = e.target.closest('.genre-pill');
      if (!pill) return;
      pillsContainer.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const genre = pill.dataset.genre;
      const cards = document.querySelectorAll('.review-card');
      cards.forEach(card => {
        const match = genre === 'all' || (card.dataset.genre || '') === genre;
        card.style.opacity = match ? '1' : '0.25';
        card.style.transform = match ? '' : 'scale(0.96)';
        card.style.pointerEvents = match ? '' : 'none';
      });
    });
  }

  // ── Top of year
  const topList = document.querySelector('.top-list');
  if (topList && top_of_year?.length) {
    topList.innerHTML = top_of_year.map((r, i) => {
      const img = getCover(r);
      return `
      <a href="review.html?id=${r.id}" class="top-item reveal" style="--delay:${i * 50}ms">
        <span class="top-rank">${String(i+1).padStart(2,'0')}</span>
        <div class="top-cover" style="${img ? `background-image:url(${img})` : coverBg(r).includes('url') ? `background-image:${coverBg(r)}` : `background:${coverBg(r)}`};background-size:cover;background-position:center;"></div>
        <div class="top-info">
          <div class="top-album">${r.album}</div>
          <div class="top-artist">${r.artist}</div>
        </div>
        <div class="top-score" style="color:${scoreColor(r.rating)}">${r.rating}</div>
      </a>`;
    }).join('');
    initScrollReveal();
  }

  initScrollReveal();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
window._reverbAllReviews = [];

async function hydrateBrowse() {
  try {
    const data = await reverbFetch({ endpoint: 'browse', limit: 50 });
    window._reverbAllReviews = data.reviews || [];
    renderBrowseResults(window._reverbAllReviews);
  } catch(e) { console.warn('Browse API error:', e); }
}

function renderBrowseResults(reviews) {
  const gridView = document.getElementById('gridView');
  const listView = document.getElementById('listView');
  const countEl = document.getElementById('resultsCount');
  if (countEl) countEl.innerHTML = `<strong>${reviews.length}</strong> review${reviews.length !== 1 ? 's' : ''}`;

  if (gridView) {
    if (!reviews.length) {
      gridView.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#5A5A5A;">No reviews match your filters.</div>';
    } else {
      gridView.innerHTML = reviews.map((r, i) => {
        const img = getCover(r);
        const bgStyle = img ? `background-image:url(${img})` : `background:${coverBg(r)}`;
        return `
        <article class="result-card reveal" style="--delay:${(i%12)*40}ms" data-genre="${r.genre||''}" data-score="${r.rating}">
          <a href="review.html?id=${r.id}" style="text-decoration:none;color:inherit;display:block;">
            <div class="result-cover" style="${bgStyle};background-size:cover;background-position:center;">
              <div class="result-score-overlay">
                <div class="result-score critic-score" style="color:${scoreColor(r.rating)}">${r.rating}</div>
              </div>
              ${r.is_best_new_music ? '<div class="result-bnm">BNM</div>' : ''}
            </div>
            <div class="result-info">
              <div class="result-genre">${r.genre || ''}</div>
              <div class="result-album">${r.album}</div>
              <div class="result-artist">${r.artist}</div>
              <div class="result-scores-row">
                <span class="result-label">Critic</span>
                <span class="result-critic-val" style="color:${scoreColor(r.rating)}">${r.rating}</span>
                <span class="result-sep">·</span>
                <span class="result-label">Fan</span>
                <span class="result-comm-val">${r.community_score?.toFixed ? r.community_score.toFixed(1) : r.community_score}</span>
              </div>
            </div>
          </a>
        </article>`;
      }).join('');
    }
    initScrollReveal();
  }

  if (listView) {
    if (!reviews.length) {
      listView.innerHTML = '<div style="text-align:center;padding:60px 0;color:#5A5A5A;">No reviews match your filters.</div>';
    } else {
      listView.innerHTML = reviews.map((r, i) => {
        const img = getCover(r);
        return `
        <a href="review.html?id=${r.id}" class="list-item reveal" style="--delay:${(i%20)*30}ms" data-genre="${r.genre||''}" data-score="${r.rating}">
          <div class="list-num">${String(i+1).padStart(2,'0')}</div>
          <div class="list-cover" style="${img ? `background-image:url(${img})` : `background:${coverBg(r)}`};background-size:cover;background-position:center;"></div>
          <div class="list-meta">
            <div class="list-title">${r.album} <span style="color:#5A5A5A;font-weight:400">—</span> ${r.artist}</div>
            <div class="list-sub">${r.genre || ''} · ${r.label || ''} · ${r.release_year || ''}</div>
            <div class="list-summary">${(r.summary || '').slice(0,110)}${r.summary?.length > 110 ? '…' : ''}</div>
          </div>
          <div class="list-scores">
            <div class="list-score-val" style="color:${scoreColor(r.rating)}">${r.rating}</div>
            <div class="list-score-label">CRITIC</div>
            <div class="list-score-val community" style="color:#4A9EFF;margin-top:8px">${r.community_score?.toFixed ? r.community_score.toFixed(1) : r.community_score}</div>
            <div class="list-score-label">FAN</div>
          </div>
        </a>`;
      }).join('');
    }
    initScrollReveal();
  }
}

window.reverbApplyFilters = function({ genre, minScore, search, sort } = {}) {
  let reviews = [...(window._reverbAllReviews || [])];
  if (genre && genre !== 'all') reviews = reviews.filter(r => (r.genre||'').toLowerCase() === genre.toLowerCase());
  if (minScore > 0) reviews = reviews.filter(r => parseFloat(r.rating) >= minScore);
  if (search) {
    const q = search.toLowerCase();
    reviews = reviews.filter(r => [r.artist, r.album, r.title, r.genre].some(f => (f||'').toLowerCase().includes(q)));
  }
  if (sort === 'score') reviews = [...reviews].sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
  if (sort === 'community') reviews = [...reviews].sort((a,b) => parseFloat(b.community_score||0) - parseFloat(a.community_score||0));
  renderBrowseResults(reviews);
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW PAGE
// ═══════════════════════════════════════════════════════════════════════════════
async function hydrateReview() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  let data;
  try { data = await reverbFetch({ endpoint: 'review', id }); }
  catch(e) { console.warn('Review API error:', e); return; }

  const r = data.review;
  if (!r) return;

  const pageTitle = `${r.artist} — ${r.album} | REVERB`;
  const pageDesc = r.summary || `A REVERB review of ${r.album} by ${r.artist}.`;
  const pageUrl = `https://reverb-music-five.vercel.app/review.html?id=${r.id}`;
  document.title = pageTitle;

  // Dynamic SEO meta injection
  const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
  const setLink = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
  setMeta('meta[name="description"]', 'content', pageDesc);
  setMeta('meta[property="og:title"]', 'content', pageTitle);
  setMeta('meta[property="og:description"]', 'content', pageDesc);
  setMeta('meta[property="og:url"]', 'content', pageUrl);
  setMeta('meta[name="twitter:title"]', 'content', pageTitle);
  setMeta('meta[name="twitter:description"]', 'content', pageDesc);
  setLink('link[rel="canonical"]', 'href', pageUrl);

  const img = getCover(r);
  if (img) {
    setMeta('meta[property="og:image"]', 'content', img);
    setMeta('meta[name="twitter:image"]', 'content', img);
  }

  // Hero image
  const heroImg = document.querySelector('.review-hero-img');
  if (heroImg && img) { heroImg.src = img; heroImg.alt = `${r.artist} — ${r.album}`; }
  else if (!heroImg && img) {
    const hero = document.querySelector('.review-hero');
    if (hero) { hero.style.backgroundImage = `url(${img})`; hero.style.backgroundSize = 'cover'; hero.style.backgroundPosition = 'center top'; }
  }

  const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
  const setHtml = (sel, val) => { const el = document.querySelector(sel); if (el) el.innerHTML = val; };

  set('.review-artist-label', r.artist);
  set('.review-album-title', r.album);
  set('.review-headline', r.title || '');
  set('.review-breadcrumb .review-genre-crumb', r.genre || '');
  set('.review-breadcrumb .review-artist-crumb', r.artist || '');

  // Meta
  const authorEl = document.querySelector('.review-meta-author');
  if (authorEl) authorEl.textContent = r.author_name || 'Staff';
  const dateEl = document.querySelector('.review-meta-date');
  if (dateEl && r.published_date) dateEl.textContent = new Date(r.published_date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const labelEl = document.querySelector('.review-meta-label');
  if (labelEl) labelEl.textContent = `${r.label || ''} · ${r.release_year || ''}`;

  // Genre tags
  const genreTagsEl = document.querySelector('.review-genre-tags');
  if (genreTagsEl) genreTagsEl.innerHTML = [r.genre, ...(r.mood_tags || [])].filter(Boolean).map(t => `<span class="genre-tag">${t}</span>`).join('');

  // BNM badge
  const bnm = document.querySelector('.bnm-badge');
  if (bnm) bnm.style.display = r.is_best_new_music ? '' : 'none';

  // Scores with animation
  const criticEl = document.querySelector('.score-panel-num.critic');
  if (criticEl) {
    criticEl.style.color = scoreColor(r.rating);
    animateScore(criticEl, r.rating);
  }
  const criticBar = document.querySelector('.score-bar-fill.critic');
  if (criticBar) {
    setTimeout(() => { criticBar.style.transition = 'width 1s cubic-bezier(.4,0,.2,1)'; criticBar.style.width = `${parseFloat(r.rating)*10}%`; }, 200);
  }
  const criticSub = document.querySelector('.score-panel .score-panel-sub');
  if (criticSub) criticSub.textContent = `Editorial rating by ${r.author_name || 'Staff'}`;

  const commEl = document.querySelector('.score-panel-num.community');
  if (commEl && r.community_score != null) {
    commEl.style.color = '#4A9EFF';
    animateScore(commEl, r.community_score.toFixed ? r.community_score.toFixed(1) : r.community_score);
  }
  const commBar = document.querySelector('.score-bar-fill.community');
  if (commBar) {
    setTimeout(() => { commBar.style.transition = 'width 1s cubic-bezier(.4,0,.2,1)'; commBar.style.width = `${parseFloat(r.community_score||0)*10}%`; }, 300);
  }
  const commSub = document.querySelectorAll('.score-panel .score-panel-sub')[1];
  if (commSub) commSub.textContent = `Based on ${(r.community_votes||0).toLocaleString()} community ratings`;

  // Article content
  const ledeEl = document.querySelector('.article-lede');
  if (ledeEl) ledeEl.textContent = r.summary || '';
  const bodyEl = document.querySelector('.article-text');
  if (bodyEl && r.body) bodyEl.innerHTML = r.body;

  // Tags
  const tagsEl = document.querySelector('.article-tags');
  if (tagsEl && r.tags?.length) {
    tagsEl.innerHTML = r.tags.map(t => `<span class="article-tag">${t}</span>`).join('');
  }

  // Spotify embed
  if (r.spotify_album_id) {
    const spotifySection = document.querySelector('.spotify-embed');
    if (spotifySection) {
      spotifySection.innerHTML = `
        <iframe style="border-radius:8px" 
          src="https://open.spotify.com/embed/album/${r.spotify_album_id}?utm_source=generator&theme=0" 
          width="100%" height="152" frameborder="0" 
          allowfullscreen="" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy">
        </iframe>`;
      spotifySection.style.display = '';
    }
  }

  // Tracklist + sidebar meta
  renderTracklist(r);

  // Interactive star rating
  initStarRating(r);
}

// ── Tracklist renderer ───────────────────────────────────────────────────────
function renderTracklist(r) {
  const tracks = r.tracklist;
  const tracklistEl = document.querySelector('.sidebar-tracklist');
  if (!tracklistEl) return;

  function parseDuration(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  }
  function formatRuntime(secs) {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
      return h + 'h ' + m + 'm';
    }
    const m = Math.floor(secs / 60), s = secs % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  if (!tracks || !tracks.length) return;

  const totalSecs = tracks.reduce((sum, t) => sum + parseDuration(t.duration), 0);

  // Update sidebar Tracks + Runtime counts
  document.querySelectorAll('.sidebar-info-row').forEach(row => {
    const lbl = row.querySelector('.sidebar-info-label');
    const val = row.querySelector('.sidebar-info-value');
    if (!lbl || !val) return;
    if (lbl.textContent.trim() === 'Tracks') val.textContent = tracks.length;
    if (lbl.textContent.trim() === 'Runtime') val.textContent = formatRuntime(totalSecs);
  });

  const SHOW_LIMIT = 20;
  const visible = tracks.length <= SHOW_LIMIT ? tracks : tracks.slice(0, SHOW_LIMIT);

  function buildRow(t, idx) {
    const num = String(t.number || idx + 1).padStart(2, '0');
    const feat = t.features && t.features.length
      ? '<span class=\"track-feat\"> feat. ' + t.features.join(', ') + '</span>'
      : '';
    const href = t.spotify_track_id
      ? 'href=\"https://open.spotify.com/track/' + t.spotify_track_id + '\" target=\"_blank\" rel=\"noopener\"'
      : '';
    return '<a class=\"track\" ' + href + '>' +
      '<span class=\"track-num\">' + num + '</span>' +
      '<span class=\"track-name\">' + t.title + feat + '</span>' +
      '<span class=\"track-play\">\u25b6</span>' +
      '<span class=\"track-duration\">' + (t.duration || '') + '</span>' +
      '</a>';
  }

  let html = '<div class=\"sidebar-section-title\">Tracklist</div>';
  html += visible.map((t, i) => buildRow(t, i)).join('');

  if (tracks.length > SHOW_LIMIT) {
    const rest = tracks.slice(SHOW_LIMIT);
    html += '<button class=\"tracklist-expand-btn\" onclick=\"window.expandTracklist(this)\" data-tracks=\'' +
      JSON.stringify(rest).replace(/'/g, '&#39;') + '\'>' +
      '+ ' + rest.length + ' more tracks</button>';
  }

  html += '<div class=\"tracklist-runtime\">' + tracks.length + ' tracks &middot; ' + formatRuntime(totalSecs) + ' total</div>';

  tracklistEl.innerHTML = html;
}

window.expandTracklist = function(btn) {
  const hidden = JSON.parse(btn.dataset.tracks || '[]');
  function buildRow(t, i) {
    const num = String(t.number || 21 + i).padStart(2, '0');
    const feat = t.features && t.features.length ? ' feat. ' + t.features.join(', ') : '';
    const href = t.spotify_track_id
      ? 'href=\"https://open.spotify.com/track/' + t.spotify_track_id + '\" target=\"_blank\" rel=\"noopener\"'
      : '';
    return '<a class=\"track reveal-track\" ' + href + ' style=\"opacity:0;transform:translateY(6px)\">' +
      '<span class=\"track-num\">' + num + '</span>' +
      '<span class=\"track-name\">' + t.title + (feat ? '<span class=\"track-feat\">' + feat + '</span>' : '') + '</span>' +
      '<span class=\"track-play\">\u25b6</span>' +
      '<span class=\"track-duration\">' + (t.duration || '') + '</span>' +
      '</a>';
  }
  const frag = document.createRange().createContextualFragment(hidden.map((t, i) => buildRow(t, i)).join(''));
  btn.replaceWith(frag);
  document.querySelectorAll('.reveal-track').forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 35);
  });
};

function initStarRating(r) {
  const stars = document.querySelectorAll('.star');
  const rateBtn = document.getElementById('rateBtn');
  let hovered = 0;
  let selected = 0;

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      hovered = parseInt(star.dataset.val);
      stars.forEach(s => {
        const v = parseInt(s.dataset.val);
        s.style.color = v <= hovered ? '#F5C518' : '#333';
        s.style.transform = v === hovered ? 'scale(1.2)' : 'scale(1)';
      });
    });
    star.addEventListener('mouseleave', () => {
      hovered = 0;
      stars.forEach(s => {
        const v = parseInt(s.dataset.val);
        s.style.color = v <= selected ? '#F5C518' : '#333';
        s.style.transform = 'scale(1)';
      });
    });
    star.addEventListener('click', () => {
      selected = parseInt(star.dataset.val);
      stars.forEach(s => {
        s.style.color = parseInt(s.dataset.val) <= selected ? '#F5C518' : '#333';
      });
      if (rateBtn) {
        rateBtn.textContent = `Rated ${selected}/10 — Submit`;
        rateBtn.style.background = '#1DB954';
        rateBtn.onclick = () => {
          rateBtn.textContent = `✓ Thanks for your ${selected}/10 rating!`;
          rateBtn.disabled = true;
          rateBtn.style.background = '#333';
        };
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED STYLES INJECTION
// ═══════════════════════════════════════════════════════════════════════════════
function injectSharedStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Reveal animation ── */
    .reveal {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease var(--delay, 0ms), transform 0.5s ease var(--delay, 0ms);
    }
    .reveal.revealed {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Mobile nav ── */
    .nav-burger {
      display: none;
      background: none;
      border: none;
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
    }
    @media (max-width: 768px) {
      .nav-burger { display: block; }
      .nav-links {
        display: none;
        position: absolute;
        top: 60px; left: 0; right: 0;
        background: rgba(10,10,10,0.98);
        border-bottom: 1px solid #1A1A1A;
        flex-direction: column;
        padding: 16px 24px 24px;
        gap: 0;
        backdrop-filter: blur(16px);
        z-index: 200;
      }
      .nav-links.mobile-open { display: flex; }
      .nav-links li { border-bottom: 1px solid #1A1A1A; }
      .nav-links a { display: block; padding: 14px 0; font-size: 15px; }
    }

    /* ── Review card cover ── */
    .card-cover {
      width: 100%; height: 100%;
      position: absolute; top: 0; left: 0;
      border-radius: inherit;
    }

    /* ── Genre pill interactive ── */
    .genre-pill {
      cursor: pointer;
      transition: background 0.2s, color 0.2s, transform 0.15s;
    }
    .genre-pill:hover { transform: translateY(-1px); }
    .genre-pill.active {
      background: var(--accent, #E8363A) !important;
      border-color: var(--accent, #E8363A) !important;
      color: #fff !important;
    }

    /* ── Review card hover ── */
    .review-card {
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .review-card:hover { transform: translateY(-4px); }
    .review-card .card-link { display: block; text-decoration: none; color: inherit; }

    /* ── Top list item ── */
    .top-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0; border-bottom: 1px solid #1A1A1A;
      text-decoration: none; color: inherit;
      transition: background 0.15s;
    }
    .top-item:hover { background: rgba(255,255,255,0.02); }
    .top-rank { font-family: 'DM Mono', monospace; font-size: 11px; color: #5A5A5A; width: 22px; text-align: right; flex-shrink: 0; }
    .top-cover { width: 44px; height: 44px; border-radius: 3px; flex-shrink: 0; }
    .top-info { flex: 1; min-width: 0; }
    .top-album { font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .top-artist { font-size: 11px; color: #A0A0A0; margin-top: 2px; }
    .top-score { font-family: 'DM Mono', monospace; font-weight: 900; font-size: 20px; flex-shrink: 0; }

    /* ── Browse result card ── */
    .result-cover {
      aspect-ratio: 1; border-radius: 4px; overflow: hidden;
      position: relative;
    }
    .result-score-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
      padding: 20px 10px 8px;
      display: flex; justify-content: flex-end;
    }
    .result-score.critic-score {
      font-family: 'DM Mono', monospace; font-weight: 900; font-size: 22px;
    }
    .result-bnm {
      position: absolute; top: 8px; left: 8px;
      background: #1DB954; color: #fff;
      font-size: 9px; font-weight: 700; letter-spacing: .1em;
      padding: 3px 7px; border-radius: 2px;
    }
    .result-info { padding: 10px 0 0; }
    .result-genre { font-size: 10px; color: #5A5A5A; text-transform: uppercase; letter-spacing: .08em; }
    .result-album { font-weight: 700; font-size: 14px; margin-top: 4px; line-height: 1.2; }
    .result-artist { font-size: 12px; color: #A0A0A0; margin-top: 2px; }
    .result-scores-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
    .result-label { font-size: 10px; color: #5A5A5A; }
    .result-critic-val { font-family: 'DM Mono', monospace; font-weight: 700; font-size: 13px; }
    .result-comm-val { font-family: 'DM Mono', monospace; font-weight: 700; font-size: 13px; color: #4A9EFF; }
    .result-sep { color: #333; }

    /* ── List view item ── */
    .list-item {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 0; border-bottom: 1px solid #1A1A1A;
      text-decoration: none; color: inherit;
      transition: background 0.15s;
    }
    .list-item:hover { background: rgba(255,255,255,0.02); padding-left: 8px; padding-right: 8px; border-radius: 4px; }
    .list-num { font-family: 'DM Mono', monospace; font-size: 11px; color: #5A5A5A; width: 24px; text-align: right; flex-shrink: 0; }
    .list-cover { width: 60px; height: 60px; border-radius: 3px; flex-shrink: 0; }
    .list-meta { flex: 1; min-width: 0; }
    .list-title { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .list-sub { font-size: 11px; color: #A0A0A0; margin-top: 2px; }
    .list-summary { font-size: 12px; color: #707070; margin-top: 4px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .list-scores { text-align: center; flex-shrink: 0; min-width: 60px; }
    .list-score-val { font-family: 'DM Mono', monospace; font-weight: 900; font-size: 20px; }
    .list-score-label { font-size: 9px; color: #5A5A5A; letter-spacing: .08em; }

    /* ── Result card hover ── */
    .result-card { transition: transform 0.2s ease; }
    .result-card:hover { transform: translateY(-3px); }

    /* ── Spotify embed ── */
    .spotify-embed { margin: 32px 0; }

    /* ── Score bar animation ── */
    .score-bar-fill { transition: width 0s; }

    /* ── Mobile review layout ── */
    @media (max-width: 768px) {
      .list-summary { display: none; }
      .list-num { display: none; }
    }
  `;
  document.head.appendChild(style);
}

// ── Inject mobile burger into nav ────────────────────────────────────────────
function injectMobileBurger() {
  const navRight = document.querySelector('.nav-right');
  if (navRight && !document.querySelector('.nav-burger')) {
    const burger = document.createElement('button');
    burger.className = 'nav-burger';
    burger.innerHTML = '☰';
    burger.setAttribute('aria-label', 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    navRight.prepend(burger);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  injectSharedStyles();
  injectMobileBurger();
  initMobileNav();
  initScrollReveal();

  const path = location.pathname;
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/reverb/') || path.endsWith('/reverb')) {
    hydrateHomepage();
  } else if (path.includes('browse')) {
    hydrateBrowse();
  } else if (path.includes('review')) {
    hydrateReview();
  }
});
