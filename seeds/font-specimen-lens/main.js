/**
 * Font Specimen Lens — 字体样张透镜
 * 弹簧物理透镜跟随 · Canvas 度量引擎 · 乱码重构字符网格 · 尘埃粒子场
 */
(function bootstrap() {
    'use strict';

    // === DOM Elements ===
    const wrap = document.getElementById('specimen-wrap');
    const specimenText = document.getElementById('specimen-text');
    const lens = document.getElementById('lens');
    const lensText = document.getElementById('lens-text');
    const lensInner = document.getElementById('lens-inner');
    const metricGuides = document.getElementById('metric-guides');
    const hudFamily = document.getElementById('hud-family');
    const hudWeight = document.getElementById('hud-weight');
    const hudSize = document.getElementById('hud-size');
    const hudChar = document.getElementById('hud-char');
    const zoomValue = document.getElementById('zoom-value');
    const fontChips = document.getElementById('font-chips');
    const weightSlider = document.getElementById('weight-slider');
    const weightValue = document.getElementById('weight-value');
    const weightBlock = document.getElementById('weight-block');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const trackingSlider = document.getElementById('tracking-slider');
    const trackingValue = document.getElementById('tracking-value');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomOutValue = document.getElementById('zoom-out-value');
    const textInput = document.getElementById('text-input');
    const themeDots = document.getElementById('theme-dots');
    const modeToggle = document.getElementById('lens-mode-toggle');
    const waterfallEl = document.getElementById('waterfall');
    const charGrid = document.getElementById('char-grid');
    const dustCanvas = document.getElementById('dust-canvas');
    const dustCtx = dustCanvas ? dustCanvas.getContext('2d') : null;

    const FALLBACK_TEXT = 'Aa Gg Rr 字形';
    const SCRAMBLE_CHARS = 'ABCDEFGHXYZ&#@%$?§ØÆ'.split('');
    const WATERFALL = [
        { size: 96, label: 'H1 · 96' },
        { size: 72, label: 'H2 · 72' },
        { size: 54, label: 'H3 · 54' },
        { size: 40, label: 'H4 · 40' },
        { size: 30, label: 'BODY · 30' },
        { size: 22, label: 'SMALL · 22' },
        { size: 16, label: 'CAP · 16' }
    ];

    // === State ===
    const state = {
        font: "Inter",
        isVariable: true,
        weight: 480,
        size: 96,
        tracking: 0,
        zoom: 2.4,
        mode: 'magnify',
        text: FALLBACK_TEXT,
        hovered: false,
        cursor: { x: 0, y: 0 },
        lensPos: { x: 0, y: 0 },
        lensVel: { x: 0, y: 0 }
    };

    const cssVar = (name, value) => document.body.style.setProperty(name, value);
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // === Typography Sync ===
    function applyTypography() {
        cssVar('--spec-family', state.font);
        cssVar('--spec-weight', String(state.isVariable ? state.weight : 400));
        cssVar('--spec-size', `${state.size}px`);
        cssVar('--spec-tracking', `${(state.tracking / 100).toFixed(3)}em`);

        lensText.textContent = state.text;
        requestAnimationFrame(() => {
            lensText.style.width = `${specimenText.offsetWidth}px`;
        });

        hudFamily.textContent = state.font.replace(/'/g, '');
        hudWeight.textContent = state.isVariable ? String(state.weight) : '400r';
        hudSize.textContent = `${state.size}px`;
        weightValue.textContent = String(state.weight);
        sizeValue.textContent = `${state.size}px`;
        trackingValue.textContent = `${(state.tracking / 100).toFixed(2)}em`;

        renderWaterfall();
    }

    // === Metrics Engine (Canvas TextMetrics) ===
    const metricsCanvas = document.createElement('canvas');
    const metricsCtx = metricsCanvas.getContext('2d');

    function computeMetrics() {
        const fontSpec = `${state.isVariable ? state.weight : 400} ${state.size}px ${state.font}, sans-serif`;
        metricsCtx.font = fontSpec;

        const capM = metricsCtx.measureText('H');
        const xM = metricsCtx.measureText('x');
        const boxM = metricsCtx.measureText('Hx');

        const ascent = boxM.fontBoundingBoxAscent || 0;
        const descent = boxM.fontBoundingBoxDescent || 0;
        const lineHeight = state.size * 1.18;
        const baseline = (lineHeight - (ascent + descent)) / 2 + ascent;

        return {
            baseline,
            cap: baseline - (capM.actualBoundingBoxAscent || ascent * 0.72),
            xHeight: baseline - (xM.actualBoundingBoxAscent || ascent * 0.52),
            descender: baseline + descent,
            ascent
        };
    }

    function getAccentColors() {
        const styles = getComputedStyle(document.body);
        return {
            accent: styles.getPropertyValue('--accent').trim() || '#5eead4',
            accent2: styles.getPropertyValue('--accent-2').trim() || '#a78bfa',
            base: styles.getPropertyValue('--bg-base').trim() || '#0a0f1e'
        };
    }

    function renderGuides(cursorY) {
        const m = computeMetrics();
        const lensR = lens.offsetWidth / 2;
        const colors = getAccentColors();
        const guides = [
            { y: m.cap, label: 'CAP', color: colors.accent2 },
            { y: m.xHeight, label: 'x-HEIGHT', color: colors.accent2 },
            { y: m.baseline, label: 'BASELINE', color: colors.accent },
            { y: m.descender, label: 'DESC', color: colors.accent2 }
        ];

        metricGuides.innerHTML = '';
        guides.forEach((g) => {
            const line = document.createElement('div');
            line.className = 'guide-line';
            line.style.top = `${lensR + (g.y - cursorY) * state.zoom}px`;
            line.style.color = g.color;
            const label = document.createElement('span');
            label.className = 'guide-label';
            label.textContent = g.label;
            label.style.background = g.color;
            label.style.color = colors.base;
            line.appendChild(label);
            metricGuides.appendChild(line);
        });
    }

    // === Lens Spring Physics ===
    const STIFFNESS = 0.11;
    const DAMPING = 0.78;

    function tickLens() {
        const target = state.cursor;
        state.lensVel.x = (state.lensVel.x + (target.x - state.lensPos.x) * STIFFNESS) * DAMPING;
        state.lensVel.y = (state.lensVel.y + (target.y - state.lensPos.y) * STIFFNESS) * DAMPING;
        state.lensPos.x += state.lensVel.x;
        state.lensPos.y += state.lensVel.y;

        const lensR = lens.offsetWidth / 2;
        const transform = `translate3d(${state.lensPos.x - lensR}px, ${state.lensPos.y - lensR}px, 0)`;
        lens.style.transform = transform;

        const textRect = specimenText.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const localX = state.cursor.x - (textRect.left - wrapRect.left);
        const localY = state.cursor.y - (textRect.top - wrapRect.top);

        lensText.style.transform =
            `translate3d(${lensR - localX * state.zoom}px, ${lensR - localY * state.zoom}px, 0) scale(${state.zoom})`;

        if (state.mode === 'metrics') {
            renderGuides(localY);
        }

        requestAnimationFrame(tickLens);
    }

    function updateCursorChar(clientX, clientY) {
        let char = '—';
        try {
            const range = document.caretRangeFromPoint
                ? document.caretRangeFromPoint(clientX, clientY)
                : null;
            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                const offset = range.startOffset;
                const raw = range.startContainer.textContent[offset];
                if (raw && raw.trim()) char = raw;
                else if (raw === ' ') char = '␣';
            }
        } catch (e) { /* 降级为默认占位 */ }
        hudChar.textContent = char;
    }

    wrap.addEventListener('pointermove', (e) => {
        const wrapRect = wrap.getBoundingClientRect();
        state.cursor.x = e.clientX - wrapRect.left;
        state.cursor.y = e.clientY - wrapRect.top;
        if (!state.hovered) {
            state.hovered = true;
            state.lensPos.x = state.cursor.x;
            state.lensPos.y = state.cursor.y;
            lens.classList.add('visible');
        }
        updateCursorChar(e.clientX, e.clientY);
    });

    wrap.addEventListener('pointerleave', () => {
        state.hovered = false;
        lens.classList.remove('visible');
    });

    // === Lens Mode Toggle ===
    modeToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;
        modeToggle.querySelectorAll('.mode-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        state.mode = btn.dataset.mode;
        lens.classList.toggle('metrics', state.mode === 'metrics');
        lens.classList.toggle('blueprint', state.mode === 'blueprint');
    });

    // === Font Chips ===
    fontChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.font-chip');
        if (!chip) return;
        fontChips.querySelectorAll('.font-chip').forEach((c) => c.classList.toggle('active', c === chip));
        state.font = chip.dataset.font;
        state.isVariable = chip.dataset.variable === 'true';
        weightBlock.classList.toggle('disabled', !state.isVariable);
        weightSlider.disabled = !state.isVariable;
        applyTypography();
    });

    // === Sliders ===
    weightSlider.addEventListener('input', () => {
        state.weight = parseInt(weightSlider.value, 10);
        applyTypography();
    });

    sizeSlider.addEventListener('input', () => {
        state.size = parseInt(sizeSlider.value, 10);
        applyTypography();
    });

    trackingSlider.addEventListener('input', () => {
        state.tracking = parseInt(trackingSlider.value, 10);
        applyTypography();
    });

    zoomSlider.addEventListener('input', () => {
        state.zoom = parseInt(zoomSlider.value, 10) / 10;
        zoomValue.textContent = `${state.zoom.toFixed(1)}×`;
        zoomOutValue.textContent = `${state.zoom.toFixed(1)}×`;
    });

    // === Specimen Text Input ===
    textInput.addEventListener('input', () => {
        state.text = textInput.value.trim() || FALLBACK_TEXT;
        applyTypography();
        renderCharGrid();
    });

    // === Theme Dots ===
    themeDots.addEventListener('click', (e) => {
        const dot = e.target.closest('.theme-dot');
        if (!dot) return;
        themeDots.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('active', d === dot));
        document.body.dataset.theme = dot.dataset.theme;
    });

    // === Waterfall Render ===
    function renderWaterfall() {
        waterfallEl.innerHTML = '';
        WATERFALL.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'waterfall-row';

            const meta = document.createElement('span');
            meta.className = 'waterfall-meta';
            meta.textContent = row.label;

            const sample = document.createElement('span');
            sample.className = 'waterfall-sample';
            sample.style.setProperty('--row-size', `${Math.min(row.size, state.size * 1.2)}px`);
            sample.textContent = state.text;

            rowEl.appendChild(meta);
            rowEl.appendChild(sample);
            waterfallEl.appendChild(rowEl);
        });
    }

    // === Char Grid Render + Scramble ===
    function renderCharGrid() {
        const chars = Array.from(new Set(state.text.replace(/\s/g, '').split(''))).slice(0, 18);
        charGrid.innerHTML = '';
        chars.forEach((ch, i) => {
            const cell = document.createElement('button');
            cell.className = 'char-cell';
            cell.textContent = ch;
            cell.style.transitionDelay = `${(i % 6) * 18}ms`;
            cell.addEventListener('click', () => scrambleCell(cell, ch));
            charGrid.appendChild(cell);
        });
    }

    function scrambleCell(cell, finalChar) {
        if (cell.classList.contains('scrambling')) return;
        cell.classList.add('scrambling');
        let ticks = 0;
        const timer = setInterval(() => {
            cell.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            ticks += 1;
            if (ticks > 9) {
                clearInterval(timer);
                cell.textContent = finalChar;
                cell.classList.remove('scrambling');
            }
        }, 42);
    }

    // === Dust Particle Field ===
    let dust = [];

    function resizeDust() {
        if (!dustCanvas) return;
        dustCanvas.width = window.innerWidth;
        dustCanvas.height = window.innerHeight;
        dust = Array.from({ length: 70 }, () => ({
            x: Math.random() * dustCanvas.width,
            y: Math.random() * dustCanvas.height,
            r: 0.6 + Math.random() * 1.6,
            vy: -(0.08 + Math.random() * 0.28),
            drift: Math.random() * Math.PI * 2,
            phase: Math.random() * Math.PI * 2
        }));
    }

    function tickDust() {
        if (!dustCtx) return;
        const colors = getAccentColors();
        dustCtx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
        dustCtx.fillStyle = colors.accent;

        dust.forEach((p) => {
            p.y += p.vy;
            p.drift += 0.004;
            p.x += Math.sin(p.drift) * 0.3;
            if (p.y < -8) { p.y = dustCanvas.height + 8; p.x = Math.random() * dustCanvas.width; }

            const twinkle = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.drift * 3 + p.phase));
            dustCtx.globalAlpha = twinkle * 0.5;
            dustCtx.beginPath();
            dustCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            dustCtx.fill();
        });
        dustCtx.globalAlpha = 1;
        requestAnimationFrame(tickDust);
    }

    window.addEventListener('resize', () => {
        resizeDust();
        lensText.style.width = `${specimenText.offsetWidth}px`;
    });

    // === Init ===
    function init() {
        applyTypography();
        renderCharGrid();
        resizeDust();
        requestAnimationFrame(tickLens);
        requestAnimationFrame(tickDust);
        document.fonts?.ready.then(() => applyTypography());
    }

    init();
})();
