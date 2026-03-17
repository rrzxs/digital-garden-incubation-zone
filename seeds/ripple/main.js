(function() {
    const canvas = document.getElementById('ripple-canvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('canvas-overlay');
    
    const radiusSlider = document.getElementById('ripple-radius');
    const decaySlider = document.getElementById('decay-rate');
    const intensitySlider = document.getElementById('intensity');
    const radiusValue = document.getElementById('radius-value');
    const decayValue = document.getElementById('decay-value');
    const intensityValue = document.getElementById('intensity-value');
    const clearBtn = document.getElementById('clear-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fpsDisplay = document.getElementById('fps-display');
    const rippleCountDisplay = document.getElementById('ripple-count');
    const touchCountDisplay = document.getElementById('touch-count');
    const colorBtns = document.querySelectorAll('.color-btn');
    const modeBtns = document.querySelectorAll('.mode-btn');
    
    let ripples = [];
    let rippleRadius = 60;
    let decayRate = 0.5;
    let intensity = 60;
    let hasInteracted = false;
    let touchCount = 0;
    let isAutoMode = false;
    let autoInterval = null;
    
    const palettes = {
        ocean: {
            primary: { r: 0, g: 180, b: 216 },
            secondary: { r: 144, g: 224, b: 239 },
            accent: { r: 0, g: 119, b: 182 }
        },
        aurora: {
            primary: { r: 0, g: 212, b: 255 },
            secondary: { r: 168, g: 85, b: 247 },
            accent: { r: 0, g: 255, b: 136 }
        },
        sakura: {
            primary: { r: 255, g: 183, b: 197 },
            secondary: { r: 255, g: 105, b: 180 },
            accent: { r: 255, g: 192, b: 203 }
        },
        midnight: {
            primary: { r: 26, g: 26, b: 46 },
            secondary: { r: 22, g: 33, b: 62 },
            accent: { r: 15, g: 52, b: 96 }
        }
    };
    
    let currentPalette = palettes.ocean;
    
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    
    class Ripple {
        constructor(x, y, radius, intensity, palette) {
            this.x = x;
            this.y = y;
            this.radius = 0;
            this.maxRadius = radius;
            this.intensity = intensity / 100;
            this.palette = palette;
            this.alpha = 1;
            this.lineWidth = 3;
            this.speed = 4;
            this.phase = 0;
        }
        
        update(deltaTime) {
            const dt = deltaTime / 16.67;
            const easeProgress = 1 - Math.pow(1 - this.radius / this.maxRadius, 3);
            this.radius += this.speed * dt * (1 - easeProgress * 0.5);
            this.phase += 0.08 * dt;
            
            const progress = this.radius / this.maxRadius;
            this.alpha = Math.max(0, 1 - Math.pow(progress, 2)) * this.intensity;
            this.lineWidth = Math.max(0.5, 3 * (1 - progress * 0.7));
            
            return this.alpha > 0.01;
        }
        
        draw(ctx) {
            const { primary, secondary, accent } = this.palette;
            
            const numRings = 3;
            for (let i = 0; i < numRings; i++) {
                const ringOffset = i * 15;
                const ringRadius = Math.max(0, this.radius - ringOffset);
                if (ringRadius <= 0) continue;
                
                const ringAlpha = this.alpha * (1 - i * 0.3);
                const waveOffset = Math.sin(this.phase + i * 0.5) * 3;
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius + waveOffset, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${ringAlpha * 0.6})`;
                ctx.lineWidth = this.lineWidth * (1 - i * 0.2);
                ctx.stroke();
            }
            
            const glowRadius = this.radius * 0.3;
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, glowRadius
            );
            gradient.addColorStop(0, `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${this.alpha * 0.4})`);
            gradient.addColorStop(0.5, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${this.alpha * 0.2})`);
            gradient.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            if (this.radius > 20) {
                const innerGlow = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius * 0.15
                );
                innerGlow.addColorStop(0, `rgba(255, 255, 255, ${this.alpha * 0.3})`);
                innerGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = innerGlow;
                ctx.fill();
            }
        }
    }
    
    function createRipple(x, y) {
        if (!hasInteracted) {
            hasInteracted = true;
            overlay.classList.add('hidden');
        }
        
        const palette = currentPalette;
        const baseRadius = rippleRadius + Math.random() * 30 - 15;
        const baseIntensity = intensity + Math.random() * 20 - 10;
        
        ripples.push(new Ripple(x, y, baseRadius, baseIntensity, palette));
        
        if (Math.random() > 0.5) {
            setTimeout(() => {
                ripples.push(new Ripple(
                    x + (Math.random() - 0.5) * 20,
                    y + (Math.random() - 0.5) * 20,
                    baseRadius * 0.6,
                    baseIntensity * 0.5,
                    palette
                ));
            }, 50);
        }
        
        touchCount++;
        touchCountDisplay.textContent = touchCount;
    }
    
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    function updateFPS() {
        const now = performance.now();
        frameCount++;
        
        if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
            fpsDisplay.textContent = fps;
        }
    }
    
    let lastFrameTime = 0;
    
    function animate(currentTime) {
        const deltaTime = currentTime - lastFrameTime || 16.67;
        lastFrameTime = currentTime;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ripples = ripples.filter(ripple => {
            const alive = ripple.update(deltaTime);
            if (alive) {
                ripple.draw(ctx);
            }
            return alive;
        });
        
        rippleCountDisplay.textContent = ripples.length;
        updateFPS();
        
        requestAnimationFrame(animate);
    }
    
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    canvas.addEventListener('click', (e) => {
        const coords = getCanvasCoords(e);
        createRipple(coords.x, coords.y);
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const coords = getCanvasCoords(e);
        createRipple(coords.x, coords.y);
    }, { passive: false });
    
    let isMouseDown = false;
    let lastMousePos = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        lastMousePos = getCanvasCoords(e);
    });
    
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const coords = getCanvasCoords(e);
        const dist = Math.hypot(coords.x - lastMousePos.x, coords.y - lastMousePos.y);
        if (dist > 30) {
            createRipple(coords.x, coords.y);
            lastMousePos = coords;
        }
    });
    
    radiusSlider.addEventListener('input', (e) => {
        rippleRadius = parseInt(e.target.value);
        radiusValue.textContent = rippleRadius;
    });
    
    decaySlider.addEventListener('input', (e) => {
        decayRate = parseInt(e.target.value) / 100;
        decayValue.textContent = decayRate.toFixed(2);
    });
    
    intensitySlider.addEventListener('input', (e) => {
        intensity = parseInt(e.target.value);
        intensityValue.textContent = intensity;
    });
    
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const paletteName = btn.dataset.palette;
            currentPalette = palettes[paletteName];
        });
    });
    
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            isAutoMode = mode === 'auto';
            
            if (isAutoMode) {
                startAutoMode();
            } else {
                stopAutoMode();
            }
        });
    });
    
    function startAutoMode() {
        if (autoInterval) return;
        
        if (!hasInteracted) {
            hasInteracted = true;
            overlay.classList.add('hidden');
        }
        
        autoInterval = setInterval(() => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.random() * rect.width;
            const y = Math.random() * rect.height;
            createRipple(x, y);
        }, 800 + Math.random() * 400);
    }
    
    function stopAutoMode() {
        if (autoInterval) {
            clearInterval(autoInterval);
            autoInterval = null;
        }
    }
    
    clearBtn.addEventListener('click', () => {
        ripples = [];
        hasInteracted = false;
        touchCount = 0;
        touchCountDisplay.textContent = 0;
        overlay.classList.remove('hidden');
        stopAutoMode();
        
        const autoBtn = document.querySelector('[data-mode="auto"]');
        const interactBtn = document.querySelector('[data-mode="interact"]');
        autoBtn.classList.remove('active');
        interactBtn.classList.add('active');
        isAutoMode = false;
    });
    
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullscreenBtn.querySelector('span').textContent = '退出';
        } else {
            document.exitFullscreen();
            fullscreenBtn.querySelector('span').textContent = '全屏';
        }
    });
    
    window.addEventListener('resize', resize);
    
    resize();
    requestAnimationFrame(animate);
})();
