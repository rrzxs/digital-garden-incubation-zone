(function() {
    'use strict';

    const CONFIG = {
        gravityStrength: 80,
        particleCount: 200,
        particleSize: 2,
        friction: 0.985,
        maxVelocity: 15,
        trailLength: 8,
        attractorRadius: 60,
        attractorMass: 100
    };

    const COLOR_PALETTES = {
        cosmic: {
            primary: '#7c3aed',
            secondary: '#a855f7',
            tertiary: '#c084fc',
            glow: 'rgba(168, 85, 247, 0.6)'
        },
        aurora: {
            primary: '#06b6d4',
            secondary: '#10b981',
            tertiary: '#22d3ee',
            glow: 'rgba(34, 211, 238, 0.6)'
        },
        ember: {
            primary: '#f97316',
            secondary: '#ef4444',
            tertiary: '#fbbf24',
            glow: 'rgba(251, 191, 36, 0.6)'
        },
        ice: {
            primary: '#3b82f6',
            secondary: '#60a5fa',
            tertiary: '#93c5fd',
            glow: 'rgba(96, 165, 250, 0.6)'
        }
    };

    const state = {
        canvas: null,
        ctx: null,
        particles: [],
        attractors: [],
        currentMode: 'attract',
        currentPalette: 'cosmic',
        mouse: { x: 0, y: 0 },
        isMouseDown: false,
        animationId: null,
        lastTime: 0,
        frameCount: 0,
        fps: 60,
        showHint: true
    };

    function init() {
        state.canvas = document.getElementById('gravity-canvas');
        state.ctx = state.canvas.getContext('2d');
        
        createStars();
        resizeCanvas();
        createParticles();
        bindEvents();
        bindControls();
        startAnimation();
    }

    function createStars() {
        const starField = document.getElementById('star-field');
        const starCount = 50;
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.opacity = Math.random() * 0.5 + 0.2;
            starField.appendChild(star);
        }
    }

    function resizeCanvas() {
        const rect = state.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        state.canvas.width = rect.width * dpr;
        state.canvas.height = rect.height * dpr;
        state.canvas.style.width = rect.width + 'px';
        state.canvas.style.height = rect.height + 'px';
        
        state.ctx.scale(dpr, dpr);
    }

    function createParticles() {
        state.particles = [];
        const rect = state.canvas.getBoundingClientRect();
        
        for (let i = 0; i < CONFIG.particleCount; i++) {
            state.particles.push(createParticle(rect));
        }
        
        updateParticleCount();
    }

    function createParticle(rect) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.2;
        
        return {
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: CONFIG.particleSize * (0.5 + Math.random() * 0.5),
            trail: [],
            hue: Math.random() * 60 - 30,
            life: 1
        };
    }

    function bindEvents() {
        state.canvas.addEventListener('click', handleCanvasClick);
        state.canvas.addEventListener('mousedown', () => state.isMouseDown = true);
        state.canvas.addEventListener('mouseup', () => state.isMouseDown = false);
        state.canvas.addEventListener('mouseleave', () => state.isMouseDown = false);
        state.canvas.addEventListener('mousemove', handleMouseMove);
        
        window.addEventListener('resize', debounce(() => {
            resizeCanvas();
            createParticles();
        }, 200));
    }

    function handleCanvasClick(e) {
        const rect = state.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        addAttractor(x, y);
        
        if (state.showHint) {
            state.showHint = false;
            document.getElementById('hint-overlay').classList.add('hidden');
        }
    }

    function handleMouseMove(e) {
        const rect = state.canvas.getBoundingClientRect();
        state.mouse.x = e.clientX - rect.left;
        state.mouse.y = e.clientY - rect.top;
    }

    function addAttractor(x, y) {
        const attractor = {
            x,
            y,
            mass: CONFIG.attractorMass,
            radius: CONFIG.attractorRadius,
            type: state.currentMode,
            age: 0,
            pulsePhase: 0
        };
        
        state.attractors.push(attractor);
        updateAttractorCount();
    }

    function bindControls() {
        bindSlider('gravity-strength', 'gravity-value', (val) => {
            CONFIG.gravityStrength = parseInt(val);
            return val;
        });
        
        bindSlider('particle-count', 'particle-value', (val) => {
            const newCount = parseInt(val);
            const rect = state.canvas.getBoundingClientRect();
            
            while (state.particles.length < newCount) {
                state.particles.push(createParticle(rect));
            }
            while (state.particles.length > newCount) {
                state.particles.pop();
            }
            
            CONFIG.particleCount = newCount;
            updateParticleCount();
            return val;
        });
        
        bindSlider('particle-size', 'size-value', (val) => {
            CONFIG.particleSize = parseFloat(val);
            state.particles.forEach(p => {
                p.size = CONFIG.particleSize * (0.5 + Math.random() * 0.5);
            });
            return parseFloat(val).toFixed(1);
        });
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentMode = btn.dataset.mode;
            });
        });
        
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                state.currentPalette = swatch.dataset.color;
            });
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            state.attractors = [];
            updateAttractorCount();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            state.attractors = [];
            createParticles();
            updateAttractorCount();
            state.showHint = true;
            document.getElementById('hint-overlay').classList.remove('hidden');
        });
    }

    function bindSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', () => {
            valueDisplay.textContent = callback(slider.value);
        });
    }

    function startAnimation() {
        function animate(currentTime) {
            updateFPS(currentTime);
            update();
            render();
            state.animationId = requestAnimationFrame(animate);
        }
        animate(0);
    }

    function updateFPS(currentTime) {
        state.frameCount++;
        
        if (currentTime - state.lastTime >= 1000) {
            state.fps = state.frameCount;
            state.frameCount = 0;
            state.lastTime = currentTime;
            document.getElementById('fps-counter').textContent = state.fps;
        }
    }

    function update() {
        const rect = state.canvas.getBoundingClientRect();
        let totalEnergy = 0;
        
        state.attractors.forEach(a => {
            a.age++;
            a.pulsePhase += 0.05;
        });
        
        state.particles.forEach(particle => {
            state.attractors.forEach(attractor => {
                const dx = attractor.x - particle.x;
                const dy = attractor.y - particle.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq) || 1;
                
                if (dist < attractor.radius * 3) {
                    const force = (CONFIG.gravityStrength * attractor.mass) / (distSq + 1000);
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    
                    switch (attractor.type) {
                        case 'attract':
                            particle.vx += dirX * force * 0.01;
                            particle.vy += dirY * force * 0.01;
                            break;
                            
                        case 'repel':
                            particle.vx -= dirX * force * 0.015;
                            particle.vy -= dirY * force * 0.015;
                            break;
                            
                        case 'orbit':
                            particle.vx += dirX * force * 0.008;
                            particle.vy += dirY * force * 0.008;
                            particle.vx += -dirY * force * 0.006;
                            particle.vy += dirX * force * 0.006;
                            break;
                    }
                }
            });
            
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > CONFIG.maxVelocity) {
                particle.vx = (particle.vx / speed) * CONFIG.maxVelocity;
                particle.vy = (particle.vy / speed) * CONFIG.maxVelocity;
            }
            
            particle.vx *= CONFIG.friction;
            particle.vy *= CONFIG.friction;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0) { particle.x = rect.width; }
            if (particle.x > rect.width) { particle.x = 0; }
            if (particle.y < 0) { particle.y = rect.height; }
            if (particle.y > rect.height) { particle.y = 0; }
            
            particle.trail.unshift({ x: particle.x, y: particle.y });
            if (particle.trail.length > CONFIG.trailLength) {
                particle.trail.pop();
            }
            
            totalEnergy += speed * speed;
        });
        
        document.getElementById('energy-display').textContent = Math.round(totalEnergy);
    }

    function render() {
        const rect = state.canvas.getBoundingClientRect();
        const ctx = state.ctx;
        const palette = COLOR_PALETTES[state.currentPalette];
        
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        state.attractors.forEach(attractor => {
            const pulseScale = 1 + Math.sin(attractor.pulsePhase) * 0.1;
            const radius = attractor.radius * pulseScale;
            
            const gradient = ctx.createRadialGradient(
                attractor.x, attractor.y, 0,
                attractor.x, attractor.y, radius * 2
            );
            
            const alpha = Math.min(0.4, 0.2 + attractor.age * 0.001);
            
            if (attractor.type === 'attract') {
                gradient.addColorStop(0, `rgba(124, 58, 237, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(168, 85, 247, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
            } else if (attractor.type === 'repel') {
                gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
            } else {
                gradient.addColorStop(0, `rgba(34, 211, 238, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(6, 182, 212, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
            }
            
            ctx.beginPath();
            ctx.arc(attractor.x, attractor.y, radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(attractor.x, attractor.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = attractor.type === 'attract' ? '#a855f7' : 
                           attractor.type === 'repel' ? '#ef4444' : '#22d3ee';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(attractor.x, attractor.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });
        
        state.particles.forEach(particle => {
            if (particle.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                
                for (let i = 1; i < particle.trail.length; i++) {
                    ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
                }
                
                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                const alpha = Math.min(0.6, speed * 0.1);
                
                ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.3})`;
                ctx.lineWidth = particle.size * 0.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            const colorIntensity = Math.min(1, speed * 0.15);
            
            const r = parseInt(palette.primary.slice(1, 3), 16);
            const g = parseInt(palette.primary.slice(3, 5), 16);
            const b = parseInt(palette.primary.slice(5, 7), 16);
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + colorIntensity * 0.4})`;
            ctx.fill();
            
            if (speed > 2) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${colorIntensity * 0.3})`;
                ctx.fill();
            }
        });
    }

    function updateAttractorCount() {
        document.getElementById('attractor-count').textContent = state.attractors.length;
    }

    function updateParticleCount() {
        document.getElementById('active-particles').textContent = state.particles.length;
    }

    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
