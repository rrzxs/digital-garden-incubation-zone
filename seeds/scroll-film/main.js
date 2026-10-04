/**
 * SCROLL FILM · 胶片之卷
 * 沉浸式滚动胶片放映体验 —— 交互逻辑
 *
 * 滚动即放映：滚动速度驱动颗粒噪点、色散、画面抖动、
 * 信箱遮幅与光圈光标，实时时间码 HUD 追踪放映进度。
 */

(function initScrollFilm() {
    'use strict';

    // === DOM Elements ===

    const body = document.body;
    const grainOverlay = document.getElementById('grain-overlay');
    const lightLeak = document.getElementById('light-leak');
    const letterboxTop = document.getElementById('letterbox-top');
    const letterboxBottom = document.getElementById('letterbox-bottom');
    const filmJitter = document.getElementById('film-jitter');
    const cursorLens = document.getElementById('cursor-lens');
    const tcValue = document.getElementById('tc-value');
    const tcSpeed = document.getElementById('tc-speed');
    const tcFrame = document.getElementById('tc-frame');
    const tcMeterFill = document.getElementById('tc-meter-fill');
    const themeSwitcher = document.getElementById('theme-switcher');
    const frameRail = document.getElementById('frame-rail');
    const replayBtn = document.getElementById('replay-btn');
    const particleCanvas = document.getElementById('particle-canvas');
    const filmFrames = Array.from(document.querySelectorAll('.film-frame'));
    const railDots = Array.from(frameRail.querySelectorAll('.rail-dot'));

    // === Constants & State ===

    const FPS = 24;
    const EXPOSE_MAX = 900;           // px/s 视为"满速快门"
    const state = {
        velocity: 0,                   // 平滑后的滚动速度 (px/s)
        velocityRaw: 0,
        progress: 0,                   // 页面放映进度 0..1
        lastY: window.scrollY,
        lastT: performance.now(),
        mouse: { x: innerWidth / 2, y: innerHeight / 2 },
        lens: { x: innerWidth / 2, y: innerHeight / 2 }
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    // === Scroll Physics (velocity + progress) ===

    function sampleScroll(now) {
        const y = window.scrollY;
        const dt = Math.max((now - state.lastT) / 1000, 1 / 240);
        const raw = Math.abs(y - state.lastY) / dt;

        state.velocityRaw = clamp(raw, 0, 4000);
        state.velocity = lerp(state.velocity, state.velocityRaw, 0.12);
        state.lastY = y;
        state.lastT = now;

        const scrollable = document.documentElement.scrollHeight - innerHeight;
        state.progress = scrollable > 0 ? clamp(y / scrollable, 0, 1) : 0;
    }

    function normVelocity() {
        return clamp(state.velocity / EXPOSE_MAX, 0, 1);
    }

    // === Timecode HUD ===

    function formatTimecode(seconds) {
        const frames = Math.floor((seconds % 1) * FPS);
        const s = Math.floor(seconds) % 60;
        const m = Math.floor(seconds / 60) % 60;
        const h = Math.floor(seconds / 3600);
        const pad = (n, w) => String(n).padStart(w, '0');
        return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}:${pad(frames, 2)}`;
    }

    function renderHUD() {
        const reelSeconds = 72;                     // 全片"时长" 72 秒
        const seconds = state.progress * reelSeconds;
        const totalFrames = Math.floor(seconds * FPS);
        const speed = state.velocity / 240;         // 每帧位移近似放映倍速

        tcValue.textContent = formatTimecode(seconds);
        tcSpeed.textContent = `× ${speed.toFixed(2)}`;
        tcFrame.textContent = `FR ${String(totalFrames).padStart(4, '0')}`;
        tcMeterFill.style.width = `${(state.progress * 100).toFixed(1)}%`;
    }

    // === Velocity-Driven Cinematics (grain / leak / letterbox / jitter / aberration) ===

    function renderCinematics(now) {
        const v = normVelocity();

        // 颗粒噪点：速度越快，胶片颗粒越粗
        grainOverlay.style.opacity = (0.05 + v * 0.16).toFixed(3);

        // 漏光光斑：高速滚动时的光泄漏
        lightLeak.style.opacity = (Math.max(0, v - 0.35) / 0.65 * 0.6).toFixed(3);

        // 信箱遮幅：静止时呼吸留白，快速滚动时收拢遮幅
        const letterbox = 22 + v * 34;
        body.style.setProperty('--letterbox', `${letterbox.toFixed(1)}px`);

        // 色散：速度驱动标题色差偏移
        body.style.setProperty('--aberration', `${(v * 2.6).toFixed(2)}px`);

        // 抖动：高速时胶片在片门中颤动
        const t = now / 1000;
        const amp = v * 3.2;
        const jx = Math.sin(t * 47.3) * amp + Math.sin(t * 13.1) * amp * 0.4;
        const jy = Math.cos(t * 41.7) * amp + Math.cos(t * 11.3) * amp * 0.4;
        const rot = Math.sin(t * 9.7) * v * 0.12;
        filmJitter.style.transform =
            `translate3d(${jx.toFixed(2)}px, ${jy.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;

        // 光圈光标：高速时扩张
        cursorLens.classList.toggle('is-fast', v > 0.45);
    }

    // === Frame Reveal (IntersectionObserver) ===

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    filmFrames.forEach((frame) => revealObserver.observe(frame));

    // === Active Chapter Detection ===

    const chapterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            railDots.forEach((dot) => {
                dot.classList.toggle('active', dot.dataset.target === id);
            });
        });
    }, { threshold: 0.5 });

    filmFrames.forEach((frame) => chapterObserver.observe(frame));

    railDots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const target = document.getElementById(dot.dataset.target);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // === Theme Switcher ===

    themeSwitcher.addEventListener('click', (event) => {
        const btn = event.target.closest('.theme-btn');
        if (!btn) return;
        const theme = btn.dataset.theme;

        body.dataset.theme = theme;
        themeSwitcher.querySelectorAll('.theme-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
        });
        seedClickRipple(state.mouse.x, state.mouse.y);
    });

    // === Custom Cursor (aperture lens with trailing physics) ===

    window.addEventListener('pointermove', (event) => {
        state.mouse.x = event.clientX;
        state.mouse.y = event.clientY;
    }, { passive: true });

    window.addEventListener('pointerdown', () => {
        cursorLens.classList.add('is-pressing');
    });

    window.addEventListener('pointerup', () => {
        cursorLens.classList.remove('is-pressing');
    });

    function renderCursor() {
        const ease = 0.22;
        state.lens.x = lerp(state.lens.x, state.mouse.x, ease);
        state.lens.y = lerp(state.lens.y, state.mouse.y, ease);
        const dx = state.mouse.x - state.lens.x;
        const dy = state.mouse.y - state.lens.y;
        const tilt = clamp(dx * 0.12, -9, 9);
        const stretch = clamp(Math.hypot(dx, dy) * 0.006, 0, 0.35);

        cursorLens.style.transform =
            `translate3d(${state.lens.x.toFixed(1)}px, ${state.lens.y.toFixed(1)}px, 0) ` +
            `rotate(${tilt.toFixed(2)}deg) scale(${1 + stretch}, ${1 - stretch * 0.5})`;
    }

    // === Click Ripple ===

    function seedClickRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        document.body.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    window.addEventListener('pointerdown', (event) => {
        if (event.target.closest('a, button')) return;
        seedClickRipple(event.clientX, event.clientY);
    });

    // === Particle Dust Field (projection beam dust) ===

    const ctx = particleCanvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        particleCanvas.width = innerWidth * devicePixelRatio;
        particleCanvas.height = innerHeight * devicePixelRatio;
        particleCanvas.style.width = `${innerWidth}px`;
        particleCanvas.style.height = `${innerHeight}px`;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        spawnParticles();
    }

    function spawnParticles() {
        const count = Math.floor(clamp(innerWidth / 16, 40, 90));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * innerWidth,
            y: Math.random() * innerHeight,
            r: Math.random() * 1.6 + 0.4,
            baseAlpha: Math.random() * 0.35 + 0.1,
            driftX: (Math.random() - 0.5) * 0.15,
            driftY: -(Math.random() * 0.22 + 0.05),
            phase: Math.random() * Math.PI * 2
        }));
    }

    function renderParticles(now) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        const accent = getComputedStyle(body).getPropertyValue('--accent').trim() || '#7dd3fc';
        const boost = 1 + normVelocity() * 3;

        for (const p of particles) {
            p.x += p.driftX + Math.sin(now / 1400 + p.phase) * 0.12;
            p.y += p.driftY * boost;

            if (p.y < -6) { p.y = innerHeight + 6; p.x = Math.random() * innerWidth; }
            if (p.x < -6) p.x = innerWidth + 6;
            if (p.x > innerWidth + 6) p.x = -6;

            const tw = 0.6 + 0.4 * Math.sin(now / 900 + p.phase * 3);
            ctx.globalAlpha = p.baseAlpha * tw;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // === Replay (rewind to first frame) ===

    replayBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // === Main Loop ===

    function loop(now) {
        sampleScroll(now);
        renderHUD();
        renderCinematics(now);
        renderCursor();
        renderParticles(now);
        requestAnimationFrame(loop);
    }

    // === Boot ===

    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();
    requestAnimationFrame(loop);
})();
