(function () {
    'use strict';

    /* ============================================================
       Typeface Playground — main.js
       维护者: EDEN
       职责: 排版轴控制 · 字距张力句柄 · 磁力字母力场 ·
             实时 CSS 生成 · 氛围配色切换
       ============================================================ */

    // === DOM Elements ===
    var stage = document.getElementById('specimen-stage');
    var specimenMain = document.getElementById('specimen-main');
    var baselineGrid = document.getElementById('baseline-grid');
    var pairTrack = document.getElementById('pair-track');
    var canvas = document.getElementById('field-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var textInput = document.getElementById('text-input');
    var inputCount = document.getElementById('input-count');

    var metaFont = document.getElementById('meta-font');
    var metaWeight = document.getElementById('meta-weight');
    var metaAxis = document.getElementById('meta-axis');

    // controls
    var ctrlWeight = document.getElementById('ctrl-weight');
    var ctrlWidth = document.getElementById('ctrl-width');
    var ctrlSlant = document.getElementById('ctrl-slant');
    var ctrlSize = document.getElementById('ctrl-size');
    var ctrlTracking = document.getElementById('ctrl-tracking');
    var ctrlLeading = document.getElementById('ctrl-leading');
    var valWeight = document.getElementById('val-weight');
    var valWidth = document.getElementById('val-width');
    var valSlant = document.getElementById('val-slant');
    var valSize = document.getElementById('val-size');
    var valTracking = document.getElementById('val-tracking');
    var valLeading = document.getElementById('val-leading');

    var paletteBtns = document.querySelectorAll('.palette-btn');
    var toggleChips = document.querySelectorAll('.toggle-chip');
    var toolGrid = document.getElementById('tool-grid');
    var toolPair = document.getElementById('tool-pair');
    var toolForce = document.getElementById('tool-force');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');
    var btnCopy = document.getElementById('btn-copy');
    var codeOutput = document.getElementById('code-output');
    var toast = document.getElementById('toast');

    // === Palettes (4 氛围配色) ===
    var palettes = {
        obsidian: {
            accent: '#a855f7',
            accentSecondary: '#6366f1',
            accentSoft: 'rgba(168, 85, 247, 0.12)',
            gradientText: 'linear-gradient(135deg,#c4b5fd 0%,#f0abfc 50%,#818cf8 100%)',
            particle: { r: 168, g: 85, b: 247 },
            blobs: ['#1a0a3e', '#0d1f4a', '#3a0f45', '#0a1f3a']
        },
        verdigris: {
            accent: '#2dd4bf',
            accentSecondary: '#14b8a6',
            accentSoft: 'rgba(45, 212, 191, 0.12)',
            gradientText: 'linear-gradient(135deg,#5eead4 0%,#67e8f9 50%,#a7f3d0 100%)',
            particle: { r: 45, g: 212, b: 191 },
            blobs: ['#062a28', '#0a2e2a', '#0d3a32', '#08302a']
        },
        ember: {
            accent: '#fb923c',
            accentSecondary: '#f59e0b',
            accentSoft: 'rgba(251, 146, 60, 0.12)',
            gradientText: 'linear-gradient(135deg,#fde68a 0%,#fca5a5 50%,#fdba74 100%)',
            particle: { r: 251, g: 146, b: 60 },
            blobs: ['#3d1a08', '#2d160a', '#402010', '#3a1c0a']
        },
        halcyon: {
            accent: '#93c5fd',
            accentSecondary: '#7dd3fc',
            accentSoft: 'rgba(147, 197, 253, 0.12)',
            gradientText: 'linear-gradient(135deg,#bfdbfe 0%,#bae6fd 50%,#ddd6fe 100%)',
            particle: { r: 147, g: 197, b: 253 },
            blobs: ['#0d1a3a', '#10203f', '#151f44', '#0d1c34']
        }
    };

    // === Default State (used for reset) ===
    var DEFAULTS = {
        text: 'foundry',
        weight: 600,
        widthFactor: 1.0,
        slant: 0,
        size: 128,
        tracking: 0,
        leading: 1.1,
        palette: 'obsidian',
        effects: { gradient: true, outline: true, uppercase: false, italic: false },
        tools: { grid: true, pair: true, force: false }
    };

    // === State ===
    var state = {
        text: DEFAULTS.text,
        chars: [],
        pairs: [],          // kerning tension handles between glyphs
        weight: DEFAULTS.weight,
        widthFactor: DEFAULTS.widthFactor,
        slant: DEFAULTS.slant,
        size: DEFAULTS.size,
        tracking: DEFAULTS.tracking,
        leading: DEFAULTS.leading,
        palette: DEFAULTS.palette,
        effects: Object.assign({}, DEFAULTS.effects),
        tools: Object.assign({}, DEFAULTS.tools),
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        draggingPair: null,
        particles: [],
        dpr: window.devicePixelRatio || 1,
        time: 0,
        lastTime: 0,
        hasInteracted: false
    };

    var PARTICLE_COUNT = 64;
    var MAX_CHARS = 20;

    /* ============================================================
       Initialization
       ============================================================ */
    function init() {
        resizeCanvas();
        buildSpecimen(state.text);
        applyAxes();
        applyPalette(state.palette);
        applyEffects();
        applyTools();
        initParticles();
        bindEvents();
        bindControls();
        renderBaselineGrid();
        updateMeta();
        updateCode();
        state.lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    /* ============================================================
       Canvas Setup
       ============================================================ */
    function resizeCanvas() {
        var rect = stage.getBoundingClientRect();
        canvas.width = Math.max(1, rect.width * state.dpr);
        canvas.height = Math.max(1, rect.height * state.dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    /* ============================================================
       Build Specimen Characters
       ============================================================ */
    function buildSpecimen(text) {
        specimenMain.innerHTML = '';
        state.chars = [];
        pairTrack.innerHTML = '';
        state.pairs = [];

        var arr = splitChars(text);
        var display = arr.slice(0, MAX_CHARS);

        display.forEach(function (ch, i) {
            var el = document.createElement('span');
            el.className = 'spec-char';
            if (ch === ' ') {
                el.classList.add('space');
                el.innerHTML = '&nbsp;';
            } else {
                el.textContent = ch;
            }
            specimenMain.appendChild(el);

            state.chars.push({
                el: el,
                char: ch,
                index: i,
                baseX: 0,
                baseY: 0,
                tx: 0,
                ty: 0,
                vx: 0,
                vy: 0,
                scale: 1,
                scaleVel: 0,
                phase: (i / Math.max(1, display.length)) * Math.PI * 2,
                seed: Math.random() * 1000
            });
        });

        // Build kerning pair handles (one between each adjacent char)
        for (var i = 0; i < state.chars.length - 1; i++) {
            state.pairs.push({
                leftIdx: i,
                rightIdx: i + 1,
                offset: 0,      // px nudge applied between the two glyphs
                handleEl: null,
                lineEl: null
            });
        }
        buildPairHandles();
    }

    // Split by character but collapse whitespace runs
    function splitChars(text) {
        return (text || '').split('');
    }

    function buildPairHandles() {
        state.pairs.forEach(function (p, i) {
            var handle = document.createElement('div');
            handle.className = 'pair-handle';
            handle.dataset.pairIdx = i;
            pairTrack.appendChild(handle);
            p.handleEl = handle;

            var line = document.createElement('div');
            line.className = 'pair-line';
            pairTrack.appendChild(line);
            p.lineEl = line;
        });
    }

    /* ============================================================
       Apply Typography Axes
       ============================================================ */
    function applyAxes() {
        var fontSize = state.size + 'px';
        var trackingEm = (state.tracking / 100).toFixed(3);
        var wght = state.weight;

        specimenMain.style.fontSize = fontSize;
        specimenMain.style.gap = trackingEm + 'em';
        specimenMain.style.lineHeight = state.leading.toFixed(2);
        specimenMain.style.fontStyle = state.effects.italic ? 'italic' : 'normal';
        specimenMain.style.textTransform = state.effects.uppercase ? 'uppercase' : 'none';

        state.chars.forEach(function (c) {
            c.el.style.fontWeight = wght;
            // emulate width axis via horizontal scale, preserving vertical metrics
            c.el.style.transform = '';
        });

        // width axis: apply as transform on the whole line to keep proportions coherent
        specimenMain.style.transform = 'scaleX(' + state.widthFactor.toFixed(3) + ')';

        // slant axis on each char via skew
        state.chars.forEach(function (c) {
            c.el.dataset.slant = state.slant;
        });

        renderBaselineGrid();
        positionPairHandles();
        updateMeta();
        updateCode();
    }

    // Baseline grid is sized to leading × cap-height ratio
    function renderBaselineGrid() {
        var step = Math.max(8, state.size * state.leading * 0.34);
        baselineGrid.style.setProperty('--baseline-size', step + 'px');
    }

    // Position the kerning handles at the midpoint between each glyph pair
    function positionPairHandles() {
        var stageRect = stage.getBoundingClientRect();
        state.pairs.forEach(function (p) {
            if (!p.handleEl) return;
            var left = state.chars[p.leftIdx];
            var right = state.chars[p.rightIdx];
            if (!left || !right) return;

            var lr = left.el.getBoundingClientRect();
            var rr = right.el.getBoundingClientRect();
            var midX = (lr.right + rr.left) / 2 - stageRect.left + p.offset;
            var midY = (lr.top + lr.height / 2 + rr.top + rr.height / 2) / 2 - stageRect.top;

            p.handleEl.style.left = midX + 'px';
            p.handleEl.style.top = midY + 'px';

            // the connector line spans the actual visual gap
            var gapLeft = lr.right - stageRect.left + p.offset * 0.5;
            var gapRight = rr.left - stageRect.left - p.offset * 0.5;
            var w = Math.max(0, gapRight - gapLeft);
            p.lineEl.style.left = gapLeft + 'px';
            p.lineEl.style.top = midY + 'px';
            p.lineEl.style.width = w + 'px';
        });
    }

    /* ============================================================
       Effects (gradient / outline / uppercase / italic)
       ============================================================ */
    function applyEffects() {
        specimenMain.classList.toggle('gradient-on', state.effects.gradient);
        specimenMain.classList.toggle('outline-on', state.effects.outline);
        // uppercase & italic handled in applyAxes via style props
        applyAxes();
    }

    /* ============================================================
       Tool toggles (grid / pair / force field)
       ============================================================ */
    function applyTools() {
        baselineGrid.classList.toggle('hidden', !state.tools.grid);
        pairTrack.classList.toggle('hidden', !state.tools.pair);
        canvas.classList.toggle('hidden', !state.tools.force);
        toolGrid.classList.toggle('active', state.tools.grid);
        toolGrid.setAttribute('aria-pressed', state.tools.grid);
        toolPair.classList.toggle('active', state.tools.pair);
        toolPair.setAttribute('aria-pressed', state.tools.pair);
        toolForce.classList.toggle('active', state.tools.force);
        toolForce.setAttribute('aria-pressed', state.tools.force);

        // When force field off, settle the letters back faster
        if (!state.tools.force) {
            state.chars.forEach(function (c) {
                c.vx *= 0.5;
                c.vy *= 0.5;
            });
        }
    }

    /* ============================================================
       Palette
       ============================================================ */
    function applyPalette(name) {
        var p = palettes[name];
        if (!p) return;
        state.palette = name;
        var root = document.documentElement.style;
        root.setProperty('--color-accent', p.accent);
        root.setProperty('--color-accent-secondary', p.accentSecondary);
        root.setProperty('--color-accent-soft', p.accentSoft);
        root.setProperty('--gradient-text', p.gradientText);
        root.setProperty('--color-blob-1', p.blobs[0]);
        root.setProperty('--color-blob-2', p.blobs[1]);
        root.setProperty('--color-blob-3', p.blobs[2]);
        root.setProperty('--color-blob-4', p.blobs[3]);
        cursorGlow.style.background = 'radial-gradient(circle,' + p.accentSoft + ' 0%,transparent 70%)';

        paletteBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.palette === name);
        });
    }

    /* ============================================================
       Particles (force-field atmosphere)
       ============================================================ */
    function initParticles() {
        var rect = stage.getBoundingClientRect();
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle(Math.random() * rect.width, Math.random() * rect.height));
        }
    }

    function createParticle(x, y) {
        return {
            x: x,
            y: y,
            ox: x,
            oy: y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.8 + 0.5,
            alpha: Math.random() * 0.35 + 0.1,
            phase: Math.random() * Math.PI * 2
        };
    }

    /* ============================================================
       Events
       ============================================================ */
    function bindEvents() {
        // Pointer move
        stage.addEventListener('mousemove', onPointerMove);
        stage.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            clearHover();
        });

        // Touch
        stage.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            updateMouseFromClient(t.clientX, t.clientY);
            state.mouseInStage = true;
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: true });
        stage.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var t = e.touches[0];
            onPointerMove({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        stage.addEventListener('touchend', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            clearHover();
        });

        // Global pointer for cursor glow + pair dragging
        window.addEventListener('mousemove', function (e) {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
            if (state.draggingPair !== null) {
                handlePairDrag(e.clientX);
            }
        });
        window.addEventListener('mouseup', endPairDrag);
        window.addEventListener('touchend', endPairDrag);

        // Pair handle drag start
        pairTrack.addEventListener('mousedown', onPairDown);
        pairTrack.addEventListener('touchstart', onPairDown, { passive: false });

        // Resize
        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            initParticles();
            positionPairHandles();
        }, 220));
    }

    function onPointerMove(e) {
        updateMouseFromClient(e.clientX, e.clientY);
        state.mouseInStage = true;
        if (state.tools.force) {
            applyForceField();
        }
        updateHover();
        if (!state.hasInteracted) {
            state.hasInteracted = true;
            stageHint.classList.add('hidden');
        }
    }

    function updateMouseFromClient(cx, cy) {
        var r = stage.getBoundingClientRect();
        state.mouse.x = cx - r.left;
        state.mouse.y = cy - r.top;
    }

    /* ============================================================
       Hover highlight (magnetic lift)
       ============================================================ */
    function updateHover() {
        var stageRect = stage.getBoundingClientRect();
        var radius = 78;
        state.chars.forEach(function (c) {
            if (c.char === ' ') return;
            var r = c.el.getBoundingClientRect();
            var cx = r.left + r.width / 2 - stageRect.left;
            var cy = r.top + r.height / 2 - stageRect.top;
            var dx = state.mouse.x - cx;
            var dy = state.mouse.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
                var intensity = 1 - dist / radius;
                c.el.classList.add('hovered');
                if (state.tools.force) {
                    var pull = intensity * 0.28;
                    c.vx += dx * pull * 0.002;
                    c.vy += dy * pull * 0.002;
                    c.scaleVel += intensity * 0.04;
                }
            } else {
                c.el.classList.remove('hovered');
            }
        });
    }

    function clearHover() {
        state.chars.forEach(function (c) { c.el.classList.remove('hovered'); });
    }

    /* ============================================================
       Force Field (repel letters from cursor)
       ============================================================ */
    function applyForceField() {
        var stageRect = stage.getBoundingClientRect();
        var radius = 130;
        state.chars.forEach(function (c) {
            if (c.char === ' ') return;
            var r = c.el.getBoundingClientRect();
            var cx = r.left + r.width / 2 - stageRect.left;
            var cy = r.top + r.height / 2 - stageRect.top;
            var dx = state.mouse.x - cx;
            var dy = state.mouse.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
                var intensity = 1 - dist / radius;
                intensity = intensity * intensity;
                var angle = Math.atan2(dy, dx);
                c.vx -= Math.cos(angle) * intensity * 2.4;
                c.vy -= Math.sin(angle) * intensity * 2.4;
                c.scaleVel += intensity * 0.05;
            }
        });
    }

    /* ============================================================
       Kerning Pair Drag
       ============================================================ */
    function onPairDown(e) {
        var target = e.target;
        if (!target.classList.contains('pair-handle')) return;
        e.preventDefault();
        var idx = parseInt(target.dataset.pairIdx, 10);
        state.draggingPair = idx;
        state.pairs[idx].handleEl.classList.add('dragging');
        e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    }

    function handlePairDrag(clientX) {
        if (state.draggingPair === null) return;
        var p = state.pairs[state.draggingPair];
        var left = state.chars[p.leftIdx];
        var right = state.chars[p.rightIdx];
        if (!left || !right) return;

        var stageRect = stage.getBoundingClientRect();
        var lr = left.el.getBoundingClientRect();
        var rr = right.el.getBoundingClientRect();
        // natural midpoint between the two glyph edges
        var naturalMid = (lr.right + rr.left) / 2 - stageRect.left;
        var mouseInStage = clientX - stageRect.left;
        // clamp so glyphs never overlap catastrophically
        var maxShift = (rr.left - lr.right) * 0.8 + 40;
        var raw = mouseInStage - naturalMid;
        p.offset = clamp(raw, -maxShift, maxShift);

        // apply margin between the two glyphs
        left.el.style.marginRight = (p.offset < 0 ? p.offset : 0) + 'px';
        right.el.style.marginLeft = (p.offset > 0 ? p.offset : 0) + 'px';

        positionPairHandles();
        updateCode();
    }

    function endPairDrag() {
        if (state.draggingPair !== null) {
            var p = state.pairs[state.draggingPair];
            if (p && p.handleEl) p.handleEl.classList.remove('dragging');
            state.draggingPair = null;
        }
    }

    /* ============================================================
       Controls Binding
       ============================================================ */
    function bindControls() {
        textInput.addEventListener('input', function () {
            var val = this.value;
            state.text = val;
            inputCount.textContent = val.length + ' / ' + MAX_CHARS;
            buildSpecimen(val);
            applyAxes();
        });

        ctrlWeight.addEventListener('input', function () {
            state.weight = parseInt(this.value, 10);
            valWeight.textContent = state.weight;
            applyAxes();
        });

        ctrlWidth.addEventListener('input', function () {
            state.widthFactor = parseInt(this.value, 10) / 100;
            valWidth.textContent = state.widthFactor.toFixed(2);
            applyAxes();
        });

        ctrlSlant.addEventListener('input', function () {
            state.slant = parseInt(this.value, 10);
            valSlant.textContent = state.slant + '°';
            applyAxes();
        });

        ctrlSize.addEventListener('input', function () {
            state.size = parseInt(this.value, 10);
            valSize.textContent = state.size + 'px';
            applyAxes();
        });

        ctrlTracking.addEventListener('input', function () {
            state.tracking = parseInt(this.value, 10);
            valTracking.textContent = (state.tracking / 100).toFixed(2) + 'em';
            applyAxes();
        });

        ctrlLeading.addEventListener('input', function () {
            state.leading = parseInt(this.value, 10) / 100;
            valLeading.textContent = state.leading.toFixed(2);
            applyAxes();
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                applyPalette(btn.dataset.palette);
                updateCode();
            });
        });

        toggleChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var key = chip.dataset.effect;
                state.effects[key] = !state.effects[key];
                chip.classList.toggle('active', state.effects[key]);
                chip.setAttribute('aria-pressed', state.effects[key]);
                applyEffects();
            });
        });

        toolGrid.addEventListener('click', function () {
            state.tools.grid = !state.tools.grid;
            applyTools();
        });
        toolPair.addEventListener('click', function () {
            state.tools.pair = !state.tools.pair;
            applyTools();
        });
        toolForce.addEventListener('click', function () {
            state.tools.force = !state.tools.force;
            applyTools();
        });

        btnShuffle.addEventListener('click', shuffleAxes);
        btnReset.addEventListener('click', resetAll);
        btnCopy.addEventListener('click', copyCode);
    }

    /* ============================================================
       Shuffle / Reset / Copy
       ============================================================ */
    function shuffleAxes() {
        state.weight = randInt(100, 900, 10);
        state.widthFactor = (randInt(85, 130, 1)) / 100;
        state.slant = randInt(-10, 10, 1);
        state.size = randInt(80, 170, 1);
        state.tracking = randInt(-4, 18, 1);
        state.leading = (randInt(90, 150, 1)) / 100;
        syncControlsToState();
        applyAxes();
        showToast('已随机铸造');
    }

    function resetAll() {
        state.text = DEFAULTS.text;
        state.weight = DEFAULTS.weight;
        state.widthFactor = DEFAULTS.widthFactor;
        state.slant = DEFAULTS.slant;
        state.size = DEFAULTS.size;
        state.tracking = DEFAULTS.tracking;
        state.leading = DEFAULTS.leading;
        state.effects = Object.assign({}, DEFAULTS.effects);
        state.tools = Object.assign({}, DEFAULTS.tools);
        textInput.value = DEFAULTS.text;
        inputCount.textContent = DEFAULTS.text.length + ' / ' + MAX_CHARS;

        // reset chip + tool visuals
        toggleChips.forEach(function (chip) {
            var on = !!state.effects[chip.dataset.effect];
            chip.classList.toggle('active', on);
            chip.setAttribute('aria-pressed', on);
        });

        syncControlsToState();
        buildSpecimen(state.text);
        applyPalette(DEFAULTS.palette);
        applyEffects();
        applyTools();
        showToast('已重置');
    }

    function syncControlsToState() {
        ctrlWeight.value = state.weight;
        valWeight.textContent = state.weight;
        ctrlWidth.value = Math.round(state.widthFactor * 100);
        valWidth.textContent = state.widthFactor.toFixed(2);
        ctrlSlant.value = state.slant;
        valSlant.textContent = state.slant + '°';
        ctrlSize.value = state.size;
        valSize.textContent = state.size + 'px';
        ctrlTracking.value = state.tracking;
        valTracking.textContent = (state.tracking / 100).toFixed(2) + 'em';
        ctrlLeading.value = Math.round(state.leading * 100);
        valLeading.textContent = state.leading.toFixed(2);
    }

    function copyCode() {
        var raw = codeOutput.textContent;
        var done = function () {
            btnCopy.classList.add('copied');
            btnCopy.querySelector('.copy-label').textContent = '已复制';
            showToast('CSS 已复制到剪贴板');
            setTimeout(function () {
                btnCopy.classList.remove('copied');
                btnCopy.querySelector('.copy-label').textContent = '复制';
            }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(raw).then(done).catch(fallbackCopy.bind(null, raw, done));
        } else {
            fallbackCopy(raw, done);
        }
    }

    function fallbackCopy(text, cb) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); cb && cb(); } catch (e) {}
        document.body.removeChild(ta);
    }

    /* ============================================================
       Meta + Generated CSS
       ============================================================ */
    function updateMeta() {
        metaWeight.textContent = 'wght ' + state.weight;
        metaAxis.textContent =
            'wdth ' + Math.round(state.widthFactor * 100) +
            ' · slnt ' + state.slant + '°' +
            ' · trk ' + (state.tracking / 100).toFixed(2) + 'em';
    }

    function updateCode() {
        var lines = [];
        lines.push('<span class="tok-prop">.specimen</span> {');
        lines.push('  <span class="tok-prop">font-family</span>: <span class="tok-val">\'Outfit\', sans-serif</span>;');
        lines.push('  <span class="tok-prop">font-weight</span>: <span class="tok-num">' + state.weight + '</span>;');
        lines.push('  <span class="tok-prop">font-size</span>: <span class="tok-num">' + state.size + 'px</span>;');
        lines.push('  <span class="tok-prop">letter-spacing</span>: <span class="tok-num">' + (state.tracking / 100).toFixed(3) + 'em</span>;');
        lines.push('  <span class="tok-prop">line-height</span>: <span class="tok-num">' + state.leading.toFixed(2) + '</span>;');
        lines.push('  <span class="tok-prop">transform</span>: <span class="tok-val">scaleX(' + state.widthFactor.toFixed(2) + ')</span>;');
        if (state.slant !== 0) {
            lines.push('  <span class="tok-prop">font-style</span>: <span class="tok-val">oblique ' + state.slant + 'deg</span>;');
        } else if (state.effects.italic) {
            lines.push('  <span class="tok-prop">font-style</span>: <span class="tok-val">italic</span>;');
        }
        if (state.effects.uppercase) {
            lines.push('  <span class="tok-prop">text-transform</span>: <span class="tok-val">uppercase</span>;');
        }
        if (state.effects.gradient) {
            lines.push('  <span class="tok-prop">background</span>: <span class="tok-val">' + palettes[state.palette].gradientText + '</span>;');
            lines.push('  <span class="tok-prop">-webkit-background-clip</span>: <span class="tok-val">text</span>;');
            lines.push('  <span class="tok-prop">color</span>: <span class="tok-val">transparent</span>;');
        }
        // kerning overrides
        var kernCount = 0;
        state.pairs.forEach(function (p) {
            if (Math.abs(p.offset) > 0.5) kernCount++;
        });
        if (kernCount > 0) {
            lines.push('  <span class="tok-prop">/* kerning overrides */</span>');
            lines.push('  <span class="tok-prop">/* ' + kernCount + ' custom pair' + (kernCount > 1 ? 's' : '') + ' */</span>');
        }
        lines.push('}');

        codeOutput.innerHTML = lines.join('\n');
    }

    /* ============================================================
       Toast
       ============================================================ */
    var toastTimer = null;
    function showToast(msg) {
        toast.innerHTML = '<span class="toast-icon">✓</span>' + msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
        }, 2200);
    }

    /* ============================================================
       Animation Loop
       ============================================================ */
    function loop(now) {
        var dt = Math.min(48, now - state.lastTime);
        state.lastTime = now;
        state.time += dt;

        updatePhysics(dt);
        if (state.tools.force) {
            drawParticles();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(loop);
    }

    function updatePhysics(dt) {
        var slnt = state.slant;
        var damping = 0.86;
        var returnForce = 0.18;

        state.chars.forEach(function (c) {
            // spring back to rest
            c.vx += -c.tx * returnForce;
            c.vy += -c.ty * returnForce;
            c.vx *= damping;
            c.vy *= damping;
            c.tx += c.vx;
            c.ty += c.vy;

            c.scaleVel += (1 - c.scale) * returnForce;
            c.scaleVel *= damping;
            c.scale += c.scaleVel;

            // gentle breathing when idle
            var breathe = 0;
            if (!state.hasInteracted && !state.tools.force) {
                breathe = Math.sin(state.time * 0.0016 + c.phase) * 0.4;
            }

            var sx = c.scale;
            var sy = c.scale;
            c.el.style.transform =
                'translate(' + (c.tx).toFixed(2) + 'px,' + (c.ty + breathe).toFixed(2) + 'px)' +
                ' scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')' +
                (slnt !== 0 ? ' skewX(' + (-slnt).toFixed(2) + 'deg)' : '');
        });

        // settle particles toward origin with slow drift
        var p = palettes[state.palette].particle;
        state.particles.forEach(function (part) {
            part.phase += 0.01;
            part.x += part.vx + Math.cos(part.phase) * 0.15;
            part.y += part.vy + Math.sin(part.phase) * 0.15;
            part.vx *= 0.98;
            part.vy *= 0.98;

            // cursor influence
            if (state.mouseInStage && state.tools.force) {
                var dx = state.mouse.x - part.x;
                var dy = state.mouse.y - part.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < 16000) {
                    var f = (1 - d2 / 16000) * 0.6;
                    part.vx += dx * f * 0.01;
                    part.vy += dy * f * 0.01;
                }
            }
            // wrap
            var rect = stage.getBoundingClientRect();
            if (part.x < -20) part.x = rect.width + 20;
            if (part.x > rect.width + 20) part.x = -20;
            if (part.y < -20) part.y = rect.height + 20;
            if (part.y > rect.height + 20) part.y = -20;
        });
    }

    function drawParticles() {
        var rect = stage.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        var pc = palettes[state.palette].particle;
        state.particles.forEach(function (part) {
            var r = Math.max(0.1, part.radius);
            var grd = ctx.createRadialGradient(part.x, part.y, 0, part.x, part.y, r * 4);
            grd.addColorStop(0, 'rgba(' + pc.r + ',' + pc.g + ',' + pc.b + ',' + part.alpha + ')');
            grd.addColorStop(1, 'rgba(' + pc.r + ',' + pc.g + ',' + pc.b + ',0)');
            ctx.beginPath();
            ctx.fillStyle = grd;
            ctx.arc(part.x, part.y, r * 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /* ============================================================
       Utils
       ============================================================ */
    function randInt(min, max, step) {
        step = step || 1;
        var range = Math.floor((max - min) / step);
        return min + Math.floor(Math.random() * (range + 1)) * step;
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    // === Boot ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
