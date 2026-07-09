(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

    /* === Theme Accents (shift with progress) === */
    var ACCENT_PALETTE = [
        { a: '#f0976a', b: '#7aa8f0' }, // 0 - warm
        { a: '#f0b46a', b: '#a8f0c8' }, // 1
        { a: '#f0d07a', b: '#f0a07a' }, // 2
        { a: '#c8a8f0', b: '#7af0e8' }, // 3
        { a: '#7af0c8', b: '#f0976a' }, // 4
        { a: '#7aa8f0', b: '#f0b4d0' }  // 5
    ];

    /* === Quiz Questions === */
    var QUESTIONS = [
        {
            id: 'recipient',
            meta: '关于 TA',
            title: '这份礼物，送给谁？',
            options: [
                { emoji: '💗', label: '恋人 / 伴侣', hint: '心动的人',     tags: ['恋人'] },
                { emoji: '🤝', label: '挚友',         hint: '一起疯的伙伴', tags: ['朋友'] },
                { emoji: '👨‍👩‍👧', label: '家人',         hint: '血脉相连',     tags: ['家人'] },
                { emoji: '🧑‍💼', label: '同事 / 客户',  hint: '保持分寸',     tags: ['同事'] }
            ]
        },
        {
            id: 'age',
            meta: 'TA 的年纪',
            title: 'TA 正处在人生的哪一段？',
            options: [
                { emoji: '🌱', label: '20 岁以下', hint: '少年心气', tags: ['少年'] },
                { emoji: '🔥', label: '20-30 岁',  hint: '燃烧的岁月', tags: ['青年'] },
                { emoji: '🌊', label: '30-45 岁',  hint: '沉淀的时光', tags: ['中年'] },
                { emoji: '🍂', label: '45 岁以上', hint: '丰收的季节', tags: ['长者'] }
            ]
        },
        {
            id: 'vibe',
            meta: 'TA 的气质',
            title: 'TA 给你怎样的感觉？',
            options: [
                { emoji: '🎨', label: '文艺浪漫', hint: '感性灵魂',  tags: ['文艺'] },
                { emoji: '⚡', label: '活力四射', hint: '永不停歇',  tags: ['活力'] },
                { emoji: '🧠', label: '理性内敛', hint: '深思熟虑',  tags: ['理性'] },
                { emoji: '🪷', label: '温柔疗愈', hint: '如沐春风',  tags: ['温柔'] }
            ]
        },
        {
            id: 'occasion',
            meta: '是什么场合',
            title: '这是一个怎样的时刻？',
            options: [
                { emoji: '🎂', label: '生日',     hint: '一年一度',  tags: ['生日'] },
                { emoji: '💍', label: '纪念日',   hint: '值得铭记',  tags: ['纪念'] },
                { emoji: '🎊', label: '节日',     hint: '借势庆祝',  tags: ['节日'] },
                { emoji: '💌', label: '没有理由', hint: '就想送',    tags: ['惊喜'] }
            ]
        },
        {
            id: 'budget',
            meta: '预算区间',
            title: '愿意为这份心意投入多少？',
            options: [
                { emoji: '🪙', label: '百元内',   hint: '轻盈心意',  tags: ['<100'] },
                { emoji: '💵', label: '三百左右', hint: '刚好用心',  tags: ['100-500'] },
                { emoji: '💎', label: '千元级',   hint: '郑重其事',  tags: ['500-2000'] },
                { emoji: '👑', label: '不设上限', hint: '只为心动',  tags: ['2000+'] }
            ]
        },
        {
            id: 'message',
            meta: '想传递什么',
            title: '你最想让 TA 感受到的是？',
            options: [
                { emoji: '🤍', label: '被爱着',     hint: '你很重要', tags: ['爱意'] },
                { emoji: '🫶', label: '被懂着',     hint: '我懂你',   tags: ['懂你'] },
                { emoji: '✨', label: '被惊喜到',   hint: '意想不到', tags: ['惊喜'] },
                { emoji: '🌙', label: '被陪伴着',   hint: '一直在',   tags: ['陪伴'] }
            ]
        }
    ];

    /* === Gift Database === */
    var GIFTS = [
        {
            name: '手作香薰蜡烛套装',
            emoji: '🕯',
            tags: ['文艺', '温柔', '恋人', '朋友', '<100', '100-500', '爱意', '陪伴', '生日', '惊喜', '节日'],
            desc: '微光摇曳，香气缓慢释放。每一缕烟都是没说出口的惦念。',
            warmth: '★★★★☆', surprise: '★★★☆☆',
            budget: '¥80-280', reasoning: '香薰是氛围的载体，适合想传递「陪伴」与「爱意」的温柔关系。'
        },
        {
            name: '黑胶唱片 / 复古唱机',
            emoji: '📀',
            tags: ['文艺', '理性', '青年', '中年', '500-2000', '2000+', '懂你', '纪念', '节日'],
            desc: '当唱针落下，时间变得有重量。一份可以反复聆听的记忆。',
            warmth: '★★★★★', surprise: '★★★★☆',
            budget: '¥600-3000', reasoning: '黑胶兼具仪式感与小众品味，适合想表达「我懂你的独特」的场合。'
        },
        {
            name: '定制星空图挂画',
            emoji: '🌌',
            tags: ['文艺', '恋人', '家人', '<100', '100-500', '爱意', '纪念', '惊喜', '少年', '青年'],
            desc: '把某个特殊夜晚的星空，永远定格在墙上。',
            warmth: '★★★★★', surprise: '★★★★★',
            budget: '¥120-380', reasoning: '将「那个时刻」可视化，最适合纪念日或想制造深度惊喜的场景。'
        },
        {
            name: '手工皮具 / 长款钱包',
            emoji: '👜',
            tags: ['理性', '中年', '长者', '100-500', '500-2000', '陪伴', '懂你', '生日', '节日', '同事'],
            desc: '越用越有韵味的植鞣牛皮，陪你走过漫长岁月。',
            warmth: '★★★★☆', surprise: '★★★☆☆',
            budget: '¥280-880', reasoning: '皮具历久弥新，适合送给重视「长久陪伴」的理性或成熟人士。'
        },
        {
            name: '高品质无线降噪耳机',
            emoji: '🎧',
            tags: ['活力', '青年', '100-500', '500-2000', '2000+', '惊喜', '懂你', '生日', '节日', '朋友', '同事'],
            desc: '戴上它，整个世界都安静下来，只剩你与音乐。',
            warmth: '★★★☆☆', surprise: '★★★★☆',
            budget: '¥800-2500', reasoning: '实用且科技感强，适合活力型或年轻的收礼者，传递「我懂你的日常」。'
        },
        {
            name: '永生花玻璃罩',
            emoji: '🌹',
            tags: ['恋人', '文艺', '<100', '100-500', '爱意', '纪念', '生日', '节日', '惊喜', '青年'],
            desc: '不会凋谢的玫瑰，装进晶莹的穹顶里，像一颗凝固的心。',
            warmth: '★★★★★', surprise: '★★★★☆',
            budget: '¥150-480', reasoning: '永恒的意象最适合恋人，尤其在表达「爱意」的纪念日或生日。'
        },
        {
            name: '日式手冲咖啡器具',
            emoji: '☕',
            tags: ['文艺', '理性', '温柔', '青年', '中年', '100-500', '500-2000', '懂你', '陪伴', '生日', '节日', '朋友', '家人'],
            desc: '一套讲究的器具，让每个清晨多一段缓慢的仪式。',
            warmth: '★★★★☆', surprise: '★★★☆☆',
            budget: '¥300-1200', reasoning: '咖啡器具兼顾美学与日常，适合想传递「我懂你的生活节奏」的关系。'
        },
        {
            name: '智能手表 / 运动手环',
            emoji: '⌚',
            tags: ['活力', '青年', '中年', '500-2000', '2000+', '陪伴', '惊喜', '生日', '节日', '家人', '朋友'],
            desc: '24 小时的贴心陪伴，记录每一次心跳与每一步路。',
            warmth: '★★★★☆', surprise: '★★★☆☆',
            budget: '¥800-3000', reasoning: '健康关怀属性强，适合送给家人或活力型的朋友，表达「陪伴」与「在乎」。'
        },
        {
            name: '亲笔手写信 + 书',
            emoji: '📖',
            tags: ['文艺', '温柔', '<100', '100-500', '爱意', '懂你', '陪伴', '惊喜', '朋友', '家人', '恋人', '长者', '纪念'],
            desc: '一本挑了很久的书，夹着一封只写给 TA 的信。',
            warmth: '★★★★★', surprise: '★★★★★',
            budget: '¥40-200', reasoning: '手写信是最低成本却最高心意的礼物，适合任何想传递「懂你」与「爱意」的时刻。'
        },
        {
            name: '小众香水 / 香氛',
            emoji: '🌸',
            tags: ['文艺', '恋人', '青年', '中年', '100-500', '500-2000', '爱意', '惊喜', '生日', '纪念', '节日', '朋友'],
            desc: '一种只有你们之间才懂的气味，是记忆最隐秘的钥匙。',
            warmth: '★★★★☆', surprise: '★★★★☆',
            budget: '¥300-1200', reasoning: '香水是私密的礼物，适合关系较近、想制造嗅觉记忆的场合。'
        },
        {
            name: '高品质羊绒围巾',
            emoji: '🧣',
            tags: ['温柔', '家人', '长者', '中年', '100-500', '500-2000', '2000+', '陪伴', '爱意', '生日', '节日', '懂你'],
            desc: '柔软得像云朵，围上的瞬间，是被整个冬天原谅。',
            warmth: '★★★★★', surprise: '★★★☆☆',
            budget: '¥380-1800', reasoning: '围巾是「温暖」的具象化，尤其适合送给家人或长辈，表达长久的陪伴。'
        },
        {
            name: '现场演出 / 音乐会门票',
            emoji: '🎫',
            tags: ['活力', '文艺', '青年', '100-500', '500-2000', '2000+', '惊喜', '懂你', '陪伴', '朋友', '恋人', '生日', '节日'],
            desc: '最好的礼物，是一段你们共同经历的时光。',
            warmth: '★★★★☆', surprise: '★★★★★',
            budget: '¥280-2000', reasoning: '体验型礼物创造共同回忆，适合活力型或文艺型的亲密关系，惊喜感极强。'
        },
        {
            name: '定制首饰 / 刻字吊坠',
            emoji: '📿',
            tags: ['恋人', '家人', '文艺', '青年', '中年', '500-2000', '2000+', '爱意', '纪念', '生日', '节日', '惊喜', '懂你'],
            desc: '一件可以贴身佩戴的物件，刻上只有你俩懂的字符。',
            warmth: '★★★★★', surprise: '★★★★☆',
            budget: '¥600-3000', reasoning: '贴身首饰是亲密关系的信物，适合表达「爱意」与「懂你」的郑重场合。'
        },
        {
            name: '精美桌面绿植 / 苔藓微景',
            emoji: '🪴',
            tags: ['温柔', '文艺', '理性', '同事', '朋友', '家人', '<100', '100-500', '陪伴', '生日', '节日', '惊喜'],
            desc: '一小片会呼吸的绿意，让案头多了个安静的朋友。',
            warmth: '★★★☆☆', surprise: '★★★☆☆',
            budget: '¥60-300', reasoning: '绿植轻巧不越界，适合同事或普通朋友，传递「温柔的陪伴」而不显唐突。'
        },
        {
            name: '复古拍立得相机',
            emoji: '📸',
            tags: ['文艺', '活力', '青年', '少年', '100-500', '500-2000', '惊喜', '懂你', '陪伴', '朋友', '恋人', '生日', '节日'],
            desc: '按下快门的瞬间，把时间变成可以握住的卡片。',
            warmth: '★★★★☆', surprise: '★★★★☆',
            budget: '¥400-900', reasoning: '拍立得创造即时的快乐与回忆，适合文艺或活力型的年轻人，惊喜感十足。'
        },
        {
            name: '高级礼盒茶具 / 茶叶',
            emoji: '🍵',
            tags: ['理性', '温柔', '中年', '长者', '家人', '同事', '100-500', '500-2000', '懂你', '陪伴', '生日', '节日', '纪念'],
            desc: '一壶好茶，是东方人最体面的「请你慢下来」。',
            warmth: '★★★★☆', surprise: '★★★☆☆',
            budget: '¥200-1500', reasoning: '茶具庄重得体，适合送给长辈、同事或成熟人士，表达「懂你」的尊重。'
        }
    ];

    /* === Analyzing Log Lines === */
    var ANALYZE_LINES = [
        '解析收礼者人格画像…',
        '匹配情感关键词权重…',
        '评估预算与心意指数…',
        '检索 16 件候选礼物…',
        '计算惊喜度与契合度…',
        '锁定最优推荐…'
    ];

    /* === DOM References === */
    var el = {
        stage: document.getElementById('stage'),
        stepCurrent: document.querySelector('.step-current'),
        stepTotal: document.querySelector('.step-total'),
        progressFill: document.getElementById('progress-fill'),
        startBtn: document.getElementById('start-btn'),
        hintFooter: document.getElementById('hint-footer'),
        rippleLayer: document.getElementById('ripple-layer'),
        // question
        metaTag: document.getElementById('meta-tag'),
        questionTitle: document.getElementById('question-title'),
        optionsGrid: document.getElementById('options-grid'),
        // analyzing
        analyzeLog: document.getElementById('analyze-log'),
        analyzeTitle: document.getElementById('analyze-title'),
        // result
        resultEyebrow: document.getElementById('result-eyebrow'),
        resultTitle: document.getElementById('result-title'),
        resultSubtitle: document.getElementById('result-subtitle'),
        resultEmoji: document.getElementById('result-emoji'),
        resultName: document.getElementById('result-name'),
        resultDesc: document.getElementById('result-desc'),
        resultTags: document.getElementById('result-tags'),
        resultBudget: document.getElementById('result-budget'),
        resultWarmth: document.getElementById('result-warmth'),
        resultSurprise: document.getElementById('result-surprise'),
        reasoningText: document.getElementById('reasoning-text'),
        restartBtn: document.getElementById('restart-btn'),
        rerollBtn: document.getElementById('reroll-btn')
    };

    /* === State === */
    var state = {
        step: 0,                // 0 = welcome, 1..6 = questions, 7 = analyzing, 8 = result
        totalSteps: QUESTIONS.length,
        answers: [],            // array of selected option-tag-arrays
        resultIndex: 0,
        resultPool: [],         // sorted candidate indices after matching
        resultCursor: 0,
        particles: []
    };

    el.stepTotal.textContent = pad(state.totalSteps);

    /* === Helpers === */
    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function showScreen(name, forward) {
        var screens = el.stage.querySelectorAll('.screen');
        var current = null;
        screens.forEach(function (s) {
            if (!s.hasAttribute('hidden')) current = s;
        });

        var next = el.stage.querySelector('[data-screen="' + name + '"]');
        if (!next || next === current) return;

        if (current) {
            current.classList.add('leaving');
            setTimeout(function () {
                current.setAttribute('hidden', '');
                current.classList.remove('leaving');
                revealScreen(next, forward);
            }, 380);
        } else {
            revealScreen(next, forward);
        }
    }

    function revealScreen(next, forward) {
        next.removeAttribute('hidden');
        // restart enter animation
        next.style.animation = 'none';
        void next.offsetWidth;
        next.style.animation = '';
    }

    function updateProgress() {
        var pct = 0;
        if (state.step === 0) {
            pct = 0;
        } else if (state.step > state.totalSteps) {
            pct = 100;
        } else {
            pct = (state.step / state.totalSteps) * 100;
        }
        el.progressFill.style.width = pct + '%';
        el.stepCurrent.textContent = pad(Math.min(state.step, state.totalSteps));

        // shift accent theme by progress
        var idx = Math.min(state.step, ACCENT_PALETTE.length - 1);
        var accent = ACCENT_PALETTE[idx];
        document.documentElement.style.setProperty('--accent-a', accent.a);
        document.documentElement.style.setProperty('--accent-b', accent.b);
        document.documentElement.style.setProperty('--accent-soft', hexToRgba(accent.a, 0.5));
        document.documentElement.style.setProperty('--accent-glow', hexToRgba(accent.a, 0.18));
    }

    function hexToRgba(hex, alpha) {
        var h = hex.replace('#', '');
        var r = parseInt(h.substring(0, 2), 16);
        var g = parseInt(h.substring(2, 4), 16);
        var b = parseInt(h.substring(4, 6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    /* === Render Question === */
    function renderQuestion() {
        var q = QUESTIONS[state.step - 1];
        if (!q) return;

        el.metaTag.textContent = q.meta;
        el.questionTitle.textContent = q.title;
        el.optionsGrid.innerHTML = '';

        q.options.forEach(function (opt, i) {
            var btn = document.createElement('button');
            btn.className = 'option';
            btn.style.setProperty('--i', i);
            btn.innerHTML =
                '<span class="option-emoji">' + opt.emoji + '</span>' +
                '<span class="option-label">' + opt.label + '</span>' +
                '<span class="option-hint">' + opt.hint + '</span>';

            // mouse-tracked glow
            btn.addEventListener('mousemove', function (e) {
                var rect = btn.getBoundingClientRect();
                var mx = ((e.clientX - rect.left) / rect.width) * 100;
                var my = ((e.clientY - rect.top) / rect.height) * 100;
                btn.style.setProperty('--mx', mx + '%');
                btn.style.setProperty('--my', my + '%');
            });

            btn.addEventListener('click', function () {
                selectOption(opt, btn);
            });

            el.optionsGrid.appendChild(btn);
        });

        showScreen('question', true);
        el.hintFooter.classList.remove('hidden');
    }

    function selectOption(opt, btn) {
        // lock interaction
        var allOpts = el.optionsGrid.querySelectorAll('.option');
        allOpts.forEach(function (o) { o.style.pointerEvents = 'none'; });

        btn.classList.add('selected');
        spawnRippleAtCenter(btn);
        state.answers[state.step - 1] = opt.tags;

        setTimeout(function () {
            state.step++;
            if (state.step > state.totalSteps) {
                el.hintFooter.classList.add('hidden');
                runAnalyzing();
            } else {
                updateProgress();
                renderQuestion();
            }
        }, 480);
    }

    /* === Analyzing === */
    function runAnalyzing() {
        state.step = state.totalSteps + 1;
        updateProgress();
        showScreen('analyzing', true);
        el.analyzeLog.innerHTML = '';

        var lineIdx = 0;
        function nextLine() {
            if (lineIdx >= ANALYZE_LINES.length) {
                computeResult();
                return;
            }
            var line = document.createElement('div');
            line.className = 'log-line';
            line.innerHTML = '<span class="log-tick">▸</span>' + ANALYZE_LINES[lineIdx];
            el.analyzeLog.appendChild(line);
            lineIdx++;
            setTimeout(nextLine, 360 + Math.random() * 180);
        }
        setTimeout(nextLine, 200);
    }

    /* === Gift Matching Engine === */
    function computeResult() {
        // flatten all selected tags
        var collected = [];
        state.answers.forEach(function (tags) {
            (tags || []).forEach(function (t) { collected.push(t); });
        });

        // score each gift by tag overlap
        var scored = GIFTS.map(function (gift, idx) {
            var score = 0;
            collected.forEach(function (t) {
                if (gift.tags.indexOf(t) !== -1) score++;
            });
            // small random jitter to allow reroll variety
            score += Math.random() * 0.5;
            return { idx: idx, score: score };
        });

        scored.sort(function (a, b) { return b.score - a.score; });
        state.resultPool = scored.map(function (s) { return s.idx; }).filter(function (idx, i) { return i < 5; });
        state.resultCursor = 0;
        renderResult();
    }

    /* === Render Result === */
    function renderResult() {
        var idx = state.resultPool[state.resultCursor % state.resultPool.length];
        state.resultIndex = idx;
        var gift = GIFTS[idx];

        el.resultEyebrow.textContent = '为你挑选了 · No.' + pad(idx + 1);
        el.resultTitle.textContent = gift.name;
        el.resultSubtitle.textContent = '一份契合度 ' + scoreLabel(idx) + ' 的推荐';
        el.resultEmoji.textContent = gift.emoji;
        el.resultName.textContent = gift.name;
        el.resultDesc.textContent = gift.desc;
        el.reasoningText.textContent = gift.reasoning;
        el.resultBudget.textContent = gift.budget;
        el.resultWarmth.textContent = gift.warmth;
        el.resultSurprise.textContent = gift.surprise;

        // tags
        el.resultTags.innerHTML = '';
        gift.tags.slice(0, 5).forEach(function (t) {
            var tag = document.createElement('span');
            tag.className = 'card-tag';
            tag.textContent = '#' + t;
            el.resultTags.appendChild(tag);
        });

        state.step = state.totalSteps + 2;
        updateProgress();
        // re-trigger animations
        var resultScreen = el.stage.querySelector('[data-screen="result"]');
        resultScreen.style.animation = 'none';
        void resultScreen.offsetWidth;
        resultScreen.style.animation = '';
        showScreen('result', true);
    }

    function scoreLabel(idx) {
        // pseudo high label based on pool position
        var pos = state.resultPool.indexOf(idx);
        if (pos === 0) return '98%';
        if (pos === 1) return '94%';
        if (pos === 2) return '90%';
        return '87%';
    }

    /* === Restart / Reroll === */
    function restart() {
        state.step = 0;
        state.answers = [];
        state.resultPool = [];
        state.resultCursor = 0;
        updateProgress();
        showScreen('welcome', false);
        el.hintFooter.classList.add('hidden');
    }

    function reroll() {
        state.resultCursor++;
        renderResult();
        spawnRippleAtCenter(el.rerollBtn);
    }

    /* === Ripple === */
    function spawnRippleAtCenter(node) {
        var rect = node.getBoundingClientRect();
        spawnRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function spawnRipple(x, y) {
        var r = document.createElement('div');
        r.className = 'click-ripple';
        r.style.left = (x - 0) + 'px';
        r.style.top = (y - 0) + 'px';
        r.style.transform = 'translate(-50%, -50%)';
        el.rippleLayer.appendChild(r);
        setTimeout(function () { r.remove(); }, 820);
    }

    document.addEventListener('click', function (e) {
        // global click ripple, but not on back-link to avoid clutter
        if (e.target.closest('.back-link')) return;
        spawnRipple(e.clientX, e.clientY);
    });

    /* === Particle System === */
    var canvas = document.getElementById('particle-canvas');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            radius: Math.random() * 1.8 + 0.4,
            opacity: Math.random() * 0.35 + 0.05,
            phase: Math.random() * Math.PI * 2
        };
    }

    function initParticles() {
        state.particles = [];
        var count = Math.min(Math.floor(window.innerWidth * window.innerHeight / 14000), 70);
        for (var i = 0; i < count; i++) state.particles.push(createParticle());
    }
    initParticles();
    window.addEventListener('resize', initParticles);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    window.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    window.addEventListener('touchmove', function (e) {
        if (e.touches[0]) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
        }
    }, { passive: true });

    function getAccentRGB() {
        var a = getComputedStyle(document.documentElement).getPropertyValue('--accent-a').trim();
        return hexToRgb(a);
    }

    function hexToRgb(hex) {
        var h = hex.replace('#', '');
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16)
        };
    }

    var time = 0;
    function tick() {
        time += 0.016;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var accent = getAccentRGB();

        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];

            // drift
            p.x += p.vx;
            p.y += p.vy;

            // mouse attraction
            var dx = mouseX - p.x;
            var dy = mouseY - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 160 && dist > 0.1) {
                var force = (160 - dist) / 160 * 0.04;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // gentle damping
            p.vx *= 0.985;
            p.vy *= 0.985;
            // base drift restore
            p.vx += (Math.random() - 0.5) * 0.008;
            p.vy += (Math.random() - 0.5) * 0.008;

            // wrap
            if (p.x < -10) p.x = window.innerWidth + 10;
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.y < -10) p.y = window.innerHeight + 10;
            if (p.y > window.innerHeight + 10) p.y = -10;

            var breath = Math.sin(time * 1.2 + p.phase) * 0.4 + 0.6;
            var op = p.opacity * breath;

            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',' + op + ')';
            ctx.fill();
        }

        // connect nearby particles
        for (var a = 0; a < state.particles.length; a++) {
            for (var b = a + 1; b < state.particles.length; b++) {
                var pa = state.particles[a];
                var pb = state.particles[b];
                var ddx = pa.x - pb.x;
                var ddy = pa.y - pb.y;
                var d = Math.sqrt(ddx * ddx + ddy * ddy);
                if (d < 110) {
                    var lineOp = (1 - d / 110) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(pa.x, pa.y);
                    ctx.lineTo(pb.x, pb.y);
                    ctx.strokeStyle = 'rgba(' + accent.r + ',' + accent.g + ',' + accent.b + ',' + lineOp + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    /* === Event Wiring === */
    el.startBtn.addEventListener('click', function () {
        state.step = 1;
        updateProgress();
        renderQuestion();
    });

    el.restartBtn.addEventListener('click', restart);
    el.rerollBtn.addEventListener('click', reroll);

    // keyboard support: 1-4 to select option
    document.addEventListener('keydown', function (e) {
        if (el.stage.querySelector('[data-screen="question"]').hasAttribute('hidden')) return;
        var key = parseInt(e.key, 10);
        if (key >= 1 && key <= 4) {
            var opts = el.optionsGrid.querySelectorAll('.option');
            if (opts[key - 1]) opts[key - 1].click();
        }
    });

    /* === Init === */
    updateProgress();

})();
