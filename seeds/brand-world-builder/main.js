/**
 * Brand World Builder — 品牌世界铸造器
 *
 * 五维 DNA 实时铸炼整个世界的呼吸：
 *   COLOR  · 色彩  — 驱动世界色相、坩埚核心光晕
 *   TYPE   · 字体  — 驱动显示字族、字重、字距
 *   SHAPE  · 几何  — 驱动核心形态、圆角、旋转
 *   MOOD   · 氛围  — 驱动流体速度、背景饱和
 *   RHYTHM · 音律  — 驱动粒子节律、呼吸周期
 *
 * 维护者: EDEN
 */

(function () {
    'use strict';

    // =====================================================================
    // === DOM Elements ===
    // =====================================================================

    const body = document.body;
    const stage = document.getElementById('stage');
    const crucibleWrap = document.getElementById('crucible-wrap');
    const crucible = document.getElementById('crucible');
    const crucibleCore = document.getElementById('crucible-core');
    const crucibleMark = document.getElementById('crucible-mark');
    const crucibleAura = document.getElementById('crucible-aura');
    const crucibleLabel = document.getElementById('crucible-label');
    const dnaShelf = document.getElementById('dna-shelf');
    const dnaTabs = document.getElementById('dna-tabs');
    const paletteToggle = document.getElementById('palette-toggle');
    const cursorGlow = document.getElementById('cursor-glow');
    const dropHint = document.getElementById('drop-hint');
    const specimen = document.getElementById('specimen');
    const specLogo = document.getElementById('spec-logo');
    const specTag = document.getElementById('spec-tag');
    const specMeta = document.getElementById('spec-meta');
    const specShape = document.getElementById('spec-shape');
    const toastEl = document.getElementById('toast');
    const hudFps = document.getElementById('hud-fps');
    const hudDensity = document.getElementById('hud-density');
    const hudSoul = document.getElementById('hud-soul');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnReset = document.getElementById('btn-reset');
    const particleCanvas = document.getElementById('particle-layer');
    const pctx = particleCanvas.getContext('2d');

    // =====================================================================
    // === DNA Library — 五维元素定义 ===
    // =====================================================================

    /**
     * 每个 DNA 元素携带一个 `apply(state)` 函数，将自身属性并入世界状态。
     * 颜色均以 HSL 描述，便于跨调色板协同。
     */

    const DNA = {
        color: [
            {
                id: 'amber', name: 'AMBER', glyph: '◐', hue: 38, sat: 92, light: 58,
                coreColor: '#fff7e0', apply: (s) => { s.hue = 38; s.sat = 92; s.light = 58; s.coreColor = '#fff7e0'; }
            },
            {
                id: 'magenta', name: 'PULSE', glyph: '◑', hue: 326, sat: 88, light: 62,
                coreColor: '#ffe8f5', apply: (s) => { s.hue = 326; s.sat = 88; s.light = 62; s.coreColor = '#ffe8f5'; }
            },
            {
                id: 'cyan', name: 'TIDE', glyph: '◒', hue: 188, sat: 90, light: 56,
                coreColor: '#e0f9ff', apply: (s) => { s.hue = 188; s.sat = 90; s.light = 56; s.coreColor = '#e0f9ff'; }
            },
            {
                id: 'emerald', name: 'VERDE', glyph: '◓', hue: 152, sat: 78, light: 52,
                coreColor: '#e0fff0', apply: (s) => { s.hue = 152; s.sat = 78; s.light = 52; s.coreColor = '#e0fff0'; }
            },
            {
                id: 'crimson', name: 'EMBER', glyph: '◔', hue: 8, sat: 88, light: 56,
                coreColor: '#ffe8e0', apply: (s) => { s.hue = 8; s.sat = 88; s.light = 56; s.coreColor = '#ffe8e0'; }
            },
            {
                id: 'violet', name: 'NEBULA', glyph: '◕', hue: 268, sat: 78, light: 66,
                coreColor: '#f0e8ff', apply: (s) => { s.hue = 268; s.sat = 78; s.light = 66; s.coreColor = '#f0e8ff'; }
            }
        ],
        type: [
            {
                id: 'display', name: 'DISPLAY', glyph: 'Aa', font: "'Outfit', sans-serif", weight: 700, spacing: '-0.03em', letter: '-0.02em',
                apply: (s) => { s.font = "'Outfit', sans-serif"; s.weight = 700; s.spacing = '-0.03em'; s.letter = '-0.02em'; }
            },
            {
                id: 'editorial', name: 'EDITOR', glyph: 'Aa', font: "'Inter', sans-serif", weight: 300, spacing: '0em', letter: '0em',
                apply: (s) => { s.font = "'Inter', sans-serif"; s.weight = 300; s.spacing = '0em'; s.letter = '0em'; }
            },
            {
                id: 'mono', name: 'MONO', glyph: 'Aa', font: "'Share Tech Mono', monospace", weight: 400, spacing: '0.02em', letter: '0.04em',
                apply: (s) => { s.font = "'Share Tech Mono', monospace"; s.weight = 400; s.spacing = '0.02em'; s.letter = '0.04em'; }
            },
            {
                id: 'thin', name: 'WHISPER', glyph: 'Aa', font: "'Outfit', sans-serif", weight: 200, spacing: '0.04em', letter: '0.08em',
                apply: (s) => { s.font = "'Outfit', sans-serif"; s.weight = 200; s.spacing = '0.04em'; s.letter = '0.08em'; }
            },
            {
                id: 'heavy', name: 'IMPACT', glyph: 'Aa', font: "'Inter', sans-serif", weight: 900, spacing: '-0.04em', letter: '-0.03em',
                apply: (s) => { s.font = "'Inter', sans-serif"; s.weight = 900; s.spacing = '-0.04em'; s.letter = '-0.03em'; }
            }
        ],
        shape: [
            { id: 'sphere', name: 'SPHERE', glyph: '●', radius: '50%', rotation: '0deg',    mark: '●', apply: (s) => { s.radius = '50%';  s.rotation = '0deg';   s.mark = '●'; } },
            { id: 'crystal', name: 'CRYST', glyph: '◆', radius: '24%', rotation: '45deg',   mark: '◆', apply: (s) => { s.radius = '24%';  s.rotation = '45deg';  s.mark = '◆'; } },
            { id: 'hex', name: 'HEX', glyph: '⬡', radius: '32%', rotation: '0deg',          mark: '⬡', apply: (s) => { s.radius = '32%';  s.rotation = '0deg';   s.mark = '⬡'; } },
            { id: 'blade', name: 'BLADE', glyph: '◢', radius: '8%',  rotation: '0deg',       mark: '◢', apply: (s) => { s.radius = '8%';   s.rotation = '0deg';   s.mark = '◢'; } },
            { id: 'fluid', name: 'BLOB', glyph: '◯', radius: '62%', rotation: '-8deg',      mark: '◯', apply: (s) => { s.radius = '62%';  s.rotation = '-8deg';  s.mark = '◯'; } },
            { id: 'star', name: 'STAR', glyph: '✦', radius: '18%', rotation: '0deg',         mark: '✦', apply: (s) => { s.radius = '18%';  s.rotation = '0deg';   s.mark = '✦'; } }
        ],
        mood: [
            { id: 'calm', name: 'CALM', glyph: '≈', speed: 36, particleSpeed: 0.4, density: 60,  tag: '— drift in stillness —',   apply: (s) => { s.motionSpeed = 36; s.particleSpeed = 0.4; s.density = 60;  s.tag = '— drift in stillness —'; } },
            { id: 'balanced', name: 'BALANCE', glyph: '∿', speed: 26, particleSpeed: 0.8, density: 100, tag: '— steady breath of cosmos —', apply: (s) => { s.motionSpeed = 26; s.particleSpeed = 0.8; s.density = 100; s.tag = '— steady breath of cosmos —'; } },
            { id: 'vivid', name: 'VIVID', glyph: '≋', speed: 16, particleSpeed: 1.4, density: 160, tag: '— electrified presence —', apply: (s) => { s.motionSpeed = 16; s.particleSpeed = 1.4; s.density = 160; s.tag = '— electrified presence —'; } },
            { id: 'frenetic', name: 'STORM', glyph: '⥌', speed: 9, particleSpeed: 2.4, density: 220, tag: '— restless horizon —',     apply: (s) => { s.motionSpeed = 9;  s.particleSpeed = 2.4; s.density = 220; s.tag = '— restless horizon —'; } }
        ],
        rhythm: [
            { id: 'pulse', name: 'PULSE', glyph: '♪', period: 4000, particleMode: 'pulse', apply: (s) => { s.period = 4000; s.particleMode = 'pulse'; } },
            { id: 'wave', name: 'WAVE', glyph: '〰', period: 6000, particleMode: 'wave', apply: (s) => { s.period = 6000; s.particleMode = 'wave'; } },
            { id: 'chaos', name: 'CHAOS', glyph: '✺', period: 1800, particleMode: 'chaos', apply: (s) => { s.period = 1800; s.particleMode = 'chaos'; } },
            { id: 'drone', name: 'DRONE', glyph: '∞', period: 9000, particleMode: 'drone', apply: (s) => { s.period = 9000; s.particleMode = 'drone'; } }
        ]
    };

    const DIMENSIONS = ['color', 'type', 'shape', 'mood', 'rhythm'];
    const DIM_LABELS = { color: '色彩', type: '字体', shape: '几何', mood: '氛围', rhythm: '音律' };

    // =====================================================================
    // === World State ===
    // =====================================================================

    const defaultState = {
        // COLOR
        hue: 38, sat: 92, light: 58, coreColor: '#fff7e0',
        // TYPE
        font: "'Outfit', sans-serif", weight: 600, spacing: '-0.02em', letter: '0em',
        // SHAPE
        radius: '38%', rotation: '0deg', mark: '◈',
        // MOOD
        motionSpeed: 26, particleSpeed: 0.8, density: 100, tag: '— forge the unseen —',
        // RHYTHM
        period: 5000, particleMode: 'wave'
    };

    let worldState = Object.assign({}, defaultState);
    let forgedDNA = {}; // dimension -> dna id
    let activeDimension = 'color';
    let particleRGB = [251, 191, 36];
    let targetParticleRGB = [251, 191, 36];

    // =====================================================================
    // === HSL → RGB ===
    // =====================================================================

    function hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const k = (n) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    // =====================================================================
    // === DNA Shelf Rendering ===
    // =====================================================================

    function renderShelf(dimension) {
        activeDimension = dimension;
        const items = DNA[dimension];
        dnaShelf.innerHTML = '';

        // mark active tab
        dnaTabs.querySelectorAll('.dna-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.dimension === dimension);
        });

        items.forEach((item, idx) => {
            const orb = document.createElement('div');
            orb.className = 'dna-orb';
            orb.dataset.id = item.id;
            orb.dataset.dimension = dimension;
            orb.style.animationDelay = (idx * 0.05) + 's';

            // color the orb
            let color, glow;
            if (dimension === 'color') {
                color = `hsl(${item.hue}, ${item.sat}%, ${item.light}%)`;
                glow = `hsla(${item.hue}, ${item.sat}%, ${item.light}%, 0.4)`;
            } else {
                color = `var(--accent)`;
                glow = `var(--accent-glow)`;
            }
            orb.style.setProperty('--orb-color', color);
            orb.style.setProperty('--orb-glow', glow);

            // active state if already forged
            if (forgedDNA[dimension] === item.id) orb.classList.add('active');

            orb.innerHTML = `
                <span class="orb-glyph">${item.glyph}</span>
                <span class="orb-name">${item.name}</span>
            `;

            orb.addEventListener('click', (e) => {
                if (orb._wasDragging) { orb._wasDragging = false; return; }
                forgeDNA(dimension, item, false);
            });

            attachDrag(orb, dimension, item);

            dnaShelf.appendChild(orb);
        });
    }

    // =====================================================================
    // === Drag & Drop (custom ghost, works on touch too) ===
    // =====================================================================

    function attachDrag(orb, dimension, item) {
        let startX = 0, startY = 0;
        let ghost = null;
        let dragging = false;
        let pointerId = null;

        function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return;
            startX = e.clientX;
            startY = e.clientY;
            pointerId = e.pointerId;
            try { orb.setPointerCapture(pointerId); } catch (_) {}
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            e.preventDefault();
        }

        function onPointerMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const dist = Math.hypot(dx, dy);

            if (!dragging && dist > 6) {
                dragging = true;
                orb._wasDragging = true;
                body.classList.add('dragging');
                ghost = orb.cloneNode(true);
                ghost.classList.add('ghost');
                ghost.style.width = orb.offsetWidth + 'px';
                ghost.style.height = orb.offsetHeight + 'px';
                ghost.style.left = (e.clientX - orb.offsetWidth / 2) + 'px';
                ghost.style.top = (e.clientY - orb.offsetHeight / 2) + 'px';
                document.body.appendChild(ghost);
            }

            if (dragging && ghost) {
                ghost.style.left = (e.clientX - orb.offsetWidth / 2) + 'px';
                ghost.style.top = (e.clientY - orb.offsetHeight / 2) + 'px';

                // hit-test crucible
                const overCrucible = isPointOver(e.clientX, e.clientY, crucible);
                crucible.classList.toggle('drag-over', overCrucible);
                cursorGlow.classList.toggle('charged', overCrucible);
            }
        }

        function onPointerUp(e) {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            try { orb.releasePointerCapture(pointerId); } catch (_) {}

            if (dragging) {
                const overCrucible = isPointOver(e.clientX, e.clientY, crucible);
                if (overCrucible) {
                    forgeDNA(dimension, item, true);
                }
                if (ghost) { ghost.remove(); ghost = null; }
                body.classList.remove('dragging');
                crucible.classList.remove('drag-over');
                cursorGlow.classList.remove('charged');
                // clear was-dragging flag after a tick so click doesn't fire
                setTimeout(() => { orb._wasDragging = false; }, 50);
            }
            dragging = false;
        }

        orb.addEventListener('pointerdown', onPointerDown);
    }

    function isPointOver(x, y, el) {
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    // =====================================================================
    // === Forge — apply a DNA element to the world ===
    // =====================================================================

    function forgeDNA(dimension, item, viaDrag) {
        forgedDNA[dimension] = item.id;

        // mark active orb
        dnaShelf.querySelectorAll('.dna-orb').forEach((o) => {
            o.classList.toggle('active', o.dataset.id === item.id);
        });

        // apply to world state via the item's apply fn
        item.apply(worldState);

        // burst feedback
        spawnBurst();
        cruciblePulse();
        applyWorld();
        updateHUD();
        showToast(`铸入 <span class="toast-accent">${DIM_LABELS[dimension]} · ${item.name}</span>${viaDrag ? ' · 拖入' : ' · 点选'}`);

        if (Object.keys(forgedDNA).length >= 1) {
            dropHint.classList.add('hidden');
            crucibleWrap.classList.add('charged');
            crucible.classList.add('charged');
            specimen.classList.add('live');
        }
    }

    // =====================================================================
    // === Apply World State to CSS ===
    // =====================================================================

    function applyWorld() {
        const root = document.documentElement.style;

        // COLOR
        root.setProperty('--world-hue', worldState.hue);
        root.setProperty('--world-sat', worldState.sat + '%');
        root.setProperty('--world-light', worldState.light + '%');
        const accent = `hsl(${worldState.hue}, ${worldState.sat}%, ${worldState.light}%)`;
        const accentSecondary = `hsl(${(worldState.hue + 24) % 360}, ${worldState.sat}%, ${Math.max(28, worldState.light - 14)}%)`;
        const accentTertiary = `hsl(${(worldState.hue + 320) % 360}, ${worldState.sat}%, ${Math.max(28, worldState.light - 18)}%)`;
        const accentGlow = `hsla(${worldState.hue}, ${worldState.sat}%, ${worldState.light}%, 0.24)`;
        const crucibleGlow = `hsla(${worldState.hue}, ${worldState.sat}%, ${worldState.light}%, 0.55)`;
        const particleGlow = `hsla(${worldState.hue}, ${worldState.sat}%, ${worldState.light}%, 0.16)`;
        root.setProperty('--accent', accent);
        root.setProperty('--accent-secondary', accentSecondary);
        root.setProperty('--accent-tertiary', accentTertiary);
        root.setProperty('--accent-glow', accentGlow);
        root.setProperty('--crucible-glow', crucibleGlow);
        root.setProperty('--crucible-core-color', worldState.coreColor);

        // particle rgb target
        targetParticleRGB = hslToRgb(worldState.hue, worldState.sat, worldState.light);

        // TYPE
        root.setProperty('--world-font', worldState.font);
        root.setProperty('--world-weight', worldState.weight);
        root.setProperty('--world-spacing', worldState.spacing);
        root.setProperty('--world-letter', worldState.letter);

        // SHAPE
        root.setProperty('--world-shape-radius', worldState.radius);
        root.setProperty('--world-shape-rotation', worldState.rotation);
        crucibleMark.textContent = worldState.mark;

        // MOOD
        root.setProperty('--world-motion-speed', worldState.motionSpeed + 's');

        // Specimen
        specLogo.textContent = worldState.mark === '●' ? 'EDEN' : worldState.mark === '◆' ? 'EDEN' : 'EDEN';
        specTag.textContent = worldState.tag;
        specMeta.textContent = `Soul · ${soulCode()}`;

        // blobs re-tint from world hue
        root.setProperty('--blob-1', `hsl(${worldState.hue}, ${worldState.sat}%, ${Math.max(28, worldState.light - 18)}%)`);
        root.setProperty('--blob-2', `hsl(${(worldState.hue + 24) % 360}, ${worldState.sat}%, ${Math.max(28, worldState.light - 14)}%)`);
        root.setProperty('--blob-3', `hsl(${(worldState.hue + 320) % 360}, ${worldState.sat}%, ${Math.max(26, worldState.light - 22)}%)`);
        root.setProperty('--blob-4', `hsl(${(worldState.hue + 200) % 360}, ${Math.max(40, worldState.sat - 10)}%, ${Math.max(28, worldState.light - 16)}%)`);
    }

    function soulCode() {
        const ids = DIMENSIONS.map((d) => forgedDNA[d] || '_').join('');
        let hash = 0;
        for (let i = 0; i < ids.length; i++) {
            hash = (hash * 31 + ids.charCodeAt(i)) >>> 0;
        }
        return (hash % 4096).toString(16).toUpperCase().padStart(3, '0');
    }

    // =====================================================================
    // === Burst & Pulse Feedback ===
    // =====================================================================

    function spawnBurst() {
        const count = 14;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'forge-burst';
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 80 + Math.random() * 80;
            p.style.setProperty('--bx', (Math.cos(angle) * dist) + 'px');
            p.style.setProperty('--by', (Math.sin(angle) * dist) + 'px');
            p.style.background = `hsl(${worldState.hue}, ${worldState.sat}%, ${Math.min(80, worldState.light + 12)}%)`;
            p.style.boxShadow = `0 0 12px hsla(${worldState.hue}, ${worldState.sat}%, ${worldState.light}%, 0.6)`;
            crucible.appendChild(p);
            setTimeout(() => p.remove(), 950);
        }
    }

    function cruciblePulse() {
        crucibleCore.style.transform = `rotate(${worldState.rotation}) scale(1.18)`;
        setTimeout(() => {
            crucibleCore.style.transform = '';
        }, 240);
    }

    // =====================================================================
    // === HUD ===
    // =====================================================================

    function updateHUD() {
        const forgedCount = Object.keys(forgedDNA).length;
        hudDensity.textContent = forgedCount;
        hudSoul.textContent = forgedCount > 0 ? soulCode() : '—';
    }

    // =====================================================================
    // === Toast ===
    // =====================================================================

    let toastTimer = null;
    function showToast(html) {
        toastEl.innerHTML = html;
        toastEl.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('visible');
        }, 1800);
    }

    // =====================================================================
    // === Random Forge ===
    // =====================================================================

    function randomForge() {
        DIMENSIONS.forEach((dim) => {
            const items = DNA[dim];
            const item = items[Math.floor(Math.random() * items.length)];
            forgedDNA[dim] = item.id;
            item.apply(worldState);
        });
        spawnBurst();
        cruciblePulse();
        applyWorld();
        updateHUD();
        // refresh shelf active
        renderShelf(activeDimension);
        dropHint.classList.add('hidden');
        crucibleWrap.classList.add('charged');
        crucible.classList.add('charged');
        specimen.classList.add('live');
        showToast(`随机铸炼 · <span class="toast-accent">SOUL ${soulCode()}</span>`);
    }

    function resetForge() {
        forgedDNA = {};
        worldState = Object.assign({}, defaultState);
        particleRGB = [251, 191, 36];
        targetParticleRGB = [251, 191, 36];
        applyWorld();
        renderShelf(activeDimension);
        updateHUD();
        dropHint.classList.remove('hidden');
        crucibleWrap.classList.remove('charged');
        crucible.classList.remove('charged');
        specimen.classList.remove('live');
        crucibleMark.textContent = defaultState.mark;
        specTag.textContent = defaultState.tag;
        specMeta.textContent = 'Soul · 000';
        showToast('坩埚已清空 · <span class="toast-accent">重新铸造</span>');
    }

    // =====================================================================
    // === Tabs & Palette ===
    // =====================================================================

    dnaTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.dna-tab');
        if (!tab) return;
        renderShelf(tab.dataset.dimension);
    });

    paletteToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.palette-btn');
        if (!btn) return;
        paletteToggle.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const palette = btn.dataset.palette;
        body.classList.remove('palette-ember', 'palette-nebula', 'palette-abyss', 'palette-frost');
        body.classList.add('palette-' + palette);
        // For palettes, we let CSS variables drive, but reset particle target to palette accent
        const computed = getComputedStyle(body);
        const rgb = computed.getPropertyValue('--particle-rgb').trim().split(',').map((x) => parseInt(x.trim(), 10));
        if (rgb.length === 3 && rgb.every((n) => !isNaN(n))) {
            targetParticleRGB = rgb;
        }
    });

    btnShuffle.addEventListener('click', randomForge);
    btnReset.addEventListener('click', resetForge);

    // =====================================================================
    // === Cursor Glow ===
    // =====================================================================

    let glowX = window.innerWidth / 2, glowY = window.innerHeight / 2;
    let glowTX = glowX, glowTY = glowY;

    window.addEventListener('pointermove', (e) => {
        glowTX = e.clientX;
        glowTY = e.clientY;
        cursorGlow.classList.add('visible');
    });
    window.addEventListener('pointerleave', () => {
        cursorGlow.classList.remove('visible');
    });

    // =====================================================================
    // === Particle Field ===
    // =====================================================================

    let particles = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = particleCanvas.width = window.innerWidth * dpr;
        H = particleCanvas.height = window.innerHeight * dpr;
        particleCanvas.style.width = window.innerWidth + 'px';
        particleCanvas.style.height = window.innerHeight + 'px';
        initParticles();
    }

    function initParticles() {
        particles = [];
        const count = worldState.density;
        for (let i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.4 * dpr,
            vy: (Math.random() - 0.5) * 0.4 * dpr,
            size: (0.6 + Math.random() * 2.2) * dpr,
            life: Math.random(),
            phase: Math.random() * Math.PI * 2
        };
    }

    function syncParticleCount() {
        const target = worldState.density;
        while (particles.length < target) particles.push(createParticle());
        if (particles.length > target) particles.length = target;
    }

    let lastT = performance.now();
    let fpsAcc = 0, fpsFrames = 0, fpsLast = lastT;

    function tick(now) {
        const dt = Math.min(48, now - lastT);
        lastT = now;

        // fps
        fpsFrames++;
        if (now - fpsLast > 500) {
            fpsAcc = Math.round((fpsFrames * 1000) / (now - fpsLast));
            hudFps.textContent = Math.min(120, fpsAcc);
            fpsFrames = 0;
            fpsLast = now;
        }

        // smooth cursor glow
        glowX += (glowTX - glowX) * 0.12;
        glowY += (glowTY - glowY) * 0.12;
        cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;

        // smooth particle rgb
        for (let i = 0; i < 3; i++) {
            particleRGB[i] += (targetParticleRGB[i] - particleRGB[i]) * 0.06;
        }

        // sync density
        syncParticleCount();

        // draw
        pctx.clearRect(0, 0, W, H);
        const t = now * 0.001;
        const speed = worldState.particleSpeed;
        const mode = worldState.particleMode;
        const periodPhase = (now % worldState.period) / worldState.period; // 0..1
        const breath = 0.5 + 0.5 * Math.sin(periodPhase * Math.PI * 2);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // motion by mode
            let mvx = 0, mvy = 0;
            if (mode === 'wave') {
                mvx = Math.cos(t * 0.6 + p.phase) * 0.3 * speed * dpr;
                mvy = Math.sin(t * 0.5 + p.phase * 1.3) * 0.3 * speed * dpr;
            } else if (mode === 'pulse') {
                const k = (0.6 + breath * 0.8);
                mvx = p.vx * k * speed;
                mvy = p.vy * k * speed;
            } else if (mode === 'chaos') {
                mvx = Math.sin(t * 1.4 + p.phase * 3.1) * 0.5 * speed * dpr;
                mvy = Math.cos(t * 1.1 + p.phase * 2.7) * 0.5 * speed * dpr;
            } else { // drone
                mvx = p.vx * 0.5 * speed;
                mvy = p.vy * 0.5 * speed;
            }

            p.x += mvx;
            p.y += mvy;

            // wrap
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;

            // gentle attraction to cursor when within range
            const cx = glowX * dpr, cy = glowY * dpr;
            const ddx = cx - p.x, ddy = cy - p.y;
            const dist2 = ddx * ddx + ddy * ddy;
            const range = 220 * dpr;
            if (dist2 < range * range) {
                const f = (1 - Math.sqrt(dist2) / range) * 0.4 * speed;
                p.x += ddx * f * 0.02;
                p.y += ddy * f * 0.02;
            }

            // alpha
            const alpha = (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.2 + p.phase))) * (0.5 + breath * 0.5);
            const r = Math.max(0.2, p.size * (0.7 + breath * 0.4));

            pctx.beginPath();
            pctx.fillStyle = `rgba(${Math.round(particleRGB[0])}, ${Math.round(particleRGB[1])}, ${Math.round(particleRGB[2])}, ${alpha})`;
            pctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            pctx.fill();
        }

        requestAnimationFrame(tick);
    }

    // =====================================================================
    // === Keyboard ===
    // =====================================================================

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'KeyS') { randomForge(); }
        if (e.code === 'KeyR') { resetForge(); }
        // dimension quick-switch 1-5
        const map = { Digit1: 'color', Digit2: 'type', Digit3: 'shape', Digit4: 'mood', Digit5: 'rhythm' };
        if (map[e.code]) renderShelf(map[e.code]);
    });

    // =====================================================================
    // === Boot ===
    // =====================================================================

    window.addEventListener('resize', resizeCanvas);

    renderShelf('color');
    resizeCanvas();
    applyWorld();
    updateHUD();
    requestAnimationFrame(tick);

    // gentle welcome toast
    setTimeout(() => {
        showToast('欢迎进入铸造器 · <span class="toast-accent">拖入 DNA 开始铸炼</span>');
    }, 700);

})();
