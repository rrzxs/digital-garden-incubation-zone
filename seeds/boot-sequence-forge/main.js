/**
 * Boot Sequence Forge · 开机序列锻造炉
 * 自定义开机步骤 → CRT 舞台实时锻造：打字机、状态徽章、进度、故障闪烁与电子束开机
 */
(() => {
    'use strict';

    // === DOM Elements ===
    const el = {
        stepList: document.getElementById('step-list'),
        stepCountBadge: document.getElementById('step-count-badge'),
        btnAddStep: document.getElementById('btn-add-step'),
        timeEstimate: document.getElementById('time-estimate'),
        btnExport: document.getElementById('btn-export'),
        btnForge: document.getElementById('btn-forge'),
        btnSfx: document.getElementById('btn-sfx'),
        sfxLabel: document.getElementById('sfx-label'),
        speedRange: document.getElementById('speed-range'),
        speedValue: document.getElementById('speed-value'),
        crtScreen: document.getElementById('crt-screen'),
        crtFlash: document.getElementById('crt-flash'),
        bootLines: document.getElementById('boot-lines'),
        bootBanner: document.getElementById('boot-banner'),
        bootHint: document.getElementById('boot-hint'),
        progressFill: document.getElementById('boot-progress-fill'),
        progressLabel: document.getElementById('progress-label'),
        progressPercent: document.getElementById('progress-percent'),
        statusState: document.getElementById('status-state'),
        statusUptime: document.getElementById('status-uptime'),
        statusMeta: document.getElementById('status-meta'),
        termLed: document.getElementById('term-led'),
        termTitle: document.getElementById('term-title'),
        toast: document.getElementById('toast')
    };

    // === State ===
    const state = {
        steps: [],
        speed: 1,
        sfx: true,
        theme: 'phosphor',
        runId: 0,
        phase: 'idle', // idle | running | ready
        bootStartAt: 0,
        uptimeTimer: null,
        toastTimer: null
    };

    const STATUS_META = {
        ok:   { label: '[ OK ]',   cls: 'st-ok' },
        fail: { label: '[ FAIL ]', cls: 'st-fail' },
        warn: { label: '[ WARN ]', cls: 'st-warn' },
        info: { label: '[ .. ]',   cls: 'st-info' },
        skip: { label: '[SKIP]',   cls: 'st-skip' }
    };

    const BASE_CHAR_MS = 14;   // 单字符打字基准时长
    const BASE_GAP_MS = 10;    // 字符间基准间隔

    // === Presets（预设序列图纸） ===
    const PRESETS = {
        bios: {
            title: 'AWARD MODULAR BIOS v6.00PG · EDEN FORGE BOARD',
            tty: 'bios@garden: ~/boot — POST 115200 baud',
            banner: [
                '  ██▓▓██▓▓  BOOT SEQUENCE FORGE  ██▓▓██▓▓',
                '  ─────────────────────────────────────────'
            ].join('\n'),
            steps: [
                { t: 'CPU : EDEN Quantum Core Q9-9900 @ 9.90 GHz', s: 'ok', d: 160 },
                { t: 'Memory Test : 65536K OK', s: 'ok', d: 220 },
                { t: 'Detecting IDE Primary Master ... FORGE-SSD 1TB', s: 'ok', d: 140 },
                { t: 'Detecting IDE Primary Slave  ... None', s: 'skip', d: 120 },
                { t: 'Initializing USB Controllers .. Done', s: 'ok', d: 130 },
                { t: 'CMOS Battery Check .. LOW', s: 'warn', d: 180 },
                { t: 'Boot Device Priority : NVMe0 > SSD0 > NET', s: 'info', d: 140 },
                { t: 'Verifying DMI Pool Data ........', s: 'ok', d: 300 },
                { t: 'Loading GRUB stage 2 .. corrupted signature', s: 'fail', d: 260 },
                { t: 'Fallback : EDEN Recovery Shell', s: 'ok', d: 200 }
            ]
        },
        dmesg: {
            title: 'Linux kernel 6.9.0-forge · tty1',
            tty: 'dmesg@garden: ~/boot — tty1 57600 baud',
            banner: [
                '  [    0.000000] Linux version 6.9.0-forge (eden@garden)',
                '  ─────────────────────────────────────────'
            ].join('\n'),
            steps: [
                { t: '[    0.000001] Command line: BOOT_IMAGE=/vmlinuz root=/dev/nvme0n1p2 quiet', s: 'info', d: 90 },
                { t: '[    0.042001] ACPI: Core revision 20240115', s: 'ok', d: 110 },
                { t: '[    0.104442] nvme nvme0: 4/4/0 default/read/poll queues', s: 'ok', d: 100 },
                { t: '[    0.210003] EXT4-fs (nvme0n1p2): mounted filesystem with ordered data mode', s: 'ok', d: 130 },
                { t: '[    0.318772] e1000e 0000:00:1f.6 eth0: link is up 1000 Mbps', s: 'ok', d: 120 },
                { t: '[    0.402561] random: crng init done (trust the garden)', s: 'ok', d: 140 },
                { t: '[    0.512004] usb 3-2: device descriptor read/64, error -71', s: 'fail', d: 160 },
                { t: '[    0.588120] systemd[1]: Reached target Basic System', s: 'ok', d: 110 },
                { t: '[    0.701230] Forge Daemon v1.0 awaken .. listening :9527', s: 'ok', d: 180 },
                { t: '[    0.840001] garden: seed zone mounted, 142 seeds online', s: 'ok', d: 200 }
            ]
        },
        cyber: {
            title: 'NEURAL DECK ONO-SENDAI MK·Ⅶ · ICE BREAK',
            tty: 'ghost@garden: ~/cyberdeck — neural link 2.4 TB/s',
            banner: [
                '  ▓▒░ ONO-SENDAI CYBERDECK ｵﾉ・ｾﾝﾀﾞｲ ░▒▓',
                '  ─────────────────────────────────────────'
            ].join('\n'),
            steps: [
                { t: '> jacking in .. neural handshake', s: 'info', d: 200 },
                { t: '> ICE probe :: black wall detected', s: 'warn', d: 180 },
                { t: '> deploying MUFFIN.exe against layer 1', s: 'ok', d: 150 },
                { t: '> decrypting access keys ░▒▓ 0x8F2A', s: 'ok', d: 170 },
                { t: '> spoofing biosignature :: ARASAKA-RANK', s: 'ok', d: 140 },
                { t: '> daemon WATCHDOG traced our ghost ..', s: 'fail', d: 240 },
                { t: '> burning decoy process, rerouting thru garden', s: 'ok', d: 190 },
                { t: '> loading EDEN kernel extension .. 9.4 EB/s', s: 'ok', d: 160 },
                { t: '> the garden dreams in 142 seeds tonight', s: 'info', d: 220 }
            ]
        },
        navi: {
            title: 'STARSHIP NAVIGATION COMPUTER · CASTOR-Ⅸ',
            tty: 'navi@garden: ~/boot — subspace 8.8 ly/ms',
            banner: [
                '  ▲△ NAVIGATION CORE :: CASTOR-IX △▲',
                '  ─────────────────────────────────────────'
            ].join('\n'),
            steps: [
                { t: 'reactor ignition .. cold start sequence', s: 'info', d: 220 },
                { t: 'fusion core temperature : 9.6×10⁷ K .. stable', s: 'ok', d: 150 },
                { t: 'gyroscope array alignment .. 0.0002° drift', s: 'ok', d: 130 },
                { t: 'star chart sync :: 412,097 bodies catalogued', s: 'ok', d: 160 },
                { t: 'subspace antenna calibration .. noisy', s: 'warn', d: 180 },
                { t: 'cryo bay 3 seal integrity .. breach', s: 'fail', d: 240 },
                { t: 'emergency foam deployed, resealed', s: 'ok', d: 170 },
                { t: 'destination locked :: EDEN GARDEN, 4.2 ly', s: 'ok', d: 200 },
                { t: 'all hands, prepare for jump', s: 'info', d: 260 }
            ]
        }
    };

    // === Audio Engine（Web Audio 合成蜂鸣） ===
    const AudioForge = (() => {
        let ctx = null;

        function ensure() {
            if (!state.sfx) return null;
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                ctx = new AC();
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        function tone(freq, duration, type = 'square', gain = 0.035) {
            const ac = ensure();
            if (!ac) return;
            const osc = ac.createOscillator();
            const amp = ac.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            amp.gain.setValueAtTime(gain, ac.currentTime);
            amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
            osc.connect(amp).connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + duration);
        }

        return {
            key:     () => tone(1800 + Math.random() * 500, 0.02, 'square', 0.012),
            post:    () => tone(880, 0.14, 'square', 0.05),
            ok:      () => tone(1320, 0.05, 'square', 0.025),
            fail:    () => { tone(220, 0.12, 'sawtooth', 0.05); setTimeout(() => tone(160, 0.18, 'sawtooth', 0.05), 90); },
            warn:    () => tone(660, 0.08, 'triangle', 0.035),
            ready:   () => { tone(523, 0.09, 'triangle', 0.045); setTimeout(() => tone(659, 0.09, 'triangle', 0.045), 100); setTimeout(() => tone(784, 0.16, 'triangle', 0.05), 200); },
            launch:  () => tone(120, 0.5, 'sawtooth', 0.06)
        };
    })();

    // === 工具函数 ===
    const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms / state.speed)));
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function toast(msg) {
        el.toast.textContent = msg;
        el.toast.classList.add('show');
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
    }

    // === Step Editor（序列图纸编辑器） ===
    function renderSteps(animateFrom = -1) {
        el.stepList.innerHTML = '';
        state.steps.forEach((step, i) => {
            const li = document.createElement('li');
            li.className = 'step-row';
            li.draggable = true;
            li.dataset.index = i;
            if (i === animateFrom) {
                li.style.animation = 'step-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both';
            } else {
                li.style.animation = 'none';
            }
            li.innerHTML = `
                <span class="step-handle" title="拖拽排序">⠿</span>
                <input class="step-text" type="text" value="${escapeHtml(step.t)}" placeholder="启动步骤描述…" maxlength="90">
                <select class="step-status" title="状态徽章">
                    ${Object.entries(STATUS_META).map(([k, v]) =>
                        `<option value="${k}" ${step.s === k ? 'selected' : ''}>${v.label.trim()}</option>`).join('')}
                </select>
                <input class="step-delay" type="number" min="0" max="2000" step="10" value="${step.d}" title="停留毫秒">
                <button class="step-del" title="删除步骤">✕</button>
            `;
            el.stepList.appendChild(li);
        });
        updateMeta();
    }

    function updateMeta() {
        el.stepCountBadge.textContent = `${state.steps.length} STEPS`;
        const totalMs = state.steps.reduce(
            (sum, s) => sum + s.t.length * (BASE_CHAR_MS + BASE_GAP_MS) + s.d + 60, 0
        ) / state.speed;
        el.timeEstimate.textContent = `${(totalMs / 1000).toFixed(1)}s`;
    }

    function bindStepEvents() {
        el.stepList.addEventListener('input', (e) => {
            const row = e.target.closest('.step-row');
            if (!row) return;
            const step = state.steps[+row.dataset.index];
            if (!step) return;
            if (e.target.classList.contains('step-text')) step.t = e.target.value;
            if (e.target.classList.contains('step-delay')) step.d = Math.min(2000, Math.max(0, +e.target.value || 0));
            updateMeta();
        });

        el.stepList.addEventListener('change', (e) => {
            if (e.target.classList.contains('step-status')) {
                const row = e.target.closest('.step-row');
                const step = state.steps[+row.dataset.index];
                if (step) step.s = e.target.value;
            }
        });

        el.stepList.addEventListener('click', (e) => {
            if (!e.target.classList.contains('step-del')) return;
            const row = e.target.closest('.step-row');
            const idx = +row.dataset.index;
            row.style.transition = 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            row.style.opacity = '0';
            row.style.transform = 'translateX(24px) scale(0.95)';
            setTimeout(() => {
                state.steps.splice(idx, 1);
                renderSteps();
            }, 260);
        });

        // HTML5 拖拽重排序
        let dragSrcIdx = -1;

        el.stepList.addEventListener('dragstart', (e) => {
            const row = e.target.closest('.step-row');
            if (!row) return;
            dragSrcIdx = +row.dataset.index;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(dragSrcIdx));
        });

        el.stepList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const row = e.target.closest('.step-row');
            el.stepList.querySelectorAll('.step-row').forEach((r) => r.classList.remove('drop-target'));
            if (row && +row.dataset.index !== dragSrcIdx) row.classList.add('drop-target');
        });

        el.stepList.addEventListener('dragleave', (e) => {
            const row = e.target.closest('.step-row');
            if (row) row.classList.remove('drop-target');
        });

        el.stepList.addEventListener('drop', (e) => {
            e.preventDefault();
            const row = e.target.closest('.step-row');
            if (!row || dragSrcIdx < 0) return;
            const targetIdx = +row.dataset.index;
            if (targetIdx !== dragSrcIdx) {
                const [moved] = state.steps.splice(dragSrcIdx, 1);
                state.steps.splice(targetIdx, 0, moved);
                AudioForge.key();
                renderSteps();
            }
            dragSrcIdx = -1;
        });

        el.stepList.addEventListener('dragend', () => {
            el.stepList.querySelectorAll('.step-row').forEach((r) => r.classList.remove('dragging', 'drop-target'));
            dragSrcIdx = -1;
        });
    }

    function addStep() {
        state.steps.push({ t: 'custom module init .. ', s: 'ok', d: 140 });
        renderSteps(state.steps.length - 1);
        el.stepList.scrollTop = el.stepList.scrollHeight;
        const last = el.stepList.querySelector('.step-row:last-child .step-text');
        if (last) { last.focus(); last.setSelectionRange(last.value.length, last.value.length); }
    }

    function applyPreset(key) {
        const preset = PRESETS[key];
        if (!preset) return;
        state.steps = preset.steps.map((s) => ({ ...s }));
        state.presetKey = key;
        el.termTitle.textContent = preset.tty;
        el.bootBanner.textContent = preset.banner;
        renderSteps();
        toast(`图纸已装载 · ${preset.title}`);
    }

    // === Boot Player（CRT 锻造播放器） ===
    async function typeLine(lineEl, text, runId) {
        const textEl = document.createElement('span');
        textEl.className = 'line-text';
        const cursor = document.createElement('span');
        cursor.className = 'line-cursor';
        lineEl.appendChild(textEl);
        lineEl.appendChild(cursor);

        // 偶发故障闪烁
        if (Math.random() < 0.08) {
            lineEl.classList.add('glitching');
            setTimeout(() => lineEl.classList.remove('glitching'), 340);
        }

        let typed = '';
        for (const ch of text) {
            if (runId !== state.runId) { cursor.remove(); return false; }
            typed += ch;
            textEl.textContent = typed;
            if (Math.random() < 0.3) AudioForge.key();
            el.bootLines.scrollTop = el.bootLines.scrollHeight;
            await sleep(BASE_CHAR_MS + BASE_GAP_MS * (ch === ' ' ? 0.4 : 1) + Math.random() * 22);
        }
        cursor.remove();
        return true;
    }

    function appendBadge(lineEl, statusKey) {
        const meta = STATUS_META[statusKey] || STATUS_META.info;
        const badge = document.createElement('span');
        badge.className = `line-badge ${meta.cls}`;
        badge.textContent = meta.label;
        lineEl.appendChild(badge);
        if (statusKey === 'ok') AudioForge.ok();
        if (statusKey === 'fail') AudioForge.fail();
        if (statusKey === 'warn') AudioForge.warn();
    }

    function setPhase(phase) {
        state.phase = phase;
        el.termLed.className = 'term-led' + (phase === 'running' ? ' running' : phase === 'ready' ? ' ready' : '');
        el.statusState.textContent = `STATE: ${phase.toUpperCase()}`;
        if (phase === 'running') {
            el.btnForge.classList.add('busy');
            el.progressLabel.classList.remove('ready');
            el.progressLabel.textContent = 'FORGING';
        } else {
            el.btnForge.classList.remove('busy');
        }
        if (phase === 'ready') {
            el.progressLabel.textContent = 'SYSTEM READY';
            el.progressLabel.classList.add('ready');
            el.bootHint.textContent = '点火完成 · 按 ENTER 启动系统 / 按 FORGE 重新锻造';
            el.bootHint.classList.remove('hidden-hint');
        }
        if (phase === 'idle') {
            el.progressLabel.textContent = 'STANDBY';
            el.bootHint.textContent = '按 FORGE 或 Ctrl+Enter 点火锻造';
            el.bootHint.classList.remove('hidden-hint');
        }
    }

    function startUptime() {
        state.bootStartAt = performance.now();
        clearInterval(state.uptimeTimer);
        state.uptimeTimer = setInterval(() => {
            const sec = (performance.now() - state.bootStartAt) / 1000;
            el.statusUptime.textContent = `UPTIME: ${sec.toFixed(2).padStart(5, '0')}s`;
        }, 60);
    }

    function stopUptime() {
        clearInterval(state.uptimeTimer);
    }

    async function forge() {
        if (state.phase === 'running') return;
        if (!state.steps.length) {
            toast('图纸为空 · 请先选择一个预设或添加步骤');
            return;
        }

        const runId = ++state.runId;
        state.bootStartAt = performance.now();

        // 复位舞台
        el.bootLines.innerHTML = '';
        el.bootBanner.classList.remove('show');
        el.bootHint.classList.add('hidden-hint');
        el.progressFill.style.width = '0%';
        el.progressPercent.textContent = '0%';

        // CRT 电子束开机
        el.crtScreen.classList.remove('powering', 'launching');
        void el.crtScreen.offsetWidth;
        el.crtScreen.classList.add('powering');
        AudioForge.post();
        setPhase('running');
        startUptime();

        await sleep(720);
        if (runId !== state.runId) return;
        el.bootBanner.classList.add('show');

        await sleep(420);
        let okCount = 0;
        const total = state.steps.length;

        for (let i = 0; i < total; i++) {
            if (runId !== state.runId) return;
            const step = state.steps[i];
            const lineEl = document.createElement('div');
            lineEl.className = 'boot-line';
            el.bootLines.appendChild(lineEl);

            const alive = await typeLine(lineEl, step.t, runId);
            if (!alive) return;
            appendBadge(lineEl, step.s);
            if (step.s === 'ok' || step.s === 'warn') okCount++;

            el.progressFill.style.width = `${((i + 1) / total) * 100}%`;
            el.progressPercent.textContent = `${Math.round(((i + 1) / total) * 100)}%`;

            await sleep(step.d + 60);
        }

        if (runId !== state.runId) return;
        stopUptime();
        setPhase('ready');
        AudioForge.ready();
    }

    function launch() {
        if (state.phase !== 'ready') return;
        el.crtFlash.classList.remove('fire');
        void el.crtFlash.offsetWidth;
        el.crtFlash.classList.add('fire');
        el.crtScreen.classList.remove('launching');
        void el.crtScreen.offsetWidth;
        el.crtScreen.classList.add('launching');
        AudioForge.launch();
        toast('点火成功 · 系统已苏醒 ⟳ FORGE 可重新锻造');
        state.phase = 'launched';
        el.statusState.textContent = 'STATE: LAUNCHED';
    }

    // === Interactions（主题 / 速度 / 音效 / 导出 / 键盘） ===
    function setTheme(theme) {
        state.theme = theme;
        document.body.dataset.theme = theme;
        el.statusMeta.textContent = `THEME: ${theme.toUpperCase()}`;
        document.querySelectorAll('.theme-dot').forEach((d) =>
            d.classList.toggle('active', d.dataset.setTheme === theme));
    }

    function bindInteractions() {
        document.querySelectorAll('.theme-dot').forEach((dot) => {
            dot.addEventListener('click', () => {
                setTheme(dot.dataset.setTheme);
                AudioForge.key();
            });
        });

        document.querySelectorAll('.preset-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                applyPreset(chip.dataset.preset);
                AudioForge.ok();
            });
        });

        el.speedRange.addEventListener('input', () => {
            state.speed = +el.speedRange.value;
            el.speedValue.textContent = `${state.speed.toFixed(1)}×`;
            updateMeta();
        });

        el.btnSfx.addEventListener('click', () => {
            state.sfx = !state.sfx;
            el.sfxLabel.textContent = state.sfx ? 'SFX ON' : 'SFX OFF';
            el.btnSfx.classList.toggle('hud-btn-accent', !state.sfx);
            if (state.sfx) AudioForge.ok();
        });

        el.btnForge.addEventListener('click', forge);
        el.btnAddStep.addEventListener('click', addStep);

        el.btnExport.addEventListener('click', async () => {
            const config = JSON.stringify({
                forge: 'boot-sequence-forge',
                preset: state.presetKey || 'custom',
                theme: state.theme,
                speed: state.speed,
                steps: state.steps
            }, null, 2);
            try {
                await navigator.clipboard.writeText(config);
                toast('序列配置已复制到剪贴板 · JSON');
            } catch {
                toast('复制失败 · 请检查剪贴板权限');
            }
            AudioForge.ok();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                forge();
                return;
            }
            if (e.key === 'Enter' && !e.target.matches('input, select')) {
                if (state.phase === 'ready') launch();
            }
        });

        el.crtScreen.addEventListener('click', () => {
            if (state.phase === 'ready') launch();
        });
    }

    // === Init ===
    function init() {
        bindStepEvents();
        bindInteractions();
        setTheme('phosphor');
        applyPreset('bios');
        setPhase('idle');
    }

    init();
})();
