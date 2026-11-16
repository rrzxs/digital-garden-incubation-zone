(function () {
    'use strict';

    /* === DOM Elements === */
    var canvas = document.getElementById('field-canvas');
    var ctx = canvas.getContext('2d');
    var cursorGlow = document.getElementById('cursor-glow');
    var appShell = document.getElementById('app-shell');
    var stageArea = document.getElementById('stage-area');
    var impactLayer = document.getElementById('impact-layer');
    var guardian = document.getElementById('guardian');
    var gCore = document.getElementById('g-core');
    var iris = document.getElementById('iris');
    var eyelid = document.getElementById('eyelid');
    var gShield = document.getElementById('g-shield');
    var gStatusText = document.getElementById('g-status-text');
    var logBody = document.getElementById('log-body');
    var shieldFill = document.getElementById('shield-fill');
    var hudShieldPct = document.getElementById('hud-shield-pct');
    var hudKills = document.getElementById('hud-kills');
    var hudThreats = document.getElementById('hud-threats');
    var hudUptime = document.getElementById('hud-uptime');
    var hudFps = document.getElementById('hud-fps');
    var modeHint = document.getElementById('mode-hint');
    var modeToggle = document.getElementById('mode-toggle');
    var themeToggle = document.getElementById('theme-toggle');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var transitionFlash = document.getElementById('transition-flash');

    /* === State === */
    var state = {
        mouse: { x: -9999, y: -9999 },
        stageCenter: { x: 0, y: 0 },
        guardianScreenPos: { x: 0, y: 0 },
        mode: 'watch',
        theme: 'nebula',
        integrity: 100,
        kills: 0,
        threats: [],
        beams: [],
        pulses: [],
        sparks: [],
        ambient: [],
        burstParts: [],
        lastSpawn: 0,
        lastBeam: 0,
        lastBlink: 0,
        blinkInterval: 3800,
        blinkTimer: null,
        dormantUntil: 0,
        overload: false,
        startTime: Date.now(),
        lastFrame: 0,
        frameCount: 0,
        fpsTime: 0,
        fps: 60,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        tiltX: 0,
        tiltY: 0,
        targetTiltX: 0,
        targetTiltY: 0
    };

    /* === Palettes (synced with CSS themes) === */
    var palettes = {
        nebula: {
            particles: [[99, 102, 241], [129, 140, 248], [79, 70, 229]],
            beam: [150, 160, 255],
            threat: [244, 63, 94],
            flash: 'rgba(99, 102, 241, 0.5)'
        },
        aurora: {
            particles: [[20, 224, 176], [94, 240, 207], [16, 185, 129]],
            beam: [120, 245, 210],
            threat: [255, 120, 71],
            flash: 'rgba(20, 224, 176, 0.45)'
        },
        ember: {
            particles: [[245, 158, 11], [251, 191, 36], [249, 115, 22]],
            beam: [253, 210, 120],
            threat: [34, 211, 238],
            flash: 'rgba(245, 158, 11, 0.45)'
        },
        void: {
            particles: [[165, 180, 252], [199, 210, 254], [240, 171, 252]],
            beam: [205, 215, 255],
            threat: [240, 171, 252],
            flash: 'rgba(165, 180, 252, 0.4)'
        }
    };

    /* === Modes === */
    var modes = {
        watch: {
            label: '守望模式 · 低威胁巡航',
            spawnRate: 2600,
            threatSpeed: 0.55,
            beamRange: 320,
            beamCooldown: 900,
            regen: 0.045,
            clickKills: false
        },
        alert: {
            label: '警戒模式 · 高强度拦截',
            spawnRate: 950,
            threatSpeed: 1.25,
            beamRange: 460,
            beamCooldown: 320,
            regen: 0.03,
            clickKills: false
        },
        sanctuary: {
            label: '庇护模式 · 护盾快速再生',
            spawnRate: 1700,
            threatSpeed: 0.85,
            beamRange: 300,
            beamCooldown: 700,
            regen: 0.14,
            clickKills: false
        },
        resonance: {
            label: '共振模式 · 点击释放毁灭脉冲',
            spawnRate: 1250,
            threatSpeed: 1.0,
            beamRange: 240,
            beamCooldown: 800,
            regen: 0.06,
            clickKills: true
        }
    };

    /* === Log Templates === */
    var logPool = {
        idle: [
            '扫描扇区正常 · 熵值稳定',
            '观测到星尘穿过护盾外缘',
            '守护协议 v7.3 心跳校验通过',
            '低语噪声被静默处理',
            '外围传感阵列同步完成'
        ],
        kill: [
            '威胁信号已中和 · 谐振消散',
            '入侵体瓦解为无害光尘',
            '拦截成功 · 保护区完整',
            '目标锁定 → 湮灭确认'
        ],
        hit: [
            '护盾承受冲击 · 完整性下降',
            '警告 · 边界被穿透',
            '威胁抵达核心区 · 损失记录'
        ],
        spawn: [
            '侦测到未授权信号接近',
            '异常曲率正在逼近核心',
            '威胁源自暗区浮现'
        ]
    };

    var logQueue = [];
    var lastIdleLog = 0;

    /* === Utilities === */
    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function dist(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function now() {
        return performance.now();
    }

    function fmtTime(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        s = s % 60;
        return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    function fmtClock() {
        var d = new Date();
        return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
            (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + ':' +
            (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
    }

    /* === Canvas Sizing === */
    function resize() {
        canvas.width = window.innerWidth * state.dpr;
        canvas.height = window.innerHeight * state.dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function refreshGeometry() {
        var rect = stageArea.getBoundingClientRect();
        state.stageCenter.x = rect.left + rect.width / 2;
        state.stageCenter.y = rect.top + rect.height / 2;
        var gRect = gCore.getBoundingClientRect();
        state.guardianScreenPos.x = gRect.left + gRect.width / 2;
        state.guardianScreenPos.y = gRect.top + gRect.height / 2;
    }

    /* === Ambient Particle Field === */
    function initAmbient() {
        state.ambient = [];
        var count = Math.min(90, Math.floor(window.innerWidth / 16));
        for (var i = 0; i < count; i++) {
            state.ambient.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: rand(-0.15, 0.15),
                vy: rand(-0.15, 0.15),
                size: rand(0.6, 2.2),
                phase: Math.random() * Math.PI * 2,
                colorIdx: Math.floor(Math.random() * 3)
            });
        }
    }

    function updateAmbient(dt) {
        var pal = palettes[state.theme].particles;
        for (var i = 0; i < state.ambient.length; i++) {
            var p = state.ambient[i];
            p.x += p.vx * dt + Math.sin(p.phase + now() * 0.0004) * 0.08;
            p.y += p.vy * dt + Math.cos(p.phase + now() * 0.0003) * 0.08;

            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            var c = pal[p.colorIdx];
            var twinkle = 0.25 + 0.2 * Math.sin(p.phase + now() * 0.0012);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + twinkle + ')';
            ctx.fill();
        }
    }

    /* === Threats === */
    function spawnThreat() {
        var angle = Math.random() * Math.PI * 2;
        var radius = Math.max(window.innerWidth, window.innerHeight) * 0.62;
        var x = state.guardianScreenPos.x + Math.cos(angle) * radius;
        var y = state.guardianScreenPos.y + Math.sin(angle) * radius;
        state.threats.push({
            x: x,
            y: y,
            hp: 2,
            size: rand(9, 15),
            speed: modes[state.mode].threatSpeed * rand(0.8, 1.25),
            rot: Math.random() * Math.PI,
            rotSpeed: rand(-0.04, 0.04),
            jitter: Math.random() * 100,
            hitFlash: 0
        });
        if (Math.random() < 0.3) {
            pushLog(pick(logPool.spawn), 'log-warn');
        }
    }

    function updateThreats(dt) {
        var gx = state.guardianScreenPos.x;
        var gy = state.guardianScreenPos.y;
        var pal = palettes[state.theme];
        var i, t;

        for (i = state.threats.length - 1; i >= 0; i--) {
            t = state.threats[i];
            var dx = gx - t.x;
            var dy = gy - t.y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            var step = t.speed * dt * 0.06;

            // Slight orbital drift for organic motion
            var drift = Math.sin(now() * 0.001 + t.jitter) * 0.35;
            t.x += (dx / d) * step + (-dy / d) * step * drift * 0.4;
            t.y += (dy / d) * step + (dx / d) * step * drift * 0.4;
            t.rot += t.rotSpeed * dt * 0.06;
            if (t.hitFlash > 0) t.hitFlash -= dt * 0.02;

            // Impact with guardian core
            if (d < 110 && !state.overload) {
                state.threats.splice(i, 1);
                damageShield();
                spawnRipple(t.x, t.y, true);
                continue;
            }

            drawThreat(t, pal);
        }

        hudThreats.textContent = state.threats.length;
    }

    function drawThreat(t, pal) {
        var c = pal.threat;
        var jitterX = Math.sin(now() * 0.02 + t.jitter) * 2.2;
        var jitterY = Math.cos(now() * 0.017 + t.jitter) * 2.2;
        var x = t.x + jitterX;
        var y = t.y + jitterY;
        var s = t.size;
        var alpha = t.hitFlash > 0 ? 1 : 0.85;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t.rot);

        // Outer glitch diamond
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.8, 0);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.8)';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.42);
        ctx.lineTo(s * 0.34, 0);
        ctx.lineTo(0, s * 0.42);
        ctx.lineTo(-s * 0.34, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.35 + (t.hitFlash > 0 ? 0.5 : 0)) + ')';
        ctx.fill();

        // Glitch slice
        if (Math.random() < 0.12) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(-s, rand(-s, s), s * 2, 1.2);
        }
        ctx.restore();

        // Trail
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + (state.guardianScreenPos.x - x) * -0.08,
            y + (state.guardianScreenPos.y - y) * -0.08
        );
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /* === Guardian Beam & Pulses === */
    function tryAutoBeam() {
        if (state.overload) return;
        var conf = modes[state.mode];
        var tNow = now();
        if (tNow - state.lastBeam < conf.beamCooldown) return;

        var target = null;
        var minD = Infinity;
        for (var i = 0; i < state.threats.length; i++) {
            var t = state.threats[i];
            var d = dist(t.x, t.y, state.guardianScreenPos.x, state.guardianScreenPos.y);
            if (d < conf.beamRange && d < minD) {
                minD = d;
                target = t;
            }
        }

        if (target) {
            fireBeam(target);
            state.lastBeam = tNow;
        }
    }

    function fireBeam(target) {
        state.beams.push({
            x1: state.guardianScreenPos.x,
            y1: state.guardianScreenPos.y,
            x2: target.x,
            y2: target.y,
            life: 1
        });
        target.hp -= 1;
        target.hitFlash = 40;
        guardian.classList.add('firing');
        setTimeout(function () { guardian.classList.remove('firing'); }, 180);

        if (target.hp <= 0) {
            killThreat(target);
        }
    }

    function killThreat(t) {
        var idx = state.threats.indexOf(t);
        if (idx > -1) state.threats.splice(idx, 1);
        state.kills++;
        hudKills.textContent = state.kills;
        spawnRipple(t.x, t.y, false);
        spawnBurst(t.x, t.y, palettes[state.theme].threat);
        if (Math.random() < 0.4) {
            pushLog(pick(logPool.kill), 'log-ok');
        }
    }

    function updateBeams(dt) {
        var c = palettes[state.theme].beam;
        for (var i = state.beams.length - 1; i >= 0; i--) {
            var b = state.beams[i];
            b.life -= dt * 0.006;
            if (b.life <= 0) {
                state.beams.splice(i, 1);
                continue;
            }

            var wobble = Math.sin(now() * 0.05 + i) * 3;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2 + wobble, b.y2);
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (b.life * 0.9) + ')';
            ctx.lineWidth = 2.2 * b.life;
            ctx.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.9)';
            ctx.shadowBlur = 16;
            ctx.stroke();

            // Inner white core
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2 + wobble, b.y2);
            ctx.strokeStyle = 'rgba(255,255,255,' + (b.life * 0.7) + ')';
            ctx.lineWidth = 0.8 * b.life;
            ctx.stroke();
            ctx.restore();
        }
    }

    function spawnPulse(x, y) {
        state.pulses.push({ x: x, y: y, r: 6, maxR: modes[state.mode].clickKills ? 220 : 130, life: 1 });
    }

    function updatePulses(dt) {
        for (var i = state.pulses.length - 1; i >= 0; i--) {
            var p = state.pulses[i];
            p.r += (p.maxR - p.r) * 0.09 * (dt / 16.7);
            p.life -= dt * 0.0022;
            if (p.life <= 0) {
                state.pulses.splice(i, 1);
                continue;
            }

            var c = palettes[state.theme].particles[0];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (p.life * 0.55) + ')';
            ctx.lineWidth = 1.6;
            ctx.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.6)';
            ctx.shadowBlur = 14;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Resonance mode: pulses neutralize threats
            if (modes[state.mode].clickKills) {
                for (var j = state.threats.length - 1; j >= 0; j--) {
                    var t = state.threats[j];
                    if (dist(t.x, t.y, p.x, p.y) < p.r + 14) {
                        killThreat(t);
                    }
                }
            } else {
                // Non-lethal: push threats away
                for (var k = 0; k < state.threats.length; k++) {
                    var tk = state.threats[k];
                    var d = dist(tk.x, tk.y, p.x, p.y);
                    if (d < p.r + 40 && d > 1) {
                        var push = (1 - d / (p.r + 40)) * 5;
                        tk.x += ((tk.x - p.x) / d) * push;
                        tk.y += ((tk.y - p.y) / d) * push;
                    }
                }
            }
        }
    }

    /* === Burst Particles (canvas) === */
    function spawnBurst(x, y, color) {
        for (var i = 0; i < 16; i++) {
            var a = Math.random() * Math.PI * 2;
            var v = rand(1.2, 4.6);
            state.burstParts.push({
                x: x,
                y: y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                life: 1,
                size: rand(1, 3),
                color: color
            });
        }
    }

    function updateBursts(dt) {
        for (var i = state.burstParts.length - 1; i >= 0; i--) {
            var p = state.burstParts[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt * 0.025;
            if (p.life <= 0) {
                state.burstParts.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',' + p.life + ')';
            ctx.fill();
        }
    }

    /* === Shield & Integrity === */
    function damageShield() {
        if (state.overload) return;
        state.integrity = Math.max(0, state.integrity - rand(9, 14));
        gShield.classList.add('impact');
        setTimeout(function () { gShield.classList.remove('impact'); }, 620);
        appShell.classList.remove('shake');
        void appShell.offsetWidth;
        appShell.classList.add('shake');
        pushLog(pick(logPool.hit), 'log-danger');

        if (state.integrity <= 0) {
            enterOverload();
        }
    }

    function regenShield(dt) {
        if (state.overload) return;
        var rate = modes[state.mode].regen;
        // Sanctuary: passive shield pulse visuals
        state.integrity = Math.min(100, state.integrity + rate * (dt / 16.7));
    }

    function enterOverload() {
        state.overload = true;
        guardian.classList.add('overload', 'dormant');
        gStatusText.textContent = 'OVERLOAD · REBOOTING';
        pushLog('护盾过载 · 守护者进入休眠重启', 'log-danger');
        state.dormantUntil = now() + 3600;
        transitionFlash.classList.remove('flash');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('flash');
    }

    function rebootGuardian() {
        state.overload = false;
        state.integrity = 30;
        guardian.classList.remove('overload', 'dormant');
        gStatusText.textContent = 'SENTINEL ONLINE';
        pushLog('重启完成 · 守护者重新上线', 'log-ok');
        spawnRipple(state.guardianScreenPos.x, state.guardianScreenPos.y, false);
        transitionFlash.classList.remove('flash');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('flash');
    }

    function updateShieldUI() {
        var pct = Math.round(state.integrity);
        shieldFill.style.width = pct + '%';
        shieldFill.classList.toggle('low', pct < 35);
        hudShieldPct.textContent = pct + '%';
        var active = pct > 5 && !state.overload;
        gShield.classList.toggle('active', active);
        gShield.style.opacity = active ? (0.35 + (pct / 100) * 0.65) : 0;
    }

    /* === DOM Ripples & Sparks === */
    function spawnRipple(clientX, clientY, isHit) {
        var rect = stageArea.getBoundingClientRect();
        var el = document.createElement('span');
        el.className = 'ripple' + (isHit ? ' kill' : '');
        el.style.left = (clientX - rect.left) + 'px';
        el.style.top = (clientY - rect.top) + 'px';
        impactLayer.appendChild(el);
        setTimeout(function () { el.remove(); }, 950);
    }

    function spawnSparks(clientX, clientY) {
        var rect = stageArea.getBoundingClientRect();
        for (var i = 0; i < 6; i++) {
            var s = document.createElement('span');
            s.className = 'spark';
            s.style.left = (clientX - rect.left) + 'px';
            s.style.top = (clientY - rect.top) + 'px';
            var a = Math.random() * Math.PI * 2;
            var d = rand(24, 60);
            s.style.setProperty('--sx', Math.cos(a) * d + 'px');
            s.style.setProperty('--sy', Math.sin(a) * d + 'px');
            impactLayer.appendChild(s);
            setTimeout(function (el) { return function () { el.remove(); }; }(s), 750);
        }
    }

    /* === Guardian Gaze & Tilt === */
    function updateGaze() {
        var gx = state.guardianScreenPos.x;
        var gy = state.guardianScreenPos.y;
        var dx = state.mouse.x - gx;
        var dy = state.mouse.y - gy;
        var d = dist(0, 0, dx, dy) || 1;

        // Eye pupil tracking (limited orbit)
        var maxOff = 13;
        var off = Math.min(1, d / 320);
        var ex = (dx / d) * maxOff * off;
        var ey = (dy / d) * maxOff * off;
        iris.style.transform = 'translate(' + ex + 'px,' + ey + 'px)';

        // Spring tilt toward cursor
        state.targetTiltY = Math.max(-14, Math.min(14, (dx / (window.innerWidth / 2)) * 14));
        state.targetTiltX = Math.max(-12, Math.min(12, (-dy / (window.innerHeight / 2)) * 12));
        state.tiltX += (state.targetTiltX - state.tiltX) * 0.06;
        state.tiltY += (state.targetTiltY - state.tiltY) * 0.06;
        gCore.style.transform = 'perspective(700px) rotateX(' + state.tiltX.toFixed(2) + 'deg) rotateY(' + state.tiltY.toFixed(2) + 'deg)';
    }

    function scheduleBlink() {
        var tNow = now();
        if (tNow - state.lastBlink > state.blinkInterval && !state.overload) {
            state.lastBlink = tNow;
            state.blinkInterval = rand(2800, 5600);
            guardian.classList.add('blink');
            setTimeout(function () { guardian.classList.remove('blink'); }, 150);
        }
    }

    /* === Log System (typewriter queue) === */
    function pushLog(text, cls) {
        logQueue.push({ text: text, cls: cls || '' });
    }

    function processLogQueue() {
        if (logQueue.length === 0) return;
        var entry = logQueue.shift();
        var line = document.createElement('div');
        line.className = 'log-line ' + entry.cls;
        var timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = '[' + fmtClock() + ']';
        var textSpan = document.createElement('span');
        textSpan.className = 'log-text';
        line.appendChild(timeSpan);
        line.appendChild(textSpan);
        logBody.appendChild(line);

        // Trim old lines
        while (logBody.children.length > 6) {
            logBody.removeChild(logBody.firstChild);
        }

        // Typewriter reveal
        var chars = entry.text.split('');
        var idx = 0;
        var tick = setInterval(function () {
            textSpan.textContent = chars.slice(0, ++idx).join('');
            if (idx >= chars.length) clearInterval(tick);
        }, 22);
    }

    function idleLog() {
        var tNow = now();
        if (tNow - lastIdleLog > 5200 && logQueue.length === 0) {
            lastIdleLog = tNow;
            pushLog(pick(logPool.idle), '');
        }
    }

    /* === Mode & Theme Switching === */
    function setMode(mode) {
        state.mode = mode;
        document.body.setAttribute('data-mode', mode);
        modeHint.textContent = modes[mode].label;
        pushLog('模式切换 → ' + modes[mode].label, '');
        spawnPulse(state.guardianScreenPos.x, state.guardianScreenPos.y);
        transitionFlash.classList.remove('flash');
        void transitionFlash.offsetWidth;
        transitionFlash.classList.add('flash');
    }

    function setTheme(theme) {
        state.theme = theme;
        document.body.setAttribute('data-theme', theme);
        pushLog('配色协议切换 → ' + theme.toUpperCase(), '');
    }

    /* === Events === */
    window.addEventListener('resize', function () {
        resize();
        initAmbient();
        refreshGeometry();
    });

    window.addEventListener('mousemove', function (e) {
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    stageArea.addEventListener('pointerdown', function (e) {
        if (state.overload) return;
        var rect = stageArea.getBoundingClientRect();
        var x = e.clientX;
        var y = e.clientY;
        spawnPulse(x, y);
        spawnRipple(x, y, false);
        spawnSparks(x, y);
    });

    modeToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.mode-btn');
        if (!btn) return;
        modeToggle.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        setMode(btn.getAttribute('data-mode'));
    });

    themeToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.theme-btn');
        if (!btn) return;
        themeToggle.querySelectorAll('.theme-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        setTheme(btn.getAttribute('data-theme'));
    });

    btnFullscreen.addEventListener('click', function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () {});
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            state.lastFrame = now();
        }
    });

    /* === Main Loop === */
    function loop(t) {
        var dt = Math.min(50, t - state.lastFrame || 16.7);
        state.lastFrame = t;

        // FPS
        state.frameCount++;
        if (t - state.fpsTime > 800) {
            state.fps = Math.round(state.frameCount * 1000 / (t - state.fpsTime));
            hudFps.textContent = state.fps;
            state.fpsTime = t;
            state.frameCount = 0;
        }

        // Uptime
        hudUptime.textContent = fmtTime(Date.now() - state.startTime);

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        refreshGeometry();
        updateAmbient(dt);

        // Overload reboot timing
        if (state.overload && now() > state.dormantUntil) {
            rebootGuardian();
        }

        // Spawning
        if (t - state.lastSpawn > modes[state.mode].spawnRate && !state.overload) {
            state.lastSpawn = t;
            spawnThreat();
        }

        updateThreats(dt);
        tryAutoBeam();
        updateBeams(dt);
        updatePulses(dt);
        updateBursts(dt);
        regenShield(dt);
        updateShieldUI();
        updateGaze();
        scheduleBlink();
        idleLog();
        processLogQueue();

        requestAnimationFrame(loop);
    }

    /* === Boot Sequence === */
    function boot() {
        resize();
        initAmbient();
        refreshGeometry();
        modeHint.textContent = modes[state.mode].label;

        var bootLines = [
            '初始化守护者核心 · 载入情感矩阵',
            '护盾谐振频率锁定 · 100%',
            '威胁侦测阵列上线 · 4 模式就绪',
            'SENTINEL ONLINE · 守护开始'
        ];
        bootLines.forEach(function (l, i) {
            setTimeout(function () { pushLog(l, i === bootLines.length - 1 ? 'log-ok' : ''); }, i * 650);
        });

        setTimeout(function () {
            spawnPulse(state.guardianScreenPos.x, state.guardianScreenPos.y);
        }, 2600);

        requestAnimationFrame(loop);
    }

    boot();
})();
