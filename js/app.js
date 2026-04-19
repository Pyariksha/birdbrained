

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let answers       = {};
let contextTags   = [];
let contextText   = '';
let contextEmoji  = '';
let lastBirdId    = null;
let screenshotMode = false;
let seenBirdIds   = new Set();

// ═══════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════════
function answer(question, tags) {
  answers[question] = tags;
  if      (question === 'q1') showScreen('screen-q2');
  else if (question === 'q2') showScreen('screen-q3');
  else if (question === 'q3') showScreen('screen-context');
}

// ═══════════════════════════════════════════════
//  CONTEXT (optional step)
// ═══════════════════════════════════════════════
function selectEmoji(btn) {
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  contextEmoji = btn.textContent.trim();
  contextTags  = (btn.dataset.tags || '').split(',').filter(Boolean);
}

function submitContext(skip) {
  if (!skip) {
    contextText = (document.getElementById('context-desc').value || '').trim();
  } else {
    contextText  = '';
    contextTags  = [];
    contextEmoji = '';
    document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
    const ta = document.getElementById('context-desc');
    if (ta) ta.value = '';
    document.getElementById('char-count').textContent = '0';
  }
  showScreen('screen-loading');
  setTimeout(findAndShow, 1600);
}

// ═══════════════════════════════════════════════
//  MATCHING
// ═══════════════════════════════════════════════
function scoreBird(bird) {
  const allTags = [
    ...(answers.q1 || []),
    ...(answers.q2 || []),
    ...(answers.q3 || []),
    ...contextTags,
  ];
  let score = 0;
  for (const t of allTags) if (bird.tags.includes(t)) score++;

  // Boost score if context text mentions the bird name or any tag
  if (contextText) {
    const lower = contextText.toLowerCase();
    if (lower.includes(bird.name.toLowerCase())) score += 2;
    for (const t of bird.tags) if (lower.includes(t)) score += 0.5;
  }

  return score;
}

function findAndShow() {
  // Exclude all birds seen this session; if we've exhausted the pool, reset
  let pool = BIRDS.filter(b => !seenBirdIds.has(b.id));
  if (pool.length === 0) { seenBirdIds.clear(); pool = [...BIRDS]; }

  const scored = pool.map(b => ({ bird: b, score: scoreBird(b) + Math.random() * 1.2 }));
  scored.sort((a, b) => b.score - a.score);
  const top    = scored.slice(0, 4);
  const chosen = top[Math.floor(Math.random() * top.length)].bird;
  seenBirdIds.add(chosen.id);
  lastBirdId = chosen.id;
  generateAnimeImage(chosen); // start immediately while loading screen is still showing
  displayBird(chosen);
}

// ═══════════════════════════════════════════════
//  DISPLAY
// ═══════════════════════════════════════════════

// Label maps for the recap panel
const Q1_LABELS = {
  chaotic: '⚡ chaotic but make it fashion',
  focused: '🎯 locked in, tunnel vision',
  chill:   '🌊 go with the flow',
  intense: '🔥 suffer but worth it',
  mysterious: '🌙 mysterious era',
};
const Q2_LABELS = {
  energetic:  '🤩 literally vibrating',
  determined: '😤 exhausted but unstoppable',
  elegant:    '😌 unbothered & zen',
  chaotic:    '🤪 fully unhinged',
  focused:    '🫡 in the zone',
};
const Q3_LABELS = {
  feature:   '🚀 big feature drop',
  bugfix:    '🐛 squashing bugs',
  debt:      '🧹 tech debt cleanup',
  discovery: '🔍 discovery / research',
  infra:     '🔧 infrastructure',
};

function getLabel(tags, map) {
  if (!tags) return '—';
  for (const t of tags) if (map[t]) return map[t];
  return tags[0] || '—';
}

function displayBird(bird) {
  // Card content
  document.getElementById('bird-name-big').textContent    = bird.name;
  document.getElementById('bird-giving-line').textContent = bird.giving;
  document.getElementById('bird-description').textContent = bird.desc;
  document.getElementById('card-season').textContent      = 'Sprint · ' + new Date().getFullYear();

  const raw = bird.name.replace(/[^a-zA-Z]/g, '');
  const hashtag = '#' + raw + 'Sprint';
  document.getElementById('sprint-hashtag').textContent = hashtag;

  // Sprint kit panel
  document.getElementById('copy-name-val').textContent = bird.name + ' Sprint';
  document.getElementById('copy-tag-val').textContent  = hashtag;

  // Bird intel panel — split desc into sentences as fact bullets
  const facts = bird.desc
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 10)
    .slice(0, 4);
  const factsList = document.getElementById('bird-facts');
  factsList.innerHTML = facts.map(f => `<li>${f.replace(/\.$/, '')}</li>`).join('');

  // Answers recap
  const recap = document.getElementById('sprint-recap');
  const rows = [
    { label: 'energy',  val: getLabel(answers.q1, Q1_LABELS) },
    { label: 'mood',    val: getLabel(answers.q2, Q2_LABELS) },
    { label: 'sprint',  val: getLabel(answers.q3, Q3_LABELS) },
  ];
  if (contextEmoji || contextText) {
    rows.push({ label: 'vibe', val: (contextEmoji ? contextEmoji + ' ' : '') + (contextText ? '"' + contextText.slice(0, 60) + (contextText.length > 60 ? '…' : '') + '"' : '') });
  }
  recap.innerHTML = rows.map(r =>
    `<div class="sprint-recap-row"><strong>${r.label}</strong>${r.val}</div>`
  ).join('');

  // Card reveal animation
  const card = document.getElementById('sprint-card');
  card.classList.remove('reveal-anim');
  void card.offsetWidth;
  card.classList.add('reveal-anim');

  currentBird = bird;
  showScreen('screen-result');
  generateImage(bird); // real photo → center card
  // anime already kicked off in findAndShow during loading screen
}

// ─── Copy helper ───
function copyText(elId, btn) {
  const val = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(val).then(() => {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = btn.dataset.label || btn.textContent.replace('copied!','copy'); btn.classList.remove('copied'); }, 1800);
  });
}

// ═══════════════════════════════════════════════
//  IMAGE  — Wikipedia REST API → Pollinations fallback
//
//  Priority:
//   1. Wikipedia REST API  → real photo, always correct
//   2. Pollinations AI     → generated, used only if Wikipedia has no image
//   3. Error state         → retry button
//
//  NOTE: fetch() is blocked on file:// in Chrome.
//  Host the app (Netlify / npx serve .) for images to load.
// ═══════════════════════════════════════════════
let currentBird = null;

// ═══════════════════════════════════════════════
//  ANIME IMAGE — Pollinations with sprint-aware prompt
// ═══════════════════════════════════════════════

const SPRINT_SCENES = {
  feature:   'launching a rocket from a futuristic control room, glowing holographic screens everywhere, celebration energy',
  bugfix:    'in a dark underground server room, surrounded by glitching error messages on screens, wires everywhere, detective mode',
  debt:      'in a cluttered workshop full of broken machinery and stacked boxes, dust in the air, wearing overalls, renovation chaos',
  discovery: 'in a vast ancient library surrounded by maps, telescopes, and glowing manuscripts, exploration and wonder',
  infra:     'deep underground in a massive tunnel system of pipes and cables, maintenance tools in hand, the unsung hero',
};

const ENERGY_MODS = {
  chaotic:    'swirling chaos energy, debris mid-air, dynamic action lines',
  focused:    'single beam of dramatic light cutting through darkness, intense concentration',
  chill:      'soft golden hour light, peaceful atmosphere, serene mood',
  intense:    'dramatic storm lighting, high tension, cinematic shadows',
  mysterious: 'moonlit fog, deep shadows, ethereal glow',
  energetic:  'lightning sparks, explosive motion blur, high energy',
  determined: 'iron will aura, clenched fist, horizon in background',
  loud:       'sound wave rings visible in the air, motion blast lines',
  fast:       'extreme motion blur streaks, speed lines',
  patient:    'still water reflection, meditative calm, soft bokeh',
};

const VIBE_MODS = {
  '🔥': 'fire and embers floating around',
  '💀': 'gothic skull motifs, dark energy swirls',
  '✨': 'sparkles and magic particles everywhere',
  '🌊': 'water ripples, ocean waves in background',
  '⚡': 'electrical sparks and lightning bolts',
  '🌙': 'moonlight, stars, night sky glow',
  '🎯': 'crosshair overlay, target locked visual effect',
  '🤪': 'swirling cartoon spirals, confetti, unhinged energy',
  '🧹': 'floating dust particles, broom, cleaning supplies',
  '🚀': 'rocket exhaust trails, launch pad glow',
};

function buildAnimePrompt(bird) {
  // Determine sprint type from q3 answers
  const q3 = answers.q3 || [];
  let sprintType = 'feature';
  for (const t of ['debt','bugfix','discovery','infra','feature']) {
    if (q3.includes(t)) { sprintType = t; break; }
  }
  const scene = SPRINT_SCENES[sprintType] || SPRINT_SCENES.feature;

  // Determine energy from q1 answers
  const q1 = answers.q1 || [];
  let energyKey = 'focused';
  for (const k of Object.keys(ENERGY_MODS)) {
    if (q1.includes(k)) { energyKey = k; break; }
  }
  const energyMod = ENERGY_MODS[energyKey] || '';

  // Vibe emoji modifier
  const vibeMod = contextEmoji ? (VIBE_MODS[contextEmoji] || '') : '';

  // Scene: user's own words are the prompt — no translation, no override
  const sceneDirective = contextText
    ? contextText.trim().slice(0, 200)  // pass it raw, full weight
    : scene;                             // fall back to sprint-type scene only if nothing written

  const prompt = [
    `anime illustration of a ${bird.name}`,
    sceneDirective,
    energyMod,
    vibeMod,
    'studio ghibli and makoto shinkai art style',
    'detailed cinematic background',
    'expressive bird character as protagonist',
    'no text no watermark no humans',
  ].filter(Boolean).join(', ');

  return prompt;
}

async function generateAnimeImage(bird) {
  const img    = document.getElementById('anime-img');
  const loader = document.getElementById('anime-loader');
  const tag    = document.getElementById('anime-prompt-tag');
  if (!img || !loader) return;

  // Reset panel to loading state
  loader.style.display = 'flex';
  img.style.display = 'none';
  img.onload = null;   // detach previous handlers before clearing src
  img.onerror = null;
  img.src = '';
  if (tag) { tag.style.display = 'none'; tag.textContent = ''; }

  const prompt = buildAnimePrompt(bird);
  const seed   = Math.floor(Math.random() * 999999);

  // Rotating messages so it doesn't look frozen
  const loadingLines = [
    'painting your sprint...',
    'consulting the bird council...',
    'mixing anime pigments...',
    'sketching the background...',
    'adding dramatic lighting...',
    'rendering feathers...',
    'applying studio ghibli filter...',
    'almost there...',
  ];
  let msgIdx = 0;
  loader.innerHTML = `<div class="spinner-ring"></div><span id="anime-loading-msg">${loadingLines[0]}</span><span id="anime-loading-prompt"></span>`;

  // Show prompt hint after 1s so user knows what's generating
  setTimeout(() => {
    const el = document.getElementById('anime-loading-prompt');
    if (el) el.textContent = `"${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`;
  }, 1000);

  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingLines.length;
    const el = document.getElementById('anime-loading-msg');
    if (el) el.textContent = loadingLines[msgIdx];
  }, 3000);
  const fallbackPrompt = `anime illustration of a ${bird.name}, studio ghibli style, cinematic, no text`;
  const makeUrl = (p) => `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=640&nologo=true&seed=${seed}`;

  // Track which bird this request is for — ignore stale responses after reroll
  const requestId = seed;
  generateAnimeImage._requestId = requestId;
  let usedFallback = false;

  const timeout = setTimeout(() => {
    clearInterval(msgTimer);
    if (generateAnimeImage._requestId !== requestId) return;
    if (!usedFallback) {
      // Auto-retry once with simpler prompt before giving up
      usedFallback = true;
      const el = document.getElementById('anime-loading-msg');
      if (el) el.textContent = 'retrying with simpler prompt...';
      img.src = makeUrl(fallbackPrompt);
      // Give it another 45s
      setTimeout(() => {
        if (generateAnimeImage._requestId !== requestId) return;
        clearInterval(msgTimer);
        loader.innerHTML = `<span style="font-size:2rem">🎨</span><span>timed out</span><button onclick="generateAnimeImage(currentBird)" style="margin-top:0.4rem;background:rgba(200,242,62,0.1);border:1px solid rgba(200,242,62,0.3);color:var(--lime);font-family:inherit;font-size:0.75rem;padding:0.3rem 0.8rem;border-radius:100px;cursor:pointer;">↺ retry</button>`;
      }, 45000);
    } else {
      loader.innerHTML = `<span style="font-size:2rem">🎨</span><span>timed out</span><button onclick="generateAnimeImage(currentBird)" style="margin-top:0.4rem;background:rgba(200,242,62,0.1);border:1px solid rgba(200,242,62,0.3);color:var(--lime);font-family:inherit;font-size:0.75rem;padding:0.3rem 0.8rem;border-radius:100px;cursor:pointer;">↺ retry</button>`;
    }
  }, 45000);

  img.onload = () => {
    clearTimeout(timeout);
    clearInterval(msgTimer);
    if (generateAnimeImage._requestId !== requestId) return; // stale, discard
    loader.style.display = 'none';
    img.style.display = 'block';
    if (tag) {
      const q3 = answers.q3 || [];
      let sprintType = 'feature';
      for (const t of ['debt','bugfix','discovery','infra','feature']) {
        if (q3.includes(t)) { sprintType = t; break; }
      }
      const labels = { feature:'feature drop', bugfix:'bug hunt', debt:'tech debt cleanup', discovery:'discovery mode', infra:'infra work' };
      tag.textContent = `✦ ${bird.name} · ${labels[sprintType] || sprintType}`;
      tag.style.display = 'block';
    }
  };

  img.onerror = () => {
    if (generateAnimeImage._requestId !== requestId) return;
    if (!usedFallback) {
      // First failure — silently retry with simpler prompt
      usedFallback = true;
      const el = document.getElementById('anime-loading-msg');
      if (el) el.textContent = 'retrying...';
      img.src = makeUrl(fallbackPrompt);
    } else {
      clearTimeout(timeout);
      clearInterval(msgTimer);
      loader.innerHTML = `<span style="font-size:2rem">🎨</span><span>portrait unavailable</span><button onclick="generateAnimeImage(currentBird)" style="margin-top:0.4rem;background:rgba(200,242,62,0.1);border:1px solid rgba(200,242,62,0.3);color:var(--lime);font-family:inherit;font-size:0.75rem;padding:0.3rem 0.8rem;border-radius:100px;cursor:pointer;">↺ retry</button>`;
    }
  };

  img.src = makeUrl(prompt);
}

async function generateImage(bird) {
  const img    = document.getElementById('bird-img');
  const loader = document.getElementById('img-loader');
  setLoader(loader, 'loading photo...');
  img.style.display = 'none';
  img.src = '';

  // Wikipedia REST API — returns JSON with thumbnail.source
  const wikiTitle = bird.wikiTitle || bird.name;
  const wikiApi   = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;

  try {
    const resp = await fetch(wikiApi);
    if (!resp.ok) throw new Error('no page');
    const data = await resp.json();

    if (data.thumbnail && data.thumbnail.source) {
      // Upgrade to higher resolution: swap out thumbnail size in URL
      const hiRes = data.thumbnail.source.replace(/\/\d+px-/, '/800px-');
      loadImg(img, loader, hiRes, data.thumbnail.source); // try hi-res, fallback to original
      return;
    }
  } catch (e) { /* network blocked (file://) or bird not on Wikipedia */ }

  // Fallback: Pollinations text-to-image
  setLoader(loader, 'generating portrait...');
  const seed    = Math.floor(Math.random() * 999999);
  const prompt  = `photorealistic wildlife photograph of ${bird.name}, natural habitat, dramatic lighting, sharp detail, no text`;
  const genUrl  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&nologo=true&seed=${seed}`;
  loadImg(img, loader, genUrl, null);
}

// Load an image, with optional fallback URL if first fails
function loadImg(img, loader, url, fallbackUrl) {
  const timeout = setTimeout(() => {
    img.onload = img.onerror = null;
    if (fallbackUrl) loadImg(img, loader, fallbackUrl, null);
    else showImgError();
  }, 25000);

  img.onload = () => {
    clearTimeout(timeout);
    loader.style.display = 'none';
    img.style.display = 'block';
  };

  img.onerror = () => {
    clearTimeout(timeout);
    if (fallbackUrl) loadImg(img, loader, fallbackUrl, null);
    else showImgError();
  };

  img.src = url;
}

function setLoader(loader, text) {
  loader.style.display = 'flex';
  loader.innerHTML = `<div class="spinner-ring"></div><span style="color:var(--muted);font-size:0.82rem">${text}</span>`;
}

function showImgError() {
  const loader = document.getElementById('img-loader');
  loader.innerHTML = `
    <span style="font-size:3rem">🐦</span>
    <span style="color:var(--muted);font-size:0.82rem">portrait unavailable</span>
    <button onclick="generateImage(currentBird)"
      style="margin-top:0.5rem;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#a78bfa;font-family:inherit;font-size:0.8rem;padding:0.4rem 0.9rem;border-radius:100px;cursor:pointer;">
      ↺ retry
    </button>`;
}

// ═══════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════
function reroll() {
  showScreen('screen-loading');
  setTimeout(findAndShow, 1600);
}

function resetAll() {
  answers      = {};
  contextTags  = [];
  contextText  = '';
  contextEmoji = '';
  lastBirdId   = null;
  seenBirdIds  = new Set();
  if (screenshotMode) toggleScreenshot();
  showScreen('screen-intro');
}

function toggleScreenshot() {
  screenshotMode = !screenshotMode;
  document.body.classList.toggle('screenshot-mode', screenshotMode);
  const btn = document.querySelector('.result-action-stack .btn-secondary:nth-child(2)');
  if (btn) btn.textContent = screenshotMode ? '✕ exit card view' : '📸 card view';
}

// ═══════════════════════════════════════════════
//  LOADING ANIMATIONS
// ═══════════════════════════════════════════════
const LOAD_EMOJIS = ['🦅','🦩','🦚','🦜','🦤','🦉','🐦','🦆','🦢','🦝'];
const LOAD_MSGS   = [
  'cross-referencing your vibes with the bird council...',
  'consulting ancient bird texts...',
  'asking the cassowary for permission...',
  'running bird-to-sprint alignment algorithm...',
  'the shoebill is thinking...',
  'negotiating with the potoo...',
  'checking bird energy frequencies...',
  'the ravens have voted...',
];
let loadEIdx = 0, loadMIdx = 0;

setInterval(() => {
  const el = document.getElementById('loading-emoji');
  if (el) { loadEIdx = (loadEIdx + 1) % LOAD_EMOJIS.length; el.textContent = LOAD_EMOJIS[loadEIdx]; }
}, 280);

setInterval(() => {
  const el = document.getElementById('loading-sub');
  if (el) { loadMIdx = (loadMIdx + 1) % LOAD_MSGS.length; el.textContent = LOAD_MSGS[loadMIdx]; }
}, 950);
</body>
</html>
