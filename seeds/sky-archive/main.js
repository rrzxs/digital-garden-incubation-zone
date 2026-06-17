(function () {
    'use strict';

    // ============================================================
    // SIMPLEX NOISE (inline compact impl for flow field / star twinkle)
    // ============================================================
    var SimplexNoise = (function () {
        var F2 = 0.5 * (Math.sqrt(3) - 1);
        var G2 = (3 - Math.sqrt(3)) / 6;
        var grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

        function buildPerm(seed) {
            var p = [];
            for (var i = 0; i < 256; i++) p[i] = i;
            for (var j = 255; j > 0; j--) {
                seed = (seed * 16807 + 11) % 2147483647;
                var k = seed % (j + 1);
                var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
            }
            var perm = [];
            for (var n = 0; n < 512; n++) perm[n] = p[n & 255];
            return perm;
        }

        function dot2(g, x, y) { return g[0]*x + g[1]*y; }

        return function (seed) {
            var perm = buildPerm(seed || 42);
            return function noise2D(xin, yin) {
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
                var x2 = x0 - 1 + 2 * G2;
                var y2 = y0 - 1 + 2 * G2;
                var ii = i & 255;
                var jj = j & 255;
                var gi0 = perm[ii + perm[jj]] % 8;
                var gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
                var gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
                var n0, n1, n2;
                var t0 = 0.5 - x0*x0 - y0*y0;
                if (t0 < 0) n0 = 0; else { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
                var t1 = 0.5 - x1*x1 - y1*y1;
                if (t1 < 0) n1 = 0; else { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
                var t2 = 0.5 - x2*x2 - y2*y2;
                if (t2 < 0) n2 = 0; else { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
                return 70 * (n0 + n1 + n2);
            };
        };
    })();

    // ============================================================
    // CONFIG
    // ============================================================
    var Config = {
        particleMax: 60,
        starCount: 180,
        cloudCount: 5,
        lerpFactor: 0.14,
        cursorLerp: 0.28,
        autoSpeed: 0.00012 // hours per ms (full day ≈ 24h / 200s)
    };

    // ============================================================
    // PHENOMENON CATALOG — what can be observed in the sky
    // ============================================================
    var Phenomena = {
        meteor: {
            glyph: '☄',
            name: '流星',
            nameEn: 'METEOR',
            titles: ['流星划过', '一道银线坠落', '夜空的喘息', '燃烧的访客', '光的临别'],
            notes: [
                '它从天鹅座方向来，在大气层里燃烧成一条银色的伤口。',
                '持续时间不到一秒，但视网膜上留下了三秒的余像。',
                '那是某颗彗星几百年前留下的尘埃，今晚与你的目光相遇。',
                '一道近乎垂直的光，像谁用指甲在天幕上划了一笔。',
                '它的速度让你怀疑自己是否真的看见了，但余像证明你没有错过。'
            ]
        },
        flock: {
            glyph: '⌒',
            name: '候鸟群',
            nameEn: 'FLOCK',
            titles: ['候鸟掠过', '一支沉默的编队', '向南的箭头', '迁徙的几何', '羽翼的潮汐'],
            notes: [
                '二十七只，呈不规则的 V 字形，向南偏西 15 度飞行。',
                '它们没有发出任何声音，只有翅膀切割空气的细微震颤。',
                '这是今年秋天看到的第一群，比去年早了三天。',
                '领头鸟每隔几分钟会换位，整支队伍的形状像呼吸一样起伏。',
                '它们的目的地在几千公里之外，但此刻，它们属于这片天空。'
            ]
        },
        cloud: {
            glyph: '▢',
            name: '积雨云',
            nameEn: 'CUMULUS',
            titles: ['积雨云堆积', '一座倒挂的山', '雷暴的前奏', '棉花糖的密度', '气象的雕塑'],
            notes: [
                '顶部呈现出铁砧状，高度约一万米，底部低垂而阴沉。',
                '云内部有暗涌的对流，像一锅正在沸腾的灰色浓汤。',
                '阳光从侧面打过来，云的边缘镶上了金边，内部却漆黑如墨。',
                '这是典型的积雨云，预示着四十分钟内会有阵雨。',
                '它的形状每一分钟都在变化，永远不会有第二个瞬间与此时相同。'
            ]
        },
        balloon: {
            glyph: '○',
            name: '气球',
            nameEn: 'BALLOON',
            titles: ['一只红气球', '失控的庆典', '童年的逃逸', '高空气球', '彩色的小点'],
            notes: [
                '一只鲜红色的氦气球，正在以缓慢而坚定的速度上升。',
                '不知道它从哪里来，也许是某个孩子的手松开了。',
                '它已经升到了大约三百米的高度，依然鲜亮得刺眼。',
                '在蓝天的衬托下，那个红色的小点像一滴失语的血。',
                '它最终会爆裂，但在此之前，它拥有整片天空。'
            ]
        },
        ufo: {
            glyph: '◬',
            name: '不明光体',
            nameEn: 'ANOMALY',
            titles: ['一个不明光体', '无法解释的亮点', '天空的错别字', '悬停的几何', '它不应该在那里'],
            notes: [
                '一个明亮的橘色光点，悬浮在西北方，已经七分钟没有移动。',
                '它不像飞机，因为飞机不会停下来；它不像星星，因为星星会闪。',
                '我看了它很久，它突然向右平移了一段距离，然后再次静止。',
                '也许是无人机，也许是反射，也许是别的什么。我没有答案。',
                '记录下它的坐标：它消失前，在天空中留下了一个问号形状的轨迹。'
            ]
        }
    };

    // ============================================================
    // PHASE PALETTE — maps hour (0-24) to phase + sky tones
    // ============================================================
    function getPhase(hour) {
        if (hour < 4.5 || hour >= 21) return 'night';
        if (hour < 7.5) return 'dawn';
        if (hour < 16.5) return 'noon';
        if (hour < 19.5) return 'dusk';
        return 'night';
    }

    function getPhaseLabel(phase) {
        return { dawn: 'DAWN', noon: 'NOON', dusk: 'DUSK', night: 'NIGHT' }[phase] || 'NIGHT';
    }

    // Celestial body position across the sky arc
    function getCelestialPosition(hour) {
        // Sun visible ~5.5 to 18.5; Moon visible otherwise
        var isSun = hour >= 5 && hour <= 19;
        // Map hour to arc: 5.5 -> 0 (left horizon), 12 -> 0.5 (zenith), 18.5 -> 1 (right horizon)
        var t;
        if (isSun) {
            t = (hour - 5.5) / 13;
        } else {
            // Moon: 19 -> 0, 0 -> 0.5, 5 -> 1
            var moonHour = hour >= 19 ? hour - 19 : hour + 5;
            t = moonHour / 10;
        }
        t = Math.max(0, Math.min(1, t));
        // Parabolic arc: y = 1 - (2t-1)^2  (0 at horizons, 1 at zenith)
        var arcY = 1 - Math.pow(2 * t - 1, 2);
        // x sweeps left -> right; y is inverted (top of screen = high)
        var screenX = 10 + t * 80; // 10% to 90%
        var screenY = 75 - arcY * 60; // 75% at horizon, 15% at zenith
        return { x: screenX, y: screenY, isSun: isSun, t: t, arcY: arcY };
    }

    // ============================================================
    // DOM
    // ============================================================
    var DOM = {
        skyStage: document.getElementById('sky-stage'),
        skyGradient: document.getElementById('sky-gradient'),
        skyGlow: document.getElementById('sky-glow'),
        celestial: document.getElementById('celestial-body'),
        skyCanvas: document.getElementById('sky-canvas'),
        horizon: document.getElementById('horizon'),
        particleCanvas: document.getElementById('particle-canvas'),
        cursorGlow: document.getElementById('cursor-glow'),
        cursorRing: document.getElementById('cursor-ring'),

        themeSwitcher: document.getElementById('theme-switcher'),
        themeBtns: document.querySelectorAll('.theme-btn'),

        // HUD
        hudTime: document.getElementById('hud-time'),
        hudPhase: document.getElementById('hud-phase'),
        hudEntries: document.getElementById('hud-entries'),
        hudAltitude: document.getElementById('hud-altitude'),

        // Time dock
        timeTrack: document.getElementById('time-track'),
        timeFill: document.getElementById('time-fill'),
        timeThumb: document.getElementById('time-thumb'),
        timeReadout: document.getElementById('time-readout'),
        phaseReadout: document.getElementById('phase-readout'),
        autoBtn: document.getElementById('auto-btn'),

        // Sections / cards
        glassCards: document.querySelectorAll('.glass-card'),
        scenes: document.querySelectorAll('.scene'),

        // Phenomenon picker
        phenomPicker: document.getElementById('phenomenon-picker'),
        phenomChips: document.querySelectorAll('.phenom-chip'),
        observeHint: document.getElementById('observe-hint'),

        // Ledger
        ledger: document.getElementById('ledger'),
        ledgerEmpty: document.getElementById('ledger-empty'),
        ledgerList: document.getElementById('ledger-list'),
        btnClear: document.getElementById('btn-clear'),
        btnReplay: document.getElementById('btn-replay'),

        // Almanac
        almanacCards: document.querySelectorAll('.almanac-card'),

        // Epilogue stats
        finalEntries: document.getElementById('final-entries'),
        finalMeteors: document.getElementById('final-meteors'),
        finalPhases: document.getElementById('final-phases'),
        finalTs: document.getElementById('final-ts'),

        // Entry modal
        entryModal: document.getElementById('entry-modal'),
        entryClose: document.getElementById('entry-close'),
        entryGlyph: document.getElementById('entry-glyph'),
        entryCat: document.getElementById('entry-cat'),
        entryTitle: document.getElementById('entry-title'),
        entryMeta: document.getElementById('entry-meta'),
        entryNote: document.getElementById('entry-note'),
        entryCoords: document.getElementById('entry-coords')
    };

    // ============================================================
    // STATE
    // ============================================================
    var State = {
        hour: 12,
        phase: 'noon',
        currentPhenom: 'meteor',
        isAuto: false,
        isDraggingTime: false,
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        smoothX: window.innerWidth / 2,
        smoothY: window.innerHeight / 2,
        ringX: window.innerWidth / 2,
        ringY: window.innerHeight / 2,
        time: 0,
        noise: SimplexNoise(7),
        entries: [],
        visitedPhases: new Set(['noon']),
        // sky canvas entities
        stars: [],
        clouds: [],
        meteors: [],
        flocks: [],
        effects: [], // burst effects
        // particle flow field
        particles: []
    };

    // ============================================================
    // UTIL
    // ============================================================
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function formatHour(h) {
        var hh = Math.floor(h) % 24;
        var mm = Math.floor((h - Math.floor(h)) * 60);
        return pad2(hh) + ':' + pad2(mm);
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ============================================================
    // SKY CANVAS — stars, clouds, celestial glow, meteors, flocks
    // ============================================================
    var skyCtx;
    var skyW = 0, skyH = 0;

    function initSkyCanvas() {
        skyCtx = DOM.skyCanvas.getContext('2d');
        resizeSkyCanvas();
        // seed stars
        State.stars = [];
        for (var i = 0; i < Config.starCount; i++) {
            State.stars.push({
                x: Math.random(),
                y: Math.random() * 0.78,
                size: Math.random() * 1.4 + 0.3,
                twinkleOffset: Math.random() * Math.PI * 2,
                twinkleSpeed: rand(0.6, 1.8),
                brightness: rand(0.5, 1)
            });
        }
        // seed clouds
        State.clouds = [];
        for (var c = 0; c < Config.cloudCount; c++) {
            State.clouds.push({
                x: rand(-0.2, 1.2),
                y: rand(0.2, 0.55),
                scale: rand(0.6, 1.4),
                speed: rand(0.000015, 0.00004),
                opacity: rand(0.18, 0.4),
                puffs: Math.floor(rand(5, 9))
            });
        }
    }

    function resizeSkyCanvas() {
        var dpr = window.devicePixelRatio || 1;
        skyW = window.innerWidth;
        skyH = window.innerHeight;
        DOM.skyCanvas.width = skyW * dpr;
        DOM.skyCanvas.height = skyH * dpr;
        DOM.skyCanvas.style.width = skyW + 'px';
        DOM.skyCanvas.style.height = skyH + 'px';
        skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawSkyCanvas() {
        skyCtx.clearRect(0, 0, skyW, skyH);
        var phase = State.phase;
        var t = State.time * 0.001;

        // Stars only visible at night/dusk/dawn partially
        var starVisibility = 0;
        if (phase === 'night') starVisibility = 1;
        else if (phase === 'dusk') starVisibility = 0.4;
        else if (phase === 'dawn') starVisibility = 0.5;

        if (starVisibility > 0) {
            var style = getComputedStyle(document.documentElement);
            var starColor = style.getPropertyValue('--star-color').trim();
            for (var i = 0; i < State.stars.length; i++) {
                var s = State.stars[i];
                var twinkle = (Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5);
                var alpha = starVisibility * s.brightness * (0.4 + twinkle * 0.6);
                skyCtx.beginPath();
                skyCtx.arc(s.x * skyW, s.y * skyH, s.size, 0, Math.PI * 2);
                skyCtx.fillStyle = starColor;
                skyCtx.globalAlpha = alpha;
                skyCtx.fill();
                // bright stars get a cross flare
                if (s.size > 1.1 && twinkle > 0.7) {
                    skyCtx.globalAlpha = alpha * 0.4;
                    skyCtx.strokeStyle = starColor;
                    skyCtx.lineWidth = 0.5;
                    skyCtx.beginPath();
                    skyCtx.moveTo(s.x * skyW - 4, s.y * skyH);
                    skyCtx.lineTo(s.x * skyW + 4, s.y * skyH);
                    skyCtx.moveTo(s.x * skyW, s.y * skyH - 4);
                    skyCtx.lineTo(s.x * skyW, s.y * skyH + 4);
                    skyCtx.stroke();
                }
            }
            skyCtx.globalAlpha = 1;
        }

        // Clouds — more visible during day
        var cloudVisibility = 0;
        if (phase === 'noon') cloudVisibility = 0.85;
        else if (phase === 'dawn' || phase === 'dusk') cloudVisibility = 0.6;
        else cloudVisibility = 0.15;

        if (cloudVisibility > 0.05) {
            for (var ci = 0; ci < State.clouds.length; ci++) {
                var cl = State.clouds[ci];
                cl.x += cl.speed * 1000;
                if (cl.x > 1.3) cl.x = -0.3;
                drawCloud(cl, cloudVisibility, phase);
            }
        }

        // Meteors (alive in effects list)
        for (var m = State.meteors.length - 1; m >= 0; m--) {
            var met = State.meteors[m];
            met.life--;
            met.x += met.vx;
            met.y += met.vy;
            met.vx *= 0.99;
            met.vy *= 0.99;
            var lifeT = 1 - met.life / met.maxLife;
            drawMeteor(met, lifeT);
            if (met.life <= 0) State.meteors.splice(m, 1);
        }

        // Flocks (bird murmurations)
        for (var f = State.flocks.length - 1; f >= 0; f--) {
            var fl = State.flocks[f];
            fl.life--;
            fl.cx += fl.vx;
            fl.cy += fl.vy;
            drawFlock(fl);
            if (fl.life <= 0) State.flocks.splice(f, 1);
        }

        // Click burst effects
        for (var e = State.effects.length - 1; e >= 0; e--) {
            var ef = State.effects[e];
            ef.life--;
            ef.r += ef.vr;
            ef.vr *= 0.96;
            var ea = ef.life / ef.maxLife;
            skyCtx.beginPath();
            skyCtx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
            skyCtx.strokeStyle = ef.color;
            skyCtx.globalAlpha = ea * 0.7;
            skyCtx.lineWidth = 1.5;
            skyCtx.stroke();
            skyCtx.globalAlpha = 1;
            if (ef.life <= 0) State.effects.splice(e, 1);
        }
    }

    function drawCloud(cloud, visibility, phase) {
        var cx = cloud.x * skyW;
        var cy = cloud.y * skyH;
        var scale = cloud.scale * (skyW * 0.001) * 90;
        var style = getComputedStyle(document.documentElement);
        var tint = phase === 'dusk' ? 'rgba(255, 180, 140, ' :
                   phase === 'dawn' ? 'rgba(255, 210, 170, ' :
                   phase === 'night' ? 'rgba(80, 80, 110, ' :
                   'rgba(255, 255, 255, ';
        var alpha = cloud.opacity * visibility;
        skyCtx.fillStyle = tint + alpha + ')';
        for (var p = 0; p < cloud.puffs; p++) {
            var px = cx + Math.cos(p * 1.7) * scale * 0.6;
            var py = cy + Math.sin(p * 2.3) * scale * 0.18;
            skyCtx.beginPath();
            skyCtx.arc(px, py, scale * (0.5 + Math.sin(p) * 0.15), 0, Math.PI * 2);
            skyCtx.fill();
        }
    }

    function drawMeteor(m, lifeT) {
        var alpha = Math.sin(lifeT * Math.PI); // fade in & out
        var tailLen = 80;
        var dx = m.vx, dy = m.vy;
        var mag = Math.sqrt(dx*dx + dy*dy) || 1;
        var tx = m.x - (dx / mag) * tailLen;
        var ty = m.y - (dy / mag) * tailLen;
        var grad = skyCtx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, 'rgba(255, 245, 220, ' + alpha + ')');
        grad.addColorStop(0.4, 'rgba(255, 200, 150, ' + (alpha * 0.5) + ')');
        grad.addColorStop(1, 'rgba(255, 200, 150, 0)');
        skyCtx.strokeStyle = grad;
        skyCtx.lineWidth = 2;
        skyCtx.lineCap = 'round';
        skyCtx.beginPath();
        skyCtx.moveTo(m.x, m.y);
        skyCtx.lineTo(tx, ty);
        skyCtx.stroke();
        // bright head
        skyCtx.beginPath();
        skyCtx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
        skyCtx.fillStyle = 'rgba(255, 250, 230, ' + alpha + ')';
        skyCtx.shadowColor = 'rgba(255, 230, 180, 1)';
        skyCtx.shadowBlur = 12;
        skyCtx.fill();
        skyCtx.shadowBlur = 0;
    }

    function drawFlock(fl) {
        var lifeT = fl.life / fl.maxLife;
        var alpha = Math.sin((1 - lifeT) * Math.PI) * 0.9;
        skyCtx.fillStyle = 'rgba(40, 40, 50, ' + alpha + ')';
        if (State.phase === 'night') {
            skyCtx.fillStyle = 'rgba(180, 180, 200, ' + alpha + ')';
        }
        for (var b = 0; b < fl.birds.length; b++) {
            var bird = fl.birds[b];
            var bx = fl.cx + bird.ox + Math.sin(State.time * 0.005 + b) * 4;
            var by = fl.cy + bird.oy + Math.cos(State.time * 0.004 + b * 1.3) * 3;
            // draw bird as tiny "v"
            var wing = Math.sin(State.time * 0.02 + b) * 2 + 3;
            skyCtx.beginPath();
            skyCtx.moveTo(bx - 3, by + wing * 0.4);
            skyCtx.lineTo(bx, by - 1);
            skyCtx.lineTo(bx + 3, by + wing * 0.4);
            skyCtx.strokeStyle = skyCtx.fillStyle;
            skyCtx.lineWidth = 1.2;
            skyCtx.lineCap = 'round';
            skyCtx.stroke();
        }
    }

    // ============================================================
    // SKY MORPH — apply hour to gradient + celestial position
    // ============================================================
    var phaseTones = {
        dawn:  { top: '#2a1620', mid: '#6b3142', bottom: '#d97757', glow: 'rgba(255,183,107,0.45)', celestial: '#ffd5a0', halo: 'rgba(255,196,130,0.55)', horizon: 'rgba(60,22,30,0.7)' },
        noon:  { top: '#0d1b3a', mid: '#2563b8', bottom: '#6ab8e8', glow: 'rgba(255,220,100,0.5)', celestial: '#fff5c8', halo: 'rgba(255,235,140,0.65)', horizon: 'rgba(20,50,100,0.6)' },
        dusk:  { top: '#08081f', mid: '#2a1657', bottom: '#6b1d5e', glow: 'rgba(180,70,160,0.4)', celestial: '#f0d8ff', halo: 'rgba(200,130,230,0.5)', horizon: 'rgba(20,8,40,0.75)' },
        night: { top: '#050510', mid: '#0a0a25', bottom: '#1a1330', glow: 'rgba(120,90,180,0.18)', celestial: '#e8e8f0', halo: 'rgba(180,170,210,0.4)', horizon: 'rgba(8,5,20,0.85)' }
    };

    function lerp(a, b, t) { return a + (b - a) * t; }

    function hexLerp(h1, h2, t) {
        var c1 = parseInt(h1.slice(1), 16);
        var c2 = parseInt(h2.slice(1), 16);
        var r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t));
        var g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t));
        var b = Math.round(lerp(c1 & 255, c2 & 255, t));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    // define keyframes for the 24h sky (hour -> tones)
    var skyKeyframes = [
        { h: 0,  tones: phaseTones.night },
        { h: 5,  tones: phaseTones.night },
        { h: 6,  tones: phaseTones.dawn },
        { h: 8,  tones: phaseTones.dawn },
        { h: 10, tones: phaseTones.noon },
        { h: 15, tones: phaseTones.noon },
        { h: 17, tones: phaseTones.dusk },
        { h: 19, tones: phaseTones.dusk },
        { h: 21, tones: phaseTones.night },
        { h: 24, tones: phaseTones.night }
    ];

    function interpolateSky(hour) {
        // find bracketing keyframes
        var prev = skyKeyframes[0], next = skyKeyframes[skyKeyframes.length - 1];
        for (var i = 0; i < skyKeyframes.length - 1; i++) {
            if (hour >= skyKeyframes[i].h && hour <= skyKeyframes[i + 1].h) {
                prev = skyKeyframes[i];
                next = skyKeyframes[i + 1];
                break;
            }
        }
        var span = next.h - prev.h || 1;
        var t = clamp((hour - prev.h) / span, 0, 1);
        // ease
        t = t * t * (3 - 2 * t);
        var a = prev.tones, b = next.tones;
        return {
            top: hexLerp(a.top, b.top, t),
            mid: hexLerp(a.mid, b.mid, t),
            bottom: hexLerp(a.bottom, b.bottom, t),
            glow: t < 0.5 ? a.glow : b.glow,
            celestial: hexLerp(a.celestial, b.celestial, t),
            halo: t < 0.5 ? a.halo : b.halo,
            horizon: hexLerp(a.horizon, b.horizon, t)
        };
    }

    function applySkyMorph(hour) {
        var tones = interpolateSky(hour);
        DOM.skyGradient.style.background =
            'linear-gradient(to bottom, ' + tones.top + ' 0%, ' + tones.mid + ' 45%, ' + tones.bottom + ' 100%)';
        DOM.skyGlow.style.background =
            'radial-gradient(ellipse 60% 50% at 50% 75%, ' + tones.glow + ' 0%, transparent 65%)';
        DOM.horizon.style.background =
            'linear-gradient(to top, ' + tones.horizon + ' 0%, transparent 100%)';

        // celestial body — use CSS var driven core/halo via inline custom props on the element
        DOM.celestial.style.setProperty('--celestial-tone', tones.celestial);
        DOM.celestial.style.setProperty('--celestial-halo-tone', tones.halo);
        // position along arc
        var pos = getCelestialPosition(hour);
        DOM.celestial.style.left = pos.x + '%';
        DOM.celestial.style.top = pos.y + '%';
        DOM.celestial.style.opacity = (pos.arcY > 0.02 || pos.t < 0.02 || pos.t > 0.98) ? 1 : 0.3;

        // celestial body tone via direct child style override
        var core = DOM.celestial.querySelector('.celestial-core');
        var halo = DOM.celestial.querySelector('.celestial-halo');
        if (core) {
            core.style.background = 'radial-gradient(circle at 40% 40%, ' + tones.celestial +
                ', ' + hexLerp(tones.celestial, tones.mid, 0.4) + ' 80%)';
            core.style.boxShadow = '0 0 40px ' + tones.halo + ', 0 0 80px ' + tones.halo;
        }
        if (halo) {
            halo.style.background = 'radial-gradient(circle, ' + tones.halo + ' 0%, transparent 70%)';
        }

        State.phase = getPhase(hour);
        var phaseLabel = getPhaseLabel(State.phase);
        var timeStr = formatHour(hour);

        if (DOM.hudTime) DOM.hudTime.textContent = timeStr;
        if (DOM.hudPhase) DOM.hudPhase.textContent = phaseLabel;
        if (DOM.timeReadout) DOM.timeReadout.textContent = timeStr;
        if (DOM.phaseReadout) DOM.phaseReadout.textContent = phaseLabel;
        if (DOM.hudAltitude) DOM.hudAltitude.textContent = Math.round(pos.arcY * 90) + ' °';

        // mark phase visited
        State.visitedPhases.add(State.phase);
    }

    // ============================================================
    // TIME DOCK — scrub the day
    // ============================================================
    function initTimeDock() {
        var track = DOM.timeTrack;
        if (!track) return;

        function setFromX(clientX) {
            var rect = track.getBoundingClientRect();
            var t = clamp((clientX - rect.left) / rect.width, 0, 1);
            var hour = t * 24;
            State.hour = hour;
            DOM.timeFill.style.width = (t * 100) + '%';
            DOM.timeThumb.style.left = (t * 100) + '%';
            applySkyMorph(hour);
        }

        track.addEventListener('pointerdown', function (e) {
            State.isDraggingTime = true;
            track.classList.add('dragging');
            setFromX(e.clientX);
            track.setPointerCapture(e.pointerId);
        });
        track.addEventListener('pointermove', function (e) {
            if (!State.isDraggingTime) return;
            setFromX(e.clientX);
        });
        track.addEventListener('pointerup', function (e) {
            State.isDraggingTime = false;
            track.classList.remove('dragging');
            try { track.releasePointerCapture(e.pointerId); } catch (err) {}
        });
        track.addEventListener('pointercancel', function () {
            State.isDraggingTime = false;
            track.classList.remove('dragging');
        });

        // Auto mode
        if (DOM.autoBtn) {
            DOM.autoBtn.addEventListener('click', function () {
                State.isAuto = !State.isAuto;
                DOM.autoBtn.classList.toggle('active', State.isAuto);
            });
        }
    }

    function syncTimeDockUI() {
        var t = State.hour / 24;
        DOM.timeFill.style.width = (t * 100) + '%';
        DOM.timeThumb.style.left = (t * 100) + '%';
    }

    // ============================================================
    // PHENOMENON PICKER
    // ============================================================
    function initPhenomenonPicker() {
        if (!DOM.phenomChips) return;
        DOM.phenomChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var phenom = chip.getAttribute('data-phenom');
                State.currentPhenom = phenom;
                DOM.phenomChips.forEach(function (c) { c.classList.remove('active'); });
                chip.classList.add('active');
            });
        });
    }

    // ============================================================
    // OBSERVATION — click sky to archive a phenomenon
    // ============================================================
    function initObservation() {
        // Clicks on the sky-stage (not on UI) trigger observations
        DOM.skyStage.addEventListener('click', function (e) {
            // ignore clicks that originate on UI overlays inside stage
            if (e.target !== DOM.skyCanvas && e.target !== DOM.skyGradient &&
                e.target !== DOM.skyGlow && e.target !== DOM.horizon &&
                !e.target.classList.contains('grain-overlay') &&
                !e.target.classList.contains('sky-stage')) {
                return;
            }
            recordObservation(e.clientX, e.clientY);
        });
    }

    function recordObservation(x, y) {
        var phenomKey = State.currentPhenom;
        var phenom = Phenomena[phenomKey];
        if (!phenom) return;

        // spawn visual effect for the phenomenon
        spawnPhenomenonEffect(phenomKey, x, y);

        // create entry
        var entry = {
            id: 'E' + Date.now().toString(36) + Math.floor(Math.random() * 999),
            phenom: phenomKey,
            glyph: phenom.glyph,
            name: phenom.name,
            nameEn: phenom.nameEn,
            title: pick(phenom.titles),
            note: pick(phenom.notes),
            hour: State.hour,
            phase: State.phase,
            time: formatHour(State.hour),
            x: x,
            y: y,
            // fake coords for flavor
            lat: (Math.random() * 90).toFixed(3),
            lng: (Math.random() * 180).toFixed(3)
        };
        State.entries.unshift(entry);
        renderLedger();
        updateHUD();
        updateFinalStats();
        triggerTransitionFlash();

        // auto-open modal for the new entry after a brief delay
        setTimeout(function () {
            openEntryModal(entry);
        }, 480);
    }

    function spawnPhenomenonEffect(phenomKey, x, y) {
        var style = getComputedStyle(document.documentElement);
        var accent = style.getPropertyValue('--color-accent').trim();
        var accentAlt = style.getPropertyValue('--color-accent-alt').trim();

        // always add a click ring effect
        State.effects.push({
            x: x, y: y, r: 4, vr: 2.2, life: 50, maxLife: 50,
            color: accent
        });
        State.effects.push({
            x: x, y: y, r: 2, vr: 1.4, life: 60, maxLife: 60,
            color: accentAlt
        });

        if (phenomKey === 'meteor') {
            // spawn a meteor that streaks across
            var angle = rand(Math.PI * 0.15, Math.PI * 0.45);
            var speed = rand(6, 9);
            State.meteors.push({
                x: x - Math.cos(angle) * 200,
                y: y - Math.sin(angle) * 200,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 45, maxLife: 45
            });
        } else if (phenomKey === 'flock') {
            // spawn a bird flock that drifts across
            var birds = [];
            var n = Math.floor(rand(7, 14));
            for (var b = 0; b < n; b++) {
                birds.push({
                    ox: rand(-40, 40),
                    oy: rand(-15, 15)
                });
            }
            State.flocks.push({
                cx: x - 100, cy: y,
                vx: rand(1.2, 2.2), vy: rand(-0.3, 0.3),
                birds: birds,
                life: 180, maxLife: 180
            });
        } else if (phenomKey === 'cloud') {
            // spawn a quick cumulus puff
            State.clouds.push({
                x: x / skyW, y: y / skyH,
                scale: rand(1, 1.6),
                speed: rand(0.00003, 0.00006),
                opacity: rand(0.35, 0.55),
                puffs: Math.floor(rand(7, 11))
            });
            if (State.clouds.length > 10) State.clouds.shift();
        } else if (phenomKey === 'balloon') {
            // spawn a rising balloon effect (as a slow particle stream)
            for (var p = 0; p < 8; p++) {
                State.effects.push({
                    x: x + rand(-10, 10), y: y, r: 2, vr: 0.1,
                    life: 80, maxLife: 80, color: accentAlt, rise: true
                });
            }
        } else if (phenomKey === 'ufo') {
            // spawn a pulsing anomaly ring
            State.effects.push({
                x: x, y: y, r: 8, vr: 0.4, life: 90, maxLife: 90,
                color: accentAlt
            });
            State.effects.push({
                x: x, y: y, r: 4, vr: 0.6, life: 100, maxLife: 100,
                color: accent
            });
        }
    }

    // ============================================================
    // LEDGER
    // ============================================================
    function renderLedger() {
        if (!DOM.ledgerList) return;
        if (State.entries.length === 0) {
            DOM.ledgerEmpty.style.display = '';
            DOM.ledgerList.style.display = 'none';
            DOM.ledgerList.innerHTML = '';
            return;
        }
        DOM.ledgerEmpty.style.display = 'none';
        DOM.ledgerList.style.display = '';
        DOM.ledgerList.innerHTML = '';

        State.entries.forEach(function (entry, idx) {
            var row = document.createElement('div');
            row.className = 'ledger-row';
            row.style.animationDelay = (idx * 0.04) + 's';
            row.innerHTML =
                '<div class="row-glyph">' + entry.glyph + '</div>' +
                '<div class="row-main">' +
                    '<div class="row-title">' + entry.title + '</div>' +
                    '<div class="row-cat mono">' + entry.nameEn + ' · ' + entry.phase.toUpperCase() + '</div>' +
                '</div>' +
                '<div class="row-time mono">' + entry.time + '</div>' +
                '<button class="row-del" title="删除">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>';

            row.addEventListener('click', function (ev) {
                if (ev.target.closest('.row-del')) return;
                openEntryModal(entry);
            });

            var delBtn = row.querySelector('.row-del');
            delBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                removeEntry(entry.id);
            });

            DOM.ledgerList.appendChild(row);
        });
    }

    function removeEntry(id) {
        State.entries = State.entries.filter(function (e) { return e.id !== id; });
        renderLedger();
        updateHUD();
        updateFinalStats();
    }

    // ============================================================
    // ENTRY MODAL
    // ============================================================
    function openEntryModal(entry) {
        if (!DOM.entryModal) return;
        DOM.entryGlyph.textContent = entry.glyph;
        DOM.entryCat.textContent = entry.nameEn;
        DOM.entryTitle.textContent = entry.title;
        DOM.entryMeta.textContent = entry.time + ' · ' + getPhaseLabel(entry.phase);
        DOM.entryNote.textContent = '“' + entry.note + '”';
        DOM.entryCoords.textContent = 'N ' + entry.lat + '  E ' + entry.lng;
        DOM.entryModal.classList.add('open');
    }

    function closeEntryModal() {
        if (!DOM.entryModal) return;
        DOM.entryModal.classList.remove('open');
    }

    function initEntryModal() {
        if (DOM.entryClose) {
            DOM.entryClose.addEventListener('click', closeEntryModal);
        }
        var backdrop = DOM.entryModal.querySelector('.entry-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', closeEntryModal);
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeEntryModal();
        });
    }

    // ============================================================
    // HUD + FINAL STATS
    // ============================================================
    function updateHUD() {
        if (DOM.hudEntries) DOM.hudEntries.textContent = State.entries.length + ' / 9';
    }

    function updateFinalStats() {
        if (DOM.finalEntries) DOM.finalEntries.textContent = State.entries.length;
        var meteorCount = State.entries.filter(function (e) { return e.phenom === 'meteor'; }).length;
        if (DOM.finalMeteors) DOM.finalMeteors.textContent = meteorCount;
        if (DOM.finalPhases) DOM.finalPhases.textContent = State.visitedPhases.size;
        if (DOM.finalTs) DOM.finalTs.textContent = formatHour(State.hour);
    }

    // ============================================================
    // ALMANAC — jump to phase
    // ============================================================
    function initAlmanac() {
        if (!DOM.almanacCards) return;
        DOM.almanacCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var hour = parseFloat(card.getAttribute('data-hour'));
                animateHourTo(hour);
            });
        });
    }

    function animateHourTo(targetHour) {
        State.isAuto = false;
        if (DOM.autoBtn) DOM.autoBtn.classList.remove('active');
        var start = State.hour;
        // shortest path around the clock
        var diff = targetHour - start;
        if (diff > 12) diff -= 24;
        if (diff < -12) diff += 24;
        var dur = 1400;
        var t0 = performance.now();
        function step(now) {
            var p = clamp((now - t0) / dur, 0, 1);
            var eased = p * p * (3 - 2 * p);
            State.hour = (start + diff * eased + 24) % 24;
            syncTimeDockUI();
            applySkyMorph(State.hour);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ============================================================
    // CLEAR + REPLAY
    // ============================================================
    function initActions() {
        if (DOM.btnClear) {
            DOM.btnClear.addEventListener('click', function () {
                State.entries = [];
                renderLedger();
                updateHUD();
                updateFinalStats();
            });
        }
        if (DOM.btnReplay) {
            DOM.btnReplay.addEventListener('click', function () {
                // replay all effects: spawn meteors/flocks sequentially
                var snapshot = State.entries.slice();
                var i = 0;
                function next() {
                    if (i >= snapshot.length) return;
                    var entry = snapshot[i++];
                    spawnPhenomenonEffect(entry.phenom, entry.x, entry.y);
                    setTimeout(next, 280);
                }
                next();
            });
        }
    }

    // ============================================================
    // THEME
    // ============================================================
    function initTheme() {
        if (!DOM.themeBtns) return;
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    // ============================================================
    // CURSOR
    // ============================================================
    function initCursor() {
        document.addEventListener('pointermove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
        });

        // observe-mode cursor ring when hovering sky-stage / phenomenon picker
        var observeTargets = [DOM.skyStage, DOM.phenomPicker];
        observeTargets.forEach(function (el) {
            if (!el) return;
            el.addEventListener('pointerenter', function () {
                DOM.cursorRing.classList.add('observe-mode');
            });
            el.addEventListener('pointerleave', function () {
                DOM.cursorRing.classList.remove('observe-mode');
            });
        });

        // interactive elements cursor
        var interactiveSelectors = 'button, a, .theme-btn, .phenom-chip, .almanac-card, .ledger-row, .time-slider-track';
        document.querySelectorAll(interactiveSelectors).forEach(function (el) {
            el.addEventListener('pointerenter', function () {
                DOM.cursorRing.style.width = '54px';
                DOM.cursorRing.style.height = '54px';
                DOM.cursorRing.style.opacity = '0.8';
            });
            el.addEventListener('pointerleave', function () {
                DOM.cursorRing.style.width = '';
                DOM.cursorRing.style.height = '';
                DOM.cursorRing.style.opacity = '';
            });
        });
    }

    // ============================================================
    // GLASS CARD GLOW (cursor-following)
    // ============================================================
    function initCardGlow() {
        DOM.glassCards.forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                var y = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--glow-x', x + '%');
                card.style.setProperty('--glow-y', y + '%');
            });
        });
    }

    // ============================================================
    // INTERSECTION OBSERVER — ink reveal
    // ============================================================
    function initReveal() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // stagger child ink-lines by data-delay
                    var lines = entry.target.querySelectorAll('.ink-line');
                    lines.forEach(function (line) {
                        var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
                        line.style.transitionDelay = delay + 'ms';
                    });
                }
            });
        }, { threshold: 0.15 });

        DOM.glassCards.forEach(function (c) { observer.observe(c); });
        DOM.scenes.forEach(function (s) { observer.observe(s); });
    }

    // ============================================================
    // TRANSITION FLASH (subtle on observation)
    // ============================================================
    function triggerTransitionFlash() {
        if (!DOM.skyGlow) return;
        DOM.skyGlow.style.transition = 'opacity 0.2s ease';
        DOM.skyGlow.style.opacity = '1';
        setTimeout(function () {
            DOM.skyGlow.style.transition = '';
            DOM.skyGlow.style.opacity = '0.7';
        }, 220);
    }

    // ============================================================
    // PARTICLE FLOW FIELD (atmospheric drifting motes)
    // ============================================================
    var pCtx;
    var pW = 0, pH = 0;

    function initParticles() {
        pCtx = DOM.particleCanvas.getContext('2d');
        resizeParticles();
        for (var i = 0; i < Config.particleMax; i++) {
            spawnParticle();
        }
    }

    function resizeParticles() {
        var dpr = window.devicePixelRatio || 1;
        pW = window.innerWidth;
        pH = window.innerHeight;
        DOM.particleCanvas.width = pW * dpr;
        DOM.particleCanvas.height = pH * dpr;
        DOM.particleCanvas.style.width = pW + 'px';
        DOM.particleCanvas.style.height = pH + 'px';
        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnParticle() {
        State.particles.push({
            x: Math.random() * pW,
            y: Math.random() * pH,
            vx: rand(-0.2, 0.2),
            vy: rand(-0.2, 0.2),
            life: rand(0, 400),
            maxLife: 400,
            size: rand(0.5, 1.8),
            phase: Math.random() * Math.PI * 2
        });
    }

    function updateParticles() {
        var style = getComputedStyle(document.documentElement);
        var baseColor = style.getPropertyValue('--particle-color').trim();
        // parse rgba(r,g,b,a)
        var m = baseColor.match(/rgba?\(([^)]+)\)/);
        var rgb = '255,255,255';
        if (m) {
            var parts = m[1].split(',').map(function (s) { return s.trim(); });
            rgb = parts[0] + ',' + parts[1] + ',' + parts[2];
        }

        pCtx.clearRect(0, 0, pW, pH);
        for (var i = State.particles.length - 1; i >= 0; i--) {
            var p = State.particles[i];
            // flow field force
            var nx = p.x * 0.0025 + State.time * 0.00012;
            var ny = p.y * 0.0025 + State.time * 0.00012;
            var n = State.noise(nx, ny);
            var angle = n * Math.PI * 2;
            p.vx += Math.cos(angle) * 0.04;
            p.vy += Math.sin(angle) * 0.04;
            // mouse attract slightly
            var dx = State.smoothX - p.x;
            var dy = State.smoothY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 1) {
                p.vx += (dx / dist) * 0.05;
                p.vy += (dy / dist) * 0.05;
            }
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.x += p.vx;
            p.y += p.vy;
            p.life++;

            // wrap
            if (p.x < -10) p.x = pW + 10;
            if (p.x > pW + 10) p.x = -10;
            if (p.y < -10) p.y = pH + 10;
            if (p.y > pH + 10) p.y = -10;

            // respawn if too old
            if (p.life > p.maxLife) {
                p.x = Math.random() * pW;
                p.y = Math.random() * pH;
                p.life = 0;
                p.vx = rand(-0.2, 0.2);
                p.vy = rand(-0.2, 0.2);
            }

            var lifeAlpha = Math.sin((p.life / p.maxLife) * Math.PI);
            var alpha = lifeAlpha * 0.55;
            pCtx.beginPath();
            pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            pCtx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
            pCtx.fill();
        }
    }

    // ============================================================
    // MAIN LOOP
    // ============================================================
    function startLoop() {
        function tick(time) {
            State.time = time;

            // auto-advance time
            if (State.isAuto && !State.isDraggingTime) {
                State.hour = (State.hour + Config.autoSpeed * 16) % 24;
                syncTimeDockUI();
                applySkyMorph(State.hour);
            }

            // smooth cursor
            State.smoothX += (State.mouseX - State.smoothX) * Config.cursorLerp;
            State.smoothY += (State.mouseY - State.smoothY) * Config.cursorLerp;
            State.ringX += (State.mouseX - State.ringX) * 0.32;
            State.ringY += (State.mouseY - State.ringY) * 0.32;
            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';
            DOM.cursorRing.style.left = State.ringX + 'px';
            DOM.cursorRing.style.top = State.ringY + 'px';

            drawSkyCanvas();
            updateParticles();

            // periodically update final timestamp
            if (Math.floor(time / 1000) !== Math.floor((time - 16) / 1000)) {
                if (DOM.finalTs) DOM.finalTs.textContent = formatHour(State.hour);
            }

            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ============================================================
    // RESIZE
    // ============================================================
    window.addEventListener('resize', function () {
        resizeSkyCanvas();
        resizeParticles();
    });

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        initSkyCanvas();
        initParticles();
        applySkyMorph(State.hour);
        syncTimeDockUI();
        initTimeDock();
        initPhenomenonPicker();
        initObservation();
        initEntryModal();
        initAlmanac();
        initActions();
        initTheme();
        initCursor();
        initCardGlow();
        initReveal();
        renderLedger();
        updateHUD();
        updateFinalStats();
        startLoop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
