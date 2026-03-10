export const COVER_WIDTH = 1080;
export const COVER_HEIGHT = 1440;

export const THEMES = Object.freeze({
  'paper-flame': {
    id: 'paper-flame',
    name: '纸感珊瑚',
    bg: '#f4ede6',
    panel: '#fffaf5',
    ink: '#171311',
    accent: '#cb5c37',
    accentSoft: '#eed7cd',
    accentDark: '#9d3d1f',
    line: '#d9cec4',
    inverse: '#fffaf5'
  },
  'obsidian-pop': {
    id: 'obsidian-pop',
    name: '黑底反差',
    bg: '#111111',
    panel: '#1a1a1a',
    ink: '#f7f1e8',
    accent: '#ff7340',
    accentSoft: '#57372c',
    accentDark: '#f4b699',
    line: '#313131',
    inverse: '#131313'
  },
  'moss-ink': {
    id: 'moss-ink',
    name: '青苔便签',
    bg: '#e7eadf',
    panel: '#fbfdf5',
    ink: '#1b241d',
    accent: '#48624b',
    accentSoft: '#cad8c8',
    accentDark: '#29412d',
    line: '#bec8bb',
    inverse: '#f9fbf5'
  }
});

export const TEMPLATES = Object.freeze({
  editorial: {
    id: 'editorial',
    label: '纸感标题',
    maxCharsPerLine: 8
  },
  split: {
    id: 'split',
    label: '黑底反差',
    maxCharsPerLine: 9
  },
  memo: {
    id: 'memo',
    label: '清单便签',
    maxCharsPerLine: 7
  }
});

export const STYLE_PRESETS = Object.freeze([
  {
    id: 'paper-editorial',
    name: '纸感标题',
    description: '温润、专业、像编辑部',
    templateId: 'editorial',
    themeId: 'paper-flame'
  },
  {
    id: 'obsidian-split',
    name: '黑底反差',
    description: '强结论、强点击',
    templateId: 'split',
    themeId: 'obsidian-pop'
  },
  {
    id: 'moss-memo',
    name: '清单便签',
    description: '亲和、清楚、适合经验分享',
    templateId: 'memo',
    themeId: 'moss-ink'
  }
]);

const ANGLE_META = Object.freeze({
  authority: { badge: '观点型', mark: 'POINT OF VIEW' },
  tutorial: { badge: '教程型', mark: 'HOW TO' },
  list: { badge: '清单型', mark: 'CHECKLIST' },
  emotion: { badge: '情绪型', mark: 'EMOTIONAL HOOK' }
});

const DEFAULT_LAYOUTS = Object.freeze({
  editorial: Object.freeze({
    headline: Object.freeze({ x: 108, y: 378 }),
    highlight: Object.freeze({ x: 108, y: 1036 }),
    subhead: Object.freeze({ x: 108, y: 1140 })
  }),
  split: Object.freeze({
    headline: Object.freeze({ x: 108, y: 402 }),
    highlight: Object.freeze({ x: 261, y: 1002 }),
    subhead: Object.freeze({ x: 108, y: 1118 })
  }),
  memo: Object.freeze({
    headline: Object.freeze({ x: 208, y: 592 }),
    highlight: Object.freeze({ x: 174, y: 242 }),
    subhead: Object.freeze({ x: 208, y: 900 })
  })
});

const DEFAULT_STICKERS = Object.freeze({
  editorial: Object.freeze({ emoji: '', x: 860, y: 284, size: 132, rotation: -8 }),
  split: Object.freeze({ emoji: '', x: 864, y: 284, size: 140, rotation: 10 }),
  memo: Object.freeze({ emoji: '', x: 852, y: 294, size: 136, rotation: -10 })
});

const LAYOUT_BOUNDS = Object.freeze({
  headline: Object.freeze({ xMin: 80, xMax: 820, yMin: 260, yMax: 820 }),
  highlight: Object.freeze({ xMin: 96, xMax: 930, yMin: 180, yMax: 1120 }),
  subhead: Object.freeze({ xMin: 96, xMax: 910, yMin: 520, yMax: 1240 })
});

const STICKER_BOUNDS = Object.freeze({
  xMin: 120,
  xMax: 960,
  yMin: 140,
  yMax: 1180,
  sizeMin: 84,
  sizeMax: 220,
  rotationMin: -35,
  rotationMax: 35
});

const DEFAULT_STATE = Object.freeze({
  topic: 'AI 工作流',
  focusMode: 'authority',
  templateId: 'editorial',
  themeId: 'paper-flame',
  headline: '做出更有停留感的小红书封面',
  highlight: '停留感',
  subhead: '先让读者停下，再让读者点开。封面要表达的是承诺，而不是把关键词堆大。',
  badge: ''
});

const DEFAULT_DECORATIONS = Object.freeze({
  showAngleBadge: true,
  showAngleMark: true,
  showFooterBrand: true
});

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampPoint(point, fallback, bounds) {
  const x = clamp(toFiniteNumber(point?.x, fallback.x), bounds.xMin, bounds.xMax);
  const y = clamp(toFiniteNumber(point?.y, fallback.y), bounds.yMin, bounds.yMax);
  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeTextValue(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveEditableText(input, key, fallback) {
  if (!hasOwn(input, key)) {
    return fallback;
  }
  return normalizeTextValue(input[key]);
}

function deriveHighlight(headline) {
  const compact = normalizeTextValue(headline).replace(/\s+/g, '');
  if (!compact) {
    return '';
  }
  if (compact.length <= 4) {
    return compact;
  }
  if (compact.length <= 8) {
    return compact.slice(0, 3);
  }
  return compact.slice(0, 4);
}

function splitBalanced(text, maxCharsPerLine) {
  const normalized = normalizeTextValue(text);
  if (!normalized) {
    return [];
  }

  const manualLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (manualLines.length > 1) {
    return manualLines;
  }

  const chars = Array.from(normalized.replace(/\s+/g, ''));
  if (chars.length <= maxCharsPerLine) {
    return [chars.join('')];
  }

  const targetLines = clamp(Math.ceil(chars.length / maxCharsPerLine), 2, 4);
  const lines = [];
  let pointer = 0;

  for (let index = 0; index < targetLines; index += 1) {
    const remainingChars = chars.length - pointer;
    const remainingLines = targetLines - index;
    const sliceLength = Math.ceil(remainingChars / remainingLines);
    lines.push(chars.slice(pointer, pointer + sliceLength).join(''));
    pointer += sliceLength;
  }

  return lines.filter(Boolean);
}

function splitBodyText(text, maxCharsPerLine, maxLines = 3) {
  const normalized = normalizeTextValue(text).replace(/\n/g, '');
  if (!normalized) {
    return [];
  }

  const chars = Array.from(normalized);
  const lines = [];

  while (chars.length > 0 && lines.length < maxLines) {
    lines.push(chars.splice(0, maxCharsPerLine).join(''));
  }

  if (chars.length > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  }

  return lines;
}

function estimateTextWidth(text, size) {
  return Array.from(String(text ?? '')).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + size * 0.24;
    }
    if (/[A-Za-z0-9]/.test(char)) {
      return total + size * 0.58;
    }
    return total + size * 0.92;
  }, 0);
}

function renderHeadlineLines(lines, startX, startY, size, color) {
  return lines
    .map((line, index) => {
      const y = startY + index * size * 1.08;
      return `<text x="${startX}" y="${y}" fill="${color}" font-size="${size}" font-family="'Noto Serif SC','Songti SC','STSong',serif" font-weight="700" letter-spacing="-1.2">${escapeXml(line)}</text>`;
    })
    .join('');
}

function renderBodyLines(lines, startX, startY, size, color, lineHeight = 1.55, opacity = 0.8) {
  return lines
    .map((line, index) => {
      const y = startY + index * size * lineHeight;
      return `<text x="${startX}" y="${y}" fill="${color}" opacity="${opacity}" font-size="${size}" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif" font-weight="500">${escapeXml(line)}</text>`;
    })
    .join('');
}

function renderDraggableGroup(target, bounds, content, interactive) {
  if (!interactive) {
    return content;
  }

  return `
    <g data-drag-target="${target}" class="drag-target">
      <rect class="drag-hit" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="${bounds.radius ?? 24}" fill="#ffffff" fill-opacity="0.001" />
      <rect class="drag-outline" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="${bounds.radius ?? 24}" fill="none" stroke="#cb5c37" stroke-width="3" stroke-dasharray="10 8" opacity="0" />
      ${content}
    </g>
  `;
}

function getRenderValues(state) {
  const headline = state.headline || '在左侧输入标题';
  const highlight = state.highlight || deriveHighlight(headline);
  const subhead = state.subhead || '补一句说明，让封面更完整。';
  return { headline, highlight, subhead };
}

function renderHeaderMeta(theme, state) {
  const angle = ANGLE_META[state.focusMode] || ANGLE_META.authority;
  const badgeWidth = 160 + Array.from(angle.badge).length * 16;
  const parts = [];

  if (state.decorations.showAngleBadge) {
    parts.push(`
      <g transform="translate(108 120)">
        <rect width="${badgeWidth}" height="64" rx="32" fill="${theme.accentSoft}" />
        <text x="${badgeWidth / 2}" y="41" text-anchor="middle" fill="${theme.accentDark}" font-size="30" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif" font-weight="700">${escapeXml(angle.badge)}</text>
      </g>
    `);
  }

  if (state.decorations.showAngleMark) {
    parts.push(`<text x="108" y="228" fill="${theme.accentDark}" font-size="24" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif" letter-spacing="4">${angle.mark}</text>`);
  }

  return parts.join('');
}

function renderFooter(theme, topic) {
  return `
    <text x="108" y="1326" fill="${theme.ink}" opacity="0.55" font-size="24" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif">TOPIC / ${escapeXml(topic || '未命名主题')}</text>
    <text x="972" y="1326" text-anchor="end" fill="${theme.ink}" opacity="0.45" font-size="24" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif" letter-spacing="3">XHS COVER STUDIO</text>
  `;
}

function renderFooterBrand(theme) {
  if (!theme) {
    return '';
  }

  return `<text x="972" y="1326" text-anchor="end" fill="${theme.ink}" opacity="0.45" font-size="24" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif" letter-spacing="3">XHS COVER STUDIO</text>`;
}

function renderSticker(theme, sticker, interactive) {
  if (!sticker.emoji) {
    return '';
  }

  const box = {
    x: Math.round(sticker.x - sticker.size * 0.62),
    y: Math.round(sticker.y - sticker.size * 0.72),
    width: Math.round(sticker.size * 1.24),
    height: Math.round(sticker.size * 1.18),
    radius: 32
  };

  const content = `
    <g transform="rotate(${sticker.rotation} ${sticker.x} ${sticker.y})">
      <text x="${sticker.x}" y="${sticker.y}" text-anchor="middle" dominant-baseline="middle" font-size="${sticker.size}" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${escapeXml(sticker.emoji)}</text>
    </g>
  `;

  return renderDraggableGroup('sticker', box, content, interactive);
}

function renderEditorial(renderState, state, theme, lines, interactive) {
  const layout = state.layout;
  const headlineWidth = Math.max(...lines.map((line) => estimateTextWidth(line, 116)), 280);
  const headlineBox = {
    x: layout.headline.x - 24,
    y: layout.headline.y - 104,
    width: Math.round(headlineWidth + 48),
    height: Math.round(lines.length * 116 * 1.08 + 34)
  };
  const highlightWidth = Math.max(220, estimateTextWidth(renderState.highlight, 48) + 18);
  const highlightBox = {
    x: layout.highlight.x - 20,
    y: layout.highlight.y - 56,
    width: Math.round(highlightWidth + 40),
    height: 90
  };
  const subLines = splitBodyText(renderState.subhead, 17, 3);
  const subheadWidth = Math.max(...subLines.map((line) => estimateTextWidth(line, 36)), 320);
  const subheadBox = {
    x: layout.subhead.x - 20,
    y: layout.subhead.y - 40,
    width: Math.round(subheadWidth + 32),
    height: Math.round(subLines.length * 36 * 1.58 + 26)
  };

  return `
    <rect x="56" y="56" width="968" height="1328" rx="40" fill="${theme.panel}" stroke="${theme.line}" stroke-width="3"/>
    ${renderHeaderMeta(theme, state)}
    ${renderDraggableGroup('headline', headlineBox, renderHeadlineLines(lines, layout.headline.x, layout.headline.y, 116, theme.ink), interactive)}
    ${renderDraggableGroup('highlight', highlightBox, `
      <text x="${layout.highlight.x}" y="${layout.highlight.y}" fill="${theme.accentDark}" font-size="48" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif" font-weight="700">${escapeXml(renderState.highlight)}</text>
      <rect x="${layout.highlight.x}" y="${layout.highlight.y + 30}" width="${highlightWidth}" height="12" rx="6" fill="${theme.accent}" />
    `, interactive)}
    ${renderDraggableGroup('subhead', subheadBox, renderBodyLines(subLines, layout.subhead.x, layout.subhead.y, 36, theme.ink, 1.58, 0.82), interactive)}
    ${renderSticker(theme, state.sticker, interactive)}
  `;
}

function renderSplit(renderState, state, theme, lines, interactive) {
  const layout = state.layout;
  const headlineWidth = Math.max(...lines.map((line) => estimateTextWidth(line, 110)), 280);
  const headlineBox = {
    x: layout.headline.x - 24,
    y: layout.headline.y - 98,
    width: Math.round(headlineWidth + 48),
    height: Math.round(lines.length * 110 * 1.08 + 34)
  };
  const pillWidth = Math.max(260, estimateTextWidth(renderState.highlight, 44) + 122);
  const highlightBox = {
    x: Math.round(layout.highlight.x - pillWidth / 2),
    y: layout.highlight.y - 60,
    width: Math.round(pillWidth),
    height: 112,
    radius: 24
  };
  const subLines = splitBodyText(renderState.subhead, 18, 3);
  const subheadWidth = Math.max(...subLines.map((line) => estimateTextWidth(line, 38)), 320);
  const subheadBox = {
    x: layout.subhead.x - 20,
    y: layout.subhead.y - 42,
    width: Math.round(subheadWidth + 32),
    height: Math.round(subLines.length * 38 * 1.6 + 26)
  };

  return `
    <rect x="56" y="56" width="968" height="1328" rx="40" fill="${theme.panel}" stroke="${theme.line}" stroke-width="3"/>
    <rect x="56" y="866" width="968" height="518" rx="0 0 40 40" fill="${theme.ink}"/>
    <circle cx="844" cy="250" r="132" fill="${theme.accentSoft}" opacity="0.7"/>
    ${renderHeaderMeta(theme, state)}
    ${renderDraggableGroup('headline', headlineBox, renderHeadlineLines(lines, layout.headline.x, layout.headline.y, 110, theme.ink), interactive)}
    ${renderDraggableGroup('highlight', highlightBox, `
      <rect x="${layout.highlight.x - pillWidth / 2}" y="${layout.highlight.y - 60}" width="${pillWidth}" height="94" rx="22" fill="${theme.accent}" />
      <text x="${layout.highlight.x}" y="${layout.highlight.y}" text-anchor="middle" fill="${theme.inverse}" font-size="44" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif" font-weight="700">${escapeXml(renderState.highlight)}</text>
    `, interactive)}
    ${renderDraggableGroup('subhead', subheadBox, renderBodyLines(subLines, layout.subhead.x, layout.subhead.y, 38, theme.inverse, 1.6, 0.92), interactive)}
    ${renderSticker(theme, state.sticker, interactive)}
  `;
}

function renderMemo(renderState, state, theme, lines, interactive) {
  const layout = state.layout;
  const headlineWidth = Math.max(...lines.map((line) => estimateTextWidth(line, 102)), 280);
  const headlineBox = {
    x: layout.headline.x - 24,
    y: layout.headline.y - 92,
    width: Math.round(headlineWidth + 48),
    height: Math.round(lines.length * 102 * 1.08 + 34)
  };
  const highlightWidth = Math.max(240, estimateTextWidth(renderState.highlight, 52) + 86);
  const highlightBox = {
    x: layout.highlight.x - 60,
    y: layout.highlight.y - 122,
    width: Math.round(highlightWidth),
    height: 194,
    radius: 28
  };
  const subLines = splitBodyText(renderState.subhead, 16, 4);
  const subheadWidth = Math.max(...subLines.map((line) => estimateTextWidth(line, 36)), 300);
  const subheadBox = {
    x: layout.subhead.x - 20,
    y: layout.subhead.y - 38,
    width: Math.round(subheadWidth + 32),
    height: Math.round(subLines.length * 36 * 1.58 + 30)
  };

  return `
    <rect x="56" y="56" width="968" height="1328" rx="40" fill="${theme.panel}" stroke="${theme.line}" stroke-width="3"/>
    <rect x="162" y="394" width="756" height="636" rx="38" fill="${theme.inverse}" stroke="${theme.line}" stroke-width="3"/>
    ${renderHeaderMeta(theme, state)}
    ${renderDraggableGroup('highlight', highlightBox, `
      <g transform="translate(${layout.highlight.x} ${layout.highlight.y})">
        <rect x="-42" y="-98" width="${highlightWidth}" height="176" rx="26" fill="${theme.accentSoft}" opacity="0.96" transform="rotate(-5 136 88)" />
        <text x="0" y="0" fill="${theme.accentDark}" font-size="52" font-family="'Noto Serif SC','Songti SC','STSong',serif" font-weight="700">${escapeXml(renderState.highlight)}</text>
      </g>
    `, interactive)}
    ${renderDraggableGroup('headline', headlineBox, renderHeadlineLines(lines, layout.headline.x, layout.headline.y, 102, theme.ink), interactive)}
    ${renderDraggableGroup('subhead', subheadBox, renderBodyLines(subLines, layout.subhead.x, layout.subhead.y, 36, theme.ink, 1.58, 0.78), interactive)}
    ${renderSticker(theme, state.sticker, interactive)}
  `;
}

function renderTemplate(renderState, state, theme, lines, interactive) {
  switch (state.templateId) {
    case 'split':
      return renderSplit(renderState, state, theme, lines, interactive);
    case 'memo':
      return renderMemo(renderState, state, theme, lines, interactive);
    case 'editorial':
    default:
      return renderEditorial(renderState, state, theme, lines, interactive);
  }
}

export function createTemplateLayout(templateId = DEFAULT_STATE.templateId) {
  const template = DEFAULT_LAYOUTS[templateId] || DEFAULT_LAYOUTS[DEFAULT_STATE.templateId];
  return {
    headline: { ...template.headline },
    highlight: { ...template.highlight },
    subhead: { ...template.subhead }
  };
}

export function createTemplateSticker(templateId = DEFAULT_STATE.templateId) {
  const sticker = DEFAULT_STICKERS[templateId] || DEFAULT_STICKERS[DEFAULT_STATE.templateId];
  return { ...sticker };
}

function normalizeLayout(inputLayout, templateId) {
  const defaults = createTemplateLayout(templateId);
  const source = inputLayout && typeof inputLayout === 'object' ? inputLayout : {};
  return {
    headline: clampPoint(source.headline, defaults.headline, LAYOUT_BOUNDS.headline),
    highlight: clampPoint(source.highlight, defaults.highlight, LAYOUT_BOUNDS.highlight),
    subhead: clampPoint(source.subhead, defaults.subhead, LAYOUT_BOUNDS.subhead)
  };
}

function normalizeSticker(inputSticker, templateId) {
  const defaults = createTemplateSticker(templateId);
  const source = inputSticker && typeof inputSticker === 'object' ? inputSticker : {};
  return {
    emoji: normalizeTextValue(source.emoji ?? defaults.emoji).slice(0, 2),
    x: Math.round(clamp(toFiniteNumber(source.x, defaults.x), STICKER_BOUNDS.xMin, STICKER_BOUNDS.xMax)),
    y: Math.round(clamp(toFiniteNumber(source.y, defaults.y), STICKER_BOUNDS.yMin, STICKER_BOUNDS.yMax)),
    size: Math.round(clamp(toFiniteNumber(source.size, defaults.size), STICKER_BOUNDS.sizeMin, STICKER_BOUNDS.sizeMax)),
    rotation: Math.round(clamp(toFiniteNumber(source.rotation, defaults.rotation), STICKER_BOUNDS.rotationMin, STICKER_BOUNDS.rotationMax))
  };
}

function normalizeDecorations(inputDecorations) {
  const source = inputDecorations && typeof inputDecorations === 'object' ? inputDecorations : {};
  return {
    showAngleBadge: hasOwn(source, 'showAngleBadge') ? Boolean(source.showAngleBadge) : DEFAULT_DECORATIONS.showAngleBadge,
    showAngleMark: hasOwn(source, 'showAngleMark') ? Boolean(source.showAngleMark) : DEFAULT_DECORATIONS.showAngleMark,
    showFooterBrand: hasOwn(source, 'showFooterBrand') ? Boolean(source.showFooterBrand) : DEFAULT_DECORATIONS.showFooterBrand
  };
}

export function normalizeCoverState(input = {}) {
  const templateId = TEMPLATES[input.templateId] ? input.templateId : DEFAULT_STATE.templateId;
  const themeId = THEMES[input.themeId] ? input.themeId : DEFAULT_STATE.themeId;
  const focusMode = ANGLE_META[input.focusMode] ? input.focusMode : DEFAULT_STATE.focusMode;
  const topic = resolveEditableText(input, 'topic', DEFAULT_STATE.topic);
  const headline = resolveEditableText(input, 'headline', DEFAULT_STATE.headline);
  const highlight = hasOwn(input, 'highlight')
    ? normalizeTextValue(input.highlight)
    : (hasOwn(input, 'headline') ? deriveHighlight(headline) : DEFAULT_STATE.highlight);
  const subhead = resolveEditableText(input, 'subhead', DEFAULT_STATE.subhead);
  const badge = resolveEditableText(input, 'badge', '');
  const layout = normalizeLayout(input.layout, templateId);
  const sticker = normalizeSticker(input.sticker, templateId);
  const decorations = normalizeDecorations(input.decorations);

  return {
    topic,
    focusMode,
    templateId,
    themeId,
    headline,
    highlight,
    subhead,
    badge,
    layout,
    sticker,
    decorations
  };
}

export function calculateDesignScore(inputState = {}) {
  const state = normalizeCoverState(inputState);
  const renderState = getRenderValues(state);
  const headlineLength = Array.from(renderState.headline.replace(/\s+/g, '')).length;
  const subheadLength = Array.from(renderState.subhead.replace(/\s+/g, '')).length;
  const lines = splitBalanced(renderState.headline, TEMPLATES[state.templateId].maxCharsPerLine);

  const hook = clamp(
    34
      + (renderState.highlight ? 18 : 0)
      + (headlineLength >= 8 && headlineLength <= 20 ? 20 : 10)
      + (state.focusMode === 'emotion' || state.focusMode === 'tutorial' ? 10 : 6),
    0,
    100
  );

  const hierarchy = clamp(
    38
      + (lines.length >= 2 && lines.length <= 4 ? 24 : 10)
      + (renderState.subhead ? 16 : 0)
      + (state.templateId === 'memo' ? 8 : 4),
    0,
    100
  );

  const clarity = clamp(
    84
      - Math.max(0, headlineLength - 18) * 2
      - Math.max(0, subheadLength - 30)
      + (renderState.highlight ? 10 : 0),
    0,
    100
  );

  return {
    hook: Math.round(hook),
    hierarchy: Math.round(hierarchy),
    clarity: Math.round(clarity)
  };
}

export function buildCoverSvg(inputState = {}, options = {}) {
  const state = normalizeCoverState(inputState);
  const renderState = getRenderValues(state);
  const theme = THEMES[state.themeId];
  const template = TEMPLATES[state.templateId];
  const lines = splitBalanced(renderState.headline, template.maxCharsPerLine);
  const interactive = Boolean(options.interactive);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" role="img" aria-label="${escapeXml(renderState.headline || '小红书封面预览')}">
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 0.05 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="${theme.bg}" />
      <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" filter="url(#grain)" opacity="0.55" />
      <circle cx="928" cy="172" r="180" fill="${theme.accentSoft}" opacity="0.42" />
      <circle cx="120" cy="1288" r="220" fill="${theme.accentSoft}" opacity="0.2" />
      ${renderTemplate(renderState, state, theme, lines, interactive)}
      <text x="108" y="1326" fill="${theme.ink}" opacity="0.55" font-size="24" font-family="'IBM Plex Sans','Noto Sans SC',sans-serif">TOPIC / ${escapeXml(state.topic || '未命名主题')}</text>
      ${state.decorations.showFooterBrand ? renderFooterBrand(theme) : ''}
    </svg>
  `.trim();
}
