/* ============================================================
   Page Transition Studio — 页面过渡实验室
   交互逻辑: 6 种过渡模式引擎 + 流体粒子场 + 多模态导航
   ============================================================ */

(function () {
    'use strict';

    /* === DOM Elements === */
    var canvas = document.getElementById('flow-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stage = document.getElementById('stage');
    var glitchLayer = document.getElementById('glitch-layer');
    var modeList = document.getElementById('mode-list');
    var modeName = document.getElementById('mode-name');
    var themeToggle = document.getElementById('theme-toggle');
    var rail = document.getElementById('rail');
    var transitionVeil = document.getElementById('transition-veil');
    var easingChip = document.getElementById('easing-chip');
    var fpsCounter = document.getElementById('fps-counter');
    var pageIndicator = document.getElementById('page-indicator');
    var btnReplay = document.getElementById('btn-replay');
    var btnFullscreen = document.getElementById('btn-fullscreen');

    var pages = document.querySelectorAll('.page');
    var railDots = document.querySelectorAll('.rail-dot');
    var totalPages = pages.length;

    /* === Easing labels per mode (cinema-grade curves) === */
    var modeEasings = {
        liquid:   'cubic-bezier(.65,0,.35,1)',
        clip:     'cubic-bezier(.83,0,.17,1)',
        depth:    'cubic-bezier(.16,1,.3,1)',
        glitch:   'steps(8)',
        curtain:  'cubic-bezier(.85,0,.15,1)',
        orbital:  'cubic-bezier(.16,1,.3,1)'
    };

    /* === Transition duration per mode (ms) === */
    var modeDuration = {
        liquid:  900,
        clip:    850,
        depth:   1000,
        glitch:  650,
        curtain: 800,
        orbital: 950
    };

    /* === State === */
    var state = {
        currentPage: 0,
        isTransitioning: false,
        mode: 'liquid',
        palette: 'obsidian',
        mouse: { x: -9999, y: -9999, inStage: false },
        particles: [],
        dpr: window.devicePixelRatio || 1,
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        touchStartX: 0,
        touchStartY: 0,
        touchStartTime: 0,
        wheelAccum: 0,
        wheelTimeout: null,
        transitionTimeout: null
    };

    /* === Palettes (4 ambient color schemes) === */
    var palettes = {
        obsidian: {
            particles: [
                { r: 139, g: 124, b: 255 },
                { r: 180, g: 148, b: 255 },
                { r: 110, g: 100, b: 220 }
            ],
            glow: 'rgba(139, 124, 255, 0.07)',
            veil: 'rgba(139, 124, 255, 0.14)',
            blobs: ['#1a0e3a', '#0c1f44', '#2a0d40', '#082238'],
            accent: '#8b7cff'
        },
        halcyon: {
            particles: [
                { r: 77, g: 208, b: 255 },
                { r: 120, g: 230, b: 255 },
                { r: 50, g: 180, b: 230 }
            ],
            glow: 'rgba(77, 208, 255, 0.07)',
            veil: 'rgba(77, 208, 255, 0.14)',
            blobs: ['#082238', '#0a2a40', '#0c2040', '#082848'],
            accent: '#4dd0ff'
        },
        ember: {
            particles: [
                { r: 255, g: 138, b: 80 },
                { r: 255, g: 180, b: 90 },
                { r: 230, g: 100, b: 60 }
            ],
            glow: 'rgba(255, 138, 80, 0.07)',
            veil: 'rgba(255, 138, 80, 0.14)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#ff8a50'
        },
        verdant: {
            particles: [
                { r: 92, g: 225, b: 160 },
                { r: 140, g: 240, b: 180 },
                { r: 60, g: 200, b: 130 }
            ],
            glow: 'rgba(92, 225, 160, 0.07)',
            veil: 'rgba(92, 225, 160, 0.14)',
            blobs: ['#0a3020', '#0c2a18', '#103528', '#0a2818'],
            accent: '#5ce1a0'
        }
    };

    var PARTICLE_COUNT = 130;

    /* === Init === */
    function init() {
        resizeCanvas();
        initParticles();
        setMode('liquid', false);
        setPage(0, false);
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        requestAnimationFrame(animate);
    }

    /* === Canvas Sizing === */
    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    /* === Particle System === */
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

    /* === Transition Engine ===
       Drives the 6 modes via CSS class state machine.
       Each page cycles: hidden -> entering -> active -> leaving -> hidden */
    function setPage(index, animate) {
        if (index < 0) index = totalPages - 1;
        if (index >= totalPages) index = 0;
        if (index === state.currentPage && animate !== false) return;
        if (state.isTransitioning && animate !== false) return;

        var prevPage = state.currentPage;
        state.currentPage = index;
        var duration = modeDuration[state.mode];

        if (animate !== false) {
            state.isTransitioning = true;
            triggerVeil();
            triggerGlitchLayer();

            /* Outgoing page: active -> leaving */
            var prevEl = pages[prevPage];
            prevEl.classList.remove('entering');
            prevEl.classList.add('leaving');

            /* Incoming page: hidden -> entering -> active (on next frame) */
            var nextEl = pages[index];
            nextEl.classList.remove('hidden');
            nextEl.classList.add('entering');

            /* Force reflow then promote to active so transition fires */
            void nextEl.offsetWidth;
            nextEl.classList.remove('entering');
            nextEl.classList.add('active');

            /* Clear leaving state after transition completes */
            if (state.transitionTimeout) clearTimeout(state.transitionTimeout);
            state.transitionTimeout = setTimeout(function () {
                prevEl.classList.remove('active', 'leaving');
                prevEl.classList.add('hidden');
                state.isTransitioning = false;
            }, duration + 60);
        } else {
            /* Instant set (first load) */
            pages.forEach(function (p, i) {
                p.classList.remove('entering', 'leaving', 'active', 'hidden');
                if (i === index) {
                    p.classList.add('active');
                } else {
                    p.classList.add('hidden');
                }
            });
        }

        /* Update rail + indicator */
        railDots.forEach(function (d, i) {
            d.classList.toggle('active', i === index);
        });
        var num = index + 1;
        pageIndicator.textContent =
            (num < 10 ? '0' : '') + num + ' / ' +
            (totalPages < 10 ? '0' : '') + totalPages;

        /* Sync accent color to page data-accent */
        var pageAccent = pages[index].dataset.accent;
        if (pageAccent && animate === false) {
            applyPageAccent(pageAccent);
        }
    }

    function triggerVeil() {
        var pal = palettes[state.palette];
        transitionVeil.style.background =
            'radial-gradient(circle at 50% 50%, ' + pal.veil + ' 0%, transparent 70%)';
        transitionVeil.classList.remove('active');
        void transitionVeil.offsetWidth;
        transitionVeil.classList.add('active');
        setTimeout(function () {
            transitionVeil.classList.remove('active');
        }, 600);
    }

    function triggerGlitchLayer() {
        if (state.mode !== 'glitch') return;
        glitchLayer.classList.add('active');
        setTimeout(function () {
            glitchLayer.classList.remove('active');
        }, modeDuration.glitch + 100);
    }

    /* === Mode Switching === */
    function setMode(mode, replay) {
        state.mode = mode;
        document.body.setAttribute('data-mode', mode);

        var niceName = modeEasings[mode];
        easingChip.textContent = niceName;

        /* Update mode pills */
        var pills = modeList.querySelectorAll('.mode-pill');
        pills.forEach(function (pill) {
            pill.classList.toggle('active', pill.dataset.mode === mode);
        });

        /* Update rack name */
        var activePill = modeList.querySelector('.mode-pill[data-mode="' + mode + '"]');
        if (activePill) {
            modeName.textContent = activePill.dataset.name;
        }

        if (replay) {
            replayTransition();
        }
    }

    function replayTransition() {
        /* Re-trigger current page transition with current mode */
        var current = state.currentPage;
        var neighbor = current === totalPages - 1 ? current - 1 : current + 1;
        if (neighbor < 0) neighbor = 0;
        /* Swap: jump to neighbor then back to current to showcase the transition */
        state.currentPage = neighbor;
        pages.forEach(function (p, i) {
            p.classList.remove('entering', 'leaving');
            if (i === neighbor) {
                p.classList.remove('hidden');
                p.classList.add('active');
            } else {
                p.classList.add('hidden');
                p.classList.remove('active');
            }
        });
        railDots.forEach(function (d, i) {
            d.classList.toggle('active', i === neighbor);
        });
        /* Now transition back to original current */
        setTimeout(function () {
            setPage(current, true);
        }, 80);
    }

    /* === Palette Switching === */
    function applyPalette(name) {
        state.palette = name;
        var pal = palettes[name];

        cursorGlow.style.background =
            'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';

        document.documentElement.style.setProperty('--color-accent', pal.accent);

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background =
                'radial-gradient(ellipse at center, ' +
                pal.blobs[i % pal.blobs.length] + ' 0%, transparent 70%)';
        });

        /* Update theme button accent backgrounds via accent var */
        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.theme === name);
        });

        /* Recolor active page accent chip */
        applyPageAccent(pal.accent);
    }

    function applyPageAccent(color) {
        document.documentElement.style.setProperty('--color-accent', color);
    }

    /* === Event Binding === */
    function bindEvents() {
        /* Mouse move on stage */
        stage.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.inStage = true;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        stage.addEventListener('mouseleave', function () {
            state.mouse.inStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        /* Wheel — switch page */
        stage.addEventListener('wheel', function (e) {
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

        /* Touch — swipe to switch page */
        stage.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            state.touchStartX = t.clientX;
            state.touchStartY = t.clientY;
            state.touchStartTime = Date.now();
        }, { passive: true });

        stage.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var t = e.touches[0];
            state.mouse.x = t.clientX;
            state.mouse.y = t.clientY;
            state.mouse.inStage = true;
            cursorGlow.style.left = t.clientX + 'px';
            cursorGlow.style.top = t.clientY + 'px';
        }, { passive: false });

        stage.addEventListener('touchend', function (e) {
            var t = e.changedTouches[0];
            var dx = state.touchStartX - t.clientX;
            var dy = state.touchStartY - t.clientY;
            var dt = Date.now() - state.touchStartTime;
            if (state.isTransitioning) return;

            /* Prefer horizontal swipe, fallback to vertical */
            var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
            if (Math.abs(delta) > 50 && dt < 600) {
                var dir = delta > 0 ? 1 : -1;
                setPage(state.currentPage + dir, true);
            }
        }, { passive: true });

        /* Keyboard */
        document.addEventListener('keydown', function (e) {
            if (state.isTransitioning) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                setPage(state.currentPage + 1, true);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setPage(state.currentPage - 1, true);
            } else if (e.key >= '1' && e.key <= '5') {
                var idx = parseInt(e.key, 10) - 1;
                if (idx < totalPages && idx !== state.currentPage) {
                    setPage(idx, true);
                }
            }
        });

        /* Resize */
        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 200));
    }

    /* === Controls Binding === */
    function bindControls() {
        /* Rail dots */
        railDots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var idx = parseInt(this.dataset.index, 10);
                if (idx !== state.currentPage) setPage(idx, true);
            });
        });

        /* Page CTAs */
        var ctas = document.querySelectorAll('.page-cta');
        ctas.forEach(function (cta) {
            cta.addEventListener('click', function () {
                var action = this.dataset.cta;
                if (action === 'restart') {
                    setPage(0, true);
                } else {
                    setPage(state.currentPage + 1, true);
                }
            });
        });

        /* Mode pills */
        var pills = modeList.querySelectorAll('.mode-pill');
        pills.forEach(function (pill) {
            pill.addEventListener('click', function () {
                var mode = this.dataset.mode;
                if (mode !== state.mode) setMode(mode, true);
            });
        });

        /* Theme toggle */
        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                applyPalette(this.dataset.theme);
            });
        });

        /* Replay button */
        btnReplay.addEventListener('click', function () {
            replayTransition();
        });

        /* Fullscreen */
        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    /* === Animation Loop === */
    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        /* FPS */
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

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.01 * dt;

            /* Mouse attraction */
            if (state.mouse.inStage) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 260;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.22;
                    var angle = Math.atan2(dy, dx);
                    p.vx += Math.cos(angle) * force * dt;
                    p.vy += Math.sin(angle) * force * dt;
                }
            }

            /* Drag */
            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            /* Wrap */
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            /* Trail */
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.pop();
        });
    }

    function drawParticles() {
        var pal = palettes[state.palette];

        state.particles.forEach(function (p) {
            var color = pal.particles[p.colorIndex];

            /* Trail */
            for (var t = p.trail.length - 1; t >= 0; t--) {
                var trailAlpha = p.alpha * (1 - t / 5) * 0.35;
                var trailRadius = p.radius * (1 - t / 5 * 0.5);

                ctx.beginPath();
                ctx.arc(p.trail[t].x, p.trail[t].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            /* Core */
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            /* Glow halo for larger particles */
            if (p.radius > 1.2) {
                var haloRadius = Math.max(0.5, p.radius * 3.5);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius);
                grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (p.alpha * 0.15).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    function drawFlowLines() {
        if (!state.mouse.inStage) return;

        var pal = palettes[state.palette];
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var maxDist = 190;
        var lineCount = 0;

        state.particles.forEach(function (p) {
            if (lineCount > 14) return;
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
                lineCount++;
                var alpha = (1 - dist / maxDist) * 0.09;
                var color = pal.particles[p.colorIndex];

                ctx.beginPath();
                ctx.moveTo(p.x, p.y);

                var cp1x = p.x + (mx - p.x) * 0.3 + (Math.sin(p.phase) * 22);
                var cp1y = p.y + (my - p.y) * 0.3 + (Math.cos(p.phase) * 22);
                ctx.quadraticCurveTo(cp1x, cp1y, mx, my);

                ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        });
    }

    /* === Utilities === */
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

    /* === Boot === */
    init();
})();
