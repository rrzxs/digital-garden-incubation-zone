/* ============================================================
   Narrative Slice Studio — main.js
   Vanilla JS · no build · modular domain封装
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // === STORY DATA — 4 palettes, each a sliced micro-narrative
    // ============================================================
    const STORIES = {
        lighthouse: {
            title: '"The Lighthouse Keeper"',
            accent: '#00d2ff',
            slices: [
                { index: '01', mood: 'dawn',     duration: 18, title: 'First Light',   text: 'At 4:47 the keeper wakes. The lamp has not gone dark in eleven years. He pours coffee, watches the horizon bruise from black to indigo, and listens for the gulls that have not yet arrived.' },
                { index: '02', mood: 'tide',     duration: 22, title: 'The Rising Sea', text: 'By noon the water climbs three rungs of the iron stair. Salt eats the railing. He writes nothing of it in the log — the sea is always rising, he thinks, only some days it admits it.' },
                { index: '03', mood: 'storm',    duration: 26, title: 'Storm Glass',   text: 'The barometer falls faster than he can mark it. Rain comes sideways. Inside the lantern room the lens turns, indifferent, throwing its slow white blade across the furious water.' },
                { index: '04', mood: 'drift',    duration: 19, title: 'A Boat Adrift', text: 'A dinghy passes too close, no soul aboard. He fires the signal. No one comes. He notes the colour of the sail — ochre, sun-bleached — and forgets it for thirty years.' },
                { index: '05', mood: 'dusk',     duration: 21, title: 'The Visitor',   text: 'A child appears at the door, soaked, asking for warm water. He has questions. She has none. She drinks and leaves. The cup is still warm when the sun sets.' },
                { index: '06', mood: 'night',    duration: 24, title: 'Eleven Years',  text: 'Eleven years without a dark lamp. He touches the wick the way one touches a sleeping animal. Outside, the beam walks its long circle, faithful as a heartbeat no one else can hear.' },
                { index: '07', mood: 'transcend',duration: 24, title: 'The Final Sweep', text: 'In the morning the keeper is gone. The lamp keeps turning. The gulls arrive at last, as if they had only been waiting for permission, and the sea goes on admitting nothing.' }
            ]
        },
        garden: {
            title: '"The Slow Garden"',
            accent: '#38ef7d',
            slices: [
                { index: '01', mood: 'seed',     duration: 16, title: 'A Hole in Earth', text: 'She digs with bare fingers. The soil is cold, then warmer than expected. Something down there has been waiting for a long time. She drops the seed and covers it, guilty as a thief.' },
                { index: '02', mood: 'sprout',   duration: 19, title: 'Green Thread',   text: 'Nine days. Then a pale green thread, thinner than a wish, pushing upward through the crust. She apologises aloud for every doubt she ever held in the dark.' },
                { index: '03', mood: 'leaf',     duration: 22, title: 'First Leaf',     text: 'The leaf unfurls like a small fist opening. It turns to face the sun with the seriousness of a vow. She marks the day in pencil, then inks it over, afraid the pencil might fade.' },
                { index: '04', mood: 'bloom',    duration: 25, title: 'The Bloom',      text: 'It flowers on a Tuesday no one will remember. The colour has no name in any language she speaks. Bees arrive within the hour, as though they had been summoned by a bell.' },
                { index: '05', mood: 'fruit',    duration: 23, title: 'The Offering',   text: 'A single fruit, heavy, warm, smelling of rain and metal. She holds it for a long time before tasting. It tastes exactly the way patience is supposed to taste, she decides.' },
                { index: '06', mood: 'wilt',     duration: 20, title: 'Letting Go',     text: 'The petals fall without protest. The stem bows like a dancer leaving the stage. She gathers what remains and presses it flat between two pages of a book she will never reopen.' },
                { index: '07', mood: 'return',   duration: 21, title: 'Return to Soil', text: 'Snow covers the bed. Underneath, the roots dream in slow motion, counting the days until they are allowed to begin again. The garden is never truly empty, only resting.' }
            ]
        },
        voyage: {
            title: '"The Cartographer\'s Voyage"',
            accent: '#ffd200',
            slices: [
                { index: '01', mood: 'harbor',   duration: 17, title: 'Leaving Port',  text: 'The harbour smells of tar and old rope. He folds the last chart, kisses the wood of the dock for luck, and steps aboard. The ship does not look back. Neither, after a moment, does he.' },
                { index: '02', mood: 'open',     duration: 24, title: 'Open Water',    text: 'On the seventh day, land vanishes from every horizon. The sea becomes a mirror so complete he cannot tell which way is down. He draws a small circle on the chart and writes only the word: here.' },
                { index: '03', mood: 'storm',    duration: 26, title: 'The Tempest',   text: 'The sky turns the colour of a bruise. Waves taller than the mast walk the deck. He lashes himself to the wheel and laughs — not from courage, but because laughter is the only prayer left.' },
                { index: '04', mood: 'stars',    duration: 22, title: 'Reading Stars', text: 'The clouds part at midnight. He finds the pole star, then a second one no chart has ever recorded. He does not write it down. Some truths, he thinks, should remain between a man and the dark.' },
                { index: '05', mood: 'strange',  duration: 23, title: 'Strange Coast', text: 'Land appears where no land should be. The sand is violet. The trees lean inland, away from a wind that is not blowing. He anchors offshore and waits three days before rowing in.' },
                { index: '06', mood: 'return',   duration: 21, title: 'The Return',    text: 'He comes home older than his years. The harbour has not changed, but he has. He unfolds the chart and finds, to his horror, that none of the places he marked now exist on it.' },
                { index: '07', mood: 'legend',   duration: 21, title: 'Becoming Legend', text: 'He tells the story once, to a boy who will grow up to be a sailor. The boy tells it again, differently. By the third telling there is no ship, no storm — only a man who became the sea.' }
            ]
        },
        echo: {
            title: '"The Echo Room"',
            accent: '#fa71cd',
            slices: [
                { index: '01', mood: 'silence',  duration: 18, title: 'The Empty Room', text: 'The room has been silent for so long that silence has a texture. She steps inside and the silence steps aside, just slightly, to make room for her.' },
                { index: '02', mood: 'whisper',  duration: 20, title: 'A Whisper',      text: 'She whispers a single word. The room holds it for a long moment, turns it over, and gives it back slightly changed — older, perhaps, or kinder than she had intended.' },
                { index: '03', mood: 'voice',    duration: 23, title: 'Her Own Voice',  text: 'She speaks a full sentence. Four echoes return, each in a voice she almost recognises. One of them is hers, at seventeen. One is hers, but has not happened yet.' },
                { index: '04', mood: 'chorus',   duration: 25, title: 'The Chorus',     text: 'She sings. The room cannot help itself — it joins. Every wall becomes a throat. The ceiling hums a harmony she never wrote. She stands still and lets herself be sung.' },
                { index: '05', mood: 'memory',   duration: 22, title: 'Old Voices',     text: 'Voices she has loved begin to arrive from the corners. A grandmother. A teacher. A dog, somehow. She does not call them. They have been waiting in the walls the whole time.' },
                { index: '06', mood: 'letgo',    duration: 21, title: 'Letting Go',     text: 'She stops singing. The room keeps going for a while, finishing what she started, then slowly forgetting. The forgetting is the kindest sound she has ever heard.' },
                { index: '07', mood: 'rest',     duration: 21, title: 'Return to Silence', text: 'She leaves. The silence closes behind her like water. But now, she knows, it is not empty — only resting, holding everything that was ever said, waiting for the next person brave enough to whisper.' }
            ]
        }
    };

    // ============================================================
    // === DOM ELEMENTS
    // ============================================================
    const DOM = {
        body: document.body,
        stage: document.getElementById('stage'),
        coverTitle: document.querySelector('.cover-title'),
        tickerTitle: document.getElementById('ticker-title'),
        headCount: document.getElementById('head-count'),
        headTime: document.getElementById('head-time'),
        btnPlay: document.getElementById('btn-play'),
        btnShuffle: document.getElementById('btn-shuffle'),
        btnReset: document.getElementById('btn-reset'),
        moodOptions: document.getElementById('mood-options'),
        timelineTrack: document.getElementById('timeline-track'),
        playProgressFill: document.getElementById('play-progress-fill'),
        readingEmpty: document.getElementById('reading-empty'),
        readingBody: document.getElementById('reading-body'),
        readingIndex: document.getElementById('reading-index'),
        readingMood: document.getElementById('reading-mood'),
        readingDuration: document.getElementById('reading-duration'),
        readingTitle: document.getElementById('reading-title'),
        readingText: document.getElementById('reading-text'),
        readingPrev: document.getElementById('reading-prev'),
        readingNext: document.getElementById('reading-next'),
        readingPosition: document.getElementById('reading-position'),
        hudMode: document.getElementById('hud-mode'),
        hudActive: document.getElementById('hud-active'),
        hudCursor: document.getElementById('hud-cursor'),
        hudPulseBar: document.getElementById('hud-pulse-bar'),
        particleField: document.getElementById('particle-field')
    };

    // ============================================================
    // === STATE
    // ============================================================
    const STATE = {
        storyKey: 'lighthouse',
        order: [],          // current slice order indices
        activeIndex: -1,    // index within STATE.order
        isPlaying: false,
        playTimer: null,
        sliceEls: []        // mirrors STATE.order DOM refs
    };

    // ============================================================
    // === UTILITIES
    // ============================================================
    function getStory() { return STORIES[STATE.storyKey]; }

    function getSlices() {
        const story = getStory();
        return STATE.order.map(i => ({ ...story.slices[i], originalIndex: i }));
    }

    function fmtDuration(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return m + ':' + s;
    }

    function totalDuration() {
        return getStory().slices.reduce((a, s) => a + s.duration, 0);
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // ============================================================
    // === TITLE REVEAL — split into chars for staggered animation
    // ============================================================
    function initTitleReveal() {
        DOM.coverTitle.querySelectorAll('.reveal-chars').forEach((line, lineIdx) => {
            const text = line.getAttribute('data-text') || line.textContent;
            line.textContent = '';
            [...text].forEach((ch, i) => {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = ch === ' ' ? '\u00A0' : ch;
                span.style.animationDelay = ((lineIdx * 0.2) + (i * 0.04)) + 's';
                line.appendChild(span);
            });
        });
    }

    // ============================================================
    // === RENDER SLICES into the timeline
    // ============================================================
    function renderSlices() {
        const track = DOM.timelineTrack;
        // keep the spine, remove old slices
        track.querySelectorAll('.slice').forEach(el => el.remove());
        STATE.sliceEls = [];

        const slices = getSlices();
        slices.forEach((slice, displayIdx) => {
            const el = document.createElement('div');
            el.className = 'slice';
            el.setAttribute('data-display', displayIdx);
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', 'Slice ' + slice.index + ': ' + slice.title);

            // Split title into chars for hover reveal
            const titleChars = [...slice.title].map(ch => {
                const c = document.createElement('span');
                c.className = 'char';
                c.textContent = ch === ' ' ? '\u00A0' : ch;
                return c.outerHTML;
            }).join('');

            el.innerHTML =
                '<div class="slice-head">' +
                    '<span class="slice-index">' + slice.index + '</span>' +
                    '<span class="slice-mood">' + slice.mood + '</span>' +
                '</div>' +
                '<div class="slice-body">' +
                    '<h3 class="slice-title">' + titleChars + '</h3>' +
                '</div>' +
                '<div class="slice-foot">' +
                    '<span class="slice-duration">' + fmtDuration(slice.duration) + '</span>' +
                    '<span class="slice-bar"><span class="slice-bar-fill"></span></span>' +
                    '<span class="slice-marker">●</span>' +
                '</div>';

            attachSliceEvents(el, displayIdx);
            track.appendChild(el);
            STATE.sliceEls.push(el);
        });

        // staggered entrance
        requestAnimationFrame(() => {
            STATE.sliceEls.forEach((el, i) => {
                setTimeout(() => el.classList.add('is-in'), i * 80);
            });
        });

        updateTimelineMeta();
    }

    // ============================================================
    // === SLICE INTERACTIONS — hover tilt, click activate
    // ============================================================
    function attachSliceEvents(el, displayIdx) {
        // Pointer-follow highlight
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const mx = ((e.clientX - r.left) / r.width) * 100;
            const my = ((e.clientY - r.top) / r.height) * 100;
            el.style.setProperty('--mx', mx + '%');
            el.style.setProperty('--my', my + '%');

            // micro 3D tilt
            const rx = clamp(-((e.clientY - r.top) / r.height - 0.5) * 10, -5, 5);
            const ry = clamp(((e.clientX - r.left) / r.width - 0.5) * 10, -6, 6);
            if (!el.classList.contains('is-active') && !STATE.isPlaying) {
                el.style.transform = 'translateY(-8px) perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
            }
        });
        el.addEventListener('pointerleave', () => {
            if (!el.classList.contains('is-active') && !STATE.isPlaying) {
                el.style.transform = '';
            }
        });

        el.addEventListener('click', () => activateSlice(displayIdx));
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateSlice(displayIdx);
            }
        });
    }

    // ============================================================
    // === ACTIVATE SLICE — fill the reading pane
    // ============================================================
    function activateSlice(displayIdx) {
        if (displayIdx < 0 || displayIdx >= STATE.order.length) return;

        STATE.activeIndex = displayIdx;
        const slices = getSlices();
        const slice = slices[displayIdx];

        // mark active
        STATE.sliceEls.forEach(el => el.classList.remove('is-active'));
        const el = STATE.sliceEls[displayIdx];
        if (el) {
            el.classList.add('is-active', 'is-revealed');
            // scroll into view horizontally
            scrollSliceIntoView(el);
        }

        // fill reading pane
        DOM.readingEmpty.style.display = 'none';
        DOM.readingBody.hidden = false;
        DOM.readingIndex.textContent = 'SLICE ' + slice.index;
        DOM.readingMood.textContent = slice.mood;
        DOM.readingDuration.textContent = fmtDuration(slice.duration);
        DOM.readingTitle.textContent = slice.title;

        // typewriter-ish reveal of body
        typewriterText(slice.text);

        DOM.readingPosition.textContent = (displayIdx + 1) + ' of ' + slices.length;
        DOM.readingPrev.disabled = displayIdx === 0;
        DOM.readingNext.disabled = displayIdx === slices.length - 1;

        // HUD
        DOM.hudActive.textContent = slice.index + ' · ' + slice.title;
        if (!STATE.isPlaying) DOM.hudMode.textContent = 'READING';
    }

    function scrollSliceIntoView(el) {
        const track = DOM.timelineTrack;
        const tRect = track.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const offset = (eRect.left - tRect.left) - (tRect.width / 2) + (eRect.width / 2);
        track.scrollBy({ left: offset, behavior: 'smooth' });
    }

    function typewriterText(text) {
        const node = DOM.readingText;
        node.textContent = '';
        let i = 0;
        if (node._tw) clearInterval(node._tw);
        node._tw = setInterval(() => {
            node.textContent = text.slice(0, ++i);
            if (i >= text.length) clearInterval(node._tw);
        }, 12);
    }

    // ============================================================
    // === NAVIGATION — prev / next
    // ============================================================
    function navSlice(delta) {
        const next = STATE.activeIndex + delta;
        if (next < 0 || next >= STATE.order.length) return;
        activateSlice(next);
    }

    // ============================================================
    // === PLAY SEQUENCE — slices light up in order
    // ============================================================
    function togglePlay() {
        if (STATE.isPlaying) { stopPlay(); } else { startPlay(); }
    }

    function startPlay() {
        if (STATE.order.length === 0) return;
        STATE.isPlaying = true;
        DOM.btnPlay.classList.add('is-playing');
        DOM.btnPlay.querySelector('.btn-label').textContent = 'PAUSE';
        DOM.hudMode.textContent = 'PLAYING';

        let idx = STATE.activeIndex >= 0 ? STATE.activeIndex : 0;
        let elapsed = 0;
        const total = totalDuration();

        const tickSlice = () => {
            if (!STATE.isPlaying) return;
            if (idx >= STATE.order.length) { stopPlay(); return; }

            const slices = getSlices();
            const slice = slices[idx];

            // mark playing
            STATE.sliceEls.forEach(el => el.classList.remove('is-playing'));
            const el = STATE.sliceEls[idx];
            if (el) el.classList.add('is-playing');

            activateSlice(idx);

            // animate this slice's bar over its duration
            const bar = el ? el.querySelector('.slice-bar-fill') : null;
            const startT = performance.now();
            const durMs = slice.duration * 1000 / 4; // sped up for demo

            if (STATE.playTimer) clearInterval(STATE.playTimer);
            STATE.playTimer = setInterval(() => {
                if (!STATE.isPlaying) return;
                const p = clamp((performance.now() - startT) / durMs, 0, 1);
                if (bar) bar.style.width = (p * 100) + '%';
                const totalP = (elapsed + slice.duration * p) / total;
                DOM.playProgressFill.style.width = (totalP * 100) + '%';
                DOM.hudPulseBar.style.width = (p * 100) + '%';
                DOM.headTime.textContent = fmtDuration(Math.round(elapsed + slice.duration * p)) + ' / ' + fmtDuration(total);

                if (p >= 1) {
                    clearInterval(STATE.playTimer);
                    elapsed += slice.duration;
                    idx++;
                    setTimeout(tickSlice, 220);
                }
            }, 40);
        };

        tickSlice();
    }

    function stopPlay() {
        STATE.isPlaying = false;
        DOM.btnPlay.classList.remove('is-playing');
        DOM.btnPlay.querySelector('.btn-label').textContent = 'PLAY SEQUENCE';
        if (STATE.playTimer) clearInterval(STATE.playTimer);
        STATE.sliceEls.forEach(el => el.classList.remove('is-playing'));
        DOM.hudMode.textContent = STATE.activeIndex >= 0 ? 'READING' : 'IDLE';
        DOM.hudPulseBar.style.width = '0%';
    }

    // ============================================================
    // === SHUFFLE — randomise slice order
    // ============================================================
    function shuffleOrder() {
        stopPlay();
        const base = getStory().slices.map((_, i) => i);
        for (let i = base.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [base[i], base[j]] = [base[j], base[i]];
        }
        STATE.order = base;
        STATE.activeIndex = -1;
        resetReadingPane();
        renderSlices();
        flashHud('SHUFFLED');
    }

    // ============================================================
    // === RESET — restore original order
    // ============================================================
    function resetOrder() {
        stopPlay();
        STATE.order = getStory().slices.map((_, i) => i);
        STATE.activeIndex = -1;
        resetReadingPane();
        renderSlices();
        flashHud('RESET');
    }

    function resetReadingPane() {
        DOM.readingEmpty.style.display = '';
        DOM.readingBody.hidden = true;
        DOM.playProgressFill.style.width = '0%';
        DOM.headTime.textContent = '00:00 / ' + fmtDuration(totalDuration());
        DOM.hudActive.textContent = '—';
        DOM.hudMode.textContent = 'IDLE';
    }

    function updateTimelineMeta() {
        DOM.headCount.textContent =
            String(STATE.order.length).padStart(2, '0') + ' / ' +
            String(getStory().slices.length).padStart(2, '0');
        DOM.headTime.textContent = '00:00 / ' + fmtDuration(totalDuration());
    }

    // ============================================================
    // === MOOD / STORY SWITCH
    // ============================================================
    function switchStory(key) {
        if (!STORIES[key] || key === STATE.storyKey) return;
        stopPlay();
        STATE.storyKey = key;
        STATE.order = STORIES[key].slices.map((_, i) => i);
        STATE.activeIndex = -1;

        DOM.body.setAttribute('data-story', key);
        DOM.tickerTitle.textContent = STORIES[key].title + ' — ' + STORIES[key].slices.length + ' slices';

        // update active chip
        DOM.moodOptions.querySelectorAll('.mood-chip').forEach(c => {
            c.classList.toggle('is-active', c.getAttribute('data-story') === key);
        });

        resetReadingPane();
        renderSlices();
        flashHud('STORY: ' + key.toUpperCase());
    }

    // ============================================================
    // === HUD FLASH
    // ============================================================
    let hudFlashTimer = null;
    function flashHud(msg) {
        DOM.hudMode.textContent = msg;
        if (hudFlashTimer) clearTimeout(hudFlashTimer);
        hudFlashTimer = setTimeout(() => {
            DOM.hudMode.textContent = STATE.isPlaying ? 'PLAYING' : (STATE.activeIndex >= 0 ? 'READING' : 'IDLE');
        }, 1200);
    }

    // ============================================================
    // === GLOBAL CURSOR HUD
    // ============================================================
    function bindCursorHud() {
        window.addEventListener('pointermove', (e) => {
            const x = (e.clientX / window.innerWidth).toFixed(2);
            const y = (e.clientY / window.innerHeight).toFixed(2);
            DOM.hudCursor.textContent = x + ', ' + y;
        });
    }

    // ============================================================
    // === PARTICLE FIELD — ambient drifting motes on canvas
    // ============================================================
    function initParticleField() {
        const canvas = DOM.particleField;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
        let particles = [];

        function resize() {
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.max(1, w * dpr);
            canvas.height = Math.max(1, h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            spawn();
        }

        function spawn() {
            const count = Math.floor(clamp((w * h) / 18000, 40, 110));
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 1.6 + 0.4,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.18,
                    a: Math.random() * 0.5 + 0.1,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        function accentColor() {
            return getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#00d2ff';
        }

        let t = 0;
        function frame() {
            t += 0.016;
            ctx.clearRect(0, 0, w, h);
            const accent = accentColor();
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                const flicker = 0.6 + 0.4 * Math.sin(t * 1.2 + p.phase);
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
                ctx.fillStyle = accent;
                ctx.globalAlpha = p.a * flicker;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener('resize', resize);
        frame();
    }

    // ============================================================
    // === EVENT BINDINGS
    // ============================================================
    function bindEvents() {
        DOM.btnPlay.addEventListener('click', togglePlay);
        DOM.btnShuffle.addEventListener('click', shuffleOrder);
        DOM.btnReset.addEventListener('click', resetOrder);

        DOM.readingPrev.addEventListener('click', () => navSlice(-1));
        DOM.readingNext.addEventListener('click', () => navSlice(1));

        DOM.moodOptions.addEventListener('click', (e) => {
            const chip = e.target.closest('.mood-chip');
            if (!chip) return;
            switchStory(chip.getAttribute('data-story'));
        });

        // keyboard arrows for navigation when reading
        window.addEventListener('keydown', (e) => {
            if (STATE.activeIndex < 0) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); navSlice(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); navSlice(1); }
            if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlay(); }
        });
    }

    // ============================================================
    // === INIT
    // ============================================================
    function init() {
        STATE.order = getStory().slices.map((_, i) => i);
        initTitleReveal();
        renderSlices();
        bindEvents();
        bindCursorHud();
        initParticleField();
        DOM.tickerTitle.textContent = getStory().title + ' — ' + getStory().slices.length + ' slices';
        DOM.body.setAttribute('data-story', STATE.storyKey);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
