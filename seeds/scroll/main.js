(function () {
    'use strict';

    var DOM = {
        particleCanvas: document.getElementById('particle-field'),
        cursorGlow: document.getElementById('cursor-glow'),
        progressFill: document.getElementById('progress-fill'),
        sectionDots: document.getElementById('section-dots'),
        themeSwitcher: document.getElementById('theme-switcher'),
        morphShape: document.getElementById('morph-shape'),
        morphSpeed: document.getElementById('morph-speed'),
        morphScale: document.getElementById('morph-scale'),
        morphRotate: document.getElementById('morph-rotate'),
        velocityFill: document.getElementById('velocity-fill'),
        velocityLabel: document.getElementById('velocity-label'),
        ringFill: document.getElementById('ring-fill'),
        ringLabel: document.getElementById('ring-label'),
        sections: document.querySelectorAll('.scroll-section'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        revealTexts: document.querySelectorAll('.reveal-text'),
        revealBlocks: document.querySelectorAll('.reveal-block'),
        springCards: document.querySelectorAll('.spring-card'),
        depthCards: document.querySelectorAll('.depth-card'),
        parallaxLayers: document.querySelectorAll('.parallax-layer')
    };

    var State = {
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        scrollY: 0,
        prevScrollY: 0,
        scrollVelocity: 0,
        smoothVelocity: 0,
        particles: [],
        currentSection: 0,
        rafId: null,
        time: 0
    };

    var Config = {
        particleCount: 70,
        particleMaxSpeed: 0.35,
        particleSize: 1.8,
        mouseInfluenceRadius: 160,
        mouseForce: 0.018,
        lerpFactor: 0.07,
        velocityDecay: 0.92,
        springStiffness: 0.08,
        springDamping: 0.75
    };

    function init() {
        createSectionDots();
        setupThemeSwitcher();
        setupIntersectionObserver();
        setupRevealObserver();
        setupSpringCards();
        initParticles();
        setupEventListeners();
        revealFirstSection();
        startLoop();
    }

    function createSectionDots() {
        var count = DOM.sections.length;
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('div');
            dot.className = 'section-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.setAttribute('aria-label', 'Section ' + (i + 1));
            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');
            (function (idx) {
                dot.addEventListener('click', function () {
                    DOM.sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                dot.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        DOM.sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            })(i);
            DOM.sectionDots.appendChild(dot);
        }
    }

    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.dataset.theme;
                document.documentElement.dataset.theme = theme;
                DOM.themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var idx = parseInt(entry.target.dataset.section);
                    activateSection(idx);
                }
            });
        }, {
            rootMargin: '-30% 0px -30% 0px',
            threshold: 0.1
        });

        DOM.sections.forEach(function (sec) {
            observer.observe(sec);
        });
    }

    function setupRevealObserver() {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.3 });

        DOM.revealBlocks.forEach(function (block) {
            revealObserver.observe(block);
        });

        DOM.springCards.forEach(function (card) {
            revealObserver.observe(card);
        });
    }

    function setupSpringCards() {
        DOM.springCards.forEach(function (card) {
            card._springY = 0;
            card._springVel = 0;
            card._targetY = 0;
        });
    }

    function activateSection(idx) {
        State.currentSection = idx;
        var dots = DOM.sectionDots.querySelectorAll('.section-dot');
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === idx);
        });
    }

    function revealFirstSection() {
        var firstReveal = DOM.sections[0].querySelectorAll('.reveal-text');
        firstReveal.forEach(function (el) {
            el.classList.add('active');
            var lines = el.querySelectorAll('.line');
            lines.forEach(function (line) {
                var delay = line.dataset.delay || 0;
                line.style.setProperty('--delay', delay + 'ms');
            });
        });
    }

    function setupEventListeners() {
        window.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
        });

        window.addEventListener('scroll', function () {
            State.scrollY = window.scrollY;
        }, { passive: true });

        DOM.revealTexts.forEach(function (el) {
            var lines = el.querySelectorAll('.line');
            lines.forEach(function (line) {
                var delay = line.dataset.delay || 0;
                line.style.setProperty('--delay', delay + 'ms');
            });
        });

        var revealTextObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.2, rootMargin: '-10% 0px -10% 0px' });

        DOM.revealTexts.forEach(function (el) {
            revealTextObserver.observe(el);
        });
    }

    function initParticles() {
        var canvas = DOM.particleCanvas;
        var ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        for (var i = 0; i < Config.particleCount; i++) {
            State.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * Config.particleMaxSpeed,
                vy: (Math.random() - 0.5) * Config.particleMaxSpeed,
                size: Math.random() * Config.particleSize + 0.5,
                opacity: Math.random() * 0.5 + 0.1
            });
        }

        window.addEventListener('resize', function () {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    function updateParticles(ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var style = getComputedStyle(document.documentElement);
        var particleColor = style.getPropertyValue('--particle-color').trim() || 'rgba(129,140,248,0.4)';
        var baseColor = particleColor.replace(/[\d.]+\)$/, '');

        State.particles.forEach(function (p) {
            var dx = State.smoothX - p.x;
            var dy = State.smoothY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < Config.mouseInfluenceRadius && dist > 1) {
                var force = (Config.mouseInfluenceRadius - dist) / Config.mouseInfluenceRadius;
                p.vx += (dx / dist) * force * Config.mouseForce;
                p.vy += (dy / dist) * force * Config.mouseForce;
            }

            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            var velFactor = Math.min(Math.abs(State.smoothVelocity) / 20, 1);
            var drawOpacity = p.opacity + velFactor * 0.3;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = baseColor + drawOpacity + ')';
            ctx.fill();
        });

        if (State.particles.length > 1) {
            for (var i = 0; i < State.particles.length; i++) {
                for (var j = i + 1; j < State.particles.length; j++) {
                    var dx2 = State.particles[i].x - State.particles[j].x;
                    var dy2 = State.particles[i].y - State.particles[j].y;
                    var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    if (dist2 < 100) {
                        var lineOpacity = (1 - dist2 / 100) * 0.08;
                        ctx.beginPath();
                        ctx.moveTo(State.particles[i].x, State.particles[i].y);
                        ctx.lineTo(State.particles[j].x, State.particles[j].y);
                        ctx.strokeStyle = baseColor + lineOpacity + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }
    }

    function updateScrollProgress() {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? State.scrollY / docHeight : 0;
        progress = Math.max(0, Math.min(1, progress));

        if (DOM.progressFill) {
            DOM.progressFill.style.height = (progress * 100) + '%';
        }

        if (DOM.ringFill) {
            var circumference = 339.292;
            DOM.ringFill.style.strokeDashoffset = circumference * (1 - progress);
        }

        if (DOM.ringLabel) {
            DOM.ringLabel.textContent = Math.round(progress * 100) + '%';
        }
    }

    function updateScrollVelocity() {
        var rawVelocity = State.scrollY - State.prevScrollY;
        State.scrollVelocity = rawVelocity;
        State.smoothVelocity = State.smoothVelocity * Config.velocityDecay + rawVelocity * (1 - Config.velocityDecay);
        State.prevScrollY = State.scrollY;

        var absVelocity = Math.abs(State.smoothVelocity);
        var normalizedVel = Math.min(absVelocity / 30, 1);

        if (DOM.velocityFill) {
            DOM.velocityFill.style.setProperty('--vel', normalizedVel * 100 + '%');
            var afterEl = DOM.velocityFill.querySelector(':after');
            DOM.velocityFill.style.cssText = '';
            DOM.velocityFill.style.width = '60px';
            DOM.velocityFill.style.height = '4px';
            DOM.velocityFill.style.borderRadius = '2px';
            DOM.velocityFill.style.background = 'rgba(255,255,255,0.06)';
            DOM.velocityFill.style.position = 'relative';
            DOM.velocityFill.style.overflow = 'hidden';
        }

        var innerFill = DOM.velocityFill;
        if (!innerFill._innerBar) {
            var bar = document.createElement('div');
            bar.style.cssText = 'position:absolute;top:0;left:0;height:100%;border-radius:2px;background:var(--color-accent);transition:width 0.1s ease-out;';
            innerFill.style.position = 'relative';
            innerFill.appendChild(bar);
            innerFill._innerBar = bar;
        }
        innerFill._innerBar.style.width = (normalizedVel * 100) + '%';

        if (DOM.velocityLabel) {
            DOM.velocityLabel.textContent = absVelocity.toFixed(1);
        }
    }

    function updateMorphDemo() {
        if (!DOM.morphShape) return;

        var absVelocity = Math.abs(State.smoothVelocity);
        var factor = Math.min(absVelocity / 25, 1);

        var scale = 1 + factor * 0.5;
        var rotate = State.smoothVelocity * 1.5;
        var radius = 20 - factor * 12;

        DOM.morphShape.style.transform = 'scale(' + scale + ') rotate(' + rotate + 'deg)';
        DOM.morphShape.style.borderRadius = Math.max(radius, 8) + 'px';

        if (DOM.morphSpeed) DOM.morphSpeed.textContent = 'speed: ' + absVelocity.toFixed(2);
        if (DOM.morphScale) DOM.morphScale.textContent = 'scale: ' + scale.toFixed(2);
        if (DOM.morphRotate) DOM.morphRotate.textContent = 'rotate: ' + rotate.toFixed(1) + '\u00B0';
    }

    function updateParallaxLayers() {
        DOM.parallaxLayers.forEach(function (layer) {
            var depth = parseFloat(layer.dataset.depth) || 0;
            var rect = layer.parentElement.getBoundingClientRect();
            var centerY = rect.top + rect.height / 2;
            var viewCenter = window.innerHeight / 2;
            var offset = (centerY - viewCenter) * depth;

            layer.style.transform = 'translateY(' + offset + 'px)';
        });
    }

    function updateDepthCards() {
        DOM.depthCards.forEach(function (card) {
            var depth = parseFloat(card.dataset.depth) || 0;
            var rect = card.getBoundingClientRect();
            var centerY = rect.top + rect.height / 2;
            var viewCenter = window.innerHeight / 2;
            var offset = (centerY - viewCenter) * depth;

            card.style.transform = 'translateY(' + offset + 'px)';
        });
    }

    function updateSpringCards() {
        var scrollFactor = State.smoothVelocity * 0.15;

        DOM.springCards.forEach(function (card) {
            card._targetY = -scrollFactor;
            var springForce = (card._targetY - card._springY) * Config.springStiffness;
            card._springVel = (card._springVel + springForce) * Config.springDamping;
            card._springY += card._springVel;

            card.style.transform = 'translateY(' + card._springY + 'px)';
        });
    }

    function updateCursorGlow() {
        State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
        State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

        if (DOM.cursorGlow) {
            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';
            if (State.mouseX > 0 && State.mouseY > 0) {
                DOM.cursorGlow.classList.add('visible');
            }
        }
    }

    function startLoop() {
        var canvas = DOM.particleCanvas;
        var ctx = canvas.getContext('2d');

        function tick() {
            State.time++;

            updateScrollVelocity();
            updateScrollProgress();
            updateParallaxLayers();
            updateDepthCards();
            updateSpringCards();
            updateMorphDemo();
            updateCursorGlow();
            updateParticles(ctx, canvas);

            State.rafId = requestAnimationFrame(tick);
        }

        State.rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
