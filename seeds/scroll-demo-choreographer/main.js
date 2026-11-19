/* ============================================================
   Scroll Demo Choreographer · 滚动演示编舞家
   滚动速度即编舞指令 —— 七幕微交互演出
   零构建 · Vanilla JS
   ============================================================ */

(() => {
    'use strict';

    // === 配置与常量 ===
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const SCRAMBLE_GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789♪♩♫↯◈≋';
    const THEME_NAMES = { aurora: 'AURORA', ember: 'EMBER', ocean: 'OCEAN', void: 'VOID' };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    // === DOM Elements ===
    const canvas = document.getElementById('particle-field');
    const ctx = canvas.getContext('2d');
    const progressFill = document.getElementById('progress-fill');
    const sectionDotsEl = document.getElementById('section-dots');
    const themeSwitcher = document.getElementById('theme-switcher');
    const velocityValue = document.getElementById('velocity-value');
    const velocityBar = document.getElementById('velocity-bar');
    const cueValue = document.getElementById('cue-value');
    const charCascade = document.getElementById('char-cascade');
    const pulseGrid = document.getElementById('pulse-grid');
    const timelineFill = document.getElementById('timeline-fill');
    const statDistance = document.getElementById('stat-distance');
    const statPeak = document.getElementById('stat-peak');
    const statCues = document.getElementById('stat-cues');
    const statTheme = document.getElementById('stat-theme');
    const replayBtn = document.getElementById('replay-btn');
    const scenes = Array.from(document.querySelectorAll('.scene'));
    const milestones = Array.from(document.querySelectorAll('.milestone'));

    // === 全局状态 ===
    const state = {
        scrollY: window.scrollY,
        lastScrollY: window.scrollY,
        velocity: 0,          // 平滑后的滚动速度 (px/frame)
        rawVelocity: 0,
        totalDistance: 0,
        peakVelocity: 0,
        progress: 0,          // 0~1 页面进度
        litMilestones: new Set(),
        theme: 'aurora',
        w: 0,
        h: 0,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
    };

    /* ============================================================
       Module: ParticleField · 粒子流场（速度驱动能量）
       ============================================================ */
    const ParticleField = (() => {
        let particles = [];

        function resize() {
            canvas.width = state.w * state.dpr;
            canvas.height = state.h * state.dpr;
            canvas.style.width = state.w + 'px';
            canvas.style.height = state.h + 'px';
            ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        }

        function spawn() {
            const count = Math.floor(clamp(state.w * state.h / 22000, 40, 110));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * state.w,
                y: Math.random() * state.h,
                vx: 0,
                vy: 0,
                size: Math.random() * 1.8 + 0.6,
                phase: Math.random() * Math.PI * 2
            }));
        }

        function update(t, accent, accent2) {
            ctx.clearRect(0, 0, state.w, state.h);
            const energy = clamp(Math.abs(state.velocity) / 40, 0, 1);

            for (const p of particles) {
                // 噪声流场：双频正弦近似
                const nx = Math.sin(p.y * 0.004 + t * 0.0003 + p.phase) * 0.3;
                const ny = Math.cos(p.x * 0.003 + t * 0.0002) * 0.2;

                p.vx = lerp(p.vx, nx + energy * Math.sin(t * 0.001 + p.phase) * 1.6, 0.04);
                p.vy = lerp(p.vy, ny - Math.abs(state.velocity) * 0.012 * Math.sign(state.velocity || 1), 0.05);

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -10) p.x = state.w + 10;
                if (p.x > state.w + 10) p.x = -10;
                if (p.y < -10) p.y = state.h + 10;
                if (p.y > state.h + 10) p.y = -10;

                const alpha = 0.18 + energy * 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1 + energy), 0, Math.PI * 2);
                ctx.fillStyle = (p.phase % 2 > 1 ? accent : accent2) + '';
                ctx.globalAlpha = alpha;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        return { resize, spawn, update };
    })();

    /* ============================================================
       Module: ScrollEngine · 速度采样与进度
       ============================================================ */
    const ScrollEngine = (() => {
        function sample() {
            state.lastScrollY = state.scrollY;
            state.scrollY = window.scrollY;

            const delta = state.scrollY - state.lastScrollY;
            state.totalDistance += Math.abs(delta);

            state.rawVelocity = delta;
            // 指数平滑：快起的能量，缓慢地衰减
            state.velocity = lerp(state.velocity, delta, 0.12);
            state.peakVelocity = Math.max(state.peakVelocity, Math.abs(state.velocity));

            const max = document.documentElement.scrollHeight - state.h;
            state.progress = max > 0 ? clamp(state.scrollY / max, 0, 1) : 0;
        }
        return { sample };
    })();

    /* ============================================================
       Module: HUD · 遥测面板
       ============================================================ */
    const HUD = (() => {
        function update() {
            const v = Math.abs(state.velocity);
            velocityValue.textContent = v.toFixed(2);
            velocityBar.style.width = clamp(v / 60 * 100, 0, 100) + '%';
        }
        return { update };
    })();

    /* ============================================================
       Module: ProgressRail · 进度轨道与幕节点
       ============================================================ */
    const ProgressRail = (() => {
        let dots = [];

        function build() {
            dots = scenes.map((scene, i) => {
                const dot = document.createElement('button');
                dot.className = 'dot' + (i === 0 ? ' active' : '');
                dot.title = scene.dataset.act || ('Act ' + (i + 1));
                dot.addEventListener('click', () => {
                    scene.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                sectionDotsEl.appendChild(dot);
                return dot;
            });
        }

        function update() {
            progressFill.style.height = (state.progress * 100) + '%';
            const center = state.scrollY + state.h * 0.45;
            let active = 0;
            scenes.forEach((scene, i) => {
                const top = scene.offsetTop;
                if (center >= top) active = i;
            });
            dots.forEach((d, i) => d.classList.toggle('active', i === active));
            const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
            cueValue.textContent = roman[active] + ' / VII';
        }
        return { build, update };
    })();

    /* ============================================================
       Module: ScrambleReveal · 标题乱码揭示
       ============================================================ */
    const ScrambleReveal = (() => {
        const queue = [];

        function initAll() {
            document.querySelectorAll('[data-scramble]').forEach((el) => {
                const text = el.textContent;
                el.textContent = '';
                const chars = [];
                for (const ch of text) {
                    const span = document.createElement('span');
                    span.className = 'scramble-char pending';
                    span.textContent = ch === ' ' ? '\u00A0' : ch;
                    el.appendChild(span);
                    chars.push({ span, target: ch === ' ' ? '\u00A0' : ch });
                }
                queue.push({ el, chars, started: false });
            });

            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const job = queue.find((q) => q.el === entry.target);
                        if (job && !job.started) startJob(job);
                    }
                });
            }, { threshold: 0.4 });

            queue.forEach((job) => io.observe(job.el));
        }

        function startJob(job) {
            job.started = true;
            job.chars.forEach((c, i) => {
                setTimeout(() => {
                    c.span.classList.remove('pending');
                    // 乱码闪烁阶段
                    let flips = 3;
                    const iv = setInterval(() => {
                        if (flips > 0) {
                            c.span.textContent = SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
                            flips--;
                        } else {
                            c.span.textContent = c.target;
                            clearInterval(iv);
                        }
                    }, 45);
                }, i * 38);
            });
        }
        return { initAll };
    })();

    /* ============================================================
       Module: RevealLines · 行级联揭示
       ============================================================ */
    const RevealLines = (() => {
        function init() {
            const lines = document.querySelectorAll('[data-line]');
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const siblings = entry.target.parentElement.querySelectorAll('[data-line]');
                        siblings.forEach((line, i) => {
                            setTimeout(() => line.classList.add('lit'), i * 140);
                        });
                        io.unobserve(entry.target.parentElement);
                    }
                });
            }, { threshold: 0.5 });
            lines.forEach((line) => io.observe(line));

            const reveals = document.querySelectorAll('[data-reveal]');
            const io2 = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        io2.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.18 });
            reveals.forEach((el) => io2.observe(el));
        }
        return { init };
    })();

    /* ============================================================
       Module: TiltCards · 3D 倾斜 + 光泽追踪
       ============================================================ */
    const TiltCards = (() => {
        function init() {
            document.querySelectorAll('[data-tilt]').forEach((card) => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const px = (e.clientX - rect.left) / rect.width;
                    const py = (e.clientY - rect.top) / rect.height;
                    const rx = (0.5 - py) * 8;
                    const ry = (px - 0.5) * 10;
                    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
                    card.style.setProperty('--mx', (px * 100) + '%');
                    card.style.setProperty('--my', (py * 100) + '%');
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transition = `transform 0.7s ${EASE}`;
                    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
                    setTimeout(() => { card.style.transition = ''; }, 700);
                });
            });
        }
        return { init };
    })();

    /* ============================================================
       Module: ParallaxStack · 滚动视差深度层
       ============================================================ */
    const ParallaxStack = (() => {
        const layers = [];
        function init() {
            document.querySelectorAll('[data-depth]').forEach((el) => {
                layers.push({ el, depth: parseFloat(el.dataset.depth) });
            });
        }
        function update() {
            for (const { el, depth } of layers) {
                if (el.closest('.scene-hero')) {
                    // 英雄区装饰层：基于视口偏移
                    const rect = el.getBoundingClientRect();
                    const offset = (rect.top + rect.height / 2 - state.h / 2) * depth * -0.4;
                    el.style.transform = `translateY(${offset}px)`;
                } else if (el.classList.contains('parallax-card')) {
                    const stage = el.closest('.parallax-stack');
                    if (!stage) continue;
                    const rect = stage.getBoundingClientRect();
                    const rel = clamp(1 - Math.abs(rect.top + rect.height / 2 - state.h / 2) / (state.h * 0.8), 0, 1);
                    const spread = depth * 60 * (1 - rel);
                    const base = parseFloat(el.dataset.baseY || 0);
                    if (!el.dataset.baseY) {
                        el.dataset.baseY = '0';
                        el.dataset.idx = ['0.6', '0.35', '0.1'].indexOf(String(depth));
                    }
                    const idx = parseInt(el.dataset.idx || 0);
                    const dir = [1, 0.4, -0.4][idx] || 0;
                    const baseTranslate = ['-80%', '-40%', '10%'][idx] || '0%';
                    el.style.transform = `translate(-50%, calc(${baseTranslate} + ${spread * dir}px))`;
                }
            }
        }
        return { init, update };
    })();

    /* ============================================================
       Module: CharCascade · 滚动驱动字符揭示
       ============================================================ */
    const CharCascade = (() => {
        let chars = [];
        function init() {
            const text = charCascade.dataset.text || '';
            charCascade.textContent = '';
            chars = [];
            for (const ch of text) {
                const span = document.createElement('span');
                span.className = 'cc' + (ch === ' ' ? ' space' : '');
                span.textContent = ch === ' ' ? '\u00A0' : ch;
                charCascade.appendChild(span);
                chars.push(span);
            }
        }
        function update() {
            const rect = charCascade.getBoundingClientRect();
            // 元素进入视口后，按局部进度逐字点亮
            const local = clamp((state.h * 0.85 - rect.top) / (rect.height + state.h * 0.35), 0, 1);
            const litCount = Math.floor(local * chars.length);
            chars.forEach((c, i) => c.classList.toggle('lit', i < litCount));
        }
        return { init, update };
    })();

    /* ============================================================
       Module: PulseGrid · 速度脉冲网格
       ============================================================ */
    const PulseGrid = (() => {
        let dots = [];
        function init() {
            const count = 48;
            for (let i = 0; i < count; i++) {
                const dot = document.createElement('div');
                dot.className = 'pulse-dot';
                pulseGrid.appendChild(dot);
                dots.push({ el: dot, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.8 });
            }
        }
        function update(t) {
            const energy = clamp(Math.abs(state.velocity) / 30, 0, 1);
            dots.forEach((d) => {
                const wave = (Math.sin(t * 0.003 * d.speed + d.phase) + 1) / 2;
                const level = 0.08 + wave * (0.12 + energy * 0.7);
                const scale = 0.85 + wave * (0.1 + energy * 0.5);
                d.el.style.opacity = level.toFixed(3);
                d.el.style.transform = `scale(${scale.toFixed(3)})`;
            });
        }
        return { init, update };
    })();

    /* ============================================================
       Module: TimelineAct · 里程碑点亮 + 终幕统计
       ============================================================ */
    const TimelineAct = (() => {
        function update() {
            timelineFill.style.width = (state.progress * 100) + '%';
            milestones.forEach((ms) => {
                const threshold = parseFloat(ms.dataset.ms);
                if (state.progress >= threshold) {
                    if (!ms.classList.contains('lit')) ms.classList.add('lit');
                    state.litMilestones.add(ms.dataset.ms);
                }
            });

            statDistance.textContent = Math.round(state.totalDistance).toLocaleString();
            statPeak.textContent = state.peakVelocity.toFixed(2);
            statCues.textContent = state.litMilestones.size + ' / ' + milestones.length;
            statTheme.textContent = THEME_NAMES[state.theme];
        }
        return { update };
    })();

    /* ============================================================
       Module: ThemeManager · 氛围配色
       ============================================================ */
    const ThemeManager = (() => {
        function getAccent() {
            const style = getComputedStyle(document.documentElement);
            return {
                accent: style.getPropertyValue('--c-accent').trim(),
                accent2: style.getPropertyValue('--c-accent-2').trim()
            };
        }

        function init() {
            themeSwitcher.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-btn');
                if (!btn) return;
                state.theme = btn.dataset.theme;
                document.documentElement.dataset.theme = state.theme;
                themeSwitcher.querySelectorAll('.theme-btn').forEach((b) => {
                    b.classList.toggle('active', b === btn);
                });
            });
        }
        return { init, getAccent };
    })();

    /* ============================================================
       Module: Boot · 主循环与装配
       ============================================================ */
    function handleResize() {
        state.w = window.innerWidth;
        state.h = window.innerHeight;
        ParticleField.resize();
        ParticleField.spawn();
    }

    function tick(t) {
        ScrollEngine.sample();
        HUD.update();
        ProgressRail.update();
        ParallaxStack.update();
        CharCascade.update();
        PulseGrid.update(t);
        TimelineAct.update();

        const { accent, accent2 } = ThemeManager.getAccent();
        ParticleField.update(t, accent, accent2);

        requestAnimationFrame(tick);
    }

    function init() {
        handleResize();
        window.addEventListener('resize', handleResize, { passive: true });

        ThemeManager.init();
        ProgressRail.build();
        ScrambleReveal.initAll();
        RevealLines.init();
        TiltCards.init();
        ParallaxStack.init();
        CharCascade.init();
        PulseGrid.init();

        replayBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
