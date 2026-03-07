class Particle {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = Math.random() * 15 + 5;
        this.shape = Math.random() > 0.5 ? 'circle' : 'square';
        this.color = this.getRandomColor();
        this.mass = this.radius * 0.5;
        this.trail = [];
        this.maxTrailLength = 15;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    }

    getRandomColor() {
        const colors = [
            'rgba(244, 114, 182, 0.8)',
            'rgba(167, 139, 250, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(139, 92, 246, 0.8)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(canvasWidth, canvasHeight, mouseX, mouseY, magnetMode, magnetStrength, magnetRadius) {
        this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        this.trail.forEach(point => {
            point.alpha -= 0.07;
        });

        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < magnetRadius) {
            const force = (1 - distance / magnetRadius) * magnetStrength * 0.1;
            const angle = Math.atan2(dy, dx);
            
            if (magnetMode === 'attract') {
                this.vx += Math.cos(angle) * force;
                this.vy += Math.sin(angle) * force;
            } else {
                this.vx -= Math.cos(angle) * force * 1.5;
                this.vy -= Math.sin(angle) * force * 1.5;
            }
        }

        this.vx *= 0.99;
        this.vy *= 0.99;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.radius) {
            this.x = this.radius;
            this.vx *= -0.8;
        }
        if (this.x > canvasWidth - this.radius) {
            this.x = canvasWidth - this.radius;
            this.vx *= -0.8;
        }
        if (this.y < this.radius) {
            this.y = this.radius;
            this.vy *= -0.8;
        }
        if (this.y > canvasHeight - this.radius) {
            this.y = canvasHeight - this.radius;
            this.vy *= -0.8;
        }

        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        this.trail.forEach((point, index) => {
            const alpha = Math.max(0, point.alpha);
            if (alpha > 0) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.radius * 0.5 * (index / this.maxTrailLength), 0, Math.PI * 2);
                ctx.fillStyle = this.color.replace('0.8)', `${alpha * 0.3})`);
                ctx.fill();
            }
        });

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.beginPath();
        if (this.shape === 'circle') {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else {
            ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        }
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.restore();
    }
}

class MagneticCursor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cursorGlow = document.querySelector('.cursor-glow');
        
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.magnetMode = 'attract';
        this.magnetStrength = 0.5;
        this.particleCount = 30;
        this.magnetRadius = 200;
        
        this.particles = [];
        this.isMouseDown = false;
        
        this.lastTime = performance.now();
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', () => this.handleMouseDown());
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchstart', () => this.handleMouseDown());
        document.addEventListener('touchend', () => this.handleMouseUp());

        document.getElementById('btn-attract').addEventListener('click', () => this.setMode('attract'));
        document.getElementById('btn-repel').addEventListener('click', () => this.setMode('repel'));

        const forceSlider = document.getElementById('force-slider');
        forceSlider.addEventListener('input', (e) => {
            this.magnetStrength = e.target.value / 100;
            document.getElementById('force-value').textContent = `${e.target.value}%`;
        });

        const countSlider = document.getElementById('count-slider');
        countSlider.addEventListener('input', (e) => {
            this.particleCount = parseInt(e.target.value);
            this.updateParticleCount();
            document.getElementById('count-value').textContent = e.target.value;
        });

        this.createParticles();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.updateCursorGlow();
    }

    handleTouchMove(e) {
        if (e.touches.length > 0) {
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
            this.updateCursorGlow();
        }
    }

    handleMouseDown() {
        this.isMouseDown = true;
        this.magnetRadius = 300;
    }

    handleMouseUp() {
        this.isMouseDown = false;
        this.magnetRadius = 200;
    }

    updateCursorGlow() {
        this.cursorGlow.style.left = `${this.mouseX}px`;
        this.cursorGlow.style.top = `${this.mouseY}px`;
        this.cursorGlow.style.opacity = '1';
    }

    setMode(mode) {
        this.magnetMode = mode;
        document.getElementById('btn-attract').classList.toggle('active', mode === 'attract');
        document.getElementById('btn-repel').classList.toggle('active', mode === 'repel');
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
        document.getElementById('element-display').textContent = this.particleCount;
    }

    updateParticleCount() {
        const currentLength = this.particles.length;
        if (this.particleCount > currentLength) {
            for (let i = 0; i < this.particleCount - currentLength; i++) {
                this.particles.push(new Particle(this.canvas.width, this.canvas.height));
            }
        } else if (this.particleCount < currentLength) {
            this.particles.splice(this.particleCount);
        }
        document.getElementById('element-display').textContent = this.particleCount;
    }

    checkCollisions() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = p1.radius + p2.radius;
                
                if (distance < minDist) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDist - distance;
                    
                    p1.x -= Math.cos(angle) * overlap * 0.5;
                    p1.y -= Math.sin(angle) * overlap * 0.5;
                    p2.x += Math.cos(angle) * overlap * 0.5;
                    p2.y += Math.sin(angle) * overlap * 0.5;
                    
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const dvx = p2.vx - p1.vx;
                    const dvy = p2.vy - p1.vy;
                    const dvn = dvx * nx + dvy * ny;
                    
                    if (dvn > 0) {
                        const restitution = 0.8;
                        const m1 = p1.mass;
                        const m2 = p2.mass;
                        const totalMass = m1 + m2;
                        
                        const impulse = (-(1 + restitution) * dvn) / (1/m1 + 1/m2);
                        
                        p1.vx -= impulse * nx / m1;
                        p1.vy -= impulse * ny / m1;
                        p2.vx += impulse * nx / m2;
                        p2.vy += impulse * ny / m2;
                    }
                }
            }
        }
    }

    updateFPS(currentTime) {
        this.frameCount++;
        const elapsed = currentTime - this.lastFpsUpdate;
        
        if (elapsed >= 500) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            document.getElementById('fps-display').textContent = this.fps;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }

    animate() {
        const currentTime = performance.now();
        this.updateFPS(currentTime);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            particle.update(
                this.canvas.width,
                this.canvas.height,
                this.mouseX,
                this.mouseY,
                this.magnetMode,
                this.magnetStrength,
                this.magnetRadius
            );
            particle.draw(this.ctx);
        });

        this.checkCollisions();

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MagneticCursor();
});
