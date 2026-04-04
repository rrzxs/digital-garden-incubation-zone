(function() {
    'use strict';

    const DOM = {
        uploadZone: document.getElementById('upload-zone'),
        fileInput: document.getElementById('file-input'),
        originalCanvas: document.getElementById('original-canvas'),
        ditherCanvas: document.getElementById('dither-canvas'),
        originalPreview: document.getElementById('original-preview'),
        ditherPreview: document.getElementById('dither-preview'),
        emptyState: document.getElementById('empty-state'),
        algorithmSelector: document.getElementById('algorithm-selector'),
        paletteSelector: document.getElementById('palette-selector'),
        dotSizeSlider: document.getElementById('dot-size-slider'),
        dotSizeValue: document.getElementById('dot-size-value'),
        contrastSlider: document.getElementById('contrast-slider'),
        contrastValue: document.getElementById('contrast-value'),
        bayerSizeSlider: document.getElementById('bayer-size-slider'),
        bayerSizeValue: document.getElementById('bayer-size-value'),
        thresholdSlider: document.getElementById('threshold-slider'),
        thresholdValue: document.getElementById('threshold-value'),
        resetBtn: document.getElementById('reset-btn'),
        randomizeBtn: document.getElementById('randomize-btn'),
        applyBtn: document.getElementById('apply-btn'),
        downloadBtn: document.getElementById('download-btn')
    };

    const state = {
        originalImageData: null,
        algorithm: 'floyd-steinberg',
        palette: 'bw',
        dotSize: 1,
        contrast: 100,
        bayerSize: 4,
        threshold: 128,
        isProcessing: false
    };

    const PALETTES = {
        'bw': [[0, 0, 0], [255, 255, 255]],
        'gameboy': [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
        'cga': [[0, 0, 0], [0, 0, 170], [170, 0, 170], [255, 255, 255]],
        'sepia': [[44, 24, 16], [110, 75, 58], [168, 139, 109], [232, 213, 196]],
        'cyber': [[10, 10, 15], [0, 255, 255], [255, 0, 255], [15, 15, 20]]
    };

    const BAYER_MATRICES = {
        2: [
            [0, 2],
            [3, 1]
        ],
        4: [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ],
        8: [
            [0, 32, 8, 40, 2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44, 4, 36, 14, 46, 6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [3, 35, 11, 43, 1, 33, 9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47, 7, 39, 13, 45, 5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ]
    };

    function init() {
        bindEvents();
        updateUI();
    }

    function bindEvents() {
        DOM.uploadZone.addEventListener('click', () => DOM.fileInput.click());
        DOM.fileInput.addEventListener('change', handleFileSelect);
        
        DOM.uploadZone.addEventListener('dragover', handleDragOver);
        DOM.uploadZone.addEventListener('dragleave', handleDragLeave);
        DOM.uploadZone.addEventListener('drop', handleDrop);
        
        DOM.algorithmSelector.addEventListener('click', handleAlgorithmSelect);
        DOM.paletteSelector.addEventListener('click', handlePaletteSelect);
        
        DOM.dotSizeSlider.addEventListener('input', handleDotSizeChange);
        DOM.contrastSlider.addEventListener('input', handleContrastChange);
        DOM.bayerSizeSlider.addEventListener('input', handleBayerSizeChange);
        DOM.thresholdSlider.addEventListener('input', handleThresholdChange);
        
        DOM.resetBtn.addEventListener('click', handleReset);
        DOM.randomizeBtn.addEventListener('click', handleRandomize);
        DOM.applyBtn.addEventListener('click', handleApply);
        DOM.downloadBtn.addEventListener('click', handleDownload);
    }

    function handleDragOver(e) {
        e.preventDefault();
        DOM.uploadZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        DOM.uploadZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        DOM.uploadZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxSize = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round(height * maxSize / width);
                        width = maxSize;
                    } else {
                        width = Math.round(width * maxSize / height);
                        height = maxSize;
                    }
                }
                
                DOM.originalCanvas.width = width;
                DOM.originalCanvas.height = height;
                DOM.ditherCanvas.width = width;
                DOM.ditherCanvas.height = height;
                
                const ctx = DOM.originalCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                state.originalImageData = ctx.getImageData(0, 0, width, height);
                
                DOM.uploadZone.hidden = true;
                DOM.originalCanvas.hidden = false;
                DOM.originalPreview.classList.add('has-image');
                
                DOM.applyBtn.disabled = false;
                
                applyDithering();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function handleAlgorithmSelect(e) {
        const btn = e.target.closest('.algo-btn');
        if (!btn) return;
        
        const algo = btn.dataset.algo;
        if (algo === state.algorithm) return;
        
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        state.algorithm = algo;
        
        DOM.bayerSizeSlider.disabled = algo !== 'ordered';
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handlePaletteSelect(e) {
        const btn = e.target.closest('.palette-btn');
        if (!btn) return;
        
        const palette = btn.dataset.palette;
        if (palette === state.palette) return;
        
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        state.palette = palette;
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleDotSizeChange(e) {
        state.dotSize = parseInt(e.target.value, 10);
        DOM.dotSizeValue.textContent = `${state.dotSize}px`;
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleContrastChange(e) {
        state.contrast = parseInt(e.target.value, 10);
        DOM.contrastValue.textContent = `${state.contrast}%`;
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleBayerSizeChange(e) {
        state.bayerSize = parseInt(e.target.value, 10);
        DOM.bayerSizeValue.textContent = `${state.bayerSize}×${state.bayerSize}`;
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleThresholdChange(e) {
        state.threshold = parseInt(e.target.value, 10);
        DOM.thresholdValue.textContent = state.threshold;
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleReset() {
        state.dotSize = 1;
        state.contrast = 100;
        state.bayerSize = 4;
        state.threshold = 128;
        
        DOM.dotSizeSlider.value = 1;
        DOM.dotSizeValue.textContent = '1px';
        DOM.contrastSlider.value = 100;
        DOM.contrastValue.textContent = '100%';
        DOM.bayerSizeSlider.value = 4;
        DOM.bayerSizeValue.textContent = '4×4';
        DOM.thresholdSlider.value = 128;
        DOM.thresholdValue.textContent = '128';
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleRandomize() {
        const algorithms = ['floyd-steinberg', 'ordered', 'atkinson', 'threshold', 'jjn', 'sierra'];
        const palettes = ['bw', 'gameboy', 'cga', 'sepia', 'cyber'];
        
        state.algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
        state.palette = palettes[Math.floor(Math.random() * palettes.length)];
        state.dotSize = Math.floor(Math.random() * 4) + 1;
        state.contrast = Math.floor(Math.random() * 50) + 75;
        state.bayerSize = [2, 4, 8][Math.floor(Math.random() * 3)];
        state.threshold = Math.floor(Math.random() * 128) + 64;
        
        document.querySelectorAll('.algo-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.algo === state.algorithm);
        });
        
        document.querySelectorAll('.palette-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.palette === state.palette);
        });
        
        DOM.dotSizeSlider.value = state.dotSize;
        DOM.dotSizeValue.textContent = `${state.dotSize}px`;
        DOM.contrastSlider.value = state.contrast;
        DOM.contrastValue.textContent = `${state.contrast}%`;
        DOM.bayerSizeSlider.value = state.bayerSize;
        DOM.bayerSizeValue.textContent = `${state.bayerSize}×${state.bayerSize}`;
        DOM.thresholdSlider.value = state.threshold;
        DOM.thresholdValue.textContent = state.threshold;
        
        DOM.bayerSizeSlider.disabled = state.algorithm !== 'ordered';
        
        if (state.originalImageData) {
            applyDithering();
        }
    }

    function handleApply() {
        if (!state.originalImageData) return;
        applyDithering();
    }

    function handleDownload() {
        if (!state.originalImageData) return;
        
        const link = document.createElement('a');
        link.download = `dithered-${Date.now()}.png`;
        link.href = DOM.ditherCanvas.toDataURL('image/png');
        link.click();
    }

    function updateUI() {
        DOM.bayerSizeSlider.disabled = state.algorithm !== 'ordered';
    }

    function applyDithering() {
        if (!state.originalImageData || state.isProcessing) return;
        
        state.isProcessing = true;
        DOM.ditherPreview.classList.add('processing');
        
        requestAnimationFrame(() => {
            const srcData = new Uint8ClampedArray(state.originalImageData.data);
            const width = state.originalImageData.width;
            const height = state.originalImageData.height;
            
            const contrastFactor = (state.contrast / 100);
            for (let i = 0; i < srcData.length; i += 4) {
                srcData[i] = clamp(128 + (srcData[i] - 128) * contrastFactor);
                srcData[i + 1] = clamp(128 + (srcData[i + 1] - 128) * contrastFactor);
                srcData[i + 2] = clamp(128 + (srcData[i + 2] - 128) * contrastFactor);
            }
            
            let result;
            
            switch (state.algorithm) {
                case 'floyd-steinberg':
                    result = floydSteinberg(srcData, width, height);
                    break;
                case 'ordered':
                    result = orderedDither(srcData, width, height);
                    break;
                case 'atkinson':
                    result = atkinsonDither(srcData, width, height);
                    break;
                case 'threshold':
                    result = thresholdDither(srcData, width, height);
                    break;
                case 'jjn':
                    result = jjnDither(srcData, width, height);
                    break;
                case 'sierra':
                    result = sierraDither(srcData, width, height);
                    break;
                default:
                    result = floydSteinberg(srcData, width, height);
            }
            
            if (state.dotSize > 1) {
                result = scalePixels(result, width, height, state.dotSize);
            }
            
            const ctx = DOM.ditherCanvas.getContext('2d');
            
            if (state.dotSize > 1) {
                DOM.ditherCanvas.width = width * state.dotSize;
                DOM.ditherCanvas.height = height * state.dotSize;
            } else {
                DOM.ditherCanvas.width = width;
                DOM.ditherCanvas.height = height;
            }
            
            const imageData = new ImageData(result, DOM.ditherCanvas.width, DOM.ditherCanvas.height);
            ctx.putImageData(imageData, 0, 0);
            
            DOM.emptyState.hidden = true;
            DOM.ditherCanvas.hidden = false;
            DOM.ditherPreview.classList.add('has-image');
            DOM.downloadBtn.disabled = false;
            
            state.isProcessing = false;
            DOM.ditherPreview.classList.remove('processing');
        });
    }

    function clamp(value, min = 0, max = 255) {
        return Math.max(min, Math.min(max, value));
    }

    function findClosestColor(r, g, b, palette) {
        const colors = PALETTES[palette];
        let minDist = Infinity;
        let closest = colors[0];
        
        for (const color of colors) {
            const dr = r - color[0];
            const dg = g - color[1];
            const db = b - color[2];
            const dist = dr * dr + dg * dg + db * db;
            
            if (dist < minDist) {
                minDist = dist;
                closest = color;
            }
        }
        
        return closest;
    }

    function floydSteinberg(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        const pixels = new Float32Array(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldR = pixels[idx];
                const oldG = pixels[idx + 1];
                const oldB = pixels[idx + 2];
                
                const newColor = findClosestColor(oldR, oldG, oldB, state.palette);
                
                result[idx] = newColor[0];
                result[idx + 1] = newColor[1];
                result[idx + 2] = newColor[2];
                result[idx + 3] = 255;
                
                const errR = oldR - newColor[0];
                const errG = oldG - newColor[1];
                const errB = oldB - newColor[2];
                
                distributeError(pixels, width, height, x, y, errR, errG, errB, [
                    [1, 0, 7 / 16],
                    [-1, 1, 3 / 16],
                    [0, 1, 5 / 16],
                    [1, 1, 1 / 16]
                ]);
            }
        }
        
        return result;
    }

    function atkinsonDither(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        const pixels = new Float32Array(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldR = pixels[idx];
                const oldG = pixels[idx + 1];
                const oldB = pixels[idx + 2];
                
                const newColor = findClosestColor(oldR, oldG, oldB, state.palette);
                
                result[idx] = newColor[0];
                result[idx + 1] = newColor[1];
                result[idx + 2] = newColor[2];
                result[idx + 3] = 255;
                
                const errR = (oldR - newColor[0]) / 8;
                const errG = (oldG - newColor[1]) / 8;
                const errB = (oldB - newColor[2]) / 8;
                
                distributeError(pixels, width, height, x, y, errR, errG, errB, [
                    [1, 0, 1],
                    [2, 0, 1],
                    [-1, 1, 1],
                    [0, 1, 1],
                    [1, 1, 1],
                    [0, 2, 1]
                ]);
            }
        }
        
        return result;
    }

    function jjnDither(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        const pixels = new Float32Array(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldR = pixels[idx];
                const oldG = pixels[idx + 1];
                const oldB = pixels[idx + 2];
                
                const newColor = findClosestColor(oldR, oldG, oldB, state.palette);
                
                result[idx] = newColor[0];
                result[idx + 1] = newColor[1];
                result[idx + 2] = newColor[2];
                result[idx + 3] = 255;
                
                const errR = oldR - newColor[0];
                const errG = oldG - newColor[1];
                const errB = oldB - newColor[2];
                
                distributeError(pixels, width, height, x, y, errR, errG, errB, [
                    [1, 0, 7 / 48],
                    [2, 0, 5 / 48],
                    [-2, 1, 3 / 48],
                    [-1, 1, 5 / 48],
                    [0, 1, 7 / 48],
                    [1, 1, 5 / 48],
                    [2, 1, 3 / 48],
                    [-2, 2, 1 / 48],
                    [-1, 2, 3 / 48],
                    [0, 2, 5 / 48],
                    [1, 2, 3 / 48],
                    [2, 2, 1 / 48]
                ]);
            }
        }
        
        return result;
    }

    function sierraDither(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        const pixels = new Float32Array(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldR = pixels[idx];
                const oldG = pixels[idx + 1];
                const oldB = pixels[idx + 2];
                
                const newColor = findClosestColor(oldR, oldG, oldB, state.palette);
                
                result[idx] = newColor[0];
                result[idx + 1] = newColor[1];
                result[idx + 2] = newColor[2];
                result[idx + 3] = 255;
                
                const errR = oldR - newColor[0];
                const errG = oldG - newColor[1];
                const errB = oldB - newColor[2];
                
                distributeError(pixels, width, height, x, y, errR, errG, errB, [
                    [1, 0, 5 / 32],
                    [2, 0, 3 / 32],
                    [-2, 1, 2 / 32],
                    [-1, 1, 4 / 32],
                    [0, 1, 5 / 32],
                    [1, 1, 4 / 32],
                    [2, 1, 2 / 32],
                    [-1, 2, 2 / 32],
                    [0, 2, 3 / 32],
                    [1, 2, 2 / 32]
                ]);
            }
        }
        
        return result;
    }

    function distributeError(pixels, width, height, x, y, errR, errG, errB, distribution) {
        for (const [dx, dy, factor] of distribution) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                pixels[idx] = clamp(pixels[idx] + errR * factor);
                pixels[idx + 1] = clamp(pixels[idx + 1] + errG * factor);
                pixels[idx + 2] = clamp(pixels[idx + 2] + errB * factor);
            }
        }
    }

    function orderedDither(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        const matrix = BAYER_MATRICES[state.bayerSize];
        const matrixSize = state.bayerSize;
        const scale = 256 / (matrixSize * matrixSize);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const threshold = matrix[y % matrixSize][x % matrixSize] * scale;
                
                const r = data[idx] + threshold - 128;
                const g = data[idx + 1] + threshold - 128;
                const b = data[idx + 2] + threshold - 128;
                
                const newColor = findClosestColor(r, g, b, state.palette);
                
                result[idx] = newColor[0];
                result[idx + 1] = newColor[1];
                result[idx + 2] = newColor[2];
                result[idx + 3] = 255;
            }
        }
        
        return result;
    }

    function thresholdDither(data, width, height) {
        const result = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const newColor = gray > state.threshold ? [255, 255, 255] : [0, 0, 0];
            
            result[i] = newColor[0];
            result[i + 1] = newColor[1];
            result[i + 2] = newColor[2];
            result[i + 3] = 255;
        }
        
        return result;
    }

    function scalePixels(data, width, height, scale) {
        const newWidth = width * scale;
        const newHeight = height * scale;
        const result = new Uint8ClampedArray(newWidth * newHeight * 4);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 4;
                
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const dstIdx = ((y * scale + dy) * newWidth + (x * scale + dx)) * 4;
                        
                        result[dstIdx] = data[srcIdx];
                        result[dstIdx + 1] = data[srcIdx + 1];
                        result[dstIdx + 2] = data[srcIdx + 2];
                        result[dstIdx + 3] = 255;
                    }
                }
            }
        }
        
        return result;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
