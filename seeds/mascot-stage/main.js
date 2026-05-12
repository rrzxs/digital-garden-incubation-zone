(function () {
    'use strict';

    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageArea = document.getElementById('stage-area');
    var spotlight = document.getElementById('spotlight');
    var mascot = document.getElementById('mascot');
    var emotionRing = document.getElementById('emotion-ring');
    var floatingHearts = document.getElementById('floating-hearts');
    var sparkleContainer = document.getElementById('sparkle-container');
    var transitionFlash = document.getElementById('transition-flash');
    var fpsCounter = document.getElementById('fps-counter');
    var emotionDisplay = document.getElementById('emotion-display');
    var affectionDisplay = document.getElementById('affection-display');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var themeToggle = document.getElementById('theme-toggle');
    var emotionPicker = document.getElementById('emotion-picker');
    var btnPoke = document.getElementById('btn-poke');
    var btnFeed = document.getElementById('btn-feed');
    var btnPet = document.getElementById('btn-pet');

    var pupilL = document.getElementById('pupil-l');
    var pupilR = document.getElementById('pupil-r');
    var eyelidL = document.getElementById('eyelid-l');
    var eyelidR = document.getElementById('eyelid-r');
    var earL = document.getElementById('ear-l');
    var earR = document.getElementById('ear-r');
    var noseEl = document.getElementById('nose');
    var mouthPath = document.getElementById('mouth-path');

    var state = {
        mouse: { x: -9999, y: -9999, stageX: -9999, stageY: -9999 },
        mascotRect: null,
        emotion: 'happy',
        palette: 'cosmos',
        affection: 50,
        lastBlink: 0,
        blinkInterval: 3000 + Math.random() * 2000,
        isBlinking: false,
        animating: false,
        idleTimer: 0,
        lastInteraction: Date.now(),
        dpr: window.devicePixelRatio || 1,
        lastTime: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        particles: [],
        mouthOpenness: 0,
        tiltX: 0,
        tiltY: 0,
        targetTiltX: 0,
        targetTiltY: 0
    };

    var palettes = {
        cosmos: {
            particles: [
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 },
                { r: 79, g: 70, b: 229 }
            ],
            glow: 'rgba(99, 102, 241, 0.06)',
            flash: 'rgba(99, 102, 241, 0.12)',
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            accent: '#6366f1',
            mascotPrimary: '#7c6cf0',
            mascotSecondary: '#9d8cf6',
            cheekColor: 'rgba(255, 130, 150, 0.35)'
        },
        aurora: {
            particles: [
                { r: 0, g: 212, b: 255 },
                { r: 168, g: 85, b: 247 },
                { r: 0, g: 255, b: 136 }
            ],
            glow: 'rgba(0, 212, 255, 0.06)',
            flash: 'rgba(0, 212, 255, 0.12)',
            blobs: ['#0a2a1a', '#0d1f47', '#103040', '#0a3530'],
            accent: '#06b6d4',
            mascotPrimary: '#1ab5a0',
            mascotSecondary: '#3dd6c0',
            cheekColor: 'rgba(100, 255, 200, 0.25)'
        },
        ember: {
            particles: [
                { r: 249, g: 115, b: 22 },
                { r: 239, g: 68, b: 68 },
                { r: 251, g: 191, b: 36 }
            ],
            glow: 'rgba(249, 115, 22, 0.06)',
            flash: 'rgba(249, 115, 22, 0.12)',
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            accent: '#f97316',
            mascotPrimary: '#e07830',
            mascotSecondary: '#f0a050',
            cheekColor: 'rgba(255, 160, 100, 0.35)'
        },
        void: {
            particles: [
                { r: 165, g: 180, b: 252 },
                { r: 196, g: 181, b: 253 },
                { r: 232, g: 121, b: 249 }
            ],
            glow: 'rgba(165, 180, 252, 0.06)',
            flash: 'rgba(165, 180, 252, 0.12)',
            blobs: ['#0d1530', '#101a3a', '#1a1030', '#0d1830'],
            accent: '#a5b4fc',
            mascotPrimary: '#8b7ec8',
            mascotSecondary: '#b0a4e0',
            cheekColor: 'rgba(200, 160, 255, 0.3)'
        }
    };

    var emotionNames = {
        happy: '开心',
        excited: '兴奋',
        sleepy: '困倦',
        surprised: '惊讶',
        love: '爱心',
        curious: '好奇'
    };

    var BG_PARTICLE_COUNT = 70;

    function init() {
        resizeCanvas();
        initBgParticles();
        bindEvents();
        bindControls();
        mascot.classList.add('idle');
        state.lastTime = performance.now();
        state.fpsTime = state.lastTime;
        animate(state.lastTime);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initBgParticles() {
        state.particles = [];
        for (var i = 0; i < BG_PARTICLE_COUNT; i++) {
            state.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.35 + 0.1,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.2 + 0.06,
                colorIndex: Math.floor(Math.random() * 3),
                trail: []
            });
        }
    }

    function updateBgParticles(dt) {
        var w = window.innerWidth;
        var h = window.innerHeight;

        state.particles.forEach(function (p) {
            p.phase += p.speed * 0.015 * dt;
            p.vy += Math.sin(p.phase) * 0.008 * dt;

            if (state.mouse.x > -999) {
                var dx = state.mouse.x - p.x;
                var dy = state.mouse.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = 200;
                if (dist < maxDist && dist > 1) {
                    var force = (1 - dist / maxDist);
                    force = force * force * 0.08 * dt;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            p.vx *= Math.pow(0.97, dt);
            p.vy *= Math.pow(0.97, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 4) p.trail.pop();
        });
    }

    function drawBgParticles() {
        var pal = palettes[state.palette];

        state.particles.forEach(function (p) {
            var color = pal.particles[p.colorIndex];

            for (var ti = p.trail.length - 1; ti >= 0; ti--) {
                var trailAlpha = p.alpha * (1 - ti / 4) * 0.3;
                var trailRadius = p.radius * (1 - ti / 4 * 0.5);
                ctx.beginPath();
                ctx.arc(p.trail[ti].x, p.trail[ti].y, Math.max(0.1, trailRadius), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + trailAlpha.toFixed(3) + ')';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + p.alpha.toFixed(3) + ')';
            ctx.fill();

            if (p.radius > 1.2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (p.alpha * 0.12).toFixed(3) + ')');
                grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    function drawFlowLines() {
        if (state.mouse.x < -999) return;
        var pal = palettes[state.palette];
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var maxDist = 150;
        var lineCount = 0;

        state.particles.forEach(function (p) {
            if (lineCount > 8) return;
            var dx = mx - p.x;
            var dy = my - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
                lineCount++;
                var alpha = (1 - dist / maxDist) * 0.06;
                var color = pal.particles[p.colorIndex];
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                var cp1x = p.x + (mx - p.x) * 0.3 + Math.sin(p.phase) * 15;
                var cp1y = p.y + (my - p.y) * 0.3 + Math.cos(p.phase) * 15;
                ctx.quadraticCurveTo(cp1x, cp1y, mx, my);
                ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        });
    }

    function updateMascot(dt) {
        state.mascotRect = mascot.getBoundingClientRect();

        var time = performance.now();

        if (time - state.lastBlink > state.blinkInterval && !state.isBlinking && state.emotion !== 'sleepy') {
            blink();
        }

        var timeSinceInteraction = Date.now() - state.lastInteraction;
        if (timeSinceInteraction > 5000 && !state.animating) {
            mascot.classList.add('idle');
        } else {
            mascot.classList.remove('idle');
        }

        if (state.mouse.x > -999) {
            var cx = state.mascotRect.left + state.mascotRect.width / 2;
            var cy = state.mascotRect.top + state.mascotRect.height / 2;
            var dx = state.mouse.x - cx;
            var dy = state.mouse.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var maxLookDist = 400;

            var lookRatio = Math.min(dist / maxLookDist, 1);
            var pupilOffsetX = (dx / Math.max(dist, 1)) * lookRatio * 6;
            var pupilOffsetY = (dy / Math.max(dist, 1)) * lookRatio * 4;

            if (state.emotion !== 'sleepy') {
                pupilL.style.transform = 'translate(calc(-50% + ' + pupilOffsetX + 'px), calc(-50% + ' + pupilOffsetY + 'px))';
                pupilR.style.transform = 'translate(calc(-50% + ' + pupilOffsetX + 'px), calc(-50% + ' + pupilOffsetY + 'px))';
            }

            state.targetTiltX = (dx / Math.max(dist, 1)) * lookRatio * 5;
            state.targetTiltY = -(dy / Math.max(dist, 1)) * lookRatio * 3;

            state.tiltX += (state.targetTiltX - state.tiltX) * 0.08 * dt;
            state.tiltY += (state.targetTiltY - state.tiltY) * 0.08 * dt;

            if (!state.animating) {
                var innerEl = mascot.querySelector('.mascot-inner');
                innerEl.style.transform = 'rotate(' + state.tiltX + 'deg) translateY(' + state.tiltY + 'px)';
            }

            if (dist < 350) {
                spotlight.classList.add('active');
            } else {
                spotlight.classList.remove('active');
            }

            if (noseEl) {
                var noseTwitch = Math.sin(time * 0.005) * 0.5;
                noseEl.style.transform = 'translateX(-50%) scale(' + (1 + noseTwitch * 0.05) + ')';
            }
        }
    }

    function blink() {
        state.isBlinking = true;
        eyelidL.classList.add('blink');
        eyelidR.classList.add('blink');

        setTimeout(function () {
            eyelidL.classList.remove('blink');
            eyelidR.classList.remove('blink');
            state.isBlinking = false;
            state.lastBlink = performance.now();
            state.blinkInterval = 2500 + Math.random() * 3000;
        }, 150);
    }

    function playMascotAnim(className, duration) {
        if (state.animating) return;
        state.animating = true;
        state.lastInteraction = Date.now();
        mascot.classList.remove('idle');
        mascot.classList.add(className);

        triggerRingPulse();

        setTimeout(function () {
            mascot.classList.remove(className);
            state.animating = false;
        }, duration);
    }

    function triggerRingPulse() {
        emotionRing.classList.remove('pulse');
        void emotionRing.offsetWidth;
        emotionRing.classList.add('pulse');
        setTimeout(function () {
            emotionRing.classList.remove('pulse');
        }, 1200);
    }

    function triggerFlash() {
        var pal = palettes[state.palette];
        transitionFlash.style.background = 'radial-gradient(circle at 50% 50%, ' + pal.flash + ' 0%, transparent 70%)';
        transitionFlash.classList.remove('active');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('active');
        setTimeout(function () {
            transitionFlash.classList.remove('active');
        }, 600);
    }

    function spawnHearts(count) {
        for (var i = 0; i < count; i++) {
            (function (idx) {
                setTimeout(function () {
                    var heart = document.createElement('div');
                    heart.className = 'floating-heart';
                    heart.textContent = ['♥', '♡', '❤'][Math.floor(Math.random() * 3)];

                    var rect = mascot.getBoundingClientRect();
                    var stageRect = stageArea.getBoundingClientRect();

                    heart.style.left = (rect.left - stageRect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4) + 'px';
                    heart.style.top = (rect.top - stageRect.top + rect.height * 0.2 + Math.random() * rect.height * 0.3) + 'px';
                    heart.style.fontSize = (0.8 + Math.random() * 0.8) + 'rem';

                    var pal = palettes[state.palette];
                    var c = pal.particles[Math.floor(Math.random() * pal.particles.length)];
                    heart.style.color = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 0.8)';

                    floatingHearts.appendChild(heart);

                    setTimeout(function () {
                        if (heart.parentNode) heart.parentNode.removeChild(heart);
                    }, 2000);
                }, idx * 100);
            })(i);
        }
    }

    function spawnSparkles(x, y, count) {
        for (var i = 0; i < count; i++) {
            var sparkle = document.createElement('div');
            sparkle.className = 'sparkle';

            var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            var distance = 30 + Math.random() * 60;
            var dx = Math.cos(angle) * distance;
            var dy = Math.sin(angle) * distance;

            sparkle.style.left = x + 'px';
            sparkle.style.top = y + 'px';
            sparkle.style.setProperty('--dx', dx + 'px');
            sparkle.style.setProperty('--dy', dy + 'px');

            var pal = palettes[state.palette];
            var c = pal.particles[Math.floor(Math.random() * pal.particles.length)];
            sparkle.style.background = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 0.8)';
            sparkle.style.width = (2 + Math.random() * 4) + 'px';
            sparkle.style.height = sparkle.style.width;

            sparkleContainer.appendChild(sparkle);

            setTimeout(function (el) {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 800, sparkle);
        }
    }

    function setEmotion(emotion) {
        state.emotion = emotion;
        state.lastInteraction = Date.now();

        mascot.classList.remove('happy', 'excited', 'sleepy', 'surprised', 'love', 'curious');
        mascot.classList.add(emotion);
        emotionDisplay.textContent = emotionNames[emotion] || emotion;

        var emotionBtns = emotionPicker.querySelectorAll('.emotion-btn');
        emotionBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.emotion === emotion);
        });

        if (emotion === 'love') {
            spawnHearts(5);
        }

        if (emotion === 'excited') {
            playMascotAnim('jump', 800);
        }

        if (emotion === 'surprised') {
            playMascotAnim('shake', 500);
        }

        triggerRingPulse();
    }

    function changeAffection(delta) {
        state.affection = Math.max(0, Math.min(100, state.affection + delta));
        affectionDisplay.textContent = '好感度 ' + state.affection;

        if (delta > 0) {
            affectionDisplay.style.color = 'rgba(99, 230, 150, 0.8)';
        } else {
            affectionDisplay.style.color = '';
        }

        setTimeout(function () {
            affectionDisplay.style.color = '';
        }, 800);
    }

    function pokeMascot() {
        if (state.animating) return;
        playMascotAnim('squish', 500);
        changeAffection(1);

        var rect = mascot.getBoundingClientRect();
        var stageRect = stageArea.getBoundingClientRect();
        var cx = rect.left - stageRect.left + rect.width / 2;
        var cy = rect.top - stageRect.top + rect.height / 2;
        spawnSparkles(cx, cy, 12);

        var reactions = ['happy', 'surprised', 'excited'];
        var reaction = reactions[Math.floor(Math.random() * reactions.length)];
        setEmotion(reaction);
    }

    function feedMascot() {
        if (state.animating) return;
        playMascotAnim('bounce', 600);
        changeAffection(5);
        setEmotion('happy');
        spawnHearts(3);

        var rect = mascot.getBoundingClientRect();
        var stageRect = stageArea.getBoundingClientRect();
        var cx = rect.left - stageRect.left + rect.width / 2;
        var cy = rect.top - stageRect.top + rect.height * 0.3;
        spawnSparkles(cx, cy, 8);
    }

    function petMascot() {
        if (state.animating) return;
        changeAffection(8);
        setEmotion('love');
        spawnHearts(6);

        var rect = mascot.getBoundingClientRect();
        var stageRect = stageArea.getBoundingClientRect();
        for (var i = 0; i < 3; i++) {
            (function (idx) {
                setTimeout(function () {
                    var x = rect.left - stageRect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4;
                    var y = rect.top - stageRect.top + rect.height * 0.2 + Math.random() * rect.height * 0.4;
                    spawnSparkles(x, y, 6);
                }, idx * 150);
            })(i);
        }
    }

    function applyPalette() {
        var pal = palettes[state.palette];
        cursorGlow.style.background = 'radial-gradient(circle, ' + pal.glow + ' 0%, transparent 70%)';
        document.documentElement.style.setProperty('--color-accent', pal.accent);
        document.documentElement.style.setProperty('--color-mascot-primary', pal.mascotPrimary);
        document.documentElement.style.setProperty('--color-mascot-secondary', pal.mascotSecondary);
        document.documentElement.style.setProperty('--color-mascot-cheek', pal.cheekColor);

        var innerEl = mascot.querySelector('.mascot-inner');
        if (innerEl) {
            innerEl.style.background = 'linear-gradient(145deg, ' + pal.mascotSecondary + ' 0%, ' + pal.mascotPrimary + ' 60%, ' + pal.mascotPrimary + ' 100%)';
        }

        var lowerEl = document.getElementById('mascot-body-lower');
        if (lowerEl) {
            lowerEl.style.background = 'linear-gradient(180deg, ' + pal.mascotPrimary + ' 0%, ' + pal.mascotPrimary + ' 100%)';
        }

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + pal.blobs[i % pal.blobs.length] + ' 0%, transparent 70%)';
        });

        var ears = mascot.querySelectorAll('.mascot-ear');
        ears.forEach(function (ear) {
            ear.style.background = 'linear-gradient(145deg, ' + pal.mascotSecondary + ', ' + pal.mascotPrimary + ')';
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
        updateBgParticles(dt);
        drawBgParticles();
        drawFlowLines();

        updateMascot(dt);

        requestAnimationFrame(animate);
    }

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(self, args);
            }, delay);
        };
    }

    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        stageArea.addEventListener('click', function (e) {
            var rect = stageArea.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            spawnSparkles(x, y, 10);
        });

        stageArea.addEventListener('dblclick', function (e) {
            e.preventDefault();
            petMascot();
        });

        var dragStartY = 0;
        var isDragging = false;

        stageArea.addEventListener('mousedown', function (e) {
            dragStartY = e.clientY;
            isDragging = true;
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            var delta = e.clientY - dragStartY;
            if (Math.abs(delta) > 50) {
                isDragging = false;
                if (delta < 0) {
                    playMascotAnim('jump', 800);
                    changeAffection(2);
                } else {
                    playMascotAnim('squish', 500);
                    changeAffection(1);
                }
            }
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
        });

        stageArea.addEventListener('touchstart', function (e) {
            var touch = e.touches[0];
            state.mouse.x = touch.clientX;
            state.mouse.y = touch.clientY;
            dragStartY = touch.clientY;
            isDragging = true;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
        }, { passive: true });

        stageArea.addEventListener('touchmove', function (e) {
            var touch = e.touches[0];
            state.mouse.x = touch.clientX;
            state.mouse.y = touch.clientY;
            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';
        }, { passive: true });

        stageArea.addEventListener('touchend', function (e) {
            isDragging = false;
            if (e.changedTouches.length > 0) {
                var touch = e.changedTouches[0];
                var rect = stageArea.getBoundingClientRect();
                var x = touch.clientX - rect.left;
                var y = touch.clientY - rect.top;
                spawnSparkles(x, y, 8);
            }
        });

        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 200));
    }

    function bindControls() {
        var themeBtns = themeToggle.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.theme;
                applyPalette();
                triggerFlash();
            });
        });

        var emotionBtns = emotionPicker.querySelectorAll('.emotion-btn');
        emotionBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                setEmotion(btn.dataset.emotion);
            });
        });

        btnPoke.addEventListener('click', pokeMascot);
        btnFeed.addEventListener('click', feedMascot);
        btnPet.addEventListener('click', petMascot);

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    init();
})();
