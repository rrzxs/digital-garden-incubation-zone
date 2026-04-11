(function () {
    'use strict';

    var canvas = document.getElementById('flow-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var pageSlider = document.getElementById('page-slider');
    var flowViewport = document.getElementById('flow-viewport');
    var flowDots = document.getElementById('flow-dots');
    var transitionFlash = document.getElementById('transition-flash');
    var fpsCounter = document.getElementById('fps-counter');
    var pageIndicator = document.getElementById('page-indicator');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var themeToggle = document.getElementById('theme-toggle');

    var pages = document.querySelectorAll('.flow-page');
    var dots = document.querySelectorAll('.dot');
    var totalPages = pages.length;

    var state = {
        currentPage: 0,
        isTransitioning: false,
        mouse: { x: -9999, y: -9999, clientX: -9999, clientY: -9999 },
        mouseInViewport: false,
        particles: [],
        dpr: window.devicePixelRatio || 1,
        palette: 'deep-ocean',
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        touchStartY: 0,
        touchStartTime: 0,
        wheelAccum: 0,
        wheelTimeout: null,
        viewportWidth: 0,
        viewportHeight: 0
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

    var PARTICLE_COUNT = 120;

    function init() {
        resizeCanvas();
        initParticles();
        setPage(0, false);
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        animate(state.lastTime);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        var vpRect = flowViewport.getBoundingClientRect();
        state.viewportWidth = vpRect.width;
        state.viewportHeight = vpRect.height;
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

    function setPage(index, animate) {
        if (index < 0) index = totalPages - 1;
        if (index >= totalPages) index = 0;
        if (index === state.currentPage && animate !== false) return;

        var prevPage = state.currentPage;
        state.currentPage = index;

        if (animate !== false) {
            triggerFlash(prevPage);
        }

        pages.forEach(function (p, i) {
            p.classList.toggle('active', i === index);
        });

        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === index);
        });

        pageSlider.classList.add('smooth-snap');
        pageSlider.classList.remove('no-snap');
        pageSlider.style.transform = 'translateX(-' + (index * 100) + '%)';

        var num = index + 1;
        pageIndicator.textContent = (num < 10 ? '0' : '') + num + ' / ' + (totalPages < 10 ? '0' : '') + totalPages;

        state.isTransitioning = true;
        setTimeout(function () {
            state.isTransitioning = false;
        }, 900);
    }

    function triggerFlash(fromPage) {
        var pal = palettes[state.palette];
        transitionFlash.style.background = 'radial-gradient(circle at 50% 50%, ' + pal.flash + ' 0%, transparent 70%)';
        transitionFlash.classList.remove('active');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('active');
        setTimeout(function () {
            transitionFlash.classList.remove('active');
        }, 600);
    }

    function bindEvents() {
        flowViewport.addEventListener('mousemove', function (e) {
            var rect = flowViewport.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;
            state.mouseInViewport = true;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        flowViewport.addEventListener('mouseleave', function () {
            state.mouseInViewport = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        flowViewport.addEventListener('wheel', function (e) {
            e.preventDefault();
            if (state.isTransitioning) return;

            state.wheelAccum += e.deltaY;

            if (state.wheelTimeout) clearTimeout(state.wheelTimeout);
            state.wheelTimeout = setTimeout(function () {
                state.wheelAccum = 0;
            }, 200);

            if (Math.abs(state.wheelAccum) > 60) {
                var dir = state.wheelAccum > 0 ? 1 : -1;
                state.wheelAccum = 0;
                setPage(state.currentPage + dir, true);
            }
        }, { passive: false });

        flowViewport.addEventListener('touchstart', function (e) {
            state.touchStartY = e.touches[0].clientY;
            state.touchStartTime = Date.now();
        }, { passive: true });

        flowViewport.addEventListener('touchend', function (e) {
            var touch = e.changedTouches[0];
            var dy = state.touchStartY - touch.clientY;
            var dt = Date.now() - state.touchStartTime;

            if (state.isTransitioning) return;

            if (Math.abs(dy) > 50 && dt < 500) {
                var dir = dy > 0 ? 1 : -1;
                setPage(state.currentPage + dir, true);
            }
        }, { passive: true });

        flowViewport.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = flowViewport.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouse.clientX = touch.clientX;
            state.mouse.clientY = touch.clientY;
            state.mouseInViewport = true;

            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
        }, { passive: false });

        document.addEventListener('keydown', function (e) {
            if (state.isTransitioning) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                setPage(state.currentPage + 1, true);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                setPage(state.currentPage - 1, true);
            }
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 200));
    }

    function bindControls() {
        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var idx = parseInt(this.dataset.index, 10);
                if (idx !== state.currentPage) {
                    setPage(idx, true);
                }
            });
        });

        for (var i = 0; i < totalPages; i++) {
            (function (idx) {
                var cta = document.getElementById('cta-' + idx);
                if (cta) {
                    cta.addEventListener('click', function () {
                        setPage(idx + 1, true);
                    });
                }
            })(i);
        }

        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.theme;
                applyPalette();
            });
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
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

        state.frameCount++;
        if (time - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = time;
            fpsCounter.textContent = state.fps + ' FPS';
        }

        ctx.clearRect(0, 0, canvas.width / state.dpr, canvas.height / state.dpr);

        updateParticles(dt);
        drawParticles();
        drawFlowLines();

        requestAnimationFrame(animate);
    }

    function updateParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var pal = palettes[state.palette];

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

                ctx.beginPath();
                ctx.arc(p.trail[t].x, p.trail[t].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
                grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
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

                ctx.beginPath();
                ctx.moveTo(p.x, p.y);

                var cp1x = p.x + (mx - p.x) * 0.3 + (Math.sin(p.phase) * 20);
                var cp1y = p.y + (my - p.y) * 0.3 + (Math.cos(p.phase) * 20);
                ctx.quadraticCurveTo(cp1x, cp1y, mx, my);

                ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.6;
                ctx.stroke();
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
