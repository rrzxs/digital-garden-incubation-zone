/* ═══════════════════════════════════════════════════════════
   CSS Token Distiller — 设计令牌蒸馏器
   Vanilla JS · 零依赖 · 非线性微交互
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const cssInput = $('#css-input');
  const btnDistill = $('#btn-distill');
  const btnSample = $('#btn-sample');
  const btnClear = $('#btn-clear');
  const tokenGrid = $('#token-grid');
  const exportPanel = $('#export-panel');
  const exportCode = $('#export-code');
  const exportTabs = document.querySelectorAll('.export-tab');
  const tabSlider = $('.tab-slider');
  const btnCopyOutput = $('#btn-copy-output');
  const chipDecls = $('#chip-decls');
  const chipTokens = $('#chip-tokens');
  const progressWrap = $('#distill-progress');
  const progressFill = $('.progress-fill');
  const progressText = $('#progress-text');
  const toast = $('#toast');
  const toastText = $('#toast-text');
  const themeDots = document.querySelectorAll('.theme-dot');

  // === State ===
  const state = {
    tokens: null,          // { groups: [...], flat: [...] }
    exportFormat: 'css',
    distilling: false,
    theme: 'aurora'
  };

  // === Sample CSS (内置样本) ===
  const SAMPLE_CSS = `/* Aurora Dashboard — design sample */
:root {
  --brand: #5eead4;
  --ocean: rgba(56, 189, 248, 0.85);
  --dusk:  hsla(255, 84%, 68%, 0.6);
  --paper: #f6f8fb;
  --ink:   #1a2233;
}
.hero {
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 48px;
  color: #1a2233;
  padding: 24px 48px;
  border-radius: 16px;
  box-shadow: 0 20px 50px -12px rgba(26, 34, 51, 0.35);
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.card {
  font-family: 'Inter', sans-serif;
  background: #f6f8fb;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  gap: 12px;
  transition: background 0.25s ease;
}
.badge {
  background: #5eead4;
  color: #1a2233;
  border-radius: 999px;
  padding: 4px 12px;
  font-family: 'Share Tech Mono', monospace;
}
button.primary {
  background: #38bdf8;
  color: #f6f8fb;
  border-radius: 10px;
  padding: 12px 24px;
  box-shadow: 0 8px 24px -6px rgba(56, 189, 248, 0.5);
  transition: box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.alert {
  background: hsl(4, 84%, 58%);
  color: #f6f8fb;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}
.grid {
  display: grid;
  gap: 24px;
  padding: 32px;
  transition: gap 0.3s linear;
}
.muted { color: rgba(26, 34, 51, 0.55); }
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  border-radius: 999px;
  background: hsla(255, 84%, 68%, 0.9);
  box-shadow: 0 16px 40px -10px rgba(167, 139, 250, 0.6);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}`;

  // === Color Utilities ===
  function parseColor(str) {
    str = str.trim().toLowerCase();
    let m;
    if ((m = str.match(/^#([0-9a-f]{3,8})$/))) {
      const hex = m[1];
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16), g = parseInt(hex[1] + hex[1], 16), b = parseInt(hex[2] + hex[2], 16);
        const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return { r, g, b, a };
      }
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    if ((m = str.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/))) {
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]) : 1 };
    }
    if ((m = str.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+))?\s*\)$/))) {
      const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
      const a = m[4] != null ? +m[4] : 1;
      const rgb = hslToRgb(h, s, l);
      return { ...rgb, a };
    }
    return null;
  }
  function hslToRgb(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function toHex({ r, g, b }) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function colorLabel(c) {
    const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
    if (s < 12) {
      if (l < 14) return 'void'; if (l < 32) return 'carbon'; if (l < 58) return 'slate';
      if (l < 82) return 'mist'; return 'paper';
    }
    const hueNames = [
      [14, 'crimson'], [38, 'ember'], [58, 'gold'], [76, 'lime'],
      [150, 'emerald'], [172, 'jade'], [196, 'cyan'], [220, 'azure'],
      [252, 'indigo'], [286, 'violet'], [318, 'orchid'], [342, 'rose'], [361, 'crimson']
    ];
    const base = hueNames.find(([limit]) => h < limit)[1];
    const mod = l < 26 ? 'deep-' : l > 74 ? 'pale-' : s > 76 ? 'neon-' : '';
    return mod + base;
  }
  function colorDistance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  }

  // === CSS Parser ===
  function parseCSS(source) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const declRe = /([-a-zA-Z]+)\s*:\s*([^;{}]+);/g;
    const decls = [];
    let m;
    while ((m = declRe.exec(css))) decls.push({ prop: m[1].toLowerCase(), value: m[2].trim() });
    return decls;
  }

  function extractTokens(decls) {
    const colors = new Map();
    const fonts = new Map();
    const spacing = new Map();
    const radii = new Map();
    const shadows = new Map();
    const durations = new Map();
    const easings = new Map();
    const sizeRe = /^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch)$/;

    const bump = (map, key, extra) => {
      if (!map.has(key)) map.set(key, { count: 0, ...extra });
      map.get(key).count++;
    };
    const addColor = (raw) => {
      const c = parseColor(raw);
      if (!c) return;
      for (const [key, entry] of colors) {
        if (colorDistance(key, c) < 24 && Math.abs(key.a - c.a) < 0.12) {
          entry.variants.add(raw.trim());
          entry.count++;
          return;
        }
      }
      colors.set(c, { count: 1, variants: new Set([raw.trim()]) });
    };

    for (const { prop, value } of decls) {
      // colors — from any value
      const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|hsla?\([^()]*\)/g;
      let cm;
      while ((cm = colorRe.exec(value))) addColor(cm[0]);

      if (prop === 'font-family') {
        const first = value.split(',')[0].replace(/["']/g, '').trim();
        if (first) bump(fonts, first, {});
      }
      if (/^(margin|padding|gap|row-gap|column-gap)$/.test(prop)) {
        value.split(/\s+/).forEach((v) => { if (sizeRe.test(v)) bump(spacing, v, {}); });
      }
      if (prop === 'border-radius') {
        value.split(/[\s\/]+/).forEach((v) => {
          if (sizeRe.test(v)) bump(radii, v, {});
          else if (v === '999px' || v === '9999px' || v === '50%') bump(radii, v, {});
        });
      }
      if (/^(box|text)-shadow$/.test(prop) && value !== 'none') {
        bump(shadows, value.replace(/\s+/g, ' '), {});
      }
      if (/^(transition|transition-duration|animation|animation-duration)$/.test(prop)) {
        const durRe = /(\d*\.?\d+)(ms|s)\b/g;
        let dm;
        while ((dm = durRe.exec(value))) {
          const ms = dm[2] === 's' ? parseFloat(dm[1]) * 1000 : parseFloat(dm[1]);
          if (ms >= 40) bump(durations, Math.round(ms) + 'ms', {});
        }
        const easeRe = /(cubic-bezier\([^)]*\)|ease-in-out|ease-in|ease-out|linear|ease)/g;
        let em;
        while ((em = easeRe.exec(value))) bump(easings, em[1], {});
      }
    }
    return { colors, fonts, spacing, radii, shadows, durations, easings };
  }

  // === Token Namer ===
  const dedupe = (names) => {
    const seen = new Set();
    return names.map((n) => {
      let name = n, i = 2;
      while (seen.has(name)) name = n + '-' + i++;
      seen.add(name);
      return name;
    });
  };
  function sortByCount(map) {
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }

  function buildTokenModel(raw) {
    const groups = [];
    const flat = [];

    const colorEntries = sortByCount(raw.colors).slice(0, 10);
    const colorNames = dedupe(colorEntries.map(([c]) => '--color-' + colorLabel(c)));
    colorEntries.forEach(([c, info], i) => {
      flat.push({ name: colorNames[i], value: toHex(c), copy: colorNames[i] + ': ' + toHex(c) + ';', type: 'color', color: c });
    });

    const fontEntries = sortByCount(raw.fonts).slice(0, 6);
    const fontNames = dedupe(fontEntries.map(([family]) => {
      const role = /mono|code/i.test(family) ? 'mono' : fontEntries[0][0] === family ? 'body' : 'display';
      return '--font-' + role;
    }));
    fontEntries.forEach(([family], i) => {
      const name = fontNames[i];
      flat.push({ name, value: "'" + family + "'", copy: name + ": '" + family + "';", type: 'font', family });
    });

    const scaleSteps = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    const spaceEntries = sortByCount(raw.spacing).slice(0, 9);
    spaceEntries.forEach(([v], i) => {
      const name = '--space-' + (scaleSteps[scaleSteps.length - spaceEntries.length + i] || i + 1);
      flat.push({ name, value: v, copy: name + ': ' + v + ';', type: 'space' });
    });

    const radiusSteps = ['xs', 'sm', 'md', 'lg', 'xl'];
    const radiusEntries = sortByCount(raw.radii).slice(0, 5);
    radiusEntries.forEach(([v], i) => {
      const isFull = v === '999px' || v === '9999px' || v === '50%';
      const name = '--radius-' + (isFull ? 'full' : radiusSteps[radiusSteps.length - radiusEntries.length + i] || i + 1);
      flat.push({ name, value: v, copy: name + ': ' + v + ';', type: 'radius' });
    });

    const shadowEntries = sortByCount(raw.shadows).slice(0, 4);
    shadowEntries.forEach(([v], i) => {
      const name = '--shadow-' + (i === 0 ? 'soft' : i === 1 ? 'lift' : i === 2 ? 'pop' : 'glow');
      flat.push({ name, value: v, copy: name + ': ' + v + ';', type: 'shadow', shadow: v });
    });

    const durEntries = sortByCount(raw.durations).slice(0, 4);
    const durLabels = ['fast', 'base', 'slow', 'lazy'];
    durEntries.forEach(([v], i) => {
      flat.push({ name: '--duration-' + durLabels[i], value: v, copy: '--duration-' + durLabels[i] + ': ' + v + ';', type: 'motion' });
    });

    const easeEntries = sortByCount(raw.easings).filter(([v]) => v !== 'ease' && v !== 'linear').slice(0, 3);
    easeEntries.forEach(([v], i) => {
      const name = v.startsWith('cubic-bezier') ? '--ease-' + (i === 0 ? 'flow' : i === 1 ? 'snap' : 'drift') : '--ease-stock';
      flat.push({ name, value: v, copy: name + ': ' + v + ';', type: 'ease', ease: v });
    });

    // group by type
    const groupDefs = [
      { type: 'color', icon: '◐', name: '色彩 · Color' },
      { type: 'font', icon: 'Aa', name: '字体 · Typography' },
      { type: 'space', icon: '⇔', name: '间距 · Spacing' },
      { type: 'radius', icon: '◜', name: '圆角 · Radius' },
      { type: 'shadow', icon: '▓', name: '阴影 · Elevation' },
      { type: 'motion', icon: '◷', name: '动效 · Motion' },
      { type: 'ease', icon: '∿', name: '缓动 · Easing' }
    ];
    for (const def of groupDefs) {
      const items = flat.filter((t) => t.type === def.type);
      if (items.length) groups.push({ ...def, items });
    }
    return { groups, flat };
  }

  // === Renderer ===
  function easePath(bezierStr) {
    const m = bezierStr.match(/cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (!m) {
      const presets = { 'ease-in-out': [0.42, 0, 0.58, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1] };
      const p = presets[bezierStr] || [0.25, 0.1, 0.25, 1];
      var [x1, y1, x2, y2] = p;
    } else {
      var [x1, y1, x2, y2] = [+m[1], +m[2], +m[3], +m[4]];
    }
    const X = (x) => (2 + x * 26).toFixed(1);
    const Y = (y) => (24 - y * 22).toFixed(1);
    return `M2 24 C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, 28 2`;
  }

  function renderTokens(model) {
    tokenGrid.innerHTML = '';
    model.groups.forEach((group, gi) => {
      const card = document.createElement('div');
      card.className = 'token-group glass';
      card.innerHTML =
        '<div class="group-head">' +
        '<div class="group-icon">' + group.icon + '</div>' +
        '<span class="group-name">' + group.name + '</span>' +
        '<span class="group-count">' + group.items.length + '</span></div>' +
        '<div class="token-list"></div>';
      const list = card.querySelector('.token-list');
      group.items.forEach((tok, ti) => {
        const row = document.createElement('div');
        row.className = 'token-row';
        row.dataset.copy = tok.copy;
        let visual = '';
        if (tok.type === 'color') {
          visual = '<div class="token-swatch"><div class="token-swatch-fill" style="background:' + tok.value + '"></div><div class="token-swatch-glow"></div></div>';
        } else if (tok.type === 'font') {
          visual = '<div class="token-swatch"><span class="token-font-preview" style="font-family:' + tok.family + ',sans-serif">Aa</span></div>';
        } else if (tok.type === 'shadow') {
          visual = '<div class="token-shadow-preview" style="box-shadow:' + tok.shadow + '"></div>';
        } else if (tok.type === 'ease') {
          visual = '<svg class="token-ease-preview" viewBox="0 0 30 26"><path d="' + easePath(tok.ease) + '"/></svg>';
        } else {
          visual = '<div class="token-swatch"><div class="token-swatch-fill" style="background:linear-gradient(135deg,rgb(var(--acc-2)),rgb(var(--acc-3)))"></div></div>';
        }
        row.innerHTML = visual +
          '<div class="token-meta"><span class="token-name">' + tok.name + '</span>' +
          '<span class="token-value">' + escapeHtml(tok.value) + '</span></div>' +
          '<span class="token-freq">·</span><span class="token-copy-hint">copy</span>';
        list.appendChild(row);
        setTimeout(() => attachRowBehavior(row), 0);
      });
      tokenGrid.appendChild(card);
      // 级联入场（非线性）
      setTimeout(() => card.classList.add('is-in'), 120 + gi * 110);
      [...list.children].forEach((row, i) => setTimeout(() => row.classList.add('is-in'), 260 + gi * 110 + i * 55));
    });
    chipTokens.textContent = model.flat.length + ' tokens';
    chipTokens.classList.add('is-hot');
    setTimeout(() => chipTokens.classList.remove('is-hot'), 1800);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // === Export Generator ===
  function buildExport(model, format) {
    if (format === 'css') {
      return '/* Distilled design tokens */\n:root {\n' +
        model.flat.map((t) => '  ' + t.name + ': ' + t.value + ';').join('\n') + '\n}';
    }
    if (format === 'json') {
      const obj = {};
      model.flat.forEach((t) => {
        const [ns, ...rest] = t.name.replace('--', '').split('-');
        const key = rest.join('-');
        if (!obj[ns]) obj[ns] = {};
        obj[ns][key] = { value: t.value };
      });
      return JSON.stringify({ $schema: 'distilled-tokens', ...obj }, null, 2);
    }
    const tw = { color: {}, font: {}, space: {}, radius: {}, shadow: {}, duration: {}, ease: {} };
    model.flat.forEach((t) => {
      const [ns, ...rest] = t.name.replace('--', '').split('-');
      tw[ns][rest.join('-')] = t.value;
    });
    return '// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: ' +
      JSON.stringify(tw, null, 2).replace(/\n/g, '\n  ') + '\n  }\n}';
  }
  function renderExport() {
    if (!state.tokens) return;
    const code = buildExport(state.tokens, state.exportFormat);
    exportCode.innerHTML = escapeHtml(code)
      .replace(/(--[\w-]+)/g, '<span class="hl-var">$1</span>')
      .replace(/(&quot;[^&]*&quot;)/g, '<span class="hl-val">$1</span>');
  }

  // === Distill Flow ===
  async function distill() {
    if (state.distilling) return;
    const source = cssInput.value.trim();
    if (!source) { showToast('paste some css first'); cssInput.focus(); return; }
    state.distilling = true;
    btnDistill.disabled = true;

    const decls = parseCSS(source);
    const messages = ['reading declarations…', 'clustering colors…', 'naming tokens…', 'polishing scale…', 'bottling output ✓'];
    progressWrap.classList.add('is-active');
    distillBurst();

    for (let i = 0; i <= 4; i++) {
      progressFill.style.width = (i * 25) + '%';
      if (i < messages.length) scrambleTo(progressText, messages[i], 220);
      await sleep(i === 0 ? 120 : 260);
    }
    chipDecls.textContent = decls.length + ' declarations';
    chipDecls.classList.add('is-hot');
    setTimeout(() => chipDecls.classList.remove('is-hot'), 1800);

    const raw = extractTokens(decls);
    state.tokens = buildTokenModel(raw);
    renderTokens(state.tokens);
    exportPanel.hidden = false;
    renderExport();
    positionTabSlider(document.querySelector('.export-tab.is-active'));

    progressFill.style.width = '100%';
    scrambleTo(progressText, 'done · ' + state.tokens.flat.length + ' tokens distilled', 300);
    await sleep(700);
    progressWrap.classList.remove('is-active');
    setTimeout(() => { progressFill.style.width = '0%'; }, 600);
    state.distilling = false;
    btnDistill.disabled = false;
  }

  // === Micro-interactions ===
  function attachRowBehavior(row) {
    row.addEventListener('click', (e) => {
      copyText(row.dataset.copy);
      showToast(row.dataset.copy.split(':')[0] + ' copied');
      spawnRipple(row, e);
      pulseRow(row);
    });
  }
  function pulseRow(row) {
    row.style.transform = 'translateX(5px) scale(1.02)';
    setTimeout(() => { row.style.transform = ''; }, 260);
  }
  function spawnRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'btn-ripple';
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + ((e.clientX || rect.left + rect.width / 2) - rect.left - size / 2) + 'px;top:' + ((e.clientY || rect.top + rect.height / 2) - rect.top - size / 2) + 'px;';
    el.appendChild(r);
    setTimeout(() => r.remove(), 750);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    } else legacyCopy(text);
  }
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    ta.remove();
  }

  let toastTimer;
  function showToast(msg) {
    scrambleTo(toastText, msg, 200);
    toast.classList.add('is-in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-in'), 2000);
  }

  // 磁力按钮
  function magnetize(btn, strength) {
    strength = strength || 10;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = 'translate(' + dx / strength + 'px,' + dy / strength + 'px) translateY(-2px)';
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  }

  // 乱码揭示
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#░▒▓';
  function scrambleTo(el, target, duration) {
    const start = performance.now();
    const from = el.textContent;
    const len = Math.max(from.length, target.length);
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (i / len < p - 0.15) out += target[i] || '';
        else if (i / len < p + 0.15) out += GLYPHS[Math.random() * GLYPHS.length | 0];
        else out += from[i] || '';
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    }
    requestAnimationFrame(frame);
  }

  // 导出 tab 滑块
  function positionTabSlider(tab) {
    if (!tab) return;
    tabSlider.style.width = tab.offsetWidth + 'px';
    tabSlider.style.transform = 'translateX(' + (tab.offsetLeft - 4) + 'px)';
  }

  // === Ambient Particle Field (背景流场) ===
  function particleField() {
    const canvas = $('#particle-field');
    const ctx = canvas.getContext('2d');
    let W, H, pts = [];
    function resize() {
      W = canvas.width = innerWidth * devicePixelRatio;
      H = canvas.height = innerHeight * devicePixelRatio;
      canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
      const n = Math.min(90, innerWidth / 16 | 0);
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.4 + Math.random() * 1.4, o: 0.12 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2
      }));
    }
    function accent(i) {
      const rgb = getComputedStyle(document.body).getPropertyValue('--acc-' + i).trim().split(' ').join(',');
      return rgb;
    }
    let t = 0;
    function loop() {
      t += 0.0016;
      ctx.clearRect(0, 0, W, H);
      const a1 = accent(1), a2 = accent(2);
      for (const p of pts) {
        const fx = Math.sin(p.y / H * 4 + t * 2 + p.ph) * 0.5 + Math.cos(t + p.x / W * 3) * 0.4;
        const fy = Math.cos(p.x / W * 4 - t * 1.6 + p.ph) * 0.5 + Math.sin(t * 1.2 + p.y / H * 3) * 0.35;
        p.x += fx * 0.35 * devicePixelRatio;
        p.y += fy * 0.35 * devicePixelRatio;
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + p.ph * 3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * devicePixelRatio * tw, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (p.ph > Math.PI ? a1 : a2) + ',' + p.o * tw + ')';
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    addEventListener('resize', resize);
    resize(); loop();
  }

  // === Distill Burst (蒸馏粒子流) ===
  function distillBurst() {
    const canvas = $('#distill-canvas');
    canvas.classList.add('is-active');
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio;
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    const r = btnDistill.getBoundingClientRect();
    const ox = (r.left + r.width / 2) * dpr, oy = (r.top + r.height / 2) * dpr;
    const parts = Array.from({ length: 90 }, () => {
      const ang = Math.random() * Math.PI * 2;
      const sp = (2 + Math.random() * 7) * dpr;
      return { x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2 * dpr, life: 1, s: (1 + Math.random() * 2.4) * dpr };
    });
    const acc = (i) => getComputedStyle(document.body).getPropertyValue('--acc-' + i).trim().split(' ').join(',');
    let frames = 0;
    (function loop() {
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.965; p.vy = p.vy * 0.965 + 0.06 * dpr;
        p.life -= 0.014;
        if (p.life > 0) {
          alive++;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * p.life, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + acc(1 + (frames % 3)) + ',' + p.life * 0.85 + ')';
          ctx.fill();
        }
      }
      if (alive > 0) requestAnimationFrame(loop);
      else canvas.classList.remove('is-active');
    })();
  }

  // === Theme Switching ===
  themeDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const theme = dot.dataset.theme;
      state.theme = theme;
      document.body.dataset.theme = theme;
      themeDots.forEach((d) => d.classList.toggle('is-active', d === dot));
      showToast('mood · ' + theme);
    });
  });

  // === Wiring ===
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  btnDistill.addEventListener('click', (e) => { spawnRipple(btnDistill, e); distill(); });
  btnSample.addEventListener('click', () => {
    cssInput.value = SAMPLE_CSS;
    showToast('sample loaded');
    setTimeout(distill, 350);
  });
  btnClear.addEventListener('click', () => {
    cssInput.value = '';
    tokenGrid.innerHTML = '';
    exportPanel.hidden = true;
    state.tokens = null;
    chipDecls.textContent = '0 declarations';
    chipTokens.textContent = '0 tokens';
    showToast('cleared');
    cssInput.focus();
  });

  exportTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      exportTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.exportFormat = tab.dataset.format;
      positionTabSlider(tab);
      renderExport();
    });
  });
  btnCopyOutput.addEventListener('click', () => {
    if (!state.tokens) return;
    copyText(buildExport(state.tokens, state.exportFormat));
    scrambleTo(btnCopyOutput, 'COPIED', 250);
    setTimeout(() => scrambleTo(btnCopyOutput, '复制', 250), 1400);
    showToast(state.exportFormat + ' tokens copied');
  });

  // Ctrl/Cmd + Enter 快捷蒸馏
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); distill(); }
  });

  // === Init ===
  magnetize(btnDistill, 8);
  magnetize(btnSample, 14);
  magnetize(btnCopyOutput, 12);
  themeDots[0].classList.add('is-active');
  particleField();
  cssInput.value = SAMPLE_CSS;
  setTimeout(distill, 900); // 首屏自动演示一次蒸馏
})();
