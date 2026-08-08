(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    var MODES = ['magnetic', 'repel', 'wave', 'glitch', 'gravity'];
    var MODE_NAMES = {
        magnetic: 'Magnetic',
        repel: 'Repel',
        wave: 'Wave',
        glitch: 'Glitch',
        gravity: 'Gravity'
    };

    var GLITCH_CHARS = '!<>-_\\/[]{}=+*^?#01ﾊﾐﾋｰｳｼﾅﾐﾌﾟABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
            var s2 = (xin + yin) * F2;
            var i = Math.floor(xin + s2);
            var j = Math.floor(yin + s2);
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
    var forgeStage   = document.getElementById('forge-stage');
    var canvasGlow   = document.getElementById('canvas-glow');
    var inputText    = document.getElementById('input-text');
    var ctrlSize     = document.getElementById('ctrl-size');
    var ctrlWeight   = document.getElementById('ctrl-weight');
    var ctrlSpacing  = document.getElementById('ctrl-spacing');
    var ctrlRadius   = document.getElementById('ctrl-radius');
    var ctrlAmp      = document.getElementById('ctrl-amplitude');
    var valSize      = document.getElementById('val-size');
    var valWeight    = document.getElementById('val-weight');
    var valSpacing   = document.getElementById('val-spacing');
    var valRadius    = document.getElementById('val-radius');
    var valAmp       = document.getElementById('val-amplitude');
    var modeToggle   = document.getElementById('mode-toggle');
    var paletteToggle = document.getElementById('palette-toggle');
    var btnPulse     = document.getElementById('btn-pulse');
    var btnReset     = document.getElementById('btn-reset');
    var teleForge    = document.getElementById('tele-forge');
    var teleChrs     = document.getElementById('tele-chrs');
    var teleForce    = document.getElementById('tele-force');
    var teleFps      = document.getElementById('tele-fps');
    var ctx          = particleCv.getContext('2d');

    // === State ===

    var state = {
        text: 'Forge',
        mode: 'magnetic',
        palette: 'aurora',
        size: 120,
        weight: 800,
        spacing: -0.03,
        radius: 200,
        amplitude: 0.65,
        mouseX: -9999,
        mouseY: -9999,
        mouseInside: false,
        mouseActive: false,
        time: 0,
        fps: 60,
        forceLevel: 0
    };

    var chars = [];
    var noise = buildSimplex(42);
    var particles = [];
    var pulses = [];
    var PARTICLE_COUNT = 80;

    // === Character Model ===

    function CharModel(el, homeX, homeY) {
        this.el = el;
        this.homeX = homeX;
        this.homeY = homeY;
        this.x = homeX;
        this.y = homeY;
        this.vx = 0;
        this.vy = 0;
        this.scale = 1;
        this.targetScale = 1;
        this.rotation = 0;
        this.targetRotation = 0;
        this.blur = 0;
        this.opacity = 1;
        this.colorShift = 0;
        this.glitchChar = null;
        this.glitchTimer = 0;
        this.originalChar = el.textContent;
        this.revealProgress = 0;
    }

    CharModel.prototype.update = function (dt) {
        var mode = state.mode;
        var amp = state.amplitude;
        var radius = state.radius;
        var mx = state.mouseX;
        var my = state.mouseY;

        // Get character center relative to document
        var rect = this.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var dx = mx - cx;
        var dy = my - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var influence = 0;
        var targetX = this.homeX;
        var targetY = this.homeY;
        this.targetScale = 1;
        this.targetRotation = 0;

        // Pulse shockwave influence
        for (var pi = 0; pi < pulses.length; pi++) {
            var pulse = pulses[pi];
            var pdx = pulse.x - cx;
            var pdy = pulse.y - cy;
            var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            var ringDist = Math.abs(pdist - pulse.radius);
            if (ringDist < 80) {
                var ringForce = (1 - ringDist / 80) * pulse.strength;
                var ang = Math.atan2(cy - pulse.y, cx - pulse.x);
                targetX += Math.cos(ang) * ringForce * 40;
                targetY += Math.sin(ang) * ringForce * 40;
                this.targetScale += ringForce * 0.3;
            }
        }

        if (state.mouseInside && dist < radius) {
            influence = (1 - dist / radius) * amp;
            var angle = Math.atan2(dy, dx);

            switch (mode) {
                case 'magnetic':
                    var pullStrength = influence * 60;
                    targetX += Math.cos(angle) * pullStrength;
                    targetY += Math.sin(angle) * pullStrength;
                    this.targetScale = 1 + influence * 0.4;
                    break;

                case 'repel':
                    var pushStrength = influence * 80;
                    targetX -= Math.cos(angle) * pushStrength;
                    targetY -= Math.sin(angle) * pushStrength;
                    this.targetScale = 1 - influence * 0.15;
                    this.targetRotation = influence * 15 * Math.sin(state.time * 0.003 + this.homeX * 0.01);
                    break;

                case 'wave':
                    var wave = noise(this.homeX * 0.005, state.time * 0.0008);
                    targetY += wave * influence * 50;
                    targetX += noise(this.homeY * 0.005 + 100, state.time * 0.0008) * influence * 30;
                    this.targetScale = 1 + influence * 0.25;
                    this.colorShift = influence;
                    break;

                case 'glitch':
                    if (influence > 0.3) {
                        targetX += (Math.random() - 0.5) * influence * 30;
                        targetY += (Math.random() - 0.5) * influence * 30;
                        this.targetRotation += (Math.random() - 0.5) * influence * 20;
                        this.glitchTimer -= dt;
                        if (this.glitchTimer <= 0) {
                            this.glitchTimer = 40 + Math.random() * 80;
                            if (this.glitchChar) {
                                this.glitchChar = null;
                            } else {
                                this.glitchChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                            }
                        }
                    } else {
                        this.glitchChar = null;
                    }
                    this.el.textContent = this.glitchChar || this.originalChar;
                    break;

                case 'gravity':
                    var gravityStrength = influence * 70;
                    targetY += gravityStrength;
                    this.targetScale = 1 + influence * 0.2;
                    break;
            }
        } else {
            if (this.glitchChar) {
                this.glitchChar = null;
                this.el.textContent = this.originalChar;
            }
            this.colorShift *= 0.95;
        }

        // Spring physics
        var spring = 0.12;
        var damping = 0.82;
        var ax = (targetX - this.x) * spring;
        var ay = (targetY - this.y) * spring;
        this.vx = (this.vx + ax) * damping;
        this.vy = (this.vy + ay) * damping;
        this.x += this.vx;
        this.y += this.vy;

        // Scale & rotation lerp
        this.scale += (this.targetScale - this.scale) * 0.15;
        this.rotation += (this.targetRotation - this.rotation) * 0.15;

        // Apply transform
        var tx = this.x - this.homeX;
        var ty = this.y - this.homeY;
        this.el.style.transform = 'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px) scale(' + this.scale.toFixed(3) + ') rotate(' + this.rotation.toFixed(2) + 'deg)';

        // Color shift for wave mode
        if (this.colorShift > 0.01) {
            var hueShift = this.colorShift * 60;
            this.el.style.filter = 'hue-rotate(' + hueShift.toFixed(0) + 'deg)';
        } else {
            this.el.style.filter = '';
        }

        state.forceLevel = Math.max(state.forceLevel * 0.92, influence);
    };

    // === Build Characters ===

    function buildChars() {
        var text = state.text || ' ';
        forgeStage.innerHTML = '';
        chars = [];

        var displaySize = state.size;
        var displayWeight = state.weight;
        var displaySpacing = state.spacing;

        var lines = text.split('\n');
        var globalIdx = 0;

        for (var li = 0; li < lines.length; li++) {
            var lineText = lines[li];
            if (lineText.length === 0) lineText = ' ';
            var lineDiv = document.createElement('div');
            lineDiv.className = 'forge-line';
            lineDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;letter-spacing:' + displaySpacing + 'em;';

            for (var ci = 0; ci < lineText.length; ci++) {
                var ch = lineText[ci];
                var span = document.createElement('span');
                span.className = 'char-sprite revealing';
                span.textContent = ch;
                span.style.fontSize = displaySize + 'px';
                span.style.fontWeight = displayWeight;
                span.style.animationDelay = (globalIdx * 0.03) + 's';
                lineDiv.appendChild(span);

                // Record home position after layout
                (function (el, idx) {
                    requestAnimationFrame(function () {
                        var rect = el.getBoundingClientRect();
                        var parentRect = forgeStage.getBoundingClientRect();
                        var hx = rect.left - parentRect.left + rect.width / 2;
                        var hy = rect.top - parentRect.top + rect.height / 2;
                        chars.push(new CharModel(el, hx, hy));
                    });
                })(span, globalIdx);

                globalIdx++;
            }

            forgeStage.appendChild(lineDiv);
        }

        teleChrs.textContent = chars.length || text.length;
    }

    // === Particle Flow Field ===

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: 0,
                vy: 0,
                life: Math.random() * 200 + 50,
                maxLife: 250,
                size: Math.random() * 2 + 0.5
            });
        }
    }

    function updateParticles(dt) {
        var w = particleCv.width;
        var h = particleCv.height;
        var t = state.time * 0.0003;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var n = noise(p.x * 0.002, p.y * 0.002 + t);
            var angle = n * Math.PI * 2;
            p.vx += Math.cos(angle) * 0.15;
            p.vy += Math.sin(angle) * 0.15;

            // Mouse force
            if (state.mouseInside) {
                var dx = state.mouseX - p.x;
                var dy = state.mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < state.radius && dist > 1) {
                    var force = (1 - dist / state.radius) * 0.8;
                    p.vx -= (dx / dist) * force;
                    p.vy -= (dy / dist) * force;
                }
            }

            p.vx *= 0.94;
            p.vy *= 0.94;
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 1;

            if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
                p.x = Math.random() * w;
                p.y = Math.random() * h;
                p.vx = 0;
                p.vy = 0;
                p.life = p.maxLife;
            }
        }
    }

    function drawParticles() {
        var w = particleCv.width;
        var h = particleCv.height;
        ctx.clearRect(0, 0, w, h);

        var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#c4b5fd';

        ctx.globalCompositeOperation = 'screen';
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var alpha = (p.life / p.maxLife) * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.globalAlpha = alpha;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // === Pulse Shockwaves ===

    function spawnPulse(x, y) {
        pulses.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 500,
            strength: 1,
            life: 1
        });
    }

    function updatePulses(dt) {
        for (var i = pulses.length - 1; i >= 0; i--) {
            var p = pulses[i];
            p.radius += 8;
            p.life -= 0.012;
            p.strength = p.life;
            if (p.life <= 0) {
                pulses.splice(i, 1);
            }
        }
    }

    function drawPulses() {
        var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#c4b5fd';
        ctx.globalCompositeOperation = 'screen';
        for (var i = 0; i < pulses.length; i++) {
            var p = pulses[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = accent;
            ctx.globalAlpha = p.life * 0.4;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // === Canvas Resize ===

    function resizeCanvas() {
        particleCv.width = window.innerWidth;
        particleCv.height = window.innerHeight;
    }

    // === Mouse Tracking ===

    function setupMouse() {
        var tx = 0, ty = 0;
        var cx = 0, cy = 0;

        window.addEventListener('mousemove', function (e) {
            tx = e.clientX;
            ty = e.clientY;
            state.mouseInside = true;
            cursorGlow.classList.add('visible');
        });

        window.addEventListener('mouseleave', function () {
            state.mouseInside = false;
            cursorGlow.classList.remove('visible');
        });

        window.addEventListener('mousedown', function () {
            cursorGlow.classList.add('active');
            state.mouseActive = true;
        });

        window.addEventListener('mouseup', function () {
            cursorGlow.classList.remove('active');
            state.mouseActive = false;
        });

        // Touch support
        window.addEventListener('touchmove', function (e) {
            if (e.touches.length > 0) {
                tx = e.touches[0].clientX;
                ty = e.touches[0].clientY;
                state.mouseInside = true;
                cursorGlow.classList.add('visible');
            }
        }, { passive: true });

        window.addEventListener('touchend', function () {
            state.mouseInside = false;
            cursorGlow.classList.remove('visible');
        });

        window.addEventListener('touchstart', function (e) {
            if (e.touches.length > 0) {
                spawnPulse(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        // Smooth cursor follow
        function cursorLoop() {
            cx += (tx - cx) * 0.2;
            cy += (ty - cy) * 0.2;
            cursorGlow.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%, -50%)';
            state.mouseX = cx;
            state.mouseY = cy;
            requestAnimationFrame(cursorLoop);
        }
        cursorLoop();
    }

    // === Controls ===

    function setupControls() {
        inputText.addEventListener('input', function () {
            state.text = inputText.value || ' ';
            buildChars();
        });

        ctrlSize.addEventListener('input', function () {
            state.size = parseInt(ctrlSize.value);
            valSize.textContent = state.size;
            forgeStage.style.fontSize = '';
            buildChars();
        });

        ctrlWeight.addEventListener('input', function () {
            state.weight = parseInt(ctrlWeight.value);
            valWeight.textContent = state.weight;
            var sprites = forgeStage.querySelectorAll('.char-sprite');
            for (var i = 0; i < sprites.length; i++) {
                sprites[i].style.fontWeight = state.weight;
            }
        });

        ctrlSpacing.addEventListener('input', function () {
            var raw = parseInt(ctrlSpacing.value);
            state.spacing = raw / 100;
            valSpacing.textContent = state.spacing.toFixed(2);
            var lines = forgeStage.querySelectorAll('.forge-line');
            for (var i = 0; i < lines.length; i++) {
                lines[i].style.letterSpacing = state.spacing + 'em';
            }
        });

        ctrlRadius.addEventListener('input', function () {
            state.radius = parseInt(ctrlRadius.value);
            valRadius.textContent = state.radius;
        });

        ctrlAmp.addEventListener('input', function () {
            state.amplitude = parseInt(ctrlAmp.value) / 100;
            valAmp.textContent = parseInt(ctrlAmp.value);
        });

        // Mode toggle
        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            var mode = btn.getAttribute('data-mode');
            setMode(mode);
        });

        // Palette toggle
        paletteToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (!btn) return;
            var palette = btn.getAttribute('data-palette');
            setPalette(palette);
        });

        // Pulse button
        btnPulse.addEventListener('click', function () {
            spawnPulse(state.mouseX > 0 ? state.mouseX : window.innerWidth / 2,
                       state.mouseY > 0 ? state.mouseY : window.innerHeight / 2);
        });

        // Reset button
        btnReset.addEventListener('click', function () {
            ctrlSize.value = 120;
            ctrlWeight.value = 800;
            ctrlSpacing.value = -3;
            ctrlRadius.value = 200;
            ctrlAmp.value = 65;
            state.size = 120;
            state.weight = 800;
            state.spacing = -0.03;
            state.radius = 200;
            state.amplitude = 0.65;
            valSize.textContent = '120';
            valWeight.textContent = '800';
            valSpacing.textContent = '-0.03';
            valRadius.textContent = '200';
            valAmp.textContent = '65';
            inputText.value = 'Forge';
            state.text = 'Forge';
            setMode('magnetic');
            buildChars();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT') return;
            var key = e.key.toLowerCase();

            if (key >= '1' && key <= '5') {
                var idx = parseInt(key) - 1;
                if (idx < MODES.length) {
                    setMode(MODES[idx]);
                }
            }

            if (key === ' ') {
                e.preventDefault();
                spawnPulse(state.mouseX > 0 ? state.mouseX : window.innerWidth / 2,
                           state.mouseY > 0 ? state.mouseY : window.innerHeight / 2);
            }

            if (key === 'r') {
                btnReset.click();
            }
        });
    }

    function setMode(mode) {
        state.mode = mode;
        var btns = modeToggle.querySelectorAll('.mode-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-mode') === mode) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
        teleForge.textContent = MODE_NAMES[mode] || mode;
    }

    function setPalette(palette) {
        state.palette = palette;
        document.body.className = '';
        if (palette !== 'aurora') {
            document.body.classList.add('palette-' + palette);
        }
        var btns = paletteToggle.querySelectorAll('.palette-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-palette') === palette) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
    }

    // === Click pulse ===

    function setupClickPulse() {
        forgeStage.addEventListener('click', function (e) {
            spawnPulse(e.clientX, e.clientY);
        });
    }

    // === Animation Loop ===

    var lastTime = performance.now();
    var fpsTime = 0;
    var fpsCount = 0;

    function animate(now) {
        var dt = Math.min(now - lastTime, 33);
        lastTime = now;
        state.time = now;

        // FPS calc
        fpsCount++;
        fpsTime += dt;
        if (fpsTime >= 500) {
            state.fps = Math.round((fpsCount / fpsTime) * 1000);
            teleFps.textContent = state.fps;
            fpsCount = 0;
            fpsTime = 0;
        }

        // Update chars
        for (var i = 0; i < chars.length; i++) {
            chars[i].update(dt);
        }

        // Update & draw particles
        updateParticles(dt);
        updatePulses(dt);
        drawParticles();
        drawPulses();

        // Update telemetry
        teleForce.textContent = state.forceLevel.toFixed(2);

        requestAnimationFrame(animate);
    }

    // === Init ===

    function init() {
        resizeCanvas();
        initParticles();
        buildChars();
        setupMouse();
        setupControls();
        setupClickPulse();

        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
            buildChars();
        });

        requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
