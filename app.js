/* =========================================================
   FOOD ROULETTE — app.js
   Edit FOODS below to add / remove / change foods.
   Format: [ "Name", "Microwave" | "Take Away" | "Home Cooking", difficulty(1-5) ]
   ========================================================= */

const FOODS = [
  ["Lax",            "Home Cooking",  3],
  ["Burgers",        "Home Cooking",  4],
  ["Just Wingin It", "Take Away",     3],
  ["Kenny",          "Take Away",     2],
  ["Chicago Town",   "Microwave",        1],
  ["Kubbur",         "Microwave",        1],
  ["Noodles",        "Microwave",        1],
  ["Pylsur",          "Home Cooking", 2],
  ["Hlölli",          "Take Away",    2],
  ["Lemon",         "Take Away",       2],
  [
    "Local",
    "Take Away",       
    3
  ],
  [
    "Ramen",
    "Home Cooking",
    4
  ],
  [
    "Píta",
    "Home Cooking",
    3
  ],[
    "Samloka",
    "Home Cooking",
    3
  ],[
      "Sushi",
      "Take Away",
      2
  ],[
      "Plokkfiskur",
      "Home Cooking",
      2
  ],[
    "Haninn",
    "Take Away",
    2
  ],[
      "Borg 29",
      "Take Away",
      2
  ],[
      "Nings",
      "Take Away",
      2
  ],[
      "Indverskur",
      "Take Away",
      2
  ],[
      "Kúmen",
      "Take Away",
      3
  ],[
      "Gnocchi",
      "Home Cooking",
      5
  ],[
      "Pizzan",
      "Take Away",
      1
  ],[
      "Domingos",
      "Take Away",
      2
  ],[
      "Heimagerð Pizza",
      "Home Cooking",
      4
  ],
];

const FLAG_TYPES = ["Microwave", "Take Away", "Home Cooking"];

const TYPE_COLORS = {
  "Microwave":    "#a855f7",
  "Take Away":    "#ff3b3b",
  "Home Cooking": "#35e08a",
};

/* ---------------- State ---------------- */

const state = {
  flags: { "Microwave": true, "Take Away": true, "Home Cooking": true },
  diffMin: 1,
  diffMax: 5,
  // per-food lock state keyed by food name: 'auto' | 'in' | 'out'
  lockState: {},
};

FOODS.forEach(f => { state.lockState[f[0]] = 'auto'; });

/* ---------------- Persistence ---------------- */

const STORAGE_KEY = 'foodRoulettePrefs.v1';

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      flags: state.flags,
      diffMin: state.diffMin,
      diffMax: state.diffMax,
      lockState: state.lockState,
    }));
  } catch (e) { /* storage unavailable, ignore */ }
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return;
    FLAG_TYPES.forEach(t => {
      if (saved.flags && typeof saved.flags[t] === 'boolean') state.flags[t] = saved.flags[t];
    });
    const min = parseInt(saved.diffMin, 10);
    const max = parseInt(saved.diffMax, 10);
    if (min >= 1 && max <= 5 && min <= max) {
      state.diffMin = min;
      state.diffMax = max;
    }
    if (saved.lockState) {
      FOODS.forEach(f => {
        const v = saved.lockState[f[0]];
        if (v === 'in' || v === 'out' || v === 'auto') state.lockState[f[0]] = v;
      });
    }
  } catch (e) { /* corrupt or unavailable, use defaults */ }
}

loadPrefs();

/* ---------------- DOM refs ---------------- */

const flagRow     = document.getElementById('flagRow');
const cardsGrid   = document.getElementById('cardsGrid');
const minRange    = document.getElementById('minRange');
const maxRange    = document.getElementById('maxRange');
const sliderRange = document.getElementById('sliderRange');
const diffMinLabel = document.getElementById('diffMinLabel');
const diffMaxLabel = document.getElementById('diffMaxLabel');
const resetBtn    = document.getElementById('resetBtn');
const spinBtn     = document.getElementById('spinBtn');
const wheelOverlay = document.getElementById('wheelOverlay');
const wheelCanvas  = document.getElementById('wheelCanvas');
const closeWheelBtn = document.getElementById('closeWheelBtn');
const resultPop    = document.getElementById('resultPop');
const confettiLayer = document.getElementById('confettiLayer');

const ctx = wheelCanvas.getContext('2d');

/* ---------------- Rendering: Flags ---------------- */

function renderFlags() {
  flagRow.innerHTML = '';
  FLAG_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'flag-btn' + (state.flags[type] ? ' active' : '');
    btn.dataset.flag = type;
    btn.textContent = type;
    btn.addEventListener('click', () => {
      state.flags[type] = !state.flags[type];
      renderFlags();
      renderCards();
    });
    flagRow.appendChild(btn);
  });
}

/* ---------------- Rendering: Slider ---------------- */

function renderSlider() {
  diffMinLabel.textContent = state.diffMin;
  diffMaxLabel.textContent = state.diffMax;
  const pct = v => ((v - 1) / 4) * 100;
  sliderRange.style.left = pct(state.diffMin) + '%';
  sliderRange.style.right = (100 - pct(state.diffMax)) + '%';
}

minRange.addEventListener('input', () => {
  let v = parseInt(minRange.value, 10);
  if (v > state.diffMax) v = state.diffMax;
  minRange.value = v;
  state.diffMin = v;
  renderSlider();
  renderCards();
});

maxRange.addEventListener('input', () => {
  let v = parseInt(maxRange.value, 10);
  if (v < state.diffMin) v = state.diffMin;
  maxRange.value = v;
  state.diffMax = v;
  renderSlider();
  renderCards();
});

/* ---------------- Effective enabled logic ---------------- */

function isAutoEnabled(food) {
  const [, type, diff] = food;
  return state.flags[type] && diff >= state.diffMin && diff <= state.diffMax;
}

function isEffectivelyEnabled(food) {
  const lock = state.lockState[food[0]];
  if (lock === 'in') return true;
  if (lock === 'out') return false;
  return isAutoEnabled(food);
}

/* ---------------- Rendering: Cards ---------------- */

function renderCards() {
  cardsGrid.innerHTML = '';
  FOODS.forEach(food => {
    const [name, type, diff] = food;
    const lock = state.lockState[name];
    const enabled = isEffectivelyEnabled(food);

    const card = document.createElement('div');
    card.className = 'food-card ' + (enabled ? 'enabled' : 'disabled');
    if (lock === 'in') card.classList.add('locked-in');
    if (lock === 'out') card.classList.add('locked-out');
    card.dataset.type = type;
    card.dataset.name = name;

    const badgeText = lock === 'in' ? 'Locked In' : lock === 'out' ? 'Locked Out' : '';

    card.innerHTML = `
      ${badgeText ? `<div class="state-badge">${badgeText}</div>` : ''}
      <div class="name">${name}</div>
      <div class="meta">
        <span class="type-tag">${type}</span>
        <span class="diff">★ ${diff}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      const cur = state.lockState[name];
      state.lockState[name] = cur === 'auto' ? 'in' : cur === 'in' ? 'out' : 'auto';
      renderCards();
    });

    cardsGrid.appendChild(card);
  });

  updateSpinButton();
}

function updateSpinButton() {
  savePrefs();
  const enabledCount = FOODS.filter(isEffectivelyEnabled).length;
  spinBtn.disabled = enabledCount === 0;
  spinBtn.textContent = enabledCount === 0 ? 'NO FOODS SELECTED' : 'SPIN';
}

/* ---------------- Reset ---------------- */

resetBtn.addEventListener('click', () => {
  FLAG_TYPES.forEach(t => state.flags[t] = true);
  state.diffMin = 1;
  state.diffMax = 5;
  minRange.value = 1;
  maxRange.value = 5;
  FOODS.forEach(f => state.lockState[f[0]] = 'auto');
  renderFlags();
  renderSlider();
  renderCards();
});

/* ---------------- Wheel / Spin ---------------- */

let totalRotation = 0;
let spinning = false;
let activeSpin = null;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawWheel(items) {
  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 8;
  const n = items.length;
  const sliceAngle = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, w, h);

  items.forEach((food, i) => {
    const [name, type] = food;
    const start = -Math.PI / 2 + i * sliceAngle;
    const end = start + sliceAngle;
    const color = TYPE_COLORS[type] || '#888';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0e0f13';
    ctx.lineWidth = 3;
    ctx.stroke();

    // label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0c0c0e';
    ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
    ctx.fillText(name, radius - 14, 0);
    ctx.restore();
  });

  // hub
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0e0f13';
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function playTone(freq, duration, type = 'sine', delay = 0) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const actx = playTone._ctx || (playTone._ctx = new AudioCtx());
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, actx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.15, actx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(actx.currentTime + delay);
    osc.stop(actx.currentTime + delay + duration + 0.05);
  } catch (e) { /* audio not available, ignore */ }
}

function spawnConfetti(color) {
  const colors = [color, '#ffd23f', '#ff2e63', '#00e5ff', '#35e08a'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const c = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = c;
    piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    piece.style.width = (6 + Math.random() * 6) + 'px';
    piece.style.height = (10 + Math.random() * 8) + 'px';
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

spinBtn.addEventListener('click', () => {
  if (spinning) return;
  const enabledFoods = FOODS.filter(isEffectivelyEnabled);
  if (enabledFoods.length === 0) return;

  spinning = true;
  spinBtn.disabled = true;
  resultPop.classList.remove('show');
  resultPop.textContent = '';
  confettiLayer.innerHTML = '';

  wheelOverlay.classList.add('open');
  wheelCanvas.classList.remove('spinning');
  // reset instantly to current rotation without transition to avoid jump
  wheelCanvas.style.transition = 'none';
  wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;
  // force reflow
  void wheelCanvas.offsetWidth;

  drawWheel(enabledFoods);

  const n = enabledFoods.length;
  const sliceAngle = 360 / n;
  const winnerIndex = Math.floor(Math.random() * n);
  const winner = enabledFoods[winnerIndex];

  const sliceCenterDeg = winnerIndex * sliceAngle + sliceAngle / 2;
  const currentMod = totalRotation % 360;
  const extraSpins = 6 * 360;
  // target so that sliceCenterDeg ends up at top (0deg / pointer position)
  let delta = (360 - sliceCenterDeg) - currentMod;
  delta = ((delta % 360) + 360) % 360;
  const newRotation = totalRotation + extraSpins + delta;

  playTone(220, 0.15, 'square');

  requestAnimationFrame(() => {
    wheelCanvas.classList.add('spinning');
    wheelCanvas.style.transition = '';
    wheelCanvas.style.transform = `rotate(${newRotation}deg)`;
  });

  totalRotation = newRotation;

  const finalize = (showJuice) => {
    if (activeSpin.done) return;
    activeSpin.done = true;
    clearTimeout(fallbackTimer);
    wheelCanvas.removeEventListener('transitionend', onDone);
    spinning = false;
    spinBtn.disabled = false;

    if (!showJuice) {
      // forcibly snap the wheel to its resting position with no transition
      wheelCanvas.classList.remove('spinning');
      wheelCanvas.style.transition = 'none';
      wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;
      void wheelCanvas.offsetWidth;
      return;
    }

    const color = TYPE_COLORS[winner[1]];
    resultPop.style.color = color;
    resultPop.innerHTML = `🍽 ${winner[0]} <br><span style="font-size:14px; color:#8b8e98;">${winner[1]} &middot; Difficulty ${winner[2]}</span>`;
    resultPop.classList.add('show');
    spawnConfetti(color);
    playTone(523.25, 0.25, 'triangle');
    playTone(659.25, 0.3, 'triangle', 0.12);
    playTone(783.99, 0.4, 'triangle', 0.24);
  };

  const onDone = () => finalize(true);
  // fallback timer in case the transitionend event never fires
  // (e.g. the overlay was hidden via display:none mid-animation)
  const fallbackTimer = setTimeout(onDone, 4400);

  activeSpin = { done: false, finalize };
  wheelCanvas.addEventListener('transitionend', onDone);
});

closeWheelBtn.addEventListener('click', () => {
  wheelOverlay.classList.remove('open');
  resultPop.classList.remove('show');
  confettiLayer.innerHTML = '';
  if (spinning && activeSpin) {
    activeSpin.finalize(false);
  }
});

/* ---------------- Init ---------------- */

function init() {
  minRange.value = state.diffMin;
  maxRange.value = state.diffMax;
  renderFlags();
  renderSlider();
  renderCards();
  drawWheel(FOODS);
}

init();
