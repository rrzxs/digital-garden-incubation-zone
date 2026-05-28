(function () {
    'use strict';

    const KBD_ROWS = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];

    const WORD_BANKS = [
        ['GLOW', 'WAVE', 'DAWN', 'FLUX', 'ECHO', 'VOID', 'PULSE', 'DRIFT'],
        ['SPARK', 'NEXUS', 'FLAME', 'PRISM', 'ORBIT', 'AURA', 'SIGMA', 'CRYST'],
        ['NEBULA', 'ZENITH', 'VORTEX', 'QUARTZ', 'PRISM', 'HELIX', 'AURORA', 'CIPHER'],
        ['CASCADE', 'MERIDIAN', 'SPECTRUM', 'CRYSTAL', 'NEBULA', 'HORIZON', 'STELLAR'],
        ['LUMINANCE', 'FREQUENCY', 'RESONANCE', 'CHROMATIC', 'DISCOVERY', 'RESONANCE']
    ];

    const FLOATING_CHARS_COUNT = 12;
    const COMBO_WINDOW = 1800;
    const LETTERS_PER_ROUND = 5;
    const TOTAL_ROUNDS = 5;

    const $ = (id) => document.getElementById(id);

    const DOM = {
        cursorGlow: $('cursor-glow'),
        statScore: $('stat-score'),
        statCombo: $('stat-combo'),
        statRound: $('stat-round'),
        modeBtn: $('mode-btn'),
        modeIcon: $('mode-icon'),
        arenaCanvas: $('arena-canvas'),
        arenaPanel: $('arena-panel'),
        targetWord: $('target-word'),
        targetContainer: $('target-container'),
        comboFlash: $('combo-flash'),
        keyboardPanel: $('keyboard-panel'),
        progressBar: $('progress-bar'),
        progressText: $('progress-text'),
        timeText: $('time-text'),
        toastContainer: $('toast-container'),
        startOverlay: $('start-overlay'),
        startBtn: $('start-btn'),
        roundOverlay: $('round-overlay'),
        roundIcon: $('round-icon'),
        roundTitle: $('round-title'),
        roundSubtitle: $('round-subtitle'),
        roundStats: $('round-stats'),
        nextRoundBtn: $('next-round-btn'),
        gameoverOverlay: $('gameover-overlay'),
        gameoverTitle: $('gameover-title'),
        gameoverStats: $('gameover-stats'),
        restartBtn: $('restart-btn')
    };

    let canvas, ctx;
    let canvasW = 0, canvasH = 0;
    let dpr = 1;
    let floatingLetters = [];
    let particles = [];
    let ripples = [];
    let trailParticles = [];
    let bgParticles = [];

    let gameState = 'idle';
    let currentWord = '';
    let charIndex = 0;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let round = 0;
    let wordsCompleted = 0;
    let lettersHit = 0;
    let lettersMissed = 0;
    let lastHitTime = 0;
    let gameStartTime = 0;
    let elapsedTime = 0;
    let timerRAF = null;
    let paused = false;
    let keyElements = {};

    function init() {
        setupCanvas();
        buildKeyboard();
        buildBgParticles();
        setupCursorGlow();
        bindEvents();
        showStartOverlay();
        requestAnimationFrame(renderLoop);
    }

    function setupCanvas() {
        canvas = DOM.arenaCanvas;
        ctx = canvas.getContext('2d');
        dpr = window.devicePixelRatio || 1;
        resizeCanvas();
    }

    function resizeCanvas() {
        const rect = DOM.arenaPanel.getBoundingClientRect();
        canvasW = rect.width;
        canvasH = rect.height;
        canvas.width = canvasW * dpr;
        canvas.height = canvasH * dpr;
        canvas.style.width = canvasW + 'px';
        canvas.style.height = canvasH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildKeyboard() {
        const rows = DOM.keyboardPanel.querySelectorAll('.kb-row');
        KBD_ROWS.forEach((row, ri) => {
            const container = rows[ri];
            row.forEach((key) => {
                const el = document.createElement('div');
                el.className = 'kb-key';
                el.textContent = key;
                el.dataset.key = key;
                container.appendChild(el);
                keyElements[key] = el;
            });
        });
    }

    function buildBgParticles() {
        bgParticles = [];
        for (let i = 0; i < 40; i++) {
            bgParticles.push({
                x: Math.random() * 2000,
                y: Math.random() * 1200,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.3 + 0.05,
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    function setupCursorGlow() {
        document.addEventListener('mousemove', (e) => {
            DOM.cursorGlow.style.left = e.clientX + 'px';
            DOM.cursorGlow.style.top = e.clientY + 'px';
            if (!DOM.cursorGlow.classList.contains('active')) {
                DOM.cursorGlow.classList.add('active');
            }
        });

        document.addEventListener('mouseleave', () => {
            DOM.cursorGlow.classList.remove('active');
        });
    }

    function bindEvents() {
        DOM.startBtn.addEventListener('click', startGame);
        DOM.nextRoundBtn.addEventListener('click', nextRound);
        DOM.restartBtn.addEventListener('click', restartGame);
        DOM.modeBtn.addEventListener('click', togglePause);

        window.addEventListener('resize', () => {
            resizeCanvas();
            if (gameState === 'playing') spawnFloatingLetters();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (gameState === 'playing' || gameState === 'paused') togglePause();
                return;
            }

            if (gameState !== 'playing') return;

            const key = e.key.toUpperCase();
            if (key.length === 1 && key >= 'A' && key <= 'Z') {
                handleKeyInput(key);
            }
        });

        DOM.keyboardPanel.addEventListener('click', (e) => {
            const keyEl = e.target.closest('.kb-key');
            if (!keyEl || gameState !== 'playing') return;
            handleKeyInput(keyEl.dataset.key);
        });
    }

    function showStartOverlay() {
        DOM.startOverlay.classList.add('show');
        gameState = 'idle';
    }

    function startGame() {
        DOM.startOverlay.classList.remove('show');
        score = 0;
        combo = 0;
        maxCombo = 0;
        round = 0;
        wordsCompleted = 0;
        lettersHit = 0;
        lettersMissed = 0;
        elapsedTime = 0;
        updateStats();
        startRound();
    }

    function startRound() {
        round++;
        if (round > TOTAL_ROUNDS) {
            endGame();
            return;
        }

        DOM.statRound.textContent = round;
        gameState = 'playing';
        paused = false;
        pickWord();
        spawnFloatingLetters();
        updateTargetDisplay();
        updateKeyHighlights();
        updateProgressBar();
        startTimer();
    }

    function pickWord() {
        const bankIndex = Math.min(round - 1, WORD_BANKS.length - 1);
        const bank = WORD_BANKS[bankIndex];
        currentWord = bank[Math.floor(Math.random() * bank.length)];
        charIndex = 0;
    }

    function spawnFloatingLetters() {
        floatingLetters = [];
        const needed = new Set(currentWord.split(''));
        const extra = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !needed.has(c));

        const count = FLOATING_CHARS_COUNT + round * 2;
        for (let i = 0; i < count; i++) {
            const isNeeded = i < needed.size + 3 && needed.size > 0
                ? true
                : Math.random() < 0.4;
            const pool = isNeeded ? [...needed] : extra;
            const char = pool[Math.floor(Math.random() * pool.length)];

            const margin = 50;
            floatingLetters.push({
                char: char,
                x: margin + Math.random() * (canvasW - margin * 2),
                y: margin + Math.random() * (canvasH - margin * 2),
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                size: 22 + Math.random() * 14,
                angle: Math.random() * Math.PI * 2,
                angleSpeed: (Math.random() - 0.5) * 0.02,
                opacity: 0,
                targetOpacity: 0.6 + Math.random() * 0.35,
                bobPhase: Math.random() * Math.PI * 2,
                bobSpeed: 0.005 + Math.random() * 0.01,
                scale: 0.3,
                targetScale: 1,
                hue: Math.random() * 60 + 150,
                alive: true
            });
        }
    }

    function handleKeyInput(key) {
        const expected = currentWord[charIndex];

        if (key === expected) {
            onCorrectHit(key);
        } else {
            onMissHit(key);
        }
    }

    function onCorrectHit(key) {
        const now = performance.now();
        lettersHit++;

        if (now - lastHitTime < COMBO_WINDOW) {
            combo++;
        } else {
            combo = 1;
        }
        lastHitTime = now;
        if (combo > maxCombo) maxCombo = combo;

        const points = 10 + combo * 5;
        score += points;

        animateKeyEl(key, 'hit');
        animateStatEl(DOM.statScore);
        if (combo > 1) {
            animateStatEl(DOM.statCombo);
            showComboFlash(combo);
        }

        spawnHitParticles(expectedLetterPos(key));
        spawnRipple(expectedLetterPos(key));
        collectFloatingLetter(key);

        charIndex++;
        updateTargetDisplay();
        updateKeyHighlights();
        updateStats();
        updateProgressBar();

        if (charIndex >= currentWord.length) {
            onWordComplete();
        }
    }

    function onMissHit(key) {
        lettersMissed++;
        combo = 0;
        animateKeyEl(key, 'miss');
        updateStats();
    }

    function expectedLetterPos(key) {
        const el = keyElements[key];
        if (!el) return { x: canvasW / 2, y: canvasH / 2 };
        const rect = el.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - canvasRect.left,
            y: rect.top + rect.height / 2 - canvasRect.top
        };
    }

    function collectFloatingLetter(key) {
        for (let i = 0; i < floatingLetters.length; i++) {
            const fl = floatingLetters[i];
            if (fl.alive && fl.char === key) {
                fl.targetScale = 2;
                fl.targetOpacity = 0;
                fl.alive = false;

                for (let j = 0; j < 8; j++) {
                    const angle = (Math.PI * 2 / 8) * j;
                    particles.push({
                        x: fl.x,
                        y: fl.y,
                        vx: Math.cos(angle) * (2 + Math.random() * 3),
                        vy: Math.sin(angle) * (2 + Math.random() * 3),
                        size: 2 + Math.random() * 3,
                        life: 1,
                        decay: 0.02 + Math.random() * 0.02,
                        hue: 160,
                        type: 'burst'
                    });
                }
                break;
            }
        }
    }

    function onWordComplete() {
        wordsCompleted++;
        const bonus = currentWord.length * 15;
        score += bonus;
        showToast(`+${bonus} 单词完成!`);

        if (wordsCompleted >= LETTERS_PER_ROUND) {
            gameState = 'roundComplete';
            stopTimer();
            showRoundOverlay();
        } else {
            pickWord();
            spawnFloatingLetters();
            updateTargetDisplay();
            updateKeyHighlights();
        }

        updateStats();
    }

    function showRoundOverlay() {
        const titles = ['精彩!', '太棒了!', '完美!', '无与伦比!'];
        const icons = ['⚡', '🔥', '💎', '🌟', '✨'];
        DOM.roundIcon.textContent = icons[round - 1] || '✨';
        DOM.roundTitle.textContent = titles[Math.min(round - 1, titles.length - 1)];
        DOM.roundSubtitle.textContent = round >= TOTAL_ROUNDS ? '最终关完成!' : `准备进入第 ${round + 1} 关`;
        DOM.roundStats.innerHTML = `
            <div class="round-stat-item">
                <span class="round-stat-val">${score}</span>
                <span class="round-stat-label">总分</span>
            </div>
            <div class="round-stat-item">
                <span class="round-stat-val">${maxCombo}x</span>
                <span class="round-stat-label">最大连击</span>
            </div>
            <div class="round-stat-item">
                <span class="round-stat-val">${lettersHit}</span>
                <span class="round-stat-label">命中</span>
            </div>
        `;
        DOM.nextRoundBtn.textContent = round >= TOTAL_ROUNDS ? '查看结果' : '继续';
        DOM.roundOverlay.classList.add('show');
    }

    function nextRound() {
        DOM.roundOverlay.classList.remove('show');
        if (round >= TOTAL_ROUNDS) {
            endGame();
        } else {
            wordsCompleted = 0;
            startRound();
        }
    }

    function endGame() {
        gameState = 'gameover';
        stopTimer();

        const accuracy = lettersHit + lettersMissed > 0
            ? Math.round((lettersHit / (lettersHit + lettersMissed)) * 100) : 0;
        const wpm = elapsedTime > 0
            ? Math.round((lettersHit / 5) / (elapsedTime / 60000)) : 0;

        DOM.gameoverTitle.textContent = '游戏结束';
        DOM.gameoverStats.innerHTML = `
            <div class="gameover-stat-item">
                <span class="gameover-stat-val">${score}</span>
                <span class="gameover-stat-label">总分</span>
            </div>
            <div class="gameover-stat-item">
                <span class="gameover-stat-val">${accuracy}%</span>
                <span class="gameover-stat-label">准确率</span>
            </div>
            <div class="gameover-stat-item">
                <span class="gameover-stat-val">${maxCombo}x</span>
                <span class="gameover-stat-label">最大连击</span>
            </div>
            <div class="gameover-stat-item">
                <span class="gameover-stat-val">${wpm}</span>
                <span class="gameover-stat-label">WPM</span>
            </div>
        `;
        DOM.gameoverOverlay.classList.add('show');
    }

    function restartGame() {
        DOM.gameoverOverlay.classList.remove('show');
        startGame();
    }

    function togglePause() {
        if (gameState === 'playing') {
            paused = !paused;
            DOM.modeIcon.textContent = paused ? '▶' : '⌨';
            if (paused) {
                showToast('已暂停 - 按空格继续');
            } else {
                showToast('继续游戏');
            }
        }
    }

    function startTimer() {
        gameStartTime = performance.now() - elapsedTime;
    }

    function stopTimer() {
        if (timerRAF) cancelAnimationFrame(timerRAF);
    }

    function updateTimer() {
        if (gameState === 'playing' && !paused) {
            elapsedTime = performance.now() - gameStartTime;
        }
        const totalSec = Math.floor(elapsedTime / 1000);
        const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const sec = String(totalSec % 60).padStart(2, '0');
        DOM.timeText.textContent = `⏱ ${min}:${sec}`;
    }

    function updateStats() {
        DOM.statScore.textContent = score;
        DOM.statCombo.textContent = combo > 0 ? combo + 'x' : '0';
    }

    function animateStatEl(el) {
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
    }

    function animateKeyEl(key, cls) {
        const el = keyElements[key];
        if (!el) return;
        el.classList.remove('hit', 'miss');
        void el.offsetWidth;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 400);
    }

    function showComboFlash(c) {
        DOM.comboFlash.textContent = c + 'x COMBO';
        DOM.comboFlash.classList.remove('show');
        void DOM.comboFlash.offsetWidth;
        DOM.comboFlash.classList.add('show');
    }

    function updateTargetDisplay() {
        let html = '';
        for (let i = 0; i < currentWord.length; i++) {
            let cls = 'target-char';
            if (i < charIndex) cls += ' collected';
            else if (i === charIndex) cls += ' current';
            html += `<span class="${cls}">${currentWord[i]}</span>`;
        }
        DOM.targetWord.innerHTML = html;
    }

    function updateKeyHighlights() {
        Object.values(keyElements).forEach(el => el.classList.remove('target'));
        if (charIndex < currentWord.length) {
            const next = currentWord[charIndex];
            const el = keyElements[next];
            if (el) el.classList.add('target');
        }
    }

    function updateProgressBar() {
        const pct = (wordsCompleted / LETTERS_PER_ROUND) * 100;
        DOM.progressBar.innerHTML = `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`;
        DOM.progressText.textContent = `进度 ${wordsCompleted} / ${LETTERS_PER_ROUND}`;
    }

    function showToast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        DOM.toastContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 300);
        }, 1800);
    }

    function spawnHitParticles(pos) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1.5 + Math.random() * 3,
                life: 1,
                decay: 0.015 + Math.random() * 0.015,
                hue: 160 + Math.random() * 30,
                type: 'burst'
            });
        }
    }

    function spawnRipple(pos) {
        ripples.push({
            x: pos.x,
            y: pos.y,
            radius: 5,
            maxRadius: 80 + Math.random() * 40,
            opacity: 0.6,
            speed: 2.5
        });
    }

    function renderLoop() {
        if (!paused && (gameState === 'playing' || gameState === 'roundComplete')) {
            update();
        }
        draw();
        updateTimer();
        requestAnimationFrame(renderLoop);
    }

    function update() {
        const speed = 0.8 + round * 0.15;

        for (let i = floatingLetters.length - 1; i >= 0; i--) {
            const fl = floatingLetters[i];
            if (!fl.alive && fl.opacity < 0.01) {
                floatingLetters.splice(i, 1);
                continue;
            }

            fl.x += fl.vx * speed;
            fl.y += fl.vy * speed;
            fl.angle += fl.angleSpeed;
            fl.bobPhase += fl.bobSpeed;
            fl.y += Math.sin(fl.bobPhase) * 0.3;

            fl.opacity += (fl.targetOpacity - fl.opacity) * 0.06;
            fl.scale += (fl.targetScale - fl.scale) * 0.1;

            const margin = 20;
            if (fl.x < margin) { fl.x = margin; fl.vx = Math.abs(fl.vx); }
            if (fl.x > canvasW - margin) { fl.x = canvasW - margin; fl.vx = -Math.abs(fl.vx); }
            if (fl.y < margin) { fl.y = margin; fl.vy = Math.abs(fl.vy); }
            if (fl.y > canvasH - margin) { fl.y = canvasH - margin; fl.vy = -Math.abs(fl.vy); }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.radius += r.speed;
            r.opacity -= 0.012;
            if (r.opacity <= 0 || r.radius > r.maxRadius) ripples.splice(i, 1);
        }

        for (let i = trailParticles.length - 1; i >= 0; i--) {
            const t = trailParticles[i];
            t.life -= 0.02;
            if (t.life <= 0) trailParticles.splice(i, 1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvasW, canvasH);

        drawBgParticles();

        drawRipples();
        drawFloatingLetters();
        drawParticles();
        drawTrailParticles();
        drawConnections();
    }

    function drawBgParticles() {
        for (const p of bgParticles) {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.angle += 0.002;
            if (p.x < -20) p.x = canvasW + 20;
            if (p.x > canvasW + 20) p.x = -20;
            if (p.y < -20) p.y = canvasH + 20;
            if (p.y > canvasH + 20) p.y = -20;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 160, ${p.opacity})`;
            ctx.fill();
        }
    }

    function drawRipples() {
        for (const r of ripples) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 229, 160, ${r.opacity})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function drawFloatingLetters() {
        for (const fl of floatingLetters) {
            if (fl.opacity < 0.01) continue;

            ctx.save();
            ctx.translate(fl.x, fl.y);
            ctx.rotate(fl.angle);
            ctx.scale(fl.scale, fl.scale);

            const isTarget = charIndex < currentWord.length && fl.char === currentWord[charIndex] && fl.alive;
            const alpha = Math.min(fl.opacity, 1);

            ctx.beginPath();
            ctx.arc(0, 0, fl.size * 0.7, 0, Math.PI * 2);
            if (isTarget) {
                ctx.fillStyle = `rgba(0, 229, 160, ${alpha * 0.1})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(0, 229, 160, ${alpha * 0.3})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.03})`;
                ctx.fill();
            }

            ctx.font = `${fl.size}px 'Outfit', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isTarget) {
                ctx.fillStyle = `rgba(0, 229, 160, ${alpha})`;
                ctx.shadowColor = 'rgba(0, 229, 160, 0.5)';
                ctx.shadowBlur = 12;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
            }

            ctx.fillText(fl.char, 0, 0);
            ctx.restore();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            const hue = p.hue || 160;
            ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${p.life * 0.8})`;
            ctx.fill();
        }
    }

    function drawTrailParticles() {
        for (const t of trailParticles) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 160, ${t.life * 0.3})`;
            ctx.fill();
        }
    }

    function drawConnections() {
        const alive = floatingLetters.filter(fl => fl.alive && fl.opacity > 0.1);
        const maxDist = 120;

        for (let i = 0; i < alive.length; i++) {
            for (let j = i + 1; j < alive.length; j++) {
                const dx = alive[i].x - alive[j].x;
                const dy = alive[i].y - alive[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.06;
                    ctx.beginPath();
                    ctx.moveTo(alive[i].x, alive[i].y);
                    ctx.lineTo(alive[j].x, alive[j].y);
                    ctx.strokeStyle = `rgba(0, 229, 160, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    init();
})();
