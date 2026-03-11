/**
 * 文字解密 - 交互逻辑
 * Text Scramble Effect with Advanced Micro-interactions
 */

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // 字符集配置
    // -------------------------------------------------------------------------
    const CHARSETS = {
        hex: '0123456789ABCDEF',
        binary: '01',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789'
    };

    // -------------------------------------------------------------------------
    // 速度配置
    // -------------------------------------------------------------------------
    const SPEEDS = {
        slow: { frameDelay: 80, iterations: 3 },
        normal: { frameDelay: 50, iterations: 2 },
        fast: { frameDelay: 30, iterations: 1 },
        instant: { frameDelay: 10, iterations: 1 }
    };

    // -------------------------------------------------------------------------
    // 预设文字
    // -------------------------------------------------------------------------
    const PRESETS = [
        'HELLO WORLD',
        'DIGITAL GARDEN',
        'CREATIVE CODE',
        'FUTURE IS NOW',
        'DESIGN SYSTEMS',
        'THINK DIFFERENT',
        'BREAKING BAD',
        'STRANGER THINGS',
        'BLACK MIRROR',
        'WESTWORLD'
    ];

    // -------------------------------------------------------------------------
    // DOM 元素
    // -------------------------------------------------------------------------
    const output = document.getElementById('scramble-output');
    const targetInput = document.getElementById('target-input');
    const speedSelect = document.getElementById('speed-select');
    const charsetSelect = document.getElementById('charset-select');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const randomBtn = document.getElementById('random-btn');
    const charCount = document.getElementById('char-count');
    const progressFill = document.getElementById('progress-fill');
    const presetGrid = document.getElementById('preset-grid');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const cursorGlow = document.getElementById('cursor-glow');

    // -------------------------------------------------------------------------
    // 状态管理
    // -------------------------------------------------------------------------
    let state = {
        isRunning: false,
        currentMode: 'single',
        loopInterval: null,
        cascadeIndex: 0
    };

    // -------------------------------------------------------------------------
    // Scramble 类
    // -------------------------------------------------------------------------
    class TextScrambler {
        constructor(element) {
            this.element = element;
            this.chars = [];
            this.frame = 0;
            this.queue = [];
            this.resolve = null;
            this.frameRequest = null;
        }

        setText(newText) {
            const oldText = this.element.textContent;
            const length = Math.max(oldText.length, newText.length);
            
            this.element.innerHTML = newText.split('').map((char, i) => {
                return `<span class="char" data-index="${i}">${char}</span>`;
            }).join('');

            this.chars = Array.from(this.element.querySelectorAll('.char'));
            return this.animate(newText);
        }

        animate(targetText) {
            return new Promise((resolve) => {
                this.resolve = resolve;
                this.queue = [];
                
                const speed = SPEEDS[speedSelect.value];
                const charset = CHARSETS[charsetSelect.value];
                
                for (let i = 0; i < targetText.length; i++) {
                    const from = Math.random() * speed.iterations * 10;
                    const to = from + Math.random() * speed.iterations * 10;
                    const start = Math.floor(from);
                    const end = Math.floor(to);
                    
                    this.queue.push({
                        from: targetText[i] === ' ' ? ' ' : charset[Math.floor(Math.random() * charset.length)],
                        to: targetText[i],
                        start: start,
                        end: end,
                        char: targetText[i]
                    });
                }
                
                this.frame = 0;
                this.update(charset, speed);
            });
        }

        update(charset, speed) {
            let complete = 0;
            
            for (let i = 0; i < this.queue.length; i++) {
                const item = this.queue[i];
                const charEl = this.chars[i];
                
                if (!charEl) continue;
                
                if (this.frame >= item.end) {
                    complete++;
                    charEl.textContent = item.to;
                    charEl.classList.remove('scrambling');
                    charEl.classList.add('resolved');
                } else if (this.frame >= item.start) {
                    if (!charEl.classList.contains('scrambling')) {
                        charEl.classList.add('scrambling');
                    }
                    
                    if (item.char !== ' ') {
                        const randomChar = charset[Math.floor(Math.random() * charset.length)];
                        charEl.textContent = randomChar;
                    } else {
                        charEl.textContent = ' ';
                    }
                }
            }
            
            const progress = (complete / this.queue.length) * 100;
            progressFill.style.width = `${progress}%`;
            charCount.textContent = `${complete} / ${this.queue.length}`;
            
            if (complete === this.queue.length) {
                this.resolve();
                output.classList.remove('decrypting');
                return;
            }
            
            this.frame++;
            setTimeout(() => {
                requestAnimationFrame(() => this.update(charset, speed));
            }, speed.frameDelay);
        }

        reset() {
            this.queue = [];
            this.frame = 0;
            this.element.innerHTML = '';
            this.chars = [];
            if (this.frameRequest) {
                cancelAnimationFrame(this.frameRequest);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 初始化 Scrambler
    // -------------------------------------------------------------------------
    const scrambler = new TextScrambler(output);

    // -------------------------------------------------------------------------
    // 预设按钮渲染
    // -------------------------------------------------------------------------
    function renderPresets() {
        presetGrid.innerHTML = '';
        PRESETS.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset;
            btn.addEventListener('click', () => {
                targetInput.value = preset;
                startScramble();
            });
            presetGrid.appendChild(btn);
        });
    }

    // -------------------------------------------------------------------------
    // 核心功能
    // -------------------------------------------------------------------------
    async function startScramble() {
        if (state.isRunning) return;
        
        const text = targetInput.value.trim() || 'HELLO WORLD';
        state.isRunning = true;
        output.classList.add('decrypting');
        
        updateStartBtn(true);
        
        await scrambler.setText(text);
        
        state.isRunning = false;
        updateStartBtn(false);
        
        if (state.currentMode === 'loop') {
            scheduleNextLoop();
        } else if (state.currentMode === 'cascade') {
            scheduleCascade();
        }
    }

    function scheduleNextLoop() {
        if (state.loopInterval) clearTimeout(state.loopInterval);
        state.loopInterval = setTimeout(() => {
            if (state.currentMode === 'loop') {
                targetInput.value = PRESETS[Math.floor(Math.random() * PRESETS.length)];
                startScramble();
            }
        }, 2000);
    }

    function scheduleCascade() {
        if (state.loopInterval) clearTimeout(state.loopInterval);
        state.loopInterval = setTimeout(() => {
            if (state.currentMode === 'cascade') {
                state.cascadeIndex = (state.cascadeIndex + 1) % PRESETS.length;
                targetInput.value = PRESETS[state.cascadeIndex];
                startScramble();
            }
        }, 2500);
    }

    function resetScramble() {
        if (state.loopInterval) clearTimeout(state.loopInterval);
        state.isRunning = false;
        scrambler.reset();
        output.classList.remove('decrypting');
        progressFill.style.width = '0%';
        charCount.textContent = '0 / 0';
        updateStartBtn(false);
    }

    function randomText() {
        const randomPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
        targetInput.value = randomPreset;
        startScramble();
    }

    function updateStartBtn(running) {
        const btnText = startBtn.querySelector('.btn-text');
        const btnIcon = startBtn.querySelector('.btn-icon');
        
        if (running) {
            btnText.textContent = '解密中...';
            btnIcon.textContent = '⏳';
            startBtn.disabled = true;
        } else {
            btnText.textContent = '开始解密';
            btnIcon.textContent = '▶';
            startBtn.disabled = false;
        }
    }

    function setMode(mode) {
        state.currentMode = mode;
        modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (state.loopInterval) clearTimeout(state.loopInterval);
    }

    // -------------------------------------------------------------------------
    // 光标跟随效果
    // -------------------------------------------------------------------------
    function initCursorGlow() {
        let mouseX = 0, mouseY = 0;
        let glowX = 0, glowY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorGlow.style.opacity = '1';
        });
        
        document.addEventListener('mouseleave', () => {
            cursorGlow.style.opacity = '0';
        });
        
        function animateGlow() {
            glowX += (mouseX - glowX) * 0.1;
            glowY += (mouseY - glowY) * 0.1;
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
            requestAnimationFrame(animateGlow);
        }
        
        animateGlow();
    }

    // -------------------------------------------------------------------------
    // 事件绑定
    // -------------------------------------------------------------------------
    function bindEvents() {
        startBtn.addEventListener('click', startScramble);
        resetBtn.addEventListener('click', resetScramble);
        randomBtn.addEventListener('click', randomText);
        
        targetInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                startScramble();
            }
        });
        
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setMode(btn.dataset.mode);
            });
        });
    }

    // -------------------------------------------------------------------------
    // 初始化
    // -------------------------------------------------------------------------
    function init() {
        renderPresets();
        bindEvents();
        initCursorGlow();
        
        output.textContent = '点击「开始解密」';
        charCount.textContent = '0 / 0';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
