(function () {
    'use strict';

    /* ============================================================
       Scroll Parallax Flip · 交互逻辑
       Modules:
         1. DOM & State
         2. Palettes
         3. Particle Field (Canvas)
         4. Text Reveal (chars/words/lines splitter)
         5. Parallax Depth (scroll + mouse driven)
         6. Flip Card Spring-Damper Physics
         7. Stack Cards (scroll-driven cover)
         8. Scroll Progress & HUD
         9. Event Binding & Animation Loop
       ============================================================ */

    /* === 1. DOM & State === */
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var parallaxField = document.getElementById('parallax-field');
    var depthLayers = document.querySelectorAll('.depth-layer');
    var depthElements = document.querySelectorAll('[data-depth]');
    var chapters = document.querySelectorAll('.chapter');
    var flipGrid = document.getElementById('flip-grid');
    var flipCards = document.querySelectorAll('.flip-card');
    var stackTrack = document.getElementById('stack-track');
    var stackCards = document.querySelectorAll('.stack-card');
    var progressFill = document.getElementById('progress-fill');
    var progressChapters = document.getElementById('progress-chapters');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var btnFlipAll = document.getElementById('btn-flip-all');
    var btnReset = document.getElementById('btn-reset');
    var btnRestart = document.getElementById('btn-restart');
    var scrollCue = document.getElementById('scroll-cue');

    var hudScroll = document.getElementById('hud-scroll');
    var hudParallax = document.getElementById('hud-parallax');
    var hudFlips = document.getElementById('hud-flips');
    var statScroll = document.getElementById('stat-scroll');
    var statFlips = document.getElementById('stat-flips');

    var state = {
        scrollY: window.scrollY,
        maxScroll: 0,
        scrollPct: 0,
        smoothScrollPct: 0,
        mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        smoothMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        parallaxMag: 0,
        palette: 'obsidian',
        particles: [],
        bursts: [],
        cardStates: [],
        flipCount: 0,
        chaptersActive: 0,
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0
    };

    /* === 2. Palettes === */
    var palettes = {
        obsidian: {
            particle: { r: 139, g: 92, b: 246 },
            glow: 'rgba(139, 92, 246, 0.10)',
            accent: '#8b5cf6'
        },
        aurora: {
            particle: { r: 0, g: 212, b: 255 },
            glow: 'rgba(0, 212, 255, 0.10)',
            accent: '#06d4ff'
        },
        ember: {
            particle: { r: 249, g: 115, b: 22 },
            glow: 'rgba(249, 115, 22, 0.10)',
            accent: '#f97316'
        },
        frost: {
            particle: { r: 165, g: 180, b: 252 },
            glow: 'rgba(165, 180, 252, 0.10)',
            accent: '#a5b4fc'
        }
    };

    var PARTICLE_COUNT = 80;
    var BURST_LIFESPAN = 70;

    /* === 3. Particle Field === */
    function initParticles() {
        state.particles = [];
        var w = window.innerWidth;
        var h = window.innerHeight;
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            state.particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                baseAlpha: Math.random() * 0.5 + 0.15,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function updateParticles(dt) {
        var p = palettes[state.palette].particle;
        var w = window.innerWidth;
        var h = window.innerHeight;
        var mx = state.smoothMouse.x;
        var my = state.smoothMouse.y;
        var t = performance.now() * 0.001;

        ctx.clearRect(0, 0, w, h);

        for (var i = 0; i < state.particles.length; i++) {
            var pt = state.particles[i];

            /* Drift */
            pt.x += pt.vx + Math.sin(t + pt.phase) * 0.12;
            pt.y += pt.vy + Math.cos(t * 0.8 + pt.phase) * 0.12;

            /* Mouse attraction (subtle) */
            var dx = mx - pt.x;
            var dy = my - pt.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0.1) {
                var force = (1 - dist / 200) * 0.4;
                pt.x += (dx / dist) * force;
                pt.y += (dy / dist) * force;
            }

            /* Wrap */
            if (pt.x < -10) pt.x = w + 10;
            if (pt.x > w + 10) pt.x = -10;
            if (pt.y < -10) pt.y = h + 10;
            if (pt.y > h + 10) pt.y = -10;

            /* Render */
            var alpha = pt.baseAlpha * (0.6 + 0.4 * Math.sin(t * 1.5 + pt.phase));
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
            ctx.fill();
        }

        /* Burst particles (flip / click impulses) */
        for (var j = state.bursts.length - 1; j >= 0; j--) {
            var b = state.bursts[j];
            b.life -= 1;
            if (b.life <= 0) {
                state.bursts.splice(j, 1);
                continue;
            }
            var lifeRatio = b.life / BURST_LIFESPAN;
            b.x += b.vx;
            b.y += b.vy;
            b.vx *= 0.96;
            b.vy *= 0.96;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size * lifeRatio, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (lifeRatio * 0.8) + ')';
            ctx.fill();
        }
    }

    function spawnBurst(x, y, count) {
        var n = count || 18;
        for (var i = 0; i < n; i++) {
            var angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
            var speed = Math.random() * 4 + 2;
            state.bursts.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1.5,
                life: BURST_LIFESPAN
            });
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    /* === 4. Text Reveal (splitter) === */
    function splitText() {
        var targets = document.querySelectorAll('[data-reveal]');
        targets.forEach(function (el) {
            var mode = el.getAttribute('data-reveal');
            if (mode === 'chars') {
                splitChars(el);
            } else if (mode === 'words') {
                splitWords(el);
            }
            /* lines mode: no splitting, reveal whole block */
        });
    }

    function splitChars(el) {
        var lines = el.querySelectorAll('.line');
        var globalDelay = 0;
        lines.forEach(function (line) {
            var text = line.textContent;
            line.textContent = '';
            for (var i = 0; i < text.length; i++) {
                var ch = text[i];
                if (ch === ' ') {
                    line.appendChild(document.createTextNode(' '));
                    continue;
                }
                var span = document.createElement('span');
                span.className = 'char';
                span.style.animationDelay = (globalDelay * 0.035) + 's';
                span.textContent = ch;
                line.appendChild(span);
                globalDelay++;
            }
        });
    }

    function splitWords(el) {
        var fragment = document.createDocumentFragment();
        var nodes = Array.prototype.slice.call(el.childNodes);
        nodes.forEach(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                var words = node.textContent.split(/(\s+)/);
                words.forEach(function (w, idx) {
                    if (w.trim() === '') {
                        fragment.appendChild(document.createTextNode(w));
                        return;
                    }
                    var span = document.createElement('span');
                    span.className = 'word';
                    span.textContent = w;
                    fragment.appendChild(span);
                });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                /* Recurse into element children (.line blocks) */
                if (node.classList && node.classList.contains('line')) {
                    var inner = document.createElement('span');
                    inner.className = 'line-inner';
                    var w2 = node.textContent.split(/(\s+)/);
                    var wIdx = 0;
                    w2.forEach(function (w) {
                        if (w.trim() === '') {
                            inner.appendChild(document.createTextNode(w));
                            return;
                        }
                        var span = document.createElement('span');
                        span.className = 'word';
                        span.style.animationDelay = (wIdx * 0.06) + 's';
                        span.textContent = w;
                        inner.appendChild(span);
                        wIdx++;
                    });
                    node.textContent = '';
                    node.appendChild(inner);
                    fragment.appendChild(node);
                } else {
                    fragment.appendChild(node);
                }
            }
        });
        el.appendChild(fragment);
    }

    function initRevealObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    /* stagger child words/chars already have delays */
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

        document.querySelectorAll('[data-reveal]').forEach(function (el) {
            observer.observe(el);
        });
    }

    /* === 5. Parallax Depth === */
    function updateParallax() {
        /* Smooth scroll & mouse */
        state.smoothScrollPct += (state.scrollPct - state.smoothScrollPct) * 0.08;
        state.smoothMouse.x += (state.mouse.x - state.smoothMouse.x) * 0.06;
        state.smoothMouse.y += (state.mouse.y - state.smoothMouse.y) * 0.06;

        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        var mx = (state.smoothMouse.x - cx) / cx; /* -1 .. 1 */
        var my = (state.smoothMouse.y - cy) / cy; /* -1 .. 1 */
        var sp = state.smoothScrollPct; /* 0 .. 1 */

        state.parallaxMag = Math.sqrt(mx * mx + my * my);

        /* Fixed background depth layers */
        depthLayers.forEach(function (layer) {
            var depth = parseFloat(layer.getAttribute('data-depth')) || 0.1;
            var tx = -mx * depth * 80;
            var ty = -my * depth * 80 + sp * depth * 200;
            layer.style.transform = 'translate3d(' + tx + 'px, ' + ty + 'px, 0)';
        });

        /* In-content depth elements (cards, meta blocks) */
        depthElements.forEach(function (el) {
            if (el.classList.contains('depth-layer')) return; /* skip bg layers */
            var depth = parseFloat(el.getAttribute('data-depth')) || 0.2;
            var rect = el.getBoundingClientRect();
            var elCenter = rect.top + rect.height / 2;
            /* offset from viewport center drives scroll parallax */
            var scrollOffset = (elCenter - cy) * depth * -0.3;
            var mxOffset = -mx * depth * 30;
            el.style.transform = 'translate3d(' + mxOffset + 'px, ' + scrollOffset + 'px, 0)';
        });

        /* Cursor glow */
        cursorGlow.style.left = state.smoothMouse.x + 'px';
        cursorGlow.style.top = state.smoothMouse.y + 'px';
    }

    /* === 6. Flip Card Spring-Damper Physics === */
    function initCardStates() {
        state.cardStates = [];
        flipCards.forEach(function (card) {
            var inner = card.querySelector('.flip-inner');
            state.cardStates.push({
                el: card,
                inner: inner,
                angle: 0,
                angleVel: 0,
                target: 0,
                spring: parseFloat(card.getAttribute('data-spring')) || 0.12,
                damp: parseFloat(card.getAttribute('data-damping')) || 0.78,
                flipped: false,
                tiltX: 0,
                tiltY: 0,
                tiltXVel: 0,
                tiltYVel: 0,
                rect: null
            });
        });
    }

    function updateFlipPhysics() {
        for (var i = 0; i < state.cardStates.length; i++) {
            var c = state.cardStates[i];

            /* Flip spring-damper integrator */
            var flipForce = -(c.spring) * (c.angle - c.target);
            c.angleVel = (c.angleVel + flipForce) * c.damp;
            c.angle += c.angleVel;

            /* Tilt spring (mouse parallax) */
            c.rect = c.el.getBoundingClientRect();
            var elCenterX = c.rect.left + c.rect.width / 2;
            var elCenterY = c.rect.top + c.rect.height / 2;
            var dx = state.smoothMouse.x - elCenterX;
            var dy = state.smoothMouse.y - elCenterY;
            var tiltTargetX = -dy * 0.04;
            var tiltTargetY = dx * 0.04;

            var tiltForceX = -0.12 * (c.tiltX - tiltTargetX);
            var tiltForceY = -0.12 * (c.tiltY - tiltTargetY);
            c.tiltXVel = (c.tiltXVel + tiltForceX) * 0.82;
            c.tiltYVel = (c.tiltYVel + tiltForceY) * 0.82;
            c.tiltX += c.tiltXVel;
            c.tiltY += c.tiltYVel;

            /* Only apply tilt when card is near viewport (perf) */
            var inView = c.rect.bottom > -100 && c.rect.top < window.innerHeight + 100;
            if (inView) {
                c.inner.style.transform =
                    'rotateX(' + c.tiltX.toFixed(2) + 'deg) ' +
                    'rotateY(' + (c.angle + c.tiltY).toFixed(2) + 'deg)';
            }
        }
    }

    function toggleFlip(cardState, forceState) {
        if (!cardState) return;
        var shouldFlip = (typeof forceState === 'boolean') ? forceState : !cardState.flipped;
        cardState.flipped = shouldFlip;
        cardState.target = shouldFlip ? 180 : 0;

        if (shouldFlip) {
            state.flipCount++;
            updateHud();
            /* Spawn burst at card center */
            var rect = cardState.el.getBoundingClientRect();
            spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
        }
    }

    /* === 7. Stack Cards (scroll-driven cover) === */
    function updateStackCards() {
        if (!stackTrack) return;
        var trackRect = stackTrack.getBoundingClientRect();
        var viewH = window.innerHeight;

        /* progress: 0 when track top hits viewport center, 1 when bottom leaves */
        var start = viewH * 0.5;
        var end = -(trackRect.height - viewH * 0.4);
        var raw = (start - trackRect.top) / (start - end);
        var progress = Math.max(0, Math.min(1, raw));

        stackCards.forEach(function (card, idx) {
            var cardProgress = progress * stackCards.length - idx;
            /* cardProgress: >0 means this card has started covering; 1 = fully placed */
            var cp = Math.max(0, Math.min(1, cardProgress));
            var yOffset = (1 - cp) * 120;
            var scale = 0.92 + cp * 0.08;
            var opacity = Math.min(1, cp * 1.5 + 0.3);
            var blur = (1 - cp) * 4;

            /* Stacking offset: cards further back shift up slightly to peek */
            card.style.transform =
                'translateY(' + yOffset.toFixed(1) + 'px) ' +
                'scale(' + scale.toFixed(3) + ')';
            card.style.opacity = opacity.toFixed(3);
            card.style.zIndex = idx + 1;
        });
    }

    /* === 8. Scroll Progress & HUD === */
    function buildChapterDots() {
        if (!progressChapters) return;
        var total = chapters.length;
        chapters.forEach(function (ch, idx) {
            var dot = document.createElement('div');
            dot.className = 'chapter-dot';
            dot.style.top = ((idx / (total - 1)) * 100) + '%';
            dot.setAttribute('data-chapter-dot', idx);
            progressChapters.appendChild(dot);
        });
    }

    function updateProgress() {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        state.scrollY = window.scrollY;
        state.maxScroll = docH;
        state.scrollPct = docH > 0 ? state.scrollY / docH : 0;

        if (progressFill) {
            progressFill.style.height = (state.scrollPct * 100) + '%';
        }

        /* Active chapter */
        var viewCenter = window.innerHeight / 2;
        var activeIdx = 0;
        chapters.forEach(function (ch, idx) {
            var rect = ch.getBoundingClientRect();
            if (rect.top <= viewCenter && rect.bottom >= viewCenter) {
                activeIdx = idx;
            }
        });
        if (activeIdx !== state.chaptersActive) {
            state.chaptersActive = activeIdx;
            var dots = progressChapters.querySelectorAll('.chapter-dot');
            dots.forEach(function (d, i) {
                d.classList.toggle('active', i === activeIdx);
            });
        }

        /* Hide scroll cue after first scroll */
        if (scrollCue && state.scrollY > 80) {
            scrollCue.style.opacity = '0';
        }
    }

    function updateHud() {
        if (hudScroll) hudScroll.textContent = Math.round(state.scrollPct * 100) + '%';
        if (hudParallax) hudParallax.textContent = state.parallaxMag.toFixed(2);
        if (hudFlips) hudFlips.textContent = state.flipCount;
        if (statScroll) statScroll.textContent = Math.round(state.scrollPct * 100);
        if (statFlips) statFlips.textContent = state.flipCount;
    }

    /* === 9. Palette === */
    function applyPalette(name) {
        state.palette = name;
        document.body.className = 'palette-' + name;
        cursorGlow.style.background =
            'radial-gradient(circle, ' + palettes[name].glow + ' 0%, transparent 70%)';
    }

    /* === 10. Event Binding === */
    function bindEvents() {
        /* Mouse move */
        window.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
        }, { passive: true });

        /* Touch move for mobile parallax */
        window.addEventListener('touchmove', function (e) {
            if (e.touches.length > 0) {
                state.mouse.x = e.touches[0].clientX;
                state.mouse.y = e.touches[0].clientY;
            }
        }, { passive: true });

        /* Click → burst */
        window.addEventListener('click', function (e) {
            /* Avoid burst on interactive controls */
            if (e.target.closest('.action-btn, .palette-btn, .finale-restart, .back-link, a')) return;
            spawnBurst(e.clientX, e.clientY, 22);
        });

        /* Scroll */
        window.addEventListener('scroll', function () {
            updateProgress();
        }, { passive: true });

        /* Resize */
        window.addEventListener('resize', function () {
            resizeCanvas();
        });

        /* Flip card clicks */
        flipCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var cs = findCardState(card);
                toggleFlip(cs);
            });
        });

        /* Palette buttons */
        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var name = btn.getAttribute('data-palette');
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                applyPalette(name);
            });
        });

        /* Flip all / reset */
        if (btnFlipAll) {
            btnFlipAll.addEventListener('click', function () {
                state.cardStates.forEach(function (cs, idx) {
                    setTimeout(function () {
                        toggleFlip(cs, true);
                    }, idx * 90);
                });
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', function () {
                state.cardStates.forEach(function (cs, idx) {
                    setTimeout(function () {
                        toggleFlip(cs, false);
                    }, idx * 60);
                });
            });
        }

        /* Restart */
        if (btnRestart) {
            btnRestart.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                /* Reset all flips */
                state.cardStates.forEach(function (cs) {
                    toggleFlip(cs, false);
                });
                state.flipCount = 0;
                updateHud();
            });
        }
    }

    function findCardState(el) {
        for (var i = 0; i < state.cardStates.length; i++) {
            if (state.cardStates[i].el === el) return state.cardStates[i];
        }
        return null;
    }

    /* === 11. Animation Loop === */
    function animate(now) {
        var dt = Math.min(40, now - state.lastTime);
        state.lastTime = now;

        updateParallax();
        updateFlipPhysics();
        updateStackCards();
        updateParticles(dt);
        updateHud();

        state.animId = requestAnimationFrame(animate);
    }

    /* === Init === */
    function init() {
        resizeCanvas();
        splitText();
        initParticles();
        initCardStates();
        buildChapterDots();
        initRevealObserver();
        bindEvents();
        updateProgress();
        applyPalette(state.palette);
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
