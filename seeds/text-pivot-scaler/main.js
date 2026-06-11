(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // === Simplex Noise 2D ===
    var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    var grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],
                 [1,1],[-1,1],[1,-1],[-1,-1]];
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);

    function initNoise(seed) {
        var p = new Uint8Array(256);
        for (var i = 0; i < 256; i++) p[i] = i;
        var s = seed;
        for (var j = 255; j > 0; j--) {
            s = (s * 16807) % 2147483647;
            var k = s % (j + 1);
            var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
        }
        for (var m = 0; m < 512; m++) {
            perm[m] = p[m & 255];
            permMod12[m] = perm[m] % 12;
        }
    }

    function noise2D(xin, yin) {
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var x0 = xin - (i - t);
        var y0 = yin - (j - t);
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2;
        var y2 = y0 - 1.0 + 2.0 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var n0 = 0, n1 = 0, n2 = 0;
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { var gi0 = permMod12[ii + perm[jj]]; t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { var gi1 = permMod12[ii + i1 + perm[jj + j1]]; t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) { var gi2 = permMod12[ii + 1 + perm[jj + 1]]; t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
        return 70.0 * (n0 + n1 + n2);
    }

    initNoise(Date.now() % 100000);

    // === DOM References ===
    var stage = document.getElementById('pivot-stage');
    var textInput = document.getElementById('text-input');
    var cursorGlow = document.querySelector('.cursor-glow');
    var btnScramble = document.getElementById('btn-scramble');
    var btnPulse = document.getElementById('btn-pulse');
    var btnReset = document.getElementById('btn-reset');
    var modeToggle = document.getElementById('mode-toggle');
    var paletteToggle = document.getElementById('palette-toggle');
    var sliderForce = document.getElementById('slider-force');
    var sliderRadius = document.getElementById('slider-radius');
    var valueForce = document.getElementById('value-force');
    var valueRadius = document.getElementById('value-radius');
    var statDistance = document.getElementById('stat-distance');
    var statAngle = document.getElementById('stat-angle');
    var statScale = document.getElementById('stat-scale');

    // === State ===
    var state = {
        mode: 'scale',
        palette: 'aurora',
        mouseX: 0,
        mouseY: 0,
        stageMouseX: 0,
        stageMouseY: 0,
        mouseInStage: false,
        force: 1.0,
        radius: 200,
        chars: [],
        charElements: [],
        rings: [],
        startTime: performance.now(),
        rafId: null,
        scrambling: false,
        scrambleProgress: 0,
        pulseWaves: []
    };

    // === Char Node ===
    function CharNode(ch, index, total) {
        this.char = ch;
        this.index = index;
        this.total = total;
        this.homeX = 0;
        this.homeY = 0;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.scale = 1;
        this.targetScale = 1;
        this.rotation = 0;
        this.targetRotation = 0;
        this.opacity = 1;
        this.fontSize = 36;
        this.scrambledChar = ch;
        this.element = null;
    }

    CharNode.prototype.createElement = function () {
        var el = document.createElement('div');
        el.className = 'char-node';
        el.textContent = this.char;
        stage.appendChild(el);
        this.element = el;
        return el;
    };

    CharNode.prototype.updateElement = function (dt) {
        var springK = 4.0;
        var damping = 0.75;

        this.vx += (this.homeX - this.x) * springK * dt;
        this.vy += (this.homeY - this.y) * springK * dt;
        this.vx *= damping;
        this.vy *= damping;

        this.scale += (this.targetScale - this.scale) * 6 * dt;
        this.rotation += (this.targetRotation - this.rotation) * 6 * dt;

        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;

        if (this.element) {
            var tx = this.x - this.fontSize * 0.3;
            var ty = this.y - this.fontSize * 0.5;
            this.element.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + this.scale.toFixed(3) + ') rotate(' + this.rotation.toFixed(2) + 'deg)';
            this.element.style.opacity = this.opacity;
            this.element.style.fontSize = this.fontSize + 'px';
        }
    };

    // === Layout ===
    function layoutChars() {
        var rect = stage.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        var text = textInput.value || 'DIGITAL GARDEN';
        var total = text.length;

        while (state.charElements.length > 0) {
            var oldEl = state.charElements.pop();
            if (oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
        }
        state.chars = [];

        var charWidth = Math.min(48, w / (total + 2));
        var totalWidth = total * charWidth;
        var startX = (w - totalWidth) / 2 + charWidth / 2;
        var centerY = h / 2;

        for (var i = 0; i < total; i++) {
            var node = new CharNode(text[i], i, total);
            node.homeX = startX + i * charWidth;
            node.homeY = centerY;
            node.x = node.homeX + (Math.random() - 0.5) * 100;
            node.y = node.homeY + (Math.random() - 0.5) * 100;
            node.fontSize = Math.max(16, charWidth * 0.9);
            node.createElement();
            state.chars.push(node);
            state.charElements.push(node.element);
        }
    }

    // === Mode Logic ===
    function applyMode(node, t) {
        var dx = state.stageMouseX - node.x;
        var dy = state.stageMouseY - node.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);
        var radius = state.radius;
        var force = state.force;
        var influence = Math.max(0, 1 - dist / radius);

        node.targetScale = 1;
        node.targetRotation = 0;
        node.opacity = 1;

        switch (state.mode) {
            case 'scale':
                var scaleFactor = 1 + influence * force * 2.0;
                node.targetScale = scaleFactor;
                node.targetRotation = influence * force * 30 * Math.sin(angle);
                var pushX = dx * influence * 0.08 * force;
                var pushY = dy * influence * 0.08 * force;
                node.vx += pushX;
                node.vy += pushY;
                node.opacity = 1 - influence * 0.3;
                break;

            case 'orbit':
                if (dist < radius) {
                    var orbitAngle = angle + Math.PI * 0.5 * force;
                    var orbitForce = influence * 3 * force;
                    node.vx += Math.cos(orbitAngle) * orbitForce;
                    node.vy += Math.sin(orbitAngle) * orbitForce;
                    node.targetScale = 1 + influence * 0.5;
                    node.targetRotation = influence * 45 * force;
                }
                break;

            case 'wave':
                var wavePhase = (node.index / Math.max(1, node.total - 1)) * Math.PI * 2;
                var waveAmp = influence * 40 * force;
                var waveY = Math.sin(wavePhase + t * 3) * waveAmp;
                var waveX = Math.cos(wavePhase + t * 2) * waveAmp * 0.5;
                node.homeY = stage.getBoundingClientRect().height / 2 + waveY;
                node.homeX += waveX;
                node.targetScale = 1 + Math.abs(Math.sin(wavePhase + t * 3)) * influence * force;
                node.targetRotation = Math.sin(wavePhase + t * 2.5) * 20 * influence * force;
                break;

            case 'explode':
                if (dist < radius && dist > 0) {
                    var repelForce = (1 - dist / radius) * 6 * force;
                    node.vx -= (dx / dist) * repelForce;
                    node.vy -= (dy / dist) * repelForce;
                    node.targetScale = 1 + influence * force;
                    node.targetRotation = (Math.random() - 0.5) * 90 * influence * force;
                    node.opacity = 1 - influence * 0.4;
                }
                break;
        }

        // Pulse waves
        for (var p = 0; p < state.pulseWaves.length; p++) {
            var pw = state.pulseWaves[p];
            var pdx = node.x - pw.x;
            var pdy = node.y - pw.y;
            var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            var ringDist = Math.abs(pdist - pw.radius);
            if (ringDist < 40) {
                var ringForce = (1 - ringDist / 40) * pw.strength;
                if (pdist > 0) {
                    node.vx += (pdx / pdist) * ringForce * 3;
                    node.vy += (pdy / pdist) * ringForce * 3;
                }
                node.targetScale += ringForce * 0.3;
            }
        }
    }

    // === Pulse Wave ===
    function PulseWave(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 600;
        this.strength = 1;
        this.speed = 400;
        this.alive = true;
    }

    PulseWave.prototype.update = function (dt) {
        this.radius += this.speed * dt;
        this.strength = Math.max(0, 1 - this.radius / this.maxRadius);
        if (this.radius >= this.maxRadius) this.alive = false;
    };

    // === Scramble Reveal ===
    function startScramble() {
        if (state.scrambling) return;
        state.scrambling = true;
        state.scrambleProgress = 0;
        for (var i = 0; i < state.chars.length; i++) {
            var node = state.chars[i];
            if (node.element) node.element.classList.add('scramble');
        }
    }

    function updateScramble(dt) {
        if (!state.scrambling) return;
        state.scrambleProgress += dt * 1.5;
        var charsLen = state.chars.length;
        var revealCount = Math.floor(state.scrambleProgress * charsLen);

        for (var i = 0; i < charsLen; i++) {
            var node = state.chars[i];
            if (i < revealCount) {
                node.scrambledChar = node.char;
            } else {
                node.scrambledChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
            if (node.element) node.element.textContent = node.scrambledChar;
        }

        if (revealCount >= charsLen) {
            state.scrambling = false;
            for (var j = 0; j < charsLen; j++) {
                if (state.chars[j].element) state.chars[j].element.classList.remove('scramble');
            }
        }
    }

    // === Ring Effects ===
    function createRing(x, y) {
        var ring = document.createElement('div');
        ring.className = 'pivot-ring';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        var size = state.radius * 2;
        ring.style.width = size + 'px';
        ring.style.height = size + 'px';
        stage.appendChild(ring);
        requestAnimationFrame(function () { ring.classList.add('active'); });
        setTimeout(function () {
            if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, 900);
    }

    // === Animation Loop ===
    function tick(now) {
        var t = (now - state.startTime) / 1000;
        var dt = Math.min(1 / 30, (now - (state._lastTime || now)) / 1000);
        state._lastTime = now;

        updateScramble(dt);

        // Update pulse waves
        for (var pw = state.pulseWaves.length - 1; pw >= 0; pw--) {
            state.pulseWaves[pw].update(dt);
            if (!state.pulseWaves[pw].alive) state.pulseWaves.splice(pw, 1);
        }

        // Apply mode + noise to chars
        var avgDist = 0, avgAngle = 0, avgScale = 0;
        for (var i = 0; i < state.chars.length; i++) {
            var node = state.chars[i];

            // Subtle noise drift
            var nx = noise2D(node.index * 0.3, t * 0.5) * 2 * state.force;
            var ny = noise2D(node.index * 0.3 + 100, t * 0.5) * 2 * state.force;
            node.homeX += nx * dt * 10;
            node.homeY += ny * dt * 10;

            applyMode(node, t);
            node.updateElement(dt);

            var cdx = state.stageMouseX - node.x;
            var cdy = state.stageMouseY - node.y;
            avgDist += Math.sqrt(cdx * cdx + cdy * cdy);
            avgAngle += Math.atan2(cdy, cdx);
            avgScale += node.scale;
        }

        var n = Math.max(1, state.chars.length);
        statDistance.textContent = '距离: ' + Math.round(avgDist / n);
        statAngle.textContent = '角度: ' + Math.round((avgAngle / n) * 180 / Math.PI) + '\u00B0';
        statScale.textContent = '缩放: ' + (avgScale / n).toFixed(2);

        state.rafId = requestAnimationFrame(tick);
    }

    // === Event Bindings ===
    function bindEvents() {
        document.addEventListener('mousemove', function (e) {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            var rect = stage.getBoundingClientRect();
            state.stageMouseX = e.clientX - rect.left;
            state.stageMouseY = e.clientY - rect.top;
            state.mouseInStage = (
                state.stageMouseX >= 0 && state.stageMouseX <= rect.width &&
                state.stageMouseY >= 0 && state.stageMouseY <= rect.height
            );
            cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
            cursorGlow.classList.add('visible');
        });

        document.addEventListener('mouseleave', function () {
            cursorGlow.classList.remove('visible');
            state.mouseInStage = false;
        });

        stage.addEventListener('click', function (e) {
            var rect = stage.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            state.pulseWaves.push(new PulseWave(cx, cy));
            createRing(cx, cy);
        });

        textInput.addEventListener('input', function () {
            layoutChars();
        });

        btnScramble.addEventListener('click', function () {
            startScramble();
        });

        btnPulse.addEventListener('click', function () {
            var rect = stage.getBoundingClientRect();
            var cx = rect.width / 2;
            var cy = rect.height / 2;
            state.pulseWaves.push(new PulseWave(cx, cy));
            createRing(cx, cy);
        });

        btnReset.addEventListener('click', function () {
            textInput.value = 'DIGITAL GARDEN';
            state.mode = 'scale';
            state.force = 1;
            state.radius = 200;
            sliderForce.value = 1;
            sliderRadius.value = 200;
            valueForce.textContent = '1.0';
            valueRadius.textContent = '200';
            updateModeButtons();
            layoutChars();
        });

        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            state.mode = btn.dataset.mode;
            updateModeButtons();
        });

        paletteToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (!btn) return;
            state.palette = btn.dataset.palette;
            document.body.className = 'palette-' + state.palette;
            updatePaletteButtons();
        });

        sliderForce.addEventListener('input', function () {
            state.force = parseFloat(this.value);
            valueForce.textContent = state.force.toFixed(1);
        });

        sliderRadius.addEventListener('input', function () {
            state.radius = parseInt(this.value, 10);
            valueRadius.textContent = state.radius;
        });

        window.addEventListener('resize', function () {
            layoutChars();
        });
    }

    function updateModeButtons() {
        var btns = modeToggle.querySelectorAll('.mode-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].dataset.mode === state.mode);
        }
    }

    function updatePaletteButtons() {
        var btns = paletteToggle.querySelectorAll('.palette-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].dataset.palette === state.palette);
        }
    }

    // === Init ===
    function init() {
        layoutChars();
        bindEvents();
        state._lastTime = performance.now();
        state.rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
