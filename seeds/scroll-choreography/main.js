(function () {
    'use strict';

    // === DOM Elements ===
    var DOM = {
        main: document.getElementById('main-content'),
        progressFill: document.getElementById('progress-fill'),
        sectionDots: document.getElementById('section-dots'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        particleCanvas: document.getElementById('particle-field'),
        themeSwitcher: document.getElementById('theme-switcher'),
        tempoValue: document.getElementById('tempo-value'),
        tempoBar: document.getElementById('tempo-bar'),
        actValue: document.getElementById('act-value'),
        conductorStick: document.getElementById('conductor-stick'),
        megaTitle: document.getElementById('mega-title'),
        parallaxStack: document.getElementById('parallax-stack'),
        pulseGrid: document.getElementById('pulse-grid'),
        tiltGallery: document.getElementById('tilt-gallery'),
        timelineProgress: document.getElementById('timeline-progress'),
        timelineCursor: document.getElementById('timeline-cursor'),
        timelineMarks: document.querySelectorAll('.timeline-mark'),
        scenes: document.querySelectorAll('.scene'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        tiltElements: document.querySelectorAll('[data-tilt]'),
        revealElements: document.querySelectorAll('[data-reveal]'),
        revealTexts: document.querySelectorAll('[data-reveal-text]'),
        revealLines: document.querySelectorAll('[data-reveal-lines]'),
        megaChars: document.querySelectorAll('.mega-char'),
        parallaxLayers: document.querySelectorAll('[data-depth]'),
        pulseCells: document.querySelectorAll('[data-pulse]')
    };

    // === State ===
    var State = {
        currentIndex: 0,
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        smoothX: window.innerWidth / 2,
        smoothY: window.innerHeight / 2,
        scrollSpeed: 0,
        smoothSpeed: 0,
        lastScrollY: window.scrollY,
        totalSections: DOM.scenes.length,
        isAnimating: false,
        pulseActive: false,
        rafId: null
    };

    // === Utility ===
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function map(v, inMin, inMax, outMin, outMax) {
        return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
    }

    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

    // === Theme Manager ===
    var ThemeManager = {
        current: 'aurora',
        init: function () {
            var self = this;
            DOM.themeBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var theme = btn.getAttribute('data-theme');
                    self.set(theme);
                    DOM.themeBtns.forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    ParticleField.recolor();
                });
            });
        },
        set: function (theme) {
            this.current = theme;
            document.documentElement.setAttribute('data-theme', theme);
        }
    };

    // === Section Dots ===
    var SectionDots = {
        init: function () {
            DOM.scenes.forEach(function (scene, i) {
                var dot = document.createElement('div');
                dot.className = 'section-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('data-index', i);
                dot.addEventListener('click', function () {
                    scene.scrollIntoView({ behavior: 'smooth' });
                });
                DOM.sectionDots.appendChild(dot);
            });
        },
        setActive: function (index) {
            var dots = DOM.sectionDots.querySelectorAll('.section-dot');
            dots.forEach(function (d, i) {
                d.classList.toggle('active', i === index);
            });
        }
    };

    // === Progress Tracker ===
    var ProgressTracker = {
        update: function () {
            var scrolled = window.scrollY;
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            var percent = maxScroll > 0 ? clamp((scrolled / maxScroll) * 100, 0, 100) : 0;
            DOM.progressFill.style.height = percent + '%';
        }
    };

    // === Active Section Observer ===
    var SectionObserver = {
        observer: null,
        init: function () {
            var self = this;
            this.observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        var index = parseInt(entry.target.getAttribute('data-section'), 10);
                        if (index !== State.currentIndex) {
                            self.onSectionChange(index);
                        }
                    }
                });
            }, { threshold: [0.5, 0.6, 0.7] });

            DOM.scenes.forEach(function (scene) { self.observer.observe(scene); });
        },
        onSectionChange: function (index) {
            State.currentIndex = index;
            SectionDots.setActive(index);
            DOM.actValue.textContent = ROMAN[index] + ' / VII';
            if (DOM.transitionFlash) {
                DOM.transitionFlash.classList.remove('flash');
                void DOM.transitionFlash.offsetWidth;
                DOM.transitionFlash.classList.add('flash');
            }
            TimelineStage.updateLabel(index);
        }
    };

    // === Reveal Manager (IntersectionObserver based) ===
    var RevealManager = {
        init: function () {
            // Split reveal-text into chars
            DOM.revealTexts.forEach(function (el) {
                var text = el.textContent;
                el.textContent = '';
                var chars = text.split('');
                chars.forEach(function (ch, i) {
                    var span = document.createElement('span');
                    span.className = 'char';
                    span.textContent = ch === ' ' ? '\u00A0' : ch;
                    span.style.transitionDelay = (i * 30) + 'ms';
                    el.appendChild(span);
                });
            });

            // Wrap reveal-lines inner
            DOM.revealLines.forEach(function (el) {
                var lines = el.querySelectorAll('.line');
                lines.forEach(function (line, i) {
                    var inner = document.createElement('span');
                    inner.className = 'line-inner';
                    inner.style.transitionDelay = (i * 120) + 'ms';
                    var text = line.textContent;
                    line.textContent = '';
                    inner.textContent = text;
                    line.appendChild(inner);
                });
            });

            // Observe all reveal targets
            var targets = [];
            DOM.revealElements.forEach(function (el) { targets.push(el); });
            DOM.revealTexts.forEach(function (el) { targets.push(el); });
            DOM.revealLines.forEach(function (el) { targets.push(el); });
            DOM.megaChars.forEach(function (el) { targets.push(el); });

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        if (entry.target.hasAttribute('data-mega-reveal')) {
                            RevealManager.revealMega();
                        }
                    }
                });
            }, { threshold: 0.3 });

            targets.forEach(function (el) { observer.observe(el); });

            // Mega title observer (the parent)
            if (DOM.megaTitle) {
                var megaObs = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            RevealManager.revealMega();
                            megaObs.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.4 });
                megaObs.observe(DOM.megaTitle);
            }
        },
        revealMega: function () {
            DOM.megaChars.forEach(function (ch, i) {
                setTimeout(function () {
                    ch.classList.add('revealed');
                }, i * 150);
            });
        }
    };

    // === Parallax Manager ===
    var ParallaxManager = {
        init: function () {
            // Mouse-based parallax for parallax layers (data-depth)
            // Scroll-based parallax handled in ScrollChoreography.update
        },
        update: function () {
            var cx = State.smoothX / window.innerWidth - 0.5;
            var cy = State.smoothY / window.innerHeight - 0.5;

            DOM.parallaxLayers.forEach(function (layer) {
                var depth = parseFloat(layer.getAttribute('data-depth')) || 0.2;
                var tx = cx * depth * 60;
                var ty = cy * depth * 60;
                layer.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
            });
        }
    };

    // === Tilt Manager (3D card tilt on hover/mouse proximity) ===
    var TiltManager = {
        init: function () {
            DOM.tiltElements.forEach(function (el) {
                var intensity = parseFloat(el.getAttribute('data-intensity')) || 1.0;
                el.addEventListener('mousemove', function (e) {
                    var rect = el.getBoundingClientRect();
                    var px = (e.clientX - rect.left) / rect.width;
                    var py = (e.clientY - rect.top) / rect.height;
                    var rx = (0.5 - py) * 16 * intensity;
                    var ry = (px - 0.5) * 16 * intensity;
                    el.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(10px)';

                    // Glow position
                    el.style.setProperty('--glow-x', (px * 100) + '%');
                    el.style.setProperty('--glow-y', (py * 100) + '%');
                });
                el.addEventListener('mouseleave', function () {
                    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                });
            });
        }
    };

    // === Pulse Grid (scroll-speed driven) ===
    var PulseGrid = {
        lastIndex: -1,
        update: function () {
            var speed = State.smoothSpeed;
            var normalized = clamp(speed / 30, 0, 1);

            if (normalized < 0.1) {
                // Calm down: remove pulsing
                if (this.lastIndex !== -1) {
                    DOM.pulseCells.forEach(function (c) { c.classList.remove('pulsing'); });
                    this.lastIndex = -1;
                }
                return;
            }

            // Wave index based on time + speed
            var t = performance.now() * 0.001 * (1 + normalized * 3);
            var activeIndex = Math.floor((Math.sin(t) * 0.5 + 0.5) * DOM.pulseCells.length) % DOM.pulseCells.length;

            if (activeIndex !== this.lastIndex) {
                DOM.pulseCells.forEach(function (c, i) {
                    var distance = Math.abs(i - activeIndex);
                    var wave = Math.max(0, 1 - distance / 4);
                    if (wave > 0.3) {
                        c.classList.add('pulsing');
                        c.style.transform = 'scale(' + (1 + wave * normalized * 0.3) + ')';
                    } else {
                        c.classList.remove('pulsing');
                        c.style.transform = 'scale(1)';
                    }
                });
                this.lastIndex = activeIndex;
            }
        }
    };

    // === Timeline Stage ===
    var TimelineStage = {
        init: function () {
            // Position marks evenly (CSS flex handles it)
        },
        update: function () {
            var scrolled = window.scrollY;
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            var percent = maxScroll > 0 ? clamp((scrolled / maxScroll) * 100, 0, 100) : 0;

            if (DOM.timelineProgress) {
                DOM.timelineProgress.style.width = percent + '%';
            }
            if (DOM.timelineCursor) {
                DOM.timelineCursor.style.left = percent + '%';
            }

            // Mark passed states
            var activeMark = Math.floor((percent / 100) * (DOM.timelineMarks.length - 1));
            DOM.timelineMarks.forEach(function (mark, i) {
                mark.classList.toggle('passed', i <= activeMark);
            });
        },
        updateLabel: function (sectionIndex) {
            // No-op; labels are static timecodes
        }
    };

    // === Scroll Choreography (main scroll-driven logic) ===
    var ScrollChoreography = {
        init: function () {
            var self = this;
            window.addEventListener('scroll', function () {
                self.onScroll();
            }, { passive: true });
        },
        onScroll: function () {
            var currentY = window.scrollY;
            var delta = currentY - State.lastScrollY;
            State.scrollSpeed = Math.abs(delta);
            State.lastScrollY = currentY;

            ProgressTracker.update();
            TimelineStage.update();

            // Activate conductor stick on fast scroll
            if (State.scrollSpeed > 8 && DOM.conductorStick) {
                DOM.conductorStick.classList.add('active');
                var angle = clamp(State.scrollSpeed * 0.5, -45, 45);
                if (delta < 0) angle = -angle;
                DOM.conductorStick.style.transform = 'rotate(' + angle + 'deg)';
            } else if (DOM.conductorStick) {
                DOM.conductorStick.classList.remove('active');
            }

            // Scroll-driven vertical parallax on parallax cards
            if (DOM.parallaxStack) {
                var stackRect = DOM.parallaxStack.getBoundingClientRect();
                var viewportCenter = window.innerHeight / 2;
                var stackCenter = stackRect.top + stackRect.height / 2;
                var offset = (stackCenter - viewportCenter) / window.innerHeight;

                var cards = DOM.parallaxStack.querySelectorAll('.parallax-card');
                cards.forEach(function (card) {
                    var depth = parseFloat(card.getAttribute('data-depth')) || 0.2;
                    var ty = offset * depth * 200;
                    // Combine with existing mouse transform if any
                    card.style.setProperty('--scroll-ty', ty + 'px');
                });
            }
        },
        update: function () {
            // Smooth speed decay
            State.smoothSpeed = lerp(State.smoothSpeed, State.scrollSpeed, 0.1);
            State.scrollSpeed *= 0.9; // decay

            // Tempo HUD
            var tempo = clamp(State.smoothSpeed / 40, 0, 1);
            if (DOM.tempoValue) {
                DOM.tempoValue.textContent = tempo.toFixed(2);
            }
            if (DOM.tempoBar) {
                DOM.tempoBar.style.width = (tempo * 100) + '%';
            }
        }
    };

    // === Cursor Manager ===
    var CursorManager = {
        init: function () {
            var self = this;
            document.addEventListener('mousemove', function (e) {
                State.mouseX = e.clientX;
                State.mouseY = e.clientY;
            });
        },
        update: function () {
            State.smoothX = lerp(State.smoothX, State.mouseX, 0.08);
            State.smoothY = lerp(State.smoothY, State.mouseY, 0.08);

            if (DOM.cursorGlow) {
                DOM.cursorGlow.style.left = State.smoothX + 'px';
                DOM.cursorGlow.style.top = State.smoothY + 'px';
            }

            ParallaxManager.update();
        }
    };

    // === Particle Field ===
    var ParticleField = {
        ctx: null,
        particles: [],
        count: 60,
        init: function () {
            var canvas = DOM.particleCanvas;
            if (!canvas) return;
            this.ctx = canvas.getContext('2d');
            this.resize();
            this.create();
            var self = this;
            window.addEventListener('resize', function () {
                self.resize();
                self.create();
            });
        },
        resize: function () {
            var canvas = DOM.particleCanvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        },
        create: function () {
            this.particles = [];
            for (var i = 0; i < this.count; i++) {
                this.particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.5 + 0.1,
                    phase: Math.random() * Math.PI * 2
                });
            }
        },
        recolor: function () {
            // Particles read CSS var each frame, no-op
        },
        update: function () {
            if (!this.ctx) return;
            var ctx = this.ctx;
            var w = window.innerWidth;
            var h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);

            var color = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim();

            var t = performance.now() * 0.001;

            for (var i = 0; i < this.particles.length; i++) {
                var p = this.particles[i];

                // Flow field drift
                p.vx += Math.sin(t + p.phase) * 0.005;
                p.vy += Math.cos(t * 0.8 + p.phase) * 0.005;
                p.vx = clamp(p.vx, -0.8, 0.8);
                p.vy = clamp(p.vy, -0.8, 0.8);

                // Mouse attraction
                var dx = State.smoothX - p.x;
                var dy = State.smoothY - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 0) {
                    var force = (1 - dist / 200) * 0.02;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                p.x += p.vx;
                p.y += p.vy;

                // Wrap
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                // Twinkle
                var twinkle = Math.sin(t * 2 + p.phase) * 0.3 + 0.7;
                var alpha = p.opacity * twinkle;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.fill();
            }

            // Connect nearby particles
            ctx.globalAlpha = 1;
            for (var a = 0; a < this.particles.length; a++) {
                for (var b = a + 1; b < this.particles.length; b++) {
                    var pa = this.particles[a];
                    var pb = this.particles[b];
                    var ddx = pa.x - pb.x;
                    var ddy = pa.y - pb.y;
                    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (dd < 120) {
                        ctx.beginPath();
                        ctx.moveTo(pa.x, pa.y);
                        ctx.lineTo(pb.x, pb.y);
                        ctx.strokeStyle = color;
                        ctx.globalAlpha = (1 - dd / 120) * 0.15;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }
    };

    // === Keyboard Navigation ===
    var KeyboardNav = {
        init: function () {
            document.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                    e.preventDefault();
                    var next = clamp(State.currentIndex + 1, 0, State.totalSections - 1);
                    DOM.scenes[next].scrollIntoView({ behavior: 'smooth' });
                } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                    e.preventDefault();
                    var prev = clamp(State.currentIndex - 1, 0, State.totalSections - 1);
                    DOM.scenes[prev].scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    };

    // === Main Animation Loop ===
    function animate() {
        CursorManager.update();
        ScrollChoreography.update();
        PulseGrid.update();
        ParticleField.update();
        State.rafId = requestAnimationFrame(animate);
    }

    // === Boot ===
    function init() {
        ThemeManager.init();
        SectionDots.init();
        SectionObserver.init();
        RevealManager.init();
        ParallaxManager.init();
        TiltManager.init();
        TimelineStage.init();
        ScrollChoreography.init();
        CursorManager.init();
        ParticleField.init();
        KeyboardNav.init();

        // Initial updates
        ProgressTracker.update();
        TimelineStage.update();
        DOM.actValue.textContent = ROMAN[0] + ' / VII';

        animate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
