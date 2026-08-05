(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    var MODES = ['wave', 'proximity', 'orbit', 'glitch'];

    var CHAR_SETS = {
        symbols: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        latin:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digits:  '0123456789',
        glitch:  '!<>-_\\/[]{}=+*^?#01ﾊﾐﾋｰｳｼ'
    };

    var SPECIMENS = [
        {
            id: 'display',
            text: 'Typography',
            fontClass: '',
            baseSize: 96,
            baseWeight: 700,
            baseSpacing: -0.02,
            bodyText: null
        },
        {
            id: 'body',
            text: 'The quick brown fox jumps over the lazy dog. Letters live and breathe in the space between words.',
            fontClass: 'font-sans',
            baseSize: 28,
            baseWeight: 400,
            baseSpacing: 0,
            bodyText: null
        },
        {
            id: 'mono',
            text: 'const beauty = type.create();',
            fontClass: 'font-mono',
            baseSize: 44,
            baseWeight: 400,
            baseSpacing: 0,
            bodyText: null
        },
        {
            id: 'glyph',
            text: 'A',
            fontClass: '',
            baseSize: 280,
            baseWeight: 800,
            baseSpacing: 0,
            bodyText: null
        },
        {
            id: 'weight',
            text: null,
            fontClass: '',
            baseSize: 22,
            baseWeight: 400,
            baseSpacing: 0,
            bodyText: null,
            isWeight: true
        }
    ];

    // === Simplex Noise (compact, seedable) ===

    function buildSimplex(seed) {
        var grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        var perm = new Array(512);
        var s = (seed | 0) || 1;
        function rng() {
            s = (s * 16807) % 2147483647;
            return s / 2147483647;
        }
        var p = [];
        for (var i = 0; i < 256; i++) p[i] = i;
        for (var j = 255; j > 0; j--) {
            var k = Math.floor(rng() * (j + 1));
            var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
        }
        for (var m = 0; m < 512; m++) perm[m] = p[m & 255];

        function dot(g, x, y) { return g[0]*x + g[1]*y; }

        return function noise2D(xin, yin) {
            var F2 = 0.5 * (Math.sqrt(3) - 1);
            var s = (xin + yin) * F2;
            var i = Math.floor(xin + s);
            var j = Math.floor(yin + s);
            var G2 = (3 - Math.sqrt(3)) / 6;
            var t = (i + j) * G2;
            var X0 = i - t, Y0 = j - t;
            var x0 = xin - X0, y0 = yin - Y0;
            var i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
            var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
            var x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
            var ii = i & 255, jj = j & 255;
            var gi0 = perm[ii + perm[jj]] % 12;
            var gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
            var gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
            var n0 = 0, n1 = 0, n2 = 0;
            var t0 = 0.5 - x0*x0 - y0*y0;
            if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot(grad3[gi0], x0, y0); }
            var t1 = 0.5 - x1*x1 - y1*y1;
            if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot(grad3[gi1], x1, y1); }
            var t2 = 0.5 - x2*x2 - y2*y2;
            if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot(grad3[gi2], x2, y2); }
            return 70 * (n0 + n1 + n2);
        };
    }

    // === DOM Elements ===

    var cursorGlow   = document.getElementById('cursor-glow');
    var particleCv   = document.getElementById('particle-canvas');
    var pctx         = particleCv.getContext('2d');
    var canvasGlow   = document.getElementById('canvas-glow');
    var stage        = document.getElementById('stage');
    var typoCanvas   = document.getElementById('typo-canvas');
    var typoStage    = document.getElementById('typo-stage');
    var specMeta     = document.getElementById('spec-meta');
    var specimenRail = document.getElementById('specimen-rail');
    var telemetry    = document.getElementById('telemetry');

    var inputText    = document.getElementById('input-text');
    var btnShuffle   = document.getElementById('btn-shuffle');
    var btnReset     = document.getElementById('btn-reset');
    var modeToggle   = document.getElementById('mode-toggle');
    var paletteToggle = document.getElementById('palette-toggle');
    var brandMark    = document.getElementById('brand-mark');

    var ctrlSize     = document.getElementById('ctrl-size');
    var ctrlWeight   = document.getElementById('ctrl-weight');
    var ctrlSpacing  = document.getElementById('ctrl-spacing');
    var ctrlRadius   = document.getElementById('ctrl-radius');
    var ctrlAmplitude = document.getElementById('ctrl-amplitude');

    var valSize      = document.getElementById('val-size');
    var valWeight    = document.getElementById('val-weight');
    var valSpacing   = document.getElementById('val-spacing');
    var valRadius    = document.getElementById('val-radius');
    var valAmplitude = document.getElementById('val-amplitude');

    var telePerf     = document.getElementById('tele-perf');
    var teleChrs     = document.getElementById('tele-chrs');
    var teleForce    = document.getElementById('tele-force');
    var teleFps      = document.getElementById('tele-fps');

    // === State ===

    var noise = buildSimplex(42);

    var state = {
        specimenIdx: 0,
        mode: 'wave',
        palette: 'aurora',
        text: 'Typography',
        fontSize: 96,
        fontWeight: 700,
        letterSpacing: -0.02,
        radius: 180,
        amplitude: 60,
        mouseX: -9999,
        mouseY: -9999,
        stageRect: null,
        chars: [],
        weightRows: [],
        particles: [],
        ripples: [],
        rafId: null,
        startTime: performance.now(),
        lastFrame: performance.now(),
        fps: 60,
        fpsAcc: 0,
        fpsCount: 0,
        forceReading: 0,
        glitchTimer: 0
    };

    // === Char Class ===

    function CharSpan(index, ch, fontClass) {
        this.index = index;
        this.ch = ch;
        this.isSpace = ch === ' ';
        this.fontClass = fontClass || '';

        this.el = document.createElement('span');
        this.el.className = 'char-span' + (this.isSpace ? ' space' : '') + (fontClass ? ' ' + fontClass : '');
        this.el.textContent = this.isSpace ? '\u00a0' : ch;
        this.el.style.transition =
            'transform 0.3s ' + EASE +
            ', font-weight 0.5s ' + EASE +
            ', opacity 0.3s ' + EASE +
            ', letter-spacing 0.4s ' + EASE +
            ', color 0.3s ' + EASE;

        this.cx = 0;
        this.cy = 0;
        this.tx = 0;
        this.ty = 0;
        this.rot = 0;
        this.scale = 1;
        this.weight = state.fontWeight;
        this.opacity = 1;
        this.proxActive = false;
    }

    CharSpan.prototype.measureCenter = function () {
        var r = this.el.getBoundingClientRect();
        this.cx = r.left + r.width / 2;
        this.cy = r.top + r.height / 2;
    };

    CharSpan.prototype.applyStyle = function () {
        var s = this.el.style;
        s.transform = 'translate(' + this.tx.toFixed(2) + 'px,' + this.ty.toFixed(2) + 'px) rotate(' + this.rot.toFixed(2) + 'deg) scale(' + this.scale.toFixed(3) + ')';
        s.fontWeight = Math.round(this.weight);
        s.opacity = this.opacity.toFixed(3);
        if (this.proxActive) {
            this.el.classList.add('prox-active');
        } else {
            this.el.classList.remove('prox-active');
        }
    };

    CharSpan.prototype.reset = function () {
        this.tx = 0; this.ty = 0; this.rot = 0; this.scale = 1;
        this.weight = state.fontWeight; this.opacity = 1;
        this.proxActive = false;
        this.applyStyle();
    };

    // === Render Specimen ===

    function renderSpecimen() {
        var spec = SPECIMENS[state.specimenIdx];
        typoStage.innerHTML = '';
        state.chars = [];
        state.weightRows = [];

        typoCanvas.className = 'typo-canvas glass-panel spec-' + spec.id;

        if (spec.isWeight) {
            renderWeightSpecimen();
            return;
        }

        var text = spec.text;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            var c = new CharSpan(i, ch, spec.fontClass);
            c.el.style.fontSize = state.fontSize + 'px';
            c.el.style.fontWeight = state.fontWeight;
            c.el.style.letterSpacing = state.letterSpacing + 'em';
            c.el.style.animation = 'char-enter 0.6s ' + EASE + ' ' + (i * 28) + 'ms both';
            typoStage.appendChild(c.el);
            state.chars.push(c);
        }

        if (state.specimenIdx === 1) {
            typoStage.style.maxWidth = '720px';
        } else {
            typoStage.style.maxWidth = '100%';
        }

        requestAnimationFrame(measureChars);
        updateTeleChrs();
    }

    function renderWeightSpecimen() {
        var weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        var sampleText = inputText.value && inputText.value.trim() ? inputText.value.trim().slice(0, 14) : 'Typography';

        for (var i = 0; i < weights.length; i++) {
            var row = document.createElement('div');
            row.className = 'weight-row';
            row.style.animationDelay = (i * 50) + 'ms';

            var label = document.createElement('span');
            label.className = 'weight-label';
            label.textContent = weights[i];

            var sample = document.createElement('span');
            sample.className = 'weight-sample';
            sample.style.fontWeight = weights[i];
            sample.textContent = sampleText;

            row.appendChild(label);
            row.appendChild(sample);
            typoStage.appendChild(row);

            state.weightRows.push({
                el: sample,
                weight: weights[i],
                cx: 0, cy: 0,
                scale: 1,
                opacity: 1,
                proxActive: false
            });
        }
        requestAnimationFrame(measureWeightRows);
        updateTeleChrs();
    }

    function measureChars() {
        for (var i = 0; i < state.chars.length; i++) {
            state.chars[i].measureCenter();
        }
    }

    function measureWeightRows() {
        for (var i = 0; i < state.weightRows.length; i++) {
            var r = state.weightRows[i].el.getBoundingClientRect();
            state.weightRows[i].cx = r.left + r.width / 2;
            state.weightRows[i].cy = r.top + r.height / 2;
        }
    }

    // === Animation Modes ===

    function modeWave(c, t, amp, radius) {
        var phase = c.index * 0.4 + t * 1.2;
        c.ty = Math.sin(phase) * amp * 0.35;
        c.tx = Math.cos(phase * 0.7) * amp * 0.1;
        c.rot = Math.sin(phase + 1) * amp * 0.06;
        c.scale = 1 + Math.sin(phase * 1.3) * amp * 0.0015;
        c.weight = state.fontWeight + Math.round(Math.sin(phase * 0.8) * amp * 0.4);
        c.opacity = 0.75 + 0.25 * ((Math.sin(phase) + 1) / 2);

        if (c.isSpace) { c.opacity = 1; c.ty = 0; c.tx = 0; }
    }

    function modeProximity(c, t, amp, radius) {
        var dx = state.mouseX - c.cx;
        var dy = state.mouseY - c.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && !c.isSpace) {
            var falloff = 1 - dist / radius;
            var force = falloff * falloff * (amp / 100);
            var angle = Math.atan2(dy, dx);

            c.tx = -Math.cos(angle) * force * 40;
            c.ty = -Math.sin(angle) * force * 40;
            c.scale = 1 + force * 0.35;
            c.weight = state.fontWeight + Math.round(force * 200);
            c.opacity = 1;
            c.rot = force * 12 * Math.sign(dx);
            c.proxActive = force > 0.15;
            state.forceReading = state.forceReading * 0.9 + force * 0.1;
        } else {
            c.tx *= 0.82; c.ty *= 0.82;
            c.rot *= 0.82; c.scale += (1 - c.scale) * 0.18;
            c.weight += (state.fontWeight - c.weight) * 0.18;
            c.opacity += (0.85 - c.opacity) * 0.18;
            c.proxActive = false;
        }
    }

    function modeOrbit(c, t, amp, radius) {
        var dx = state.mouseX - c.cx;
        var dy = state.mouseY - c.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && !c.isSpace) {
            var falloff = 1 - dist / radius;
            var force = falloff * (amp / 100);
            var angle = Math.atan2(dy, dx) + Math.PI / 2;
            var orbitR = 30 + force * 40;

            c.tx = Math.cos(angle) * orbitR;
            c.ty = Math.sin(angle) * orbitR;
            c.rot = (t * 60 + c.index * 20) % 360 - 180;
            c.scale = 0.85 + force * 0.4;
            c.weight = state.fontWeight + Math.round(force * 150);
            c.opacity = 0.7 + force * 0.3;
            c.proxActive = force > 0.2;
            state.forceReading = state.forceReading * 0.9 + force * 0.1;
        } else {
            c.tx *= 0.88; c.ty *= 0.88;
            c.rot *= 0.88;
            c.scale += (1 - c.scale) * 0.15;
            c.weight += (state.fontWeight - c.weight) * 0.15;
            c.opacity += (0.8 - c.opacity) * 0.15;
            c.proxActive = false;
        }
    }

    function modeGlitch(c, t, amp, radius) {
        var dx = state.mouseX - c.cx;
        var dy = state.mouseY - c.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var proximityBoost = dist < radius ? (1 - dist / radius) * (amp / 100) : 0;

        var seed = c.index * 97.31;
        var glitchSeed = Math.sin(t * 8 + seed);
        var intensity = (amp / 100) * (0.4 + proximityBoost * 0.6);

        if (Math.abs(glitchSeed) > 0.7 - intensity * 0.3) {
            c.tx = (Math.random() - 0.5) * amp * 0.4 * intensity;
            c.ty = (Math.random() - 0.5) * amp * 0.2 * intensity;
            c.rot = (Math.random() - 0.5) * amp * 0.15 * intensity;
            c.scale = 1 + (Math.random() - 0.5) * 0.2 * intensity;

            if (Math.random() < 0.15 * intensity && !c.isSpace) {
                var glitchChars = CHAR_SETS.glitch;
                c.el.textContent = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }
            c.proxActive = proximityBoost > 0.3;
        } else {
            c.tx *= 0.7; c.ty *= 0.7; c.rot *= 0.7;
            c.scale += (1 - c.scale) * 0.3;
            if (!c.isSpace && Math.random() < 0.5) {
                c.el.textContent = c.ch;
            }
            c.proxActive = false;
        }

        c.weight = state.fontWeight + Math.round((Math.sin(t * 3 + seed) * 0.5 + 0.5) * amp * 0.5);
        c.opacity = 0.6 + 0.4 * ((Math.cos(t * 2 + seed) + 1) / 2);

        if (proximityBoost > 0.1) {
            state.forceReading = state.forceReading * 0.9 + proximityBoost * 0.1;
        }
    }

    var modeFns = { wave: modeWave, proximity: modeProximity, orbit: modeOrbit, glitch: modeGlitch };

    // === Weight Specimen Animation ===

    function animateWeightRows(t) {
        var amp = state.amplitude;
        var radius = state.radius;

        for (var i = 0; i < state.weightRows.length; i++) {
            var row = state.weightRows[i];
            var dx = state.mouseX - row.cx;
            var dy = state.mouseY - row.cy;
            var dist = Math.sqrt(dx * dx + dy * dy);

            var wavePhase = t * 0.8 + i * 0.4;
            var baseScale = 1 + Math.sin(wavePhase) * amp * 0.001;

            if (dist < radius) {
                var falloff = 1 - dist / radius;
                var force = falloff * falloff * (amp / 100);
                row.scale = 1 + force * 0.5;
                row.opacity = 1;
                row.proxActive = force > 0.2;
                state.forceReading = state.forceReading * 0.9 + force * 0.1;
            } else {
                row.scale += (baseScale - row.scale) * 0.15;
                row.opacity += (0.6 - row.opacity) * 0.15;
                row.proxActive = false;
            }

            var s = row.el.style;
            s.transform = 'scale(' + row.scale.toFixed(3) + ')';
            s.opacity = row.opacity.toFixed(3);
            if (row.proxActive) { row.el.classList.add('prox-active'); }
            else { row.el.classList.remove('prox-active'); }
        }
    }

    // === Scramble Reveal ===

    function getRandomChar(set) {
        var pool = set || (CHAR_SETS.symbols + CHAR_SETS.latin + CHAR_SETS.digits);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function scrambleReveal() {
        var spec = SPECIMENS[state.specimenIdx];
        if (spec.isWeight || !state.chars.length) return;

        var text = spec.text;
        var chars = state.chars;
        var totalFrames = 20;

        function frame(iteration) {
            for (var i = 0; i < chars.length; i++) {
                if (chars[i].isSpace) continue;
                if (i < iteration) {
                    chars[i].el.textContent = text[i];
                    chars[i].ch = text[i];
                } else {
                    chars[i].el.textContent = getRandomChar();
                }
            }
            if (iteration < chars.length) {
                setTimeout(function () { frame(iteration + 1); }, 45);
            }
        }
        frame(0);
    }

    // === Particle System ===

    function initParticles() {
        state.particles = [];
        resizeParticleCanvas();
        var count = Math.min(80, Math.floor((particleCv.width * particleCv.height) / 24000));
        for (var i = 0; i < count; i++) {
            state.particles.push({
                x: Math.random() * particleCv.width,
                y: Math.random() * particleCv.height,
                vx: 0, vy: 0,
                size: 0.5 + Math.random() * 1.5,
                life: Math.random(),
                seed: Math.random() * 1000
            });
        }
    }

    function resizeParticleCanvas() {
        var dpr = window.devicePixelRatio || 1;
        particleCv.width = window.innerWidth * dpr;
        particleCv.height = window.innerHeight * dpr;
        particleCv.style.width = window.innerWidth + 'px';
        particleCv.style.height = window.innerHeight + 'px';
        pctx.scale(dpr, dpr);
    }

    function getAccentRGB() {
        var palette = state.palette;
        if (palette === 'ember') return [253, 164, 175];
        if (palette === 'forest') return [134, 239, 172];
        if (palette === 'void') return [203, 213, 225];
        return [196, 181, 253];
    }

    function updateParticles(t) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var rgb = getAccentRGB();
        pctx.clearRect(0, 0, w, h);

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            var nx = p.x * 0.0015;
            var ny = p.y * 0.0015;
            var n = noise(nx, ny + t * 0.05);
            var angle = n * Math.PI * 2;
            p.vx += Math.cos(angle) * 0.08;
            p.vy += Math.sin(angle) * 0.08;

            var dx = state.mouseX - p.x;
            var dy = state.mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 1) {
                var force = (1 - dist / 150) * 0.5;
                p.vx -= (dx / dist) * force;
                p.vy -= (dy / dist) * force;
            }

            p.vx *= 0.94; p.vy *= 0.94;
            p.x += p.vx; p.y += p.vy;
            p.life += 0.003;

            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;

            var alpha = 0.15 + (Math.sin(p.life * Math.PI * 2 + p.seed) * 0.5 + 0.5) * 0.3;
            pctx.beginPath();
            pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            pctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha.toFixed(3) + ')';
            pctx.fill();
        }

        for (var r = state.ripples.length - 1; r >= 0; r--) {
            var ripple = state.ripples[r];
            ripple.age += 0.02;
            if (ripple.age >= 1) {
                state.ripples.splice(r, 1);
                continue;
            }
            var radius = ripple.age * 120;
            var rAlpha = (1 - ripple.age) * 0.4;
            pctx.beginPath();
            pctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
            pctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + rAlpha.toFixed(3) + ')';
            pctx.lineWidth = 2 * (1 - ripple.age);
            pctx.stroke();
        }
    }

    function spawnRipple(x, y) {
        state.ripples.push({ x: x, y: y, age: 0 });
    }

    // === Animation Loop ===

    function tick(now) {
        var t = (now - state.startTime) / 1000;
        var dt = now - state.lastFrame;
        state.lastFrame = now;

        state.fpsAcc += 1000 / Math.max(dt, 1);
        state.fpsCount++;
        if (state.fpsCount >= 20) {
            state.fps = Math.round(state.fpsAcc / state.fpsCount);
            state.fpsAcc = 0; state.fpsCount = 0;
            teleFps.textContent = state.fps;
        }

        state.forceReading *= 0.92;

        var spec = SPECIMENS[state.specimenIdx];
        var fn = modeFns[state.mode];

        if (spec.isWeight) {
            animateWeightRows(t);
        } else {
            for (var i = 0; i < state.chars.length; i++) {
                fn(state.chars[i], t, state.amplitude, state.radius);
                state.chars[i].applyStyle();
            }
        }

        updateParticles(t);

        var glowX = state.mouseX - (typoCanvas.getBoundingClientRect().left + typoCanvas.offsetWidth / 2);
        var glowY = state.mouseY - (typoCanvas.getBoundingClientRect().top + typoCanvas.offsetHeight / 2);
        canvasGlow.style.transform = 'translate(calc(-50% + ' + (glowX * 0.15).toFixed(1) + 'px), calc(-50% + ' + (glowY * 0.15).toFixed(1) + 'px))';
        canvasGlow.style.opacity = (0.4 + state.forceReading * 0.6).toFixed(2);

        teleForce.textContent = state.forceReading.toFixed(2);

        state.rafId = requestAnimationFrame(tick);
    }

    // === Controls ===

    function readControls() {
        state.fontSize = parseInt(ctrlSize.value, 10);
        state.fontWeight = parseInt(ctrlWeight.value, 10);
        state.letterSpacing = parseFloat(ctrlSpacing.value) / 100;
        state.radius = parseInt(ctrlRadius.value, 10);
        state.amplitude = parseInt(ctrlAmplitude.value, 10);

        valSize.textContent = state.fontSize;
        valWeight.textContent = state.fontWeight;
        valSpacing.textContent = state.letterSpacing.toFixed(2);
        valRadius.textContent = state.radius;
        valAmplitude.textContent = state.amplitude;

        var spec = SPECIMENS[state.specimenIdx];
        if (!spec.isWeight) {
            for (var i = 0; i < state.chars.length; i++) {
                var c = state.chars[i];
                c.el.style.fontSize = state.fontSize + 'px';
                c.el.style.letterSpacing = state.letterSpacing + 'em';
            }
            requestAnimationFrame(measureChars);
        }
    }

    function onModeChange(mode) {
        state.mode = mode;
        telePerf.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        var btns = modeToggle.querySelectorAll('.mode-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === mode);
        }
        for (var j = 0; j < state.chars.length; j++) {
            state.chars[j].reset();
        }
    }

    function onPaletteChange(palette) {
        state.palette = palette;
        document.body.className = '';
        if (palette !== 'aurora') {
            document.body.classList.add('palette-' + palette);
        }
        var btns = paletteToggle.querySelectorAll('.palette-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-palette') === palette);
        }
    }

    function onSpecimenChange(idx) {
        state.specimenIdx = idx;
        var spec = SPECIMENS[idx];

        if (!spec.isWeight) {
            if (inputText.value && inputText.value.trim() && idx === 0) {
                spec.text = inputText.value.trim().slice(0, 32);
            }
        }

        state.fontSize = spec.baseSize;
        state.fontWeight = spec.baseWeight;
        state.letterSpacing = spec.baseSpacing;

        ctrlSize.value = spec.baseSize;
        ctrlWeight.value = spec.baseWeight;
        ctrlSpacing.value = Math.round(spec.baseSpacing * 100);

        var btns = specimenRail.querySelectorAll('.specimen-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', parseInt(btns[i].getAttribute('data-spec'), 10) === idx);
        }

        renderSpecimen();
        readControls();
        showSpecMeta(spec);
    }

    function showSpecMeta(spec) {
        var html = '<span>FONT <span class="meta-val">' + (spec.fontClass === 'font-mono' ? 'Share Tech Mono' : spec.fontClass === 'font-sans' ? 'Inter' : 'Outfit') + '</span></span>' +
                   '<span>SIZE <span class="meta-val">' + spec.baseSize + 'px</span></span>' +
                   '<span>WEIGHT <span class="meta-val">' + spec.baseWeight + '</span></span>';
        specMeta.innerHTML = html;
        specMeta.classList.add('visible');
    }

    function onTextChange() {
        var val = inputText.value.trim();
        if (!val) val = 'Typography';

        var spec = SPECIMENS[state.specimenIdx];
        if (spec.isWeight) {
            renderWeightSpecimen();
            return;
        }

        spec.text = val;
        renderSpecimen();
        scrambleReveal();
    }

    function onShuffle() {
        var randomMode = MODES[Math.floor(Math.random() * MODES.length)];
        onModeChange(randomMode);

        var spec = SPECIMENS[state.specimenIdx];
        if (!spec.isWeight) {
            state.amplitude = 30 + Math.floor(Math.random() * 70);
            state.radius = 100 + Math.floor(Math.random() * 260);
            state.fontSize = Math.max(spec.baseSize - 20, Math.min(200, spec.baseSize + Math.floor((Math.random() - 0.4) * 60)));
            state.fontWeight = (Math.floor(Math.random() * 9) + 1) * 100;
            state.letterSpacing = (Math.random() - 0.4) * 0.1;

            ctrlSize.value = state.fontSize;
            ctrlWeight.value = state.fontWeight;
            ctrlSpacing.value = Math.round(state.letterSpacing * 100);
            ctrlAmplitude.value = state.amplitude;
            ctrlRadius.value = state.radius;
            readControls();

            var charEls = document.querySelectorAll('.char-span');
            charEls.forEach(function (el, i) {
                el.style.animation = 'none';
                void el.offsetHeight;
                el.style.animation = 'char-enter 0.5s ' + EASE_SPRING + ' ' + (i * 22) + 'ms both';
            });
        } else {
            state.amplitude = 30 + Math.floor(Math.random() * 70);
            state.radius = 100 + Math.floor(Math.random() * 260);
            ctrlAmplitude.value = state.amplitude;
            ctrlRadius.value = state.radius;
            readControls();
        }
    }

    function onReset() {
        var spec = SPECIMENS[state.specimenIdx];
        state.fontSize = spec.baseSize;
        state.fontWeight = spec.baseWeight;
        state.letterSpacing = spec.baseSpacing;
        state.amplitude = 60;
        state.radius = 180;

        ctrlSize.value = spec.baseSize;
        ctrlWeight.value = spec.baseWeight;
        ctrlSpacing.value = Math.round(spec.baseSpacing * 100);
        ctrlAmplitude.value = 60;
        ctrlRadius.value = 180;

        readControls();
        onModeChange('wave');
        onPaletteChange('aurora');

        if (!spec.isWeight) {
            inputText.value = spec.id === 'display' ? 'Typography' : inputText.value;
        }
        renderSpecimen();
    }

    function updateTeleChrs() {
        var count = SPECIMENS[state.specimenIdx].isWeight ? state.weightRows.length : state.chars.length;
        teleChrs.textContent = count;
    }

    // === Cursor & Interaction ===

    function onMouseMove(e) {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        if (!cursorGlow.classList.contains('visible')) {
            cursorGlow.classList.add('visible');
        }
    }

    function onMouseLeave() {
        state.mouseX = -9999;
        state.mouseY = -9999;
        cursorGlow.classList.remove('visible');
    }

    function onClick(e) {
        if (e.target.closest('.controls-bar') || e.target.closest('.panel-header') || e.target.closest('.back-link')) return;
        cursorGlow.classList.add('active');
        spawnRipple(e.clientX, e.clientY);
        setTimeout(function () { cursorGlow.classList.remove('active'); }, 200);

        if (state.mode === 'glitch') {
            for (var i = 0; i < state.chars.length; i++) {
                if (Math.random() < 0.4 && !state.chars[i].isSpace) {
                    state.chars[i].el.textContent = getRandomChar(CHAR_SETS.glitch);
                }
            }
            setTimeout(function () {
                var spec = SPECIMENS[state.specimenIdx];
                if (!spec.isWeight) {
                    for (var j = 0; j < state.chars.length; j++) {
                        if (!state.chars[j].isSpace) state.chars[j].el.textContent = state.chars[j].ch;
                    }
                }
            }, 250);
        }
    }

    function onResize() {
        resizeParticleCanvas();
        initParticles();
        if (SPECIMENS[state.specimenIdx].isWeight) {
            requestAnimationFrame(measureWeightRows);
        } else {
            requestAnimationFrame(measureChars);
        }
    }

    // === Brand Mark Hover ===

    function setupBrandMark() {
        var glyphs = ['Aa', 'Bb', 'Gg', 'Rr', 'Ss', 'Xx', 'Zz', '@', '&', '#'];
        var idx = 0;
        var interval = null;
        brandMark.addEventListener('mouseenter', function () {
            interval = setInterval(function () {
                idx = (idx + 1) % glyphs.length;
                brandMark.textContent = glyphs[idx];
            }, 120);
        });
        brandMark.addEventListener('mouseleave', function () {
            clearInterval(interval);
            brandMark.textContent = 'Aa';
        });
        brandMark.addEventListener('click', function () {
            onShuffle();
        });
    }

    // === Init ===

    function init() {
        resizeParticleCanvas();
        initParticles();
        renderSpecimen();
        scrambleReveal();
        showSpecMeta(SPECIMENS[0]);

        state.rafId = requestAnimationFrame(tick);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('click', onClick);
        window.addEventListener('resize', onResize);

        inputText.addEventListener('input', function () {
            clearTimeout(inputText._t);
            inputText._t = setTimeout(onTextChange, 200);
        });

        btnShuffle.addEventListener('click', onShuffle);
        btnReset.addEventListener('click', onReset);

        ctrlSize.addEventListener('input', readControls);
        ctrlWeight.addEventListener('input', readControls);
        ctrlSpacing.addEventListener('input', readControls);
        ctrlRadius.addEventListener('input', readControls);
        ctrlAmplitude.addEventListener('input', readControls);

        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (btn) onModeChange(btn.getAttribute('data-mode'));
        });

        paletteToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (btn) onPaletteChange(btn.getAttribute('data-palette'));
        });

        specimenRail.addEventListener('click', function (e) {
            var btn = e.target.closest('.specimen-btn');
            if (btn) onSpecimenChange(parseInt(btn.getAttribute('data-spec'), 10));
        });

        setupBrandMark();

        document.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            var key = e.key.toLowerCase();
            if (key === 'r') onReset();
            if (key === 's') onShuffle();
            var num = parseInt(e.key, 10);
            if (num >= 1 && num <= 4) onModeChange(MODES[num - 1]);
            if (e.key === 'ArrowRight') onSpecimenChange(Math.min(SPECIMENS.length - 1, state.specimenIdx + 1));
            if (e.key === 'ArrowLeft') onSpecimenChange(Math.max(0, state.specimenIdx - 1));
        });

        setTimeout(function () {
            measureChars();
            if (SPECIMENS[state.specimenIdx].isWeight) measureWeightRows();
        }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
