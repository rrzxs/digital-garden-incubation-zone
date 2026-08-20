/**
 * Variant Refresh Gallery · 变体刷新画廊
 * 核心交互：变体生成引擎 + 非线性级联入场/退场 + FLIP 物理重排 + 3D 倾斜光泽
 */
(function () {
    'use strict';

    // === DOM Elements ===
    const grid = document.getElementById('gallery-grid');
    const refreshBtn = document.getElementById('refresh-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const themeSwitcher = document.getElementById('theme-switcher');
    const ripple = document.getElementById('refresh-ripple');
    const cursorGlow = document.getElementById('cursor-glow');
    const teleGen = document.getElementById('tele-gen');
    const teleCount = document.getElementById('tele-count');
    const telePalette = document.getElementById('tele-palette');

    // === 变体语料库 ===
    const LEXICON = {
        prefix: ['流体', '微晶', '折叠', '共振', '溢出', '折射', '磁悬', '潮汐', '棱镜', '脉冲', '雾蚀', '弦振'],
        core: ['光谱', '回廊', '花园', '织体', '剧场', '残响', '群岛', '回路', '秘境', '星丛', '浮屿', '迷宫'],
        palettes: [
            { name: 'NEBULA', a: '139,92,246', b: '34,211,238' },
            { name: 'EMBER', a: '251,113,133', b: '251,146,60' },
            { name: 'TIDE', a: '56,89,199', b: '45,212,191' },
            { name: 'FLORA', a: '52,211,153', b: '163,230,53' },
            { name: 'IRIS', a: '217,70,239', b: '99,102,241' },
            { name: 'SOLAR', a: '250,204,21', b: '236,72,153' }
        ],
        tags: ['FLUID', 'GLASS', 'SPRING', 'MESH', 'GRADIENT', 'SHARD', 'PRISM', 'WAVE', 'ORBIT', 'ECHO', 'BLOOM', 'DRIFT'],
        descs: [
            '流体渐变在微晶容器中缓慢呼吸，边缘析出细碎光尘。',
            '弹簧阻尼驱动形变回弹，静止时仍在微微颤动。',
            '多层折射叠加出不确定的深度，注视越久越幽深。',
            '噪声场扰动粒子沿岸线漂移，留下转瞬的轨迹。',
            '光线穿过棱面被拆解成光谱，随视角缓慢重组。',
            '涟漪从中心扩散，每一次回响都柔软地衰减。'
        ]
    };

    // === 状态 ===
    const state = {
        generation: 0,
        count: 8,
        variants: [],
        busy: false
    };

    // === 工具 ===
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // === 变体生成引擎 ===
    function generateVariant(index) {
        const palette = rand(LEXICON.palettes);
        const angle = randInt(15, 165);
        return {
            id: `V-${String(randInt(100, 999))}`,
            title: `${rand(LEXICON.prefix)}·${rand(LEXICON.core)}`,
            desc: rand(LEXICON.descs),
            palette,
            angle,
            tags: Array.from({ length: randInt(2, 3) }, () => rand(LEXICON.tags)).filter((t, i, a) => a.indexOf(t) === i),
            span: Math.random() > 0.82 ? 'span 2' : 'span 1'
        };
    }

    function generateBatch() {
        return Array.from({ length: state.count }, (_, i) => generateVariant(i));
    }

    // === 卡片渲染 ===
    function createCardEl(variant, index) {
        const el = document.createElement('article');
        el.className = 'variant-card entering';
        el.style.transitionDelay = `${index * 55}ms`;
        el.innerHTML = `
            <div class="variant-swatch" style="background: linear-gradient(${variant.angle}deg, rgba(${variant.palette.a}, 0.85), rgba(${variant.palette.b}, 0.85))"></div>
            <div class="variant-id"><span>${variant.id}</span><span>${variant.palette.name}</span></div>
            <h3 class="variant-title">${variant.title}</h3>
            <p class="variant-desc">${variant.desc}</p>
            <div class="variant-tags">
                ${variant.tags.map((t) => `<span class="variant-tag" style="--tc:${variant.palette.b}">${t}</span>`).join('')}
            </div>
        `;
        bindCardInteractions(el);
        return el;
    }

    function renderBatch(variants) {
        grid.innerHTML = '';
        variants.forEach((v, i) => {
            const el = createCardEl(v, i);
            if (v.span === 'span 2') el.style.gridColumn = v.span;
            grid.appendChild(el);
            // 级联入场（非线性曲线在 CSS 中定义）
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.classList.remove('entering');
                el.classList.add('entered');
                scrambleTitle(el.querySelector('.variant-title'), v.title, i * 55);
            }));
        });
    }

    // === 乱码揭示标题 ===
    const GLYPHS = '▚▞█▓▒░◇◈01#$%&';
    function scrambleTitle(el, target, delay) {
        const start = performance.now() + delay;
        const duration = 620;
        function tick(now) {
            const t = (now - start) / duration;
            if (t < 0) { requestAnimationFrame(tick); return; }
            if (t >= 1) { el.textContent = target; return; }
            const revealed = Math.floor(t * target.length);
            el.textContent = target.slice(0, revealed) +
                target.slice(revealed).split('').map((c) => c === '·' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // === 刷新变体（退场 → 涟漪 → 新批次入场） ===
    async function refreshVariants() {
        if (state.busy) return;
        state.busy = true;
        state.generation += 1;

        refreshBtn.classList.add('spin');
        setTimeout(() => refreshBtn.classList.remove('spin'), 950);

        ripple.classList.remove('play');
        void ripple.offsetWidth;
        ripple.classList.add('play');

        const cards = grid.querySelectorAll('.variant-card');
        cards.forEach((card, i) => {
            card.style.transitionDelay = `${(cards.length - i) * 35}ms`;
            card.classList.remove('entered');
            card.classList.add('leaving');
        });

        await wait(cards.length * 35 + 480);
        state.variants = generateBatch();
        renderBatch(state.variants);
        updateTelemetry();

        await wait(state.count * 55 + 650);
        state.busy = false;
    }

    // === FLIP 物理重组 ===
    async function shuffleVariants() {
        if (state.busy || !state.variants.length) return;
        state.busy = true;

        // First: 记录初始位置
        const cards = [...grid.querySelectorAll('.variant-card')];
        const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));

        // 洗牌
        const shuffled = [...state.variants];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        state.variants = shuffled;
        grid.innerHTML = '';
        shuffled.forEach((v, i) => {
            const el = createCardEl(v, i);
            el.classList.remove('entering');
            el.classList.add('entered');
            if (v.span === 'span 2') el.style.gridColumn = v.span;
            grid.appendChild(el);
        });

        // Invert: 计算位移并反向应用
        const nextCards = [...grid.querySelectorAll('.variant-card')];
        nextCards.forEach((el) => {
            const prev = first.get(el);
            if (!prev) return;
            const now = el.getBoundingClientRect();
            const dx = prev.left - now.left;
            const dy = prev.top - now.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            el.animate(
                [
                    { transform: `translate(${dx}px, ${dy}px) scale(0.96)`, filter: 'blur(4px)' },
                    { transform: 'translate(0, 0) scale(1)', filter: 'blur(0)' }
                ],
                { duration: 720, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards', delay: randInt(0, 120) }
            );
        });

        await wait(860);
        state.busy = false;
    }

    // === 卡片交互：3D 倾斜 + 光泽跟随 ===
    function bindCardInteractions(el) {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            el.style.setProperty('--gx', `${px * 100}%`);
            el.style.setProperty('--gy', `${py * 100}%`);
            const tiltX = (py - 0.5) * -8;
            const tiltY = (px - 0.5) * 10;
            el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
            el.style.boxShadow = '0 22px 48px rgba(0,0,0,0.4)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
            el.style.boxShadow = '';
        });
    }

    // === 光标辉光（惯性跟随） ===
    const glow = { x: window.innerWidth / 2, y: window.innerHeight / 2, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
        glow.tx = e.clientX;
        glow.ty = e.clientY;
    });
    (function glowLoop() {
        glow.x += (glow.tx - glow.x) * 0.08;
        glow.y += (glow.ty - glow.y) * 0.08;
        cursorGlow.style.left = `${glow.x}px`;
        cursorGlow.style.top = `${glow.y}px`;
        requestAnimationFrame(glowLoop);
    })();

    // === 主题切换 ===
    themeSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-btn');
        if (!btn) return;
        themeSwitcher.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.dataset.theme = btn.dataset.theme;
        telePalette.textContent = btn.dataset.theme.toUpperCase();
    });

    // === 遥测更新 ===
    function updateTelemetry() {
        teleGen.textContent = `#${String(state.generation).padStart(3, '0')}`;
        teleCount.textContent = String(state.variants.length);
    }

    // === 事件绑定 ===
    refreshBtn.addEventListener('click', refreshVariants);
    shuffleBtn.addEventListener('click', shuffleVariants);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') refreshVariants();
        if (e.key === 's' || e.key === 'S') shuffleVariants();
    });

    // === 启动 ===
    state.generation = 1;
    state.variants = generateBatch();
    renderBatch(state.variants);
    updateTelemetry();
    telePalette.textContent = 'AURORA';
})();
