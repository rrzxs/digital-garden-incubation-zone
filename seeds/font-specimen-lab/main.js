/**
 * Font Specimen Lab — 字体样张实验室
 * 字重力场（邻近呼吸 / 正弦波流 / 静默平铺）+ 字形图鉴检视舱 + 尘埃粒子场
 * Vanilla JS / 免构建
 */
(() => {
    'use strict';

    // ═══════════════════════ DOM Elements ═══════════════════════
    const editor = document.getElementById('specimen-editor');
    const stage = document.getElementById('specimen-stage');
    const dustCanvas = document.getElementById('dust-canvas');
    const glyphGrid = document.getElementById('glyph-grid');
    const drawer = document.getElementById('inspector-drawer');
    const inspectorGlyph = document.getElementById('inspector-glyph');
    const inspectorWeight = document.getElementById('inspector-weight');
    const infoFamily = document.getElementById('info-family');
    const infoCode = document.getElementById('info-code');
    const infoWeightRead = document.getElementById('info-weight-read');
    const hudFamily = document.getElementById('hud-family');
    const hudWeight = document.getElementById('hud-weight');
    const hudSize = document.getElementById('hud-size');
    const hudTrack = document.getElementById('hud-track');

    // ═══════════════════════ State ═══════════════════════
    const state = {
        family: "'Outfit', sans-serif",
        familyName: 'Outfit',
        variable: true,
        size: 128,
        track: 0,
        baseWeight: 400,
        mode: 'proximity',
        mouse: { x: -9999, y: -9999 },
        time: 0,
        chars: [],
        weights: []
    };

    const SAMPLES = [
        'The quick brown fox',
        'Hamburgefonstiv 字',
        'Grumpy wizards make',
        'abcdefghijklmnopq',
        '五光十色的字迹',
        'Specimen No.7',
        'Rhythm & Contrast',
        '0123456789 ?!'
    ];

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&@#?!';

    // ═══════════════════════ 样张渲染 ═══════════════════════
    function renderEditor(text, { scramble = false } = {}) {
        editor.textContent = '';
        state.chars = [];
        state.weights = [];
        const frag = document.createDocumentFragment();
        for (const ch of text) {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch;
            if (scramble) {
                span.dataset.final = ch;
                span.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            frag.appendChild(span);
            state.chars.push(span);
            state.weights.push(state.baseWeight);
        }
        editor.appendChild(frag);
        applyStaticStyles();
        if (scramble) runScrambleReveal();
    }

    function applyStaticStyles() {
        editor.style.fontFamily = state.family;
        editor.style.fontSize = state.size + 'px';
        editor.style.letterSpacing = state.track + 'px';
        if (!state.variable) {
            editor.style.fontWeight = '400';
        } else {
            editor.style.fontWeight = '';
        }
        hudFamily.textContent = state.familyName;
        hudSize.textContent = 'S ' + state.size;
        hudTrack.textContent = 'T ' + state.track;
    }

    // 乱码揭示动画
    function runScrambleReveal() {
        const spans = state.chars.filter((s) => s.dataset.final);
        spans.forEach((span, i) => {
            let ticks = 0;
            const maxTicks = 6 + Math.floor(Math.random() * 8);
            const timer = setInterval(() => {
                ticks++;
                if (ticks >= maxTicks) {
                    span.textContent = span.dataset.final;
                    delete span.dataset.final;
                    clearInterval(timer);
                } else {
                    span.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                }
            }, 40 + i * 4);
        });
    }

    // ═══════════════════════ 字重力场主循环 ═══════════════════════
    const lerp = (a, b, t) => a + (b - a) * t;

    function tickField() {
        state.time += 0.016;

        if (state.mode === 'static') {
            for (let i = 0; i < state.chars.length; i++) {
                state.weights[i] = lerp(state.weights[i], state.baseWeight, 0.12);
            }
        } else if (state.mode === 'wave') {
            for (let i = 0; i < state.chars.length; i++) {
                const w = state.baseWeight + Math.sin(state.time * 2.2 - i * 0.55) * (state.variable ? 220 : 0);
                state.weights[i] = lerp(state.weights[i], state.baseWeight + Math.round(w - state.baseWeight), 0.18);
            }
        } else {
            // 邻近呼吸：光标距离驱动字重
            const stageRect = stage.getBoundingClientRect();
            for (let i = 0; i < state.chars.length; i++) {
                const span = state.chars[i];
                const r = span.getBoundingClientRect();
                const cx = r.left + r.width / 2 - stageRect.left;
                const cy = r.top + r.height / 2 - stageRect.top;
                const dx = state.mouse.x - cx;
                const dy = state.mouse.y - cy;
                const dist = Math.hypot(dx, dy);
                const radius = 320;
                let target = state.baseWeight;
                if (state.variable && dist < radius) {
                    const infl = Math.pow(1 - dist / radius, 1.6);
                    target = state.baseWeight + infl * 500;
                }
                state.weights[i] = lerp(state.weights[i], target, 0.16);
            }
        }

        for (let i = 0; i < state.chars.length; i++) {
            const w = Math.round(state.weights[i]);
            if (state.variable) {
                state.chars[i].style.setProperty('--w', w);
            }
        }
        hudWeight.textContent = 'W ' + Math.round(state.weights[0] || state.baseWeight);

        requestAnimationFrame(tickField);
    }

    // ═══════════════════════ 光标追踪 ═══════════════════════
    window.addEventListener('pointermove', (e) => {
        const rect = stage.getBoundingClientRect();
        state.mouse.x = e.clientX - rect.left;
        state.mouse.y = e.clientY - rect.top;
    });

    // ═══════════════════════ 字体切换 ═══════════════════════
    document.querySelectorAll('.family-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.family-btn').forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const fam = btn.dataset.family;
            state.familyName = fam.replace(/'/g, '');
            state.family = fam.startsWith("'") ? fam + ", monospace" : `'${fam}', sans-serif`;
            state.variable = fam !== "'Share Tech Mono'";
            applyStaticStyles();
            renderEditor(editor.textContent, { scramble: true });
            inspectorGlyph.style.fontFamily = state.family;
            infoFamily.textContent = state.familyName;
        });
    });

    // ═══════════════════════ 控制台 ═══════════════════════
    const ctlSize = document.getElementById('ctl-size');
    const ctlTrack = document.getElementById('ctl-track');
    const ctlWeight = document.getElementById('ctl-weight');
    const valSize = document.getElementById('val-size');
    const valTrack = document.getElementById('val-track');
    const valWeight = document.getElementById('val-weight');

    ctlSize.addEventListener('input', () => {
        state.size = +ctlSize.value;
        valSize.textContent = state.size;
        applyStaticStyles();
    });
    ctlTrack.addEventListener('input', () => {
        state.track = +ctlTrack.value;
        valTrack.textContent = state.track;
        applyStaticStyles();
    });
    ctlWeight.addEventListener('input', () => {
        state.baseWeight = +ctlWeight.value;
        valWeight.textContent = state.baseWeight;
        inspectorWeight.value = state.baseWeight;
        infoWeightRead.textContent = 'wght ' + state.baseWeight;
    });

    // 模式切换
    document.querySelectorAll('#mode-group .mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#mode-group .mode-btn').forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            state.mode = btn.dataset.mode;
        });
    });

    // 换一句样张
    document.getElementById('shuffle-btn').addEventListener('click', () => {
        let next;
        do {
            next = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
        } while (next === editor.textContent && SAMPLES.length > 1);
        renderEditor(next, { scramble: true });
    });

    // ═══════════════════════ 主题切换 ═══════════════════════
    document.querySelectorAll('.theme-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('active'));
            dot.classList.add('active');
            document.body.dataset.theme = dot.dataset.theme;
        });
    });

    // ═══════════════════════ 字形图鉴 ═══════════════════════
    function buildGlyphGrid() {
        const frag = document.createDocumentFragment();
        for (const ch of GLYPHS) {
            const cell = document.createElement('button');
            cell.className = 'glyph-cell';
            cell.style.fontFamily = state.family;
            cell.textContent = ch;
            cell.addEventListener('click', () => openInspector(ch));
            frag.appendChild(cell);
        }
        glyphGrid.appendChild(frag);
    }

    function openInspector(ch) {
        inspectorGlyph.style.fontFamily = state.family;
        inspectorGlyph.textContent = ch;
        const code = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        infoCode.textContent = 'U+' + code;
        infoFamily.textContent = state.familyName;
        inspectorWeight.value = state.baseWeight;
        infoWeightRead.textContent = 'wght ' + state.baseWeight;
        // 重启 pop 动画
        inspectorGlyph.style.animation = 'none';
        void inspectorGlyph.offsetWidth;
        inspectorGlyph.style.animation = '';
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
    }

    function closeInspector() {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('inspector-close').addEventListener('click', closeInspector);
    drawer.addEventListener('click', (e) => {
        if (e.target === drawer) closeInspector();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeInspector();
    });

    inspectorWeight.addEventListener('input', () => {
        inspectorGlyph.style.fontVariationSettings = `'wght' ${inspectorWeight.value}`;
        infoWeightRead.textContent = 'wght ' + inspectorWeight.value;
    });

    // ═══════════════════════ 编辑同步 ═══════════════════════
    let editDebounce;
    editor.addEventListener('input', () => {
        clearTimeout(editDebounce);
        editDebounce = setTimeout(() => {
            const text = editor.textContent || ' ';
            renderEditor(text);
            // 将光标放回末尾，保持编辑连续性
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }, 120);
    });

    // ═══════════════════════ 尘埃粒子场 ═══════════════════════
    function initDust() {
        const ctx = dustCanvas.getContext('2d');
        let particles = [];

        function resize() {
            dustCanvas.width = window.innerWidth;
            dustCanvas.height = window.innerHeight;
            particles = Array.from({ length: 70 }, () => ({
                x: Math.random() * dustCanvas.width,
                y: Math.random() * dustCanvas.height,
                r: Math.random() * 1.6 + 0.4,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.15,
                a: Math.random() * 0.35 + 0.08,
                ph: Math.random() * Math.PI * 2
            }));
        }

        function drawDust(t) {
            ctx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
            const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7dd3fc';
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) p.x = dustCanvas.width + 10;
                if (p.x > dustCanvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = dustCanvas.height + 10;
                if (p.y > dustCanvas.height + 10) p.y = -10;
                const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 + p.ph);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = accent;
                ctx.globalAlpha = p.a * twinkle;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            requestAnimationFrame(drawDust);
        }

        window.addEventListener('resize', resize);
        resize();
        requestAnimationFrame(drawDust);
    }

    // ═══════════════════════ 启动 ═══════════════════════
    renderEditor(SAMPLES[0], { scramble: true });
    buildGlyphGrid();
    initDust();
    requestAnimationFrame(tickField);
})();
