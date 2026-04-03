(function() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewCanvas = document.getElementById('preview-canvas');
    const previewArea = document.getElementById('preview-area');
    const toast = document.getElementById('toast');
    
    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const exportBtn = document.getElementById('export-btn');
    
    const paddingSlider = document.getElementById('padding-slider');
    const paddingValue = document.getElementById('padding-value');
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');
    const shadowSlider = document.getElementById('shadow-slider');
    const shadowValue = document.getElementById('shadow-value');
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValueEl = document.getElementById('scale-value');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    const ctx = previewCanvas.getContext('2d');
    
    const backgrounds = {
        'gradient-mesh': {
            type: 'gradient',
            colors: ['#667eea', '#764ba2', '#f093fb'],
            angle: 135
        },
        'aurora': {
            type: 'gradient',
            colors: ['#00d4ff', '#a855f7', '#00ff88'],
            angle: 135
        },
        'sunset': {
            type: 'gradient',
            colors: ['#ff6b35', '#f72585', '#ffd23f'],
            angle: 135
        },
        'ocean': {
            type: 'gradient',
            colors: ['#0077b6', '#00b4d8', '#90e0ef'],
            angle: 135
        },
        'solid': {
            type: 'solid',
            color: '#1a1a2e'
        }
    };
    
    let originalImage = null;
    let currentBg = 'gradient-mesh';
    let padding = 64;
    let radius = 16;
    let shadowIntensity = 60;
    let scale = 100;
    
    function init() {
        setupEventListeners();
    }
    
    function setupEventListeners() {
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
        
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('dragleave', handleDragLeave);
        uploadZone.addEventListener('drop', handleDrop);
        
        paddingSlider.addEventListener('input', handlePaddingChange);
        radiusSlider.addEventListener('input', handleRadiusChange);
        shadowSlider.addEventListener('input', handleShadowChange);
        scaleSlider.addEventListener('input', handleScaleChange);
        
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => handlePresetChange(btn));
        });
        
        resetBtn.addEventListener('click', handleReset);
        downloadBtn.addEventListener('click', handleDownload);
        copyBtn.addEventListener('click', handleCopy);
        exportBtn.addEventListener('click', handleExport);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }
    
    function processFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('请上传图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                uploadZone.classList.add('hidden');
                previewCanvas.classList.add('visible');
                enableControls();
                renderPreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function handlePaddingChange(e) {
        padding = parseInt(e.target.value);
        paddingValue.textContent = padding;
        renderPreview();
    }
    
    function handleRadiusChange(e) {
        radius = parseInt(e.target.value);
        radiusValue.textContent = radius;
        renderPreview();
    }
    
    function handleShadowChange(e) {
        shadowIntensity = parseInt(e.target.value);
        shadowValue.textContent = shadowIntensity;
        renderPreview();
    }
    
    function handleScaleChange(e) {
        scale = parseInt(e.target.value);
        scaleValueEl.textContent = scale + '%';
        renderPreview();
    }
    
    function handlePresetChange(btn) {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBg = btn.dataset.bg;
        renderPreview();
    }
    
    function handleReset() {
        if (!originalImage) return;
        
        paddingSlider.value = 64;
        padding = 64;
        paddingValue.textContent = '64';
        
        radiusSlider.value = 16;
        radius = 16;
        radiusValue.textContent = '16';
        
        shadowSlider.value = 60;
        shadowIntensity = 60;
        shadowValue.textContent = '60';
        
        scaleSlider.value = 100;
        scale = 100;
        scaleValueEl.textContent = '100%';
        
        presetBtns.forEach(b => b.classList.remove('active'));
        presetBtns[0].classList.add('active');
        currentBg = 'gradient-mesh';
        
        renderPreview();
        showToast('已重置');
    }
    
    function handleDownload() {
        if (!originalImage) return;
        
        const link = document.createElement('a');
        link.download = 'polished-screenshot.png';
        link.href = previewCanvas.toDataURL('image/png');
        link.click();
        showToast('图片已下载');
    }
    
    async function handleCopy() {
        if (!originalImage) return;
        
        try {
            const blob = await new Promise(resolve => {
                previewCanvas.toBlob(resolve, 'image/png');
            });
            
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            
            showToast('已复制到剪贴板');
        } catch (err) {
            showToast('复制失败，请使用导出功能');
        }
    }
    
    function handleExport() {
        handleDownload();
    }
    
    function enableControls() {
        downloadBtn.disabled = false;
        copyBtn.disabled = false;
        exportBtn.disabled = false;
    }
    
    function renderPreview() {
        if (!originalImage) return;
        
        const scaledWidth = originalImage.width * (scale / 100);
        const scaledHeight = originalImage.height * (scale / 100);
        
        const canvasWidth = scaledWidth + padding * 2;
        const canvasHeight = scaledHeight + padding * 2;
        
        const maxDisplayWidth = previewArea.clientWidth - 40;
        const maxDisplayHeight = previewArea.clientHeight - 40;
        
        const displayScale = Math.min(
            maxDisplayWidth / canvasWidth,
            maxDisplayHeight / canvasHeight,
            1
        );
        
        previewCanvas.width = canvasWidth;
        previewCanvas.height = canvasHeight;
        previewCanvas.style.width = `${canvasWidth * displayScale}px`;
        previewCanvas.style.height = `${canvasHeight * displayScale}px`;
        
        drawBackground(canvasWidth, canvasHeight);
        
        ctx.save();
        
        if (shadowIntensity > 0) {
            const shadowBlur = shadowIntensity * 0.6;
            const shadowOffset = shadowIntensity * 0.15;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetX = shadowOffset;
            ctx.shadowOffsetY = shadowOffset;
        }
        
        roundedRect(
            ctx,
            padding - 4,
            padding - 4,
            scaledWidth + 8,
            scaledHeight + 8,
            radius
        );
        ctx.clip();
        
        ctx.drawImage(originalImage, padding, padding, scaledWidth, scaledHeight);
        
        ctx.restore();
    }
    
    function drawBackground(width, height) {
        const bg = backgrounds[currentBg];
        
        if (bg.type === 'solid') {
            ctx.fillStyle = bg.color;
            ctx.fillRect(0, 0, width, height);
        } else if (bg.type === 'gradient') {
            const angle = bg.angle * Math.PI / 180;
            const x1 = width / 2 - Math.cos(angle) * width;
            const y1 = height / 2 - Math.sin(angle) * height;
            const x2 = width / 2 + Math.cos(angle) * width;
            const y2 = height / 2 + Math.sin(angle) * height;
            
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            
            bg.colors.forEach((color, i) => {
                gradient.addColorStop(i / (bg.colors.length - 1), color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    }
    
    function roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
    
    init();
})();
