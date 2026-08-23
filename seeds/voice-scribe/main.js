/**
 * Voice Scribe · 声之誊写员
 * 沉浸式语音誊写体验：Web Speech API 实时转写 + Web Audio 波形可视化
 * + 微晶玻璃态声档管理 + 演示模式回退 + 本地持久化
 */
(function () {
    'use strict';

    // === DOM Elements ===
    const body = document.body;
    const micBtn = document.getElementById('mic-btn');
    const micState = document.getElementById('mic-state');
    const micHint = document.getElementById('mic-hint');
    const waveCanvas = document.getElementById('wave-canvas');
    const transcriptEl = document.getElementById('transcript');
    const transcriptPlaceholder = document.getElementById('transcript-placeholder');
    const sessionClock = document.getElementById('session-clock');
    const sessionCount = document.getElementById('session-count');
    const btnDemo = document.getElementById('btn-demo');
    const btnCopy = document.getElementById('btn-copy');
    const btnClear = document.getElementById('btn-clear');
    const btnSave = document.getElementById('btn-save');
    const archiveGrid = document.getElementById('archive-grid');
    const archiveEmpty = document.getElementById('archive-empty');
    const archiveCount = document.getElementById('archive-count');
    const btnExportMd = document.getElementById('btn-export-md');
    const btnClearArchive = document.getElementById('btn-clear-archive');
    const themePicker = document.getElementById('theme-picker');
    const toastZone = document.getElementById('toast-zone');
    const statNotes = document.getElementById('stat-notes');
    const statWords = document.getElementById('stat-words');
    const statDuration = document.getElementById('stat-duration');

    // === State ===
    const state = {
        listening: false,
        demoing: false,
        finalText: '',
        interimText: '',
        sessionStart: 0,
        clockTimer: null,
        recognition: null,
        audioCtx: null,
        analyser: null,
        mediaStream: null,
        waveRaf: null,
        demoTimer: null,
        notes: [],
        noteSeq: 1
    };

    const STORE_KEY = 'voice-scribe.notes.v1';
    const THEME_KEY = 'voice-scribe.theme';

    // === Toast ===
    function toast(message, tone = 'ok') {
        const el = document.createElement('div');
        el.className = `toast glass ${tone}`;
        el.textContent = message;
        toastZone.appendChild(el);
        setTimeout(() => el.remove(), 3400);
    }

    // === Theme ===
    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY) || 'aurora';
        body.dataset.theme = saved;
    }

    themePicker.addEventListener('click', (e) => {
        const dot = e.target.closest('.theme-dot');
        if (!dot) return;
        body.dataset.theme = dot.dataset.theme;
        localStorage.setItem(THEME_KEY, dot.dataset.theme);
    });

    // === Transcript Rendering ===
    function renderTranscript() {
        transcriptEl.innerHTML = '';
        if (!state.finalText && !state.interimText) {
            transcriptEl.appendChild(transcriptPlaceholder);
            return;
        }
        if (state.finalText) {
            const line = document.createElement('span');
            line.className = 'final-line';
            line.textContent = state.finalText;
            transcriptEl.appendChild(line);
        }
        if (state.interimText) {
            const interim = document.createElement('span');
            interim.className = 'interim-line';
            interim.textContent = state.interimText;
            transcriptEl.appendChild(interim);
        }
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
        const total = (state.finalText + state.interimText).length;
        sessionCount.textContent = `${total} chars`;
    }

    // === Session Clock ===
    function fmtClock(ms) {
        const s = ms / 1000;
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(Math.floor(s % 60)).padStart(2, '0');
        const d = Math.floor((s % 1) * 10);
        return `${mm}:${ss}.${d}`;
    }

    function startClock() {
        state.sessionStart = performance.now();
        clearInterval(state.clockTimer);
        state.clockTimer = setInterval(() => {
            sessionClock.textContent = fmtClock(performance.now() - state.sessionStart);
        }, 100);
    }

    function stopClock() {
        clearInterval(state.clockTimer);
        state.clockTimer = null;
    }

    // === Waveform (Web Audio Analyser) ===
    function setupWave(stream) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        state.mediaStream = stream;
        const source = state.audioCtx.createMediaStreamSource(stream);
        const analyser = state.audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        state.analyser = analyser;
        drawWave();
    }

    function teardownWave() {
        cancelAnimationFrame(state.waveRaf);
        state.waveRaf = null;
        state.analyser = null;
        if (state.mediaStream) {
            state.mediaStream.getTracks().forEach((t) => t.stop());
            state.mediaStream = null;
        }
        if (state.audioCtx) {
            state.audioCtx.close().catch(() => {});
            state.audioCtx = null;
        }
        clearCanvas();
    }

    function clearCanvas() {
        const dpr = window.devicePixelRatio || 1;
        waveCanvas.width = waveCanvas.clientWidth * dpr;
        waveCanvas.height = waveCanvas.clientHeight * dpr;
        const ctx = waveCanvas.getContext('2d');
        ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    }

    const accentColor = () =>
        getComputedStyle(body).getPropertyValue('--accent').trim() || '#22d3ee';

    function drawWave() {
        const dpr = window.devicePixelRatio || 1;
        const w = waveCanvas.clientWidth * dpr;
        const h = waveCanvas.clientHeight * dpr;
        if (waveCanvas.width !== w) { waveCanvas.width = w; waveCanvas.height = h; }
        const ctx = waveCanvas.getContext('2d');
        const buf = new Uint8Array(state.analyser.fftSize);

        function frame(time) {
            state.analyser.getByteTimeDomainData(buf);
            ctx.clearRect(0, 0, w, h);
            const color = accentColor();
            ctx.lineWidth = 2 * dpr;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12 * dpr;
            ctx.beginPath();
            const step = w / buf.length;
            for (let i = 0; i < buf.length; i++) {
                const v = (buf[i] - 128) / 128;
                const y = h / 2 + v * (h / 2 - 6 * dpr);
                if (i === 0) ctx.moveTo(0, y);
                else ctx.lineTo(i * step, y);
            }
            ctx.stroke();
            state.waveRaf = requestAnimationFrame(frame);
        }
        state.waveRaf = requestAnimationFrame(frame);
    }

    // === Synthetic Wave (演示模式) ===
    function drawSyntheticWave() {
        const dpr = window.devicePixelRatio || 1;
        const w = waveCanvas.clientWidth * dpr;
        const h = waveCanvas.clientHeight * dpr;
        if (waveCanvas.width !== w) { waveCanvas.width = w; waveCanvas.height = h; }
        const ctx = waveCanvas.getContext('2d');

        function frame(time) {
            ctx.clearRect(0, 0, w, h);
            const color = accentColor();
            ctx.lineWidth = 2 * dpr;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12 * dpr;
            ctx.beginPath();
            const t = time / 1000;
            const N = 160;
            for (let i = 0; i <= N; i++) {
                const x = (i / N) * w;
                const env = Math.sin((i / N) * Math.PI) ** 1.4;
                const y = h / 2
                    + Math.sin(i * 0.35 + t * 9) * env * (h * 0.3)
                    + Math.sin(i * 0.11 - t * 5) * env * (h * 0.1);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            state.waveRaf = requestAnimationFrame(frame);
        }
        state.waveRaf = requestAnimationFrame(frame);
    }

    // === Speech Recognition ===
    function getRecognitionCtor() {
        return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }

    function startListening() {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
            toast('当前浏览器不支持语音识别，已切换至演示模式', 'err');
            startDemo();
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                setupWave(stream);
                const rec = new Ctor();
                rec.lang = 'zh-CN';
                rec.continuous = true;
                rec.interimResults = true;

                rec.onresult = (event) => {
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        if (result.isFinal) {
                            state.finalText += result[0].transcript.trim() + '。';
                        } else {
                            interim += result[0].transcript;
                        }
                    }
                    state.interimText = interim;
                    renderTranscript();
                };

                rec.onerror = (event) => {
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        toast('麦克风权限被拒绝，已切换至演示模式', 'err');
                        stopListening();
                        startDemo();
                    } else if (event.error !== 'no-speech') {
                        toast(`识别错误: ${event.error}`, 'err');
                    }
                };

                rec.onend = () => {
                    if (state.listening) {
                        // Chrome 会自动断流，重新拉起以保持连续聆听
                        try { rec.start(); } catch (_) { /* shutting down */ }
                    }
                };

                state.recognition = rec;
                rec.start();
                state.listening = true;
                body.classList.add('listening');
                micState.textContent = '正在聆听…';
                micHint.textContent = '再次轻触可结束誊写';
                startClock();
                toast('誊写员已苏醒，请开始诉说');
            })
            .catch(() => {
                toast('无法访问麦克风，已切换至演示模式', 'err');
                startDemo();
            });
    }

    function stopListening() {
        state.listening = false;
        body.classList.remove('listening');
        if (state.recognition) {
            state.recognition.onend = null;
            try { state.recognition.stop(); } catch (_) {}
            state.recognition = null;
        }
        if (state.interimText) {
            state.finalText += state.interimText.trim();
            state.interimText = '';
        }
        renderTranscript();
        teardownWave();
        stopClock();
        if (!state.demoing) {
            micState.textContent = '轻触唤醒誊写员';
            micHint.textContent = '语音将被实时誊写为文字';
        }
    }

    micBtn.addEventListener('click', () => {
        if (state.demoing) stopDemo();
        if (state.listening) stopListening();
        else startListening();
    });

    // === Demo Mode（无麦克风 / 无 Speech API 的回退体验） ===
    const DEMO_LINES = [
        '声音是思想的河流，',
        '而文字是它留下的河床。',
        '每一次呼吸之间，',
        '语言便从空气里凝结成光。',
        '我在此静静聆听，',
        '把你说过的话，',
        '一一誊写进时间的玻璃。',
        '当浪潮退去，',
        '沙滩上留下的，',
        '是你灵魂形状的印记。'
    ];

    function startDemo() {
        state.demoing = true;
        body.classList.add('demoing');
        micState.textContent = '演示模式 · 模拟聆听';
        micHint.textContent = '誊写员正在诵读一首关于声音的诗';
        drawSyntheticWave();
        startClock();
        let lineIdx = 0;
        let charIdx = 0;
        state.demoTimer = setInterval(() => {
            if (lineIdx >= DEMO_LINES.length) {
                stopDemo();
                toast('演示誊写完成');
                return;
            }
            const line = DEMO_LINES[lineIdx];
            if (charIdx <= line.length) {
                state.interimText = line.slice(0, charIdx);
                charIdx++;
            } else {
                state.finalText += line;
                state.interimText = '';
                lineIdx++;
                charIdx = 0;
            }
            renderTranscript();
        }, 120);
    }

    function stopDemo() {
        state.demoing = false;
        body.classList.remove('demoing');
        clearInterval(state.demoTimer);
        state.demoTimer = null;
        cancelAnimationFrame(state.waveRaf);
        state.waveRaf = null;
        clearCanvas();
        stopClock();
        micState.textContent = '轻触唤醒誊写员';
        micHint.textContent = '语音将被实时誊写为文字';
    }

    btnDemo.addEventListener('click', () => {
        if (state.listening) stopListening();
        if (state.demoing) stopDemo();
        state.finalText = '';
        state.interimText = '';
        renderTranscript();
        sessionClock.textContent = '00:00.0';
        startDemo();
    });

    // === Transcript Actions ===
    btnCopy.addEventListener('click', async () => {
        const text = (state.finalText + state.interimText).trim();
        if (!text) { toast('还没有可誊写的内容', 'err'); return; }
        try {
            await navigator.clipboard.writeText(text);
            toast('已复制到剪贴板');
        } catch {
            toast('复制失败，请手动选择文本', 'err');
        }
    });

    btnClear.addEventListener('click', () => {
        if (state.listening) stopListening();
        if (state.demoing) stopDemo();
        state.finalText = '';
        state.interimText = '';
        renderTranscript();
        sessionClock.textContent = '00:00.0';
        toast('誊写台已清空');
    });

    // === Notes Archive ===
    function loadNotes() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            const data = raw ? JSON.parse(raw) : null;
            if (data && Array.isArray(data.notes)) {
                state.notes = data.notes;
                state.noteSeq = data.seq || data.notes.length + 1;
            }
        } catch { /* corrupted store, start fresh */ }
    }

    function saveNotes() {
        localStorage.setItem(STORE_KEY, JSON.stringify({
            notes: state.notes,
            seq: state.noteSeq
        }));
    }

    function countWords(text) {
        return text.replace(/\s/g, '').length;
    }

    function updateStats() {
        statNotes.textContent = state.notes.length;
        statWords.textContent = state.notes.reduce((sum, n) => sum + n.words, 0);
        const totalMs = state.notes.reduce((sum, n) => sum + (n.durationMs || 0), 0);
        const mm = String(Math.floor(totalMs / 60000)).padStart(2, '0');
        const ss = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
        statDuration.textContent = `${mm}:${ss}`;
    }

    function fmtStamp(ts) {
        const d = new Date(ts);
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function renderNotes() {
        archiveGrid.querySelectorAll('.note-card').forEach((c) => c.remove());
        archiveEmpty.style.display = state.notes.length ? 'none' : '';
        archiveCount.textContent = state.notes.length;

        state.notes
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .forEach((note, i) => {
                archiveGrid.appendChild(createNoteCard(note, i));
            });
        updateStats();
    }

    function createNoteCard(note, index) {
        const card = document.createElement('article');
        card.className = 'note-card glass';
        card.style.animationDelay = `${index * 0.06}s`;

        const head = document.createElement('div');
        head.className = 'note-head';
        head.innerHTML = `
            <span class="note-id">#${String(note.id).padStart(3, '0')}</span>
            <span>${fmtStamp(note.ts)}</span>`;

        const bodyEl = document.createElement('p');
        bodyEl.className = 'note-body';
        bodyEl.textContent = note.text;

        const foot = document.createElement('div');
        foot.className = 'note-foot';

        const stats = document.createElement('span');
        stats.className = 'note-stats';
        const dur = note.durationMs ? fmtClock(note.durationMs).slice(0, 5) : '--:--';
        stats.textContent = `${note.words} 字 · ${dur}`;

        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const btnCopyNote = document.createElement('button');
        btnCopyNote.className = 'note-btn';
        btnCopyNote.textContent = '⧉';
        btnCopyNote.title = '复制全文';
        btnCopyNote.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(note.text);
                toast(`声档 #${String(note.id).padStart(3, '0')} 已复制`);
            } catch {
                toast('复制失败', 'err');
            }
        });

        const btnDelNote = document.createElement('button');
        btnDelNote.className = 'note-btn';
        btnDelNote.textContent = '✕';
        btnDelNote.title = '焚毁此声档';
        btnDelNote.addEventListener('click', () => {
            card.style.transition = 'opacity 0.45s var(--ease), transform 0.45s var(--ease)';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.88) translateY(10px)';
            setTimeout(() => {
                state.notes = state.notes.filter((n) => n.id !== note.id);
                saveNotes();
                renderNotes();
                toast('声档已焚毁');
            }, 420);
        });

        actions.append(btnCopyNote, btnDelNote);
        foot.append(stats, actions);
        card.append(head, bodyEl, foot);
        return card;
    }

    btnSave.addEventListener('click', () => {
        const text = (state.finalText + state.interimText).trim();
        if (!text) { toast('空白的声之页无法存档', 'err'); return; }
        const durationMs = performance.now() - state.sessionStart;
        state.notes.push({
            id: state.noteSeq++,
            ts: Date.now(),
            text,
            words: countWords(text),
            durationMs: state.clockTimer || state.demoing ? durationMs : 0
        });
        saveNotes();
        renderNotes();
        state.finalText = '';
        state.interimText = '';
        renderTranscript();
        sessionClock.textContent = '00:00.0';
        toast('已存入声档');
    });

    btnExportMd.addEventListener('click', () => {
        if (!state.notes.length) { toast('声档为空，无可导出', 'err'); return; }
        const lines = ['# Voice Scribe · 声之誊写档案', ''];
        state.notes
            .slice()
            .sort((a, b) => a.ts - b.ts)
            .forEach((n) => {
                lines.push(`## #${String(n.id).padStart(3, '0')} · ${fmtStamp(n.ts)}`);
                lines.push('');
                lines.push(n.text);
                lines.push('');
                lines.push(`> ${n.words} 字 · ${n.durationMs ? fmtClock(n.durationMs).slice(0, 5) : '--:--'}`);
                lines.push('');
            });
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `voice-scribe-archive-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Markdown 档案已导出');
    });

    btnClearArchive.addEventListener('click', () => {
        if (!state.notes.length) { toast('声档已经是空的', 'err'); return; }
        state.notes = [];
        saveNotes();
        renderNotes();
        toast('所有声档已焚毁于流火');
    });

    // === Resize Handling ===
    window.addEventListener('resize', () => {
        if (!state.waveRaf) clearCanvas();
    });

    // === Boot ===
    initTheme();
    loadNotes();
    renderNotes();
    renderTranscript();
})();
