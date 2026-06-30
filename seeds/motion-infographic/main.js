/**
 * Motion Infographic 动效信息图 — 沉浸式数据脉动
 * Vanilla JS IIFE 模块封装，零依赖
 * 流体粒子流场 + 数字递增 + 环形进度 + 柱状脉冲 + 时间线 + 3D 倾斜 + 磁吸光标
 */
(function () {
    'use strict';

    /* === DOM Elements === */
    const root = document.body;
    const canvas = document.getElementById('flow-canvas');
    const ctx = canvas.getContext('2d');
    const cursorGlow = document.getElementById('cursor-glow');
    const metricGrid = document.getElementById('metric-grid');
    const barStage = document.getElementById('bar-stage');
    const timeline = document.getElementById('timeline');
    const ringFill = document.getElementById('ring-fill');
    const ringGlow = document.getElementById('ring-glow');
    const ringValue = document.getElementById('ring-value');
    const orbitNodes = document.getElementById('orbit-nodes');
    const themeToggle = document.getElementById('theme-toggle');
    const modeToggle = document.getElementById('mode-toggle');
    const footClock = document.getElementById('foot-clock');
    const tiltCards = document.querySelectorAll('[data-tilt]');

    /* === 数据集 === */
    const METRICS = [
        { label: '活跃用户', value: 48260, unit: '', trend: 12.4, up: true,  spark: [4,6,5,8,7,10,9,12] },
        { label: '交互事件', value: 1294,  unit: 'K', trend: 8.1,  up: true,  spark: [6,5,7,6,8,9,8,11] },
        { label: '平均时延', value: 38,    unit: 'ms', trend: 4.2, up: false, spark: [9,8,9,7,8,6,7,5] },
        { label: '转化指数', value: 76.3,  unit: '%', trend: 3.6,  up: true,  spark: [5,6,6,7,8,8,9,10] }
    ];

    const RING_TARGET = 82; // 环形目标百分比

    const BAR_DATA = [38, 52, 44, 67, 78, 61, 88, 95, 72, 84, 56, 48];

    const TIMELINE_DATA = [
        { time: '08:00', label: '系统唤醒' },
        { time: '10:30', label: '流量爬升' },
        { time: '12:00', label: '午间峰值' },
        { time: '14:30', label: '稳定巡航' },
        { time: '17:00', label: '二次高峰' },
        { time: '20:00', label: '渐进回落' },
        { time: '23:30', label: '夜间维护' }
    ];

    /* === 工具函数 === */
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const EASE_OUT_EXPO = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const css = (el, prop, val) => el.style.setProperty(prop, val);

    function readVar(name) {
        return getComputedStyle(root).getPropertyValue(name).trim();
    }

    /* === 粒子流场 === */
    const State = {
        particles: [],
        ripples: [],
        width: 0,
        height: 0,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        mouse: { x: -9999, y: -9999, active: false },
        t: 0
    };

    function resizeCanvas() {
        State.width = window.innerWidth;
        State.height = window.innerHeight;
        canvas.width = State.width * State.dpr;
        canvas.height = State.height * State.dpr;
        canvas.style.width = State.width + 'px';
        canvas.style.height = State.height + 'px';
        ctx.setTransform(State.dpr, 0, 0, State.dpr, 0, 0);
    }

    function initParticles() {
        const count = clamp(Math.floor((State.width * State.height) / 18000), 40, 110);
        State.particles = [];
        for (let i = 0; i < count; i++) {
            State.particles.push({
                x: Math.random() * State.width,
                y: Math.random() * State.height,
                vx: 0, vy: 0,
                size: Math.random() * 1.6 + 0.4,
                life: Math.random(),
                hue: Math.random()
            });
        }
    }

    /* 简易 2D 噪声（流场方向） */
    function flowAngle(x, y, t) {
        const scale = 0.0018;
        return (
            Math.sin(x * scale + t * 0.4) +
            Math.cos(y * scale * 1.3 - t * 0.3) +
            Math.sin((x + y) * scale * 0.6 + t * 0.2)
        ) * Math.PI;
    }

    function spawnRipple(x, y) {
        State.ripples.push({ x, y, r: 0, max: 180, life: 1 });
    }

    function updateParticles(dt) {
        const m = State.mouse;
        const accent = readVar('--color-accent') || '#6366f1';
        for (const p of State.particles) {
            const a = flowAngle(p.x, p.y, State.t);
            p.vx = lerp(p.vx, Math.cos(a) * 0.6, 0.06);
            p.vy = lerp(p.vy, Math.sin(a) * 0.6, 0.06);

            // 鼠标排斥
            if (m.active) {
                const dx = p.x - m.x;
                const dy = p.y - m.y;
                const dist2 = dx * dx + dy * dy;
                if (dist2 < 20000 && dist2 > 1) {
                    const f = 1200 / dist2;
                    p.vx += (dx / Math.sqrt(dist2)) * f * 0.04;
                    p.vy += (dy / Math.sqrt(dist2)) * f * 0.04;
                }
            }

            // 涟漪冲击
            for (const r of State.ripples) {
                const dx = p.x - r.x;
                const dy = p.y - r.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const band = Math.abs(dist - r.r);
                if (band < 30 && dist > 1) {
                    const f = (1 - band / 30) * r.life * 2.2;
                    p.vx += (dx / dist) * f;
                    p.vy += (dy / dist) * f;
                }
            }

            p.x += p.vx;
            p.y += p.vy;
            p.life += dt * 0.08;

            // 环绕边界
            if (p.x < -10) p.x = State.width + 10;
            if (p.x > State.width + 10) p.x = -10;
            if (p.y < -10) p.y = State.height + 10;
            if (p.y > State.height + 10) p.y = -10;
        }

        // 更新涟漪
        for (let i = State.ripples.length - 1; i >= 0; i--) {
            const r = State.ripples[i];
            r.r += 4.5;
            r.life -= 0.018;
            if (r.life <= 0 || r.r > r.max) State.ripples.splice(i, 1);
        }
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3
            ? h.split('').map(c => c + c).join('')
            : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function drawParticles() {
        ctx.clearRect(0, 0, State.width, State.height);
        const accent = readVar('--color-accent') || '#6366f1';
        const [r, g, b] = hexToRgb(accent);

        // 粒子
        ctx.globalCompositeOperation = 'lighter';
        for (const p of State.particles) {
            const alpha = 0.4 + Math.sin(p.life * 3) * 0.25;
            ctx.beginPath();
            ctx.fillStyle = `rgba(${r},${g},${b},${clamp(alpha, 0.05, 0.7)})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 涟漪环
        ctx.globalCompositeOperation = 'source-over';
        for (const rp of State.ripples) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${g},${b},${rp.life * 0.5})`;
            ctx.lineWidth = 2;
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    let lastT = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        State.t += dt;
        updateParticles(dt);
        drawParticles();
        requestAnimationFrame(loop);
    }

    /* === 数字递增 === */
    function animateCount(el, target, duration = 1600, isFloat = false) {
        const start = 0;
        const startTime = performance.now();
        function step(now) {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = EASE_OUT_EXPO(p);
            const val = start + (target - start) * eased;
            el.textContent = isFloat ? val.toFixed(1) : Math.floor(val).toLocaleString('en-US');
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = isFloat ? target.toFixed(1) : target.toLocaleString('en-US');
        }
        requestAnimationFrame(step);
    }

    /* === 渲染指标卡片 === */
    function renderMetrics() {
        METRICS.forEach((m, i) => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.style.animationDelay = (0.1 + i * 0.08) + 's';

            const sparkPath = buildSparkPath(m.spark);

            card.innerHTML = `
                <svg class="metric-spark" viewBox="0 0 64 32" preserveAspectRatio="none">
                    <path d="${sparkPath}" />
                </svg>
                <div class="metric-label">${m.label}</div>
                <div class="metric-value"><span class="num" data-target="${m.value}" data-float="${m.unit === '%'}">0</span><span class="unit">${m.unit}</span></div>
                <span class="metric-trend ${m.up ? 'up' : 'down'}">${m.up ? '▲' : '▼'} ${m.trend}%</span>
            `;
            metricGrid.appendChild(card);
        });
    }

    function buildSparkPath(data) {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const stepX = 64 / (data.length - 1);
        return data.map((v, i) => {
            const x = i * stepX;
            const y = 30 - ((v - min) / range) * 26;
            return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
    }

    /* === 渲染柱状脉冲 === */
    function renderBars() {
        barStage.innerHTML = '';
        BAR_DATA.forEach((v, i) => {
            const col = document.createElement('div');
            col.className = 'bar-col';
            col.innerHTML = `<div class="bar-fill" data-target="${v}"></div>`;
            barStage.appendChild(col);
            // 触发动画（错峰）
            setTimeout(() => {
                col.querySelector('.bar-fill').style.height = v + '%';
            }, 200 + i * 70);
        });
    }

    /* === 渲染时间线 === */
    function renderTimeline() {
        TIMELINE_DATA.forEach((item, i) => {
            const node = document.createElement('div');
            node.className = 'tl-item';
            node.style.animationDelay = (0.1 + i * 0.08) + 's';
            node.innerHTML = `
                <div class="tl-dot"></div>
                <div class="tl-time">${item.time}</div>
                <div class="tl-label">${item.label}</div>
            `;
            timeline.appendChild(node);
        });
    }

    /* === 环形进度 === */
    const RING_CIRC = 2 * Math.PI * 92; // ≈ 578
    function animateRing() {
        const offset = RING_CIRC * (1 - RING_TARGET / 100);
        ringFill.style.strokeDashoffset = offset;
        ringGlow.style.strokeDashoffset = offset;
    }

    // 环形中心数值（含 %）
    function animateRingValue() {
        const startTime = performance.now();
        const duration = 1800;
        function step(now) {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = EASE_OUT_EXPO(p);
            const val = Math.round(RING_TARGET * eased);
            ringValue.textContent = val + '%';
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* === 环绕节点（轨道） === */
    function createOrbitNodes() {
        orbitNodes.innerHTML = '';
        const count = 6;
        for (let i = 0; i < count; i++) {
            const node = document.createElement('div');
            node.className = 'orbit-node';
            node.style.background = i % 3 === 0 ? readVar('--color-accent')
                : i % 3 === 1 ? readVar('--color-accent-2')
                : readVar('--color-up');
            orbitNodes.appendChild(node);
        }
    }

    function animateOrbitNodes() {
        const nodes = orbitNodes.querySelectorAll('.orbit-node');
        const radius = 116;
        let angle = 0;
        function step() {
            angle += 0.005;
            nodes.forEach((n, i) => {
                const a = angle + (i / nodes.length) * Math.PI * 2;
                const x = Math.cos(a) * radius;
                const y = Math.sin(a) * radius;
                n.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${0.8 + Math.sin(a) * 0.3})`;
                n.style.opacity = 0.5 + Math.sin(a) * 0.4;
            });
            requestAnimationFrame(step);
        }
        step();
    }

    /* === Intersection Observer 触发动画 === */
    function setupReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    // 触发卡片内数字动画
                    const nums = entry.target.querySelectorAll('.num[data-target]');
                    nums.forEach(num => {
                        if (num.dataset.done) return;
                        num.dataset.done = '1';
                        const target = parseFloat(num.dataset.target);
                        const isFloat = num.dataset.float === 'true';
                        animateCount(num, target, 1600, isFloat);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('.metric-card, .tl-item').forEach(el => observer.observe(el));
    }

    /* === 3D 倾斜（玻璃卡片） === */
    function setupTilt() {
        tiltCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(0)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
            });
        });
    }

    /* === 磁吸光标 / 鼠标追踪 === */
    function setupCursor() {
        let glowX = window.innerWidth / 2;
        let glowY = window.innerHeight / 2;
        let targetX = glowX, targetY = glowY;

        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            State.mouse.x = e.clientX;
            State.mouse.y = e.clientY;
            State.mouse.active = true;
        });
        window.addEventListener('mouseleave', () => {
            State.mouse.active = false;
            State.mouse.x = -9999;
            State.mouse.y = -9999;
        });
        window.addEventListener('click', (e) => {
            spawnRipple(e.clientX, e.clientY);
        });

        function followLoop() {
            glowX = lerp(glowX, targetX, 0.12);
            glowY = lerp(glowY, targetY, 0.12);
            cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
            requestAnimationFrame(followLoop);
        }
        followLoop();
    }

    /* === 主题与模式切换 === */
    function setupToggles() {
        themeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-btn');
            if (!btn) return;
            themeToggle.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            root.setAttribute('data-theme', btn.dataset.theme);
        });

        modeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            modeToggle.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            root.setAttribute('data-mode', btn.dataset.mode);
        });
    }

    /* === 时钟 === */
    function setupClock() {
        function tick() {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            footClock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        tick();
        setInterval(tick, 1000);
    }

    /* === Hero 数字递增 === */
    function animateHeroStats() {
        document.querySelectorAll('.hero-stats .stat-num').forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            animateCount(el, target, 1400);
        });
    }

    /* === 初始化 === */
    function init() {
        resizeCanvas();
        initParticles();
        renderMetrics();
        renderBars();
        renderTimeline();
        createOrbitNodes();
        setupReveal();
        setupTilt();
        setupCursor();
        setupToggles();
        setupClock();
        animateOrbitNodes();
        requestAnimationFrame(loop);

        // 延迟触发环形动画
        setTimeout(() => {
            animateRing();
            animateRingValue();
        }, 600);

        setTimeout(animateHeroStats, 900);

        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
