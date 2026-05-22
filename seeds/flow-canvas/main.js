(function () {
    'use strict';

    // === Simplex Noise Implementation ===

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var F3 = 1 / 3;
    var G3 = 1 / 6;
    var grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    function SimplexNoise(seed) {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        var p = new Uint8Array(256);
        var s = typeof seed === 'number' ? seed : Math.random() * 65536;
        for (var i = 0; i < 256; i++) p[i] = i;
        for (var i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            var j = s % (i + 1);
            var tmp = p[i];
            p[i] = p[j];
            p[j] = tmp;
        }
        for (var i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    SimplexNoise.prototype.noise2D = function (x, y) {
        var s = (x + y) * F2;
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var t = (i + j) * G2;
        var X0 = i - t;
        var Y0 = j - t;
        var x0 = x - X0;
        var y0 = y - Y0;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2;
        var y2 = y0 - 1 + 2 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var n0 = 0, n1 = 0, n2 = 0;
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            var gi0 = this.permMod12[ii + this.perm[jj]];
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            var gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            var gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
        }
        return 70 * (n0 + n1 + n2);
    };

    SimplexNoise.prototype.noise3D = function (x, y, z) {
        var s = (x + y + z) * F3;
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var t = (i + j + k) * G3;
        var X0 = i - t;
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = x - X0;
        var y0 = y - Y0;
        var z0 = z - Z0;
        var i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
            else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
            else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
        } else {
            if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
            else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
            else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
        }
        var x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
        var x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
        var x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
        var ii=i&255, jj=j&255, kk=k&255;
        var n0=0,n1=0,n2=0,n3=0;
        var t0=0.6-x0*x0-y0*y0-z0*z0;
        if(t0>=0){var gi0=this.permMod12[ii+this.perm[jj+this.perm[kk]]];t0*=t0;n0=t0*t0*(grad3[gi0][0]*x0+grad3[gi0][1]*y0+grad3[gi0][2]*z0);}
        var t1=0.6-x1*x1-y1*y1-z1*z1;
        if(t1>=0){var gi1=this.permMod12[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]];t1*=t1;n1=t1*t1*(grad3[gi1][0]*x1+grad3[gi1][1]*y1+grad3[gi1][2]*z1);}
        var t2=0.6-x2*x2-y2*y2-z2*z2;
        if(t2>=0){var gi2=this.permMod12[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]];t2*=t2;n2=t2*t2*(grad3[gi2][0]*x2+grad3[gi2][1]*y2+grad3[gi2][2]*z2);}
        var t3=0.6-x3*x3-y3*y3-z3*z3;
        if(t3>=0){var gi3=this.permMod12[ii+1+this.perm[jj+1+this.perm[kk+1]]];t3*=t3;n3=t3*t3*(grad3[gi3][0]*x3+grad3[gi3][1]*y3+grad3[gi3][2]*z3);}
        return 32*(n0+n1+n2+n3);
    };

    // === DOM Elements ===

    var flowCanvas = document.getElementById('flow-canvas');
    var paintCanvas = document.getElementById('paint-canvas');
    var flowCtx = flowCanvas.getContext('2d');
    var paintCtx = paintCanvas.getContext('2d');
    var stageEl = document.getElementById('stage');
    var overlayEl = document.getElementById('stage-overlay');
    var hintEl = document.getElementById('flow-hint');
    var cursorGlow = document.getElementById('cursor-glow');
    var statParticles = document.getElementById('stat-particles');
    var statFps = document.getElementById('stat-fps');

    var btnClear = document.getElementById('btn-clear');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');

    var sliderDensity = document.getElementById('slider-density');
    var sliderStrength = document.getElementById('slider-strength');
    var sliderEvolution = document.getElementById('slider-evolution');
    var sliderFade = document.getElementById('slider-fade');
    var sliderForceRadius = document.getElementById('slider-force-radius');

    var valDensity = document.getElementById('val-density');
    var valStrength = document.getElementById('val-strength');
    var valEvolution = document.getElementById('val-evolution');
    var valFade = document.getElementById('val-fade');
    var valForceRadius = document.getElementById('val-force-radius');

    // === State ===

    var noise = new SimplexNoise();
    var W = 0, H = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var mouse = { x: -9999, y: -9999, active: false, down: false };
    var time = 0;
    var frameCount = 0;
    var lastFpsTime = performance.now();
    var currentFps = 60;

    var config = {
        flowMode: 'curl',
        brushStyle: 'ribbon',
        forceMode: 'attract',
        theme: 'aurora',
        particleCount: 3000,
        flowStrength: 1.0,
        evolution: 0.3,
        fadeRate: 0.02,
        forceRadius: 120
    };

    var themeColors = {
        aurora: { h: 260, s: 80, l: 75 },
        ember: { h: 20, s: 85, l: 70 },
        ocean: { h: 175, s: 70, l: 72 },
        neon: { h: 290, s: 85, l: 75 }
    };

    // === Particle ===

    function createParticle() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            px: 0,
            py: 0,
            vx: 0,
            vy: 0,
            age: Math.random() * 200,
            maxAge: 150 + Math.random() * 150,
            hueOffset: (Math.random() - 0.5) * 40,
            satOffset: (Math.random() - 0.5) * 20,
            lightOffset: (Math.random() - 0.5) * 15,
            size: 0.5 + Math.random() * 1.5,
            speed: 0
        };
    }

    function resetParticle(p) {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        p.px = p.x;
        p.py = p.y;
        p.vx = 0;
        p.vy = 0;
        p.age = 0;
        p.maxAge = 150 + Math.random() * 150;
        p.hueOffset = (Math.random() - 0.5) * 40;
        p.satOffset = (Math.random() - 0.5) * 20;
        p.lightOffset = (Math.random() - 0.5) * 15;
        p.size = 0.5 + Math.random() * 1.5;
        p.speed = 0;
    }

    // === Flow Field ===

    var NOISE_SCALE = 0.002;

    function getFlowAngle(x, y, t) {
        var nx = x * NOISE_SCALE;
        var ny = y * NOISE_SCALE;
        var nt = t * 0.0003 * config.evolution;

        switch (config.flowMode) {
            case 'curl': {
                var eps = 0.5;
                var n1 = noise.noise3D(nx, ny + eps * NOISE_SCALE, nt);
                var n2 = noise.noise3D(nx, ny - eps * NOISE_SCALE, nt);
                var n3 = noise.noise3D(nx + eps * NOISE_SCALE, ny, nt);
                var n4 = noise.noise3D(nx - eps * NOISE_SCALE, ny, nt);
                return Math.atan2(n1 - n2, n3 - n4);
            }
            case 'turbulence': {
                var n = noise.noise3D(nx * 1.5, ny * 1.5, nt);
                var n2 = noise.noise3D(nx * 3, ny * 3, nt * 1.5);
                return (n + n2 * 0.5) * Math.PI * 2;
            }
            case 'vortex': {
                var cx = W * 0.5;
                var cy = H * 0.5;
                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy) + 1;
                var baseAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
                var n = noise.noise3D(nx * 2, ny * 2, nt);
                var spiralStrength = Math.max(0, 1 - dist / (Math.min(W, H) * 0.5));
                return baseAngle * spiralStrength + n * (1 - spiralStrength) * Math.PI;
            }
            case 'ridge': {
                var n = noise.noise3D(nx * 1.2, ny * 1.2, nt);
                var ridge = 1 - Math.abs(n);
                var n2 = noise.noise3D(nx * 2.5, ny * 2.5, nt * 0.8);
                return ridge * Math.PI * 2 * Math.sign(n) + n2 * 0.5;
            }
            default:
                return noise.noise3D(nx, ny, nt) * Math.PI * 2;
        }
    }

    // === Force Field ===

    function applyMouseForce(p) {
        if (!mouse.active) return;

        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var distSq = dx * dx + dy * dy;
        var radius = config.forceRadius;
        var radiusSq = radius * radius;

        if (distSq > radiusSq) return;

        var dist = Math.sqrt(distSq) + 1;
        var strength = (1 - dist / radius) * 3 * config.flowStrength;

        switch (config.forceMode) {
            case 'attract':
                p.vx += (dx / dist) * strength;
                p.vy += (dy / dist) * strength;
                break;
            case 'repel':
                p.vx -= (dx / dist) * strength * 1.5;
                p.vy -= (dy / dist) * strength * 1.5;
                break;
            case 'swirl': {
                var perpX = -dy / dist;
                var perpY = dx / dist;
                p.vx += perpX * strength * 2;
                p.vy += perpY * strength * 2;
                p.vx += (dx / dist) * strength * 0.3;
                p.vy += (dy / dist) * strength * 0.3;
                break;
            }
        }
    }

    // === Update ===

    function updateParticle(p) {
        p.px = p.x;
        p.py = p.y;

        var angle = getFlowAngle(p.x, p.y, time);
        var flowVx = Math.cos(angle) * config.flowStrength;
        var flowVy = Math.sin(angle) * config.flowStrength;

        p.vx += flowVx * 0.3;
        p.vy += flowVy * 0.3;

        applyMouseForce(p);

        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x += p.vx;
        p.y += p.vy;
        p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.age++;

        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10 || p.age > p.maxAge) {
            resetParticle(p);
        }
    }

    // === Render ===

    function getParticleColor(p, alpha) {
        var tc = themeColors[config.theme];
        var h = tc.h + p.hueOffset + p.speed * 15;
        var s = Math.min(100, Math.max(30, tc.s + p.satOffset));
        var l = Math.min(90, Math.max(40, tc.l + p.lightOffset + p.speed * 5));
        return 'hsla(' + h + ',' + s + '%,' + l + '%,' + alpha + ')';
    }

    function renderParticles() {
        paintCtx.globalCompositeOperation = 'source-over';

        switch (config.brushStyle) {
            case 'ribbon':
                renderRibbon();
                break;
            case 'stardust':
                renderStardust();
                break;
            case 'neon':
                renderNeon();
                break;
            case 'ink':
                renderInk();
                break;
            case 'ember':
                renderEmber();
                break;
            default:
                renderRibbon();
        }
    }

    function renderRibbon() {
        paintCtx.lineCap = 'round';
        paintCtx.lineJoin = 'round';

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var lifeRatio = 1 - p.age / p.maxAge;
            var alpha = Math.min(1, lifeRatio * 0.6 * (0.3 + p.speed * 0.3));

            if (alpha < 0.01) continue;

            var dx = p.x - p.px;
            var dy = p.y - p.py;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.3) continue;

            paintCtx.beginPath();
            paintCtx.moveTo(p.px, p.py);
            paintCtx.lineTo(p.x, p.y);
            paintCtx.strokeStyle = getParticleColor(p, alpha);
            paintCtx.lineWidth = Math.max(0.5, p.size * (0.5 + p.speed * 0.3));
            paintCtx.stroke();
        }
    }

    function renderStardust() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var lifeRatio = 1 - p.age / p.maxAge;
            var alpha = Math.min(1, lifeRatio * 0.8 * (0.2 + p.speed * 0.4));

            if (alpha < 0.02) continue;

            var size = p.size * (0.6 + p.speed * 0.2) * (Math.random() > 0.95 ? 2.5 : 1);

            paintCtx.beginPath();
            paintCtx.arc(p.x, p.y, Math.max(0.3, size), 0, Math.PI * 2);
            paintCtx.fillStyle = getParticleColor(p, alpha);
            paintCtx.fill();
        }
    }

    function renderNeon() {
        paintCtx.globalCompositeOperation = 'lighter';
        paintCtx.lineCap = 'round';

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var lifeRatio = 1 - p.age / p.maxAge;
            var speedAlpha = Math.min(1, p.speed * 0.5);
            var alpha = Math.min(0.8, lifeRatio * speedAlpha * 0.6);

            if (alpha < 0.02) continue;

            var dx = p.x - p.px;
            var dy = p.y - p.py;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.2) continue;

            paintCtx.beginPath();
            paintCtx.moveTo(p.px, p.py);
            paintCtx.lineTo(p.x, p.y);
            paintCtx.strokeStyle = getParticleColor(p, alpha * 0.3);
            paintCtx.lineWidth = Math.max(1, p.size * 3 * (0.5 + p.speed * 0.5));
            paintCtx.stroke();

            paintCtx.beginPath();
            paintCtx.moveTo(p.px, p.py);
            paintCtx.lineTo(p.x, p.y);
            paintCtx.strokeStyle = getParticleColor(p, alpha);
            paintCtx.lineWidth = Math.max(0.5, p.size * 0.8);
            paintCtx.stroke();
        }

        paintCtx.globalCompositeOperation = 'source-over';
    }

    function renderInk() {
        paintCtx.lineCap = 'round';

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var lifeRatio = 1 - p.age / p.maxAge;
            var alpha = Math.min(0.4, lifeRatio * 0.3 * (0.3 + p.speed * 0.2));

            if (alpha < 0.01) continue;

            var dx = p.x - p.px;
            var dy = p.y - p.py;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.3) continue;

            var tc = themeColors[config.theme];
            var l = Math.max(60, Math.min(95, tc.l + p.lightOffset + 20));
            var inkAlpha = alpha * (0.5 + Math.random() * 0.5);

            paintCtx.beginPath();
            paintCtx.moveTo(p.px, p.py);
            paintCtx.lineTo(p.x, p.y);
            paintCtx.strokeStyle = 'hsla(' + tc.h + ',' + Math.max(10, tc.s - 30) + '%,' + l + '%,' + inkAlpha + ')';
            paintCtx.lineWidth = Math.max(0.8, p.size * (0.8 + Math.random() * 1.2));
            paintCtx.stroke();
        }
    }

    function renderEmber() {
        paintCtx.globalCompositeOperation = 'lighter';

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var lifeRatio = 1 - p.age / p.maxAge;
            var alpha = Math.min(0.7, lifeRatio * 0.5 * (0.2 + p.speed * 0.6));

            if (alpha < 0.02) continue;

            var tc = themeColors[config.theme];
            var h = tc.h + p.hueOffset * 0.3 + p.age * 0.1;
            var size = p.size * (0.4 + p.speed * 0.3);

            if (Math.random() > 0.7) {
                paintCtx.beginPath();
                paintCtx.arc(p.x, p.y, Math.max(0.5, size * 2.5), 0, Math.PI * 2);
                paintCtx.fillStyle = 'hsla(' + h + ',' + tc.s + '%,' + tc.l + '%,' + (alpha * 0.15) + ')';
                paintCtx.fill();
            }

            paintCtx.beginPath();
            paintCtx.arc(p.x, p.y, Math.max(0.3, size), 0, Math.PI * 2);
            paintCtx.fillStyle = 'hsla(' + h + ',' + tc.s + '%,' + (tc.l + 15) + '%,' + alpha + ')';
            paintCtx.fill();
        }

        paintCtx.globalCompositeOperation = 'source-over';
    }

    // === Fade ===

    function applyFade() {
        var rate = config.fadeRate;
        paintCtx.globalCompositeOperation = 'destination-out';
        paintCtx.fillStyle = 'rgba(0,0,0,' + rate + ')';
        paintCtx.fillRect(0, 0, W, H);
        paintCtx.globalCompositeOperation = 'source-over';
    }

    // === Resize ===

    function resize() {
        var rect = stageEl.getBoundingClientRect();
        W = rect.width;
        H = rect.height;

        flowCanvas.width = W * dpr;
        flowCanvas.height = H * dpr;
        flowCanvas.style.width = W + 'px';
        flowCanvas.style.height = H + 'px';
        flowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        paintCanvas.width = W * dpr;
        paintCanvas.height = H * dpr;
        paintCanvas.style.width = W + 'px';
        paintCanvas.style.height = H + 'px';
        paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        adjustParticleCount();
    }

    function adjustParticleCount() {
        var target = config.particleCount;
        while (particles.length < target) {
            var p = createParticle();
            p.px = p.x;
            p.py = p.y;
            particles.push(p);
        }
        if (particles.length > target) {
            particles.length = target;
        }
        statParticles.textContent = particles.length;
    }

    // === Animation Loop ===

    function animate() {
        requestAnimationFrame(animate);

        time += 16;
        frameCount++;

        var now = performance.now();
        if (now - lastFpsTime >= 500) {
            currentFps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
            statFps.textContent = currentFps;
            frameCount = 0;
            lastFpsTime = now;
        }

        for (var i = 0; i < particles.length; i++) {
            updateParticle(particles[i]);
        }

        applyFade();
        renderParticles();
    }

    // === Pulse Effect ===

    function createPulse(cx, cy) {
        var pulseParticles = [];
        var count = 60;
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2;
            var speed = 2 + Math.random() * 4;
            pulseParticles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.01 + Math.random() * 0.02,
                size: 1 + Math.random() * 2,
                hueOffset: (Math.random() - 0.5) * 30
            });
        }

        function animPulse() {
            var alive = false;
            paintCtx.globalCompositeOperation = 'lighter';
            for (var i = 0; i < pulseParticles.length; i++) {
                var pp = pulseParticles[i];
                if (pp.life <= 0) continue;
                alive = true;
                pp.x += pp.vx;
                pp.y += pp.vy;
                pp.vx *= 0.96;
                pp.vy *= 0.96;
                pp.life -= pp.decay;

                var tc = themeColors[config.theme];
                var h = tc.h + pp.hueOffset;
                var alpha = pp.life * 0.6;

                paintCtx.beginPath();
                paintCtx.arc(pp.x, pp.y, pp.size * pp.life, 0, Math.PI * 2);
                paintCtx.fillStyle = 'hsla(' + h + ',' + tc.s + '%,' + tc.l + '%,' + alpha + ')';
                paintCtx.fill();

                paintCtx.beginPath();
                paintCtx.arc(pp.x, pp.y, pp.size * pp.life * 2.5, 0, Math.PI * 2);
                paintCtx.fillStyle = 'hsla(' + h + ',' + tc.s + '%,' + tc.l + '%,' + (alpha * 0.2) + ')';
                paintCtx.fill();
            }
            paintCtx.globalCompositeOperation = 'source-over';
            if (alive) requestAnimationFrame(animPulse);
        }

        animPulse();

        var pushRadius = config.forceRadius * 1.5;
        var pushRadiusSq = pushRadius * pushRadius;
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var dx = p.x - cx;
            var dy = p.y - cy;
            var distSq = dx * dx + dy * dy;
            if (distSq < pushRadiusSq) {
                var dist = Math.sqrt(distSq) + 1;
                var force = (1 - dist / pushRadius) * 8;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    // === Event Handlers ===

    function getCanvasPos(e) {
        var rect = stageEl.getBoundingClientRect();
        var clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    stageEl.addEventListener('mousemove', function (e) {
        var pos = getCanvasPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
        mouse.active = true;

        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        cursorGlow.classList.add('visible');

        if (overlayEl && !overlayEl.classList.contains('hidden')) {
            overlayEl.classList.add('hidden');
        }
    });

    stageEl.addEventListener('mouseleave', function () {
        mouse.active = false;
        cursorGlow.classList.remove('visible');
    });

    stageEl.addEventListener('mousedown', function (e) {
        mouse.down = true;
        var pos = getCanvasPos(e);
        createPulse(pos.x, pos.y);
    });

    stageEl.addEventListener('mouseup', function () {
        mouse.down = false;
    });

    stageEl.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var pos = getCanvasPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
        mouse.active = true;
        mouse.down = true;
        createPulse(pos.x, pos.y);
        if (overlayEl && !overlayEl.classList.contains('hidden')) {
            overlayEl.classList.add('hidden');
        }
    }, { passive: false });

    stageEl.addEventListener('touchmove', function (e) {
        e.preventDefault();
        var pos = getCanvasPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
    }, { passive: false });

    stageEl.addEventListener('touchend', function () {
        mouse.active = false;
        mouse.down = false;
    });

    document.addEventListener('mousemove', function (e) {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // === Button Groups ===

    function setupBtnGroup(groupId, configKey, onChange) {
        var group = document.getElementById(groupId);
        if (!group) return;
        var btns = group.querySelectorAll('.mode-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var val = btn.getAttribute('data-' + configKey);
                if (val && onChange) onChange(val);
            });
        });
    }

    setupBtnGroup('flow-mode-group', 'mode', function (val) {
        config.flowMode = val;
    });

    setupBtnGroup('brush-style-group', 'brush', function (val) {
        config.brushStyle = val;
    });

    setupBtnGroup('force-mode-group', 'force', function (val) {
        config.forceMode = val;
    });

    setupBtnGroup('theme-group', 'theme', function (val) {
        config.theme = val;
        document.body.setAttribute('data-theme', val);
    });

    // === Sliders ===

    function bindSlider(slider, valEl, configKey, formatter) {
        slider.addEventListener('input', function () {
            var v = parseFloat(slider.value);
            config[configKey] = v;
            valEl.textContent = formatter ? formatter(v) : v;
            if (configKey === 'particleCount') {
                adjustParticleCount();
            }
        });
    }

    bindSlider(sliderDensity, valDensity, 'particleCount', function (v) { return Math.round(v); });
    bindSlider(sliderStrength, valStrength, 'flowStrength', function (v) { return v.toFixed(1); });
    bindSlider(sliderEvolution, valEvolution, 'evolution', function (v) { return v.toFixed(2); });
    bindSlider(sliderFade, valFade, 'fadeRate', function (v) { return v.toFixed(3); });
    bindSlider(sliderForceRadius, valForceRadius, 'forceRadius', function (v) { return Math.round(v); });

    // === Buttons ===

    btnClear.addEventListener('click', function () {
        paintCtx.clearRect(0, 0, W, H);
    });

    btnShuffle.addEventListener('click', function () {
        noise = new SimplexNoise(Math.random() * 65536);
        for (var i = 0; i < particles.length; i++) {
            resetParticle(particles[i]);
        }
        paintCtx.clearRect(0, 0, W, H);
    });

    btnReset.addEventListener('click', function () {
        config.flowMode = 'curl';
        config.brushStyle = 'ribbon';
        config.forceMode = 'attract';
        config.theme = 'aurora';
        config.particleCount = 3000;
        config.flowStrength = 1.0;
        config.evolution = 0.3;
        config.fadeRate = 0.02;
        config.forceRadius = 120;

        document.body.removeAttribute('data-theme');

        sliderDensity.value = 3000;
        sliderStrength.value = 1.0;
        sliderEvolution.value = 0.3;
        sliderFade.value = 0.02;
        sliderForceRadius.value = 120;

        valDensity.textContent = '3000';
        valStrength.textContent = '1.0';
        valEvolution.textContent = '0.30';
        valFade.textContent = '0.020';
        valForceRadius.textContent = '120';

        document.querySelectorAll('#flow-mode-group .mode-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('#flow-mode-group .mode-btn[data-mode="curl"]').classList.add('active');

        document.querySelectorAll('#brush-style-group .mode-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('#brush-style-group .mode-btn[data-brush="ribbon"]').classList.add('active');

        document.querySelectorAll('#force-mode-group .mode-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('#force-mode-group .mode-btn[data-force="attract"]').classList.add('active');

        document.querySelectorAll('#theme-group .mode-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('#theme-group .mode-btn[data-theme="aurora"]').classList.add('active');

        adjustParticleCount();

        noise = new SimplexNoise();
        paintCtx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
            resetParticle(particles[i]);
        }
    });

    // === Init ===

    window.addEventListener('resize', resize);
    resize();
    animate();

})();
