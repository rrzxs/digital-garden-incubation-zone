/**
 * ============================================================
 * Scroll Case Flow 滚动案例流
 * 垂直滚动 → 水平案例流的转译引擎
 * 速度形变 / 字符揭示 / 粒子流场 / 进度轨道 / 氛围切换
 * ============================================================
 */

(() => {
    'use strict';

    // === 配置 ===
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const PARTICLE_COUNT = 120;

    // === DOM Elements ===
    const body = document.body;
    const stage = document.getElementById('flow-stage');
    const track = document.getElementById('flow-track');
    const cards = Array.from(document.querySelectorAll('.case-card'));
    const railFill = document.getElementById('rail-fill');
    const railDotsBox = document.getElementById('rail-dots');
    const railLabel = document.getElementById('rail-label');
    const hudVelocity = document.getElementById('hud-velocity');
    const hudCase = document.getElementById('hud-case');
    const scrollHint = document.getElementById('scroll-hint');
    const moodSwitch = document.getElementById('mood-switch');
    const btnBack = document.getElementById('btn-back');
    const topbar = document.querySelector('.topbar');
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    // === 状态 ===
    const state = {
        scrollY: window.scrollY,
        velocity: 0,
        smoothVelocity: 0,
        trackX: 0,
        maxTrackX: 0,
        activeCase: 0,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    // ================================================================
    // 1. 字符揭示 (Character Reveal)
    // ================================================================
    function splitChars(el) {
        const text = el.textContent;
        el.textContent = '';
        const frag = document.createDocumentFragment();
        for (const ch of text) {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch;
            frag.appendChild(span);
        }
        el.appendChild(frag);
        return Array.from(el.children);
    }

    const charGroups = [];
    document.querySelectorAll('[data-reveal-chars]').forEach((el) => {
        const chars = splitChars(el);
        chars.forEach((c, i) => {
            c.style.transitionDelay = `${i * 0.035}s`;
        });
        charGroups.push({ el, chars });
    });

    // ================================================================
    // 2. 通用入场观察器
    // ================================================================
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            if (entry.target.hasAttribute('data-reveal-chars')) {
                const group = charGroups.find((g) => g.el === entry.target);
                if (group) group.chars.forEach((c) => c.classList.add('on'));
            } else {
                entry.target.classList.add('on');
            }
            io.unobserve(entry.target);
        });
    }, { threshold: 0.25 });

    document.querySelectorAll('.reveal-fade, [data-reveal-chars]').forEach((el) => io.observe(el));

    // ================================================================
    // 3. 进度轨道圆点
    // ================================================================
    cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'rail-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `跳转到案例 ${i + 1}`);
        dot.addEventListener('click', () => {
            // 将指定卡片滚动到舞台对应进度位置
            const target = stage.offsetTop + (i / Math.max(cards.length - 1, 1)) * (stage.offsetHeight - window.innerHeight);
            window.scrollTo({ top: target, behavior: 'smooth' });
        });
        railDotsBox.appendChild(dot);
    });
    const railDots = Array.from(railDotsBox.children);

    // ================================================================
    // 4. 滚动驱动主循环 (Scroll → Horizontal Flow)
    // ================================================================
    function measure() {
        const extra = track.scrollWidth - window.innerWidth;
        state.maxTrackX = Math.max(extra, 0);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function updateFlow() {
        const stageRect = stage.getBoundingClientRect();
        const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1);
        const progress = Math.min(Math.max(-stageRect.top / scrollable, 0), 1);

        const targetX = progress * state.maxTrackX;
        state.trackX = lerp(state.trackX, targetX, 0.09);

        // 速度形变：滚动越快 → 轻微倾斜 + 挤压
        const v = state.smoothVelocity;
        const skewX = Math.max(Math.min(v * 0.045, 6), -6);
        const scaleY = 1 - Math.min(Math.abs(v) * 0.0012, 0.03);

        track.style.transform =
            `translate3d(${-state.trackX}px, 0, 0) skewX(${skewX.toFixed(3)}deg) scaleY(${scaleY.toFixed(4)})`;

        // 进度条与 HUD
        railFill.style.width = `${(progress * 100).toFixed(1)}%`;

        const active = Math.min(
            cards.length - 1,
            Math.round(progress * (cards.length - 1))
        );
        if (active !== state.activeCase) {
            state.activeCase = active;
            railDots.forEach((d, i) => d.classList.toggle('active', i === active));
            hudCase.textContent = String(active + 1).padStart(2, '0');
            railLabel.textContent = `CASE ${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        }

        // 卡片内视差编号（反向轻移）
        cards.forEach((card) => {
            const num = card.querySelector('.case-number');
            if (!num) return;
            const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
            const offset = (cardCenter - window.innerWidth / 2) / window.innerWidth;
            num.style.transform = `translateX(${(-offset * 34).toFixed(1)}px)`;
        });
    }

    // ================================================================
    // 5. 滚动速度监听 + 顶栏隐现
    // ================================================================
    let lastY = window.scrollY;
    window.addEventListener(
        'scroll',
        () => {
            const y = window.scrollY;
            state.velocity = y - lastY;
            lastY = y;

            scrollHint.classList.toggle('faded', y > 80);
            topbar.classList.toggle('hidden-down', state.velocity > 6 && y > 200);
        },
        { passive: true }
    );

    // ================================================================
    // 6. 粒子流场背景 (Noise Flow Field Particles)
    // ================================================================
    let W = 0, H = 0;
    const particles = [];

    function resizeCanvas() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        measure();
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0,
                vy: 0,
                size: Math.random() * 1.6 + 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    // 轻量伪噪声（三角函数叠加，零依赖）
    function noise(x, y, t) {
        return (
            Math.sin(x * 0.0021 + t * 0.4) +
            Math.cos(y * 0.0018 - t * 0.3) +
            Math.sin((x + y) * 0.0011 + t * 0.2)
        ) / 3;
    }

    function accentColor(alpha) {
        const styles = getComputedStyle(body);
        return styles.getPropertyValue('--accent').trim() || '#5eead4';
    }

    let flowT = 0;
    function updateParticles() {
        ctx.clearRect(0, 0, W, H);
        const color = accentColor();
        const boost = 1 + Math.min(Math.abs(state.smoothVelocity) * 0.08, 4);

        ctx.fillStyle = color;
        for (const p of particles) {
            const n = noise(p.x, p.y, flowT);
            p.vx = Math.cos(n * Math.PI) * 0.55 * boost;
            p.vy = Math.sin(n * Math.PI) * 0.55 * boost - Math.abs(state.smoothVelocity) * 0.012;

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;

            const tw = 0.35 + 0.3 * Math.sin(flowT * 2 + p.phase);
            ctx.globalAlpha = Math.max(tw * 0.5, 0.06);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ================================================================
    // 7. 主渲染循环 (RAF)
    // ================================================================
    function loop() {
        state.smoothVelocity = lerp(state.smoothVelocity, state.velocity, 0.12);
        state.velocity *= 0.86; // 速度自然衰减

        hudVelocity.textContent = Math.abs(state.smoothVelocity).toFixed(2).padStart(5, '0');

        flowT += 0.004;
        if (!state.reducedMotion) updateParticles();
        updateFlow();

        requestAnimationFrame(loop);
    }

    // ================================================================
    // 8. 氛围配色切换
    // ================================================================
    moodSwitch.addEventListener('click', (e) => {
        const dot = e.target.closest('.mood-dot');
        if (!dot) return;
        const mood = dot.dataset.mood;
        body.dataset.mood = mood;
        moodSwitch.querySelectorAll('.mood-dot').forEach((d) =>
            d.classList.toggle('active', d === dot)
        );
    });

    // 初始高亮当前配色
    const currentMood = body.dataset.mood || 'aurora';
    moodSwitch.querySelectorAll('.mood-dot').forEach((d) =>
        d.classList.toggle('active', d.dataset.mood === currentMood)
    );

    // ================================================================
    // 9. 回到起点
    // ================================================================
    btnBack.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ================================================================
    // 10. 启动
    // ================================================================
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

    resizeCanvas();
    initParticles();
    measure();
    requestAnimationFrame(loop);

    // 字体加载完成后重新测量（避免轨道宽度误差）
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measure);
    }
})();
