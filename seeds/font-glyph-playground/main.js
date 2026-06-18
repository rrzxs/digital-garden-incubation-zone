(function () {
    'use strict';

    // === DOM Elements ===
    var stage = document.getElementById('stage');
    var glyphStage = document.getElementById('glyph-stage');
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var modeBadge = document.getElementById('mode-badge');
    var modeDot = modeBadge.querySelector('.mode-dot');
    var modeText = document.getElementById('mode-text');

    var textInput = document.getElementById('text-input');
    var inputCount = document.getElementById('input-count');

    var ctrlWeight = document.getElementById('ctrl-weight');
    var ctrlWidth = document.getElementById('ctrl-width');
    var ctrlTracking = document.getElementById('ctrl-tracking');
    var ctrlSlant = document.getElementById('ctrl-slant');
    var ctrlSize = document.getElementById('ctrl-size');
    var valWeight = document.getElementById('val-weight');
    var valWidth = document.getElementById('val-width');
    var valTracking = document.getElementById('val-tracking');
    var valSlant = document.getElementById('val-slant');
    var valSize = document.getElementById('val-size');

    var presetBtns = document.querySelectorAll('.preset-btn');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var btnBrush = document.getElementById('btn-brush');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');

    // === Palettes (4 氛围配色) ===
    var palettes = {
        void: {
            accent: '#8b5cf6',
            accentSecondary: '#6366f1',
            glyph: 'rgba(255, 255, 255, 0.95)',
            glyphHover: '#8b5cf6',
            particle: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.10)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        jade: {
            accent: '#34d399',
            accentSecondary: '#10b981',
            glyph: 'rgba(255, 255, 255, 0.95)',
            glyphHover: '#34d399',
            particle: { r: 52, g: 211, b: 153 },
            glow: 'rgba(52, 211, 153, 0.10)',
            blobs: ['#0a2a1a', '#0d2a20', '#103a30', '#0a3530']
        },
        solar: {
            accent: '#fbbf24',
            accentSecondary: '#f59e0b',
            glyph: 'rgba(255, 255, 255, 0.95)',
            glyphHover: '#fbbf24',
            particle: { r: 251, g: 191, b: 36 },
            glow: 'rgba(251, 191, 36, 0.10)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        arctic: {
            accent: '#a5b4fc',
            accentSecondary: '#67e8f9',
            glyph: 'rgba(255, 255, 255, 0.95)',
            glyphHover: '#a5b4fc',
            particle: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.10)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830']
        }
    };

    // === State ===
    var state = {
        text: 'GLYPH',
        chars: [],
        weight: 600,
        widthFactor: 1.0,
        tracking: 0.02,
        slant: 0,
        size: 120,
        preset: 'idle',
        palette: 'void',
        brushMode: false,
        isDragging: false,
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        particles: [],
        dpr: window.devicePixelRatio || 1,
        lastTime: 0,
        time: 0
    };

    var PARTICLE_COUNT = 70;
    var MAX_CHARS = 32;

    // === Initialization ===
    function init() {
        resizeCanvas();
        buildGlyphs(state.text);
        initParticles();
        applyAxis();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        requestAnimationFrame(animate);
    }

    // === Canvas Setup ===
    function resizeCanvas() {
        var rect = stage.getBoundingClientRect();
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    // === Build Glyph Cells ===
    function buildGlyphs(text) {
        glyphStage.innerHTML = '';
        state.chars = [];

        var arr = (text || '').split('');
        for (var i = 0; i < arr.length && i < MAX_CHARS; i++) {
            var ch = arr[i];
            var el = document.createElement('span');
            el.className = 'glyph-char';
            if (ch === ' ') {
                el.classList.add('space');
                el.innerHTML = '&nbsp;';
            } else {
                el.textContent = ch;
            }
            glyphStage.appendChild(el);

            state.chars.push({
                el: el,
                char: ch,
                index: i,
                tx: 0,
                ty: 0,
                vx: 0,
                vy: 0,
                rotation: 0,
                rotationVel: 0,
                scale: 1,
                scaleVel: 0,
                glow: 0,
                glowVel: 0,
                phase: (i / Math.max(1, arr.length)) * Math.PI * 2,
                seed: Math.random() * 1000
            });
        }
        applyAxis();
    }

    // === Apply Typography Axis (font properties) ===
    function applyAxis() {
        var wght = state.weight;
        var wdth = Math.round(state.widthFactor * 100);
        var slnt = state.slant;
        var tracking = state.tracking.toFixed(3) + 'em';
        var fontSize = state.size + 'px';

        glyphStage.style.gap = tracking;
        glyphStage.style.fontSize = fontSize;

        state.chars.forEach(function (c) {
            // Inter supports variation: weight (100-900). Width is emulated via transform scaleX.
            c.el.style.fontWeight = wght;
            c.el.style.fontStretch = wdth + '%';
            c.el.style.letterSpacing = tracking;
        });
    }

    // === Particles ===
    function initParticles() {
        var rect = stage.getBoundingClientRect();
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle(
                Math.random() * rect.width,
                Math.random() * rect.height
            ));
        }
    }

    function createParticle(x, y) {
        return {
            x: x,
            y: y,
            originX: x,
            originY: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2 + 0.6,
            alpha: Math.random() * 0.4 + 0.15,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.2 + 0.05
        };
    }

    // === Events ===
    function bindEvents() {
        stage.addEventListener('mousemove', function (e) {
            var rect = stage.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouseInStage = true;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (state.brushMode && state.isDragging) {
                applyBrush(state.mouse.x, state.mouse.y);
            }
            updateHoverGlyph(state.mouse.x, state.mouse.y);

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        stage.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            clearHover();
        });

        stage.addEventListener('mousedown', function (e) {
            state.isDragging = true;
            var rect = stage.getBoundingClientRect();
            if (state.brushMode) {
                applyBrush(e.clientX - rect.left, e.clientY - rect.top);
            }
        });

        window.addEventListener('mouseup', function () {
            state.isDragging = false;
        });

        // Touch
        stage.addEventListener('touchstart', function (e) {
            state.isDragging = true;
            var touch = e.touches[0];
            var rect = stage.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouseInStage = true;
            if (state.brushMode) applyBrush(state.mouse.x, state.mouse.y);
            updateHoverGlyph(state.mouse.x, state.mouse.y);
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: true });

        stage.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stage.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
            if (state.brushMode && state.isDragging) {
                applyBrush(state.mouse.x, state.mouse.y);
            }
            updateHoverGlyph(state.mouse.x, state.mouse.y);
        }, { passive: false });

        stage.addEventListener('touchend', function () {
            state.isDragging = false;
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            clearHover();
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            initParticles();
        }, 250));
    }

    // === Hover Highlight ===
    function updateHoverGlyph(mx, my) {
        if (state.brushMode) return;
        var stageRect = stage.getBoundingClientRect();
        state.chars.forEach(function (c) {
            var r = c.el.getBoundingClientRect();
            var cx = r.left + r.width / 2 - stageRect.left;
            var cy = r.top + r.height / 2 - stageRect.top;
            var dx = mx - cx;
            var dy = my - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var radius = 70;
            if (dist < radius) {
                var intensity = 1 - dist / radius;
                c.el.classList.add('hovered');
                c.el.style.color = '';
                c.glowVel += intensity * 0.15;
                // slight magnetic pull toward cursor
                var pull = intensity * 0.35;
                c.vx += (dx) * pull * 0.002;
                c.vy += (dy) * pull * 0.002;
            } else {
                c.el.classList.remove('hovered');
            }
        });
    }

    function clearHover() {
        state.chars.forEach(function (c) {
            c.el.classList.remove('hovered');
        });
    }

    // === Brush Mode (涂抹) ===
    function applyBrush(mx, my) {
        var stageRect = stage.getBoundingClientRect();
        state.chars.forEach(function (c) {
            var r = c.el.getBoundingClientRect();
            var cx = r.left + r.width / 2 - stageRect.left;
            var cy = r.top + r.height / 2 - stageRect.top;
            var dx = mx - cx;
            var dy = my - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var radius = 90;
            if (dist < radius) {
                var intensity = 1 - dist / radius;
                intensity = intensity * intensity;
                c.el.classList.add('brushed');
                // explosion outward from brush
                var angle = Math.atan2(dy, dx);
                c.vx -= Math.cos(angle) * intensity * 4;
                c.vy -= Math.sin(angle) * intensity * 4;
                c.rotationVel += (Math.random() - 0.5) * intensity * 0.4;
                c.scaleVel += intensity * 0.18;
                c.glowVel += intensity * 0.6;
            }
        });
    }

    // === Controls Binding ===
    function bindControls() {
        textInput.addEventListener('input', function () {
            var val = this.value.toUpperCase();
            state.text = val;
            inputCount.textContent = val.length + ' / ' + MAX_CHARS;
            buildGlyphs(val);
        });

        ctrlWeight.addEventListener('input', function () {
            state.weight = parseInt(this.value, 10);
            valWeight.textContent = state.weight;
            applyAxis();
        });

        ctrlWidth.addEventListener('input', function () {
            state.widthFactor = parseInt(this.value, 10) / 100;
            valWidth.textContent = state.widthFactor.toFixed(2);
            applyAxis();
        });

        ctrlTracking.addEventListener('input', function () {
            state.tracking = parseInt(this.value, 10) / 1000;
            valTracking.textContent = state.tracking.toFixed(2);
            applyAxis();
        });

        ctrlSlant.addEventListener('input', function () {
            state.slant = parseInt(this.value, 10);
            valSlant.textContent = state.slant + '°';
        });

        ctrlSize.addEventListener('input', function () {
            state.size = parseInt(this.value, 10);
            valSize.textContent = state.size;
            applyAxis();
        });

        presetBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                presetBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.preset = btn.dataset.preset;
            });
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette();
            });
        });

        btnBrush.addEventListener('click', function () {
            state.brushMode = !state.brushMode;
            btnBrush.classList.toggle('active', state.brushMode);
            modeDot.classList.toggle('brush', state.brushMode);
            modeText.textContent = state.brushMode ? 'Brush' : 'Smooth';
            if (state.brushMode) {
                // clear previous brush marks when entering
                state.chars.forEach(function (c) { c.el.classList.remove('brushed'); });
            }
        });

        btnShuffle.addEventListener('click', function () {
            state.chars.forEach(function (c) {
                c.vx += (Math.random() - 0.5) * 12;
                c.vy += (Math.random() - 0.5) * 12;
                c.rotationVel += (Math.random() - 0.5) * 0.8;
                c.scaleVel += (Math.random() - 0.5) * 0.4;
                c.glowVel += 0.5;
            });
        });

        btnReset.addEventListener('click', function () {
            // reset sliders
            ctrlWeight.value = 600; state.weight = 600; valWeight.textContent = '600';
            ctrlWidth.value = 100; state.widthFactor = 1.0; valWidth.textContent = '1.00';
            ctrlTracking.value = 2; state.tracking = 0.02; valTracking.textContent = '0.02';
            ctrlSlant.value = 0; state.slant = 0; valSlant.textContent = '0°';
            ctrlSize.value = 120; state.size = 120; valSize.textContent = '120';
            // reset preset
            presetBtns.forEach(function (b) { b.classList.remove('active'); });
            document.querySelector('.preset-btn[data-preset="idle"]').classList.add('active');
            state.preset = 'idle';
            // clear brush marks
            state.chars.forEach(function (c) {
                c.el.classList.remove('brushed');
                c.el.classList.remove('hovered');
            });
            applyAxis();
        });
    }

    // === Apply Palette ===
    function applyPalette() {
        var p = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + p.glow + ' 0%, transparent 70%)';
        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });
        document.documentElement.style.setProperty('--color-accent', p.accent);
        document.documentElement.style.setProperty('--color-accent-secondary', p.accentSecondary);
    }

    // === Animation Loop ===
    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;
        state.time = time * 0.001;

        ctx.clearRect(0, 0, canvas.width / state.dpr, canvas.height / state.dpr);

        updateParticles(dt);
        drawParticles();
        updateChars(dt);
        applyCharTransforms();

        requestAnimationFrame(animate);
    }

    // === Char Update (spring physics + preset animation) ===
    function updateChars(dt) {
        var t = state.time;
        var preset = state.preset;
        var slantRad = state.slant * Math.PI / 180;
        var widthScale = state.widthFactor;

        state.chars.forEach(function (c, i) {
            // Preset-driven target animation
            var targetTx = 0;
            var targetTy = 0;
            var targetRot = 0;
            var targetScale = 1;
            var targetGlow = 0;

            if (preset === 'breathe') {
                var breathe = Math.sin(t * 1.4 + c.phase) * 0.5 + 0.5;
                targetScale = 0.9 + breathe * 0.25;
                targetGlow = breathe * 0.7;
            } else if (preset === 'jitter') {
                var jx = Math.sin(t * 18 + c.seed) * 2.2;
                var jy = Math.cos(t * 21 + c.seed * 1.3) * 2.2;
                targetTx = jx;
                targetTy = jy;
                targetRot = Math.sin(t * 14 + c.seed) * 0.04;
            } else if (preset === 'wave') {
                var w = Math.sin(t * 2.2 + i * 0.55);
                targetTy = w * 18;
                targetRot = w * 0.12;
                targetScale = 1 + w * 0.05;
                targetGlow = Math.max(0, w) * 0.5;
            } else if (preset === 'bounce') {
                var b = Math.abs(Math.sin(t * 2.6 + i * 0.4));
                targetTy = -b * 26;
                targetScale = 1 + b * 0.08;
                targetGlow = b * 0.4;
            }

            // Spring toward preset targets
            c.scaleVel += (targetScale - c.scale) * 0.06 * dt;
            c.scaleVel *= Math.pow(0.88, dt);
            c.scale += c.scaleVel * dt;

            c.glowVel += (targetGlow - c.glow) * 0.05 * dt;
            c.glowVel *= Math.pow(0.9, dt);
            c.glow += c.glowVel * dt;

            // Manual offsets (from preset jitter/wave/bounce) - blend with velocity
            var homeTxForce = (targetTx - c.tx) * 0.12;
            var homeTyForce = (targetTy - c.ty) * 0.12;
            c.vx += homeTxForce * dt;
            c.vy += homeTyForce * dt;

            // Damping
            c.vx *= Math.pow(0.86, dt);
            c.vy *= Math.pow(0.86, dt);

            c.tx += c.vx * dt;
            c.ty += c.vy * dt;

            // Rotation spring (toward preset target + slant)
            var rotTarget = targetRot + slantRad;
            c.rotationVel += (rotTarget - c.rotation) * 0.08 * dt;
            c.rotationVel *= Math.pow(0.88, dt);
            c.rotation += c.rotationVel * dt;
        });
    }

    // === Apply Transform to DOM ===
    function applyCharTransforms() {
        var widthScale = state.widthFactor;
        var pal = palettes[state.palette];

        state.chars.forEach(function (c) {
            var s = Math.max(0.1, c.scale);
            var scaleX = s * widthScale;
            var scaleY = s;
            var glow = Math.max(0, Math.min(1, c.glow));

            c.el.style.transform =
                'translate(' + c.tx.toFixed(2) + 'px,' + c.ty.toFixed(2) + 'px) ' +
                'rotate(' + c.rotation.toFixed(3) + 'rad) ' +
                'scale(' + scaleX.toFixed(4) + ',' + scaleY.toFixed(4) + ')';

            // Apply glow as text-shadow when needed (for preset breathe/wave/bounce + brush)
            if (glow > 0.05 && !c.el.classList.contains('hovered') && !c.el.classList.contains('brushed')) {
                c.el.style.color = '';
                c.el.style.textShadow =
                    '0 0 ' + (glow * 22).toFixed(1) + 'px ' + pal.accent +
                    ', 0 0 ' + (glow * 44).toFixed(1) + 'px ' + pal.accent;
            } else if (!c.el.classList.contains('hovered') && !c.el.classList.contains('brushed')) {
                c.el.style.textShadow = '';
            }
        });
    }

    // === Particle Update ===
    function updateParticles(dt) {
        var mouseActive = state.mouseInStage && state.mouse.x > -999;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;

            if (mouseActive) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = state.brushMode ? 140 : 100;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.25;
                    var angle = Math.atan2(dy, dx);
                    // gentle swirl + repel
                    p.vx += (-Math.cos(angle)) * force * dt;
                    p.vy += (-Math.sin(angle)) * force * dt;
                    p.vx += (-Math.sin(angle)) * force * 0.5 * dt;
                    p.vy += Math.cos(angle) * force * 0.5 * dt;
                }
            }

            var homeForceX = (p.originX - p.x) * 0.004;
            var homeForceY = (p.originY - p.y) * 0.004;
            p.vx += homeForceX * dt;
            p.vy += homeForceY * dt;

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;
        });
    }

    function drawParticles() {
        var pal = palettes[state.palette].particle;
        var mx = state.mouse.x;
        var my = state.mouse.y;

        state.particles.forEach(function (p) {
            var breathe = Math.sin(p.phase) * 0.2 + 1;
            var drawRadius = Math.max(0.1, p.radius * breathe);

            ctx.beginPath();
            ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            // halo for larger particles
            if (p.radius > 1.2) {
                var haloR = drawRadius * 3.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });

        // connections near cursor
        if (state.mouseInStage && state.mouse.x > -999) {
            var maxDist = 80;
            state.particles.forEach(function (p) {
                var dx = mx - p.x;
                var dy = my - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    var alpha = (1 - dist / maxDist) * 0.14;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mx, my);
                    ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = 0.4;
                    ctx.stroke();
                }
            });
        }
    }

    // === Utils ===
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(self, args);
            }, delay);
        };
    }

    init();
})();
