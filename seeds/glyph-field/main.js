(function () {
    'use strict';

    var canvas = document.getElementById('field-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var fieldHint = document.getElementById('field-hint');
    var fieldArea = document.getElementById('field-area');
    var glyphGrid = document.getElementById('glyph-grid');

    var ctrlForce = document.getElementById('ctrl-force');
    var ctrlSpring = document.getElementById('ctrl-spring');
    var ctrlRadius = document.getElementById('ctrl-radius');
    var valForce = document.getElementById('val-force');
    var valSpring = document.getElementById('val-spring');
    var valRadius = document.getElementById('val-radius');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');
    var charsetBtns = document.querySelectorAll('.charset-btn');

    var charsets = {
        kana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
        runes: 'ᚠᚡᚢᚣᚤᚥᚦᚧᚨᚩᚪᚫᚬᚭᚮᚯᚰᚱᚲᚳᚴᚵᚶᚷᚸᚹᚺᚻᚼᚽᚾᚿᛀᛁᛂᛃᛄᛅᛆᛇᛈᛉᛊᛋᛌᛍᛎᛏᛐᛑᛒᛓᛔᛕᛖᛗᛘᛙᛚᛛᛜᛝᛞᛟ',
        symbols: '◈◇△▽○●□■☆★♤♡♢♧✧⟐◎⬡⬢✦⟡◉⬟⏣⎔⬣',
        code: '{}[]()<>=/\\|&^~!@#$%;:?+-*01abcdefxyzfnvarlet'
    };

    var palettes = {
        void: {
            particle: { r: 139, g: 92, b: 246 },
            glyph: '#8b5cf6',
            glyphDim: 'rgba(139, 92, 246, 0.18)',
            glyphBright: 'rgba(139, 92, 246, 0.85)',
            glow: 'rgba(139, 92, 246, 0.08)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540']
        },
        jade: {
            particle: { r: 52, g: 211, b: 153 },
            glyph: '#34d399',
            glyphDim: 'rgba(52, 211, 153, 0.18)',
            glyphBright: 'rgba(52, 211, 153, 0.85)',
            glow: 'rgba(52, 211, 153, 0.08)',
            blobs: ['#0a2a1a', '#0d2a20', '#103a30', '#0a3530']
        },
        solar: {
            particle: { r: 251, g: 191, b: 36 },
            glyph: '#fbbf24',
            glyphDim: 'rgba(251, 191, 36, 0.18)',
            glyphBright: 'rgba(251, 191, 36, 0.85)',
            glow: 'rgba(251, 191, 36, 0.08)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008']
        },
        arctic: {
            particle: { r: 165, g: 180, b: 252 },
            glyph: '#a5b4fc',
            glyphDim: 'rgba(165, 180, 252, 0.18)',
            glyphBright: 'rgba(165, 180, 252, 0.85)',
            glow: 'rgba(165, 180, 252, 0.08)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830']
        }
    };

    var state = {
        mouse: { x: -9999, y: -9999 },
        mouseInField: false,
        hasInteracted: false,
        force: 0.50,
        spring: 0.08,
        radius: 200,
        mode: 'attract',
        palette: 'void',
        charset: 'kana',
        glyphs: [],
        particles: [],
        dpr: window.devicePixelRatio || 1,
        lastTime: 0,
        time: 0
    };

    var COLS = 0;
    var ROWS = 0;
    var PARTICLE_COUNT = 60;

    function init() {
        resizeCanvas();
        buildGrid();
        initParticles();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    function resizeCanvas() {
        var rect = fieldArea.getBoundingClientRect();
        canvas.width = rect.width * state.dpr;
        canvas.height = rect.height * state.dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function buildGrid() {
        var rect = fieldArea.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        var cellSize = 42;

        COLS = Math.floor(w / cellSize);
        ROWS = Math.floor(h / cellSize);

        if (COLS < 4) COLS = 4;
        if (ROWS < 3) ROWS = 3;

        glyphGrid.style.gridTemplateColumns = 'repeat(' + COLS + ', 1fr)';
        glyphGrid.style.gridTemplateRows = 'repeat(' + ROWS + ', 1fr)';
        glyphGrid.innerHTML = '';

        var chars = charsets[state.charset];
        state.glyphs = [];

        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var ch = chars[Math.floor(Math.random() * chars.length)];
                var cell = document.createElement('span');
                cell.className = 'glyph-cell';
                cell.textContent = ch;
                glyphGrid.appendChild(cell);

                state.glyphs.push({
                    el: cell,
                    char: ch,
                    row: r,
                    col: c,
                    offsetX: 0,
                    offsetY: 0,
                    velocityX: 0,
                    velocityY: 0,
                    rotation: 0,
                    rotationVel: 0,
                    scale: 1,
                    scaleVel: 0,
                    brightness: 0,
                    brightnessVel: 0,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
    }

    function initParticles() {
        var rect = fieldArea.getBoundingClientRect();
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
            speed: Math.random() * 0.2 + 0.05,
            life: Math.random()
        };
    }

    function bindEvents() {
        fieldArea.addEventListener('mousemove', function (e) {
            var rect = fieldArea.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouseInField = true;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                fieldHint.classList.add('hidden');
            }
        });

        fieldArea.addEventListener('mouseleave', function () {
            state.mouseInField = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        fieldArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = fieldArea.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouseInField = true;

            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                fieldHint.classList.add('hidden');
            }
        }, { passive: false });

        fieldArea.addEventListener('touchend', function () {
            state.mouseInField = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            buildGrid();
            initParticles();
        }, 250));
    }

    function bindControls() {
        ctrlForce.addEventListener('input', function () {
            state.force = parseInt(this.value, 10) / 100;
            valForce.textContent = state.force.toFixed(2);
        });

        ctrlSpring.addEventListener('input', function () {
            state.spring = parseInt(this.value, 10) / 100;
            valSpring.textContent = state.spring.toFixed(2);
        });

        ctrlRadius.addEventListener('input', function () {
            state.radius = parseInt(this.value, 10);
            valRadius.textContent = state.radius;
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette();
            });
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
            });
        });

        charsetBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                charsetBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.charset = btn.dataset.charset;
                buildGrid();
                initParticles();
            });
        });

        btnShuffle.addEventListener('click', function () {
            var chars = charsets[state.charset];
            state.glyphs.forEach(function (g) {
                g.char = chars[Math.floor(Math.random() * chars.length)];
                g.el.textContent = g.char;
                g.offsetX = (Math.random() - 0.5) * 30;
                g.offsetY = (Math.random() - 0.5) * 30;
                g.rotationVel += (Math.random() - 0.5) * 0.3;
                g.scale = 0.3 + Math.random() * 0.5;
            });
            state.hasInteracted = false;
            fieldHint.classList.remove('hidden');
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                btnFullscreen.querySelector('span').textContent = '退出';
            } else {
                document.exitFullscreen();
                btnFullscreen.querySelector('span').textContent = '全屏';
            }
        });
    }

    function applyPalette() {
        var p = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + p.glow + ' 0%, transparent 70%)';

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });

        document.documentElement.style.setProperty('--color-accent', p.glyph);
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;
        state.time = time * 0.001;

        ctx.clearRect(0, 0, canvas.width / state.dpr, canvas.height / state.dpr);

        updateParticles(dt);
        drawParticles();
        updateGlyphs(dt);
        applyGlyphTransforms();

        requestAnimationFrame(animate);
    }

    function updateGlyphs(dt) {
        var mouseActive = state.mouseInField && state.mouse.x > -999;
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var rad = state.radius;
        var pal = palettes[state.palette];

        state.glyphs.forEach(function (g) {
            var rect = g.el.getBoundingClientRect();
            var fieldRect = fieldArea.getBoundingClientRect();
            var cx = rect.left + rect.width / 2 - fieldRect.left;
            var cy = rect.top + rect.height / 2 - fieldRect.top;

            if (mouseActive) {
                var dx = mx - (cx + g.offsetX);
                var dy = my - (cy + g.offsetY);
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < rad) {
                    var intensity = (1 - dist / rad);
                    intensity = intensity * intensity;
                    var angle = Math.atan2(dy, dx);

                    if (state.mode === 'attract') {
                        g.velocityX += Math.cos(angle) * intensity * state.force * 50 * dt;
                        g.velocityY += Math.sin(angle) * intensity * state.force * 50 * dt;
                    } else if (state.mode === 'repel') {
                        g.velocityX -= Math.cos(angle) * intensity * state.force * 60 * dt;
                        g.velocityY -= Math.sin(angle) * intensity * state.force * 60 * dt;
                    } else if (state.mode === 'vortex') {
                        var perpX = -Math.sin(angle);
                        var perpY = Math.cos(angle);
                        g.velocityX += perpX * intensity * state.force * 45 * dt;
                        g.velocityY += perpY * intensity * state.force * 45 * dt;
                        g.velocityX += Math.cos(angle) * intensity * state.force * 8 * dt;
                        g.velocityY += Math.sin(angle) * intensity * state.force * 8 * dt;
                    }

                    g.rotationVel += (Math.sin(angle) * intensity * 0.04) * dt;
                    g.scaleVel += (intensity * 0.015) * dt;
                    g.brightnessVel += (intensity * 0.08) * dt;
                }
            }

            var homeForceX = -g.offsetX * state.spring * 3;
            var homeForceY = -g.offsetY * state.spring * 3;
            g.velocityX += homeForceX * dt;
            g.velocityY += homeForceY * dt;

            g.velocityX *= Math.pow(0.88, dt);
            g.velocityY *= Math.pow(0.88, dt);

            g.offsetX += g.velocityX * dt;
            g.offsetY += g.velocityY * dt;

            g.rotationVel += (-g.rotation * 0.06) * dt;
            g.rotationVel *= Math.pow(0.9, dt);
            g.rotation += g.rotationVel * dt;

            g.scaleVel += (1 - g.scale) * 0.05 * dt;
            g.scaleVel *= Math.pow(0.92, dt);
            g.scale += g.scaleVel * dt;

            g.brightnessVel += (0 - g.brightness) * 0.04 * dt;
            g.brightnessVel *= Math.pow(0.9, dt);
            g.brightness += g.brightnessVel * dt;
        });
    }

    function applyGlyphTransforms() {
        var pal = palettes[state.palette];

        state.glyphs.forEach(function (g) {
            var tx = g.offsetX;
            var ty = g.offsetY;
            var r = g.rotation;
            var s = Math.max(0.1, g.scale);
            var b = Math.max(0, Math.min(1, g.brightness));

            g.el.style.transform =
                'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) ' +
                'rotate(' + r.toFixed(3) + 'rad) ' +
                'scale(' + s.toFixed(4) + ')';

            if (b > 0.05) {
                g.el.classList.add('activated');
                g.el.style.color = lerpColor(pal.glyphDim, pal.glyphBright, b);
                g.el.style.textShadow = '0 0 ' + (b * 24).toFixed(1) + 'px ' + pal.glyph;
            } else {
                g.el.classList.remove('activated');
                g.el.style.color = '';
                g.el.style.textShadow = '';
            }
        });
    }

    function lerpColor(from, to, t) {
        return t > 0.5 ? to : from;
    }

    function updateParticles(dt) {
        var mouseActive = state.mouseInField && state.mouse.x > -999;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.life += 0.001 * dt;

            if (mouseActive) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = state.radius * 1.3;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.2;
                    var angle = Math.atan2(dy, dx);

                    if (state.mode === 'attract') {
                        p.vx += Math.cos(angle) * force * dt;
                        p.vy += Math.sin(angle) * force * dt;
                    } else if (state.mode === 'repel') {
                        p.vx -= Math.cos(angle) * force * dt * 1.3;
                        p.vy -= Math.sin(angle) * force * dt * 1.3;
                    } else if (state.mode === 'vortex') {
                        p.vx += (-Math.sin(angle)) * force * dt * 1.2;
                        p.vy += Math.cos(angle) * force * dt * 1.2;
                    }
                }
            }

            var homeForceX = (p.originX - p.x) * 0.005;
            var homeForceY = (p.originY - p.y) * 0.005;
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
            var breathe = Math.sin(p.phase) * 0.15 + 1;
            var drawRadius = Math.max(0.1, p.radius * breathe);

            ctx.beginPath();
            ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, drawRadius * 3.5, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawRadius * 3.5);
                grad.addColorStop(0, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });

        if (state.mouseInField && state.mouse.x > -999) {
            drawConnections();
        }
    }

    function drawConnections() {
        var pal = palettes[state.palette].particle;
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var maxDist = state.radius * 0.5;

        state.particles.forEach(function (p) {
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
                var alpha = (1 - dist / maxDist) * 0.12;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.4;
                ctx.stroke();
            }
        });

        for (var i = 0; i < state.particles.length; i++) {
            for (var j = i + 1; j < state.particles.length; j++) {
                var pi = state.particles[i];
                var pj = state.particles[j];
                var dx = pi.x - pj.x;
                var dy = pi.y - pj.y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 60) {
                    var alpha = (1 - dist / 60) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(pi.x, pi.y);
                    ctx.lineTo(pj.x, pj.y);
                    ctx.strokeStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = 0.3;
                    ctx.stroke();
                }
            }
        }
    }

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
