/**
 * ==========================================================================
 * Blender Camera Gallery · 景别画廊
 * 模拟 Blender 视口的镜头切换体验
 *   - 3D 轨道相机轮播（拖拽 + 惯性 + 弹簧归位）
 *   - 点击聚焦景别（参数面板联动）
 *   - 粒子流场背景
 *   - 4 种氛围配色切换
 *   - 涟漪冲击波 + 光标光晕
 * ==========================================================================
 */

(function () {
    'use strict';

    // === 配色调色板 =========================================================
    const PALETTES = {
        aurora: { rgb: '122, 240, 200', c1: '#7af0c8', c2: '#6a9cf0', c3: '#c4a8f0' },
        ember:  { rgb: '240, 160, 122', c1: '#f0a07a', c2: '#f0c44a', c3: '#f06a6a' },
        abyss:  { rgb: '122, 168, 240', c1: '#7aa8f0', c2: '#4ac8f0', c3: '#7af0d8' },
        orchid: { rgb: '180, 136, 240', c1: '#b488f0', c2: '#f088d0', c3: '#88b8f0' }
    };

    // === 镜头数据 ===========================================================
    const CAMERAS = [
        {
            id: 'CAM_01', shot: 'Wide Establish', focal: '24mm', aperture: 'f/8.0',
            exposure: '1/125', angle: '15°',
            focalPct: 30, aperturePct: 85, exposurePct: 60, anglePct: 16,
            desc: '广角建立镜头。将整个场景收入画框，交代空间关系与时间氛围，是叙事的起点。',
            tags: ['Wide', 'Landscape', 'Storytelling'],
            scene: 'establish'
        },
        {
            id: 'CAM_02', shot: 'Medium Follow', focal: '50mm', aperture: 'f/4.0',
            exposure: '1/250', angle: '42°',
            focalPct: 50, aperturePct: 55, exposurePct: 75, anglePct: 46,
            desc: '中景跟随镜头。与主体保持呼吸距离，既见环境又见表情，是叙事的中流砥柱。',
            tags: ['Medium', 'Character', 'Tracking'],
            scene: 'follow'
        },
        {
            id: 'CAM_03', shot: 'Close Emotion', focal: '85mm', aperture: 'f/1.8',
            exposure: '1/500', angle: '68°',
            focalPct: 72, aperturePct: 28, exposurePct: 88, anglePct: 75,
            desc: '特写情绪镜头。浅景深剥离背景，让眼神与微表情成为唯一焦点，凝固情感瞬间。',
            tags: ['Close-up', 'Emotion', 'Bokeh'],
            scene: 'closeup'
        },
        {
            id: 'CAM_04', shot: 'Dutch Tilt', focal: '35mm', aperture: 'f/2.8',
            exposure: '1/200', angle: '88°',
            focalPct: 42, aperturePct: 40, exposurePct: 68, anglePct: 98,
            desc: '荷兰角倾斜镜头。打破水平稳定，制造不安与张力，常用于高潮与心理失衡的暗示。',
            tags: ['Dutch', 'Tension', 'Dynamic'],
            scene: 'dutch'
        },
        {
            id: 'CAM_05', shot: 'Top Down', focal: '28mm', aperture: 'f/5.6',
            exposure: '1/160', angle: '90°',
            focalPct: 36, aperturePct: 70, exposurePct: 62, anglePct: 100,
            desc: '俯瞰上帝视角。从正上方凝视，化繁为简，将纷乱的场景读解为几何秩序与图谱。',
            tags: ['Overhead', 'Pattern', 'God View'],
            scene: 'topdown'
        },
        {
            id: 'CAM_06', shot: 'Low Hero', focal: '70mm', aperture: 'f/2.0',
            exposure: '1/400', angle: '55°',
            focalPct: 65, aperturePct: 32, exposurePct: 82, anglePct: 61,
            desc: '低角度英雄镜头。仰视赋予主体崇高感与力量感，是英雄登场与胜利时刻的不二之选。',
            tags: ['Low Angle', 'Hero', 'Power'],
            scene: 'lowhero'
        }
    ];

    // === DOM 元素 ===========================================================
    const dom = {
        body: document.body,
        carousel: document.getElementById('orbit-carousel'),
        tilt: document.getElementById('orbit-tilt'),
        scene: document.getElementById('viewport-scene'),
        prev: document.getElementById('orbit-prev'),
        next: document.getElementById('orbit-next'),
        indexEl: document.getElementById('orbit-index'),
        totalEl: document.getElementById('orbit-total'),
        shotCounter: document.getElementById('shot-counter'),
        shotSelector: document.getElementById('shot-selector'),
        lensId: document.getElementById('lens-id'),
        lensTitle: document.getElementById('lens-title'),
        lensDesc: document.getElementById('lens-desc'),
        lensTags: document.getElementById('lens-tags'),
        lensFocal: document.getElementById('lens-focal'),
        lensAperture: document.getElementById('lens-aperture'),
        lensExposure: document.getElementById('lens-exposure'),
        lensAngle: document.getElementById('lens-angle'),
        barFocal: document.getElementById('bar-focal'),
        barAperture: document.getElementById('bar-aperture'),
        barExposure: document.getElementById('bar-exposure'),
        barAngle: document.getElementById('bar-angle'),
        paletteDots: document.querySelectorAll('.palette-dot'),
        cursorGlow: document.getElementById('cursor-glow'),
        rippleLayer: document.getElementById('ripple-layer'),
        canvas: document.getElementById('particle-canvas'),
        revealEls: document.querySelectorAll('.reveal'),
        hudText: document.getElementById('hud-text')
    };

    // === 状态 ===============================================================
    const state = {
        palette: 'aurora',
        current: 0,
        rotation: 0,          // 当前轮播旋转角度 (deg)
        targetRotation: 0,    // 目标旋转
        velocity: 0,          // 拖拽惯性速度
        isDragging: false,
        lastX: 0,
        lastY: 0,
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        tiltX: 0,
        tiltY: 0,
        radius: 320           // 轨道半径
    };

    const TOTAL = CAMERAS.length;
    const ANGLE_STEP = 360 / TOTAL;

    // === 工具函数 ===========================================================
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // === 预览 SVG 生成器 ====================================================
    function makePreviewSVG(scene, colors) {
        const { c1, c2, c3 } = colors;
        const scenes = {
            establish: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <defs><linearGradient id="sky-${scene}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="${c2}" stop-opacity="0.5"/>
                        <stop offset="1" stop-color="${c1}" stop-opacity="0.15"/>
                    </linearGradient></defs>
                    <rect width="200" height="140" fill="url(#sky-${scene})"/>
                    <circle cx="150" cy="35" r="18" fill="${c3}" opacity="0.4"/>
                    <path d="M0 95 L40 60 L75 80 L110 50 L150 75 L200 55 L200 140 L0 140 Z" fill="${c1}" opacity="0.25"/>
                    <path d="M0 110 L50 85 L100 100 L150 80 L200 95 L200 140 L0 140 Z" fill="${c2}" opacity="0.3"/>
                </svg>`,
            follow: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <defs><radialGradient id="bg-${scene}" cx="0.5" cy="0.4">
                        <stop offset="0" stop-color="${c1}" stop-opacity="0.3"/>
                        <stop offset="1" stop-color="${c2}" stop-opacity="0.05"/>
                    </radialGradient></defs>
                    <rect width="200" height="140" fill="url(#bg-${scene})"/>
                    <ellipse cx="100" cy="130" rx="50" ry="8" fill="${c3}" opacity="0.15"/>
                    <path d="M85 50 Q85 35 100 35 Q115 35 115 50 L115 95 Q115 105 100 105 Q85 105 85 95 Z" fill="${c1}" opacity="0.4"/>
                    <circle cx="100" cy="42" r="10" fill="${c2}" opacity="0.5"/>
                </svg>`,
            closeup: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <defs><radialGradient id="bokeh-${scene}" cx="0.5" cy="0.45">
                        <stop offset="0" stop-color="${c3}" stop-opacity="0.5"/>
                        <stop offset="0.6" stop-color="${c1}" stop-opacity="0.15"/>
                        <stop offset="1" stop-color="${c2}" stop-opacity="0.02"/>
                    </radialGradient></defs>
                    <rect width="200" height="140" fill="url(#bokeh-${scene})"/>
                    <circle cx="60" cy="40" r="8" fill="${c1}" opacity="0.2"/>
                    <circle cx="155" cy="80" r="12" fill="${c2}" opacity="0.15"/>
                    <circle cx="170" cy="30" r="5" fill="${c3}" opacity="0.3"/>
                    <ellipse cx="100" cy="70" rx="32" ry="40" fill="${c1}" opacity="0.35"/>
                    <circle cx="88" cy="60" r="4" fill="${c3}" opacity="0.7"/>
                    <circle cx="112" cy="60" r="4" fill="${c3}" opacity="0.7"/>
                </svg>`,
            dutch: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <g transform="rotate(18 100 70)">
                        <rect x="-20" y="-20" width="240" height="180" fill="${c2}" opacity="0.1"/>
                        <path d="M-20 80 L100 40 L220 80 L220 160 L-20 160 Z" fill="${c1}" opacity="0.25"/>
                        <path d="M-20 100 L60 75 L140 95 L220 80 L220 160 L-20 160 Z" fill="${c3}" opacity="0.2"/>
                        <line x1="100" y1="20" x2="100" y2="160" stroke="${c1}" stroke-width="1" opacity="0.3"/>
                    </g>
                </svg>`,
            topdown: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <rect width="200" height="140" fill="${c2}" opacity="0.08"/>
                    ${Array.from({ length: 5 }, (_, i) =>
                        Array.from({ length: 7 }, (_, j) => {
                            const x = 20 + j * 26;
                            const y = 20 + i * 22;
                            const r = 4 + (i + j) % 3;
                            const col = [c1, c2, c3][(i + j) % 3];
                            return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${0.2 + ((i*j)%3)*0.1}"/>`;
                        }).join('')
                    ).join('')}
                    <circle cx="100" cy="70" r="40" fill="none" stroke="${c1}" stroke-width="1" opacity="0.3"/>
                    <circle cx="100" cy="70" r="20" fill="none" stroke="${c3}" stroke-width="1" opacity="0.4"/>
                </svg>`,
            lowhero: `
                <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
                    <defs><linearGradient id="low-${scene}" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stop-color="${c1}" stop-opacity="0.4"/>
                        <stop offset="0.6" stop-color="${c2}" stop-opacity="0.15"/>
                        <stop offset="1" stop-color="${c3}" stop-opacity="0.05"/>
                    </linearGradient></defs>
                    <rect width="200" height="140" fill="url(#low-${scene})"/>
                    <path d="M0 120 L200 120 L200 140 L0 140 Z" fill="${c3}" opacity="0.2"/>
                    <path d="M70 140 L70 70 Q70 50 100 50 Q130 50 130 70 L130 140 Z" fill="${c1}" opacity="0.45"/>
                    <circle cx="100" cy="55" r="16" fill="${c2}" opacity="0.5"/>
                    <path d="M0 122 L200 122" stroke="${c1}" stroke-width="0.5" opacity="0.4" stroke-dasharray="4 4"/>
                </svg>`
        };
        return scenes[scene] || scenes.establish;
    }

    // === 渲染相机卡片 =======================================================
    function renderCameras() {
        const colors = PALETTES[state.palette];
        dom.carousel.innerHTML = '';
        CAMERAS.forEach((cam, i) => {
            const angle = i * ANGLE_STEP;
            const card = document.createElement('div');
            card.className = 'cam-card';
            card.dataset.index = i;
            card.style.transform = `rotateY(${angle}deg) translateZ(${state.radius}px)`;
            card.innerHTML = `
                <div class="cam-preview">
                    ${makePreviewSVG(cam.scene, colors)}
                    <span class="cam-id">${cam.id}</span>
                    <span class="cam-corner tl"></span>
                    <span class="cam-corner br"></span>
                </div>
                <div class="cam-info">
                    <span class="cam-shot">${cam.shot}</span>
                    <span class="cam-focal">${cam.focal} · ${cam.aperture}</span>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (state.isDragging || Math.abs(state.velocity) > 0.5) return;
                e.stopPropagation();
                focusCamera(i);
                spawnRipple(e.clientX, e.clientY);
            });
            dom.carousel.appendChild(card);
        });
    }

    // === 景别选择器 =========================================================
    function renderShotSelector() {
        dom.shotSelector.innerHTML = '';
        CAMERAS.forEach((cam, i) => {
            const chip = document.createElement('button');
            chip.className = 'shot-chip' + (i === state.current ? ' active' : '');
            chip.textContent = cam.shot;
            chip.addEventListener('click', () => focusCamera(i));
            dom.shotSelector.appendChild(chip);
        });
    }

    // === 聚焦镜头 ===========================================================
    function focusCamera(index) {
        state.current = ((index % TOTAL) + TOTAL) % TOTAL;
        state.targetRotation = -state.current * ANGLE_STEP;
        updateUI();
    }

    // === 更新 UI ============================================================
    function updateUI() {
        const cam = CAMERAS[state.current];
        const pad = (n) => String(n).padStart(2, '0');

        dom.indexEl.textContent = pad(state.current + 1);
        dom.totalEl.textContent = pad(TOTAL);
        dom.shotCounter.textContent = state.current + 1;

        // 详情面板淡出再淡入
        const fadingEls = [dom.lensTitle, dom.lensDesc, dom.lensFocal, dom.lensAperture, dom.lensExposure, dom.lensAngle];
        fadingEls.forEach(el => el.classList.add('fading'));

        setTimeout(() => {
            dom.lensId.textContent = cam.id;
            dom.lensTitle.textContent = cam.shot;
            dom.lensDesc.textContent = cam.desc;
            dom.lensFocal.textContent = cam.focal;
            dom.lensAperture.textContent = cam.aperture;
            dom.lensExposure.textContent = cam.exposure;
            dom.lensAngle.textContent = cam.angle;

            dom.lensTags.innerHTML = cam.tags.map(t => `<span class="lens-tag">${t}</span>`).join('');

            dom.barFocal.style.width = cam.focalPct + '%';
            dom.barAperture.style.width = cam.aperturePct + '%';
            dom.barExposure.style.width = cam.exposurePct + '%';
            dom.barAngle.style.width = cam.anglePct + '%';

            fadingEls.forEach(el => el.classList.remove('fading'));
        }, 200);

        // 卡片聚焦态
        const cards = dom.carousel.querySelectorAll('.cam-card');
        cards.forEach((c, i) => c.classList.toggle('focused', i === state.current));

        // 选择器激活态
        const chips = dom.shotSelector.querySelectorAll('.shot-chip');
        chips.forEach((c, i) => c.classList.toggle('active', i === state.current));

        dom.hudText.textContent = `${cam.id} · ${cam.shot}`;
    }

    // === 拖拽交互 ===========================================================
    function setupDrag() {
        let startTime = 0;

        const onDown = (x, y) => {
            state.isDragging = true;
            state.lastX = x;
            state.lastY = y;
            state.velocity = 0;
            startTime = performance.now();
            dom.scene.classList.add('dragging');
        };

        const onMove = (x, y) => {
            if (!state.isDragging) return;
            const dx = x - state.lastX;
            state.rotation += dx * 0.5;
            state.targetRotation = state.rotation;
            state.velocity = dx * 0.5;
            state.lastX = x;
            state.lastY = y;
        };

        const onUp = () => {
            if (!state.isDragging) return;
            state.isDragging = false;
            dom.scene.classList.remove('dragging');

            // 惯性 + 吸附到最近镜头
            const snapTarget = Math.round(state.rotation / -ANGLE_STEP);
            state.current = ((snapTarget % TOTAL) + TOTAL) % TOTAL;
            state.targetRotation = -state.current * ANGLE_STEP;
            updateUI();
        };

        // Mouse
        dom.scene.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onUp);

        // Touch
        dom.scene.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onDown(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (!state.isDragging) return;
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchend', onUp);

        // 滚轮
        dom.scene.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0 || e.deltaX > 0) {
                focusCamera(state.current + 1);
            } else {
                focusCamera(state.current - 1);
            }
        }, { passive: false });
    }

    // === 倾斜跟随鼠标 =======================================================
    function setupTilt() {
        window.addEventListener('mousemove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
        });
    }

    // === 导航按钮 ===========================================================
    function setupNav() {
        dom.prev.addEventListener('click', () => {
            focusCamera(state.current - 1);
            spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
        });
        dom.next.addEventListener('click', () => {
            focusCamera(state.current + 1);
            spawnRipple(window.innerWidth / 2, window.innerHeight / 2);
        });

        // 键盘
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') { focusCamera(state.current - 1); }
            else if (e.key === 'ArrowRight') { focusCamera(state.current + 1); }
        });
    }

    // === 配色切换 ===========================================================
    function setupPalette() {
        dom.paletteDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const p = dot.dataset.palette;
                if (p === state.palette) return;
                state.palette = p;
                dom.body.dataset.palette = p;
                dom.paletteDots.forEach(d => d.classList.toggle('active', d === dot));

                const colors = PALETTES[p];
                dom.body.style.setProperty('--accent-rgb', colors.rgb);
                renderCameras();
                updateUI();
            });
        });
        // 初始 rgb
        dom.body.style.setProperty('--accent-rgb', PALETTES[state.palette].rgb);
    }

    // === 涟漪冲击波 =========================================================
    function spawnRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        dom.rippleLayer.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1300);
    }

    // === 光标光晕 ===========================================================
    function setupCursorGlow() {
        let glowX = window.innerWidth / 2;
        let glowY = window.innerHeight / 2;

        function updateGlow() {
            glowX = lerp(glowX, state.mouseX, 0.12);
            glowY = lerp(glowY, state.mouseY, 0.12);
            dom.cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px)`;
            requestAnimationFrame(updateGlow);
        }
        updateGlow();
    }

    // === 粒子流场 ===========================================================
    function setupParticles() {
        const canvas = dom.canvas;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let w, h;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            const count = Math.min(80, Math.floor(w * h / 18000));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                life: Math.random(),
                hue: Math.random()
            }));
        }
        resize();
        window.addEventListener('resize', resize);

        function tick() {
            ctx.clearRect(0, 0, w, h);
            const colors = PALETTES[state.palette];

            particles.forEach(p => {
                // Simplex-like flow field (sin/cos approximation)
                const t = performance.now() * 0.0003;
                const fx = Math.sin(p.y * 0.005 + t) * 0.15;
                const fy = Math.cos(p.x * 0.005 + t) * 0.15;
                p.vx = lerp(p.vx, fx, 0.02);
                p.vy = lerp(p.vy, fy, 0.02);

                // 鼠标力场
                const dx = state.mouseX - p.x;
                const dy = state.mouseY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (1 - dist / 200) * 0.3;
                    p.vx += (dx / dist) * force * 0.02;
                    p.vy += (dy / dist) * force * 0.02;
                }

                p.x += p.vx;
                p.y += p.vy;
                p.life += 0.005;

                // 边界环绕
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                const alpha = (Math.sin(p.life * Math.PI) + 1) * 0.5 * 0.5;
                const col = p.hue < 0.33 ? colors.c1 : p.hue < 0.66 ? colors.c2 : colors.c3;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.globalAlpha = alpha;
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            requestAnimationFrame(tick);
        }
        tick();
    }

    // === 主循环：旋转 + 倾斜 ================================================
    function animationLoop() {
        // 旋转：拖拽中直接用 rotation，否则向 targetRotation 弹簧逼近
        if (!state.isDragging) {
            // 惯性衰减
            if (Math.abs(state.velocity) > 0.01) {
                state.rotation += state.velocity;
                state.velocity *= 0.92;
                state.targetRotation = state.rotation;
            } else {
                // 弹簧归位到 targetRotation
                state.rotation = lerp(state.rotation, state.targetRotation, 0.08);
            }
        }

        dom.carousel.style.transform = `rotateY(${state.rotation}deg)`;

        // 倾斜跟随鼠标（视差）
        const targetTiltY = ((state.mouseX / window.innerWidth) - 0.5) * 16;
        const targetTiltX = -((state.mouseY / window.innerHeight) - 0.5) * 10;
        state.tiltX = lerp(state.tiltX, targetTiltX, 0.05);
        state.tiltY = lerp(state.tiltY, targetTiltY, 0.05);
        dom.tilt.style.transform = `rotateX(${state.tiltX}deg) rotateY(${state.tiltY}deg)`;

        requestAnimationFrame(animationLoop);
    }

    // === Intersection Observer 入场 ========================================
    function setupReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        dom.revealEls.forEach(el => observer.observe(el));
    }

    // === 启动 ===============================================================
    function init() {
        renderCameras();
        renderShotSelector();
        setupDrag();
        setupTilt();
        setupNav();
        setupPalette();
        setupCursorGlow();
        setupParticles();
        setupReveal();
        updateUI();
        animationLoop();

        // 自动旋转一圈作为开场（延迟）
        setTimeout(() => {
            if (!state.isDragging && Math.abs(state.velocity) < 0.1) {
                state.rotation = -360;
                state.targetRotation = 0;
                state.current = 0;
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
