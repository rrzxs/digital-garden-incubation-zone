(function() {
    'use strict';

    const DOM = {
        textInput: document.getElementById('text-input'),
        glitchDisplay: document.getElementById('glitch-display'),
        glitchContainer: document.getElementById('glitch-container'),
        glitchText: document.querySelector('.glitch-text'),
        modeSelector: document.getElementById('mode-selector'),
        intensitySlider: document.getElementById('intensity-slider'),
        intensityValue: document.getElementById('intensity-value'),
        speedSlider: document.getElementById('speed-slider'),
        speedValue: document.getElementById('speed-value'),
        randomizeBtn: document.getElementById('randomize-btn'),
        triggerBtn: document.getElementById('trigger-btn'),
        currentMode: document.getElementById('current-mode'),
        fpsCounter: document.getElementById('fps-counter')
    };

    const state = {
        text: 'GLITCH',
        mode: 'rgb-split',
        intensity: 50,
        speed: 70,
        isGlitching: false,
        lastFrameTime: performance.now(),
        frameCount: 0
    };

    const MODE_MAP = {
        'rgb-split': 'RGB_SPLIT',
        'slice': 'SLICE',
        'noise': 'NOISE',
        'wave': 'WAVE',
        'corrupt': 'CORRUPT'
    };

    function init() {
        bindEvents();
        updateText();
        startFPSCounter();
        initHoverEffects();
    }

    function bindEvents() {
        DOM.textInput.addEventListener('input', handleTextInput);
        DOM.modeSelector.addEventListener('click', handleModeSelect);
        DOM.intensitySlider.addEventListener('input', handleIntensityChange);
        DOM.speedSlider.addEventListener('input', handleSpeedChange);
        DOM.randomizeBtn.addEventListener('click', handleRandomize);
        DOM.triggerBtn.addEventListener('click', handleTrigger);
        DOM.glitchContainer.addEventListener('click', handleContainerClick);
    }

    function handleTextInput(e) {
        const value = e.target.value.trim().toUpperCase() || 'GLITCH';
        state.text = value;
        updateText();
    }

    function updateText() {
        DOM.glitchText.textContent = state.text;
        DOM.glitchText.setAttribute('data-text', state.text);
    }

    function handleModeSelect(e) {
        const btn = e.target.closest('.mode-btn');
        if (!btn) return;

        const mode = btn.dataset.mode;
        if (!mode || mode === state.mode) return;

        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        DOM.glitchContainer.classList.remove(
            'slice-mode', 
            'noise-mode', 
            'wave-mode', 
            'corrupt-mode'
        );

        state.mode = mode;
        DOM.currentMode.textContent = MODE_MAP[mode];

        if (mode !== 'rgb-split') {
            DOM.glitchContainer.classList.add(`${mode}-mode`);
        }
    }

    function handleIntensityChange(e) {
        state.intensity = parseInt(e.target.value, 10);
        DOM.intensityValue.textContent = state.intensity;
        updateGlitchIntensity();
    }

    function handleSpeedChange(e) {
        state.speed = parseInt(e.target.value, 10);
        DOM.speedValue.textContent = state.speed;
        updateGlitchSpeed();
    }

    function updateGlitchIntensity() {
        const intensity = state.intensity / 100;
        const offset = 0.05 * intensity;
        
        DOM.glitchText.style.setProperty('--glitch-offset', `${offset}em`);
        
        const duration = 2 - (intensity * 1.5);
        DOM.glitchText.style.animationDuration = `${Math.max(0.3, duration)}s`;
    }

    function updateGlitchSpeed() {
        const speed = state.speed / 100;
        const baseDuration = 2;
        const duration = baseDuration / (0.5 + speed);
        
        if (!state.isGlitching) {
            DOM.glitchText.style.animationDuration = `${Math.max(0.2, duration)}s`;
        }
    }

    function handleRandomize() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&';
        let randomText = '';
        const length = Math.floor(Math.random() * 8) + 4;
        
        for (let i = 0; i < length; i++) {
            randomText += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        state.text = randomText;
        DOM.textInput.value = randomText;
        
        animateTextReveal(randomText);
        
        const modes = ['rgb-split', 'slice', 'noise', 'wave', 'corrupt'];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        const modeBtn = document.querySelector(`[data-mode="${randomMode}"]`);
        if (modeBtn) {
            modeBtn.click();
        }

        state.intensity = Math.floor(Math.random() * 100) + 1;
        DOM.intensitySlider.value = state.intensity;
        DOM.intensityValue.textContent = state.intensity;
        updateGlitchIntensity();

        state.speed = Math.floor(Math.random() * 100) + 1;
        DOM.speedSlider.value = state.speed;
        DOM.speedValue.textContent = state.speed;
        updateGlitchSpeed();

        triggerGlitchBurst();
    }

    function animateTextReveal(text) {
        const chars = text.split('');
        let currentIndex = 0;
        
        const revealInterval = setInterval(() => {
            if (currentIndex >= chars.length) {
                clearInterval(revealInterval);
                updateText();
                return;
            }
            
            const partialText = text.slice(0, currentIndex + 1);
            const scrambledRest = scrambleText(text.length - currentIndex - 1);
            
            DOM.glitchText.textContent = partialText + scrambledRest;
            DOM.glitchText.setAttribute('data-text', partialText + scrambledRest);
            
            currentIndex++;
        }, 50);
    }

    function scrambleText(length) {
        const chars = '!@#$%&*<>?/\\|';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function handleTrigger() {
        triggerGlitchBurst();
    }

    function triggerGlitchBurst() {
        if (state.isGlitching) return;

        state.isGlitching = true;
        DOM.glitchContainer.classList.add('glitching');

        const burstDuration = 300 + Math.random() * 200;
        
        setTimeout(() => {
            state.isGlitching = false;
            DOM.glitchContainer.classList.remove('glitching');
            updateText();
        }, burstDuration);
    }

    function handleContainerClick() {
        triggerGlitchBurst();
    }

    function initHoverEffects() {
        let hoverTimeout = null;

        DOM.glitchContainer.addEventListener('mouseenter', () => {
            hoverTimeout = setTimeout(() => {
                if (!state.isGlitching) {
                    triggerMicroGlitch();
                }
            }, 200);
        });

        DOM.glitchContainer.addEventListener('mouseleave', () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        });

        DOM.glitchContainer.addEventListener('mousemove', (e) => {
            const rect = DOM.glitchContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            applyMouseDistortion(x, y);
        });
    }

    function triggerMicroGlitch() {
        const originalText = state.text;
        const glitchChars = '!@#$%&*<>?/';
        const positions = [];
        
        for (let i = 0; i < 3; i++) {
            positions.push(Math.floor(Math.random() * originalText.length));
        }

        const glitchedText = originalText.split('').map((char, index) => {
            if (positions.includes(index)) {
                return glitchChars.charAt(Math.floor(Math.random() * glitchChars.length));
            }
            return char;
        }).join('');

        DOM.glitchText.textContent = glitchedText;
        DOM.glitchText.setAttribute('data-text', glitchedText);

        setTimeout(() => {
            DOM.glitchText.textContent = originalText;
            DOM.glitchText.setAttribute('data-text', originalText);
        }, 100);
    }

    function applyMouseDistortion(x, y) {
        const offsetX = (x - 0.5) * (state.intensity / 100) * 10;
        const offsetY = (y - 0.5) * (state.intensity / 100) * 5;
        
        DOM.glitchText.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        clearTimeout(state.distortionTimeout);
        state.distortionTimeout = setTimeout(() => {
            DOM.glitchText.style.transform = '';
        }, 100);
    }

    function startFPSCounter() {
        let lastTime = performance.now();
        let frames = 0;

        function updateFPS() {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                DOM.fpsCounter.textContent = frames;
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updateFPS);
        }

        requestAnimationFrame(updateFPS);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
