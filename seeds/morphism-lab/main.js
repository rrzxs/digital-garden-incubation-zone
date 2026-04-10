(function () {
    var canvas = document.getElementById('morph-canvas');
    var ctx = canvas.getContext('2d');
    var stageArea = document.getElementById('stage-area');
    var stageHint = document.getElementById('stage-hint');
    var morphEntities = document.getElementById('morph-entities');
    var cursorTrail = document.getElementById('cursor-trail');

    var ctrlNoise = document.getElementById('ctrl-noise');
    var ctrlSpeed = document.getElementById('ctrl-speed');
    var valNoise = document.getElementById('val-noise');
    var valSpeed = document.getElementById('val-speed');
    var statFps = document.getElementById('stat-fps');
    var statVertices = document.getElementById('stat-vertices');
    var statMode = document.getElementById('stat-mode');

    var modeBtns = document.querySelectorAll('.mode-btn');
    var shapeBtns = document.querySelectorAll('.shape-btn');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var btnReset = document.getElementById('btn-reset');
    var btnFullscreen = document.getElementById('btn-fullscreen');

    var orbEls = document.querySelectorAll('.morph-orb');
    var orbPaths = document.querySelectorAll('.orb-path');
    var orbHighlights = document.querySelectorAll('.orb-highlight');

    var VERTICES = 64;
    var noiseLevel = 0.3;
    var speedFactor = 0.4;
    var currentMode = 'sculpt';
    var currentShape = 'sphere';
    var currentPalette = 'void';
    var hasInteracted = false;

    var mouseX = 0;
    var mouseY = 0;
    var stageMouseX = 0.5;
    var stageMouseY = 0.5;

    var palettes = {
        void: {
            fill: 'rgba(139, 92, 246, 0.22)',
            stroke: 'rgba(139, 92, 246, 0.55)',
            glow: 'rgba(139, 92, 246, 0.12)',
            accent: '#8b5cf6',
            particles: ['#8b5cf6', '#ec4899', '#6366f1', '#a78bfa']
        },
        ocean: {
            fill: 'rgba(6, 182, 212, 0.22)',
            stroke: 'rgba(6, 182, 212, 0.55)',
            glow: 'rgba(6, 182, 212, 0.12)',
            accent: '#06b6d4',
            particles: ['#0ea5e9', '#06b6d4', '#2dd4bf', '#67e8f9']
        },
        ember: {
            fill: 'rgba(249, 115, 22, 0.22)',
            stroke: 'rgba(249, 115, 22, 0.55)',
            glow: 'rgba(249, 115, 22, 0.12)',
            accent: '#f97316',
            particles: ['#f97316', '#ef4444', '#eab308', '#fbbf24']
        },
        aurora: {
            fill: 'rgba(34, 211, 238, 0.22)',
            stroke: 'rgba(167, 139, 250, 0.55)',
            glow: 'rgba(52, 211, 153, 0.12)',
            accent: '#22d3ee',
            particles: ['#22d3ee', '#a78bfa', '#34d399', '#2dd4bf']
        }
    };

    var shapeGenerators = {
        sphere: function (i, total, t) {
            var angle = (i / total) * Math.PI * 2;
            return { base: 1.0, wave: 0 };
        },
        star: function (i, total, t) {
            var angle = (i / total) * Math.PI * 2;
            var points = 5;
            var r = (i % (total / points) < (total / points / 2)) ? 1.0 : 0.55;
            return { base: r, wave: 0 };
        },
        wave: function (i, total, t) {
            var angle = (i / total) * Math.PI * 2;
            var wave = Math.sin(angle * 3 + t * 2) * 0.2;
            return { base: 0.85, wave: wave };
        },
        blob: function (i, total, t) {
            var angle = (i / total) * Math.PI * 2;
            var deform = Math.sin(angle * 2 + t) * 0.15 + Math.cos(angle * 3 - t * 1.3) * 0.1;
            return { base: 0.9, wave: deform };
        },
        crystal: function (i, total, t) {
            var sides = 6;
            var segment = total / sides;
            var pos = i % segment;
            var angle = (i / total) * Math.PI * 2;
            var nearEdge = Math.min(pos, segment - pos) / (segment / 2);
            var r = 0.7 + nearEdge * 0.35;
            return { base: r, wave: 0 };
        }
    };

    var orbs = [];
    var particles = [];
    var trailDots = [];

    var lastTime = performance.now();
    var frameCount = 0;
    var fps = 60;
    var time = 0;

    function init() {
        for (var i = 0; i < orbEls.length; i++) {
            var rect = orbEls[i].getBoundingClientRect();
            var stageRect = stageArea.getBoundingClientRect();
            orbs.push({
                index: i,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                targetX: 0,
                targetY: 0,
                radius: 55,
                vertices: generateVertices(),
                isDragging: false,
                morphProgress: 0,
                springStrength: 0.08 + i * 0.015,
                damping: 0.82 - i * 0.02
            });
        }

        for (var j = 0; j < 60; j++) {
            particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.001,
                vy: (Math.random() - 0.5) * 0.001,
                size: 1 + Math.random() * 2.5,
                alpha: 0.1 + Math.random() * 0.4,
                colorIndex: Math.floor(Math.random() * 4)
            });
        }

        for (var k = 0; k < 12; k++) {
            var dot = document.createElement('div');
            dot.className = 'trail-dot';
            dot.style.opacity = '0';
            cursorTrail.appendChild(dot);
            trailDots.push({
                el: dot,
                x: 0,
                y: 0
            });
        }

        statVertices.textContent = VERTICES * orbEls.length;
    }

    function generateVertices() {
        var verts = [];
        for (var i = 0; i < VERTICES; i++) {
            verts.push({
                angle: (i / VERTICES) * Math.PI * 2,
                radiusOffset: 0,
                noisePhase: Math.random() * Math.PI * 2
            });
        }
        return verts;
    }

    function simpleNoise(x, y, seed) {
        var n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453;
        return n - Math.floor(n);
    }

    function smoothNoise(x, y, seed) {
        var ix = Math.floor(x);
        var iy = Math.floor(y);
        var fx = x - ix;
        var fy = y - iy;
        var sx = fx * fx * (3 - 2 * fx);
        var sy = fy * fy * (3 - 2 * fy);

        var n00 = simpleNoise(ix, iy, seed);
        var n10 = simpleNoise(ix + 1, iy, seed);
        var n01 = simpleNoise(ix, iy + 1, seed);
        var n11 = simpleNoise(ix + 1, iy + 1, seed);

        var nx0 = n00 * (1 - sx) + n10 * sx;
        var nx1 = n01 * (1 - sx) + n11 * sx;
        return nx0 * (1 - sy) + nx1 * sy;
    }

    function updateOrbPositions() {
        var stageRect = stageArea.getBoundingClientRect();

        for (var i = 0; i < orbs.length; i++) {
            var orb = orbs[i];
            var el = orbEls[i];
            var elRect = el.getBoundingClientRect();

            var centerX = elRect.left + elRect.width / 2 - stageRect.left;
            var centerY = elRect.top + elRect.height / 2 - stageRect.top;

            if (!orb.isDragging) {
                orb.targetX = centerX;
                orb.targetY = centerY;
            }

            var dx = orb.targetX - orb.x;
            var dy = orb.targetY - orb.y;
            orb.vx += dx * orb.springStrength;
            orb.vy += dy * orb.springStrength;
            orb.vx *= orb.damping;
            orb.vy *= orb.damping;
            orb.x += orb.vx;
            orb.y += orb.vy;
        }
    }

    function generateOrbPath(orbIndex, t) {
        var orb = orbs[orbIndex];
        var palette = palettes[currentPalette];
        var gen = shapeGenerators[currentShape];
        var cx = 100;
        var cy = 100;
        var baseRadius = 65;
        var points = [];

        for (var i = 0; i < VERTICES; i++) {
            var vert = orb.vertices[i];
            var shape = gen(i, VERTICES, t + orbIndex * 1.5);
            var noiseVal = smoothNoise(
                Math.cos(vert.angle) * 2 + t * speedFactor,
                Math.sin(vert.angle) * 2 + t * speedFactor * 0.7,
                vert.noisePhase + orbIndex * 10
            );

            var radiusNoise = (noiseVal - 0.5) * 2 * noiseLevel * 30;
            var radius = baseRadius * shape.base + shape.wave * baseRadius + radiusNoise;

            var mx = 0;
            var my = 0;
            if (currentMode === 'sculpt') {
                var normX = orb.x / (canvas.width || 1);
                var normY = orb.y / (canvas.height || 1);
                var distToMouse = Math.sqrt(
                    Math.pow(stageMouseX - normX, 2) +
                    Math.pow(stageMouseY - normY, 2)
                );
                var influence = Math.max(0, 1 - distToMouse * 3) * 15 * noiseLevel;
                mx = Math.cos(vert.angle) * influence * Math.sin(t * 3 + orbIndex);
                my = Math.sin(vert.angle) * influence * Math.cos(t * 2.5 + orbIndex);
            }

            var px = cx + Math.cos(vert.angle) * radius + mx;
            var py = cy + Math.sin(vert.angle) * radius + my;
            points.push({ x: px, y: py });
        }

        return points;
    }

    function pointsToSmoothPath(points) {
        if (points.length < 3) return '';
        var d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);

        for (var i = 0; i < points.length; i++) {
            var p0 = points[(i - 1 + points.length) % points.length];
            var p1 = points[i];
            var p2 = points[(i + 1) % points.length];
            var p3 = points[(i + 2) % points.length];

            var cp1x = p1.x + (p2.x - p0.x) / 6;
            var cp1y = p1.y + (p2.y - p0.y) / 6;
            var cp2x = p2.x - (p3.x - p1.x) / 6;
            var cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ' C ' + cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ', ' +
                cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ', ' +
                p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
        }

        return d;
    }

    function renderOrbs(t) {
        var palette = palettes[currentPalette];

        for (var i = 0; i < orbs.length; i++) {
            var points = generateOrbPath(i, t);
            var pathD = pointsToSmoothPath(points);

            var pathEl = orbPaths[i];
            if (pathEl) {
                pathEl.setAttribute('d', pathD);
                pathEl.style.fill = palette.fill;
                pathEl.style.stroke = palette.stroke;
            }

            var hlEl = orbHighlights[i];
            if (hlEl) {
                var hlD = pointsToSmoothPath(points);
                hlEl.setAttribute('d', hlD);
            }
        }
    }

    function renderParticles(t) {
        var palette = palettes[currentPalette];
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var w = canvas.width;
        var h = canvas.height;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            if (currentMode === 'flow') {
                var angle = smoothNoise(p.x * 3, p.y * 3, t * 0.3) * Math.PI * 4;
                p.vx += Math.cos(angle) * 0.0004 * speedFactor;
                p.vy += Math.sin(angle) * 0.0004 * speedFactor;
            } else if (currentMode === 'shatter') {
                var cx = 0.5;
                var cy = 0.5;
                var dx = p.x - cx;
                var dy = p.y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var force = Math.max(0, 0.3 - dist) * 0.002 * speedFactor;
                p.vx += (dx / (dist + 0.01)) * force * Math.sin(t * 3);
                p.vy += (dy / (dist + 0.01)) * force * Math.sin(t * 3);
            } else {
                var dxm = p.x - stageMouseX;
                var dym = p.y - stageMouseY;
                var distM = Math.sqrt(dxm * dxm + dym * dym);
                if (distM < 0.2) {
                    var repel = (0.2 - distM) * 0.001;
                    p.vx += (dxm / (distM + 0.01)) * repel;
                    p.vy += (dym / (distM + 0.01)) * repel;
                }
            }

            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
            if (p.x > 1) { p.x = 1; p.vx *= -0.5; }
            if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
            if (p.y > 1) { p.y = 1; p.vy *= -0.5; }

            var pulse = 0.5 + Math.sin(t * 2 + i * 0.5) * 0.5;
            var alpha = p.alpha * (0.5 + pulse * 0.5);
            var size = p.size * (0.8 + pulse * 0.4);

            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, size, 0, Math.PI * 2);
            ctx.fillStyle = palette.particles[p.colorIndex];
            ctx.globalAlpha = alpha;
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        for (var i = 0; i < orbs.length; i++) {
            var orb = orbs[i];
            var ox = orb.x;
            var oy = orb.y;

            var gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, 80);
            gradient.addColorStop(0, palette.glow);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(ox - 80, oy - 80, 160, 160);
        }
    }

    function updateCursorTrail() {
        if (trailDots.length === 0) return;

        for (var i = trailDots.length - 1; i > 0; i--) {
            trailDots[i].x = trailDots[i - 1].x;
            trailDots[i].y = trailDots[i - 1].y;
        }
        trailDots[0].x = mouseX;
        trailDots[0].y = mouseY;

        var palette = palettes[currentPalette];
        for (var j = 0; j < trailDots.length; j++) {
            var td = trailDots[j];
            var alpha = (1 - j / trailDots.length) * 0.5;
            var scale = 1 - j / trailDots.length;
            td.el.style.transform = 'translate(' + td.x + 'px, ' + td.y + 'px) translate(-50%, -50%) scale(' + scale + ')';
            td.el.style.opacity = alpha;
            td.el.style.background = palette.accent;
        }
    }

    function resize() {
        var rect = stageArea.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    }

    function animate() {
        var now = performance.now();
        var dt = (now - lastTime) / 1000;
        frameCount++;

        if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
            statFps.textContent = fps;
        }

        time += dt * speedFactor * 2;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        updateOrbPositions();
        renderOrbs(time);
        renderParticles(time);
        updateCursorTrail();

        requestAnimationFrame(animate);
    }

    function hideHint() {
        if (!hasInteracted) {
            hasInteracted = true;
            stageHint.classList.add('hidden');
        }
    }

    modeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            modeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            statMode.textContent = currentMode;
            hideHint();
        });
    });

    shapeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            shapeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentShape = btn.dataset.shape;

            orbEls.forEach(function (el) {
                el.classList.add('morphing');
                setTimeout(function () { el.classList.remove('morphing'); }, 600);
            });

            var labels = {
                sphere: ['Sphere', 'Torus', 'Blob', 'Crystal'],
                star: ['Nova', 'Prism', 'Flare', 'Shard'],
                wave: ['Tide', 'Ripple', 'Swell', 'Eddy'],
                blob: ['Cell', 'Spore', 'Amoeba', 'Seed'],
                crystal: ['Facet', 'Gem', 'Shard', 'Ice']
            };
            var currentLabels = labels[currentShape] || labels.sphere;
            var labelEls = document.querySelectorAll('.orb-label');
            labelEls.forEach(function (l, idx) {
                l.textContent = currentLabels[idx] || '';
            });

            hideHint();
        });
    });

    paletteBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            paletteBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentPalette = btn.dataset.palette;

            document.documentElement.style.setProperty('--color-accent', palettes[currentPalette].accent);
        });
    });

    ctrlNoise.addEventListener('input', function (e) {
        noiseLevel = e.target.value / 100;
        valNoise.textContent = noiseLevel.toFixed(2);
    });

    ctrlSpeed.addEventListener('input', function (e) {
        speedFactor = e.target.value / 100;
        valSpeed.textContent = speedFactor.toFixed(2);
    });

    orbEls.forEach(function (el, idx) {
        el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            orbs[idx].isDragging = true;
            el.classList.add('dragging');
            hideHint();
        });

        el.addEventListener('touchstart', function (e) {
            e.preventDefault();
            orbs[idx].isDragging = true;
            el.classList.add('dragging');
            hideHint();
        }, { passive: false });
    });

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        var stageRect = stageArea.getBoundingClientRect();
        stageMouseX = (e.clientX - stageRect.left) / stageRect.width;
        stageMouseY = (e.clientY - stageRect.top) / stageRect.height;

        for (var i = 0; i < orbs.length; i++) {
            if (orbs[i].isDragging) {
                orbs[i].targetX = e.clientX - stageRect.left;
                orbs[i].targetY = e.clientY - stageRect.top;
            }
        }
    });

    document.addEventListener('touchmove', function (e) {
        if (orbs.some(function (o) { return o.isDragging; })) {
            e.preventDefault();
        }
        var touch = e.touches[0];
        mouseX = touch.clientX;
        mouseY = touch.clientY;

        var stageRect = stageArea.getBoundingClientRect();
        stageMouseX = (touch.clientX - stageRect.left) / stageRect.width;
        stageMouseY = (touch.clientY - stageRect.top) / stageRect.height;

        for (var i = 0; i < orbs.length; i++) {
            if (orbs[i].isDragging) {
                orbs[i].targetX = touch.clientX - stageRect.left;
                orbs[i].targetY = touch.clientY - stageRect.top;
            }
        }
    }, { passive: false });

    document.addEventListener('mouseup', function () {
        for (var i = 0; i < orbs.length; i++) {
            orbs[i].isDragging = false;
            orbEls[i].classList.remove('dragging');
        }
    });

    document.addEventListener('touchend', function () {
        for (var i = 0; i < orbs.length; i++) {
            orbs[i].isDragging = false;
            orbEls[i].classList.remove('dragging');
        }
    });

    btnReset.addEventListener('click', function () {
        noiseLevel = 0.3;
        speedFactor = 0.4;
        ctrlNoise.value = 30;
        ctrlSpeed.value = 40;
        valNoise.textContent = '0.30';
        valSpeed.textContent = '0.40';

        modeBtns.forEach(function (b) { b.classList.remove('active'); });
        modeBtns[0].classList.add('active');
        currentMode = 'sculpt';
        statMode.textContent = 'sculpt';

        shapeBtns.forEach(function (b) { b.classList.remove('active'); });
        shapeBtns[0].classList.add('active');
        currentShape = 'sphere';

        paletteBtns.forEach(function (b) { b.classList.remove('active'); });
        paletteBtns[0].classList.add('active');
        currentPalette = 'void';
        document.documentElement.style.setProperty('--color-accent', palettes.void.accent);

        hasInteracted = false;
        stageHint.classList.remove('hidden');

        var labelEls = document.querySelectorAll('.orb-label');
        labelEls.forEach(function (l, idx) {
            var defaults = ['Sphere', 'Torus', 'Blob', 'Crystal'];
            l.textContent = defaults[idx] || '';
        });

        for (var i = 0; i < orbs.length; i++) {
            orbs[i].vx = 0;
            orbs[i].vy = 0;
        }
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

    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement) {
            btnFullscreen.querySelector('span').textContent = '全屏';
        }
    });

    window.addEventListener('resize', resize);

    resize();
    init();
    statMode.textContent = currentMode;
    animate();
})();
