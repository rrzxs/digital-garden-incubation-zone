/**
 * CRT Wall Gallery — 显像管画廊
 * 八台 CRT 显示器组成一面临永不停播的信号墙。
 * Vanilla JS · 零构建 · 弹簧般的非线性微交互
 */
(function () {
    'use strict';

    // === 配置 ===

    const MONITOR_COUNT = 8;
    const RENDER_FPS = 30;
    const MONITOR_W = 192;
    const MONITOR_H = 144;

    const PALETTES = [
        { name: 'PHOSPHOR', bg: '#03150a', c1: '#7dff9b', c2: '#2aff5f', c3: '#b8ffd0' },
        { name: 'AMBER',    bg: '#1a0f02', c1: '#ffb347', c2: '#ff8c1a', c3: '#ffe0b3' },
        { name: 'ICE',      bg: '#02121e', c1: '#7de5ff', c2: '#2ab8ff', c3: '#c8f4ff' },
        { name: 'ROSE',     bg: '#1a0517', c1: '#ff7de5', c2: '#b84aff', c3: '#ffd0f7' }
    ];

    // === 颜色工具 ===

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // 三色渐变采样：0 → c1, 0.5 → c2, 1 → c3
    function sampleRamp(rgbA, rgbB, rgbC, t) {
        let a, b, k;
        if (t < 0.5) { a = rgbA; b = rgbB; k = t * 2; }
        else { a = rgbB; b = rgbC; k = t * 2 - 1; }
        return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    }

    // === 信号频道（生成艺术渲染器） ===
    // 每个渲染器签名: fn(ctx, w, h, t, pal) — pal 为十六进制色数组

    // 复用的低分辨率离屏缓冲（避免逐帧分配）
    const LOW_COLS = 96, LOW_ROWS = 72;
    const lowCanvas = document.createElement('canvas');
    lowCanvas.width = LOW_COLS;
    lowCanvas.height = LOW_ROWS;
    const lowCtx = lowCanvas.getContext('2d');
    const lowImage = lowCtx.createImageData(LOW_COLS, LOW_ROWS);

    function blitLow(ctx, w, h) {
        lowCtx.putImageData(lowImage, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(lowCanvas, 0, 0, w, h);
    }

    function renderPlasma(ctx, w, h, t, pal) {
        const d = lowImage.data;
        const a = hexToRgb(pal.c1), b = hexToRgb(pal.c2), c = hexToRgb(pal.c3);
        for (let y = 0; y < LOW_ROWS; y++) {
            for (let x = 0; x < LOW_COLS; x++) {
                const v =
                    Math.sin(x * 0.09 + t * 1.1) +
                    Math.sin(y * 0.11 - t * 1.4) +
                    Math.sin((x + y) * 0.07 + t * 0.8) +
                    Math.sin(Math.sqrt((x - LOW_COLS / 2) ** 2 + (y - LOW_ROWS / 2) ** 2) * 0.16 - t * 1.8);
                const k = (v + 4) / 8;
                const [r, g, bl] = sampleRamp(a, b, c, k);
                const i = (y * LOW_COLS + x) * 4;
                d[i] = r; d[i + 1] = g; d[i + 2] = bl; d[i + 3] = 255;
            }
        }
        blitLow(ctx, w, h);
    }

    function renderStatic(ctx, w, h, t, pal) {
        const d = lowImage.data;
        const a = hexToRgb(pal.c1), b = hexToRgb(pal.c3);
        for (let i = 0; i < d.length; i += 4) {
            const n = Math.random();
            const mix = n * 0.85 + 0.15 * Math.sin(t * 30 + i);
            const r = lerp(a[0], b[0], mix * 0.4);
            const g = lerp(a[1], b[1], mix * 0.4);
            const bl = lerp(a[2], b[2], mix * 0.4);
            const lum = n * 255;
            d[i] = r * 0.3 + lum * 0.7;
            d[i + 1] = g * 0.3 + lum * 0.7;
            d[i + 2] = bl * 0.3 + lum * 0.7;
            d[i + 3] = 255;
        }
        blitLow(ctx, w, h);
        // 偶发水平撕裂带
        if (Math.random() < 0.3) {
            const ty = Math.random() * h;
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(0, ty, w, 2 + Math.random() * 6);
        }
    }

    function renderStarfield(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        const m = renderStarfield._m || (renderStarfield._m = makeStars(140));
        const cx = w / 2, cy = h / 2;
        const speed = 0.5 + 0.5 * Math.sin(t * 0.5);
        for (const s of m) {
            s.z -= speed * 2.6;
            if (s.z <= 0.1) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
            const k = 0.4 / s.z;
            const px = cx + s.x * k * w * 0.5;
            const py = cy + s.y * k * h * 0.5;
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            const size = Math.max(1, (1 - s.z) * 4);
            const bright = 1 - s.z;
            ctx.fillStyle = bright > 0.75 ? pal.c3 : (bright > 0.4 ? pal.c1 : pal.c2);
            ctx.globalAlpha = 0.3 + bright * 0.7;
            ctx.fillRect(px, py, size, size);
        }
        ctx.globalAlpha = 1;
    }

    function makeStars(n) {
        const arr = [];
        for (let i = 0; i < n; i++) {
            arr.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.9 + 0.1 });
        }
        return arr;
    }

    function renderTunnel(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const maxR = Math.hypot(w, h) / 2;
        ctx.lineWidth = 1.4;
        const rings = 16;
        for (let i = 0; i < rings; i++) {
            const phase = ((i / rings + t * 0.35) % 1);
            const r = phase * maxR;
            const alpha = (1 - phase) * 0.9;
            ctx.strokeStyle = pal.c1;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        // 旋转辐条
        const spokes = 14;
        for (let i = 0; i < spokes; i++) {
            const ang = (i / spokes) * Math.PI * 2 + t * 0.6;
            const r = maxR * (0.35 + 0.3 * Math.sin(t * 1.2 + i));
            ctx.strokeStyle = pal.c2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 10);
            ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.72);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // 中心辉光核
        ctx.fillStyle = pal.c3;
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function renderLissajous(ctx, w, h, t, pal) {
        ctx.fillStyle = 'rgba(2,6,6,0.22)';
        ctx.fillRect(0, 0, w, h);
        const a = 3, b = 4;
        const phi = t * 0.7;
        const pts = 90;
        for (let i = 0; i < pts; i++) {
            const tt = t * 0.9 + i * 0.02;
            const x = w / 2 + Math.sin(a * tt + phi) * w * 0.38;
            const y = h / 2 + Math.sin(b * tt) * h * 0.38;
            const k = i / pts;
            ctx.fillStyle = k > 0.66 ? pal.c3 : (k > 0.33 ? pal.c1 : pal.c2);
            ctx.globalAlpha = 0.35 + k * 0.65;
            const s = 1.5 + k * 2.5;
            ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
    }

    function renderMoire(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        const c1x = w / 2 + Math.cos(t * 0.8) * w * 0.22;
        const c1y = h / 2 + Math.sin(t * 0.6) * h * 0.2;
        const c2x = w / 2 - Math.cos(t * 0.5) * w * 0.22;
        const c2y = h / 2 - Math.sin(t * 0.9) * h * 0.2;
        ctx.lineWidth = 1;
        for (let i = 0; i < 22; i++) {
            const r = ((i * 12 + t * 22) % 260);
            ctx.strokeStyle = pal.c1;
            ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.arc(c1x, c1y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = pal.c2;
            ctx.beginPath(); ctx.arc(c2x, c2y, r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    function renderSpiral(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const arms = 4;
        const dots = 60;
        for (let a = 0; a < arms; a++) {
            for (let i = 0; i < dots; i++) {
                const k = i / dots;
                const ang = a * (Math.PI * 2 / arms) + k * 5.5 + t * 1.1;
                const r = k * Math.hypot(w, h) * 0.48;
                const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.4 + a);
                ctx.fillStyle = k > 0.7 ? pal.c3 : pal.c1;
                ctx.globalAlpha = tw * (0.3 + k * 0.7);
                const s = 1 + k * 2.4;
                ctx.fillRect(cx + Math.cos(ang) * r - s / 2, cy + Math.sin(ang) * r - s / 2, s, s);
            }
        }
        ctx.globalAlpha = 1;
    }

    function renderSynthGrid(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        const horizon = h * 0.42;
        // 落日
        const sunR = h * 0.18;
        const gr = ctx.createLinearGradient(0, horizon - sunR, 0, horizon);
        gr.addColorStop(0, pal.c3);
        gr.addColorStop(1, pal.c2);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(w / 2, horizon, sunR, Math.PI, Math.PI * 2);
        ctx.fill();
        // 透视网格 — 纵线
        ctx.strokeStyle = pal.c1;
        ctx.lineWidth = 1;
        for (let i = -8; i <= 8; i++) {
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(w / 2 + i * 6, horizon);
            ctx.lineTo(w / 2 + i * w * 0.16, h);
            ctx.stroke();
        }
        // 横线（滚动逼近）
        for (let i = 0; i < 10; i++) {
            const phase = ((i / 10 + t * 0.3) % 1);
            const y = horizon + (h - horizon) * phase * phase;
            ctx.globalAlpha = 0.25 + phase * 0.65;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function renderRadar(ctx, w, h, t, pal) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2;
        const R = Math.min(w, h) * 0.44;
        // 同心圆
        ctx.strokeStyle = pal.c1;
        ctx.globalAlpha = 0.4;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
        ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // 扫描扇形
        const ang = t * 1.6;
        const grad = ctx.createConicGradient
            ? ctx.createConicGradient(ang, cx, cy)
            : null;
        if (grad) {
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.999, pal.c2);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
        } else {
            ctx.strokeStyle = pal.c2;
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        (grad ? ctx.fill : ctx.stroke).call(ctx);
        // 回波光点
        ctx.fillStyle = pal.c3;
        for (let i = 0; i < 5; i++) {
            const blipT = t * 0.4 + i * 1.7;
            const bx = cx + Math.cos(blipT) * R * (0.3 + 0.55 * Math.abs(Math.sin(i * 2.3)));
            const by = cy + Math.sin(blipT * 1.3) * R * 0.6;
            const da = ((blipT % (Math.PI * 2)) - (ang % (Math.PI * 2)));
            const fresh = Math.abs(da) < 0.8 || Math.abs(da) > Math.PI * 2 - 0.8;
            ctx.globalAlpha = fresh ? 1 : 0.25;
            ctx.beginPath();
            ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    const CHANNELS = [
        { id: 'PLASMA',    fn: renderPlasma },
        { id: 'STARFIELD', fn: renderStarfield },
        { id: 'TUNNEL',    fn: renderTunnel },
        { id: 'LISSAJOUS', fn: renderLissajous },
        { id: 'MOIRE',     fn: renderMoire },
        { id: 'SPIRAL',    fn: renderSpiral },
        { id: 'SYNTHGRID', fn: renderSynthGrid },
        { id: 'RADAR',     fn: renderRadar }
    ];

    // === DOM 元素 ===

    const wallEl = document.getElementById('wall');
    const focusOverlay = document.getElementById('focus-overlay');
    const focusCanvas = document.getElementById('focus-canvas');
    const focusChLabel = document.getElementById('focus-ch-label');
    const themeLabel = document.getElementById('theme-label');
    const statusOn = document.getElementById('status-on');
    const statusFps = document.getElementById('status-fps');
    const scanSlider = document.getElementById('scan-slider');
    const ambientCanvas = document.getElementById('ambient-canvas');
    const focusCtx = focusCanvas.getContext('2d');

    // === 状态 ===

    const state = {
        themeIndex: 0,
        monitors: [],
        focusIndex: -1,
        globalOn: true,
        lastFrame: 0,
        frameAcc: 0,
        frameCount: 0,
        fpsTimer: performance.now()
    };

    // === 显示器墙构建 ===

    function buildWall() {
        for (let i = 0; i < MONITOR_COUNT; i++) {
            const fig = document.createElement('figure');
            fig.className = 'crt on';
            fig.style.animationDelay = (i * 0.08) + 's';
            fig.innerHTML =
                '<span class="crt-led"></span>' +
                '<div class="crt-screen-wrap"><canvas class="crt-screen" width="' + MONITOR_W + '" height="' + MONITOR_H + '"></canvas></div>' +
                '<figcaption class="crt-caption">' +
                '<span class="crt-ch-label"></span>' +
                '<button class="crt-ch-btn" title="换台">CH ⤨</button>' +
                '</figcaption>';
            const canvas = fig.querySelector('.crt-screen');
            const monitor = {
                index: i,
                el: fig,
                canvas,
                ctx: canvas.getContext('2d'),
                channel: i % CHANNELS.length,
                powered: true,
                retuneUntil: 0,
                bootAt: performance.now() / 1000 + i * 0.12
            };
            fig.querySelector('.crt-ch-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                switchChannel(monitor, (monitor.channel + 1) % CHANNELS.length);
            });
            fig.addEventListener('click', () => openFocus(i));
            attachTilt(fig);
            updateChLabel(monitor);
            wallEl.appendChild(fig);
            state.monitors.push(monitor);
        }
    }

    function updateChLabel(m) {
        const ch = CHANNELS[m.channel];
        m.el.querySelector('.crt-ch-label').textContent =
            'CH-' + String(m.channel + 1).padStart(2, '0') + ' ' + ch.id;
    }

    function switchChannel(m, next) {
        m.channel = next;
        m.retuneUntil = performance.now() / 1000 + 0.28;
        updateChLabel(m);
        if (state.focusIndex === m.index) {
            focusChLabel.textContent = 'CH-' + String(next + 1).padStart(2, '0') + ' ' + CHANNELS[next].id;
        }
    }

    // === 3D 倾斜微交互 ===

    function attachTilt(el) {
        let raf = null;
        el.addEventListener('mousemove', (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                el.style.transform =
                    'rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg) translateY(-6px) scale(1.02)';
            });
        });
        el.addEventListener('mouseleave', () => {
            if (raf) cancelAnimationFrame(raf);
            el.style.transform = '';
        });
    }

    // === 聚焦剧场 ===

    function openFocus(i) {
        state.focusIndex = i;
        const m = state.monitors[i];
        focusChLabel.textContent = 'CH-' + String(m.channel + 1).padStart(2, '0') + ' ' + CHANNELS[m.channel].id;
        focusOverlay.classList.add('open');
        focusOverlay.setAttribute('aria-hidden', 'false');
    }

    function closeFocus() {
        state.focusIndex = -1;
        focusOverlay.classList.remove('open');
        focusOverlay.setAttribute('aria-hidden', 'true');
    }

    function focusStep(dir) {
        if (state.focusIndex < 0) return;
        const m = state.monitors[state.focusIndex];
        switchChannel(m, (m.channel + dir + CHANNELS.length) % CHANNELS.length);
    }

    // === 渲染循环 ===

    function drawMonitor(m, t) {
        if (!m.powered) return;
        const pal = PALETTES[state.themeIndex];
        const now = performance.now() / 1000;
        if (now < m.bootAt) return;
        // 开机闪屏 → 信号 → 换台噪点
        if (now - m.bootAt < 0.5) {
            m.ctx.fillStyle = '#fff';
            const k = (now - m.bootAt) / 0.5;
            m.ctx.globalAlpha = 1 - k;
            m.ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);
            m.ctx.globalAlpha = 1;
            return;
        }
        if (now < m.retuneUntil) {
            renderStatic(m.ctx, MONITOR_W, MONITOR_H, t, pal);
            return;
        }
        CHANNELS[m.channel].fn(m.ctx, MONITOR_W, MONITOR_H, t, pal);
    }

    function loop(ts) {
        requestAnimationFrame(loop);
        if (document.hidden) return;
        if (ts - state.lastFrame < 1000 / RENDER_FPS - 1) return;
        const dt = ts - state.lastFrame;
        state.lastFrame = ts;
        const t = ts / 1000;

        for (const m of state.monitors) drawMonitor(m, t);

        // 聚焦画布
        if (state.focusIndex >= 0) {
            const m = state.monitors[state.focusIndex];
            const pal = PALETTES[state.themeIndex];
            const now = performance.now() / 1000;
            if (now < m.retuneUntil) {
                renderStatic(focusCtx, focusCanvas.width, focusCanvas.height, t, pal);
            } else {
                CHANNELS[m.channel].fn(focusCtx, focusCanvas.width, focusCanvas.height, t, pal);
            }
        }

        // FPS 统计
        state.frameCount++;
        if (ts - state.fpsTimer > 1000) {
            statusFps.textContent = state.frameCount + ' FPS';
            state.frameCount = 0;
            state.fpsTimer = ts;
        }

        drawAmbient(t);
    }

    // === 环境粒子流场 ===

    const ambientParticles = [];
    function initAmbient() {
        for (let i = 0; i < 55; i++) {
            ambientParticles.push({
                x: Math.random(), y: Math.random(),
                s: 0.6 + Math.random() * 1.6,
                ph: Math.random() * Math.PI * 2
            });
        }
        resizeAmbient();
    }

    function resizeAmbient() {
        ambientCanvas.width = innerWidth;
        ambientCanvas.height = innerHeight;
    }

    function drawAmbient(t) {
        const ctx = ambientCanvas.getContext('2d');
        ctx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
        const pal = PALETTES[state.themeIndex];
        ctx.fillStyle = pal.c1;
        for (const p of ambientParticles) {
            const flowX = Math.sin(p.y * 5 + t * 0.35 + p.ph) * 0.0007;
            const flowY = Math.cos(p.x * 4 + t * 0.28 + p.ph) * 0.0007;
            p.x = (p.x + flowX + 1) % 1;
            p.y = (p.y + flowY + 1) % 1;
            ctx.globalAlpha = 0.1 + 0.14 * Math.sin(t + p.ph);
            ctx.beginPath();
            ctx.arc(p.x * ambientCanvas.width, p.y * ambientCanvas.height, p.s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // === 控制台 ===

    function bindControls() {
        document.getElementById('btn-power').addEventListener('click', () => {
            state.globalOn = !state.globalOn;
            const now = performance.now() / 1000;
            state.monitors.forEach((m, i) => {
                const turnOn = state.globalOn;
                if (turnOn === m.powered) return;
                setTimeout(() => {
                    m.powered = turnOn;
                    m.el.classList.toggle('off', !turnOn);
                    m.el.classList.toggle('on', turnOn);
                    if (turnOn) m.bootAt = performance.now() / 1000;
                }, i * 90);
            });
            setTimeout(updateStatus, state.monitors.length * 90 + 500);
        });

        document.getElementById('btn-shuffle').addEventListener('click', () => {
            state.monitors.forEach((m, i) => {
                setTimeout(() => {
                    switchChannel(m, Math.floor(Math.random() * CHANNELS.length));
                }, i * 110);
            });
        });

        document.getElementById('btn-theme').addEventListener('click', () => {
            state.themeIndex = (state.themeIndex + 1) % PALETTES.length;
            document.body.className = 'theme-' + state.themeIndex;
            themeLabel.textContent = PALETTES[state.themeIndex].name;
        });

        scanSlider.addEventListener('input', () => {
            document.documentElement.style.setProperty('--scan-opacity', scanSlider.value / 100);
        });

        document.getElementById('btn-close-focus').addEventListener('click', closeFocus);
        document.getElementById('btn-prev-ch').addEventListener('click', () => focusStep(-1));
        document.getElementById('btn-next-ch').addEventListener('click', () => focusStep(1));
        focusOverlay.addEventListener('click', (e) => {
            if (e.target === focusOverlay) closeFocus();
        });

        window.addEventListener('keydown', (e) => {
            if (state.focusIndex < 0) return;
            if (e.key === 'Escape') closeFocus();
            if (e.key === 'ArrowLeft') focusStep(-1);
            if (e.key === 'ArrowRight') focusStep(1);
        });

        window.addEventListener('resize', resizeAmbient);
    }

    function updateStatus() {
        const on = state.monitors.filter((m) => m.powered).length;
        statusOn.textContent = on + '/' + MONITOR_COUNT + ' ON';
    }

    // === 启动 ===

    buildWall();
    initAmbient();
    bindControls();
    updateStatus();
    requestAnimationFrame(loop);
})();
