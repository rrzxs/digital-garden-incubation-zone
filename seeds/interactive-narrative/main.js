/* ============================================================
   Interactive Narrative | Echoes — 回声残响
   A branching, choice-driven story engine.
   - Per-mood palette morphing via CSS variables
   - Typewriter title + staggered paragraph reveal
   - Flow-field particle background
   - Path constellation visualization (SVG)
   - Mouse-reactive choice cards
   - Keyboard navigation (1/2/3, ← to undo)
   Maintainer: EDEN
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // === STORY GRAPH ============================================
    // ============================================================
    // Each node: id, chapter index, mood (drives palette),
    // prelude (signal tag), title, body (array of paragraphs;
    // supports <em> and <strong>), optional coord, choices (or epilogue).

    const STORY = {
        start: {
            chapter: 1,
            mood: 'dormant',
            coord: 'N 47.37 · E 08.54',
            prelude: 'incoming transmission',
            title: '你听见了。',
            body: [
                '不是耳朵听见的——是<strong>骨头</strong>。一种极低的频率，从地铁隧道的水泥缝里渗出来，刚好压在你能感知的边缘。',
                '凌晨三点。所有人都在睡。只有你站在月台尽头，手里的咖啡凉得发苦。',
                '<em>那个声音</em>，像是什么东西在很远的地方，一遍又一遍地呼喊同一个名字。'
            ],
            choices: [
                { label: '顺着声音，走向隧道深处', hint: 'descend', next: 'tunnel', mood: 'descent' },
                { label: '转身回家，假装什么都没发生', hint: 'retreat', next: 'retreat', mood: 'stirring' },
                { label: '把咖啡倒进轨道，仔细听', hint: 'listen closer', next: 'listen', mood: 'dormant' }
            ]
        },

        tunnel: {
            chapter: 2,
            mood: 'descent',
            coord: 'N 47.37 · E 08.54 — depth -18m',
            prelude: 'signal strengthening',
            title: '越走越深。',
            body: [
                '隧道里的应急灯每隔二十米亮一盏，把你的影子拉得很长，又折断。',
                '声音现在清晰了。它在念一个名字——<em>不是你的名字</em>，但你莫名地知道，那本来应该是你的。',
                '前方出现岔路。左边干燥，右边潮湿，墙壁上长满了某种会发光的苔藓，正以你的心跳频率明灭。'
            ],
            choices: [
                { label: '走向发光的苔藓', hint: 'follow the bloom', next: 'bloom', mood: 'descent' },
                { label: '走干燥的左路', hint: 'stay rational', next: 'dry', mood: 'stirring' }
            ]
        },

        retreat: {
            chapter: 2,
            mood: 'stirring',
            coord: 'N 47.37 · E 08.54 — moving away',
            prelude: 'signal fading… but not gone',
            title: '你跑了。',
            body: [
                '回到家，你锁上门，灌下一杯水，告诉自己那只是<strong>低频管线共振</strong>。城市的常识。',
                '可当你关灯躺下，天花板上浮现出一行字，像是有人用手指在结露的玻璃上写过——然后被你看见了。',
                '<em>「你还记得我们吗？」</em>'
            ],
            choices: [
                { label: '闭上眼，强迫自己入睡', hint: 'deny', next: 'deny', mood: 'stirring' },
                { label: '起身，重新走回月台', hint: 'go back', next: 'start', mood: 'dormant' }
            ]
        },

        listen: {
            chapter: 2,
            mood: 'dormant',
            coord: 'N 47.37 · E 08.54 — stillness',
            prelude: 'pattern isolated',
            title: '你停下了。',
            body: [
                '咖啡落上轨道，溅起一点温热的雾。声音忽然变了——它不再呼喊名字，而是开始<strong>重复你说过的每一句话</strong>。',
                '今天说的。昨天说的。十年前在一个车站对陌生人说的、你早以为自己忘了的那一句。',
                '你意识到，隧道不是在发出声音。它是在<em>回放</em>。'
            ],
            choices: [
                { label: '问它：「你是谁？」', hint: 'speak back', next: 'speak', mood: 'remembered' },
                { label: '什么都不说，只是听', hint: 'receive', next: 'tunnel', mood: 'descent' }
            ]
        },

        bloom: {
            chapter: 3,
            mood: 'descent',
            coord: 'unknown',
            prelude: 'bioluminescent corridor',
            title: '苔藓认得你。',
            body: [
                '它们随着你的脚步亮起来，像一条<em>由光铺成的路</em>。你伸出手，指尖刚触到墙，那些苔藓就组成了一张脸。',
                '是你。但更年轻一些，眼神还没被生活磨钝。',
                '「你把我留在了这里。」那张脸说，声音和隧道里的一模一样。'
            ],
            choices: [
                { label: '说：「对不起。」', hint: 'atone', next: 'remembered_end', mood: 'remembered' },
                { label: '说：「你不是我。」', hint: 'reject', next: 'dry', mood: 'stirring' }
            ]
        },

        dry: {
            chapter: 3,
            mood: 'stirring',
            coord: 'N 47.37 · E 08.54 — depth -32m',
            prelude: 'rational path',
            title: '理性的路。',
            body: [
                '干燥的隧道尽头是一扇金属门，上面没有把手，只有一道细细的<strong>裂缝</strong>，里面透出暖黄色的光。',
                '门后有人在等你。你不知道是谁，但你胸口有一种很久没有过的、被等待的踏实感。',
                '<em>要不要打开它？</em>这个问题本身，比答案更重要。'
            ],
            choices: [
                { label: '推开门', hint: 'open', next: 'remembered_end', mood: 'remembered' },
                { label: '把手贴在门上，不推', hint: 'presence', next: 'transcend_end', mood: 'transcend' }
            ]
        },

        deny: {
            chapter: 3,
            mood: 'stirring',
            coord: 'home',
            prelude: 'resistance failing',
            title: '睡意不肯来。',
            body: [
                '你数羊、数呼吸、数所有应该让你平静的事。但那句<strong>「你还记得我们吗」</strong>钉在脑子里，拔不出来。',
                '你忽然想起七岁那年，学校操场的角落，你和其他三个孩子发明过一种语言。后来那种语言，谁都没再说起。',
                '包括你。<em>尤其是你。</em>'
            ],
            choices: [
                { label: '下楼，回到那个操场', hint: 'return', next: 'speak', mood: 'remembered' },
                { label: '承认：你忘了', hint: 'confess', next: 'remembered_end', mood: 'remembered' }
            ]
        },

        speak: {
            chapter: 4,
            mood: 'remembered',
            coord: 'everywhere at once',
            prelude: 'two-way channel open',
            title: '它回答了。',
            body: [
                '「我是你<strong>没走</strong>的那条路。」声音说，「我是你没说出口的话、没赴的约、没记住的那个梦。」',
                '「每个被自己遗忘的版本，都会流到这里的管道里。我们一直在喊你。」',
                '你站在原地，第一次没有害怕。原来隧道从来不是<em>陷阱</em>——它是一座失物招领处。'
            ],
            choices: [
                { label: '把它们一个个接走', hint: 'reintegrate', next: 'transcend_end', mood: 'transcend' },
                { label: '留下来，陪它们一会儿', hint: 'stay', next: 'remembered_end', mood: 'remembered' }
            ]
        },

        // === ENDINGS ===
        remembered_end: {
            chapter: 5,
            mood: 'remembered',
            coord: 'N 47.37 · E 08.54 — surface',
            prelude: 'transmission complete',
            title: '你回来了。',
            body: [
                '清晨第一班车进站时，你从隧道口走出来，浑身沾着发光的苔藓孢子。没有人看见你。',
                '你回到家，把七岁那年发明的语言，<strong>一个词一个词地</strong>，重新写了下来。',
                '从那以后，地铁里偶尔还能听见那个声音。但它不再呼喊——它只是在<em>哼一首你终于能跟着唱的歌</em>。'
            ],
            epilogue: true,
            epilogueLabel: 'ENDING · REMEMBERED'
        },

        transcend_end: {
            chapter: 5,
            mood: 'transcend',
            coord: '—',
            prelude: 'signal merged with source',
            title: '门开了。',
            body: [
                '不是被你推开的。是它<strong>自己</strong>，在你承认它的那一刻，轻轻地向内让出了空间。',
                '门后没有人。只有一片很柔的光，和一种你很久没体会过的、不必再向任何人解释什么的自由。',
                '你走进去。隧道里的所有声音，终于安静下来——因为<em>它们都和你在一起了</em>。'
            ],
            epilogue: true,
            epilogueLabel: 'ENDING · TRANSCENDED'
        }
    };

    // ============================================================
    // === DOM ELEMENTS ===========================================
    // ============================================================

    const els = {
        body: document.body,
        stage: document.getElementById('stage'),
        chapterStrip: document.getElementById('chapter-strip'),
        stripNumber: document.getElementById('strip-number'),
        stripLabel: document.getElementById('strip-label'),
        stripCoord: document.getElementById('strip-coord'),
        preludeText: document.getElementById('prelude-text'),
        narrativeTitle: document.getElementById('narrative-title'),
        titleFragment: document.querySelector('.title-fragment'),
        narrativeBody: document.getElementById('narrative-body'),
        choices: document.getElementById('choices'),
        restartBtn: document.getElementById('restart-btn'),
        // HUD
        hudChapter: document.getElementById('hud-chapter'),
        hudMood: document.getElementById('hud-mood'),
        hudDepth: document.getElementById('hud-depth'),
        cadenceFill: document.getElementById('cadence-fill'),
        telDecisions: document.getElementById('tel-decisions'),
        // Constellation
        constellationSvg: document.getElementById('constellation-svg'),
        readoutValue: document.getElementById('readout-value'),
        // Canvas
        flowField: document.getElementById('flow-field')
    };

    // ============================================================
    // === STATE ==================================================
    // ============================================================

    const state = {
        path: ['start'],     // stack of node ids visited (current = last)
        currentId: 'start',
        mood: 'dormant',
        decisionCount: 0,
        typingTimer: null,
        revealTimers: [],
        isTransitioning: false
    };

    const MOOD_LABELS = {
        dormant: 'dormant',
        stirring: 'stirring',
        descent: 'descent',
        remembered: 'remembered',
        transcend: 'transcend'
    };

    // ============================================================
    // === UTILITIES =============================================
    // ============================================================

    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const pad = (n, len = 2) => String(n).padStart(len, '0');

    function clearTimers() {
        if (state.typingTimer) {
            clearTimeout(state.typingTimer);
            state.typingTimer = null;
        }
        state.revealTimers.forEach((t) => clearTimeout(t));
        state.revealTimers = [];
    }

    // ============================================================
    // === MOOD / THEME MORPHING =================================
    // ============================================================

    function applyMood(mood) {
        state.mood = mood;
        els.body.setAttribute('data-mood', mood);
        els.hudMood.textContent = MOOD_LABELS[mood] || mood;
    }

    // ============================================================
    // === TYPEWRITER TITLE =======================================
    // ============================================================

    function typewriteTitle(text) {
        return new Promise((resolve) => {
            const target = els.titleFragment;
            target.textContent = '';
            let i = 0;
            const chars = Array.from(text);
            const tick = () => {
                if (i >= chars.length) {
                    state.typingTimer = null;
                    resolve();
                    return;
                }
                target.textContent += chars[i++];
                // Variable cadence: longer pause on punctuation
                const ch = chars[i - 1];
                const delay = /[。，.,!?!？—…]/.test(ch) ? 240 : (/\s/.test(ch) ? 60 : 42);
                state.typingTimer = setTimeout(tick, delay);
            };
            tick();
        });
    }

    // ============================================================
    // === PARAGRAPH STAGGERED REVEAL ============================
    // ============================================================

    function revealBody(paragraphs) {
        els.narrativeBody.innerHTML = '';
        paragraphs.forEach((html, idx) => {
            const p = document.createElement('p');
            p.innerHTML = html;
            els.narrativeBody.appendChild(p);
            const t = setTimeout(() => {
                p.classList.add('revealed');
            }, 120 + idx * 520);
            state.revealTimers.push(t);
        });
    }

    // ============================================================
    // === CHOICES RENDER ========================================
    // ============================================================

    function renderChoices(node) {
        els.choices.innerHTML = '';
        if (node.epilogue || !node.choices) {
            renderEpilogue(node);
            return;
        }

        node.choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'choice';
            btn.style.animationDelay = `${0.4 + idx * 0.09}s`;
            btn.dataset.index = idx;

            btn.innerHTML = `
                <span class="choice-index">${idx + 1}</span>
                <span class="choice-text">
                    <span class="choice-label">${choice.label}</span>
                    <span class="choice-hint">${choice.hint}</span>
                </span>
                <svg class="choice-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
            `;

            // Mouse-reactive radial glow (sets --mx/--my on the card)
            btn.addEventListener('pointermove', (ev) => {
                const rect = btn.getBoundingClientRect();
                const mx = ((ev.clientX - rect.left) / rect.width) * 100;
                const my = ((ev.clientY - rect.top) / rect.height) * 100;
                btn.style.setProperty('--mx', `${mx}%`);
                btn.style.setProperty('--my', `${my}%`);
            });

            btn.addEventListener('click', () => handleChoice(choice, btn));

            els.choices.appendChild(btn);
        });
    }

    function renderEpilogue(node) {
        els.stage.classList.add('is-epilogue');
        const glow = document.createElement('div');
        glow.className = 'epilogue-glow';
        glow.textContent = node.epilogueLabel || 'ENDING';
        els.choices.appendChild(glow);
    }

    // ============================================================
    // === CHOICE HANDLING =======================================
    // ============================================================

    function handleChoice(choice, clickedBtn) {
        if (state.isTransitioning) return;
        state.isTransitioning = true;

        // Animate non-chosen choices fading left, chosen one sliding right
        const all = els.choices.querySelectorAll('.choice');
        all.forEach((btn) => {
            if (btn === clickedBtn) {
                btn.classList.add('is-leaving');
            } else {
                btn.classList.add('is-fading-other');
            }
        });

        state.decisionCount += 1;
        updateTelemetry();

        // Morph mood a beat BEFORE navigation so the world shifts first
        if (choice.mood) applyMood(choice.mood);

        wait(560).then(() => navigateTo(choice.next));
    }

    // ============================================================
    // === NAVIGATION ============================================
    // ============================================================

    function navigateTo(nodeId) {
        clearTimers();
        const node = STORY[nodeId];
        if (!node) {
            console.warn('[Echoes] Unknown node:', nodeId);
            state.isTransitioning = false;
            return;
        }

        state.currentId = nodeId;
        state.path.push(nodeId);
        // Trim trailing "start" loops so depth reads sensibly
        syncPathStack();

        renderNode(node);
        updateHUD(node);
        updateConstellation();
        state.isTransitioning = false;
    }

    // Keep the path stack coherent: collapse any immediate start→start loops
    function syncPathStack() {
        const p = state.path;
        for (let i = p.length - 1; i > 0; i--) {
            if (p[i] === 'start' && p[i - 1] === 'start') {
                p.splice(i, 1);
            }
        }
    }

    function goBack() {
        if (state.isTransitioning) return;
        if (state.path.length <= 1) return; // at origin
        state.path.pop();
        const prevId = state.path[state.path.length - 1];
        const node = STORY[prevId];
        state.currentId = prevId;
        els.stage.classList.remove('is-epilogue');
        clearTimers();
        if (node.mood) applyMood(node.mood);
        renderNode(node);
        updateHUD(node);
        updateConstellation();
    }

    // ============================================================
    // === NODE RENDER ===========================================
    // ============================================================

    async function renderNode(node) {
        els.stage.classList.toggle('is-epilogue', !!node.epilogue);

        // Strip
        els.stripNumber.textContent = pad(node.chapter, 3);
        els.stripLabel.textContent = (node.prelude || 'scene').toUpperCase();
        els.stripCoord.textContent = node.coord || '—';
        els.preludeText.textContent = node.prelude || 'scene';

        // Re-trigger chapter-strip drop-in animation
        els.chapterStrip.style.animation = 'none';
        void els.chapterStrip.offsetWidth; // reflow
        els.chapterStrip.style.animation = '';

        // Body (clear first so the staggered reveal plays fresh)
        els.narrativeBody.innerHTML = '';
        els.titleFragment.textContent = '';

        // Typewriter title, then body, then choices
        await typewriteTitle(node.title);
        revealBody(node.body);
        // Choices appear after a short delay regardless
        const t = setTimeout(() => renderChoices(node), 520);
        state.revealTimers.push(t);
    }

    // ============================================================
    // === HUD UPDATES ===========================================
    // ============================================================

    function updateHUD(node) {
        els.hudChapter.textContent = pad(node.chapter);
        els.hudDepth.textContent = String(state.path.length - 1);
        // Cadence pulses with path depth
        const cadence = clamp(20 + (state.path.length - 1) * 12, 20, 100);
        els.cadenceFill.style.width = `${cadence}%`;
    }

    function updateTelemetry() {
        els.telDecisions.textContent = `${state.decisionCount} / ∞`;
    }

    // ============================================================
    // === CONSTELLATION (path visualization) ====================
    // ============================================================

    // We render a vertical column of "possible" nodes based on path length,
    // connecting visited ones with a glowing line and marking current.
    function updateConstellation() {
        const svg = els.constellationSvg;
        svg.innerHTML = '';
        const path = state.path;
        const depth = path.length;
        const slots = Math.max(depth, 5);
        const W = 100;
        const H = 600;
        const margin = 30;
        const step = (H - margin * 2) / Math.max(slots - 1, 1);

        // Build node coordinates (snake left/right for visual interest)
        const points = [];
        for (let i = 0; i < slots; i++) {
            const x = W / 2 + (i % 2 === 0 ? -18 : 18);
            const y = margin + i * step;
            points.push({ x, y });
        }

        // Links
        for (let i = 0; i < depth - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            // Smooth curve between the two points
            const cx = (a.x + b.x) / 2 + (i % 2 === 0 ? 14 : -14);
            const cy = (a.y + b.y) / 2;
            line.setAttribute('d', `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`);
            line.setAttribute('class', 'const-link' + (i < depth - 1 ? ' active' : ''));
            svg.appendChild(line);
        }

        // Nodes
        for (let i = 0; i < slots; i++) {
            const p = points[i];
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            let r = 3.2;
            let cls = 'const-node';
            if (i < depth - 1) {
                cls += ' visited';
                r = 3.6;
            } else if (i === depth - 1) {
                cls += ' current';
                r = 5.2;
            }
            circle.setAttribute('r', r);
            circle.setAttribute('class', cls);
            svg.appendChild(circle);
        }

        els.readoutValue.textContent = pad(depth - 1) + '.' + (state.mood.slice(0, 3).toUpperCase());
    }

    // ============================================================
    // === FLOW FIELD BACKGROUND (canvas) ========================
    // ============================================================

    function initFlowField() {
        const canvas = els.flowField;
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
        const particles = [];
        const PARTICLE_COUNT = 64;

        function resize() {
            w = canvas.clientWidth = window.innerWidth;
            h = canvas.clientHeight = window.innerHeight;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function spawn() {
            particles.length = 0;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: 0,
                    vy: 0,
                    life: Math.random() * 200,
                    maxLife: 200 + Math.random() * 200
                });
            }
        }

        // Simple curl-ish noise via layered sines (cheap, GPU-friendly)
        function field(x, y, t) {
            const s = 0.0016;
            const a = Math.sin(x * s + t * 0.0002) + Math.cos(y * s * 1.3 + t * 0.00015);
            const b = Math.cos(x * s * 0.8 - t * 0.0001) - Math.sin(y * s * 0.9 + t * 0.0002);
            return { fx: a * 0.35, fy: b * 0.35 };
        }

        function getAccentRGB() {
            // Read current accent from CSS var → rgb array
            const v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
            const m = v.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
            if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
            return [196, 165, 255];
        }

        let lastT = performance.now();
        function frame(now) {
            const dt = Math.min(now - lastT, 40);
            lastT = now;
            // Trail fade
            ctx.fillStyle = 'rgba(7, 8, 13, 0.10)';
            ctx.fillRect(0, 0, w, h);

            const [r, g, b] = getAccentRGB();

            for (const p of particles) {
                const { fx, fy } = field(p.x, p.y, now);
                p.vx = p.vx * 0.94 + fx;
                p.vy = p.vy * 0.94 + fy;
                p.x += p.vx;
                p.y += p.vy;
                p.life += 1;

                if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20 || p.life > p.maxLife) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                    p.vx = p.vy = 0;
                    p.life = 0;
                }

                const alpha = clamp(1 - p.life / p.maxLife, 0, 1) * 0.5;
                ctx.beginPath();
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            requestAnimationFrame(frame);
        }

        resize();
        spawn();
        window.addEventListener('resize', () => { resize(); spawn(); });
        requestAnimationFrame(frame);
    }

    // ============================================================
    // === KEYBOARD NAVIGATION ===================================
    // ============================================================

    function onKey(ev) {
        const node = STORY[state.currentId];
        if (!node) return;

        // Number keys → choose
        if (['1', '2', '3'].includes(ev.key) && node.choices) {
            const idx = parseInt(ev.key, 10) - 1;
            const btn = els.choices.querySelector(`.choice[data-index="${idx}"]`);
            if (btn) {
                const choice = node.choices[idx];
                if (choice) handleChoice(choice, btn);
            }
            return;
        }

        // Backspace / Left arrow → undo (when not typing)
        if ((ev.key === 'Backspace' || ev.key === 'ArrowLeft') && state.path.length > 1) {
            ev.preventDefault();
            goBack();
            return;
        }

        // R → restart
        if (ev.key === 'r' || ev.key === 'R') {
            restart();
        }
    }

    // ============================================================
    // === RESTART ===============================================
    // ============================================================

    function restart() {
        if (state.isTransitioning) return;
        state.path = ['start'];
        state.currentId = 'start';
        state.decisionCount = 0;
        els.stage.classList.remove('is-epilogue');
        clearTimers();
        applyMood('dormant');
        updateTelemetry();
        navigateTo('start');
    }

    // ============================================================
    // === INIT ==================================================
    // ============================================================

    function init() {
        applyMood('dormant');
        updateTelemetry();
        initFlowField();

        els.restartBtn.addEventListener('click', restart);
        window.addEventListener('keydown', onKey);

        // Initial render
        const start = STORY.start;
        state.currentId = 'start';
        renderNode(start);
        updateHUD(start);
        updateConstellation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
