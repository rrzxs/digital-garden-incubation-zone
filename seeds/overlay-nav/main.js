/* ============================================================
   Overlay Nav 叠层导航 — 交互逻辑
   四种展开模式：液态形变 / 径向绽放 / 幕帘裂分 / 故障切片
   流体粒子场 + 弹簧-阻尼菜单动力学 + 微晶玻璃态
   ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       === DOM Elements ===
       ============================================================ */
    var canvas        = document.getElementById('overlay-canvas');
    var ctx           = canvas.getContext('2d');
    var cursorGlow    = document.getElementById('cursor-glow');

    var body          = document.body;
    var overlayPanel  = document.getElementById('overlay-panel');
    var overlayVeil   = document.getElementById('overlay-veil');
    var overlayMenu   = document.getElementById('overlay-menu');
    var overlayClose  = document.getElementById('overlay-close');

    var triggerBtn    = document.getElementById('trigger-btn');
    var triggerLabel  = document.getElementById('trigger-label');
    var orbitPulse    = document.getElementById('orbit-pulse');

    var modeToggle    = document.getElementById('mode-toggle');
    var themeToggle   = document.getElementById('theme-toggle');
    var fullscreenBtn = document.getElementById('fullscreen-btn');

    var infoMode      = document.getElementById('info-mode');
    var infoDesc      = document.getElementById('info-desc');
    var footMode      = document.getElementById('foot-mode');
    var footPalette   = document.getElementById('foot-palette');
    var footSession   = document.getElementById('foot-session');

    var stateChip     = document.getElementById('state-chip');
    var openCountChip = document.getElementById('open-count');
    var fpsCounter    = document.getElementById('fps-counter');
    var particleCount = document.getElementById('particle-count');
    var toast         = document.getElementById('toast');

    /* ============================================================
       === 菜单数据 ===
       ============================================================ */
    var MENU_ITEMS = [
        { index: '01', text: '灵感孵化', sub: 'INCUBATOR', action: 'incubator' },
        { index: '02', text: '视觉实验', sub: 'VISUAL LAB', action: 'visual' },
        { index: '03', text: '交互游乐场', sub: 'PLAYGROUND', action: 'playground' },
        { index: '04', text: '工具工坊', sub: 'WORKSHOP', action: 'workshop' },
        { index: '05', text: '冥想空间', sub: 'SANCTUARY', action: 'sanctuary' },
        { index: '06', text: '数字花园', sub: 'GARDEN HOME', action: 'garden' }
    ];

    var MODES = {
        liquid:  {
            name: '液态形变',
            desc: '流体形变驱动的全屏覆盖。面板从单一锚点液化蔓延展开，菜单项以弹簧节奏从液面浮现。',
            duration: '900 ms',
            easing: 'cubic-bezier(0.16,1,0.3,1)'
        },
        radial: {
            name: '径向绽放',
            desc: '径向缩放从一点爆发绽放。面板以中心为原点旋转放大，菜单项呈辐射状由内向外散开。',
            duration: '800 ms',
            easing: 'cubic-bezier(0.16,1,0.3,1)'
        },
        curtain: {
            name: '幕帘裂分',
            desc: 'clip-path 驱动的幕帘裂分。面板从水平中线裂开，上下两半向中央合拢，菜单项逐行落入。',
            duration: '850 ms',
            easing: 'cubic-bezier(0.16,1,0.3,1)'
        },
        glitch: {
            name: '故障切片',
            desc: '故障美学切片重组。面板切片错位拼合并伴随 RGB 色散抖动，菜单项逐字浮现并伴随像素位移。',
            duration: '700 ms',
            easing: 'steps(3)'
        }
    };

    /* ============================================================
       === 氛围配色（4 种预设） ===
       ============================================================ */
    var palettes = {
        obsidian: {
            label: '黑曜',
            particles: [
                { r: 139, g: 124, b: 255 },
                { r: 180, g: 148, b: 255 },
                { r: 110, g: 100, b: 220 }
            ],
            glow: 'rgba(139, 124, 255, 0.07)',
            accent: '#8b7cff',
            accentTint: 'rgba(139, 124, 255, 0.12)',
            accentBorder: 'rgba(139, 124, 255, 0.32)',
            blobs: ['#1a0e3a', '#0c1f44', '#2a0d40', '#082238']
        },
        halcyon: {
            label: '静昼',
            particles: [
                { r: 77,  g: 208, b: 255 },
                { r: 130, g: 220, b: 255 },
                { r: 60,  g: 170, b: 220 }
            ],
            glow: 'rgba(77, 208, 255, 0.07)',
            accent: '#4dd0ff',
            accentTint: 'rgba(77, 208, 255, 0.12)',
            accentBorder: 'rgba(77, 208, 255, 0.32)',
            blobs: ['#0a1a3a', '#082238', '#0c2046', '#0e2a52']
        },
        ember: {
            label: '余烬',
            particles: [
                { r: 255, g: 138, b: 80 },
                { r: 255, g: 170, b: 100 },
                { r: 220, g: 100, b: 60 }
            ],
            glow: 'rgba(255, 138, 80, 0.07)',
            accent: '#ff8a50',
            accentTint: 'rgba(255, 138, 80, 0.12)',
            accentBorder: 'rgba(255, 138, 80, 0.32)',
            blobs: ['#3a1208', '#2a0a04', '#1a0804', '#380e06']
        },
        verdant: {
            label: '苍翠',
            particles: [
                { r: 92,  g: 225, b: 160 },
                { r: 130, g: 240, b: 180 },
                { r: 70,  g: 190, b: 130 }
            ],
            glow: 'rgba(92, 225, 160, 0.07)',
            accent: '#5ce1a0',
            accentTint: 'rgba(92, 225, 160, 0.12)',
            accentBorder: 'rgba(92, 225, 160, 0.32)',
            blobs: ['#0a2a18', '#08281a', '#0c3320', '#0e3826']
        }
    };

    /* ============================================================
       === 全局状态 ===
       ============================================================ */
    var PARTICLE_COUNT = 110;

    var state = {
        mouse: { x: -9999, y: -9999, inStage: false },
        dpr: window.devicePixelRatio || 1,
        mode: 'liquid',
        palette: 'obsidian',
        isOpen: false,
        isClosing: false,
        openCount: 0,
        particles: [],
        ripples: [],          // 点击触发器时的冲击波
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        closeTimer: null
    };

    /* ============================================================
       === 初始化 ===
       ============================================================ */
    function init() {
        buildMenu();
        resizeCanvas();
        initParticles();
        applyPalette('obsidian', false);
        setMode('liquid', false);
        bindEvents();
        bindControls();
        updateSession();
        state.lastTime = performance.now();
        state.fpsTime  = state.lastTime;
        requestAnimationFrame(animate);
    }

    /* ============================================================
       === 菜单构建 ===
       ============================================================ */
    function buildMenu() {
        overlayMenu.innerHTML = '';
        MENU_ITEMS.forEach(function (item, i) {
            var li = document.createElement('li');
            li.className = 'overlay-item';
            li.setAttribute('role', 'menuitem');
            li.setAttribute('tabindex', '-1');
            li.style.setProperty('--i', i);

            li.innerHTML =
                '<span class="item-index">' + item.index + '</span>' +
                '<span class="item-text">' + item.text + '</span>' +
                '<span class="item-sub">' + item.sub + '</span>';

            li.addEventListener('click', function () {
                onMenuClick(item);
            });
            li.addEventListener('mouseenter', function () {
                rippleFromElement(li);
            });

            overlayMenu.appendChild(li);
        });
    }

    function onMenuClick(item) {
        showToast('导航至 → ' + item.text + ' (' + item.sub + ')');
        // 实际场景此处可执行路由跳转
        setTimeout(function () {
            closeOverlay();
        }, 600);
    }

    /* ============================================================
       === 叠层状态机 ===
       ============================================================ */
    function openOverlay() {
        if (state.isOpen || state.isClosing) return;
        state.isOpen = true;
        state.openCount++;
        updateSession();

        body.setAttribute('data-overlay', 'open');
        overlayPanel.setAttribute('aria-hidden', 'false');
        overlayVeil.setAttribute('aria-hidden', 'false');

        triggerLabel.textContent = '收起';
        stateChip.textContent = 'OPEN';
        stateChip.classList.add('active');
        openCountChip.textContent = '已展开 ' + state.openCount + ' 次';

        // 重启模式动画：移除并重新触发
        var inner = overlayPanel.querySelector('.overlay-inner');
        if (inner) {
            var animName = getAnimNameForMode(state.mode);
            inner.style.animation = 'none';
            void inner.offsetWidth; // 强制重排
            inner.style.animation = '';
        }

        // 重启菜单项错峰入场
        var items = overlayMenu.querySelectorAll('.overlay-item');
        items.forEach(function (el) {
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = '';
        });

        // 聚焦关闭按钮以便键盘访问
        setTimeout(function () {
            overlayClose.focus();
        }, 100);

        pulseTrigger();
    }

    function closeOverlay() {
        if (!state.isOpen || state.isClosing) return;
        state.isClosing = true;
        body.setAttribute('data-overlay', 'closing');

        triggerLabel.textContent = '展开';
        stateChip.textContent = 'CLOSING';

        if (state.closeTimer) clearTimeout(state.closeTimer);
        state.closeTimer = setTimeout(function () {
            state.isOpen = false;
            state.isClosing = false;
            body.setAttribute('data-overlay', 'closed');
            overlayPanel.setAttribute('aria-hidden', 'true');
            overlayVeil.setAttribute('aria-hidden', 'true');
            stateChip.textContent = 'CLOSED';
            stateChip.classList.remove('active');
            triggerBtn.focus();
        }, 400);
    }

    function toggleOverlay() {
        if (state.isOpen) closeOverlay();
        else openOverlay();
    }

    function getAnimNameForMode(mode) {
        switch (mode) {
            case 'liquid':  return 'liquidOpen';
            case 'radial':  return 'radialOpen';
            case 'curtain': return 'curtainOpen';
            case 'glitch':  return 'glitchOpen';
            default:        return 'liquidOpen';
        }
    }

    function pulseTrigger() {
        orbitPulse.classList.remove('fire');
        void orbitPulse.offsetWidth;
        orbitPulse.classList.add('fire');

        // 同时在画布上生成一圈冲击波涟漪
        var rect = triggerBtn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        spawnRipple(cx, cy, 110, true);
    }

    function updateSession() {
        var session = String(state.openCount + 1).padStart(4, '0');
        footSession.textContent = '#' + session;
    }

    /* ============================================================
       === 模式切换 ===
       ============================================================ */
    function setMode(mode, notify) {
        if (!MODES[mode]) return;
        state.mode = mode;
        body.setAttribute('data-mode', mode);

        // 更新按钮 active
        var btns = modeToggle.querySelectorAll('.mode-btn');
        btns.forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-mode') === mode);
        });

        // 更新信息面板
        var info = MODES[mode];
        infoMode.textContent = info.name;
        infoDesc.textContent = info.desc;
        footMode.textContent = info.name;

        if (notify) {
            showToast('展开模式 → ' + info.name);
        }

        // 若叠层打开中，重新触发动画
        if (state.isOpen) {
            var inner = overlayPanel.querySelector('.overlay-inner');
            if (inner) {
                inner.style.animation = 'none';
                void inner.offsetWidth;
                inner.style.animation = '';
            }
            var items = overlayMenu.querySelectorAll('.overlay-item');
            items.forEach(function (el) {
                el.style.animation = 'none';
                void el.offsetWidth;
                el.style.animation = '';
            });
        }
    }

    /* ============================================================
       === 氛围配色切换 ===
       ============================================================ */
    function applyPalette(name, notify) {
        if (!palettes[name]) return;
        state.palette = name;
        var pal = palettes[name];

        // 注入 CSS 变量
        var root = document.documentElement;
        root.style.setProperty('--color-accent', pal.accent);

        // 更新光标光晕
        cursorGlow.style.background =
            'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';

        // 更新流体团颜色
        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            var hex = pal.blobs[i % pal.blobs.length];
            blob.style.background =
                'radial-gradient(ellipse at center, ' + hex + ' 0%, transparent 70%)';
        });

        // 更新触发按钮渐变
        triggerBtn.style.background =
            'linear-gradient(145deg, ' + pal.accentTint + ', rgba(255,255,255,0.02))';
        triggerBtn.style.borderColor = pal.accentBorder;
        triggerBtn.style.boxShadow =
            '0 0 40px ' + pal.glow.replace('0.07', '0.25') +
            ', inset 0 1px 0 rgba(255,255,255,0.15)';

        // 更新轨道环
        var ring2 = document.querySelector('.orbit-ring-2');
        if (ring2) ring2.style.borderColor = pal.accentTint;

        // active 按钮染色
        var tBtns = themeToggle.querySelectorAll('.theme-btn');
        tBtns.forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-theme') === name);
        });

        // 同步 mode 按钮的 active 背景
        var mBtns = modeToggle.querySelectorAll('.mode-btn.active');
        mBtns.forEach(function (b) {
            b.style.color = pal.accent;
            b.style.background = pal.accentTint;
        });
        var allMBtns = modeToggle.querySelectorAll('.theme-btn.active');
        allMBtns.forEach(function (b) {
            b.style.color = pal.accent;
            b.style.background = pal.accentTint;
        });

        footPalette.textContent = pal.label;

        if (notify) {
            showToast('氛围配色 → ' + pal.label);
        }
    }

    /* ============================================================
       === 画布初始化 ===
       ============================================================ */
    function resizeCanvas() {
        canvas.width  = window.innerWidth  * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width  = window.innerWidth  + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initParticles() {
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle());
        }
        particleCount.textContent = PARTICLE_COUNT + ' P';
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2.2 + 0.6,
            alpha:  Math.random() * 0.4 + 0.15,
            phase:  Math.random() * Math.PI * 2,
            speed:  Math.random() * 0.25 + 0.08,
            colorIndex: Math.floor(Math.random() * 3),
            trail: []
        };
    }

    /* ============================================================
       === 涟漪冲击波 ===
       ============================================================ */
    function spawnRipple(x, y, radius, big) {
        state.ripples.push({
            x: x, y: y,
            radius: radius || 40,
            maxRadius: big ? 320 : 180,
            alpha: big ? 0.7 : 0.5,
            decay: big ? 0.018 : 0.025,
            lineWidth: big ? 2 : 1.2,
            bursts: big ? spawnBursts(x, y, 14) : spawnBursts(x, y, 6)
        });
    }

    function spawnBursts(x, y, count) {
        var arr = [];
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = Math.random() * 3 + 1.5;
            arr.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 1.6 + 0.6,
                alpha: Math.random() * 0.5 + 0.4,
                decay: Math.random() * 0.02 + 0.012
            });
        }
        return arr;
    }

    function rippleFromElement(el) {
        var rect = el.getBoundingClientRect();
        spawnRipple(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            30, false
        );
    }

    /* ============================================================
       === 更新循环 ===
       ============================================================ */
    function updateParticles(dt) {
        var w = window.innerWidth, h = window.innerHeight;
        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.01 * dt;

            if (state.mouse.inStage) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 240 && dist > 1) {
                    var force = (1 - dist / 240);
                    force = force * force * 0.22;
                    var angle = Math.atan2(dy, dx);
                    p.vx += Math.cos(angle) * force * dt;
                    p.vy += Math.sin(angle) * force * dt;
                }
            }

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // 边界环绕
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            // 尾迹
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.pop();
        });
    }

    function updateRipples(dt) {
        for (var i = state.ripples.length - 1; i >= 0; i--) {
            var r = state.ripples[i];
            r.radius += (r.maxRadius - r.radius) * 0.06 * dt;
            r.alpha -= r.decay * dt;

            // 更新迸射粒子
            for (var j = r.bursts.length - 1; j >= 0; j--) {
                var b = r.bursts[j];
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.vx *= Math.pow(0.96, dt);
                b.vy *= Math.pow(0.96, dt);
                b.alpha -= b.decay * dt;
                if (b.alpha <= 0) r.bursts.splice(j, 1);
            }

            if (r.alpha <= 0.01 && r.bursts.length === 0) {
                state.ripples.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        var pal = palettes[state.palette];
        state.particles.forEach(function (p) {
            var c = pal.particles[p.colorIndex];

            // 尾迹
            for (var t = p.trail.length - 1; t >= 0; t--) {
                var ta = p.alpha * (1 - t / 5) * 0.35;
                var tr = p.radius * (1 - t / 5 * 0.5);
                ctx.beginPath();
                ctx.arc(p.trail[t].x, p.trail[t].y, Math.max(0.1, tr), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + ta.toFixed(3) + ')';
                ctx.fill();
            }

            // 核心
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();
        });
    }

    function drawRipples() {
        var pal = palettes[state.palette];
        state.ripples.forEach(function (r) {
            if (r.alpha > 0) {
                ctx.beginPath();
                ctx.arc(r.x, r.y, Math.max(0.1, r.radius), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' +
                    pal.particles[0].r + ',' +
                    pal.particles[0].g + ',' +
                    pal.particles[0].b + ',' +
                    r.alpha.toFixed(3) + ')';
                ctx.lineWidth = r.lineWidth;
                ctx.stroke();
            }

            // 迸射粒子
            r.bursts.forEach(function (b) {
                if (b.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, Math.max(0.1, b.radius), 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(' +
                        pal.particles[1].r + ',' +
                        pal.particles[1].g + ',' +
                        pal.particles[1].b + ',' +
                        b.alpha.toFixed(3) + ')';
                    ctx.fill();
                }
            });
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
        updateRipples(dt);
        drawParticles();
        drawRipples();
        requestAnimationFrame(animate);
    }

    /* ============================================================
       === 事件绑定 ===
       ============================================================ */
    function bindEvents() {
        // 鼠标
        window.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.inStage = true;
            cursorGlow.style.transform =
                'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        }, { passive: true });

        window.addEventListener('mouseleave', function () {
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            state.mouse.inStage = false;
        });

        // 触摸
        window.addEventListener('touchmove', function (e) {
            if (e.touches.length > 0) {
                var t = e.touches[0];
                state.mouse.x = t.clientX;
                state.mouse.y = t.clientY;
                state.mouse.inStage = true;
                cursorGlow.style.transform =
                    'translate(' + t.clientX + 'px,' + t.clientY + 'px) translate(-50%, -50%)';
            }
        }, { passive: true });

        window.addEventListener('touchend', function () {
            state.mouse.x = -9999;
            state.mouse.y = -9999;
            state.mouse.inStage = false;
        });

        // 键盘
        window.addEventListener('keydown', function (e) {
            switch (e.key) {
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    toggleOverlay();
                    break;
                case 'Escape':
                    if (state.isOpen) closeOverlay();
                    break;
                case '1': setMode('liquid', true); break;
                case '2': setMode('radial', true); break;
                case '3': setMode('curtain', true); break;
                case '4': setMode('glitch', true); break;
                case 'q': case 'Q': applyPalette('obsidian', true); break;
                case 'w': case 'W': applyPalette('halcyon', true); break;
                case 'e': case 'E': applyPalette('ember', true); break;
                case 'r': case 'R': applyPalette('verdant', true); break;
                case 'f': case 'F': toggleFullscreen(); break;
            }
        });

        // 点击遮罩关闭
        overlayVeil.addEventListener('click', function () {
            if (state.isOpen) closeOverlay();
        });

        // 缩放
        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 200));
    }

    function bindControls() {
        // 触发按钮
        triggerBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleOverlay();
        });

        // 关闭按钮
        overlayClose.addEventListener('click', function (e) {
            e.stopPropagation();
            closeOverlay();
        });

        // 阻止面板内部点击冒泡到遮罩
        overlayPanel.addEventListener('click', function (e) {
            if (e.target === overlayPanel) {
                closeOverlay();
            }
        });

        // 模式按钮
        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            var mode = btn.getAttribute('data-mode');
            setMode(mode, true);
        });

        // 配色按钮
        themeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            var theme = btn.getAttribute('data-theme');
            applyPalette(theme, true);
        });

        // 全屏
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen &&
                document.documentElement.requestFullscreen();
            showToast('进入全屏');
        } else {
            document.exitFullscreen && document.exitFullscreen();
            showToast('退出全屏');
        }
    }

    /* ============================================================
       === 工具函数 ===
       ============================================================ */
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments, self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(self, args); }, delay);
        };
    }

    var toastTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('visible');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('visible');
        }, 1800);
    }

    /* ============================================================
       === 启动 ===
       ============================================================ */
    init();
})();
