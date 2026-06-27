(function () {
    'use strict';

    /* ============================================================
     * Dot Grid Scene — 弹簧物理驱动的点阵力场微交互
     * 每个格点是一个具有弹簧-阻尼归位的质点，受光标力场与
     * 冲击波涟漪驱动产生非线性位移，配合粒子流场与十字准星。
     * ============================================================ */

    /* === Palettes === */
    var PALETTES = {
        aurora: {
            primary: '#22d3ee',
            secondary: '#818cf8',
            accent: '#e879f9',
            primaryRgb: '34,211,238',
            secondaryRgb: '129,140,248',
            accentRgb: '232,121,249'
        },
        ember: {
            primary: '#fb923c',
            secondary: '#f43f5e',
            accent: '#fbbf24',
            primaryRgb: '251,146,60',
            secondaryRgb: '244,63,94',
            accentRgb: '251,191,36'
        },
        moss: {
            primary: '#34d399',
            secondary: '#a3e635',
            accent: '#22d3ee',
            primaryRgb: '52,211,153',
            secondaryRgb: '163,230,53',
            accentRgb: '34,211,238'
        },
        dusk: {
            primary: '#f472b6',
            secondary: '#c084fc',
            accent: '#60a5fa',
            primaryRgb: '244,114,182',
            secondaryRgb: '192,132,252',
            accentRgb: '96,165,250'
        }
    };

    /* === Global State === */
    var state = {
        mouseX: -9999,
        mouseY: -9999,
        smoothX: -9999,
        smoothY: -9999,
        prevX: 0,
        prevY: 0,
        velocityX: 0,
        velocityY: 0,
        speed: 0,
        isOnScreen: false,
        mode: 'repel',
        palette: 'aurora',
        density: 40,
        fieldRadius: 180,
        strength: 0.6,
        damping: 0.82,
        time: 0,
        dots: [],
        ripples: [],
        particles: [],
        maxParticles: 60
    };

    /* === DOM References === */
    var canvas, ctx, W, H, dpr;
    var cursorOrb, orbCore, orbRing;
    var crosshairH, crosshairV;
    var infoCx, infoCy, infoVel, infoDist, infoNodes, infoActive, infoRipples;

    /* === Utility === */
    function $(id) {
        return document.getElementById(id);
    }

    function getPalette() {
        return PALETTES[state.palette];
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /* ============================================================
     * Dot Model — 弹簧-阻尼归位质点
     * ============================================================ */
    function createDot(gx, gy) {
        return {
            ox: gx,
            oy: gy,
            x: gx,
            y: gy,
            vx: 0,
            vy: 0,
            activity: 0
        };
    }

    function buildGrid() {
        state.dots = [];
        var spacing = state.density;
        var cols = Math.ceil(W / spacing) + 2;
        var rows = Math.ceil(H / spacing) + 2;
        var offsetX = (W - (cols - 1) * spacing) * 0.5;
        var offsetY = (H - (rows - 1) * spacing) * 0.5;

        for (var i = 0; i < cols; i++) {
            for (var j = 0; j < rows; j++) {
                state.dots.push(createDot(
                    offsetX + i * spacing,
                    offsetY + j * spacing
                ));
            }
        }
    }

    /* ============================================================
     * Force Field — 四种非线性力场模式
     * ============================================================ */
    function applyForces() {
        var cx = state.isOnScreen ? state.smoothX : -9999;
        var cy = state.isOnScreen ? state.smoothY : -9999;
        var radius = state.fieldRadius;
        var radiusSq = radius * radius;
        var strength = state.strength;
        var mode = state.mode;
        var t = state.time;

        for (var i = 0; i < state.dots.length; i++) {
            var d = state.dots[i];
            var dx = d.x - cx;
            var dy = d.y - cy;
            var distSq = dx * dx + dy * dy;

            if (distSq < radiusSq && state.isOnScreen) {
                var dist = Math.sqrt(distSq) || 0.001;
                var influence = 1 - dist / radius;
                influence = influence * influence * strength;
                var nx = dx / dist;
                var ny = dy / dist;

                if (mode === 'repel') {
                    var push = influence * 26;
                    d.vx += nx * push;
                    d.vy += ny * push;
                } else if (mode === 'attract') {
                    var pull = influence * 18;
                    d.vx -= nx * pull;
                    d.vy -= ny * pull;
                } else if (mode === 'vortex') {
                    var tangent = influence * 22;
                    d.vx += -ny * tangent;
                    d.vy += nx * tangent;
                    var orbit = influence * 8;
                    d.vx -= nx * orbit;
                    d.vy -= ny * orbit;
                } else if (mode === 'wave') {
                    var phase = t * 0.06 - dist * 0.04;
                    var waveAmp = influence * 20;
                    d.vx += Math.cos(phase) * waveAmp;
                    d.vy += Math.sin(phase) * waveAmp;
                }

                d.activity = Math.min(1, d.activity + influence * 0.35);
            }

            /* Apply ripple shockwaves */
            for (var r = 0; r < state.ripples.length; r++) {
                var rp = state.ripples[r];
                var rdx = d.x - rp.x;
                var rdy = d.y - rp.y;
                var rDist = Math.sqrt(rdx * rdx + rdy * rdy) || 0.001;
                var bandWidth = 50;
                if (Math.abs(rDist - rp.radius) < bandWidth) {
                    var ringInfluence = (1 - Math.abs(rDist - rp.radius) / bandWidth) * rp.power;
                    var rnx = rdx / rDist;
                    var rny = rdy / rDist;
                    var kick = ringInfluence * 12;
                    d.vx += rnx * kick;
                    d.vy += rny * kick;
                    d.activity = Math.min(1, d.activity + ringInfluence * 0.6);
                }
            }
        }
    }

    /* ============================================================
     * Spring Integration — 弹簧归位 + 阻尼
     * ============================================================ */
    function integrate() {
        var stiffness = 0.045;
        var damping = state.damping;
        var activityDecay = 0.94;

        for (var i = 0; i < state.dots.length; i++) {
            var d = state.dots[i];
            var springX = (d.ox - d.x) * stiffness;
            var springY = (d.oy - d.y) * stiffness;
            d.vx = (d.vx + springX) * damping;
            d.vy = (d.vy + springY) * damping;
            d.x += d.vx;
            d.y += d.vy;
            d.activity *= activityDecay;
        }
    }

    /* ============================================================
     * Rendering
     * ============================================================ */
    function drawDots() {
        var palette = getPalette();
        var cx = state.isOnScreen ? state.smoothX : -9999;
        var cy = state.isOnScreen ? state.smoothY : -9999;
        var radius = state.fieldRadius;

        for (var i = 0; i < state.dots.length; i++) {
            var d = state.dots[i];
            var dx = d.x - cx;
            var dy = d.y - cy;
            var distSq = dx * dx + dy * dy;
            var proximity = 0;

            if (state.isOnScreen && distSq < radius * radius) {
                proximity = 1 - Math.sqrt(distSq) / radius;
                proximity = proximity * proximity;
            }

            var act = Math.max(d.activity, proximity);
            var baseAlpha = 0.18;
            var alpha = baseAlpha + act * 0.7;
            var size = 1.2 + act * 3.2;

            ctx.beginPath();
            ctx.arc(d.x, d.y, size, 0, Math.PI * 2);

            if (act > 0.55) {
                ctx.fillStyle = 'rgba(' + palette.accentRgb + ',' + alpha + ')';
            } else if (act > 0.2) {
                ctx.fillStyle = 'rgba(' + palette.secondaryRgb + ',' + alpha + ')';
            } else {
                ctx.fillStyle = 'rgba(' + palette.primaryRgb + ',' + alpha + ')';
            }
            ctx.fill();

            /* Glow halo for highly active nodes */
            if (act > 0.4) {
                var glowSize = size * (3 + act * 4);
                var grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowSize);
                grad.addColorStop(0, 'rgba(' + palette.accentRgb + ',' + (act * 0.3) + ')');
                grad.addColorStop(1, 'rgba(' + palette.accentRgb + ',0)');
                ctx.beginPath();
                ctx.arc(d.x, d.y, glowSize, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        }
    }

    function drawConnections() {
        var palette = getPalette();
        var spacing = state.density;
        var cols = Math.ceil(W / spacing) + 2;
        var threshold = 0.15;

        for (var i = 0; i < state.dots.length; i++) {
            var d = state.dots[i];
            if (d.activity < threshold) continue;

            /* Connect to right neighbor */
            if ((i + 1) % (Math.ceil(H / spacing) + 2) !== 0 && i + 1 < state.dots.length) {
                drawLink(d, state.dots[i + 1], palette);
            }
            /* Connect to bottom neighbor */
            if (i + Math.ceil(H / spacing) + 2 < state.dots.length) {
                drawLink(d, state.dots[i + Math.ceil(H / spacing) + 2], palette);
            }
        }
    }

    function drawLink(a, b, palette) {
        var joint = Math.min(a.activity, b.activity);
        if (joint < 0.15) return;

        var alpha = joint * 0.35;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(' + palette.secondaryRgb + ',' + alpha + ')';
        ctx.lineWidth = 0.6 + joint * 0.8;
        ctx.stroke();
    }

    function drawFieldGlow() {
        if (!state.isOnScreen) return;
        var palette = getPalette();
        var r = state.fieldRadius;

        var grad = ctx.createRadialGradient(
            state.smoothX, state.smoothY, 0,
            state.smoothX, state.smoothY, r
        );
        grad.addColorStop(0, 'rgba(' + palette.primaryRgb + ',0.07)');
        grad.addColorStop(0.5, 'rgba(' + palette.primaryRgb + ',0.025)');
        grad.addColorStop(1, 'rgba(' + palette.primaryRgb + ',0)');

        ctx.beginPath();
        ctx.arc(state.smoothX, state.smoothY, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(state.smoothX, state.smoothY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + palette.primaryRgb + ',0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawRipples() {
        var palette = getPalette();
        var toRemove = [];

        for (var i = 0; i < state.ripples.length; i++) {
            var rp = state.ripples[i];
            rp.radius += rp.speed;
            rp.power *= 0.965;

            if (rp.radius > rp.maxRadius || rp.power < 0.02) {
                toRemove.push(i);
                continue;
            }

            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + palette.accentRgb + ',' + (rp.power * 0.5) + ')';
            ctx.lineWidth = 1.5 + rp.power * 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.radius * 0.55, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + palette.primaryRgb + ',' + (rp.power * 0.25) + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        for (var k = toRemove.length - 1; k >= 0; k--) {
            state.ripples.splice(toRemove[k], 1);
        }
    }

    /* ============================================================
     * Ambient Particle Flow — 环境粒子流场
     * ============================================================ */
    function spawnParticle() {
        var edge = Math.floor(Math.random() * 4);
        var x, y, vx, vy;
        var speed = 0.2 + Math.random() * 0.5;

        if (edge === 0) { x = Math.random() * W; y = -10; vx = (Math.random() - 0.5) * 0.3; vy = speed; }
        else if (edge === 1) { x = W + 10; y = Math.random() * H; vx = -speed; vy = (Math.random() - 0.5) * 0.3; }
        else if (edge === 2) { x = Math.random() * W; y = H + 10; vx = (Math.random() - 0.5) * 0.3; vy = -speed; }
        else { x = -10; y = Math.random() * H; vx = speed; vy = (Math.random() - 0.5) * 0.3; }

        state.particles.push({
            x: x, y: y, vx: vx, vy: vy,
            life: 1,
            maxLife: 200 + Math.random() * 200,
            age: 0,
            size: 0.5 + Math.random() * 1.2
        });
    }

    function updateParticles() {
        if (state.particles.length < state.maxParticles && Math.random() < 0.3) {
            spawnParticle();
        }

        var palette = getPalette();
        var toRemove = [];

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            p.age++;

            /* Simplex-like noise via trigonometric approximation */
            var noiseAngle = Math.sin(p.x * 0.004 + state.time * 0.008) +
                             Math.cos(p.y * 0.004 + state.time * 0.006);
            p.vx += Math.cos(noiseAngle * 1.5) * 0.015;
            p.vy += Math.sin(noiseAngle * 1.5) * 0.015;

            /* Cursor attraction for nearby particles */
            if (state.isOnScreen) {
                var pdx = state.smoothX - p.x;
                var pdy = state.smoothY - p.y;
                var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pdist < 160 && pdist > 0.001) {
                    var pullStrength = (1 - pdist / 160) * 0.04;
                    p.vx += (pdx / pdist) * pullStrength;
                    p.vy += (pdy / pdist) * pullStrength;
                }
            }

            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            if (p.age > p.maxLife || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
                toRemove.push(i);
                continue;
            }

            var fade = 1 - p.age / p.maxLife;
            var alpha = fade * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + palette.secondaryRgb + ',' + alpha + ')';
            ctx.fill();
        }

        for (var k = toRemove.length - 1; k >= 0; k--) {
            state.particles.splice(toRemove[k], 1);
        }
    }

    /* ============================================================
     * Cursor Orb Update
     * ============================================================ */
    function updateCursorOrb() {
        if (!state.isOnScreen) {
            cursorOrb.classList.remove('visible');
            crosshairH.classList.remove('visible');
            crosshairV.classList.remove('visible');
            return;
        }

        cursorOrb.classList.add('visible');

        state.smoothX += (state.mouseX - state.smoothX) * 0.2;
        state.smoothY += (state.mouseY - state.smoothY) * 0.2;

        cursorOrb.style.left = state.smoothX + 'px';
        cursorOrb.style.top = state.smoothY + 'px';

        var speed = Math.min(state.speed, 60);
        var ringScale = 1 + speed * 0.018;
        orbRing.style.width = (44 * ringScale) + 'px';
        orbRing.style.height = (44 * ringScale) + 'px';

        var palette = getPalette();
        if (speed > 15) {
            orbRing.style.borderColor = palette.accent;
            orbCore.style.transform = 'translate(-50%,-50%) scale(' + (1 + speed * 0.008) + ')';
        } else {
            orbRing.style.borderColor = 'rgba(255,255,255,0.45)';
            orbCore.style.transform = 'translate(-50%,-50%)';
        }

        crosshairH.style.top = state.smoothY + 'px';
        crosshairH.classList.add('visible');
        crosshairV.style.left = state.smoothX + 'px';
        crosshairV.classList.add('visible');
    }

    /* ============================================================
     * Info Panel Telemetry
     * ============================================================ */
    function updateInfoPanel() {
        infoCx.textContent = Math.round(state.mouseX > 0 ? state.mouseX : 0);
        infoCy.textContent = Math.round(state.mouseY > 0 ? state.mouseY : 0);
        infoVel.textContent = state.speed.toFixed(2);

        var activeCount = 0;
        for (var i = 0; i < state.dots.length; i++) {
            if (state.dots[i].activity > 0.1) activeCount++;
        }
        infoNodes.textContent = state.dots.length;
        infoActive.textContent = activeCount;
        infoRipples.textContent = state.ripples.length;

        var totalDist = 0;
        for (var j = 0; j < state.dots.length; j++) {
            var d = state.dots[j];
            totalDist += Math.sqrt((d.x - d.ox) * (d.x - d.ox) + (d.y - d.oy) * (d.y - d.oy));
        }
        infoDist.textContent = Math.round(totalDist);

        if (state.speed > 20) {
            infoVel.classList.add('highlight');
        } else {
            infoVel.classList.remove('highlight');
        }
    }

    /* ============================================================
     * Main Animation Loop
     * ============================================================ */
    function animate() {
        state.time++;

        ctx.clearRect(0, 0, W, H);

        updateCursorOrb();
        applyForces();
        integrate();

        drawFieldGlow();
        drawConnections();
        drawDots();
        drawRipples();
        updateParticles();

        updateInfoPanel();

        /* Decay cursor velocity */
        state.velocityX *= 0.9;
        state.velocityY *= 0.9;
        state.speed *= 0.9;

        requestAnimationFrame(animate);
    }

    /* ============================================================
     * Resize & Setup
     * ============================================================ */
    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildGrid();
    }

    function bindEvents() {
        window.addEventListener('resize', resize);

        document.addEventListener('mousemove', function (e) {
            state.prevX = state.mouseX;
            state.prevY = state.mouseY;
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            state.isOnScreen = true;
            state.velocityX = state.mouseX - state.prevX;
            state.velocityY = state.mouseY - state.prevY;
            state.speed = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
        });

        document.addEventListener('mouseleave', function () {
            state.isOnScreen = false;
        });

        document.addEventListener('mouseenter', function () {
            state.isOnScreen = true;
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('.controls-bar') || e.target.closest('.info-panel') || e.target.closest('.back-link')) return;
            spawnRipple(e.clientX, e.clientY, 1.2);
        });

        document.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var t = e.touches[0];
            state.prevX = state.mouseX;
            state.prevY = state.mouseY;
            state.mouseX = t.clientX;
            state.mouseY = t.clientY;
            state.isOnScreen = true;
            state.velocityX = state.mouseX - state.prevX;
            state.velocityY = state.mouseY - state.prevY;
            state.speed = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
        }, { passive: false });

        document.addEventListener('touchend', function (e) {
            if (e.target.closest('.controls-bar') || e.target.closest('.info-panel') || e.target.closest('.back-link')) return;
            var t = e.changedTouches[0];
            if (t) spawnRipple(t.clientX, t.clientY, 1.0);
        });
    }

    function spawnRipple(x, y, power) {
        state.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: Math.max(W, H) * 0.7,
            speed: 4.5,
            power: power || 1
        });
    }

    /* ============================================================
     * Controls Binding
     * ============================================================ */
    function bindControls() {
        $('ctrl-density').addEventListener('input', function () {
            state.density = parseInt(this.value);
            $('val-density').textContent = state.density;
            buildGrid();
        });

        $('ctrl-radius').addEventListener('input', function () {
            state.fieldRadius = parseInt(this.value);
            $('val-radius').textContent = state.fieldRadius;
        });

        $('ctrl-strength').addEventListener('input', function () {
            state.strength = parseInt(this.value) / 100;
            $('val-strength').textContent = state.strength.toFixed(2);
        });

        $('ctrl-damping').addEventListener('input', function () {
            state.damping = parseInt(this.value) / 100;
            $('val-damping').textContent = state.damping.toFixed(2);
        });

        var modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.mode = this.dataset.mode;
            });
        });

        var paletteBtns = document.querySelectorAll('.palette-btn');
        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.palette = this.dataset.palette;
                document.body.className = 'palette-' + state.palette;
            });
        });

        $('btn-burst').addEventListener('click', function () {
            var bx = state.isOnScreen ? state.smoothX : W * 0.5;
            var by = state.isOnScreen ? state.smoothY : H * 0.5;
            spawnRipple(bx, by, 1.6);
            spawnRipple(bx, by, 1.2);
        });

        $('btn-fullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });
    }

    /* ============================================================
     * Init
     * ============================================================ */
    function init() {
        canvas = $('dot-canvas');
        ctx = canvas.getContext('2d');
        cursorOrb = $('cursor-orb');
        orbCore = cursorOrb.querySelector('.orb-core');
        orbRing = cursorOrb.querySelector('.orb-ring');
        crosshairH = $('crosshair-h');
        crosshairV = $('crosshair-v');
        infoCx = $('info-cx');
        infoCy = $('info-cy');
        infoVel = $('info-vel');
        infoDist = $('info-dist');
        infoNodes = $('info-nodes');
        infoActive = $('info-active');
        infoRipples = $('info-ripples');

        resize();
        bindEvents();
        bindControls();
        animate();

        /* Auto-spawn a welcome ripple at center */
        setTimeout(function () {
            spawnRipple(W * 0.5, H * 0.5, 1.0);
        }, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
