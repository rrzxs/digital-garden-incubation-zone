/* ============================================================
   Pixel Owl Math — 像素猫头鹰数学馆
   Vanilla JS · Zero Build · maintained by EDEN
   ============================================================ */

(() => {
    'use strict';

    // === DOM Elements ===
    const body = document.body;
    const owl = document.getElementById('owl');
    const owlEyes = document.querySelectorAll('.owl-eye');
    const owlPupils = document.querySelectorAll('.owl-pupil');
    const owlSpeech = document.getElementById('owl-speech');
    const owlSpeechText = document.getElementById('owl-speech-text');
    const owlHalo = document.getElementById('owl-halo');
    const owlStars = document.getElementById('owl-stars');
    const questionCard = document.getElementById('question-card');
    const questionExpr = document.getElementById('question-expression');
    const questionIndex = document.getElementById('meta-index');
    const questionOp = document.getElementById('meta-op');
    const answerInput = document.getElementById('answer-input');
    const answerSubmit = document.getElementById('answer-submit');
    const feedbackLine = document.getElementById('feedback-line');
    const keypad = document.getElementById('keypad');
    const modeGroup = document.getElementById('mode-group');
    const levelGroup = document.getElementById('level-group');
    const comboValue = document.getElementById('combo-value');
    const comboFill = document.getElementById('combo-fill');
    const comboTier = document.getElementById('combo-tier');
    const statAnswered = document.getElementById('stat-answered');
    const statAccuracy = document.getElementById('stat-accuracy');
    const statBest = document.getElementById('stat-best');
    const statXp = document.getElementById('stat-xp');
    const xpRingFill = document.getElementById('xp-ring-fill');
    const xpLevel = document.getElementById('xp-level');
    const resetBtn = document.getElementById('reset-btn');
    const cursorGlow = document.getElementById('cursor-glow');
    const particleCanvas = document.getElementById('particle-layer');

    // === Config ===
    const OP_GLYPH = { add: '+', sub: '−', mul: '×', div: '÷' };
    const OP_NAME = { add: 'ADDITION', sub: 'SUBTRACTION', mul: 'MULTIPLY', div: 'DIVISION', mix: 'MIXED MODE' };

    const LEVEL_RANGE = {
        1: { add: [1, 20], sub: [1, 20], mul: [1, 5], div: [1, 5] },
        2: { add: [10, 60], sub: [10, 60], mul: [2, 9], div: [2, 9] },
        3: { add: [20, 200], sub: [20, 200], mul: [3, 12], div: [3, 12] },
        4: { add: [50, 999], sub: [50, 999], mul: [6, 19], div: [6, 19] }
    };

    const COMBO_TIERS = [
        { min: 0, label: '雏鸟 · Fledgling' },
        { min: 3, label: '夜翼 · Night Wing' },
        { min: 6, label: '星眼 · Star Gazer' },
        { min: 10, label: '羽翼风暴 · WING STORM' },
        { min: 16, label: '夜之智者 · Night Sage' }
    ];

    const SPEECH_IDLE = [
        '呜——夜的算式正在成形。看清数字，再落下答案。',
        '咕。心算之道：先呼吸，再动笔。',
        '月光是最好草稿纸。下一题来了。',
        '我的羽翼为正确答案而振。'
    ];

    const SPEECH_GOOD = [
        '正确！你的羽毛又亮了一分。',
        '咕咕——漂亮，正是此数！',
        '夜空为你闪了一下。继续。',
        '精准如枭之目。下一题！'
    ];

    const SPEECH_STORM = [
        '羽翼风暴！连击点亮了整片夜空！',
        '风暴等级！你已是夜之 arithmetic 主宰！'
    ];

    const SPEECH_BAD = [
        '歪头……差一点。正确答案是 {ans}，记住它的模样。',
        '咕……夜还长，答案是 {ans}。再来。',
        '翅膀垂了一下。答案为 {ans}，我们继续。'
    ];

    // === State ===
    const state = {
        mode: 'add',
        level: 1,
        question: null,
        questionCount: 0,
        answered: 0,
        correct: 0,
        combo: 0,
        bestCombo: 0,
        xp: 0,
        locked: false,
        stormActive: false
    };

    // === Utilities ===
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    function gaussianNoise() {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // === Simplex-ish Smooth Noise (for particle flow field) ===
    const noise = (() => {
        const perm = new Uint8Array(512);
        const base = Array.from({ length: 256 }, (_, i) => i);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [base[i], base[j]] = [base[j], base[i]];
        }
        for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const grad = (hash, x, y) => {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        };

        return (x, y) => {
            const xi = Math.floor(x) & 255;
            const yi = Math.floor(y) & 255;
            const xf = x - Math.floor(x);
            const yf = y - Math.floor(y);
            const u = fade(xf);
            const v = fade(yf);
            const aa = perm[perm[xi] + yi];
            const ab = perm[perm[xi] + yi + 1];
            const ba = perm[perm[xi + 1] + yi];
            const bb = perm[perm[xi + 1] + yi + 1];
            const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
            const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
            return x1 + v * (x2 - x1);
        };
    })();

    // === Question Generation ===
    function generateQuestion() {
        const mode = state.mode === 'mix' ? pick(['add', 'sub', 'mul', 'div']) : state.mode;
        const [lo, hi] = LEVEL_RANGE[state.level][mode];
        let a;
        let b;
        let ans;

        switch (mode) {
            case 'add':
                a = rand(lo, hi);
                b = rand(lo, hi);
                ans = a + b;
                break;
            case 'sub':
                a = rand(lo, hi);
                b = rand(lo, a);
                ans = a - b;
                break;
            case 'mul':
                a = rand(lo, hi);
                b = rand(lo, hi);
                ans = a * b;
                break;
            case 'div':
                b = rand(Math.max(2, lo), hi);
                ans = rand(Math.max(2, lo), hi);
                a = b * ans;
                break;
            default:
                break;
        }

        return { mode, a, b, ans };
    }

    // === Scramble Reveal for Question ===
    function renderQuestion() {
        const q = state.question;
        const glyph = OP_GLYPH[q.mode];
        const raw = `${q.a}${glyph}${q.b}=`;

        questionExpr.innerHTML = '';
        let delay = 0;
        const scrambleChars = '0123456789+−×÷=?#*';

        [...raw].forEach((ch, i) => {
            const span = document.createElement('span');
            const isOp = ch === glyph;
            const isEq = ch === '=';
            span.className = 'q-char' + (isOp ? ' op-glyph' : isEq ? ' eq-glyph' : '');

            let frame = 0;
            const totalFrames = 8 + i * 2;
            const reveal = () => {
                frame += 1;
                if (frame < totalFrames && ch !== glyph && ch !== '=') {
                    span.textContent = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    setTimeout(reveal, 34);
                } else {
                    span.textContent = ch;
                    span.style.textShadow = isOp ? '0 0 26px var(--accent)' : '';
                }
            };
            reveal();

            span.style.animationDelay = `${delay}s`;
            delay += 0.045;
            questionExpr.appendChild(span);
        });

        questionIndex.textContent = `Q.${String(state.questionCount).padStart(3, '0')}`;
        questionOp.textContent = state.mode === 'mix' ? `MIXED · ${OP_NAME[q.mode]}` : OP_NAME[q.mode];
    }

    // === Flow: next question ===
    function nextQuestion() {
        state.locked = false;
        state.question = generateQuestion();
        state.questionCount += 1;
        renderQuestion();
        answerInput.value = '';
        answerInput.classList.remove('is-good', 'is-bad');
        feedbackLine.textContent = '';
        feedbackLine.className = 'feedback-line';
        questionCard.classList.remove('is-good', 'is-bad');
        setOwlMood('idle');
        say(pick(SPEECH_IDLE), '');
        answerInput.focus();
    }

    // === Owl Control ===
    let moodTimer = null;

    function setOwlMood(mood) {
        owl.dataset.mood = mood;
        owl.classList.remove('is-cheer', 'is-fail', 'is-flap', 'is-think');
        // force reflow so re-adding same class replays animation
        void owl.offsetWidth;
    }

    function owlPerform(cls, duration) {
        owl.classList.remove('is-cheer', 'is-fail', 'is-flap', 'is-think');
        void owl.offsetWidth;
        owl.classList.add(cls);
        clearTimeout(moodTimer);
        moodTimer = setTimeout(() => owl.classList.remove(cls), duration);
    }

    function say(text, tone, tplVars) {
        let out = text;
        if (tplVars) {
            Object.entries(tplVars).forEach(([k, v]) => {
                out = out.split(`{${k}}`).join(v);
            });
        }
        owlSpeechText.textContent = out;
        owlSpeech.classList.remove('is-good', 'is-bad');
        if (tone) owlSpeech.classList.add(tone);
        owlSpeech.style.transform = 'scale(0.97)';
        requestAnimationFrame(() => {
            owlSpeech.style.transform = 'scale(1)';
        });
    }

    function flashHalo() {
        owlHalo.classList.remove('is-flash');
        void owlHalo.offsetWidth;
        owlHalo.classList.add('is-flash');
    }

    // Blink loop
    function scheduleBlink() {
        const delay = rand(1800, 5200);
        setTimeout(() => {
            owlEyes.forEach((e) => e.classList.add('is-blinking'));
            setTimeout(() => {
                owlEyes.forEach((e) => e.classList.remove('is-blinking'));
                scheduleBlink();
            }, 150);
        }, delay);
    }

    // Pupils track the cursor
    document.addEventListener('pointermove', (ev) => {
        const rect = owl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clamp((ev.clientX - cx) / 140, -1, 1);
        const dy = clamp((ev.clientY - cy) / 140, -1, 1);
        owlPupils.forEach((p) => {
            p.style.transform = `translate(${dx * 7}px, ${dy * 5}px)`;
        });
        cursorGlow.style.left = `${ev.clientX}px`;
        cursorGlow.style.top = `${ev.clientY}px`;
    });

    // === Stats & Combo ===
    function comboTierOf(c) {
        let tier = COMBO_TIERS[0];
        COMBO_TIERS.forEach((t) => {
            if (c >= t.min) tier = t;
        });
        return tier;
    }

    function xpForAnswer(combo) {
        const base = 10 + state.level * 4;
        const multiplier = 1 + Math.min(combo, 15) * 0.15;
        return Math.round(base * multiplier);
    }

    function levelFromXp(xp) {
        return Math.floor(Math.sqrt(xp / 30)) + 1;
    }

    const RING_LEN = 2 * Math.PI * 52;

    function renderStats(popCombo) {
        statAnswered.textContent = state.answered;
        statAccuracy.textContent = state.answered ? `${Math.round((state.correct / state.answered) * 100)}%` : '—';
        statBest.textContent = state.bestCombo;
        statXp.textContent = state.xp;
        comboValue.textContent = `×${state.combo}`;

        if (popCombo) {
            comboValue.classList.remove('is-pop');
            void comboValue.offsetWidth;
            comboValue.classList.add('is-pop');
            setTimeout(() => comboValue.classList.remove('is-pop'), 320);
        }

        comboFill.style.width = `${clamp((state.combo / 16) * 100, 0, 100)}%`;

        const tier = comboTierOf(state.combo);
        const isStorm = state.combo >= 10;
        comboTier.textContent = tier.label;
        comboTier.classList.toggle('is-storm', isStorm);
        comboValue.classList.toggle('is-storm', isStorm);
        state.stormActive = isStorm;

        const lvl = levelFromXp(state.xp);
        const curLvlBase = 30 * Math.pow(lvl - 1, 2);
        const nextLvlBase = 30 * Math.pow(lvl, 2);
        const progress = clamp((state.xp - curLvlBase) / (nextLvlBase - curLvlBase), 0, 1);
        xpLevel.textContent = `Lv.${lvl}`;
        xpRingFill.style.strokeDashoffset = String(RING_LEN * (1 - progress));
    }

    // === Answer Judgement ===
    function submitAnswer() {
        if (state.locked) return;
        const raw = answerInput.value.trim().replace('−', '-');
        if (raw === '' || raw === '-') {
            answerInput.focus();
            feedbackLine.textContent = '输入一个数字再确认 · ENTER A NUMBER';
            feedbackLine.className = 'feedback-line';
            return;
        }

        const value = Number(raw);
        const q = state.question;
        state.locked = true;
        state.answered += 1;

        if (value === q.ans) {
            state.correct += 1;
            state.combo += 1;
            state.bestCombo = Math.max(state.bestCombo, state.combo);
            const gained = xpForAnswer(state.combo - 1);
            state.xp += gained;

            const isStorm = state.combo >= 10;
            const isTierUp = comboTierOf(state.combo) !== comboTierOf(state.combo - 1);

            owlPerform('is-cheer', 950);
            flashHalo();
            say(isStorm ? pick(SPEECH_STORM) : pick(SPEECH_GOOD), 'is-good');
            feedbackLine.textContent = `+${gained} XP${state.combo > 1 ? ` · COMBO ×${state.combo}` : ''}${isTierUp ? ' · TIER UP!' : ''}`;
            feedbackLine.className = 'feedback-line is-good';
            questionCard.classList.add('is-good');
            answerInput.classList.add('is-good');

            burstParticles(window.innerWidth / 2, window.innerHeight / 2, isStorm ? 90 : 42, 'good');
            if (isTierUp || isStorm) spawnFeathers();
            renderStats(true);
            setTimeout(nextQuestion, isStorm ? 800 : 680);
        } else {
            state.combo = 0;
            owlPerform('is-fail', 750);
            say(pick(SPEECH_BAD), 'is-bad', { ans: String(q.ans) });
            feedbackLine.textContent = `ANSWER = ${q.ans} · 答案已揭示`;
            feedbackLine.className = 'feedback-line is-bad';
            questionCard.classList.add('is-bad');
            answerInput.classList.add('is-bad');
            burstParticles(window.innerWidth / 2, window.innerHeight / 2, 18, 'bad');
            renderStats(false);
            setTimeout(nextQuestion, 1500);
        }
    }

    // === Keypad ===
    keypad.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.key');
        if (!btn) return;
        const key = btn.dataset.key;
        handleKey(key, btn);
    });

    function handleKey(key, btn) {
        if (btn) {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 140);
        }
        if (state.locked) return;
        if (key === 'ok') {
            submitAnswer();
            return;
        }
        if (key === 'back') {
            answerInput.value = answerInput.value.slice(0, -1);
        } else if (key === 'clear') {
            answerInput.value = '';
        } else if (key === '-') {
            if (!answerInput.value.includes('-') && answerInput.value === '') {
                answerInput.value = '-';
            }
        } else if (answerInput.value.length < 7) {
            answerInput.value += key;
        }
        answerInput.focus();
    }

    answerSubmit.addEventListener('click', submitAnswer);

    answerInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            submitAnswer();
        }
    });

    // Enter on page → focus input
    document.addEventListener('keydown', (ev) => {
        if (document.activeElement !== answerInput && ev.key === 'Enter') {
            answerInput.focus();
        }
    });

    // === Mode / Level / Palette ===
    modeGroup.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.mode-btn');
        if (!btn) return;
        modeGroup.querySelectorAll('.mode-btn').forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
        state.mode = btn.dataset.mode;
        owlPerform('is-flap', 600);
        nextQuestion();
    });

    levelGroup.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.level-btn');
        if (!btn) return;
        levelGroup.querySelectorAll('.level-btn').forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
        state.level = Number(btn.dataset.level);
        owlPerform('is-flap', 600);
        nextQuestion();
    });

    document.querySelectorAll('.palette-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.palette-btn').forEach((b) => {
                b.classList.remove('is-active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-checked', 'true');
            body.className = `palette-${btn.dataset.palette}`;
        });
    });

    resetBtn.addEventListener('click', () => {
        Object.assign(state, {
            questionCount: 0,
            answered: 0,
            correct: 0,
            combo: 0,
            bestCombo: 0,
            xp: 0
        });
        renderStats(false);
        owlPerform('is-flap', 600);
        say('档案已清空。夜空重新开始记录你的飞行。', '');
        nextQuestion();
    });

    // === Stars in owl scene ===
    function buildStars() {
        owlStars.innerHTML = '';
        for (let i = 0; i < 26; i++) {
            const s = document.createElement('span');
            s.className = 'star';
            s.style.left = `${Math.random() * 100}%`;
            s.style.top = `${Math.random() * 55}%`;
            s.style.setProperty('--star-dur', `${rand(2000, 5200)}ms`);
            s.style.setProperty('--star-delay', `${rand(0, 4000)}ms`);
            owlStars.appendChild(s);
        }
    }

    // === Particle System (ambient flow field + bursts + feathers) ===
    const ctx = particleCanvas.getContext('2d');
    let W = 0;
    let H = 0;
    let dpr = 1;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        particleCanvas.width = W * dpr;
        particleCanvas.height = H * dpr;
        particleCanvas.style.width = `${W}px`;
        particleCanvas.style.height = `${H}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ambient = Array.from({ length: 70 }, () => ({
        x: Math.random(),
        y: Math.random(),
        ox: Math.random() * 1000,
        oy: Math.random() * 1000,
        speed: 0.16 + Math.random() * 0.3,
        size: 0.6 + Math.random() * 1.6,
        alpha: 0.12 + Math.random() * 0.3
    }));

    const bursts = [];

    function accentColor(mix = 1) {
        const style = getComputedStyle(body);
        return style.getPropertyValue('--accent').trim() || '#8b5cf6';
    }

    function accent2Color() {
        return getComputedStyle(body).getPropertyValue('--accent-2').trim() || '#22d3ee';
    }

    function goodColor() {
        return getComputedStyle(body).getPropertyValue('--good').trim() || '#34d399';
    }

    function badColor() {
        return getComputedStyle(body).getPropertyValue('--bad').trim() || '#fb7185';
    }

    function burstParticles(x, y, count, kind) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const power = 2 + Math.random() * 7;
            bursts.push({
                type: 'spark',
                x,
                y,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power - 2,
                life: 1,
                decay: 0.012 + Math.random() * 0.02,
                size: 1.5 + Math.random() * 3.5,
                color: kind === 'good' ? (Math.random() > 0.5 ? goodColor() : accentColor()) : badColor()
            });
        }
    }

    function spawnFeathers() {
        const owlRect = owl.getBoundingClientRect();
        const cx = owlRect.left + owlRect.width / 2;
        const cy = owlRect.top + owlRect.height / 2;
        for (let i = 0; i < 16; i++) {
            bursts.push({
                type: 'feather',
                x: cx + gaussianNoise() * 40,
                y: cy + gaussianNoise() * 30,
                vx: gaussianNoise() * 1.6,
                vy: -1.5 - Math.random() * 2.4,
                rot: Math.random() * Math.PI * 2,
                vr: gaussianNoise() * 0.12,
                life: 1,
                decay: 0.006 + Math.random() * 0.006,
                size: 4 + Math.random() * 5,
                color: Math.random() > 0.5 ? accentColor() : accent2Color()
            });
        }
    }

    let time = 0;

    function tick() {
        time += 0.005;
        ctx.clearRect(0, 0, W, H);

        // ambient flow-field particles
        ctx.save();
        ambient.forEach((p) => {
            const n = noise(p.ox + time * 2, p.oy + time * 1.3);
            const px = (p.x * W + n * 60) % W;
            const py = (p.y * H + Math.sin(time * 3 + p.oy) * 30 + time * p.speed * 120) % H;
            ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 4 + p.ox));
            ctx.fillStyle = accent2Color();
            ctx.beginPath();
            ctx.arc((px + W) % W, (py + H) % H, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // bursts & feathers
        for (let i = bursts.length - 1; i >= 0; i--) {
            const b = bursts[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life -= b.decay;

            if (b.type === 'feather') {
                b.vy += 0.03;
                b.vx *= 0.985;
                b.rot += b.vr;
                b.x += Math.sin(time * 20 + b.size) * 0.4;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rot);
                ctx.globalAlpha = Math.max(b.life, 0);
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, b.size, b.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                b.vy += 0.08;
                b.vx *= 0.97;
                ctx.globalAlpha = Math.max(b.life, 0);
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.size, b.size);
            }

            if (b.life <= 0 || b.y > H + 30) bursts.splice(i, 1);
        }
        ctx.globalAlpha = 1;

        requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);

    // === Init ===
    function init() {
        resize();
        buildStars();
        scheduleBlink();
        renderStats(false);
        nextQuestion();
        requestAnimationFrame(tick);
    }

    init();
})();
