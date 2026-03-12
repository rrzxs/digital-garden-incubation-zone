(function() {
    const canvas = document.getElementById('fluid-canvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.querySelector('.canvas-overlay');
    const hint = document.querySelector('.hint-text');
    
    const viscositySlider = document.getElementById('viscosity');
    const diffusionSlider = document.getElementById('diffusion');
    const viscosityValue = document.getElementById('viscosity-value');
    const diffusionValue = document.getElementById('diffusion-value');
    const resetBtn = document.getElementById('reset-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fpsDisplay = document.getElementById('fps-display');
    const particleCountDisplay = document.getElementById('particle-count');
    const densityDisplay = document.getElementById('density-display');
    const colorBtns = document.querySelectorAll('.color-btn');
    
    const GRID_SIZE = 128;
    const ITERATIONS = 4;
    
    let N = GRID_SIZE;
    let size = (N + 2) * (N + 2);
    let u = new Float32Array(size);
    let v = new Float32Array(size);
    let u_prev = new Float32Array(size);
    let v_prev = new Float32Array(size);
    let dens = new Float32Array(size);
    let dens_prev = new Float32Array(size);
    
    let viscosity = 0.0002;
    let diffusion = 0.0003;
    let dt = 0.1;
    
    let colorPalette = {
        colors: [
            { r: 0, g: 212, b: 255 },
            { r: 168, g: 85, b: 247 },
            { r: 0, g: 255, b: 136 }
        ]
    };
    
    const palettes = {
        aurora: {
            colors: [
                { r: 0, g: 212, b: 255 },
                { r: 168, g: 85, b: 247 },
                { r: 0, g: 255, b: 136 }
            ]
        },
        sunset: {
            colors: [
                { r: 255, g: 107, b: 53 },
                { r: 247, g: 37, b: 133 },
                { r: 255, g: 210, b: 63 }
            ]
        },
        ocean: {
            colors: [
                { r: 0, g: 119, b: 182 },
                { r: 0, g: 180, b: 216 },
                { r: 144, g: 224, b: 239 }
            ]
        },
        neon: {
            colors: [
                { r: 0, g: 255, b: 136 },
                { r: 0, g: 212, b: 255 },
                { r: 255, g: 0, b: 255 }
            ]
        }
    };
    
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    let hasInteracted = false;
    
    function IX(i, j) {
        return i + (N + 2) * j;
    }
    
    function addSource(x, s, dt) {
        for (let i = 0; i < size; i++) {
            x[i] += dt * s[i];
        }
    }
    
    function setBnd(b, x) {
        for (let i = 1; i <= N; i++) {
            x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
            x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
            x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
            x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
        }
        x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
        x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
        x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
        x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
    }
    
    function diffuse(b, x, x0, diff, dt) {
        const a = dt * diff * N * N;
        linearSolve(b, x, x0, a, 1 + 4 * a);
    }
    
    function linearSolve(b, x, x0, a, c) {
        for (let k = 0; k < ITERATIONS; k++) {
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    x[IX(i, j)] = (x0[IX(i, j)] + a * (
                        x[IX(i - 1, j)] + x[IX(i + 1, j)] +
                        x[IX(i, j - 1)] + x[IX(i, j + 1)]
                    )) / c;
                }
            }
            setBnd(b, x);
        }
    }
    
    function advect(b, d, d0, u, v, dt) {
        const dt0 = dt * N;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                let x = i - dt0 * u[IX(i, j)];
                let y = j - dt0 * v[IX(i, j)];
                
                if (x < 0.5) x = 0.5;
                if (x > N + 0.5) x = N + 0.5;
                const i0 = Math.floor(x);
                const i1 = i0 + 1;
                
                if (y < 0.5) y = 0.5;
                if (y > N + 0.5) y = N + 0.5;
                const j0 = Math.floor(y);
                const j1 = j0 + 1;
                
                const s1 = x - i0;
                const s0 = 1 - s1;
                const t1 = y - j0;
                const t0 = 1 - t1;
                
                d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                              s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
            }
        }
        setBnd(b, d);
    }
    
    function project(u, v, p, div) {
        const h = 1.0 / N;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                div[IX(i, j)] = -0.5 * h * (
                    u[IX(i + 1, j)] - u[IX(i - 1, j)] +
                    v[IX(i, j + 1)] - v[IX(i, j - 1)]
                );
                p[IX(i, j)] = 0;
            }
        }
        setBnd(0, div);
        setBnd(0, p);
        linearSolve(0, p, div, 1, 4);
        
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
                v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
            }
        }
        setBnd(1, u);
        setBnd(2, v);
    }
    
    function velStep(u, v, u0, v0, visc, dt) {
        addSource(u, u0, dt);
        addSource(v, v0, dt);
        
        [u0, u] = [u, u0];
        diffuse(1, u, u0, visc, dt);
        
        [v0, v] = [v, v0];
        diffuse(2, v, v0, visc, dt);
        
        project(u, v, u0, v0);
        
        [u0, u] = [u, u0];
        [v0, v] = [v, v0];
        
        advect(1, u, u0, u0, v0, dt);
        advect(2, v, v0, u0, v0, dt);
        
        project(u, v, u0, v0);
    }
    
    function densStep(x, x0, u, v, diff, dt) {
        addSource(x, x0, dt);
        
        [x0, x] = [x, x0];
        diffuse(0, x, x0, diff, dt);
        
        [x0, x] = [x, x0];
        advect(0, x, x0, u, v, dt);
    }
    
    function getColorFromDensity(d) {
        const intensity = Math.min(d / 150, 1);
        const colors = colorPalette.colors;
        
        const t = intensity * (colors.length - 1);
        const index = Math.floor(t);
        const frac = t - index;
        
        const c1 = colors[Math.min(index, colors.length - 1)];
        const c2 = colors[Math.min(index + 1, colors.length - 1)];
        
        return {
            r: Math.floor(c1.r + (c2.r - c1.r) * frac),
            g: Math.floor(c1.g + (c2.g - c1.g) * frac),
            b: Math.floor(c1.b + (c2.b - c1.b) * frac)
        };
    }
    
    function render() {
        const width = canvas.width;
        const height = canvas.height;
        const cellW = width / N;
        const cellH = height / N;
        
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                const gridI = Math.floor(i / cellW) + 1;
                const gridJ = Math.floor(j / cellH) + 1;
                
                const d = dens[IX(gridI, gridJ)];
                const color = getColorFromDensity(d);
                
                const pixelIndex = (j * width + i) * 4;
                data[pixelIndex] = color.r;
                data[pixelIndex + 1] = color.g;
                data[pixelIndex + 2] = color.b;
                data[pixelIndex + 3] = Math.min(d * 2.5, 255);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    function clearData() {
        u.fill(0);
        v.fill(0);
        u_prev.fill(0);
        v_prev.fill(0);
        dens.fill(0);
        dens_prev.fill(0);
    }
    
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    function addDensityAndVelocity(x, y, amount, vx, vy) {
        const cellX = Math.floor((x / canvas.width) * N) + 1;
        const cellY = Math.floor((y / canvas.height) * N) + 1;
        
        if (cellX > 0 && cellX < N + 1 && cellY > 0 && cellY < N + 1) {
            dens_prev[IX(cellX, cellY)] += amount;
            u_prev[IX(cellX, cellY)] += vx;
            v_prev[IX(cellX, cellY)] += vy;
        }
    }
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    function handleInteraction(x, y) {
        if (!hasInteracted) {
            hasInteracted = true;
            overlay.classList.add('hidden');
        }
        
        const vx = (x - lastMouseX) * 2;
        const vy = (y - lastMouseY) * 2;
        
        addDensityAndVelocity(x, y, 100, vx, vy);
        
        lastMouseX = x;
        lastMouseY = y;
    }
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleInteraction(x, y);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleInteraction(x, y);
    }, { passive: false });
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        lastMouseX = e.clientX - rect.left;
        lastMouseY = e.clientY - rect.top;
    });
    
    canvas.addEventListener('touchstart', (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastMouseX = touch.clientX - rect.left;
        lastMouseY = touch.clientY - rect.top;
    });
    
    viscositySlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        viscosity = val * 0.001;
        viscosityValue.textContent = val.toFixed(2);
    });
    
    diffusionSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        diffusion = val * 0.001;
        diffusionValue.textContent = val.toFixed(2);
    });
    
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const paletteName = btn.dataset.palette;
            colorPalette = palettes[paletteName];
        });
    });
    
    resetBtn.addEventListener('click', () => {
        clearData();
        hasInteracted = false;
        overlay.classList.remove('hidden');
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
    
    function countActiveParticles() {
        let count = 0;
        for (let i = 0; i < size; i++) {
            if (dens[i] > 1) count++;
        }
        return count;
    }
    
    function animate() {
        velStep(u, v, u_prev, v_prev, viscosity, dt);
        densStep(dens, dens_prev, u, v, diffusion, dt);
        
        u_prev.fill(0);
        v_prev.fill(0);
        dens_prev.fill(0);
        
        render();
        updateFPS();
        
        particleCountDisplay.textContent = countActiveParticles();
        
        requestAnimationFrame(animate);
    }
    
    window.addEventListener('resize', resize);
    
    resize();
    clearData();
    densityDisplay.textContent = N;
    animate();
})();
