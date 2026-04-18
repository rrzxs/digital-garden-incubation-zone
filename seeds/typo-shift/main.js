(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    var CHAR_SETS = {
        symbols: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\\',
        latin:    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        digits:   '0123456789',
        cjk:      '竜変幻字体風景夢影響雲雨雷雪花鳥風月星'
    };

    var MODES = ['wave', 'breathe', 'scatter', 'cascade'];

    // === DOM Elements ===

    var cursorGlow   = document.getElementById('cursor-glow');
    var stage        = document.getElementById('stage');
    var typoCanvas   = document.getElementById('typo-canvas');
    var typoDisplay  = document.getElementById('typo-display');
    var charMeta     = document.getElementById('char-meta');
    var inputText    = document.getElementById('input-text');
    var btnShuffle   = document.getElementById('btn-shuffle');
    var btnReset     = document.getElementById('btn-reset');
    var modeToggle   = document.getElementById('mode-toggle');
    var paletteToggle = document.getElementById('palette-toggle');

    var ctrlSize     = document.getElementById('ctrl-size');
    var ctrlWeight   = document.getElementById('ctrl-weight');
    var ctrlSpacing  = document.getElementById('ctrl-spacing');
    var ctrlHeight   = document.getElementById('ctrl-height');
    var ctrlAmplitude = document.getElementById('ctrl-amplitude');
    var ctrlSpeed    = document.getElementById('ctrl-speed');

    var valSize      = document.getElementById('val-size');
    var valWeight    = document.getElementById('val-weight');
    var valSpacing   = document.getElementById('val-spacing');
    var valHeight    = document.getElementById('val-height');
    var valAmplitude = document.getElementById('val-amplitude');
    var valSpeed     = document.getElementById('val-speed');

    // === State ===

    var state = {
        text: 'Typo Shift',
        mode: 'wave',
        palette: 'aurora',
        fontSize: 72,
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.3,
        amplitude: 50,
        speed: 50,
        mouseX: 0,
        mouseY: 0,
        chars: [],
        rafId: null,
        startTime: performance.now()
    };

    // === Char Class ===

    function CharSpan(index, isSpace) {
        this.index = index;
        this.isSpace = isSpace;
        this.el = document.createElement('span');
        this.el.className = 'char-span' + (isSpace ? ' space' : '');
        this.el.style.transition = 'transform 0.35s ' + EASE
            + ', opacity 0.35s ' + EASE
            + ', font-weight 0.6s ' + EASE
            + ', letter-spacing 0.4s ' + EASE;

        this.originX = 0;
        this.originY = 0;
        this.currentTx = 0;
        this.currentTy = 0;
        this.currentRotation = 0;
        this.currentScale = 1;
        this.currentWeight = state.fontWeight;
        this.currentOpacity = 1;
    }

    CharSpan.prototype.setChar = function (ch) {
        if (this.isSpace) {
            this.el.innerHTML = '&nbsp;';
        } else {
            this.el.textContent = ch;
        }
    };

    CharSpan.prototype.updateStyle = function () {
        var s = this.el.style;
        s.fontSize = state.fontSize + 'px';
        s.fontWeight = this.currentWeight;
        s.letterSpacing = state.letterSpacing + 'px';
        s.lineHeight = state.lineHeight;
        s.opacity = this.currentOpacity;
        var tx = this.currentTx;
        var ty = this.currentTy;
        var r  = this.currentRotation;
        var sc = this.currentScale;
        s.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + r + 'deg) scale(' + sc + ')';
    };

    // === Render Characters ===

    function renderChars() {
        typoDisplay.innerHTML = '';
        state.chars = [];

        var text = state.text;
        for (var i = 0; i < text.length; i++) {
            var isSpace = text[i] === ' ';
            var c = new CharSpan(i, isSpace);
            c.setChar(text[i]);
            c.el.style.animation = 'char-enter 0.5s ' + EASE + ' ' + (i * 30) + 'ms both';
            typoDisplay.appendChild(c.el);
            state.chars.push(c);
        }
    }

    // === Animation Modes ===

    function calcWave(c, t, amp, spd) {
        var phase = c.index * 0.45 + t * spd * 0.003;
        c.currentTy = Math.sin(phase) * amp * 0.6;
        c.currentTx = Math.cos(phase * 0.7) * amp * 0.15;
        c.currentRotation = Math.sin(phase + 1.0) * amp * 0.08;
        c.currentScale = 1.0 + Math.sin(phase * 1.3) * amp * 0.002;
        c.currentWeight = state.fontWeight + Math.round(Math.sin(phase * 0.8) * amp * 0.6);
        c.currentOpacity = 0.7 + 0.3 * ((Math.sin(phase) + 1) / 2);
    }

    function calcBreathe(c, t, amp, spd) {
        var breathe = (Math.sin(t * spd * 0.0015) + 1) / 2;
        var charDelay = c.index * 0.15;
        var localPhase = (Math.sin(t * spd * 0.002 - charDelay) + 1) / 2;

        var sizeFactor = breathe * amp * 0.01;
        c.currentScale = 1.0 + sizeFactor * (0.6 + localPhase * 0.4);
        c.currentWeight = state.fontWeight + Math.round(localPhase * amp * 0.8);
        c.currentTx = (localPhase - 0.5) * amp * 0.1;
        c.currentTy = (breathe - 0.5) * amp * -0.15;
        c.currentRotation = 0;
        c.currentOpacity = 0.65 + localPhase * 0.35;
    }

    function calcScatter(c, t, amp, spd) {
        var seed = c.index * 137.508;
        var angle = (seed + t * spd * 0.0008) % (Math.PI * 2);
        var dist = amp * (0.3 + 0.7 * ((Math.sin(seed + t * spd * 0.001) + 1) / 2));

        c.currentTx = Math.cos(angle) * dist * 0.8;
        c.currentTy = Math.sin(angle) * dist * 0.5;
        c.currentRotation = (angle * 180 / Math.PI) * amp * 0.012;
        c.currentScale = 0.6 + 0.4 * ((Math.cos(seed * 0.5 + t * spd * 0.0005) + 1) / 2);
        c.currentWeight = state.fontWeight + Math.round(((Math.sin(seed) + 1) / 2) * amp * 0.5);
        c.currentOpacity = 0.4 + 0.6 * ((Math.cos(angle + t * spd * 0.001) + 1) / 2);
    }

    function calcCascade(c, t, amp, spd) {
        var delay = c.index * 0.18;
        var phase = t * spd * 0.002 - delay;

        c.currentTy = Math.sin(phase) * amp * 0.7;
        c.currentTx = Math.sin(phase * 0.5 + c.index) * amp * 0.12;
        c.currentRotation = Math.sin(phase) * amp * 0.05;

        var squash = Math.cos(phase * 2) * 0.08 * (amp / 100);
        c.currentScale = 1.0 + squash;
        c.currentWeight = state.fontWeight + Math.round(Math.sin(phase + 0.5) * amp * 0.4);
        c.currentOpacity = 0.6 + 0.4 * ((Math.sin(phase * 0.7) + 1) / 2);
    }

    var modeFns = {
        wave: calcWave,
        breathe: calcBreathe,
        scatter: calcScatter,
        cascade: calcCascade
    };

    // === Scramble Effect ===

    function getRandomChar() {
        var all = CHAR_SETS.symbols + CHAR_SETS.latin + CHAR_SETS.digits;
        return all[Math.floor(Math.random() * all.length)];
    }

    function scrambleReveal(text) {
        var totalFrames = 18;
        var chars = state.chars;
        var maxIdx = text.length;

        function frame(iteration) {
            for (var i = 0; i < maxIdx; i++) {
                if (chars[i] && !chars[i].isSpace) {
                    if (i < iteration) {
                        chars[i].setChar(text[i]);
                    } else {
                        chars[i].setChar(getRandomChar());
                    }
                }
            }
            if (iteration < maxIdx) {
                setTimeout(function () { frame(iteration + 1); }, 40);
            }
        }
        frame(0);
    }

    // === Animation Loop ===

    function tick(now) {
        var t = (now - state.startTime) / 1000;
        var amp = state.amplitude;
        var spd = state.speed;
        var fn = modeFns[state.mode] || calcWave;

        for (var i = 0; i < state.chars.length; i++) {
            var c = state.chars[i];
            if (!c.isSpace) {
                fn(c, t, amp, spd);
                c.updateStyle();
            }
        }

        state.rafId = requestAnimationFrame(tick);
    }

    // === Controls Binding ===

    function readControls() {
        state.fontSize = parseInt(ctrlSize.value, 10);
        state.fontWeight = parseInt(ctrlWeight.value, 10);
        state.letterSpacing = parseFloat(ctrlSpacing.value) / 100 * 10;
        state.lineHeight = parseInt(ctrlHeight.value, 10) / 100;
        state.amplitude = parseInt(ctrlAmplitude.value, 10);
        state.speed = parseInt(ctrlSpeed.value, 10);

        valSize.textContent = state.fontSize;
        valWeight.textContent = state.fontWeight;
        valSpacing.textContent = (state.letterSpacing).toFixed(2);
        valHeight.textContent = state.lineHeight.toFixed(2);
        valAmplitude.textContent = state.amplitude;
        valSpeed.textContent = state.speed;
    }

    function onModeChange(mode) {
        state.mode = mode;
        var btns = modeToggle.querySelectorAll('.mode-btn');
        btns.forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-mode') === mode);
        });
    }

    function onPaletteChange(palette) {
        state.palette = palette;
        document.body.className = '';
        if (palette !== 'aurora') {
            document.body.classList.add('palette-' + palette);
        }
        var btns = paletteToggle.querySelectorAll('.palette-btn');
        btns.forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-palette') === palette);
        });
    }

    function onTextChange() {
        var text = inputText.value || 'Typo Shift';
        state.text = text;
        renderChars();
        scrambleReveal(text);
    }

    function onShuffle() {
        var randomMode = MODES[Math.floor(Math.random() * MODES.length)];
        onModeChange(randomMode);

        state.amplitude = 20 + Math.floor(Math.random() * 80);
        state.speed = 20 + Math.floor(Math.random() * 80);
        state.fontSize = 40 + Math.floor(Math.random() * 100);
        state.fontWeight = (Math.floor(Math.random() * 9) + 1) * 100;
        state.letterSpacing = (Math.random() - 0.3) * 6;
        state.lineHeight = 0.9 + Math.random() * 1.5;

        ctrlSize.value = state.fontSize;
        ctrlWeight.value = state.fontWeight;
        ctrlSpacing.value = state.letterSpacing * 10;
        ctrlHeight.value = Math.round(state.lineHeight * 100);
        ctrlAmplitude.value = state.amplitude;
        ctrlSpeed.value = state.speed;
        readControls();

        var charEls = document.querySelectorAll('.char-span');
        charEls.forEach(function (el, i) {
            el.style.animation = 'none';
            el.offsetHeight;
            el.style.animation = 'char-enter 0.5s ' + EASE + ' ' + (i * 25) + 'ms both';
        });
    }

    function onReset() {
        inputText.value = 'Typo Shift';
        ctrlSize.value = 72;
        ctrlWeight.value = 400;
        ctrlSpacing.value = 0;
        ctrlHeight.value = 130;
        ctrlAmplitude.value = 50;
        ctrlSpeed.value = 50;

        state.text = 'Typo Shift';
        readControls();
        onModeChange('wave');
        onPaletteChange('aurora');
        renderChars();
    }

    // === Cursor Tracking ===

    function onMouseMove(e) {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        cursorGlow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%, -50%)';
        if (!cursorGlow.classList.contains('visible')) {
            cursorGlow.classList.add('visible');
        }
    }

    function onMouseLeave() {
        cursorGlow.classList.remove('visible');
    }

    // === Char Hover Meta ===

    function showCharMeta(c, index) {
        charMeta.innerHTML =
            '<span>INDEX <span class="meta-val">' + index + '</span></span>' +
            '<span>TX <span class="meta-val">' + c.currentTx.toFixed(1) + '</span></span>' +
            '<span>TY <span class="meta-val">' + c.currentTy.toFixed(1) + '</span></span>' +
            '<span>ROT <span class="meta-val">' + c.currentRotation.toFixed(1) + '°</span></span>' +
            '<span>W <span class="meta-val">' + Math.round(c.currentWeight) + '</span></span>';
        charMeta.classList.add('visible');
    }

    function hideCharMeta() {
        charMeta.classList.remove('visible');
    }

    // === Init ===

    function init() {
        readControls();
        renderChars();
        scrambleReveal(state.text);

        state.rafId = requestAnimationFrame(tick);

        // Event listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);

        inputText.addEventListener('input', onTextChange);

        btnShuffle.addEventListener('click', onShuffle);
        btnReset.addEventListener('click', onReset);

        ctrlSize.addEventListener('input', readControls);
        ctrlWeight.addEventListener('input', readControls);
        ctrlSpacing.addEventListener('input', readControls);
        ctrlHeight.addEventListener('input', readControls);
        ctrlAmplitude.addEventListener('input', readControls);
        ctrlSpeed.addEventListener('input', readControls);

        modeToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (btn) {
                onModeChange(btn.getAttribute('data-mode'));
            }
        });

        paletteToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.palette-btn');
            if (btn) {
                onPaletteChange(btn.getAttribute('data-palette'));
            }
        });

        typoDisplay.addEventListener('mouseover', function (e) {
            var charSpan = e.target.closest('.char-span');
            if (charSpan) {
                var idx = state.chars.findIndex(function (c) { return c.el === charSpan; });
                if (idx >= 0) showCharMeta(state.chars[idx], idx);
            }
        });

        typoDisplay.addEventListener('mouseout', hideCharMeta);

        // Keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            if (document.activeElement === inputText) return;
            if (e.key === 'r' || e.key === 'R') onReset();
            if (e.key === 's' || e.key === 'S') onShuffle();
            var num = parseInt(e.key, 10);
            if (num >= 1 && num <= 4) onModeChange(MODES[num - 1]);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
