(function () {
    'use strict';

    var bgCanvas = document.getElementById('bg-canvas');
    var bgCtx = bgCanvas.getContext('2d');
    var wipeCanvas = document.getElementById('wipe-canvas');
    var wipeCtx = wipeCanvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var wipeViewport = document.getElementById('wipe-viewport');
    var transitionFlash = document.getElementById('transition-flash');
    var fpsCounter = document.getElementById('fps-counter');
    var viewportInfo = document.getElementById('viewport-info');
    var modeIndicator = document.getElementById('mode-indicator');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var themeToggle = document.getElementById('theme-toggle');
    var modeGrid = document.getElementById('mode-grid');
    var btnTrigger = document.getElementById('btn-trigger');
    var navDots = document.getElementById('nav-dots');
    var chkAutoplay = document.getElementById('chk-autoplay');
    var sliderDuration = document.getElementById('slider-duration');
    var sliderNoise = document.getElementById('slider-noise');
    var sliderFeather = document.getElementById('slider-feather');
    var valDuration = document.getElementById('val-duration');
    var valNoise = document.getElementById('val-noise');
    var valFeather = document.getElementById('val-feather');

    var sceneContents = document.querySelectorAll('.scene-content');
    var dots = document.querySelectorAll('.dot');
    var modeBtns = modeGrid.querySelectorAll('.mode-btn');
    var TOTAL_SCENES = sceneContents.length;

    var modeNames = {
        noise: '噪声溶解',
        ripple: '涟漪扩散',
        radial: '径向收缩',
        diagonal: '对角切割',
        grid: '网格裂变',
        spiral: '螺旋漩涡'
    };

    var sceneColors = [
        { from: { r: 99, g: 102, b: 241 }, to: { r: 14, g: 165, b: 233 } },
        { from: { r: 168, g: 85, b: 247 }, to: { r: 236, g: 72, b: 153 } },
        { from: { r: 16, g: 185, b: 129 }, to: { r: 6, g: 182, b: 212 } },
        { from: { r: 249, g: 115, b: 22 }, to: { r: 239, g: 68, b: 68 } }
    ];

    var state = {
        currentScene: 0,
        wipeMode: 'noise',
        isWiping: false,
        wipeProgress: 0,
        wipeDuration: 0.8,
        wipeStartTime: 0,
        noiseScale: 8,
        featherAmount: 0.08,
        mouse: { x: -9999, y: -9999, clientX: -9999, clientY: -9999 },
        mouseInViewport: false,
        particles: [],
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        palette: 'deep-ocean',
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        wipeWidth: 0,
        wipeHeight: 0,
        autoplayInterval: null,
        autoPlaying: true,
        time: 0,
        noiseOffset: Math.random() * 1000
    };

    var palettes = {
        'deep-ocean': {
            particles: [
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 },
                { r: 79, g: 70, b: 229 }
            ],
            glow: 'rgba(99, 102, 241, 0.06)',
            flash: 'rgba(99, 102, 241, 0.12)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            accent: '#6366f1'
        },
        aurora: {
            particles: [
                { r: 0, g: 212, b: 255 },
                { r: 168, g: 85, b: 247 },
                { r: 0, g: 255, b: 136 }
            ],
            glow: 'rgba(0, 212, 255, 0.06)',
            flash: 'rgba(0, 212, 255, 0.12)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530'],
            accent: '#06b6d4'
        },
        ember: {
            particles: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 }
            ],
            glow: 'rgba(249, 115, 22, 0.06)',
            flash: 'rgba(249, 115, 22, 0.12)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316'
        },
        void: {
            particles: [
                { r: 165, g: 180, b: 252 },
                { r: 196, g: 181, b: 253 },
                { r: 232, g: 121, b: 249 }
            ],
            glow: 'rgba(165, 180, 252, 0.06)',
            flash: 'rgba(165, 180, 252, 0.12)',
            blobs: ['#0d1530', '#101a3a', '#1a1030', '#0d1830'],
            accent: '#a5b4fc'
        }
    };

    var PARTICLE_COUNT = 100;

    var PERM = new Uint8Array(512);
    var GRAD3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    function initNoise() {
        var p = new Uint8Array(256);
        for (var i = 0; i < 256; i++) p[i] = i;
        for (var i = 255; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = p[i];
            p[i] = p[j];
            p[j] = tmp;
        }
        for (var i = 0; i < 512; i++) PERM[i] = p[i & 255];
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function dot3(g, x, y) { return g[0] * x + g[1] * y; }

    function noise2D(x, y) {
        var X = Math.floor(x) & 255;
        var Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        var u = fade(x);
        var v = fade(y);
        var a = PERM[X] + Y;
        var b = PERM[X + 1] + Y;
        var g00 = GRAD3[PERM[a] % 12];
        var g10 = GRAD3[PERM[b] % 12];
        var g01 = GRAD3[PERM[a + 1] % 12];
        var g11 = GRAD3[PERM[b + 1] % 12];
        var n00 = dot3(g00, x, y);
        var n10 = dot3(g10, x - 1, y);
        var n01 = dot3(g01, x, y - 1);
        var n11 = dot3(g11, x - 1, y - 1);
        var nx0 = lerp(n00, n10, u);
        var nx1 = lerp(n01, n11, u);
        return (lerp(nx0, nx1, v) + 1) * 0.5;
    }

    function fbm(x, y, octaves) {
        var value = 0;
        var amplitude = 0.5;
        var frequency = 1;
        for (var i = 0; i < octaves; i++) {
            value += amplitude * noise2D(x * frequency, y * frequency);
            amplitude *= 0.5;
            frequency *= 2;
        }
        return value;
    }

    function init() {
        initNoise();
        resizeCanvases();
        initParticles();
        setScene(0, false);
        bindEvents();
        bindControls();
        startAutoplay();
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        animate(state.lastTime);
    }

    function resizeCanvases() {
        bgCanvas.width = window.innerWidth * state.dpr;
        bgCanvas.height = window.innerHeight * state.dpr;
        bgCanvas.style.width = window.innerWidth + 'px';
        bgCanvas.style.height = window.innerHeight + 'px';
        bgCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        var rect = wipeViewport.getBoundingClientRect();
        state.wipeWidth = rect.width;
        state.wipeHeight = rect.height;
        wipeCanvas.width = Math.floor(state.wipeWidth * state.dpr);
        wipeCanvas.height = Math.floor(state.wipeHeight * state.dpr);
        wipeCanvas.style.width = state.wipeWidth + 'px';
        wipeCanvas.style.height = state.wipeHeight + 'px';
        wipeCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initParticles() {
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2.2 + 0.6,
            alpha: Math.random() * 0.4 + 0.15,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.25 + 0.08,
            colorIndex: Math.floor(Math.random() * 3),
            trail: []
        };
    }

    function setScene(index, animate) {
        if (index < 0) index = TOTAL_SCENES - 1;
        if (index >= TOTAL_SCENES) index = 0;

        var prev = state.currentScene;
        state.currentScene = index;

        sceneContents.forEach(function (s, i) {
            s.classList.toggle('active', i === index);
        });

        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === index);
        });

        var num = index + 1;
        viewportInfo.textContent = (num < 10 ? '0' : '') + num + ' / ' + (TOTAL_SCENES < 10 ? '0' : '') + TOTAL_SCENES;
    }

    function triggerWipe(targetScene) {
        if (state.isWiping) return;
        if (targetScene === undefined) {
            targetScene = (state.currentScene + 1) % TOTAL_SCENES;
        }

        state.isWiping = true;
        state.wipeProgress = 0;
        state.wipeStartTime = performance.now();
        state.wipeTarget = targetScene;
        state.noiseOffset = Math.random() * 1000;

        btnTrigger.classList.add('wiping');
        triggerFlash();
    }

    function triggerFlash() {
        var pal = palettes[state.palette];
        transitionFlash.style.background = 'radial-gradient(circle at 50% 50%, ' + pal.flash + ' 0%, transparent 70%)';
        transitionFlash.classList.remove('active');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('active');
        setTimeout(function () {
            transitionFlash.classList.remove('active');
        }, 600);
    }

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getWipeAlpha(nx, ny, progress, mode) {
        var feather = state.featherAmount;
        var edge = progress * (1 + feather * 2) - feather;
        var alpha = 0;

        switch (mode) {
            case 'noise': {
                var n = fbm(
                    nx * state.noiseScale + state.noiseOffset,
                    ny * state.noiseScale + state.noiseOffset,
                    3
                );
                var threshold = progress;
                alpha = smoothstep(threshold - feather, threshold + feather, n);
                break;
            }
            case 'ripple': {
                var cx = 0.5, cy = 0.5;
                var dist = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
                var maxR = Math.sqrt(2) * 0.5;
                var ring = dist / maxR;
                var n = fbm(nx * 6 + state.noiseOffset, ny * 6, 2) * 0.15;
                alpha = smoothstep(progress - feather - n, progress + feather - n, ring);
                break;
            }
            case 'radial': {
                var cx = 0.5, cy = 0.5;
                var dist = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
                var maxR = Math.sqrt(2) * 0.5;
                var ring = dist / maxR;
                var n = fbm(nx * 5 + state.noiseOffset, ny * 5, 2) * 0.08;
                alpha = smoothstep(1 - progress - feather + n, 1 - progress + feather + n, ring);
                break;
            }
            case 'diagonal': {
                var diag = (nx + ny) * 0.5;
                var n = fbm(nx * 7 + state.noiseOffset, ny * 7, 2) * 0.12;
                alpha = smoothstep(progress - feather - n, progress + feather - n, diag);
                break;
            }
            case 'grid': {
                var gridSize = 6;
                var cellX = Math.floor(nx * gridSize);
                var cellY = Math.floor(ny * gridSize);
                var cellIndex = cellX + cellY * gridSize;
                var cellProgress = cellIndex / (gridSize * gridSize);
                var n = fbm(nx * 4 + state.noiseOffset, ny * 4, 2) * 0.08;
                alpha = smoothstep(cellProgress - feather + n, cellProgress + feather + n, progress);
                break;
            }
            case 'spiral': {
                var cx = 0.5, cy = 0.5;
                var dx = nx - cx, dy = ny - cy;
                var angle = Math.atan2(dy, dx);
                var dist = Math.sqrt(dx * dx + dy * dy);
                var spiralVal = (angle / Math.PI + 1) * 0.5 + dist * 2;
                var n = fbm(nx * 5 + state.noiseOffset, ny * 5, 2) * 0.1;
                alpha = smoothstep(progress - feather - n, progress + feather - n, spiralVal / 3);
                break;
            }
        }

        return Math.max(0, Math.min(1, alpha));
    }

    function smoothstep(edge0, edge1, x) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    function renderWipe() {
        var w = state.wipeWidth;
        var h = state.wipeHeight;
        if (w <= 0 || h <= 0) return;

        var pal = palettes[state.palette];
        var fromScene = state.currentScene;
        var toScene = state.wipeTarget !== undefined ? state.wipeTarget : (fromScene + 1) % TOTAL_SCENES;
        var fromColor = sceneColors[fromScene % sceneColors.length];
        var toColor = sceneColors[toScene % sceneColors.length];
        var progress = easeOutExpo(state.wipeProgress);

        var renderScale = 3;
        var sw = Math.ceil(w / renderScale);
        var sh = Math.ceil(h / renderScale);

        var offCanvas = document.createElement('canvas');
        offCanvas.width = sw;
        offCanvas.height = sh;
        var offCtx = offCanvas.getContext('2d');
        var imageData = offCtx.createImageData(sw, sh);
        var data = imageData.data;

        for (var py = 0; py < sh; py++) {
            for (var px = 0; px < sw; px++) {
                var nx = px / sw;
                var ny = py / sh;
                var alpha = getWipeAlpha(nx, ny, progress, state.wipeMode);

                var idx = (py * sw + px) * 4;
                data[idx] = Math.round(lerp(fromColor.from.r, toColor.from.r, alpha));
                data[idx + 1] = Math.round(lerp(fromColor.from.g, toColor.from.g, alpha));
                data[idx + 2] = Math.round(lerp(fromColor.from.b, toColor.from.b, alpha));
                data[idx + 3] = 255;
            }
        }

        offCtx.putImageData(imageData, 0, 0);

        wipeCtx.clearRect(0, 0, w, h);
        wipeCtx.imageSmoothingEnabled = true;
        wipeCtx.imageSmoothingQuality = 'high';
        wipeCtx.drawImage(offCanvas, 0, 0, w, h);

        drawWipeEdgeGlow(wipeCtx, w, h, progress);
    }

    function drawWipeEdgeGlow(ctx, w, h, progress) {
        var pal = palettes[state.palette];
        var accent = pal.particles[0];
        var glowSize = 40;

        switch (state.wipeMode) {
            case 'diagonal': {
                var x1 = progress * w;
                var y1 = 0;
                var x2 = 0;
                var y2 = progress * h;
                var grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0)');
                grad.addColorStop(0.4, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.15)');
                grad.addColorStop(0.5, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.25)');
                grad.addColorStop(0.6, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.15)');
                grad.addColorStop(1, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0)');
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                break;
            }
            case 'radial':
            case 'ripple': {
                var cx = w / 2, cy = h / 2;
                var maxR = Math.sqrt(w * w + h * h) * 0.5;
                var r = progress * maxR;
                var inner = Math.max(0, r - glowSize);
                var outer = r + glowSize;
                var grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
                grad.addColorStop(0, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0)');
                grad.addColorStop(0.4, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.12)');
                grad.addColorStop(0.5, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.2)');
                grad.addColorStop(0.6, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0.12)');
                grad.addColorStop(1, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0)');
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                break;
            }
        }
    }

    function renderIdleScene() {
        var w = state.wipeWidth;
        var h = state.wipeHeight;
        if (w <= 0 || h <= 0) return;

        var sceneIdx = state.currentScene;
        var colors = sceneColors[sceneIdx % sceneColors.length];
        var pal = palettes[state.palette];

        wipeCtx.clearRect(0, 0, w, h);

        var grad = wipeCtx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'rgb(' + colors.from.r + ',' + colors.from.g + ',' + colors.from.b + ')');
        grad.addColorStop(1, 'rgb(' + colors.to.r + ',' + colors.to.g + ',' + colors.to.b + ')');
        wipeCtx.fillStyle = grad;
        wipeCtx.fillRect(0, 0, w, h);

        drawAmbientNoise(wipeCtx, w, h);
    }

    function drawAmbientNoise(ctx, w, h) {
        var pal = palettes[state.palette];
        var accent = pal.particles[0];
        var t = state.time * 0.0003;
        var count = 5;

        for (var i = 0; i < count; i++) {
            var x = (noise2D(i * 3.7 + t, t * 0.5) * 0.8 + 0.1) * w;
            var y = (noise2D(i * 5.3 + t * 0.7, t * 0.3) * 0.8 + 0.1) * h;
            var r = 60 + noise2D(i * 2.1, t) * 80;
            var alpha = 0.03 + noise2D(i * 4.2, t * 0.8) * 0.04;

            var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',' + alpha.toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
    }

    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            var rect = wipeViewport.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                state.mouse.x = e.clientX - rect.left;
                state.mouse.y = e.clientY - rect.top;
                state.mouseInViewport = true;
            } else {
                state.mouseInViewport = false;
            }
        });

        document.addEventListener('mouseleave', function () {
            state.mouseInViewport = false;
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                triggerWipe((state.currentScene + 1) % TOTAL_SCENES);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                triggerWipe((state.currentScene - 1 + TOTAL_SCENES) % TOTAL_SCENES);
            } else if (e.key === ' ') {
                e.preventDefault();
                triggerWipe();
            }
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvases();
        }, 200));
    }

    function bindControls() {
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.wipeMode = btn.dataset.mode;
                modeIndicator.textContent = modeNames[state.wipeMode];
            });
        });

        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var idx = parseInt(this.dataset.index, 10);
                if (idx !== state.currentScene) {
                    triggerWipe(idx);
                }
            });
        });

        btnTrigger.addEventListener('click', function () {
            triggerWipe();
        });

        sliderDuration.addEventListener('input', function () {
            state.wipeDuration = parseFloat(this.value);
            valDuration.textContent = state.wipeDuration.toFixed(1) + 's';
        });

        sliderNoise.addEventListener('input', function () {
            state.noiseScale = parseInt(this.value, 10);
            valNoise.textContent = state.noiseScale;
        });

        sliderFeather.addEventListener('input', function () {
            state.featherAmount = parseFloat(this.value);
            valFeather.textContent = state.featherAmount.toFixed(2);
        });

        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.theme;
                applyPalette();
            });
        });

        chkAutoplay.addEventListener('change', function () {
            state.autoPlaying = this.checked;
            if (state.autoPlaying) {
                startAutoplay();
            } else {
                stopAutoplay();
            }
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    function startAutoplay() {
        stopAutoplay();
        state.autoplayInterval = setInterval(function () {
            if (!state.isWiping && state.autoPlaying) {
                triggerWipe();
            }
        }, 4500);
    }

    function stopAutoplay() {
        if (state.autoplayInterval) {
            clearInterval(state.autoplayInterval);
            state.autoplayInterval = null;
        }
    }

    function applyPalette() {
        var pal = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';
        document.documentElement.style.setProperty('--color-accent', pal.accent);

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + pal.blobs[i % pal.blobs.length] + ' 0%, transparent 70%)';
        });
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;
        state.time = time;

        state.frameCount++;
        if (time - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = time;
            fpsCounter.textContent = state.fps + ' FPS';
        }

        bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        updateParticles(dt);
        drawParticles();
        drawFlowLines();

        if (state.isWiping) {
            var elapsed = (time - state.wipeStartTime) / 1000;
            state.wipeProgress = Math.min(1, elapsed / state.wipeDuration);

            if (state.wipeProgress >= 0.5 && state.wipeTarget !== undefined) {
                setScene(state.wipeTarget, false);
                state.wipeTarget = undefined;
            }

            renderWipe();

            if (state.wipeProgress >= 1) {
                state.isWiping = false;
                state.wipeProgress = 0;
                btnTrigger.classList.remove('wiping');
                renderIdleScene();
            }
        } else {
            renderIdleScene();
        }

        requestAnimationFrame(animate);
    }

    function updateParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.01 * dt;

            if (state.mouseInViewport) {
                var dx = state.mouse.clientX - p.x;
                var dy = state.mouse.clientY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 250;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.2;
                    var angle = Math.atan2(dy, dx);
                    p.vx += Math.cos(angle) * force * dt;
                    p.vy += Math.sin(angle) * force * dt;
                }
            }

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.pop();
        });
    }

    function drawParticles() {
        var pal = palettes[state.palette];

        state.particles.forEach(function (p) {
            var color = pal.particles[p.colorIndex];

            for (var t = p.trail.length - 1; t >= 0; t--) {
                var trailAlpha = p.alpha * (1 - t / 5) * 0.35;
                var trailRadius = p.radius * (1 - t / 5 * 0.5);

                bgCtx.beginPath();
                bgCtx.arc(p.trail[t].x, p.trail[t].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                bgCtx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                bgCtx.fill();
            }

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            bgCtx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            bgCtx.fill();

            if (p.radius > 1.2) {
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
                var grad = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
                grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
                bgCtx.fillStyle = grad;
                bgCtx.fill();
            }
        });
    }

    function drawFlowLines() {
        if (!state.mouseInViewport) return;

        var pal = palettes[state.palette];
        var mx = state.mouse.clientX;
        var my = state.mouse.clientY;
        var maxDist = 180;
        var lineCount = 0;

        state.particles.forEach(function (p) {
            if (lineCount > 12) return;
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
                lineCount++;
                var alpha = (1 - dist / maxDist) * 0.08;
                var color = pal.particles[p.colorIndex];

                bgCtx.beginPath();
                bgCtx.moveTo(p.x, p.y);
                var cp1x = p.x + (mx - p.x) * 0.3 + (Math.sin(p.phase) * 20);
                var cp1y = p.y + (my - p.y) * 0.3 + (Math.cos(p.phase) * 20);
                bgCtx.quadraticCurveTo(cp1x, cp1y, mx, my);
                bgCtx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')';
                bgCtx.lineWidth = 0.6;
                bgCtx.stroke();
            }
        });
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
