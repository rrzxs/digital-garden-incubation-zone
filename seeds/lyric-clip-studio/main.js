/* ============================================================
   Lyric Clip Studio · 歌词片段工作室
   交互逻辑：状态管理 / 卡片渲染 / 字符揭示 / 3D 倾斜 / 涟漪 / PNG 导出
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const body = document.body;
  const lyricInput = document.getElementById('lyricInput');
  const songInput = document.getElementById('songInput');
  const artistInput = document.getElementById('artistInput');
  const tplGrid = document.getElementById('tplGrid');
  const moodGrid = document.getElementById('moodGrid');
  const alignRow = document.getElementById('alignRow');
  const scaleRange = document.getElementById('scaleRange');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const exportBtn = document.getElementById('exportBtn');
  const cardTilt = document.getElementById('cardTilt');
  const clipCard = document.getElementById('clipCard');
  const cardInner = document.getElementById('cardInner');
  const rippleLayer = document.getElementById('rippleLayer');
  const toast = document.getElementById('toast');

  // === State ===
  const state = {
    mood: 'violet',
    tpl: 'tracklight',
    align: 'left',
    scale: 1,
    sampleIndex: -1
  };

  // === Sample Lyrics（原创片段库） ===
  const SAMPLES = [
    { lines: '把晚风折进信封里\n寄给还没抵达的夏天', song: '未寄出的夏', artist: '匿名海豚' },
    { lines: '路灯把影子拉得很长\n长到可以走回昨天', song: '夜行地图', artist: '糖纸卫星' },
    { lines: '我在噪声的海洋里\n打捞一句跑调的回音', song: '深潜频率', artist: '青鲸电台' },
    { lines: '钟摆停在三点零一\n时间在等一个迟到的人', song: '三点零一', artist: '白噪合唱团' },
    { lines: '星屑落在旧磁带上\n按下播放就重新发光', song: '磁带银河', artist: '纸飞机航线' },
    { lines: '雨在窗上写了一夜的诗\n清晨替它署名', song: '窗上的信', artist: '薄荷气候' },
    { lines: '所有迷路的信号\n最终都会找到接收它的人', song: '信号灯塔', artist: '孤岛电台' },
    { lines: '我们把黄昏装进口袋\n留到冬天再拿出来取暖', song: '口袋黄昏', artist: '南方候鸟' }
  ];

  // === 工具函数 ===
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toastMsg(text) {
    toast.textContent = text;
    toast.classList.add('flash');
    setTimeout(() => toast.classList.remove('flash'), 1200);
  }

  function getLines() {
    return lyricInput.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);
  }

  // === 卡片渲染（DOM + 字符级揭示动画） ===
  function renderCard() {
    const lines = getLines();
    const song = songInput.value.trim() || '无题';
    const artist = artistInput.value.trim() || '佚名';
    const chars = lyricInput.value.replace(/\n/g, '').length;
    let html = '';

    if (state.tpl === 'terminal') {
      html += '<div class="term-head"><span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span><span style="margin-left:8px;">lyric://now-playing</span></div>';
      html += '<div class="term-body"><div class="lyric-body">';
      html += lines.map((line) => `<span class="lyric-line">${revealChars(line)}</span>`).join('');
      html += '</div></div>';
      html += `<div class="term-foot"><div class="card-meta"><span class="meta-song">${esc(song)}</span><span>— ${esc(artist)}</span><span>${chars}ch</span></div></div>`;
    } else {
      html += '<div class="lyric-body">';
      html += lines.map((line) => `<span class="lyric-line">${revealChars(line)}</span>`).join('');
      html += '</div>';
      html += `<div class="card-meta"><span>♪ <span class="meta-song">${esc(song)}</span> — ${esc(artist)}</span><span>LYRIC CLIP</span></div>`;
    }

    cardInner.innerHTML = html;
    clipCard.dataset.align = state.align;
    clipCard.style.setProperty('--card-scale', state.scale);
  }

  // 字符包裹：级联错峰延迟
  let charCounter = 0;
  function revealChars(text) {
    return [...text].map((ch) => {
      const delay = (charCounter++ * 28) % 1400;
      return `<span class="char" style="animation-delay:${delay}ms">${esc(ch)}</span>`;
    }).join('');
  }

  function rerenderAnimated() {
    charCounter = 0;
    renderCard();
    clipCard.classList.remove('pop');
    void clipCard.offsetWidth; // 强制回流以重启动画
    clipCard.classList.add('pop');
  }

  // === 3D 倾斜（光标跟随） ===
  let tiltRaf = null;
  cardTilt.addEventListener('pointermove', (e) => {
    const rect = cardTilt.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
      cardTilt.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 10}deg) scale(1.02)`;
      tiltRaf = null;
    });
  });
  cardTilt.addEventListener('pointerleave', () => {
    cardTilt.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
  });

  // === 点击涟漪 ===
  clipCard.addEventListener('pointerdown', (e) => {
    const rect = clipCard.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 1.4;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    rippleLayer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 950);
  });

  // === 控件事件绑定 ===
  function bindChips(container, attr, apply) {
    container.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-' + attr + ']');
      if (!chip) return;
      container.querySelectorAll('.is-active').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state[attr] = chip.dataset[attr];
      apply(state[attr]);
    });
  }

  bindChips(tplGrid, 'tpl', (v) => {
    body.dataset.tpl = v;
    rerenderAnimated();
  });
  bindChips(moodGrid, 'mood', (v) => { body.dataset.mood = v; });
  bindChips(alignRow, 'align', () => renderCard());

  scaleRange.addEventListener('input', () => {
    state.scale = parseFloat(scaleRange.value);
    clipCard.style.setProperty('--card-scale', state.scale);
  });

  [lyricInput, songInput, artistInput].forEach((el) => {
    el.addEventListener('input', () => renderCard());
  });

  // === 换一句 ===
  shuffleBtn.addEventListener('click', () => {
    let next;
    do { next = Math.floor(Math.random() * SAMPLES.length); } while (next === state.sampleIndex);
    state.sampleIndex = next;
    const s = SAMPLES[next];
    lyricInput.value = s.lines;
    songInput.value = s.song;
    artistInput.value = s.artist;
    rerenderAnimated();
  });

  // === PNG 导出（Canvas 手绘 1080×1440） ===
  exportBtn.addEventListener('click', async () => {
    try {
      await document.fonts.ready;
      const url = drawExport();
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyric-clip-${state.tpl}-${state.mood}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toastMsg('已导出 PNG · ' + a.download);
    } catch (err) {
      toastMsg('导出失败：' + err.message);
    }
  });

  function moodColors() {
    const map = {
      violet: ['#7c5cff', '#c56bff', '#4dd0ff', '#100c1e'],
      amber: ['#ff8a3d', '#ffcb5e', '#ff5e7e', '#180e08'],
      teal: ['#2dd4bf', '#4f9dff', '#9dffef', '#06131a'],
      rose: ['#ff5d8f', '#b892ff', '#ffc2d4', '#190b14']
    };
    return map[state.mood];
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawExport() {
    const W = 1080, H = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const [m1, m2, m3, pageBg] = moodColors();
    const lines = getLines();
    const song = songInput.value.trim() || '无题';
    const artist = artistInput.value.trim() || '佚名';
    const centered = state.align === 'center';

    // 背景流体渐变
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, pageBg);
    bg.addColorStop(1, '#050308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const blob = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(120, 60, 640, m1, 0.5);
    blob(W + 80, H * 0.6, 560, m2, 0.4);
    blob(W * 0.4, H + 120, 480, m3, 0.24);

    // 玻璃卡片
    const pad = 60;
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 48);
    ctx.fillStyle = 'rgba(16,12,28,0.78)';
    ctx.fill();
    ctx.strokeStyle = hexA('#ffffff', 0.14);
    ctx.lineWidth = 2;
    ctx.stroke();

    // 模板装饰
    ctx.textBaseline = 'alphabetic';
    if (state.tpl === 'tracklight') {
      const bar = ctx.createLinearGradient(pad, 0, pad, H - pad);
      bar.addColorStop(0, m1); bar.addColorStop(1, m2);
      ctx.fillStyle = bar;
      ctx.fillRect(pad + 44, pad + 60, 8, H - pad * 2 - 120);
    }
    if (state.tpl === 'interlude') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(pad, pad, W - pad * 2, 90);
      ctx.fillRect(pad, H - pad - 90, W - pad * 2, 90);
    }
    if (state.tpl === 'terminal') {
      ctx.strokeStyle = hexA('#ffffff', 0.14);
      ctx.beginPath(); ctx.moveTo(pad, pad + 90); ctx.lineTo(W - pad, pad + 90); ctx.stroke();
      [m1, m2, m3].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(pad + 48 + i * 34, pad + 46, 8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = hexA('#ffffff', 0.5);
      ctx.font = "26px 'Share Tech Mono', monospace";
      ctx.fillText('lyric://now-playing', pad + 160, pad + 55);
    }

    // 歌词正文
    const fontSize = Math.round((state.tpl === 'montage' ? 68 : state.tpl === 'terminal' ? 48 : 54) * state.scale);
    const fontFamily = state.tpl === 'terminal'
      ? "'Share Tech Mono', monospace"
      : state.tpl === 'montage' ? "'Outfit', 'PingFang SC', sans-serif" : "'Inter', 'PingFang SC', sans-serif";
    const weight = state.tpl === 'montage' ? 700 : state.tpl === 'terminal' ? 400 : 500;
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#f2eeff';
    const lineH = fontSize * 1.6;
    const blockH = lines.length * lineH;
    let y = (H - blockH) / 2 + fontSize;

    if (state.tpl === 'montage') {
      const qg = ctx.createLinearGradient(pad + 40, y - 200, pad + 240, y - 100);
      qg.addColorStop(0, m1); qg.addColorStop(1, m2);
      ctx.fillStyle = qg;
      ctx.font = `700 190px 'Outfit', sans-serif`;
      ctx.fillText('\u201C', pad + 44, y - 60);
      ctx.fillStyle = '#f2eeff';
      ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
      y += 40;
    }

    const insetL = pad + (state.tpl === 'tracklight' ? 100 : 84);
    const insetR = pad + 84;
    lines.forEach((line) => {
      const text = state.tpl === 'terminal' ? '> ' + line : line;
      const w = ctx.measureText(text).width;
      const x = centered ? (W - w) / 2 : insetL;
      ctx.fillText(text, x, y);
      y += lineH;
    });

    // 元信息
    ctx.font = "500 26px 'Inter', 'PingFang SC', sans-serif";
    ctx.fillStyle = hexA('#ffffff', 0.55);
    const meta = `♪ ${song} — ${artist}`;
    const metaW = ctx.measureText(meta).width;
    const metaX = centered || state.tpl === 'interlude' ? (W - metaW) / 2 : insetL;
    ctx.fillText(meta, metaX, H - pad - 100);
    ctx.font = "22px 'Share Tech Mono', monospace";
    ctx.fillStyle = hexA('#ffffff', 0.3);
    const tag = 'LYRIC CLIP STUDIO';
    const tagW = ctx.measureText(tag).width;
    ctx.fillText(tag, centered || state.tpl === 'interlude' ? (W - tagW) / 2 : insetL, H - pad - 56);

    return canvas.toDataURL('image/png');
  }

  function hexA(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  // === Init ===
  renderCard();
})();
