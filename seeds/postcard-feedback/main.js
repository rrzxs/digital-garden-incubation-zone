(function () {
    'use strict';

    // === Simplex Noise (compact inline implementation) ===
    var SimplexNoise = (function () {
        var F2 = 0.5 * (Math.sqrt(3) - 1);
        var G2 = (3 - Math.sqrt(3)) / 6;
        var grad3 = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

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

        function dot2(g, x, y) { return g[0] * x + g[1] * y; }

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
                if (x0 > y0) { i1 = 1; j1 = 0; }
                else { i1 = 0; j1 = 1; }
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
                var t0 = 0.5 - x0 * x0 - y0 * y0;
                if (t0 < 0) n0 = 0;
                else { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
                var t1 = 0.5 - x1 * x1 - y1 * y1;
                if (t1 < 0) n1 = 0;
                else { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
                var t2 = 0.5 - x2 * x2 - y2 * y2;
                if (t2 < 0) n2 = 0;
                else { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
                return 70 * (n0 + n1 + n2);
            };
        };
    })();

    // === DOM References ===
    var DOM = {
        main: document.getElementById('main-content'),
        cursorGlow: document.getElementById('cursor-glow'),
        transitionFlash: document.getElementById('transition-flash'),
        particleCanvas: document.getElementById('particle-canvas'),
        splashCanvas: document.getElementById('splash-canvas'),
        themeSwitcher: document.getElementById('theme-switcher'),
        themeBtns: document.querySelectorAll('.theme-btn'),
        glassCards: document.querySelectorAll('.glass-card'),
        scenes: document.querySelectorAll('.scene'),

        // Compose
        inputName: document.getElementById('input-name'),
        inputMessage: document.getElementById('input-message'),
        charNow: document.getElementById('char-now'),
        charMax: document.getElementById('char-max'),
        fieldHint: document.getElementById('field-hint'),
        moodPicker: document.getElementById('mood-picker'),
        moodChips: document.querySelectorAll('.mood-chip'),
        btnClear: document.getElementById('btn-clear'),
        btnSend: document.getElementById('btn-send'),

        // Postcard
        postcard: document.getElementById('postcard'),
        postcardLines: document.querySelectorAll('.handwriting-line'),
        postcardSign: document.getElementById('postcard-sign'),
        postmark: document.getElementById('postmark'),
        postmarkDate: document.getElementById('postmark-date'),
        flipBtn: document.getElementById('flip-btn'),
        previewReadout: document.getElementById('preview-readout'),
        backBarcode: document.getElementById('back-barcode'),

        // Emotion ring
        ringProgress: document.getElementById('ring-progress'),
        ringValue: document.getElementById('ring-value'),
        ringOrbit: document.getElementById('ring-orbit'),
        orbitNodes: document.querySelectorAll('.orbit-node'),

        // HUD / mailbox / final
        sentCount: document.getElementById('sent-count'),
        toneLabel: document.getElementById('tone-label'),
        mailboxGrid: document.getElementById('mailbox-grid'),
        mailboxEmpty: document.getElementById('mailbox-empty'),
        finalSent: document.getElementById('final-sent'),
        finalResonance: document.getElementById('final-resonance'),
        finalTone: document.getElementById('final-tone')
    };

    // === State ===
    var State = {
        mouseX: 0,
        mouseY: 0,
        smoothX: 0,
        smoothY: 0,
        time: 0,
        rafId: null,
        noise: SimplexNoise(314),
        particles: [],
        splashes: [],
        currentMood: null,
        resonance: 0,
        smoothResonance: 0,
        sentCount: 0,
        totalResonance: 0,
        dominantTone: '—',
        isFlipped: false,
        isSending: false,
        typingTimer: null,
        visibleScenes: {}
    };

    // === Config ===
    var Config = {
        lerpFactor: 0.08,
        observerThreshold: 0.25,
        observerRootMargin: '-10% 0px -10% 0px',
        particleMax: 70,
        particleLife: 140,
        particleSpeed: 0.45,
        ringCircumference: 603,
        maxResonance: 100
    };

    // === Mood keyword lexicon ===
    // Each mood maps to keyword sets (zh + en) used to score resonance.
    var MoodLexicon = {
        joy: {
            glyphs: ['◠'],
            label: '喜悦',
            keywords: ['开心', '快乐', '喜欢', '爱', '棒', '赞', '美', '好', '感谢', '谢谢', '期待', '惊喜', '温暖', '笑', 'happy', 'love', 'great', 'wonderful', 'thanks', 'joy', 'nice', 'beautiful', 'amazing', 'good']
        },
        calm: {
            glyphs: ['〜'],
            label: '平静',
            keywords: ['平静', '安静', '宁静', '舒服', '放松', '安心', '柔和', '疗愈', '治愈', '禅', '慢', '深呼吸', 'calm', 'peace', 'quiet', 'relax', 'soft', 'gentle', 'breathe', 'still', 'serene']
        },
        spark: {
            glyphs: ['✦'],
            label: '灵感',
            keywords: ['灵感', '想法', '创意', '发现', '启', '思考', '有趣', '奇妙', '探索', '想象', '可能', '新颖', 'idea', 'inspire', 'creative', 'spark', 'imagine', 'discover', 'explore', 'novel', 'think']
        },
        ache: {
            glyphs: ['◡'],
            label: '忧伤',
            keywords: ['难过', '伤心', '累', '疲惫', '焦虑', '孤独', '失落', '痛', '哭', '想念', '遗憾', '迷茫', '压力', 'sad', 'tired', 'lonely', 'lost', 'miss', 'pain', 'anxious', 'heavy', 'hurt', 'cry']
        }
    };

    // === Init ===
    function init() {
        sizeCanvases();
        setupIntersectionObserver();
        setupCursorGlow();
        setupThemeSwitcher();
        setupInputs();
        setupMoodPicker();
        setupActions();
        setupFlip();
        setupPostcardDrag();
        setupGlassCardTilt();
        setupBarcode();
        seedParticles();
        revealFirstScene();
        startLoop();

        window.addEventListener('resize', debounce(sizeCanvases, 200));
    }

    // === Canvas Sizing ===
    function sizeCanvases() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = window.innerWidth;
        var h = window.innerHeight;

        [DOM.particleCanvas, DOM.splashCanvas].forEach(function (canvas) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            var ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });

        DOM.charMax.textContent = DOM.inputMessage.getAttribute('maxlength') || '180';
    }

    // === Intersection Observer (scene reveal) ===
    function setupIntersectionObserver() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    revealCard(entry.target);
                }
            });
        }, {
            rootMargin: Config.observerRootMargin,
            threshold: Config.observerThreshold
        });

        DOM.glassCards.forEach(function (card) { observer.observe(card); });
    }

    function revealCard(card) {
        if (card.dataset.revealed) return;
        card.dataset.revealed = '1';
        card.classList.add('is-visible');

        var lines = card.querySelectorAll('.ink-line');
        lines.forEach(function (line) {
            var delay = parseInt(line.dataset.delay || 0, 10);
            line.style.transitionDelay = delay + 'ms';
        });
    }

    function revealFirstScene() {
        var firstCard = document.querySelector('.hero-card');
        if (firstCard) {
            setTimeout(function () { revealCard(firstCard); }, 200);
        }
    }

    // === Cursor Glow ===
    function setupCursorGlow() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
        document.addEventListener('mousemove', function (e) {
            State.mouseX = e.clientX;
            State.mouseY = e.clientY;
            DOM.cursorGlow.classList.add('visible');
        });
        document.addEventListener('mouseleave', function () {
            DOM.cursorGlow.classList.remove('visible');
        });
    }

    // === Theme Switcher ===
    function setupThemeSwitcher() {
        DOM.themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                DOM.themeBtns.forEach(function (b) {
                    b.classList.toggle('active', b.dataset.theme === theme);
                });
                triggerTransitionFlash();
            });
        });
    }

    function triggerTransitionFlash() {
        DOM.transitionFlash.classList.add('flash');
        setTimeout(function () { DOM.transitionFlash.classList.remove('flash'); }, 200);
    }

    // === Inputs (name + message) ===
    function setupInputs() {
        DOM.inputName.addEventListener('input', function () {
            updatePostcardSignature(this.value);
        });

        DOM.inputMessage.addEventListener('input', function () {
            var val = this.value;
            DOM.charNow.textContent = val.length;
            updatePostcardMessage(val);
            analyzeResonance(val);
        });

        DOM.inputName.addEventListener('focus', function () {
            this.parentElement.querySelector('.field-underline').style.width = '100%';
        });
        DOM.inputName.addEventListener('blur', function () {
            if (!this.value) this.parentElement.querySelector('.field-underline').style.width = '0%';
        });
    }

    function updatePostcardSignature(name) {
        DOM.postcardSign.textContent = name && name.trim() ? name.trim() : '—';
    }

    // Live handwriting line fill — wraps text across the 4 lines
    function updatePostcardMessage(text) {
        var lines = wrapText(text, 18);
        DOM.postcardLines.forEach(function (lineEl, i) {
            var content = lines[i] ? lines[i] : '';
            lineEl.textContent = content || '\u00a0';
            lineEl.classList.toggle('shown', !!content);
        });
    }

    function wrapText(text, maxChars) {
        var words = text.split(/(\s+)/);
        var out = [''];
        var idx = 0;
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (!w) continue;
            if ((out[idx] + w).length > maxChars) {
                idx++;
                out[idx] = w.trimStart();
            } else {
                out[idx] += w;
            }
        }
        return out.slice(0, 4);
    }

    // === Resonance analysis ===
    function analyzeResonance(text) {
        if (!text || !text.trim()) {
            State.resonance = 0;
            updateResonanceUI(0, null);
            if (DOM.fieldHint) {
                DOM.fieldHint.textContent = '输入文字以激活情绪环';
                DOM.fieldHint.classList.remove('active');
            }
            return;
        }

        var lower = text.toLowerCase();
        var scores = { joy: 0, calm: 0, spark: 0, ache: 0 };
        var totalHits = 0;

        Object.keys(MoodLexicon).forEach(function (mood) {
            var lex = MoodLexicon[mood];
            lex.keywords.forEach(function (kw) {
                var idx = lower.indexOf(kw.toLowerCase());
                while (idx !== -1) {
                    scores[mood]++;
                    totalHits++;
                    idx = lower.indexOf(kw.toLowerCase(), idx + kw.length);
                }
            });
        });

        // Base resonance from length + keyword density
        var lengthScore = Math.min(text.length / 60, 1) * 40;
        var keywordScore = Math.min(totalHits * 8, 60);
        State.resonance = Math.round(lengthScore + keywordScore);

        // Determine dominant mood
        var dominant = null;
        var maxScore = 0;
        Object.keys(scores).forEach(function (m) {
            if (scores[m] > maxScore) {
                maxScore = scores[m];
                dominant = m;
            }
        });

        if (DOM.fieldHint) {
            if (totalHits > 0) {
                DOM.fieldHint.textContent = '检测到 ' + totalHits + ' 个情绪关键词';
                DOM.fieldHint.classList.add('active');
            } else {
                DOM.fieldHint.textContent = '继续书写以触发共鸣';
                DOM.fieldHint.classList.remove('active');
            }
        }

        updateResonanceUI(State.resonance, dominant);
    }

    function updateResonanceUI(value, dominant) {
        // Smooth resonance in the main loop, but update ring target now
        State._targetResonance = value;

        // Light orbit nodes
        DOM.orbitNodes.forEach(function (node) {
            node.classList.toggle('lit', dominant === node.dataset.node);
        });

        if (dominant) {
            State.dominantTone = MoodLexicon[dominant].label;
        } else if (value === 0) {
            State.dominantTone = '—';
        }
        if (DOM.toneLabel) DOM.toneLabel.textContent = State.dominantTone;
    }

    // === Mood Picker ===
    function setupMoodPicker() {
        DOM.moodChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var mood = chip.dataset.mood;
                if (State.currentMood === mood) {
                    // toggle off
                    State.currentMood = null;
                    chip.classList.remove('active');
                    updateResonanceUI(State.resonance, null);
                } else {
                    State.currentMood = mood;
                    DOM.moodChips.forEach(function (c) { c.classList.toggle('active', c === chip); });
                    updateResonanceUI(Math.max(State.resonance, 35), mood);
                    emitBurst(chip, 8);
                }
            });
        });
    }

    // === Actions (clear / send) ===
    function setupActions() {
        DOM.btnClear.addEventListener('click', function () {
            DOM.inputName.value = '';
            DOM.inputMessage.value = '';
            DOM.charNow.textContent = '0';
            State.currentMood = null;
            DOM.moodChips.forEach(function (c) { c.classList.remove('active'); });
            updatePostcardSignature('');
            updatePostcardMessage('');
            analyzeResonance('');
            emitBurst(this, 6);
        });

        DOM.btnSend.addEventListener('click', sendPostcard);
    }

    function sendPostcard() {
        if (State.isSending) return;
        var msg = DOM.inputMessage.value.trim();
        if (!msg) {
            // gentle nudge: pulse the field
            DOM.inputMessage.focus();
            DOM.inputMessage.parentElement.querySelector('.field-underline').style.width = '100%';
            setTimeout(function () {
                if (!DOM.inputMessage.value) {
                    DOM.inputMessage.parentElement.querySelector('.field-underline').style.width = '0%';
                }
            }, 1200);
            return;
        }

        State.isSending = true;

        // 1. Stamp press
        var now = new Date();
        var dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
        DOM.postmarkDate.textContent = dateStr;
        DOM.postmark.classList.add('stamped');

        // ink burst from postcard center
        emitSplash();

        // 2. After stamp, fly away
        setTimeout(function () {
            DOM.postcard.classList.add('flying');
        }, 480);

        // 3. Save to mailbox + reset
        setTimeout(function () {
            var entry = {
                name: DOM.inputName.value.trim() || '匿名',
                message: msg,
                mood: State.currentMood,
                resonance: State.resonance,
                tone: State.dominantTone,
                date: dateStr
            };
            addToMailbox(entry);

            State.sentCount++;
            State.totalResonance += State.resonance;
            updateFinalStats();
            regenerateBarcode();

            // reset form
            DOM.inputName.value = '';
            DOM.inputMessage.value = '';
            DOM.charNow.textContent = '0';
            State.currentMood = null;
            DOM.moodChips.forEach(function (c) { c.classList.remove('active'); });
            updatePostcardSignature('');
            updatePostcardMessage('');
            analyzeResonance('');

            // reset postcard
            DOM.postcard.classList.remove('flying');
            DOM.postmark.classList.remove('stamped');
            // force reflow to restart stamp animation cleanly next time
            void DOM.postmark.offsetWidth;

            State.isSending = false;
        }, 1900);
    }

    function addToMailbox(entry) {
        if (DOM.mailboxEmpty) DOM.mailboxEmpty.style.display = 'none';

        var card = document.createElement('div');
        card.className = 'mail-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        var moodGlyph = entry.mood ? MoodLexicon[entry.mood].glyphs[0] : '•';

        card.innerHTML =
            '<div class="mail-card-stamp">' + entry.date + '</div>' +
            '<div class="mail-card-body">' + escapeHtml(entry.message) + '</div>' +
            '<div class="mail-card-foot">' +
                '<div class="mail-card-from">FROM · ' + escapeHtml(entry.name) + '</div>' +
                '<div class="mail-card-mood">' + moodGlyph + '</div>' +
            '</div>';

        card.addEventListener('click', function () { flipMailCard(card); });
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipMailCard(card); }
        });

        DOM.mailboxGrid.insertBefore(card, DOM.mailboxGrid.firstChild);

        // animate in
        requestAnimationFrame(function () {
            setTimeout(function () { card.classList.add('entered'); }, 30);
        });
    }

    function flipMailCard(card) {
        card.style.transform = 'rotateY(180deg) scale(1.05)';
        setTimeout(function () {
            card.style.transform = '';
            emitBurst(card, 5);
        }, 500);
    }

    function updateFinalStats() {
        if (DOM.sentCount) DOM.sentCount.textContent = String(State.sentCount).padStart(2, '0');
        if (DOM.finalSent) DOM.finalSent.textContent = State.sentCount;
        if (DOM.finalResonance) DOM.finalResonance.textContent = State.totalResonance;
        if (DOM.finalTone) DOM.finalTone.textContent = State.dominantTone;
    }

    function regenerateBarcode() {
        if (!DOM.backBarcode) return;
        var chars = ['|', ' ', '|', '||', ' ', '|', '|||', ' ', '|'];
        var out = '';
        for (var i = 0; i < 18; i++) {
            out += chars[Math.floor(Math.random() * chars.length)];
        }
        DOM.backBarcode.textContent = out;
    }

    function setupBarcode() { regenerateBarcode(); }

    // === Flip ===
    function setupFlip() {
        DOM.flipBtn.addEventListener('click', toggleFlip);
        // also allow clicking the postcard to flip (unless sending)
        DOM.postcard.addEventListener('click', function (e) {
            if (State.isSending) return;
            // avoid double trigger from flip button
            if (e.target.closest('.flip-btn')) return;
            toggleFlip();
        });
    }

    function toggleFlip() {
        State.isFlipped = !State.isFlipped;
        DOM.postcard.classList.toggle('flipped', State.isFlipped);
        if (DOM.previewReadout) {
            DOM.previewReadout.textContent = State.isFlipped ? 'PREVIEW · BACK' : 'PREVIEW · FRONT';
        }
        triggerTransitionFlash();
    }

    // === Postcard Drag (magnetic pull) ===
    function setupPostcardDrag() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
        var stage = DOM.postcard.parentElement;

        stage.addEventListener('mousemove', function (e) {
            if (State.isSending) return;
            var rect = DOM.postcard.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = e.clientX - cx;
            var dy = e.clientY - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var influence = Math.max(0, 1 - dist / 320);

            var rotY = (dx / rect.width) * 12 * influence;
            var rotX = -(dy / rect.height) * 12 * influence;
            var tx = dx * 0.04 * influence;
            var ty = dy * 0.04 * influence;

            DOM.postcard.style.transform =
                'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px) ' +
                'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
        });

        stage.addEventListener('mouseleave', function () {
            DOM.postcard.style.transform = '';
        });
    }

    // === Glass Card Tilt ===
    function setupGlassCardTilt() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        DOM.glassCards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var relX = ((e.clientX - rect.left) / rect.width) * 100;
                var relY = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--glow-x', relX + '%');
                card.style.setProperty('--glow-y', relY + '%');

                var rotY = (relX / 100 - 0.5) * 2.5;
                var rotX = (0.5 - relY / 100) * 2.5;
                card.style.transform = 'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
            });

            card.addEventListener('mouseleave', function () {
                card.style.transform = '';
            });
        });
    }

    // === Particles (ambient flow field) ===
    function seedParticles() {
        for (var i = 0; i < 40; i++) {
            spawnAmbientParticle();
        }
    }

    function spawnAmbientParticle() {
        if (State.particles.length >= Config.particleMax) return;
        State.particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * Config.particleSpeed,
            vy: (Math.random() - 0.5) * Config.particleSpeed,
            life: Math.random() * Config.particleLife,
            maxLife: Config.particleLife,
            size: Math.random() * 1.5 + 0.5,
            ambient: true
        });
    }

    function emitBurst(fromEl, count) {
        var rect = fromEl.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        for (var i = 0; i < count; i++) {
            if (State.particles.length >= Config.particleMax + 30) break;
            var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            var speed = Math.random() * 3 + 1.5;
            State.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60,
                maxLife: 60,
                size: Math.random() * 2 + 1,
                ambient: false
            });
        }
    }

    function updateParticles() {
        var next = [];
        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.ambient) {
                var nx = p.x * 0.002 + State.time * 0.00015;
                var ny = p.y * 0.002 + State.time * 0.00015;
                var n = State.noise(nx, ny);
                p.vx += n * 0.02;
                p.vy += n * 0.02;
                p.vx *= 0.98;
                p.vy *= 0.98;

                if (p.x < -20) p.x = window.innerWidth + 20;
                if (p.x > window.innerWidth + 20) p.x = -20;
                if (p.y < -20) p.y = window.innerHeight + 20;
                if (p.y > window.innerHeight + 20) p.y = -20;

                if (p.life <= 0) p.life = p.maxLife;
                next.push(p);
            } else {
                p.vx *= 0.94;
                p.vy *= 0.94;
                if (p.life > 0) next.push(p);
            }
        }
        State.particles = next;
    }

    function drawParticles(ctx) {
        var style = getComputedStyle(document.documentElement);
        var accentColor = style.getPropertyValue('--particle-color').trim();

        for (var i = 0; i < State.particles.length; i++) {
            var p = State.particles[i];
            var alpha;
            if (p.ambient) {
                alpha = (p.life / p.maxLife) * 0.3;
            } else {
                alpha = (p.life / p.maxLife) * 0.85;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = accentColor.replace(/[\d.]+\)$/, alpha.toFixed(3) + ')');
            ctx.fill();
        }
    }

    // === Ink Splash (send animation) ===
    function emitSplash() {
        var rect = DOM.postcard.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;

        var style = getComputedStyle(document.documentElement);
        var accent = style.getPropertyValue('--color-accent').trim();
        var accentAlt = style.getPropertyValue('--color-accent-alt').trim();

        for (var i = 0; i < 30; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 6 + 2;
            State.splashes.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80,
                maxLife: 80,
                size: Math.random() * 4 + 1.5,
                color: Math.random() > 0.5 ? accent : accentAlt,
                gravity: 0.06
            });
        }
    }

    function updateSplashes() {
        var next = [];
        for (var i = 0; i < State.splashes.length; i++) {
            var s = State.splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += s.gravity;
            s.vx *= 0.96;
            s.life--;
            if (s.life > 0) next.push(s);
        }
        State.splashes = next;
    }

    function drawSplashes(ctx) {
        for (var i = 0; i < State.splashes.length; i++) {
            var s = State.splashes[i];
            var alpha = s.life / s.maxLife;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // === Resonance ring smoothing ===
    function updateRingUI() {
        var target = State._targetResonance || 0;
        State.smoothResonance += (target - State.smoothResonance) * 0.1;

        var display = Math.round(State.smoothResonance);
        if (DOM.ringValue) DOM.ringValue.textContent = display;

        if (DOM.ringProgress) {
            var pct = Math.min(State.smoothResonance / Config.maxResonance, 1);
            var offset = Config.ringCircumference * (1 - pct);
            DOM.ringProgress.style.strokeDashoffset = offset.toFixed(1);
        }
    }

    // === Main Loop ===
    function startLoop() {
        function tick(time) {
            State.time = time;

            State.smoothX += (State.mouseX - State.smoothX) * Config.lerpFactor;
            State.smoothY += (State.mouseY - State.smoothY) * Config.lerpFactor;

            DOM.cursorGlow.style.left = State.smoothX + 'px';
            DOM.cursorGlow.style.top = State.smoothY + 'px';

            updateParticles();
            updateSplashes();
            updateRingUI();

            var pctx = DOM.particleCanvas.getContext('2d');
            pctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            drawParticles(pctx);

            var sctx = DOM.splashCanvas.getContext('2d');
            sctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            drawSplashes(sctx);

            State.rafId = requestAnimationFrame(tick);
        }
        State.rafId = requestAnimationFrame(tick);
    }

    // === Utility ===
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === Boot ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
