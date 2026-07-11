/**
 * Fogworld 雾境 — 交互逻辑
 * Simplex 噪声驱动雾场 + 光标揭示 + 节点发现 + 粒子流场
 *
 * Maintainer: EDEN
 */

(function () {
    'use strict';

    /* ======================================================================
       Simplex Noise 2D (compact implementation)
       ====================================================================== */
    var SimplexNoise = (function () {
        var perm = new Uint8Array(512);
        var permMod12 = new Uint8Array(512);
        var p = new Uint8Array(256);

        for (var i = 0; i < 256; i++) {
            p[i] = i;
        }

        function seedNoise(seed) {
            var s = seed | 0;
            for (var i = 255; i > 0; i--) {
                s = (s * 16807) % 2147483647;
                var j = s % (i + 1);
                var tmp = p[i];
                p[i] = p[j];
                p[j] = tmp;
            }
            for (var i = 0; i < 512; i++) {
                perm[i] = p[i & 255];
                permMod12[i] = perm[i] % 12;
            }
        }

        seedNoise(42);

        var grad3 = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [-1, 1], [1, -1], [-1, -1]
        ];

        var F2 = 0.5 * (Math.sqrt(3) - 1);
        var G2 = (3 - Math.sqrt(3)) / 6;

        function noise2D(xin, yin) {
            var n0 = 0, n1 = 0, n2 = 0;
            var s = (xin + yin) * F2;
            var i = Math.floor(xin + s);
            var j = Math.floor(yin + s);
            var t = (i + j) * G2;
            var X0 = i - t;
            var Y0 = j - t;
            var x0 = xin - X0;
            var y0 = yin - Y0;
            var i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }
            var x1 = x0 - i1 + G2;
            var y1 = y0 - j1 + G2;
            var x2 = x0 - 1 + 2 * G2;
            var y2 = y0 - 1 + 2 * G2;
            var ii = i & 255;
            var jj = j & 255;
            var gi0 = permMod12[ii + perm[jj]];
            var gi1 = permMod12[ii + i1 + perm[jj + j1]];
            var gi2 = permMod12[ii + 1 + perm[jj + 1]];
            var t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                t0 *= t0;
                n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
            }
            var t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                t1 *= t1;
                n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
            }
            var t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                t2 *= t2;
                n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
            }
            return 70 * (n0 + n1 + n2);
        }

        return {
            noise2D: noise2D,
            seed: seedNoise
        };
    })();

    /* ======================================================================
       DOM Elements
       ====================================================================== */
    var fogCanvas = document.getElementById('fog-canvas');
    var fogCtx = fogCanvas.getContext('2d');
    var particleCanvas = document.getElementById('particle-canvas');
    var particleCtx = particleCanvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var introOverlay = document.getElementById('intro-overlay');
    var introBtn = document.getElementById('intro-btn');
    var completionOverlay = document.getElementById('completion-overlay');
    var completionBtn = document.getElementById('completion-btn');
    var themeSwitcher = document.getElementById('theme-switcher');
    var discoveryToast = document.getElementById('discovery-toast');
    var toastIcon = document.getElementById('toast-icon');
    var toastName = document.getElementById('toast-name');
    var compass = document.getElementById('compass');
    var compassNeedle = document.getElementById('compass-needle');
    var statRevealed = document.getElementById('stat-revealed');
    var statNodes = document.getElementById('stat-nodes');
    var statTotalNodes = document.getElementById('stat-total-nodes');
    var statVisibility = document.getElementById('stat-visibility');
    var visibilityBar = document.getElementById('visibility-bar');
    var logList = document.getElementById('log-list');
    var exploreTime = document.getElementById('explore-time');
    var paramDensity = document.getElementById('param-density');
    var paramDensityVal = document.getElementById('param-density-val');
    var paramSpread = document.getElementById('param-spread');
    var paramSpreadVal = document.getElementById('param-spread-val');
    var paramFlow = document.getElementById('param-flow');
    var paramFlowVal = document.getElementById('param-flow-val');

    /* ======================================================================
       Config
       ====================================================================== */
    var Config = {
        fogGridSize: 5,
        fogLerpSpeed: 0.12,
        clearRadius: 90,
        clearStrength: 0.06,
        fogReplenish: 0.003,
        nodeRadius: 18,
        nodeProximityDist: 35,
        revealThreshold: 0.15,
        particleCount: 60,
        particleMaxSpeed: 0.5,
        particleConnDist: 80,
        lerpFactor: 0.08,
        compassUpdateSpeed: 0.06
    };

    /* ======================================================================
       State
       ====================================================================== */
    var State = {
        w: 0,
        h: 0,
        dpr: 1,
        mouseX: -9999,
        mouseY: -9999,
        targetMouseX: -9999,
        targetMouseY: -9999,
        smoothMouseX: 0,
        smoothMouseY: 0,
        isExploring: false,
        time: 0,
        startTime: 0,
        rafId: null,
        fogCols: 0,
        fogRows: 0,
        fogCurrent: null,
        fogTarget: null,
        fogImageData: null,
        nodes: [],
        discoveredCount: 0,
        revealedPercent: 0,
        particles: [],
        lastToastTime: 0,
        compassAngle: 0,
        themeColors: null
    };

    /* ======================================================================
       Node Definitions
       ====================================================================== */
    var NODE_DEFS = [
        { id: 0, glyph: '◈', name: '苍穹之核', desc: '天空碎片的残响', angle: 0.12, dist: 0.32 },
        { id: 1, glyph: '✦', name: '星陨之痕', desc: '坠落于雾中的光点', angle: 0.35, dist: 0.55 },
        { id: 2, glyph: '⟐', name: '潮汐回音', desc: '远方海浪的余音', angle: 0.58, dist: 0.28 },
        { id: 3, glyph: '⌁', name: '雷光遗印', desc: '闪电留下的烙痕', angle: 0.78, dist: 0.62 },
        { id: 4, glyph: '⊚', name: '虚空之眼', desc: '凝视深渊的瞳孔', angle: 0.92, dist: 0.40 },
        { id: 5, glyph: '✧', name: '萤火残梦', desc: '夏日末尾的微光', angle: 0.15, dist: 0.72 },
        { id: 6, glyph: '◇', name: '冰晶裂隙', desc: '寒霜凝固的瞬间', angle: 0.68, dist: 0.75 }
    ];

    /* ======================================================================
       Theme Colors
       ====================================================================== */
    var THEME_COLORS = {
        mist: {
            fog1: [30, 41, 59],
            fog2: [15, 23, 42],
            tint: [56, 189, 248],
            node: [125, 211, 252],
            nodeGlow: [125, 211, 252],
            nodeDiscovered: [251, 191, 36],
            particle: [186, 230, 253]
        },
        ember: {
            fog1: [40, 15, 10],
            fog2: [25, 10, 6],
            tint: [251, 146, 60],
            node: [253, 186, 116],
            nodeGlow: [253, 186, 116],
            nodeDiscovered: [253, 224, 71],
            particle: [254, 215, 170]
        },
        abyss: {
            fog1: [12, 10, 35],
            fog2: [5, 5, 20],
            tint: [129, 140, 248],
            node: [165, 180, 252],
            nodeGlow: [165, 180, 252],
            nodeDiscovered: [192, 132, 252],
            particle: [199, 210, 254]
        },
        verdant: {
            fog1: [10, 30, 18],
            fog2: [5, 18, 10],
            tint: [52, 211, 153],
            node: [110, 231, 183],
            nodeGlow: [110, 231, 183],
            nodeDiscovered: [253, 224, 71],
            particle: [167, 243, 208]
        }
    };

    /* ======================================================================
       Utility Functions
       ====================================================================== */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function dist(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getThemeColors() {
        var theme = document.documentElement.getAttribute('data-theme') || 'mist';
        return THEME_COLORS[theme] || THEME_COLORS.mist;
    }

    function formatTime(ms) {
        var totalSec = Math.floor(ms / 1000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function getCssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    /* ======================================================================
       Canvas Setup
       ====================================================================== */
    function resizeCanvases() {
        State.w = window.innerWidth;
        State.h = window.innerHeight;
        State.dpr = Math.min(window.devicePixelRatio || 1, 2);

        fogCanvas.width = State.w;
        fogCanvas.height = State.h;
        particleCanvas.width = State.w;
        particleCanvas.height = State.h;

        State.fogCols = Math.ceil(State.w / Config.fogGridSize);
        State.fogRows = Math.ceil(State.h / Config.fogGridSize);

        var totalCells = State.fogCols * State.fogRows;
        State.fogCurrent = new Float32Array(totalCells);
        State.fogTarget = new Float32Array(totalCells);

        for (var i = 0; i < totalCells; i++) {
            State.fogCurrent[i] = 1.0;
            State.fogTarget[i] = 1.0;
        }

        State.fogImageData = fogCtx.createImageData(State.w, State.h);

        positionNodes();
        initParticles();
    }

    /* ======================================================================
       Node Setup
       ====================================================================== */
    function positionNodes() {
        var cx = State.w / 2;
        var cy = State.h / 2;
        var radius = Math.min(State.w, State.h) * 0.35;

        State.nodes = NODE_DEFS.map(function (def) {
            var angle = def.angle * Math.PI * 2 - Math.PI / 2;
            var dist = def.dist * radius;
            return {
                id: def.id,
                glyph: def.glyph,
                name: def.name,
                desc: def.desc,
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                revealed: false,
                revealProgress: 0,
                pulse: 0,
                angle: angle,
                dist: dist
            };
        });

        statTotalNodes.textContent = State.nodes.length;
    }

    /* ======================================================================
       Particle Setup
       ====================================================================== */
    function initParticles() {
        State.particles = [];
        for (var i = 0; i < Config.particleCount; i++) {
            State.particles.push({
                x: Math.random() * State.w,
                y: Math.random() * State.h,
                vx: (Math.random() - 0.5) * Config.particleMaxSpeed,
                vy: (Math.random() - 0.5) * Config.particleMaxSpeed,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.4 + 0.2,
                noiseOffset: Math.random() * 1000
            });
        }
    }

    /* ======================================================================
       Fog System
       ====================================================================== */
    function updateFog(dt) {
        var time = State.time * 0.0001;
        var flowStrength = parseFloat(paramFlow.value) / 100;
        var density = parseFloat(paramDensity.value);
        var cols = State.fogCols;
        var rows = State.fogRows;
        var gridSize = Config.fogGridSize;

        for (var gy = 0; gy < rows; gy++) {
            for (var gx = 0; gx < cols; gx++) {
                var idx = gy * cols + gx;

                var nx = gx * 0.012;
                var ny = gy * 0.012;

                var noiseVal = SimplexNoise.noise2D(
                    nx + time * flowStrength * 2,
                    ny + time * flowStrength * 1.5
                );
                noiseVal = (noiseVal + 1) * 0.5;

                var targetVal = noiseVal * density + (1 - density) * 0.3;

                var cellX = gx * gridSize + gridSize * 0.5;
                var cellY = gy * gridSize + gridSize * 0.5;

                var distToMouse = dist(cellX, cellY, State.smoothMouseX, State.smoothMouseY);
                var spreadRadius = parseFloat(paramSpread.value);

                if (distToMouse < spreadRadius && State.isExploring) {
                    var clearFactor = 1 - (distToMouse / spreadRadius);
                    clearFactor = clearFactor * clearFactor;
                    targetVal = targetVal * (1 - clearFactor * Config.clearStrength * 10);
                }

                State.fogTarget[idx] = clamp(targetVal, 0, 1);

                State.fogCurrent[idx] = lerp(
                    State.fogCurrent[idx],
                    State.fogTarget[idx],
                    Config.fogLerpSpeed
                );

                State.fogCurrent[idx] = Math.max(
                    State.fogCurrent[idx] - Config.fogReplenish,
                    State.fogCurrent[idx] * 0.9995
                );
                State.fogCurrent[idx] = clamp(State.fogCurrent[idx], 0, 1);
            }
        }
    }

    function drawFog() {
        var data = State.fogImageData.data;
        var cols = State.fogCols;
        var rows = State.fogRows;
        var gridSize = Config.fogGridSize;
        var w = State.w;
        var colors = State.themeColors;

        var fog1 = colors.fog1;
        var fog2 = colors.fog2;
        var tint = colors.tint;

        for (var py = 0; py < State.h; py++) {
            var gy = Math.floor(py / gridSize);
            if (gy >= rows) gy = rows - 1;
            var rowOffset = gy * cols;

            for (var px = 0; px < w; px++) {
                var gx = Math.floor(px / gridSize);
                if (gx >= cols) gx = cols - 1;

                var fogVal = State.fogCurrent[rowOffset + gx];
                var pixelIdx = (py * w + px) * 4;

                var r = lerp(fog2[0], fog1[0], fogVal) + tint[0] * fogVal * 0.1;
                var g = lerp(fog2[1], fog1[1], fogVal) + tint[1] * fogVal * 0.1;
                var b = lerp(fog2[2], fog1[2], fogVal) + tint[2] * fogVal * 0.1;

                data[pixelIdx] = r;
                data[pixelIdx + 1] = g;
                data[pixelIdx + 2] = b;
                data[pixelIdx + 3] = fogVal * 255;
            }
        }

        fogCtx.putImageData(State.fogImageData, 0, 0);
    }

    function drawNodes() {
        var colors = State.themeColors;

        for (var i = 0; i < State.nodes.length; i++) {
            var node = State.nodes[i];

            var gx = Math.floor(node.x / Config.fogGridSize);
            var gy = Math.floor(node.y / Config.fogGridSize);
            gx = clamp(gx, 0, State.fogCols - 1);
            gy = clamp(gy, 0, State.fogRows - 1);
            var fogAtNode = State.fogCurrent[gy * State.fogCols + gx];

            var visibility = 1 - fogAtNode;
            if (visibility < 0.05) visibility = 0.05;

            if (node.revealed) {
                node.revealProgress = Math.min(1, node.revealProgress + 0.02);
            }

            var glowSize = Config.nodeRadius * 2.5;
            var glowAlpha = visibility * 0.6 + node.revealProgress * 0.4;

            var glowColor = node.revealed ? colors.nodeDiscovered : colors.nodeGlow;

            var gradient = fogCtx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, glowSize
            );
            gradient.addColorStop(0, 'rgba(' + glowColor[0] + ',' + glowColor[1] + ',' + glowColor[2] + ',' + (glowAlpha * 0.8) + ')');
            gradient.addColorStop(0.4, 'rgba(' + glowColor[0] + ',' + glowColor[1] + ',' + glowColor[2] + ',' + (glowAlpha * 0.2) + ')');
            gradient.addColorStop(1, 'rgba(' + glowColor[0] + ',' + glowColor[1] + ',' + glowColor[2] + ',0)');

            fogCtx.fillStyle = gradient;
            fogCtx.beginPath();
            fogCtx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
            fogCtx.fill();

            if (visibility > 0.15 || node.revealed) {
                node.pulse += 0.05;
                var pulseScale = 1 + Math.sin(node.pulse) * 0.1;

                fogCtx.save();
                fogCtx.globalAlpha = visibility * 0.8 + node.revealProgress * 0.2;
                fogCtx.fillStyle = 'rgba(' + glowColor[0] + ',' + glowColor[1] + ',' + glowColor[2] + ',0.9)';
                fogCtx.font = (16 * pulseScale) + "px 'Share Tech Mono', monospace";
                fogCtx.textAlign = 'center';
                fogCtx.textBaseline = 'middle';
                fogCtx.shadowColor = 'rgba(' + glowColor[0] + ',' + glowColor[1] + ',' + glowColor[2] + ',0.8)';
                fogCtx.shadowBlur = 8;
                fogCtx.fillText(node.glyph, node.x, node.y);
                fogCtx.restore();
            }

            if (node.revealed && node.revealProgress > 0.5) {
                var ringSize = Config.nodeRadius * 1.5 + Math.sin(State.time * 0.003 + node.id) * 4;
                fogCtx.strokeStyle = 'rgba(' + colors.nodeDiscovered[0] + ',' + colors.nodeDiscovered[1] + ',' + colors.nodeDiscovered[2] + ',' + (0.3 * node.revealProgress) + ')';
                fogCtx.lineWidth = 1;
                fogCtx.beginPath();
                fogCtx.arc(node.x, node.y, ringSize, 0, Math.PI * 2);
                fogCtx.stroke();
            }
        }
    }

    function checkNodeDiscovery() {
        for (var i = 0; i < State.nodes.length; i++) {
            var node = State.nodes[i];
            if (node.revealed) continue;

            var gx = Math.floor(node.x / Config.fogGridSize);
            var gy = Math.floor(node.y / Config.fogGridSize);
            gx = clamp(gx, 0, State.fogCols - 1);
            gy = clamp(gy, 0, State.fogRows - 1);
            var fogAtNode = State.fogCurrent[gy * State.fogCols + gx];

            if (fogAtNode < Config.revealThreshold) {
                var distToMouse = dist(node.x, node.y, State.smoothMouseX, State.smoothMouseY);
                if (distToMouse < Config.nodeProximityDist + 40) {
                    discoverNode(node);
                }
            }
        }
    }

    function discoverNode(node) {
        node.revealed = true;
        State.discoveredCount++;

        showDiscoveryToast(node);
        addLogEntry(node);

        statNodes.textContent = State.discoveredCount;

        for (var i = 0; i < 8; i++) {
            var angle = (Math.PI * 2 * i) / 8;
            State.particles.push({
                x: node.x,
                y: node.y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 2,
                opacity: 1,
                noiseOffset: Math.random() * 1000,
                burst: true,
                life: 1
            });
        }

        if (State.discoveredCount >= State.nodes.length) {
            setTimeout(showCompletion, 1200);
        }
    }

    /* ======================================================================
       Particle System
       ====================================================================== */
    function updateParticles(dt) {
        var time = State.time * 0.0002;
        var colors = State.themeColors;

        for (var i = State.particles.length - 1; i >= 0; i--) {
            var p = State.particles[i];

            if (p.burst) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.life -= 0.02;
                p.opacity = p.life;
                if (p.life <= 0) {
                    State.particles.splice(i, 1);
                    continue;
                }
            } else {
                var noiseAngle = SimplexNoise.noise2D(p.x * 0.003 + p.noiseOffset, p.y * 0.003 + time) * Math.PI * 2;
                p.vx += Math.cos(noiseAngle) * 0.02;
                p.vy += Math.sin(noiseAngle) * 0.02;

                p.vx = clamp(p.vx, -Config.particleMaxSpeed, Config.particleMaxSpeed);
                p.vy = clamp(p.vy, -Config.particleMaxSpeed, Config.particleMaxSpeed);

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = State.w;
                if (p.x > State.w) p.x = 0;
                if (p.y < 0) p.y = State.h;
                if (p.y > State.h) p.y = 0;
            }
        }
    }

    function drawParticles() {
        var colors = State.themeColors;
        particleCtx.clearRect(0, 0, State.w, State.h);

        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];

            for (var j = i + 1; j < State.particles.length; j++) {
                var p2 = State.particles[j];
                if (p2.burst) continue;
                var d = dist(p.x, p.y, p2.x, p2.y);
                if (d < Config.particleConnDist) {
                    var alpha = (1 - d / Config.particleConnDist) * 0.15 * p.opacity * p2.opacity;
                    particleCtx.strokeStyle = 'rgba(' + colors.particle[0] + ',' + colors.particle[1] + ',' + colors.particle[2] + ',' + alpha + ')';
                    particleCtx.lineWidth = 0.5;
                    particleCtx.beginPath();
                    particleCtx.moveTo(p.x, p.y);
                    particleCtx.lineTo(p2.x, p2.y);
                    particleCtx.stroke();
                }
            }
        }

        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            var color = p.burst ? colors.nodeDiscovered : colors.particle;

            particleCtx.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + p.opacity + ')';
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particleCtx.fill();

            if (p.burst) {
                particleCtx.shadowColor = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.8)';
                particleCtx.shadowBlur = 8;
                particleCtx.fill();
                particleCtx.shadowBlur = 0;
            }
        }
    }

    /* ======================================================================
       Stats Update
       ====================================================================== */
    function updateStats() {
        var totalCells = State.fogCols * State.fogRows;
        var clearedCells = 0;

        for (var i = 0; i < totalCells; i++) {
            if (State.fogCurrent[i] < 0.3) {
                clearedCells++;
            }
        }

        var revealedPercent = Math.round((clearedCells / totalCells) * 100);
        revealedPercent = clamp(revealedPercent, 0, 100);

        if (revealedPercent !== State.revealedPercent) {
            State.revealedPercent = revealedPercent;
            statRevealed.textContent = revealedPercent;
        }

        var avgFog = 0;
        var sampleCount = Math.min(totalCells, 500);
        var step = Math.floor(totalCells / sampleCount);
        for (var i = 0; i < totalCells; i += step) {
            avgFog += State.fogCurrent[i];
        }
        avgFog /= (totalCells / step);

        var visibility = Math.round((1 - avgFog) * 50 + 5);
        visibility = clamp(visibility, 3, 50);
        statVisibility.textContent = visibility;

        visibilityBar.style.width = clamp((1 - avgFog) * 100 + 8, 8, 100) + '%';

        if (State.isExploring) {
            exploreTime.textContent = formatTime(Date.now() - State.startTime);
        }
    }

    /* ======================================================================
       Compass
       ====================================================================== */
    function updateCompass() {
        if (!State.isExploring) return;

        var cx = State.w / 2;
        var cy = State.h / 2;
        var dx = State.smoothMouseX - cx;
        var dy = State.smoothMouseY - cy;
        var targetAngle = Math.atan2(dy, dx) + Math.PI / 2;

        var diff = targetAngle - State.compassAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        State.compassAngle += diff * Config.compassUpdateSpeed;
        compassNeedle.style.transform = 'rotate(' + State.compassAngle + 'rad)';
    }

    /* ======================================================================
       UI Actions
       ====================================================================== */
    function showDiscoveryToast(node) {
        var now = Date.now();
        if (now - State.lastToastTime < 500) {
            setTimeout(function () { showDiscoveryToast(node); }, 500);
            return;
        }
        State.lastToastTime = now;

        toastIcon.textContent = node.glyph;
        toastName.textContent = node.name;

        discoveryToast.classList.remove('show');
        void discoveryToast.offsetWidth;
        discoveryToast.classList.add('show');

        setTimeout(function () {
            discoveryToast.classList.remove('show');
        }, 3000);
    }

    function addLogEntry(node) {
        var emptyEntry = logList.querySelector('.log-empty');
        if (emptyEntry) {
            emptyEntry.remove();
        }

        var entry = document.createElement('div');
        entry.className = 'log-entry';
        var time = formatTime(Date.now() - State.startTime);
        entry.innerHTML =
            '<span class="log-time">' + time + '</span>' +
            '<span class="log-text">揭示 <strong style="color: var(--node-discovered)">' + node.glyph + '</strong> ' + node.name + '</span>';

        logList.insertBefore(entry, logList.firstChild);

        while (logList.children.length > 8) {
            logList.removeChild(logList.lastChild);
        }
    }

    function showCompletion() {
        completionOverlay.classList.add('visible');
    }

    function startExploration() {
        State.isExploring = true;
        State.startTime = Date.now();
        introOverlay.classList.add('hidden');
        compass.classList.add('visible');
        cursorGlow.classList.add('visible');

        var emptyEntry = logList.querySelector('.log-empty');
        if (emptyEntry) {
            emptyEntry.querySelector('.log-text').textContent = '探索已开始...';
        }
    }

    function resetExploration() {
        State.isExploring = false;
        State.discoveredCount = 0;
        State.startTime = 0;

        for (var i = 0; i < State.nodes.length; i++) {
            State.nodes[i].revealed = false;
            State.nodes[i].revealProgress = 0;
            State.nodes[i].pulse = 0;
        }

        var totalCells = State.fogCols * State.fogRows;
        for (var i = 0; i < totalCells; i++) {
            State.fogCurrent[i] = 1.0;
            State.fogTarget[i] = 1.0;
        }

        statNodes.textContent = '0';
        statRevealed.textContent = '0';
        exploreTime.textContent = '00:00';
        visibilityBar.style.width = '12%';

        logList.innerHTML = '<div class="log-entry log-empty"><span class="log-time">--:--</span><span class="log-text">等待探索开始...</span></div>';

        completionOverlay.classList.remove('visible');
        compass.classList.remove('visible');
        cursorGlow.classList.remove('visible');
        introOverlay.classList.remove('hidden');
    }

    /* ======================================================================
       Theme Switching
       ====================================================================== */
    function switchTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        State.themeColors = getThemeColors();

        var btns = themeSwitcher.querySelectorAll('.theme-btn');
        btns.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
        });
    }

    /* ======================================================================
       Event Listeners
       ====================================================================== */
    function bindEvents() {
        window.addEventListener('resize', function () {
            resizeCanvases();
        });

        document.addEventListener('mousemove', function (e) {
            State.targetMouseX = e.clientX;
            State.targetMouseY = e.clientY;
            cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        });

        document.addEventListener('mouseleave', function () {
            State.targetMouseX = -9999;
            State.targetMouseY = -9999;
        });

        document.addEventListener('touchmove', function (e) {
            if (e.touches.length > 0) {
                State.targetMouseX = e.touches[0].clientX;
                State.targetMouseY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', function () {
            State.targetMouseX = -9999;
            State.targetMouseY = -9999;
        });

        introBtn.addEventListener('click', startExploration);
        completionBtn.addEventListener('click', resetExploration);

        themeSwitcher.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-btn');
            if (btn) {
                switchTheme(btn.getAttribute('data-theme'));
            }
        });

        paramDensity.addEventListener('input', function () {
            paramDensityVal.textContent = parseFloat(this.value).toFixed(2);
        });
        paramSpread.addEventListener('input', function () {
            paramSpreadVal.textContent = this.value;
        });
        paramFlow.addEventListener('input', function () {
            paramFlowVal.textContent = this.value;
        });
    }

    /* ======================================================================
       Animation Loop
       ====================================================================== */
    function tick(time) {
        State.time = time;

        State.smoothMouseX += (State.targetMouseX - State.smoothMouseX) * Config.lerpFactor;
        State.smoothMouseY += (State.targetMouseY - State.smoothMouseY) * Config.lerpFactor;

        if (State.targetMouseX < -1000) {
            State.smoothMouseX = -9999;
            State.smoothMouseY = -9999;
        }

        updateFog();
        drawFog();
        drawNodes();

        updateParticles();
        drawParticles();

        checkNodeDiscovery();
        updateStats();
        updateCompass();

        State.rafId = requestAnimationFrame(tick);
    }

    /* ======================================================================
       Init
       ====================================================================== */
    function init() {
        State.themeColors = getThemeColors();
        resizeCanvases();
        bindEvents();

        State.rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
