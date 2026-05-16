(function () {
    'use strict';

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var wipeLayer = document.getElementById('wipe-layer');
    var wipeFill = document.getElementById('wipe-fill');
    var dragHandle = document.getElementById('drag-handle');
    var wipeStage = document.getElementById('wipe-stage');
    var flash = document.getElementById('transition-flash');
    var hudScene = document.getElementById('hud-scene');
    var fpsCounter = document.getElementById('fps-counter');
    var modeIndicator = document.getElementById('mode-indicator');
    var progressIndicator = document.getElementById('progress-indicator');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var btnPlay = document.getElementById('btn-play');
    var btnReset = document.getElementById('btn-reset');

    var themeSwitcher = document.getElementById('theme-switcher');
    var modeGrid = document.getElementById('mode-grid');
    var interactModes = document.getElementById('interact-modes');
    var navDots = document.getElementById('nav-dots');
    var sliderProgress = document.getElementById('slider-progress');
    var sliderDuration = document.getElementById('slider-duration');
    var sliderSides = document.getElementById('slider-sides');
    var sliderRotation = document.getElementById('slider-rotation');
    var selectEasing = document.getElementById('select-easing');
    var valProgress = document.getElementById('val-progress');
    var valDuration = document.getElementById('val-duration');
    var valSides = document.getElementById('val-sides');
    var valRotation = document.getElementById('val-rotation');

    var sceneLayers = document.querySelectorAll('.scene-layer.layer-bg');
    var dots = document.querySelectorAll('.dot');
    var modeBtns = modeGrid.querySelectorAll('.mode-btn');
    var interactBtns = interactModes.querySelectorAll('.interact-btn');

    var TOTAL_SCENES = sceneLayers.length;

    var modeNames = {
        circle: '圆形收缩',
        diamond: '菱形旋转',
        polygon: '多边形',
        star: '星形展开',
        wave: '波浪揭幕',
        spiral: '螺旋切割',
        bars: '百叶窗'
    };

    var sceneGradients = [
        'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
        'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #7c3aed 100%)',
        'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)'
    ];

    var palettes = {
        aurora: {
            particles: [
                { r: 6, g: 182, b: 212 },
                { r: 0, g: 212, b: 255 },
                { r: 16, g: 185, b: 129 }
            ],
            glow: 'rgba(6, 182, 212, 0.15)',
            flash: 'rgba(6, 182, 212, 0.1)',
            blobs: ['#0a2a3a', '#1a0a3e', '#0d2847', '#0a3530'],
            accent: '#06b6d4'
        },
        ember: {
            particles: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 }
            ],
            glow: 'rgba(249, 115, 22, 0.15)',
            flash: 'rgba(249, 115, 22, 0.1)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316'
        },
        ocean: {
            particles: [
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 },
                { r: 79, g: 70, b: 229 }
            ],
            glow: 'rgba(99, 102, 241, 0.15)',
            flash: 'rgba(99, 102, 241, 0.1)',
            blobs: ['#0a1a3e', '#0d1f47', '#103040', '#0a2540'],
            accent: '#6366f1'
        },
        void: {
            particles: [
                { r: 165, g: 180, b: 252 },
                { r: 196, g: 181, b: 253 },
                { r: 232, g: 121, b: 249 }
            ],
            glow: 'rgba(165, 180, 252, 0.15)',
            flash: 'rgba(165, 180, 252, 0.1)',
            blobs: ['#1a0a30', '#100a2a', '#201038', '#180a28'],
            accent: '#a5b4fc'
        }
    };

    var state = {
        currentScene: 0,
        targetScene: 0,
        wipeMode: 'circle',
        wipeProgress: 0,
        isAnimating: false,
        animStartTime: 0,
        animDuration: 1200,
        sides: 6,
        rotation: 0,
        easing: 'expo',
        interactMode: 'drag',
        mouse: { x: 0, y: 0, clientX: 0, clientY: 0 },
        particles: [],
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        palette: 'aurora',
        time: 0,
        fps: 60,
        frameCount: 0,
        fpsTime: 0,
        isDragging: false,
        autoInterval: null,
        hoverRAF: null
    };

    var BLOB_ELS = document.querySelectorAll('.blob');

    function init() {
        resizeCanvas();
        createParticles(80);
        bindEvents();
        setScene(0, false);
        updateClipPath(0);
        requestAnimationFrame(loop);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function createParticles(count) {
        state.particles = [];
        var w = window.innerWidth;
        var h = window.innerHeight;
        var colors = palettes[state.palette].particles;
        for (var i = 0; i < count; i++) {
            var c = colors[Math.floor(Math.random() * colors.length)];
            state.particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 2 + 0.8,
                alpha: Math.random() * 0.4 + 0.15,
                color: c,
                life: Math.random() * 1000
            });
        }
    }

    function bindEvents() {
        window.addEventListener('resize', function () {
            resizeCanvas();
        });

        document.addEventListener('mousemove', function (e) {
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
            if (!cursorGlow.classList.contains('visible')) {
                cursorGlow.classList.add('visible');
            }
        });

        document.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('visible');
        });

        themeSwitcher.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            themeSwitcher.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var theme = btn.getAttribute('data-theme');
            state.palette = theme;
            document.body.setAttribute('data-theme', theme);
            applyPalette();
        });

        modeGrid.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            modeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.wipeMode = btn.getAttribute('data-mode');
            modeIndicator.textContent = modeNames[state.wipeMode];
            updateClipPath(state.wipeProgress);
        });

        interactModes.addEventListener('click', function (e) {
            var btn = e.target.closest('.interact-btn');
            if (!btn) return;
            interactBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.interactMode = btn.getAttribute('data-interact');
            handleInteractChange();
        });

        navDots.addEventListener('click', function (e) {
            var btn = e.target.closest('.dot');
            if (!btn) return;
            var idx = parseInt(btn.getAttribute('data-index'), 10);
            if (idx !== state.currentScene && !state.isAnimating) {
                transitionTo(idx);
            }
        });

        btnPlay.addEventListener('click', function () {
            if (state.isAnimating) return;
            playWipe();
        });

        btnReset.addEventListener('click', function () {
            resetWipe();
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen().catch(function () {});
            }
        });

        sliderProgress.addEventListener('input', function () {
            var v = parseFloat(this.value) / 100;
            state.wipeProgress = v;
            valProgress.textContent = Math.round(v * 100) + '%';
            progressIndicator.textContent = Math.round(v * 100) + '%';
            updateClipPath(v);
        });

        sliderDuration.addEventListener('input', function () {
            state.animDuration = parseInt(this.value, 10);
            valDuration.textContent = (state.animDuration / 1000).toFixed(1) + 's';
        });

        sliderSides.addEventListener('input', function () {
            state.sides = parseInt(this.value, 10);
            valSides.textContent = state.sides;
            updateClipPath(state.wipeProgress);
        });

        sliderRotation.addEventListener('input', function () {
            state.rotation = parseInt(this.value, 10);
            valRotation.textContent = state.rotation + '\u00B0';
            updateClipPath(state.wipeProgress);
        });

        selectEasing.addEventListener('change', function () {
            state.easing = this.value;
        });

        var stageRect;
        dragHandle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            state.isDragging = true;
            dragHandle.classList.add('dragging');
            stageRect = wipeStage.getBoundingClientRect();
        });

        document.addEventListener('mousemove', function (e) {
            if (!state.isDragging || state.isAnimating) return;
            stageRect = wipeStage.getBoundingClientRect();
            var x = (e.clientX - stageRect.left) / stageRect.width;
            var p = Math.max(0, Math.min(1, x));
            state.wipeProgress = p;
            sliderProgress.value = Math.round(p * 100);
            valProgress.textContent = Math.round(p * 100) + '%';
            progressIndicator.textContent = Math.round(p * 100) + '%';
            updateClipPath(p);
        });

        document.addEventListener('mouseup', function () {
            if (state.isDragging) {
                state.isDragging = false;
                dragHandle.classList.remove('dragging');
            }
        });

        wipeStage.addEventListener('mousemove', function (e) {
            if (state.interactMode === 'hover' && !state.isAnimating) {
                var rect = wipeStage.getBoundingClientRect();
                var nx = (e.clientX - rect.left) / rect.width;
                var ny = (e.clientY - rect.top) / rect.height;
                var dist = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2));
                var maxDist = Math.sqrt(0.5);
                var p = Math.max(0, Math.min(1, 1 - dist / maxDist));
                state.wipeProgress = p;
                sliderProgress.value = Math.round(p * 100);
                valProgress.textContent = Math.round(p * 100) + '%';
                progressIndicator.textContent = Math.round(p * 100) + '%';
                updateClipPath(p);
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                if (!state.isAnimating) {
                    var next = (state.currentScene + 1) % TOTAL_SCENES;
                    transitionTo(next);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (!state.isAnimating) {
                    var prev = (state.currentScene - 1 + TOTAL_SCENES) % TOTAL_SCENES;
                    transitionTo(prev);
                }
            }
        });
    }

    function applyPalette() {
        var p = palettes[state.palette];
        BLOB_ELS.forEach(function (el, i) {
            el.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i] + ' 0%, transparent 70%)';
        });
        state.particles.forEach(function (particle, i) {
            particle.color = p.particles[i % p.particles.length];
        });
    }

    function handleInteractChange() {
        if (state.autoInterval) {
            clearInterval(state.autoInterval);
            state.autoInterval = null;
        }
        if (state.hoverRAF) {
            cancelAnimationFrame(state.hoverRAF);
            state.hoverRAF = null;
        }

        if (state.interactMode === 'auto') {
            state.autoInterval = setInterval(function () {
                if (!state.isAnimating) {
                    var next = (state.currentScene + 1) % TOTAL_SCENES;
                    transitionTo(next);
                }
            }, 4000);
        }
    }

    function setScene(index, animate) {
        sceneLayers.forEach(function (layer, i) {
            if (i === index) {
                layer.classList.add('active');
            } else {
                layer.classList.remove('active');
            }
        });
        dots.forEach(function (d, i) {
            if (i === index) {
                d.classList.add('active');
            } else {
                d.classList.remove('active');
            }
        });
        hudScene.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(TOTAL_SCENES).padStart(2, '0');
        wipeFill.style.background = sceneGradients[index];
    }

    function transitionTo(targetIndex) {
        if (targetIndex === state.currentScene && state.wipeProgress < 0.05) {
            state.wipeProgress = 0;
            setScene(targetIndex, true);
            updateClipPath(0);
            return;
        }

        state.targetScene = targetIndex;
        setScene(targetIndex, true);
        playWipe();
    }

    function playWipe() {
        if (state.isAnimating) return;

        state.isAnimating = true;
        state.animStartTime = performance.now();
        var startProgress = state.wipeProgress;
        var direction = startProgress < 0.5 ? 1 : -1;
        var endProgress = direction > 0 ? 1 : 0;

        triggerFlash();

        function animateWipe(now) {
            var elapsed = now - state.animStartTime;
            var t = Math.min(elapsed / state.animDuration, 1);
            var eased = applyEasing(t, state.easing);

            state.wipeProgress = startProgress + (endProgress - startProgress) * eased;
            updateClipPath(state.wipeProgress);

            sliderProgress.value = Math.round(state.wipeProgress * 100);
            valProgress.textContent = Math.round(state.wipeProgress * 100) + '%';
            progressIndicator.textContent = Math.round(state.wipeProgress * 100) + '%';

            if (t < 1) {
                requestAnimationFrame(animateWipe);
            } else {
                state.wipeProgress = endProgress;
                state.isAnimating = false;

                if (endProgress >= 1) {
                    state.currentScene = state.targetScene;
                    setTimeout(function () {
                        state.wipeProgress = 0;
                        updateClipPath(0);
                        sliderProgress.value = 0;
                        valProgress.textContent = '0%';
                        progressIndicator.textContent = '0%';
                    }, 300);
                }
            }
        }

        requestAnimationFrame(animateWipe);
    }

    function resetWipe() {
        state.wipeProgress = 0;
        state.isAnimating = false;
        updateClipPath(0);
        sliderProgress.value = 0;
        valProgress.textContent = '0%';
        progressIndicator.textContent = '0%';
    }

    function applyEasing(t, type) {
        switch (type) {
            case 'expo':
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            case 'elastic':
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
            case 'back':
                var s = 1.70158;
                return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
            case 'bounce':
                var n1 = 7.5625;
                var d1 = 2.75;
                var val;
                if (t < 1 / d1) {
                    val = n1 * t * t;
                } else if (t < 2 / d1) {
                    val = n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    val = n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    val = n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
                return 1 - (1 - val);
            case 'linear':
            default:
                return t;
        }
    }

    function triggerFlash() {
        flash.classList.add('active');
        setTimeout(function () {
            flash.classList.remove('active');
        }, 200);
    }

    function updateClipPath(progress) {
        var clipPath = generateClipPath(state.wipeMode, progress, state.sides, state.rotation);
        wipeFill.style.clipPath = clipPath;
        wipeFill.style.webkitClipPath = clipPath;

        if (progress <= 0) {
            wipeLayer.style.pointerEvents = 'none';
        } else {
            wipeLayer.style.pointerEvents = 'auto';
        }
    }

    function generateClipPath(mode, progress, sides, rotationDeg) {
        if (progress <= 0) {
            return 'circle(0% at 50% 50%)';
        }
        if (progress >= 1) {
            return 'none';
        }

        var rot = rotationDeg * Math.PI / 180;
        var cx = 50;
        var cy = 50;

        switch (mode) {
            case 'circle':
                return generateCircle(progress, cx, cy);

            case 'diamond':
                return generateDiamond(progress, cx, cy, rot);

            case 'polygon':
                return generatePolygon(progress, cx, cy, sides, rot);

            case 'star':
                return generateStar(progress, cx, cy, sides, rot);

            case 'wave':
                return generateWave(progress);

            case 'spiral':
                return generateSpiral(progress, cx, cy);

            case 'bars':
                return generateBars(progress);

            default:
                return 'circle(' + (progress * 100) + '% at 50% 50%)';
        }
    }

    function generateCircle(p, cx, cy) {
        var radius = p * 75;
        return 'circle(' + radius + '% at ' + cx + '% ' + cy + '%)';
    }

    function generateDiamond(p, cx, cy, rot) {
        var size = p * 75;
        var cos = Math.cos(rot);
        var sin = Math.sin(rot);

        var rawPts = [
            [0, -size],
            [size, 0],
            [0, size],
            [-size, 0]
        ];

        var pts = rawPts.map(function (pt) {
            var rx = pt[0] * cos - pt[1] * sin;
            var ry = pt[0] * sin + pt[1] * cos;
            return (cx + rx) + '% ' + (cy + ry) + '%';
        });

        return 'polygon(' + pts.join(', ') + ')';
    }

    function generatePolygon(p, cx, cy, sides, rot) {
        var radius = p * 75;
        var pts = [];
        for (var i = 0; i < sides; i++) {
            var angle = rot + (2 * Math.PI * i) / sides - Math.PI / 2;
            var x = cx + radius * Math.cos(angle);
            var y = cy + radius * Math.sin(angle);
            pts.push(x + '% ' + y + '%');
        }
        return 'polygon(' + pts.join(', ') + ')';
    }

    function generateStar(p, cx, cy, points, rot) {
        var outerR = p * 75;
        var innerR = outerR * 0.45;
        var pts = [];
        var total = points * 2;
        for (var i = 0; i < total; i++) {
            var angle = rot + (2 * Math.PI * i) / total - Math.PI / 2;
            var r = i % 2 === 0 ? outerR : innerR;
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            pts.push(x + '% ' + y + '%');
        }
        return 'polygon(' + pts.join(', ') + ')';
    }

    function generateWave(p) {
        var numWaves = 8;
        var amplitude = 5 + p * 8;
        var pts = [];

        pts.push('0% 100%');
        pts.push('0% ' + ((1 - p) * 100) + '%');

        for (var i = 0; i <= 20; i++) {
            var x = (i / 20) * 100;
            var waveOffset = Math.sin((i / 20) * Math.PI * numWaves + state.time * 2) * amplitude;
            var y = (1 - p) * 100 + waveOffset;
            y = Math.max(0, Math.min(100, y));
            pts.push(x + '% ' + y + '%');
        }

        pts.push('100% ' + ((1 - p) * 100) + '%');
        pts.push('100% 100%');

        return 'polygon(' + pts.join(', ') + ')';
    }

    function generateSpiral(p, cx, cy) {
        var pts = [];
        var steps = 36;
        var maxAngle = p * Math.PI * 6;
        var maxR = p * 75;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var angle = -Math.PI / 2 + t * maxAngle;
            var r = t * maxR;
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            pts.push(x + '% ' + y + '%');
        }

        var centerR = p * 5;
        pts.push(cx + centerR + '% ' + cy + '%');

        return 'polygon(' + pts.join(', ') + ')';
    }

    function generateBars(p) {
        var numBars = 8;
        var barWidth = 100 / numBars;
        var pts = [];

        for (var i = 0; i < numBars; i++) {
            var x1 = i * barWidth + 0.5;
            var x2 = (i + 1) * barWidth - 0.5;
            var revealH = p * 100;
            var stagger = Math.sin(i * 0.8 + state.time) * 0.1;
            revealH = Math.max(0, Math.min(100, (revealH + stagger * 10)));

            pts.push(x1 + '% ' + (100 - revealH) + '%');
            pts.push(x2 + '% ' + (100 - revealH) + '%');
            pts.push(x2 + '% 100%');
            pts.push(x1 + '% 100%');
        }

        return 'polygon(' + pts.join(', ') + ')';
    }

    function updateParticles() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var mx = state.mouse.clientX;
        var my = state.mouse.clientY;

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            p.life += 0.01;

            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 1) {
                var force = (200 - dist) / 200 * 0.15;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;

            p.alpha = 0.15 + Math.sin(p.life) * 0.1;

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
            ctx.fill();
        }

        var connectDist = 120;
        for (var i = 0; i < state.particles.length; i++) {
            for (var j = i + 1; j < state.particles.length; j++) {
                var a = state.particles[i];
                var b = state.particles[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectDist) {
                    var alpha = (1 - dist / connectDist) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = 'rgba(' + a.color.r + ',' + a.color.g + ',' + a.color.b + ',' + alpha + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function loop(now) {
        state.time = now * 0.001;

        state.frameCount++;
        if (now - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = now;
            fpsCounter.textContent = state.fps + ' FPS';
        }

        updateParticles();
        drawParticles();

        if (state.wipeMode === 'wave' || state.wipeMode === 'bars') {
            updateClipPath(state.wipeProgress);
        }

        requestAnimationFrame(loop);
    }

    init();
})();
