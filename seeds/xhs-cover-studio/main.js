import {
  COVER_HEIGHT,
  COVER_WIDTH,
  STYLE_PRESETS,
  buildCoverSvg,
  createTemplateLayout,
  createTemplateSticker,
  normalizeCoverState
} from './lib/cover-generator.js';
import { extractCoverVariants } from './lib/content-extractor.js';
import { FOCUS_OPTIONS, generateDraft } from './lib/idea-generator.js';

const STORAGE_KEY = 'xhs-cover-studio-state';
const ARTICLE_STORAGE_KEY = 'xhs-cover-studio-article';
const STICKER_OPTIONS = Object.freeze([
  { id: 'none', emoji: '', label: '无贴纸' },
  { id: 'thinking', emoji: '🤔', label: '思考' },
  { id: 'thumbs-up', emoji: '👍', label: '认可' },
  { id: 'wow', emoji: '😣', label: '情绪' },
  { id: 'idea', emoji: '💡', label: '灵感' },
  { id: 'target', emoji: '🎯', label: '目标' },
  { id: 'sparkles', emoji: '✨', label: '点睛' },
  { id: 'fire', emoji: '🔥', label: '爆点' },
  { id: 'strong', emoji: '💪', label: '力量' }
]);

document.addEventListener('DOMContentLoaded', () => {
  const state = normalizeCoverState(loadPersistedState());
  const dragState = {
    target: '',
    pointerId: null,
    offsetX: 0,
    offsetY: 0
  };
  let candidateVariants = [];

  const elements = {
    articleInput: document.getElementById('article-input'),
    topicInput: document.getElementById('topic-input'),
    headlineInput: document.getElementById('headline-input'),
    highlightInput: document.getElementById('highlight-input'),
    subheadInput: document.getElementById('subhead-input'),
    focusOptions: document.getElementById('focus-options'),
    styleOptions: document.getElementById('style-options'),
    stickerOptions: document.getElementById('sticker-options'),
    toggleAngleBadge: document.getElementById('toggle-angle-badge'),
    toggleAngleMark: document.getElementById('toggle-angle-mark'),
    toggleFooterBrand: document.getElementById('toggle-footer-brand'),
    extractContent: document.getElementById('extract-content'),
    candidateOptions: document.getElementById('candidate-options'),
    generateCopy: document.getElementById('generate-copy'),
    previewStage: document.getElementById('preview-stage'),
    coverCanvas: document.getElementById('cover-canvas'),
    downloadSvg: document.getElementById('download-svg'),
    downloadPng: document.getElementById('download-png')
  };

  renderAngleOptions();
  renderStyleOptions();
  renderStickerOptions();
  renderCandidateOptions();
  elements.articleInput.value = loadArticleDraft();
  syncInputs();
  renderPreview();

  elements.articleInput.addEventListener('input', (event) => {
    persistArticleDraft(event.target.value);
  });

  elements.topicInput.addEventListener('input', (event) => {
    setField('topic', event.target.value);
  });

  elements.headlineInput.addEventListener('input', (event) => {
    setField('headline', event.target.value);
  });

  elements.highlightInput.addEventListener('input', (event) => {
    setField('highlight', event.target.value);
  });

  elements.subheadInput.addEventListener('input', (event) => {
    setField('subhead', event.target.value);
  });

  elements.focusOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-focus]');
    if (!target) {
      return;
    }

    setState({ focusMode: target.dataset.focus });
  });

  elements.styleOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-style]');
    if (!target) {
      return;
    }

    const style = STYLE_PRESETS.find((item) => item.id === target.dataset.style);
    if (!style) {
      return;
    }

    const resetSticker = {
      ...createTemplateSticker(style.templateId),
      emoji: state.sticker.emoji
    };

    setState({
      templateId: style.templateId,
      themeId: style.themeId,
      layout: createTemplateLayout(style.templateId),
      sticker: resetSticker
    });
  });

  elements.stickerOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-sticker]');
    if (!target) {
      return;
    }

    const emoji = target.dataset.sticker || '';
    if (!emoji) {
      setState({ sticker: { ...state.sticker, emoji: '' } });
      return;
    }

    const baseSticker = state.sticker.emoji
      ? state.sticker
      : createTemplateSticker(state.templateId);

    setState({
      sticker: {
        ...baseSticker,
        emoji
      }
    });
  });

  elements.generateCopy.addEventListener('click', () => {
    const draft = generateDraft(state.topic, state.focusMode);
    setState(draft, { syncInputs: true });
  });

  elements.extractContent.addEventListener('click', () => {
    candidateVariants = extractCoverVariants(elements.articleInput.value);
    renderCandidateOptions(0);
    setState(candidateVariants[0], { syncInputs: true });
  });

  elements.candidateOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-candidate-index]');
    if (!target) {
      return;
    }

    const index = Number(target.dataset.candidateIndex);
    const variant = candidateVariants[index];
    if (!variant) {
      return;
    }

    renderCandidateOptions(index);
    setState(variant, { syncInputs: true });
  });

  elements.toggleAngleBadge.addEventListener('change', (event) => {
    setState({
      decorations: {
        showAngleBadge: event.target.checked
      }
    });
  });

  elements.toggleAngleMark.addEventListener('change', (event) => {
    setState({
      decorations: {
        showAngleMark: event.target.checked
      }
    });
  });

  elements.toggleFooterBrand.addEventListener('change', (event) => {
    setState({
      decorations: {
        showFooterBrand: event.target.checked
      }
    });
  });

  elements.coverCanvas.addEventListener('pointerdown', (event) => {
    const dragTarget = event.target.closest?.('[data-drag-target]');
    if (!dragTarget) {
      return;
    }

    const point = eventToCanvasPoint(event, elements.coverCanvas);
    const position = getDragPosition(dragTarget.getAttribute('data-drag-target'));
    dragState.target = dragTarget.getAttribute('data-drag-target') || '';
    dragState.pointerId = event.pointerId;
    dragState.offsetX = point.x - position.x;
    dragState.offsetY = point.y - position.y;

    elements.coverCanvas.setPointerCapture?.(event.pointerId);
    elements.previewStage.classList.add('is-dragging');
    event.preventDefault();
  });

  elements.coverCanvas.addEventListener('pointermove', (event) => {
    if (!dragState.target || dragState.pointerId !== event.pointerId) {
      return;
    }

    const point = eventToCanvasPoint(event, elements.coverCanvas);
    const x = point.x - dragState.offsetX;
    const y = point.y - dragState.offsetY;
    updateDragPosition(dragState.target, x, y);
  });

  elements.coverCanvas.addEventListener('pointerup', endDrag);
  elements.coverCanvas.addEventListener('pointercancel', endDrag);

  elements.downloadSvg.addEventListener('click', () => {
    const svg = buildCoverSvg(state);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, slugify(state.topic || state.headline), 'svg');
  });

  elements.downloadPng.addEventListener('click', async () => {
    const blob = await exportPngBlob(buildCoverSvg(state));
    downloadBlob(blob, slugify(state.topic || state.headline), 'png');
  });

  function endDrag(event) {
    if (!dragState.target || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.target = '';
    dragState.pointerId = null;
    elements.previewStage.classList.remove('is-dragging');
  }

  function getDragPosition(target) {
    if (target === 'sticker') {
      return state.sticker;
    }
    return state.layout[target] || { x: 0, y: 0 };
  }

  function updateDragPosition(target, x, y) {
    if (target === 'sticker') {
      setState({
        sticker: {
          ...state.sticker,
          x,
          y
        }
      });
      return;
    }

    setState({
      layout: {
        [target]: { x, y }
      }
    });
  }

  function setField(key, value) {
    setState({ [key]: value });
  }

  function setState(patch, options = {}) {
    const nextState = normalizeCoverState({
      ...state,
      ...patch,
      layout: mergeLayoutPatch(state.layout, patch.layout),
      sticker: patch.sticker ? { ...state.sticker, ...patch.sticker } : state.sticker,
      decorations: patch.decorations ? { ...state.decorations, ...patch.decorations } : state.decorations
    });

    Object.assign(state, nextState);
    persistState(state);

    if (options.syncInputs) {
      syncInputs();
    }

    updateSelectionStates();
    renderPreview();
  }

  function syncInputs() {
    elements.topicInput.value = state.topic;
    elements.headlineInput.value = state.headline;
    elements.highlightInput.value = state.highlight;
    elements.subheadInput.value = state.subhead;
    elements.toggleAngleBadge.checked = state.decorations.showAngleBadge;
    elements.toggleAngleMark.checked = state.decorations.showAngleMark;
    elements.toggleFooterBrand.checked = state.decorations.showFooterBrand;
    updateSelectionStates();
  }

  function renderAngleOptions() {
    elements.focusOptions.innerHTML = FOCUS_OPTIONS.map((option) => `
      <button class="focus-chip${state.focusMode === option.id ? ' is-active' : ''}" type="button" data-focus="${option.id}">
        <strong>${option.label}</strong>
        <span>${option.description}</span>
      </button>
    `).join('');
  }

  function renderStyleOptions() {
    elements.styleOptions.innerHTML = STYLE_PRESETS.map((style) => `
      <button class="style-card${isStyleActive(style) ? ' is-active' : ''}" type="button" data-style="${style.id}">
        <strong>${style.name}</strong>
        <span>${style.description}</span>
      </button>
    `).join('');
  }

  function renderStickerOptions() {
    elements.stickerOptions.innerHTML = STICKER_OPTIONS.map((item) => `
      <button class="sticker-card${isStickerActive(item.emoji) ? ' is-active' : ''}" type="button" data-sticker="${item.emoji}">
        <span class="sticker-card-emoji">${item.emoji || '＋'}</span>
        <strong>${item.label}</strong>
      </button>
    `).join('');
  }

  function renderCandidateOptions(activeIndex = 0) {
    if (candidateVariants.length === 0) {
      elements.candidateOptions.innerHTML = `
        <div class="candidate-empty">
          <strong>还没有候选文案</strong>
          <span>先贴正文，再点上方按钮，一次生成 3 套不同风格。</span>
        </div>
      `;
      return;
    }

    elements.candidateOptions.innerHTML = candidateVariants.map((variant, index) => {
      const option = FOCUS_OPTIONS.find((item) => item.id === variant.focusMode);
      return `
        <button class="candidate-card${index === activeIndex ? ' is-active' : ''}" type="button" data-candidate-index="${index}">
          <span class="candidate-kicker">${option ? option.label : variant.focusMode}</span>
          <strong>${variant.headline}</strong>
          <span>${variant.highlight} · ${variant.subhead}</span>
        </button>
      `;
    }).join('');
  }

  function updateSelectionStates() {
    elements.focusOptions.querySelectorAll('[data-focus]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.focus === state.focusMode);
    });

    elements.styleOptions.querySelectorAll('[data-style]').forEach((button) => {
      const style = STYLE_PRESETS.find((item) => item.id === button.dataset.style);
      button.classList.toggle('is-active', Boolean(style && isStyleActive(style)));
    });

    elements.stickerOptions.querySelectorAll('[data-sticker]').forEach((button) => {
      button.classList.toggle('is-active', isStickerActive(button.dataset.sticker));
    });
  }

  function isStyleActive(style) {
    return style.templateId === state.templateId && style.themeId === state.themeId;
  }

  function isStickerActive(emoji) {
    return (emoji || '') === state.sticker.emoji;
  }

  function renderPreview() {
    elements.coverCanvas.innerHTML = buildCoverSvg(state, { interactive: true });
  }
});

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
}

function loadArticleDraft() {
  try {
    return window.localStorage.getItem(ARTICLE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function persistArticleDraft(value) {
  try {
    window.localStorage.setItem(ARTICLE_STORAGE_KEY, String(value ?? ''));
  } catch {
    // Ignore storage failures.
  }
}

function mergeLayoutPatch(currentLayout, patchLayout) {
  if (!patchLayout) {
    return currentLayout;
  }

  return {
    headline: patchLayout.headline ? { ...currentLayout.headline, ...patchLayout.headline } : currentLayout.headline,
    highlight: patchLayout.highlight ? { ...currentLayout.highlight, ...patchLayout.highlight } : currentLayout.highlight,
    subhead: patchLayout.subhead ? { ...currentLayout.subhead, ...patchLayout.subhead } : currentLayout.subhead
  };
}

function eventToCanvasPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * COVER_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * COVER_HEIGHT
  };
}

function downloadBlob(blob, baseName, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'xhs-cover';
}

async function exportPngBlob(svgMarkup) {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  const blob = await new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = COVER_WIDTH;
      canvas.height = COVER_HEIGHT;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
      context.drawImage(image, 0, 0, COVER_WIDTH, COVER_HEIGHT);
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('PNG export failed'));
        }
      }, 'image/png');
    };

    image.onerror = () => reject(new Error('SVG image load failed'));
    image.src = url;
  });

  URL.revokeObjectURL(url);
  return blob;
}
