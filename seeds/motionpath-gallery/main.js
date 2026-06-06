(function () {
    'use strict';

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

    function SimplexNoise(seed) {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        var s = typeof seed === 'number' ? seed : Math.random() * 65536;
        var p = new Uint8Array(256);
        for (var i = 0; i < 256; i++) p[i] = i;
        for (var j = 255; j > 0; j--) {
            s = (s * 16807 + 0) % 2147483647;
            var k = s % (j + 1);
            var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
        }
        for (var m = 0; m < 512; m++) {
            this.perm[m] = p[m & 255];
            this.permMod12[m] = this.perm[m] % 12;
        }
    }

    SimplexNoise.prototype.noise2D = function (xin, yin) {
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var x0 = xin - (i - t);
        var y0 = yin - (j - t);
        var i1 = x0 > y0 ? 1 : 0;
        var j1 = x0 > y0 ? 0 : 1;
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2;
        var y2 = y0 - 1 + 2 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var n0 = 0, n1 = 0, n2 = 0;
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { t0 *= t0; var gi0 = this.permMod12[ii + this.perm[jj]]; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { t1 *= t1; var gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]]; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) { t2 *= t2; var gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]]; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
        return 70 * (n0 + n1 + n2);
    };

    var noise = new SimplexNoise(42);

    var THEME_COLORS = {
        obsidian: { r: 139, g: 92, b: 246 },
        aurora:   { r: 16,  g: 185, b: 129 },
        ember:    { r: 245, g: 158, b: 11 },
        void:     { r: 168, g: 85,  b: 247 }
    };

    var PATH_TYPES = [
        {
            id: 'orbit',
            label: 'Orbit 轨道',
            icon: '◉',
            generator: function (t, cx, cy, radius) {
                return { x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius };
            }
        },
        {
            id: 'infinity',
            label: 'Infinity 无限',
            icon: '∞',
            generator: function (t, cx, cy, radius) {
                var scale = radius * 0.75;
                return {
                    x: cx + Math.cos(t) * scale * 1.2,
                    y: cy + Math.sin(t * 2) * scale * 0.5
                };
            }
        },
        {
            id: 'spiral',
            label: 'Spiral 螺旋',
            icon: '🌀',
            generator: function (t, cx, cy, radius) {
                var r = radius * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.3)));
                return { x: cx + Math.cos(t * 1.5) * r, y: cy + Math.sin(t * 1.5) * r };
            }
        },
        {
            id: 'wave',
            label: 'Wave 波浪',
            icon: '〰',
            generator: function (t, cx, cy, radius) {
                var px = cx + Math.cos(t) * radius;
                var py = cy + Math.sin(t * 3) * radius * 0.35;
                return { x: px, y: py };
            }
        },
        {
            id: 'lissajous',
            label: 'Lissajous 利萨如',
            icon: '∾',
            generator: function (t, cx, cy, radius) {
                return {
                    x: cx + Math.sin(t * 3 + Math.PI / 4) * radius * 0.85,
                    y: cy + Math.sin(t * 2) * radius * 0.85
                };
            }
        },
        {
            id: 'rose',
            label: 'Rose 玫瑰线',
            icon: '✿',
            generator: function (t, cx, cy, radius) {
                var k = 5 / 3;
                var r = radius * Math.cos(k * t);
                return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
            }
        },
        {
            id: 'hypotrochoid',
            label: 'Hypotrochoid 内旋轮',
            icon: '⊛',
            generator: function (t, cx, cy, radius) {
                var R = radius;
                var r = radius * 0.35;
                var d = radius * 0.6;
                var scale = 0.5;
                return {
                    x: cx + ((R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t)) * scale,
                    y: cy + ((R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)) * scale
                };
            }
        },
        {
            id: 'noise',
            label: 'Noise 噪声场',
            icon: '≋',
            generator: function (t, cx, cy, radius) {
                var nx = noise.noise2D(t * 0.5, 0) * radius;
                var ny = noise.noise2D(0, t * 0.5) * radius;
                return { x: cx + nx, y: cy + ny };
            }
        }
    ];

    var state = {
        theme: 'obsidian',
        speed: 1,
        animators: [],
        bgParticles: [],
        mouse: { x: -9999, y: -9999, stageX: -9999, stageY: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        lastTime: 0,
        animId: null,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
    };

    var cardGrid = document.getElementById('card-grid');
    var pathCanvas = document.getElementById('path-canvas');
    var pathCtx = pathCanvas.getContext('2d');
    var bgCanvas = document.getElementById('bg-canvas');
    var bgCtx = bgCanvas.getContext('2d');
    var galleryStage = document.getElementById('gallery-stage');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var speedSlider = document.getElementById('speed-slider');
    var speedValue = document.getElementById('speed-value');
    var btnClear = document.getElementById('btn-clear');
    var btnAll = document.getElementById('btn-all');
    var btnRandom = document.getElementById('btn-random');
    var themeGroup = document.getElementById('theme-group');
    var transFlash = document.getElementById('transition-flash');

    function getAccentColor() {
        return THEME_COLORS[state.theme];
    }

    function resizeCanvas() {
        var rect = galleryStage.getBoundingClientRect();
        pathCanvas.width = rect.width * state.dpr;
        pathCanvas.height = rect.height * state.dpr;
        pathCanvas.style.width = rect.width + 'px';
        pathCanvas.style.height = rect.height + 'px';
        pathCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        bgCanvas.width = window.innerWidth * state.dpr;
        bgCanvas.height = window.innerHeight * state.dpr;
        bgCanvas.style.width = window.innerWidth + 'px';
        bgCanvas.style.height = window.innerHeight + 'px';
        bgCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        updateCardPositions();
    }

    function updateCardPositions() {
        var stageRect = galleryStage.getBoundingClientRect();
        state.animators.forEach(function (anim) {
            var cardRect = anim.cardEl.getBoundingClientRect();
            anim.stageCenterX = cardRect.left + cardRect.width / 2 - stageRect.left;
            anim.stageCenterY = cardRect.top + cardRect.height / 2 - stageRect.top;
            anim.stageRadius = Math.min(cardRect.width, cardRect.height) * 0.38;
            resizeMiniCanvas(anim);
        });
    }

    function resizeMiniCanvas(anim) {
        var cardRect = anim.cardEl.getBoundingClientRect();
        var miniW = cardRect.width * 0.8;
        var miniH = cardRect.height * 0.55;
        anim.miniCanvas.width = miniW * state.dpr;
        anim.miniCanvas.height = miniH * state.dpr;
        anim.miniCanvas.style.width = miniW + 'px';
        anim.miniCanvas.style.height = miniH + 'px';
        anim.miniCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        anim.miniW = miniW;
        anim.miniH = miniH;
    }

    function createAnimator(index) {
        var pathType = PATH_TYPES[index];
        var cardEl = document.createElement('div');
        cardEl.className = 'path-card';
        cardEl.setAttribute('data-index', index);

        var iconEl = document.createElement('span');
        iconEl.className = 'card-icon';
        iconEl.textContent = pathType.icon;

        var miniCanvas = document.createElement('canvas');
        miniCanvas.className = 'mini-canvas';

        var labelEl = document.createElement('span');
        labelEl.className = 'card-label';
        labelEl.textContent = pathType.label;

        var statusEl = document.createElement('span');
        statusEl.className = 'card-status';
        statusEl.textContent = 'IDLE';

        cardEl.appendChild(iconEl);
        cardEl.appendChild(miniCanvas);
        cardEl.appendChild(labelEl);
        cardEl.appendChild(statusEl);
        cardGrid.appendChild(cardEl);

        var anim = {
            index: index,
            pathType: pathType,
            cardEl: cardEl,
            miniCanvas: miniCanvas,
            miniCtx: miniCanvas.getContext('2d'),
            miniW: 0,
            miniH: 0,
            statusEl: statusEl,
            stageCenterX: 0,
            stageCenterY: 0,
            stageRadius: 40,
            active: false,
            t: index * 0.8,
            mainT: index * 0.8,
            trail: [],
            maxTrail: 100,
            mainTrail: [],
            maxMainTrail: 80,
            particleX: 0,
            particleY: 0,
            particleVx: 0,
            particleVy: 0,
            glowAlpha: 0,
            pulseAlpha: 0,
            pulseX: 0,
            pulseY: 0,
            springX: 0,
            springY: 0,
            springVx: 0,
            springVy: 0,
            entryScale: 0,
            entryDelay: index * 80
        };

        cardEl.addEventListener('click', function () {
            anim.active = !anim.active;
            cardEl.classList.toggle('is-active', anim.active);
            statusEl.textContent = anim.active ? 'ACTIVE' : 'IDLE';
            if (anim.active) {
                anim.pulseAlpha = 1;
                anim.pulseX = anim.stageCenterX;
                anim.pulseY = anim.stageCenterY;
                anim.trail = [];
                anim.mainTrail = [];
            }
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        return anim;
    }

    function initCards() {
        for (var i = 0; i < PATH_TYPES.length; i++) {
            state.animators.push(createAnimator(i));
        }
        setTimeout(function () {
            state.animators.forEach(function (anim, idx) {
                anim.entryScale = 1;
            });
        }, 100);
    }

    function initBgParticles() {
        var count = 60;
        for (var i = 0; i < count; i++) {
            state.bgParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.3 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function updateAnimators(dt, time) {
        var ac = getAccentColor();

        state.animators.forEach(function (anim) {
            if (anim.active) {
                anim.t += dt * 0.025 * state.speed;
                anim.mainT += dt * 0.02 * state.speed;

                var previewCx = anim.miniW / 2;
                var previewCy = anim.miniH / 2;
                var previewR = Math.min(anim.miniW, anim.miniH) * 0.4;

                var pos = anim.pathType.generator(anim.t, previewCx, previewCy, previewR);
                anim.particleX = pos.x;
                anim.particleY = pos.y;

                anim.trail.push({ x: pos.x, y: pos.y });
                if (anim.trail.length > anim.maxTrail) anim.trail.shift();

                var mainPos = anim.pathType.generator(anim.mainT, anim.stageCenterX, anim.stageCenterY, anim.stageRadius);
                anim.mainTrail.push({ x: mainPos.x, y: mainPos.y });
                if (anim.mainTrail.length > anim.maxMainTrail) anim.mainTrail.shift();

                anim.springVx += (mainPos.x - anim.springX) * 0.12 * dt;
                anim.springVy += (mainPos.y - anim.springY) * 0.12 * dt;
                anim.springVx *= Math.pow(0.88, dt);
                anim.springVy *= Math.pow(0.88, dt);
                anim.springX += anim.springVx * dt;
                anim.springY += anim.springVy * dt;

                anim.glowAlpha += (0.6 - anim.glowAlpha) * 0.05 * dt;
            } else {
                anim.glowAlpha += (0 - anim.glowAlpha) * 0.08 * dt;
            }

            if (anim.pulseAlpha > 0) {
                anim.pulseAlpha -= 0.02 * dt;
                if (anim.pulseAlpha < 0) anim.pulseAlpha = 0;
            }
        });
    }

    function drawMiniCanvas(anim) {
        var ctx = anim.miniCtx;
        var w = anim.miniW;
        var h = anim.miniH;
        if (w <= 0 || h <= 0) return;

        ctx.clearRect(0, 0, w, h);
        var ac = getAccentColor();

        if (anim.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(anim.trail[0].x, anim.trail[0].y);
            for (var i = 1; i < anim.trail.length; i++) {
                ctx.lineTo(anim.trail[i].x, anim.trail[i].y);
            }
            ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.25)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        if (anim.trail.length > 1) {
            for (var j = Math.max(0, anim.trail.length - 12); j < anim.trail.length; j++) {
                var progress = (j - Math.max(0, anim.trail.length - 12)) / 12;
                var pt = anim.trail[j];
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1.5 + progress * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (progress * 0.6) + ')';
                ctx.fill();
            }
        }

        if (anim.active) {
            var px = anim.particleX;
            var py = anim.particleY;
            var grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
            grad.addColorStop(0, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.5)');
            grad.addColorStop(0.4, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.15)');
            grad.addColorStop(1, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0)');
            ctx.fillStyle = grad;
            ctx.fillRect(px - 14, py - 14, 28, 28);

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.9)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
        } else {
            var pathType = anim.pathType;
            ctx.beginPath();
            var previewCx = w / 2;
            var previewCy = h / 2;
            var previewR = Math.min(w, h) * 0.4;
            var first = pathType.generator(0, previewCx, previewCy, previewR);
            ctx.moveTo(first.x, first.y);
            for (var k = 1; k <= 120; k++) {
                var p = pathType.generator(k / 120 * Math.PI * 6, previewCx, previewCy, previewR);
                ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function drawMainPaths() {
        var ctx = pathCtx;
        var rect = galleryStage.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        ctx.clearRect(0, 0, w, h);

        var ac = getAccentColor();

        state.animators.forEach(function (anim) {
            if (anim.pulseAlpha > 0.01) {
                var pulseR = (1 - anim.pulseAlpha) * 120;
                ctx.beginPath();
                ctx.arc(anim.pulseX, anim.pulseY, pulseR, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (anim.pulseAlpha * 0.4) + ')';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            if (!anim.active) return;

            if (anim.mainTrail.length > 1) {
                for (var i = 1; i < anim.mainTrail.length; i++) {
                    var progress = i / anim.mainTrail.length;
                    var alpha = progress * progress * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(anim.mainTrail[i - 1].x, anim.mainTrail[i - 1].y);
                    ctx.lineTo(anim.mainTrail[i].x, anim.mainTrail[i].y);
                    ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + alpha + ')';
                    ctx.lineWidth = 1.5 + progress * 1.5;
                    ctx.stroke();
                }
            }

            var sx = anim.springX;
            var sy = anim.springY;

            var glowR = 24 + Math.sin(anim.mainT * 2) * 4;
            var grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            grad.addColorStop(0, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (anim.glowAlpha * 0.5) + ')');
            grad.addColorStop(0.5, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (anim.glowAlpha * 0.12) + ')');
            grad.addColorStop(1, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + anim.glowAlpha + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,' + (anim.glowAlpha * 0.7) + ')';
            ctx.fill();
        });

        drawMainConnections(ctx, w, h, ac);
    }

    function drawMainConnections(ctx, w, h, ac) {
        var active = state.animators.filter(function (a) { return a.active; });
        if (active.length < 2) return;

        for (var i = 0; i < active.length; i++) {
            for (var j = i + 1; j < active.length; j++) {
                var a = active[i];
                var b = active[j];
                var dx = a.springX - b.springX;
                var dy = a.springY - b.springY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = Math.min(w, h) * 0.6;
                if (dist < maxDist) {
                    var alpha = (1 - dist / maxDist) * 0.15;
                    var midX = (a.springX + b.springX) / 2;
                    var midY = (a.springY + b.springY) / 2 - dist * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(a.springX, a.springY);
                    ctx.quadraticCurveTo(midX, midY, b.springX, b.springY);
                    ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + alpha + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    function updateBgParticles(dt, time) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var ac = getAccentColor();

        bgCtx.clearRect(0, 0, w, h);

        state.bgParticles.forEach(function (p) {
            p.phase += 0.008 * dt;
            p.x += p.vx * dt + Math.sin(p.phase) * 0.15;
            p.y += p.vy * dt + Math.cos(p.phase * 0.7) * 0.1;

            if (state.mouseInStage) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 1) {
                    var force = (1 - dist / 200) * 0.02;
                    p.x += dx / dist * force * dt;
                    p.y += dy / dist * force * dt;
                }
            }

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            var twinkle = 0.5 + 0.5 * Math.sin(p.phase * 3);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (p.alpha * twinkle) + ')';
            ctx.fill();
        });
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        updateAnimators(dt, time);
        state.animators.forEach(drawMiniCanvas);
        drawMainPaths();
        updateBgParticles(dt, time);

        state.animId = requestAnimationFrame(animate);
    }

    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            var stageRect = galleryStage.getBoundingClientRect();
            state.mouse.stageX = e.clientX - stageRect.left;
            state.mouse.stageY = e.clientY - stageRect.top;
            state.mouseInStage = (
                state.mouse.stageX >= 0 && state.mouse.stageX <= stageRect.width &&
                state.mouse.stageY >= 0 && state.mouse.stageY <= stageRect.height
            );
        });

        document.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
        });

        window.addEventListener('resize', debounce(function () {
            state.dpr = Math.min(window.devicePixelRatio || 1, 2);
            resizeCanvas();
        }, 200));

        speedSlider.addEventListener('input', function () {
            state.speed = parseFloat(this.value);
            speedValue.textContent = state.speed.toFixed(1) + 'x';
        });

        btnClear.addEventListener('click', function () {
            state.animators.forEach(function (anim) {
                anim.active = false;
                anim.trail = [];
                anim.mainTrail = [];
                anim.glowAlpha = 0;
                anim.cardEl.classList.remove('is-active');
                anim.statusEl.textContent = 'IDLE';
            });
        });

        btnAll.addEventListener('click', function () {
            var anyActive = state.animators.some(function (a) { return a.active; });
            state.animators.forEach(function (anim) {
                anim.active = !anyActive;
                anim.cardEl.classList.toggle('is-active', !anyActive);
                anim.statusEl.textContent = !anyActive ? 'ACTIVE' : 'IDLE';
                if (!anyActive) {
                    anim.pulseAlpha = 1;
                    anim.pulseX = anim.stageCenterX;
                    anim.pulseY = anim.stageCenterY;
                    anim.trail = [];
                    anim.mainTrail = [];
                }
            });
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        btnRandom.addEventListener('click', function () {
            var indices = [];
            for (var i = 0; i < state.animators.length; i++) indices.push(i);
            shuffle(indices);
            var count = 2 + Math.floor(Math.random() * 4);
            state.animators.forEach(function (anim) {
                anim.active = false;
                anim.cardEl.classList.remove('is-active');
                anim.statusEl.textContent = 'IDLE';
            });
            for (var j = 0; j < count; j++) {
                var anim = state.animators[indices[j]];
                anim.active = true;
                anim.cardEl.classList.add('is-active');
                anim.statusEl.textContent = 'ACTIVE';
                anim.pulseAlpha = 1;
                anim.pulseX = anim.stageCenterX;
                anim.pulseY = anim.stageCenterY;
                anim.trail = [];
                anim.mainTrail = [];
            }
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        themeGroup.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            var theme = btn.getAttribute('data-theme');
            if (theme === state.theme) return;

            transFlash.classList.add('is-active');
            setTimeout(function () {
                state.theme = theme;
                document.body.setAttribute('data-theme', theme);
                themeGroup.querySelectorAll('.theme-btn').forEach(function (b) {
                    b.classList.toggle('active', b.getAttribute('data-theme') === theme);
                });
                transFlash.classList.remove('is-active');
            }, 250);
        });
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(self, args); }, delay);
        };
    }

    function init() {
        initCards();
        initBgParticles();
        resizeCanvas();
        bindEvents();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
