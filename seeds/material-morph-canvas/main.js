(function () {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('render-canvas');
    const ctx = canvas.getContext('2d');
    const stage = document.getElementById('morph-stage');
    const cursorGlow = document.getElementById('cursor-glow');
    const overlayLabel = document.getElementById('overlay-label');
    const overlayHint = document.getElementById('overlay-hint');
    const hudMaterial = document.getElementById('hud-material');
    const hudVertices = document.getElementById('hud-vertices');
    const hudParticles = document.getElementById('hud-particles');
    const hudFps = document.getElementById('hud-fps');
    const hudEnergy = document.getElementById('hud-energy');

    // === Theme System ===
    const THEMES = {
        'deep-ocean': { accent: '#6366f1', glow: 'rgba(99,102,241,0.5)', particle: [99, 102, 241], fill: 'rgba(99,102,241,0.08)', stroke: 'rgba(99,102,241,0.45)' },
        'aurora': { accent: '#10b981', glow: 'rgba(16,185,129,0.5)', particle: [16, 185, 129], fill: 'rgba(16,185,129,0.08)', stroke: 'rgba(16,185,129,0.45)' },
        'ember': { accent: '#f97316', glow: 'rgba(249,115,22,0.5)', particle: [249, 115, 22], fill: 'rgba(249,115,22,0.08)', stroke: 'rgba(249,115,22,0.45)' },
        'void': { accent: '#e4e4e7', glow: 'rgba(228,228,231,0.4)', particle: [228, 228, 231], fill: 'rgba(228,228,231,0.06)', stroke: 'rgba(228,228,231,0.35)' }
    };

    let currentTheme = 'deep-ocean';
    let themeColor = THEMES[currentTheme];

    // === Material Definitions ===
    const MATERIALS = {
        liquid: {
            label: 'LIQUID',
            hint: '液态 — 流体波动 · 表面张力 · 波纹传导',
            gridSize: 20,
            stiffness: 0.08,
            damping: 0.92,
            noiseAmp: 0.6,
            noiseFreq: 0.008,
            renderMode: 'filled',
            lineWeight: 1.2,
            closed: true
        },
        glass: {
            label: 'GLASS',
            hint: '玻璃 — 刚性多面体 · 棱角折射 · 锐利切面',
            gridSize: 8,
            stiffness: 0.22,
            damping: 0.82,
            noiseAmp: 0.1,
            noiseFreq: 0.002,
            renderMode: 'faceted',
            lineWeight: 1.5,
            closed: true
        },
        crystal: {
            label: 'CRYSTAL',
            hint: '晶体 — 尖锐星形 · 对称生长 · 几何离散',
            gridSize: 12,
            stiffness: 0.15,
            damping: 0.85,
            noiseAmp: 0.3,
            noiseFreq: 0.01,
            renderMode: 'crystalline',
            lineWeight: 1.8,
            closed: true
        },
        plasma: {
            label: 'PLASMA',
            hint: '等离子 — 高能辐射 · 无序扰动 · 能量粒子',
            gridSize: 28,
            stiffness: 0.05,
            damping: 0.88,
            noiseAmp: 1.2,
            noiseFreq: 0.015,
            renderMode: 'energy',
            lineWeight: 0.8,
            closed: false
        },
        fabric: {
            label: 'FABRIC',
            hint: '织物 — 柔顺垂坠 · 经纬编织 · 风力扰动',
            gridSize: 16,
            stiffness: 0.1,
            damping: 0.9,
            noiseAmp: 0.4,
            noiseFreq: 0.005,
            renderMode: 'woven',
            lineWeight: 1.0,
            closed: true
        }
    };

    let currentMaterial = 'liquid';

    // === User-adjustable Parameters (modulate material base) ===
    const params = {
        tension: 5.0,
        viscosity: 4.0,
        noise: 3.0
    };

    // === Canvas State ===
    let W = 0, H = 0, CX = 0, CY = 0, DPR = 1;

    // === Vertex Grid (the morph blob) ===
    let vertices = [];
    let vertexCount = 0;
    const baseRadius = 180;

    // === Particle System ===
    let particles = [];
    const MAX_PARTICLES = 120;

    // === Shockwaves ===
    let shockwaves = [];

    // === Mouse State ===
    const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, down: false, inside: false };

    // === FPS Tracking ===
    let fps = 0;
    let frameCount = 0;
    let fpsTimer = 0;
    let lastTime = performance.now();

    // === Simplex-ish Noise (value noise with smoothstep) ===
    const noiseSeed = {};
    const noisePerm = [];
    (function initNoise() {
        for (let i = 0; i < 512; i++) {
            noisePerm[i] = Math.floor(Math.random() * 256);
        }
    })();

    function valueNoise(x, y) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        const aa = noisePerm[noisePerm[xi] + yi] / 256;
        const ab = noisePerm[noisePerm[xi] + yi + 1] / 256;
        const ba = noisePerm[noisePerm[xi + 1] + yi] / 256;
        const bb = noisePerm[noisePerm[xi + 1] + yi + 1] / 256;
        const lerp = (a, b, t) => a + (b - a) * t;
        return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
    }

    // === Resize Handler ===
    function resize() {
        const rect = stage.getBoundingClientRect();
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = rect.width;
        H = rect.height;
        CX = W / 2;
        CY = H / 2;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        rebuildVertices();
    }

    // === Vertex Management ===
    function rebuildVertices() {
        const mat = MATERIALS[currentMaterial];
        const count = mat.gridSize;
        vertices = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            vertices.push({
                angle: angle,
                restAngle: angle,
                ox: CX + Math.cos(angle) * baseRadius,
                oy: CY + Math.sin(angle) * baseRadius,
                x: CX + Math.cos(angle) * baseRadius,
                y: CY + Math.sin(angle) * baseRadius,
                vx: 0,
                vy: 0
            });
        }
        vertexCount = count;
        hudVertices.textContent = count;
    }

    function transitionMaterial(newMaterial) {
        if (newMaterial === currentMaterial) return;
        currentMaterial = newMaterial;
        const mat = MATERIALS[newMaterial];

        // Morph vertex count gradually by rebuilding with velocity preservation
        const oldPositions = vertices.map(v => ({
            angle: v.angle,
            x: v.x,
            y: v.y,
            vx: v.vx,
            vy: v.vy
        }));

        const newCount = mat.gridSize;
        const newVertices = [];
        for (let i = 0; i < newCount; i++) {
            const angle = (i / newCount) * Math.PI * 2 - Math.PI / 2;
            const ox = CX + Math.cos(angle) * baseRadius;
            const oy = CY + Math.sin(angle) * baseRadius;

            // Find nearest old vertex for velocity inheritance
            let nearest = oldPositions[0];
            let minDist = Infinity;
            for (const old of oldPositions) {
                let angleDiff = Math.abs(angle - old.angle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                if (angleDiff < minDist) {
                    minDist = angleDiff;
                    nearest = old;
                }
            }

            newVertices.push({
                angle: angle,
                restAngle: angle,
                ox: ox,
                oy: oy,
                x: nearest.x,
                y: nearest.y,
                vx: nearest.vx,
                vy: nearest.vy
            });
        }
        vertices = newVertices;
        vertexCount = newCount;

        overlayLabel.textContent = mat.label;
        overlayHint.textContent = mat.hint;
        hudMaterial.textContent = mat.label;

        // Emit burst particles on material switch
        emitBurst(CX, CY, 30);
    }

    // === Physics Update ===
    function updateVertices(dt, time) {
        const mat = MATERIALS[currentMaterial];
        const tensionMul = params.tension / 5;
        const viscosityMul = params.viscosity / 5;
        const noiseMul = params.noise / 5;

        const stiffness = mat.stiffness * tensionMul;
        const damping = Math.max(0.7, mat.damping - (viscosityMul - 1) * 0.02);
        const noiseAmp = mat.noiseAmp * noiseMul;
        const noiseFreq = mat.noiseFreq;

        let totalEnergy = 0;

        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];

            // Spring force toward rest position (with noise-driven offset)
            const noiseVal = valueNoise(
                v.ox * noiseFreq + time * 0.0003,
                v.oy * noiseFreq + time * 0.0003
            );
            const noiseOffset = (noiseVal - 0.5) * 2 * noiseAmp * 40;

            // Dynamic rest radius based on angle and noise
            let restR = baseRadius + noiseOffset;
            if (mat.renderMode === 'crystalline') {
                // Star-like shape: alternating long/short radius
                const starVal = Math.sin(v.angle * 5 + time * 0.0008);
                restR += starVal * 30 * noiseMul;
            } else if (mat.renderMode === 'energy') {
                // Chaotic plasma radius
                restR += Math.sin(time * 0.002 + i * 0.7) * 25 * noiseMul;
                restR += valueNoise(i * 0.5, time * 0.001) * 30 * noiseMul;
            } else if (mat.renderMode === 'woven') {
                // Fabric wave
                restR += Math.sin(v.angle * 3 + time * 0.001) * 20 * noiseMul;
            }

            const targetX = CX + Math.cos(v.angle) * restR;
            const targetY = CY + Math.sin(v.angle) * restR;

            // Spring toward dynamic target
            const fx = (targetX - v.x) * stiffness;
            const fy = (targetY - v.y) * stiffness;
            v.vx += fx;
            v.vy += fy;

            // Mouse interaction force
            if (mouse.inside) {
                const dx = v.x - mouse.x;
                const dy = v.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const forceRadius = 140;
                if (dist < forceRadius && dist > 0.1) {
                    const force = (1 - dist / forceRadius);
                    const power = force * force * 8;
                    v.vx += (dx / dist) * power;
                    v.vy += (dy / dist) * power;
                }

                // Mouse velocity drag effect
                if (dist < 100) {
                    v.vx += mouse.vx * 0.1 * (1 - dist / 100);
                    v.vy += mouse.vy * 0.1 * (1 - dist / 100);
                }
            }

            // Shockwave forces
            for (const sw of shockwaves) {
                const dx = v.x - sw.x;
                const dy = v.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const waveFront = sw.radius;
                const bandWidth = 60;
                if (Math.abs(dist - waveFront) < bandWidth && dist > 0.1) {
                    const intensity = sw.power * (1 - Math.abs(dist - waveFront) / bandWidth);
                    v.vx += (dx / dist) * intensity;
                    v.vy += (dy / dist) * intensity;
                }
            }

            // Neighbor attraction (maintain smoothness)
            const prev = vertices[(i - 1 + vertices.length) % vertices.length];
            const next = vertices[(i + 1) % vertices.length];
            const midX = (prev.x + next.x) * 0.5;
            const midY = (prev.y + next.y) * 0.5;
            const smoothStr = mat.renderMode === 'faceted' ? 0.02 : (mat.renderMode === 'crystalline' ? 0.04 : 0.08);
            v.vx += (midX - v.x) * smoothStr;
            v.vy += (midY - v.y) * smoothStr;

            // Apply damping
            v.vx *= damping;
            v.vy *= damping;

            // Apply velocity
            v.x += v.vx;
            v.y += v.vy;

            totalEnergy += Math.abs(v.vx) + Math.abs(v.vy);
        }

        hudEnergy.textContent = (totalEnergy / vertices.length * 0.1).toFixed(2);
    }

    // === Particle System ===
    function createParticle(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: Math.random() * 2 + 1
        };
    }

    function emitBurst(x, y, count) {
        for (let i = 0; i < count; i++) {
            if (particles.length >= MAX_PARTICLES) particles.shift();
            particles.push(createParticle(x, y));
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life -= 0.012;

            // Slight upward drift
            p.vy -= 0.02;

            // Mouse repulsion
            if (mouse.inside) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80 && dist > 0.1) {
                    const force = (1 - dist / 80) * 0.5;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
                particles.splice(i, 1);
            }
        }

        // Emit ambient particles from vertex perimeter
        const mat = MATERIALS[currentMaterial];
        if (mat.renderMode === 'energy' || mat.renderMode === 'filled') {
            if (Math.random() < 0.3 && particles.length < MAX_PARTICLES) {
                const v = vertices[Math.floor(Math.random() * vertices.length)];
                particles.push(createParticle(v.x, v.y));
            }
        }

        hudParticles.textContent = particles.length;
    }

    // === Shockwaves ===
    function addShockwave(x, y, power) {
        shockwaves.push({
            x: x,
            y: y,
            radius: 0,
            power: power || 12,
            life: 1
        });
    }

    function updateShockwaves() {
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 6;
            sw.power *= 0.96;
            sw.life -= 0.015;
            if (sw.life <= 0 || sw.radius > Math.max(W, H)) {
                shockwaves.splice(i, 1);
            }
        }
    }

    // === Rendering ===
    function render(time) {
        ctx.clearRect(0, 0, W, H);

        const mat = MATERIALS[currentMaterial];
        const pc = themeColor.particle;
        const fillStr = mat.renderMode === 'energy'
            ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.03)`
            : themeColor.fill;
        const strokeStr = themeColor.stroke;

        // Draw shockwave rings
        for (const sw of shockwaves) {
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, Math.max(0.1, sw.radius), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${sw.life * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw particle trail connections (for energy/plasma mode)
        if (mat.renderMode === 'energy') {
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < 2500) {
                        const alpha = (1 - dist / 2500) * 0.15 * particles[i].life;
                        ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw main morph shape
        ctx.beginPath();
        if (mat.closed) {
            drawSmoothPath(vertices, mat.renderMode === 'faceted');
            ctx.closePath();
        } else {
            drawSmoothPath(vertices, false);
        }
        ctx.fillStyle = fillStr;
        ctx.fill();

        // Glow stroke
        ctx.shadowBlur = 20;
        ctx.shadowColor = themeColor.glow;
        ctx.strokeStyle = strokeStr;
        ctx.lineWidth = mat.lineWeight;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner detail lines for crystalline
        if (mat.renderMode === 'crystalline') {
            ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},0.15)`;
            ctx.lineWidth = 0.6;
            for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];
                const nextNext = vertices[(i + Math.floor(vertices.length / 3)) % vertices.length];
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(nextNext.x, nextNext.y);
                ctx.stroke();
            }
        }

        // Inner woven grid for fabric
        if (mat.renderMode === 'woven') {
            ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},0.1)`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < vertices.length; i += 2) {
                const v = vertices[i];
                ctx.beginPath();
                ctx.moveTo(CX, CY);
                ctx.lineTo(v.x, v.y);
                ctx.stroke();
            }
        }

        // Faceted inner lines for glass
        if (mat.renderMode === 'faceted') {
            ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},0.12)`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];
                ctx.beginPath();
                ctx.moveTo(CX, CY);
                ctx.lineTo(v.x, v.y);
                ctx.stroke();
            }
        }

        // Draw vertices as dots
        ctx.fillStyle = strokeStr;
        for (const v of vertices) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, mat.renderMode === 'crystalline' ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw particles
        for (const p of particles) {
            const alpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = themeColor.glow;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Draw mouse force field indicator
        if (mouse.inside) {
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = themeColor.accent;
            ctx.shadowBlur = 16;
            ctx.shadowColor = themeColor.glow;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 140, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},0.06)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function drawSmoothPath(verts, faceted) {
        if (verts.length < 2) return;
        if (faceted) {
            // Sharp polygon edges
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x, verts[i].y);
            }
            return;
        }

        // Catmull-Rom smooth curve
        ctx.moveTo(
            (verts[0].x + verts[1].x) / 2,
            (verts[0].y + verts[1].y) / 2
        );
        for (let i = 0; i < verts.length; i++) {
            const curr = verts[i];
            const next = verts[(i + 1) % verts.length];
            const midX = (curr.x + next.x) / 2;
            const midY = (curr.y + next.y) / 2;
            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        }
    }

    // === Animation Loop ===
    function loop(now) {
        const dt = Math.min(now - lastTime, 33);
        lastTime = now;

        frameCount++;
        fpsTimer += dt;
        if (fpsTimer >= 500) {
            fps = Math.round((frameCount / fpsTimer) * 1000);
            hudFps.textContent = fps;
            frameCount = 0;
            fpsTimer = 0;
        }

        // Mouse velocity tracking
        mouse.vx = (mouse.x - mouse.px) * 0.5;
        mouse.vy = (mouse.y - mouse.py) * 0.5;
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        updateVertices(dt, now);
        updateParticles(dt);
        updateShockwaves();
        render(now);

        requestAnimationFrame(loop);
    }

    // === Event Bindings ===

    // Mouse tracking on canvas
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.inside = true;
    });

    canvas.addEventListener('mouseenter', () => {
        mouse.inside = true;
        cursorGlow.style.opacity = '0.3';
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.inside = false;
        cursorGlow.style.opacity = '0';
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        mouse.down = true;
        addShockwave(cx, cy, 20);
        emitBurst(cx, cy, 15);
    });

    canvas.addEventListener('mouseup', () => {
        mouse.down = false;
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        mouse.inside = true;
        addShockwave(mouse.x, mouse.y, 20);
        emitBurst(mouse.x, mouse.y, 15);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        mouse.inside = false;
    });

    // Global cursor glow follow
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // Material buttons
    const materialButtons = document.querySelectorAll('.material-btn');
    materialButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            materialButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            transitionMaterial(btn.dataset.material);
        });
    });

    // Theme toggle
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTheme = btn.dataset.theme;
            themeColor = THEMES[currentTheme];
            document.documentElement.setAttribute('data-theme', currentTheme);
        });
    });

    // Parameter sliders
    const paramTension = document.getElementById('param-tension');
    const paramViscosity = document.getElementById('param-viscosity');
    const paramNoise = document.getElementById('param-noise');
    const valTension = document.getElementById('val-tension');
    const valViscosity = document.getElementById('val-viscosity');
    const valNoise = document.getElementById('val-noise');

    paramTension.addEventListener('input', () => {
        params.tension = parseFloat(paramTension.value);
        valTension.textContent = params.tension.toFixed(1);
    });
    paramViscosity.addEventListener('input', () => {
        params.viscosity = parseFloat(paramViscosity.value);
        valViscosity.textContent = params.viscosity.toFixed(1);
    });
    paramNoise.addEventListener('input', () => {
        params.noise = parseFloat(paramNoise.value);
        valNoise.textContent = params.noise.toFixed(1);
    });

    // Action buttons
    document.getElementById('btn-pulse').addEventListener('click', () => {
        addShockwave(CX, CY, 30);
        emitBurst(CX, CY, 40);
    });

    document.getElementById('btn-randomize').addEventListener('click', () => {
        for (const v of vertices) {
            v.vx += (Math.random() - 0.5) * 20;
            v.vy += (Math.random() - 0.5) * 20;
        }
        emitBurst(CX, CY, 25);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        rebuildVertices();
        particles = [];
        shockwaves = [];
    });

    // Fullscreen toggle
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const matKeys = { '1': 'liquid', '2': 'glass', '3': 'crystal', '4': 'plasma', '5': 'fabric' };
        if (matKeys[e.key]) {
            const targetBtn = document.querySelector(`.material-btn[data-material="${matKeys[e.key]}"]`);
            if (targetBtn) targetBtn.click();
        }
        if (e.key === ' ') {
            e.preventDefault();
            document.getElementById('btn-pulse').click();
        }
        if (e.key === 'r' || e.key === 'R') {
            document.getElementById('btn-reset').click();
        }
    });

    // Resize observer
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
    });

    // === Initialize ===
    resize();
    overlayLabel.textContent = MATERIALS[currentMaterial].label;
    overlayHint.textContent = MATERIALS[currentMaterial].hint;
    hudMaterial.textContent = MATERIALS[currentMaterial].label;
    requestAnimationFrame(loop);

})();
