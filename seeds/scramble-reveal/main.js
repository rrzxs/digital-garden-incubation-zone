(function () {
    'use strict';

    var SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿';

    var CONFIG = {
        mode: 'cascade',
        speed: 50,
        density: 60,
        theme: 'emerald',
        looping: false,
        revealing: false,
        scrambling: false
    };

    var CHAR_STATES = { HIDDEN: 0, SCRAMBLING: 1, REVEALED: 2 };

    var chars = [];
    var revealTimer = null;
    var loopTimer = null;
    var mouseX = 0;
    var mouseY = 0;
    var particles = [];
    var animFrameId = null;

    var dom = {
        stage: document.getElementById('reveal-stage'),
        text: document.getElementById('reveal-text'),
        cursor: document.getElementById('reveal-cursor'),
        input: document.getElementById('text-input'),
        modeSelector: document.getElementById('mode-selector'),
        themeSelector: document.getElementById('theme-selector'),
        speedSlider: document.getElementById('speed-slider'),
        densitySlider: document.getElementById('density-slider'),
        speedValue: document.getElementById('speed-value'),
        densityValue: document.getElementById('density-value'),
        btnReveal: document.getElementById('btn-reveal'),
        btnScramble: document.getElementById('btn-scramble'),
        btnLoop: document.getElementById('btn-loop'),
        currentMode: document.getElementById('current-mode'),
        progressCounter: document.getElementById('progress-counter'),
        charCounter: document.getElementById('char-counter'),
        canvas: document.getElementById('particle-canvas')
    };

    var ctx = dom.canvas ? dom.canvas.getContext('2d') : null;

    function init() {
        bindEvents();
        initParticles();
        resizeCanvas();
        startParticleLoop();
        initText();
        scramble();
    }

    function bindEvents() {
        dom.btnReveal.addEventListener('click', reveal);
        dom.btnScramble.addEventListener('click', scramble);
        dom.btnLoop.addEventListener('click', toggleLoop);

        dom.input.addEventListener('input', function () {
            initText();
            scramble();
        });

        dom.modeSelector.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            dom.modeSelector.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            CONFIG.mode = btn.dataset.mode;
            dom.currentMode.textContent = CONFIG.mode.toUpperCase();
        });

        dom.themeSelector.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (!btn) return;
            dom.themeSelector.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            CONFIG.theme = btn.dataset.theme;
            document.body.setAttribute('data-theme', CONFIG.theme);
            updateParticleColors();
        });

        dom.speedSlider.addEventListener('input', function () {
            CONFIG.speed = parseInt(this.value, 10);
            dom.speedValue.textContent = this.value;
        });

        dom.densitySlider.addEventListener('input', function () {
            CONFIG.density = parseInt(this.value, 10);
            dom.densityValue.textContent = this.value;
        });

        window.addEventListener('resize', resizeCanvas);
        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && document.activeElement !== dom.input) {
                e.preventDefault();
                reveal();
            }
        });
    }

    function initText() {
        var text = dom.input.value || 'THE FUTURE IS NOW';
        dom.text.innerHTML = '';
        chars = [];

        for (var i = 0; i < text.length; i++) {
            var span = document.createElement('span');
            span.className = 'char' + (text[i] === ' ' ? ' space' : '');
            span.textContent = text[i];
            span.dataset.index = i;
            dom.text.appendChild(span);

            chars.push({
                el: span,
                target: text[i],
                state: CHAR_STATES.HIDDEN,
                scrambleCount: 0,
                scrambleMax: 0,
                delay: 0,
                elapsed: 0
            });
        }

        dom.charCounter.textContent = text.length;
        dom.progressCounter.textContent = '0';
    }

    function getSpeedDelay() {
        var normalized = CONFIG.speed / 100;
        return Math.max(8, 120 - normalized * 110);
    }

    function getScrambleRounds() {
        var normalized = CONFIG.density / 100;
        return Math.max(1, Math.round(normalized * 12));
    }

    function getRandomChar() {
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }

    function scramble() {
        stopReveal();
        CONFIG.scrambling = true;

        var baseDelay = 20;
        chars.forEach(function (c, i) {
            c.state = CHAR_STATES.HIDDEN;
            c.scrambleCount = 0;
            c.scrambleMax = getScrambleRounds();
            c.elapsed = 0;

            var delay;
            switch (CONFIG.mode) {
                case 'wave':
                    delay = i * baseDelay;
                    break;
                case 'vortex':
                    var center = chars.length / 2;
                    delay = Math.abs(i - center) * baseDelay;
                    break;
                case 'glitch':
                    delay = Math.random() * chars.length * baseDelay * 0.5;
                    break;
                case 'quantum':
                    delay = 0;
                    break;
                default:
                    delay = i * baseDelay * 0.5;
            }

            c.delay = delay;
            c.el.className = 'char' + (c.target === ' ' ? ' space' : '');
            c.el.textContent = c.target === ' ' ? '' : getRandomChar();
            c.el.classList.add('scrambled');
        });

        dom.cursor.classList.remove('active');
        dom.progressCounter.textContent = '0';
        CONFIG.scrambling = false;
    }

    function reveal() {
        stopReveal();
        CONFIG.revealing = true;

        var baseDelay = getSpeedDelay();
        var rounds = getScrambleRounds();

        chars.forEach(function (c) {
            c.state = CHAR_STATES.SCRAMBLING;
            c.scrambleCount = 0;
            c.scrambleMax = rounds;
            c.elapsed = 0;

            switch (CONFIG.mode) {
                case 'wave':
                    c.delay = chars.indexOf(c) * baseDelay;
                    break;
                case 'vortex':
                    var center = chars.length / 2;
                    c.delay = Math.abs(chars.indexOf(c) - center) * baseDelay;
                    break;
                case 'glitch':
                    c.delay = Math.random() * chars.length * baseDelay * 0.3;
                    break;
                case 'quantum':
                    c.delay = 0;
                    c.scrambleMax = rounds + Math.floor(Math.random() * 6);
                    break;
                default:
                    c.delay = chars.indexOf(c) * baseDelay;
            }
        });

        dom.cursor.classList.add('active');
        var startTime = performance.now();
        var revealedCount = 0;

        function tick(now) {
            var dt = now - startTime;
            var allDone = true;
            revealedCount = 0;

            chars.forEach(function (c) {
                if (c.target === ' ') {
                    c.state = CHAR_STATES.REVEALED;
                    c.el.className = 'char space revealed';
                    c.el.textContent = '';
                    revealedCount++;
                    return;
                }

                if (c.state === CHAR_STATES.REVEALED) {
                    revealedCount++;
                    return;
                }

                allDone = false;

                if (dt < c.delay) return;

                c.elapsed += 16;

                if (c.scrambleCount < c.scrambleMax) {
                    c.el.textContent = getRandomChar();
                    c.el.className = 'char scrambled';
                    c.el.style.opacity = 0.3 + (c.scrambleCount / c.scrambleMax) * 0.7;
                    c.scrambleCount++;
                } else {
                    c.state = CHAR_STATES.REVEALED;
                    c.el.textContent = c.target;
                    c.el.className = 'char revealed';
                    c.el.style.opacity = '';
                    spawnGhost(c);
                    revealedCount++;
                }
            });

            var progress = chars.length > 0 ? Math.round((revealedCount / chars.length) * 100) : 0;
            dom.progressCounter.textContent = progress;

            if (!allDone) {
                revealTimer = requestAnimationFrame(tick);
            } else {
                CONFIG.revealing = false;
                dom.cursor.classList.remove('active');
                spawnBurstParticles();

                if (CONFIG.looping) {
                    loopTimer = setTimeout(function () {
                        scramble();
                        setTimeout(function () {
                            reveal();
                        }, 600);
                    }, 1500);
                }
            }
        }

        revealTimer = requestAnimationFrame(tick);
    }

    function spawnGhost(c) {
        var ghost = document.createElement('span');
        ghost.className = 'char ghost';
        ghost.textContent = c.target;
        c.el.parentElement.appendChild(ghost);

        var rect = c.el.getBoundingClientRect();
        var stageRect = dom.stage.getBoundingClientRect();
        ghost.style.left = (rect.left - stageRect.left) + 'px';
        ghost.style.top = (rect.top - stageRect.top) + 'px';
        ghost.style.position = 'absolute';

        setTimeout(function () {
            if (ghost.parentElement) ghost.parentElement.removeChild(ghost);
        }, 1000);
    }

    function stopReveal() {
        if (revealTimer) {
            cancelAnimationFrame(revealTimer);
            revealTimer = null;
        }
        CONFIG.revealing = false;
    }

    function toggleLoop() {
        CONFIG.looping = !CONFIG.looping;
        dom.btnLoop.classList.toggle('loop-active', CONFIG.looping);

        if (CONFIG.looping) {
            reveal();
        } else {
            if (loopTimer) {
                clearTimeout(loopTimer);
                loopTimer = null;
            }
        }
    }

    function initParticles() {
        particles = [];
        var count = Math.min(80, Math.floor(window.innerWidth / 15));
        for (var i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.02 + 0.005
        };
    }

    function updateParticleColors() {
    }

    function resizeCanvas() {
        if (!dom.canvas) return;
        dom.canvas.width = window.innerWidth;
        dom.canvas.height = window.innerHeight;
    }

    function startParticleLoop() {
        function frame() {
            drawParticles();
            animFrameId = requestAnimationFrame(frame);
        }
        animFrameId = requestAnimationFrame(frame);
    }

    function drawParticles() {
        if (!ctx) return;
        var w = dom.canvas.width;
        var h = dom.canvas.height;
        ctx.clearRect(0, 0, w, h);

        var pc = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim();

        particles.forEach(function (p) {
            p.pulse += p.pulseSpeed;

            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                var force = (150 - dist) / 150 * 0.3;
                p.vx -= (dx / dist) * force;
                p.vy -= (dy / dist) * force;
            }

            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            var currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
            var currentSize = p.size * (0.8 + 0.2 * Math.sin(p.pulse));

            ctx.beginPath();
            ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + pc + ',' + currentOpacity + ')';
            ctx.fill();
        });

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    var lineOpacity = (1 - dist / 100) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(' + pc + ',' + lineOpacity + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function spawnBurstParticles() {
        if (!ctx) return;
        var stageRect = dom.stage.getBoundingClientRect();
        var cx = stageRect.left + stageRect.width / 2;
        var cy = stageRect.top + stageRect.height / 2;

        for (var i = 0; i < 20; i++) {
            var angle = (Math.PI * 2 * i) / 20;
            var speed = 2 + Math.random() * 3;
            var p = createParticle();
            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = 1.5 + Math.random() * 1.5;
            p.opacity = 0.8;
            particles.push(p);
        }

        setTimeout(function () {
            while (particles.length > 80) {
                particles.shift();
            }
        }, 2000);
    }

    init();
})();
