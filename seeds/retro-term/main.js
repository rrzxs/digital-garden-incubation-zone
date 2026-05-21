(function () {
    'use strict';

    // === DOM Elements ===
    var output = document.getElementById('terminal-output');
    var inputText = document.getElementById('input-text');
    var cursor = document.getElementById('cursor');
    var body = document.getElementById('terminal-body');
    var termWindow = document.getElementById('terminal');
    var btnTheme = document.getElementById('btn-theme');
    var btnClear = document.getElementById('btn-clear');
    var btnSound = document.getElementById('btn-sound');
    var themeNameEl = document.getElementById('theme-name');
    var charCountEl = document.getElementById('char-count');
    var statusTime = document.getElementById('status-time');

    // === State ===
    var currentInput = '';
    var history = [];
    var historyIndex = -1;
    var soundEnabled = true;
    var audioCtx = null;

    var themes = [
        { name: 'PHOSPHOR', cls: '' },
        { name: 'AMBER', cls: 'theme-amber' },
        { name: 'CYAN', cls: 'theme-cyan' },
        { name: 'ROSE', cls: 'theme-rose' }
    ];
    var themeIndex = 0;

    // === ASCII Art ===
    var BANNER = [
        '╔══════════════════════════════════════════════╗',
        '║  ██████╗ ███████╗████████╗██████╗  ██████╗  ║',
        '║  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗ ║',
        '║  ██████╔╝█████╗     ██║   ██████╔╝██║   ██║ ║',
        '║  ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║ ║',
        '║  ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝ ║',
        '║  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ║',
        '║         T E R M ═══ v1.0.0                   ║',
        '╚══════════════════════════════════════════════╝'
    ].join('\n');

    var ABOUT_TEXT = [
        '',
        '  retro-term — a terminal experience from Digital Garden',
        '  ─────────────────────────────────────────────────',
        '  Maintainer : EDEN',
        '  Version    : 1.0.0',
        '  Stack      : Vanilla JS + CSS3 + HTML5',
        '  Fonts      : Share Tech Mono, Inter, Outfit',
        ''
    ].join('\n');

    // === Audio ===
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playTick() {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 800 + Math.random() * 400;
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.06);
        } catch (e) { /* silent */ }
    }

    function playKey() {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 1200 + Math.random() * 600;
            gain.gain.setValueAtTime(0.015, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) { /* silent */ }
    }

    function playError() {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 180;
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) { /* silent */ }
    }

    function playSuccess() {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var notes = [523.25, 659.25, 783.99];
            notes.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
                gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + i * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.08);
                osc.stop(ctx.currentTime + i * 0.08 + 0.15);
            });
        } catch (e) { /* silent */ }
    }

    function playReturn() {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 440;
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { /* silent */ }
    }

    // === Scanlines Canvas ===
    function initScanlines() {
        var canvas = document.getElementById('scanlines-canvas');
        var ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawScanlines();
        }

        function drawScanlines() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            for (var y = 0; y < canvas.height; y += 3) {
                ctx.fillRect(0, y, canvas.width, 1);
            }
        }

        resize();
        window.addEventListener('resize', resize);
    }

    // === Output Helpers ===
    function appendLine(text, cls) {
        var span = document.createElement('span');
        span.className = 'output-line' + (cls ? ' ' + cls : '');
        span.textContent = text + '\n';
        output.appendChild(span);
        scrollToBottom();
    }

    function appendHTML(html) {
        var div = document.createElement('span');
        div.className = 'output-line';
        div.innerHTML = html + '\n';
        output.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        requestAnimationFrame(function () {
            body.scrollTop = body.scrollHeight;
        });
    }

    // === Typing Animation ===
    function typeText(text, cls, callback) {
        var lines = text.split('\n');
        var lineIndex = 0;

        function nextLine() {
            if (lineIndex >= lines.length) {
                if (callback) callback();
                return;
            }
            appendLine(lines[lineIndex], cls);
            lineIndex++;
            if (lineIndex < lines.length) {
                setTimeout(nextLine, 40 + Math.random() * 30);
            } else {
                if (callback) callback();
            }
        }

        nextLine();
    }

    // === Command Processor ===
    var commands = {};

    commands.help = function () {
        var lines = [
            { text: '', cls: '' },
            { text: '  可用命令 (Available Commands)', cls: 'output-accent' },
            { text: '  ──────────────────────────────', cls: 'output-dim' },
            { text: '' },
            { text: '  help        显示此帮助信息', cls: '' },
            { text: '  about       关于 retro-term', cls: '' },
            { text: '  theme       切换配色方案', cls: '' },
            { text: '  clear       清除终端输出', cls: '' },
            { text: '  matrix      矩阵代码雨动画', cls: '' },
            { text: '  sysinfo     显示系统信息', cls: '' },
            { text: '  echo [text] 回显文本', cls: '' },
            { text: '  figlet [t]  ASCII 艺术字', cls: '' },
            { text: '  fortune     随机箴言', cls: '' },
            { text: '  date        显示日期时间', cls: '' },
            { text: '  whoami      显示用户身份', cls: '' },
            { text: '  ping [h]    模拟网络 ping', cls: '' },
            { text: '  color       随机色彩测试', cls: '' },
            { text: '  glitch      触发故障效果', cls: '' },
            { text: '  cowsay [t]  奶牛说话', cls: '' },
            { text: '' }
        ];
        lines.forEach(function (l) { appendLine(l.text, l.cls); });
    };

    commands.about = function () {
        typeText(ABOUT_TEXT, 'output-info');
    };

    commands.clear = function () {
        output.innerHTML = '';
    };

    commands.theme = function () {
        themeIndex = (themeIndex + 1) % themes.length;
        var theme = themes[themeIndex];

        themes.forEach(function (t) {
            if (t.cls) termWindow.classList.remove(t.cls);
        });

        if (theme.cls) termWindow.classList.add(theme.cls);
        themeNameEl.textContent = theme.name;
        appendLine('  配色已切换 → ' + theme.name, 'output-accent');
        playTick();
    };

    commands.matrix = function () {
        var cols = 50;
        var rows = 8;
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()ｱｲｳｴｵｶｷｸｹｺ';
        var frame = 0;
        var maxFrames = 24;

        function renderFrame() {
            if (frame >= maxFrames) {
                appendLine('', '');
                return;
            }

            var lines = [];
            for (var r = 0; r < rows; r++) {
                var line = '  ';
                for (var c = 0; c < cols; c++) {
                    line += chars[Math.floor(Math.random() * chars.length)];
                }
                lines.push(line);
            }

            var text = lines.join('\n');
            appendHTML('<span class="output-ascii" style="opacity:' + (0.3 + frame / maxFrames * 0.7) + '">' + escapeHTML(text) + '</span>');

            playTick();
            frame++;
            setTimeout(renderFrame, 60);
        }

        appendLine('', '');
        renderFrame();
    };

    commands.sysinfo = function () {
        var now = new Date();
        var info = [
            '',
            '  ╭── System Information ──────────────╮',
            '  │ OS        : Digital Garden OS 3.0  │',
            '  │ Kernel    : EDEN-v1.0.0-stable     │',
            '  │ Shell     : retro-term             │',
            '  │ Terminal  : xterm-256color         │',
            '  │ CPU       : Neuron Core x ∞        │',
            '  │ Memory    : ' + String(Math.floor(Math.random() * 32 + 16)) + ' GB / ∞ GB             │',
            '  │ Uptime    : ' + formatUptime(now) + '              │',
            '  │ Resolution: ' + window.innerWidth + 'x' + window.innerHeight + '            │',
            '  │ Theme     : ' + themes[themeIndex].name + '                 │',
            '  │ Sound     : ' + (soundEnabled ? 'ON' : 'OFF') + '                    │',
            '  ╰────────────────────────────────────╯',
            ''
        ];
        info.forEach(function (l) { appendLine(l, 'output-info'); });
        playSuccess();
    };

    commands.echo = function (args) {
        appendLine('  ' + args.join(' '), 'output-info');
    };

    commands.figlet = function (args) {
        var text = args.length > 0 ? args.join(' ') : 'RETRO';
        text = text.substring(0, 12).toUpperCase();
        var ascii = generateMiniFiglet(text);
        appendLine('', '');
        ascii.forEach(function (line) { appendLine('  ' + line, 'output-ascii'); });
        appendLine('', '');
    };

    commands.fortune = function () {
        var fortunes = [
            '最好的代码是不需要写的代码。',
            '在数字花园里，每一颗种子都值得被灌溉。',
            'Bug 不是错误，是未被发现的特性。',
            '终端是程序员灵魂的窗户。',
            '创造力是把两个不相关的东西连接在一起。',
            '任何足够先进的技术都与魔法无异。',
            '保持好奇，保持创造。',
            '简洁是最终的复杂。',
            '代码如诗，动效如画。',
            '在每一个 if 的背后，都藏着一个故事。'
        ];
        var pick = fortunes[Math.floor(Math.random() * fortunes.length)];
        appendLine('');
        appendLine('  ✦ ' + pick, 'output-accent');
        appendLine('     — Digital Garden Oracle', 'output-dim');
        appendLine('');
    };

    commands.date = function () {
        var now = new Date();
        appendLine('  ' + now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }), 'output-info');
    };

    commands.whoami = function () {
        appendLine('  eden@digital-garden  [EDEN — Digital Life Creator]', 'output-accent');
    };

    commands.ping = function (args) {
        var host = args.length > 0 ? args[0] : 'garden.local';
        var count = 4;
        var i = 0;

        appendLine('  PING ' + host + ' (192.168.1.' + Math.floor(Math.random() * 254 + 1) + '): 56 data bytes', 'output-dim');

        function nextPing() {
            if (i >= count) {
                appendLine('');
                appendLine('  --- ' + host + ' ping statistics ---', 'output-dim');
                appendLine('  ' + count + ' packets transmitted, ' + count + ' received, 0% packet loss', 'output-success');
                appendLine('');
                return;
            }
            var ms = (Math.random() * 20 + 5).toFixed(1);
            appendLine('  64 bytes from ' + host + ': icmp_seq=' + i + ' ttl=64 time=' + ms + ' ms', 'output-info');
            playTick();
            i++;
            setTimeout(nextPing, 400 + Math.random() * 200);
        }

        setTimeout(nextPing, 300);
    };

    commands.color = function () {
        var colors = ['#ff5f57', '#ffbd2e', '#28c840', '#00e5ff', '#ff3c78', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];
        var lines = ['', '  Color Test:'];
        colors.forEach(function (c) {
            lines.push('  ████████ ' + c);
        });
        lines.push('');
        lines.forEach(function (l) { appendLine(l, 'output-info'); });
    };

    commands.glitch = function () {
        termWindow.classList.add('glitching');
        playError();
        setTimeout(function () {
            termWindow.classList.remove('glitching');
        }, 300);

        var glitchChars = '!@#$%^&*()_+-={}[]|\\:;"\'<>?,./~`█▓▒░';
        var originalHTML = output.innerHTML;
        var count = 6;
        var frame = 0;

        function glitchFrame() {
            if (frame >= count) {
                output.innerHTML = originalHTML;
                scrollToBottom();
                return;
            }

            var spans = output.querySelectorAll('.output-line');
            spans.forEach(function (span) {
                if (Math.random() > 0.7) {
                    var text = span.textContent;
                    var arr = text.split('');
                    var idx = Math.floor(Math.random() * arr.length);
                    arr[idx] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    span.textContent = arr.join('');
                }
            });

            frame++;
            setTimeout(glitchFrame, 50);
        }

        glitchFrame();
        appendLine('  [GLITCH] 信号扰动已触发...', 'output-warning');
    };

    commands.cowsay = function (args) {
        var text = args.length > 0 ? args.join(' ') : 'Moo!';
        var maxLen = 40;
        if (text.length > maxLen) text = text.substring(0, maxLen);
        var border = '─'.repeat(text.length + 2);

        var lines = [
            '',
            '  ┌' + border + '┐',
            '  │ ' + text + ' │',
            '  └' + border + '┘',
            '          \\   ^__^',
            '           \\  (oo)\\_______',
            '              (__)\\       )\\/\\',
            '                  ||----w |',
            '                  ||     ||',
            ''
        ];
        lines.forEach(function (l) { appendLine(l, 'output-info'); });
    };

    commands.sound = function () {
        soundEnabled = !soundEnabled;
        btnSound.textContent = soundEnabled ? '♪' : '♩';
        appendLine('  音效: ' + (soundEnabled ? 'ON ♪' : 'OFF ✕'), 'output-accent');
    };

    // === Mini Figlet Generator ===
    function generateMiniFiglet(text) {
        var font = {
            'A': [' ██ ', '█  █', '████', '█  █', '█  █'],
            'B': ['███ ', '█  █', '███ ', '█  █', '███ '],
            'C': [' ███', '█   ', '█   ', '█   ', ' ███'],
            'D': ['███ ', '█  █', '█  █', '█  █', '███ '],
            'E': ['████', '█   ', '███ ', '█   ', '████'],
            'F': ['████', '█   ', '███ ', '█   ', '█   '],
            'G': [' ███', '█   ', '█ ██', '█  █', ' ███'],
            'H': ['█  █', '█  █', '████', '█  █', '█  █'],
            'I': ['███', ' █ ', ' █ ', ' █ ', '███'],
            'J': ['████', '   █', '   █', '█  █', ' ██ '],
            'K': ['█  █', '█ █ ', '██  ', '█ █ ', '█  █'],
            'L': ['█   ', '█   ', '█   ', '█   ', '████'],
            'M': ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
            'N': ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
            'O': [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
            'P': ['███ ', '█  █', '███ ', '█   ', '█   '],
            'Q': [' ██ ', '█  █', '█ ██', '█  █', ' ███'],
            'R': ['███ ', '█  █', '███ ', '█ █ ', '█  █'],
            'S': [' ███', '█   ', ' ██ ', '   █', '███ '],
            'T': ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
            'U': ['█  █', '█  █', '█  █', '█  █', ' ██ '],
            'V': ['█   █', '█   █', ' █ █ ', ' █ █ ', '  █  '],
            'W': ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
            'X': ['█  █', '█  █', ' ██ ', '█  █', '█  █'],
            'Y': ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
            'Z': ['████', '   █', '  █ ', ' █  ', '████'],
            ' ': ['  ', '  ', '  ', '  ', '  '],
            '!': ['█', '█', '█', ' ', '█'],
            '.': [' ', ' ', ' ', ' ', '█'],
            '-': ['    ', '    ', '████', '    ', '    '],
            '0': [' ██ ', '█ ██', '█ █ █', '██ █', ' ██ '],
            '1': [' █ ', '██ ', ' █ ', ' █ ', '███'],
            '2': [' ██ ', '█  █', '  █ ', ' █  ', '████'],
            '3': ['███ ', '   █', ' ██ ', '   █', '███ '],
            '4': ['█  █', '█  █', '████', '   █', '   █'],
            '5': ['████', '█   ', '███ ', '   █', '███ '],
            '6': [' ███', '█   ', '███ ', '█  █', ' ██ '],
            '7': ['████', '   █', '  █ ', ' █  ', '█   '],
            '8': [' ██ ', '█  █', ' ██ ', '█  █', ' ██ '],
            '9': [' ██ ', '█  █', ' ███', '   █', '███ ']
        };

        var rows = ['', '', '', '', ''];
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            var glyph = font[ch] || font[' '];
            for (var r = 0; r < 5; r++) {
                rows[r] += (i > 0 ? ' ' : '') + glyph[r];
            }
        }
        return rows;
    }

    // === Utility ===
    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatUptime(now) {
        var h = now.getHours();
        var m = now.getMinutes();
        return h + 'h ' + m + 'm';
    }

    // === Input Handling ===
    function updateInputDisplay() {
        inputText.textContent = currentInput;
        charCountEl.textContent = currentInput.length + ' chars';
    }

    function submitCommand() {
        var cmd = currentInput.trim();
        history.push(cmd);
        historyIndex = history.length;

        appendHTML(
            '<span class="prompt-user">eden</span>' +
            '<span class="prompt-sep">@</span>' +
            '<span class="prompt-host">retro-term</span>' +
            '<span class="prompt-path">:~$</span> ' +
            '<span class="output-cmd">' + escapeHTML(cmd) + '</span>'
        );

        currentInput = '';
        updateInputDisplay();
        playReturn();

        if (!cmd) return;

        var parts = cmd.split(/\s+/);
        var command = parts[0].toLowerCase();
        var args = parts.slice(1);

        if (commands[command]) {
            commands[command](args);
        } else {
            appendLine('  retro-term: command not found: ' + command, 'output-error');
            appendLine('  输入 help 查看可用命令', 'output-dim');
            playError();
        }
    }

    function handleKeydown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                commands.clear();
                return;
            }
            return;
        }

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                submitCommand();
                break;

            case 'Backspace':
                e.preventDefault();
                if (currentInput.length > 0) {
                    currentInput = currentInput.slice(0, -1);
                    updateInputDisplay();
                    playKey();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    currentInput = history[historyIndex];
                    updateInputDisplay();
                    playTick();
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (historyIndex < history.length - 1) {
                    historyIndex++;
                    currentInput = history[historyIndex];
                } else {
                    historyIndex = history.length;
                    currentInput = '';
                }
                updateInputDisplay();
                playTick();
                break;

            case 'Tab':
                e.preventDefault();
                autoComplete();
                break;

            case 'Escape':
                currentInput = '';
                updateInputDisplay();
                break;

            default:
                if (e.key.length === 1) {
                    currentInput += e.key;
                    updateInputDisplay();
                    playKey();
                }
        }
    }

    function autoComplete() {
        if (!currentInput) return;
        var partial = currentInput.toLowerCase().split(/\s+/)[0];
        var allCmds = Object.keys(commands);
        var matches = allCmds.filter(function (c) { return c.indexOf(partial) === 0; });

        if (matches.length === 1) {
            currentInput = matches[0];
            updateInputDisplay();
            playTick();
        } else if (matches.length > 1) {
            appendLine('  ' + matches.join('  '), 'output-dim');
            playTick();
        }
    }

    // === Clock ===
    function updateClock() {
        var now = new Date();
        statusTime.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
    }

    // === Boot Sequence ===
    function bootSequence() {
        termWindow.classList.add('power-on');
        setTimeout(function () {
            termWindow.classList.remove('power-on');
        }, 600);

        var bootLines = [
            { text: '  BIOS POST... OK', cls: 'output-dim', delay: 300 },
            { text: '  Memory test: 131072 KB... OK', cls: 'output-dim', delay: 200 },
            { text: '  Loading kernel: EDEN-v1.0.0-stable ...', cls: 'output-dim', delay: 400 },
            { text: '  Initializing digital garden subsystem ...', cls: 'output-dim', delay: 300 },
            { text: '  Mounting /dev/garden ... OK', cls: 'output-dim', delay: 200 },
            { text: '  Starting retro-term service ...', cls: 'output-dim', delay: 350 },
            { text: '', cls: '', delay: 100 },
        ];

        var totalDelay = 700;
        bootLines.forEach(function (item) {
            totalDelay += item.delay;
            setTimeout(function () {
                appendLine(item.text, item.cls);
                playTick();
            }, totalDelay);
        });

        setTimeout(function () {
            BANNER.split('\n').forEach(function (line, i) {
                setTimeout(function () {
                    appendLine(line, 'output-ascii');
                    playTick();
                }, i * 30);
            });
        }, totalDelay + 200);

        var welcomeDelay = totalDelay + 200 + BANNER.split('\n').length * 30 + 200;
        setTimeout(function () {
            appendLine('', '');
            appendLine('  Welcome to retro-term — Digital Garden Terminal Experience', 'output-accent');
            appendLine('  输入 help 查看可用命令，开始探索吧。', 'output-dim');
            appendLine('  Type "help" for available commands.', 'output-dim');
            appendLine('');
            playSuccess();
        }, welcomeDelay);
    }

    // === Button Handlers ===
    btnTheme.addEventListener('click', function () {
        commands.theme([]);
    });

    btnClear.addEventListener('click', function () {
        commands.clear();
    });

    btnSound.addEventListener('click', function () {
        commands.sound([]);
    });

    // === Focus Management ===
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'Tab') e.preventDefault();
        handleKeydown(e);
    });

    termWindow.addEventListener('click', function () {
        termWindow.focus();
    });

    // === Init ===
    initScanlines();
    updateClock();
    setInterval(updateClock, 1000);
    bootSequence();

})();
