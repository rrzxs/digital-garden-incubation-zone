/* ============================================================
 * Typewave Scale · 打字波浪缩放
 * 每个字符是一个弹簧振子：输入 / 点击 / 悬停都会在海面上
 * 激起传播的缩放波浪。Vanilla JS，零依赖。
 * ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const sea = document.getElementById('charSea');
  const canvas = document.getElementById('typeCanvas');
  const caret = document.getElementById('caret');
  const emptyHint = document.getElementById('emptyHint');
  const statChars = document.getElementById('statChars');
  const statEnergy = document.getElementById('statEnergy');
  const statWaves = document.getElementById('statWaves');
  const ampSlider = document.getElementById('ampSlider');
  const lenSlider = document.getElementById('lenSlider');
  const ampValue = document.getElementById('ampValue');
  const lenValue = document.getElementById('lenValue');
  const clearBtn = document.getElementById('clearBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const modeGroup = document.getElementById('modeGroup');
  const themeSwitcher = document.getElementById('themeSwitcher');

  // === State ===
  const state = {
    chars: [],            // { el, text, x, y, scale, vx?, baseScale, tScale, tVy, wave, tWave, born }
    mode: 'pulse',        // pulse | waterfall | orbit
    amp: 1,               // 波幅倍率
    len: 6,               // 波长（影响传播距离）
    waves: 0,
    pointer: { x: -9999, y: -9999, inside: false },
    editing: true
  };

  const SPRING = 0.12;     // 主弹簧系数
  const DAMP = 0.82;       // 阻尼
  const WAVE_DECAY = 0.94; // 波能衰减

  // === Character Sea：文本 → 字符振子 ===
  function syncFromText(text) {
    const old = state.chars;
    state.chars = [];
    sea.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
      const t = text[i];
      const el = document.createElement('span');
      el.className = 'ch' + (t === ' ' ? ' space' : '');
      el.textContent = t;
      el.__s = prev ? (prev.el.__s || 1) : 1;
      sea.appendChild(el);
      const prev = old.length > i && old[i].text === t ? old[i] : null;
      state.chars.push({
        el, text: t,
        tScale: prev ? prev.tScale : 0,
        tVy: prev ? prev.tVy : 0,
        wave: prev ? prev.wave : 0,
        tWave: prev ? prev.tWave : 0
      });
    }
    emptyHint.classList.toggle('hidden', text.length > 0);
    statChars.textContent = text.length;
    layoutCaret();
  }

  // === 波浪发射：从 index 位置向两侧传播 ===
  function emitWave(index, strength) {
    state.waves++;
    statWaves.textContent = state.waves;
    const n = state.chars.length;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - index);
      if (d === 0) {
        state.chars[i].tWave += strength * 1.4;
        continue;
      }
      let falloff;
      if (state.mode === 'pulse') {
        falloff = Math.exp(-(d * d) / (2 * state.len * state.len)) * Math.cos(d / state.len * 1.6);
      } else if (state.mode === 'waterfall') {
        // 只向后方（已输入的字符）传播，像瀑布一样倾泻
        if (i > index) continue;
        falloff = Math.exp(-(d) / (state.len * 1.6));
      } else { // orbit：往返回响
        falloff = Math.sin(d / state.len * Math.PI) * Math.exp(-(d * d) / (2 * state.len * state.len * 2.4));
      }
      state.chars[i].tWave += strength * falloff * state.amp;
    }
  }

  // === 点击海面：以最近的字符为震中 ===
  function shockwave(px, py) {
    let best = -1, bestD = Infinity;
    state.chars.forEach((c, i) => {
      const r = c.el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) emitWave(best, 1.6);
    else if (state.chars.length === 0) { emitWave(0, 0); }
  }

  // === 光标悬停避让 ===
  function hoverRepel(c, rect) {
    if (!state.pointer.inside) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d = Math.hypot(cx - state.pointer.x, cy - state.pointer.y);
    const R = 90;
    if (d > R) return 0;
    const f = Math.cos((d / R) * Math.PI / 2);
    return f * f * 0.5;
  }

  // === 物理循环 ===
  let raf;
  function tick() {
    let totalEnergy = 0;
    for (const c of state.chars) {
      const rect = c.el.getBoundingClientRect();
      const repel = hoverRepel(c, rect);

      // 波能弹簧（带动缩放）
      c.tWave += (-c.wave * 0.22) * SPRING * 4;
      c.wave += c.tWave;
      c.tWave *= DAMP * 0.9;
      c.wave *= WAVE_DECAY;

      // 缩放 = 波能 + 光标排斥
      const target = 1 + c.wave + repel;
      c.tScale += (target - c.el.__s) * SPRING * 2.2;
      c.el.__s += c.tScale;
      c.tScale *= DAMP;

      if (!c.el.__s) c.el.__s = 1;
      const s = Math.max(0.2, c.el.__s);
      const lift = Math.min(18, Math.max(-6, (s - 1) * 26));
      c.el.style.transform = 'scale(' + s.toFixed(3) + ') translateY(' + lift.toFixed(2) + 'px)';
      // 波能越高越亮
      const glow = Math.min(1, Math.max(0, c.wave * 1.2 + repel));
      if (glow > 0.02) {
        c.el.style.color = 'color-mix(in srgb, var(--accent) ' + (glow * 90).toFixed(0) + '%, var(--ink))';
      } else if (c.el.style.color) {
        c.el.style.color = '';
      }
      totalEnergy += Math.abs(c.wave);
    }
    statEnergy.textContent = (totalEnergy * 10).toFixed(0);
    raf = requestAnimationFrame(tick);
  }

  // === 光标定位 ===
  function layoutCaret() {
    const last = state.chars[state.chars.length - 1];
    if (!last) {
      const cr = canvas.getBoundingClientRect();
      caret.style.transform = 'translate(' + 20 + 'px,' + 36 + 'px)';
      return;
    }
    const r = last.el.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    caret.style.transform = 'translate(' + (r.right - cr.left) + 'px,' + (r.top - cr.top + r.height * 0.1) + 'px)';
    caret.style.height = r.height * 0.95 + 'px';
  }
  setInterval(layoutCaret, 300);

  // === 隐藏输入：捕获打字 ===
  const hidden = document.createElement('textarea');
  hidden.setAttribute('aria-label', '打字输入区');
  hidden.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:-9999px;top:0;';
  document.body.appendChild(hidden);

  function focusInput() { hidden.focus({ preventScroll: true }); }
  canvas.addEventListener('mousedown', (e) => {
    focusInput();
    shockwave(e.clientX, e.clientY);
  });

  hidden.addEventListener('input', () => {
    const prevLen = sea.textContent.length;
    const text = hidden.value;
    syncFromText(text);
    if (text.length > prevLen) emitWave(text.length - 1, 0.9 * state.amp);
  });
  hidden.addEventListener('keydown', (e) => {
    // 退格也激起涟漪
    if ((e.key === 'Backspace' || e.key === 'Delete') && state.chars.length > 0) {
      requestAnimationFrame(() => emitWave(Math.max(0, state.chars.length - 1), -0.5 * state.amp));
    }
  });

  // === 指针追踪 ===
  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    const r = canvas.getBoundingClientRect();
    state.pointer.inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
  });

  // === 控件：模式 ===
  modeGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    modeGroup.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    if (state.chars.length) emitWave(Math.floor(state.chars.length / 2), 0.8);
  });

  // === 控件：滑块 ===
  function paintSlider(slider) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }
  ampSlider.addEventListener('input', () => {
    state.amp = parseFloat(ampSlider.value);
    ampValue.textContent = state.amp.toFixed(2);
    paintSlider(ampSlider);
  });
  lenSlider.addEventListener('input', () => {
    state.len = parseFloat(lenSlider.value);
    lenValue.textContent = state.len.toFixed(1);
    paintSlider(lenSlider);
  });
  paintSlider(ampSlider); paintSlider(lenSlider);

  // === 控件：按钮 ===
  clearBtn.addEventListener('click', () => {
    hidden.value = '';
    syncFromText('');
    focusInput();
  });
  const SAMPLES = [
    '每一句话都是投进湖面的石子',
    'The sea of characters remembers every wave',
    '字符在弹簧的海洋里起舞'
  ];
  let sampleIdx = 0;
  sampleBtn.addEventListener('click', () => {
    const text = SAMPLES[sampleIdx++ % SAMPLES.length];
    hidden.value = text;
    syncFromText(text);
    // 逐字符级联波浪
    for (let i = 0; i < text.length; i += 3) {
      setTimeout(() => emitWave(i, 0.7), i * 46);
    }
    focusInput();
  });

  // === 控件：主题 ===
  themeSwitcher.addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot');
    if (!dot) return;
    document.body.dataset.theme = dot.dataset.theme;
    emitWave(Math.floor(state.chars.length / 2), 1.1);
  });

  // === 初始化 ===
  syncFromText('在这里打字');
  for (let i = 0; i < 4; i++) setTimeout(() => emitWave(i * 2, 0.8), 300 + i * 160);
  focusInput();
  tick();

  // === 页面隐藏时暂停 ===
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else tick();
  });
})();
