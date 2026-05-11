(function () {
    'use strict';

    var tileGrid = document.getElementById('tile-grid');
    var trailCanvas = document.getElementById('trail-canvas');
    var ctx = trailCanvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var stageHint = document.getElementById('stage-hint');
    var stageArea = document.getElementById('stage-area');

    var ctrlRadius = document.getElementById('ctrl-radius');
    var ctrlStiffness = document.getElementById('ctrl-stiffness');
    var ctrlDamping = document.getElementById('ctrl-damping');
    var valRadius = document.getElementById('val-radius');
    var valStiffness = document.getElementById('val-stiffness');
    var valDamping = document.getElementById('val-damping');
    var btnRipple = document.getElementById('btn-ripple');
    var btnReset = document.getElementById('btn-reset');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var paletteBtns = document.querySelectorAll('.palette-btn');
    var modeBtns = document.querySelectorAll('.mode-btn');

    var state = {
        mouse: { x: -9999, y: -9999 },
        mouseInStage: false,
        hasInteracted: false,
        fieldRadius: 160,
        stiffness: 0.12,
        damping: 0.82,
        mode: 'repel',
        palette: 'porcelain',
        tiles: [],
        ripples: [],
        trails: [],
        dpr: window.devicePixelRatio || 1,
        animId: null,
        lastTime: 0,
        gridCols: 0,
        gridRows: 0
    };

    var palettes = {
        porcelain: {
            accent: 'rgba(165, 180, 252, 0.6)',
            glow: 'rgba(165, 180, 252, 0.15)',
            tileActive: 'rgba(165, 180, 252, 0.08)',
            cursorGlow: 'rgba(165, 180, 252, 0.07)',
            particle: { r: 165, g: 180, b: 252 },
            blobs: ['#1a1840', '#0d1e3f', '#2a1248', '#0c1a38'],
            trail: 'rgba(165, 180, 252, 0.25)',
            cssAccent: '#a5b4fc',
            cssSecondary: '#818cf8'
        },
        obsidian: {
            accent: 'rgba(139, 92, 246, 0.6)',
            glow: 'rgba(139, 92, 246, 0.15)',
            tileActive: 'rgba(139, 92, 246, 0.08)',
            cursorGlow: 'rgba(139, 92, 246, 0.07)',
            particle: { r: 139, g: 92, b: 246 },
            blobs: ['#1a0a3e', '#0d2847', '#2d1040', '#0a2540'],
            trail: 'rgba(139, 92, 246, 0.25)',
            cssAccent: '#8b5cf6',
            cssSecondary: '#6366f1'
        },
        jade: {
            accent: 'rgba(52, 211, 153, 0.6)',
            glow: 'rgba(52, 211, 153, 0.15)',
            tileActive: 'rgba(52, 211, 153, 0.08)',
            cursorGlow: 'rgba(52, 211, 153, 0.07)',
            particle: { r: 52, g: 211, b: 153 },
            blobs: ['#0a2a1a', '#0d2a35', '#103030', '#0a3520'],
            trail: 'rgba(52, 211, 153, 0.25)',
            cssAccent: '#34d399',
            cssSecondary: '#06b6d4'
        },
        ember: {
            accent: 'rgba(251, 146, 60, 0.6)',
            glow: 'rgba(251, 146, 60, 0.15)',
            tileActive: 'rgba(251, 146, 60, 0.08)',
            cursorGlow: 'rgba(251, 146, 60, 0.07)',
            particle: { r: 251, g: 146, b: 60 },
            blobs: ['#3d1508', '#2d1a0a', '#401a10', '#3d2008'],
            trail: 'rgba(251, 146, 60, 0.25)',
            cssAccent: '#fb923c',
            cssSecondary: '#f97316'
        }
    };

    var TILE_GAP = 6;
    var TILE_PAD = 16;
    var TRAIL_MAX = 120;

    function init() {
        buildGrid();
        resizeCanvas();
        bindEvents();
        bindControls();
        state.lastTime = performance.now();
        animate(state.lastTime);
    }

    function buildGrid() {
        var rect = stageArea.getBoundingClientRect();
        var w = rect.width - TILE_PAD * 2;
        var h = rect.height - TILE_PAD * 2;

        var targetSize = 58;
        var cols = Math.max(3, Math.floor((w + TILE_GAP) / (targetSize + TILE_GAP)));
        var rows = Math.max(3, Math.floor((h + TILE_GAP) / (targetSize + TILE_GAP)));

        tileGrid.style.setProperty('--cols', cols);
        tileGrid.style.setProperty('--rows', rows);
        tileGrid.innerHTML = '';

        state.gridCols = cols;
        state.gridRows = rows;
        state.tiles = [];

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var tile = document.createElement('div');
                tile.className = 'tile';
                tileGrid.appendChild(tile);

                state.tiles.push({
                    el: tile,
                    col: c,
                    row: r,
                    offsetX: 0,
                    offsetY: 0,
                    velX: 0,
                    velY: 0,
                    rotateX: 0,
                    rotateY: 0,
                    rotVelX: 0,
                    rotVelY: 0,
                    scale: 1,
                    scaleVel: 0,
                    elevation: 0,
                    elevVel: 0,
                    brightness: 0,
                    isActive: false
                });
            }
        }

        requestAnimationFrame(function () {
            state.tiles.forEach(function (t) {
                var r = t.el.getBoundingClientRect();
                var sr = stageArea.getBoundingClientRect();
                t.homeX = r.left + r.width / 2 - sr.left;
                t.homeY = r.top + r.height / 2 - sr.top;
                t.width = r.width;
                t.height = r.height;
            });
        });
    }

    function resizeCanvas() {
        var rect = stageArea.getBoundingClientRect();
        trailCanvas.width = rect.width * state.dpr;
        trailCanvas.height = rect.height * state.dpr;
        trailCanvas.style.width = rect.width + 'px';
        trailCanvas.style.height = rect.height + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function bindEvents() {
        stageArea.addEventListener('mousemove', function (e) {
            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = e.clientX - rect.left;
            state.mouse.y = e.clientY - rect.top;
            state.mouseInStage = true;

            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        });

        stageArea.addEventListener('mouseleave', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        stageArea.addEventListener('click', function (e) {
            var rect = stageArea.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            emitRipple(cx, cy);
        });

        stageArea.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            state.mouse.x = touch.clientX - rect.left;
            state.mouse.y = touch.clientY - rect.top;
            state.mouseInStage = true;

            cursorGlow.style.left = touch.clientX + 'px';
            cursorGlow.style.top = touch.clientY + 'px';

            if (!state.hasInteracted) {
                state.hasInteracted = true;
                stageHint.classList.add('hidden');
            }
        }, { passive: false });

        stageArea.addEventListener('touchstart', function (e) {
            var touch = e.touches[0];
            var rect = stageArea.getBoundingClientRect();
            emitRipple(touch.clientX - rect.left, touch.clientY - rect.top);
        }, { passive: true });

        stageArea.addEventListener('touchend', function () {
            state.mouseInStage = false;
            state.mouse.x = -9999;
            state.mouse.y = -9999;
        });

        window.addEventListener('resize', debounce(function () {
            buildGrid();
            resizeCanvas();
        }, 250));
    }

    function bindControls() {
        ctrlRadius.addEventListener('input', function () {
            state.fieldRadius = parseInt(this.value, 10);
            valRadius.textContent = state.fieldRadius;
        });

        ctrlStiffness.addEventListener('input', function () {
            state.stiffness = parseInt(this.value, 10) / 100;
            valStiffness.textContent = state.stiffness.toFixed(2);
        });

        ctrlDamping.addEventListener('input', function () {
            state.damping = parseInt(this.value, 10) / 100;
            valDamping.textContent = state.damping.toFixed(2);
        });

        paletteBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                paletteBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.palette = btn.dataset.palette;
                applyPalette();
            });
        });

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
            });
        });

        btnRipple.addEventListener('click', function () {
            var rect = stageArea.getBoundingClientRect();
            var cx = rect.width / 2;
            var cy = rect.height / 2;
            emitRipple(cx, cy);
        });

        btnReset.addEventListener('click', function () {
            state.tiles.forEach(function (t) {
                t.offsetX = 0;
                t.offsetY = 0;
                t.velX = 0;
                t.velY = 0;
                t.rotateX = 0;
                t.rotateY = 0;
                t.rotVelX = 0;
                t.rotVelY = 0;
                t.scale = 1;
                t.scaleVel = 0;
                t.elevation = 0;
                t.elevVel = 0;
                t.brightness = 0;
                t.isActive = false;
                t.el.style.transform = '';
                t.el.style.opacity = '';
                t.el.classList.remove('active');
            });
            state.ripples = [];
            state.trails = [];
            state.hasInteracted = false;
            stageHint.classList.remove('hidden');
        });

        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                btnFullscreen.querySelector('span').textContent = '退出';
            } else {
                document.exitFullscreen();
                btnFullscreen.querySelector('span').textContent = '全屏';
            }
        });
    }

    function applyPalette() {
        var p = palettes[state.palette];
        var root = document.documentElement;

        root.style.setProperty('--color-accent', p.cssAccent);
        root.style.setProperty('--color-accent-secondary', p.cssSecondary);
        root.style.setProperty('--tile-accent', p.accent);
        root.style.setProperty('--tile-glow', p.glow);
        root.style.setProperty('--tile-highlight', p.tileActive);
        cursorGlow.style.background = 'radial-gradient(circle, ' + p.cursorGlow + ' 0%, transparent 70%)';

        var blobs = document.querySelectorAll('.blob');
        blobs.forEach(function (blob, i) {
            blob.style.background = 'radial-gradient(ellipse at center, ' + p.blobs[i % p.blobs.length] + ' 0%, transparent 70%)';
        });
    }

    function emitRipple(cx, cy) {
        state.ripples.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(stageArea.offsetWidth, stageArea.offsetHeight) * 0.8,
            speed: 6,
            strength: 1,
            decay: 0.985
        });
    }

    function animate(time) {
        var dt = Math.min((time - state.lastTime) / 16.67, 3);
        state.lastTime = time;

        ctx.clearRect(0, 0, trailCanvas.width / state.dpr, trailCanvas.height / state.dpr);

        updateRipples(dt);
        updateTiles(dt);
        applyTileTransforms();
        updateTrails(dt);
        drawTrails();

        state.animId = requestAnimationFrame(animate);
    }

    function updateRipples(dt) {
        for (var i = state.ripples.length - 1; i >= 0; i--) {
            var rip = state.ripples[i];
            rip.radius += rip.speed * dt;
            rip.strength *= Math.pow(rip.decay, dt);

            if (rip.strength < 0.01 || rip.radius > rip.maxRadius) {
                state.ripples.splice(i, 1);
            }
        }
    }

    function updateTiles(dt) {
        var mx = state.mouse.x;
        var my = state.mouse.y;
        var mouseActive = state.mouseInStage && mx > -999;
        var fieldR = state.fieldRadius;
        var stiffness = state.stiffness;
        var damping = state.damping;
        var mode = state.mode;

        state.tiles.forEach(function (t) {
            var cx = t.homeX + t.offsetX;
            var cy = t.homeY + t.offsetY;

            if (mouseActive) {
                var dx = mx - cx;
                var dy = my - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < fieldR && dist > 0.1) {
                    var force = (1 - dist / fieldR);
                    force = force * force;
                    var angle = Math.atan2(dy, dx);
                    var cosA = Math.cos(angle);
                    var sinA = Math.sin(angle);

                    if (mode === 'repel') {
                        t.velX -= cosA * force * stiffness * 55 * dt;
                        t.velY -= sinA * force * stiffness * 55 * dt;
                        t.rotVelX += (sinA * force * 0.04) * dt;
                        t.rotVelY -= (cosA * force * 0.04) * dt;
                    } else if (mode === 'attract') {
                        t.velX += cosA * force * stiffness * 40 * dt;
                        t.velY += sinA * force * stiffness * 40 * dt;
                        t.rotVelX -= (sinA * force * 0.03) * dt;
                        t.rotVelY += (cosA * force * 0.03) * dt;
                    } else if (mode === 'wave') {
                        var phase = Math.atan2(dy, dx) + performance.now() * 0.002;
                        var waveForce = Math.sin(phase) * force;
                        t.velX += Math.cos(angle + Math.PI / 2) * waveForce * stiffness * 45 * dt;
                        t.velY += Math.sin(angle + Math.PI / 2) * waveForce * stiffness * 45 * dt;
                        t.rotVelX += (waveForce * 0.025) * dt;
                    } else if (mode === 'morph') {
                        var morphStr = force * stiffness * 30 * dt;
                        var perpX = -sinA * morphStr;
                        var perpY = cosA * morphStr;
                        var squeeze = Math.sin(performance.now() * 0.003 + t.col * 0.5 + t.row * 0.3);
                        t.velX += perpX * squeeze;
                        t.velY += perpY * squeeze;
                        t.scaleVel += (force * 0.015 * Math.sin(performance.now() * 0.004 + t.col)) * dt;
                    }

                    t.elevVel += force * stiffness * 20 * dt;
                    t.brightness = Math.min(1, t.brightness + force * 0.15 * dt);

                    if (force > 0.15) {
                        t.isActive = true;
                        t.el.classList.add('active');
                    }
                } else {
                    if (t.isActive) {
                        t.isActive = false;
                        t.el.classList.remove('active');
                    }
                }
            } else {
                if (t.isActive) {
                    t.isActive = false;
                    t.el.classList.remove('active');
                }
            }

            for (var ri = 0; ri < state.ripples.length; ri++) {
                var rip = state.ripples[ri];
                var rdx = cx - rip.x;
                var rdy = cy - rip.y;
                var rDist = Math.sqrt(rdx * rdx + rdy * rdy);
                var ringDist = Math.abs(rDist - rip.radius);

                if (ringDist < 40) {
                    var ringForce = (1 - ringDist / 40) * rip.strength;
                    if (rDist > 0.1) {
                        var rAngle = Math.atan2(rdy, rdx);
                        t.velX += Math.cos(rAngle) * ringForce * 8 * dt;
                        t.velY += Math.sin(rAngle) * ringForce * 8 * dt;
                    }
                    t.elevVel += ringForce * 12 * dt;
                    t.scaleVel += ringForce * 0.03 * dt;
                    t.brightness = Math.min(1, t.brightness + ringForce * 0.3 * dt);
                    t.el.classList.add('active');
                    t.isActive = true;
                }
            }

            var homeForceX = -t.offsetX * stiffness * 3;
            var homeForceY = -t.offsetY * stiffness * 3;
            t.velX += homeForceX * dt;
            t.velY += homeForceY * dt;

            t.velX *= Math.pow(damping, dt);
            t.velY *= Math.pow(damping, dt);

            t.offsetX += t.velX * dt;
            t.offsetY += t.velY * dt;

            t.rotVelX += (-t.rotateX * 0.1) * dt;
            t.rotVelY += (-t.rotateY * 0.1) * dt;
            t.rotVelX *= Math.pow(0.88, dt);
            t.rotVelY *= Math.pow(0.88, dt);
            t.rotateX += t.rotVelX * dt;
            t.rotateY += t.rotVelY * dt;

            t.scaleVel += (1 - t.scale) * 0.08 * dt;
            t.scaleVel *= Math.pow(0.9, dt);
            t.scale += t.scaleVel * dt;

            t.elevVel += (-t.elevation * 0.12) * dt;
            t.elevVel *= Math.pow(0.85, dt);
            t.elevation += t.elevVel * dt;

            t.brightness *= Math.pow(0.94, dt);
        });
    }

    function applyTileTransforms() {
        state.tiles.forEach(function (t) {
            var tx = t.offsetX;
            var ty = t.offsetY;
            var rx = t.rotateX * (180 / Math.PI);
            var ry = t.rotateY * (180 / Math.PI);
            var s = t.scale;
            var elev = t.elevation;

            t.el.style.transform =
                'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) ' +
                'perspective(600px) ' +
                'rotateX(' + rx.toFixed(2) + 'deg) ' +
                'rotateY(' + ry.toFixed(2) + 'deg) ' +
                'scale(' + s.toFixed(4) + ')';

            var shadowBlur = 8 + elev * 2;
            var shadowY = 4 + elev * 1.5;
            var opacity = 0.85 + t.brightness * 0.15;

            t.el.style.boxShadow =
                '0 ' + shadowY.toFixed(1) + 'px ' + shadowBlur.toFixed(1) + 'px rgba(0,0,0,' + (0.2 + elev * 0.02).toFixed(3) + ')' +
                (t.isActive ? ', 0 0 ' + (15 + elev).toFixed(0) + 'px var(--tile-glow)' : '');
            t.el.style.opacity = opacity.toFixed(3);
        });
    }

    function updateTrails(dt) {
        if (state.mouseInStage && state.mouse.x > -999) {
            state.trails.push({
                x: state.mouse.x,
                y: state.mouse.y,
                alpha: 0.5,
                radius: 3
            });
        }

        for (var i = state.trails.length - 1; i >= 0; i--) {
            state.trails[i].alpha *= Math.pow(0.93, dt);
            state.trails[i].radius *= Math.pow(0.98, dt);

            if (state.trails[i].alpha < 0.01) {
                state.trails.splice(i, 1);
            }
        }

        if (state.trails.length > TRAIL_MAX) {
            state.trails.splice(0, state.trails.length - TRAIL_MAX);
        }
    }

    function drawTrails() {
        var pal = palettes[state.palette];

        for (var i = 0; i < state.trails.length; i++) {
            var tr = state.trails[i];
            var grad = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, Math.max(0.1, tr.radius * 3));
            grad.addColorStop(0, 'rgba(' + pal.particle.r + ',' + pal.particle.g + ',' + pal.particle.b + ',' + tr.alpha.toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(' + pal.particle.r + ',' + pal.particle.g + ',' + pal.particle.b + ',0)');

            ctx.beginPath();
            ctx.arc(tr.x, tr.y, Math.max(0.1, tr.radius * 3), 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        if (state.mouseInStage && state.mouse.x > -999) {
            for (var ti = 0; ti < state.tiles.length; ti++) {
                var t = state.tiles[ti];
                if (!t.isActive) continue;

                var tcx = t.homeX + t.offsetX + t.width / 2;
                var tcy = t.homeY + t.offsetY + t.height / 2;
                var dx = state.mouse.x - tcx;
                var dy = state.mouse.y - tcy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < state.fieldRadius * 0.7 && dist > 0.1) {
                    var alpha = (1 - dist / (state.fieldRadius * 0.7)) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(state.mouse.x, state.mouse.y);
                    ctx.lineTo(tcx, tcy);
                    ctx.strokeStyle = 'rgba(' + pal.particle.r + ',' + pal.particle.g + ',' + pal.particle.b + ',' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        for (var ri = 0; ri < state.ripples.length; ri++) {
            var rip = state.ripples[ri];
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, Math.max(0.1, rip.radius), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + pal.particle.r + ',' + pal.particle.g + ',' + pal.particle.b + ',' + (rip.strength * 0.15).toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
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

    init();
})();
