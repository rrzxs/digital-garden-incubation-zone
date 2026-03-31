(function() {
    'use strict';

    const FOCUS_DURATION = 25 * 60;
    const BREAK_DURATION = 5 * 60;
    const CIRCUMFERENCE = 2 * Math.PI * 130;

    let state = {
        isRunning: false,
        isPaused: false,
        isBreak: false,
        timeLeft: FOCUS_DURATION,
        completedPomodoros: 0,
        totalFocusMinutes: 0,
        soundEnabled: false,
        timerInterval: null,
        audioContext: null
    };

    const dom = {
        timeDisplay: document.getElementById('time-display'),
        phaseLabel: document.getElementById('phase-label'),
        statusText: document.getElementById('status-text'),
        completedCount: document.getElementById('completed-count'),
        totalTime: document.getElementById('total-time'),
        ringProgress: document.querySelector('.ring-progress'),
        timerArea: document.querySelector('.timer-area'),
        soundToggle: document.getElementById('sound-toggle'),
        resetBtn: document.getElementById('reset-btn'),
        completionModal: document.getElementById('completion-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalDesc: document.getElementById('modal-desc'),
        modalBtn: document.getElementById('modal-btn')
    };

    function init() {
        loadStats();
        updateDisplay();
        bindEvents();
    }

    function loadStats() {
        try {
            const saved = localStorage.getItem('focusPulseStats');
            if (saved) {
                const data = JSON.parse(saved);
                state.completedPomodoros = data.completedPomodoros || 0;
                state.totalFocusMinutes = data.totalFocusMinutes || 0;
            }
        } catch (e) {
            console.warn('Failed to load stats:', e);
        }
        updateStatsDisplay();
    }

    function saveStats() {
        try {
            localStorage.setItem('focusPulseStats', JSON.stringify({
                completedPomodoros: state.completedPomodoros,
                totalFocusMinutes: state.totalFocusMinutes
            }));
        } catch (e) {
            console.warn('Failed to save stats:', e);
        }
    }

    function bindEvents() {
        dom.timerArea.addEventListener('click', handleTimerClick);
        dom.soundToggle.addEventListener('click', toggleSound);
        dom.resetBtn.addEventListener('click', resetTimer);
        dom.modalBtn.addEventListener('click', handleModalAction);
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleTimerClick();
            }
            if (e.code === 'KeyR' && !state.isRunning) {
                resetTimer();
            }
        });
    }

    function handleTimerClick() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        state.isRunning = true;
        state.isPaused = false;
        document.body.classList.add('is-running');
        dom.statusText.textContent = state.isBreak ? '休息中...' : '专注中...';
        
        state.timerInterval = setInterval(tick, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        state.isPaused = true;
        document.body.classList.remove('is-running');
        dom.statusText.textContent = '已暂停';
        
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }

    function tick() {
        if (state.timeLeft > 0) {
            state.timeLeft--;
            updateDisplay();
        } else {
            completePhase();
        }
    }

    function completePhase() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        document.body.classList.remove('is-running');

        if (state.soundEnabled) {
            playCompletionSound();
        }

        if (state.isBreak) {
            showModal(
                '休息结束!',
                '准备好继续专注了吗?',
                '开始专注'
            );
        } else {
            state.completedPomodoros++;
            state.totalFocusMinutes += 25;
            saveStats();
            updateStatsDisplay();
            
            showModal(
                '专注完成!',
                '休息一下，让大脑充充电',
                '开始休息'
            );
        }
    }

    function showModal(title, desc, btnText) {
        dom.modalTitle.textContent = title;
        dom.modalDesc.textContent = desc;
        dom.modalBtn.textContent = btnText;
        dom.completionModal.classList.add('show');
    }

    function hideModal() {
        dom.completionModal.classList.remove('show');
    }

    function handleModalAction() {
        hideModal();
        
        if (state.isBreak) {
            startFocus();
        } else {
            startBreak();
        }
    }

    function startFocus() {
        state.isBreak = false;
        state.timeLeft = FOCUS_DURATION;
        document.body.classList.remove('mode-break');
        dom.phaseLabel.textContent = '专注时间';
        updateDisplay();
        
        setTimeout(() => startTimer(), 300);
    }

    function startBreak() {
        state.isBreak = true;
        state.timeLeft = BREAK_DURATION;
        document.body.classList.add('mode-break');
        dom.phaseLabel.textContent = '休息时间';
        updateDisplay();
        
        setTimeout(() => startTimer(), 300);
    }

    function resetTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        state.isPaused = false;
        state.isBreak = false;
        state.timeLeft = FOCUS_DURATION;
        
        document.body.classList.remove('is-running', 'mode-break');
        dom.phaseLabel.textContent = '专注时间';
        dom.statusText.textContent = '点击圆环开始专注';
        updateDisplay();
    }

    function updateDisplay() {
        const minutes = Math.floor(state.timeLeft / 60);
        const seconds = state.timeLeft % 60;
        dom.timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const totalDuration = state.isBreak ? BREAK_DURATION : FOCUS_DURATION;
        const progress = state.timeLeft / totalDuration;
        const offset = CIRCUMFERENCE * (1 - progress);
        dom.ringProgress.style.strokeDashoffset = offset;
    }

    function updateStatsDisplay() {
        dom.completedCount.textContent = state.completedPomodoros;
        dom.totalTime.textContent = state.totalFocusMinutes;
    }

    function toggleSound() {
        state.soundEnabled = !state.soundEnabled;
        dom.soundToggle.classList.toggle('active', state.soundEnabled);
        
        if (state.soundEnabled && !state.audioContext) {
            try {
                state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio not supported:', e);
                state.soundEnabled = false;
                dom.soundToggle.classList.remove('active');
            }
        }
    }

    function playCompletionSound() {
        if (!state.audioContext) return;
        
        try {
            const ctx = state.audioContext;
            const now = ctx.currentTime;
            
            const oscillator1 = ctx.createOscillator();
            const gainNode1 = ctx.createGain();
            oscillator1.type = 'sine';
            oscillator1.frequency.setValueAtTime(523.25, now);
            oscillator1.frequency.setValueAtTime(659.25, now + 0.15);
            gainNode1.gain.setValueAtTime(0.3, now);
            gainNode1.gain.exponentialDecayTo = 0.01;
            gainNode1.gain.setValueAtTime(0.3, now);
            gainNode1.gain.linearRampToValueAtTime(0.01, now + 0.5);
            oscillator1.connect(gainNode1);
            gainNode1.connect(ctx.destination);
            oscillator1.start(now);
            oscillator1.stop(now + 0.5);

            const oscillator2 = ctx.createOscillator();
            const gainNode2 = ctx.createGain();
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(783.99, now + 0.2);
            gainNode2.gain.setValueAtTime(0.2, now + 0.2);
            gainNode2.gain.linearRampToValueAtTime(0.01, now + 0.7);
            oscillator2.connect(gainNode2);
            gainNode2.connect(ctx.destination);
            oscillator2.start(now + 0.2);
            oscillator2.stop(now + 0.7);
        } catch (e) {
            console.warn('Failed to play sound:', e);
        }
    }

    init();
})();
