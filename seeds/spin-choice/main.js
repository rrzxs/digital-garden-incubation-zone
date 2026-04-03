(function() {
    'use strict';

    const CONFIG = {
        MIN_OPTIONS: 2,
        MAX_OPTIONS: 8,
        SPIN_DURATION_MIN: 4000,
        SPIN_DURATION_MAX: 6000,
        EASE_OUT_EXPO: 'cubic-bezier(0.16, 1, 0.3, 1)',
        COLORS: [
            '#ff6b6b',
            '#4ecdc4',
            '#ffe66d',
            '#95e1d3',
            '#f38181',
            '#aa96da',
            '#fcbad3',
            '#a8d8ea'
        ]
    };

    let options = ['喝咖啡', '看电影', '去散步', '读书'];
    let isSpinning = false;
    let currentRotation = 0;
    let dragStartAngle = null;
    let dragLastAngle = null;
    let dragVelocity = 0;
    let dragStartTime = 0;

    const wheel = document.getElementById('wheel');
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spinBtn');
    const optionsList = document.getElementById('optionsList');
    const addOptionBtn = document.getElementById('addOptionBtn');
    const optionCount = document.getElementById('optionCount');
    const resultOverlay = document.getElementById('resultOverlay');
    const resultText = document.getElementById('resultText');
    const resultClose = document.getElementById('resultClose');

    function init() {
        setupCanvas();
        renderOptions();
        drawWheel();
        bindEvents();
    }

    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = wheel.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    }

    function drawWheel() {
        const rect = wheel.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(centerX, centerY) - 2;

        ctx.clearRect(0, 0, rect.width, rect.height);

        if (options.length === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const sliceAngle = (Math.PI * 2) / options.length;

        options.forEach((option, index) => {
            const startAngle = index * sliceAngle - Math.PI / 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            const color = CONFIG.COLORS[index % CONFIG.COLORS.length];
            ctx.fillStyle = color;
            ctx.fill();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = getContrastColor(color);
            ctx.font = `500 ${Math.max(12, Math.min(16, radius / 12))}px "Inter", sans-serif`;
            
            const text = option.length > 10 ? option.substring(0, 10) + '...' : option;
            const textRadius = radius * 0.65;
            ctx.fillText(text, textRadius, 0);
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
    }

    function renderOptions() {
        optionsList.innerHTML = '';
        
        options.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.dataset.index = index;
            item.innerHTML = `
                <input type="text" class="option-input" value="${escapeHtml(option)}" placeholder="输入选项...">
                <button class="option-delete" aria-label="删除选项">✕</button>
            `;
            optionsList.appendChild(item);
        });

        updateOptionCount();
        updateAddButton();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateOptionCount() {
        optionCount.textContent = `${options.length} 个选项`;
    }

    function updateAddButton() {
        addOptionBtn.disabled = options.length >= CONFIG.MAX_OPTIONS;
    }

    function bindEvents() {
        spinBtn.addEventListener('click', startSpin);

        optionsList.addEventListener('input', (e) => {
            if (e.target.classList.contains('option-input')) {
                const item = e.target.closest('.option-item');
                const index = parseInt(item.dataset.index);
                options[index] = e.target.value.trim() || `选项 ${index + 1}`;
                drawWheel();
            }
        });

        optionsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-delete')) {
                if (options.length > CONFIG.MIN_OPTIONS) {
                    const item = e.target.closest('.option-item');
                    const index = parseInt(item.dataset.index);
                    options.splice(index, 1);
                    renderOptions();
                    drawWheel();
                }
            }
        });

        addOptionBtn.addEventListener('click', () => {
            if (options.length < CONFIG.MAX_OPTIONS) {
                options.push(`选项 ${options.length + 1}`);
                renderOptions();
                drawWheel();
                
                const inputs = optionsList.querySelectorAll('.option-input');
                const lastInput = inputs[inputs.length - 1];
                lastInput.focus();
                lastInput.select();
            }
        });

        resultClose.addEventListener('click', hideResult);
        resultOverlay.addEventListener('click', (e) => {
            if (e.target === resultOverlay) {
                hideResult();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && resultOverlay.classList.contains('visible')) {
                hideResult();
            }
        });

        wheel.addEventListener('mousedown', handleDragStart);
        wheel.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setupCanvas();
                drawWheel();
            }, 100);
        });
    }

    function getAngleFromCenter(clientX, clientY) {
        const rect = wheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(clientY - centerY, clientX - centerX);
    }

    function handleDragStart(e) {
        if (isSpinning) return;
        
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        dragStartAngle = getAngleFromCenter(clientX, clientY);
        dragLastAngle = dragStartAngle;
        dragVelocity = 0;
        dragStartTime = Date.now();
    }

    function handleDragMove(e) {
        if (dragStartAngle === null || isSpinning) return;
        
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const currentAngle = getAngleFromCenter(clientX, clientY);
        let deltaAngle = currentAngle - dragLastAngle;
        
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        
        const now = Date.now();
        const dt = now - dragStartTime;
        if (dt > 0) {
            dragVelocity = deltaAngle / dt * 1000;
        }
        dragStartTime = now;
        
        currentRotation += deltaAngle * (180 / Math.PI);
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        
        dragLastAngle = currentAngle;
    }

    function handleDragEnd(e) {
        if (dragStartAngle === null) return;
        
        dragStartAngle = null;
        dragLastAngle = null;
        
        if (isSpinning) return;
        
        const velocityThreshold = 50;
        if (Math.abs(dragVelocity) > velocityThreshold) {
            startSpin(dragVelocity);
        }
    }

    function startSpin(initialVelocity = 0) {
        if (isSpinning || options.length < CONFIG.MIN_OPTIONS) return;
        
        isSpinning = true;
        spinBtn.disabled = true;
        wheel.classList.add('spinning');

        const extraSpins = 5 + Math.floor(Math.random() * 3);
        const targetIndex = Math.floor(Math.random() * options.length);
        const sliceAngle = 360 / options.length;
        
        let targetAngle = 360 - (targetIndex * sliceAngle + sliceAngle / 2);
        targetAngle = targetAngle % 360;
        
        let totalRotation = extraSpins * 360 + targetAngle - (currentRotation % 360);
        if (totalRotation < 360) totalRotation += 360;
        
        const duration = CONFIG.SPIN_DURATION_MIN + Math.random() * (CONFIG.SPIN_DURATION_MAX - CONFIG.SPIN_DURATION_MIN);
        
        animateSpin(currentRotation, currentRotation + totalRotation, duration, targetIndex);
    }

    function animateSpin(startAngle, endAngle, duration, targetIndex) {
        const startTime = performance.now();
        
        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            
            currentRotation = startAngle + (endAngle - startAngle) * easedProgress;
            wheel.style.transform = `rotate(${currentRotation}deg)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                currentRotation = currentRotation % 360;
                isSpinning = false;
                spinBtn.disabled = false;
                wheel.classList.remove('spinning');
                showResult(options[targetIndex]);
            }
        }
        
        requestAnimationFrame(animate);
    }

    function showResult(result) {
        resultText.textContent = result;
        resultOverlay.classList.add('visible');
        
        setTimeout(() => {
            resultText.style.animation = 'none';
            resultText.offsetHeight;
            resultText.style.animation = 'text-shimmer 2s ease-in-out infinite';
        }, 300);
    }

    function hideResult() {
        resultOverlay.classList.remove('visible');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
