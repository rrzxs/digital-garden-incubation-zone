(function() {
  'use strict';

  const PALLETES = {
    bw: [[0, 0, 0], [255, 255, 255]],
    gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
    sepia: [[112, 66, 20], [160, 120, 70], [192, 144, 80], [240, 224, 192]],
    cyberpunk: [[13, 2, 33], [255, 0, 255], [0, 255, 255], [255, 255, 0]],
    sunset: [[26, 5, 51], [107, 45, 92], [230, 126, 34], [243, 156, 18]],
    ocean: [[10, 22, 40], [30, 58, 95], [41, 128, 185], [72, 201, 176]]
  };

  const BAYER_MATRIX_4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  let state = {
    imageLoaded: false,
    algorithm: 'floydSteinberg',
    palette: 'bw',
    pixelSize: 1,
    contrast: 100,
    brightness: 100,
    sliderPosition: 50,
    isDragging: false
  };

  const sourceCanvas = document.getElementById('sourceCanvas');
  const ditherCanvas = document.getElementById('ditherCanvas');
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const ditherCtx = ditherCanvas.getContext('2d', { willReadFrequently: true });
  
  const placeholder = document.getElementById('placeholder');
  const fileInput = document.getElementById('fileInput');
  const comparisonSlider = document.getElementById('comparisonSlider');
  const sliderHandle = document.getElementById('sliderHandle');

  function init() {
    setupEventListeners();
    setupDragAndDrop();
  }

  function setupEventListeners() {
    document.querySelector('.canvas-container').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.algorithm = btn.dataset.algo;
        processImage();
      });
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.palette = btn.dataset.palette;
        processImage();
      });
    });

    const pixelSizeSlider = document.getElementById('pixelSize');
    const pixelSizeValue = document.getElementById('pixelSizeValue');
    pixelSizeSlider.addEventListener('input', (e) => {
      state.pixelSize = parseInt(e.target.value);
      pixelSizeValue.textContent = state.pixelSize;
      processImage();
    });

    const contrastSlider = document.getElementById('contrast');
    const contrastValue = document.getElementById('contrastValue');
    contrastSlider.addEventListener('input', (e) => {
      state.contrast = parseInt(e.target.value);
      contrastValue.textContent = state.contrast + '%';
      processImage();
    });

    const brightnessSlider = document.getElementById('brightness');
    const brightnessValue = document.getElementById('brightnessValue');
    brightnessSlider.addEventListener('input', (e) => {
      state.brightness = parseInt(e.target.value);
      brightnessValue.textContent = state.brightness + '%';
      processImage();
    });

    document.getElementById('exportPng').addEventListener('click', exportImage);
    document.getElementById('resetBtn').addEventListener('click', resetAll);

    setupComparisonSlider();
  }

  function setupDragAndDrop() {
    const container = document.querySelector('.canvas-container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      container.addEventListener(eventName, () => {
        container.style.borderColor = 'var(--color-accent)';
        container.style.boxShadow = '0 0 60px rgba(0, 245, 212, 0.2)';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, () => {
        container.style.borderColor = '';
        container.style.boxShadow = '';
      });
    });

    container.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        loadImage(files[0]);
      }
    });
  }

  function setupComparisonSlider() {
    const handleStart = (e) => {
      if (!state.imageLoaded) return;
      state.isDragging = true;
      comparisonSlider.classList.add('active');
      e.preventDefault();
    };

    const handleMove = (e) => {
      if (!state.isDragging) return;
      
      const rect = ditherCanvas.getBoundingClientRect();
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      let position = ((clientX - rect.left) / rect.width) * 100;
      position = Math.max(0, Math.min(100, position));
      
      state.sliderPosition = position;
      updateSliderPosition();
    };

    const handleEnd = () => {
      state.isDragging = false;
    };

    sliderHandle.addEventListener('mousedown', handleStart);
    sliderHandle.addEventListener('touchstart', handleStart, { passive: false });
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    ditherCanvas.addEventListener('mousemove', (e) => {
      if (!state.isDragging && state.imageLoaded) {
        const rect = ditherCanvas.getBoundingClientRect();
        const clientX = e.clientX;
        let position = ((clientX - rect.left) / rect.width) * 100;
        position = Math.max(0, Math.min(100, position));
        state.sliderPosition = position;
        updateSliderPosition();
      }
    });
  }

  function updateSliderPosition() {
    comparisonSlider.style.left = state.sliderPosition + '%';
    ditherCanvas.style.clipPath = `inset(0 ${100 - state.sliderPosition}% 0 0)`;
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
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
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        sourceCanvas.width = ditherCanvas.width = Math.floor(width);
        sourceCanvas.height = ditherCanvas.height = Math.floor(height);

        sourceCtx.drawImage(img, 0, 0, width, height);
        
        placeholder.classList.add('hidden');
        state.imageLoaded = true;
        comparisonSlider.classList.add('active');
        state.sliderPosition = 50;
        updateSliderPosition();
        
        processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function processImage() {
    if (!state.imageLoaded) return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const data = new Uint8ClampedArray(imageData.data);

    applyContrastBrightness(data, state.contrast, state.brightness);

    let processedData;
    switch (state.algorithm) {
      case 'floydSteinberg':
        processedData = floydSteinbergDither(data, width, height);
        break;
      case 'ordered':
        processedData = orderedDither(data, width, height);
        break;
      case 'atkinson':
        processedData = atkinsonDither(data, width, height);
        break;
      case 'burkes':
        processedData = burkesDither(data, width, height);
        break;
      case 'sierra':
        processedData = sierraDither(data, width, height);
        break;
      case 'stucki':
        processedData = stuckiDither(data, width, height);
        break;
      default:
        processedData = floydSteinbergDither(data, width, height);
    }

    const outputImageData = new ImageData(processedData, width, height);
    ditherCtx.putImageData(outputImageData, 0, 0);
  }

  function applyContrastBrightness(data, contrast, brightness) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const brightnessOffset = brightness - 100;

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];
        value = factor * (value - 128) + 128;
        value += brightnessOffset * 2.55;
        data[i + j] = Math.max(0, Math.min(255, value));
      }
    }
  }

  function findClosestColor(r, g, b, palette) {
    let minDistance = Infinity;
    let closest = palette[0];

    for (const color of palette) {
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr + dg * dg + db * db;
      
      if (distance < minDistance) {
        minDistance = distance;
        closest = color;
      }
    }

    return closest;
  }

  function floydSteinbergDither(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const palette = PALLETES[state.palette];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = result[idx];
        const oldG = result[idx + 1];
        const oldB = result[idx + 2];

        const newColor = findClosestColor(oldR, oldG, oldB, palette);
        
        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];

        const errR = oldR - newColor[0];
        const errG = oldG - newColor[1];
        const errB = oldB - newColor[2];

        distributeError(result, width, height, x, y, errR, errG, errB, [
          [1, 0, 7/16],
          [-1, 1, 3/16],
          [0, 1, 5/16],
          [1, 1, 1/16]
        ]);
      }
    }

    return result;
  }

  function orderedDither(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    const palette = PALLETES[state.palette];
    const matrixSize = 4;
    const threshold = 255 / (palette.length * palette.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const matrixX = x % matrixSize;
        const matrixY = y % matrixSize;
        const matrixValue = BAYER_MATRIX_4x4[matrixY][matrixX] / 16;

        const r = data[idx] + matrixValue * threshold * palette.length;
        const g = data[idx + 1] + matrixValue * threshold * palette.length;
        const b = data[idx + 2] + matrixValue * threshold * palette.length;

        const newColor = findClosestColor(
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b)),
          palette
        );

        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];
        result[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  function atkinsonDither(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const palette = PALLETES[state.palette];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = result[idx];
        const oldG = result[idx + 1];
        const oldB = result[idx + 2];

        const newColor = findClosestColor(oldR, oldG, oldB, palette);
        
        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];

        const errR = (oldR - newColor[0]) / 8;
        const errG = (oldG - newColor[1]) / 8;
        const errB = (oldB - newColor[2]) / 8;

        distributeError(result, width, height, x, y, errR, errG, errB, [
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

  function burkesDither(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const palette = PALLETES[state.palette];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = result[idx];
        const oldG = result[idx + 1];
        const oldB = result[idx + 2];

        const newColor = findClosestColor(oldR, oldG, oldB, palette);
        
        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];

        const errR = oldR - newColor[0];
        const errG = oldG - newColor[1];
        const errB = oldB - newColor[2];

        distributeError(result, width, height, x, y, errR, errG, errB, [
          [1, 0, 8/32],
          [2, 0, 4/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 8/32],
          [1, 1, 4/32],
          [2, 1, 2/32]
        ]);
      }
    }

    return result;
  }

  function sierraDither(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const palette = PALLETES[state.palette];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = result[idx];
        const oldG = result[idx + 1];
        const oldB = result[idx + 2];

        const newColor = findClosestColor(oldR, oldG, oldB, palette);
        
        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];

        const errR = oldR - newColor[0];
        const errG = oldG - newColor[1];
        const errB = oldB - newColor[2];

        distributeError(result, width, height, x, y, errR, errG, errB, [
          [1, 0, 5/32],
          [2, 0, 3/32],
          [-2, 1, 2/32],
          [-1, 1, 4/32],
          [0, 1, 5/32],
          [1, 1, 4/32],
          [2, 1, 2/32],
          [-1, 2, 2/32],
          [0, 2, 3/32],
          [1, 2, 2/32]
        ]);
      }
    }

    return result;
  }

  function stuckiDither(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const palette = PALLETES[state.palette];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = result[idx];
        const oldG = result[idx + 1];
        const oldB = result[idx + 2];

        const newColor = findClosestColor(oldR, oldG, oldB, palette);
        
        result[idx] = newColor[0];
        result[idx + 1] = newColor[1];
        result[idx + 2] = newColor[2];

        const errR = oldR - newColor[0];
        const errG = oldG - newColor[1];
        const errB = oldB - newColor[2];

        distributeError(result, width, height, x, y, errR, errG, errB, [
          [1, 0, 8/42],
          [2, 0, 4/42],
          [-2, 1, 2/42],
          [-1, 1, 4/42],
          [0, 1, 8/42],
          [1, 1, 4/42],
          [2, 1, 2/42],
          [-2, 2, 1/42],
          [-1, 2, 2/42],
          [0, 2, 4/42],
          [1, 2, 2/42],
          [2, 2, 1/42]
        ]);
      }
    }

    return result;
  }

  function distributeError(data, width, height, x, y, errR, errG, errB, offsets) {
    for (const [dx, dy, factor] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        data[idx] = Math.max(0, Math.min(255, data[idx] + errR * factor));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * factor));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * factor));
      }
    }
  }

  function exportImage() {
    if (!state.imageLoaded) return;

    const link = document.createElement('a');
    link.download = 'dither-art.png';
    link.href = ditherCanvas.toDataURL('image/png');
    link.click();
  }

  function resetAll() {
    state = {
      imageLoaded: false,
      algorithm: 'floydSteinberg',
      palette: 'bw',
      pixelSize: 1,
      contrast: 100,
      brightness: 100,
      sliderPosition: 50,
      isDragging: false
    };

    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    ditherCtx.clearRect(0, 0, ditherCanvas.width, ditherCanvas.height);
    
    placeholder.classList.remove('hidden');
    comparisonSlider.classList.remove('active');
    fileInput.value = '';

    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.algo === 'floydSteinberg');
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.palette === 'bw');
    });

    document.getElementById('pixelSize').value = 1;
    document.getElementById('pixelSizeValue').textContent = '1';
    document.getElementById('contrast').value = 100;
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('brightness').value = 100;
    document.getElementById('brightnessValue').textContent = '100%';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
