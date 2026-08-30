/* ============================================================
   Depth Relight Studio — 交互逻辑
   亮度 → 深度图 → 法线场 → 实时重光照
   ============================================================ */
(function () {
  'use strict';

  // === DOM Elements ===
  const canvas = document.getElementById('relight-canvas');
  const wrap = document.getElementById('canvas-wrap');
  const lightOrb = document.getElementById('light-orb');
  const emptyState = document.getElementById('empty-state');
  const dropHint = document.getElementById('drop-hint');
  const fileInput = document.getElementById('file-input');
  const hudFps = document.getElementById('hud-fps');
  const hudDim = document.getElementById('hud-dim');
  const hudLight = document.getElementById('hud-light');
  const hudMode = document.getElementById('hud-mode');
  const particleCanvas = document.getElementById('particle-field');

  const ctx = canvas.getContext('2d', { alpha: false });
  const pctx = particleCanvas.getContext('2d');

  // === State ===
  const state = {
    hasImage: false,
    intensity: 1.2,
    ambient: 0.3,
    height: 0.55,
    relief: 1.0,
    specular: 0.4,
    lightColor: [1, 1, 1],
    lightX: 0.5, lightY: 0.35,
    orbit: false,
    showDepth: false,
    dragging: false,
    time: 0
  };

  // 处理分辨率下的图像缓冲
  const PROC_W = 360;
  let procH = 270;
  let basePixels = null;   // 原始 RGBA
  let depthMap = null;     // Float32 深度
  let outImage = null;     // ImageData 输出

  // === 涟漪脉冲 ===
  const ripples = [];

  // ============================================================
  // 深度蒸馏：亮度 → box blur × 2 → 深度
  // ============================================================
  function computeDepth(pixels, w, h) {
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
      lum[i] = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
    }
    return boxBlur(boxBlur(lum, w, h), w, h);
  }

  function boxBlur(src, w, h) {
    const dst = new Float32Array(w * h);
    const tmp = new Float32Array(w * h);
    // 横向
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, n = 0;
        for (let d = -2; d <= 2; d++) {
          const xx = x + d;
          if (xx >= 0 && xx < w) { sum += src[y * w + xx]; n++; }
        }
        tmp[y * w + x] = sum / n;
      }
    }
    // 纵向
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, n = 0;
        for (let d = -2; d <= 2; d++) {
          const yy = y + d;
          if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; n++; }
        }
        dst[y * w + x] = sum / n;
      }
    }
    return dst;
  }

  // ============================================================
  // 重光照渲染核心
  // ============================================================
  function renderRelight() {
    const w = PROC_W, h = procH;
    const out = outImage.data;
    const depth = depthMap;
    const [lr, lg, lb] = state.lightColor;

    // 光源位置（像素坐标，带缩放感知）
    const lx = state.lightX * w;
    const ly = state.lightY * h;
    const lz = Math.max(w, h) * state.height * 1.6;

    const relief = state.relief * 2.4;
    const intensity = state.intensity;
    const ambient = state.ambient;
    const shininess = 32;
    const specK = state.specular;

    // 涟漪对深度的扰动
    const hasRipples = ripples.length > 0;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const yUp = (y > 0 ? y - 1 : y) * w;
      const yDn = (y < h - 1 ? y + 1 : y) * w;
      for (let x = 0; x < w; x++) {
        const i = yw + x;
        const p = i * 4;

        if (state.showDepth) {
          const d = depth[i] * 255;
          out[p] = d; out[p + 1] = d; out[p + 2] = d; out[p + 3] = 255;
          continue;
        }

        // 深度（含涟漪扰动）
        let dz = depth[i];
        if (hasRipples) {
          for (let r = 0; r < ripples.length; r++) {
            const rp = ripples[r];
            const dxr = x - rp.x, dyr = y - rp.y;
            const dist = Math.sqrt(dxr * dxr + dyr * dyr);
            const ring = Math.abs(dist - rp.radius);
            if (ring < 14) {
              dz += Math.sin(ring / 14 * Math.PI) * 0.28 * rp.life * Math.exp(-dist / 90);
            }
          }
        }

        // 法线（中心差分）
        const xl = x > 0 ? x - 1 : x;
        const xr = x < w - 1 ? x + 1 : x;
        let nx = (depth[yw + xl] - depth[yw + xr]) * relief;
        let ny = (depth[yUp + x] - depth[yDn + x]) * relief;
        const nz = 1;
        const nl = Math.sqrt(nx * nx + ny * ny + 1);
        nx /= nl; ny /= nl;

        // 光向量
        let Lx = lx - x, Ly = ly - y, Lz = lz - dz * 80;
        const distSq = Lx * Lx + Ly * Ly + Lz * Lz;
        const invDist = 1 / Math.sqrt(distSq);
        Lx *= invDist; Ly *= invDist; Lz *= invDist;

        // 漫反射 (Lambert)
        const diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);

        // 高光 (Blinn-Phong, 视线 = +Z)
        let hx = Lx, hy = Ly, hz = Lz + 1;
        const hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
        hx /= hl; hy /= hl; hz /= hl;
        let ndh = nx * hx + ny * hy + nz * hz;
        ndh = ndh > 0 ? Math.pow(ndh, shininess) : 0;

        // 距离衰减
        const falloff = Math.min(1, (w * 0.9) / Math.sqrt(distSq));

        const shade = ambient + diff * intensity * falloff;
        const spec = ndh * specK * intensity * falloff;

        out[p]     = Math.min(255, basePixels[p]     * shade * lr + spec * 255 * lr);
        out[p + 1] = Math.min(255, basePixels[p + 1] * shade * lg + spec * 255 * lg);
        out[p + 2] = Math.min(255, basePixels[p + 2] * shade * lb + spec * 255 * lb);
        out[p + 3] = 255;
      }
    }

    ctx.putImageData(outImage, 0, 0);
  }

  // ============================================================
  // 示例场景（程序化生成：起伏地形 + 星环）
  // ============================================================
  function buildDemoScene() {
    const w = PROC_W, h = procH;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');

    // 渐变底色
    const grad = octx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1440');
    grad.addColorStop(0.5, '#2e1e5e');
    grad.addColorStop(1, '#0e2a3d');
    octx.fillStyle = grad;
    octx.fillRect(0, 0, w, h);

    // 同心山谷（亮度即深度）
    const cx = w * 0.5, cy = h * 0.52;
    for (let r = Math.max(w, h); r > 6; r -= 4) {
      const t = r / Math.max(w, h);
      const v = Math.round(40 + 200 * Math.pow(Math.sin(t * Math.PI * 3.2) * 0.5 + 0.5, 1.4));
      octx.beginPath();
      octx.arc(cx + Math.sin(t * 9) * 12, cy + Math.cos(t * 7) * 10, r, 0, Math.PI * 2);
      octx.strokeStyle = `rgb(${v},${Math.round(v * 0.86)},${Math.round(v * 0.72)})`;
      octx.lineWidth = 3.2;
      octx.stroke();
    }

    // 高光核心
    const core = octx.createRadialGradient(cx, cy, 0, cx, cy, 34);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    octx.fillStyle = core;
    octx.fillRect(cx - 40, cy - 40, 80, 80);

    loadImageFromCanvas(off);
  }

  function loadImageFromCanvas(source) {
    procH = Math.round(PROC_W * (source.height / source.width)) || 270;
    canvas.width = PROC_W;
    canvas.height = procH;

    ctx.drawImage(source, 0, 0, PROC_W, procH);
    const img = ctx.getImageData(0, 0, PROC_W, procH);
    basePixels = img.data;
    outImage = ctx.createImageData(PROC_W, procH);
    depthMap = computeDepth(basePixels, PROC_W, procH);

    state.hasImage = true;
    canvas.classList.add('active');
    lightOrb.classList.add('active');
    emptyState.classList.add('hide');
    hudDim.textContent = `DIM ${PROC_W}×${procH}`;
    spawnRipple(0.5, 0.5);
  }

  function loadFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxSide = 720;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const off = document.createElement('canvas');
      off.width = Math.max(2, Math.round(img.width * scale));
      off.height = Math.max(2, Math.round(img.height * scale));
      off.getContext('2d').drawImage(img, 0, 0, off.width, off.height);
      URL.revokeObjectURL(url);
      loadImageFromCanvas(off);
    };
    img.src = url;
  }

  // ============================================================
  // 主循环
  // ============================================================
  let lastT = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsTimer = 0;

  function loop(now) {
    const dt = Math.min(50, now - lastT);
    lastT = now;
    state.time += dt;

    // FPS
    fpsAcc += 1000 / Math.max(dt, 1); fpsN++; fpsTimer += dt;
    if (fpsTimer > 500) {
      hudFps.textContent = `${Math.round(fpsAcc / fpsN)} fps`;
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }

    // 自动环绕
    if (state.orbit) {
      const t = state.time / 1000;
      state.lightX = 0.5 + Math.cos(t * 0.6) * 0.36;
      state.lightY = 0.45 + Math.sin(t * 0.9) * 0.28;
      syncOrb();
    }

    // 涟漪生命周期
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += dt * 0.12;
      r.life -= dt / 1400;
      if (r.life <= 0) ripples.splice(i, 1);
    }

    if (state.hasImage) renderRelight();

    updateParticles(dt);
    requestAnimationFrame(loop);
  }

  // ============================================================
  // 光源拖拽 / 涟漪
  // ============================================================
  function pointerToUV(e) {
    const rect = wrap.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return [Math.min(1, Math.max(0, cx / rect.width)), Math.min(1, Math.max(0, cy / rect.height))];
  }

  function syncOrb() {
    lightOrb.style.left = `${state.lightX * 100}%`;
    lightOrb.style.top = `${state.lightY * 100}%`;
    hudLight.textContent = `LIGHT ${state.lightX.toFixed(2)}, ${state.lightY.toFixed(2)}`;
  }

  function spawnRipple(u, v) {
    if (!state.hasImage) return;
    ripples.push({ x: u * PROC_W, y: v * procH, radius: 0, life: 1 });
  }

  function onDown(e) {
    if (!state.hasImage) return;
    e.preventDefault();
    state.dragging = true;
    state.orbit = false;
    orbitToggle.classList.remove('on');
    const [u, v] = pointerToUV(e);
    state.lightX = u; state.lightY = v;
    syncOrb();
    spawnRipple(u, v);
  }

  function onMove(e) {
    if (!state.dragging) return;
    const [u, v] = pointerToUV(e);
    state.lightX = u; state.lightY = v;
    syncOrb();
  }

  wrap.addEventListener('mousedown', onDown);
  wrap.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', () => { state.dragging = false; });
  window.addEventListener('touchend', () => { state.dragging = false; });

  // ============================================================
  // 环境粒子流场（Simplex 近似：叠加正弦流）
  // ============================================================
  const particles = [];
  function initParticles() {
    particles.length = 0;
    const n = Math.min(90, Math.floor(window.innerWidth / 16));
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, vy: 0,
        size: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function updateParticles(dt) {
    const w = particleCanvas.width, h = particleCanvas.height;
    pctx.clearRect(0, 0, w, h);
    const accent = getComputedStyle(document.body).getPropertyValue('--accent-2').trim() || '#8ff';
    const t = state.time / 1000;

    pctx.fillStyle = accent;
    for (const p of particles) {
      // 正弦叠加流场
      const fx = Math.sin(p.y * 0.004 + t * 0.4 + p.phase) * 0.02;
      const fy = Math.cos(p.x * 0.003 + t * 0.3) * 0.015 - 0.004;
      p.vx = (p.vx + fx * dt) * 0.98;
      p.vy = (p.vy + fy * dt) * 0.98;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
      pctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 2 + p.phase);
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pctx.fill();
    }
    pctx.globalAlpha = 1;
  }

  function resizeAll() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
    initParticles();
  }

  // ============================================================
  // 控件绑定
  // ============================================================
  function bindSlider(id, key, label, fmt) {
    const el = document.getElementById(id);
    const out = document.getElementById(label);
    el.addEventListener('input', () => {
      state[key] = parseFloat(el.value);
      out.textContent = fmt(state[key]);
    });
  }

  bindSlider('s-intensity', 'intensity', 'v-intensity', v => v.toFixed(2));
  bindSlider('s-ambient', 'ambient', 'v-ambient', v => v.toFixed(2));
  bindSlider('s-height', 'height', 'v-height', v => v.toFixed(2));
  bindSlider('s-relief', 'relief', 'v-relief', v => v.toFixed(2));
  bindSlider('s-specular', 'specular', 'v-specular', v => v.toFixed(2));

  // 光色
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      const hex = sw.dataset.lc;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      state.lightColor = [r, g, b];
      lightOrb.style.background = `radial-gradient(circle, ${hex} 0%, ${hex}66 40%, transparent 70%)`;
      lightOrb.style.boxShadow = `0 0 40px 12px ${hex}44`;
    });
  });

  // 开关
  const orbitToggle = document.getElementById('orbit-toggle');
  const depthToggle = document.getElementById('depth-view-toggle');

  function flipToggle(el, key) {
    el.addEventListener('click', () => {
      state[key] = !state[key];
      el.classList.toggle('on', state[key]);
      if (key === 'showDepth') {
        hudMode.textContent = state.showDepth ? 'MODE DEPTH_MAP' : 'MODE LAMBERT';
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  }
  flipToggle(orbitToggle, 'orbit');
  flipToggle(depthToggle, 'showDepth');

  // 文件
  document.getElementById('btn-demo').addEventListener('click', buildDemoScene);
  document.getElementById('btn-upload').addEventListener('click', () => fileInput.click());
  document.getElementById('btn-upload-secondary').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => loadFromFile(e.target.files[0]));

  document.getElementById('btn-clear').addEventListener('click', () => {
    state.hasImage = false;
    basePixels = null; depthMap = null;
    canvas.classList.remove('active');
    lightOrb.classList.remove('active');
    emptyState.classList.remove('hide');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hudDim.textContent = 'DIM —';
  });

  // 拖放
  ['dragenter', 'dragover'].forEach(ev =>
    wrap.addEventListener(ev, (e) => {
      e.preventDefault();
      dropHint.classList.add('show');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    wrap.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'drop') loadFromFile(e.dataTransfer.files[0]);
      dropHint.classList.remove('show');
    })
  );

  // 主题
  const themeDots = document.querySelectorAll('.theme-dot');
  const defaultTheme = document.querySelector('.theme-dot[data-theme="nebula"]');
  if (defaultTheme) defaultTheme.classList.add('active');
  themeDots.forEach(dot => {
    dot.addEventListener('click', () => {
      themeDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      document.body.dataset.theme = dot.dataset.theme;
    });
  });

  // ============================================================
  // 启动
  // ============================================================
  window.addEventListener('resize', resizeAll);
  resizeAll();
  syncOrb();
  requestAnimationFrame(loop);
})();
