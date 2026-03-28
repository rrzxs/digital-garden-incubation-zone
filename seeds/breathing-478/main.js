document.addEventListener('DOMContentLoaded', () => {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const iconPlay = playPauseBtn.querySelector('.icon-play');
    const iconPause = playPauseBtn.querySelector('.icon-pause');
    const resetBtn = document.getElementById('reset-btn');
    const soundToggle = document.getElementById('sound-toggle');
    const statusText = document.getElementById('status-text');
    const phaseCount = document.getElementById('phase-count');
    const phaseLabel = document.getElementById('phase-label');
    const cycleCount = document.getElementById('cycle-count');
    const totalTime = document.getElementById('total-time');
    const progressCircle = document.getElementById('progress-circle');

    const INHALE = 4;
    const HOLD = 7;
    const EXHALE = 8;
    const CYCLE_DURATION = INHALE + HOLD + EXHALE;
    const CIRCUMFERENCE = 2 * Math.PI * 90;

    let isPlaying = false;
    let isSoundOn = false;
    let currentPhase = 'ready';
    let phaseTimeLeft = 0;
    let completedCycles = 0;
    let totalSeconds = 0;
    let mainInterval = null;
    let audioCtx = null;

    progressCircle.style.strokeDasharray = CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = CIRCUMFERENCE;

    const phases = {
        inhale: { duration: INHALE, label: '吸气', next: 'hold' },
        hold: { duration: HOLD, label: '屏息', next: 'exhale' },
        exhale: { duration: EXHALE, label: '呼气', next: 'inhale' }
    };

    function updateProgress(ratio) {
        const offset = CIRCUMFERENCE * (1 - ratio);
        progressCircle.style.strokeDashoffset = offset;
    }

    function setPhase(phase) {
        currentPhase = phase;
        phaseTimeLeft = phases[phase].duration;
        phaseLabel.textContent = phases[phase].label;
        phaseCount.textContent = phaseTimeLeft;
        
        phaseCount.className = 'phase-count';
        phaseCount.classList.add(`phase-${phase}`);
        
        if (phase === 'inhale') {
            progressCircle.style.stroke = 'var(--color-accent)';
        } else if (phase === 'hold') {
            progressCircle.style.stroke = '#ffd93d';
        } else {
            progressCircle.style.stroke = 'var(--color-accent-alt)';
        }
        
        if (isSoundOn) playTick();
    }

    function tick() {
        if (phaseTimeLeft > 0) {
            phaseTimeLeft--;
            phaseCount.textContent = phaseTimeLeft;
            
            const totalPhaseTime = phases[currentPhase].duration;
            const elapsed = totalPhaseTime - phaseTimeLeft;
            const ratio = elapsed / totalPhaseTime;
            updateProgress(ratio);
            
            if (isSoundOn && phaseTimeLeft > 0) playTick();
        }
        
        if (phaseTimeLeft === 0) {
            const nextPhase = phases[currentPhase].next;
            
            if (nextPhase === 'inhale') {
                completedCycles++;
                cycleCount.textContent = completedCycles;
            }
            
            setPhase(nextPhase);
        }
        
        totalSeconds++;
        updateTimeDisplay();
    }

    function updateTimeDisplay() {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        totalTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function startSession() {
        statusText.textContent = '保持节奏...';
        isPlaying = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        
        if (currentPhase === 'ready') {
            setPhase('inhale');
        }
        
        mainInterval = setInterval(tick, 1000);
    }

    function pauseSession() {
        statusText.textContent = '已暂停';
        isPlaying = false;
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        clearInterval(mainInterval);
    }

    function resetSession() {
        pauseSession();
        currentPhase = 'ready';
        phaseTimeLeft = 0;
        completedCycles = 0;
        totalSeconds = 0;
        
        phaseCount.textContent = '4';
        phaseCount.className = 'phase-count';
        phaseLabel.textContent = '准备吸气';
        cycleCount.textContent = '0';
        totalTime.textContent = '00:00';
        statusText.textContent = '深度放松呼吸法';
        
        progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
        progressCircle.style.stroke = 'var(--color-accent)';
    }

    function playTick() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = currentPhase === 'hold' ? 520 : 440;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    }

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseSession();
        } else {
            startSession();
        }
    });

    resetBtn.addEventListener('click', resetSession);

    soundToggle.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        const tooltip = soundToggle.querySelector('.tooltip');
        
        if (isSoundOn) {
            soundToggle.style.color = 'var(--color-accent)';
            tooltip.textContent = '关闭音效';
        } else {
            soundToggle.style.color = 'var(--color-text-sub)';
            tooltip.textContent = '打开音效';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            playPauseBtn.click();
        } else if (e.code === 'KeyR') {
            resetBtn.click();
        }
    });
});
