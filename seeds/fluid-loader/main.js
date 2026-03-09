(function() {
    'use strict';

    const canvas = document.getElementById('fluidCanvas');
    const ctx = canvas.getContext('2d');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const particleCountEl = document.getElementById('particleCount');
    const fpsCountEl = document.getElementById('fpsCount');
    const restartBtn = document.getElementById('restartBtn');
    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const loadingOverlay = document.querySelector('.loading-overlay');

    let width, height;
    let particles = [];
    let mouse = { x: 0, y: 0, active: false };
    let loadingProgress = 0;
    let isLoading = true;
    let currentMode = 'fluid';
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    const PARTICLE_COUNT = 800;
    const BASE_PARTICLE_SIZE = 2.5;
    const MOUSE_RADIUS = 100;
    const MAX_VELOCITY = 3;
    const DAMPING = 0.98;
    const MOUSE_FORCE = 0.5;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        
        width = rect.width;
        height = rect.height;
        
        initParticles();
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.baseX = this.x;
            this.baseY = this.y;
            this.size = BASE_PARTICLE_SIZE * (0.8 + Math.random() * 0.4);
            
            const colors = [
                { r: 99, g: 102, b: 241 },
                { r: 139, g: 92, b: 246 },
                { r: 236, g: 72, b: 153 },
                { r: 59, g: 130, b: 246 }
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.alpha = 0.3 + Math.random() * 0.4;
        }

        update(loadingFactor) {
            const fluidIntensity = isLoading ? loadingFactor : 1;
            
            if (mouse.active) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < MOUSE_RADIUS) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
                    const angle = Math.atan2(dy, dx);
                    const pushForce = force * MOUSE_FORCE * fluidIntensity * 10;
                    
                    if (currentMode === 'fluid') {
                        this.vx -= Math.cos(angle) * pushForce;
                        this.vy -= Math.sin(angle) * pushForce;
                    } else {
                        this.vx += Math.cos(angle) * pushForce * 0.5;
                        this.vy += Math.sin(angle) * pushForce * 0.5;
                    }
                }
            }

            if (currentMode === 'fluid') {
                if (isLoading) {
                    const time = Date.now() * 0.001;
                    const noiseX = Math.sin(this.x * 0.01 + time) * Math.cos(this.y * 0.01 + time * 0.7) * loadingFactor;
                    const noiseY = Math.cos(this.x * 0.01 + time) * Math.sin(this.y * 0.01 + time * 0.7) * loadingFactor;
                    
                    this.vx += noiseX * 0.02;
                    this.vy += noiseY * 0.02;
                }
            } else {
                const time = Date.now() * 0.002;
                const centerX = width / 2;
                const centerY = height / 2;
                const dx = this.baseX - centerX;
                const dy = this.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) + time;
                
                this.vx += Math.cos(angle) * 0.01;
                this.vy += Math.sin(angle) * 0.01;
            }

            this.vx *= DAMPING;
            this.vy *= DAMPING;

            this.x += this.vx * fluidIntensity;
            this.y += this.vy * fluidIntensity;

            const maxVel = MAX_VELOCITY * (isLoading ? (1 - loadingFactor * 0.5) : 1);
            const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (vel > maxVel) {
                this.vx = (this.vx / vel) * maxVel;
                this.vy = (this.vy / vel) * maxVel;
            }

            if (this.x < 0) {
                this.x = 0;
                this.vx *= -0.5;
            }
            if (this.x > width) {
                this.x = width;
                this.vx *= -0.5;
            }
            if (this.y < 0) {
                this.y = 0;
                this.vy *= -0.5;
            }
            if (this.y > height) {
                this.y = height;
                this.vy *= -0.5;
            }

            this.alpha = 0.3 + Math.min(vel / maxVel, 0.7);
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size * 2
            );
            
            gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`);
            gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }
        particleCountEl.textContent = particles.length;
    }

    function updateLoadingProgress() {
        if (!isLoading) return;

        loadingProgress += Math.random() * 0.5 + 0.1;
        
        if (loadingProgress >= 100) {
            loadingProgress = 100;
            isLoading = false;
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 500);
        }

        const displayProgress = Math.min(loadingProgress, 100);
        progressFill.style.width = `${displayProgress}%`;
        progressText.textContent = `${Math.floor(displayProgress)}%`;
    }

    function drawConnections() {
        const maxDist = 50;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.2;
                    const avgColor = {
                        r: (particles[i].color.r + particles[j].color.r) / 2,
                        g: (particles[i].color.g + particles[j].color.g) / 2,
                        b: (particles[i].color.b + particles[j].color.b) / 2
                    };
                    
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        const currentTime = performance.now();
        frameCount++;
        
        if (currentTime - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = currentTime;
            fpsCountEl.textContent = fps;
        }

        if (isLoading) {
            updateLoadingProgress();
        }

        ctx.clearRect(0, 0, width, height);

        const loadingFactor = loadingProgress / 100;

        if (mouse.active) {
            const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        particles.forEach(particle => {
            particle.update(loadingFactor);
            particle.draw();
        });

        if (currentMode === 'fluid') {
            drawConnections();
        }

        requestAnimationFrame(animate);
    }

    function handleResize() {
        resizeCanvas();
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
    }

    function handleMouseLeave() {
        mouse.active = false;
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
        mouse.active = true;
    }

    function handleTouchEnd() {
        mouse.active = false;
    }

    function handleRestart() {
        loadingProgress = 0;
        isLoading = true;
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        loadingOverlay.classList.remove('hidden');
        
        particles.forEach(particle => {
            particle.reset();
        });
    }

    function handleToggleMode() {
        currentMode = currentMode === 'fluid' ? 'vortex' : 'fluid';
    }

    function init() {
        resizeCanvas();
        
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        
        window.addEventListener('resize', handleResize);
        restartBtn.addEventListener('click', handleRestart);
        toggleModeBtn.addEventListener('click', handleToggleMode);
        
        animate();
    }

    init();

})();
