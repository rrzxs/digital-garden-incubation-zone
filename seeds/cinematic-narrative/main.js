(function () {
    'use strict';

    var DOM = {
        stage: document.getElementById('narrative-stage'),
        progressFill: document.getElementById('progress-fill'),
        chapterNav: document.getElementById('chapter-nav'),
        cursorLens: document.getElementById('cursor-lens'),
        counterValue: document.getElementById('counter-value'),
        particleField: document.getElementById('particle-field'),
        scenes: document.querySelectorAll('.scene'),
        titleLines: document.querySelectorAll('.title-line'),
        coverSubtitle: document.querySelector('.cover-subtitle'),
        revealLines: document.querySelectorAll('.reveal-line'),
        stripBars: document.querySelectorAll('.strip-bar'),
        chiaroscuroDemo: document.getElementById('chiaroscuro-demo'),
        lightSpot: document.getElementById('light-spot'),
        tempoCanvas: document.getElementById('tempo-canvas'),
        tempoBtns: document.querySelectorAll('.tempo-btn'),
        montageCells: document.querySelectorAll('.montage-cell'),
        replayBtn: document.getElementById('replay-btn')
    };

    var State = {
        currentScene: 0,
        mouseX: 0,
        mouseY: 0,
        lensX: 0,
        lensY: 0,
        frameCount: 0,
        tempoSpeed: 'slow',
        tempoAnimId: null
    };

    var Config = {
        particleCount: 60,
        particleMaxSpeed: 0.3,
        tempoSpeeds: { slow: 0.4, normal: 1.0, fast: 2.5 }
    };

    function init() {
        createChapterDots();
        setupIntersectionObserver();
        setupScrollProgress();
        setupCursorLens();
        setupParticleField();
        setupChiaroscuro();
        setupTempoVisualizer();
        setupReplayButton();
        setupKeyboardNavigation();
        setupFrameCounter();
        revealCoverScene();
    }

    function createChapterDots() {
        var count = DOM.scenes.length;
        for (var i = 0; i < count; i++) {
            var dot = document.createElement('div');
            dot.className = 'chapter-dot' + (i === 0 ? ' active' : '');
            dot.dataset.index = i;
            dot.addEventListener('click', function () {
                scrollToScene(parseInt(this.dataset.index));
            });
            DOM.chapterNav.appendChild(dot);
        }
    }

    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var scene = entry.target;
                    var index = parseInt(scene.dataset.chapter);
                    activateScene(scene, index);
                    updateChapterDots(index);
                    updateFrameCounter(index);
                    triggerSceneReveal(scene);
                }
            });
        }, {
            root: null,
            rootMargin: '-15% 0px -15% 0px',
            threshold: 0.35
        });

        DOM.scenes.forEach(function (scene) {
            observer.observe(scene);
        });
    }

    function activateScene(scene, index) {
        State.currentScene = index;

        DOM.scenes.forEach(function (s) {
            var content = s.querySelector('.scene-content');
            if (content) content.classList.remove('visible');
        });

        var content = scene.querySelector('.scene-content');
        if (content) {
            requestAnimationFrame(function () {
                content.classList.add('visible');
            });
        }
    }

    function updateChapterDots(activeIndex) {
        var dots = DOM.chapterNav.querySelectorAll('.chapter-dot');
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === activeIndex);
        });
    }

    function updateFrameCounter(index) {
        DOM.counterValue.textContent = String(index + 1).padStart(3, '0');
    }

    function triggerSceneReveal(scene) {
        var title = scene.querySelector('.scene-title');
        if (title) {
            var titleDelay = parseInt(title.dataset.delay) || 0;
            setTimeout(function () { title.classList.add('revealed'); }, titleDelay + 400);
        }

        var body = scene.querySelector('.scene-body');
        if (body) {
            var bodyDelay = parseInt(body.dataset.delay) || 200;
            setTimeout(function () { body.classList.add('revealed'); }, bodyDelay + 500);
        }

        var strips = scene.querySelectorAll('.strip-bar');
        strips.forEach(function (bar, i) {
            setTimeout(function () { bar.classList.add('revealed'); }, 500 + i * 120);
        });

        var cells = scene.querySelectorAll('.montage-cell[data-word]');
        cells.forEach(function (cell, i) {
            setTimeout(function () { cell.classList.add('revealed'); }, 600 + i * 300);
        });
    }

    function revealCoverScene() {
        var firstScene = DOM.scenes[0];
        if (!firstScene) return;

        var content = firstScene.querySelector('.scene-content');
        if (content) {
            setTimeout(function () { content.classList.add('visible'); }, 150);
        }

        DOM.titleLines.forEach(function (line, i) {
            var delay = parseInt(line.dataset.delay) || 0;
            setTimeout(function () { line.classList.add('revealed'); }, 400 + delay);
        });

        if (DOM.coverSubtitle) {
            revealCharacters(DOM.coverSubtitle);
        }
    }

    function revealCharacters(el) {
        var text = el.dataset.text || el.textContent;
        el.dataset.text = text;
        el.innerHTML = '';

        var chars = text.split('');
        chars.forEach(function (ch, i) {
            var span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            el.appendChild(span);
        });

        var charEls = el.querySelectorAll('.char');
        charEls.forEach(function (ch, i) {
            setTimeout(function () { ch.classList.add('revealed'); }, 900 + i * 30);
        });
    }

    function setupScrollProgress() {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    var progress = Math.min((scrollTop / docHeight) * 100, 100);
                    DOM.progressFill.style.width = progress + '%';
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function setupCursorLens() {
        document.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
        });

        function animateLens() {
            State.lensX += (State.mouseX - State.lensX) * 0.12;
            State.lensY += (State.mouseY - State.lensY) * 0.12;
            DOM.cursorLens.style.left = State.lensX + 'px';
            DOM.cursorLens.style.top = State.lensY + 'px';
            requestAnimationFrame(animateLens);
        }
        animateLens();
    }

    function setupParticleField() {
        var canvas = DOM.particleField;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var w, h;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        for (var i = 0; i < Config.particleCount; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * Config.particleMaxSpeed,
                vy: (Math.random() - 0.5) * Config.particleMaxSpeed,
                r: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1
            });
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            particles.forEach(function (p) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(226, 160, 255, ' + p.alpha + ')';
                ctx.fill();
            });

            for (var i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x;
                    var dy = particles[i].y - particles[j].y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = 'rgba(226, 160, 255, ' + (0.06 * (1 - dist / 120)) + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(draw);
        }
        draw();
    }

    function setupChiaroscuro() {
        if (!DOM.chiaroscuroDemo) return;

        DOM.chiaroscuroDemo.addEventListener('mousemove', function (e) {
            var rect = DOM.chiaroscuroDemo.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            DOM.lightSpot.style.left = x + 'px';
            DOM.lightSpot.style.top = y + 'px';

            var shadowLayer = DOM.chiaroscuroDemo.querySelector('.shadow-layer');
            if (shadowLayer) {
                var maxDist = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
                var centerX = rect.width / 2;
                var centerY = rect.height / 2;
                var dist = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
                var opacity = Math.max(0.3, 0.85 - (dist / maxDist) * 0.5);
                shadowLayer.style.opacity = opacity;
            }

            var hintText = DOM.chiaroscuroDemo.querySelector('.chiaroscuro-text');
            if (hintText) hintText.style.opacity = '0';
        });

        DOM.chiaroscuroDemo.addEventListener('mouseleave', function () {
            var shadowLayer = DOM.chiaroscuroDemo.querySelector('.shadow-layer');
            if (shadowLayer) shadowLayer.style.opacity = '0.85';
            var hintText = DOM.chiaroscuroDemo.querySelector('.chiaroscuro-text');
            if (hintText) hintText.style.opacity = '1';
        });
    }

    function setupTempoVisualizer() {
        var canvas = DOM.tempoCanvas;
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;

        function resizeCanvas() {
            var rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        }
        resizeCanvas();

        var waves = [
            { freq: 0.015, amp: 0.3, phase: 0, color: 'rgba(226, 160, 255, 0.6)' },
            { freq: 0.025, amp: 0.2, phase: 2, color: 'rgba(127, 219, 202, 0.4)' },
            { freq: 0.01, amp: 0.15, phase: 4, color: 'rgba(251, 191, 36, 0.3)' }
        ];

        var time = 0;

        function drawTempo() {
            var rect = canvas.getBoundingClientRect();
            var w = rect.width;
            var h = rect.height;

            ctx.clearRect(0, 0, w, h);

            var speed = Config.tempoSpeeds[State.tempoSpeed] || 1;
            time += 0.02 * speed;

            waves.forEach(function (wave) {
                ctx.beginPath();
                for (var x = 0; x <= w; x++) {
                    var y = h / 2 + Math.sin(x * wave.freq + time + wave.phase) * h * wave.amp;
                    y += Math.sin(x * wave.freq * 0.5 + time * 0.7) * h * wave.amp * 0.3;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = wave.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            State.tempoAnimId = requestAnimationFrame(drawTempo);
        }

        DOM.tempoBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                DOM.tempoBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                State.tempoSpeed = btn.dataset.speed;
            });
        });

        var tempoObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    drawTempo();
                } else {
                    if (State.tempoAnimId) {
                        cancelAnimationFrame(State.tempoAnimId);
                        State.tempoAnimId = null;
                    }
                }
            });
        }, { threshold: 0.1 });

        tempoObserver.observe(canvas);
    }

    function setupReplayButton() {
        if (!DOM.replayBtn) return;

        DOM.replayBtn.addEventListener('click', function () {
            resetAllAnimations();
            scrollToScene(0);
        });
    }

    function resetAllAnimations() {
        document.querySelectorAll('.scene-title, .scene-body').forEach(function (el) {
            el.classList.remove('revealed');
        });
        document.querySelectorAll('.title-line').forEach(function (el) {
            el.classList.remove('revealed');
        });
        document.querySelectorAll('.strip-bar').forEach(function (el) {
            el.classList.remove('revealed');
        });
        document.querySelectorAll('.montage-cell').forEach(function (el) {
            el.classList.remove('revealed');
        });
        document.querySelectorAll('.scene-content').forEach(function (el) {
            el.classList.remove('visible');
        });

        if (DOM.coverSubtitle) {
            revealCharacters(DOM.coverSubtitle);
        }
    }

    function scrollToScene(index) {
        var target = DOM.scenes[index];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                scrollToScene(Math.min(State.currentScene + 1, DOM.scenes.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollToScene(Math.max(State.currentScene - 1, 0));
            } else if (e.key === 'Home') {
                e.preventDefault();
                scrollToScene(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                scrollToScene(DOM.scenes.length - 1);
            }
        });
    }

    function setupFrameCounter() {
        var start = performance.now();
        function tick() {
            var elapsed = (performance.now() - start) / 1000;
            State.frameCount = Math.floor(elapsed * 24);
            DOM.counterValue.textContent = String(State.frameCount % 1000).padStart(3, '0');
            requestAnimationFrame(tick);
        }
        tick();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
