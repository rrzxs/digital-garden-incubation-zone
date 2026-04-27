(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var PALETTES = {
        void: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#ec4899',
            glow: 'rgba(99,102,241,0.4)',
            trail: 'rgba(139,92,246,0.6)',
            trailDim: 'rgba(139,92,246,0.15)',
            gridBase: 'rgba(255,255,255,0.03)',
            gridActive: 'rgba(139,92,246,0.35)',
            crosshair: 'rgba(139,92,246,0.12)'
        },
        jade: {
            primary: '#10b981',
            secondary: '#34d399',
            accent: '#6ee7b7',
            glow: 'rgba(16,185,129,0.4)',
            trail: 'rgba(52,211,153,0.6)',
            trailDim: 'rgba(52,211,153,0.15)',
            gridBase: 'rgba(255,255,255,0.03)',
            gridActive: 'rgba(52,211,153,0.35)',
            crosshair: 'rgba(52,211,153,0.12)'
        },
        solar: {
            primary: '#f59e0b',
            secondary: '#ef4444',
            accent: '#f97316',
            glow: 'rgba(245,158,11,0.4)',
            trail: 'rgba(239,68,68,0.6)',
            trailDim: 'rgba(239,68,68,0.15)',
            gridBase: 'rgba(255,255,255,0.03)',
            gridActive: 'rgba(245,158,11,0.35)',
            crosshair: 'rgba(245,158,11,0.12)'
        },
        arctic: {
            primary: '#67e8f9',
            secondary: '#a5b4fc',
            accent: '#e0e7ff',
            glow: 'rgba(103,232,249,0.35)',
            trail: 'rgba(165,180,252,0.6)',
            trailDim: 'rgba(165,180,252,0.15)',
            gridBase: 'rgba(255,255,255,0.03)',
            gridActive: 'rgba(103,232,249,0.35)',
            crosshair: 'rgba(165,180,252,0.12)'
        }
    };

    var state = {
        mouseX: 0,
        mouseY: 0,
        prevX: 0,
        prevY: 0,
        smoothX: 0,
        smoothY: 0,
        velocityX: 0,
        velocityY: 0,
        speed: 0,
        angle: 0,
        isMoving: false,
        isOnScreen: false,
        mode: 'warp',
        palette: 'void',
        density: 60,
        fieldRadius: 150,
        warpStrength: 0.5,
        trailLength: 30,
        trails: [],
        time: 0,
        rippleOrigin: { x: 0, y: 0, t: 0 },
        clickRipples: []
    };

    var canvas, ctx, W, H, dpr;
    var cursorRing, coordTooltip, coordX, coordY;
    var crosshairH, crosshairV;
    var infoX, infoY, infoVX, infoVY, infoSpeed, infoAngle, infoTrail;
    var animId;
    var lastMoveTime = 0;
    var moveTimeout = null;

    function $(id) {
        return document.getElementById(id);
    }

    function init() {
        canvas = $('grid-canvas');
        ctx = canvas.getContext('2d');
        cursorRing = $('cursor-ring');
        coordTooltip = $('coord-tooltip');
        coordX = $('coord-x');
        coordY = $('coord-y');
        crosshairH = $('crosshair-h');
        crosshairV = $('crosshair-v');
        infoX = $('info-x');
        infoY = $('info-y');
        infoVX = $('info-vx');
        infoVY = $('info-vy');
        infoSpeed = $('info-speed');
        infoAngle = $('info-angle');
        infoTrail = $('info-trail');

        resize();
        bindEvents();
        bindControls();
        animate();
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function bindEvents() {
        window.addEventListener('resize', resize);

        document.addEventListener('mousemove', function (e) {
            state.prevX = state.mouseX;
            state.prevY = state.mouseY;
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            state.isOnScreen = true;
            state.isMoving = true;

            state.velocityX = state.mouseX - state.prevX;
            state.velocityY = state.mouseY - state.prevY;
            state.speed = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
            state.angle = Math.atan2(state.velocityY, state.velocityX) * (180 / Math.PI);

            lastMoveTime = performance.now();

            if (moveTimeout) clearTimeout(moveTimeout);
            moveTimeout = setTimeout(function () {
                state.isMoving = false;
            }, 120);
        });

        document.addEventListener('mouseleave', function () {
            state.isOnScreen = false;
            cursorRing.style.opacity = '0';
            coordTooltip.classList.remove('visible');
            crosshairH.classList.remove('visible');
            crosshairV.classList.remove('visible');
        });

        document.addEventListener('mouseenter', function () {
            state.isOnScreen = true;
            cursorRing.style.opacity = '1';
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('.controls-bar') || e.target.closest('.info-panel') || e.target.closest('.back-link')) return;
            state.clickRipples.push({
                x: e.clientX,
                y: e.clientY,
                t: state.time,
                radius: 0,
                maxRadius: state.fieldRadius * 2.5,
                opacity: 1
            });
        });

        document.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var t = e.touches[0];
            state.prevX = state.mouseX;
            state.prevY = state.mouseY;
            state.mouseX = t.clientX;
            state.mouseY = t.clientY;
            state.isOnScreen = true;
            state.isMoving = true;
            state.velocityX = state.mouseX - state.prevX;
            state.velocityY = state.mouseY - state.prevY;
            state.speed = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
            state.angle = Math.atan2(state.velocityY, state.velocityX) * (180 / Math.PI);
            lastMoveTime = performance.now();
            if (moveTimeout) clearTimeout(moveTimeout);
            moveTimeout = setTimeout(function () {
                state.isMoving = false;
            }, 120);
        }, { passive: false });
    }

    function bindControls() {
        $('ctrl-density').addEventListener('input', function () {
            state.density = parseInt(this.value);
            $('val-density').textContent = state.density;
        });

        $('ctrl-radius').addEventListener('input', function () {
            state.fieldRadius = parseInt(this.value);
            $('val-radius').textContent = state.fieldRadius;
        });

        $('ctrl-warp').addEventListener('input', function () {
            state.warpStrength = parseInt(this.value) / 100;
            $('val-warp').textContent = state.warpStrength.toFixed(2);
        });

        $('ctrl-trail').addEventListener('input', function () {
            state.trailLength = parseInt(this.value);
            $('val-trail').textContent = state.trailLength;
        });

        var modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.mode = this.dataset.mode;
            });
        });

        var paletteBtns = document.querySelectorAll('.palette-btn');
        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.palette = this.dataset.palette;
                document.body.className = 'palette-' + state.palette;
            });
        });

        $('btn-fullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen();
            }
        });

        $('btn-snapshot').addEventListener('click', function () {
            var tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = W * dpr;
            tmpCanvas.height = H * dpr;
            var tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(canvas, 0, 0);
            var link = document.createElement('a');
            link.download = 'coordinate-cursor-' + Date.now() + '.png';
            link.href = tmpCanvas.toDataURL('image/png');
            link.click();
        });
    }

    function getPalette() {
        return PALETTES[state.palette];
    }

    function updateCursorRing() {
        if (!state.isOnScreen) return;

        state.smoothX += (state.mouseX - state.smoothX) * 0.18;
        state.smoothY += (state.mouseY - state.smoothY) * 0.18;

        var speed = Math.min(state.speed, 60);
        var scale = 1 + speed * 0.012;
        var outerScale = 1 + speed * 0.02;

        cursorRing.style.left = state.smoothX + 'px';
        cursorRing.style.top = state.smoothY + 'px';
        cursorRing.querySelector('.ring-inner').style.transform =
            'translate(-50%,-50%) scale(' + scale + ')';
        cursorRing.querySelector('.ring-outer').style.transform =
            'translate(-50%,-50%) scale(' + outerScale + ')';

        var palette = getPalette();
        if (speed > 15) {
            cursorRing.querySelector('.ring-outer').style.borderColor = palette.accent;
        } else {
            cursorRing.querySelector('.ring-outer').style.borderColor = 'rgba(255,255,255,0.5)';
        }

        var tipOffsetX = 20;
        var tipOffsetY = 24;
        if (state.smoothX + tipOffsetX + 120 > W) tipOffsetX = -120;
        if (state.smoothY + tipOffsetY + 30 > H) tipOffsetY = -30;

        coordTooltip.style.left = (state.smoothX + tipOffsetX) + 'px';
        coordTooltip.style.top = (state.smoothY + tipOffsetY) + 'px';
        coordTooltip.classList.add('visible');
        coordX.textContent = 'X: ' + Math.round(state.mouseX);
        coordY.textContent = 'Y: ' + Math.round(state.mouseY);

        crosshairH.style.top = state.smoothY + 'px';
        crosshairH.classList.add('visible');
        crosshairV.style.left = state.smoothX + 'px';
        crosshairV.classList.add('visible');
    }

    function updateTrails() {
        if (state.isMoving && state.isOnScreen) {
            state.trails.push({
                x: state.smoothX,
                y: state.smoothY,
                t: state.time,
                vx: state.velocityX,
                vy: state.velocityY
            });
        }

        while (state.trails.length > state.trailLength) {
            state.trails.shift();
        }
    }

    function drawGrid() {
        var palette = getPalette();
        var spacing = Math.max(20, state.density);
        var cols = Math.ceil(W / spacing) + 2;
        var rows = Math.ceil(H / spacing) + 2;
        var cx = state.isOnScreen ? state.smoothX : -9999;
        var cy = state.isOnScreen ? state.smoothY : -9999;
        var radius = state.fieldRadius;
        var warp = state.warpStrength;

        ctx.clearRect(0, 0, W, H);

        for (var i = -1; i <= cols; i++) {
            var baseX = i * spacing;
            ctx.beginPath();

            for (var j = -1; j <= rows; j++) {
                var baseY = j * spacing;
                var dx = baseX - cx;
                var dy = baseY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var px = baseX;
                var py = baseY;

                if (dist < radius) {
                    var influence = 1 - dist / radius;
                    influence = influence * influence * warp;

                    if (state.mode === 'warp') {
                        var pushDist = influence * spacing * 1.8;
                        var angle = Math.atan2(dy, dx);
                        px += Math.cos(angle) * pushDist;
                        py += Math.sin(angle) * pushDist;
                        var waveOffset = Math.sin(state.time * 0.03 + dist * 0.02) * influence * spacing * 0.5;
                        px += waveOffset;
                        py += Math.cos(state.time * 0.02 + dist * 0.025) * waveOffset * 0.7;
                    } else if (state.mode === 'ripple') {
                        var ripplePhase = state.time * 0.06 - dist * 0.04;
                        var rippleAmp = influence * spacing * 0.8;
                        px += Math.cos(ripplePhase) * rippleAmp;
                        py += Math.sin(ripplePhase) * rippleAmp;
                    } else if (state.mode === 'magnetic') {
                        var magAngle = Math.atan2(dy, dx);
                        var tangent = magAngle + Math.PI * 0.5;
                        var orbitDist = influence * spacing * 1.2;
                        px += Math.cos(tangent) * orbitDist * Math.sin(state.time * 0.04 + dist * 0.01);
                        py += Math.sin(tangent) * orbitDist * Math.cos(state.time * 0.04 + dist * 0.01);
                        var radialPull = influence * spacing * 0.6;
                        px -= Math.cos(magAngle) * radialPull;
                        py -= Math.sin(magAngle) * radialPull;
                    }
                }

                if (j === -1) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            var distToLine = Math.abs(cx - baseX);
            var lineAlpha = distToLine < radius
                ? 0.03 + (1 - distToLine / radius) * 0.12
                : 0.03;
            ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        for (var j = -1; j <= rows; j++) {
            var baseY = j * spacing;
            ctx.beginPath();

            for (var i = -1; i <= cols; i++) {
                var baseX = i * spacing;
                var dx = baseX - cx;
                var dy = baseY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var px = baseX;
                var py = baseY;

                if (dist < radius) {
                    var influence = 1 - dist / radius;
                    influence = influence * influence * warp;

                    if (state.mode === 'warp') {
                        var pushDist = influence * spacing * 1.8;
                        var angle = Math.atan2(dy, dx);
                        px += Math.cos(angle) * pushDist;
                        py += Math.sin(angle) * pushDist;
                        var waveOffset = Math.sin(state.time * 0.03 + dist * 0.02) * influence * spacing * 0.5;
                        px += waveOffset;
                        py += Math.cos(state.time * 0.02 + dist * 0.025) * waveOffset * 0.7;
                    } else if (state.mode === 'ripple') {
                        var ripplePhase = state.time * 0.06 - dist * 0.04;
                        var rippleAmp = influence * spacing * 0.8;
                        px += Math.cos(ripplePhase) * rippleAmp;
                        py += Math.sin(ripplePhase) * rippleAmp;
                    } else if (state.mode === 'magnetic') {
                        var magAngle = Math.atan2(dy, dx);
                        var tangent = magAngle + Math.PI * 0.5;
                        var orbitDist = influence * spacing * 1.2;
                        px += Math.cos(tangent) * orbitDist * Math.sin(state.time * 0.04 + dist * 0.01);
                        py += Math.sin(tangent) * orbitDist * Math.cos(state.time * 0.04 + dist * 0.01);
                        var radialPull = influence * spacing * 0.6;
                        px -= Math.cos(magAngle) * radialPull;
                        py -= Math.sin(magAngle) * radialPull;
                    }
                }

                if (i === -1) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            var distToLine = Math.abs(cy - baseY);
            var lineAlpha = distToLine < radius
                ? 0.03 + (1 - distToLine / radius) * 0.12
                : 0.03;
            ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    function drawIntersections() {
        var palette = getPalette();
        var spacing = Math.max(20, state.density);
        var cx = state.isOnScreen ? state.smoothX : -9999;
        var cy = state.isOnScreen ? state.smoothY : -9999;
        var radius = state.fieldRadius;
        var warp = state.warpStrength;

        var cols = Math.ceil(W / spacing) + 2;
        var rows = Math.ceil(H / spacing) + 2;

        for (var i = -1; i <= cols; i++) {
            for (var j = -1; j <= rows; j++) {
                var baseX = i * spacing;
                var baseY = j * spacing;
                var dx = baseX - cx;
                var dy = baseY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < radius * 0.9) {
                    var influence = 1 - dist / radius;
                    influence = influence * influence;

                    var dotAlpha = influence * 0.6;
                    var dotSize = 1 + influence * 2.5;

                    ctx.beginPath();
                    ctx.arc(baseX, baseY, dotSize, 0, Math.PI * 2);
                    ctx.fillStyle = palette.gridActive.replace('0.35', String(dotAlpha));
                    ctx.fill();
                }
            }
        }
    }

    function drawTrails() {
        if (state.trails.length < 2) return;
        var palette = getPalette();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (var i = 1; i < state.trails.length; i++) {
            var t0 = state.trails[i - 1];
            var t1 = state.trails[i];
            var progress = i / state.trails.length;
            var alpha = progress * 0.7;
            var width = progress * 3 + 0.5;

            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);

            var midX = (t0.x + t1.x) * 0.5;
            var midY = (t0.y + t1.y) * 0.5;
            ctx.quadraticCurveTo(t0.x, t0.y, midX, midY);

            ctx.strokeStyle = 'rgba(' + hexToRgb(palette.primary) + ',' + alpha + ')';
            ctx.lineWidth = width;
            ctx.stroke();
        }

        if (state.trails.length > 0) {
            var last = state.trails[state.trails.length - 1];
            var glowSize = 20 + state.speed * 0.5;

            var grad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, glowSize);
            grad.addColorStop(0, 'rgba(' + hexToRgb(palette.accent) + ',0.3)');
            grad.addColorStop(0.5, 'rgba(' + hexToRgb(palette.primary) + ',0.1)');
            grad.addColorStop(1, 'rgba(' + hexToRgb(palette.primary) + ',0)');

            ctx.beginPath();
            ctx.arc(last.x, last.y, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    function drawClickRipples() {
        var palette = getPalette();
        var toRemove = [];

        for (var i = 0; i < state.clickRipples.length; i++) {
            var r = state.clickRipples[i];
            var elapsed = state.time - r.t;
            r.radius = elapsed * 4;
            r.opacity = 1 - r.radius / r.maxRadius;

            if (r.opacity <= 0) {
                toRemove.push(i);
                continue;
            }

            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + hexToRgb(palette.accent) + ',' + (r.opacity * 0.5) + ')';
            ctx.lineWidth = 1.5 + r.opacity * 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + hexToRgb(palette.primary) + ',' + (r.opacity * 0.3) + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        for (var k = toRemove.length - 1; k >= 0; k--) {
            state.clickRipples.splice(toRemove[k], 1);
        }
    }

    function drawFieldGlow() {
        if (!state.isOnScreen) return;
        var palette = getPalette();
        var r = state.fieldRadius;

        var grad = ctx.createRadialGradient(
            state.smoothX, state.smoothY, 0,
            state.smoothX, state.smoothY, r
        );
        grad.addColorStop(0, 'rgba(' + hexToRgb(palette.primary) + ',0.06)');
        grad.addColorStop(0.5, 'rgba(' + hexToRgb(palette.primary) + ',0.02)');
        grad.addColorStop(1, 'rgba(' + hexToRgb(palette.primary) + ',0)');

        ctx.beginPath();
        ctx.arc(state.smoothX, state.smoothY, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(state.smoothX, state.smoothY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + hexToRgb(palette.primary) + ',0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function updateInfoPanel() {
        infoX.textContent = Math.round(state.mouseX);
        infoY.textContent = Math.round(state.mouseY);
        infoVX.textContent = state.velocityX.toFixed(2);
        infoVY.textContent = state.velocityY.toFixed(2);
        infoSpeed.textContent = state.speed.toFixed(2);
        infoAngle.textContent = state.angle.toFixed(1) + '°';
        infoTrail.textContent = state.trails.length;

        if (state.speed > 20) {
            infoSpeed.classList.add('highlight');
        } else {
            infoSpeed.classList.remove('highlight');
        }
    }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return r + ',' + g + ',' + b;
    }

    function animate() {
        state.time++;
        updateCursorRing();
        updateTrails();
        drawGrid();
        drawIntersections();
        drawFieldGlow();
        drawTrails();
        drawClickRipples();
        updateInfoPanel();
        animId = requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
