(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var PALETTES = {
        abyss: {
            blob1: '#0a1e3d', blob2: '#1a0a3e', blob3: '#0d2847', blob4: '#2d1040',
            accent: '#0ea5e9', accentSec: '#6366f1',
            particle1: 'rgba(14, 165, 233, 0.6)', particle2: 'rgba(99, 102, 241, 0.4)',
            glow: 'rgba(14, 165, 233, 0.15)', glowStrong: 'rgba(14, 165, 233, 0.35)'
        },
        aurora: {
            blob1: '#0f2027', blob2: '#0a2a1e', blob3: '#1a3a2e', blob4: '#0d3347',
            accent: '#64ffda', accentSec: '#2dd4bf',
            particle1: 'rgba(100, 255, 218, 0.6)', particle2: 'rgba(45, 212, 191, 0.4)',
            glow: 'rgba(100, 255, 218, 0.15)', glowStrong: 'rgba(100, 255, 218, 0.35)'
        },
        ember: {
            blob1: '#1a0a0a', blob2: '#3d0a0a', blob3: '#470d0d', blob4: '#401010',
            accent: '#f97316', accentSec: '#ef4444',
            particle1: 'rgba(249, 115, 22, 0.6)', particle2: 'rgba(239, 68, 68, 0.4)',
            glow: 'rgba(249, 115, 22, 0.15)', glowStrong: 'rgba(249, 115, 22, 0.35)'
        },
        prism: {
            blob1: '#1a0a2e', blob2: '#2e0a3e', blob3: '#0d1547', blob4: '#401050',
            accent: '#e879f9', accentSec: '#a855f7',
            particle1: 'rgba(232, 121, 249, 0.6)', particle2: 'rgba(168, 85, 247, 0.4)',
            glow: 'rgba(232, 121, 249, 0.15)', glowStrong: 'rgba(232, 121, 249, 0.35)'
        }
    };

    var state = {
        mode: 'float',
        palette: 'abyss',
        perspective: 1000,
        tilt: 15,
        glowIntensity: 50,
        mouseX: 0.5,
        mouseY: 0.5,
        rawMouseX: window.innerWidth / 2,
        rawMouseY: window.innerHeight / 2,
        isHovering: false,
        currentRotateX: 0,
        currentRotateY: 0,
        targetRotateX: 0,
        targetRotateY: 0,
        orbitAngle: 0,
        glitchTimer: null,
        particles: [],
        hintDismissed: false
    };

    var root = document.documentElement;
    var screenFrame = document.getElementById('screenFrame');
    var frameViewport = document.getElementById('frameViewport');
    var frameReflection = document.getElementById('frameReflection');
    var frameShadow = document.getElementById('frameShadow');
    var glitchLayers = document.getElementById('glitchLayers');
    var stageHint = document.getElementById('stageHint');
    var cursorGlow = document.getElementById('cursorGlow');
    var particleCanvas = document.getElementById('particleCanvas');
    var ctx = particleCanvas.getContext('2d');

    var ctrlPerspective = document.getElementById('ctrlPerspective');
    var ctrlTilt = document.getElementById('ctrlTilt');
    var ctrlGlow = document.getElementById('ctrlGlow');
    var valPerspective = document.getElementById('valPerspective');
    var valTilt = document.getElementById('valTilt');
    var valGlow = document.getElementById('valGlow');

    function init() {
        resizeCanvas();
        bindEvents();
        applyPalette(state.palette);
        requestAnimationFrame(loop);
    }

    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }

    function bindEvents() {
        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('mousemove', function (e) {
            state.rawMouseX = e.clientX;
            state.rawMouseY = e.clientY;
            state.mouseX = e.clientX / window.innerWidth;
            state.mouseY = e.clientY / window.innerHeight;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (!state.hintDismissed) {
                state.hintDismissed = true;
                stageHint.classList.add('hidden');
            }
        });

        screenFrame.addEventListener('mouseenter', function () {
            state.isHovering = true;
        });

        screenFrame.addEventListener('mouseleave', function () {
            state.isHovering = false;
        });

        screenFrame.addEventListener('click', function () {
            emitBurst(state.rawMouseX, state.rawMouseY, 40);
        });

        document.querySelectorAll('.mode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
                if (state.mode === 'glitch') {
                    startGlitchLoop();
                } else {
                    stopGlitchLoop();
                    glitchLayers.classList.remove('active');
                }
            });
        });

        document.querySelectorAll('.palette-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.palette-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette(state.palette);
            });
        });

        ctrlPerspective.addEventListener('input', function () {
            state.perspective = parseInt(this.value, 10);
            valPerspective.textContent = state.perspective;
            frameViewport.style.perspective = state.perspective + 'px';
        });

        ctrlTilt.addEventListener('input', function () {
            state.tilt = parseInt(this.value, 10);
            valTilt.textContent = state.tilt;
        });

        ctrlGlow.addEventListener('input', function () {
            state.glowIntensity = parseInt(this.value, 10);
            valGlow.textContent = state.glowIntensity;
            updateGlow();
        });

        document.getElementById('btnPulse').addEventListener('click', function () {
            screenFrame.classList.remove('pulse-anim');
            void screenFrame.offsetWidth;
            screenFrame.classList.add('pulse-anim');
            emitBurst(window.innerWidth / 2, window.innerHeight / 2, 80);
            setTimeout(function () {
                screenFrame.classList.remove('pulse-anim');
            }, 800);
        });

        document.getElementById('btnReset').addEventListener('click', function () {
            state.currentRotateX = 0;
            state.currentRotateY = 0;
            state.targetRotateX = 0;
            state.targetRotateY = 0;
            state.orbitAngle = 0;
            state.particles = [];
            ctrlPerspective.value = 1000;
            ctrlTilt.value = 15;
            ctrlGlow.value = 50;
            state.perspective = 1000;
            state.tilt = 15;
            state.glowIntensity = 50;
            valPerspective.textContent = '1000';
            valTilt.textContent = '15';
            valGlow.textContent = '50';
            frameViewport.style.perspective = '1000px';
            updateGlow();
        });

        document.getElementById('btnFullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        particleCanvas.addEventListener('click', function (e) {
            emitBurst(e.clientX, e.clientY, 30);
        });
    }

    function applyPalette(name) {
        var p = PALETTES[name];
        if (!p) return;
        root.style.setProperty('--color-blob-1', p.blob1);
        root.style.setProperty('--color-blob-2', p.blob2);
        root.style.setProperty('--color-blob-3', p.blob3);
        root.style.setProperty('--color-blob-4', p.blob4);
        root.style.setProperty('--color-accent', p.accent);
        root.style.setProperty('--color-accent-secondary', p.accentSec);
        root.style.setProperty('--particle-color-1', p.particle1);
        root.style.setProperty('--particle-color-2', p.particle2);
        root.style.setProperty('--glow-color', p.glow);
        updateGlow();
    }

    function updateGlow() {
        var p = PALETTES[state.palette];
        var intensity = state.glowIntensity / 100;
        var alpha = 0.05 + intensity * 0.25;
        root.style.setProperty('--glow-color', p.glow.replace(/[\d.]+\)$/, alpha + ')'));
    }

    function startGlitchLoop() {
        stopGlitchLoop();
        glitchLayers.classList.add('active');
    }

    function stopGlitchLoop() {
        if (state.glitchTimer) {
            clearTimeout(state.glitchTimer);
            state.glitchTimer = null;
        }
    }

    function emitBurst(x, y, count) {
        var p = PALETTES[state.palette];
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.5 + Math.random() * 4;
            state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.008 + Math.random() * 0.015,
                size: 1.5 + Math.random() * 3,
                color: Math.random() > 0.5 ? p.particle1 : p.particle2
            });
        }
    }

    function loop(time) {
        requestAnimationFrame(loop);

        updateFrameTransform(time);
        updateParticles();
        drawParticles();
        spawnTrailParticles();
    }

    function updateFrameTransform(time) {
        var maxTilt = state.tilt;

        if (state.mode === 'float') {
            if (state.isHovering) {
                state.targetRotateX = (state.mouseY - 0.5) * -maxTilt * 2;
                state.targetRotateY = (state.mouseX - 0.5) * maxTilt * 2;
            } else {
                state.targetRotateX = Math.sin(time * 0.0008) * 3;
                state.targetRotateY = Math.cos(time * 0.0006) * 4;
            }
        } else if (state.mode === 'orbit') {
            state.orbitAngle += 0.008;
            var orbitRadius = maxTilt * 0.8;
            state.targetRotateX = Math.sin(state.orbitAngle) * orbitRadius;
            state.targetRotateY = Math.cos(state.orbitAngle) * orbitRadius;
        } else if (state.mode === 'glitch') {
            var now = Date.now();
            if (now % 800 < 80) {
                state.targetRotateX = (Math.random() - 0.5) * maxTilt * 0.6;
                state.targetRotateY = (Math.random() - 0.5) * maxTilt * 0.6;
            } else {
                if (state.isHovering) {
                    state.targetRotateX = (state.mouseY - 0.5) * -maxTilt;
                    state.targetRotateY = (state.mouseX - 0.5) * maxTilt;
                } else {
                    state.targetRotateX *= 0.96;
                    state.targetRotateY *= 0.96;
                }
            }
        }

        state.currentRotateX += (state.targetRotateX - state.currentRotateX) * 0.08;
        state.currentRotateY += (state.targetRotateY - state.currentRotateY) * 0.08;

        var rx = state.currentRotateX.toFixed(2);
        var ry = state.currentRotateY.toFixed(2);
        screenFrame.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';

        var reflX = (state.currentRotateY / maxTilt * 20).toFixed(1);
        var reflY = (-state.currentRotateX / maxTilt * 20).toFixed(1);
        frameReflection.style.background = 'linear-gradient(' +
            (135 + parseFloat(reflX)).toFixed(0) + 'deg, ' +
            'rgba(255,255,255,0.' + Math.min(12, 4 + state.glowIntensity / 10).toFixed(0) + ') 0%, ' +
            'transparent 40%, transparent 60%, ' +
            'rgba(255,255,255,0.' + Math.min(6, 2 + state.glowIntensity / 20).toFixed(0) + ') 100%)';

        var shadowShiftX = (state.currentRotateY / maxTilt * 15).toFixed(1);
        var shadowShiftY = (state.currentRotateX / maxTilt * 10).toFixed(1);
        frameShadow.style.transform = 'translateX(' + shadowShiftX + 'px)';
        frameShadow.style.opacity = (0.8 - Math.abs(state.currentRotateX / maxTilt) * 0.3).toFixed(2);
    }

    function spawnTrailParticles() {
        if (state.particles.length > 300) return;
        var p = PALETTES[state.palette];
        var speed = Math.sqrt(
            Math.pow(state.rawMouseX - window.innerWidth / 2, 2) +
            Math.pow(state.rawMouseY - window.innerHeight / 2, 2)
        ) / window.innerWidth;

        if (speed > 0.1 || state.isHovering) {
            state.particles.push({
                x: state.rawMouseX + (Math.random() - 0.5) * 20,
                y: state.rawMouseY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8 - 0.3,
                life: 1,
                decay: 0.012 + Math.random() * 0.01,
                size: 1 + Math.random() * 2.5,
                color: Math.random() > 0.5 ? p.particle1 : p.particle2
            });
        }
    }

    function updateParticles() {
        for (var i = state.particles.length - 1; i >= 0; i--) {
            var pt = state.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.01;
            pt.vx *= 0.99;
            pt.life -= pt.decay;
            if (pt.life <= 0) {
                state.particles.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        for (var i = 0; i < state.particles.length; i++) {
            var pt = state.particles[i];
            var alpha = Math.max(0, pt.life);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = pt.size * 3 * alpha;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    init();
})();
