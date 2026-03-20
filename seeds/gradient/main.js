(function() {
    const canvas = document.getElementById('gradient-canvas');
    const ctx = canvas.getContext('2d');
    const nodesContainer = document.getElementById('nodes-container');
    const canvasHint = document.getElementById('canvas-hint');
    const cssCode = document.getElementById('css-code');
    
    const nodeCountSlider = document.getElementById('node-count');
    const nodeCountValue = document.getElementById('node-count-value');
    const blurSlider = document.getElementById('blur-intensity');
    const blurValue = document.getElementById('blur-value');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const randomizeBtn = document.getElementById('randomize-btn');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');
    
    const presets = {
        aurora: {
            colors: ['#00d4ff', '#a855f7', '#00ff88', '#06b6d4', '#8b5cf6']
        },
        sunset: {
            colors: ['#ff6b35', '#f72585', '#ffd23f', '#ff4d6d', '#ffb703']
        },
        ocean: {
            colors: ['#0077b6', '#00b4d8', '#90e0ef', '#023e8a', '#48cae4']
        },
        neon: {
            colors: ['#00ff88', '#00d4ff', '#ff00ff', '#7b2cbf', '#3a86ff']
        },
        forest: {
            colors: ['#2d6a4f', '#40916c', '#95d5b2', '#1b4332', '#52b788']
        }
    };
    
    let currentPreset = 'aurora';
    let blurIntensity = 80;
    let nodes = [];
    let draggingNode = null;
    let hasInteracted = false;
    
    function initNodes(count) {
        nodes = [];
        const colors = presets[currentPreset].colors;
        const rect = canvas.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 0.25 + Math.random() * 0.15;
            const centerX = 0.5;
            const centerY = 0.5;
            
            nodes.push({
                id: i,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                color: colors[i % colors.length],
                size: 60 + Math.random() * 40
            });
        }
        
        renderNodes();
        renderGradient();
        updateCSSOutput();
    }
    
    function renderNodes() {
        nodesContainer.innerHTML = '';
        const rect = canvas.getBoundingClientRect();
        
        nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'gradient-node';
            el.dataset.id = node.id;
            el.style.left = `${node.x * 100}%`;
            el.style.top = `${node.y * 100}%`;
            el.style.backgroundColor = node.color;
            
            el.addEventListener('mousedown', startDrag);
            el.addEventListener('touchstart', startDrag, { passive: false });
            
            nodesContainer.appendChild(el);
        });
    }
    
    function startDrag(e) {
        e.preventDefault();
        const id = parseInt(e.target.dataset.id);
        draggingNode = nodes.find(n => n.id === id);
        
        if (draggingNode) {
            e.target.classList.add('dragging');
            
            if (!hasInteracted) {
                hasInteracted = true;
                canvasHint.classList.add('hidden');
            }
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', stopDrag);
        }
    }
    
    function onDrag(e) {
        if (!draggingNode) return;
        
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.type === 'touchmove') {
            e.preventDefault();
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        
        draggingNode.x = x;
        draggingNode.y = y;
        
        const nodeEl = nodesContainer.querySelector(`[data-id="${draggingNode.id}"]`);
        if (nodeEl) {
            nodeEl.style.left = `${x * 100}%`;
            nodeEl.style.top = `${y * 100}%`;
        }
        
        renderGradient();
        updateCSSOutput();
    }
    
    function stopDrag() {
        if (draggingNode) {
            const nodeEl = nodesContainer.querySelector(`[data-id="${draggingNode.id}"]`);
            if (nodeEl) {
                nodeEl.classList.remove('dragging');
            }
        }
        
        draggingNode = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);
    }
    
    function renderGradient() {
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = '#0a0b10';
        ctx.fillRect(0, 0, width, height);
        
        ctx.filter = `blur(${blurIntensity}px)`;
        
        nodes.forEach(node => {
            const x = node.x * width;
            const y = node.y * height;
            const radius = node.size * (width / 500);
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, node.color);
            gradient.addColorStop(1, hexToRgba(node.color, 0));
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.filter = 'none';
    }
    
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    function updateCSSOutput() {
        const gradientStops = nodes.map((node, i) => {
            const percent = Math.round(node.x * 100);
            return `radial-gradient(at ${Math.round(node.x * 100)}% ${Math.round(node.y * 100)}%, ${node.color} 0%, transparent 70%)`;
        });
        
        const css = `.mesh-gradient {
  background: 
    ${gradientStops.join(',\n    ')};
  background-color: #0a0b10;
  filter: blur(${blurIntensity}px);
}`;
        
        cssCode.textContent = css;
    }
    
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        ctx.scale(dpr, dpr);
        
        renderGradient();
    }
    
    function randomize() {
        const count = nodes.length;
        const colors = presets[currentPreset].colors;
        
        nodes.forEach((node, i) => {
            node.x = 0.15 + Math.random() * 0.7;
            node.y = 0.15 + Math.random() * 0.7;
            node.color = colors[Math.floor(Math.random() * colors.length)];
            node.size = 50 + Math.random() * 50;
        });
        
        renderNodes();
        renderGradient();
        updateCSSOutput();
    }
    
    function setPreset(presetName) {
        currentPreset = presetName;
        const colors = presets[presetName].colors;
        
        nodes.forEach((node, i) => {
            node.color = colors[i % colors.length];
        });
        
        renderNodes();
        renderGradient();
        updateCSSOutput();
    }
    
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
    
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(cssCode.textContent);
            copyBtn.classList.add('copied');
            copyBtn.querySelector('span').textContent = '已复制';
            showToast('已复制到剪贴板');
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.querySelector('span').textContent = '复制';
            }, 2000);
        } catch (err) {
            showToast('复制失败');
        }
    }
    
    function exportAsImage() {
        const link = document.createElement('a');
        link.download = 'mesh-gradient.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('图片已导出');
    }
    
    nodeCountSlider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        nodeCountValue.textContent = count;
        initNodes(count);
    });
    
    blurSlider.addEventListener('input', (e) => {
        blurIntensity = parseInt(e.target.value);
        blurValue.textContent = blurIntensity;
        renderGradient();
        updateCSSOutput();
    });
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPreset(btn.dataset.preset);
        });
    });
    
    randomizeBtn.addEventListener('click', randomize);
    exportBtn.addEventListener('click', exportAsImage);
    copyBtn.addEventListener('click', copyToClipboard);
    
    resetBtn.addEventListener('click', () => {
        nodeCountSlider.value = 5;
        nodeCountValue.textContent = '5';
        blurSlider.value = 80;
        blurValue.textContent = '80';
        blurIntensity = 80;
        
        presetBtns.forEach(b => b.classList.remove('active'));
        presetBtns[0].classList.add('active');
        currentPreset = 'aurora';
        
        hasInteracted = false;
        canvasHint.classList.remove('hidden');
        
        initNodes(5);
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
    
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.querySelector('span').textContent = '全屏';
        }
    });
    
    window.addEventListener('resize', resize);
    
    resize();
    initNodes(5);
})();
