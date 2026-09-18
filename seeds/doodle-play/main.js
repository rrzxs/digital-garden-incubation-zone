/* ============================================================
   Doodle Play 涂鸦游乐场 — 交互逻辑
   弹簧光标 · 多画笔渲染 · 粒子层 · 回放 / 撤销 / 导出
   ============================================================ */

(function () {
    'use strict';

    // === DOM Elements ===
    const body = document.body;
    const stage = document.getElementById('canvas-stage');
    const mainCanvas = document.getElementById('doodle-canvas');
    const fxCanvas = document.getElementById('fx-canvas');
    const mainCtx = mainCanvas.getContext('2d');
    const fxCtx = fxCanvas.getContext('2d');
    const hint = document.getElementById('stage-hint');
    const cursor = document.getElementById('live-cursor');
    const counter = document.getElementById('stroke-counter');

    // === State ===
    const state = {
        brush: 'ink',
        color: 'auto',
        size: 10,
        drawing: false,
        strokes: [],          // 已完成笔迹: { brush, color, size, points[] }
        current: null,        // 进行中笔迹
        particles: [],        // 星屑粒子
        replaying: false,
        hasDrawn: false,
        hueTime: 0
    };

    // 弹簧跟随光标状态
    const spring = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    // 平滑笔尖（绘制点跟随弹簧光标，产生丝滑曲线）
    const pen = { x: 0, y: 0, px: 0, py: 0 };

    let dpr = 1;

    const THEME_FLOWS = {
        aurora: ['#7c8cff', '#22d3ee', '#a78bfa', '#34d399'],
        sunset: ['#fb7185', '#f59e0b', '#f472b6', '#fbbf24'],
        ocean: ['#22d3ee', '#3b82f6', '#2dd4bf', '#60a5fa'],
        mono: ['#e2e8f0', '#94a3b8', '#cbd5e1', '#a8b4c4']
    };

    // === Canvas Sizing ===
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = stage.getBoundingClientRect();
        [mainCanvas, fxCanvas].forEach((cv) => {
            cv.width = Math.floor(rect.width * dpr);
            cv.height = Math.floor(rect.height * dpr);
        });
        mainCtx.scale(dpr, dpr);
        fxCtx.scale(dpr, dpr);
        redrawAll();
    }

    function cssSize(cv) {
        return { w: cv.width / dpr, h: cv.height / dpr };
    }

    // === Color Resolution ===
    function flowColors() {
        return THEME_FLOWS[body.dataset.theme] || THEME_FLOWS.aurora;
    }

    function resolveColor(progress) {
        if (state.color !== 'auto') return state.color;
        const flow = flowColors();
        const t = (progress + state.hueTime * 0.1) % flow.length;
        const i = Math.floor(t) % flow.length;
        const j = (i + 1) % flow.length;
        const f = t - Math.floor(t);
        return lerpColor(flow[i], flow[j], f);
    }

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function lerpColor(a, b, t) {
        const ca = hexToRgb(a), cb = hexToRgb(b);
        const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
        const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
        const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
        return `rgb(${r}, ${g}, ${bl})`;
    }

    // === Brush Renderers ===
    // 每一笔迹按点序渲染，支持增量绘制（进行中）与整体重绘（撤销/缩放后）
    function drawStrokeSegment(ctx, stroke, idx) {
        const pts = stroke.points;
        if (idx < 1) return;
        const p0 = pts[idx - 1];
        const p1 = pts[idx];
        const progress = idx / Math.max(pts.length - 1, 1);
        const color = stroke.fixedColor || resolveColor(progress);
        const width = stroke.size * (0.75 + 0.5 * Math.sin(progress * Math.PI)); // 两端略细的呼吸线宽

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (stroke.brush) {
            case 'ink':
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                break;

            case 'neon': {
                // 双层描边：外层辉光 + 内芯亮线
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = color;
                ctx.lineWidth = width * 3;
                ctx.shadowColor = color;
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(width * 0.35, 1);
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                break;
            }

            case 'rainbow': {
                // 流彩：速度调制线宽 + 连续色相流动
                const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.min(stroke.size * 2, width + dist * 0.35);
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                break;
            }

            case 'ribbon': {
                // 缎带：法线方向偏移的填充带
                const dx = p1.x - p0.x, dy = p1.y - p0.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                const hw = width * 1.4;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(p0.x + nx * hw, p0.y + ny * hw);
                ctx.lineTo(p1.x + nx * hw, p1.y + ny * hw);
                ctx.lineTo(p1.x - nx * hw, p1.y - ny * hw);
                ctx.lineTo(p0.x - nx * hw, p0.y - ny * hw);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            }

            case 'particle':
                // 星屑：主线极淡，粒子在 fx 层迸射（见 updateParticles）
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.22;
                ctx.lineWidth = width * 0.5;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
                break;
        }
        ctx.globalAlpha = 1;
    }

    function drawStrokeFull(ctx, stroke) {
        for (let i = 1; i < stroke.points.length; i++) drawStrokeSegment(ctx, stroke, i);
        if (stroke.points.length === 1) {
            // 单点：画一个圆点
            const p = stroke.points[0];
            const color = stroke.fixedColor || resolveColor(0);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(p.x, p.y, stroke.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function redrawAll() {
        const { w, h } = cssSize(mainCanvas);
        mainCtx.clearRect(0, 0, w, h);
        state.strokes.forEach((s) => drawStrokeFull(mainCtx, s));
        if (state.current) drawStrokeFull(mainCtx, state.current);
    }

    // === Particles (fx layer) ===
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 0.4 + Math.random() * 2.4;
            state.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 0.4,
                life: 1,
                decay: 0.012 + Math.random() * 0.025,
                r: 0.8 + Math.random() * 2.2,
                color
            });
        }
        if (state.particles.length > 600) state.particles.splice(0, state.particles.length - 600);
    }

    function updateParticles() {
        const { w, h } = cssSize(fxCanvas);
        fxCtx.clearRect(0, 0, w, h);
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // 微重力
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.life -= p.decay;
            if (p.life <= 0) { state.particles.splice(i, 1); continue; }
            fxCtx.globalAlpha = p.life * 0.9;
            fxCtx.fillStyle = p.color;
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
            fxCtx.fill();
        }
        fxCtx.globalAlpha = 1;
    }

    // === Pointer Handling ===
    function getPos(e) {
        const rect = stage.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onDown(e) {
        if (state.replaying) return;
        const p = getPos(e);
        spring.tx = p.x; spring.ty = p.y;
        if (Math.hypot(spring.x - p.x, spring.y - p.y) > 60) { spring.x = p.x; spring.y = p.y; }
        pen.x = pen.px = p.x; pen.y = pen.py = p.y;
        state.drawing = true;
        state.current = {
            brush: state.brush,
            color: state.color,
            size: state.size,
            fixedColor: null,
            points: [{ x: p.x, y: p.y }]
        };
        cursor.classList.add('pressing');
        hint.classList.add('hidden');
        if (state.brush === 'particle') spawnParticles(p.x, p.y, resolveColor(0), 14);
    }

    function onMove(e) {
        const p = getPos(e);
        spring.tx = p.x; spring.ty = p.y;
        cursor.classList.add('visible');
    }

    function onUp() {
        if (!state.drawing) return;
        state.drawing = false;
        cursor.classList.remove('pressing');
        if (state.current && state.current.points.length > 0) {
            state.strokes.push(state.current);
            counter.textContent = state.strokes.length + ' strokes';
            state.hasDrawn = true;
        }
        state.current = null;
    }

    // === Animation Loop（弹簧物理 + 增量绘制） ===
    function tick() {
        state.hueTime += 0.016;

        // 弹簧-阻尼跟随（欠阻尼，带一点回弹手感）
        const k = 0.16, damp = 0.72;
        spring.vx += (spring.tx - spring.x) * k;
        spring.vy += (spring.ty - spring.y) * k;
        spring.vx *= damp;
        spring.vy *= damp;
        spring.x += spring.vx;
        spring.y += spring.vy;

        // 光标 DOM 元素
        const sizeMul = state.drawing ? 1 : 1;
        cursor.style.transform = `translate(${spring.x - cursor.offsetWidth / 2}px, ${spring.y - cursor.offsetHeight / 2}px) scale(${sizeMul})`;

        if (state.drawing && state.current) {
            // 笔尖沿弹簧轨迹采样（距离阈值保证均匀点距）
            const dist = Math.hypot(spring.x - pen.x, spring.y - pen.y);
            if (dist > 2.5) {
                pen.px = pen.x; pen.py = pen.y;
                pen.x = spring.x; pen.y = spring.y;
                state.current.points.push({ x: pen.x, y: pen.y });
                const idx = state.current.points.length - 1;
                const progress = idx / Math.max(state.current.points.length - 1, 1);
                const col = resolveColor(progress);
                if (state.brush === 'particle' && idx % 3 === 0) {
                    spawnParticles(pen.x, pen.y, col, 3);
                }
                drawStrokeSegment(mainCtx, state.current, idx);
            }
        }

        updateParticles();
        requestAnimationFrame(tick);
    }

    // === Actions ===
    function undo() {
        if (state.replaying || !state.strokes.length) return;
        state.strokes.pop();
        counter.textContent = state.strokes.length + ' strokes';
        redrawAll();
        if (!state.strokes.length) { state.hasDrawn = false; hint.classList.remove('hidden'); }
    }

    function clearAll() {
        if (state.replaying) return;
        state.strokes = [];
        state.particles = [];
        counter.textContent = '0 strokes';
        const { w, h } = cssSize(mainCanvas);
        mainCtx.clearRect(0, 0, w, h);
        state.hasDrawn = false;
        hint.classList.remove('hidden');
    }

    // 回放：以弹簧节奏逐段重绘全部笔迹
    function replay() {
        if (state.replaying || !state.strokes.length) return;
        state.replaying = true;
        const { w, h } = cssSize(mainCanvas);
        mainCtx.clearRect(0, 0, w, h);
        const queue = state.strokes.slice();

        (function playStroke() {
            if (!queue.length) { state.replaying = false; redrawAll(); return; }
            const stroke = queue.shift();
            let i = 0;
            (function step() {
                const chunk = 3; // 每帧推进段数
                for (let c = 0; c < chunk && i < stroke.points.length; c++, i++) {
                    drawStrokeSegment(mainCtx, stroke, i);
                }
                if (i < stroke.points.length) requestAnimationFrame(step);
                else {
                    const last = stroke.points[stroke.points.length - 1];
                    spawnParticles(last.x, last.y, resolveColor(1), 8);
                    setTimeout(playStroke, 180);
                }
            })();
        })();
    }

    function savePNG() {
        const { w, h } = cssSize(mainCanvas);
        const out = document.createElement('canvas');
        out.width = mainCanvas.width;
        out.height = mainCanvas.height;
        const ctx = out.getContext('2d');
        // 深色底 + 轻微渐变，导出成品
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a0e1a');
        grad.addColorStop(1, '#101526');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(mainCanvas, 0, 0);
        const a = document.createElement('a');
        a.download = `doodle-play-${Date.now()}.png`;
        a.href = out.toDataURL('image/png');
        a.click();
    }

    // === UI Bindings ===
    function bindToolbar() {
        document.getElementById('brush-group').addEventListener('click', (e) => {
            const btn = e.target.closest('.tool-btn');
            if (!btn) return;
            document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.brush = btn.dataset.brush;
        });

        document.getElementById('palette-group').addEventListener('click', (e) => {
            const sw = e.target.closest('.swatch');
            if (!sw) return;
            document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
            sw.classList.add('active');
            state.color = sw.dataset.color;
        });

        const slider = document.getElementById('size-slider');
        const sizeVal = document.getElementById('size-value');
        slider.addEventListener('input', () => {
            state.size = +slider.value;
            sizeVal.textContent = slider.value;
        });

        document.getElementById('btn-undo').addEventListener('click', undo);
        document.getElementById('btn-replay').addEventListener('click', replay);
        document.getElementById('btn-clear').addEventListener('click', clearAll);
        document.getElementById('btn-save').addEventListener('click', savePNG);

        document.getElementById('theme-dots').addEventListener('click', (e) => {
            const dot = e.target.closest('.theme-dot');
            if (!dot) return;
            document.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('active'));
            dot.classList.add('active');
            body.dataset.theme = dot.dataset.theme;
            // 主题流动色改变后重绘（auto 色随主题）
            if (state.color === 'auto') redrawAll();
        });
    }

    function bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;
            switch (e.key.toLowerCase()) {
                case 'z': undo(); break;
                case 'r': replay(); break;
                case 'c': clearAll(); break;
                case 's': e.preventDefault(); savePNG(); break;
            }
        });
    }

    function bindPointer() {
        stage.addEventListener('pointerdown', (e) => {
            stage.setPointerCapture(e.pointerId);
            onDown(e);
        });
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp);
        stage.addEventListener('pointercancel', onUp);
        stage.addEventListener('pointerleave', () => {
            if (!state.drawing) cursor.classList.remove('visible');
        });
    }

    // === Init ===
    function init() {
        document.querySelector('.theme-dot[data-theme="aurora"]').classList.add('active');
        document.querySelector('.swatch[data-color="auto"]').classList.add('active');
        bindToolbar();
        bindKeyboard();
        bindPointer();
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(tick);
    }

    init();
})();
