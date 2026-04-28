(function () {
    'use strict';

    var canvas = document.getElementById('ink-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var inkStage = document.getElementById('ink-stage');
    var stageHint = document.getElementById('stage-hint');
    var fpsCounter = document.getElementById('fps-counter');
    var rippleCountEl = document.getElementById('ripple-count');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var themeToggle = document.getElementById('theme-toggle');

    var state = {
        mouse: { x: -9999, y: -9999, clientX: -9999, clientY: -9999 },
        mouseInViewport: false,
        dpr: window.devicePixelRatio || 1,
        palette: 'ink-dark',
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        particles: [],
        canvasRipples: [],
        activeMenu: null,
        totalRipples: 0,
        menuIdCounter: 0
    };

    var PARTICLE_COUNT = 80;

    var palettes = {
        'ink-dark': {
            particles: [
                { r: 139, g: 92, b: 246 },
                { r: 167, g: 139, b: 250 },
                { r: 109, g: 40, b: 217 }
            ],
            glow: 'rgba(139, 92, 246, 0.06)',
            ink1: 'rgba(139, 92, 246, 0.85)',
            ink2: 'rgba(139, 92, 246, 0.12)',
            ripple: 'rgba(139, 92, 246, 0.35)',
            blobs: ['#0f0a28', '#0a1628', '#1a0a20', '#080f25'],
            accent: '#8b5cf6'
        },
        'ink-moon': {
            particles: [
                { r: 165, g: 215, b: 232 },
                { r: 127, g: 219, b: 218 },
                { r: 200, g: 200, b: 230 }
            ],
            glow: 'rgba(165, 215, 232, 0.06)',
            ink1: 'rgba(165, 215, 232, 0.85)',
            ink2: 'rgba(165, 215, 232, 0.12)',
            ripple: 'rgba(165, 215, 232, 0.35)',
            blobs: ['#0a1520', '#0d1a28', '#101520', '#0a1820'],
            accent: '#a5d7e8'
        },
        'ink-crimson': {
            particles: [
                { r: 220, g: 76, b: 76 },
                { r: 239, g: 68, b: 68 },
                { r: 252, g: 140, b: 100 }
            ],
            glow: 'rgba(220, 76, 76, 0.06)',
            ink1: 'rgba(220, 76, 76, 0.85)',
            ink2: 'rgba(220, 76, 76, 0.12)',
            ripple: 'rgba(220, 76, 76, 0.35)',
            blobs: ['#280a0a', '#2d0d0a', '#301010', '#250a0d'],
            accent: '#dc4c4c'
        },
        'ink-void': {
            particles: [
                { r: 196, g: 181, b: 253 },
                { r: 165, g: 180, b: 252 },
                { r: 232, g: 121, b: 249 }
            ],
            glow: 'rgba(196, 181, 253, 0.06)',
            ink1: 'rgba(196, 181, 253, 0.85)',
            ink2: 'rgba(196, 181, 253, 0.12)',
            ripple: 'rgba(196, 181, 253, 0.35)',
            blobs: ['#0d1530', '#101a3a', '#1a1030', '#0d1830'],
            accent: '#c4b5fd'
        }
    };

    var menuItems = [
        { icon: '✦', label: '探索' },
        { icon: '◈', label: '创建' },
        { icon: '❋', label: '连接' },
        { icon: '◎', label: '分析' },
        { icon: '△', label: '设置' },
        { icon: '◇', label: '灵感' }
    ];

    function init() {
        resizeCanvas();
        initParticles();
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
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.35 + 0.1,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.2 + 0.06,
            colorIndex: Math.floor(Math.random() * 3),
            trail: []
        };
    }

    function bindEvents() {
        inkStage.addEventListener('mousemove', function (e) {
            var rect = inkStage.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;
            state.mouseInViewport = true;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        inkStage.addEventListener('mouseleave', function () {
            state.mouseInViewport = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        inkStage.addEventListener('click', function (e) {
            var rect = inkStage.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            var clickedItem = e.target.closest('.ink-item');
            if (clickedItem) {
                handleItemClick(clickedItem);
                return;
            }

            if (state.activeMenu) {
                closeMenu();
                return;
            }

            openMenu(x, y);
        });

        inkStage.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                var touch = e.touches[0];
                var rect = inkStage.getBoundingClientRect();
                var x = touch.clientX - rect.left;
                var y = touch.clientY - rect.top;

                if (state.activeMenu) {
                    closeMenu();
                } else {
                    openMenu(x, y);
                }
            }
        }, { passive: true });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && state.activeMenu) {
                closeMenu();
            }
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 200));
    }

    function bindControls() {
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
        document.documentElement.style.setProperty('--ink-color-1', pal.ink1);
        document.documentElement.style.setProperty('--ink-color-2', pal.ink2);
        document.documentElement.style.setProperty('--ink-ripple', pal.ripple);

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + pal.blobs[i % pal.blobs.length] + ' 0%, transparent 70%)';
        });
    }

    function openMenu(cx, cy) {
        stageHint.classList.add('hidden');

        state.menuIdCounter++;
        var menuId = 'menu-' + state.menuIdCounter;

        var menuEl = document.createElement('div');
        menuEl.className = 'ink-menu';
        menuEl.id = menuId;
        menuEl.style.left = cx + 'px';
        menuEl.style.top = cy + 'px';

        var centerEl = document.createElement('div');
        centerEl.className = 'ink-menu-center';
        menuEl.appendChild(centerEl);

        addCanvasRipple(cx, cy);

        var rippleRingCount = 4;
        for (var r = 0; r < rippleRingCount; r++) {
            var ring = document.createElement('div');
            ring.className = 'ink-ripple-ring';
            var ringSize = 200 + r * 120;
            ring.style.width = ringSize + 'px';
            ring.style.height = ringSize + 'px';
            ring.style.left = '0px';
            ring.style.top = '0px';
            ring.style.setProperty('--ripple-delay', (r * 0.12) + 's');
            ring.style.setProperty('--ripple-duration', (1.2 + r * 0.3) + 's');
            menuEl.appendChild(ring);
        }

        var blotCount = 5;
        for (var b = 0; b < blotCount; b++) {
            var blot = document.createElement('div');
            blot.className = 'ink-blot';
            var blotSize = 100 + Math.random() * 160;
            blot.style.width = blotSize + 'px';
            blot.style.height = blotSize + 'px';
            blot.style.left = (Math.random() * 60 - 30) + 'px';
            blot.style.top = (Math.random() * 60 - 30) + 'px';
            blot.style.setProperty('--blot-delay', (0.05 + Math.random() * 0.15) + 's');
            blot.style.setProperty('--blot-duration', (0.8 + Math.random() * 0.6) + 's');
            blot.style.setProperty('--blot-rotate', (Math.random() * 60 - 30) + 'deg');
            blot.style.borderRadius = (40 + Math.random() * 15) + '% ' + (45 + Math.random() * 10) + '% ' + (50 + Math.random() * 10) + '% ' + (45 + Math.random() * 10) + '% / ' + (48 + Math.random() * 10) + '% ' + (42 + Math.random() * 10) + '% ' + (52 + Math.random() * 10) + '% ' + (45 + Math.random() * 10) + '%';
            menuEl.appendChild(blot);
        }

        var stageRect = inkStage.getBoundingClientRect();
        var centerX = cx;
        var centerY = cy;
        var radius = Math.min(stageRect.width, stageRect.height) * 0.32;

        for (var i = 0; i < menuItems.length; i++) {
            var angle = (i / menuItems.length) * Math.PI * 2 - Math.PI / 2;
            var ix = centerX + Math.cos(angle) * radius;
            var iy = centerY + Math.sin(angle) * radius;

            var conn = document.createElement('div');
            conn.className = 'ink-connector';
            conn.style.left = centerX + 'px';
            conn.style.top = centerY + 'px';
            conn.style.width = radius + 'px';
            var connAngle = angle * 180 / Math.PI;
            conn.style.setProperty('--conn-transform', 'rotate(' + connAngle + 'deg)');
            conn.style.setProperty('--conn-delay', (0.15 + i * 0.04) + 's');
            menuEl.appendChild(conn);

            var item = document.createElement('div');
            item.className = 'ink-item';
            item.style.left = ix + 'px';
            item.style.top = iy + 'px';
            item.dataset.index = i;
            item.dataset.label = menuItems[i].label;

            var iconWrap = document.createElement('div');
            iconWrap.className = 'ink-item-icon';
            iconWrap.textContent = menuItems[i].icon;

            var label = document.createElement('span');
            label.className = 'ink-item-label';
            label.textContent = menuItems[i].label;

            item.appendChild(iconWrap);
            item.appendChild(label);

            item.style.setProperty('--item-delay', (0.2 + i * 0.06) + 's');
            item.style.setProperty('--item-duration', '0.55s');

            menuEl.appendChild(item);
        }

        inkStage.appendChild(menuEl);

        void menuEl.offsetWidth;
        menuEl.classList.add('open');

        state.activeMenu = {
            id: menuId,
            element: menuEl,
            cx: cx,
            cy: cy
        };

        state.totalRipples++;
        rippleCountEl.textContent = state.totalRipples + ' 涟漪';
    }

    function closeMenu() {
        if (!state.activeMenu) return;

        var menuEl = state.activeMenu.element;
        menuEl.classList.remove('open');
        menuEl.classList.add('close');

        var currentMenu = state.activeMenu;
        state.activeMenu = null;

        setTimeout(function () {
            if (menuEl.parentNode) {
                menuEl.parentNode.removeChild(menuEl);
            }
        }, 500);

        stageHint.classList.remove('hidden');
    }

    function handleItemClick(itemEl) {
        var index = parseInt(itemEl.dataset.index, 10);
        var label = itemEl.dataset.label;

        var items = inkStage.querySelectorAll('.ink-item');
        items.forEach(function (it) {
            it.classList.remove('selected');
        });
        itemEl.classList.add('selected');

        addCanvasRipple(state.activeMenu.cx, state.activeMenu.cy);

        showToast('已选择: ' + label);

        setTimeout(function () {
            closeMenu();
        }, 400);
    }

    function showToast(text) {
        var existing = document.querySelector('.ink-toast');
        if (existing) existing.parentNode.removeChild(existing);

        var toast = document.createElement('div');
        toast.className = 'ink-toast';
        toast.textContent = text;
        document.body.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add('visible');

        setTimeout(function () {
            toast.classList.remove('visible');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 500);
        }, 2000);
    }

    function addCanvasRipple(x, y) {
        var pal = palettes[state.palette];
        var colors = pal.particles;

        state.canvasRipples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 300 + Math.random() * 200,
            alpha: 0.6,
            speed: 3 + Math.random() * 2,
            lineWidth: 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            particles: createRippleParticles(x, y, colors)
        });
    }

    function createRippleParticles(x, y, colors) {
        var parts = [];
        var count = 12 + Math.floor(Math.random() * 8);
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = 1.5 + Math.random() * 3;
            parts.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1 + Math.random() * 2.5,
                alpha: 0.7 + Math.random() * 0.3,
                decay: 0.012 + Math.random() * 0.008,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        return parts;
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
        updateCanvasRipples(dt);
        drawCanvasRipples();

        requestAnimationFrame(animate);
    }

    function updateParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.008 * dt;

            if (state.mouseInViewport) {
                var dx = state.mouse.clientX - p.x;
                var dy = state.mouse.clientY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 200;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.15;
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
            if (p.trail.length > 4) p.trail.pop();
        });
    }

    function drawParticles() {
        var pal = palettes[state.palette];

        state.particles.forEach(function (p) {
            var color = pal.particles[p.colorIndex];

            for (var t = p.trail.length - 1; t >= 0; t--) {
                var trailAlpha = p.alpha * (1 - t / 4) * 0.3;
                var trailRadius = p.radius * (1 - t / 4 * 0.5);

                ctx.beginPath();
                ctx.arc(p.trail[t].x, p.trail[t].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();
        });
    }

    function updateCanvasRipples(dt) {
        for (var i = state.canvasRipples.length - 1; i >= 0; i--) {
            var r = state.canvasRipples[i];
            r.radius += r.speed * dt;
            r.alpha *= Math.pow(0.975, dt);

            r.particles.forEach(function (p) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= Math.pow(0.96, dt);
                p.vy *= Math.pow(0.96, dt);
                p.alpha -= p.decay * dt;
            });

            r.particles = r.particles.filter(function (p) { return p.alpha > 0.01; });

            if (r.alpha < 0.01 && r.particles.length === 0) {
                state.canvasRipples.splice(i, 1);
            }
        }
    }

    function drawCanvasRipples() {
        state.canvasRipples.forEach(function (r) {
            if (r.alpha > 0.01 && r.radius > 0) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + r.color.r + ',' + r.color.g + ',' + r.color.b + ',' + r.alpha.toFixed(3) + ')';
                ctx.lineWidth = r.lineWidth;
                ctx.stroke();

                if (r.alpha > 0.1) {
                    var grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
                    grad.addColorStop(0, 'rgba(' + r.color.r + ',' + r.color.g + ',' + r.color.b + ',' + (r.alpha * 0.08).toFixed(3) + ')');
                    grad.addColorStop(1, 'rgba(' + r.color.r + ',' + r.color.g + ',' + r.color.b + ',0)');
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }
            }

            r.particles.forEach(function (p) {
                if (p.alpha > 0.01) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha.toFixed(3) + ')';
                    ctx.fill();
                }
            });
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
