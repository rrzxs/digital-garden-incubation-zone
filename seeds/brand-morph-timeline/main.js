(function () {
    'use strict';

    // === Simplex Noise (Compact Implementation) ===

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var grad3 = [
        [1,1],[-1,1],[1,-1],[-1,-1],
        [1,0],[-1,0],[0,1],[0,-1]
    ];

    function SimplexNoise(seed) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        var s = seed || Math.random() * 65536;
        for (var i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        for (var i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            var j = s % (i + 1);
            var tmp = this.p[i];
            this.p[i] = this.p[j];
            this.p[j] = tmp;
        }
        for (var i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
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
            t0 *= t0;
            var gi0 = this.perm[ii + this.perm[jj]] % 8;
            n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            var gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
            n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            var gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
            n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
        }
        return 70 * (n0 + n1 + n2);
    };

    // === Brand Eras Data ===

    var BRAND_ERAS = [
        {
            tag: 'ERA 01',
            name: 'Prism',
            desc: '极简几何光棱 — 光谱折射的品牌叙事',
            colors: ['#c4b5fd', '#818cf8', '#6366f1', '#a78bfa'],
            weight: 300,
            tracking: -0.02
        },
        {
            tag: 'ERA 02',
            name: 'Forge',
            desc: '工业锻造字体 — 粗犷有力的品牌宣言',
            colors: ['#f97316', '#ef4444', '#f59e0b', '#dc2626'],
            weight: 900,
            tracking: 0.04
        },
        {
            tag: 'ERA 03',
            name: 'Liquid',
            desc: '流体有机形态 — 融化边界的品牌演进',
            colors: ['#06b6d4', '#3b82f6', '#0ea5e9', '#2563eb'],
            weight: 500,
            tracking: -0.01
        },
        {
            tag: 'ERA 04',
            name: 'Bloom',
            desc: '自然生长形态 — 生命力的品牌绽放',
            colors: ['#22c55e', '#84cc16', '#10b981', '#65a30d'],
            weight: 600,
            tracking: 0
        },
        {
            tag: 'ERA 05',
            name: 'Void',
            desc: '虚空极简主义 — 留白即力量的品牌哲学',
            colors: ['#e2e8f0', '#94a3b8', '#cbd5e1', '#64748b'],
            weight: 200,
            tracking: 0.1
        },
        {
            tag: 'ERA 06',
            name: 'Neon',
            desc: '赛博霓虹脉冲 — 数字未来的品牌觉醒',
            colors: ['#f0abfc', '#c084fc', '#e879f9', '#a855f7'],
            weight: 800,
            tracking: -0.04
        },
        {
            tag: 'ERA 07',
            name: 'Aether',
            desc: '以太融合态 — 所有品牌形变的终极归一',
            colors: ['#c4b5fd', '#f97316', '#06b6d4', '#22c55e'],
            weight: 400,
            tracking: -0.01
        }
    ];

    // === Theme Configs ===

    var THEMES = {
        aurora: {
            accent1: '#c4b5fd', accent2: '#818cf8', accent3: '#a78bfa',
            glow: 'rgba(196,181,253,0.15)',
            particles: ['#c4b5fd', '#818cf8', '#a78bfa', '#6366f1']
        },
        ember: {
            accent1: '#f97316', accent2: '#ef4444', accent3: '#fb923c',
            glow: 'rgba(249,115,22,0.15)',
            particles: ['#f97316', '#ef4444', '#f59e0b', '#dc2626']
        },
        ocean: {
            accent1: '#06b6d4', accent2: '#3b82f6', accent3: '#22d3ee',
            glow: 'rgba(6,182,212,0.15)',
            particles: ['#06b6d4', '#3b82f6', '#0ea5e9', '#2563eb']
        },
        flora: {
            accent1: '#22c55e', accent2: '#84cc16', accent3: '#4ade80',
            glow: 'rgba(34,197,94,0.15)',
            particles: ['#22c55e', '#84cc16', '#10b981', '#65a30d']
        }
    };

    // === DOM References ===

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var morphCanvas = document.getElementById('morph-canvas');
    var morphCtx = morphCanvas.getContext('2d');
    var morphContainer = document.getElementById('morph-container');
    var eraTag = document.getElementById('era-tag');
    var brandName = document.getElementById('brand-name');
    var brandDesc = document.getElementById('brand-desc');
    var timelineNodes = document.getElementById('timeline-nodes');
    var timelineLabels = document.getElementById('timeline-labels');
    var timelineFill = document.getElementById('timeline-fill');
    var timelineScrubber = document.getElementById('timeline-scrubber');
    var scrubberHead = document.getElementById('scrubber-head');
    var navPrev = document.getElementById('nav-prev');
    var navNext = document.getElementById('nav-next');
    var btnAutoplay = document.getElementById('btn-autoplay');
    var btnShuffle = document.getElementById('btn-shuffle');
    var btnReset = document.getElementById('btn-reset');
    var ctrlSpeed = document.getElementById('ctrl-speed');
    var ctrlDensity = document.getElementById('ctrl-density');
    var ctrlNoise = document.getElementById('ctrl-noise');
    var valSpeed = document.getElementById('val-speed');
    var valDensity = document.getElementById('val-density');
    var valNoise = document.getElementById('val-noise');
    var swatches = document.querySelectorAll('.swatch');
    var modeBtns = document.querySelectorAll('.mode-btn');

    // === State ===

    var noise = new SimplexNoise(Date.now());
    var currentEra = 0;
    var targetEra = 0;
    var morphProgress = 0;
    var morphSpeed = 0.5;
    var particleDensity = 0.6;
    var noiseStrength = 0.4;
    var currentTheme = 'aurora';
    var currentMode = 'prism';
    var autoplay = false;
    var autoplayTimer = null;
    var isDragging = false;
    var particles = [];
    var mouseX = 0;
    var mouseY = 0;
    var mouseActive = false;
    var time = 0;
    var W = 0;
    var H = 0;
    var mW = 0;
    var mH = 0;
    var rafId = null;

    // === Initialization ===

    function init() {
        resize();
        buildTimeline();
        setEra(0, true);
        createParticles();
        bindEvents();
        loop();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;

        var rect = morphContainer.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        mW = rect.width;
        mH = rect.height;
        morphCanvas.width = mW * dpr;
        morphCanvas.height = mH * dpr;
        morphCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // === Timeline ===

    function buildTimeline() {
        timelineNodes.innerHTML = '';
        timelineLabels.innerHTML = '';
        var total = BRAND_ERAS.length;
        for (var i = 0; i < total; i++) {
            var pct = (i / (total - 1)) * 100;
            var node = document.createElement('div');
            node.className = 'timeline-node';
            node.style.left = pct + '%';
            node.dataset.index = i;
            node.addEventListener('click', function () {
                setEra(parseInt(this.dataset.index));
            });
            timelineNodes.appendChild(node);

            var label = document.createElement('div');
            label.className = 'timeline-label';
            label.style.left = pct + '%';
            label.textContent = BRAND_ERAS[i].name;
            label.dataset.index = i;
            timelineLabels.appendChild(label);
        }
    }

    function updateTimeline(idx) {
        var nodes = timelineNodes.querySelectorAll('.timeline-node');
        var labels = timelineLabels.querySelectorAll('.timeline-label');
        var pct = (idx / (BRAND_ERAS.length - 1)) * 100;
        timelineFill.style.width = pct + '%';
        scrubberHead.style.left = pct + '%';

        nodes.forEach(function (n, i) {
            n.classList.remove('active', 'passed');
            if (i === idx) n.classList.add('active');
            else if (i < idx) n.classList.add('passed');
        });

        labels.forEach(function (l, i) {
            l.classList.toggle('active', i === idx);
        });
    }

    // === Era Transitions ===

    function setEra(idx, instant) {
        if (idx < 0) idx = 0;
        if (idx >= BRAND_ERAS.length) idx = BRAND_ERAS.length - 1;
        var era = BRAND_ERAS[idx];

        eraTag.textContent = era.tag;
        brandName.textContent = era.name;
        brandName.style.fontWeight = era.weight;
        brandName.style.letterSpacing = era.tracking + 'em';
        brandDesc.textContent = era.desc;

        if (!instant) {
            var label = document.querySelector('.morph-label-overlay');
            label.classList.remove('morph-transition-enter');
            void label.offsetWidth;
            label.classList.add('morph-transition-enter');
        }

        updateTimeline(idx);
        currentEra = idx;
        morphProgress = 0;
    }

    function nextEra() {
        setEra(currentEra < BRAND_ERAS.length - 1 ? currentEra + 1 : 0);
    }

    function prevEra() {
        setEra(currentEra > 0 ? currentEra - 1 : BRAND_ERAS.length - 1);
    }

    function shuffleEras() {
        var shuffled = BRAND_ERAS.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = tmp;
        }
        BRAND_ERAS.forEach(function (era, idx) {
            var s = shuffled[idx];
            era.tag = s.tag;
            era.name = s.name;
            era.desc = s.desc;
            era.colors = s.colors;
            era.weight = s.weight;
            era.tracking = s.tracking;
        });
        buildTimeline();
        setEra(currentEra, true);
    }

    // === Particles ===

    function createParticles() {
        var count = Math.floor(W * H * particleDensity * 0.00015);
        count = Math.max(40, Math.min(count, 300));
        particles = [];
        var theme = THEMES[currentTheme];
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0,
                vy: 0,
                size: Math.random() * 2.5 + 0.5,
                color: theme.particles[Math.floor(Math.random() * theme.particles.length)],
                alpha: Math.random() * 0.4 + 0.1,
                life: Math.random() * 100
            });
        }
    }

    function updateParticles() {
        var scale = 0.002;
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.life += 0.02;
            var n = noise.noise2D(p.x * scale + time * 0.3, p.y * scale + time * 0.2);
            var angle = n * Math.PI * 2 * noiseStrength;
            var speed = 0.6 * morphSpeed + 0.3;
            p.vx += Math.cos(angle) * speed * 0.05;
            p.vy += Math.sin(angle) * speed * 0.05;

            if (mouseActive) {
                var dx = mouseX - p.x;
                var dy = mouseY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    var force = (180 - dist) / 180 * 0.5;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            p.vx *= 0.94;
            p.vy *= 0.94;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -20) p.x = W + 20;
            if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            if (p.y > H + 20) p.y = -20;
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.life));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        }

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = dx * dx + dy * dy;
                if (dist < 6000) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = particles[i].color;
                    ctx.globalAlpha = (1 - dist / 6000) * 0.08;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    // === Morph Canvas (Shape Visualization) ===

    function drawMorph() {
        morphCtx.clearRect(0, 0, mW, mH);
        var cx = mW / 2;
        var cy = mH / 2;
        var baseRadius = Math.min(mW, mH) * 0.32;
        var era = BRAND_ERAS[currentEra];
        morphProgress = Math.min(1, morphProgress + 0.02 * morphSpeed);

        var theme = THEMES[currentTheme];

        if (currentMode === 'prism') {
            drawPrism(cx, cy, baseRadius, era, theme);
        } else if (currentMode === 'orb') {
            drawOrb(cx, cy, baseRadius, era, theme);
        } else if (currentMode === 'crystal') {
            drawCrystal(cx, cy, baseRadius, era, theme);
        } else if (currentMode === 'wave') {
            drawWave(cx, cy, baseRadius, era, theme);
        }
    }

    function drawPrism(cx, cy, r, era, theme) {
        var sides = 6;
        var segments = 180;
        morphCtx.beginPath();
        for (var i = 0; i <= segments; i++) {
            var angle = (i / segments) * Math.PI * 2;
            var noiseVal = noise.noise2D(
                Math.cos(angle) * 2 + time * 0.5,
                Math.sin(angle) * 2 + time * 0.3
            );
            var prismFactor = Math.pow(Math.abs(Math.cos(angle * sides / 2)), 0.6);
            var morphR = r * (0.5 + prismFactor * 0.5 + noiseVal * noiseStrength * 0.3);
            morphR *= 0.5 + morphProgress * 0.5;
            var x = cx + Math.cos(angle) * morphR;
            var y = cy + Math.sin(angle) * morphR;
            if (i === 0) morphCtx.moveTo(x, y);
            else morphCtx.lineTo(x, y);
        }
        morphCtx.closePath();
        var grad = morphCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, hexToRgba(theme.accent1, 0.3));
        grad.addColorStop(0.5, hexToRgba(theme.accent2, 0.15));
        grad.addColorStop(1, hexToRgba(theme.accent1, 0.02));
        morphCtx.fillStyle = grad;
        morphCtx.fill();
        morphCtx.strokeStyle = hexToRgba(theme.accent1, 0.4);
        morphCtx.lineWidth = 1.5;
        morphCtx.stroke();

        for (var ring = 0; ring < 3; ring++) {
            var ringR = r * (0.3 + ring * 0.2) * morphProgress;
            morphCtx.beginPath();
            morphCtx.arc(cx, cy, Math.max(1, ringR), 0, Math.PI * 2);
            morphCtx.strokeStyle = hexToRgba(theme.accent1, 0.08 + ring * 0.03);
            morphCtx.lineWidth = 1;
            morphCtx.stroke();
        }
    }

    function drawOrb(cx, cy, r, era, theme) {
        var points = 200;
        morphCtx.beginPath();
        for (var i = 0; i <= points; i++) {
            var angle = (i / points) * Math.PI * 2;
            var n1 = noise.noise2D(Math.cos(angle) * 3 + time * 0.4, Math.sin(angle) * 3 + time * 0.2);
            var n2 = noise.noise2D(Math.cos(angle * 2) * 2 - time * 0.3, Math.sin(angle * 2) * 2 + time * 0.1);
            var morphR = r * (0.7 + n1 * noiseStrength * 0.25 + n2 * noiseStrength * 0.15);
            morphR *= 0.4 + morphProgress * 0.6;
            var x = cx + Math.cos(angle) * morphR;
            var y = cy + Math.sin(angle) * morphR;
            if (i === 0) morphCtx.moveTo(x, y);
            else morphCtx.lineTo(x, y);
        }
        morphCtx.closePath();
        var grad = morphCtx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
        grad.addColorStop(0, hexToRgba(theme.accent1, 0.4));
        grad.addColorStop(0.6, hexToRgba(theme.accent2, 0.2));
        grad.addColorStop(1, hexToRgba(theme.accent3, 0.05));
        morphCtx.fillStyle = grad;
        morphCtx.fill();
        morphCtx.strokeStyle = hexToRgba(theme.accent1, 0.35);
        morphCtx.lineWidth = 1.5;
        morphCtx.stroke();

        var highlightGrad = morphCtx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 0, cx, cy, r * 0.6);
        highlightGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
        highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
        morphCtx.fillStyle = highlightGrad;
        morphCtx.fill();
    }

    function drawCrystal(cx, cy, r, era, theme) {
        var faces = 8;
        for (var f = faces - 1; f >= 0; f--) {
            var angle = (f / faces) * Math.PI * 2 + time * 0.15;
            var n = noise.noise2D(Math.cos(angle) * 2 + time * 0.3, f * 0.5);
            var faceR = r * (0.3 + n * noiseStrength * 0.3) * (0.5 + morphProgress * 0.5);
            var x = cx + Math.cos(angle) * faceR * 0.3;
            var y = cy + Math.sin(angle) * faceR * 0.3;

            morphCtx.beginPath();
            var pts = 5;
            for (var p = 0; p <= pts; p++) {
                var pa = angle + (p / pts) * Math.PI * 2;
                var pn = noise.noise2D(Math.cos(pa) + time * 0.2, Math.sin(pa) + f * 0.3);
                var pr = faceR * (0.6 + pn * noiseStrength * 0.4);
                var px = x + Math.cos(pa) * pr;
                var py = y + Math.sin(pa) * pr;
                if (p === 0) morphCtx.moveTo(px, py);
                else morphCtx.lineTo(px, py);
            }
            morphCtx.closePath();
            morphCtx.fillStyle = hexToRgba(theme.particles[f % theme.particles.length], 0.08 + f * 0.02);
            morphCtx.fill();
            morphCtx.strokeStyle = hexToRgba(theme.accent1, 0.15);
            morphCtx.lineWidth = 0.8;
            morphCtx.stroke();
        }

        for (var i = 0; i < 12; i++) {
            var a = (i / 12) * Math.PI * 2 + time * 0.2;
            var len = r * 0.6 * morphProgress;
            morphCtx.beginPath();
            morphCtx.moveTo(cx, cy);
            morphCtx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            morphCtx.strokeStyle = hexToRgba(theme.accent1, 0.06);
            morphCtx.lineWidth = 0.5;
            morphCtx.stroke();
        }
    }

    function drawWave(cx, cy, r, era, theme) {
        var layers = 5;
        for (var l = 0; l < layers; l++) {
            morphCtx.beginPath();
            var segments = 200;
            for (var i = 0; i <= segments; i++) {
                var x = (i / segments) * mW;
                var normalX = (x - cx) / r;
                var waveY = cy;
                for (var h = 1; h <= 3; h++) {
                    var freq = h * 1.5 + l * 0.5;
                    var amp = r * 0.15 * (1 - l * 0.15) * (0.5 + morphProgress * 0.5);
                    var phase = time * (0.5 + h * 0.3) + l * 1.2;
                    var n = noise.noise2D(normalX * freq + phase, l * 2 + time * 0.2);
                    waveY += Math.sin(normalX * freq * Math.PI + phase) * amp;
                    waveY += n * amp * noiseStrength * 0.5;
                }
                if (i === 0) morphCtx.moveTo(x, waveY);
                else morphCtx.lineTo(x, waveY);
            }
            morphCtx.strokeStyle = hexToRgba(theme.particles[l % theme.particles.length], 0.15 + l * 0.04);
            morphCtx.lineWidth = 2 - l * 0.2;
            morphCtx.stroke();
        }
    }

    // === Utility ===

    function hexToRgba(hex, alpha) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // === Animation Loop ===

    function loop() {
        time += 0.01 * morphSpeed;
        updateParticles();
        drawParticles();
        drawMorph();
        rafId = requestAnimationFrame(loop);
    }

    // === Theme ===

    function setTheme(theme) {
        currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        var t = THEMES[theme];

        document.documentElement.style.setProperty('--accent-1', t.accent1);
        document.documentElement.style.setProperty('--accent-2', t.accent2);
        document.documentElement.style.setProperty('--accent-3', t.accent3);
        document.documentElement.style.setProperty('--accent-glow', t.glow);

        swatches.forEach(function (s) {
            s.classList.toggle('active', s.dataset.theme === theme);
        });

        particles.forEach(function (p) {
            p.color = t.particles[Math.floor(Math.random() * t.particles.length)];
        });
    }

    // === Scrubber Drag ===

    function handleScrubberDrag(e) {
        var rect = timelineScrubber.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        var idx = Math.round(pct * (BRAND_ERAS.length - 1));
        setEra(idx);
    }

    // === Autoplay ===

    function toggleAutoplay() {
        autoplay = !autoplay;
        btnAutoplay.classList.toggle('active', autoplay);
        if (autoplay) {
            autoplayTimer = setInterval(nextEra, 3000 / morphSpeed);
        } else {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    // === Event Binding ===

    function bindEvents() {
        window.addEventListener('resize', function () {
            resize();
            createParticles();
        });

        window.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            mouseActive = true;
        });

        window.addEventListener('mouseleave', function () {
            mouseActive = false;
        });

        navPrev.addEventListener('click', prevEra);
        navNext.addEventListener('click', nextEra);

        btnAutoplay.addEventListener('click', toggleAutoplay);

        btnShuffle.addEventListener('click', shuffleEras);

        btnReset.addEventListener('click', function () {
            currentEra = 0;
            setEra(0, true);
            ctrlSpeed.value = 50;
            ctrlDensity.value = 60;
            ctrlNoise.value = 40;
            morphSpeed = 0.5;
            particleDensity = 0.6;
            noiseStrength = 0.4;
            valSpeed.textContent = '50';
            valDensity.textContent = '60';
            valNoise.textContent = '40';
            createParticles();
        });

        swatches.forEach(function (s) {
            s.addEventListener('click', function () {
                setTheme(this.dataset.theme);
            });
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentMode = this.dataset.mode;
                morphProgress = 0;
            });
        });

        ctrlSpeed.addEventListener('input', function () {
            morphSpeed = this.value / 100;
            valSpeed.textContent = this.value;
            if (autoplay) {
                clearInterval(autoplayTimer);
                autoplayTimer = setInterval(nextEra, 3000 / morphSpeed);
            }
        });

        ctrlDensity.addEventListener('input', function () {
            particleDensity = this.value / 100;
            valDensity.textContent = this.value;
            createParticles();
        });

        ctrlNoise.addEventListener('input', function () {
            noiseStrength = this.value / 100;
            valNoise.textContent = this.value;
        });

        timelineScrubber.addEventListener('mousedown', function (e) {
            isDragging = true;
            timelineScrubber.classList.add('dragging');
            handleScrubberDrag(e);
        });

        window.addEventListener('mousemove', function (e) {
            if (isDragging) handleScrubberDrag(e);
        });

        window.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                timelineScrubber.classList.remove('dragging');
            }
        });

        timelineScrubber.addEventListener('touchstart', function (e) {
            isDragging = true;
            timelineScrubber.classList.add('dragging');
            handleScrubberDrag(e);
        }, { passive: true });

        window.addEventListener('touchmove', function (e) {
            if (isDragging) handleScrubberDrag(e);
        }, { passive: true });

        window.addEventListener('touchend', function () {
            if (isDragging) {
                isDragging = false;
                timelineScrubber.classList.remove('dragging');
            }
        });

        window.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                nextEra();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                prevEra();
            } else if (e.key === ' ') {
                e.preventDefault();
                toggleAutoplay();
            }
        });
    }

    // === Boot ===

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
