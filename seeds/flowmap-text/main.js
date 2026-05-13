(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var PALETTES = {
        aurora: {
            char: '#f0eef6',
            glow: 'rgba(196,181,253,0.5)',
            trail: 'rgba(196,181,253,0.12)',
            accent: '#c4b5fd',
            accentRgb: '196,181,253'
        },
        ember: {
            char: '#fff1f2',
            glow: 'rgba(253,164,175,0.5)',
            trail: 'rgba(253,164,175,0.12)',
            accent: '#fda4af',
            accentRgb: '253,164,175'
        },
        forest: {
            char: '#ecfdf5',
            glow: 'rgba(134,239,172,0.5)',
            trail: 'rgba(134,239,172,0.12)',
            accent: '#86efac',
            accentRgb: '134,239,172'
        },
        void: {
            char: '#e2e8f0',
            glow: 'rgba(148,163,184,0.45)',
            trail: 'rgba(148,163,184,0.1)',
            accent: '#94a3b8',
            accentRgb: '148,163,184'
        }
    };

    // === Simplex Noise 2D ===

    var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    var grad3 = [
        [1,1],[-1,1],[1,-1],[-1,-1],
        [1,0],[-1,0],[0,1],[0,-1],
        [1,1],[-1,1],[1,-1],[-1,-1]
    ];
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);

    function initNoise(seed) {
        var p = new Uint8Array(256);
        for (var i = 0; i < 256; i++) p[i] = i;
        var s = seed || Math.random() * 65536;
        for (var i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            var j = s % (i + 1);
            var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
        }
        for (var i = 0; i < 512; i++) {
            perm[i] = p[i & 255];
            permMod12[i] = perm[i] % 12;
        }
    }

    function noise2D(xin, yin) {
        var n0, n1, n2;
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t;
        var Y0 = j - t;
        var x0 = xin - X0;
        var y0 = yin - Y0;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2;
        var y2 = y0 - 1.0 + 2.0 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var gi0 = permMod12[ii + perm[jj]];
        var gi1 = permMod12[ii + i1 + perm[jj + j1]];
        var gi2 = permMod12[ii + 1 + perm[jj + 1]];
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
        return 70.0 * (n0 + n1 + n2);
    }

    // === DOM Elements ===

    var canvas = document.getElementById('flow-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stage = document.getElementById('stage');
    var stageOverlay = document.getElementById('stage-overlay');
    var flowHint = document.getElementById('flow-hint');

    var inputText = document.getElementById('input-text');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');
    var modeToggle = document.getElementById('mode-toggle');
    var forceToggle = document.getElementById('force-toggle');
    var trailToggle = document.getElementById('trail-toggle');
    var paletteToggle = document.getElementById('palette-toggle');

    var ctrlSize = document.getElementById('ctrl-size');
    var ctrlSpeed = document.getElementById('ctrl-speed');
    var ctrlScale = document.getElementById('ctrl-scale');
    var ctrlForce = document.getElementById('ctrl-force');

    var valSize = document.getElementById('val-size');
    var valSpeed = document.getElementById('val-speed');
    var valScale = document.getElementById('val-scale');
    var valForce = document.getElementById('val-force');

    // === State ===

    var state = {
        text: 'FLOW MAP',
        mode: 'perlin',
        forceMode: 'attract',
        trailMode: 'fade',
        palette: 'aurora',
        fontSize: 28,
        speed: 45,
        noiseScale: 50,
        forceStrength: 60,
        mouseX: -9999,
        mouseY: -9999,
        mouseInStage: false,
        particles: [],
        rafId: null,
        time: 0,
        noiseSeed: Math.random() * 65536,
        w: 0,
        h: 0,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
    };

    // === Particle ===

    function Particle(ch, x, y) {
        this.ch = ch;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.alpha = 1;
        this.life = 1;
        this.trail = [];
        this.maxTrail = 12;
        this.originX = x;
        this.originY = y;
    }

    // === Resize ===

    function resize() {
        var rect = stage.getBoundingClientRect();
        state.w = rect.width;
        state.h = rect.height;
        canvas.width = state.w * state.dpr;
        canvas.height = state.h * state.dpr;
        canvas.style.width = state.w + 'px';
        canvas.style.height = state.h + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    // === Spawn Particles ===

    function spawnParticles() {
        state.particles = [];
        var text = state.text || 'FLOW';
        var chars = text.split('');
        if (chars.length === 0) return;

        var cols = Math.ceil(Math.sqrt(chars.length * (state.w / state.h)));
        var rows = Math.ceil(chars.length / cols);
        var cellW = state.w / cols;
        var cellH = state.h / rows;

        for (var i = 0; i < chars.length; i++) {
            var col = i % cols;
            var row = Math.floor(i / cols);
            var x = cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.3;
            var y = cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.3;
            state.particles.push(new Particle(chars[i], x, y));
        }
    }

    // === Flow Field ===

    function getFlowAngle(x, y, t) {
        var scale = state.noiseScale * 0.0004 + 0.001;
        var angle;

        switch (state.mode) {
            case 'perlin':
                angle = noise2D(x * scale, y * scale + t * 0.3) * Math.PI * 2;
                break;
            case 'curl':
                var eps = 1.5;
                var n1 = noise2D(x * scale, (y + eps) * scale + t * 0.2);
                var n2 = noise2D(x * scale, (y - eps) * scale + t * 0.2);
                var n3 = noise2D((x + eps) * scale, y * scale + t * 0.2);
                var n4 = noise2D((x - eps) * scale, y * scale + t * 0.2);
                angle = Math.atan2(n1 - n2, n3 - n4);
                break;
            case 'vortex':
                var cx = state.w * 0.5;
                var cy = state.h * 0.5;
                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy) + 1;
                var baseAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
                var noiseVal = noise2D(x * scale * 0.5, y * scale * 0.5 + t * 0.15);
                angle = baseAngle + noiseVal * (1.0 + 800 / dist) * 0.5;
                break;
            case 'turbulence':
                var val = 0;
                var amp = 1;
                var freq = scale;
                for (var o = 0; o < 4; o++) {
                    val += noise2D(x * freq + t * 0.2, y * freq + t * 0.15) * amp;
                    freq *= 2;
                    amp *= 0.5;
                }
                angle = val * Math.PI * 3;
                break;
            default:
                angle = noise2D(x * scale, y * scale + t * 0.3) * Math.PI * 2;
        }

        return angle;
    }

    // === Mouse Force ===

    function getMouseForce(px, py) {
        if (!state.mouseInStage) return { fx: 0, fy: 0 };

        var dx = px - state.mouseX;
        var dy = py - state.mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var radius = 180;
        var strength = state.forceStrength * 0.02;

        if (dist > radius || dist < 1) return { fx: 0, fy: 0 };

        var falloff = 1 - dist / radius;
        falloff = falloff * falloff;
        var force = falloff * strength;
        var nx = dx / dist;
        var ny = dy / dist;

        switch (state.forceMode) {
            case 'attract':
                return { fx: -nx * force, fy: -ny * force };
            case 'repel':
                return { fx: nx * force * 1.5, fy: ny * force * 1.5 };
            case 'swirl':
                return { fx: -ny * force, fy: nx * force };
            default:
                return { fx: 0, fy: 0 };
        }
    }

    // === Update ===

    function update(dt) {
        var speed = state.speed * 0.025;
        state.time += dt * speed * 0.001;
        var friction = 0.92;

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            var angle = getFlowAngle(p.x, p.y, state.time);
            var flowX = Math.cos(angle) * speed * 1.2;
            var flowY = Math.sin(angle) * speed * 1.2;

            var mf = getMouseForce(p.x, p.y);

            p.vx += flowX * 0.15 + mf.fx;
            p.vy += flowY * 0.15 + mf.fy;

            p.vx *= friction;
            p.vy *= friction;

            p.x += p.vx;
            p.y += p.vy;

            p.rotation = Math.atan2(p.vy, p.vx) * 0.3;

            var speed2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.alpha = Math.min(1, 0.5 + speed2 * 0.15);

            if (p.x < -40) p.x = state.w + 40;
            if (p.x > state.w + 40) p.x = -40;
            if (p.y < -40) p.y = state.h + 40;
            if (p.y > state.h + 40) p.y = -40;

            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > p.maxTrail) p.trail.shift();
        }
    }

    // === Draw ===

    function draw() {
        var pal = PALETTES[state.palette];
        var w = state.w;
        var h = state.h;

        if (state.trailMode === 'fade') {
            ctx.fillStyle = 'rgba(6, 6, 14, 0.12)';
            ctx.fillRect(0, 0, w, h);
        } else if (state.trailMode === 'none') {
            ctx.clearRect(0, 0, w, h);
        } else {
            ctx.fillStyle = 'rgba(6, 6, 14, 0.03)';
            ctx.fillRect(0, 0, w, h);
        }

        var fontSize = state.fontSize;
        ctx.font = fontSize + 'px "Outfit", "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            if (state.trailMode !== 'none' && p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (var t = 1; t < p.trail.length; t++) {
                    ctx.lineTo(p.trail[t].x, p.trail[t].y);
                }
                ctx.strokeStyle = pal.trail;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            ctx.shadowColor = pal.glow;
            ctx.shadowBlur = 20;
            ctx.fillStyle = pal.char;
            ctx.fillText(p.ch, 0, 0);

            if (p.alpha > 0.7) {
                ctx.shadowBlur = 40;
                ctx.globalAlpha = p.alpha * 0.3;
                ctx.fillText(p.ch, 0, 0);
            }

            ctx.restore();
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (state.mouseInStage) {
            var gradient = ctx.createRadialGradient(
                state.mouseX, state.mouseY, 0,
                state.mouseX, state.mouseY, 120
            );
            gradient.addColorStop(0, 'rgba(' + pal.accentRgb + ',0.06)');
            gradient.addColorStop(1, 'rgba(' + pal.accentRgb + ',0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(state.mouseX, state.mouseY, 120, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // === Animation Loop ===

    var lastTime = 0;

    function loop(timestamp) {
        var dt = Math.min(timestamp - lastTime, 50);
        lastTime = timestamp;
        update(dt);
        draw();
        state.rafId = requestAnimationFrame(loop);
    }

    // === Events ===

    function onMouseMove(e) {
        var rect = stage.getBoundingClientRect();
        state.mouseX = e.clientX - rect.left;
        state.mouseY = e.clientY - rect.top;
        state.mouseInStage = true;

        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        if (!cursorGlow.classList.contains('visible')) {
            cursorGlow.classList.add('visible');
        }
        if (!flowHint.classList.contains('hidden')) {
            flowHint.classList.add('hidden');
        }
    }

    function onMouseLeave() {
        state.mouseInStage = false;
        cursorGlow.classList.remove('visible');
    }

    function onTouchMove(e) {
        e.preventDefault();
        var touch = e.touches[0];
        var rect = stage.getBoundingClientRect();
        state.mouseX = touch.clientX - rect.left;
        state.mouseY = touch.clientY - rect.top;
        state.mouseInStage = true;
        if (!flowHint.classList.contains('hidden')) {
            flowHint.classList.add('hidden');
        }
    }

    function onTouchEnd() {
        state.mouseInStage = false;
    }

    stage.addEventListener('mousemove', onMouseMove);
    stage.addEventListener('mouseleave', onMouseLeave);
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);

    inputText.addEventListener('input', function () {
        state.text = inputText.value || 'FLOW';
        spawnParticles();
    });

    btnShuffle.addEventListener('click', function () {
        state.noiseSeed = Math.random() * 65536;
        initNoise(state.noiseSeed);
        spawnParticles();
    });

    btnReset.addEventListener('click', function () {
        state.time = 0;
        state.noiseSeed = Math.random() * 65536;
        initNoise(state.noiseSeed);
        inputText.value = 'FLOW MAP';
        state.text = 'FLOW MAP';
        state.mode = 'perlin';
        state.forceMode = 'attract';
        state.trailMode = 'fade';
        state.palette = 'aurora';
        state.fontSize = 28;
        state.speed = 45;
        state.noiseScale = 50;
        state.forceStrength = 60;

        ctrlSize.value = 28; valSize.textContent = '28';
        ctrlSpeed.value = 45; valSpeed.textContent = '45';
        ctrlScale.value = 50; valScale.textContent = '50';
        ctrlForce.value = 60; valForce.textContent = '60';

        setActiveBtn(modeToggle, 'perlin');
        setActiveBtn(forceToggle, 'attract');
        setActiveBtn(trailToggle, 'fade');
        setActiveBtn(paletteToggle, 'aurora');
        applyPalette('aurora');

        spawnParticles();
    });

    // === Range Controls ===

    ctrlSize.addEventListener('input', function () {
        state.fontSize = parseInt(ctrlSize.value, 10);
        valSize.textContent = state.fontSize;
    });
    ctrlSpeed.addEventListener('input', function () {
        state.speed = parseInt(ctrlSpeed.value, 10);
        valSpeed.textContent = state.speed;
    });
    ctrlScale.addEventListener('input', function () {
        state.noiseScale = parseInt(ctrlScale.value, 10);
        valScale.textContent = state.noiseScale;
    });
    ctrlForce.addEventListener('input', function () {
        state.forceStrength = parseInt(ctrlForce.value, 10);
        valForce.textContent = state.forceStrength;
    });

    // === Toggle Helpers ===

    function setActiveBtn(container, value) {
        var btns = container.querySelectorAll('.mode-btn, .palette-btn');
        btns.forEach(function (b) {
            var attr = b.getAttribute('data-mode') || b.getAttribute('data-force') || b.getAttribute('data-trail') || b.getAttribute('data-palette');
            if (attr === value) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    function applyPalette(name) {
        state.palette = name;
        document.body.className = '';
        document.body.classList.add('palette-' + name);

        var pal = PALETTES[name];
        cursorGlow.style.background = 'radial-gradient(circle, rgba(' + pal.accentRgb + ',0.25) 0%, transparent 70%)';
    }

    // === Mode Toggle Listeners ===

    modeToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.mode-btn');
        if (!btn) return;
        state.mode = btn.getAttribute('data-mode');
        setActiveBtn(modeToggle, state.mode);
    });

    forceToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.mode-btn');
        if (!btn) return;
        state.forceMode = btn.getAttribute('data-force');
        setActiveBtn(forceToggle, state.forceMode);
    });

    trailToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.mode-btn');
        if (!btn) return;
        state.trailMode = btn.getAttribute('data-trail');
        setActiveBtn(trailToggle, state.trailMode);
    });

    paletteToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.palette-btn');
        if (!btn) return;
        applyPalette(btn.getAttribute('data-palette'));
        setActiveBtn(paletteToggle, btn.getAttribute('data-palette'));
    });

    // === Resize Handler ===

    var resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            resize();
            spawnParticles();
        }, 150);
    });

    // === Init ===

    function init() {
        initNoise(state.noiseSeed);
        resize();
        spawnParticles();
        lastTime = performance.now();
        state.rafId = requestAnimationFrame(loop);
    }

    init();
})();
