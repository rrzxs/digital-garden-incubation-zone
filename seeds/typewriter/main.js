(function() {
    const paper = document.getElementById('paper');
    const paperContent = document.getElementById('paper-content');
    const cursor = document.getElementById('cursor');
    const inputArea = document.getElementById('input-area');
    const typeHead = document.getElementById('type-head');
    const soundToggle = document.getElementById('sound-toggle');
    const clearBtn = document.getElementById('clear-btn');
    const newLineBtn = document.getElementById('new-line-btn');

    let soundEnabled = false;
    let audioContext = null;
    let typedContent = '';
    let isTyping = false;
    let typingQueue = [];
    let charIndex = 0;

    const TYPE_DELAY_MIN = 50;
    const TYPE_DELAY_MAX = 120;
    const CHARS_PER_LINE = 65;
    const LINE_HEIGHT = 28;

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playTypeSound(isBell = false) {
        if (!soundEnabled || !audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (isBell) {
            oscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } else {
            const freqVariation = Math.random() * 100 - 50;
            oscillator.frequency.setValueAtTime(180 + freqVariation, audioContext.currentTime);
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        }
    }

    function getRandomDelay() {
        return Math.floor(Math.random() * (TYPE_DELAY_MAX - TYPE_DELAY_MIN + 1)) + TYPE_DELAY_MIN;
    }

    function updateTypeHeadPosition() {
        const containerWidth = paperContent.offsetWidth || 600;
        const charWidth = 10.5;
        const currentLineLength = typedContent.split('\n').pop().length;
        const maxChars = Math.floor((containerWidth - 80) / charWidth);
        
        const position = Math.min(currentLineLength, maxChars) * charWidth + 40;
        typeHead.style.left = `${Math.min(position, containerWidth - 20)}px`;
    }

    function typeCharacter(char) {
        return new Promise((resolve) => {
            typedContent += char;
            
            const textNode = document.createTextNode(char);
            cursor.parentNode.insertBefore(textNode, cursor);
            
            textNode.classList = 'char-typed';
            
            typeHead.classList.add('typing');
            setTimeout(() => typeHead.classList.remove('typing'), 80);
            
            playTypeSound();
            updateTypeHeadPosition();
            
            const delay = getRandomDelay();
            setTimeout(resolve, delay);
        });
    }

    function handleNewLine() {
        return new Promise((resolve) => {
            typedContent += '\n';
            
            const br = document.createElement('br');
            cursor.parentNode.insertBefore(br, cursor);
            
            playTypeSound(true);
            
            paper.classList.add('paperScroll');
            setTimeout(() => paper.classList.remove('paperScroll'), 300);
            
            updateTypeHeadPosition();
            
            setTimeout(resolve, 200);
        });
    }

    function handleBackspace() {
        if (typedContent.length === 0) return;
        
        typedContent = typedContent.slice(0, -1);
        
        const contentNodes = paperContent.childNodes;
        for (let i = contentNodes.length - 1; i >= 0; i--) {
            const node = contentNodes[i];
            if (node.nodeType === Node.TEXT_NODE && node.textContent.length > 0) {
                node.textContent = node.textContent.slice(0, -1);
                if (node.textContent.length === 0) {
                    node.remove();
                }
                break;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
                node.remove();
                break;
            }
        }
        
        updateTypeHeadPosition();
    }

    async function processTypingQueue() {
        if (isTyping || typingQueue.length === 0) return;
        
        isTyping = true;
        
        while (typingQueue.length > 0) {
            const item = typingQueue.shift();
            
            if (item.type === 'char') {
                await typeCharacter(item.value);
            } else if (item.type === 'newline') {
                await handleNewLine();
            } else if (item.type === 'backspace') {
                handleBackspace();
                await new Promise(r => setTimeout(r, 30));
            }
        }
        
        isTyping = false;
    }

    function queueCharacter(char) {
        typingQueue.push({ type: 'char', value: char });
        processTypingQueue();
    }

    function queueNewLine() {
        typingQueue.push({ type: 'newline' });
        processTypingQueue();
    }

    function queueBackspace() {
        typingQueue.push({ type: 'backspace' });
        processTypingQueue();
    }

    function clearContent() {
        typedContent = '';
        paperContent.innerHTML = '';
        paperContent.appendChild(cursor);
        typingQueue = [];
        updateTypeHeadPosition();
    }

    function focusInput() {
        inputArea.focus();
        paper.classList.add('active');
    }

    function handleInput(event) {
        const inputValue = inputArea.value;
        
        if (inputValue.length > 0) {
            const newChars = inputValue;
            for (const char of newChars) {
                queueCharacter(char);
            }
            inputArea.value = '';
        }
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            queueNewLine();
            inputArea.value = '';
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            queueBackspace();
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('active', soundEnabled);
        
        if (soundEnabled) {
            initAudio();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }
    }

    paper.addEventListener('click', focusInput);

    inputArea.addEventListener('input', handleInput);
    inputArea.addEventListener('keydown', handleKeyDown);

    inputArea.addEventListener('blur', () => {
        paper.classList.remove('active');
    });

    soundToggle.addEventListener('click', toggleSound);

    clearBtn.addEventListener('click', () => {
        clearContent();
        focusInput();
    });

    newLineBtn.addEventListener('click', () => {
        queueNewLine();
        focusInput();
    });

    document.addEventListener('keydown', (e) => {
        if (e.target === inputArea) return;
        
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            focusInput();
            queueCharacter(e.key);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            focusInput();
            queueNewLine();
            e.preventDefault();
        }
    });

    updateTypeHeadPosition();

    const rollerKnobs = document.querySelectorAll('.roller-knob');
    rollerKnobs.forEach(knob => {
        knob.addEventListener('click', () => {
            paper.classList.add('paperScroll');
            setTimeout(() => paper.classList.remove('paperScroll'), 300);
        });
    });
})();
