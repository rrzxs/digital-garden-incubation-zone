/* ============================================================
   Blob Physics Lab — 软体液滴物理引擎
   压力软体模型：质点环 + 弹簧 + 内压 + 光滑曲线渲染
   ============================================================ */

(function () {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('blob-canvas');
    const ctx = canvas.getContext('2d');
    const stage = document.getElementById('stage-area');
    const rippleLayer = document.getElementById('ripple-layer');
    const cursorGlow = document.getElementById('cursor-glow');
    const teleBlobs = document.getElementById('tele-blobs');
    const teleEnergy = document.getElementById('tele-energy');
    const teleFps = document.getElementById('tele-fps');

    // === State ===
    const state = {
        physicsMode: 'float',
        gravity: 0,
        softness: 1,
        damping: 0.985,
        theme: 'nebula',
        blobs: [],
        pointer: { x: -9999, y: -9999, down: false, grab: null },
        W: 0,
        H: 0
    };

    const THEMES = {
        nebula: { hues: [252, 268, 210, 288] },
        lagoon: { hues: [172, 188, 152, 196] },
        ember:  { hues: [348, 12, 330, 22] },
        aurora: { hues: [84, 96, 140, 72] }
    };

    // === Blob: 压力软体 ===
    const PERIM = 22;

    class Blob {
        constructor(x, y, radius, hue) {
            this.hue = hue;
            this.restRadius = radius;
            this.points = [];
            for (let i = 0; i < PERIM; i++) {
                const a = (i / PERIM) * Math.PI * 2;
                this.points.push({
                    x: x + Math.cos(a) * radius,
                    y: y + Math.sin(a) * radius,
                    px: x + Math.cos(a) * radius,
                    py: y + Math.sin(a) * radius
                });
            }
            this.spawn = performance.now();
        }

        center() {
            let cx = 0, cy = 0;
            for (const p of this.points) { cx += p.x; cy += p.y; }
            return { x: cx / this.points.length, y: cy / this.points.length };
        }

        radius() {
            const c = this.center();
            let r = 0;
            for (const p of this.points) r += Math.hypot(p.x - c.x, p.y - c.y);
            return r / this.points.length;
        }

        energy() {
            let e = 0;
            for (const p of this.points) {
                e += Math.hypot(p.x - p.px, p.y - p.py);
            }
            return e / this.points.length;
        }
    }

    function randomHue() {
        const hues = THEMES[state.theme].hues;
        return hues[Math.floor(Math.random() * hues.length)];
    }

    function spawnBlob(x, y, r) {
        state.blobs.push(new Blob(x, y, r || 34 + Math.random() * 42, randomHue()));
    }

    // === 物理积分：Verlet + 弹簧 + 内压 ===
    function stepBlob(b, dt) {
        const g = state.physicsMode === 'gravity' ? 0.55 + state.gravity * 0.4 : state.gravity * 0.25;
        const damp = state.damping;

        for (const p of b.points) {
            const vx = (p.x - p.px) * damp;
            const vy = (p.y - p.py) * damp;
            p.px = p.x;
            p.py = p.y;
            p.x += vx;
            p.y += vy + g;
        }

        // 弹簧约束（周长 + 辐条）与内压，迭代保持形状
        const iterations = 3;
        const c = b.center();
        const currentR = b.radius();
        const pressure = ((b.restRadius - currentR) / Math.max(currentR, 1)) * 0.55 * state.softness;

        for (let it = 0; it < iterations; it++) {
            for (let i = 0; i < PERIM; i++) {
                const p = b.points[i];
                const q = b.points[(i + 1) % PERIM];
                const dx = q.x - p.x;
                const dy = q.y - p.y;
                const d = Math.hypot(dx, dy) || 0.0001;
                const target = (2 * b.restRadius * Math.sin(Math.PI / PERIM)) * 1.02;
                const diff = (d - target) / d * 0.5;
                p.x += dx * diff * 0.5;
                p.y += dy * diff * 0.5;
                q.x -= dx * diff * 0.5;
                q.y -= dy * diff * 0.5;
            }

            // 内压：把质点沿径向推离重心
            const cc = b.center();
            for (const p of b.points) {
                const dx = p.x - cc.x;
                const dy = p.y - cc.y;
                const d = Math.hypot(dx, dy) || 0.0001;
                p.x += (dx / d) * pressure * (b.restRadius / PERIM) * 4;
                p.y += (dy / d) * pressure * (b.restRadius / PERIM) * 4;
            }

            // 辐条：限制最大拉伸
            const ccc = b.center();
            const maxLen = b.restRadius * 1.5;
            for (const p of b.points) {
                const dx = p.x - ccc.x;
                const dy = p.y - ccc.y;
                const d = Math.hypot(dx, dy);
                if (d > maxLen) {
                    const s = maxLen / d;
                    p.x = ccc.x + dx * s;
                    p.y = ccc.y + dy * s;
                }
            }
        }

        // 边界约束
        const pad = 4;
        for (const p of b.points) {
            if (p.y > state.H - pad) { p.y = state.H - pad; p.py = p.py + (p.y - state.H + pad) * 0.6; }
            if (p.y < pad) { p.y = pad; }
            if (p.x < pad) { p.x = pad; }
            if (p.x > state.W - pad) { p.x = state.W - pad; }
        }

        // 指针抓取：弹簧拉向指针
        if (state.pointer.grab === b) {
            const gc = b.center();
            const dx = state.pointer.x - gc.x;
            const dy = state.pointer.y - gc.y;
            for (const p of b.points) {
                p.x += dx * 0.06;
                p.y += dy * 0.06;
            }
        } else if (state.pointer.down) {
            // 按压排斥：指针周围轻微推开质点
            const gc = b.center();
            const dx = gc.x - state.pointer.x;
            const dy = gc.y - state.pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < 130 && d > 0.001) {
                const f = (1 - d / 130) * 2.4;
                for (const p of b.points) {
                    p.x += (p.x - state.pointer.x) / d * f;
                    p.y += (p.y - state.pointer.y) / d * f;
                }
            }
        }
    }

    // === 液滴间碰撞（中心排斥 + 表面柔推） ===
    function collide() {
        const blobs = state.blobs;
        for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
                const a = blobs[i], b = blobs[j];
                const ca = a.center(), cb = b.center();
                const dx = cb.x - ca.x;
                const dy = cb.y - ca.y;
                const d = Math.hypot(dx, dy) || 0.0001;
                const minD = a.radius() + b.radius();
                if (d < minD) {
                    const push = ((minD - d) / d) * 0.28;
                    for (const p of a.points) { p.x -= dx * push; p.y -= dy * push; }
                    for (const p of b.points) { p.x += dx * push; p.y += dy * push; }
                }
            }
        }
    }

    // === 渲染：Catmull-Rom 光滑闭合曲线 ===
    function drawBlob(b, t) {
        const pts = b.points;
        const c = b.center();
        const r = b.radius();
        const wobble = Math.sin(t * 0.001 + b.hue) * 0.06 + 1;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(
            (pts[PERIM - 1].x + 2 * pts[0].x + pts[1].x) / 4,
            (pts[PERIM - 1].y + 2 * pts[0].y + pts[1].y) / 4
        );
        for (let i = 0; i < PERIM; i++) {
            const p0 = pts[(i - 1 + PERIM) % PERIM];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % PERIM];
            const p3 = pts[(i + 2) % PERIM];
            ctx.bezierCurveTo(
                (p0.x + 4 * p1.x + p2.x) / 6 * wobble - (p1.x * (wobble - 1)),
                (p0.y + 4 * p1.y + p2.y) / 6 * wobble - (p1.y * (wobble - 1)),
                (p1.x + 4 * p2.x + p3.x) / 6 * wobble - (p2.x * (wobble - 1)),
                (p1.y + 4 * p2.y + p3.y) / 6 * wobble - (p2.y * (wobble - 1)),
                p2.x, p2.y
            );
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(
            c.x - r * 0.3, c.y - r * 0.35, r * 0.1,
            c.x, c.y, r * 1.05
        );
        grad.addColorStop(0, `hsla(${b.hue}, 92%, 74%, 0.95)`);
        grad.addColorStop(0.55, `hsla(${b.hue}, 84%, 58%, 0.65)`);
        grad.addColorStop(1, `hsla(${b.hue + 16}, 78%, 44%, 0.32)`);

        ctx.shadowColor = `hsla(${b.hue}, 90%, 62%, 0.5)`;
        ctx.shadowBlur = 28;
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${b.hue}, 100%, 84%, 0.5)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 高光
        ctx.beginPath();
        ctx.arc(c.x - r * 0.34, c.y - r * 0.38, Math.max(2, r * 0.14), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.restore();
    }

    // === 主循环 ===
    let last = performance.now();
    let fpsAcc = 60;

    function loop(t) {
        const dt = Math.min(t - last, 40);
        last = t;
        fpsAcc = fpsAcc * 0.95 + (1000 / Math.max(dt, 1)) * 0.05;

        for (const b of state.blobs) stepBlob(b, dt);
        collide();

        ctx.clearRect(0, 0, state.W, state.H);
        for (const b of state.blobs) drawBlob(b, t);

        // 遥测（每帧更新文本开销可接受）
        let energy = 0;
        for (const b of state.blobs) energy += b.energy();
        teleBlobs.textContent = String(state.blobs.length).padStart(2, '0');
        teleEnergy.textContent = (energy / Math.max(state.blobs.length, 1)).toFixed(2);
        teleFps.textContent = Math.round(fpsAcc);

        requestAnimationFrame(loop);
    }

    // === 指针交互 ===
    function pointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function blobAt(x, y) {
        for (let i = state.blobs.length - 1; i >= 0; i--) {
            const c = state.blobs[i].center();
            if (Math.hypot(x - c.x, y - c.y) < state.blobs[i].radius() * 1.15) return state.blobs[i];
        }
        return null;
    }

    function spawnRipple(x, y) {
        const el = document.createElement('span');
        el.className = 'ripple';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        rippleLayer.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    canvas.addEventListener('pointermove', (e) => {
        const p = pointerPos(e);
        state.pointer.x = p.x;
        state.pointer.y = p.y;
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    canvas.addEventListener('pointerdown', (e) => {
        const p = pointerPos(e);
        state.pointer.down = true;
        const hit = blobAt(p.x, p.y);
        if (hit) {
            state.pointer.grab = hit;
            canvas.style.cursor = 'grabbing';
        } else {
            spawnBlob(p.x, p.y);
            spawnRipple(p.x, p.y);
            stage.classList.add('busy');
        }
    });

    window.addEventListener('pointerup', () => {
        state.pointer.down = false;
        state.pointer.grab = null;
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('dblclick', (e) => {
        const p = pointerPos(e);
        const hit = blobAt(p.x, p.y);
        if (hit) {
            const c = hit.center();
            state.blobs = state.blobs.filter((b) => b !== hit);
            spawnRipple(c.x, c.y);
            // 炸裂：碎片小液滴
            const n = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + Math.random();
                const d = 30 + Math.random() * 30;
                spawnBlob(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 14 + Math.random() * 12);
            }
        }
    });

    // === 控制面板 ===
    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.physicsMode = btn.dataset.physics;
            const g = document.getElementById('slider-gravity');
            if (state.physicsMode === 'gravity') {
                g.value = 0.6;
                state.gravity = 0.6;
            } else if (state.physicsMode === 'float') {
                g.value = 0;
                state.gravity = 0;
            } else {
                g.value = 0;
                state.gravity = 0;
            }
            document.getElementById('value-gravity').textContent = Number(g.value).toFixed(2);
        });
    });

    function bindSlider(id, key) {
        const el = document.getElementById(id);
        const out = document.getElementById('value-' + key);
        el.addEventListener('input', () => {
            state[key] = parseFloat(el.value);
            out.textContent = state[key].toFixed(key === 'damping' ? 3 : 2);
        });
    }

    bindSlider('slider-gravity', 'gravity');
    bindSlider('slider-softness', 'softness');
    bindSlider('slider-damping', 'damping');

    document.querySelectorAll('.palette-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.palette-dot').forEach((d) => d.classList.remove('active'));
            dot.classList.add('active');
            state.theme = dot.dataset.theme;
            document.documentElement.dataset.theme = state.theme;
            for (const b of state.blobs) b.hue = randomHue();
        });
    });

    document.getElementById('btn-spawn').addEventListener('click', () => {
        spawnBlob(
            state.W * (0.25 + Math.random() * 0.5),
            state.H * (0.25 + Math.random() * 0.4)
        );
        stage.classList.add('busy');
    });

    document.getElementById('btn-pop').addEventListener('click', () => {
        for (const b of state.blobs) {
            const c = b.center();
            spawnRipple(c.x, c.y);
        }
        state.blobs = [];
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        state.blobs = [];
        seedInitialBlobs();
    });

    // === 尺寸 ===
    function resize() {
        const rect = stage.getBoundingClientRect();
        state.W = canvas.width = Math.floor(rect.width);
        state.H = canvas.height = Math.floor(rect.height);
    }

    window.addEventListener('resize', resize);

    // === 初始 ===
    function seedInitialBlobs() {
        spawnBlob(state.W * 0.3, state.H * 0.38, 46);
        spawnBlob(state.W * 0.58, state.H * 0.55, 58);
        spawnBlob(state.W * 0.46, state.H * 0.28, 34);
    }

    resize();
    seedInitialBlobs();
    requestAnimationFrame(loop);
})();
