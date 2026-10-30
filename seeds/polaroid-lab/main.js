/* ============================================================
   Polaroid Lab · 拍立得暗房 — 交互逻辑
   免构建 Vanilla JS：显影动画 / 弹簧拖拽 / 胶片色调 / PNG 导出
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const darkroom = document.getElementById('darkroom');
  const dropHint = document.getElementById('dropHint');
  const fileInput = document.getElementById('fileInput');
  const frameCounter = document.getElementById('frameCounter');
  const shutterFlash = document.getElementById('shutterFlash');
  const consoleEl = document.getElementById('console');
  const consoleTab = document.getElementById('console-tab') || createConsoleTab();
  const overlay = document.getElementById('overlay');
  const overlayImg = document.getElementById('overlayImg');
  const overlayMeta = document.getElementById('overlayMeta');
  const exportCanvas = document.getElementById('exportCanvas');

  // === State ===
  const state = {
    tone: 'original',
    devTime: 2.2,
    grain: 0.34,
    vignette: 0.42,
    frameSeq: 0,
    zTop: 10,
    cards: [],
    overlayCard: null
  };

  const TONES = ['original', 'noir', 'sepia', 'vivid', 'frost', 'chrome'];
  const SAMPLE_NAMES = ['SUNSET 600', 'NEON RAIN', 'MIDNIGHT GARDEN', 'CHEMICAL DAWN', 'SILVER LAKE', 'ULTRAVIOLET'];

  // === Utils ===
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function createConsoleTab() {
    const tab = document.createElement('button');
    tab.className = 'console-tab';
    tab.id = 'console-tab';
    tab.textContent = 'DARKROOM CONSOLE';
    document.body.appendChild(tab);
    return tab;
  }

  // === 拍摄快门闪光 ===
  function flash() {
    shutterFlash.classList.remove('on');
    void shutterFlash.offsetWidth;
    shutterFlash.classList.add('on');
  }

  // === 程序化样片生成（无外部图片依赖） ===
  function generateSample() {
    const size = 520;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');

    const palettes = [
      ['#2b1055', '#7597de', '#ffb26b', '#ff7e5f'],
      ['#0f2027', '#2c5364', '#4cc9f0', '#e8fff9'],
      ['#093028', '#237a57', '#a3f7bf', '#fdeff2'],
      ['#41295a', '#2f0743', '#ff4e9a', '#ffc2e0'],
      ['#1a2a6c', '#b21f1f', '#fdbb2d', '#fff8e1'],
      ['#000428', '#004e92', '#aa4bff', '#ff6ec7']
    ];
    const pal = palettes[Math.floor(Math.random() * palettes.length)];

    // 基底线性渐变
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.55, pal[1]);
    g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // 大颗光斑（bokeh）
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 14; i++) {
      const r = rand(24, 120);
      const rg = ctx.createRadialGradient(rand(0, size), rand(0, size), 0, rand(0, size), rand(0, size), r);
      rg.addColorStop(0, pal[Math.floor(rand(2, 4))] + 'cc');
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 地平线 / 天体
    ctx.globalCompositeOperation = 'source-over';
    const sunY = rand(size * 0.3, size * 0.6);
    const sg = ctx.createRadialGradient(size * 0.5, sunY, 0, size * 0.5, sunY, size * 0.45);
    sg.addColorStop(0, 'rgba(255,250,230,0.95)');
    sg.addColorStop(0.25, 'rgba(255,220,180,0.5)');
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(8,8,14,0.55)';
    ctx.fillRect(0, sunY + size * 0.18, size, size);

    return cv.toDataURL('image/jpeg', 0.88);
  }

  // === 拍立得卡片创建 ===
  function createPolaroid(src, name) {
    const card = document.createElement('figure');
    card.className = 'polaroid enter developing';
    card.dataset.tone = state.tone;

    const x = clamp(rand(window.innerWidth * 0.2, window.innerWidth * 0.8), 150, window.innerWidth - 150);
    const y = clamp(rand(window.innerHeight * 0.25, window.innerHeight * 0.75), 180, window.innerHeight - 160);
    const rot = rand(-9, 9);

    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.setProperty('--rot', rot.toFixed(1) + 'deg');
    card.style.setProperty('--grain', state.grain.toFixed(2));
    card.style.setProperty('--vig', state.vignette.toFixed(2));
    card.style.zIndex = ++state.zTop;

    card.innerHTML =
      '<div class="polaroid__tools">' +
      '  <button class="tool-btn tool-view" title="查看 / 导出">◎</button>' +
      '  <button class="tool-btn tool-again" title="重新显影">◐</button>' +
      '  <button class="tool-btn tool-delete" title="移除">✕</button>' +
      '</div>' +
      '<div class="polaroid__photo">' +
      '  <img alt="polaroid" draggable="false">' +
      '  <div class="polaroid__fx"></div>' +
      '  <div class="polaroid__develop"></div>' +
      '</div>' +
      '<div class="polaroid__tones">' +
      TONES.map(t => '<span class="tone-dot' + (t === state.tone ? ' active' : '') + '" data-tone="' + t + '"></span>').join('') +
      '</div>' +
      '<input class="polaroid__caption" placeholder="write here…" maxlength="26">';

    card._seq = state.frameSeq;
    const img = card.querySelector('img');
    img.src = src;
    card.querySelector('.polaroid__caption').value = name || '';

    // === 显影动画 ===
    develop(card);

    // === 交互绑定 ===
    bindDrag(card);
    bindTools(card);

    darkroom.appendChild(card);
    state.cards.push(card);
    updateCounter();
    setTimeout(() => card.classList.remove('enter'), 950);
    return card;
  }

  function develop(card) {
    const devEl = card.querySelector('.polaroid__develop');
    card.classList.add('developing');
    devEl.style.transition = 'none';
    devEl.style.opacity = '1';

    void devEl.offsetWidth; // 强制 reflow 重启动画

    const t = state.devTime;
    devEl.style.transition = 'opacity ' + t + 's cubic-bezier(0.16, 1, 0.3, 1)';
    devEl.style.opacity = '0';

    clearTimeout(card._devTimer);
    card._devTimer = setTimeout(() => card.classList.remove('developing'), t * 1000 + 200);
  }

  // === 弹簧拖拽 ===
  function bindDrag(card) {
    let dragging = false, targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;
    const baseLeft = parseFloat(card.style.left);
    const baseTop = parseFloat(card.style.top);
    curX = targetX = baseLeft;
    curY = targetY = baseTop;

    function springLoop() {
      // 弹簧-阻尼插值：卡片柔滑追随光标
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;
      card.style.left = curX + 'px';
      card.style.top = curY + 'px';
      if (dragging || Math.abs(targetX - curX) > 0.4 || Math.abs(targetY - curY) > 0.4) {
        raf = requestAnimationFrame(springLoop);
      } else {
        raf = null;
      }
    }

    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tool-btn') || e.target.closest('.tone-dot')) return;
      if (e.button !== 0) return;
      dragging = true;
      card.classList.add('dragging');
      card.style.zIndex = ++state.zTop;
      targetX = curX = parseFloat(card.style.left);
      targetY = curY = parseFloat(card.style.top);
      const offX = e.clientX - curX;
      const offY = e.clientY - curY;
      card.setPointerCapture(e.pointerId);
      if (!raf) raf = requestAnimationFrame(springLoop);

      function onMove(ev) {
        targetX = ev.clientX - offX;
        targetY = ev.clientY - offY;
      }
      function onUp() {
        dragging = false;
        card.classList.remove('dragging');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      e.preventDefault();
    });
  }

  // === 卡片工具 ===
  function bindTools(card) {
    card.addEventListener('dblclick', (e) => {
      if (e.target.closest('input')) return;
      openOverlay(card);
    });
    card.querySelector('.tool-view').addEventListener('click', () => openOverlay(card));
    card.querySelector('.tool-again').addEventListener('click', () => develop(card));
    card.querySelector('.tool-delete').addEventListener('click', () => removeCard(card));
    card.querySelectorAll('.tone-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        card.dataset.tone = dot.dataset.tone;
        card.querySelectorAll('.tone-dot').forEach(d => d.classList.toggle('active', d === dot));
      });
    });
  }

  function removeCard(card) {
    card.style.transition = 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)';
    card.style.opacity = '0';
    card.style.transform = 'translate(-50%, -50%) scale(0.75) rotate(12deg)';
    setTimeout(() => {
      card.remove();
      state.cards = state.cards.filter(c => c !== card);
      updateCounter();
    }, 460);
  }

  function updateCounter() {
    frameCounter.textContent = 'FRAMES ' + String(state.frameSeq).padStart(3, '0');
    dropHint.classList.toggle('hidden', state.cards.length > 0);
  }

  // === 详情浮层与导出 ===
  function openOverlay(card) {
    state.overlayCard = card;
    const img = card.querySelector('img');
    overlayImg.src = img.src;
    overlayImg.style.filter = getComputedStyle(img).filter;
    overlayImg.parentElement.style.setProperty('--grain', state.grain.toFixed(2));
    const cap = card.querySelector('.polaroid__caption').value || 'untitled';
    overlayMeta.textContent = cap + ' · ' + card.dataset.tone.toUpperCase() + ' · NO.' + (card._seq || '---');
    overlay.classList.add('show');
  }

  document.getElementById('btnCloseOverlay').addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });

  document.getElementById('btnExport').addEventListener('click', () => {
    const card = state.overlayCard;
    if (!card) return;
    const img = card.querySelector('img');
    const caption = card.querySelector('.polaroid__caption').value || 'polaroid lab';
    const W = 620, pad = 34, photo = W - pad * 2, capH = 74;
    const H = pad + photo + capH;

    exportCanvas.width = W;
    exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d');

    // 相纸底
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#f8f6f0');
    bg.addColorStop(1, '#ece8de');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 照片 + CSS 滤镜映射
    try { ctx.filter = getComputedStyle(img).filter; } catch (e) { ctx.filter = 'none'; }
    const iw = img.naturalWidth || photo, ih = img.naturalHeight || photo;
    const scale = Math.max(photo / iw, photo / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, pad - (dw - photo) / 2, pad - (dh - photo) / 2, dw, dh);
    ctx.filter = 'none';

    // 暗角
    const vg = ctx.createRadialGradient(W / 2, pad + photo / 2, photo * 0.35, W / 2, pad + photo / 2, photo * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,8,4,' + state.vignette * 0.9 + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(pad, pad, photo, photo);

    // 手写注记
    ctx.fillStyle = '#3a3226';
    ctx.font = '26px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(caption, W / 2, pad + photo + 46);

    const a = document.createElement('a');
    a.download = 'polaroid-' + Date.now() + '.png';
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
  });

  // === 图片导入 ===
  function importFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      flash();
      state.frameSeq++;
      createPolaroid(e.target.result, file.name.replace(/\.[^.]+$/, '').slice(0, 26).toUpperCase());
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('btnSample').addEventListener('click', () => {
    flash();
    state.frameSeq++;
    createPolaroid(generateSample(), SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]);
  });
  document.getElementById('btnUpload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(importFile);
    fileInput.value = '';
  });

  // 拖拽 / 粘贴
  ;['dragenter', 'dragover'].forEach(ev =>
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      dropHint.classList.add('dragover');
      dropHint.classList.remove('hidden');
    })
  );
  ;['dragleave', 'drop'].forEach(ev =>
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      dropHint.classList.remove('dragover');
      updateCounter();
    })
  );
  window.addEventListener('drop', (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) {
      Array.from(files).forEach((f, i) => setTimeout(() => importFile(f), i * 260));
    } else {
      const url = e.dataTransfer.getData('URL');
      if (url) {
        flash();
        state.frameSeq++;
        createPolaroid(url, 'DRAGGED IMAGE');
      }
    }
  });
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        importFile(item.getAsFile());
        break;
      }
    }
  });

  // === 控制台 ===
  document.getElementById('filmGrid').addEventListener('click', (e) => {
    const chip = e.target.closest('.film-chip');
    if (!chip) return;
    document.querySelectorAll('.film-chip').forEach(c => c.classList.toggle('active', c === chip));
    state.tone = chip.dataset.tone;
  });

  function bindRange(id, valId, key, format) {
    const input = document.getElementById(id);
    const val = document.getElementById(valId);
    input.addEventListener('input', () => {
      state[key] = parseFloat(input.value);
      val.textContent = format(state[key]);
      state.cards.forEach(card => {
        if (key === 'grain') card.style.setProperty('--grain', state.grain.toFixed(2));
        if (key === 'vignette') card.style.setProperty('--vig', state.vignette.toFixed(2));
      });
    });
  }
  bindRange('devTime', 'devTimeVal', 'devTime', v => v.toFixed(1) + 's');
  bindRange('grainAmt', 'grainAmtVal', 'grain', v => v.toFixed(0) + '%');
  bindRange('vignetteAmt', 'vignetteAmtVal', 'vignette', v => v.toFixed(0) + '%');
  state.grain = 0.34; state.vignette = 0.42; // 与 CSS 变量默认同步

  document.getElementById('btnShuffle').addEventListener('click', () => {
    state.cards.forEach((card, i) => {
      setTimeout(() => {
        card.style.transition = 'left 0.9s cubic-bezier(0.16,1,0.3,1), top 0.9s cubic-bezier(0.16,1,0.3,1)';
        card.style.left = clamp(rand(window.innerWidth * 0.18, window.innerWidth * 0.82), 150, window.innerWidth - 150) + 'px';
        card.style.top = clamp(rand(window.innerHeight * 0.25, window.innerHeight * 0.75), 180, window.innerHeight - 160) + 'px';
        card.style.setProperty('--rot', rand(-9, 9).toFixed(1) + 'deg');
        setTimeout(() => card.style.transition = '', 950);
      }, i * 90);
    });
  });

  document.getElementById('btnDevelopAll').addEventListener('click', () => {
    state.cards.forEach((card, i) => setTimeout(() => develop(card), i * 160));
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    [...state.cards].forEach((card, i) => setTimeout(() => removeCard(card), i * 70));
  });

  // === 控制台抽屉 & 主题 ===
  consoleTab.addEventListener('click', () => {
    consoleEl.classList.toggle('open');
    document.body.classList.toggle('console-open');
  });
  setTimeout(() => {
    consoleEl.classList.add('open');
    document.body.classList.add('console-open');
  }, 900);

  document.getElementById('themeSwatches').addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === sw));
    document.body.dataset.theme = sw.dataset.theme;
  });

  // === 启动：自动拍两张样片 ===
  setTimeout(() => {
    flash();
    state.frameSeq++;
    const first = createPolaroid(generateSample(), SAMPLE_NAMES[0]);
    first.style.left = (window.innerWidth * 0.42) + 'px';
    first.style.top = (window.innerHeight * 0.5) + 'px';
    setTimeout(() => {
      flash();
      state.frameSeq++;
      const second = createPolaroid(generateSample(), SAMPLE_NAMES[3]);
      second.style.left = (window.innerWidth * 0.6) + 'px';
      second.style.top = (window.innerHeight * 0.56) + 'px';
    }, 500);
  }, 400);
})();
