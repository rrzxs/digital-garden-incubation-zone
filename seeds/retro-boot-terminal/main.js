/**
 * Retro Boot Terminal · 复古开机终端
 * BIOS 自检序列 + CRT 视觉 + 交互 Shell + Web Audio 音效
 * maintainer: EDEN
 */
(function () {
    'use strict';

    // === 配置与状态 ===
    const BOOT_SPEED = 1;          // 开机序列速度倍率（越大越快）
    const MAX_BOOT_LINES = 26;
    const THEME_NAMES = { phosphor: 'PHOSPHOR', amber: 'AMBER', ice: 'ICE', magenta: 'MAGENTA' };

    const state = {
        booted: false,
        audioOn: true,
        history: [],
        historyIndex: -1,
        bootTimer: null,
        glitchTimers: []
    };

    // === DOM Elements ===
    const $ = (id) => document.getElementById(id);
    const bootLayer = $('boot-layer');
    const bootLines = $('boot-lines');
    const bootProgress = $('boot-progress');
    const bootProgressFill = $('boot-progress-fill');
    const bootProgressPct = $('boot-progress-pct');
    const bootProgressLabel = $('boot-progress-label');
    const shellLayer = $('shell-layer');
    const shellOutput = $('shell-output');
    const shellInput = $('shell-input');
    const inputRow = $('shell-input-row');
    const caretBlock = $('caret-block');
    const crtScreen = $('crt-screen');
    const terminalShell = $('terminal-shell');
    const statusMode = $('status-mode');
    const statusClock = $('status-clock');
    const statusTheme = $('status-theme');
    const statusUplink = $('status-uplink');
    const btnCrt = $('btn-crt');
    const btnAudio = $('btn-audio');
    const audioLabel = $('audio-label');
    const btnReboot = $('btn-reboot');

    // === Audio Engine (Web Audio 合成音效) ===
    const AudioFX = (() => {
        let ctx = null;

        function ensure() {
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                ctx = new AC();
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        function tone(freq, dur, type = 'square', gain = 0.035) {
            if (!state.audioOn) return;
            const c = ensure();
            if (!c) return;
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            g.gain.setValueAtTime(gain, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
            osc.connect(g).connect(c.destination);
            osc.start();
            osc.stop(c.currentTime + dur);
        }

        return {
            key()    { tone(1800 + Math.random() * 500, 0.03, 'square', 0.018); },
            enter()  { tone(880, 0.07, 'square', 0.03); setTimeout(() => tone(1320, 0.05, 'square', 0.025), 55); },
            beep()   { tone(1046, 0.09, 'sine', 0.05); },
            err()    { tone(160, 0.18, 'sawtooth', 0.045); },
            power()  { tone(220, 0.5, 'sine', 0.05); setTimeout(() => tone(440, 0.4, 'sine', 0.04), 120); setTimeout(() => tone(880, 0.5, 'sine', 0.03), 260); },
            glitch() { tone(90 + Math.random() * 60, 0.12, 'sawtooth', 0.04); }
        };
    })();

    // === 工具函数 ===
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms / BOOT_SPEED));
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pad = (n, w = 2) => String(n).padStart(w, '0');

    // === Boot Sequence Engine ===
    const ASCII_LOGO = [
        ' ██████╗ ███████╗███████╗██████╗ ██████╗  ██████╗ ███████╗',
        '██╔════╝ ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔════╝',
        '██║  ███╗█████╗  █████╗  ██████╔╝██████╔╝██║   ██║███████╗',
        '██║   ██║██╔══╝  ██╔══╝  ██╔══██╗██╔══██╗██║   ██║╚════██║',
        '╚██████╔╝███████╗███████╗██║  ██║██║  ██║╚██████╔╝███████║',
        ' ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝'
    ];

    const BOOT_SCRIPT = [
        { html: '<span class="bl-dim">EDEN BIOS v2.6.0 — Digital Garden Firmware</span>', delay: 120 },
        { html: '<span class="bl-dim">Copyright (C) 2026 RRZXS · All Phosphor Reserved</span>', delay: 200 },
        { html: '', delay: 100 },
        { text: 'CPU  : NEURAL-9 8-Core @ 4.20 GHz ............ [ ', ok: 'OK', after: ' ]', delay: 90 },
        { text: 'MEM  : Testing Memory ', count: { from: 0, to: 32768, unit: 'K OK' }, delay: 80 },
        { text: 'GPU  : Phosphor Ray Tracer 8GB .............. [ ', ok: 'OK', after: ' ]', delay: 90 },
        { text: 'RTC  : Clock Synchronized @ garden.zone ..... [ ', ok: 'OK', after: ' ]', delay: 70 },
        { html: '', delay: 60 },
        { text: 'Detecting IDE Drives ...', delay: 140 },
        { text: '  Primary Master   : SEED-SSD 1024GB ........ [ ', ok: 'OK', after: ' ]', delay: 90 },
        { text: '  Primary Slave    : none', delay: 50 },
        { text: '  Secondary Master : GARDEN-NAS ∞ ........... [ ', ok: 'OK', after: ' ]', delay: 90 },
        { html: '', delay: 60 },
        { text: 'Mounting /dev/inspiration ................. [ ', ok: 'OK', after: ' ]', delay: 110 },
        { text: 'Loading ambient-mesh-gradient.ko .......... [ ', ok: 'OK', after: ' ]', delay: 100 },
        { text: 'Loading glassmorphism-compositor.ko ....... [ ', ok: 'OK', after: ' ]', delay: 100 },
        { text: 'Calibrating cubic-bezier(0.16, 1, 0.3, 1) . [ ', ok: 'OK', after: ' ]', delay: 120 },
        { text: 'Verifying non-linear motion curves ........ [ ', ok: 'OK', after: ' ]', delay: 90 },
        { html: '', delay: 50 },
        { text: 'Establishing uplink to EDEN core ......... [ ', ok: 'LINKED', after: ' ]', delay: 200 },
        { html: '<span class="bl-warn">WARN: nostalgia levels exceeding safe threshold</span>', delay: 160 },
        { text: 'Compensating via phosphor glow .......... [ ', ok: 'OK', after: ' ]', delay: 130 },
        { html: '', delay: 80 },
        { kind: 'ascii', delay: 60 },
        { html: '<span class="bl-hi">Digital Garden OS — Terminal Ready</span>', delay: 220 }
    ];

    function appendBootLine(html, cls = '') {
        const div = document.createElement('div');
        div.className = 'boot-line ' + cls;
        div.innerHTML = html || '&nbsp;';
        bootLines.appendChild(div);
        while (bootLines.children.length > MAX_BOOT_LINES) {
            bootLines.removeChild(bootLines.firstChild);
        }
    }

    function setProgress(pct, label) {
        bootProgressFill.style.width = pct + '%';
        bootProgressPct.textContent = Math.round(pct) + '%';
        if (label) bootProgressLabel.textContent = label;
    }

    /** 执行一次完整开机序列（含随机 glitch 彩蛋） */
    async function runBootSequence() {
        // 复位
        state.booted = false;
        clearTimeout(state.bootTimer);
        state.glitchTimers.forEach(clearTimeout);
        state.glitchTimers = [];
        bootLines.innerHTML = '';
        shellOutput.innerHTML = '';
        shellLayer.classList.add('is-hidden');
        shellLayer.classList.remove('shell-enter');
        bootLayer.style.display = 'flex';
        bootProgress.classList.remove('is-visible');
        setProgress(0, 'POST…');
        statusMode.textContent = 'MODE · BOOT';
        statusUplink.textContent = 'HANDSHAKE…';
        crtScreen.classList.remove('is-off');
        AudioFX.power();

        const total = BOOT_SCRIPT.length;
        const glitchAt = 4 + Math.floor(Math.random() * 6); // 随机故障彩蛋位置

        for (let i = 0; i < total; i++) {
            const step = BOOT_SCRIPT[i];

            if (step.kind === 'ascii') {
                ASCII_LOGO.forEach((row) => appendBootLine(esc(row), 'is-ascii'));
                setProgress(((i + 1) / total) * 100, 'LOADING SHELL');
            } else if (step.count) {
                // 内存检测数字滚动
                const line = document.createElement('div');
                line.className = 'boot-line';
                bootLines.appendChild(line);
                const steps = 14;
                for (let s = 1; s <= steps; s++) {
                    const val = Math.floor(step.count.from + (step.count.to - step.count.from) * (s / steps));
                    line.innerHTML = esc(step.text) + val + 'K';
                    await sleep(42);
                }
                line.innerHTML = esc(step.text) + '<span class="bl-ok">' + step.count.to + step.count.unit + '</span>';
            } else if (step.ok) {
                appendBootLine(esc(step.text) + '<span class="bl-ok">' + step.ok + '</span>' + esc(step.after || ''));
                AudioFX.beep();
            } else {
                appendBootLine(step.html !== undefined ? step.html : esc(step.text || ''));
            }

            // 进度推进
            const pct = ((i + 1) / total) * 100;
            const label = pct < 30 ? 'POST…' : pct < 62 ? 'DETECTING DEVICES' : pct < 88 ? 'LOADING MODULES' : 'STARTING SHELL';
            setProgress(pct, label);
            if (pct > 12) bootProgress.classList.add('is-visible');

            // 随机故障彩蛋：画面抖动 + 撕裂音
            if (i === glitchAt) {
                triggerGlitch();
            }

            await sleep(step.delay);
        }

        await sleep(520);
        // CRT 电子束坍缩再点亮 → 切入 Shell
        crtScreen.classList.add('is-off');
        await sleep(560);
        bootLayer.style.display = 'none';
        shellLayer.classList.remove('is-hidden');
        shellLayer.classList.add('shell-enter');
        crtScreen.classList.remove('is-off');
        state.booted = true;
        statusMode.textContent = 'MODE · SHELL';
        statusUplink.textContent = 'UPLINK STABLE';
        AudioFX.enter();

        printBanner();
        shellInput.focus();
    }

    function triggerGlitch() {
        terminalShell.classList.add('is-glitching');
        AudioFX.glitch();
        appendBootLine('<span class="bl-warn">:: signal turbulence compensated ::</span>');
        state.glitchTimers.push(setTimeout(() => terminalShell.classList.remove('is-glitching'), 650));
    }

    // === Shell 输出 ===
    function printLine(text, cls = '') {
        const div = document.createElement('div');
        div.className = 'out-line ' + cls;
        div.innerHTML = text;
        shellOutput.appendChild(div);
        shellOutput.scrollTop = shellOutput.scrollHeight;
        return div;
    }

    function printBanner() {
        ASCII_LOGO.forEach((row) => printLine(esc(row), 'out-ascii'));
        printLine('<span class="out-dim">Digital Garden OS 4.2.6 · LTS  (tty1)</span>');
        printLine('');
        printLine('<span class="out-hi">欢迎来到复古开机终端。</span>输入 <span class="bl-ok">help</span> 查看可用指令，或输入 <span class="bl-ok">reboot</span> 再看一次开机序列。');
        printLine('');
    }

    function printCommandEcho(raw) {
        printLine(
            '<span class="prompt-user">eden@garden</span><span class="prompt-sep">:</span><span class="prompt-path">~</span><span class="prompt-sigil">$</span> ' + esc(raw),
            'out-cmd'
        );
    }

    // === 命令注册表 ===
    const COMMANDS = {
        help() {
            printLine('可用指令 AVAILABLE COMMANDS:');
            const rows = [
                ['help',        '显示本帮助'],
                ['neofetch',    '系统信息磷光卡片'],
                ['boot',        '重新执行开机自检序列'],
                ['reboot',      '关机 → 冷启动（含 CRT 坍缩）'],
                ['theme <name>', '切换配色: phosphor | amber | ice | magenta'],
                ['crt',         '切换 CRT 扫描线开/关'],
                ['sfx',         '切换音效开/关'],
                ['garden',      '数字花园种子清单'],
                ['matrix',      '进入数字雨 5 秒'],
                ['echo <text>', '复述一句话'],
                ['date',        '当前系统时间'],
                ['whoami',      '你是谁？'],
                ['clear',       '清屏 (Ctrl+L)']
            ];
            rows.forEach(([c, d]) => printLine('  <span class="bl-ok">' + c.padEnd(14, ' ') + '</span><span class="out-dim">' + d + '</span>'));
        },

        neofetch() {
            ASCII_LOGO.slice(0, 6).forEach((row, i) => {
                const info = [
                    '<span class="out-hi">eden</span>@<span class="out-hi">garden</span>',
                    '─────────────────────',
                    '<span class="bl-ok">OS</span>       Digital Garden OS 4.2.6 LTS',
                    '<span class="bl-ok">Kernel</span>   non-linear-6.1.0-cubic-bezier',
                    '<span class="bl-ok">Shell</span>   phosphor-sh 2.6',
                    '<span class="bl-ok">Theme</span>   ' + THEME_NAMES[currentTheme()],
                    '<span class="bl-ok">Uptime</span>  ' + uptimeText(),
                    '<span class="bl-ok">CPU</span>     NEURAL-9 (8) @ 4.20GHz',
                    '<span class="bl-ok">Memory</span>  32768MiB / 65536MiB'
                ][i];
                printLine('<span class="out-ascii" style="font-size:0.6rem">' + esc(row) + '</span>  ' + info);
            });
            printLine('');
        },

        boot() {
            runBootSequence();
        },

        reboot() {
            printLine('<span class="out-dim">正在关机…</span>');
            setTimeout(() => runBootSequence(), 700);
        },

        theme(args) {
            const name = (args[0] || '').toLowerCase();
            if (!THEME_NAMES[name]) {
                printLine('用法: theme &lt;phosphor|amber|ice|magenta&gt;', 'out-dim');
                return;
            }
            setTheme(name);
            printLine('配色已切换 → <span class="bl-ok">' + THEME_NAMES[name] + '</span>');
            AudioFX.beep();
        },

        crt() {
            toggleCrt();
            printLine('CRT 扫描线: <span class="bl-ok">' + (document.body.classList.contains('no-crt') ? 'OFF' : 'ON') + '</span>');
        },

        sfx() {
            toggleAudio();
            printLine('音效: <span class="bl-ok">' + (state.audioOn ? 'ON' : 'OFF') + '</span>');
        },

        garden() {
            printLine('<span class="out-hi">Digital Garden · 培育中的种子 (节选)</span>');
            const seeds = [
                ['🪷', 'Aura 灵韵', '沉浸式呼吸冥想空间'],
                ['💧', 'Fluid 流体', 'Navier-Stokes 交互流体模拟'],
                ['⌨', 'Retro Term 复古终端', 'CRT 扫描线终端模拟'],
                ['∿', 'Robotics Signal Scope', '机器人信号示波器'],
                ['◎', 'Ripple Canvas 涟漪画布', '像素级水波物理模拟']
            ];
            seeds.forEach(([icon, name, desc]) => {
                printLine('  ' + icon + '  <span class="bl-ok">' + name + '</span> <span class="out-dim">— ' + desc + '</span>');
            });
            printLine('<span class="out-dim">… 完整清单见花园主页 · ' + new Date().getFullYear() + ' 种仍在生长</span>');
        },

        matrix() {
            printLine('<span class="out-dim">进入数字雨 5 秒…</span>');
            const chars = 'ｱｲｳｴｵ01ﬀ▚▞◤◥⌁⌁＄';
            const lines = [];
            const t0 = Date.now();
            const timer = setInterval(() => {
                const row = Array.from({ length: 58 }, () =>
                    Math.random() < 0.12 ? '<span class="out-hi">' + chars[Math.floor(Math.random() * chars.length)] + '</span>' : chars[Math.floor(Math.random() * chars.length)]
                ).join('');
                const el = printLine(row, 'out-ascii');
                lines.push(el);
                if (lines.length > 16) { lines.shift().remove(); }
                if (Date.now() - t0 > 5000) {
                    clearInterval(timer);
                    lines.forEach((l) => l.remove());
                    printLine('<span class="out-dim">…数字雨结束。欢迎回到现实。</span>');
                }
            }, 90);
        },

        echo(args) {
            printLine(esc(args.join(' ')) || '&nbsp;');
        },

        date() {
            printLine(new Date().toString());
        },

        whoami() {
            printLine('<span class="out-hi">eden</span> <span class="out-dim">— 数字花园的访客 · 种子观察者 · 磷光爱好者</span>');
        },

        clear() {
            shellOutput.innerHTML = '';
        }
    };

    // === Shell 输入处理 ===
    function execute(raw) {
        const trimmed = raw.trim();
        printCommandEcho(raw);
        if (!trimmed) return;

        state.history.push(trimmed);
        state.historyIndex = state.history.length;

        const [cmd, ...args] = trimmed.split(/\s+/);
        const handler = COMMANDS[cmd.toLowerCase()];
        if (handler) {
            handler(args);
        } else {
            printLine('phosphor-sh: 未找到指令: ' + esc(cmd) + ' <span class="out-dim">— 试试 help</span>', 'out-err');
            AudioFX.err();
        }
    }

    shellInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = shellInput.value;
            shellInput.value = '';
            inputRow.classList.remove('is-typing');
            AudioFX.enter();
            execute(val);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.historyIndex > 0) {
                state.historyIndex--;
                shellInput.value = state.history[state.historyIndex] || '';
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.historyIndex < state.history.length) {
                state.historyIndex++;
                shellInput.value = state.history[state.historyIndex] || '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const prefix = shellInput.value.trim().toLowerCase();
            const match = Object.keys(COMMANDS).find((c) => c.startsWith(prefix) && prefix);
            if (match) shellInput.value = match + ' ';
        } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            COMMANDS.clear();
        } else {
            AudioFX.key();
        }
        syncCaret();
    });

    shellInput.addEventListener('input', syncCaret);

    function syncCaret() {
        inputRow.classList.toggle('is-typing', shellInput.value.length > 0 || document.activeElement === shellInput);
    }

    // 点击屏幕聚焦输入框
    crtScreen.addEventListener('click', () => {
        if (state.booted) shellInput.focus();
    });

    // === 主题管理 ===
    function currentTheme() {
        return document.body.dataset.theme || 'phosphor';
    }

    function setTheme(name) {
        document.body.dataset.theme = name;
        statusTheme.textContent = 'THEME · ' + THEME_NAMES[name];
    }

    document.querySelectorAll('.theme-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
            setTheme(dot.dataset.setTheme);
            AudioFX.beep();
        });
    });

    // === CRT / 音效 / 重启按钮 ===
    function toggleCrt() {
        document.body.classList.toggle('no-crt');
        btnCrt.classList.toggle('is-off', document.body.classList.contains('no-crt'));
    }

    function toggleAudio() {
        state.audioOn = !state.audioOn;
        btnAudio.classList.toggle('is-off', !state.audioOn);
        audioLabel.textContent = state.audioOn ? 'SFX ON' : 'SFX OFF';
    }

    btnCrt.addEventListener('click', toggleCrt);
    btnAudio.addEventListener('click', toggleAudio);
    btnReboot.addEventListener('click', () => {
        if (state.booted) {
            COMMANDS.reboot();
        } else {
            runBootSequence();
        }
    });

    // === 状态时钟与运行时长 ===
    const bootTime = Date.now();

    function uptimeText() {
        const s = Math.floor((Date.now() - bootTime) / 1000);
        const m = Math.floor(s / 60);
        return m > 0 ? m + ' min ' + (s % 60) + ' s' : s + ' s';
    }

    function tickClock() {
        const d = new Date();
        statusClock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    setInterval(tickClock, 1000);
    tickClock();

    // === 启动 ===
    window.addEventListener('load', () => {
        runBootSequence();
    });
})();
