const FOCUS_KEYWORDS = Object.freeze({
  tutorial: ['步骤', '方法', '教程', '怎么', '如何', '流程', '动作', '手把手', '拆解'],
  list: ['清单', '要点', '总结', '原则', '建议', '避坑', '一定要', '这3点', '几个'],
  authority: ['本质', '核心', '判断', '观点', '结论', '真正有用', '关键', '底层'],
  emotion: ['崩溃', '后悔', '焦虑', '共鸣', '扎心', '惊艳', '原来', '想点开']
});

const STOP_WORDS = new Set([
  '我们', '你们', '他们', '这个', '那个', '这样', '就是', '已经', '可以', '因为', '所以',
  '然后', '如果', '但是', '一个', '一种', '一些', '这些', '那些', '没有', '不是', '自己',
  '最后', '第一', '第二', '第三', '真的', '非常', '终于', '直接', '输入', '输出', '处理',
  '只是', '不是', '终于', '时候', '内容', '文章', '小红书', '封面'
]);

const FOCUS_ORDER = ['authority', 'tutorial', 'list', 'emotion'];

function normalizeContent(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function splitSentences(content) {
  return normalizeContent(content)
    .split(/[。！？!\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenizePhrases(content) {
  const clean = normalizeContent(content).replace(/[，、：；,.!?“”"'（）()【】\[\]\-]/g, ' ');
  const compact = clean.replace(/\s+/g, '');
  const matches = compact.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,8}/g) || [];

  return matches.filter((token) => !STOP_WORDS.has(token));
}

function countTokens(tokens) {
  const map = new Map();
  tokens.forEach((token) => {
    const key = token.toLowerCase();
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function scoreFocusMode(content) {
  const normalized = normalizeContent(content);
  const scores = {
    authority: 0,
    tutorial: 0,
    list: 0,
    emotion: 0
  };

  Object.entries(FOCUS_KEYWORDS).forEach(([mode, keywords]) => {
    keywords.forEach((keyword) => {
      if (normalized.includes(keyword)) {
        scores[mode] += 2;
      }
    });
  });

  if (/[1-9一二三四五六七八九][个点步招条]/.test(normalized)) {
    scores.list += 2;
    scores.tutorial += 2;
  }

  if (/第一|第二|第三|步骤|先|再|最后/.test(normalized)) {
    scores.tutorial += 3;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}

function detectHookNumber(content) {
  const normalized = normalizeContent(content).replace(/\s+/g, '');
  const preferredPatterns = [
    /([1-9一二三四五六七八九十]+)(个动作)/,
    /([1-9一二三四五六七八九十]+)(个方法)/,
    /([1-9一二三四五六七八九十]+)(个步骤)/,
    /([1-9一二三四五六七八九十]+)(个要点)/,
    /([1-9一二三四五六七八九十]+)(个点)/,
    /([1-9一二三四五六七八九十]+)(步)/,
    /([1-9一二三四五六七八九十]+)(招)/,
    /([1-9一二三四五六七八九十]+)(条)/
  ];

  for (const pattern of preferredPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return `${match[1]}${match[2]}`;
    }
  }

  return '';
}

function pickTopic(content) {
  const normalized = normalizeContent(content);
  if (!normalized) {
    return '这个主题';
  }

  const compact = normalized.replace(/\s+/g, '');
  const priorityPatterns = [
    /AI工作流/,
    /工作流/,
    /副业/,
    /读书笔记/,
    /店铺运营|团队运营|内容运营|运营/,
    /选题/,
    /写作/,
    /剪辑/,
    /效率/,
    /流量/,
    /转化/,
    /私域/,
    /爆文/
  ];

  for (const pattern of priorityPatterns) {
    const match = compact.match(pattern);
    if (match) {
      return match[0];
    }
  }

  const frequencies = [...countTokens(tokenizePhrases(content)).entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);

  const candidate = frequencies.find(([token]) => token.length >= 2 && token.length <= 6);
  return candidate ? candidate[0] : normalized.slice(0, 6);
}

function pickLeadSentence(content) {
  const sentences = splitSentences(content);
  if (sentences.length === 0) {
    return '';
  }

  return [...sentences]
    .sort((a, b) => scoreSentence(b) - scoreSentence(a))[0];
}

function scoreSentence(sentence) {
  let score = 0;
  if (sentence.length >= 12 && sentence.length <= 34) score += 3;
  if (/[1-9一二三四五六七八九十]/.test(sentence)) score += 2;
  if (/不要|别再|一定|真正|核心|关键|终于|只要/.test(sentence)) score += 2;
  if (/先|再|最后|因为|所以/.test(sentence)) score += 1;
  return score;
}

function clampText(value, maxLength) {
  const text = normalizeContent(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function deriveHighlight(headline, hookNumber) {
  if (hookNumber) {
    return hookNumber;
  }

  const compact = normalizeContent(headline).replace(/\s+/g, '');
  if (compact.length <= 4) {
    return compact;
  }
  return compact.slice(0, 4);
}

function buildHeadline(topic, focusMode, content) {
  const hookNumber = detectHookNumber(content);
  const leadSentence = pickLeadSentence(content);

  if (hookNumber && focusMode === 'tutorial') {
    return `${hookNumber}把${topic}讲清楚`;
  }

  if (hookNumber && focusMode === 'list') {
    return `${topic}最该抓住的${hookNumber}`;
  }

  if (focusMode === 'authority') {
    return `${topic}真正重要的是什么`;
  }

  if (focusMode === 'emotion') {
    return `${topic}这样写才更想点开`;
  }

  return clampText(leadSentence || `${topic}封面先抓主题再排版`, 18);
}

function buildSubhead(content, topic, focusMode) {
  const sentences = splitSentences(content);
  const lead = sentences[0] || `${topic}需要先说清楚结论`;
  const tail = sentences[1] || `${topic} 的封面要先表达价值，再表达形式。`;

  if (focusMode === 'tutorial') {
    return clampText(`${lead}。把过程收成一条清楚路径，读者会更容易点开并理解。`, 40);
  }

  if (focusMode === 'list') {
    return clampText(`${lead}。把重点压缩成可扫读的几项，封面会更像结论卡片。`, 40);
  }

  if (focusMode === 'authority') {
    return clampText(`${lead}。先亮观点，再补一句为什么，这样 ${topic} 的判断感会更强。`, 40);
  }

  return clampText(`${lead}。封面先给情绪张力，再补一句具体场景，点击感会更强。`, 40);
}

export function extractCoverContent(content) {
  const normalized = normalizeContent(content);
  const topic = pickTopic(normalized);
  const focusMode = scoreFocusMode(normalized);
  const headline = buildHeadline(topic, focusMode, normalized);
  const hookNumber = detectHookNumber(normalized);
  const highlight = clampText(deriveHighlight(headline, hookNumber), 6);
  const subhead = buildSubhead(normalized, topic, focusMode);

  return {
    topic,
    focusMode,
    headline,
    highlight,
    subhead
  };
}

export function extractCoverVariants(content) {
  const base = extractCoverContent(content);
  const order = [
    base.focusMode,
    ...FOCUS_ORDER.filter((mode) => mode !== base.focusMode)
  ].slice(0, 3);

  return order.map((focusMode) => {
    const headline = buildHeadline(base.topic, focusMode, content);
    const hookNumber = detectHookNumber(content);

    return {
      topic: base.topic,
      focusMode,
      headline,
      highlight: clampText(deriveHighlight(headline, hookNumber), 6),
      subhead: buildSubhead(content, base.topic, focusMode)
    };
  });
}
