const BLUEPRINTS = Object.freeze({
  authority: {
    badge: '观点型',
    headline: (topic) => `${topic}别再随便做封面了`,
    highlight: () => '别再随便',
    subhead: (topic) => `先把 ${topic} 的核心观点说清楚，再用封面把最值得点开的那一句放大。`
  },
  tutorial: {
    badge: '教程型',
    headline: (topic) => `3步把${topic}封面做清楚`,
    highlight: () => '3步',
    subhead: (topic) => `先给结果，再给步骤，最后补一句场景说明，${topic} 的封面就会更像方法，而不是海报。`
  },
  list: {
    badge: '清单型',
    headline: (topic) => `${topic}封面一定要有这3点`,
    highlight: () => '这3点',
    subhead: (topic) => `承诺要短，重点要狠，辅助说明要能扫读，${topic} 更适合这种清单式封面。`
  },
  emotion: {
    badge: '情绪型',
    headline: (topic) => `${topic}这样写才有人想点开`,
    highlight: () => '想点开',
    subhead: (topic) => `同样的 ${topic}，有的人只是在排字，有的人已经先把情绪张力放到了第一眼。`
  }
});

export const FOCUS_OPTIONS = Object.freeze([
  { id: 'authority', label: '观点型', description: '适合表达判断与立场' },
  { id: 'tutorial', label: '教程型', description: '适合方法、步骤、拆解' },
  { id: 'list', label: '清单型', description: '适合经验总结与要点' },
  { id: 'emotion', label: '情绪型', description: '适合反差、共鸣、故事' }
]);

function cleanTopic(value) {
  const topic = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return topic || '这个主题';
}

function orderedFocusIds(focusMode = 'authority') {
  const ids = FOCUS_OPTIONS.map((item) => item.id);
  const index = ids.indexOf(focusMode);
  if (index === -1) {
    return ids;
  }
  return ids.slice(index).concat(ids.slice(0, index));
}

export function generateDraft(topic, focusMode = 'authority') {
  const safeTopic = cleanTopic(topic);
  const blueprint = BLUEPRINTS[focusMode] || BLUEPRINTS.authority;

  return {
    topic,
    focusMode: BLUEPRINTS[focusMode] ? focusMode : 'authority',
    badge: blueprint.badge,
    headline: blueprint.headline(safeTopic),
    highlight: blueprint.highlight(safeTopic),
    subhead: blueprint.subhead(safeTopic)
  };
}

export function generateConceptVariants(topic, focusMode = 'authority') {
  return orderedFocusIds(focusMode)
    .slice(0, 3)
    .map((id) => generateDraft(topic, id));
}
