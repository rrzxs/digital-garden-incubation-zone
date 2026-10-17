/* ============================================================
   Motion Curve Board — 沉浸式缓动曲线实验室
   Vanilla JS · Zero Build · maintainer: EDEN
   ============================================================ */
(function () {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('curve-canvas');
    const ctx = canvas.getContext('2d');
    const readout = document.getElementById('bezier-readout');
    const hint = document.getElementById('curve-hint');
    const metaDuration = document.getElementById('meta-duration');
    const metaOvershoot = document.getElementById('meta-overshoot');
    const metaAnticipate = document.getElementById('meta-anticipate');
    const durationRange = document.getElementById('duration-range');
    const durationLabel = document.getElementById('duration-label');
    const playBtn = document.getElementById('play-btn');
    const presetGrid = document.getElementById('preset-grid');
    const exportCode = document.getElementById('export-code');
    const copyBtn = document.getElementById('copy-btn');
    const applyCssBtn = document.getElementById('apply-css-btn');
    const applyNote = document.getElementById('apply-note');
    const themeToggle = document.getElementById('theme-toggle');
    const cursorGlow = document.getElementById('cursor-glow');
    const progressFill = document.getElementById('progress-fill');

    const runners = {
        position: document.getElementById('runner-position'),
        scale: document.getElementById('runner-scale'),
        rotate: document.getElementById('runner-rotate'),
        blur: document.getElementById('runner-blur')
    };

    // === State ===
    // 控制点 P1(x1,y1) P2(x2,y2)，坐标空间 x∈[0,1] y∈[-0.5,1.5]
    const state = {
        p1: { x: 0.16, y: 1.0 },
        p2: { x: 0.30, y: 1.0 },
        duration: 900,
        dragging: null, // 'p1' | 'p2'
        hover: null,
        playStart: 0,
        playing: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        theme: 'deep-ocean',
        applied: false
    };

    // === Presets ===
    const PRESETS = [
        { name: 'Silk Ease', vals: [0.16, 1, 0.3, 1], note: '本站标准曲线' },
        { name: 'Snap Out', vals: [0.34, 1.56, 0.64, 1], note: '过冲回弹' },
        { name: 'Anticipate', vals: [0.36, 0, 0.66, -0.56], note: '预期回拉' },
        { name: 'Linear', vals: [0, 0, 1, 1], note: '匀速基准' },
        { name: 'Swift In', vals: [0.55, 0.06, 0.68, 0.19], note: 'Material 减速对' },
        { name: 'Heavy Out', vals: [0.19, 1, 0.22, 1], note: '极速喷出' },
        { name: 'Whip', vals: [0.85, 0.01, 0.1, 1.1], note: '抽鞭感' },
        { name: 'Float', vals: [0.45, 0.05, 0.05, 0.95], note: '漂浮沉降' }
    ];

    // === Bezier Math (cubic bezier sampling via Newton-Raphson solve for t given x) ===
    function bezierX(t, x1, x2) {
        return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    }
    function bezierY(t, y1, y2) {
        return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    }
    function solveTforX(x, x1, x2) {
        let t = x;
        for (let i = 0; i < 8; i++) {
            const err = bezierX(t, x1, x2) - x;
            if (Math.abs(err) < 1e-5) return t;
            const d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        return Math.min(1, Math.max(0, t));
    }
    function ease(x) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const t = solveTforX(x, state.p1.x, state.p2.x);
        return bezierY(t, state.p1.y, state.p2.y);
    }

    // === Theme Palette ===
    function themeColors() {
        const styles = getComputedStyle(document.body);
        return {
            stroke: styles.getPropertyValue('--curve-stroke').trim() || '#5eead4',
            handle: styles.getPropertyValue('--curve-handle').trim() || '#a5f3fc',
            grid: 'rgba(255,255,255,0.06)',
            guide: 'rgba(255,255,255,0.14)',
            text: 'rgba(255,255,255,0.4)'
        };
    }

    // === Canvas Geometry ===
    let geo = { pad: 44, w: 0, h: 0, yMin: -0.5, yMax: 1.5 };

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        geo.w = rect.width;
        geo.h = rect.height;
        drawCurve();
    }

    // 坐标空间 (x∈[0,1], y∈[yMin,yMax]) ↔ 画布像素
    function toPx(pt) {
        const innerW = geo.w - geo.pad * 2;
        const innerH = geo.h - geo.pad * 2;
        return {
            x: geo.pad + pt.x * innerW,
            y: geo.pad + (1 - (pt.y - geo.yMin) / (geo.yMax - geo.yMin)) * innerH
        };
    }
    function toUnit(px, py) {
        const innerW = geo.w - geo.pad * 2;
        const innerH = geo.h - geo.pad * 2;
        return {
            x: Math.min(1, Math.max(0, (px - geo.pad) / innerW)),
            y: Math.min(geo.yMax, Math.max(geo.yMin, geo.yMin + (1 - (py - geo.pad) / innerH) * (geo.yMax - geo.yMin)))
        };
    }

    // === Curve Rendering ===
    function drawCurve(progressT) {
        const c = themeColors();
        ctx.clearRect(0, 0, geo.w, geo.h);

        // 网格
        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= 10; gx++) {
            const px = geo.pad + (gx / 10) * (geo.w - geo.pad * 2);
            ctx.beginPath();
            ctx.moveTo(px, geo.pad);
            ctx.lineTo(px, geo.h - geo.pad);
            ctx.stroke();
        }
        for (let gy = 0; gy <= 8; gy++) {
            const py = geo.pad + (gy / 8) * (geo.h - geo.pad * 2);
            ctx.beginPath();
            ctx.moveTo(geo.pad, py);
            ctx.lineTo(geo.w - geo.pad, py);
            ctx.stroke();
        }

        // 0 与 1 基准线
        ctx.strokeStyle = c.guide;
        ctx.setLineDash([4, 6]);
        const y0 = toPx({ x: 0, y: 0 }).y;
        const y1 = toPx({ x: 0, y: 1 }).y;
        ctx.beginPath(); ctx.moveTo(geo.pad, y0); ctx.lineTo(geo.w - geo.pad, y0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(geo.pad, y1); ctx.lineTo(geo.w - geo.pad, y1); ctx.stroke();
        ctx.setLineDash([]);

        // 控制引导线
        const a = toPx({ x: 0, y: 0 });
        const b = toPx({ x: 1, y: 1 });
        const p1px = toPx(state.p1);
        const p2px = toPx(state.p2);
        ctx.strokeStyle = c.guide;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p1px.x, p1px.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(p2px.x, p2px.y); ctx.stroke();

        // 曲线主体（发光双描）
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
            const t = i / 120;
            const px = { x: bezierX(t, state.p1.x, state.p2.x), y: bezierY(t, state.p1.y, state.p2.y) };
            const s = toPx(px);
            i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
        }
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = c.stroke;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 播放示踪器（沿曲线运动的光点）
        if (typeof progressT === 'number') {
            const t = solveTforX(progressT, state.p1.x, state.p2.x);
            const s = toPx({ x: bezierX(t, state.p1.x, state.p2.x), y: bezierY(t, state.p1.y, state.p2.y) });
            ctx.beginPath();
            ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = c.handle;
            ctx.shadowColor = c.handle;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 控制点手柄
        [[p1px, state.hover === 'p1' || state.dragging === 'p1'], [p2px, state.hover === 'p2' || state.dragging === 'p2']].forEach(([p, active]) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, active ? 9 : 7, 0, Math.PI * 2);
            ctx.fillStyle = c.handle;
            ctx.shadowColor = c.handle;
            ctx.shadowBlur = active ? 22 : 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.stroke();
        });

        // 标签
        ctx.fillStyle = c.text;
        ctx.font = '11px "Share Tech Mono", monospace';
        ctx.fillText('0.0', geo.pad - 30, y0 + 4);
        ctx.fillText('1.0', geo.pad - 30, y1 + 4);
        ctx.fillText('time →', geo.w - geo.pad - 44, geo.h - geo.pad + 18);
    }

    // === Meta 分析 ===
    function updateMeta() {
        // 采样找出过冲/回拉
        let overshoot = 0;
        let anticipate = 0;
        for (let i = 0; i <= 100; i++) {
            const v = ease(i / 100);
            if (v > 1) overshoot = Math.max(overshoot, v - 1);
            if (v < 0) anticipate = Math.max(anticipate, -v);
        }
        metaOvershoot.textContent = (overshoot * 100).toFixed(1) + '%';
        metaAnticipate.textContent = (anticipate * 100).toFixed(1) + '%';
        metaDuration.textContent = state.duration + 'ms';
        const str = `(${state.p1.x.toFixed(2)}, ${state.p1.y.toFixed(2)}, ${state.p2.x.toFixed(2)}, ${state.p2.y.toFixed(2)})`;
        readout.textContent = str;
        exportCode.textContent = `--motion-curve: cubic-bezier(${state.p1.x.toFixed(2)}, ${state.p1.y.toFixed(2)}, ${state.p2.x.toFixed(2)}, ${state.p2.y.toFixed(2)});\n--motion-duration: ${state.duration}ms;`;
    }

    // === 拖拽交互 ===
    function pointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function hitHandle(pos) {
        for (const key of ['p1', 'p2']) {
            const p = toPx(state[key]);
            if (Math.hypot(p.x - pos.x, p.y - pos.y) < 20) return key;
        }
        return null;
    }

    canvas.addEventListener('pointerdown', (e) => {
        const pos = pointerPos(e);
        const hit = hitHandle(pos);
        if (hit) {
            state.dragging = hit;
            canvas.setPointerCapture(e.pointerId);
            hint.classList.add('hidden');
        }
    });
    canvas.addEventListener('pointermove', (e) => {
        const pos = pointerPos(e);
        if (state.dragging) {
            const u = toUnit(pos.x, pos.y);
            state[state.dragging].x = u.x;
            state[state.dragging].y = u.y;
            updateMeta();
            clearActivePreset();
            drawCurve();
        } else {
            state.hover = hitHandle(pos);
            canvas.style.cursor = state.hover ? 'grab' : 'crosshair';
            drawCurve();
        }
    });
    canvas.addEventListener('pointerup', () => { state.dragging = null; play(); });
    canvas.addEventListener('pointerleave', () => { state.hover = null; drawCurve(); });

    // 双击手柄回正
    canvas.addEventListener('dblclick', () => {
        state.p1 = { x: 0.16, y: 1.0 };
        state.p2 = { x: 0.30, y: 1.0 };
        updateMeta();
        setActivePreset(0);
        play();
    });

    // === 播放引擎（rAF 驱动全部 lane） ===
    function play() {
        state.playStart = performance.now();
        state.playing = true;
    }
    playBtn.addEventListener('click', play);

    function tick(now) {
        if (state.playing) {
            const raw = (now - state.playStart) / state.duration;
            if (raw >= 1) {
                state.playing = false;
                applyProgress(1);
                drawCurve(1);
            } else {
                applyProgress(raw);
                drawCurve(raw);
            }
        }
        requestAnimationFrame(tick);
    }

    function applyProgress(raw) {
        const e = ease(Math.min(1, Math.max(0, raw)));

        // position: 0 → rail 末端
        const rail = runners.position.parentElement;
        const maxShift = rail.clientWidth / 2 - 14;
        runners.position.style.transform =
            `translate(calc(-50% + ${e * maxShift * 2}px), -50%)`;

        // scale: 0.4 → 1.6
        runners.scale.style.transform =
            `translate(-50%, -50%) scale(${0.4 + e * 1.2})`;

        // rotate: 0 → 360deg
        runners.rotate.style.transform =
            `translate(-50%, -50%) rotate(${e * 360}deg)`;

        // blur: 12px → 0
        const blur = Math.max(0, 12 - e * 12);
        runners.blur.style.filter = `blur(${blur}px)`;
        runners.blur.style.transform = `translate(-50%, -50%) scale(${0.85 + e * 0.35})`;

        // progress bar
        progressFill.style.transform = `scaleX(${raw})`;
    }

    // === 预设画廊 ===
    function presetSVG(vals) {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const x = bezierX(t, vals[0], vals[2]);
            const y = bezierY(t, vals[1], vals[3]);
            // 视口 y: 越界裁剪
            const sy = Math.min(68, Math.max(4, 36 - y * 32));
            pts.push(`${(4 + x * 120).toFixed(1)},${sy.toFixed(1)}`);
        }
        return `<svg viewBox="0 0 128 72"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--curve-stroke)" stroke-width="2.5" stroke-linecap="round" style="filter:drop-shadow(0 0 4px var(--accent-soft))"/></svg>`;
    }

    function buildPresets() {
        presetGrid.innerHTML = '';
        PRESETS.forEach((preset, idx) => {
            const btn = document.createElement('button');
            btn.className = 'preset-card' + (idx === 0 ? ' active' : '');
            btn.innerHTML = `${presetSVG(preset.vals)}<span class="preset-name">${preset.name}</span><span class="preset-vals">${preset.vals.join(', ')}</span>`;
            btn.addEventListener('click', () => {
                state.p1 = { x: preset.vals[0], y: preset.vals[1] };
                state.p2 = { x: preset.vals[2], y: preset.vals[3] };
                updateMeta();
                setActivePreset(idx);
                play();
            });
            presetGrid.appendChild(btn);
        });
    }
    function setActivePreset(idx) {
        [...presetGrid.children].forEach((el, i) => el.classList.toggle('active', i === idx));
    }
    function clearActivePreset() {
        [...presetGrid.children].forEach((el) => el.classList.remove('active'));
    }

    // === 时长滑杆 ===
    durationRange.addEventListener('input', () => {
        state.duration = Number(durationRange.value);
        durationLabel.textContent = state.duration + 'ms';
        updateMeta();
    });

    // === 导出 ===
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(exportCode.textContent);
            copyBtn.textContent = '已复制 ✓';
        } catch (_) {
            copyBtn.textContent = '复制失败';
        }
        setTimeout(() => { copyBtn.textContent = '复制 Token'; }, 1600);
    });

    applyCssBtn.addEventListener('click', () => {
        const curve = `cubic-bezier(${state.p1.x.toFixed(2)}, ${state.p1.y.toFixed(2)}, ${state.p2.x.toFixed(2)}, ${state.p2.y.toFixed(2)})`;
        document.documentElement.style.setProperty('--ease', curve);
        document.documentElement.style.setProperty('--motion-curve', curve);
        state.applied = !state.applied;
        applyNote.textContent = state.applied
            ? `已注入 · 全站 transition = ${curve} · 再次点击可移除`
            : '注入后，整页所有 transition 将采用当前曲线';
        applyNote.classList.toggle('flash', state.applied);
        if (!state.applied) {
            document.documentElement.style.removeProperty('--ease');
            document.documentElement.style.removeProperty('--motion-curve');
        }
    });

    // === 氛围配色 ===
    themeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        themeToggle.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.theme = btn.dataset.theme;
        document.body.dataset.theme = state.theme;
        buildPresets(); // 重绘 SVG 曲线颜色
        drawCurve();
    });

    // === 光标辉光 ===
    let glowX = 0, glowY = 0, glowTX = 0, glowTY = 0;
    window.addEventListener('pointermove', (e) => {
        glowTX = e.clientX;
        glowTY = e.clientY;
        cursorGlow.style.opacity = '1';
    });
    (function glowLoop() {
        glowX += (glowTX - glowX) * 0.08;
        glowY += (glowTY - glowY) * 0.08;
        cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
        requestAnimationFrame(glowLoop);
    })();

    // === Boot ===
    window.addEventListener('resize', resizeCanvas);
    buildPresets();
    resizeCanvas();
    updateMeta();
    requestAnimationFrame(tick);
    setTimeout(play, 700); // 入场后自动演示一次
})();
