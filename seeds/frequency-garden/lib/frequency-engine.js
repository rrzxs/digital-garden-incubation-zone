const SCENE_CONFIGS = Object.freeze({
  moon: Object.freeze({
    id: 'moon',
    name: '月光冥想',
    accent: '银蓝流光',
    atmosphere: '像在安静夜色里慢慢找回自己的边界'
  }),
  nature: Object.freeze({
    id: 'nature',
    name: '自然疗愈',
    accent: '晨雾与暖叶',
    atmosphere: '像在森林边缘，让呼吸重新变得柔软'
  }),
  temple: Object.freeze({
    id: 'temple',
    name: '神殿校准',
    accent: '金雾与低频回响',
    atmosphere: '像在光场里做一次安静而郑重的归位'
  })
});

const SOUND_CONFIGS = Object.freeze({
  rain: Object.freeze({
    id: 'rain',
    name: '雨声薄幕'
  }),
  forest: Object.freeze({
    id: 'forest',
    name: '森林风声'
  }),
  bowl: Object.freeze({
    id: 'bowl',
    name: '颂钵低频'
  })
});

const EMOTION_CONFIGS = Object.freeze({
  anxious: Object.freeze({
    id: 'anxious',
    label: '焦虑紧绷',
    summary: '心绪绷得很紧，需要先稳住节律。',
    protocol: Object.freeze({
      inhale: 4,
      hold: 2,
      exhale: 6,
      rest: 1,
      rounds: 5,
      label: '安抚减压节律'
    }),
    defaultScene: 'moon',
    defaultSound: 'rain'
  }),
  overwhelmed: Object.freeze({
    id: 'overwhelmed',
    label: '混乱过载',
    summary: '事情太多，先把注意力从噪音里收回来。',
    protocol: Object.freeze({
      inhale: 4,
      hold: 4,
      exhale: 6,
      rest: 2,
      rounds: 5,
      label: '清理过载节律'
    }),
    defaultScene: 'temple',
    defaultSound: 'bowl'
  }),
  tired: Object.freeze({
    id: 'tired',
    label: '疲惫空掉',
    summary: '能量很薄，需要被轻一点地托住。',
    protocol: Object.freeze({
      inhale: 3,
      hold: 2,
      exhale: 5,
      rest: 2,
      rounds: 4,
      label: '回充修复节律'
    }),
    defaultScene: 'nature',
    defaultSound: 'forest'
  }),
  low: Object.freeze({
    id: 'low',
    label: '低落下沉',
    summary: '心里有重量，先允许自己慢慢浮上来。',
    protocol: Object.freeze({
      inhale: 4,
      hold: 2,
      exhale: 5,
      rest: 2,
      rounds: 5,
      label: '轻抬心绪节律'
    }),
    defaultScene: 'nature',
    defaultSound: 'forest'
  }),
  restless: Object.freeze({
    id: 'restless',
    label: '烦躁失焦',
    summary: '思绪分散，需要重新回到身体里。',
    protocol: Object.freeze({
      inhale: 4,
      hold: 1,
      exhale: 6,
      rest: 1,
      rounds: 5,
      label: '收束注意节律'
    }),
    defaultScene: 'moon',
    defaultSound: 'rain'
  })
});

function getEmotionConfig(emotionId) {
  return EMOTION_CONFIGS[emotionId] || EMOTION_CONFIGS.anxious;
}

export function getSceneConfig(sceneId) {
  return SCENE_CONFIGS[sceneId] || SCENE_CONFIGS.moon;
}

export function getSoundConfig(soundId) {
  return SOUND_CONFIGS[soundId] || SOUND_CONFIGS.rain;
}

export function listEmotionConfigs() {
  return Object.values(EMOTION_CONFIGS);
}

export function listSceneConfigs() {
  return Object.values(SCENE_CONFIGS);
}

export function listSoundConfigs() {
  return Object.values(SOUND_CONFIGS);
}

export function createSessionBlueprint(input = {}) {
  const emotion = getEmotionConfig(input.emotion);
  const scene = getSceneConfig(input.sceneId || emotion.defaultScene);
  const sound = getSoundConfig(input.soundId || emotion.defaultSound);
  const note = typeof input.note === 'string' ? input.note.trim() : '';

  return {
    emotion,
    note,
    protocol: emotion.protocol,
    scene,
    sound
  };
}

export function buildGuidancePrompt(input = {}) {
  const session = createSessionBlueprint(input);

  return [
    '你是一位温柔的情绪引导者，不做诊断，不说教，不制造压力。',
    `用户当前的情绪底色是：${session.emotion.label}（${session.emotion.id}）。`,
    `用户补充了一句话：${session.note || '暂时没有补充，但需要被轻柔接住。'}`,
    `请以 ${session.scene.name} 的氛围来写一段一次性完整引导词。`,
    `呼吸节奏使用 ${session.protocol.inhale}-${session.protocol.hold}-${session.protocol.exhale}-${session.protocol.rest}。`,
    '输出 3 到 4 段短段落，包含吸气与呼气提示，语言要缓、轻、具体。'
  ].join('\n');
}

export function createFallbackGuidance(input = {}) {
  const session = createSessionBlueprint(input);
  const normalizedNote = session.note.replace(/[。！？!?.,，、]+$/u, '');
  const opening = session.note
    ? `我听见你正在承受这样的重量: ${normalizedNote}`
    : `我会先陪你把注意力收回来，不急着解释一切`;

  return [
    `${opening}。先不用急着变好，也不需要立刻证明你还能撑住。现在只要让肩膀慢一点，把目光放松下来，允许 ${session.scene.name} 的气息把你接住。`,
    `跟着我一起做 ${session.protocol.label}。吸气 ${session.protocol.inhale} 秒，让空气安静地进入胸口；停留 ${session.protocol.hold} 秒，不必用力；呼气 ${session.protocol.exhale} 秒，把多余的紧绷慢慢送出去；最后停留 ${session.protocol.rest} 秒，感受身体重新落地。`,
    `如果杂念又冒出来，也没有关系。只要轻轻回到这一轮呼吸，回到 ${session.scene.atmosphere} 的感觉里。每一次呼气，都让今天的噪音再退后一点。`,
    `当这一轮结束时，试着对自己说一句: 此刻不需要证明什么，我已经在回到自己。`
  ].join('\n\n');
}
