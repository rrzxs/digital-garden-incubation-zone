/* ============================================================
   Pixel Math Owl — 像素数枭心算舱
   Spring-physics pixel-matrix owl + arithmetic trainer
   Vanilla JS · Zero build
   ============================================================ */

(function () {
    'use strict';

    // === DOM Elements ===
    const owlCanvas = document.getElementById('owl-canvas');
    const owlScene = document.getElementById('owl-scene');
    const owlSpeech = document.getElementById('owl-speech');
    const owlSpeechText = document.getElementById('owl-speech-text');
    const owlStars = document.getElementById('owl-stars');
    const particleCanvas = document.getElementById('particle-layer');
    const cursorGlow = document.getElementById('cursor-glow');
    const questionText = document.getElementById('question-text');
    const questionEyebrow = document.getElementById('question-eyebrow');
    const questionCard = document.getElementById('question-card');
    const answerInput = document.getElementById('answer-input');
    const answerSubmit = document.getElementById('answer-submit');
    const skipBtn = document.getElementById('skip-btn');
    const feedbackStrip = document.getElementById('feedback-strip');
    const hudLevel = document.getElementById('hud-level');
    const hudCombo = document.getElementById('hud-combo');
    const hudAccuracy = document.getElementById('hud-accuracy');
    const hudBest = document.getElementById('hud-best');
    const xpRingFill = document.getElementById('xp-ring-fill');
    const xpRingText = document.getElementById('xp-ring-text');
    const xpSub = document.getElementById('xp-sub');

    // === Palettes (canvas-side colors, synced with CSS classes) ===
    const PALETTES = {
        aurora: {
            body: '#5e7bcc', belly: '#e8d9b8', wing: '#46589c', outline: '#101733',
            eye: '#f6f2e4', pupil: '#141a30', beak: '#ffb347', feet: '#ffb347',
            tuft: '#3d4c86', spark: '#7cf2c8', ambient: ['#7cf2c8', '#8ea6ff', '#ffb347']
        },
        cyber: {
            body: '#2c8f96', belly: '#d9f6ee', wing: '#1d5f6e', outline: '#04121a',
            eye: '#eafff8', pupil: '#061018', beak: '#ff5ea8', feet: '#ffd166',
            tuft: '#1a4d5e', spark: '#46f0d2', ambient: ['#46f0d2', '#ff5ea8', '#ffd166']
        },
        dusk: {
            body: '#a06a4a', belly: '#f4e3c8', wing: '#7c4c34', outline: '#22110a',
            eye: '#fdf1e3', pupil: '#2a1408', beak: '#f47b6b', feet: '#ffb36b',
            tuft: '#6b3d28', spark: '#ffb36b', ambient: ['#ffb36b', '#f47b6b', '#ffd9a0']
        },
        mint: {
            body: '#3f9d84', belly: '#def8ec', wing: '#2c7362', outline: '#06211c',
            eye: '#eafff6', pupil: '#082018', beak: '#63c7ff', feet: '#ffe38a',
            tuft: '#276b57', spark: '#7de8b8', ambient: ['#7de8b8', '#63c7ff', '#ffe38a']
        }
    };

    let currentPalette = 'aurora';
    const pal = () => PALETTES[currentPalette];

    // ============================================================
    // === Owl Pixel Matrix (spring physics pixel field) ==========
    // ============================================================
    // Legend: . empty | t tuft | o outline | b body | w wing
    //         l belly | e eye-white | p pupil | k beak | f feet
    const OWL_MAP = [
        '..tt........tt..',
        '.tbbttttttttbbt.',
        '.tbbbbbbbbbbbbt.',
        'bboobbbbbbbboobb',
        'boeeebbbbbbeeeob',
        'boepebbbbbbepeob',
        'boeeebbbbbbeeeob',
        'bboobbbkkbbboobb',
        'bbbbbllkkllbbbbb',
        'bwwbbllllllbbwwb',
        'bwwbbllllllbbwwb',
        'bwwbbllllllbbwwb',
        'bwwbbllllllbbwwb',
        '.bbbbllllllbbbb.',
        '..ffbbllllbbff..',
        '..ff........ff..'
    ];

    const CHAR_COLORS = {
        t: () => pal().tuft, o: () => pal().outline, b: () => pal().body,
        w: () => pal().wing, l: () => pal().belly, e: () => pal().eye,
        p: () => pal().pupil, k: () => pal().beak, f: () => pal().feet
    };

    const owlCtx = owlCanvas.getContext('2d');
    let pixels = [];
    let owlW = 0, owlH = 0, cellSize = 0;
    let blinkTimer = 0, blinkPhase = 0;
    let bodyTilt = 0, bodyTiltTarget = 0;
    let globalShake = 0;

    function buildOwl() {
        pixels = [];
        const rows = OWL_MAP.length;
        const cols = OWL_MAP[0].length;
        const rect = owlScene.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        owlCanvas.width = rect.width * dpr;
        owlCanvas.height = rect.height * dpr;
        owlCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        owlW = rect.width; owlH = rect.height;
        cellSize = Math.min(owlW / (cols + 4), owlH / (rows + 5));
        const ox = (owlW - cols * cellSize) / 2;
        const oy = (owlH - rows * cellSize) / 2 + cellSize * 0.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ch = OWL_MAP[r][c];
                if (ch === '.') continue;
                pixels.push({
                    ch, col: c, row: r,
                    hx: ox + (c + 0.5) * cellSize,
                    hy: oy + (r + 0.5) * cellSize,
                    x: ox + (c + 0.5) * cellSize,
                    y: oy + (r + 0.5) * cellSize,
                    vx: 0, vy: 0,
                    isEye: ch === 'e' || ch === 'p' || ch === 'o' && (r >= 3 && r <= 7 && (c < 6 || c > 9)),
                    isWing: ch === 'w',
                    flap: 0
                });
            }
        }
    }

    function owlCenter() {
        return { x: owlW / 2, y: owlH / 2 + cellSize };
    }

    // --- Owl events ---
    function owlBurst(strength) {
        const c = owlCenter();
        pixels.forEach((px) => {
            const dx = px.x - c.x, dy = px.y - c.y;
            const dist = Math.max(12, Math.hypot(dx, dy));
            const f = strength * (1 + Math.random() * 0.7);
            px.vx += (dx / dist) * f + (Math.random() - 0.5) * f * 0.4;
            px.vy += (dy / dist) * f - f * 0.45 + (Math.random() - 0.5) * f * 0.4;
        });
    }

    function owlShake(strength) {
        globalShake = strength;
        bodyTiltTarget = (Math.random() > 0.5 ? 1 : -1) * 0.12;
        setTimeout(() => { bodyTiltTarget = 0; }, 600);
    }

    function owlFlap() {
        pixels.forEach((px) => { if (px.isWing) px.flap = 1; });
    }

    function owlTilt(direction) { bodyTiltTarget = direction * 0.08; }

    // --- Owl physics & render loop ---
    let lastT = performance.now();
    function tickOwl(now) {
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;

        // Blink logic
        blinkTimer -= dt;
        if (blinkTimer <= 0) { blinkPhase = 0.22; blinkTimer = 2.4 + Math.random() * 3.4; }
        if (blinkPhase > 0) blinkPhase -= dt;
        const blinking = blinkPhase > 0;

        // Tilt spring
        bodyTilt += (bodyTiltTarget - bodyTilt) * Math.min(1, dt * 6);

        // Shake decay
        globalShake *= Math.pow(0.0018, dt);

        const t = now / 1000;
        const c = owlCenter();
        owlCtx.clearRect(0, 0, owlW, owlH);

        const cosT = Math.cos(bodyTilt), sinT = Math.sin(bodyTilt);

        pixels.forEach((px) => {
            // Idle breathing float
            const idleX = Math.sin(t * 1.4 + px.row * 0.32) * cellSize * 0.07;
            const idleY = Math.cos(t * 1.1 + px.col * 0.24) * cellSize * 0.09;
            // Wing flap lift
            let flapY = 0;
            if (px.isWing && px.flap > 0) {
                flapY = -Math.sin(px.flap * Math.PI) * cellSize * 2.4;
                px.flap = Math.max(0, px.flap - dt * 2.2);
            }
            const hx = px.hx + idleX;
            const hy = px.hy + idleY + flapY;

            // Spring toward home
            const k = 42, damping = 7.5;
            px.vx += (hx - px.x) * k * dt;
            px.vy += (hy - px.y) * k * dt;
            px.vx *= Math.exp(-damping * dt);
            px.vy *= Math.exp(-damping * dt);
            px.x += px.vx * dt;
            px.y += px.vy * dt;

            // Render (rotate around owl center)
            const rx = px.x - c.x, ry = px.y - c.y;
            const fx = c.x + rx * cosT - ry * sinT + globalShake * Math.sin(t * 55);
            const fy = c.y + rx * sinT + ry * cosT;

            let color = CHAR_COLORS[px.ch]();
            if (blinking && (px.ch === 'e' || px.ch === 'p')) color = pal().body;

            const s = cellSize * 0.92;
            owlCtx.globalAlpha = 0.96;
            owlCtx.fillStyle = color;
            owlCtx.fillRect(Math.round(fx - s / 2), Math.round(fy - s / 2), Math.ceil(s), Math.ceil(s));
        });

        // Eye glow
        owlCtx.globalAlpha = 0.35 + Math.sin(t * 2.2) * 0.12;
        owlCtx.fillStyle = pal().spark;
        pixels.filter((p) => p.ch === 'p').forEach((p) => {
            owlCtx.beginPath();
            owlCtx.arc(p.x, p.y, cellSize * 0.9, 0, Math.PI * 2);
            owlCtx.fill();
        });
        owlCtx.globalAlpha = 1;

        requestAnimationFrame(tickOwl);
    }

    // --- Click ripple: shove pixels away from click point ---
    owlScene.addEventListener('pointerdown', (ev) => {
        const rect = owlScene.getBoundingClientRect();
        const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        pixels.forEach((px) => {
            const dx = px.x - mx, dy = px.y - my;
            const dist = Math.hypot(dx, dy);
            if (dist < cellSize * 5.5) {
                const f = (1 - dist / (cellSize * 5.5)) * 340;
                px.vx += (dx / (dist || 1)) * f;
                px.vy += (dy / (dist || 1)) * f;
            }
        });
        spawnSparks(mx, my, 10, pal().spark);
        say(pickPhrase(RIPPLE_PHRASES), 1600);
    });

    // ============================================================
    // === Ambient Spark Particles (shared burst system) ==========
    // ============================================================
    const sparkPool = [];
    function spawnSparks(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 60 + Math.random() * 240;
            sparkPool.push({
                x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
                life: 0.7 + Math.random() * 0.8, age: 0,
                size: 2 + Math.random() * 3.5,
                color: color || pal().spark
            });
        }
    }

    // ============================================================
    // === Ambient Drift Particles (background layer) =============
    // ============================================================
    const drifts = [];
    function seedDrifts() {
        drifts.length = 0;
        const count = Math.floor(window.innerWidth / 22);
        for (let i = 0; i < count; i++) {
            drifts.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: 0.8 + Math.random() * 2.2,
                speed: 6 + Math.random() * 16,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.3 + Math.random() * 0.6,
                alpha: 0.12 + Math.random() * 0.3,
                colorIdx: Math.floor(Math.random() * 3)
            });
        }
    }

    const pCtx = particleCanvas.getContext('2d');
    function resizeParticleLayer() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        particleCanvas.width = window.innerWidth * dpr;
        particleCanvas.height = window.innerHeight * dpr;
        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function tickParticles(now) {
        const dt = 1 / 60;
        pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Ambient drift
        drifts.forEach((d) => {
            d.y -= d.speed * dt;
            d.sway += d.swaySpeed * dt;
            if (d.y < -8) { d.y = window.innerHeight + 8; d.x = Math.random() * window.innerWidth; }
            const x = d.x + Math.sin(d.sway) * 24;
            pCtx.globalAlpha = d.alpha * (0.7 + Math.sin(d.sway * 2) * 0.3);
            pCtx.fillStyle = pal().ambient[d.colorIdx];
            pCtx.beginPath();
            pCtx.arc(x, d.y, d.r, 0, Math.PI * 2);
            pCtx.fill();
        });

        // Burst sparks
        for (let i = sparkPool.length - 1; i >= 0; i--) {
            const s = sparkPool[i];
            s.age += dt;
            if (s.age >= s.life) { sparkPool.splice(i, 1); continue; }
            s.vy += 160 * dt;
            s.vx *= Math.exp(-1.4 * dt);
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            const k = 1 - s.age / s.life;
            pCtx.globalAlpha = k;
            pCtx.fillStyle = s.color;
            pCtx.fillRect(s.x - s.size * k / 2, s.y - s.size * k / 2, s.size * k + 1, s.size * k + 1);
        }
        pCtx.globalAlpha = 1;

        // Sparks also mirrored onto owl canvas coordinates handled above (burst on submit)
        requestAnimationFrame(tickParticles);
    }

    // === Stars in owl scene ===
    function buildStars() {
        owlStars.innerHTML = '';
        for (let i = 0; i < 26; i++) {
            const star = document.createElement('span');
            star.className = 'owl-star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = (Math.random() * 3.4) + 's';
            star.style.animationDuration = (2.4 + Math.random() * 3) + 's';
            owlStars.appendChild(star);
        }
    }

    // ============================================================
    // === Math Engine ============================================
    // ============================================================
    const state = {
        mode: 'add', difficulty: 2,
        question: null, questNo: 0,
        xp: 0, level: 1, combo: 0, best: 0,
        solved: 0, attempts: 0, locked: false
    };

    const LEVEL_STEP = 100;

    const DIFF_RANGES = {
        add: [[1, 9], [1, 20], [10, 60], [25, 150]],
        sub: [[1, 9], [1, 20], [10, 60], [25, 150]],
        mul: [[1, 3], [1, 6], [2, 9], [3, 14]],
        div: [[1, 3], [1, 6], [2, 9], [3, 14]]
    };

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    function genQuestion() {
        const mode = state.mode === 'mix' ? ['add', 'sub', 'mul', 'div'][randInt(0, 3)] : state.mode;
        const range = DIFF_RANGES[mode][state.difficulty - 1];
        let a = randInt(range[0], range[1]);
        let b = randInt(range[0], range[1]);
        if (mode === 'sub' && b > a) [a, b] = [b, a];
        let answer, symbol, label;
        if (mode === 'add') { answer = a + b; symbol = '+'; label = 'ADDITION'; }
        else if (mode === 'sub') { answer = a - b; symbol = '−'; label = 'SUBTRACTION'; }
        else if (mode === 'mul') { answer = a * b; symbol = '×'; label = 'MULTIPLICATION'; }
        else {
            answer = b; a = a * b; symbol = '÷'; label = 'DIVISION';
        }
        return { a, b, symbol, answer, label, text: `${a} ${symbol} ${b} = ?` };
    }

    // === Scramble Reveal ===
    const GLYPHS = '0123456789+-×÷=?#%&*';
    function scrambleReveal(el, target, duration) {
        const start = performance.now();
        const chars = target.split('');
        function frame(now) {
            const p = Math.min(1, (now - start) / duration);
            const revealed = Math.floor(p * chars.length);
            let out = '';
            chars.forEach((ch, i) => {
                if (ch === ' ' || i < revealed) out += ch;
                else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            });
            el.textContent = out;
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    // === Phrases ===
    const CORRECT_PHRASES = [
        'hoot hoot! 像素为你起舞。',
        '智者之光在你眼中闪烁。',
        '答对了！羽毛都在欢呼。',
        '夜之智者向你点头致意。',
        '完美的直觉，继续飞翔！'
    ];
    const WRONG_PHRASES = [
        '别急，连星星也会算错。',
        'hooo… 我碎了一地，但很快重聚。',
        '错误是通往智慧的另一条小径。',
        '深呼吸，下一题属于你。'
    ];
    const RIPPLE_PHRASES = [
        'ho? 别挠我的像素！',
        '哗啦——我差点散架！',
        '像素涟漪，好痒。',
        'hoot! 轻点戳。'
    ];
    const SKIP_PHRASES = ['换个口味？没问题。', '这一题飞走了。', 'hooo，下一题更配你。'];

    const pickPhrase = (arr) => arr[Math.floor(Math.random() * arr.length)];

    let speechTimer = null;
    function say(text, ms) {
        owlSpeechText.textContent = text;
        owlSpeech.classList.add('is-visible');
        clearTimeout(speechTimer);
        speechTimer = setTimeout(() => owlSpeech.classList.remove('is-visible'), ms || 2600);
    }

    // === Flow ===
    function nextQuestion() {
        state.locked = false;
        state.question = genQuestion();
        state.questNo++;
        questionEyebrow.textContent = `QUEST №${state.questNo} · ${state.question.label} · LV ${state.difficulty}`;
        scrambleReveal(questionText, state.question.text, 480);
        answerInput.value = '';
        answerInput.focus({ preventScroll: true });
        feedbackStrip.textContent = '';
        feedbackStrip.className = 'feedback-strip';
        questionCard.classList.remove('is-correct', 'is-wrong');
    }

    function levelFromXp(xp) { return Math.floor(xp / LEVEL_STEP) + 1; }

    function refreshHud() {
        hudLevel.textContent = state.level;
        hudCombo.textContent = '×' + state.combo;
        hudCombo.classList.toggle('is-hot', state.combo >= 5);
        hudBest.textContent = '×' + state.best;
        hudAccuracy.textContent = state.attempts
            ? Math.round((state.solved / state.attempts) * 100) + '%' : '--%';

        const progress = (state.xp % LEVEL_STEP) / LEVEL_STEP;
        const circ = 2 * Math.PI * 30;
        xpRingFill.style.strokeDasharray = String(circ);
        xpRingFill.style.strokeDashoffset = String(circ * (1 - progress));
        const cur = state.xp % LEVEL_STEP;
        xpRingText.innerHTML = `${cur}<span>/${LEVEL_STEP}</span>`;
        const remain = LEVEL_STEP - cur;
        xpSub.textContent = remain <= 10
            ? `距离 Lv.${state.level + 1} 仅一步之遥！`
            : `再答对 ${Math.ceil(remain / (8 + state.difficulty * 4))} 题晋级 Lv.${state.level + 1}`;
    }

    function submitAnswer() {
        if (state.locked) return;
        const raw = answerInput.value.trim().replace('−', '-');
        if (raw === '' || raw === '-') { say('hoot? 还没写答案呢。', 1600); return; }
        const value = parseInt(raw, 10);
        if (Number.isNaN(value)) return;

        state.attempts++;
        state.locked = true;
        const q = state.question;

        if (value === q.answer) {
            state.solved++;
            state.combo++;
            state.best = Math.max(state.best, state.combo);
            const gain = Math.round((8 + state.difficulty * 6) * (1 + state.combo * 0.08));
            const prevLevel = state.level;
            state.xp += gain;
            state.level = levelFromXp(state.xp);

            // Celebrations
            questionCard.classList.add('is-correct');
            feedbackStrip.textContent = `✓ CORRECT +${gain} XP${state.combo > 1 ? ` · COMBO ×${state.combo}` : ''}`;
            feedbackStrip.classList.add('is-correct');
            owlBurst(200 + state.difficulty * 60);
            owlFlap();
            const scene = owlScene.getBoundingClientRect();
            spawnSparks(scene.width / 2, scene.height / 2, 26 + state.combo * 2, pal().spark);
            spawnSparks(scene.width / 2, scene.height / 2, 14, pal().ambient[1]);
            say(pickPhrase(CORRECT_PHRASES));
            if (state.level > prevLevel) {
                setTimeout(() => {
                    say(`LEVEL UP! 智者星轨亮起 Lv.${state.level} ✦`, 3200);
                    owlBurst(420);
                    const s2 = owlScene.getBoundingClientRect();
                    spawnSparks(s2.width / 2, s2.height / 2, 60, pal().ambient[2]);
                }, 700);
            }
        } else {
            state.combo = 0;
            questionCard.classList.add('is-wrong');
            feedbackStrip.textContent = `✗ ANSWER = ${q.answer} · 再试一题`;
            feedbackStrip.classList.add('is-wrong');
            owlShake(9);
            say(pickPhrase(WRONG_PHRASES));
        }

        refreshHud();
        setTimeout(nextQuestion, state.combo >= 3 ? 1100 : 1400);
    }

    // ============================================================
    // === Events ================================================
    // ============================================================
    answerSubmit.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });
    skipBtn.addEventListener('click', () => {
        say(pickPhrase(SKIP_PHRASES));
        owlTilt(Math.random() > 0.5 ? 1 : -1);
        nextQuestion();
    });

    document.querySelectorAll('.num-key').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            if (key === 'back') {
                answerInput.value = answerInput.value.slice(0, -1);
            } else if (key === '-') {
                answerInput.value = answerInput.value.startsWith('-')
                    ? answerInput.value.slice(1) : '-' + answerInput.value;
            } else {
                answerInput.value += key;
            }
            answerInput.focus({ preventScroll: true });
        });
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((b) => {
                b.classList.remove('is-active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-selected', 'true');
            state.mode = btn.dataset.mode;
            say('模式已切换，感受新的数字之风。', 1800);
            nextQuestion();
        });
    });

    document.querySelectorAll('.diff-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach((b) => {
                b.classList.remove('is-active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-checked', 'true');
            state.difficulty = parseInt(btn.dataset.diff, 10);
            nextQuestion();
        });
    });

    document.querySelectorAll('.palette-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.palette-btn').forEach((b) => {
                b.classList.remove('is-active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-checked', 'true');
            currentPalette = btn.dataset.palette;
            document.body.className = 'palette-' + currentPalette;
            const scene = owlScene.getBoundingClientRect();
            spawnSparks(scene.width / 2, scene.height / 2, 24, pal().spark);
        });
    });

    // Owl reacts to typing — subtle tilt while input focused
    let tiltCooldown = 0;
    answerInput.addEventListener('input', () => {
        const now = performance.now();
        if (now - tiltCooldown > 600) {
            owlTilt(answerInput.value.length % 2 === 0 ? -1 : 1);
            tiltCooldown = now;
        }
    });

    // Cursor glow
    window.addEventListener('pointermove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // Keyboard shortcuts: 1-5 switch mode, arrows adjust difficulty
    window.addEventListener('keydown', (e) => {
        if (document.activeElement === answerInput) return;
        if (e.key >= '1' && e.key <= '5') {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs[parseInt(e.key, 10) - 1]?.click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const btns = [...document.querySelectorAll('.diff-btn')];
            const idx = btns.findIndex((b) => b.classList.contains('is-active'));
            const next = Math.max(0, Math.min(btns.length - 1, idx + (e.key === 'ArrowUp' ? -1 : 1)));
            if (next !== idx) btns[next].click();
        }
    });

    // Resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            buildOwl();
            resizeParticleLayer();
            seedDrifts();
        }, 180);
    });

    // Hover owl scene — pixels lean toward cursor
    owlScene.addEventListener('pointermove', (e) => {
        const rect = owlScene.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        pixels.forEach((px) => {
            const dx = mx - px.x, dy = my - px.y;
            const dist = Math.hypot(dx, dy);
            if (dist < cellSize * 4 && dist > 1) {
                const f = (1 - dist / (cellSize * 4)) * 26;
                px.vx += (dx / dist) * f;
                px.vy += (dy / dist) * f;
            }
        });
    });

    // ============================================================
    // === Boot ===================================================
    // ============================================================
    buildOwl();
    resizeParticleLayer();
    seedDrifts();
    buildStars();
    refreshHud();
    nextQuestion();
    requestAnimationFrame(tickOwl);
    requestAnimationFrame(tickParticles);

    setTimeout(() => say('hoot! 我是数枭，请开始你的心算之旅。', 3000), 900);

    // Idle wing stretch
    setInterval(() => {
        if (Math.random() > 0.45) owlFlap();
    }, 6000);
})();
