(function () {
    'use strict';

    /* ============================================================
     * Motion Resume · 韵动履历
     * 高阶微交互履历体验
     * 维护者: EDEN
     * 特性: 流体粒子场 · 滚动进度轨 · 弹簧磁力 · 3D倾斜 ·
     *       字符揭示 · 数字滚动 · 技能星座 · 配色切换
     * ============================================================ */

    /* === DOM Elements === */
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var progressFill = document.getElementById('progress-fill');
    var timelineSpine = document.getElementById('timeline-spine');
    var scrollCue = document.getElementById('scroll-cue');

    var marks = Array.prototype.slice.call(document.querySelectorAll('.mark'));
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    var splitEls = Array.prototype.slice.call(document.querySelectorAll('[data-split]'));
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    var scrambles = Array.prototype.slice.call(document.querySelectorAll('[data-scramble]'));
    var magneticEls = Array.prototype.slice.call(document.querySelectorAll('[data-magnetic]'));
    var tiltEls = Array.prototype.slice.call(document.querySelectorAll('[data-tilt]'));
    var skillChips = Array.prototype.slice.call(document.querySelectorAll('.skill-chip'));
    var paletteBtns = Array.prototype.slice.call(document.querySelectorAll('.palette-btn'));

    var skillName = document.getElementById('skill-name');
    var skillBar = document.getElementById('skill-bar');
    var skillVal = document.getElementById('skill-val');

    /* === State === */
    var state = {
        mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        scrollY: 0,
        scrollVel: 0,
        lastScrollY: 0,
        palette: 'obsidian',
        particles: [],
        activeSection: 'hero',
        counted: false,
        scrambled: false,
        skillLayoutDone: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        w: window.innerWidth,
        h: window.innerHeight,
        lastTime: 0,
        animId: null
    };

    /* === Palettes === */
    var palettes = {
        obsidian: {
            particle: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.10)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            accent: '#8b5cf6',
            accentSec: '#6366f1',
            accentGlow: 'rgba(139, 92, 246, 0.45)'
        },
        aurora: {
            particle: { r: 0, g: 212, b: 255 },
            glow: 'rgba(0, 212, 255, 0.10)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530'],
            accent: '#00d4ff',
            accentSec: '#a855f7',
            accentGlow: 'rgba(0, 212, 255, 0.45)'
        },
        ember: {
            particle: { r: 249, g: 115, b: 22 },
            glow: 'rgba(249, 115, 22, 0.10)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316',
            accentSec: '#ef4444',
            accentGlow: 'rgba(249, 115, 22, 0.45)'
        },
        frost: {
            particle: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.10)',
            blobs: ['#0d1530', '#101a3a', '#151a40', '#0d1830'],
            accent: '#a5b4fc',
            accentSec: '#67e8f9',
            accentGlow: 'rgba(165, 180, 252, 0.45)'
        }
    };

    var PARTICLE_COUNT = 90;
    var PARTICLE_TRAIL = 6;

    /* === Init === */
    function init() {
        resizeCanvas();
        initParticles();
        buildSplitChars();
        layoutSkillConstellation();
        bindEvents();
        applyPalette(state.palette);
        state.lastTime = performance.now();
        animate(state.lastTime);
        /* kick off first reveal pass */
        checkReveal();
        updateProgressRail();
    }

    /* === Canvas Resize === */
    function resizeCanvas() {
        state.w = window.innerWidth;
        state.h = window.innerHeight;
        canvas.width = state.w * state.dpr;
        canvas.height = state.h * state.dpr;
        canvas.style.width = state.w + 'px';
        canvas.style.height = state.h + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    /* === Particles (ambient flow field) === */
    function initParticles() {
        state.particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push(createParticle(
                Math.random() * state.w,
                Math.random() * state.h
            ));
        }
    }

    function createParticle(x, y) {
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 1.6 + 0.5,
            life: Math.random() * 200,
            trail: []
        };
    }

    /* === Event Binding === */
    function bindEvents() {
        window.addEventListener('resize', onResize);

        window.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        window.addEventListener('scroll', onScroll, { passive: true });

        /* Progress rail marks — smooth scroll to section */
        marks.forEach(function (mark) {
            mark.addEventListener('click', function () {
                var target = document.getElementById(mark.dataset.target);
                if (target) {
                    var top = target.getBoundingClientRect().top + window.scrollY - 20;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                }
            });
        });

        /* Palette switch */
        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette(state.palette);
            });
        });

        /* Magnetic elements */
        magneticEls.forEach(function (el) {
            el.addEventListener('mousemove', onMagneticMove);
            el.addEventListener('mouseleave', onMagneticLeave);
        });

        /* 3D tilt cards */
        tiltEls.forEach(function (el) {
            el.addEventListener('mousemove', onTiltMove);
            el.addEventListener('mouseleave', onTiltLeave);
        });

        /* Skill chips */
        skillChips.forEach(function (chip) {
            chip.addEventListener('mouseenter', onSkillHover);
            chip.addEventListener('click', onSkillHover);
        });
    }

    function onResize() {
        resizeCanvas();
        initParticles();
        layoutSkillConstellation();
    }

    function onScroll() {
        state.scrollY = window.scrollY;
        checkReveal();
        updateProgressRail();
        updateActiveMark();

        /* hide scroll cue after first scroll */
        if (state.scrollY > 80 && scrollCue) {
            scrollCue.style.opacity = '0';
        }

        /* trigger counters + scramble when hero in view (once) */
        if (!state.counted && isInView(document.getElementById('hero'), 0.4)) {
            state.counted = true;
            runCounters();
        }
        if (!state.scrambled) {
            runScrambles();
            state.scrambled = true;
        }
    }

    /* === Split chars for staggered reveal === */
    function buildSplitChars() {
        splitEls.forEach(function (el) {
            var text = el.textContent;
            el.textContent = '';
            for (var i = 0; i < text.length; i++) {
                var ch = text[i];
                if (ch === ' ') {
                    el.appendChild(document.createTextNode(' '));
                    continue;
                }
                var span = document.createElement('span');
                span.className = 'char';
                span.textContent = ch;
                span.style.transitionDelay = (i * 0.04) + 's';
                el.appendChild(span);
            }
        });
    }

    /* === Skill Constellation Layout ===
     * Places each chip on its orbit ring at the given theta angle.
     * Orbit radius is a fraction of the constellation box.
     */
    function layoutSkillConstellation() {
        var box = document.querySelector('.skill-constellation');
        if (!box) return;
        var rect = box.getBoundingClientRect();
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var radii = { 1: rect.width * 0.225, 2: rect.width * 0.36, 3: rect.width * 0.5 };

        skillChips.forEach(function (chip) {
            var orbit = parseInt(chip.style.getPropertyValue('--orbit'), 10) || 1;
            var theta = parseFloat(chip.style.getPropertyValue('--theta')) || 0;
            var rad = (theta - 90) * Math.PI / 180;
            var r = radii[orbit] || radii[1];
            var x = cx + Math.cos(rad) * r;
            var y = cy + Math.sin(rad) * r;
            chip.style.left = x + 'px';
            chip.style.top = y + 'px';
            chip.style.transform = 'translate(-50%, -50%)';
        });
        state.skillLayoutDone = true;
    }

    function onSkillHover(e) {
        var chip = e.currentTarget;
        var val = parseFloat(chip.dataset.skill) || 0;
        var name = chip.textContent.trim();
        var pct = Math.round(val * 100);

        skillChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');

        skillName.textContent = name;
        skillVal.textContent = pct + '%';
        /* reset then set to animate */
        skillBar.style.width = '0%';
        requestAnimationFrame(function () {
            skillBar.style.width = pct + '%';
        });
    }

    /* === Magnetic Interaction ===
     * Element translates toward cursor with spring-damper feel (via CSS transition).
     */
    function onMagneticMove(e) {
        var el = e.currentTarget;
        var rect = el.getBoundingClientRect();
        var mx = e.clientX - (rect.left + rect.width / 2);
        var my = e.clientY - (rect.top + rect.height / 2);
        var strength = 0.3;
        el.style.transform = 'translate(' + (mx * strength) + 'px,' + (my * strength) + 'px)';
    }

    function onMagneticLeave(e) {
        e.currentTarget.style.transform = 'translate(0,0)';
    }

    /* === 3D Tilt === */
    function onTiltMove(e) {
        var el = e.currentTarget;
        var rect = el.getBoundingClientRect();
        var nx = (e.clientX - rect.left) / rect.width - 0.5;
        var ny = (e.clientY - rect.top) / rect.height - 0.5;
        var maxTilt = 8;
        el.style.transform =
            'perspective(900px) rotateY(' + (nx * maxTilt) + 'deg) rotateX(' + (-ny * maxTilt) + 'deg) translateZ(0)';
    }

    function onTiltLeave(e) {
        e.currentTarget.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
    }

    /* === Count-up numbers === */
    function runCounters() {
        counters.forEach(function (el) {
            var target = parseInt(el.dataset.count, 10);
            var dur = 1600;
            var start = performance.now();
            function step(now) {
                var t = Math.min((now - start) / dur, 1);
                /* ease-out-expo */
                var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
                el.textContent = Math.round(target * eased) + '+';
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    }

    /* === Scramble text reveal === */
    function runScrambles() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&';
        scrambles.forEach(function (el) {
            var finalText = el.dataset.scramble || el.textContent;
            var iter = 0;
            var maxIter = finalText.length * 2;
            function tick() {
                el.textContent = finalText.split('').map(function (c, idx) {
                    if (idx < iter / 2) return c;
                    if (c === ' ') return ' ';
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('');
                iter += 1;
                if (iter >= maxIter) {
                    el.textContent = finalText;
                    return;
                }
                setTimeout(tick, 40);
            }
            tick();
        });
    }

    /* === Reveal on scroll === */
    function checkReveal() {
        var trigger = window.innerHeight * 0.85;
        reveals.forEach(function (el) {
            var top = el.getBoundingClientRect().top;
            if (top < trigger) {
                el.classList.add('in-view');
            }
        });
        splitEls.forEach(function (el) {
            var top = el.getBoundingClientRect().top;
            if (top < trigger) {
                el.classList.add('in-view');
            }
        });
    }

    function isInView(el, ratio) {
        if (!el) return false;
        var rect = el.getBoundingClientRect();
        var visible = rect.height * ratio;
        return rect.top < window.innerHeight - visible && rect.bottom > visible;
    }

    /* === Progress Rail === */
    function updateProgressRail() {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? state.scrollY / docHeight : 0;
        progressFill.style.height = (progress * 100) + '%';

        if (timelineSpine) {
            var tlRect = timelineSpine.getBoundingClientRect();
            var winH = window.innerHeight;
            var revealPoint = winH * 0.55;
            var spineProgress = Math.max(0, Math.min(1, (revealPoint - tlRect.top) / tlRect.height));
            timelineSpine.style.setProperty('--spine-progress', (spineProgress * 100) + '%');
        }
    }

    function updateActiveMark() {
        var triggerLine = window.innerHeight * 0.4;
        var current = sections[0];
        for (var i = 0; i < sections.length; i++) {
            var rect = sections[i].getBoundingClientRect();
            if (rect.top < triggerLine) {
                current = sections[i];
            }
        }
        if (current && current.dataset.section !== state.activeSection) {
            state.activeSection = current.dataset.section;
            marks.forEach(function (m) {
                m.classList.toggle('active', m.dataset.target === state.activeSection);
            });
        }
    }

    /* === Palette Application === */
    function applyPalette(name) {
        var pal = palettes[name];
        document.body.className = document.body.className
            .replace(/palette-\w+/g, '').trim();
        document.body.classList.add('palette-' + name);

        var root = document.documentElement.style;
        root.setProperty('--color-accent', pal.accent);
        root.setProperty('--color-accent-secondary', pal.accentSec);
        root.setProperty('--color-accent-glow', pal.accentGlow);
        root.setProperty('--color-blob-1', pal.blobs[0]);
        root.setProperty('--color-blob-2', pal.blobs[1]);
        root.setProperty('--color-blob-3', pal.blobs[2]);
        root.setProperty('--color-blob-4', pal.blobs[3]);

        var blobEls = document.querySelectorAll('.blob');
        blobEls.forEach(function (el, i) {
            el.style.background =
                'radial-gradient(ellipse at center, ' + pal.blobs[i % 4] + ' 0%, transparent 70%)';
        });

        cursorGlow.style.background =
            'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 65%)';
    }

    /* === Animation Loop === */
    function animate(now) {
        var dt = Math.min((now - state.lastTime) / 16.667, 2.5);
        state.lastTime = now;

        /* scroll velocity for particle reactivity */
        state.scrollVel = (state.scrollY - state.lastScrollY) * 0.1;
        state.lastScrollY = state.scrollY;

        updateParticles(dt);
        render();

        state.animId = requestAnimationFrame(animate);
    }

    function updateParticles(dt) {
        var pal = palettes[state.palette];
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var scrollBoost = Math.abs(state.scrollVel) * 0.04;

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            /* Simplex-like flow field via stacked sines */
            var flowAngle = Math.sin(p.x * 0.0025 + p.life * 0.008) +
                            Math.cos(p.y * 0.0025 + p.life * 0.006);
            p.vx += Math.cos(flowAngle * Math.PI) * 0.015 * dt;
            p.vy += Math.sin(flowAngle * Math.PI) * 0.015 * dt;

            /* scroll adds vertical drift */
            p.vy += state.scrollVel * 0.002 * dt;

            /* mouse attraction */
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 1) {
                var pull = (200 - dist) / 200 * 0.06 * dt;
                p.vx += (dx / dist) * pull;
                p.vy += (dy / dist) * pull;
            }

            /* damping */
            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;

            /* wrap around screen */
            if (p.x < -12) p.x = state.w + 12;
            if (p.x > state.w + 12) p.x = -12;
            if (p.y < -12) p.y = state.h + 12;
            if (p.y > state.h + 12) p.y = -12;

            /* trail */
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > PARTICLE_TRAIL) p.trail.shift();
        }
    }

    /* === Render === */
    function render() {
        var pal = palettes[state.palette];
        var pr = pal.particle.r;
        var pg = pal.particle.g;
        var pb = pal.particle.b;

        ctx.clearRect(0, 0, state.w, state.h);

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            /* trail */
            for (var t = 0; t < p.trail.length; t++) {
                var tp = p.trail[t];
                var alpha = (t / p.trail.length) * 0.16;
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, p.size * 0.55, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + alpha + ')';
                ctx.fill();
            }

            /* head with soft glow */
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',0.04)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',0.55)';
            ctx.fill();
        }

        /* connection lines between nearby particles */
        ctx.lineWidth = 0.5;
        var len = state.particles.length;
        for (var a = 0; a < len; a++) {
            var pa = state.particles[a];
            for (var b = a + 1; b < len; b++) {
                var pb2 = state.particles[b];
                var ddx = pa.x - pb2.x;
                var ddy = pa.y - pb2.y;
                var dd = ddx * ddx + ddy * ddy;
                if (dd < 14400) {
                    var dd2 = Math.sqrt(dd);
                    var la = (1 - dd2 / 120) * 0.1;
                    ctx.strokeStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + la + ')';
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb2.x, pb2.y);
                    ctx.stroke();
                }
            }
        }
    }

    /* === Boot === */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
