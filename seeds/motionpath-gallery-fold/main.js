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
                return {
                    x: cx + Math.cos(t) * radius,
                    y: cy + Math.sin(t * 3) * radius * 0.35
                };
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
        mode: 'fan',
        speed: 1,
        cards: [],
        bgParticles: [],
        mouse: { x: -9999, y: -9999, stageX: -9999, stageY: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        lastTime: 0,
        animId: null,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        stageW: 0,
        stageH: 0,
        pulseWaves: [],
        foldOrder: []
    };

    var foldContainer = document.getElementById('fold-container');
    var pathCanvas = document.getElementById('path-canvas');
    var pathCtx = pathCanvas.getContext('2d');
    var bgCanvas = document.getElementById('bg-canvas');
    var bgCtx = bgCanvas.getContext('2d');
    var galleryStage = document.getElementById('gallery-stage');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var speedSlider = document.getElementById('speed-slider');
    var speedValue = document.getElementById('speed-value');
    var btnCollapse = document.getElementById('btn-collapse');
    var btnExpand = document.getElementById('btn-expand');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnPulse = document.getElementById('btn-pulse');
    var themeGroup = document.getElementById('theme-group');
    var transFlash = document.getElementById('transition-flash');

    function getAccentColor() {
        return THEME_COLORS[state.theme];
    }

    function springDamper(current, target, velocity, stiffness, damping, dt) {
        var force = (target - current) * stiffness;
        var dampedVelocity = velocity * Math.pow(damping, dt);
        var newVelocity = dampedVelocity + force * dt;
        var newPos = current + newVelocity * dt;
        return { pos: newPos, vel: newVelocity };
    }

    function getFoldLayout(index, total, mode, expanded) {
        var cx = state.stageW / 2;
        var cy = state.stageH / 2;
        var cardW = 220;
        var cardH = 280;
        var result = { x: cx, y: cy, rotX: 0, rotY: 0, rotZ: 0, scale: 1, foldAngle: 0, opacity: 1 };

        if (mode === 'fan') {
            var fanSpread = 160;
            var startAngle = -fanSpread / 2;
            var angleStep = total > 1 ? fanSpread / (total - 1) : 0;
            var angle = startAngle + index * angleStep;
            var rad = angle * Math.PI / 180;

            if (expanded) {
                var expandSpread = Math.min(state.stageW * 0.7, total * (cardW + 20));
                var expandStart = cx - expandSpread / 2;
                var expandStep = total > 1 ? expandSpread / (total - 1) : 0;
                result.x = expandStart + index * expandStep;
                result.y = cy;
                result.rotZ = 0;
                result.scale = 1;
                result.foldAngle = 0;
            } else {
                result.x = cx + Math.sin(rad) * cardW * 0.6;
                result.y = cy + Math.cos(rad) * cardH * 0.15 - 20;
                result.rotZ = angle;
                result.scale = 0.85;
                result.foldAngle = Math.abs(angle) * 0.4;
            }
        } else if (mode === 'cascade') {
            if (expanded) {
                var cols = Math.min(4, total);
                var rows = Math.ceil(total / cols);
                var col = index % cols;
                var row = Math.floor(index / cols);
                var gapX = cardW + 20;
                var gapY = cardH + 16;
                result.x = cx - (cols - 1) * gapX / 2 + col * gapX;
                result.y = cy - (rows - 1) * gapY / 2 + row * gapY;
                result.rotZ = 0;
                result.scale = 1;
                result.foldAngle = 0;
            } else {
                var stackOffset = index * 6;
                result.x = cx + stackOffset;
                result.y = cy - 10 + stackOffset * 0.5;
                result.rotZ = index * 1.5;
                result.scale = 0.9 - index * 0.01;
                result.foldAngle = 20 + index * 8;
                result.opacity = 1 - index * 0.06;
            }
        } else if (mode === 'spiral') {
            if (expanded) {
                var spiralAngle = index * (Math.PI * 2 / total);
                var spiralRadius = Math.min(state.stageW, state.stageH) * 0.3;
                result.x = cx + Math.cos(spiralAngle) * spiralRadius;
                result.y = cy + Math.sin(spiralAngle) * spiralRadius;
                result.rotZ = spiralAngle * 180 / Math.PI + 90;
                result.scale = 1;
                result.foldAngle = 0;
            } else {
                var sAngle = index * 0.7;
                var sRadius = 20 + index * 15;
                result.x = cx + Math.cos(sAngle) * sRadius;
                result.y = cy + Math.sin(sAngle) * sRadius;
                result.rotZ = sAngle * 180 / Math.PI;
                result.scale = 0.75;
                result.foldAngle = 30 + index * 10;
            }
        }

        return result;
    }

    function createCard(index) {
        var pathType = PATH_TYPES[index];

        var cardEl = document.createElement('div');
        cardEl.className = 'fold-card';
        cardEl.setAttribute('data-index', index);

        var innerEl = document.createElement('div');
        innerEl.className = 'fold-card-inner';

        var glowEl = document.createElement('div');
        glowEl.className = 'fold-glow';

        var creaseEl = document.createElement('div');
        creaseEl.className = 'fold-crease';

        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'fold-card-canvas-wrap';

        var miniCanvas = document.createElement('canvas');
        canvasWrap.appendChild(miniCanvas);

        var footerEl = document.createElement('div');
        footerEl.className = 'fold-card-footer';

        var labelEl = document.createElement('span');
        labelEl.className = 'card-label';
        labelEl.textContent = pathType.label;

        var statusEl = document.createElement('span');
        statusEl.className = 'card-status';
        statusEl.textContent = 'FOLDED';

        footerEl.appendChild(labelEl);
        footerEl.appendChild(statusEl);

        innerEl.appendChild(glowEl);
        innerEl.appendChild(creaseEl);
        innerEl.appendChild(canvasWrap);
        innerEl.appendChild(footerEl);
        cardEl.appendChild(innerEl);
        foldContainer.appendChild(cardEl);

        var layout = getFoldLayout(index, PATH_TYPES.length, state.mode, false);

        var card = {
            index: index,
            pathType: pathType,
            el: cardEl,
            innerEl: innerEl,
            miniCanvas: miniCanvas,
            miniCtx: miniCanvas.getContext('2d'),
            miniW: 0,
            miniH: 0,
            statusEl: statusEl,
            expanded: false,
            t: index * 0.8,
            trail: [],
            maxTrail: 120,
            particleX: 0,
            particleY: 0,
            glowAlpha: 0,
            currentX: layout.x,
            currentY: layout.y,
            currentRotX: 0,
            currentRotY: 0,
            currentRotZ: layout.rotZ,
            currentScale: layout.scale,
            currentFold: layout.foldAngle,
            currentOpacity: layout.opacity,
            targetX: layout.x,
            targetY: layout.y,
            targetRotZ: layout.rotZ,
            targetScale: layout.scale,
            targetFold: layout.foldAngle,
            targetOpacity: layout.opacity,
            velX: 0,
            velY: 0,
            velRotZ: 0,
            velScale: 0,
            velFold: 0,
            velOpacity: 0,
            hoverLift: 0,
            pulseAlpha: 0,
            entryDelay: index * 100,
            entryProgress: 0
        };

        cardEl.addEventListener('click', function (e) {
            e.stopPropagation();
            card.expanded = !card.expanded;
            cardEl.classList.toggle('is-expanded', card.expanded);
            cardEl.classList.toggle('is-folded', !card.expanded);
            statusEl.textContent = card.expanded ? 'ACTIVE' : 'FOLDED';

            updateLayoutTargets();

            if (card.expanded) {
                card.pulseAlpha = 1;
                card.trail = [];
            }

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        cardEl.addEventListener('mouseenter', function () {
            card.hoverLift = 1;
        });

        cardEl.addEventListener('mouseleave', function () {
            card.hoverLift = 0;
        });

        return card;
    }

    function updateLayoutTargets() {
        var total = state.cards.length;
        state.cards.forEach(function (card, index) {
            var layout = getFoldLayout(index, total, state.mode, card.expanded);
            card.targetX = layout.x;
            card.targetY = layout.y;
            card.targetRotZ = layout.rotZ;
            card.targetScale = layout.scale;
            card.targetFold = layout.foldAngle;
            card.targetOpacity = layout.opacity;
        });
    }

    function initCards() {
        for (var i = 0; i < PATH_TYPES.length; i++) {
            state.cards.push(createCard(i));
            state.foldOrder.push(i);
        }
        state.cards.forEach(function (card, idx) {
            card.el.style.zIndex = idx;
        });
        setTimeout(updateLayoutTargets, 200);
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

    function resizeCanvas() {
        var rect = galleryStage.getBoundingClientRect();
        state.stageW = rect.width;
        state.stageH = rect.height;

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

        resizeMiniCanvases();
        updateLayoutTargets();
    }

    function resizeMiniCanvases() {
        state.cards.forEach(function (card) {
            var wrapRect = card.miniCanvas.parentElement.getBoundingClientRect();
            var w = wrapRect.width;
            var h = wrapRect.height;
            if (w <= 0 || h <= 0) return;
            card.miniCanvas.width = w * state.dpr;
            card.miniCanvas.height = h * state.dpr;
            card.miniCanvas.style.width = w + 'px';
            card.miniCanvas.style.height = h + 'px';
            card.miniCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
            card.miniW = w;
            card.miniH = h;
        });
    }

    function updateCards(dt, time) {
        var stiffness = 0.08;
        var damping = 0.72;
        var now = performance.now();

        state.cards.forEach(function (card) {
            if (card.entryProgress < 1) {
                if (now > card.entryDelay + 300) {
                    card.entryProgress = Math.min(1, card.entryProgress + 0.03 * dt);
                }
            }

            var sX = springDamper(card.currentX, card.targetX, card.velX, stiffness, damping, dt);
            card.currentX = sX.pos;
            card.velX = sX.vel;

            var sY = springDamper(card.currentY, card.targetY, card.velY, stiffness, damping, dt);
            card.currentY = sY.pos;
            card.velY = sY.vel;

            var sR = springDamper(card.currentRotZ, card.targetRotZ, card.velRotZ, stiffness, damping, dt);
            card.currentRotZ = sR.pos;
            card.velRotZ = sR.vel;

            var sS = springDamper(card.currentScale, card.targetScale, card.velScale, stiffness, damping, dt);
            card.currentScale = sS.pos;
            card.velScale = sS.vel;

            var sF = springDamper(card.currentFold, card.targetFold, card.velFold, stiffness * 1.2, damping, dt);
            card.currentFold = sF.pos;
            card.velFold = sF.vel;

            var sO = springDamper(card.currentOpacity, card.targetOpacity, card.velOpacity, stiffness * 0.5, 0.6, dt);
            card.currentOpacity = sO.pos;
            card.velOpacity = sO.vel;

            if (card.hoverLift > 0.01 || card.hoverLift < -0.01) {
                card.currentY += -12 * card.hoverLift * 0.3;
            }

            var foldRad = card.currentFold * Math.PI / 180;
            var rotX = Math.sin(foldRad) * 15;
            var rotY = Math.cos(foldRad) * 5;
            var perspectiveOffset = Math.sin(foldRad) * card.currentScale * 20;

            var ep = easeOutCubic(card.entryProgress);
            var translateX = card.currentX - state.stageW / 2;
            var translateY = card.currentY - state.stageH / 2;

            card.el.style.transform =
                'translate3d(' + translateX + 'px,' + translateY + 'px,' + perspectiveOffset + 'px) ' +
                'rotateX(' + rotX + 'deg) ' +
                'rotateY(' + (-card.currentFold * 0.3) + 'deg) ' +
                'rotateZ(' + card.currentRotZ + 'deg) ' +
                'scale(' + (card.currentScale * ep) + ')';
            card.el.style.opacity = card.currentOpacity * ep;

            if (card.expanded) {
                card.t += dt * 0.025 * state.speed;
                var previewCx = card.miniW / 2;
                var previewCy = card.miniH / 2;
                var previewR = Math.min(card.miniW, card.miniH) * 0.4;
                var pos = card.pathType.generator(card.t, previewCx, previewCy, previewR);
                card.particleX = pos.x;
                card.particleY = pos.y;
                card.trail.push({ x: pos.x, y: pos.y });
                if (card.trail.length > card.maxTrail) card.trail.shift();
                card.glowAlpha += (0.7 - card.glowAlpha) * 0.06 * dt;
            } else {
                card.glowAlpha += (0 - card.glowAlpha) * 0.08 * dt;
                if (card.trail.length > 0) {
                    card.trail.splice(0, Math.ceil(card.trail.length * 0.05 * dt));
                }
            }

            if (card.pulseAlpha > 0) {
                card.pulseAlpha -= 0.015 * dt;
                if (card.pulseAlpha < 0) card.pulseAlpha = 0;
            }
        });
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function drawMiniCanvas(card) {
        var ctx = card.miniCtx;
        var w = card.miniW;
        var h = card.miniH;
        if (w <= 0 || h <= 0) return;

        ctx.clearRect(0, 0, w, h);
        var ac = getAccentColor();

        if (!card.expanded) {
            ctx.beginPath();
            var cx = w / 2;
            var cy = h / 2;
            var r = Math.min(w, h) * 0.4;
            var first = card.pathType.generator(0, cx, cy, r);
            ctx.moveTo(first.x, first.y);
            for (var k = 1; k <= 120; k++) {
                var p = card.pathType.generator(k / 120 * Math.PI * 6, cx, cy, r);
                ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
            return;
        }

        if (card.trail.length > 1) {
            for (var i = 1; i < card.trail.length; i++) {
                var progress = i / card.trail.length;
                var alpha = progress * progress * 0.5;
                ctx.beginPath();
                ctx.moveTo(card.trail[i - 1].x, card.trail[i - 1].y);
                ctx.lineTo(card.trail[i].x, card.trail[i].y);
                ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + alpha + ')';
                ctx.lineWidth = 1 + progress * 2;
                ctx.stroke();
            }
        }

        if (card.trail.length > 1) {
            for (var j = Math.max(0, card.trail.length - 15); j < card.trail.length; j++) {
                var prog = (j - Math.max(0, card.trail.length - 15)) / 15;
                var pt = card.trail[j];
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1 + prog * 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (prog * 0.6) + ')';
                ctx.fill();
            }
        }

        var px = card.particleX;
        var py = card.particleY;
        var glowR = 20;
        var grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grad.addColorStop(0, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.5)');
        grad.addColorStop(0.4, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.12)');
        grad.addColorStop(1, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0.9)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
    }

    function drawMainPaths() {
        var ctx = pathCtx;
        var w = state.stageW;
        var h = state.stageH;
        ctx.clearRect(0, 0, w, h);
        var ac = getAccentColor();

        state.pulseWaves.forEach(function (pw) {
            if (pw.alpha <= 0) return;
            var radius = (1 - pw.alpha) * 200;
            ctx.beginPath();
            ctx.arc(pw.x, pw.y, Math.max(0.1, radius), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (pw.alpha * 0.35) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        var active = state.cards.filter(function (c) { return c.expanded; });

        if (active.length >= 2) {
            for (var i = 0; i < active.length; i++) {
                for (var j = i + 1; j < active.length; j++) {
                    var a = active[i];
                    var b = active[j];
                    var dx = a.currentX - b.currentX;
                    var dy = a.currentY - b.currentY;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var maxDist = Math.min(w, h) * 0.7;
                    if (dist < maxDist) {
                        var alpha = (1 - dist / maxDist) * 0.12;
                        var midX = (a.currentX + b.currentX) / 2;
                        var midY = (a.currentY + b.currentY) / 2 - dist * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(a.currentX, a.currentY);
                        ctx.quadraticCurveTo(midX, midY, b.currentX, b.currentY);
                        ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + alpha + ')';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }

        active.forEach(function (card) {
            if (card.pulseAlpha > 0.01) {
                var pulseR = (1 - card.pulseAlpha) * 80;
                ctx.beginPath();
                ctx.arc(card.currentX, card.currentY, Math.max(0.1, pulseR), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (card.pulseAlpha * 0.3) + ')';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            var glowSize = 28 + Math.sin(card.t * 2) * 5;
            var grad = ctx.createRadialGradient(card.currentX, card.currentY, 0, card.currentX, card.currentY, glowSize);
            grad.addColorStop(0, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (card.glowAlpha * 0.4) + ')');
            grad.addColorStop(0.5, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (card.glowAlpha * 0.1) + ')');
            grad.addColorStop(1, 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(card.currentX, card.currentY, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(card.currentX, card.currentY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + card.glowAlpha + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(card.currentX, card.currentY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,' + (card.glowAlpha * 0.7) + ')';
            ctx.fill();
        });
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
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            bgCtx.fillStyle = 'rgba(' + ac.r + ',' + ac.g + ',' + ac.b + ',' + (p.alpha * twinkle) + ')';
            bgCtx.fill();
        });
    }

    function updatePulseWaves(dt) {
        for (var i = state.pulseWaves.length - 1; i >= 0; i--) {
            state.pulseWaves[i].alpha -= 0.01 * dt;
            if (state.pulseWaves[i].alpha <= 0) {
                state.pulseWaves.splice(i, 1);
            }
        }
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        updateCards(dt, time);
        state.cards.forEach(drawMiniCanvas);
        drawMainPaths();
        updateBgParticles(dt, time);
        updatePulseWaves(dt);

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

        btnCollapse.addEventListener('click', function () {
            state.cards.forEach(function (card) {
                card.expanded = false;
                card.el.classList.remove('is-expanded');
                card.el.classList.add('is-folded');
                card.statusEl.textContent = 'FOLDED';
            });
            updateLayoutTargets();
        });

        btnExpand.addEventListener('click', function () {
            state.cards.forEach(function (card) {
                card.expanded = true;
                card.el.classList.add('is-expanded');
                card.el.classList.remove('is-folded');
                card.statusEl.textContent = 'ACTIVE';
                card.pulseAlpha = 0.5;
                card.trail = [];
            });
            updateLayoutTargets();
            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        btnShuffle.addEventListener('click', function () {
            shuffle(state.foldOrder);
            state.cards.forEach(function (card, idx) {
                var newIdx = state.foldOrder[idx];
                var tmpPath = card.pathType;
                card.pathType = PATH_TYPES[newIdx];
                card.t = newIdx * 0.8;
                card.trail = [];
                card.statusEl.textContent = card.expanded ? 'ACTIVE' : 'FOLDED';
                card.el.querySelector('.card-label').textContent = card.pathType.label;
            });

            state.cards.forEach(function (card) {
                var offset = (Math.random() - 0.5) * 40;
                card.currentX += offset;
                card.currentY += offset;
                card.velX += (Math.random() - 0.5) * 5;
                card.velY += (Math.random() - 0.5) * 5;
                card.velRotZ += (Math.random() - 0.5) * 15;
            });

            updateLayoutTargets();

            state.pulseWaves.push({
                x: state.stageW / 2,
                y: state.stageH / 2,
                alpha: 1
            });
        });

        btnPulse.addEventListener('click', function () {
            state.pulseWaves.push({
                x: state.stageW / 2,
                y: state.stageH / 2,
                alpha: 1
            });

            state.cards.forEach(function (card, idx) {
                setTimeout(function () {
                    card.velX += (Math.random() - 0.5) * 8;
                    card.velY += (Math.random() - 0.5) * 8;
                    card.velRotZ += (Math.random() - 0.5) * 10;
                    card.velScale += (Math.random() - 0.5) * 0.2;
                    card.velFold += (Math.random() - 0.5) * 20;
                }, idx * 60);
            });

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        document.querySelectorAll('.mode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var mode = this.getAttribute('data-mode');
                if (mode === state.mode) return;
                state.mode = mode;
                document.querySelectorAll('.mode-btn').forEach(function (b) {
                    b.classList.toggle('active', b.getAttribute('data-mode') === mode);
                });

                state.cards.forEach(function (card) {
                    card.velRotZ += (Math.random() - 0.5) * 10;
                    card.velFold += (Math.random() - 0.5) * 15;
                });

                updateLayoutTargets();
            });
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
