/* ============================================================================
 * Logo Context Menu — 徽标语境菜单
 * 流体粒子场 + 徽标形变 + 径向语境菜单 + 非线性微交互
 * ========================================================================== */
(function () {
    'use strict';

    // === DOM 元素 ============================================================
    var canvas = document.getElementById('fx-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var logoStage = document.getElementById('logo-stage');
    var stageHint = document.getElementById('stage-hint');
    var logoWrap = document.getElementById('logo-wrap');
    var logoMorph = document.getElementById('logo-morph');
    var logoLabel = document.getElementById('logo-label');
    var themeToggle = document.getElementById('theme-toggle');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var fpsCounter = document.getElementById('fps-counter');
    var actionCountEl = document.getElementById('action-count');
    var panelForm = document.getElementById('panel-form');
    var panelMood = document.getElementById('panel-mood');
    var panelSpin = document.getElementById('panel-spin');
    var panelPulse = document.getElementById('panel-pulse');
    var panelLog = document.getElementById('panel-log');
    var toastEl = document.getElementById('toast');

    // === 全局状态 ============================================================
    var state = {
        mouse: { x: -9999, y: -9999, clientX: -9999, clientY: -9999 },
        mouseInStage: false,
        dpr: window.devicePixelRatio || 1,
        palette: 'aurora',
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        particles: [],
        bursts: [],
        activeMenu: null,
        totalActions: 0,
        currentForm: 'orb',
        spinLevel: 0.4,
        pulseLevel: 0.5,
        longPressTimer: null,
        longPressFired: false,
        menuIdCounter: 0
    };

    var PARTICLE_COUNT = 90;

    // === 氛围配色 ============================================================
    var palettes = {
        'aurora': {
            mood: '极光',
            particles: [
                { r: 139, g: 92, b: 246 },
                { r: 165, g: 243, b: 252 },
                { r: 129, g: 140, b: 248 }
            ],
            glow: 'rgba(139, 92, 246, 0.10)',
            accent: '#8b5cf6',
            accentSoft: 'rgba(139, 92, 246, 0.14)',
            accentGlow: 'rgba(139, 92, 246, 0.42)',
            accentFaint: 'rgba(139, 92, 246, 0.10)',
            gradA: '#a5f3fc',
            gradB: '#8b5cf6',
            gradC: '#4c1d95',
            blobs: ['#0a1430', '#0d1a2e', '#1a0a30', '#081424']
        },
        'ember': {
            mood: '余烬',
            particles: [
                { r: 251, g: 146, b: 60 },
                { r: 239, g: 68, b: 68 },
                { r: 252, g: 211, b: 77 }
            ],
            glow: 'rgba(251, 146, 60, 0.10)',
            accent: '#fb923c',
            accentSoft: 'rgba(251, 146, 60, 0.14)',
            accentGlow: 'rgba(251, 146, 60, 0.42)',
            accentFaint: 'rgba(251, 146, 60, 0.10)',
            gradA: '#fde68a',
            gradB: '#fb923c',
            gradC: '#7c2d12',
            blobs: ['#2a1008', '#2d160a', '#301410', '#250e08']
        },
        'abyss': {
            mood: '深渊',
            particles: [
                { r: 34, g: 211, b: 238 },
                { r: 14, g: 165, b: 233 },
                { r: 94, g: 234, b: 212 }
            ],
            glow: 'rgba(34, 211, 238, 0.10)',
            accent: '#22d3ee',
            accentSoft: 'rgba(34, 211, 238, 0.14)',
            accentGlow: 'rgba(34, 211, 238, 0.42)',
            accentFaint: 'rgba(34, 211, 238, 0.10)',
            gradA: '#67e8f9',
            gradB: '#22d3ee',
            gradC: '#155e75',
            blobs: ['#04141c', '#061824', '#08182a', '#04101a']
        },
        'bloom': {
            mood: '绽放',
            particles: [
                { r: 236, g: 72, b: 153 },
                { r: 244, g: 114, b: 182 },
                { r: 251, g: 207, b: 232 }
            ],
            glow: 'rgba(236, 72, 153, 0.10)',
            accent: '#ec4899',
            accentSoft: 'rgba(236, 72, 153, 0.14)',
            accentGlow: 'rgba(236, 72, 153, 0.42)',
            accentFaint: 'rgba(236, 72, 153, 0.10)',
            gradA: '#fbcfe8',
            gradB: '#ec4899',
            gradC: '#831843',
            blobs: ['#260818', '#2a0a1c', '#2d0d20', '#220816']
        }
    };

    // === 徽标形变路径（SVG path d 字符串）=====================================
    // 以 (0,0) 为中心，半径约 60 的可形变轮廓
    var formPaths = {
        orb: function (t) {
            // 圆形 + 轻微呼吸
            var r = 60 + Math.sin(t * 0.002) * 2;
            return circlePath(0, 0, r);
        },
        shard: function (t) {
            // 六边形晶片
            var r = 62 + Math.sin(t * 0.003) * 2;
            return polygonPath(0, 0, r, 6, Math.PI / 6);
        },
        bloom: function (t) {
            // 八瓣花
            return flowerPath(0, 0, 56, 30, 8, t * 0.0008);
        },
        wave: function (t) {
            // 波浪环
            return wavyCirclePath(0, 0, 58, 10, t * 0.0012);
        },
        star: function (t) {
            // 五角星
            var r = 66 + Math.sin(t * 0.003) * 2;
            return starPath(0, 0, r, r * 0.45, 5, -Math.PI / 2);
        },
        void: function (t) {
            // 不规则有机团块
            return blobPath(0, 0, 58, t * 0.0006);
        }
    };

    var formLabels = {
        orb: 'ORB',
        shard: 'SHARD',
        bloom: 'BLOOM',
        wave: 'WAVE',
        star: 'STAR',
        void: 'VOID'
    };

    // === 语境菜单条目 ========================================================
    var ctxItems = [
        { icon: '◯', label: '球体', form: 'orb' },
        { icon: '⬡', label: '晶片', form: 'shard' },
        { icon: '✿', label: '绽放', form: 'bloom' },
        { icon: '∿', label: '波环', form: 'wave' },
        { icon: '★', label: '星辰', form: 'star' },
        { icon: '◍', label: '虚空', form: 'void' }
    ];

    // =========================================================================
    // 初始化
    // =========================================================================
    function init() {
        resizeCanvas();
        initParticles();
        bindEvents();
        bindControls();
        setForm('orb', true);
        updatePanelBars();
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        requestAnimationFrame(animate);
    }

    // === Canvas 尺寸 =========================================================
    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    // === 粒子场初始化 ========================================================
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

    // === 事件绑定 ============================================================
    function bindEvents() {
        // 鼠标移动 — 全局光标光晕
        document.addEventListener('mousemove', function (e) {
            state.mouse.clientX = e.clientX;
            state.mouse.clientY = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        // 舞台内鼠标 — 粒子力场
        logoStage.addEventListener('mousemove', function (e) {
            var rect = logoStage.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouseInStage = true;
        });

        logoStage.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        // 右键 — 唤起语境菜单
        logoStage.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var rect = logoStage.getBoundingClientRect();
            openMenu(e.clientX - rect.left, e.clientY - rect.top);
        });

        // 左键徽标 — 也能唤起（便于发现）
        logoWrap.addEventListener('click', function (e) {
            if (state.longPressFired) {
                state.longPressFired = false;
                return;
            }
            e.stopPropagation();
            var rect = logoStage.getBoundingClientRect();
            var wrapRect = logoWrap.getBoundingClientRect();
            var cx = (wrapRect.left + wrapRect.width / 2) - rect.left;
            var cy = (wrapRect.top + wrapRect.height / 2) - rect.top;
            openMenu(cx, cy);
        });

        // 长按 — 移动端唤起
        logoWrap.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            state.longPressTimer = setTimeout(function () {
                state.longPressFired = true;
                var touch = e.touches[0];
                var rect = logoStage.getBoundingClientRect();
                if (navigator.vibrate) navigator.vibrate(30);
                openMenu(touch.clientX - rect.left, touch.clientY - rect.top);
            }, 420);
        }, { passive: true });

        logoWrap.addEventListener('touchend', function () {
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }
        });

        logoWrap.addEventListener('touchmove', function () {
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }
        }, { passive: true });

        // 舞台点击空白 — 关闭
        logoStage.addEventListener('click', function (e) {
            var onItem = e.target.closest('.ctx-item');
            if (onItem) {
                handleItemClick(onItem);
                return;
            }
            var onMenu = e.target.closest('.ctx-menu');
            if (onMenu) return;
            if (state.activeMenu) {
                closeMenu();
            }
        });

        // 舞台触摸 — 空白关闭
        logoStage.addEventListener('touchstart', function (e) {
            if (!state.activeMenu) return;
            var onItem = e.target.closest('.ctx-item');
            var onMenu = e.target.closest('.ctx-menu');
            if (!onItem && !onMenu) {
                closeMenu();
            }
        }, { passive: true });

        // ESC 关闭
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && state.activeMenu) {
                closeMenu();
            }
        });

        // 尺寸变化
        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
            if (state.activeMenu) closeMenu();
        }, 200));
    }

    // === 控件绑定 ============================================================
    function bindControls() {
        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.theme;
                applyPalette();
                pushLog('mood → ' + palettes[state.palette].mood);
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

    // === 配色应用 ============================================================
    function applyPalette() {
        var p = palettes[state.palette];
        var root = document.documentElement;
        root.style.setProperty('--color-accent', p.accent);
        root.style.setProperty('--color-accent-soft', p.accentSoft);
        root.style.setProperty('--color-accent-glow', p.accentGlow);
        root.style.setProperty('--color-accent-faint', p.accentFaint);
        root.style.setProperty('--logo-grad-a', p.gradA);
        root.style.setProperty('--logo-grad-b', p.gradB);
        root.style.setProperty('--logo-grad-c', p.gradC);

        // 更新 SVG 渐变停靠色
        var stops = ['grad-stop-a', 'grad-stop-b', 'grad-stop-c'];
        var colors = [p.gradA, p.gradB, p.gradC];
        stops.forEach(function (id, i) {
            var el = document.getElementById(id);
            if (el) el.setAttribute('stop-color', colors[i]);
        });

        // 更新 blob
        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });

        panelMood.textContent = p.mood;
        panelMood.style.color = p.accent;
    }

    // === 徽标形变切换 ========================================================
    function setForm(form, silent) {
        state.currentForm = form;
        panelForm.textContent = form;
        logoLabel.textContent = formLabels[form] || form.toUpperCase();

        // 触发形变冲击波
        addBurst(centerOfLogo(), 1, true);

        if (!silent) {
            pushLog('form → ' + form);
        }
    }

    // === 语境菜单：开启 ======================================================
    function openMenu(cx, cy) {
        stageHint.classList.add('hidden');
        logoWrap.classList.add('menu-active', 'active');
        setTimeout(function () { logoWrap.classList.remove('menu-active'); }, 500);

        // 若已有菜单，先移除
        if (state.activeMenu) {
            teardownMenu(state.activeMenu.element);
        }

        state.menuIdCounter++;
        var menuId = 'ctx-' + state.menuIdCounter;

        var menuEl = document.createElement('div');
        menuEl.className = 'ctx-menu';
        menuEl.id = menuId;
        menuEl.style.left = cx + 'px';
        menuEl.style.top = cy + 'px';

        // 中心点
        var core = document.createElement('div');
        core.className = 'ctx-menu-core';
        menuEl.appendChild(core);

        // 冲击波（canvas）
        addBurst({ x: cx, y: cy }, 1.4, true);

        // 多层涟漪环
        var ringCount = 4;
        for (var r = 0; r < ringCount; r++) {
            var ring = document.createElement('div');
            ring.className = 'ctx-ring';
            var size = 200 + r * 110;
            ring.style.width = size + 'px';
            ring.style.height = size + 'px';
            ring.style.left = '0px';
            ring.style.top = '0px';
            ring.style.setProperty('--ring-delay', (r * 0.1) + 's');
            ring.style.setProperty('--ring-duration', (1.2 + r * 0.25) + 's');
            menuEl.appendChild(ring);
        }

        // 菜单项径向布局
        var stageRect = logoStage.getBoundingClientRect();
        var radius = Math.min(stageRect.width, stageRect.height) * 0.32;

        for (var i = 0; i < ctxItems.length; i++) {
            var angle = (i / ctxItems.length) * Math.PI * 2 - Math.PI / 2;
            var ix = cx + Math.cos(angle) * radius;
            var iy = cy + Math.sin(angle) * radius;

            // 连接线
            var conn = document.createElement('div');
            conn.className = 'ctx-connector';
            conn.style.left = cx + 'px';
            conn.style.top = cy + 'px';
            conn.style.width = radius + 'px';
            var deg = angle * 180 / Math.PI;
            conn.style.setProperty('--conn-transform', 'rotate(' + deg + 'deg)');
            conn.style.setProperty('--conn-delay', (0.12 + i * 0.03) + 's');
            menuEl.appendChild(conn);

            // 菜单项
            var item = ctxItems[i];
            var itemEl = document.createElement('div');
            itemEl.className = 'ctx-item';
            itemEl.style.left = ix + 'px';
            itemEl.style.top = iy + 'px';
            itemEl.dataset.form = item.form;
            itemEl.dataset.label = item.label;

            var iconWrap = document.createElement('div');
            iconWrap.className = 'ctx-item-icon';
            iconWrap.textContent = item.icon;

            var label = document.createElement('span');
            label.className = 'ctx-item-label';
            label.textContent = item.label;

            itemEl.appendChild(iconWrap);
            itemEl.appendChild(label);

            itemEl.style.setProperty('--item-delay', (0.18 + i * 0.05) + 's');
            itemEl.style.setProperty('--item-duration', '0.5s');

            // 标记当前形态
            if (item.form === state.currentForm) {
                itemEl.classList.add('selected');
            }

            menuEl.appendChild(itemEl);
        }

        logoStage.appendChild(menuEl);

        // 强制重排后开启
        void menuEl.offsetWidth;
        menuEl.classList.add('open');

        state.activeMenu = {
            id: menuId,
            element: menuEl,
            cx: cx,
            cy: cy
        };

        state.totalActions++;
        actionCountEl.textContent = state.totalActions + ' 唤起';
        pushLog('context → open');
    }

    // === 语境菜单：关闭 ======================================================
    function closeMenu() {
        if (!state.activeMenu) return;

        var menuEl = state.activeMenu.element;
        menuEl.classList.remove('open');
        menuEl.classList.add('close');

        var el = menuEl;
        setTimeout(function () { teardownMenu(el); }, 380);

        state.activeMenu = null;
        logoWrap.classList.remove('active');
        stageHint.classList.remove('hidden');
        pushLog('context → close');
    }

    function teardownMenu(menuEl) {
        if (menuEl && menuEl.parentNode) {
            menuEl.parentNode.removeChild(menuEl);
        }
    }

    // === 菜单项点击 ==========================================================
    function handleItemClick(itemEl) {
        var form = itemEl.dataset.form;
        var label = itemEl.dataset.label;

        var items = logoStage.querySelectorAll('.ctx-item');
        items.forEach(function (it) { it.classList.remove('selected'); });
        itemEl.classList.add('selected');

        if (state.activeMenu) {
            addBurst({ x: state.activeMenu.cx, y: state.activeMenu.cy }, 1, true);
        }

        setForm(form, true);
        showToast('徽标形变 → ' + label + ' · ' + formLabels[form]);

        setTimeout(function () { closeMenu(); }, 360);
    }

    // === Toast ===============================================================
    function showToast(text) {
        toastEl.textContent = text;
        toastEl.classList.remove('visible');
        void toastEl.offsetWidth;
        toastEl.classList.add('visible');

        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () {
            toastEl.classList.remove('visible');
        }, 2000);
    }

    // === HUD 日志 ============================================================
    function pushLog(text) {
        var time = new Date();
        var ts = pad(time.getHours()) + ':' + pad(time.getMinutes()) + ':' + pad(time.getSeconds());
        panelLog.textContent = ts + ' ' + text;
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function updatePanelBars() {
        panelSpin.style.width = Math.round(state.spinLevel * 100) + '%';
        panelPulse.style.width = Math.round(state.pulseLevel * 100) + '%';
    }

    // === 粒子冲击波 ==========================================================
    function centerOfLogo() {
        var wrapRect = logoWrap.getBoundingClientRect();
        var stageRect = logoStage.getBoundingClientRect();
        return {
            x: (wrapRect.left + wrapRect.width / 2) - stageRect.left,
            y: (wrapRect.top + wrapRect.height / 2) - stageRect.top
        };
    }

    function addBurst(origin, intensity, withParticles) {
        var pal = palettes[state.palette];
        var colors = pal.particles;
        intensity = intensity || 1;

        state.bursts.push({
            x: origin.x,
            y: origin.y,
            radius: 0,
            maxRadius: (240 + Math.random() * 160) * intensity,
            alpha: 0.55 * intensity,
            speed: (3 + Math.random() * 2) * intensity,
            lineWidth: 1.5,
            color: colors[Math.floor(Math.random() * colors.length)]
        });

        if (withParticles) {
            var count = 14 + Math.floor(Math.random() * 10);
            for (var i = 0; i < count; i++) {
                var a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
                var sp = (1.6 + Math.random() * 3.2) * intensity;
                state.bursts.push({
                    isParticle: true,
                    x: origin.x,
                    y: origin.y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    radius: 1 + Math.random() * 2.5,
                    alpha: 0.75 + Math.random() * 0.25,
                    decay: 0.012 + Math.random() * 0.01,
                    color: colors[Math.floor(Math.random() * colors.length)]
                });
            }
        }
    }

    // =========================================================================
    // 主循环
    // =========================================================================
    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        // FPS
        state.frameCount++;
        if (time - state.fpsTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.fpsTime = time;
            fpsCounter.textContent = state.fps + ' FPS';
        }

        ctx.clearRect(0, 0, canvas.width / state.dpr, canvas.height / state.dpr);

        // 更新徽标形变路径（每帧）
        updateLogoForm(time);

        // 更新 HUD：spin / pulse 随时间呼吸
        state.spinLevel = 0.5 + Math.sin(time * 0.0006) * 0.4;
        state.pulseLevel = 0.5 + Math.sin(time * 0.0011 + 1.2) * 0.4;
        if (state.frameCount % 6 === 0) updatePanelBars();

        updateParticles(dt);
        drawParticles();
        updateBursts(dt);
        drawBursts();

        requestAnimationFrame(animate);
    }

    function updateLogoForm(time) {
        var fn = formPaths[state.currentForm];
        if (fn) {
            logoMorph.setAttribute('d', fn(time));
        }
    }

    // === 粒子更新与绘制 ======================================================
    function updateParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.008 * dt;

            if (state.mouseInStage) {
                var dx = state.mouse.clientX - p.x;
                var dy = state.mouse.clientY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 220;

                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.16;
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

            // 拖尾
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

    function updateBursts(dt) {
        for (var i = state.bursts.length - 1; i >= 0; i--) {
            var b = state.bursts[i];
            if (b.isParticle) {
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.vx *= Math.pow(0.96, dt);
                b.vy *= Math.pow(0.96, dt);
                b.alpha -= b.decay * dt;
                if (b.alpha <= 0.01) state.bursts.splice(i, 1);
            } else {
                b.radius += b.speed * dt;
                b.alpha *= Math.pow(0.975, dt);
                if (b.alpha < 0.01) state.bursts.splice(i, 1);
            }
        }
    }

    function drawBursts() {
        state.bursts.forEach(function (b) {
            if (b.isParticle) {
                if (b.alpha > 0.01) {
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, Math.max(0.1, b.radius), 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + b.alpha.toFixed(3) + ')';
                    ctx.fill();
                }
                return;
            }

            if (b.alpha > 0.01 && b.radius > 0) {
                // 环
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + b.alpha.toFixed(3) + ')';
                ctx.lineWidth = b.lineWidth;
                ctx.stroke();

                // 内辉
                if (b.alpha > 0.1) {
                    var grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
                    grad.addColorStop(0, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + (b.alpha * 0.08).toFixed(3) + ')');
                    grad.addColorStop(1, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0)');
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }
            }
        });
    }

    // =========================================================================
    // SVG path 生成工具
    // =========================================================================
    function circlePath(cx, cy, r) {
        r = Math.max(1, r);
        return 'M ' + (cx - r) + ' ' + cy +
            ' a ' + r + ' ' + r + ' 0 1 0 ' + (r * 2) + ' 0' +
            ' a ' + r + ' ' + r + ' 0 1 0 ' + (-r * 2) + ' 0 Z';
    }

    function polygonPath(cx, cy, r, sides, rotation) {
        r = Math.max(1, r);
        sides = Math.max(3, sides);
        rotation = rotation || 0;
        var pts = [];
        for (var i = 0; i < sides; i++) {
            var a = rotation + (i / sides) * Math.PI * 2;
            pts.push((cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2));
        }
        return 'M ' + pts.join(' L ') + ' Z';
    }

    function starPath(cx, cy, outerR, innerR, points, rotation) {
        outerR = Math.max(1, outerR);
        innerR = Math.max(0.5, innerR);
        points = Math.max(3, points);
        var total = points * 2;
        var pts = [];
        for (var i = 0; i < total; i++) {
            var a = rotation + (i / total) * Math.PI * 2;
            var rr = (i % 2 === 0) ? outerR : innerR;
            pts.push((cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2));
        }
        return 'M ' + pts.join(' L ') + ' Z';
    }

    function flowerPath(cx, cy, outerR, innerR, petals, phase) {
        outerR = Math.max(1, outerR);
        innerR = Math.max(0.5, innerR);
        petals = Math.max(2, petals);
        var segments = petals * 24;
        var pts = [];
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            var a = t * Math.PI * 2 + phase;
            var rr = innerR + (outerR - innerR) * (0.5 + 0.5 * Math.cos(petals * t * Math.PI * 2));
            pts.push((cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2));
        }
        return 'M ' + pts[0] + ' ' + pts.slice(1).map(function (p) { return 'L ' + p; }).join(' ') + ' Z';
    }

    function wavyCirclePath(cx, cy, baseR, amp, phase) {
        baseR = Math.max(1, baseR);
        var segments = 96;
        var pts = [];
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            var a = t * Math.PI * 2;
            var rr = baseR + Math.sin(a * 6 + phase * 10) * amp;
            pts.push((cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2));
        }
        return 'M ' + pts[0] + ' ' + pts.slice(1).map(function (p) { return 'L ' + p; }).join(' ') + ' Z';
    }

    function blobPath(cx, cy, baseR, phase) {
        baseR = Math.max(1, baseR);
        var segments = 80;
        var pts = [];
        for (var i = 0; i <= segments; i++) {
            var t = i / segments;
            var a = t * Math.PI * 2;
            var n = Math.sin(a * 3 + phase * 8) * 6 + Math.cos(a * 5 - phase * 6) * 4 + Math.sin(a * 2 + phase * 10) * 3;
            var rr = baseR + n;
            pts.push((cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2));
        }
        return 'M ' + pts[0] + ' ' + pts.slice(1).map(function (p) { return 'L ' + p; }).join(' ') + ' Z';
    }

    // === 工具 ================================================================
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(self, args); }, delay);
        };
    }

    // 启动
    init();
})();
