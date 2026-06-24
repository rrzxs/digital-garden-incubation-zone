(function () {
    'use strict';

    /* =====================================================================
       Cube Portfolio · 立方作品集
       交互逻辑: 拖拽 3D 旋转 · 惯性物理 · 弹簧归位 · 面导航 · 粒子流场 · 氛围配色
       ===================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    /* === 作品集数据 (六个面) ===
       每面: 编号 / 类别 / 标题 / 副标题 / 缩写 / 描述 / 标签 / 年份 / 技术栈 / 角色 */
    var FACES = [
        {
            pos: 'front', num: '01', cat: 'FLAGSHIP', glyph: 'A',
            title: 'Aurora 灵韵', sub: 'Immersive Breathing',
            desc: '极致审美的沉浸式呼吸冥想空间。流体网格渐变与微晶玻璃拟物态，将冥想从功能升维为氛围。25万次呼吸的陪伴。',
            tags: ['Design', 'Glassmorphism', 'Wellness'],
            year: '2025', stack: 'Vanilla JS · Canvas', role: 'Creator'
        },
        {
            pos: 'right', num: '02', cat: 'SIMULATION', glyph: 'F',
            title: 'Fluid 流体', sub: 'Navier-Stokes Playground',
            desc: '基于 Navier-Stokes 方程的交互式流体模拟。鼠标即扰动源，颜料在屏幕上真实地扩散、漩涡与消散。四种配色，无限可能。',
            tags: ['Physics', 'WebGL', 'Real-time'],
            year: '2025', stack: 'Canvas · GLSL', role: 'Engineer'
        },
        {
            pos: 'back', num: '03', cat: 'CREATIVE', glyph: 'G',
            title: 'Gradient Mesh', sub: 'Generative Color Tool',
            desc: '交互式 Mesh 渐变生成器。拖拽节点实时创造美丽渐变，支持预设配色与 CSS/PNG 双导出。设计师的即兴调色板。',
            tags: ['Design Tool', 'Gradient', 'Export'],
            year: '2025', stack: 'SVG · Vanilla JS', role: 'Creator'
        },
        {
            pos: 'left', num: '04', cat: 'TYPOGRAPHY', glyph: 'T',
            title: 'Typo Shift 字形位移', sub: 'Fluid Typography Engine',
            desc: '四种流体位移模式实时驱动字号、字重、字距非线性形变。让文字本身成为流体，在屏幕上呼吸、起伏与解构。',
            tags: ['Typography', 'Animation', 'Micro-interaction'],
            year: '2026', stack: 'Vanilla JS · CSS3', role: 'Engineer'
        },
        {
            pos: 'top', num: '05', cat: 'TOOL', glyph: 'X',
            title: 'XHS Cover Studio', sub: 'Strategy-Driven Covers',
            desc: '策略驱动的高级封面生成器。多模板系统、主题切换、拖拽微调与 SVG/PNG 双导出。从概念到成片的完整创作闭环。',
            tags: ['Creator Tool', 'SVG Export', 'Design System'],
            year: '2025', stack: 'Vanilla JS · SVG', role: 'Creator'
        },
        {
            pos: 'bottom', num: '06', cat: 'AI', glyph: 'O',
            title: 'OpenClaw', sub: 'Multi-Agent LLM Client',
            desc: '基于 GLM API 的多角色 AI 对话客户端原型。Prompt 注入测试、角色记忆系统与流式渲染，探索人机共创的边界。',
            tags: ['React', 'LLM', 'MVP'],
            year: '2026', stack: 'React · Zustand', role: 'Architect'
        }
    ];

    /* 每个面对应的目标旋转角度 (使该面正对屏幕) */
    var FACE_ROTATIONS = {
        front:  { x: 0,   y: 0    },
        right:  { x: 0,   y: -90  },
        back:   { x: 0,   y: 180  },
        left:   { x: 0,   y: 90   },
        top:    { x: -90, y: 0    },
        bottom: { x: 90,  y: 0    }
    };

    var FACE_ORDER = ['front', 'right', 'back', 'left', 'top', 'bottom'];

    /* =====================================================================
       === DOM Elements ===
       ===================================================================== */

    var cube = document.getElementById('cube');
    var cubeTilt = document.getElementById('cube-tilt');
    var cubeScene = document.querySelector('.cube-scene');
    var faceNav = document.getElementById('face-nav');
    var hudDot = document.getElementById('hud-dot');
    var hudText = document.getElementById('hud-text');
    var faceCounter = document.getElementById('face-counter');
    var cursorGlow = document.getElementById('cursor-glow');
    var rippleLayer = document.getElementById('ripple-layer');
    var paletteDots = document.querySelectorAll('.palette-dot');
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');

    var detailIndex = document.getElementById('detail-index');
    var detailCat = document.getElementById('detail-cat');
    var detailTitle = document.getElementById('detail-title');
    var detailDesc = document.getElementById('detail-desc');
    var detailTags = document.getElementById('detail-tags');
    var detailYear = document.getElementById('detail-year');
    var detailStack = document.getElementById('detail-stack');
    var detailRole = document.getElementById('detail-role');

    /* =====================================================================
       === 立方体旋转物理状态 ===
       ===================================================================== */

    /* 当前显示的旋转角度 (连续累积, 用于惯性) */
    var rotX = -20;
    var rotY = -30;
    /* 速度 (惯性) */
    var velX = 0;
    var velY = 0;
    /* 拖拽状态 */
    var isDragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var lastDragX = 0;
    var lastDragY = 0;
    var lastDragTime = 0;
    /* 是否处于自动旋转/惯性/弹簧动画中 */
    var isAnimating = false;
    /* 当前正对的面索引 */
    var activeFaceIdx = 0;
    /* 鼠标视差倾斜 */
    var parallaxX = 0;
    var parallaxY = 0;

    /* =====================================================================
       === 构建立方体面 ===
       ===================================================================== */

    function buildFaces() {
        FACES.forEach(function (f, i) {
            var face = document.createElement('div');
            face.className = 'face face-' + f.pos;
            face.setAttribute('data-index', i);
            face.setAttribute('role', 'button');
            face.setAttribute('tabindex', '0');
            face.setAttribute('aria-label', f.title + ' — ' + f.sub);

            face.innerHTML = ''
                + '<div class="face-header">'
                +   '<span class="face-num">' + f.num + ' / 06</span>'
                +   '<span class="face-cat">' + f.cat + '</span>'
                + '</div>'
                + '<span class="face-glyph">' + f.glyph + '</span>'
                + '<div class="face-body">'
                +   '<h3 class="face-title">' + f.title + '</h3>'
                +   '<span class="face-sub">' + f.sub + '</span>'
                + '</div>'
                + '<div class="face-footer">'
                +   '<span>' + f.year + '</span>'
                +   '<span class="face-arrow">'
                +     '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                +       '<path d="M7 17L17 7M17 7H7M17 7v10"/>'
                +     '</svg>'
                +   '</span>'
                + '</div>';

            /* 面内鼠标光泽跟随 */
            face.addEventListener('mousemove', function (e) {
                var rect = face.getBoundingClientRect();
                var fx = ((e.clientX - rect.left) / rect.width) * 100;
                var fy = ((e.clientY - rect.top) / rect.height) * 100;
                face.style.setProperty('--fx', fx + '%');
                face.style.setProperty('--fy', fy + '%');
            });

            /* 点击面: 旋转至该面 */
            face.addEventListener('click', function (e) {
                e.stopPropagation();
                if (justDragged) return;
                snapToFace(i);
            });

            cube.appendChild(face);
        });
    }

    /* =====================================================================
       === 构建面导航 ===
       ===================================================================== */

    function buildNav() {
        FACES.forEach(function (f, i) {
            var btn = document.createElement('button');
            btn.className = 'face-nav-btn' + (i === 0 ? ' active' : '');
            btn.setAttribute('data-index', i);
            btn.setAttribute('aria-label', '查看 ' + f.title);
            btn.innerHTML = '<span class="face-nav-num">' + f.num + '</span><span>' + f.glyph + '</span>';
            btn.addEventListener('click', function () {
                snapToFace(i);
                spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
            });
            faceNav.appendChild(btn);
        });
    }

    /* =====================================================================
       === 应用旋转 ===
       ===================================================================== */

    function applyRotation() {
        cube.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    }

    function applyParallax() {
        cubeTilt.style.transform = 'scale(1) rotateX(' + parallaxY + 'deg) rotateY(' + parallaxX + 'deg)';
    }

    /* =====================================================================
       === 拖拽交互 ===
       ===================================================================== */

    /* 记录刚结束拖拽, 用于区分点击 */
    var justDragged = false;
    var dragTimer = null;

    function onPointerDown(e) {
        isDragging = true;
        justDragged = false;
        document.body.classList.add('dragging');
        cube.classList.remove('snapping');
        isAnimating = false;

        var p = getPoint(e);
        dragStartX = p.x;
        dragStartY = p.y;
        lastDragX = p.x;
        lastDragY = p.y;
        lastDragTime = performance.now();
        velX = 0;
        velY = 0;

        cubeScene.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        var p = getPoint(e);
        var dx = p.x - lastDragX;
        var dy = p.y - lastDragY;
        var now = performance.now();
        var dt = Math.max(1, now - lastDragTime);

        /* 旋转: 水平拖拽 -> Y轴, 垂直拖拽 -> X轴. 灵敏度 0.4 */
        rotY += dx * 0.4;
        rotX -= dy * 0.4;
        /* 限制 X 轴避免翻转溢出 */
        rotX = clamp(rotX, -89, 89);

        /* 计算速度 (deg/ms) 用于惯性 */
        velX = -dy * 0.4 / dt * 16;
        velY = dx * 0.4 / dt * 16;

        applyRotation();
        updateActiveFaceFromRotation();

        lastDragX = p.x;
        lastDragY = p.y;
        lastDragTime = now;
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('dragging');

        /* 标记刚拖拽过 (短时间) */
        justDragged = true;
        clearTimeout(dragTimer);
        dragTimer = setTimeout(function () { justDragged = false; }, 100);

        /* 启动惯性 + 弹簧归位 */
        startInertia();
    }

    function getPoint(e) {
        return { x: e.clientX, y: e.clientY };
    }

    /* =====================================================================
       === 惯性 + 弹簧归位循环 ===
       ===================================================================== */

    function startInertia() {
        isAnimating = true;

        function step() {
            if (!isAnimating) return;

            /* 惯性衰减 */
            velX *= 0.92;
            velY *= 0.92;
            rotX += velX;
            rotY += velY;
            rotX = clamp(rotX, -89, 89);

            applyRotation();
            updateActiveFaceFromRotation();

            /* 当速度足够小, 切换到弹簧归位 */
            var speed = Math.abs(velX) + Math.abs(velY);
            if (speed < 0.3) {
                snapToNearestFace();
                return;
            }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* =====================================================================
       === 弹簧归位到最近的面 ===
       ===================================================================== */

    function snapToNearestFace() {
        var nearest = findNearestFace();
        snapToFace(nearest, true);
    }

    function findNearestFace() {
        var bestIdx = 0;
        var bestDist = Infinity;

        FACE_ORDER.forEach(function (pos, i) {
            var target = FACE_ROTATIONS[pos];
            /* 计算与目标角度的最短角距 (考虑 Y 轴周期 360) */
            var dx = angularDist(rotX, target.x);
            var dy = angularDistY(rotY, target.y);
            var dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        });
        return bestIdx;
    }

    function snapToFace(idx, fromInertia) {
        isAnimating = true;
        var pos = FACE_ORDER[idx];
        var target = FACE_ROTATIONS[pos];

        /* 规范化 Y 角度: 取最短路径 */
        var targetY = nearestEquivalentAngle(rotY, target.y);
        var targetX = target.x;

        cube.classList.add('snapping');

        /* 使用 CSS transition, 监听 transitionend 结束动画状态 */
        rotX = targetX;
        rotY = targetY;
        applyRotation();

        setActiveFace(idx);

        /* 保险: 一段时间后清理动画状态 */
        setTimeout(function () {
            isAnimating = false;
            cube.classList.remove('snapping');
        }, 950);
    }

    /* =====================================================================
       === 角度辅助函数 ===
       ===================================================================== */

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    /* X 轴角度差 (无周期) */
    function angularDist(a, b) {
        return a - b;
    }

    /* Y 轴最短角距 (360 周期) */
    function angularDistY(a, b) {
        var d = ((a - b) % 360 + 540) % 360 - 180;
        return d;
    }

    /* 找到与当前角度等价且最接近的目标角度 */
    function nearestEquivalentAngle(current, target) {
        var diff = target - (current % 360);
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return current + diff;
    }

    /* =====================================================================
       === 根据 当前旋转 更新激活面 (拖拽/惯性时) ===
       ===================================================================== */

    function updateActiveFaceFromRotation() {
        var nearest = findNearestFace();
        if (nearest !== activeFaceIdx) {
            setActiveFace(nearest);
        }
    }

    function setActiveFace(idx) {
        if (idx === activeFaceIdx && FACES[idx]) {
            /* 仍刷新详情面板内容 */
        }
        activeFaceIdx = idx;
        var f = FACES[idx];

        /* 更新导航 */
        var btns = faceNav.querySelectorAll('.face-nav-btn');
        btns.forEach(function (b, i) {
            b.classList.toggle('active', i === idx);
        });

        /* 更新 HUD */
        hudDot.classList.add('active');
        hudText.textContent = f.title + ' · ' + f.sub;

        /* 更新计数器 */
        faceCounter.textContent = idx + 1;

        /* 更新详情面板 (带淡入动效) */
        updateDetail(f);
    }

    /* =====================================================================
       === 更新详情面板 ===
       ===================================================================== */

    var isFirstDetailUpdate = true;

    function updateDetail(f) {
        var panel = document.getElementById('detail-panel');

        /* 首次渲染直接填充, 不做淡入动效 */
        if (isFirstDetailUpdate) {
            isFirstDetailUpdate = false;
            fillDetail(f);
            return;
        }

        /* 淡出再淡入 */
        panel.style.opacity = '0.4';
        panel.style.transform = 'translateY(6px)';

        setTimeout(function () {
            fillDetail(f);
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        }, 180);
    }

    function fillDetail(f) {
        detailIndex.textContent = f.num;
        detailCat.textContent = f.cat;
        detailTitle.textContent = f.title;
        detailDesc.textContent = f.desc;
        detailYear.textContent = f.year;
        detailStack.textContent = f.stack;
        detailRole.textContent = f.role;

        detailTags.innerHTML = '';
        f.tags.forEach(function (t) {
            var chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.textContent = t;
            detailTags.appendChild(chip);
        });
    }

    /* =====================================================================
       === 鼠标视差倾斜 ===
       ===================================================================== */

    function bindParallax() {
        window.addEventListener('mousemove', function (e) {
            if (isDragging) return;
            var cx = window.innerWidth / 2;
            var cy = window.innerHeight / 2;
            var dx = (e.clientX - cx) / cx;
            var dy = (e.clientY - cy) / cy;
            /* 视差幅度小 (±6deg) */
            parallaxX = dx * 6;
            parallaxY = -dy * 4;
        });
    }

    function animateParallax() {
        /* 平滑插值 */
        var curX = parseFloat(cubeTilt.dataset.px || '0');
        var curY = parseFloat(cubeTilt.dataset.py || '0');
        curX += (parallaxX - curX) * 0.06;
        curY += (parallaxY - curY) * 0.06;
        cubeTilt.dataset.px = curX;
        cubeTilt.dataset.py = curY;

        if (!isDragging) {
            cubeTilt.style.transform = 'scale(1) rotateX(' + curY + 'deg) rotateY(' + curX + 'deg)';
        }
        requestAnimationFrame(animateParallax);
    }

    /* =====================================================================
       === 光标光晕 ===
       ===================================================================== */

    var glowX = window.innerWidth / 2;
    var glowY = window.innerHeight / 2;
    var targetGlowX = glowX;
    var targetGlowY = glowY;

    function bindCursorGlow() {
        window.addEventListener('mousemove', function (e) {
            targetGlowX = e.clientX;
            targetGlowY = e.clientY;
            cursorGlow.classList.add('visible');
        });
        window.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('visible');
        });
    }

    function animateGlow() {
        glowX += (targetGlowX - glowX) * 0.12;
        glowY += (targetGlowY - glowY) * 0.12;
        cursorGlow.style.transform = 'translate(' + glowX + 'px, ' + glowY + 'px) translate(-50%, -50%)';
        requestAnimationFrame(animateGlow);
    }

    /* =====================================================================
       === 涟漪 ===
       ===================================================================== */

    function spawnRipple(x, y) {
        var r = document.createElement('div');
        r.className = 'ripple';
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        rippleLayer.appendChild(r);
        setTimeout(function () {
            if (r.parentNode) r.parentNode.removeChild(r);
        }, 950);
    }

    /* =====================================================================
       === 氛围配色 ===
       ===================================================================== */

    function bindPalette() {
        paletteDots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                paletteDots.forEach(function (d) { d.classList.remove('active'); });
                dot.classList.add('active');
                var p = dot.getAttribute('data-palette');
                document.documentElement.setAttribute('data-palette', p);
                spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
            });
        });
    }

    /* =====================================================================
       === 粒子流场 ===
       ===================================================================== */

    var particles = [];
    var PARTICLE_COUNT = 46;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.6 + 0.4,
                a: Math.random() * 0.4 + 0.15
            });
        }
    }

    var mousePx = -9999, mousePy = -9999;
    window.addEventListener('mousemove', function (e) {
        mousePx = e.clientX;
        mousePy = e.clientY;
    });

    function getAccentRgb() {
        var v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        var m = v.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (!m) return '122, 240, 200';
        return parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16);
    }

    function drawParticles() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var accent = getAccentRgb();

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            /* 鼠标引力 */
            var dx = mousePx - p.x;
            var dy = mousePy - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 0.1) {
                var force = (180 - dist) / 180 * 0.04;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
            /* 阻尼 */
            p.vx *= 0.985;
            p.vy *= 0.985;

            /* 边界回绕 */
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + accent + ', ' + p.a + ')';
            ctx.fill();
        }

        /* 近邻连线 */
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var pa = particles[a], pb = particles[b];
                var ddx = pa.x - pb.x, ddy = pa.y - pb.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 110) {
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb.x, pb.y);
                    ctx.strokeStyle = 'rgba(' + accent + ', ' + (0.12 * (1 - d / 110)) + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    /* =====================================================================
       === 入场动画 ===
       ===================================================================== */

    function staggerEnter() {
        setTimeout(function () {
            cubeTilt.classList.add('entered');
        }, 200);
        setTimeout(function () {
            faceNav.classList.add('entered');
        }, 400);
    }

    function bindReveal() {
        var reveals = document.querySelectorAll('.reveal');
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        reveals.forEach(function (el) { io.observe(el); });
    }

    /* =====================================================================
       === 键盘导航 ===
       ===================================================================== */

    function bindKeyboard() {
        window.addEventListener('keydown', function (e) {
            var next = activeFaceIdx;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                next = (activeFaceIdx + 1) % 6;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                next = (activeFaceIdx + 5) % 6;
            } else if (e.key === 'Enter' || e.key === ' ') {
                snapToFace(activeFaceIdx);
                return;
            } else {
                return;
            }
            e.preventDefault();
            snapToFace(next);
        });
    }

    /* =====================================================================
       === 初始化 ===
       ===================================================================== */

    function init() {
        buildFaces();
        buildNav();
        applyRotation();
        setActiveFace(0);

        /* 拖拽绑定 (Pointer Events 统一鼠标/触摸) */
        cubeScene.addEventListener('pointerdown', onPointerDown);
        cubeScene.addEventListener('pointermove', onPointerMove);
        cubeScene.addEventListener('pointerup', onPointerUp);
        cubeScene.addEventListener('pointercancel', onPointerUp);

        /* 阻止默认触摸滚动 */
        cubeScene.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
        cubeScene.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

        bindParallax();
        bindCursorGlow();
        bindPalette();
        bindKeyboard();

        /* 粒子 */
        resizeCanvas();
        initParticles();
        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        animateGlow();
        animateParallax();
        drawParticles();
        staggerEnter();
        bindReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
