document.addEventListener('DOMContentLoaded', () => {
    const typingArea = document.getElementById('typing-area');
    const echoContainer = document.querySelector('.echo-container');
    const charCount = document.getElementById('char-count');
    const echoCount = document.getElementById('echo-count');
    const rhythmIndicator = document.getElementById('rhythm-indicator');
    const soundToggle = document.getElementById('sound-toggle');
    const echoToggle = document.getElementById('echo-toggle');
    const clearBtn = document.getElementById('clear-btn');

    let totalCharacters = 0;
    let totalEchoes = 0;
    let lastKeystrokeTime = 0;
    let keystrokes = [];
    let soundEnabled = true;
    let echoEnabled = true;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillatorPool = [];
    const MAX_OSCILLATORS = 10;

    function getOscillator() {
        if (oscillatorPool.length < MAX_OSCILLATORS) {
            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioContext.destination);
            osc.start();
            gainNode.gain.value = 0;
            oscillatorPool.push({ osc, gainNode });
            return { osc, gainNode };
        }
        return oscillatorPool.find(o => o.gainNode.gain.value < 0.01) || oscillatorPool[0];
    }

    function playEchoSound(character) {
        if (!soundEnabled) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const { osc, gainNode } = getOscillator();
        const now = audioContext.currentTime;

        const baseFreq = 440;
        const charCode = character.charCodeAt(0);
        const freq = baseFreq * (1 + (charCode % 12) / 6);
        
        osc.frequency.setValueAtTime(freq, now);
        osc.type = 'sine';

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        setTimeout(() => {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * 1.5, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        }, 50);
    }

    function createEchoEffect(character, rect) {
        if (!echoEnabled) return;

        const echo = document.createElement('span');
        echo.className = 'echo-character';
        echo.textContent = character;
        echo.style.left = `${rect.left + rect.width / 2}px`;
        echo.style.top = `${rect.top + rect.height / 2}px`;

        const randomAngle = Math.random() * 360;
        const randomDistance = 20 + Math.random() * 30;
        echo.style.setProperty('--angle', `${randomAngle}deg`);
        echo.style.setProperty('--distance', `${randomDistance}px`);

        const colors = [
            '#f093fb',
            '#667eea',
            '#764ba2',
            '#00d4ff',
            '#ff6b9d'
        ];
        echo.style.color = colors[Math.floor(Math.random() * colors.length)];

        echoContainer.appendChild(echo);
        totalEchoes++;
        updateStats();

        setTimeout(() => {
            echo.remove();
        }, 1500);
    }

    function updateStats() {
        charCount.textContent = totalCharacters;
        echoCount.textContent = totalEchoes;
    }

    function calculateRhythm() {
        if (keystrokes.length < 2) return '--';

        const now = Date.now();
        keystrokes = keystrokes.filter(time => now - time < 3000);

        if (keystrokes.length < 2) return '--';

        const intervals = [];
        for (let i = 1; i < keystrokes.length; i++) {
            intervals.push(keystrokes[i] - keystrokes[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const keystrokesPerSecond = 1000 / avgInterval;

        if (keystrokesPerSecond > 5) return '⚡ 极快';
        if (keystrokesPerSecond > 3) return '🔥 快速';
        if (keystrokesPerSecond > 1.5) return '📝 稳健';
        if (keystrokesPerSecond > 0.5) return '😌 悠闲';
        return '🌸 宁静';
    }

    function showKeyPressAnimation(key) {
        const animation = document.createElement('div');
        animation.className = 'key-press-animation';
        animation.textContent = key;
        document.body.appendChild(animation);

        setTimeout(() => {
            animation.remove();
        }, 600);
    }

    typingArea.addEventListener('input', (e) => {
        const now = Date.now();
        keystrokes.push(now);
        rhythmIndicator.textContent = calculateRhythm();

        if (e.inputType === 'insertText' && e.data) {
            const character = e.data;
            totalCharacters++;

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                if (rect.width > 0 && rect.height > 0) {
                    createEchoEffect(character, rect);
                }
            }

            playEchoSound(character);
            showKeyPressAnimation(character);
            updateStats();
        }
    });

    typingArea.addEventListener('keydown', (e) => {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            playEchoSound(e.key);
        }
    });

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('active', soundEnabled);
        soundToggle.querySelector('.icon').textContent = soundEnabled ? '🔊' : '🔇';
    });

    echoToggle.addEventListener('click', () => {
        echoEnabled = !echoEnabled;
        echoToggle.classList.toggle('active', echoEnabled);
        echoToggle.querySelector('.icon').textContent = echoEnabled ? '💫' : '✨';
    });

    clearBtn.addEventListener('click', () => {
        typingArea.innerHTML = '';
        totalCharacters = 0;
        updateStats();
        rhythmIndicator.textContent = '--';
    });

    typingArea.addEventListener('focus', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });

    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });

    const resizeObserver = new ResizeObserver(() => {
        const echoes = document.querySelectorAll('.echo-character');
        echoes.forEach(echo => {
            const rect = typingArea.getBoundingClientRect();
            echo.style.left = `${rect.left + rect.width / 2}px`;
            echo.style.top = `${rect.top + rect.height / 2}px`;
        });
    });

    resizeObserver.observe(typingArea);

    setInterval(() => {
        rhythmIndicator.textContent = calculateRhythm();
    }, 1000);
});
